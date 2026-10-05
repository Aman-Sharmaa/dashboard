"use client";

import { NATIONAL_CURRENCY, getCurrencySymbol } from "@/lib/currencies";
// ─── Shared Invoice Types & Templates ────────────────────────────────────
// Extracted so they can be used in both the dashboard and standalone view page.

export interface LineItem {
  description: string;
  hsn?: string;
  rate?: number;
  quantity?: number;
  amount: number;
}

export interface InvoiceTax {
  sgstRate?: number;
  sgstAmount?: number;
  cgstRate?: number;
  cgstAmount?: number;
  igstRate?: number;
  igstAmount?: number;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  template: string;
  invoiceDocumentType?: string;
  isNoGst?: boolean;
  invoiceType: string;
  senderMode: string;
  sender: any;
  recipient: any;
  toCompanyName: string;
  toCompanyAddress: string;
  lineItems: LineItem[];
  subTotal: number;
  tax: InvoiceTax;
  discount: number;
  roundOff: number;
  totalAmount: number;
  amountInWords: string;
  currency: string;
  bankDetails: any;
  purpose: string;
  notes: string;
  periodFrom: string | null;
  periodTo: string | null;
  status: string;
  dueDate: string | null;
  client: { id: string; name: string; companyName: string } | null;
  project: { id: string; name: string } | null;
  projectPayment: string | null;
  phaseId: string | null;
  phaseName: string | null;
  month: string | null;
  category: string;
  uin: string;
  signatureNote: string;
  taxDisclaimer: string;
  createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────

export function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakhs" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  }
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  let result = "Rupees " + convert(intPart);
  if (decPart > 0) result += " and " + convert(decPart) + " Paise";
  return result + " only.";
}

export function fmt(amount: number, currency: string = NATIONAL_CURRENCY) {
  const formatted = amount.toLocaleString("en-IN", {
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  });
  const symbol = getCurrencySymbol(currency);
  if (currency === NATIONAL_CURRENCY) return `${symbol}${formatted}`;
  if (["USD", "EUR", "GBP", "AUD", "CAD", "SGD", "NZD", "HKD", "JPY"].includes(currency)) {
    return `${symbol}${formatted}`;
  }
  return `${currency} ${formatted}`;
}

export function amountInWordsForCurrency(amount: number, currency: string = NATIONAL_CURRENCY): string {
  if (currency === NATIONAL_CURRENCY) return numberToWords(amount);
  return `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  })} only.`;
}

export function statusColor(s: string) {
  switch (s) {
    case "paid": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "sent": return "bg-blue-100 text-blue-800 border-blue-200";
    case "overdue": return "bg-red-100 text-red-800 border-red-200";
    case "cancelled": return "bg-gray-100 text-gray-800 border-gray-200";
    default: return "bg-amber-100 text-amber-800 border-amber-200";
  }
}

// ─── Print Styles ───────────────────────────────────────────────────────

function PrintStyles() {
  return (
    <style>{`
      @media print {
        @page {
          size: A4;
          margin: 10mm 10mm;
        }
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        /* Let the wrapper flow naturally across pages ~ do NOT set page-break-inside: avoid on it */
        .invoice-print-wrapper {
          overflow: visible;
        }
        /* Sections and rows should stay together when possible */
        .invoice-print-wrapper .invoice-section {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .invoice-print-wrapper table {
          page-break-inside: auto;
        }
        .invoice-print-wrapper thead {
          display: table-header-group;
        }
        .invoice-print-wrapper tr {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .invoice-print-wrapper .invoice-signature {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .no-print {
          display: none !important;
        }
      }
    `}</style>
  );
}

// ─── Template Renderer ──────────────────────────────────────────────────

export function InvoiceRenderer({ invoice, profile }: { invoice: InvoiceData; profile: any }) {
  return (
    <div className="invoice-print-wrapper">
      <PrintStyles />
      {(() => {
        switch (invoice.template || "professional") {
          case "modern": return <ModernTpl inv={invoice} p={profile} />;
          case "classic": return <ClassicTpl inv={invoice} p={profile} />;
          case "reimbursement": return <ReimburseTpl inv={invoice} p={profile} />;
          default: return <ProTpl inv={invoice} p={profile} />;
        }
      })()}
    </div>
  );
}

// ─── Professional Template ──────────────────────────────────────────────

