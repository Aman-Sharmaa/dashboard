const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://Webwrite";
const BRAND = "Webwrite";

function baseLayout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#18181b 0%,#27272a 100%);padding:28px 32px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td><span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${BRAND}</span></td>
<td align="right"><span style="font-size:12px;color:#a1a1aa;">Dashboard</span></td>
</tr></table>
</td></tr>
<!-- Body -->
<tr><td style="padding:32px 32px 24px;">${body}</td></tr>
<!-- Footer -->
<tr><td style="padding:0 32px 28px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #e4e4e7;padding-top:20px;">
<p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">This is an automated notification from <a href="${SITE_URL}" style="color:#71717a;text-decoration:underline;">${BRAND}</a>. Please do not reply to this email.</p>
</td></tr></table>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function heading(text: string): string {
  return `<h2 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#18181b;letter-spacing:-0.3px;">${text}</h2>`;
}

function greeting(name: string): string {
  return `<p style="margin:8px 0 20px;font-size:15px;color:#52525b;">Hi ${name},</p>`;
}

function card(content: string): string {
  return `<div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:12px;padding:20px 24px;margin:0 0 20px;">${content}</div>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:4px 16px 4px 0;font-size:13px;color:#71717a;white-space:nowrap;vertical-align:top;">${label}</td><td style="padding:4px 0;font-size:13px;color:#18181b;font-weight:500;">${value}</td></tr>`;
}

function detailTable(rows: string): string {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;margin-top:12px;">${rows}</table>`;
}

function ctaButton(text: string, url: string): string {
  const fullUrl = url.startsWith("http") ? url : `${SITE_URL}${url}`;
  return `<table cellpadding="0" cellspacing="0" style="margin:4px 0 0;"><tr><td style="background:#18181b;border-radius:8px;padding:10px 24px;"><a href="${fullUrl}" style="font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;display:inline-block;">${text}</a></td></tr></table>`;
}

function priorityBadge(priority: string): string {
  const colors: Record<string, string> = {
    urgent: "#dc2626",
    high: "#ea580c",
    medium: "#ca8a04",
    low: "#16a34a",
  };
  const bg: Record<string, string> = {
    urgent: "#fef2f2",
    high: "#fff7ed",
    medium: "#fefce8",
    low: "#f0fdf4",
  };
  const c = colors[priority] || "#71717a";
  const b = bg[priority] || "#f4f4f5";
  const label = priority.charAt(0).toUpperCase() + priority.slice(1);
  return `<span style="display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:600;color:${c};background:${b};">${label}</span>`;
}

// ─── Login OTP ───────────────────────────────────────────────────

export function loginOtpEmail(p: {
  recipientName: string;
  otp: string;
  expiryMinutes: number;
  ipAddress: string;
}) {
  const body = [
    heading("Login Verification Code"),
    greeting(p.recipientName),
    `<p style="margin:0 0 20px;font-size:14px;color:#3f3f46;line-height:1.6;">Use the code below to complete your sign-in. This code expires in <strong>${p.expiryMinutes} minutes</strong>.</p>`,

    `<div style="background:#18181b;border-radius:12px;padding:28px 24px;margin:0 0 20px;text-align:center;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:2px;">Your verification code</p>
      <p style="margin:0;font-size:36px;font-weight:800;color:#ffffff;letter-spacing:8px;font-family:'Courier New',monospace;">${p.otp}</p>
    </div>`,

    card(
      `<table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:4px 0;vertical-align:top;">
            <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">IP Address</p>
            <p style="margin:0;font-size:13px;color:#18181b;font-weight:500;">${p.ipAddress}</p>
          </td>
        </tr>
      </table>`
    ),

    `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin:0 0 4px;">
      <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.5;"><strong>Security tip:</strong> Never share this code with anyone. Kalp will never ask you for this code via phone or chat.</p>
    </div>`,
  ].join("");

  return baseLayout(body);
}

// ─── Task Assigned ───────────────────────────────────────────────

