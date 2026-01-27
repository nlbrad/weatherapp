import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import DashboardPage from '../pages/DashboardPage';
import SettingsPage from '../pages/SettingsPage';

// Alerts page - placeholder for now
const AlertsPage = () => (
  <div className="min-h-screen bg-dark-bg flex items-center justify-center">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-white mb-4">Alert History</h2>
      <p className="text-gray-400 mb-6">Alert history and management coming soon</p>
      <button
        onClick={() => window.history.back()}
        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
      >
        Go Back
      </button>
    </div>
  </div>
);

/**
 * AppRoutes - Central routing configuration
 * 
 * Routes:
 * /                  → Landing page with summary cards
 * /dashboard/:id     → Full dashboard for specific location
 * /settings          → User settings & notification preferences
 * /alerts            → Alert history (placeholder)
 */

const AppRoutes = () => {
  return (
    <Routes>
      {/* Landing page - Summary cards view */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Dashboard - Full view for single location */}
      <Route path="/dashboard/:locationId" element={<DashboardPage />} />
      
      {/* Settings - notification preferences */}
      <Route path="/settings" element={<SettingsPage />} />
      
      {/* Alerts - history/management */}
      <Route path="/alerts" element={<AlertsPage />} />
      
      {/* Redirect unknown routes to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;