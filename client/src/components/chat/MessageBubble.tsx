import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Bot, User, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { Message } from '../../types';

/**
 * MessageBubble Component
 * 
 * Displays a single chat message with proper styling
 * 
 * Features:
 * - Different styles for user and AI messages
 * - Copy to clipboard functionality
 * - Smooth animations
 * - Timestamp display
 * 
 * Props:
 * - message: The message object
 * - isLatest: Whether this is the latest message (for streaming)
 */

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex gap-3 mb-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
          isUser
            ? 'bg-blue-500/20'
            : isAssistant
            ? 'bg-linear-to-br from-indigo-500 to-purple-500'
            : 'bg-gray-500/20'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-blue-400" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 relative group',
          isUser
            ? 'bg-blue-500/10 border border-blue-500/20'
            : isAssistant
            ? 'bg-white/5 border border-white/10'
            : 'bg-gray-500/10 border border-gray-500/20'
        )}
      >
        {/* Copy button (visible on hover for assistant messages) */}
        {isAssistant && (
          <button
            onClick={handleCopy}
            className={cn(
              'absolute top-2 right-2 p-1.5 rounded-lg transition-all',
              'opacity-0 group-hover:opacity-100',
              'hover:bg-white/10 text-white/40 hover:text-white'
            )}
            title={copied ? 'Copied!' : 'Copy'}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Message text */}
        <p
          className={cn(
            'text-sm whitespace-pre-wrap wrap-break-word',
            isUser ? 'text-blue-100' : 'text-white/90'
          )}
        >
          {message.content}
        </p>

        {/* Timestamp */}
        <p className={cn(
          'text-[10px] mt-2 opacity-40',
          isUser ? 'text-blue-200' : 'text-white/50'
        )}>
          {new Date(message.createdAt).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </div>
    </motion.div>
  );
}

export default MessageBubble;
