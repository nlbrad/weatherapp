/**
 * App.js - Main Application Entry Point
 * 
 * ALERT-FIRST ARCHITECTURE:
 * This app is designed with alerts as the primary feature.
 * Weather dashboards are a secondary "bonus" feature.
 * 
 * Wrapped with:
 * - AuthProvider (Azure B2C authentication)
 * - BrowserRouter (client-side routing)
 * 
 * @version 3.0.0 - Alert-First Redesign
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth';
import AppRoutes from './pages/AppRoutes';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
