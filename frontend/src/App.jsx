import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import PhotographerLogin from './pages/PhotographerLogin';
import Dashboard from './pages/Dashboard';
import EventDetail from './pages/EventDetail';
import CustomerGallery from './pages/CustomerGallery';

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
      <Routes>
        <Route path="/login" element={<PhotographerLogin />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard/events/:id" element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
        <Route path="/gallery/:slug" element={<CustomerGallery />} />
        <Route path="/" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
