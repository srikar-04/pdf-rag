import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MessageList, ChatInput } from '../../components/chat';
import { DocumentUpload } from '../../components/document';
import { useMessages, useSendMessage, useChat, useDocumentStatus } from '../../hooks';
import { useAppStore } from '../../lib/store';
import { Button } from '../../components/ui';
import { FileText, AlertCircle, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn, getDisplayDocumentName } from '../../lib/utils';
import type { IngestionStep } from '../../types';

/**
 * ChatPage Component
 * 
 * The main chat interface where users can:
 * - See chat history
 * - Send messages
 * - Get AI responses
 * - Upload documents
 * 
 * Features:
 * - Message list with auto-scroll
 * - Input area with typing indicator
 * - Document upload
 * - Loading states
 * - Error handling
 */

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const [showUpload, setShowUpload] = useState(false);
  const [activeDocumentId, setActiveDocumentId] = useState<string | undefined>(undefined);
  const [isPageDragActive, setIsPageDragActive] = useState(false);
  const [queuedUploadFile, setQueuedUploadFile] = useState<File | null>(null);
  const [uploadFailureNotice, setUploadFailureNotice] = useState<string | null>(null);
  const [runtimeIngestionError, setRuntimeIngestionError] = useState<string | null>(null);
  const hasShownFailureToastRef = useRef(false);
  const wasDocumentReadyRef = useRef(false);
  const previousDocumentIdRef = useRef<string | undefined>(undefined);
  const dragDepthRef = useRef(0);
  const queryClient = useQueryClient();

  // React Query hooks
  const { data: chat, isLoading: chatLoading } = useChat(chatId || '');
  const { data: messages, isLoading: messagesLoading } = useMessages(chatId || '');
  const sendMessageMutation = useSendMessage();

  const linkedDocuments = useMemo(() => chat?.documents || [], [chat?.documents]);
  const selectedDocument =
    linkedDocuments.find((doc) => doc.id === activeDocumentId) ||
    linkedDocuments[linkedDocuments.length - 1];
  const documentId = selectedDocument?.id;
  const { data: polledDocumentStatus, isError: documentStatusError, error: documentStatusQueryError } = useDocumentStatus(documentId || '');

  const effectiveDocumentStatus = polledDocumentStatus?.documentStatus || selectedDocument?.documentStatus;
  const effectiveIngestionStep = (polledDocumentStatus?.ingestionStep || selectedDocument?.ingestionStep || 'none') as IngestionStep;
  const failureReason = polledDocumentStatus?.failureReason;
  const isDocumentReady = effectiveDocumentStatus === 'ready';
  const isDocProcessing =
    effectiveDocumentStatus === 'processing' || effectiveDocumentStatus === 'Ingesting';
  const shouldShowFailureCard = effectiveDocumentStatus === 'failed' || !!runtimeIngestionError;
  const failureMessageForUI =
    failureReason ||
    runtimeIngestionError ||
    'Document processing failed due to a server issue. Please retry the upload in a few minutes.';

  const consumeQueuedUploadFile = useCallback(() => {
    setQueuedUploadFile(null);
  }, []);

  useEffect(() => {
    if (linkedDocuments.length === 0) {
      setActiveDocumentId(undefined);
      return;
    }

    const hasSelectedDocument = linkedDocuments.some((doc) => doc.id === activeDocumentId);
    if (!hasSelectedDocument) {
      // Default to the most recently linked document.
      setActiveDocumentId(linkedDocuments[linkedDocuments.length - 1]?.id);
    }
  }, [activeDocumentId, linkedDocuments]);

  useEffect(() => {
    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types || []).includes('Files');

    const handleDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current += 1;
      setIsPageDragActive(true);
    };

    const handleDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      setIsPageDragActive(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setIsPageDragActive(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsPageDragActive(false);

      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      if (file.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed');
        return;
      }

      setShowUpload(true);
      setQueuedUploadFile(file);
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  useEffect(() => {
    // Auto-close upload panel only on transition to ready (not on manual re-open later).
    if (!wasDocumentReadyRef.current && isDocumentReady && showUpload) {
      setShowUpload(false);
    }
    wasDocumentReadyRef.current = isDocumentReady;
  }, [isDocumentReady, showUpload]);

  useEffect(() => {
    const previousDocumentId = previousDocumentIdRef.current;
    if (!previousDocumentId && documentId && showUpload) {
      setShowUpload(false);
    }
    previousDocumentIdRef.current = documentId;
  }, [documentId, showUpload]);

  useEffect(() => {
    if (!chatId) return;
    if (effectiveDocumentStatus !== 'ready' && effectiveDocumentStatus !== 'failed') return;

    queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  }, [chatId, effectiveDocumentStatus, queryClient]);

  useEffect(() => {
    if (!chatId || !documentStatusError) return;
    const statusCode = (documentStatusQueryError as any)?.response?.status;
    if (statusCode === 404) {
      const failureMessage =
        'Upload failed because this PDF appears scanned/image-only. OCR is not supported yet. Please upload a text-based PDF.';

      setShowUpload(false);
      setUploadFailureNotice(failureMessage);
      setRuntimeIngestionError(null);
      if (!hasShownFailureToastRef.current) {
        toast.error(failureMessage);
        hasShownFailureToastRef.current = true;
      }

      queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      return;
    }

    if (!isDocProcessing) return;

    const failureMessage =
      'Document processing failed because the backend became unreachable during ingestion. Please restart the backend and upload again.';
    setRuntimeIngestionError(failureMessage);

    if (!hasShownFailureToastRef.current) {
      toast.error(failureMessage);
      hasShownFailureToastRef.current = true;
    }
  }, [chatId, documentStatusError, documentStatusQueryError, isDocProcessing, queryClient]);

  useEffect(() => {
    if (isDocumentReady || effectiveDocumentStatus === 'failed') {
      setRuntimeIngestionError(null);
    }
  }, [effectiveDocumentStatus, isDocumentReady]);

  useEffect(() => {
    if (!documentId) return;
    setUploadFailureNotice(null);
    setRuntimeIngestionError(null);
    hasShownFailureToastRef.current = false;
  }, [documentId]);

  const pipelineSteps = useMemo(
    () =>
      [
        { key: 'fetched', label: 'Fetched PDF' },
        { key: 'normalized', label: 'Normalized Text' },
        { key: 'chunked', label: 'Chunked Content' },
        { key: 'embedded', label: 'Generated Embeddings' },
        { key: 'upserted', label: 'Stored in Vector DB' },
      ] as const,
    []
  );

  const currentStepIndex = useMemo(() => {
    if (effectiveDocumentStatus === 'ready') return pipelineSteps.length - 1;
    return pipelineSteps.findIndex((step) => step.key === effectiveIngestionStep);
  }, [effectiveDocumentStatus, effectiveIngestionStep, pipelineSteps]);

  // Zustand store for streaming state
  const { isStreaming, startStreaming, endStreaming } = useAppStore();

  // Handle send message
  const handleSendMessage = async (content: string) => {
    if (!chatId) {
      toast.error('No chat selected');
      return;
    }

    if (!documentId) {
      toast.error('No document attached to this chat. Please upload a document first.');
      return;
    }

    if (!isDocumentReady) {
      toast.error('Document is still processing. Please wait until it is ready.');
      return;
    }

    // Start streaming state
    startStreaming();

    try {
      await sendMessageMutation.mutateAsync({
        chatId,
        documentId,
        query: content,
      });
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
    } finally {
      endStreaming();
    }
  };

  // Combined loading state
  const isLoading = chatLoading || messagesLoading;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-white/50">Loading...</p>
        </div>
      </div>
    );
  }

  // No document attached state
  if (!documentId) {
    return (
      <div className="relative flex-1">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-10 h-10 text-amber-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            No document attached
          </h3>
          <p className="text-sm text-white/50 max-w-sm mb-6">
            Upload a PDF document to this chat to start asking questions about it.
          </p>
          {uploadFailureNotice && (
            <div className="w-full max-w-xl mb-6 rounded-lg border border-red-500/40 bg-red-500/15 p-4 text-left">
              <p className="text-sm font-semibold text-red-200 mb-1">Why upload failed</p>
              <p className="text-sm text-red-100 leading-6">{uploadFailureNotice}</p>
            </div>
          )}
          <Button
            variant="primary"
            onClick={() => setShowUpload(true)}
            leftIcon={<FileText className="w-4 h-4" />}
          >
            Upload Document
          </Button>

          {showUpload && (
            <div className="mt-6 w-full max-w-xl">
              <div className="flex justify-end mb-2">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close upload panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <DocumentUpload
                chatId={chatId || ''}
                queuedFile={queuedUploadFile}
                onQueuedFileConsumed={consumeQueuedUploadFile}
                onUploadComplete={() => {
                  setShowUpload(false);
                  setUploadFailureNotice(null);
                  setQueuedUploadFile(null);
                  hasShownFailureToastRef.current = false;
                  toast.success('Document uploaded and ready!');
                }}
              />
            </div>
          )}
        </div>

        {isPageDragActive && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl border-2 border-dashed border-indigo-400/70 bg-indigo-500/10 p-10 text-center shadow-2xl">
              <div className="mx-auto mb-4 w-14 h-14 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <FileText className="w-7 h-7 text-indigo-300" />
              </div>
              <p className="text-lg font-semibold text-indigo-100">Drop PDF to upload to this chat</p>
              <p className="mt-2 text-sm text-indigo-200/85">Release to start upload immediately</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full">
      {linkedDocuments.length > 0 && (
        <div className="px-4 pt-3 pb-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-medium text-white/60 mb-2">
              Linked documents ({linkedDocuments.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {linkedDocuments.map((doc) => {
                const isActive = doc.id === documentId;
                const statusColor =
                  doc.documentStatus === 'ready'
                    ? 'bg-green-400'
                    : doc.documentStatus === 'failed'
                    ? 'bg-red-400'
                    : 'bg-amber-300';

                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setActiveDocumentId(doc.id)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors',
                      isActive
                        ? 'border-indigo-400/60 bg-indigo-500/15 text-indigo-100'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', statusColor)} />
                    <span className="max-w-[220px] truncate">{getDisplayDocumentName(doc.documentName)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <MessageList messages={messages || []} isLoading={isLoading} />

      {/* Upload Panel */}
      {showUpload && (
        <div className="px-4 pb-2">
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => setShowUpload(false)}
              className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close upload panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <DocumentUpload
            chatId={chatId || ''}
            queuedFile={queuedUploadFile}
            onQueuedFileConsumed={consumeQueuedUploadFile}
            onUploadComplete={() => {
              setShowUpload(false);
              setUploadFailureNotice(null);
              setQueuedUploadFile(null);
              hasShownFailureToastRef.current = false;
              toast.success('Document uploaded and ready!');
            }}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-center gap-2 px-4 pb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowUpload(true)}
          leftIcon={<FileText className="w-4 h-4" />}
        >
          Upload
        </Button>
      </div>

      {/* Chat Input */}
      {shouldShowFailureCard && (
        <div className="px-4 pb-3">
          <div className="rounded-lg border border-red-500/40 bg-red-500/15 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-200">
                  Document ingestion failed
                </p>
                <p className="text-sm text-red-100 mt-1 leading-6">
                  {failureMessageForUI}
                </p>
                <div className="mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUpload(true)}
                    leftIcon={<FileText className="w-4 h-4" />}
                    className="bg-red-500/15 border border-red-500/30 text-red-100 hover:bg-red-500/25"
                  >
                    Upload Another PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isDocumentReady && !shouldShowFailureCard && (
        <div className="px-4 pb-3">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
            <p className="text-xs font-medium text-amber-300 mb-3">
              Document pipeline: {effectiveDocumentStatus || 'processing'}
            </p>
            <div className="space-y-2">
              {pipelineSteps.map((step, index) => {
                const isComplete = currentStepIndex !== -1 && index < currentStepIndex;
                const isCurrent = currentStepIndex === index;
                const connectorDone = index < currentStepIndex;

                return (
                  <div key={step.key} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'h-5 w-5 rounded-full border text-[10px] font-semibold flex items-center justify-center',
                          isComplete && 'border-green-400 bg-green-500/20 text-green-300',
                          isCurrent && 'border-amber-300 bg-amber-500/20 text-amber-200 animate-pulse',
                          !isComplete && !isCurrent && 'border-white/20 bg-white/5 text-white/50'
                        )}
                      >
                        {isComplete ? '✓' : index + 1}
                      </div>
                      {index < pipelineSteps.length - 1 && (
                        <div
                          className={cn(
                            'w-px h-4 mt-1',
                            connectorDone ? 'bg-green-400/70' : 'bg-white/15'
                          )}
                        />
                      )}
                    </div>
                    <p
                      className={cn(
                        'text-xs pt-0.5',
                        isComplete && 'text-green-300',
                        isCurrent && 'text-amber-200',
                        !isComplete && !isCurrent && 'text-white/60'
                      )}
                    >
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-amber-200/80 mt-2">
              Messaging will be enabled automatically when this reaches the final step.
            </p>
          </div>
        </div>
      )}

      <ChatInput
        onSend={handleSendMessage}
        isLoading={isStreaming || sendMessageMutation.isPending}
        disabled={sendMessageMutation.isPending || !isDocumentReady}
        chatId={chatId}
      />

      {isPageDragActive && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border-2 border-dashed border-indigo-400/70 bg-indigo-500/10 p-10 text-center shadow-2xl">
            <div className="mx-auto mb-4 w-14 h-14 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <FileText className="w-7 h-7 text-indigo-300" />
            </div>
            <p className="text-lg font-semibold text-indigo-100">Drop PDF to upload to this chat</p>
            <p className="mt-2 text-sm text-indigo-200/85">Release to start upload immediately</p>
          </div>
        </div>
      )}
    </div>
  );
}
