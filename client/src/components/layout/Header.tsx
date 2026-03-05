import { Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { 
  Menu, 
  X, 
  LogOut, 
  FileText
} from 'lucide-react';
import { useState } from 'react';

/**
 * Header Component
 * 
 * Features:
 * - Logo with app name linking to dashboard
 * - User avatar dropdown menu
 * - Sign out button
 * - Mobile hamburger menu
 * - Responsive design
 * 
 * Props:
 * - onMenuToggle: Callback for mobile menu toggle
 * - isMobileMenuOpen: State of mobile menu
 */

interface HeaderProps {
  onMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export function Header({ onMenuToggle, isMobileMenuOpen }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
  const handleClickOutside = () => {
    setIsDropdownOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        {/* Left: Logo & Mobile Menu Button */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          {/* Logo */}
          <Link 
            to="/dashboard" 
            className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="hidden sm:block text-lg font-semibold">
              PDF RAG
            </span>
          </Link>
        </div>

        {/* Right: User Menu */}
        <div className="flex items-center gap-3">
          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              
              {/* Username (desktop) */}
              <span className="hidden md:block text-sm text-white/80">
                {user?.username || 'User'}
              </span>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={handleClickOutside}
                />
                
                {/* Menu */}
                <div className="absolute right-0 mt-2 w-56 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50">
                  {/* User Info */}
                  <div className="px-4 py-2 border-b border-white/5">
                    <p className="text-sm font-medium text-white truncate">
                      {user?.username || 'User'}
                    </p>
                    <p className="text-xs text-white/50 truncate">
                      {user?.email || 'user@example.com'}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <Link
                      to="/documents"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <FileText className="w-4 h-4" />
                      My Documents
                    </Link>
                    
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-white/5 pt-1">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        logout();
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
