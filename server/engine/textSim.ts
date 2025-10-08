export function similarity(a: string, b: string): number {
  // 아주 단순 Jaccard-like 유사도(토큰 집합 기반)
  const ta = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const tb = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  const inter = Array.from(ta).filter(x => tb.has(x)).length;
  const uni = new Set([...Array.from(ta), ...Array.from(tb)]).size || 1;
  return inter / uni;
}
