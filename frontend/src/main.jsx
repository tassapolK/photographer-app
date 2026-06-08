import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

// ── Pre-warm: fire before React renders ───────────────────────────────────────
// Calling /api/health pings MongoDB so the connection pool is ready by the
// time the first real query (events/photos) hits the server.
//
// For the customer gallery route, also speculatively fire the two API calls
// that CustomerGallery will need — these warm up the specific Vercel function
// processes and prime the CDN cache. React Query will then get a fast response
// (either from CDN edge or a warm Node.js process).
(function prewarm() {
  fetch('/api/health').catch(() => {});

  const path = window.location.pathname;         // e.g. /gallery/abc-123
  if (path.startsWith('/gallery/')) {
    const slug = path.split('/')[2];
    if (slug) {
      fetch(`/api/events/public/${slug}`).catch(() => {});
      fetch(`/api/photos/event/${slug}?page=1&limit=30`).catch(() => {});
    }
  }
})();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
