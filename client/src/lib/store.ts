import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { apiEndpoints } from './api';

// Backend base URL for redirects (without /api/v1)
const getBackendUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  return apiUrl.replace('/api/v1', '');
};

interface AuthCsrfResponse {
  csrfToken?: string;
}

/**
 * Auth Store (Zustand)
 * 
 * Purpose:
 * - Manage authentication state globally
 * - Handle session checks
 * - Store user information
 * - Handle logout
 * 
 * Features:
 * - Persist user data to localStorage
 * - Session validation
 * - Auto-redirect on auth failure
 */

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  onBoardingRequired: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
  clearAuth: () => void;
  registerUser: (username: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: true,
      onBoardingRequired: false,
      
      /**
       * Set user directly (used after login/onboarding)
       */
      setUser: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user,
          isLoading: false,
          onBoardingRequired: false,
        });
      },
      
      /**
       * Check current session with backend
       * Called on app load to restore auth state
       */
      checkSession: async () => {
        try {
          set({ isLoading: true });
          
          const response = await apiEndpoints.auth.session();

          if (response.data.success) {
            const sessionData = response.data.data;
            const hasUser = !!sessionData?.user;
            const needsOnboarding = !!sessionData?.onBoardingRequired;

            // Session can be valid even before app-level user profile is created.
            set({
              user: sessionData?.user || null,
              isAuthenticated: hasUser || needsOnboarding,
              isLoading: false,
              onBoardingRequired: needsOnboarding,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              onBoardingRequired: false,
            });
          }
        } catch (error) {
          // Session check failed - user not authenticated
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            onBoardingRequired: false,
          });
        }
      },
      
      /**
       * Register username for new users
       */
      registerUser: async (username: string) => {
        try {
          const response = await apiEndpoints.auth.register(username);
          
          if (response.data.success && response.data.data.user) {
            set({
              user: response.data.data.user,
              isAuthenticated: true,
              isLoading: false,
              onBoardingRequired: false,
            });
          }
        } catch (error) {
          throw error;
        }
      },
      
      /**
       * Logout user
       * Uses Auth.js signout action (POST + CSRF) and redirects to signin
       */
      logout: async () => {
        try {
          const backendUrl = getBackendUrl();
          const csrfResponse = await fetch(`${backendUrl}/auth/csrf`, {
            method: 'GET',
            credentials: 'include',
          });

          if (!csrfResponse.ok) {
            throw new Error(`Failed to fetch CSRF token: ${csrfResponse.status}`);
          }

          const csrfData = (await csrfResponse.json()) as AuthCsrfResponse;
          if (!csrfData.csrfToken) {
            throw new Error('CSRF token missing in response');
          }

          // Clear local auth state before navigating away
          get().clearAuth();

          const form = document.createElement('form');
          form.method = 'POST';
          form.action = `${backendUrl}/auth/signout`;
          form.style.display = 'none';

          const csrfInput = document.createElement('input');
          csrfInput.type = 'hidden';
          csrfInput.name = 'csrfToken';
          csrfInput.value = csrfData.csrfToken;
          form.appendChild(csrfInput);

          const callbackInput = document.createElement('input');
          callbackInput.type = 'hidden';
          callbackInput.name = 'callbackUrl';
          callbackInput.value = `${window.location.origin}/auth/signin`;
          form.appendChild(callbackInput);

          document.body.appendChild(form);
          form.submit();
        } catch (error) {
          console.error('Logout error:', error);
        }
      },
      
      /**
       * Clear auth state (used for reset)
       */
      clearAuth: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }), // Only persist user data, not loading states
    }
  )
);

/**
 * App Store (Zustand)
 * 
 * Purpose:
 * - Manage UI state (sidebar, theme)
 * - Streaming state for LLM responses
 * - Upload state
 * 
 * NOT persisted - ephemeral state only
 */

interface AppState {
  // UI State
  sidebarOpen: boolean;
  
  // Streaming State (for LLM responses)
  streamingContent: string;
  isStreaming: boolean;
  
  // Upload State
  isUploading: boolean;
  uploadProgress: number;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Streaming Actions
  startStreaming: () => void;
  appendStreamingContent: (chunk: string) => void;
  endStreaming: () => void;
  resetStreaming: () => void;
  
  // Upload Actions
  setUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  // Initial state
  sidebarOpen: true,
  streamingContent: '',
  isStreaming: false,
  isUploading: false,
  uploadProgress: 0,
  
  // Sidebar
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  // Streaming (for future LLM streaming support)
  startStreaming: () => set({ 
    isStreaming: true, 
    streamingContent: '' 
  }),
  
  appendStreamingContent: (chunk) => set((state) => ({
    streamingContent: state.streamingContent + chunk,
  })),
  
  endStreaming: () => set({ isStreaming: false }),
  
  resetStreaming: () => set({
    streamingContent: '',
    isStreaming: false,
  }),
  
  // Upload
  setUploading: (uploading) => set({ isUploading: uploading }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
}));
