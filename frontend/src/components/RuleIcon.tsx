import { createElement } from 'react';
import { GitPullRequestArrow, KeyRound, type LucideIcon, Pin, ShieldAlert, SquareTerminal, Vault } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  'unpinned-action': Pin,
  'excessive-permissions': KeyRound,
  'dangerous-pull-request-target': GitPullRequestArrow,
  'script-injection': SquareTerminal,
  'secrets-exposure': Vault,
};

export function RuleIcon({ id, size }: { id: string; size: number }) {
  return createElement(ICONS[id] ?? ShieldAlert, { size, 'aria-hidden': true });
}
