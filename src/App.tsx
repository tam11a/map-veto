import { Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppProvider } from './AppProvider';
import { Layout } from './components/layout/Layout';
import { GuidePage } from './pages/GuidePage';
import { Landing } from './pages/Landing';
import { MapDetail } from './pages/MapDetail';
import { MapsPage } from './pages/MapsPage';
import { NotFound } from './pages/NotFound';
import { VetoPage } from './pages/VetoPage';

// a data router, so pages can block navigation (the live veto's leave guard uses useBlocker)
const router = createBrowserRouter([
  {
    element: <AppProvider><Outlet /></AppProvider>,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Landing /> },
          { path: 'veto', element: <VetoPage /> },
          { path: 'maps', element: <MapsPage /> },
          { path: 'maps/:id', element: <MapDetail /> },
          { path: 'guide', element: <GuidePage /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
