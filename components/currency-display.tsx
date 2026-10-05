"use client";

import { usePrivacy } from "./privacy-context";
import { formatAmount, NATIONAL_CURRENCY } from "@/lib/currencies";

interface CurrencyDisplayProps {
  value: number;
  currency?: string;
  className?: string;
  compact?: boolean;
}

export function CurrencyDisplay({
  value,
  currency = NATIONAL_CURRENCY,
  className = "",
  compact = false,
}: CurrencyDisplayProps) {
  const { isPrivacyMode } = usePrivacy();

  return (
    <span
      className={`inline-block transition-all duration-200 ${
        isPrivacyMode ? "blur-[8px] select-none" : ""
      } ${className}`.trim()}
      style={isPrivacyMode ? { userSelect: "none" } : undefined}
    >
      {formatAmount(value, currency, {
        maximumFractionDigits: 0,
        compact,
      })}
    </span>
  );
}

