/** Wire shapes returned by `GET /api/search` and `GET /api/search/popular-categories`. */

export interface SearchCategoryResult {
  id: string;
  name: string;
  slug: string;
  image: string;
}

export interface SearchProductResult {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  categoryName: string;
  categorySlug: string;
}

export interface SearchResults {
  categories: SearchCategoryResult[];
  products: SearchProductResult[];
}

export const EMPTY_SEARCH_RESULTS: SearchResults = { categories: [], products: [] };

export type SearchItemKind = 'category' | 'product';

/**
 * Categories and products flattened into one ordered list. Arrow-key navigation
 * and `aria-activedescendant` both need a single index space across the two
 * groups, which the grouped render shape cannot provide on its own.
 */
export interface FlatSearchItem {
  kind: SearchItemKind;
  /** Stable DOM id, referenced by aria-activedescendant. */
  domId: string;
  routerLink: readonly [string, string];
  category?: SearchCategoryResult;
  product?: SearchProductResult;
}

/** One run of text, flagged as matching the query or not, for safe highlighting. */
export interface HighlightSegment {
  text: string;
  match: boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Splits `text` around case-insensitive occurrences of `term` so the template
 * can render matches with `@for` + interpolation. Deliberately avoids building
 * an HTML string — nothing here ever reaches `innerHTML`, so a product name
 * containing markup cannot become markup.
 */
export function toHighlightSegments(text: string, term: string): HighlightSegment[] {
  const needle = term.trim();
  if (!needle) {
    return [{ text, match: false }];
  }

  const segments: HighlightSegment[] = [];
  const pattern = new RegExp(escapeRegExp(needle), 'gi');
  let lastIndex = 0;

  for (const found of text.matchAll(pattern)) {
    const start = found.index;
    if (start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, start), match: false });
    }
    segments.push({ text: found[0], match: true });
    lastIndex = start + found[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), match: false });
  }
  return segments.length > 0 ? segments : [{ text, match: false }];
}
