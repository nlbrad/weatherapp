# OmniAlert - Local Development Setup Guide

## Prerequisites

- **macOS** (tested on macOS with Apple Silicon)
- **Node.js v20.x** (managed with nvm)
- **npm** (comes with Node.js)
- **Git**
- **Azure CLI**
- **Azure Functions Core Tools v4**
- **Visual Studio Code** (recommended)

---

## Initial Setup

### 1. Install Node.js with nvm

**What is nvm?** Node Version Manager lets you install and switch between different versions of Node.js. This is useful because Azure Functions v4 requires Node.js 20, and you might have other projects needing different versions.

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Add to shell profile
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.zshrc
source ~/.zshrc

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version  # Should show v20.x.x
npm --version   # Should show 9.x or 10.x
```

### 2. Install Azure Tools

**What are these?** Azure CLI lets you manage Azure resources from the terminal. Azure Functions Core Tools lets you run your serverless functions locally — without deploying to Azure every time you make a change.

```bash
# Install Azure CLI
brew update && brew install azure-cli

# Install Azure Functions Core Tools
brew tap azure/functions
brew install azure-functions-core-tools@4

# Verify installations
az --version       # Should show 2.x.x
func --version     # Should show 4.6.0 or higher
```

### 3. Clone Repository

```bash
# Clone from GitHub
git clone https://github.com/YOUR_USERNAME/Weather_Alert_App.git
cd Weather_Alert_App
```

---

## Backend Setup

### Install Dependencies

```bash
cd backend
npm install
```

**Key packages installed:**

| Package | Purpose |
|---------|---------|
| `@azure/functions` | Azure Functions SDK — defines HTTP and timer triggers |
| `@azure/data-tables` | Client for Azure Table Storage (our NoSQL database) |
| `axios` | HTTP client for calling weather APIs |
| `twilio` | WhatsApp messaging via Twilio API |
| `mssql` | Azure SQL Database client (for scoring data) |
| `suncalc` | Calculates sun/moon positions (used in SkyScore) |
| `date-fns` / `date-fns-tz` | Date formatting with timezone support |

### Configure Local Settings

**What is `local.settings.json`?** This file holds all your API keys and connection strings for local development. It's gitignored (never committed) so your secrets stay safe. In production, these same values are set as Azure Function App "Application Settings."

Create `backend/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",

    "AZURE_STORAGE_CONNECTION_STRING": "UseDevelopmentStorage=true",

    "OPENWEATHER_API_KEY": "your_openweather_api_key",
    "GOOGLE_API_KEY": "your_google_places_api_key",

    "TELEGRAM_BOT_TOKEN": "your_telegram_bot_token",

    "TWILIO_ACCOUNT_SID": "your_twilio_account_sid",
    "TWILIO_AUTH_TOKEN": "your_twilio_auth_token",
    "TWILIO_WHATSAPP_FROM": "whatsapp:+14155238886",

    "N2YO_API_KEY": "your_n2yo_api_key",

    "SQL_SERVER": "your-server.database.windows.net",
    "SQL_DATABASE": "your-database",
    "SQL_USER": "your-user",
    "SQL_PASSWORD": "your-password"
  }
}
```

> ⚠️ **IMPORTANT:** This file is gitignored. Never commit API keys to source control!

### Get API Keys

You don't need every key to start developing — the core weather features work with just OpenWeather and Google. Add the others as you work on those features.

**OpenWeatherMap (Required):**
1. Sign up at https://openweathermap.org/api
2. Subscribe to "One Call API 3.0" (has a free tier)
3. Copy your API key to `OPENWEATHER_API_KEY`
4. New keys take ~15 minutes to activate

**Google Places (Required for location search):**
1. Go to https://console.cloud.google.com
2. Create a project → Enable "Places API"
3. Create an API key → Restrict to Places API
4. Copy to `GOOGLE_API_KEY`

**Telegram Bot (Required for alerts):**
1. Open Telegram and search for `@BotFather`
2. Send `/newbot` and follow the prompts
3. Copy the bot token to `TELEGRAM_BOT_TOKEN`
4. Send `/start` to your new bot to register your Chat ID

**Twilio (Optional — for WhatsApp alerts):**
1. Sign up at https://www.twilio.com/try-twilio
2. Copy Account SID and Auth Token
3. Go to Messaging → Try WhatsApp → Join sandbox
4. Send the sandbox join code from your phone

**N2YO (Optional — for ISS pass tracking):**
1. Sign up at https://www.n2yo.com/api/
2. Get your API key (free tier: 300 calls/hour)
3. Copy to `N2YO_API_KEY`

**Azure SQL (Optional — for scoring database):**
- Only needed if working on the scoring engine
- Can be skipped for most development — alerts and dashboards work without it
- See DEPLOYMENT.md for Azure SQL setup if needed

### Start Azurite (Storage Emulator)

**What is Azurite?** It's a local emulator that mimics Azure Table Storage on your machine. Instead of needing a real Azure storage account during development, Azurite runs a fake one locally. Your data is stored in local files and resets if you delete them.

**Terminal 1:**
```bash
cd backend
npx azurite
```

Leave this running. You'll see output like:
```
Azurite Blob service is starting at http://127.0.0.1:10000
Azurite Queue service is starting at http://127.0.0.1:10001
Azurite Table service is starting at http://127.0.0.1:10002
```

### Start Backend Functions

**Terminal 2:**
```bash
cd backend
npm start
```

You should see your functions listed. The output will look something like:

```
Functions:

  GetWeatherData: [GET] http://localhost:7071/api/GetWeatherData
  GetWeather: [GET,POST] http://localhost:7071/api/GetWeather
  GetForecast: [GET] http://localhost:7071/api/GetForecast
  GetAirQuality: [GET] http://localhost:7071/api/GetAirQuality
  SearchLocations: [GET] http://localhost:7071/api/SearchLocations
  SaveUserLocation: [POST] http://localhost:7071/api/SaveUserLocation
  GetUserLocations: [GET] http://localhost:7071/api/GetUserLocations
  DeleteUserLocation: [DELETE] http://localhost:7071/api/DeleteUserLocation
  CheckAlertsAndNotifyHttp: [GET,POST] http://localhost:7071/api/CheckAlerts
  ComputeAuroraScore: [GET] http://localhost:7071/api/aurora-score
  DailyForecastAlert: [GET,POST] http://localhost:7071/api/daily-forecast
  TonightsSkyAlert: [GET,POST] http://localhost:7071/api/tonights-sky
  WeatherWarningAlert: [GET,POST] http://localhost:7071/api/weather-warning
  AuroraAlert: [GET,POST] http://localhost:7071/api/aurora-alert
  TelegramWebhook: [POST] http://localhost:7071/api/telegram-webhook
  SendTelegramAlert: [POST] http://localhost:7071/api/send-telegram

  Timer functions (run automatically):
    CheckAlertsAndNotify: timerTrigger
    DailyForecastTimer: timerTrigger
    TonightsSkyTimer: timerTrigger
    WeatherWarningTimer: timerTrigger
    AuroraAlertTimer: timerTrigger
