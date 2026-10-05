const MAIL_API_URL = process.env.MAIL_API_URL || "";

export async function sendMail(options: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  variables?: Record<string, string>;
}) {
  if (!MAIL_API_URL) {
    console.log(`[mailer] MAIL_API_URL not configured. Skipping email to ${options.to}`);
    return { skipped: true };
  }
  try {
    const body: Record<string, any> = {
      to: options.to,
      subject: options.subject,
      text: options.text || options.html || "",
    };
    if (options.html) body.html = options.html;
    if (options.variables && Object.keys(options.variables).length > 0) {
      body.variables = options.variables;
    }

    const res = await fetch(MAIL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Mail API returned ${res.status}: ${errText}`);
    }

    const data = await res.json().catch(() => ({}));
    console.log(`[mailer] Email sent to ${options.to} via API`);
    return data;
  } catch (err) {
    console.error(`[mailer] Failed to send email to ${options.to}:`, err);
    throw err;
  }
}
