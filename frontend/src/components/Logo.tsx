import { ShieldCheck } from 'lucide-react';
import { site } from '../config/site';

export function Logo({ withName = true }: { withName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-fg">
        <ShieldCheck size={22} aria-hidden />
      </span>
      {withName && <span className="text-ui font-semibold">{site.name}</span>}
    </span>
  );
}
