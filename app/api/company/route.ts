import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { CompanyProfile } from "@/models/CompanyProfile";
import { uploadLogo } from "@/lib/s3";

const COOKIE_NAME = "kalp_auth_token";

async function getUserFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function GET() {
  const auth = await getUserFromCookie();
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  let profile = await CompanyProfile.findOne({ owner: auth.userId }).lean();

  // For non-owner users, fall back to any existing company profile
  if (!profile) {
    profile = await CompanyProfile.findOne().lean();
  }

  return NextResponse.json({ profile }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const auth = await getUserFromCookie();
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();

    const companyName = String(formData.get("companyName") || "");
    const legalName = String(formData.get("legalName") || "");

    const personalDetails = {
      contactName: String(formData.get("contactName") || ""),
      email: String(formData.get("personalEmail") || ""),
      phone: String(formData.get("phone") || ""),
    };

    const companyDetails = {
      website: String(formData.get("website") || ""),
      address: String(formData.get("address") || ""),
      city: String(formData.get("city") || ""),
      state: String(formData.get("state") || ""),
      country: String(formData.get("country") || ""),
      zip: String(formData.get("zip") || ""),
    };

    const taxDetails = {
      gstNumber: String(formData.get("gstNumber") || ""),
      panNumber: String(formData.get("panNumber") || ""),
      otherTaxId: String(formData.get("otherTaxId") || ""),
    };

    const bankDetails = {
      accountHolderName: String(formData.get("bankAccountHolderName") || ""),
      accountNumber: String(formData.get("bankAccountNumber") || ""),
      ifscCode: String(formData.get("bankIfscCode") || ""),
    };

    const monthlyPaidLimitRaw = String(
      formData.get("monthlyPaidLimit") || ""
    ).trim();
    const monthlyUnpaidLimitRaw = String(
      formData.get("monthlyUnpaidLimit") || ""
    ).trim();
    const leaveTypesRaw = String(formData.get("leaveTypes") || "");
    const weeklyOffDaysRaw = String(formData.get("weeklyOffDays") || "");
    const carryForwardRaw = String(formData.get("carryForward") || "");
    const webhookUrlRaw = String(formData.get("webhookUrl") || "").trim();
    const monitorAlertEmailsRaw = String(formData.get("monitorAlertEmails") || "").trim();
    const taskEmailEnabledRaw = String(formData.get("taskEmailEnabled") || "");
    const taskEmailTimeRaw = String(formData.get("taskEmailTime") || "14:30").trim();
    const defaultTermsRaw = formData.get("defaultTerms");
    const defaultTerms = defaultTermsRaw != null ? String(defaultTermsRaw) : undefined;

    const monthlyPaidLimit = monthlyPaidLimitRaw
      ? Number(monthlyPaidLimitRaw)
      : undefined;
    const monthlyUnpaidLimit = monthlyUnpaidLimitRaw
      ? Number(monthlyUnpaidLimitRaw)
      : undefined;
    const leaveTypes = leaveTypesRaw && leaveTypesRaw.trim()
      ? leaveTypesRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
      : [];
    const weeklyOffDays = weeklyOffDaysRaw && weeklyOffDaysRaw.trim()
      ? weeklyOffDaysRaw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
      : [];
    const carryForward = carryForwardRaw === "true";
    const webhookUrl = webhookUrlRaw && webhookUrlRaw.startsWith("http") ? webhookUrlRaw : undefined;
    const monitorAlertEmails = monitorAlertEmailsRaw
      ? monitorAlertEmailsRaw.split(/[,\s]+/).map((e) => e.trim()).filter((e) => e.includes("@"))
      : undefined;
    const taskEmailEnabled = taskEmailEnabledRaw === "true";
    const taskEmailTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(taskEmailTimeRaw)
      ? taskEmailTimeRaw
      : "14:30";

    if (!companyName) {
      return NextResponse.json(
        { message: "Company name is required" },
        { status: 400 }
      );
    }

    let logoUrl: string | undefined;
    const logo = formData.get("logo");
    if (logo && typeof logo === "object" && "arrayBuffer" in logo) {
      try {
        logoUrl = await uploadLogo(logo as File, auth.userId);
      } catch (err: any) {
        return NextResponse.json(
          { message: err.message || "Logo upload failed" },
          { status: 500 }
        );
      }
    }

    const existing = await CompanyProfile.findOne({ owner: auth.userId });

    if (existing) {
      existing.companyName = companyName;
      existing.legalName = legalName || existing.legalName;
      existing.personalDetails = personalDetails;
      existing.companyDetails = companyDetails;
      existing.taxDetails = taxDetails;
      existing.bankDetails = bankDetails;
      existing.leaveSettings = {
        ...(existing.leaveSettings || {}),
        monthlyPaidLimit,
        monthlyUnpaidLimit,
        leaveTypes,
        weeklyOffDays,
        carryForward,
      };
      if (logoUrl) existing.logoUrl = logoUrl;
      if (webhookUrl !== undefined) (existing as any).webhookUrl = webhookUrl || undefined;
      if (monitorAlertEmails !== undefined) (existing as any).monitorAlertEmails = monitorAlertEmails || [];
      (existing as any).taskEmailNotifications = {
        ...((existing as any).taskEmailNotifications?.toObject?.() || (existing as any).taskEmailNotifications || {}),
        enabled: taskEmailEnabled,
        sendTime: taskEmailTime,
        timezone: "Asia/Kolkata",
      };
      if (defaultTerms !== undefined) (existing as any).defaultTerms = defaultTerms;
      await existing.save();
      const savedProfile = await CompanyProfile.findById(existing._id).lean();
      return NextResponse.json({ profile: savedProfile }, { status: 200 });
    }

    const created = await CompanyProfile.create({
      owner: auth.userId,
      companyName,
      legalName,
      personalDetails,
      companyDetails,
      taxDetails,
      bankDetails,
      leaveSettings: {
        monthlyPaidLimit,
        monthlyUnpaidLimit,
        leaveTypes,
        weeklyOffDays,
        carryForward,
      },
      logoUrl,
      webhookUrl,
      monitorAlertEmails: monitorAlertEmails || [],
      taskEmailNotifications: {
        enabled: taskEmailEnabled,
        sendTime: taskEmailTime,
        timezone: "Asia/Kolkata",
      },
      defaultTerms: defaultTerms || undefined,
    });

    const savedProfile = await CompanyProfile.findById(created._id).lean();
    return NextResponse.json({ profile: savedProfile }, { status: 201 });
  }

  return NextResponse.json(
    { message: "Unsupported content type" },
    { status: 400 }
  );
}
