import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { site } from '../config/site';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { to: '/', label: 'Scanner' },
  { to: '/rules', label: 'Rules' },
  { to: '/about', label: 'About' },
  { to: '/security', label: 'Security' },
];

const FOOTER_COLUMNS = [
  [
    { to: '/', label: 'Scanner' },
    { to: '/rules', label: 'All rules' },
  ],
  [
    { to: '/rules/unpinned-action', label: 'Pinning actions' },
    { to: '/rules/script-injection', label: 'Script injection' },
  ],
  [
    { to: '/about', label: 'About' },
    { to: '/security', label: 'Report a vulnerability' },
  ],
  [
    { to: '/privacy', label: 'Privacy' },
    { to: '/terms', label: 'Terms' },
  ],
];

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="bg-chrome text-chrome-fg">
      <div className="container-content flex h-header items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="rounded-sm" aria-label={`${site.name} home`}>
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-6">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end
                    className={({ isActive }) =>
                      `text-ui hover:text-chrome-muted ${isActive ? 'underline underline-offset-8' : ''}`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="btn-chrome md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-chrome-2 md:hidden">
          <ul className="container-content py-2">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end className="block py-3 text-ui" onClick={() => setOpen(false)}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 bg-chrome text-chrome-fg">
      <div className="container-content grid grid-cols-2 gap-x-6 gap-y-8 py-14 md:grid-cols-4">
        {FOOTER_COLUMNS.map((col, i) => (
          <ul key={i} className="space-y-3">
            {col.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-ui hover:text-chrome-muted">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        ))}
      </div>
      <div className="container-content flex flex-col gap-3 pb-12">
        <Logo />
        <p className="max-w-main text-sm text-chrome-muted">{site.trademarkNotice}</p>
      </div>
      <div className="bg-chrome-deep py-6 text-center text-label uppercase tracking-motto text-chrome-muted">
        Scanned in your browser · Never uploaded
      </div>
    </footer>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="btn-primary sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50">
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
