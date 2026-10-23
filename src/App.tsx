import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './AppProvider';
import { Layout } from './components/layout/Layout';
import { GuidePage } from './pages/GuidePage';
import { Landing } from './pages/Landing';
import { MapDetail } from './pages/MapDetail';
import { MapsPage } from './pages/MapsPage';
import { NotFound } from './pages/NotFound';
import { VetoPage } from './pages/VetoPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="veto" element={<VetoPage />} />
            <Route path="maps" element={<MapsPage />} />
            <Route path="maps/:id" element={<MapDetail />} />
            <Route path="guide" element={<GuidePage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
