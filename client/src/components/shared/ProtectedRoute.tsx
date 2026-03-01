import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { Loader2 } from 'lucide-react';

/**
 * ProtectedRoute Component
 * 
 * Purpose:
 * - Protect routes that require authentication
 * - Show loading state while checking session
 * - Redirect to login if not authenticated
 * - Preserve intended destination for post-login redirect
 * 
 * Usage:
 * <Route element={<ProtectedRoute />}>
 *   <Route path="/dashboard" element={<Dashboard />} />
 * </Route>
 */

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();
  
  // Show loading spinner while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-white/60 text-sm">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the current location for post-login redirect
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }
  
  // Render children if authenticated
  return <>{children}</>;
}

/**
 * PublicOnlyRoute Component
 * 
 * Purpose:
 * - Redirect authenticated users away from auth pages
 * - Used for login/signup pages
 * 
 * Usage:
 * <Route element={<PublicOnlyRoute />}>
 *   <Route path="/auth/signin" element={<SignIn />} />
 * </Route>
 */

export function PublicOnlyRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();
  
  // Show loading spinner while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-white/60 text-sm">Loading...</p>
        </div>
      </div>
    );
  }
  
  // If authenticated, redirect to dashboard (or intended destination)
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }
  
  // Render children if not authenticated
  return <>{children}</>;
}

/**
 * OnboardingRoute Component
 * 
 * Purpose:
 * - Redirect to onboarding if required
 * - Allow access if onboarding is not required
 * 
 * Usage:
 * <Route element={<OnboardingRoute />}>
 *   <Route path="/onboarding" element={<Onboarding />} />
 * </Route>
 */

export function OnboardingRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, onBoardingRequired, isLoading } = useAuthStore();
  const location = useLocation();
  
  // Show loading spinner while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-white/60 text-sm">Loading...</p>
        </div>
      </div>
    );
  }
  
  // If not authenticated, redirect to signin
  if (!isAuthenticated) {
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }
  
  // If onboarding is required, redirect to onboarding page
  if (onBoardingRequired) {
    return <Navigate to="/auth/onboarding" replace />;
  }
  
  // Render children if authenticated and onboarding not required
  return <>{children}</>;
}
