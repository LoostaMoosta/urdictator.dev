/**
 * Format representasi jumlah manusia/pasukan (Manpower).
 * 2.500.000 -> "2.5M", 850.000 -> "850k"
 */
export function manpower(n: number) {
  const a = Math.abs(n);
  const s = n < 0 ? "−" : "";
  if (a >= 1_000_000) return `${s}${(a / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${s}${Math.round(a / 1_000)}k`;
  return `${s}${Math.round(a)}`;
}

/**
 * Pengonversi Industrial Capacity (IC) cost/delta.
 */
export function icDelta(n: number) {
  if (Math.round(n) === 0) return "—";
  return `${n > 0 ? "+" : "−"}${Math.abs(n)} IC`;
}

/**
 * Format persentase (Organization, Strength, Tension).
 */
export function pctRate(r: number) {
  return `${r.toFixed(1)}%`;
}
