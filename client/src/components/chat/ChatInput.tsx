import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDrafts } from '../../hooks/useDrafts';

/**
 * ChatInput Component
 * 
 * Input area for sending messages
 * 
 * Features:
 * - Auto-resizing textarea
 * - File attachment button (for documents)
 * - Send button with loading state
 * - Keyboard shortcut (Enter to send, Shift+Enter for new line)
 * - Character count
 * - Disabled state when loading
 * - Auto-save drafts to localStorage
 * 
 * Props:
 * - onSend: Callback when message is sent
 * - isLoading: Whether to show loading state
 * - disabled: Whether input is disabled
 * - placeholder: Placeholder text
 * - chatId: Chat ID for draft saving
 */

interface ChatInputProps {
  onSend: (message: string) => void | Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  chatId?: string;
}

export function ChatInput({ 
  onSend, 
  isLoading = false, 
  disabled = false,
  placeholder = 'Ask a question about your document...',
  chatId
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-save drafts
  const { draft: savedDraft, hasDraft, updateDraft, clearDraft } = useDrafts(chatId);

  // Restore draft on mount (only once)
  useEffect(() => {
    if (hasDraft && savedDraft && !message) {
      setMessage(savedDraft);
      // Auto-resize textarea after restoring draft
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
      }, 0);
    }
  }, [hasDraft, savedDraft]);

  // Handle send
  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || isLoading || disabled || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await Promise.resolve(onSend(trimmed));
      setMessage('');
      clearDraft();

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // Handle auto-resize
  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
    // Update draft
    updateDraft(textarea?.value || '');
  };

  const inputDisabled = disabled || isLoading || isSubmitting;
  const canSend = message.trim().length > 0 && !inputDisabled;

  return (
    <div className="border-t border-white/5 bg-[#0a0a0a] px-4 py-4">
      <div className="max-w-3xl mx-auto">
        {/* Draft indicator */}
        {hasDraft && !message && (
          <div className="mb-2 flex items-center gap-2 text-xs text-amber-400/70">
            <span>You have an unsaved draft</span>
            <button 
              onClick={() => {
                setMessage(savedDraft);
                clearDraft();
              }}
              className="hover:text-amber-400 underline"
            >
              Restore
            </button>
          </div>
        )}

        {/* Input Container */}
        <div className={cn(
          'relative flex items-end gap-2 rounded-xl border transition-colors',
          inputDisabled ? 'border-white/5 bg-white/5' : 'border-white/10 bg-white/5 focus-within:border-indigo-500/50 focus-within:bg-white/10'
        )}>
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={placeholder}
            disabled={inputDisabled}
            rows={1}
            className={cn(
              'flex-1 bg-transparent resize-none',
              'placeholder:text-white/30',
              'focus:outline-none text-sm text-white',
              'px-3 py-3 max-h-[150px] overflow-y-auto',
              'disabled:opacity-50'
            )}
          />

          {/* Character count (show when > 100 chars) */}
          {message.length > 100 && (
            <span className={cn(
              'text-[10px] absolute bottom-1 right-14',
              message.length > 1900 ? 'text-red-400' : 'text-white/30'
            )}>
              {message.length}/2000
            </span>
          )}

          {/* Send Button */}
          <button
            onClick={() => void handleSend()}
            disabled={!canSend}
            className={cn(
              'p-2.5 rounded-lg transition-all shrink-0 m-1',
              canSend
                ? 'bg-indigo-500 hover:bg-indigo-600 text-white hover:shadow-lg hover:shadow-indigo-500/25'
                : 'bg-white/5 text-white/30 cursor-not-allowed'
            )}
            title="Send message"
          >
            {isLoading || isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Hint */}
        <p className="text-[11px] text-white/30 mt-2 text-center">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-white/50">Enter</kbd> to send,{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-white/50">Shift + Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}

export default ChatInput;
