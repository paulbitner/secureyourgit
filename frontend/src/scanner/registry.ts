import type { Rule } from './types';

/**
 * Every module in ./rules/ that default-exports a Rule is registered
 * automatically. Adding a rule = adding one file.
 */
const modules = import.meta.glob<{ default: Rule }>('./rules/*.ts', { eager: true });

export const rules: readonly Rule[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.id.localeCompare(b.id));

export function getRule(id: string): Rule | undefined {
  return rules.find((r) => r.id === id);
}
