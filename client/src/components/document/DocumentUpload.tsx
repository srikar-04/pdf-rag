import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UploadDropzone } from './UploadDropzone';
import { useUploadDocument, useDocumentStatus, useIngestDocument } from '../../hooks';
import { apiEndpoints } from '../../lib/api';
import { Button } from '../ui';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { cn, getDisplayDocumentName } from '../../lib/utils';
import type { DocumentStatus, IngestionStep, DocumentUploadResponse } from '../../types';

/**
 * DocumentUpload Component
 * 
 * Handles document upload flow:
 * 1. Shows upload dropzone
 * 2. On file select, uploads to backend
 * 3. Shows processing status
 * 4. On completion, shows document card
 * 
 * Features:
 * - Drag and drop upload
 * - Progress tracking
 * - Status polling during processing
 * - Error handling
 * 
 * Props:
 * - chatId: The chat to upload the document to
 * - onUploadComplete: Callback when upload and processing complete
 */

interface DocumentUploadProps {
  chatId: string;
  onUploadComplete?: (documentId: string) => void;
  queuedFile?: File | null;
  onQueuedFileConsumed?: () => void;
}

interface ResolvedDocument {
  id: string;
  documentName: string;
  documentStatus?: DocumentStatus;
  ingestionStep?: IngestionStep;
}

const INGESTION_RETRY_DELAYS_MS = [1000, 2000, 4000];
const UPLOAD_RETRY_DELAYS_MS = [1500, 3000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getErrorMessage = (error: any): string => {
  const data = error?.response?.data as { message?: string; errors?: unknown[] } | undefined;
  const rawErrors = Array.isArray(data?.errors) ? data.errors : [];
  const parsedErrors = rawErrors
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object' && 'message' in entry) {
        return String((entry as { message?: unknown }).message ?? '');
      }
      return '';
    })
    .filter(Boolean);

  if (parsedErrors.length > 0) {
    return parsedErrors.join(' ');
  }

  if (error?.code === 'ECONNABORTED') {
    return 'Upload timed out before server completed processing. Please retry.';
  }

  if (error?.code === 'ERR_NETWORK') {
    return 'Could not reach upload service. Check backend availability and CORS settings, then retry.';
  }

  return data?.message || error?.message || 'Upload failed';
};

const isRetriableError = (error: any): boolean => {
  if (!error?.response) return true;
  const status = error.response.status;
  return status === 408 || status === 409 || status >= 500;
};

const isOcrUnsupportedMessage = (message?: string): boolean =>
  /ocr|scanned|image-only|extractable text/i.test(message || '');

const OCR_NOT_SUPPORTED_MESSAGE =
  'No extractable text was found. This looks like a scanned/image-only PDF. OCR is not supported yet, so please upload a text-based PDF.';
const MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024;

