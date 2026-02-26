import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from './lib/store';
import { ProtectedRoute, PublicOnlyRoute } from './components/shared';

// Import existing pages (will enhance later)
import SignIn from './pages/Auth/SignIn';

// Create React Query client
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
 * Structure:
 * 1. QueryClientProvider - React Query context
 * 2. BrowserRouter - Routing context
 * 3. Toaster - Toast notifications (Sonner)
 * 4. Routes - Application routes
 * 
 * Routes:
 * - /auth/signin - Login page (public only)
 * - /dashboard - Main dashboard (protected)
 * - /chat/:chatId - Chat interface (protected)
 * - /documents - Document library (protected)
 * - / - Redirect to dashboard
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
          {/* Public Routes - Auth Pages */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/auth/signin" element={<SignIn />} />
            {/* Add more auth routes here: signup, forgot-password, etc. */}
          </Route>

          {/* Protected Routes - App Pages */}
          <Route element={<ProtectedRoute />}>
            {/* Dashboard - Main landing after auth */}
            <Route 
              path="/dashboard" 
              element={
                <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
                  <h1 className="text-2xl font-bold">Dashboard</h1>
                  <p className="text-white/60 mt-2">Coming soon...</p>
                </div>
              } 
            />
            
            {/* Chat Interface */}
            <Route 
              path="/chat/:chatId" 
              element={
                <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
                  <h1 className="text-2xl font-bold">Chat</h1>
                  <p className="text-white/60 mt-2">Coming soon...</p>
                </div>
              } 
            />
            
            {/* Documents Library */}
            <Route 
              path="/documents" 
              element={
                <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
                  <h1 className="text-2xl font-bold">Documents</h1>
                  <p className="text-white/60 mt-2">Coming soon...</p>
                </div>
              } 
            />
          </Route>

          {/* Default Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 404 - Catch all */}
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
