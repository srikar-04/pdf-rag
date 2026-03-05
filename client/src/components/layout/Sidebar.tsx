import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useChats, useDeleteChat } from '../../hooks';
import { Button } from '../ui';
import { ChatNameDialog } from '../chat/ChatNameDialog';
import { 
  FileText, 
  MessageSquare, 
  Plus, 
  Search,
  Bot,
  Trash2
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

/**
 * Sidebar Component
 * 
 * Features:
 * - Navigation links with active state
 * - Chat history list with recent chats
 * - Create new chat button
 * - Search functionality
 * - Collapsible on mobile
 * 
 * Props:
 * - isOpen: Whether sidebar is visible on mobile
 * - onClose: Callback to close sidebar on mobile
 */

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: chats, isLoading } = useChats();
  const deleteChatMutation = useDeleteChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);

  // Navigation items
  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: MessageSquare,
    },
    {
      label: 'Documents',
      href: '/documents',
      icon: FileText,
    },
  ];

  // Filter chats by search
  const filteredChats = chats?.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Check if route is active
  const isActive = (href: string) => location.pathname === href;

  // Handle create new chat - open dialog
  const handleNewChat = () => {
    setIsChatDialogOpen(true);
  };

  // Handle delete chat
  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Show warning and proceed with delete (no browser confirm)
    toast.warning('Deleting chat...', {
      description: 'This action cannot be undone.',
      duration: 3000,
    });
    
    try {
      await deleteChatMutation.mutateAsync(chatId);
      toast.success('Chat deleted');
      // If we're on the deleted chat, redirect to dashboard
      if (location.pathname === `/chat/${chatId}`) {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('Failed to delete chat');
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          // Base styles
          'fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] w-72',
          'bg-[#0a0a0a] border-r border-white/5',
          'transform transition-transform duration-300 ease-in-out',
          // Mobile visibility
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Navigation Links */}
          <nav className="p-3 border-b border-white/5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1',
                  'text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* New Chat Button */}
          <div className="p-3">
            <Button
              variant="primary"
              size="sm"
              fullWidth
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleNewChat}
            >
              New Chat
            </Button>
          </div>

          {/* Chat History Section */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-hide">
              {isLoading ? (
                // Loading skeleton
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-14 rounded-lg skeleton"
                    />
                  ))}
                </div>
              ) : filteredChats.length === 0 ? (
                // Empty state
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-white/40">
                    {searchQuery ? 'No chats found' : 'No chats yet'}
                  </p>
                  <p className="text-xs text-white/30 mt-1">
                    {searchQuery ? 'Try a different search' : 'Start a new chat'}
                  </p>
                </div>
              ) : (
                // Chat list
                <div className="space-y-1">
                  {filteredChats.map((chat) => (
                    <Link
                      key={chat.id}
                      to={`/chat/${chat.id}`}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                        'text-sm text-white/70 hover:text-white hover:bg-white/5',
                        'transition-colors group',
                        location.pathname === `/chat/${chat.id}` && 'bg-indigo-500/10 text-indigo-400'
                      )}
                    >
                      <Bot className="w-4 h-4 shrink-0" />
                      <span className="truncate flex-1">
                        {chat.title}
                      </span>
                      {/* Delete button (visible on hover) */}
                      <button
                        className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all"
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                        aria-label="Delete chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-white/5">
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-white/40">
              <Bot className="w-3.5 h-3.5" />
              <span>Powered by Gemini & Cloudflare</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Chat Name Dialog */}
      <ChatNameDialog 
        open={isChatDialogOpen} 
        onOpenChange={setIsChatDialogOpen} 
      />
    </>
  );
}

export default Sidebar;
