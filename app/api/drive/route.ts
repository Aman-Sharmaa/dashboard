import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import {
  getAuthUserFromCookie,
  getUserDriveQuota,
  getUserDriveUsage,
} from "@/lib/drive";
import { DriveItem, type DriveVisibility } from "@/models/DriveItem";

function parseParentId(raw: string | null): mongoose.Types.ObjectId | null {
  if (!raw || raw === "root") return null;
  if (!mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
}

export async function GET(req: NextRequest) {
  const user = await getAuthUserFromCookie();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();

  const searchParams = req.nextUrl.searchParams;
  const parentId = parseParentId(searchParams.get("parentId"));
  const q = (searchParams.get("q") || "").trim();
  const type = searchParams.get("type");
  const visibility = searchParams.get("visibility");
  const scope = searchParams.get("scope") || "all";

  const accessConditions: any[] = [
    { owner: user.userId },
    { visibility: "public" },
    { visibility: "specific", sharedWith: user.userId },
  ];

  const query: any = {
    parentId,
    $or: accessConditions,
  };

  if (type === "file" || type === "folder") query.type = type;
  if (visibility === "private" || visibility === "public" || visibility === "specific") {
    query.visibility = visibility as DriveVisibility;
  }

  if (scope === "mine") {
    query.owner = user.userId;
    delete query.$or;
  } else if (scope === "shared") {
    query.owner = { $ne: user.userId };
    query.$or = [
      { visibility: "public" },
      { visibility: "specific", sharedWith: user.userId },
    ];
  } else if (scope === "public") {
    query.visibility = "public";
  }

  if (q) {
    query.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }

  const [items, usedBytes, maxBytes, parent] = await Promise.all([
    DriveItem.find(query).sort({ type: -1, name: 1, updatedAt: -1 }).lean(),
    getUserDriveUsage(user.userId),
    getUserDriveQuota(user.userId),
    parentId ? DriveItem.findById(parentId).select("_id name owner").lean() : null,
  ]);

  const folderIds = items
    .filter((item: any) => item.type === "folder")
    .map((item: any) => new mongoose.Types.ObjectId(item._id));

  let folderSizeMap = new Map<string, number>();
  if (folderIds.length > 0) {
    const folderSizes = await DriveItem.aggregate([
      { $match: { _id: { $in: folderIds } } },
      {
        $graphLookup: {
          from: DriveItem.collection.name,
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "parentId",
          as: "descendants",
        },
      },
      {
        $project: {
          _id: 1,
          totalSize: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$descendants",
                    as: "desc",
                    cond: { $eq: ["$$desc.type", "file"] },
                  },
                },
                as: "file",
                in: { $ifNull: ["$$file.sizeInBytes", 0] },
              },
            },
          },
        },
      },
    ]);

    folderSizeMap = new Map(
      folderSizes.map((entry: any) => [String(entry._id), Number(entry.totalSize || 0)])
    );
  }

  return NextResponse.json({
    items: items.map((item: any) => ({
      id: String(item._id),
      name: item.name,
      type: item.type,
      parentId: item.parentId ? String(item.parentId) : null,
      owner: String(item.owner),
      visibility: item.visibility,
      sharedWith: (item.sharedWith || []).map((id: any) => String(id)),
      pendingEmails: item.pendingEmails || [],
      approvedEmails: item.approvedEmails || [],
      mimeType: item.mimeType || null,
      sizeInBytes:
        item.type === "folder"
          ? Number(folderSizeMap.get(String(item._id)) || 0)
          : Number(item.sizeInBytes || 0),
      fileUrl:
        item.type === "folder"
          ? null
          : `/api/drive/f/${item._id}/${encodeURIComponent(item.name)}`,
      updatedAt: item.updatedAt || null,
      createdAt: item.createdAt || null,
      canEdit: user.role === "admin" || String(item.owner) === user.userId,
      isOwner: String(item.owner) === user.userId,
      accessRequests: item.accessRequests || [],
    })),

    parent: parent
      ? {
          id: String(parent._id),
          name: parent.name,
          owner: String((parent as any).owner),
        }
      : null,
    stats: {
      usedBytes,
      maxBytes,
      availableBytes: Math.max(0, maxBytes - usedBytes),
    },
  });
}
