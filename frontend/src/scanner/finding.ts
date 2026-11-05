import type { Node } from 'yaml';
import { locateNode } from './location';
import type { Finding, Location, ScanContext } from './types';

type FindingFields = Omit<Finding, keyof Location | 'ruleId'>;

/** Build a finding anchored at a node (or an explicit location). */
export function makeFinding(
  ctx: ScanContext,
  ruleId: string,
  at: Node | Location | undefined,
  fields: FindingFields,
): Finding {
  const loc = at && 'line' in at ? at : locateNode(ctx.lineCounter, ctx.source, at);
  return { ruleId, ...loc, ...fields };
}

/** Render `key: value` YAML at a given indent; used to build fix snippets. */
export function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((l) => (l ? pad + l : l))
    .join('\n');
}
