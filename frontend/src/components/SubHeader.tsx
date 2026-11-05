import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  /** Breadcrumb trail; the last item is the current page. */
  crumbs: { label: string; to?: string }[];
  children?: ReactNode;
}

export function SubHeader({ crumbs, children }: Props) {
  return (
    <div className="bg-chrome text-chrome-fg">
      <div className="container-content flex min-h-subheader items-center justify-between gap-4 border-t border-chrome-2 py-3">
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex flex-wrap items-center gap-x-2 text-ui">
            {crumbs.map((c, i) => (
              <li key={c.label} className="flex min-w-0 items-center gap-2">
                {i > 0 && (
                  <span aria-hidden className="text-chrome-muted">
                    •
                  </span>
                )}
                {c.to && i < crumbs.length - 1 ? (
                  <Link to={c.to} className="hover:text-chrome-muted">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current={i === crumbs.length - 1 ? 'page' : undefined} className="truncate">
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        {children && <div className="flex shrink-0 items-center gap-6 text-ui">{children}</div>}
      </div>
    </div>
  );
}
