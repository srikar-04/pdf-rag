import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useDocuments,
  useDeleteDocument,
  useCreateChat,
  useChats,
  useAvailableChatsForDocument,
  useLinkDocumentToChat,
  useCreateChatWithDocument,
} from '../../hooks';
import { DocumentCard, UploadDropzone } from '../../components/document';
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui';
import { Plus, Search, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getDisplayDocumentName } from '../../lib/utils';

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
  const { data: allChats = [], isLoading: allChatsLoading } = useChats();
  const deleteDocumentMutation = useDeleteDocument();
  const createChatMutation = useCreateChat();
  const linkDocumentToChatMutation = useLinkDocumentToChat();
  const createChatWithDocumentMutation = useCreateChatWithDocument();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [useInChatOpen, setUseInChatOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [documentToDeleteId, setDocumentToDeleteId] = useState<string | null>(null);
  const [newChatName, setNewChatName] = useState('');
  const [showNewChatForm, setShowNewChatForm] = useState(false);

  // Filter documents by search
  const filteredDocuments = documents?.filter(doc =>
    (doc.displayName || doc.documentName).toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const selectedDocument = documents?.find((doc) => doc.id === selectedDocumentId);
  const selectedDocumentName = selectedDocument
    ? (selectedDocument.displayName || getDisplayDocumentName(selectedDocument.documentName))
    : '';

  const {
    data: availableChats = [],
    isLoading: availableChatsLoading,
  } = useAvailableChatsForDocument(selectedDocumentId || '', {
    enabled: useInChatOpen && !!selectedDocumentId,
  });

  const availableChatIds = new Set(availableChats.map((chat) => chat.id));
  const linkedChats = selectedDocumentId
    ? allChats.filter((chat) => !availableChatIds.has(chat.id))
    : [];

  // Handle document selection (create chat with document)
  const handleSelectDocument = async (docId: string) => {
    setSelectedDocumentId(docId);
    setUseInChatOpen(true);
    setShowNewChatForm(false);
    setNewChatName('');
  };

  const handleCloseUseInChat = (open: boolean) => {
    setUseInChatOpen(open);
    if (!open) {
      setSelectedDocumentId(null);
      setShowNewChatForm(false);
      setNewChatName('');
    }
  };

  const handleLinkToExistingChat = async (chatId: string) => {
    if (!selectedDocumentId) return;
    try {
      const linkedChat = await linkDocumentToChatMutation.mutateAsync({
        documentId: selectedDocumentId,
        chatId,
      });
      toast.success('Document linked to chat');
      handleCloseUseInChat(false);
      navigate(`/chat/${linkedChat.id}`);
    } catch (error) {
      toast.error('Failed to link document to chat');
    }
  };

  const handleCreateChatAndLink = async () => {
    if (!selectedDocumentId) return;

    const trimmedName = newChatName.trim();
    if (trimmedName.length < 3) {
      toast.error('Chat name must be at least 3 characters');
      return;
    }

    try {
      const newChat = await createChatWithDocumentMutation.mutateAsync({
        documentId: selectedDocumentId,
        chatName: trimmedName,
      });
      toast.success('New chat created and document linked');
      handleCloseUseInChat(false);
      navigate(`/chat/${newChat.id}`);
    } catch (error) {
      toast.error('Failed to create chat and link document');
    }
  };

  // Handle document deletion
  const handleDeleteDocument = (docId: string) => {
    setDocumentToDeleteId(docId);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDeleteId) return;
    try {
      await deleteDocumentMutation.mutateAsync(documentToDeleteId);
      toast.success('Document deleted');
    } catch (error) {
      toast.error('Failed to delete document');
    } finally {
      setDocumentToDeleteId(null);
    }
  };

  // Handle file upload (create chat first, then upload)
  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      
      // Create a new chat first
      const newChat = await createChatMutation.mutateAsync({
        title: file.name.replace('.pdf', ''),
      });
      
      // Navigate to the chat with upload
      navigate(`/chat/${newChat.id}`, { state: { pendingUpload: file } });
    } catch (error) {
      toast.error('Failed to start upload');
      setUploading(false);
    }
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
              Upload a PDF file to chat with. Maximum file size: 30MB
            </p>
            {uploading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <span className="ml-3 text-white/60">Creating chat...</span>
              </div>
            ) : (
              <UploadDropzone
                onFileSelect={handleFileUpload}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Search */}
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

      <Dialog open={useInChatOpen} onOpenChange={handleCloseUseInChat}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Use In Chat</DialogTitle>
            <DialogDescription>
              Manage where <span className="text-white">{selectedDocumentName}</span> is used.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
            {availableChatsLoading || allChatsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                <span className="ml-2 text-sm text-white/60">Loading chats...</span>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/40 mb-2">
                    Already linked
                  </p>
                  {linkedChats.length === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/60">
                      This document is not linked to any chat yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {linkedChats.map((chat) => (
                        <div
                          key={chat.id}
                          className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5"
                        >
                          <p className="text-sm font-medium text-white">{chat.title}</p>
                          <p className="text-xs text-emerald-200/80 mt-1">Linked</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-white/40 mb-2">
                    Available to link
                  </p>
                  {availableChats.length === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/60">
                      No additional chats available. Create a new chat to continue.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableChats.map((chat) => (
                        <button
                          key={chat.id}
                          onClick={() => handleLinkToExistingChat(chat.id)}
                          className="w-full text-left rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2.5 transition-colors"
                          disabled={linkDocumentToChatMutation.isPending || createChatWithDocumentMutation.isPending}
                        >
                          <p className="text-sm font-medium text-white">{chat.title}</p>
                          <p className="text-xs text-white/50 mt-1">Link document to this chat</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            {!showNewChatForm ? (
              <Button
                variant="ghost"
                onClick={() => setShowNewChatForm(true)}
                leftIcon={<Plus className="w-4 h-4" />}
                className="w-full"
              >
                Link Document To New Chat
              </Button>
            ) : (
              <div className="space-y-3">
                <input
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  placeholder="Enter new chat name"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      setShowNewChatForm(false);
                      setNewChatName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleCreateChatAndLink}
                    isLoading={createChatWithDocumentMutation.isPending}
                  >
                    Create And Link
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => handleCloseUseInChat(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!documentToDeleteId} onOpenChange={(open) => !open && setDocumentToDeleteId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Document?</DialogTitle>
            <DialogDescription>
              This removes the document from your account and linked chats.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDocumentToDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDeleteDocument}
              isLoading={deleteDocumentMutation.isPending}
            >
              Delete Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
