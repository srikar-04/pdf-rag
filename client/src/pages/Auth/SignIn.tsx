import { useState } from 'react';
import { Button } from '../../components/ui';
import { Github, Chrome } from 'lucide-react';
import { toast } from 'sonner';

/**
 * SignIn Page
 * 
 * Features:
 * - OAuth sign-in with GitHub/Google
 * - Beautiful glassmorphism design
 * - Loading states
 * - Error handling
 */

// Get backend URL from environment
const getBackendUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  return apiUrl.replace('/api/v1', '');
};

interface CsrfResponse {
  csrfToken?: string;
}

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'github' | 'google' | null>(null);

  const handleSignIn = async (provider: 'github' | 'google') => {
    setIsLoading(true);
    setLoadingProvider(provider);

    try {
      const backendUrl = getBackendUrl();
      const csrfResponse = await fetch(`${backendUrl}/auth/csrf`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!csrfResponse.ok) {
        throw new Error(`Failed to fetch CSRF token: ${csrfResponse.status}`);
      }

      const csrfData = (await csrfResponse.json()) as CsrfResponse;
      if (!csrfData.csrfToken) {
        throw new Error('CSRF token missing in response');
      }

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `${backendUrl}/auth/signin/${provider}`;
      form.style.display = 'none';

      const csrfInput = document.createElement('input');
      csrfInput.type = 'hidden';
      csrfInput.name = 'csrfToken';
      csrfInput.value = csrfData.csrfToken;
      form.appendChild(csrfInput);

      const callbackInput = document.createElement('input');
      callbackInput.type = 'hidden';
      callbackInput.name = 'callbackUrl';
      callbackInput.value = `${window.location.origin}/dashboard`;
      form.appendChild(callbackInput);

      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error('Sign-in failed:', error);
      toast.error('Unable to start sign in. Please try again.');
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      {/* Sign-in card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="glass rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-white/60">
              Sign in to access your PDF RAG workspace
            </p>
          </div>

          {/* Sign-in buttons */}
          <div className="space-y-4">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              leftIcon={<Github className="w-5 h-5" />}
              isLoading={isLoading && loadingProvider === 'github'}
              onClick={() => handleSignIn('github')}
              className="h-12"
            >
              Continue with GitHub
            </Button>

            <Button
              variant="secondary"
              size="lg"
              fullWidth
              leftIcon={<Chrome className="w-5 h-5" />}
              isLoading={isLoading && loadingProvider === 'google'}
              onClick={() => handleSignIn('google')}
              className="h-12"
            >
              Continue with Google
            </Button>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-white/40">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
