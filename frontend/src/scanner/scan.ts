import { site } from '../config/site';
import { parseWorkflow, type ParseError } from './parse';
import { rules as registeredRules } from './registry';
import { SEVERITY_ORDER, type Finding, type Rule, type ScanContext } from './types';
import { buildWorkflowModel, type WorkflowModel } from './workflow';

export interface ScanResult {
  findings: Finding[];
  parseErrors: ParseError[];
  kind: WorkflowModel['kind'];
  /** Set when the input exceeds the size limit; nothing is parsed. */
  tooLarge: boolean;
}

export function byteLength(source: string): number {
  return new TextEncoder().encode(source).length;
}

export function compareFindings(a: Finding, b: Finding): number {
  return (
    SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
    a.line - b.line ||
    a.column - b.column ||
    a.ruleId.localeCompare(b.ruleId)
  );
}

export function scan(source: string, rules: readonly Rule[] = registeredRules): ScanResult {
  if (byteLength(source) > site.maxInputBytes) {
    return { findings: [], parseErrors: [], kind: 'unknown', tooLarge: true };
  }
  const { doc, lineCounter, errors } = parseWorkflow(source);
  if (errors.length > 0) {
    return { findings: [], parseErrors: errors, kind: 'unknown', tooLarge: false };
  }
  const workflow = buildWorkflowModel(doc);
  const ctx: ScanContext = { source, doc, lineCounter, workflow };

  const seen = new Set<string>();
  const findings: Finding[] = [];
  for (const rule of rules) {
    let results: Finding[];
    try {
      results = rule.check(ctx);
    } catch (err) {
      // A buggy rule must never take down the whole scan.
      console.error(`Rule ${rule.id} failed`, err);
      continue;
    }
    for (const f of results) {
      // Aliased/merged nodes can be visited more than once; report each spot once.
      const key = `${f.ruleId}|${f.offset}|${f.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push(f);
    }
  }
  findings.sort(compareFindings);
  return { findings, parseErrors: [], kind: workflow.kind, tooLarge: false };
}
