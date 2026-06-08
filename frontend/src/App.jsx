import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { Loader } from 'lucide-react';

// ── Code-split each page into its own JS chunk ────────────────────────────────
// React.lazy() + dynamic import means each page only downloads when first
// visited. The browser doesn't need to parse CustomerGallery code to show
// the login page, or parse EventDetail to show the gallery, etc.
const PhotographerLogin = lazy(() => import('./pages/PhotographerLogin'));
const Dashboard         = lazy(() => import('./pages/Dashboard'));
const EventDetail       = lazy(() => import('./pages/EventDetail'));
const CustomerGallery   = lazy(() => import('./pages/CustomerGallery'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark">
      <Loader size={36} className="animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const token = useAuthStore(s => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { token, fetchMe } = useAuthStore();

  useEffect(() => {
    if (token) fetchMe();
  }, [token]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login"                  element={<PhotographerLogin />} />
          <Route path="/dashboard"              element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/events/:id"   element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
          <Route path="/gallery/:slug"          element={<CustomerGallery />} />
          <Route path="/"                       element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
