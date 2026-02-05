# 🌦️ OmniAlert - Weather Alert System

A comprehensive weather monitoring and alert system with real-time dashboards, intelligent scoring algorithms, and multi-channel notifications (WhatsApp, Telegram).

**Live Demo:** [https://calm-bush-003e62103.1.azurestaticapps.net](https://calm-bush-003e62103.1.azurestaticapps.net)

---

## ✨ Features

### 🔔 Alert System (Primary Feature)
- **Daily Forecast** - Morning weather briefing delivered to your phone
- **Tonight's Sky** - Stargazing condition alerts with sky scores
- **Weather Warnings** - Met Éireann yellow/orange/red warnings via MeteoAlarm
- **Aurora Alerts** - Northern Lights notifications when Kp index is favorable
- **Temperature Alerts** - Notifications when temp goes outside your comfort range

### 📊 Weather Dashboard
- **Current Conditions** - Temperature, humidity, pressure, wind, visibility
- **7-Day Forecast** - Interactive temperature charts (Recharts)
- **24-Hour Hourly Forecast** - Hour-by-hour breakdown
- **Air Quality** - AQI with pollutant breakdown (PM2.5, PM10, O₃, NO₂, etc.)
- **Wind Analysis** - Compass visualization with gust tracking
- **Sun & Moon** - Sunrise/sunset times, moon phase
- **Live Weather Map** - Embedded Windy.com with layer controls

### 🌌 Scoring Engines
- **Aurora Score** - Northern Lights viewing probability (0-100)
- **Sky Score** - Stargazing/astrophotography conditions
- Factors: Kp index, cloud cover, darkness, latitude, light pollution

### 🔐 Authentication
- Microsoft Entra External ID (Azure AD B2C)
- Social login (Microsoft, Google)
- Development mode bypass for testing

### 📱 Multi-Channel Notifications
- **Telegram Bot** - Interactive commands and alerts
- **WhatsApp** - Via Twilio API
- Natural language processing for bot commands

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React 19)                          │
│              Azure Static Web Apps (Global CDN)                  │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Alert Center│  │  Dashboard  │  │  Locations  │              │
│  │  (Primary)  │  │  (Details)  │  │ Management  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                   │
│  Auth: Azure Entra External ID | Styling: Tailwind CSS          │
│  Charts: Recharts | Animations: Framer Motion | Maps: Windy.com │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND (Azure Functions v4)                    │
│               Node.js 20 LTS - Serverless Compute                │
│                                                                   │
│  Weather APIs          Location APIs        Alert Functions      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     │
│  │GetWeatherData│     │SaveUserLoc   │     │DailyForecast │     │
│  │GetForecast   │     │GetUserLocs   │     │TonightsSky   │     │
│  │SearchLocs    │     │DeleteUserLoc │     │WeatherWarning│     │
│  └──────────────┘     └──────────────┘     │AuroraAlert   │     │
│                                             │CheckAlerts   │     │
│  Scoring Engine        Bot Handlers        └──────────────┘     │
│  ┌──────────────┐     ┌──────────────┐                          │
│  │AuroraScore   │     │TelegramBot   │                          │
│  │SkyScore      │     │WhatsAppBot   │                          │
│  └──────────────┘     └──────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ OpenWeather  │    │Azure Storage │    │   Telegram   │
│  One Call    │    │Table + SQL   │    │   WhatsApp   │
│   API 3.0    │    │              │    │   (Twilio)   │
└──────────────┘    └──────────────┘    └──────────────┘
         │                                      │
         ▼                                      ▼
┌──────────────┐                      ┌──────────────┐
│Google Places │                      │  MeteoAlarm  │
│  Geocoding   │                      │  NOAA (Kp)   │
└──────────────┘                      └──────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.3 | UI Framework |
| React Router | 6.22.0 | Client-side routing |
| Tailwind CSS | 3.4.19 | Styling |
| Recharts | 2.15.4 | Charts & graphs |
| Framer Motion | 12.28.1 | Animations |
| Lucide React | 0.562.0 | Icons |
| MSAL Browser | 5.0.2 | Azure AD authentication |
| date-fns | 3.3.0 | Date formatting |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Azure Functions | v4 | Serverless compute |
| Node.js | 20 LTS | Runtime |
| @azure/data-tables | 13.3.2 | Table Storage client |
| axios | 1.13.2 | HTTP client |
| twilio | 5.11.2 | WhatsApp API |
| mssql | 10.0.2 | Azure SQL client |
| suncalc | 1.9.0 | Sun/moon calculations |

