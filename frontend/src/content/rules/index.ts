import type { RuleDoc } from './types';

const modules = import.meta.glob<{ default: RuleDoc }>('./*.doc.ts', { eager: true });

export const ruleDocs: readonly RuleDoc[] = Object.values(modules).map((m) => m.default);

export function getRuleDoc(id: string): RuleDoc | undefined {
  return ruleDocs.find((d) => d.id === id);
}

/** Words of explanatory prose (summary, sections, FAQ) — excludes code samples. */
export function proseWordCount(doc: RuleDoc): number {
  const text = [
    doc.summary,
    ...doc.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.list ?? [])]),
    ...doc.faq.flatMap((f) => [f.q, f.a]),
  ].join(' ');
  return text.split(/\s+/).filter(Boolean).length;
}