export function DocumentUpload({
  chatId,
  onUploadComplete,
  queuedFile = null,
  onQueuedFileConsumed,
}: DocumentUploadProps) {
  const queryClient = useQueryClient();
  const [uploadState, setUploadState] = useState<{
    status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
    progress: number;
    error?: string;
    fileName?: string;
    documentId?: string;
  }>({ status: 'idle', progress: 0 });

  // Upload mutation
  const uploadMutation = useUploadDocument();

  // Ingestion mutation - call after upload
  const ingestMutation = useIngestDocument({
    onSuccess: () => {
      toast.info('Document processing started...');
    },
    onError: (error) => {
      console.error('Ingestion error:', error);
    },
  });

  const resolveUploadDocument = (
    data: DocumentUploadResponse['data'],
    fallbackFileName: string
  ): ResolvedDocument | null => {
    if (data.documentEntry?.id) {
      return {
        id: data.documentEntry.id,
        documentName: data.documentEntry.documentName || fallbackFileName,
        documentStatus: data.documentEntry.documentStatus,
        ingestionStep: data.documentEntry.ingestionStep,
      };
    }

    if (data.imageKitResponse?.id) {
      return {
        id: data.imageKitResponse.id,
        documentName: data.imageKitResponse.documentName || fallbackFileName,
        documentStatus: data.imageKitResponse.documentStatus,
        ingestionStep: data.imageKitResponse.ingestionStep,
      };
    }

    if (data.chatDocumentEntry?.documentId) {
      return {
        id: data.chatDocumentEntry.documentId,
        documentName: fallbackFileName,
      };
    }

    return null;
  };

  const startIngestionWithRetry = useCallback(
    async (documentId: string) => {
      const totalAttempts = INGESTION_RETRY_DELAYS_MS.length + 1;

      for (let attempt = 1; attempt <= totalAttempts; attempt++) {
        try {
          await ingestMutation.mutateAsync(documentId);
          return true;
        } catch (error) {
          const canRetry = isRetriableError(error) && attempt < totalAttempts;
          if (!canRetry) {
            console.error(`Ingestion start failed after ${attempt} attempt(s):`, error);
            return false;
          }

          await sleep(INGESTION_RETRY_DELAYS_MS[attempt - 1]);
        }
      }

      return false;
    },
    [ingestMutation]
  );

  const uploadWithRetry = useCallback(
    async (file: File) => {
      const totalAttempts = UPLOAD_RETRY_DELAYS_MS.length + 1;
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= totalAttempts; attempt++) {
        try {
          return await uploadMutation.mutateAsync({ chatId, file });
        } catch (error) {
          lastError = error;
          const canRetry = isRetriableError(error) && attempt < totalAttempts;
          if (!canRetry) {
            throw error;
          }

          toast.info(`Upload interrupted. Retrying (${attempt + 1}/${totalAttempts})...`);
          await sleep(UPLOAD_RETRY_DELAYS_MS[attempt - 1]);
        }
      }

      throw lastError;
    },
    [chatId, uploadMutation]
  );

  const syncQueriesAfterDocumentAttach = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] }),
      queryClient.invalidateQueries({ queryKey: ['documents'] }),
    ]);
  }, [chatId, queryClient]);

  const continueProcessingDocument = useCallback(
    async (document: ResolvedDocument) => {
      setUploadState({
        status: document.documentStatus === 'ready' ? 'success' : 'processing',
        progress: 100,
        fileName: document.documentName,
        documentId: document.id,
      });

      await syncQueriesAfterDocumentAttach();

      if (document.documentStatus === 'ready') {
        toast.success('Document ready!');
        onUploadComplete?.(document.id);
        return;
      }

      const started = await startIngestionWithRetry(document.id);
      if (!started) {
        setUploadState((prev) => ({
          ...prev,
          status: 'error',
          error: 'Could not start ingestion right now. Please retry.',
        }));
        toast.warning('Could not start ingestion right now. Please retry.');
      }
    },
    [onUploadComplete, startIngestionWithRetry, syncQueriesAfterDocumentAttach]
  );

  const recoverDocumentFromChat = useCallback(
    async (uploadedFileName: string): Promise<ResolvedDocument | null> => {
      try {
        const response = await apiEndpoints.chats.get(chatId);
        const documents = response.data?.data?.documents || [];

        const normalizedUploaded = uploadedFileName.toLowerCase();
        const match = documents.find((doc: any) => {
          const raw = String(doc.documentName || '').toLowerCase();
          const display = getDisplayDocumentName(String(doc.documentName || '')).toLowerCase();
          return (
            raw === normalizedUploaded ||
            display === normalizedUploaded ||
            raw.endsWith(`_${normalizedUploaded}`)
          );
        });

        if (!match) return null;

        return {
          id: match.id,
          documentName: match.documentName,
          documentStatus: match.documentStatus,
          ingestionStep: match.ingestionStep,
        };
      } catch (error) {
        console.error('Recovery check failed:', error);
        return null;
      }
    },
    [chatId]
  );

  const handleUploadSuccess = useCallback(
    async (data: DocumentUploadResponse['data'], uploadedFileName: string) => {
      const resolved = resolveUploadDocument(data, uploadedFileName);
      if (!resolved) {
        throw new Error('Upload response missing document reference');
      }

      await continueProcessingDocument(resolved);
    },
    [continueProcessingDocument]
  );

  const handleUploadError = useCallback(
    async (error: any, uploadedFileName: string) => {
      const message = getErrorMessage(error);
      const isDuplicate = /document already exists/i.test(message);
      const shouldTryRecovery = isDuplicate || isRetriableError(error);

      if (shouldTryRecovery) {
        const recovered = await recoverDocumentFromChat(uploadedFileName);
        if (recovered) {
          toast.info('Recovered existing upload. Resuming processing...');
          await continueProcessingDocument(recovered);
          return;
        }
      }

      setUploadState({
        status: 'error',
        progress: 0,
        error: message,
      });
    },
    [continueProcessingDocument, recoverDocumentFromChat]
  );

  // Poll document status while processing
  const {
    data: docStatus,
    isError: isDocumentStatusError,
    error: documentStatusError,
  } = useDocumentStatus(uploadState.documentId || '');

  // Check ingestion lifecycle updates
  useEffect(() => {
    if (!docStatus) return;

    if (docStatus.documentStatus === 'ready' && uploadState.status !== 'success') {
      setUploadState(prev => ({ ...prev, status: 'success' }));
      toast.success('Document ready!');
      if (onUploadComplete) {
        onUploadComplete(uploadState.documentId!);
      }
    }

    if (docStatus.documentStatus === 'failed' && uploadState.status !== 'error') {
      const failureMessage =
        docStatus.failureReason ||
        'Document ingestion failed due to a server issue. Please retry in a few minutes.';

      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: failureMessage,
      }));
      toast.error(failureMessage);
    }
  }, [docStatus, onUploadComplete, uploadState.documentId, uploadState.status]);

  useEffect(() => {
    if (!isDocumentStatusError || uploadState.status !== 'processing') return;

    const statusCode = (documentStatusError as any)?.response?.status;
    if (statusCode !== 404) return;

    setUploadState((prev) => ({
      ...prev,
      status: 'error',
      error: OCR_NOT_SUPPORTED_MESSAGE,
      documentId: undefined,
      progress: 0,
    }));

    queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    toast.error(OCR_NOT_SUPPORTED_MESSAGE);
  }, [chatId, documentStatusError, isDocumentStatusError, queryClient, uploadState.status]);

  const handleRetryIngestion = useCallback(async () => {
    if (!uploadState.documentId) return;

    setUploadState((prev) => ({
      ...prev,
      status: 'processing',
      progress: 100,
      error: undefined,
    }));

    const started = await startIngestionWithRetry(uploadState.documentId);
    if (!started) {
      setUploadState((prev) => ({
        ...prev,
        status: 'error',
        error: 'Could not restart ingestion. Please try again.',
      }));
    }
  }, [startIngestionWithRetry, uploadState.documentId]);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    // Validate file size (15MB max)
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      toast.error('File size must be less than 15MB');
      return;
    }

    // Start upload
    setUploadState({
      status: 'uploading',
      progress: 0,
      fileName: file.name,
    });

    // Simulate progress (actual progress would come from upload)
    const progressInterval = setInterval(() => {
      setUploadState(prev => {
        if (prev.progress < 90) {
          return { ...prev, progress: prev.progress + 10 };
        }
        return prev;
      });
    }, 200);

    try {
      const data = await uploadWithRetry(file);
      await handleUploadSuccess(data, file.name);
    } catch (error: any) {
      await handleUploadError(error, file.name);
    } finally {
      clearInterval(progressInterval);
    }
  }, [uploadWithRetry, handleUploadSuccess, handleUploadError]);

  useEffect(() => {
    if (!queuedFile) return;
    if (uploadState.status === 'uploading' || uploadState.status === 'processing') return;

    void handleFileSelect(queuedFile);
    onQueuedFileConsumed?.();
  }, [handleFileSelect, onQueuedFileConsumed, queuedFile, uploadState.status]);

  // Handle reset (start new upload)
  const handleReset = () => {
    setUploadState({ status: 'idle', progress: 0 });
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <UploadDropzone
        onFileSelect={handleFileSelect}
        isUploading={uploadState.status === 'uploading'}
        uploadProgress={uploadState.progress}
        uploadStatus={uploadState.status === 'processing' ? 'uploading' : uploadState.status}
        errorMessage={uploadState.error}
      />

      {/* Processing Status */}
      {uploadState.status === 'processing' && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                Processing document...
              </p>
              <p className="text-xs text-white/50">
                {uploadState.fileName}
              </p>
            </div>
          </div>

          {/* Processing Steps */}
          <div className="mt-4 space-y-2">
            {['fetched', 'normalized', 'chunked', 'embedded', 'upserted'].map((step, index) => {
              const currentStepIndex = ['fetched', 'normalized', 'chunked', 'embedded', 'upserted'].indexOf(docStatus?.ingestionStep || 'none');
              const isComplete = currentStepIndex >= index;

              return (
                <div key={step} className="flex items-center gap-2">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                    isComplete 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-white/5 text-white/30'
                  )}>
                    {isComplete ? '✓' : index + 1}
                  </div>
                  <span className={cn(
                    'text-sm capitalize',
                    isComplete ? 'text-white' : 'text-white/30'
                  )}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Success State */}
      {uploadState.status === 'success' && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-400">
                Document ready!
              </p>
              <p className="text-xs text-white/50">
                You can now chat with this document
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Upload another
            </Button>
          </div>
        </div>
      )}

      {/* Error Recovery */}
      {uploadState.status === 'error' && uploadState.documentId && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-300">
                {uploadState.error || 'Document processing failed.'}
              </p>
              <p className="text-xs text-white/50">
                {isOcrUnsupportedMessage(uploadState.error)
                  ? 'Please upload a text-based PDF. OCR for scanned PDFs is not available yet.'
                  : 'Retry ingestion to continue.'}
              </p>
            </div>
            {!isOcrUnsupportedMessage(uploadState.error) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetryIngestion}
                isLoading={ingestMutation.isPending}
              >
                Retry ingestion
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentUpload;
