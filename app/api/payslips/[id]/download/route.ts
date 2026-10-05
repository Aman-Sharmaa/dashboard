import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Payslip } from "@/models/Payslip";
import { Employee } from "@/models/Employee";
import { Reimbursement } from "@/models/Reimbursement";
import { CompanyProfile } from "@/models/CompanyProfile";

const COOKIE_NAME = "kalp_auth_token";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const payslip = await Payslip.findById(id)
    .populate("employee", "name email")
    .lean();

  if (!payslip) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // Employees can only download their own payslips
  if (user.role === "employee") {
    const employee = await Employee.findOne({ email: user.email }).lean();
    if (!employee || String(employee._id) !== String(payslip.employee?._id || payslip.employee)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  // Prepare data for HTML payslip
  const employee = typeof payslip.employee === "object" && "name" in payslip.employee
    ? payslip.employee
    : null;

  // Company profile for header/footer
  const companyProfile = await CompanyProfile.findOne({ owner: user.userId }).lean();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rawPayslip = payslip as { reimbursement?: number; reimbursementType?: string; reimbursementNote?: string; reimbursementDescription?: string; reimbursementItems?: { amount: number; type?: string; note?: string; description?: string }[] };
  const fromCollection = await Reimbursement.find({ payslip: id }).sort({ createdAt: 1 }).lean();
  const items =
    fromCollection.length > 0
      ? fromCollection.map((i) => ({ amount: i.amount, type: i.type, note: i.note, description: i.description }))
      : rawPayslip.reimbursementItems && rawPayslip.reimbursementItems.length > 0
        ? rawPayslip.reimbursementItems.map((i) => ({ amount: Number(i.amount) || 0, type: i.type, note: i.note, description: i.description }))
        : [];
  const reimbursementAmount =
    items.length > 0 ? items.reduce((s, i) => s + i.amount, 0) : (Number(rawPayslip.reimbursement) || 0);
  const escapeHtml = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const totalDeductions =
    (payslip.deductions.tds || 0) +
    (payslip.deductions.pf || 0) +
    (payslip.deductions.esic || 0) +
    (payslip.deductions.professionalTax || 0) +
    (payslip.deductions.advanceSalary || 0) +
    (payslip.deductions.attendanceDeduction || 0) +
    (payslip.deductions.other || 0);
  const totalEarnings = payslip.grossSalary + reimbursementAmount;
  const displayNet = totalEarnings - totalDeductions;

  const deductionRows = [
    payslip.deductions.tds ? { label: "TDS", amount: payslip.deductions.tds } : null,
    payslip.deductions.pf ? { label: "Provident Fund (EPF)", amount: payslip.deductions.pf } : null,
    payslip.deductions.esic ? { label: "ESIC", amount: payslip.deductions.esic } : null,
    payslip.deductions.professionalTax ? { label: "Professional Tax", amount: payslip.deductions.professionalTax } : null,
    payslip.deductions.advanceSalary ? { label: "Advance Salary", amount: payslip.deductions.advanceSalary } : null,
    payslip.deductions.attendanceDeduction ? { label: "Attendance Deduction", amount: payslip.deductions.attendanceDeduction } : null,
    payslip.deductions.other ? { label: "Other", amount: payslip.deductions.other } : null,
  ].filter(Boolean) as { label: string; amount: number }[];

  // Simple amount to words (international format)
  const numberToWords = (num: number) => {
    const a = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
      "Sixteen", "Seventeen", "Eighteen", "Nineteen",
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const toWords = (n: number): string => {
      if (n === 0) return "Zero";
      if (n < 20) return a[n];
      if (n < 100) return `${b[Math.floor(n / 10)]}${n % 10 ? " " + a[n % 10] : ""}`;
      if (n < 1000) {
        return `${a[Math.floor(n / 100)]} Hundred${n % 100 ? " " + toWords(n % 100) : ""}`;
      }
      if (n < 1_000_000) {
        return `${toWords(Math.floor(n / 1000))} Thousand${n % 1000 ? " " + toWords(n % 1000) : ""}`;
      }
      if (n < 1_000_000_000) {
        return `${toWords(Math.floor(n / 1_000_000))} Million${n % 1_000_000 ? " " + toWords(n % 1_000_000) : ""}`;
      }
      return String(n);
    };
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    let result = `${toWords(rupees)} Rupees`;
    if (paise > 0) {
      result += ` and ${toWords(paise)} Paise`;
    }
    return result;
  };

  const payslipId =
    (payslip as { payslipId?: string }).payslipId ||
    `PSL-${payslip.year}-${String(payslip.month).padStart(2, "0")}-${String(
      payslip._id
    ).slice(-6)}`;

  const netInWords = numberToWords(displayNet);

  // Split gross salary into components (60/30/10)
  const basicSalary = payslip.grossSalary * 0.6;
  const hra = payslip.grossSalary * 0.3;
  const specialAllowance = payslip.grossSalary - basicSalary - hra;

  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <title>Payslip - ${monthNames[payslip.month - 1]} ${payslip.year}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 32px; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f172a; }
      .page { max-width: 900px; margin: 0 auto; background: radial-gradient(circle at top left, #eff6ff, #f8fafc); border-radius: 24px; box-shadow: 0 30px 80px rgba(15,23,42,0.45); padding: 32px 36px 40px; color: #0f172a; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 1px solid rgba(15,23,42,0.06); padding-bottom: 16px; margin-bottom: 20px; }
      .brand { display: flex; flex-direction: column; gap: 4px; max-width: 60%; }
      .brand-title { font-size: 22px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #0f172a; }
      .brand-sub { font-size: 13px; color: #64748b; }
      .brand-meta { font-size: 11px; color: #94a3b8; margin-top: 4px; line-height: 1.4; }
      .meta { text-align: right; font-size: 12px; color: #64748b; }
      .meta strong { color: #0f172a; }
      .section-title { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px; }
      .employee-card { display: flex; justify-content: space-between; gap: 24px; padding: 16px 18px; border-radius: 16px; background: linear-gradient(135deg, rgba(59,130,246,0.05), rgba(56,189,248,0.05)); border: 1px solid rgba(148,163,184,0.35); margin-bottom: 20px; }
      .employee-main { font-size: 14px; }
      .employee-name { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 2px; }
      .employee-email { font-size: 13px; color: #64748b; }
      .employee-extra { font-size: 12px; color: #475569; text-align: right; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; margin-bottom: 20px; }
      .card { background: white; border-radius: 16px; padding: 16px 18px 14px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(15,23,42,0.04); }
      .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
      .card-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .12em; color: #6b7280; }
      .pill { font-size: 11px; padding: 3px 8px; border-radius: 999px; background: #eff6ff; color: #1d4ed8; font-weight: 500; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { padding: 6px 0; }
      th { text-align: left; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #9ca3af; }
      td.label { color: #4b5563; }
      td.amount { text-align: right; font-variant-numeric: tabular-nums; }
      tr.total-row td { border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 4px; }
      tr.total-row td.label { font-weight: 600; }
      tr.total-row td.amount { font-weight: 700; }
      .amount-pos { color: #166534; }
      .amount-neg { color: #b91c1c; }
      .net-wrapper { margin-top: 8px; display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.3fr); gap: 16px; }
      .net-card { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 16px; padding: 16px 18px 14px; border: 1px solid #22c55e; box-shadow: 0 16px 40px rgba(22,163,74,0.25); }
      .net-label { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #15803d; margin-bottom: 6px; }
      .net-amount { font-size: 24px; font-weight: 700; color: #166534; font-variant-numeric: tabular-nums; }
      .net-sub { margin-top: 4px; font-size: 12px; color: #166534; }
      .net-words { font-size: 12px; color: #047857; margin-top: 6px; }
      .notes { font-size: 12px; color: #4b5563; background: #f9fafb; border-radius: 12px; padding: 12px 14px; border: 1px dashed #e5e7eb; margin-top: 8px; }
      .footer { margin-top: 26px; font-size: 11px; color: #9ca3af; text-align: center; }
      @media print {
        body { background: white; padding: 0; }
        .page { box-shadow: none; border-radius: 0; margin: 0; width: auto; max-width: none; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <div class="brand">
          <div class="brand-title">PAYSLIP</div>
          <div class="brand-sub">
            ${escapeHtml(companyProfile?.legalName || companyProfile?.companyName || "Webwrite")}
          </div>
          ${companyProfile?.companyDetails?.address
      ? `<div class="brand-meta">
                  ${escapeHtml(companyProfile.companyDetails.address)}${companyProfile.companyDetails.city ? ", " + escapeHtml(companyProfile.companyDetails.city) : ""
      }${companyProfile.companyDetails.state ? ", " + escapeHtml(companyProfile.companyDetails.state) : ""
      }${companyProfile.companyDetails.zip ? " - " + escapeHtml(companyProfile.companyDetails.zip) : ""
      }${companyProfile.companyDetails.country ? ", " + escapeHtml(companyProfile.companyDetails.country) : ""
      }
                </div>`
      : ""
    }
          ${companyProfile?.taxDetails?.panNumber || companyProfile?.taxDetails?.gstNumber
      ? `<div class="brand-meta">
                  ${companyProfile.taxDetails.panNumber
        ? "PAN: " + escapeHtml(companyProfile.taxDetails.panNumber)
        : ""
      }${companyProfile.taxDetails.gstNumber
        ? (companyProfile.taxDetails.panNumber ? " · " : "") +
        "GST: " +
        escapeHtml(companyProfile.taxDetails.gstNumber)
        : ""
      }
                </div>`
      : ""
    }
          <div class="brand-sub">${monthNames[payslip.month - 1]} ${payslip.year}</div>
        </div>
        <div class="meta">
          <div>Payment date: <strong>${payslip.paidAt ? new Date(payslip.paidAt).toLocaleDateString("en-IN") : "~"}</strong></div>
          <div>Payslip ID: <strong>${payslipId}</strong></div>
        </div>
      </div>

      <div class="section-title">Employee details</div>
      <div class="employee-card">
        <div class="employee-main">
          <div class="employee-name">${(employee as { name?: string } | null)?.name || "N/A"}</div>
          <div class="employee-email">${(employee as { email?: string } | null)?.email || "N/A"}</div>
        </div>
        <div class="employee-extra">
          <div>Period: <strong>${monthNames[payslip.month - 1]} ${payslip.year}</strong></div>
          <div>Net Pay: <strong>₹${fmt(displayNet)}</strong></div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Earnings</div>
            <div class="pill">Total ₹${fmt(totalEarnings)}</div>
          </div>
          <table>
            <tbody>
              <tr>
                <td class="label">Basic Salary</td>
                <td class="amount amount-pos">₹${fmt(basicSalary)}</td>
              </tr>
              <tr>
                <td class="label">House Rent Allowance (HRA)</td>
                <td class="amount amount-pos">₹${fmt(hra)}</td>
              </tr>
              <tr>
                <td class="label">Special Allowance</td>
                <td class="amount amount-pos">₹${fmt(specialAllowance)}</td>
              </tr>
              ${reimbursementAmount > 0
      ? `<tr><td class="label">Reimbursement</td><td class="amount amount-pos">₹${fmt(reimbursementAmount)}</td></tr>`
      : ""}
              <tr class="total-row">
                <td class="label">Total Earnings</td>
                <td class="amount amount-pos">₹${fmt(totalEarnings)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">Deductions</div>
            <div class="pill">Total ₹${fmt(totalDeductions)}</div>
          </div>
          <table>
            <tbody>
              ${deductionRows
      .map(
        (r) => `<tr>
                    <td class="label">${escapeHtml(r.label)}</td>
                    <td class="amount amount-neg">₹${fmt(r.amount)}</td>
                  </tr>`
      )
      .join("")}
              <tr class="total-row">
                <td class="label">Total Deductions</td>
                <td class="amount amount-neg">₹${fmt(totalDeductions)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="net-wrapper">
        <div class="net-card">
          <div class="net-label">Net salary (take home)</div>
          <div class="net-amount">₹${fmt(displayNet)}</div>
          <div class="net-sub">Earnings ₹${fmt(totalEarnings)} − Deductions ₹${fmt(totalDeductions)}</div>
          <div class="net-words">${escapeHtml(netInWords)}</div>
        </div>

        <div>
          ${items.length > 0
      ? `<div class="section-title" style="margin-bottom:6px;">Reimbursement breakdown</div>
                 <div class="card" style="padding-top:10px;">
                   <table>
                     <thead>
                       <tr>
                         <th>Type</th>
                         <th style="text-align:right;">Amount</th>
                       </tr>
                     </thead>
                     <tbody>
                       ${items
        .map(
          (i) => `<tr>
                             <td class="label">${i.type ? escapeHtml(i.type) : "~"}</td>
                             <td class="amount amount-pos">₹${fmt(i.amount)}</td>
                           </tr>`
        )
        .join("")}
                     </tbody>
                   </table>
                 </div>`
      : ""
    }
          ${payslip.notes
      ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(payslip.notes)}</div>`
      : ""
    }
        </div>
      </div>

      <div class="footer">
        This is a system-generated payslip and does not require a physical signature. Use your browser’s
        <strong>Print</strong> option (Ctrl/Cmd + P) to save or print this slip.
      </div>
    </div>
  </body>
</html>
`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${payslipId}.html"`,
    },
  });
}
