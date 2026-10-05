import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { connectDB } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";
import { verifyToken, hashPassword } from "@/lib/auth";
import {
  normalizeCompensationPaymentHistory,
  normalizeCompensationPhases,
  normalizeContractType,
} from "@/lib/compensation";

const COOKIE_NAME = "kalp_auth_token";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    if (payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

// Returns all active employees from database
export async function GET() {
  await connectDB();

  const employees = await Employee.find({ isDismissed: { $ne: true } })
    .sort({ createdAt: -1 })
    .lean();

  // Look up User IDs by employee emails so features like plan sharing work correctly
  const emails = employees.map((e) => e.email).filter(Boolean);
  const userDocs = await User.find({ email: { $in: emails } }).select("_id email").lean();
  const userIdByEmail = new Map(userDocs.map((u) => [u.email, String(u._id)]));

  return NextResponse.json(
    {
      employees: employees.map((emp) => ({
        id: String(emp._id),
        userId: userIdByEmail.get(emp.email) || null,
        name: emp.name,
        email: emp.email,
        title: emp.title,
        department: emp.department,
        location: emp.location,
        type: emp.type,
        isDismissed: emp.isDismissed,
        avatarUrl: emp.avatarUrl,
      })),
    },
    { status: 200 }
  );
}

function generateTemporaryPassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) result += chars[bytes[i]! % chars.length];
  return result;
}

// Create employee (admin only) and an OTP-capable login User
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();

  const {
    name,
    email,
    title,
    department,
    location,
    type,
    avatarUrl,
    assignedProduct,
    assignedService,
    isOutsider,
    workStartTime,
    workEndTime,
    compensationContractType: rawContractType,
    contractOneTimeAmount,
    compensationPhases: rawPhases,
    compensationPaymentHistory: rawPayments,
    annualSalary,
    numberOfBonuses,
    currentAdvanceSalary,
    advanceSalaryEmi,
    dateOfHiring,
  } = body;

  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!name || !normalizedEmail) {
    return NextResponse.json(
      { message: "Name and email are required" },
      { status: 400 }
    );
  }

  const existingEmployee = await Employee.findOne({ email: normalizedEmail });
  if (existingEmployee) {
    return NextResponse.json(
      { message: "An employee with this email already exists." },
      { status: 400 }
    );
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return NextResponse.json(
      { message: "A login account with this email already exists. Use a different email or link the existing account." },
      { status: 400 }
    );
  }

  const bootstrapPassword = generateTemporaryPassword(10);
  const hashedPassword = await hashPassword(bootstrapPassword);

  await User.create({
    email: normalizedEmail,
    password: hashedPassword,
    name: name.trim(),
    role: "employee",
  });

  const contractType = normalizeContractType(rawContractType);
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const created = await Employee.create({
    type: type || "Employee",
    name: name.trim(),
    email: normalizedEmail,
    title: title || undefined,
    department: department || undefined,
    location: location || undefined,
    avatarUrl: avatarUrl || undefined,
    assignedProduct: assignedProduct || undefined,
    assignedService: assignedService || undefined,
    isOutsider: !!isOutsider,
    workStartTime: workStartTime || undefined,
    workEndTime: workEndTime || undefined,
    dateOfHiring: dateOfHiring ? new Date(String(dateOfHiring)) : undefined,
    compensationContractType: contractType,
    contractOneTimeAmount:
      contractType === "one_time" ? num(contractOneTimeAmount) : undefined,
    compensationPhases:
      contractType === "phases" ? normalizeCompensationPhases(rawPhases) : [],
    compensationPaymentHistory: normalizeCompensationPaymentHistory(rawPayments || []),
    annualSalary: num(annualSalary),
    numberOfBonuses: num(numberOfBonuses),
    currentAdvanceSalary: num(currentAdvanceSalary),
    advanceSalaryEmi: num(advanceSalaryEmi),
  });

  return NextResponse.json(
    {
      employee: {
        id: String(created._id),
        name: created.name,
        email: created.email,
      },
      loginCredentials: {
        email: created.email,
        message: "Employee can sign in with email OTP.",
      },
    },
    { status: 201 }
  );
}