export function taskAssignedEmail(p: {
  recipientName: string;
  taskTitle: string;
  description?: string;
  priority: string;
  startDate?: string | null;
  dueDate?: string | null;
  assignedBy?: string;
  projectName?: string;
}) {
  const descSnippet = p.description
    ? p.description.replace(/<[^>]+>/g, " ").trim().slice(0, 300)
    : null;

  const dateRange =
    p.startDate && p.dueDate
      ? `${p.startDate} → ${p.dueDate}`
      : p.startDate
        ? `From ${p.startDate}`
        : p.dueDate
          ? `Due ${p.dueDate}`
          : null;

  const body = [
    heading("New Task Assigned"),
    greeting(p.recipientName),
    `<p style="margin:0 0 20px;font-size:14px;color:#3f3f46;line-height:1.6;"><strong>${p.assignedBy || "Someone"}</strong> has assigned a new task to you.</p>`,

    // Task title card
    `<div style="background:#18181b;border-radius:12px;padding:20px 24px;margin:0 0 16px;">
      <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">Task</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;line-height:1.4;">${p.taskTitle}</p>
    </div>`,

    // Description block
    descSnippet
      ? `<div style="background:#f9fafb;border-left:3px solid #d4d4d8;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 16px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">Description</p>
          <p style="margin:0;font-size:13px;color:#3f3f46;line-height:1.6;">${descSnippet}</p>
        </div>`
      : "",

    // Details grid
    card(
      `<table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="50%" style="padding:0 8px 14px 0;vertical-align:top;">
            <p style="margin:0 0 3px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">Assigned By</p>
            <p style="margin:0;font-size:14px;font-weight:600;color:#18181b;">${p.assignedBy || "~"}</p>
          </td>
          <td width="50%" style="padding:0 0 14px 8px;vertical-align:top;">
            <p style="margin:0 0 3px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">Priority</p>
            <p style="margin:0;">${priorityBadge(p.priority)}</p>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding:0 8px 0 0;vertical-align:top;">
            <p style="margin:0 0 3px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">Timeline</p>
            <p style="margin:0;font-size:14px;font-weight:600;color:#18181b;">${dateRange || "No dates set"}</p>
          </td>
          <td width="50%" style="padding:0 0 0 8px;vertical-align:top;">
            <p style="margin:0 0 3px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">Project</p>
            <p style="margin:0;font-size:14px;font-weight:600;color:#18181b;">${p.projectName || "~"}</p>
          </td>
        </tr>
      </table>`
    ),

    // CTA
    `<div style="text-align:center;margin:8px 0 0;">`,
    ctaButton("View Task →", "/dashboard/todo"),
    `</div>`,
  ].join("");

  return baseLayout(body);
}

// ─── Task Overdue Digest ─────────────────────────────────────────

export function taskOverdueEmail(p: {
  recipientName: string;
  tasks: { title: string; dueDate: string; priority: string }[];
}) {
  const taskRows = p.tasks
    .map(
      (t) =>
        `<tr>
      <td style="padding:10px 12px;font-size:13px;color:#18181b;font-weight:500;border-bottom:1px solid #f4f4f5;">${t.title}</td>
      <td style="padding:10px 12px;font-size:13px;color:#71717a;border-bottom:1px solid #f4f4f5;">${t.dueDate}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f4f4f5;">${priorityBadge(t.priority)}</td>
    </tr>`
    )
    .join("");

  const body = [
    heading("Overdue Tasks Reminder"),
    greeting(p.recipientName),
    `<p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">You have <strong style="color:#dc2626;">${p.tasks.length}</strong> overdue task${p.tasks.length > 1 ? "s" : ""} that need your attention:</p>`,
    card(
      `<table cellpadding="0" cellspacing="0" width="100%">
      <tr style="background:#f4f4f5;">
        <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#52525b;text-transform:uppercase;letter-spacing:0.5px;">Task</td>
        <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#52525b;text-transform:uppercase;letter-spacing:0.5px;">Due</td>
        <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#52525b;text-transform:uppercase;letter-spacing:0.5px;">Priority</td>
      </tr>${taskRows}</table>`
    ),
    ctaButton("Open Task Board →", "/dashboard/todo"),
  ].join("");

  return baseLayout(body);
}

// ─── Overdue Summary for Admins ──────────────────────────────────

