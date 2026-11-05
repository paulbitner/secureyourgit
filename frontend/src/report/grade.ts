import { SEVERITY_ORDER, type Finding, type Severity } from '../scanner/types';

/**
 * Grading formula (also shown in the UI and README):
 *
 *   score = max(0, 100 − 40·critical − 15·high − 5·medium − 1·low)
 *
 *   A ≥ 90 · B ≥ 80 · C ≥ 70 · D ≥ 60 · F < 60
 *
 * The weights mean one critical finding caps the grade at D and two make it
 * F; a single high finding drops an otherwise clean file to B; medium and low
 * findings alone rarely fall below B.
 */
export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 40,
  high: 15,
  medium: 5,
  low: 1,
};

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export const GRADE_THRESHOLDS: readonly [Grade, number][] = [
  ['A', 90],
  ['B', 80],
  ['C', 70],
  ['D', 60],
  ['F', 0],
];

export interface GradeResult {
  grade: Grade;
  score: number;
  counts: Record<Severity, number>;
  total: number;
}

export function countBySeverity(findings: readonly Finding[]): Record<Severity, number> {
  const counts = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, 0])) as Record<Severity, number>;
  for (const f of findings) counts[f.severity]++;
  return counts;
}

export function gradeFindings(findings: readonly Finding[]): GradeResult {
  const counts = countBySeverity(findings);
  const penalty = SEVERITY_ORDER.reduce((sum, s) => sum + SEVERITY_WEIGHTS[s] * counts[s], 0);
  const score = Math.max(0, 100 - penalty);
  const grade = GRADE_THRESHOLDS.find(([, min]) => score >= min)![0];
  return { grade, score, counts, total: findings.length };
}
