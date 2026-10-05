import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * Local public uploads manager.
 * All media is stored directly in the `public/uploads/` folder.
 */

export async function uploadLogo(file: File | Blob, ownerId: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const ext =
    "name" in file
      ? ((file as any).name as string).split(".").pop()?.toLowerCase() || "png"
      : "png";
  const filename = `${randomUUID()}.${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", "logos", ownerId);
  await mkdir(uploadDir, { recursive: true });
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, Buffer.from(arrayBuffer));
  return `/uploads/logos/${ownerId}/${filename}`;
}

export async function uploadProjectServiceAttachment(
  file: File | Blob,
  projectId: string
): Promise<{ url: string; key: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const fileName = "name" in file ? (file as any).name : "bin";
  const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
  const filename = `${randomUUID()}.${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", "project-services", projectId);
  await mkdir(uploadDir, { recursive: true });
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, Buffer.from(arrayBuffer));

  const url = `/uploads/project-services/${projectId}/${filename}`;
  return { url, key: url };
}

export async function uploadCmsImage(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const fileName = "name" in file ? (file as any).name : "image.jpg";
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const filename = `${randomUUID()}.${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", "cms");
  await mkdir(uploadDir, { recursive: true });
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, Buffer.from(arrayBuffer));
  return `/uploads/cms/${filename}`;
}

export async function uploadKhatabookImage(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const fileName = "name" in file ? (file as any).name : "image.jpg";
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const filename = `${randomUUID()}.${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", "khatabook");
  await mkdir(uploadDir, { recursive: true });
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, Buffer.from(arrayBuffer));
  return `/uploads/khatabook/${filename}`;
}

export async function uploadProjectDocument(
  file: File | Blob,
  projectId: string,
  name: string
): Promise<{ url: string; key: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const fileName = "name" in file ? (file as any).name : "bin";
  const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
  const safeName = (name || "file").replace(/[^a-zA-Z0-9.-]/g, "_");
  const filename = `${randomUUID()}-${safeName}.${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", "project-documents", projectId);
  await mkdir(uploadDir, { recursive: true });
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, Buffer.from(arrayBuffer));

  const url = `/uploads/project-documents/${projectId}/${filename}`;
  return { url, key: url };
}

export async function uploadDriveFile(
  file: File | Blob,
  ownerId: string
): Promise<{ url: string; key: string; sizeInBytes: number; mimeType: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const sizeInBytes = arrayBuffer.byteLength;
  const fileName = "name" in file ? (file as any).name : "file.bin";
  const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
  const safeBase = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "_");
  const contentType =
    ("type" in file && (file as any).type) || "application/octet-stream";
  const filename = `${randomUUID()}-${safeBase}.${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", "drive", ownerId);
  await mkdir(uploadDir, { recursive: true });
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, Buffer.from(arrayBuffer));

  const relPath = `/uploads/drive/${ownerId}/${filename}`;
  return {
    url: relPath,
    key: `uploads/drive/${ownerId}/${filename}`,
    sizeInBytes,
    mimeType: contentType,
  };
}