export function taskOverdueSummaryEmail(p: {
  recipientName: string;
  totalOverdue: number;
  assigneeSummary: { name: string; count: number }[];
}) {
  const summaryRows = p.assigneeSummary
    .map(
      (a) =>
        `<tr>
      <td style="padding:8px 12px;font-size:13px;color:#18181b;font-weight:500;border-bottom:1px solid #f4f4f5;">${a.name}</td>
      <td style="padding:8px 12px;font-size:13px;color:#dc2626;font-weight:600;border-bottom:1px solid #f4f4f5;">${a.count} overdue</td>
    </tr>`
    )
    .join("");

  const body = [
    heading("Daily Overdue Tasks Summary"),
    greeting(p.recipientName),
    `<p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">There are <strong style="color:#dc2626;">${p.totalOverdue}</strong> overdue tasks across the team:</p>`,
    card(
      `<table cellpadding="0" cellspacing="0" width="100%">
      <tr style="background:#f4f4f5;">
        <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#52525b;text-transform:uppercase;letter-spacing:0.5px;">Team Member</td>
        <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#52525b;text-transform:uppercase;letter-spacing:0.5px;">Tasks</td>
      </tr>${summaryRows}</table>`
    ),
    ctaButton("View All Tasks →", "/dashboard/todo"),
  ].join("");

  return baseLayout(body);
}

// ─── Leave Request (to Admin) ────────────────────────────────────

export function leaveRequestEmail(p: {
  adminName: string;
  employeeName: string;
  date: string;
  dateTo?: string;
  leaveType: string;
  isPaid: boolean;
  reason?: string;
  employeeId: string;
}) {
  const dateDisplay = p.dateTo && p.dateTo !== p.date
    ? `${p.date} → ${p.dateTo}`
    : p.date;

  const rows = [
    row("Employee", `<strong>${p.employeeName}</strong>`),
    row("Date", dateDisplay),
    row("Type", p.leaveType || "Not specified"),
    row("Paid Leave", p.isPaid ? "Yes" : "No"),
    p.reason ? row("Reason", p.reason) : "",
  ].join("");

  const body = [
    heading("New Leave Request"),
    greeting(p.adminName),
    `<p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">A team member has submitted a leave request for your review:</p>`,
    card(detailTable(rows)),
    ctaButton("Review Request →", `/dashboard/people/${p.employeeId}`),
  ].join("");

  return baseLayout(body);
}

// ─── New Lead (to Admin) ─────────────────────────────────────────

export function newLeadEmail(p: {
  adminName: string;
  leadName: string;
  leadEmail: string;
  companyName?: string;
  phone?: string;
  serviceCategory?: string;
  budget?: string;
  projectDescription?: string;
  source?: string;
}) {
  const descSnippet = p.projectDescription
    ? p.projectDescription.replace(/<[^>]+>/g, " ").trim().slice(0, 250)
    : null;

  const rows = [
    row("Name", `<strong>${p.leadName}</strong>`),
    row("Email", `<a href="mailto:${p.leadEmail}" style="color:#2563eb;text-decoration:none;">${p.leadEmail}</a>`),
    p.phone ? row("Phone", p.phone) : "",
    p.companyName ? row("Company", p.companyName) : "",
    p.serviceCategory ? row("Service", p.serviceCategory) : "",
    p.budget ? row("Budget", p.budget) : "",
    p.source ? row("Source", p.source) : "",
  ].join("");

  const body = [
    heading("New Lead Received"),
    greeting(p.adminName),
    `<p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">A new lead has been submitted and is awaiting your review:</p>`,
    card(
      detailTable(rows) +
      (descSnippet
        ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #e4e4e7;"><p style="margin:0;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Project Details</p><p style="margin:6px 0 0;font-size:13px;color:#3f3f46;line-height:1.5;">${descSnippet}</p></div>`
        : "")
    ),
    ctaButton("View Lead →", "/dashboard/leads"),
  ].join("");

  return baseLayout(body);
}

// ─── Plan Shared (to User) ───────────────────────────────────────

export function planSharedEmail(p: {
  recipientName: string;
  planName: string;
  sharedBy: string;
  planId: string;
}) {
  const body = [
    heading("Plan Shared With You"),
    greeting(p.recipientName),
    `<p style="margin:0 0 16px;font-size:14px;color:#3f3f46;"><strong>${p.sharedBy}</strong> has shared a plan with you:</p>`,
    card(
      `<p style="margin:0;font-size:18px;font-weight:600;color:#18181b;">📋 ${p.planName}</p>`
    ),
    ctaButton("Open Plan →", `/view-plan/${p.planId}`),
  ].join("");

  return baseLayout(body);
}

// ─── Task Updated (status, fields, etc.) ─────────────────────────

