import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useCreateChat } from '../../hooks';

interface ChatNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatNameDialog({ open, onOpenChange }: ChatNameDialogProps) {
  const navigate = useNavigate();
  const createChatMutation = useCreateChat();
  const [chatName, setChatName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const name = chatName.trim() || 'New Chat';
    
    try {
      const newChat = await createChatMutation.mutateAsync({
        title: name,
      });
      onOpenChange(false);
      setChatName('');
      navigate(`/chat/${newChat.id}`);
    } catch (err) {
      setError('Failed to create chat. Please try again.');
    }
  };

  const handleClose = () => {
    setChatName('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Chat</DialogTitle>
            <DialogDescription>
              Give your chat a name to help organize your conversations
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <input
              type="text"
              value={chatName}
              onChange={(e) => {
                setChatName(e.target.value);
                setError('');
              }}
              placeholder="Chat name (optional)"
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              isLoading={createChatMutation.isPending}
            >
              Create Chat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ChatNameDialog;
