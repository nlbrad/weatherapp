import React, { useState } from 'react';
import { Cloud, Plus, Trash2, Bell, Settings, MapPin } from 'lucide-react';

export default function WeatherAlertApp() {
  const [locations, setLocations] = useState([
    { id: 1, name: 'Dublin', country: 'IE', temp: 12, condition: 'Cloudy', alerts: true }
  ]);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: '', country: '' });
  const [activeTab, setActiveTab] = useState('dashboard');

  const addLocation = () => {
    if (newLocation.name && newLocation.country) {
      setLocations([...locations, {
        id: Date.now(),
        name: newLocation.name,
        country: newLocation.country,
        temp: 0,
        condition: 'Loading...',
        alerts: true
      }]);
      setNewLocation({ name: '', country: '' });
      setShowAddLocation(false);
    }
  };

  const removeLocation = (id) => {
    setLocations(locations.filter(loc => loc.id !== id));
  };

  const toggleAlerts = (id) => {
    setLocations(locations.map(loc => 
      loc.id === id ? { ...loc, alerts: !loc.alerts } : loc
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="w-10 h-10 text-blue-500" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Weather Alert System</h1>
                <p className="text-gray-600">Get WhatsApp alerts for weather changes</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('settings')}
              className="p-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'dashboard'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'alerts'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Alert Settings
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'settings'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Your Locations</h2>
              <button
                onClick={() => setShowAddLocation(true)}
                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Location
              </button>
            </div>

            {/* Add Location Form */}
            {showAddLocation && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">Add New Location</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="City name"
                    value={newLocation.name}
                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Country code (e.g., IE)"
                    value={newLocation.country}
                    onChange={(e) => setNewLocation({ ...newLocation, country: e.target.value.toUpperCase() })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={addLocation}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddLocation(false);
                      setNewLocation({ name: '', country: '' });
                    }}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Location Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map(location => (
                <div key={location.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-500" />
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800">{location.name}</h3>
                        <p className="text-sm text-gray-500">{location.country}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeLocation(location.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-4xl font-bold text-gray-800 mb-2">{location.temp}°C</div>
                    <div className="text-gray-600">{location.condition}</div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <span className="text-sm text-gray-600">WhatsApp Alerts</span>
                    <button
                      onClick={() => toggleAlerts(location.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        location.alerts ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          location.alerts ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alert Settings Tab */}
        {activeTab === 'alerts' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Alert Preferences</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Temperature Threshold
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="number"
                      placeholder="Min (°C)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      defaultValue="0"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Max (°C)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      defaultValue="30"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Alert Types
                </label>
                <div className="space-y-3">
                  {['Heavy Rain', 'Storm Warning', 'Extreme Temperature', 'High Wind', 'Snow'].map(alert => (
                    <label key={alert} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">{alert}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors font-semibold">
                Save Alert Preferences
              </button>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  WhatsApp Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+353 1234 5678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Include country code. This number will receive weather alerts.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Check Frequency
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>Every hour</option>
                  <option>Every 3 hours</option>
                  <option>Every 6 hours</option>
                  <option>Twice daily</option>
                  <option>Once daily</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-semibold text-gray-800">Connection Status</div>
                  <div className="text-sm text-gray-600">Backend API</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Not Connected</span>
                </div>
              </div>

              <button className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors font-semibold">
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
