import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Input Component
 * 
 * Features:
 * - Dark theme styling
 * - Focus states with ring
 * - Error state styling
 * - Support for left/right icons
 * - Full width by default
 * 
 * Usage:
 * <Input 
 *   placeholder="Enter your message..." 
 *   error={errorMessage}
 *   leftIcon={<SearchIcon />}
 * />
 */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
              {leftIcon}
            </div>
          )}
          
          <input
            type={type}
            className={cn(
              // Base styles
              'flex w-full rounded-lg border bg-[#1a1a1a] px-4 py-2.5 text-sm text-white transition-colors',
              'placeholder:text-white/40',
              // Focus styles
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
              // Hover styles
              'hover:border-white/20',
              // Disabled styles
              'disabled:cursor-not-allowed disabled:opacity-50',
              // Error styles
              error && 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50',
              // Left padding adjustment if icon present
              leftIcon && 'pl-10',
              // Right padding adjustment if icon present
              rightIcon && 'pr-10',
              // Border color
              error ? 'border-red-500/30' : 'border-white/10',
              className
            )}
            ref={ref}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && (
          <p className="mt-1.5 text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/**
 * Textarea Component
 * 
 * Auto-resizing textarea for chat input
 */
export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onInput'> {
  error?: string;
  minRows?: number;
  maxRows?: number;
  onInput?: React.FormEventHandler<HTMLTextAreaElement>;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, minRows = 1, maxRows = 6, onInput, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    
    // Auto-resize functionality
    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;
      textarea.style.height = 'auto';
      
      const lineHeight = 24; // Approximate line height
      const minHeight = minRows * lineHeight;
      const maxHeight = maxRows * lineHeight;
      const scrollHeight = textarea.scrollHeight;
      
      textarea.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
      
      onInput?.(e);
    };
    
    // Merge refs
    React.useImperativeHandle(ref, () => textareaRef.current!);
    
    return (
      <div className="w-full">
        <textarea
          className={cn(
            // Base styles
            'flex w-full rounded-lg border bg-[#1a1a1a] px-4 py-2.5 text-sm text-white transition-colors resize-none overflow-hidden',
            'placeholder:text-white/40',
            // Focus styles
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
            // Hover styles
            'hover:border-white/20',
            // Disabled styles
            'disabled:cursor-not-allowed disabled:opacity-50',
            // Error styles
            error && 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50',
            // Border color
            error ? 'border-red-500/30' : 'border-white/10',
            className
          )}
          ref={textareaRef}
          onInput={handleInput}
          rows={minRows}
          {...props}
        />
        
        {error && (
          <p className="mt-1.5 text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Input, Textarea };
