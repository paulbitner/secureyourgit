import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  text: string | (() => string);
  label: string;
  className?: string;
  /** Show the label next to the icon (otherwise icon-only with an accessible name). */
  showLabel?: boolean;
  disabled?: boolean;
}

export function CopyButton({ text, label, className = 'btn-ghost', showLabel = false, disabled }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const id = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(id);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(typeof text === 'function' ? text() : text);
      setState('copied');
    } catch {
      setState('failed');
    }
  };

  const status = state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label;
  return (
    <button type="button" className={className} onClick={copy} disabled={disabled} aria-label={showLabel ? undefined : status}>
      {state === 'copied' ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
      {showLabel && <span>{status}</span>}
      <span className="sr-only" aria-live="polite">
        {state !== 'idle' ? status : ''}
      </span>
    </button>
  );
}