function statusBadge(status: string): string {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    backlog: { color: "#475569", bg: "#f1f5f9", label: "Backlog" },
    todo: { color: "#71717a", bg: "#f4f4f5", label: "To Do" },
    in_progress: { color: "#2563eb", bg: "#eff6ff", label: "In Progress" },
    hold: { color: "#ea580c", bg: "#fff7ed", label: "Hold" },
    in_review: { color: "#9333ea", bg: "#faf5ff", label: "In Review" },
    done: { color: "#16a34a", bg: "#f0fdf4", label: "Completed" },
    rejected: { color: "#e11d48", bg: "#fff1f2", label: "Rejected" },
  };
  const s = map[status] || { color: "#71717a", bg: "#f4f4f5", label: status };
  return `<span style="display:inline-block;padding:3px 12px;border-radius:99px;font-size:12px;font-weight:600;color:${s.color};background:${s.bg};">${s.label}</span>`;
}

export function taskUpdatedEmail(p: {
  recipientName: string;
  taskTitle: string;
  updatedBy: string;
  projectName?: string;
  changes: { field: string; from?: string; to: string }[];
  priority: string;
  startDate?: string | null;
  dueDate?: string | null;
}) {
  const dateRange =
    p.startDate && p.dueDate
      ? `${p.startDate} → ${p.dueDate}`
      : p.startDate
        ? `From ${p.startDate}`
        : p.dueDate
          ? `Due ${p.dueDate}`
          : null;

  const isStatusChange = p.changes.some((c) => c.field === "Status");

  const changeRows = p.changes
    .map((c) => {
      if (c.field === "Status" && c.from) {
        return `<tr>
          <td style="padding:10px 0;vertical-align:middle;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">${c.field}</p>
            <div style="display:inline-flex;align-items:center;">
              ${statusBadge(c.from)}
              <span style="display:inline-block;margin:0 8px;font-size:16px;color:#a1a1aa;">→</span>
              ${statusBadge(c.to)}
            </div>
          </td>
        </tr>`;
      }
      if (c.field === "Priority" && c.from) {
        return `<tr>
          <td style="padding:10px 0;vertical-align:middle;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">${c.field}</p>
            <div style="display:inline-flex;align-items:center;">
              ${priorityBadge(c.from)}
              <span style="display:inline-block;margin:0 8px;font-size:16px;color:#a1a1aa;">→</span>
              ${priorityBadge(c.to)}
            </div>
          </td>
        </tr>`;
      }
      return `<tr>
        <td style="padding:8px 0;vertical-align:top;">
          <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">${c.field}</p>
          <p style="margin:0;font-size:13px;color:#18181b;font-weight:500;">${c.from ? `<span style="text-decoration:line-through;color:#a1a1aa;">${c.from}</span> → ` : ""}${c.to}</p>
        </td>
      </tr>`;
    })
    .join("");

  const body = [
    heading(isStatusChange ? "Task Status Updated" : "Task Updated"),
    greeting(p.recipientName),
    `<p style="margin:0 0 20px;font-size:14px;color:#3f3f46;line-height:1.6;"><strong>${p.updatedBy}</strong> made changes to a task you're assigned to.</p>`,

    `<div style="background:#18181b;border-radius:12px;padding:20px 24px;margin:0 0 16px;">
      <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">Task</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;line-height:1.4;">${p.taskTitle}</p>
    </div>`,

    // Changes section
    `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:18px 22px;margin:0 0 16px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.8px;">What Changed</p>
      <table cellpadding="0" cellspacing="0" width="100%">${changeRows}</table>
    </div>`,

    // Current details
    card(
      `<table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="50%" style="padding:0 8px 14px 0;vertical-align:top;">
            <p style="margin:0 0 3px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">Updated By</p>
            <p style="margin:0;font-size:14px;font-weight:600;color:#18181b;">${p.updatedBy}</p>
          </td>
          <td width="50%" style="padding:0 0 14px 8px;vertical-align:top;">
            <p style="margin:0 0 3px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">Priority</p>
            <p style="margin:0;">${priorityBadge(p.priority)}</p>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding:0 8px 0 0;vertical-align:top;">
            <p style="margin:0 0 3px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">Timeline</p>
            <p style="margin:0;font-size:14px;font-weight:600;color:#18181b;">${dateRange || "No dates set"}</p>
          </td>
          <td width="50%" style="padding:0 0 0 8px;vertical-align:top;">
            <p style="margin:0 0 3px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">Project</p>
            <p style="margin:0;font-size:14px;font-weight:600;color:#18181b;">${p.projectName || "~"}</p>
          </td>
        </tr>
      </table>`
    ),

    `<div style="text-align:center;margin:8px 0 0;">`,
    ctaButton("View Task →", "/dashboard/todo"),
    `</div>`,
  ].join("");

  return baseLayout(body);
}

