import { NATIONAL_CURRENCY, isInternationalCurrency } from "@/lib/currencies";

export type ClientRegion = "national" | "international";

export interface InvoiceNumberSettings {
  invoicePrefix?: string;
  nextSerial?: number;
  internationalInvoicePrefix?: string;
  internationalNextSerial?: number;
}

export function resolveClientRegion(options: {
  clientRegion?: ClientRegion | string | null;
  currency?: string | null;
}): ClientRegion {
  if (options.clientRegion === "international" || options.clientRegion === "national") {
    return options.clientRegion;
  }
  if (options.currency && isInternationalCurrency(options.currency)) {
    return "international";
  }
  return "national";
}

export function buildInvoiceNumber(
  settings: InvoiceNumberSettings | null | undefined,
  region: ClientRegion,
  date = new Date()
): { invoiceNumber: string; serialField: string } {
  const month = date.toLocaleString("en-US", { month: "long" });
  const isInternational = region === "international";

  const prefix = isInternational
    ? settings?.internationalInvoicePrefix || "INT"
    : settings?.invoicePrefix || "INV";

  const serial = isInternational
    ? settings?.internationalNextSerial || 1
    : settings?.nextSerial || 1;

  const serialField = isInternational
    ? "invoiceSettings.internationalNextSerial"
    : "invoiceSettings.nextSerial";

  return {
    invoiceNumber: `${prefix}/${month}/${String(serial).padStart(3, "0")}`,
    serialField,
  };
}
