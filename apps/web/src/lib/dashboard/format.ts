const compactInt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const fullInt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const decimal3 = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 3,
  minimumFractionDigits: 0,
});

const decimal1 = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

export function fmtInt(n: number): string {
  return fullInt.format(n);
}

export function fmtIntCompact(n: number): string {
  return compactInt.format(n);
}

export function fmtDecimal3(n: number): string {
  return decimal3.format(n);
}

// Freight is stored in millions; show with the M suffix.
export function fmtMillion(n: number): string {
  return `${decimal3.format(n)} M`;
}

export function fmtTonnage(n: number): string {
  return `${fullInt.format(n)} t`;
}

export function fmtPct(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${decimal1.format(n)}%`;
}

export function fmtSignedMillion(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${decimal3.format(n)} M`;
}