// ─── Task Comment Added ──────────────────────────────────────────

export function taskCommentEmail(p: {
  recipientName: string;
  taskTitle: string;
  commenterName: string;
  commentBody: string;
  projectName?: string;
  isReply?: boolean;
}) {
  const sanitizedComment = p.commentBody.replace(/<[^>]+>/g, " ").trim().slice(0, 500);

  const body = [
    heading(p.isReply ? "New Reply on Task" : "New Comment on Task"),
    greeting(p.recipientName),
    `<p style="margin:0 0 20px;font-size:14px;color:#3f3f46;line-height:1.6;"><strong>${p.commenterName}</strong> ${p.isReply ? "replied to a comment on" : "commented on"} a task you're assigned to.</p>`,

    `<div style="background:#18181b;border-radius:12px;padding:20px 24px;margin:0 0 16px;">
      <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">Task</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;line-height:1.4;">${p.taskTitle}</p>
      ${p.projectName ? `<p style="margin:6px 0 0;font-size:12px;color:#a1a1aa;">${p.projectName}</p>` : ""}
    </div>`,

    // Comment bubble
    `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:18px 22px;margin:0 0 20px;">
      <div style="margin:0 0 10px;display:flex;align-items:center;">
        <div style="display:inline-block;width:28px;height:28px;border-radius:99px;background:#0ea5e9;color:#fff;font-size:13px;font-weight:700;line-height:28px;text-align:center;">${p.commenterName.charAt(0).toUpperCase()}</div>
        <span style="margin-left:10px;font-size:13px;font-weight:600;color:#0c4a6e;">${p.commenterName}</span>
      </div>
      <p style="margin:0;font-size:14px;color:#1e3a5f;line-height:1.6;">${sanitizedComment}</p>
    </div>`,

    `<div style="text-align:center;margin:8px 0 0;">`,
    ctaButton("View Conversation →", "/dashboard/todo"),
    `</div>`,
  ].join("");

  return baseLayout(body);
}

// ─── Task Assigned to Manager (CC notification) ──────────────────

export function taskAssignedManagerEmail(p: {
  managerName: string;
  taskTitle: string;
  assigneeName: string;
  priority: string;
  startDate?: string | null;
  dueDate?: string | null;
  createdBy: string;
  projectName?: string;
}) {
  const dateRange =
    p.startDate && p.dueDate
      ? `${p.startDate} → ${p.dueDate}`
      : p.startDate
        ? `From ${p.startDate}`
        : p.dueDate
          ? `Due ${p.dueDate}`
          : null;

  const body = [
    heading("Task Created in Your Project"),
    greeting(p.managerName),
    `<p style="margin:0 0 20px;font-size:14px;color:#3f3f46;line-height:1.6;"><strong>${p.createdBy}</strong> created a new task in <strong>${p.projectName || "your project"}</strong>.</p>`,

    `<div style="background:#18181b;border-radius:12px;padding:20px 24px;margin:0 0 16px;">
      <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">Task</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;line-height:1.4;">${p.taskTitle}</p>
    </div>`,

    card(
      `<table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="50%" style="padding:0 8px 14px 0;vertical-align:top;">
            <p style="margin:0 0 3px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">Assigned To</p>
            <p style="margin:0;font-size:14px;font-weight:600;color:#18181b;">${p.assigneeName}</p>
          </td>
          <td width="50%" style="padding:0 0 14px 8px;vertical-align:top;">
            <p style="margin:0 0 3px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">Created By</p>
            <p style="margin:0;font-size:14px;font-weight:600;color:#18181b;">${p.createdBy}</p>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding:0 8px 0 0;vertical-align:top;">
            <p style="margin:0 0 3px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">Priority</p>
            <p style="margin:0;">${priorityBadge(p.priority)}</p>
          </td>
          <td width="50%" style="padding:0 0 0 8px;vertical-align:top;">
            <p style="margin:0 0 3px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">Timeline</p>
            <p style="margin:0;font-size:14px;font-weight:600;color:#18181b;">${dateRange || "No dates set"}</p>
          </td>
        </tr>
      </table>`
    ),

    `<div style="text-align:center;margin:8px 0 0;">`,
    ctaButton("View Task →", "/dashboard/todo"),
    `</div>`,
  ].join("");

  return baseLayout(body);
}
