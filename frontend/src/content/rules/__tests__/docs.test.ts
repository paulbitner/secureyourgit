import { describe, expect, it } from 'vitest';
import { rules } from '../../../scanner/registry';
import { scan } from '../../../scanner/scan';
import { getRuleDoc, proseWordCount, ruleDocs } from '../index';

const ALLOWED_REFERENCE_HOSTS = ['docs.github.com', 'securitylab.github.com', 'github.com'];

describe('rule documentation', () => {
  it('exists for every registered rule and nothing else', () => {
    expect(ruleDocs.map((d) => d.id).sort()).toEqual(rules.map((r) => r.id).sort());
  });

  describe.each(rules.map((r) => r.id))('%s', (id) => {
    const doc = getRuleDoc(id)!;

    it('has 400–800 words of prose', () => {
      const words = proseWordCount(doc);
      expect(words).toBeGreaterThanOrEqual(400);
      expect(words).toBeLessThanOrEqual(800);
    });

    it('has SEO metadata within recommended lengths', () => {
      expect(doc.metaTitle.length).toBeLessThanOrEqual(60);
      expect(doc.metaDescription.length).toBeGreaterThanOrEqual(120);
      expect(doc.metaDescription.length).toBeLessThanOrEqual(160);
    });

    it('has an FAQ and official references', () => {
      expect(doc.faq.length).toBeGreaterThanOrEqual(3);
      expect(doc.references.length).toBeGreaterThanOrEqual(2);
      for (const ref of doc.references) expect(ALLOWED_REFERENCE_HOSTS).toContain(new URL(ref.url).hostname);
    });

    it('vulnerable example triggers the rule; fixed example parses and does not', () => {
      const vulnerable = scan(doc.vulnerable.code);
      expect(vulnerable.parseErrors).toEqual([]);
      expect(vulnerable.findings.some((f) => f.ruleId === id)).toBe(true);

      const fixed = scan(doc.fixed.code);
      expect(fixed.parseErrors).toEqual([]);
      expect(fixed.findings.filter((f) => f.ruleId === id)).toEqual([]);
    });
  });
});