function ProTpl({ inv, p }: { inv: InvoiceData; p: any }) {
  return (
    <div className="bg-white border text-black print:border-none print:shadow-none shadow-sm print:text-[11px]">
      <div className="bg-gray-100 px-6 py-1.5 flex justify-between items-center text-xs border-b print:bg-gray-100">
        <span className="font-semibold">Invoice Copy for Reference</span>
        {inv.uin && <span>UIN: <strong>{inv.uin}</strong></span>}
      </div>
      <div className="p-8 print:p-5 print:space-y-4 space-y-6">
        {/* Header: Sender + Invoice meta */}
        <div className="invoice-section flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            {p?.logoUrl && <img src={p.logoUrl} alt="" className="h-12 print:h-8 w-auto mb-2" />}
            <h1 className="text-2xl print:text-xl font-bold leading-tight">{inv.sender?.name}</h1>
            <p className="text-sm print:text-xs text-gray-600 font-medium">{inv.invoiceDocumentType === "proforma" ? "Proforma Invoice" : "Tax Invoice"}</p>
          </div>
          <div className="border rounded text-sm shrink-0">
            <table className="w-auto">
              <tbody>
                <tr className="border-b"><td className="px-3 py-1 print:px-2 print:py-0.5 font-medium bg-gray-50 text-xs whitespace-nowrap">Invoice No.:</td><td className="px-3 py-1 print:px-2 print:py-0.5 text-xs">{inv.invoiceNumber}</td></tr>
                <tr className="border-b"><td className="px-3 py-1 print:px-2 print:py-0.5 font-medium bg-gray-50 text-xs whitespace-nowrap">Date:</td><td className="px-3 py-1 print:px-2 print:py-0.5 text-xs">{new Date(inv.invoiceDate).toLocaleDateString("en-IN")}</td></tr>
                {inv.category && <tr className="border-b"><td className="px-3 py-1 print:px-2 print:py-0.5 font-medium bg-gray-50 text-xs whitespace-nowrap">Category:</td><td className="px-3 py-1 print:px-2 print:py-0.5 text-xs">{inv.category}</td></tr>}
                <tr><td className="px-3 py-1 print:px-2 print:py-0.5 font-medium bg-gray-50 text-xs whitespace-nowrap">Address:</td><td className="px-3 py-1 print:px-2 print:py-0.5 text-xs max-w-[200px]">{inv.sender?.address}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* To + Sender contact */}
        <div className="invoice-section flex justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-400 mb-1">To,</p>
            <p className="font-semibold">{inv.recipient?.companyName || inv.toCompanyName}</p>
            <p className="text-sm print:text-xs text-gray-600">{inv.recipient?.address || inv.toCompanyAddress}</p>
            {inv.recipient?.gstin && <p className="text-sm print:text-xs text-gray-600">GSTIN: {inv.recipient.gstin}</p>}
          </div>
          <div className="text-right text-sm print:text-xs space-y-0.5 border rounded p-3 print:p-2 shrink-0">
            {inv.sender?.email && <p><strong>Email:</strong> {inv.sender.email}</p>}
            {inv.sender?.pan && <p><strong>PAN:</strong> {inv.sender.pan}</p>}
            {inv.sender?.gstNumber && <p><strong>GST:</strong> {inv.sender.gstNumber}</p>}
          </div>
        </div>

        {/* Line items table */}
        <table className="w-full border text-sm print:text-xs">
          <thead><tr className="bg-gray-100 border-b print:bg-gray-100"><th className="text-left px-3 py-1.5 font-semibold border-r w-8">#</th><th className="text-left px-3 py-1.5 font-semibold border-r w-20">HSN</th><th className="text-left px-3 py-1.5 font-semibold border-r">Description</th><th className="text-right px-3 py-1.5 font-semibold border-r w-24">Rate</th><th className="text-right px-3 py-1.5 font-semibold w-28">Amount</th></tr></thead>
          <tbody>
            {inv.lineItems.map((it, i) => <tr key={i} className="border-b"><td className="px-3 py-1.5 border-r">{i + 1}.</td><td className="px-3 py-1.5 border-r text-xs">{it.hsn || ""}</td><td className="px-3 py-1.5 border-r">{it.description}</td><td className="px-3 py-1.5 text-right border-r">{it.rate ? fmt(it.rate, inv.currency) : ""}</td><td className="px-3 py-1.5 text-right">{fmt(it.amount, inv.currency)}</td></tr>)}
            <tr className="border-b font-medium"><td colSpan={4} className="px-3 py-1.5 text-right border-r">Sub-Total</td><td className="px-3 py-1.5 text-right">{fmt(inv.subTotal, inv.currency)}</td></tr>
            {inv.tax?.sgstRate && inv.tax.sgstRate > 0 && <tr className="border-b"><td colSpan={3} className="px-3 py-1.5 border-r"></td><td className="px-3 py-1.5 text-right border-r">SGST {inv.tax.sgstRate}%</td><td className="px-3 py-1.5 text-right">{fmt(inv.tax.sgstAmount || 0, inv.currency)}</td></tr>}
            {inv.tax?.cgstRate && inv.tax.cgstRate > 0 && <tr className="border-b"><td colSpan={3} className="px-3 py-1.5 border-r"></td><td className="px-3 py-1.5 text-right border-r">CGST {inv.tax.cgstRate}%</td><td className="px-3 py-1.5 text-right">{fmt(inv.tax.cgstAmount || 0, inv.currency)}</td></tr>}
            {inv.tax?.igstRate && inv.tax.igstRate > 0 && <tr className="border-b"><td colSpan={3} className="px-3 py-1.5 border-r"></td><td className="px-3 py-1.5 text-right border-r">IGST {inv.tax.igstRate}%</td><td className="px-3 py-1.5 text-right">{fmt(inv.tax.igstAmount || 0, inv.currency)}</td></tr>}
            <tr className="font-bold bg-gray-50 print:bg-gray-50"><td colSpan={4} className="px-3 py-1.5 text-right border-r">Total</td><td className="px-3 py-1.5 text-right">{fmt(inv.totalAmount, inv.currency)}</td></tr>
          </tbody>
        </table>

        {inv.amountInWords && <p className="text-sm print:text-xs italic"><strong>Amount in Words:</strong> {inv.amountInWords}</p>}

        {/* Bank details */}
        {inv.bankDetails?.accountNumber && (
          <div className="invoice-section">
            <h3 className="font-semibold text-sm print:text-xs mb-1.5">Wire Transfer Details:</h3>
            <table className="border text-sm print:text-xs w-full max-w-lg"><tbody>
              {([["Bank Name", inv.bankDetails.bankName], ["A/c Holder", inv.bankDetails.accountHolderName], ["Account No.", inv.bankDetails.accountNumber], ["IFSC", inv.bankDetails.ifscCode], ["PAN", inv.bankDetails.panCardNo], ["Swift", inv.bankDetails.swiftCode]] as [string, string][]).filter(([, v]) => v).map(([l, v], i) => <tr key={i} className="border-b"><td className="px-3 py-1 print:px-2 print:py-0.5 font-medium bg-gray-50 border-r w-1/3">{l}</td><td className="px-3 py-1 print:px-2 print:py-0.5">{v}</td></tr>)}
            </tbody></table>
          </div>
        )}

        {inv.taxDisclaimer && <p className="text-xs text-gray-500 italic border-t pt-3 print:pt-2">&ldquo;{inv.taxDisclaimer}&rdquo;</p>}

        {/* Signature */}
        <div className="invoice-signature pt-6 print:pt-4">
          <p className="font-medium text-sm print:text-xs">Signature</p>
          <div className="h-12 print:h-8 border-b border-dashed border-gray-300 w-48 mt-1"></div>
          <div className="mt-2 text-sm print:text-xs">
            <p><strong>Name:</strong> {inv.sender?.name}</p>
            <p><strong>Phone:</strong> {inv.sender?.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modern Template ────────────────────────────────────────────────────

function ModernTpl({ inv, p }: { inv: InvoiceData; p: any }) {
  return (
    <div className="bg-white border text-black print:border-none print:shadow-none shadow-sm overflow-hidden print:text-[11px]">
      <div className="h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 print:h-1.5"></div>
      <div className="p-10 print:p-5 space-y-8 print:space-y-4">
        <div className="invoice-section flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            {p?.logoUrl ? <img src={p.logoUrl} alt="" className="h-14 print:h-10 w-auto mb-3 print:mb-1" /> : <h1 className="text-3xl print:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{inv.sender?.name}</h1>}
            <div className="text-sm print:text-xs text-gray-500 mt-2 print:mt-1 space-y-0.5"><p>{inv.sender?.address}</p><p>{inv.sender?.email} | {inv.sender?.phone}</p>{inv.sender?.gstNumber && <p>GSTIN: {inv.sender.gstNumber}</p>}</div>
          </div>
          <div className="text-right shrink-0"><h2 className="text-4xl print:text-2xl font-extralight tracking-wider text-gray-800 mb-3 print:mb-1">{inv.invoiceDocumentType === "proforma" ? "PROFORMA INVOICE" : "INVOICE"}</h2><p className="font-medium text-gray-700">{inv.invoiceNumber}</p><p className="text-sm print:text-xs text-gray-500">{new Date(inv.invoiceDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p></div>
        </div>
        <div className="invoice-section bg-gray-50 rounded-xl print:rounded-lg p-5 print:p-3"><p className="text-[10px] print:text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-2 print:mb-1">Bill To</p><p className="font-bold text-lg print:text-sm">{inv.recipient?.companyName || inv.recipient?.name}</p><p className="text-sm print:text-xs text-gray-600">{inv.recipient?.address}</p>{inv.recipient?.gstin && <p className="text-sm print:text-xs text-gray-600">GSTIN: {inv.recipient.gstin}</p>}</div>
        <table className="w-full text-sm print:text-xs"><thead><tr className="border-b-2 border-gray-200"><th className="text-left py-2 font-semibold text-gray-500">Description</th><th className="text-right py-2 font-semibold text-gray-500 w-28">Amount</th></tr></thead>
          <tbody>{inv.lineItems.map((it, i) => <tr key={i} className="border-b border-gray-100"><td className="py-2">{it.description}</td><td className="py-2 text-right font-medium">{fmt(it.amount, inv.currency)}</td></tr>)}</tbody></table>
        <div className="invoice-section flex justify-end"><div className="w-72 print:w-60 space-y-1.5 text-sm print:text-xs">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmt(inv.subTotal, inv.currency)}</span></div>
          {inv.tax?.sgstRate && <div className="flex justify-between"><span className="text-gray-500">SGST ({inv.tax.sgstRate}%)</span><span>{fmt(inv.tax.sgstAmount || 0)}</span></div>}
          {inv.tax?.cgstRate && <div className="flex justify-between"><span className="text-gray-500">CGST ({inv.tax.cgstRate}%)</span><span>{fmt(inv.tax.cgstAmount || 0)}</span></div>}
          {inv.tax?.igstRate && <div className="flex justify-between"><span className="text-gray-500">IGST ({inv.tax.igstRate}%)</span><span>{fmt(inv.tax.igstAmount || 0)}</span></div>}
          <div className="flex justify-between text-lg print:text-sm font-bold border-t-2 pt-2"><span>Total</span><span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{fmt(inv.totalAmount, inv.currency)}</span></div>
          {inv.amountInWords && <p className="text-xs print:text-[9px] text-gray-400 italic">{inv.amountInWords}</p>}
        </div></div>
        <div className="invoice-section grid grid-cols-2 gap-8 print:gap-4 border-t pt-4 print:pt-3">
          <div><p className="text-[10px] print:text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-2 print:mb-1">Bank Details</p><div className="text-sm print:text-xs text-gray-600 space-y-0.5">{inv.bankDetails?.accountHolderName && <p>{inv.bankDetails.accountHolderName}</p>}{inv.bankDetails?.accountNumber && <p>A/C: {inv.bankDetails.accountNumber}</p>}{inv.bankDetails?.ifscCode && <p>IFSC: {inv.bankDetails.ifscCode}</p>}</div></div>
          <div><p className="text-[10px] print:text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-2 print:mb-1">Notes</p><p className="text-sm print:text-xs text-gray-500">{inv.notes || "Thank you for your business!"}</p></div>
        </div>
      </div>
    </div>
  );
}

// ─── Classic Template ───────────────────────────────────────────────────

function ClassicTpl({ inv, p }: { inv: InvoiceData; p: any }) {
  return (
    <div className="bg-white border text-black print:border-none print:shadow-none shadow-sm print:text-[11px]">
      <div className="p-8 print:p-5 space-y-5 print:space-y-3">
        <div className="invoice-section text-center border-b-2 border-black pb-3 print:pb-2">{p?.logoUrl && <img src={p.logoUrl} alt="" className="h-12 print:h-8 w-auto mx-auto mb-2" />}<h1 className="text-2xl print:text-lg font-bold uppercase tracking-wider">{inv.sender?.name}</h1><p className="text-sm print:text-xs mt-1">{inv.sender?.address}</p>{inv.sender?.gstNumber && <p className="text-sm print:text-xs font-medium mt-1">GSTIN: {inv.sender.gstNumber}</p>}</div>
        <h2 className="text-center text-xl print:text-base font-bold border border-black py-1.5">{inv.invoiceDocumentType === "proforma" ? "PROFORMA INVOICE" : "TAX INVOICE"}</h2>
        <div className="invoice-section grid grid-cols-2 gap-4 print:gap-3">
          <div className="border p-3 print:p-2 text-sm print:text-xs space-y-0.5"><p><strong>Invoice No:</strong> {inv.invoiceNumber}</p><p><strong>Date:</strong> {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}</p>{inv.uin && <p><strong>UIN:</strong> {inv.uin}</p>}</div>
          <div className="border p-3 print:p-2 text-sm print:text-xs space-y-0.5"><p className="font-bold text-xs uppercase text-gray-500 mb-1">Bill To:</p><p className="font-bold">{inv.recipient?.companyName || inv.recipient?.name}</p><p>{inv.recipient?.address}</p>{inv.recipient?.gstin && <p>GSTIN: {inv.recipient.gstin}</p>}</div>
        </div>
        <table className="w-full border border-black text-sm print:text-xs"><thead><tr className="bg-gray-200 print:bg-gray-200"><th className="border border-black px-2 py-1.5 text-left w-8">S.No</th><th className="border border-black px-2 py-1.5 text-left w-20">HSN</th><th className="border border-black px-2 py-1.5 text-left">Particulars</th><th className="border border-black px-2 py-1.5 text-right w-28">Amount</th></tr></thead>
          <tbody>
            {inv.lineItems.map((it, i) => <tr key={i}><td className="border border-black px-2 py-1.5">{i + 1}</td><td className="border border-black px-2 py-1.5 text-xs">{it.hsn || ""}</td><td className="border border-black px-2 py-1.5">{it.description}</td><td className="border border-black px-2 py-1.5 text-right">{fmt(it.amount, inv.currency)}</td></tr>)}
            <tr className="font-medium"><td className="border border-black px-2 py-1.5" colSpan={3}>Sub-Total</td><td className="border border-black px-2 py-1.5 text-right">{fmt(inv.subTotal, inv.currency)}</td></tr>
            {inv.tax?.sgstRate && <tr><td className="border border-black px-2 py-1.5" colSpan={3}>SGST @ {inv.tax.sgstRate}%</td><td className="border border-black px-2 py-1.5 text-right">{fmt(inv.tax.sgstAmount || 0)}</td></tr>}
            {inv.tax?.cgstRate && <tr><td className="border border-black px-2 py-1.5" colSpan={3}>CGST @ {inv.tax.cgstRate}%</td><td className="border border-black px-2 py-1.5 text-right">{fmt(inv.tax.cgstAmount || 0)}</td></tr>}
            {inv.tax?.igstRate && <tr><td className="border border-black px-2 py-1.5" colSpan={3}>IGST @ {inv.tax.igstRate}%</td><td className="border border-black px-2 py-1.5 text-right">{fmt(inv.tax.igstAmount || 0)}</td></tr>}
            <tr className="font-bold bg-gray-100 print:bg-gray-100"><td className="border border-black px-2 py-1.5" colSpan={3}>TOTAL</td><td className="border border-black px-2 py-1.5 text-right">{fmt(inv.totalAmount, inv.currency)}</td></tr>
          </tbody></table>
        {inv.amountInWords && <p className="text-sm print:text-xs"><strong>Amount in Words:</strong> {inv.amountInWords}</p>}
        {inv.bankDetails?.accountNumber && <div className="invoice-section"><h3 className="font-bold text-sm print:text-xs border-b border-black pb-1 mb-1.5">Bank Details:</h3><div className="text-sm print:text-xs space-y-0.5"><p>A/C Holder: {inv.bankDetails.accountHolderName}</p><p>A/C No: {inv.bankDetails.accountNumber}</p>{inv.bankDetails.ifscCode && <p>IFSC: {inv.bankDetails.ifscCode}</p>}</div></div>}
        <div className="invoice-signature flex justify-between items-end pt-6 print:pt-4">
          <div>{inv.taxDisclaimer && <p className="text-xs text-gray-500 italic max-w-md">&ldquo;{inv.taxDisclaimer}&rdquo;</p>}</div>
          <div className="text-center"><div className="h-12 print:h-8 w-48 border-b border-black"></div><p className="text-sm print:text-xs font-medium mt-1.5">Authorized Signatory</p><p className="text-sm print:text-xs">{inv.sender?.name}</p></div>
        </div>
      </div>
    </div>
  );
}

// ─── Reimbursement Template ─────────────────────────────────────────────

function ReimburseTpl({ inv, p }: { inv: InvoiceData; p: any }) {
  return (
    <div className="bg-white border text-black print:border-none print:shadow-none shadow-sm print:text-[11px]">
      <div className="text-center border-b py-2 text-xs text-gray-500">Reimbursement/Expense Claim Format</div>
      <div className="p-8 print:p-5 space-y-5 print:space-y-3">
        <div className="invoice-section border-2 border-gray-800">
          <div className="bg-yellow-50 px-4 py-1.5 border-b print:bg-yellow-50">{p?.logoUrl && <img src={p.logoUrl} alt="" className="h-10 print:h-7 w-auto mx-auto mb-1" />}<h2 className="text-center font-bold text-lg print:text-sm">{inv.recipient?.companyName || inv.toCompanyName || "Company"}</h2></div>
          <div className="grid grid-cols-2 text-sm print:text-xs">
            <div className="border-r border-b px-3 py-1 print:px-2"><strong>NAME:</strong> {inv.sender?.name}</div>
            <div className="border-b px-3 py-1 print:px-2"><strong>BENEFICIARY A/C:</strong> {inv.bankDetails?.accountHolderName}</div>
            <div className="border-r border-b px-3 py-1 print:px-2"><strong>PAN:</strong> {inv.sender?.pan}</div>
            <div className="border-b px-3 py-1 print:px-2"><strong>A/C NUMBER:</strong> {inv.bankDetails?.accountNumber}</div>
            <div className="border-r px-3 py-1 print:px-2"><strong>LOCATION:</strong> {inv.sender?.location || inv.sender?.address}</div>
            <div className="px-3 py-1 print:px-2"><strong>IFSC:</strong> {inv.bankDetails?.ifscCode}</div>
          </div>
        </div>
        <div className="bg-yellow-50 border px-4 py-1.5 inline-block print:bg-yellow-50 text-sm print:text-xs"><strong>CLAIM DATE:</strong> {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}</div>
        <table className="w-full border text-sm print:text-xs"><thead><tr className="bg-yellow-50 print:bg-yellow-50"><th className="border px-3 py-1.5 text-left">Nature of expense</th><th className="border px-3 py-1.5 text-right">Amount (INR)</th></tr></thead>
          <tbody>
            {inv.lineItems.map((it, i) => <tr key={i}><td className="border px-3 py-1.5">{it.description}</td><td className="border px-3 py-1.5 text-right">{fmt(it.amount)}</td></tr>)}
            {inv.lineItems.length < 5 && Array.from({ length: 5 - inv.lineItems.length }).map((_, i) => <tr key={`e${i}`}><td className="border px-3 py-2"></td><td className="border px-3 py-2"></td></tr>)}
          </tbody></table>
        <div className="invoice-section flex justify-end"><table className="border text-sm print:text-xs w-64"><tbody>
          <tr className="bg-gray-100 print:bg-gray-100"><td className="border px-3 py-1 font-medium">SUB-TOTAL</td><td className="border px-3 py-1 text-right">{fmt(inv.subTotal)}</td></tr>
          {inv.tax?.sgstAmount && <tr><td className="border px-3 py-1">SGST</td><td className="border px-3 py-1 text-right">{fmt(inv.tax.sgstAmount)}</td></tr>}
          {inv.tax?.cgstAmount && <tr><td className="border px-3 py-1">CGST</td><td className="border px-3 py-1 text-right">{fmt(inv.tax.cgstAmount)}</td></tr>}
          <tr className="bg-gray-100 print:bg-gray-100 font-bold"><td className="border px-3 py-1">TOTAL INR</td><td className="border px-3 py-1 text-right">{fmt(inv.totalAmount)}</td></tr>
        </tbody></table></div>
        <div className="invoice-signature border-t pt-3 print:pt-2"><p className="text-sm print:text-xs"><strong>Signature:</strong></p><div className="h-12 print:h-8 border-b border-dashed w-48 mt-1"></div></div>
      </div>
    </div>
  );
}
