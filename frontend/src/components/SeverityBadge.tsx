import type { Severity } from '../scanner/types';

const CLASS: Record<Severity, string> = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={CLASS[severity]}>{severity}</span>;
}
