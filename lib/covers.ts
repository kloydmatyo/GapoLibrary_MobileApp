/** Open Library cover by ISBN — free, no API key required. */
export function openLibraryCoverUrl(isbn?: string | null): string | null {
  if (!isbn?.trim()) return null;
  const clean = isbn.replace(/[-\s]/g, '');
  if (!clean) return null;
  return `https://covers.openlibrary.org/b/isbn/${clean}-M.jpg`;
}

/** Prefer backend cover URL, then Open Library from ISBN. */
export function resolveCoverUri(
  coverImageUrl?: string | null,
  isbn?: string | null,
): string | null {
  if (coverImageUrl?.trim()) return coverImageUrl.trim();
  return openLibraryCoverUrl(isbn);
}
