import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from './lib/store';
import { PublicOnlyRoute, OnboardingRoute, ErrorBoundary, ProtectedRoute } from './components/shared';
import { MainLayout } from './components/layout';

// Lazy load pages for code splitting
const SignIn = lazy(() => import('./pages/Auth/SignIn'));
const Onboarding = lazy(() => import('./pages/Auth/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ChatPage = lazy(() => import('./pages/Chat'));
const DocumentsPage = lazy(() => import('./pages/Document'));

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-white/50">Loading...</p>
      </div>
    </div>
  );
}

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
    <ErrorBoundary>
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
          
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ==============================
                  PUBLIC ROUTES
                  (Accessible without login)
              =============================== */}
              <Route element={<PublicOnlyRoute />}>
                <Route path="/auth/signin" element={<SignIn />} />
              </Route>

              {/* Onboarding Route - requires auth but no onboarding */}
              <Route element={<OnboardingRoute />}>
                <Route path="/auth/onboarding" element={<Onboarding />} />
              </Route>

              {/* ==============================
                  PROTECTED ROUTES
                  (Require authentication)
              =============================== */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  
                  {/* Chat Interface */}
                  <Route path="/chat/:chatId" element={<ChatPage />} />
                  
                  {/* Documents Library */}
                  <Route path="/documents" element={<DocumentsPage />} />
                </Route>
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
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
