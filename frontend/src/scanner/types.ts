import type { Document, LineCounter } from 'yaml';
import type { WorkflowModel } from './workflow';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export const SEVERITY_ORDER: readonly Severity[] = ['critical', 'high', 'medium', 'low'];

/** 1-based line/column span in the original source. */
export interface Location {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  /** 0-based character offsets into the source. */
  offset: number;
  endOffset: number;
}

export interface Finding extends Location {
  ruleId: string;
  severity: Severity;
  /** Short, specific title for this occurrence. */
  title: string;
  /** What's wrong — one or two sentences, plain English. */
  message: string;
  /** Why it matters. */
  why: string;
  /** Corrected YAML snippet. */
  fix?: string;
  /** Machine-readable details (e.g. the action ref, used by the pin-all fixer). */
  data?: Record<string, string>;
}

export interface ScanContext {
  source: string;
  doc: Document.Parsed;
  lineCounter: LineCounter;
  workflow: WorkflowModel;
}

export interface Rule {
  id: string;
  title: string;
  /** Highest severity this rule can emit. */
  severity: Severity;
  description: string;
  check(ctx: ScanContext): Finding[];
}