```

> **Note:** The exact list may vary depending on which functions are currently enabled. Don't worry if some are missing — the core ones are GetWeather, GetUserLocations, SaveUserLocation, and SearchLocations.

---

## Frontend Setup

### Install Dependencies

```bash
cd frontend
npm install
```

**Key packages installed:**

| Package | Purpose |
|---------|---------|
| `react` / `react-dom` | UI framework |
| `react-router-dom` | Page routing (URL-based navigation) |
| `tailwindcss` | Utility-first CSS styling |
| `recharts` | Charts (temperature forecasts, etc.) |
| `framer-motion` | Smooth page transitions and animations |
| `lucide-react` | Icon library |
| `@azure/msal-browser` / `@azure/msal-react` | Azure Entra authentication |
| `date-fns` | Date formatting |

### Configure Environment

Create `frontend/.env.local`:

```env
# Backend API URL (points to your local Azure Functions)
REACT_APP_API_URL=http://localhost:7071/api

# Azure Entra External ID (optional for local dev)
# Without these, the app runs in "dev mode" — auth is bypassed
# REACT_APP_ENTRA_CLIENT_ID=your-client-id
# REACT_APP_ENTRA_TENANT_SUBDOMAIN=your-tenant-subdomain
# REACT_APP_ENTRA_TENANT_ID=your-tenant-id
```

**Why is auth optional locally?** The `AuthProvider` has a built-in development mode. When Entra isn't configured, it automatically bypasses authentication and uses a default user ID (`dev-user-123`). This means you can develop and test features without setting up Azure Entra. Just uncomment the Entra variables when you're ready to test real authentication.

### Run Development Server

**Terminal 3:**
```bash
cd frontend
npm start
```

App opens at `http://localhost:3000`

**Features:**
- Hot reload — changes appear instantly when you save files
- Proxies API requests to the backend at port 7071
- Shows helpful error overlays for React errors

---

## Testing Locally

### Test Backend APIs

