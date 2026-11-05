import { CopyButton } from './CopyButton';

interface Props {
  code: string;
  label?: string;
  tone?: 'neutral' | 'bad' | 'good';
}

const TONE: Record<NonNullable<Props['tone']>, string> = {
  neutral: 'border-border',
  bad: 'border-danger',
  good: 'border-success',
};

export function CodeBlock({ code, label, tone = 'neutral' }: Props) {
  return (
    <figure className={`overflow-hidden rounded-md border-l-4 bg-surface ${TONE[tone]}`}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-1.5">
        <figcaption className="text-label uppercase text-fg-muted">{label ?? 'YAML'}</figcaption>
        <CopyButton text={code} label={`Copy ${label ?? 'code'}`} className="btn-ghost px-2 py-1 text-sm" />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-code">
        <code>{code}</code>
      </pre>
    </figure>
  );
}