### External Services
| Service | Purpose |
|---------|---------|
| OpenWeather One Call 3.0 | Weather data, forecasts, air quality |
| Google Places API | Location autocomplete & geocoding |
| Windy.com | Embedded weather maps |
| MeteoAlarm | Official weather warnings (Ireland/EU) |
| NOAA SWPC | Kp index for aurora predictions |
| Telegram Bot API | Bot notifications |
| Twilio | WhatsApp notifications |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Azure Static Web Apps | Frontend hosting (CDN) |
| Azure Functions | Backend API (Consumption plan) |
| Azure Table Storage | User locations & preferences |
| Azure SQL Database | Scoring results & history |
| Azure Entra External ID | Authentication (B2C/CIAM) |

---

## 📁 Project Structure

```
Weather_Alert_App/
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── staticwebapp.config.json
│   ├── src/
│   │   ├── auth/                      # Authentication
│   │   │   ├── AuthProvider.jsx       # MSAL context provider
│   │   │   ├── authConfig.js          # Entra configuration
│   │   │   ├── ProtectedRoute.jsx     # Route guards
│   │   │   └── index.js
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── AppLayout.jsx      # Sidebar + header shell
│   │   │   ├── dashboard/
│   │   │   │   ├── QuickStatsBar.jsx
│   │   │   │   ├── TemperatureForecast.jsx
│   │   │   │   ├── HourlyForecast.jsx
│   │   │   │   ├── WindAnalysis.jsx
│   │   │   │   ├── AirQualityBreakdown.jsx
│   │   │   │   ├── SunWidget.jsx
│   │   │   │   ├── MoonWidget.jsx
│   │   │   │   ├── WeatherMapWidget.jsx
│   │   │   │   ├── MetricsGrid.jsx
│   │   │   │   └── WeatherAlertBanner.jsx
│   │   │   ├── summary/
│   │   │   │   └── LocationSummaryCard.jsx
│   │   │   └── LocationSearch.jsx     # Autocomplete search
│   │   ├── pages/
│   │   │   ├── AppRoutes.jsx          # Route configuration
│   │   │   ├── LoginPage.jsx
│   │   │   ├── AlertCenterPage.jsx    # Primary home page
│   │   │   ├── LandingPage.jsx        # Location overview
│   │   │   ├── DashboardPage.jsx      # Full weather dashboard
│   │   │   ├── LocationsPage.jsx
│   │   │   ├── NewLocationPage.jsx
│   │   │   └── PreferencesPage.jsx
│   │   ├── services/
│   │   │   ├── api.js                 # API client
│   │   │   ├── weatherCache.js        # Smart caching (10min TTL)
│   │   │   └── gustHistory.js         # Wind gust tracking
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── backend/
│   ├── src/
│   │   ├── functions/
│   │   │   ├── GetWeather.js
│   │   │   ├── GetWeatherData.js      # Combined weather endpoint
│   │   │   ├── GetForecast.js
│   │   │   ├── SaveUserLocation.js
│   │   │   ├── GetUserLocations.js
│   │   │   ├── DeleteUserLocation.js
│   │   │   ├── SearchLocations.js     # Google Places autocomplete
│   │   │   ├── CheckAlertsAndNotify.js
│   │   │   ├── DailyForecastAlert.js
│   │   │   ├── TonightsSkyAlert.js
│   │   │   ├── WeatherWarningAlert.js
│   │   │   ├── AuroraAlert.js
│   │   │   ├── ComputeAuroraScore.js
│   │   │   ├── TelegramWebhook.js
│   │   │   ├── SendTelegramAlert.js
│   │   │   └── ProcessWhatsAppMessage.js
│   │   ├── scoring/
│   │   │   └── AuroraScore.js         # Aurora scoring algorithm
│   │   ├── utils/
│   │   │   ├── UserLocationHelper.js
│   │   │   ├── IntentDetector.js      # NLP for bot commands
│   │   │   └── MeteoAlarm.js          # Weather warning parser
│   │   └── database/
│   │       └── connection.js          # Azure SQL connection
│   ├── host.json
│   ├── local.settings.json            # Local env vars (gitignored)
│   └── package.json
│
└── docs/                              # Documentation
    ├── ALERT_SYSTEM.md
    ├── ALERT_QUICK_REFERENCE.md
    └── PHASE_3A_ARCHITECTURE.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm 9+
- Azure Functions Core Tools v4
- Azure account (free tier works)
- API keys (see Environment Variables)

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd Weather_Alert_App

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Local Development

**Terminal 1 - Storage Emulator:**
```bash
cd backend
npx azurite
```

**Terminal 2 - Backend:**
```bash
cd backend
npm start
# Functions available at http://localhost:7071/api/
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm start
# App available at http://localhost:3000
```

---

## 🔑 Environment Variables

### Backend (`backend/local.settings.json`)

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    
    "AZURE_STORAGE_CONNECTION_STRING": "your-storage-connection-string",
    
    "OPENWEATHER_API_KEY": "your-openweather-api-key",
    "GOOGLE_PLACES_API_KEY": "your-google-places-api-key",
    
    "TWILIO_ACCOUNT_SID": "your-twilio-sid",
    "TWILIO_AUTH_TOKEN": "your-twilio-token",
    "TWILIO_WHATSAPP_NUMBER": "whatsapp:+14155238886",
    
    "TELEGRAM_BOT_TOKEN": "your-telegram-bot-token",
    
    "SQL_SERVER": "your-server.database.windows.net",
    "SQL_DATABASE": "your-database",
    "SQL_USER": "your-user",
    "SQL_PASSWORD": "your-password"
  }
}
```

