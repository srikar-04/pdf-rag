import { useState, useEffect, useCallback } from 'react';

const DRAFT_PREFIX = 'chat_draft_';

/**
 * useDrafts Hook
 * 
 * Auto-saves draft messages to localStorage
 * Restores drafts when user returns to a chat
 * 
 * Features:
 * - Save draft on every keystroke (debounced)
 * - Restore draft on mount
 * - Clear draft after message is sent
 * - Clean up old drafts
 */

export function useDrafts(chatId: string | undefined) {
  const [draft, setDraft] = useState('');
  const [hasDraft, setHasDraft] = useState(false);

  // Get storage key for current chat
  const getStorageKey = useCallback(() => {
    if (!chatId) return null;
    return `${DRAFT_PREFIX}${chatId}`;
  }, [chatId]);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (!chatId) return;

    const key = getStorageKey();
    if (!key) return;

    try {
      const savedDraft = localStorage.getItem(key);
      if (savedDraft) {
        setDraft(savedDraft);
        setHasDraft(true);
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, [chatId, getStorageKey]);

  // Save draft to localStorage (debounced)
  useEffect(() => {
    if (!chatId || !draft) return;

    const key = getStorageKey();
    if (!key) return;

    // Debounce save - wait 500ms after last keystroke
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(key, draft);
        setHasDraft(true);
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [draft, chatId, getStorageKey]);

  // Update draft
  const updateDraft = useCallback((value: string) => {
    setDraft(value);
  }, []);

  // Clear draft after message is sent
  const clearDraft = useCallback(() => {
    if (!chatId) return;

    const key = getStorageKey();
    if (!key) return;

    try {
      localStorage.removeItem(key);
      setDraft('');
      setHasDraft(false);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, [chatId, getStorageKey]);

  // Clean up old drafts (older than 24 hours)
  const cleanupOldDrafts = useCallback(() => {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      keys.forEach((key) => {
        if (key.startsWith(DRAFT_PREFIX)) {
          const timestamp = localStorage.getItem(`${key}_timestamp`);
          if (timestamp && now - parseInt(timestamp) > oneDay) {
            localStorage.removeItem(key);
            localStorage.removeItem(`${key}_timestamp`);
          }
        }
      });
    } catch (error) {
      console.error('Failed to cleanup old drafts:', error);
    }
  }, []);

  // Cleanup on mount
  useEffect(() => {
    cleanupOldDrafts();
  }, [cleanupOldDrafts]);

  return {
    draft,
    hasDraft,
    updateDraft,
    clearDraft,
  };
}

export default useDrafts;
