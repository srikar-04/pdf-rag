import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { apiEndpoints } from './api';

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
  
  // Actions
  setUser: (user: User | null) => void;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: true,
      
      /**
       * Set user directly (used after login/onboarding)
       */
      setUser: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user,
          isLoading: false 
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
          
          if (response.data.success && response.data.data.user) {
            set({
              user: response.data.data.user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          // Session check failed - user not authenticated
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
      
      /**
       * Logout user
       * OAuth handles logout automatically - we just clear local state
       * Redirect to OAuth signout endpoint to clear session cookie
       */
      logout: async () => {
        try {
          // Clear auth state first
          get().clearAuth();
          
          // Redirect to OAuth signout to clear session cookie
          // Auth.js creates /auth/signout route automatically
          window.location.href = '/auth/signout';
        } catch (error) {
          console.error('Logout error:', error);
          // Still clear auth state even if redirect fails
          get().clearAuth();
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
