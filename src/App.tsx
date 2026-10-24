import { Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppProvider } from './AppProvider';
import { Layout } from './components/layout/Layout';
import { Landing } from './pages/Landing';
import { NotFound } from './pages/NotFound';

// routes other than the landing page load on demand, so the first visit stays small
const page = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) =>
  async () => ({ Component: (await load())[name] as React.ComponentType });

// a data router, so pages can block navigation (the live veto's leave guard uses useBlocker)
const router = createBrowserRouter([
  {
    element: <AppProvider><Outlet /></AppProvider>,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Landing /> },
          { path: 'veto', lazy: page(() => import('./pages/VetoPage'), 'VetoPage') },
          { path: 'maps', lazy: page(() => import('./pages/MapsPage'), 'MapsPage') },
          { path: 'maps/:id', lazy: page(() => import('./pages/MapDetail'), 'MapDetail') },
          { path: 'guide', lazy: page(() => import('./pages/GuidePage'), 'GuidePage') },
          { path: 'room/:id', lazy: page(() => import('./pages/RoomPage'), 'RoomPage') },
          { path: 'p/:id', lazy: page(() => import('./pages/ShortLinkPage'), 'ShortLinkPage') },
          { path: '*', element: <NotFound /> },
        ],
      },
      // chrome-free broadcast view, no header or footer
      { path: 'overlay/:id', lazy: page(() => import('./pages/OverlayPage'), 'OverlayPage') },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
