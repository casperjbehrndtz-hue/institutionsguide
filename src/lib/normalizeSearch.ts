/** Normalize Danish characters for accent-tolerant search */
export function normalizeSearch(str: string): string {
  return str
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/é/g, "e")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ä/g, "a");
}
