import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * UploadDropzone Component
 * 
 * Drag and drop area for uploading PDF documents
 * 
 * Features:
 * - Drag and drop support
 * - Click to browse
 * - File type validation (PDF only)
 * - File size display
 * - Progress indicator
 * - Success/Error states
 * 
 * Props:
 * - onFileSelect: Callback when file is selected
 * - isUploading: Whether upload is in progress
 * - uploadProgress: Progress percentage (0-100)
 * - uploadStatus: 'idle' | 'uploading' | 'success' | 'error'
 * - errorMessage: Error message if upload failed
 */

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  uploadStatus?: 'idle' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

export function UploadDropzone({
  onFileSelect,
  isUploading = false,
  uploadProgress = 0,
  uploadStatus = 'idle',
  errorMessage,
}: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  // Handle file input
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
    // Allow selecting the same file again after a failed attempt.
    input.value = '';
  }, [onFileSelect]);

  // Don't show dropzone if already uploading successfully
  if (uploadStatus === 'success') {
    return null;
  }

  return (
    <div className="w-full">
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-xl bg-indigo-500/10 border-2 border-dashed border-indigo-500 z-10 flex items-center justify-center"
          >
            <p className="text-indigo-400 font-medium">Drop file here</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-all',
          'hover:border-white/20 hover:bg-white/5',
          isDragOver ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/10',
          isUploading && 'pointer-events-none opacity-50'
        )}
      >
        {/* Upload Icon */}
        <div className={cn(
          'w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 transition-colors',
          isDragOver ? 'bg-indigo-500/20' : 'bg-white/5'
        )}>
          {isUploading ? (
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className={cn(
              'w-8 h-8',
              isDragOver ? 'text-indigo-400' : 'text-white/40'
            )} />
          )}
        </div>

        {/* Text */}
        <div className="space-y-1">
          <p className="text-white font-medium">
            {isUploading ? 'Uploading...' : 'Drop your PDF here'}
          </p>
          <p className="text-sm text-white/50">
            {isUploading 
              ? `${Math.round(uploadProgress)}% complete`
              : 'or click to browse (max 15MB)'
            }
          </p>
        </div>

        {/* File Input (hidden) */}
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileInput}
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        {/* Error Message */}
        {uploadStatus === 'error' && errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center justify-center gap-2 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4" />
            {errorMessage}
          </motion.div>
        )}
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="mt-3">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadDropzone;
