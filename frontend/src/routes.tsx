import type { RouteRecord } from 'vite-react-ssg';
import { Layout } from './components/Layout';

export const routes: RouteRecord[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, lazy: () => import('./pages/Home').then((m) => ({ Component: m.default })) },
      { path: '*', lazy: () => import('./pages/NotFound').then((m) => ({ Component: m.default })) },
    ],
  },
];
