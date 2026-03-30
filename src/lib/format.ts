export function formatDKK(n: number | null | undefined): string {
  if (n == null) return "–";
  return n.toLocaleString("da-DK", { maximumFractionDigits: 0 }) + " kr.";
}

export function formatNumber(n: number): string {
  return n.toLocaleString("da-DK", { maximumFractionDigits: 0 });
}

export function formatDecimal(n: number): string {
  return n.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatPercent(n: number): string {
  return n.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}