```bash
# Get weather for a location
curl "http://localhost:7071/api/GetWeatherData?lat=53.35&lon=-6.26"

# Search for a location (requires Google API key)
curl "http://localhost:7071/api/SearchLocations?query=Dublin"

# Save a location
curl -X POST http://localhost:7071/api/SaveUserLocation \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "dev-user-123",
    "locationName": "Dublin",
    "country": "IE",
    "latitude": 53.3498,
    "longitude": -6.2603,
    "alertsEnabled": true,
    "isPrimary": true,
    "minTemp": 0,
    "maxTemp": 30
  }'

# Get saved locations
curl "http://localhost:7071/api/GetUserLocations?userId=dev-user-123"

# Test aurora score
curl "http://localhost:7071/api/aurora-score?lat=53.35&lon=-6.26"

# Preview daily forecast (doesn't send, just shows what would be sent)
curl "http://localhost:7071/api/daily-forecast?lat=53.35&lon=-6.26"

# Preview tonight's sky
curl "http://localhost:7071/api/tonights-sky?lat=53.35&lon=-6.26"
```

### Test Frontend

1. Open `http://localhost:3000`
2. App loads to the **Alert Center** (home page)
3. Navigate to **Locations** → **Add Location**
4. Search for a city (e.g., "Dublin, Ireland")
5. Save the location
6. Navigate to **Dashboard** → Select your location
7. Dashboard should show current weather, forecast, wind, air quality, etc.

### Test Telegram Alerts

1. Make sure your bot token is in `local.settings.json`
2. Send `/start` to your bot in Telegram to get your Chat ID
3. Test sending a forecast:
```bash
curl -X POST "http://localhost:7071/api/daily-forecast" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "YOUR_CHAT_ID", "locationName": "Dublin", "lat": 53.35, "lon": -6.26}'
```
4. You should receive a formatted weather briefing in Telegram!

---

## Development Workflow

### Typical Development Session

You'll need 3-4 terminal windows running simultaneously:

| Terminal | Command | Purpose |
|----------|---------|---------|
| 1 | `cd backend && npx azurite` | Storage emulator (leave running) |
| 2 | `cd backend && npm start` | Backend API (restart when adding new functions) |
| 3 | `cd frontend && npm start` | Frontend dev server (auto-reloads) |
| 4 | (your working terminal) | Git, curl testing, etc. |

### Making Changes

1. Edit code in VS Code
2. Save files
3. **Frontend:** Hot reloads automatically — you'll see changes instantly
4. **Backend:** Most changes hot reload too, but restart (`Ctrl+C` → `npm start`) if you add a new function file or change `host.json`
5. Test in browser at `localhost:3000`

### Committing Changes

```bash
# Check what's changed
git status

# Stage all changes
git add .

# Commit with a descriptive message
git commit -m "Add aurora score to daily forecast message"

# Push to GitHub
git push
```

---

## Common Issues & Solutions

### Functions Won't Start

**Error:** `Initializing HttpWorker timed out`

**Solutions (try in order):**
1. Check `host.json` doesn't have a `customHandler` section — remove it if present
2. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Check for syntax errors: `node --check src/functions/GetWeather.js` (repeat for other files)
4. Verify Node.js version: `node --version` should show v20.x.x

### Azurite Connection Failed

**Error:** `connect ECONNREFUSED 127.0.0.1:10002`

**Cause:** Azurite isn't running.

**Solution:** Start Azurite in a separate terminal before starting the backend:
```bash
cd backend
npx azurite
```

### CORS Errors

**Error:** `blocked by CORS policy`

**Solutions:**
1. Make sure the frontend `proxy` is set in `frontend/package.json`:
   ```json
   "proxy": "http://localhost:7071"
   ```
2. Restart the frontend after adding the proxy (`Ctrl+C` → `npm start`)
3. Check that `REACT_APP_API_URL` in `.env.local` points to `http://localhost:7071/api`

### Tailwind CSS Not Working

**Error:** No styling — plain HTML elements

**Cause:** Usually a Tailwind v4 vs v3 version mismatch.

**Solution:**
```bash
cd frontend

# Check version
npm list tailwindcss  # Should be v3.x.x

# If v4.x.x, downgrade:
npm uninstall tailwindcss
npm install -D tailwindcss@3 postcss@8 autoprefixer@10
npx tailwindcss init -p

# Restart frontend
npm start
```

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or run on a different port
PORT=3001 npm start
```

### OpenWeather API Errors

**Error:** `401 Unauthorized` from weather endpoint

**Causes:**
1. API key not yet activated (new keys take ~15 minutes)
2. Key is invalid or expired
3. Not subscribed to "One Call API 3.0"

**Debug:**
```bash
# Test your API key directly
curl "https://api.openweathermap.org/data/3.0/onecall?lat=53.35&lon=-6.26&appid=YOUR_KEY&units=metric"
```

### Authentication Issues

**Error:** App redirects to login but nothing happens

**Solutions:**
1. For local development, leave the Entra variables commented out in `.env.local` — dev mode will bypass auth
2. If testing auth: ensure your Entra redirect URI includes `http://localhost:3000`
3. Check browser console for MSAL errors

