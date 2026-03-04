import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

/**
 * Axios API Client Configuration
 * 
 * Features:
 * - Base URL configuration
 * - Credentials included (cookies for session auth)
 * - Request/Response interceptors for auth and error handling
 * - Automatic token refresh (if needed in future)
 * - Global error handling with toast notifications
 */

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

/**
 * Create axios instance with default config
 */
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important: Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

/**
 * Request Interceptor
 * 
 * Purpose:
 * - Add auth headers if needed
 * - Log requests in development
 * - Add request metadata
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Log requests in development
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    // Add timestamp for request tracking
    config.headers['X-Request-Time'] = new Date().toISOString();
    
    return config;
  },
  (error: AxiosError) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * 
 * Purpose:
 * - Handle global errors (401, 403, 429, 500)
 * - Show toast notifications for errors
 * - Redirect on auth failures
 * - Log responses in development
 */
api.interceptors.response.use(
  (response) => {
    // Log responses in development
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    
    return response;
  },
  (error: AxiosError) => {
    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as { message?: string; errors?: unknown[] };
      const message = data?.message || 'An error occurred';
      const validationDetails = (Array.isArray(data?.errors) ? data.errors : [])
        .map((entry) => {
          if (typeof entry === 'string') return entry;
          if (entry && typeof entry === 'object' && 'message' in entry) {
            return String((entry as { message?: unknown }).message ?? '');
          }
          return '';
        })
        .filter(Boolean);
      
      switch (status) {
        case 400:
          // Bad Request - validation errors
          toast.error(message, {
            description: validationDetails[0],
          });
          break;
          
        case 401:
          // Unauthorized - session expired or not logged in
          toast.error('Session expired. Please sign in again.');
          // Redirect to login after short delay
          setTimeout(() => {
            window.location.href = '/auth/signin';
          }, 2000);
          break;
          
        case 403:
          // Forbidden - not enough permissions
          toast.error('You do not have permission to access this resource.');
          break;
          
        case 404:
          // Not Found
          // Document status may return 404 when backend auto-cleans invalid docs.
          if (!error.config?.url?.includes('/document/status/')) {
            toast.error('Resource not found.');
          }
          break;
          
        case 429:
          // Rate Limited
          toast.error('Too many requests. Please slow down.', {
            description: 'Rate limit exceeded',
          });
          break;
          
        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors
          toast.error('Server error. Please try again later.');
          break;
          
        default:
          toast.error(message, {
            description: validationDetails[0],
          });
      }
      
      // Log error details in development
      if (import.meta.env.DEV) {
        console.error('[API Error]', {
          status,
          url: error.config?.url,
          method: error.config?.method,
          data,
        });
      }
      
    } else if (error.request) {
      // Request made but no response (network error)
      if ((error as { code?: string }).code === 'ECONNABORTED') {
        toast.error('Request timed out. Server is taking longer than expected.');
      } else if ((error as { code?: string }).code === 'ERR_NETWORK') {
        toast.error('Cannot reach backend service. Please verify server is running and reachable.');
      } else {
        toast.error('Network error. Please check your connection.');
      }
      console.error('[Network Error]', error.request);
      
    } else {
      // Something else happened
      toast.error('An unexpected error occurred.');
      console.error('[Error]', error.message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * API Endpoints
 * 
 * Organized by feature for easy imports
 * NOTE: Logout is handled by OAuth (Auth.js) automatically
 */
export const apiEndpoints = {
  // Auth - Session only (logout handled by OAuth)
  auth: {
    session: () => api.get('/auth/session'),
    register: (username: string) => api.post('/auth/register', { username }),
  },
  
  // Chats
  chats: {
    list: () => api.get('/chat'),
    create: (data: { title: string }) => api.post('/chat/create-chat', { chatName: data.title }),
    get: (chatId: string) => api.get(`/chat/${chatId}`),
    delete: (chatId: string) => api.delete(`/chat/${chatId}`),
  },
  
  // Messages
  messages: {
    list: (chatId: string) => api.get(`/chat/${chatId}/messages`),
    send: (chatId: string, documentId: string, query: string) =>
      api.post(`/message/query/${chatId}/${documentId}`, { content: query }),
  },
  
  // Documents
  documents: {
    list: () => api.get('/document'),
    upload: (chatId: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post(`/document/upload/${chatId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000,
      });
    },
    status: (documentId: string) => api.get(`/document/status/${documentId}`),
    ingest: (documentId: string) => api.post(`/document/ingest/${documentId}`),
    delete: (documentId: string) => api.delete(`/document/${documentId}`),
  },
};

export default api;
