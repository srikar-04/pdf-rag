import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocuments } from '../../hooks';
import { DocumentCard, UploadDropzone } from '../../components/document';
import { Button, Card, CardContent } from '../../components/ui';
import { Plus, Search, FileText, Filter } from 'lucide-react';
import { toast } from 'sonner';

/**
 * DocumentsPage Component
 * 
 * Displays all user documents with upload functionality
 * 
 * Features:
 * - Document list with cards
 * - Search functionality
 * - Upload dropzone
 * - Loading skeletons
 * - Empty states
 */

export default function DocumentsPage() {
  const navigate = useNavigate();
  const { data: documents, isLoading } = useDocuments();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  // Filter documents by search
  const filteredDocuments = documents?.filter(doc =>
    doc.documentName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Handle document selection (start chat with document)
  const handleSelectDocument = (docId: string) => {
    navigate(`/chat/${docId}`);
  };

  // Handle document deletion
  const handleDeleteDocument = (_docId: string) => {
    // TODO: Implement delete mutation
    toast.info('Delete functionality coming soon');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-white/60 mt-1">
            Manage your PDF documents
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowUpload(!showUpload)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Upload Document
        </Button>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <Card variant="glass">
          <CardContent className="p-6">
            <h2 className="text-lg font-medium text-white mb-4">Upload New Document</h2>
            <p className="text-sm text-white/50 mb-4">
              Upload a PDF file to chat with. Maximum file size: 10MB
            </p>
            <UploadDropzone
              onFileSelect={(_file) => {
                toast.info('Upload functionality - connect to your chat first');
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <Button variant="ghost" leftIcon={<Filter className="w-4 h-4" />}>
          Filter
        </Button>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        // Loading skeletons
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 rounded-xl skeleton" />
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <FileText className="w-10 h-10 text-white/20" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {searchQuery ? 'No documents found' : 'No documents yet'}
          </h3>
          <p className="text-sm text-white/50 text-center max-w-sm mb-6">
            {searchQuery 
              ? 'Try a different search term'
              : 'Upload your first PDF document to get started'
            }
          </p>
          {!searchQuery && (
            <Button
              variant="primary"
              onClick={() => setShowUpload(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Upload Document
            </Button>
          )}
        </div>
      ) : (
        // Documents grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onSelect={handleSelectDocument}
              onDelete={handleDeleteDocument}
            />
          ))}
        </div>
      )}
    </div>
  );
}
