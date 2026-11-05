/** Long-form documentation for one rule, rendered at /rules/<id>/. Inline `code` is supported in text. */
export interface RuleDoc {
  id: string;
  /** <title>, ≤ 60 characters before the site suffix. */
  metaTitle: string;
  /** 120–160 characters. */
  metaDescription: string;
  h1: string;
  summary: string;
  sections: { heading: string; paragraphs: string[]; list?: string[] }[];
  vulnerable: { caption: string; code: string };
  fixed: { caption: string; code: string };
  references: { title: string; url: string }[];
  faq: { q: string; a: string }[];
}
