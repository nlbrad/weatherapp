/**
 * AppRoutes.jsx - Application Routing Configuration
 * 
 * ALERT-FIRST DESIGN:
 * - "/" now goes to Alert Center (not dashboard!)
 * - Dashboard is a secondary feature at "/dashboard/:id"
 * - All authenticated routes are protected
 * 
 * Routes:
 * /login             → Login page (public)
 * /                  → Alert Center (requires auth) - PRIMARY
 * /locations         → Location management (requires auth)
 * /locations/new     → Add new location (requires auth)
 * /dashboard         → Dashboard selector (requires auth) - SECONDARY
 * /dashboard/:id     → Full dashboard for location (requires auth)
 * /preferences       → Notification settings (requires auth)
 * /alerts/history    → Alert history (requires auth)
 * /alerts/:id/edit   → Edit alert settings (requires auth)
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from '../auth';

// Layout
import AppLayout from '../components/layout/AppLayout';

// Pages
import LoginPage from './LoginPage';
import AlertCenterPage from './AlertCenterPage';
import LocationsPage from './LocationsPage';
import NewLocationPage from './NewLocationPage';
import DashboardPage from './DashboardPage';
import PreferencesPage from './PreferencesPage';

// Placeholder pages (to be built)
const DashboardSelectorPage = () => (
  <div className="space-y-6">
    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 flex items-start gap-3">
      <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-cyan-400">✨</span>
      </div>
      <div>
        <p className="text-cyan-300 font-medium">Bonus Feature!</p>
        <p className="text-cyan-400/70 text-sm">
          Dashboards are an extra feature. Your alerts work perfectly without this page.
        </p>
      </div>
    </div>
    <div className="text-center py-12">
      <p className="text-slate-400 mb-4">Select a location from the Locations page to view its dashboard.</p>
      <a 
        href="/locations" 
        className="text-cyan-400 hover:text-cyan-300 underline"
      >
        Go to Locations →
      </a>
    </div>
  </div>
);

const AlertHistoryPage = () => (
  <div className="text-center py-12">
    <h2 className="text-xl font-bold text-white mb-2">Alert History</h2>
    <p className="text-slate-400">Full alert history coming soon...</p>
  </div>
);

const AlertEditPage = () => (
  <div className="text-center py-12">
    <h2 className="text-xl font-bold text-white mb-2">Edit Alert</h2>
    <p className="text-slate-400">Alert editor coming soon...</p>
  </div>
);

/**
 * AppRoutes Component
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* ========== PUBLIC ROUTES ========== */}
      
      {/* Login - Only accessible when NOT logged in */}
      <Route 
        path="/login" 
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        } 
      />

      {/* ========== PROTECTED ROUTES ========== */}
      
      {/* Alert Center - PRIMARY HOME PAGE */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <AppLayout>
              <AlertCenterPage />
            </AppLayout>
          </ProtectedRoute>
        } 
      />

      {/* Locations Management */}
      <Route 
        path="/locations" 
        element={
          <ProtectedRoute>
            <AppLayout>
              <LocationsPage />
            </AppLayout>
          </ProtectedRoute>
        } 
      />

      {/* Add New Location */}
      <Route 
        path="/locations/new" 
        element={
          <ProtectedRoute>
            <AppLayout>
              <NewLocationPage />
            </AppLayout>
          </ProtectedRoute>
        } 
      />

      {/* Dashboard Selector (bonus feature) */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardSelectorPage />
            </AppLayout>
          </ProtectedRoute>
        } 
      />

      {/* Dashboard for specific location */}
      <Route 
        path="/dashboard/:locationId" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />

      {/* Preferences / Settings */}
      <Route 
        path="/preferences" 
        element={
          <ProtectedRoute>
            <AppLayout>
              <PreferencesPage />
            </AppLayout>
          </ProtectedRoute>
        } 
      />

      {/* Alert History */}
      <Route 
        path="/alerts/history" 
        element={
          <ProtectedRoute>
            <AppLayout>
              <AlertHistoryPage />
            </AppLayout>
          </ProtectedRoute>
        } 
      />

      {/* Edit Alert */}
      <Route 
        path="/alerts/:alertId/edit" 
        element={
          <ProtectedRoute>
            <AppLayout>
              <AlertEditPage />
            </AppLayout>
          </ProtectedRoute>
        } 
      />

      {/* Legacy route redirects */}
      <Route path="/settings" element={<Navigate to="/preferences" replace />} />
      <Route path="/alerts" element={<Navigate to="/" replace />} />

      {/* 404 - Redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;