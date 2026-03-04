import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions 
} from '@tanstack/react-query';
import { apiEndpoints } from '../lib/api';
import { getDisplayDocumentName } from '../lib/utils';
import type { Chat, Document, Message, DocumentStatus, DocumentUploadResponse } from '../types';

/**
 * React Query Hooks
 * 
 * Purpose:
 * - Server state management with caching
 * - Automatic background refetching
 * - Optimistic updates
 * - Error handling
 * 
 * Query Keys Pattern:
 * - ['chats'] - All chats
 * - ['chats', chatId] - Specific chat
 * - ['messages', chatId] - Messages for chat
 * - ['documents'] - All documents
 * - ['document-status', docId] - Document processing status
 */

// ============================================================================
// CHAT QUERIES
// ============================================================================

/**
 * Hook: useChats
 * Fetch all chats for current user
 */
export const useChats = (options?: UseQueryOptions<Chat[], Error>) => {
  return useQuery<Chat[], Error>({
    queryKey: ['chats'],
    queryFn: async () => {
      const response = await apiEndpoints.chats.list();
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook: useChat
 * Fetch a single chat by ID
 */
export const useChat = (
  chatId: string,
  options?: UseQueryOptions<Chat, Error>
) => {
  return useQuery<Chat, Error>({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      const response = await apiEndpoints.chats.get(chatId);
      return response.data.data;
    },
    enabled: !!chatId,
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
};

/**
 * Hook: useCreateChat
 * Create a new chat
 */
export const useCreateChat = (
  options?: UseMutationOptions<Chat, Error, { title: string }>
) => {
  const queryClient = useQueryClient();
  
  return useMutation<Chat, Error, { title: string }>({
    mutationFn: async (data) => {
      const response = await apiEndpoints.chats.create(data);
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate chats list to refetch
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    ...options,
  });
};

// ============================================================================
// MESSAGE QUERIES
// ============================================================================

/**
 * Hook: useMessages
 * Fetch messages for a specific chat
 */
export const useMessages = (
  chatId: string,
  options?: UseQueryOptions<Message[], Error>
) => {
  return useQuery<Message[], Error>({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      const response = await apiEndpoints.messages.list(chatId);
      return response.data.data;
    },
    enabled: !!chatId, // Only fetch if chatId exists
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
};

/**
 * Hook: useSendMessage
 * Send a message and get AI response
 */
export const useSendMessage = (
  options?: UseMutationOptions<
    { role: string; content: string },
    Error,
    { chatId: string; documentId: string; query: string }
  >
) => {
  const queryClient = useQueryClient();
  
  return useMutation<
    { role: string; content: string },
    Error,
    { chatId: string; documentId: string; query: string }
  >({
    mutationFn: async ({ chatId, documentId, query }) => {
      const response = await apiEndpoints.messages.send(chatId, documentId, query);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate messages to refetch
      queryClient.invalidateQueries({ 
        queryKey: ['messages', variables.chatId] 
      });
    },
    ...options,
  });
};

// ============================================================================
// DOCUMENT QUERIES
// ============================================================================

/**
 * Hook: useDocuments
 * Fetch all documents for current user
 */
export const useDocuments = (options?: UseQueryOptions<Document[], Error>) => {
  return useQuery<Document[], Error>({
    queryKey: ['documents'],
    queryFn: async () => {
      const response = await apiEndpoints.documents.list();
      const documents = response.data.data as Document[];
      return documents.map((doc) => ({
        ...doc,
        displayName: getDisplayDocumentName(doc.documentName),
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook: useDocumentStatus
 * Poll document processing status
 * Automatically stops polling when document is ready or failed
 */
export const useDocumentStatus = (
  documentId: string,
  options?: UseQueryOptions<
    { documentStatus: DocumentStatus; ingestionStep: string },
    Error
  >
) => {
  return useQuery<
    { documentStatus: DocumentStatus; ingestionStep: string },
    Error
  >({
    queryKey: ['document-status', documentId],
    queryFn: async () => {
      const response = await apiEndpoints.documents.status(documentId);
      return response.data.data;
    },
    enabled: !!documentId,
    
    // Poll every 2 seconds while processing
    refetchInterval: (query) => {
      const status = query.state.data?.documentStatus;
      if (status === 'processing' || status === 'Ingesting') {
        return 2000; // 2 seconds
      }
      return false; // Stop polling
    },
    
    // Keep polling even when tab is in background
    refetchIntervalInBackground: true,
    
    // Don't cache stale data
    staleTime: 0,
    
    ...options,
  });
};

/**
 * Hook: useUploadDocument
 * Upload a document to a chat
 */
export const useUploadDocument = (
  options?: UseMutationOptions<
    DocumentUploadResponse['data'],
    Error,
    { chatId: string; file: File }
  >
) => {
  const queryClient = useQueryClient();
  
  return useMutation<
    DocumentUploadResponse['data'],
    Error,
    { chatId: string; file: File }
  >({
    mutationFn: async ({ chatId, file }) => {
      const response = await apiEndpoints.documents.upload(chatId, file);
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate documents list
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    ...options,
  });
};

/**
 * Hook: useIngestDocument
 * Start document ingestion process
 */
export const useIngestDocument = (
  options?: UseMutationOptions<void, Error, string>
) => {
  return useMutation<void, Error, string>({
    mutationFn: async (documentId) => {
      await apiEndpoints.documents.ingest(documentId);
    },
    ...options,
  });
};

/**
 * Hook: useDeleteChat
 * Delete a chat and all its messages
 */
export const useDeleteChat = (
  options?: UseMutationOptions<void, Error, string>
) => {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (chatId) => {
      await apiEndpoints.chats.delete(chatId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    ...options,
  });
};

/**
 * Hook: useDeleteDocument
 * Delete a document
 */
export const useDeleteDocument = (
  options?: UseMutationOptions<void, Error, string>
) => {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (documentId) => {
      await apiEndpoints.documents.delete(documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    ...options,
  });
};
