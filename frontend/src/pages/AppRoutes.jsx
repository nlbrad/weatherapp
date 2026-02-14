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
 * /dashboard         → Redirects to /locations
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
import AlertHistoryPage from './AlertHistoryPage';
import CryptoPage from './CryptoPage';

// Placeholder pages (to be built)
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

      {/* /dashboard redirects to locations (dashboards accessed via location cards) */}
      <Route path="/dashboard" element={<Navigate to="/locations" replace />} />

      {/* Dashboard for specific location */}
      <Route
        path="/dashboard/:locationId"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Crypto Hub */}
      <Route
        path="/crypto"
        element={
          <ProtectedRoute>
            <AppLayout>
              <CryptoPage />
            </AppLayout>
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