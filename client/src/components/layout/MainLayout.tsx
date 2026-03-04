import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

/**
 * MainLayout Component
 * 
 * Provides the app shell for all protected pages:
 * - Fixed Header at top
 * - Collapsible Sidebar on left
 * - Main content area with scroll
 * 
 * Features:
 * - Responsive: Sidebar collapses on mobile
 * - Mobile menu toggle in header
 * - Smooth transitions
 * - Keyboard shortcuts
 * 
 * Usage:
 * <MainLayout>
 *   <YourPage />
 * </MainLayout>
 */

export function MainLayout() {
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Enable keyboard shortcuts (this component is inside Router)
  useKeyboardShortcuts();

  // Toggle mobile menu
  const handleMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu
  const handleCloseMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Ambient gradients for depth; improves glass readability without changing component styles. */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute top-1/4 -right-24 w-[24rem] h-[24rem] rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 w-[22rem] h-[22rem] rounded-full bg-purple-500/8 blur-3xl" />
      </div>

      {/* Header - Fixed at top */}
      <Header 
        onMenuToggle={handleMenuToggle}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Sidebar - Fixed on left */}
      <Sidebar 
        isOpen={isMobileMenuOpen}
        onClose={handleCloseMenu}
      />

      {/* Main Content Area */}
      <main className="lg:ml-72 pt-16 min-h-screen relative z-10">
        <div className="p-4 lg:p-6">
          {/* Page content renders here */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
