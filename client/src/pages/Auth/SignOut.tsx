import { useAuthStore } from '../../lib/store';
import { Button } from '../../components/ui';
import { LogOut } from 'lucide-react';

/**
 * SignOut Component
 * 
 * Simple sign out button that uses the auth store
 * Can be used in header, sidebar, or as a page
 */

export default function SignOut() {
  const { logout } = useAuthStore();

  return (
    <Button
      variant="ghost"
      size="sm"
      leftIcon={<LogOut className="w-4 h-4" />}
      onClick={logout}
    >
      Sign Out
    </Button>
  );
}
