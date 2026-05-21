/** Open Library cover by ISBN — free, no API key, direct image URL. */
export function openLibraryCoverByIsbn(isbn?: string | null): string | null {
  if (!isbn?.trim()) return null;
  const clean = isbn.replace(/[-\s]/g, '');
  if (!clean) return null;
  return `https://covers.openlibrary.org/b/isbn/${clean}-M.jpg`;
}

/** Open Library cover by title — free, no API key, direct image URL. */
export function openLibraryCoverByTitle(title?: string | null): string | null {
  if (!title?.trim()) return null;
  return `https://covers.openlibrary.org/b/title/${encodeURIComponent(title.trim())}-M.jpg`;
}

/**
 * Resolve a cover URI synchronously.
 * Order: stored URL → Open Library (ISBN) → Open Library (title)
 */
export function resolveCoverUri(
  coverImageUrl?: string | null,
  isbn?: string | null,
  title?: string | null,
): string | null {
  if (coverImageUrl?.trim()) return coverImageUrl.trim();
  if (isbn?.trim()) return openLibraryCoverByIsbn(isbn);
  if (title?.trim()) return openLibraryCoverByTitle(title);
  return null;
}

// Keep old two-arg signature working for existing callers
export { resolveCoverUri as resolveCoverUriFull };

// No-op stub so any existing import of fetchGoogleBooksCover doesn't break
export async function fetchGoogleBooksCover(
  _title: string,
  _author?: string | null,
  _isbn?: string | null,
): Promise<string | null> {
  return null;
}