### Frontend (`.env`)

```env
REACT_APP_API_URL=http://localhost:7071/api

# Azure Entra External ID (optional for dev)
REACT_APP_ENTRA_CLIENT_ID=your-client-id
REACT_APP_ENTRA_TENANT_SUBDOMAIN=your-tenant
REACT_APP_ENTRA_TENANT_ID=your-tenant-id
```

---

## 📡 API Reference

### Weather Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/GetWeatherData?lat={lat}&lon={lon}` | All weather data (current, hourly, daily, air quality, alerts) |
| GET | `/api/GetWeather?city={city}&country={country}` | Current weather (legacy) |
| GET | `/api/GetForecast?lat={lat}&lon={lon}` | 7-day + hourly forecast |
| GET | `/api/SearchLocations?query={query}` | Location autocomplete |

### Location Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/GetUserLocations?userId={userId}` | Get user's saved locations |
| POST | `/api/SaveUserLocation` | Save/update location |
| DELETE | `/api/DeleteUserLocation?userId={userId}&locationName={name}` | Delete location |

### Alert Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/CheckAlerts` | Manually trigger alert check |
| POST | `/api/daily-forecast` | Send daily forecast alert |
| POST | `/api/tonights-sky` | Send stargazing alert |
| POST | `/api/weather-warning` | Send weather warning alert |
| POST | `/api/aurora-alert` | Send aurora alert |

### Scoring Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/aurora-score?lat={lat}&lon={lon}` | Compute aurora viewing score |

---

## 🚢 Deployment

### Backend (Azure Functions)

```bash
cd backend

# Login to Azure
az login

# Deploy
func azure functionapp publish weather-alert-backend
```

### Frontend (Azure Static Web Apps)

```bash
cd frontend

# Build
npm run build

# Deploy (get token from Azure Portal)
npx @azure/static-web-apps-cli deploy ./build \
  --deployment-token YOUR_TOKEN
```

### Required Azure Resources
1. **Resource Group** - Container for all resources
2. **Storage Account** - Table Storage for user data
3. **Function App** - Backend API (Consumption plan)
4. **Static Web App** - Frontend hosting
5. **Azure SQL Database** - Scoring data (optional)
6. **Azure Entra External ID** - Authentication tenant

---

## 📊 Alert Schedule

| Alert Type | Schedule | Description |
|------------|----------|-------------|
| Daily Forecast | 07:00 UTC | Morning weather briefing |
| Tonight's Sky | 18:00 UTC | Stargazing conditions |
| Weather Warning | Every 30 min | Met Éireann warnings |
| Aurora Alert | Every hour | When Kp ≥ 5 |
| Temperature | Real-time | Outside comfort range |

---

## 🌍 Supported Regions

- **Weather Data:** Global (OpenWeather)
- **Weather Warnings:** Ireland/EU (MeteoAlarm)
- **Aurora Alerts:** Optimized for Ireland (53°N), works globally
- **Location Search:** Global (Google Places)

---

## 💰 Cost Estimate

| Service | Free Tier | Monthly Cost |
|---------|-----------|--------------|
| Azure Static Web Apps | 100GB bandwidth | $0 |
| Azure Functions | 1M executions | $0 |
| Azure Table Storage | 5GB, 20K transactions | $0 |
| OpenWeather One Call 3.0 | 1,000 calls/day | $0 |
| Google Places | $200 credit/month | $0 |
| Twilio WhatsApp | Pay per message | ~$1-5 |
| Telegram | Unlimited | $0 |

**Total:** ~$1-5/month for personal use

---

## 🔮 Future Roadmap

- [ ] Swimming score (sea conditions)
- [ ] Outdoor activity score (hiking, cycling)
- [ ] Push notifications (PWA)
- [ ] Historical weather data & trends
- [ ] Multiple user support
- [ ] Alert scheduling customization
- [ ] Widget drag-and-drop customization

---

## 📄 License

MIT License - See LICENSE file

---

## 🙏 Acknowledgments

- [OpenWeather](https://openweathermap.org/) - Weather data
- [Windy.com](https://www.windy.com/) - Weather maps
- [Met Éireann](https://www.met.ie/) - Irish weather warnings
- [NOAA SWPC](https://www.swpc.noaa.gov/) - Aurora data

---

**Built with ☕ and 🌧️ in Dublin, Ireland**