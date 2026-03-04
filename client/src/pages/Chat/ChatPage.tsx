import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MessageList, ChatInput } from '../../components/chat';
import { DocumentUpload } from '../../components/document';
import { useMessages, useSendMessage, useChat, useDocumentStatus } from '../../hooks';
import { useAppStore } from '../../lib/store';
import { Button } from '../../components/ui';
import { FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '../../lib/utils';
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
  const queryClient = useQueryClient();

  // React Query hooks
  const { data: chat, isLoading: chatLoading } = useChat(chatId || '');
  const { data: messages, isLoading: messagesLoading } = useMessages(chatId || '');
  const sendMessageMutation = useSendMessage();

  // Get first document ID from chat
  const selectedDocument = chat?.documents?.[0];
  const documentId = selectedDocument?.id;
  const { data: polledDocumentStatus } = useDocumentStatus(documentId || '');

  const effectiveDocumentStatus = polledDocumentStatus?.documentStatus || selectedDocument?.documentStatus;
  const effectiveIngestionStep = (polledDocumentStatus?.ingestionStep || selectedDocument?.ingestionStep || 'none') as IngestionStep;
  const isDocumentReady = effectiveDocumentStatus === 'ready';

  useEffect(() => {
    if (isDocumentReady && showUpload) {
      setShowUpload(false);
    }
  }, [isDocumentReady, showUpload]);

  useEffect(() => {
    if (!chatId) return;
    if (effectiveDocumentStatus !== 'ready' && effectiveDocumentStatus !== 'failed') return;

    queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  }, [chatId, effectiveDocumentStatus, queryClient]);

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
        <Button
          variant="primary"
          onClick={() => setShowUpload(true)}
          leftIcon={<FileText className="w-4 h-4" />}
        >
          Upload Document
        </Button>

        {showUpload && (
          <div className="mt-6 w-full max-w-xl">
            <DocumentUpload
              chatId={chatId || ''}
              onUploadComplete={() => {
                setShowUpload(false);
                toast.success('Document uploaded and ready!');
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <MessageList messages={messages || []} isLoading={isLoading} />

      {/* Upload Toggle */}
      {showUpload && (
        <div className="px-4 pb-2">
          <DocumentUpload
            chatId={chatId || ''}
            onUploadComplete={() => {
              setShowUpload(false);
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
          onClick={() => setShowUpload(!showUpload)}
          leftIcon={<FileText className="w-4 h-4" />}
          className={showUpload ? 'bg-white/10' : ''}
        >
          Upload
        </Button>
      </div>

      {/* Chat Input */}
      {!isDocumentReady && (
        <div className="px-4 pb-3">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
            <p className="text-xs font-medium text-amber-300 mb-3">
              Document pipeline: {effectiveDocumentStatus || 'processing'}
            </p>
            <div className="space-y-2">
              {pipelineSteps.map((step, index) => {
                const isComplete = currentStepIndex !== -1 && index < currentStepIndex;
                const isCurrent = currentStepIndex === index && effectiveDocumentStatus !== 'failed';
                const isFailed = effectiveDocumentStatus === 'failed' && currentStepIndex === index;
                const connectorDone = index < currentStepIndex;

                return (
                  <div key={step.key} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'h-5 w-5 rounded-full border text-[10px] font-semibold flex items-center justify-center',
                          isComplete && 'border-green-400 bg-green-500/20 text-green-300',
                          isCurrent && !isFailed && 'border-amber-300 bg-amber-500/20 text-amber-200 animate-pulse',
                          isFailed && 'border-red-300 bg-red-500/20 text-red-200',
                          !isComplete && !isCurrent && !isFailed && 'border-white/20 bg-white/5 text-white/50'
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
                        isCurrent && !isFailed && 'text-amber-200',
                        isFailed && 'text-red-200',
                        !isComplete && !isCurrent && !isFailed && 'text-white/60'
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
    </div>
  );
}
