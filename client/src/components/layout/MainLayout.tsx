import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

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
 * 
 * Usage:
 * <MainLayout>
 *   <YourPage />
 * </MainLayout>
 */

export function MainLayout() {
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Toggle mobile menu
  const handleMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu
  const handleCloseMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
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
      <main className="lg:ml-72 pt-16 min-h-screen">
        <div className="p-4 lg:p-6">
          {/* Page content renders here */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
