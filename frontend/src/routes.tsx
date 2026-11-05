import type { RouteRecord } from 'vite-react-ssg';
import { Layout } from './components/Layout';
import { rules } from './scanner/registry';

export const routes: RouteRecord[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, lazy: () => import('./pages/Home').then((m) => ({ Component: m.default })) },
      { path: 'rules', lazy: () => import('./pages/RulesIndex').then((m) => ({ Component: m.default })) },
      {
        path: 'rules/:ruleId',
        lazy: () => import('./pages/RulePage').then((m) => ({ Component: m.default })),
        getStaticPaths: () => rules.map((r) => `rules/${r.id}`),
      },
      // Pre-rendered as /404/index.html for the CDN's error page; `*` handles client-side misses.
      { path: '404', lazy: () => import('./pages/NotFound').then((m) => ({ Component: m.default })) },
      { path: '*', lazy: () => import('./pages/NotFound').then((m) => ({ Component: m.default })) },
    ],
  },
];
