/**
 * AppLayout.jsx - Main Application Layout
 * 
 * Provides the app shell with:
 * - Collapsible sidebar navigation
 * - Header with user menu
 * - Main content area
 * 
 * Used by all authenticated pages.
 */

import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Bell, MapPin, Settings, Menu, X,
  User, LogOut, ChevronLeft, ChevronRight, Plus
} from 'lucide-react';
import { useAuth } from '../../auth';

/**
 * Navigation items configuration
 * Alerts is FIRST (primary feature)
 */
const NAV_ITEMS = [
  { 
    id: 'alerts', 
    path: '/', 
    icon: Bell, 
    label: 'Alert Center',
    description: 'Manage your alerts',
  },
  { 
    id: 'locations', 
    path: '/locations', 
    icon: MapPin, 
    label: 'Locations',
    description: 'Alert locations',
  },
{ 
    id: 'preferences', 
    path: '/preferences', 
    icon: Settings, 
    label: 'Preferences',
    description: 'Notification settings',
  },
];

const AppLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isB2CConfigured } = useAuth();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Get current page title
  const currentPage = NAV_ITEMS.find(item => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  });

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect even if logout fails
      navigate('/login');
    }
  };

  /**
   * Sidebar Navigation Link
   */
  const NavItem = ({ item, collapsed }) => {
    const isActive = item.path === '/' 
      ? location.pathname === '/' 
      : location.pathname.startsWith(item.path);

    return (
      <NavLink
        to={item.path}
        onClick={() => setMobileMenuOpen(false)}
        aria-current={isActive ? 'page' : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
          isActive
            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
        }`}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
            {item.extra && (
              <span className="bg-slate-700 text-slate-400 text-xs px-1.5 py-0.5 rounded">
                Extra
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Skip Navigation Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:bg-cyan-500 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex flex-col bg-slate-900/50 border-r border-slate-800 transition-all duration-300 z-50 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20">
              <Bell className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <h1 className="text-white font-bold text-sm truncate">OmniAlert</h1>
                <p className="text-slate-500 text-xs truncate">Weather • Sky • Aurora</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavItem key={item.id} item={item} collapsed={!sidebarOpen} />
          ))}
        </nav>

        {/* Collapse Button */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm">Collapse</span>
              </>
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* User Section */}
        <div className="p-3 border-t border-slate-800">
          <div className="relative">
            <button 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              {sidebarOpen && (
                <span className="flex-1 text-left text-sm truncate">
                  {user?.email || 'Demo User'}
                </span>
              )}
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                <div className="p-3 border-b border-slate-700">
                  <p className="text-white text-sm font-medium truncate">
                    {user?.name || 'Demo User'}
                  </p>
                  <p className="text-slate-400 text-xs truncate">
                    {user?.email || 'demo@example.com'}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside 
        className={`md:hidden fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-800 z-50 transform transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-white font-bold text-sm">OmniAlert</h1>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="text-slate-400 hover:text-white p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavItem key={item.id} item={item} collapsed={false} />
          ))}
        </nav>

        {/* Mobile User */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm truncate">{user?.name || 'Demo User'}</p>
              <p className="text-slate-500 text-xs truncate">{user?.email || 'demo@example.com'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 p-2"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden text-slate-400 hover:text-white p-2 -ml-2"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {/* Page Title */}
              <div>
                <h2 className="text-xl font-bold text-white">
                  {currentPage?.label || 'OmniAlert'}
                </h2>
                {currentPage?.description && (
                  <p className="text-slate-500 text-sm hidden sm:block">
                    {currentPage.description}
                  </p>
                )}
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              {location.pathname === '/' && (
                <button
                  onClick={() => {
                    const el = document.getElementById('your-alerts');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-lg shadow-cyan-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Alert</span>
                </button>
              )}
              {location.pathname === '/locations' && (
                <button 
                  onClick={() => navigate('/locations/new')}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-lg shadow-cyan-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Location</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div id="main-content" className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </div>
      </main>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setUserMenuOpen(false)} 
        />
      )}
    </div>
  );
};

export default AppLayout;