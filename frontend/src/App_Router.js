import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import './App.css';

/**
 * App - Main application component with routing
 * 
 * Phase 2.2: Added React Router for navigation
 * 
 * Routes:
 * /                  → Landing page with summary cards
 * /dashboard/:id     → Full dashboard for location
 * /settings          → User settings
 * /alerts            → Alert management
 */

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}

export default App;
