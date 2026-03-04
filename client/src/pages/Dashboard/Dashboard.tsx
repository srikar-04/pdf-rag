import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useChats, useDocuments, useCreateChat } from '../../hooks';
import { Button, Card, CardContent } from '../../components/ui';
import { 
  Plus, 
  MessageSquare, 
  FileText, 
  Bot,
  ArrowRight,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

/**
 * Dashboard Page
 * 
 * Features:
 * - Personalized greeting based on time of day
 * - Quick stats cards
 * - Recent chats list
 * - Recent documents list
 * - Quick action buttons
 * - Loading skeletons
 * - Empty states
 */

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data: chats, isLoading: chatsLoading } = useChats();
  const { data: documents, isLoading: docsLoading } = useDocuments();
  const createChatMutation = useCreateChat();

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Get recent items (sorted by date)
  const recentChats = chats?.slice(0, 5) || [];
  const recentDocs = documents?.slice(0, 5) || [];

  // Stats
  const stats = [
    {
      label: 'Total Chats',
      value: chats?.length || 0,
      icon: MessageSquare,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Documents',
      value: documents?.length || 0,
      icon: FileText,
      color: 'from-purple-500 to-pink-500',
    },
    {
      label: 'Active Sessions',
      value: 1,
      icon: Bot,
      color: 'from-green-500 to-emerald-500',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ============================================
          HEADER SECTION
      ============================================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            {getGreeting()}, {user?.username || 'there'}
          </h1>
          <p className="text-white/60 mt-1">
            What would you like to work on today?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button 
            variant="primary" 
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={async () => {
              try {
                const newChat = await createChatMutation.mutateAsync({
                  title: 'New Chat',
                });
                navigate(`/chat/${newChat.id}`);
              } catch (error) {
                toast.error('Failed to create chat');
              }
            }}
            isLoading={createChatMutation.isPending}
          >
            New Chat
          </Button>
        </div>
      </div>

      {/* ============================================
          STATS CARDS
      ============================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <Card 
            key={stat.label} 
            variant="glass" 
            hover
            className={cn(
              'relative overflow-hidden',
              index === 0 && 'animate-fade-in'
            )}
          >
            {/* Gradient Background */}
            <div className={cn(
              'absolute inset-0 opacity-10 bg-gradient-to-br',
              stat.color
            )} />
            
            <CardContent className="relative p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">{stat.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  'bg-gradient-to-br',
                  stat.color
                )}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ============================================
          RECENT CHATS & DOCUMENTS
      ============================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Chats */}
        <Card variant="default" className="overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              Recent Chats
            </h2>
          </div>

          <div className="p-2">
            {chatsLoading ? (
              // Loading skeleton
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-lg skeleton" />
                ))}
              </div>
            ) : recentChats.length === 0 ? (
              // Empty state
              <div className="py-8 text-center">
                <MessageSquare className="w-10 h-10 text-white/20 mx-auto mb-2" />
                <p className="text-white/60 text-sm">No chats yet</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={async () => {
                    try {
                      const newChat = await createChatMutation.mutateAsync({
                        title: 'New Chat',
                      });
                      navigate(`/chat/${newChat.id}`);
                    } catch (error) {
                      toast.error('Failed to create chat');
                    }
                  }}
                  isLoading={createChatMutation.isPending}
                >
                  Start your first chat
                </Button>
              </div>
            ) : (
              // Chat list
              <div className="space-y-1">
                {recentChats.map((chat) => (
                  <Link
                    key={chat.id}
                    to={`/chat/${chat.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate group-hover:text-indigo-300">
                        {chat.title}
                      </p>
                      <p className="text-xs text-white/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-indigo-400 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Recent Documents */}
        <Card variant="default" className="overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              Recent Documents
            </h2>
            <Link 
              to="/documents" 
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-2">
            {docsLoading ? (
              // Loading skeleton
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-lg skeleton" />
                ))}
              </div>
            ) : recentDocs.length === 0 ? (
              // Empty state
              <div className="py-8 text-center">
                <FileText className="w-10 h-10 text-white/20 mx-auto mb-2" />
                <p className="text-white/60 text-sm">No documents yet</p>
                <Link to="/documents">
                  <Button variant="ghost" size="sm" className="mt-2">
                    Upload your first document
                  </Button>
                </Link>
              </div>
            ) : (
              // Document list
              <div className="space-y-1">
                {recentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate group-hover:text-purple-300">
                        {doc.displayName || doc.documentName}
                      </p>
                      <p className="text-xs text-white/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(doc.createdAt || Date.now()), { addSuffix: true })}
                      </p>
                    </div>
                    {/* Status indicator */}
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      doc.documentStatus === 'ready' && 'bg-green-500',
                      (doc.documentStatus === 'processing' || doc.documentStatus === 'Ingesting') && 'bg-yellow-500 animate-pulse',
                      doc.documentStatus === 'failed' && 'bg-red-500'
                    )} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ============================================
          QUICK START GUIDE
      ============================================= */}
      <Card variant="glass" className="overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Bot className="w-4 h-4 text-green-400" />
            Quick Start
          </h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-indigo-400">1</span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Upload a PDF</h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Go to Documents and upload your first PDF file
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-purple-400">2</span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Wait for processing</h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Your document will be processed and indexed
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-green-400">3</span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Start chatting</h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Ask questions about your document
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
