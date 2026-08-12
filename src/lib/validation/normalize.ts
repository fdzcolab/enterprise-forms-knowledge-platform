export function normalizeUnicode(input: string) {
  return input.normalize("NFKC").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\u200c\u200d\s]+/g, " ").trim();
}
export function evidenceExists(source: string, evidence: string) {
  const s = normalizeUnicode(source);
  const e = normalizeUnicode(evidence);
  return e.length > 0 && s.includes(e);
}
