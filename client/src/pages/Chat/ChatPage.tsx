import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { MessageList, ChatInput } from '../../components/chat';
import { DocumentUpload } from '../../components/document';
import { useMessages, useSendMessage } from '../../hooks';
import { useAppStore } from '../../lib/store';
import { Button } from '../../components/ui';
import { FileText } from 'lucide-react';
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
  const { data: messages, isLoading, error } = useMessages(chatId || '');
  const sendMessageMutation = useSendMessage();

  // Zustand store for streaming state
  const { isStreaming, startStreaming, endStreaming } = useAppStore();

  // Handle send message
  const handleSendMessage = async (content: string) => {
    if (!chatId) {
      toast.error('No chat selected');
      return;
    }

    // Start streaming state
    startStreaming();

    try {
      await sendMessageMutation.mutateAsync({
        chatId,
        documentId: 'default-doc-id', // TODO: Get from chat
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-white/50">Loading messages...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">Failed to load messages</p>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
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
      />
    </div>
  );
}
