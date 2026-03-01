import { useState, useCallback, useEffect } from 'react';
import { UploadDropzone } from './UploadDropzone';
import { useUploadDocument, useDocumentStatus, useIngestDocument } from '../../hooks';
import { Button } from '../ui';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * DocumentUpload Component
 * 
 * Handles document upload flow:
 * 1. Shows upload dropzone
 * 2. On file select, uploads to backend
 * 3. Shows processing status
 * 4. On completion, shows document card
 * 
 * Features:
 * - Drag and drop upload
 * - Progress tracking
 * - Status polling during processing
 * - Error handling
 * 
 * Props:
 * - chatId: The chat to upload the document to
 * - onUploadComplete: Callback when upload and processing complete
 */

interface DocumentUploadProps {
  chatId: string;
  onUploadComplete?: (documentId: string) => void;
}

export function DocumentUpload({ chatId, onUploadComplete }: DocumentUploadProps) {
  const [uploadState, setUploadState] = useState<{
    status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
    progress: number;
    error?: string;
    fileName?: string;
    documentId?: string;
  }>({ status: 'idle', progress: 0 });

  // Upload mutation
  const uploadMutation = useUploadDocument();

  // Ingestion mutation - call after upload
  const ingestMutation = useIngestDocument({
    onSuccess: () => {
      toast.info('Document processing started...');
    },
    onError: (error) => {
      console.error('Ingestion error:', error);
    },
  });

  // Handle upload success - call ingestion API
  const handleUploadSuccess = async (data: { documentEntry: { id: string; documentName: string } }) => {
    const docId = data.documentEntry.id;
    
    setUploadState({
      status: 'processing',
      progress: 100,
      fileName: data.documentEntry.documentName,
      documentId: docId,
    });

    // Call ingestion API to start processing pipeline
    try {
      await ingestMutation.mutateAsync(docId);
    } catch (error) {
      console.log('Ingestion call made, will poll for status');
    }
  };

  // Handle upload error
  const handleUploadError = (error: Error) => {
    setUploadState({
      status: 'error',
      progress: 0,
      error: error.message || 'Upload failed',
    });
  };

  // Pass handlers to upload mutation
  useEffect(() => {
    // This is handled in handleFileSelect
  }, []);

  // Poll document status while processing
  const { data: docStatus } = useDocumentStatus(uploadState.documentId || '');

  // Check if document is ready
  useEffect(() => {
    if (docStatus?.documentStatus === 'ready') {
      setUploadState(prev => ({ ...prev, status: 'success' }));
      toast.success('Document ready!');
      if (onUploadComplete) {
        onUploadComplete(uploadState.documentId!);
      }
    }
  }, [docStatus, onUploadComplete, uploadState.documentId]);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Start upload
    setUploadState({
      status: 'uploading',
      progress: 0,
      fileName: file.name,
    });

    // Simulate progress (actual progress would come from upload)
    const progressInterval = setInterval(() => {
      setUploadState(prev => {
        if (prev.progress < 90) {
          return { ...prev, progress: prev.progress + 10 };
        }
        return prev;
      });
    }, 200);

    try {
      const data = await uploadMutation.mutateAsync({ chatId, file });
      await handleUploadSuccess(data);
    } catch (error: any) {
      handleUploadError(error);
    } finally {
      clearInterval(progressInterval);
    }
  }, [chatId, uploadMutation, handleUploadSuccess, handleUploadError]);

  // Handle reset (start new upload)
  const handleReset = () => {
    setUploadState({ status: 'idle', progress: 0 });
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <UploadDropzone
        onFileSelect={handleFileSelect}
        isUploading={uploadState.status === 'uploading'}
        uploadProgress={uploadState.progress}
        uploadStatus={uploadState.status === 'processing' ? 'uploading' : uploadState.status}
        errorMessage={uploadState.error}
      />

      {/* Processing Status */}
      {uploadState.status === 'processing' && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                Processing document...
              </p>
              <p className="text-xs text-white/50">
                {uploadState.fileName}
              </p>
            </div>
          </div>

          {/* Processing Steps */}
          <div className="mt-4 space-y-2">
            {['fetched', 'normalized', 'chunked', 'embedded', 'upserted'].map((step, index) => {
              const currentStepIndex = ['fetched', 'normalized', 'chunked', 'embedded', 'upserted'].indexOf(docStatus?.ingestionStep || 'none');
              const isComplete = currentStepIndex >= index;

              return (
                <div key={step} className="flex items-center gap-2">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                    isComplete 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-white/5 text-white/30'
                  )}>
                    {isComplete ? '✓' : index + 1}
                  </div>
                  <span className={cn(
                    'text-sm capitalize',
                    isComplete ? 'text-white' : 'text-white/30'
                  )}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Success State */}
      {uploadState.status === 'success' && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-400">
                Document ready!
              </p>
              <p className="text-xs text-white/50">
                You can now chat with this document
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Upload another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentUpload;
