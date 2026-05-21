import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { DownloadManagerProvider } from './contexts/DownloadManager';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Chapter from './pages/Chapter';
import Comments from './pages/Comments';

function App() {
  return (
    <ToastProvider>
    <DownloadManagerProvider>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/catalog" element={<Catalog />} />
      <Route path="/chapter" element={<Chapter />} />
      <Route path="/comments" element={<Comments />} />
    </Routes>
    </DownloadManagerProvider>
    </ToastProvider>
  );
}

export default App;
