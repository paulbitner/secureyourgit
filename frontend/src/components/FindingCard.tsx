import { ChevronDown, CornerDownRight } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router-dom';
import { getRule } from '../scanner/registry';
import type { Finding } from '../scanner/types';
import { CodeBlock } from './CodeBlock';
import { Md } from './Md';
import { SeverityBadge } from './SeverityBadge';

interface Props {
  finding: Finding;
  expanded: boolean;
  onToggle: () => void;
  onReveal: () => void;
}

export function FindingCard({ finding: f, expanded, onToggle, onReveal }: Props) {
  const panelId = useId();
  const rule = getRule(f.ruleId);
  return (
    <li className="border-b border-border py-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <SeverityBadge severity={f.severity} />
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm link"
          onClick={onReveal}
          aria-label={`Show line ${f.line} in the editor`}
        >
          <CornerDownRight size={14} aria-hidden />
          Line {f.line}
        </button>
        {rule && (
          <>
            <span aria-hidden className="text-fg-muted">
              ·
            </span>
            <Link to={`/rules/${f.ruleId}/`} className="text-sm text-fg-muted underline underline-offset-2 hover:text-primary">
              {rule.title}
            </Link>
          </>
        )}
      </div>

      <h3 className="mt-2 text-lead">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-4 text-left hover:text-primary"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="min-w-0">
            <Md>{f.title}</Md>
          </span>
          <ChevronDown
            size={20}
            aria-hidden
            className={`mt-0.5 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </h3>

      <p className="mt-1">
        <Md>{f.message}</Md>
      </p>

      <div id={panelId} hidden={!expanded} className="mt-4 space-y-4">
        <div>
          <h4 className="text-label uppercase text-fg-muted">Why it matters</h4>
          <p className="mt-1">
            <Md>{f.why}</Md>
          </p>
        </div>
        {f.fix && (
          <div>
            <h4 className="mb-2 text-label uppercase text-fg-muted">Suggested fix</h4>
            <CodeBlock code={f.fix} label="Fixed YAML" tone="good" />
          </div>
        )}
        {rule && (
          <Link to={`/rules/${f.ruleId}/`} className="link inline-block text-sm">
            Learn more: {rule.title} →
          </Link>
        )}
      </div>
    </li>
  );
}
