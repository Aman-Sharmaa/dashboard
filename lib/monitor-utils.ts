export function parseUpStatusCodes(input: unknown): number[] {
  if (Array.isArray(input)) return input.filter((n) => typeof n === "number" && n >= 0 && n < 600).slice(0, 50);
  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return [];
    if (s.includes("-")) {
      const [a, b] = s.split("-").map((x) => parseInt(x.trim(), 10));
      if (!Number.isFinite(a) || !Number.isFinite(b) || a > b) return [];
      const out: number[] = [];
      for (let i = a; i <= b && out.length < 100; i++) out.push(i);
      return out;
    }
    return s
      .split(",")
      .map((x) => parseInt(x.trim(), 10))
      .filter((n) => Number.isFinite(n))
      .slice(0, 50);
  }
  return [];
}
