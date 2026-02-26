import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from './lib/store';
import { PublicOnlyRoute } from './components/shared';
import { MainLayout } from './components/layout';

// Page imports
import SignIn from './pages/Auth/SignIn';
import Dashboard from './pages/Dashboard';

/**
 * React Query Client Configuration
 * 
 * - staleTime: Data is fresh for 5 minutes
 * - retry: Failed requests retry once
 * - refetchOnWindowFocus: Don't refetch when user returns to tab
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * App Component
 * 
 * Application structure:
 * 1. QueryClientProvider - React Query for server state
 * 2. BrowserRouter - Client-side routing
 * 3. Toaster - Toast notifications
 * 4. Routes - Protected and public routes
 * 
 * Route Structure:
 * - /auth/signin - Public (redirects if logged in)
 * - /dashboard - Protected (requires auth)
 * - /chat/:chatId - Protected
 * - /documents - Protected
 * - /* - 404
 */

function App() {
  const { checkSession } = useAuthStore();

  // Check session on app mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Toast notifications */}
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fafafa',
            },
          }}
        />
        
        <Routes>
          {/* ==============================
              PUBLIC ROUTES
              (Accessible without login)
          =============================== */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/auth/signin" element={<SignIn />} />
          </Route>

          {/* ==============================
              PROTECTED ROUTES
              (Require authentication)
          =============================== */}
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            
            <Route path="/chat/:chatId" element={
              <div className="min-h-screen flex items-center justify-center text-white/60">
                Chat page coming soon...
              </div>
            } />
            
            <Route path="/documents" element={
              <div className="min-h-screen flex items-center justify-center text-white/60">
                Documents page coming soon...
              </div>
            } />
          </Route>

          {/* ===============================
              DEFAULT & FALLBACKS
          =============================== */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 404 - Page not found */}
          <Route 
            path="*" 
            element={
              <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold mb-4">404</h1>
                  <p className="text-white/60">Page not found</p>
                </div>
              </div>
            } 
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
