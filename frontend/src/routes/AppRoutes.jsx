import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import DashboardPage from '../pages/DashboardPage';

// Try to import existing Settings/Alerts pages
// If they don't exist, we'll create simple placeholders below
let SettingsPage, AlertsPage;

try {
  // Try importing from pages directory
  SettingsPage = require('../pages/SettingsPage').default;
} catch (e) {
  // Fallback: Check if you have them elsewhere or use inline placeholder
  SettingsPage = () => (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Settings</h2>
        <p className="text-gray-400 mb-6">Settings page coming soon</p>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

try {
  AlertsPage = require('../pages/AlertsPage').default;
} catch (e) {
  AlertsPage = () => (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Alerts</h2>
        <p className="text-gray-400 mb-6">Alert management coming soon</p>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

/**
 * AppRoutes - Central routing configuration
 * 
 * Routes:
 * /                  → Landing page with summary cards
 * /dashboard/:id     → Full dashboard for specific location
 * /settings          → User settings (if exists, else placeholder)
 * /alerts            → Alert management (if exists, else placeholder)
 * 
 * NOTE: This version is flexible and will work whether or not
 * you have existing Settings/Alerts pages
 */

const AppRoutes = () => {
  return (
    <Routes>
      {/* Landing page - Summary cards view */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Dashboard - Full view for single location */}
      <Route path="/dashboard/:locationId" element={<DashboardPage />} />
      
      {/* Settings - uses existing or placeholder */}
      <Route path="/settings" element={<SettingsPage />} />
      
      {/* Alerts - uses existing or placeholder */}
      <Route path="/alerts" element={<AlertsPage />} />
      
      {/* Redirect unknown routes to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
