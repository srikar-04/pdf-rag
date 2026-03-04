import { motion } from 'framer-motion';
import { FileText, Loader2, Trash2, MoreVertical, Download } from 'lucide-react';
import { cn, getDisplayDocumentName } from '../../lib/utils';
import type { Document, DocumentStatus } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

/**
 * DocumentCard Component
 * 
 * Displays a single document with status and actions
 * 
 * Features:
 * - Document name and metadata
 * - Processing status indicator
 * - Action menu (delete, download)
 * - Hover effects
 * 
 * Props:
 * - document: The document object
 * - onDelete: Callback when delete is clicked
 * - onSelect: Callback when document is selected for chat
 */

interface DocumentCardProps {
  document: Document;
  onDelete?: (id: string) => void;
  onSelect?: (id: string) => void;
}

export function DocumentCard({ document, onDelete, onSelect }: DocumentCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Get status color
  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case 'ready':
        return 'bg-green-500';
      case 'processing':
      case 'Ingesting':
        return 'bg-yellow-500 animate-pulse';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get status label
  const getStatusLabel = (status: DocumentStatus) => {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'processing':
        return 'Processing...';
      case 'Ingesting':
        return 'Ingesting...';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const displayName = document.displayName || getDisplayDocumentName(document.documentName);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group relative rounded-xl border transition-all cursor-pointer',
        'bg-white/5 border-white/10 hover:border-white/20',
        'hover:bg-white/[0.07]'
      )}
      onClick={() => onSelect?.(document.id)}
    >
      <div className="p-4">
        {/* Top Row: Icon + Info */}
        <div className="flex items-start gap-3">
          {/* File Icon */}
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
            'bg-gradient-to-br from-purple-500/20 to-indigo-500/20'
          )}>
            <FileText className="w-6 h-6 text-purple-400" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-white truncate">
              {displayName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {/* Status Badge */}
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
                document.documentStatus === 'ready' && 'bg-green-500/10 text-green-400',
                (document.documentStatus === 'processing' || document.documentStatus === 'Ingesting') && 'bg-yellow-500/10 text-yellow-400',
                document.documentStatus === 'failed' && 'bg-red-500/10 text-red-400'
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full', getStatusColor(document.documentStatus))} />
                {getStatusLabel(document.documentStatus)}
              </span>

              {/* Time */}
              <span className="text-xs text-white/40">
                {document.createdAt && formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Menu Button */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className={cn(
                'p-2 rounded-lg transition-colors',
                'text-white/40 hover:text-white hover:bg-white/10',
                'opacity-0 group-hover:opacity-100'
              )}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 top-full mt-1 w-40 py-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-50">
                  {document.documentStatus === 'ready' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect?.(document.id);
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5"
                    >
                      <Download className="w-4 h-4" />
                      Use in Chat
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(document.id);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Processing Steps (show when processing) */}
        {(document.documentStatus === 'processing' || document.documentStatus === 'Ingesting') && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>
                Step: {document.ingestionStep}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default DocumentCard;
