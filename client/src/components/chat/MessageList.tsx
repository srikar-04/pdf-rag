import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { useAppStore } from '../../lib/store';
import type { Message } from '../../types';
import { FileQuestion } from 'lucide-react';

/**
 * MessageList Component
 * 
 * Displays a list of chat messages with auto-scroll
 * 
 * Features:
 * - Auto-scrolls to bottom on new messages
 * - Shows typing indicator when AI is responding
 * - Empty state when no messages
 * - Smooth scroll behavior
 * 
 * Props:
 * - messages: Array of message objects
 * - isLoading: Whether messages are loading
 */

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const { isStreaming } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end' 
    });
  }, [messages, isStreaming]);

  // Empty state
  if (!isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4">
          <FileQuestion className="w-10 h-10 text-indigo-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          No messages yet
        </h3>
        <p className="text-sm text-white/50 max-w-sm">
          Start the conversation by sending a message below. 
          Ask questions about your uploaded documents.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto">
        {/* Messages */}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
          />
        ))}

        {/* Typing indicator */}
        {isStreaming && <TypingIndicator />}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default MessageList;
