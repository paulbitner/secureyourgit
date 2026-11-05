import { readFileSync } from 'node:fs';
import { getRule } from '../registry';
import { scan } from '../scan';
import type { Finding } from '../types';

export function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}

/** Run a single rule against a source string. */
export function runRule(ruleId: string, source: string): Finding[] {
  const rule = getRule(ruleId);
  if (!rule) throw new Error(`Unknown rule ${ruleId}`);
  const result = scan(source, [rule]);
  if (result.parseErrors.length) throw new Error(`Fixture failed to parse: ${result.parseErrors[0]?.message}`);
  return result.findings;
}

/** Text of the source line a finding points at. */
export function lineOf(source: string, f: Finding): string {
  return source.split('\n')[f.line - 1] ?? '';
}
