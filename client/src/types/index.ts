/**
 * User Types
 * Based on backend schema
 */
export interface User {
  id: string;
  username: string;
  email: string;
  provider: 'GOOGLE' | 'GITHUB';
  created_at: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Chat Types
 */
export interface Chat {
  id: string;
  userId: string;
  title: string;
  chatStatus: 'empty' | 'active';
  createdAt: string;
  updatedAt: string;
  documents?: Document[];
}

export interface Message {
  id: string;
  chatId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  createdAt: string;
}

/**
 * Document Types
 */
export type DocumentStatus = 'processing' | 'Ingesting' | 'ready' | 'failed';
export type IngestionStep = 'none' | 'fetched' | 'normalized' | 'chunked' | 'embedded' | 'upserted';

export interface Document {
  id: string;
  documentName: string;
  storagePath: string;
  userId: string;
  documentStatus: DocumentStatus;
  ingestionStep: IngestionStep;
  documentHash: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentMetadata {
  id: string;
  documentId: string;
  pages: number;
  title?: string;
  author?: string;
  creator?: string;
  producer?: string;
}

export interface DocumentUploadResponse {
  success: boolean;
  data: {
    imageKitResponse?: {
      url: string;
      fileId: string;
    };
    documentEntry: Document;
    chatDocumentEntry?: {
      chatId: string;
      documentId: string;
    };
  };
  message: string;
}

/**
 * API Response Types
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Streaming Types (for future use)
 */
export interface StreamChunk {
  content: string;
}

export interface StreamEnd {
  done: true;
}
