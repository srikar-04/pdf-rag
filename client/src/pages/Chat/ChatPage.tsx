import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { MessageList, ChatInput } from '../../components/chat';
import { DocumentUpload } from '../../components/document';
import { useMessages, useSendMessage, useChat } from '../../hooks';
import { useAppStore } from '../../lib/store';
import { Button } from '../../components/ui';
import { FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

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

  // React Query hooks
  const { data: chat, isLoading: chatLoading } = useChat(chatId || '');
  const { data: messages, isLoading: messagesLoading } = useMessages(chatId || '');
  const sendMessageMutation = useSendMessage();

  // Get first document ID from chat
  const documentId = chat?.documents?.[0]?.id;

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

    // Start streaming state
    startStreaming();

    try {
      await sendMessageMutation.mutateAsync({
        chatId,
        documentId,
        query: content,
      });
      toast.success('Message sent');
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
      <ChatInput
        onSend={handleSendMessage}
        isLoading={isStreaming || sendMessageMutation.isPending}
        disabled={sendMessageMutation.isPending}
        chatId={chatId}
      />
    </div>
  );
}
