import { useState } from 'react';
import { Button } from '../../components/ui';
import { Github, Chrome } from 'lucide-react';

/**
 * SignIn Page
 * 
 * Features:
 * - OAuth sign-in with GitHub/Google
 * - Beautiful glassmorphism design
 * - Loading states
 * - Error handling
 */

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<'github' | 'google' | null>(null);

  const handleSignIn = (selectedProvider: 'github' | 'google') => {
    setIsLoading(true);
    setProvider(selectedProvider);
    
    // Redirect to backend OAuth endpoint
    window.location.href = `http://localhost:3000/auth/signin?provider=${selectedProvider}&callbackUrl=http://localhost:5173/dashboard`;
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
              isLoading={isLoading && provider === 'github'}
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
              isLoading={isLoading && provider === 'google'}
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