---

## Project Structure

```
Weather_Alert_App/
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── staticwebapp.config.json    # Azure SWA routing config
│   ├── src/
│   │   ├── auth/                       # Authentication (MSAL / Entra)
│   │   │   ├── AuthProvider.jsx        # Auth context & login/logout
│   │   │   ├── authConfig.js           # Entra tenant configuration
│   │   │   ├── ProtectedRoute.jsx      # Route guard for auth pages
│   │   │   └── index.js               # Auth module exports
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── AppLayout.jsx       # Sidebar + header shell
│   │   │   ├── dashboard/              # Dashboard widget components
│   │   │   │   ├── QuickStatsBar.jsx
│   │   │   │   ├── TemperatureForecast.jsx
│   │   │   │   ├── HourlyForecast.jsx
│   │   │   │   ├── WindAnalysis.jsx
│   │   │   │   ├── AirQualityBreakdown.jsx
│   │   │   │   ├── MetricsGrid.jsx
│   │   │   │   ├── SunWidget.jsx
│   │   │   │   ├── MoonWidget.jsx
│   │   │   │   ├── WeatherMapWidget.jsx
│   │   │   │   └── WeatherAlertBanner.jsx
│   │   │   └── LocationSearch.jsx      # Google Places autocomplete
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx           # Sign in screen
│   │   │   ├── AlertCenterPage.jsx     # Home — alert management
│   │   │   ├── LocationsPage.jsx       # Saved locations list
│   │   │   ├── NewLocationPage.jsx     # Add location flow
│   │   │   ├── DashboardPage.jsx       # Full weather dashboard
│   │   │   └── PreferencesPage.jsx     # Notification settings
│   │   ├── services/
│   │   │   ├── api.js                  # API client (all backend calls)
│   │   │   └── weatherCache.js         # Response caching (10 min TTL)
│   │   ├── App.js                      # Root component
│   │   ├── index.js                    # Entry point
│   │   └── index.css                   # Tailwind CSS imports
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── backend/
│   ├── src/
│   │   ├── functions/                  # Azure Function endpoints
│   │   │   ├── GetWeatherData.js       # Combined weather (current + forecast + AQI)
│   │   │   ├── GetWeather.js           # Current conditions only
│   │   │   ├── GetForecast.js          # 7-day + hourly forecast
│   │   │   ├── GetAirQuality.js        # Air quality index
│   │   │   ├── SearchLocations.js      # Google Places autocomplete proxy
│   │   │   ├── SaveUserLocation.js     # Create/update location
│   │   │   ├── GetUserLocations.js     # List user's locations
│   │   │   ├── DeleteUserLocation.js   # Remove a location
│   │   │   ├── CheckAlertsAndNotify.js # Legacy temperature alert check
│   │   │   ├── DailyForecastAlert.js   # Morning weather briefing
│   │   │   ├── TonightsSkyAlert.js     # Stargazing condition alert
│   │   │   ├── WeatherWarningAlert.js  # Met Éireann weather warnings
│   │   │   ├── AuroraAlert.js          # Northern Lights alert
│   │   │   ├── NewsDigestAlert.js      # News & crypto digest
│   │   │   ├── ComputeAuroraScore.js   # Aurora score HTTP endpoint
│   │   │   ├── TelegramWebhook.js      # Bot command handler
│   │   │   └── SendTelegramAlert.js    # Message delivery utility
│   │   ├── scoring/
│   │   │   ├── SkyScore.js             # Stargazing score algorithm
│   │   │   └── AuroraScore.js          # Aurora probability algorithm
│   │   ├── astronomy/
│   │   │   ├── VisiblePlanets.js       # Planet visibility calculator
│   │   │   ├── ISSPasses.js            # ISS pass predictions (N2YO)
│   │   │   └── MeteorShowers.js        # Meteor shower calendar
│   │   ├── utils/
│   │   │   ├── MeteoAlarm.js           # Weather warning parser
│   │   │   ├── UserLocationHelper.js   # Primary location lookup
│   │   │   ├── IntentDetector.js       # NLP for bot commands
│   │   │   └── NewsSources.js          # News & crypto data sources
│   │   └── database/
│   │       └── connection.js           # Azure SQL connection helper
│   ├── host.json                       # Function app runtime config
│   ├── local.settings.json             # Local env vars (gitignored)
│   └── package.json
│
├── README.md
└── .gitignore
```

---

## Next Steps

Once local development is working:

1. **DEPLOYMENT.md** — Deploy to Azure (Static Web Apps + Functions)
2. **API_DOCS.md** — Full API endpoint reference
3. **ALERT_SYSTEM.md** — Deep-dive into how each alert works
4. **TROUBLESHOOTING.md** — More detailed problem-solving guide