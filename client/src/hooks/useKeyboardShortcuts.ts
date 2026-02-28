import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../lib/store';
import { toast } from 'sonner';

/**
 * useKeyboardShortcuts Hook
 * 
 * Global keyboard shortcuts for the application
 * 
 * Shortcuts:
 * - Ctrl/Cmd + K: Focus search (in sidebar)
 * - Ctrl/Cmd + N: Create new chat
 * - Ctrl/Cmd + /: Show keyboard shortcuts help
 * - Escape: Close modals (handled elsewhere)
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleSidebar } = useAppStore();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

    // Ctrl/Cmd + K: Focus search
    if (ctrlKey && event.key === 'k') {
      event.preventDefault();
      
      // If on dashboard or chat, focus the sidebar search
      if (location.pathname === '/dashboard' || location.pathname.startsWith('/chat/')) {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        } else {
          toggleSidebar();
          setTimeout(() => {
            const newSearchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
            newSearchInput?.focus();
          }, 100);
        }
      }
      return;
    }

    // Ctrl/Cmd + N: New chat
    if (ctrlKey && event.key === 'n') {
      event.preventDefault();
      
      // Only create new chat if not already on a new chat page
      navigate('/dashboard');
      toast.info('Press "New Chat" button to create a new conversation');
      return;
    }

    // Ctrl/Cmd + /: Show shortcuts help
    if (ctrlKey && event.key === '/') {
      event.preventDefault();
      toast.info(
        'Keyboard Shortcuts: Ctrl+K = Search, Ctrl+N = New Chat'
      );
      return;
    }

    // Escape: Close any open modals (handled by individual components)
  }, [navigate, location, toggleSidebar]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
