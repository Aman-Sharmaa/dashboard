export const NATIONAL_CURRENCY = "INR";

export type CurrencyOption = {
  code: string;
  label: string;
  symbol: string;
};

/** Currencies available for international invoices (excludes INR). */
export const INTERNATIONAL_CURRENCIES: CurrencyOption[] = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { code: "AED", label: "UAE Dirham", symbol: "AED" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "NZD", label: "New Zealand Dollar", symbol: "NZ$" },
  { code: "HKD", label: "Hong Kong Dollar", symbol: "HK$" },
  { code: "SAR", label: "Saudi Riyal", symbol: "SAR" },
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
];

const SYMBOL_MAP = Object.fromEntries(
  [NATIONAL_CURRENCY, ...INTERNATIONAL_CURRENCIES.map((c) => c.code)].map((code) => [
    code,
    code === NATIONAL_CURRENCY ? "₹" : INTERNATIONAL_CURRENCIES.find((c) => c.code === code)?.symbol || code,
  ])
);

export function isInternationalCurrency(currency?: string | null): boolean {
  return !!currency && currency !== NATIONAL_CURRENCY;
}

export function getCurrencySymbol(currency: string = NATIONAL_CURRENCY): string {
  return SYMBOL_MAP[currency] || currency;
}

export function formatCurrencyLabel(currency: string): string {
  if (currency === NATIONAL_CURRENCY) return "INR (₹)";
  const match = INTERNATIONAL_CURRENCIES.find((c) => c.code === currency);
  return match ? `${match.code} (${match.symbol})` : currency;
}

export function defaultInternationalCurrency(current?: string): string {
  if (current && isInternationalCurrency(current)) return current;
  return "USD";
}

/** Format number with currency symbol (e.g. ₹1,20,000 or $1,200) */
export function formatAmount(
  amount: number | null | undefined,
  currency: string = NATIONAL_CURRENCY,
  options?: { maximumFractionDigits?: number; compact?: boolean }
): string {
  if (amount == null || isNaN(amount)) return `${getCurrencySymbol(currency)}0`;
  const symbol = getCurrencySymbol(currency);
  const locale = currency === NATIONAL_CURRENCY ? "en-IN" : "en-US";

  if (options?.compact) {
    return `${symbol}${new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: options.maximumFractionDigits ?? 1,
    }).format(amount)}`;
  }

  return `${symbol}${new Intl.NumberFormat(locale, {
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(amount)}`;
}
