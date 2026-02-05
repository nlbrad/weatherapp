# OmniAlert - Architecture Overview

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React 19)                              │
│                Azure Static Web Apps (Global CDN)                     │
│                                                                       │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│   │  Login Page  │  │ Alert Center │  │  Dashboard   │              │
│   │  (Entra ID)  │  │  (Primary)   │  │ (Secondary)  │              │
│   └──────────────┘  └──────────────┘  └──────────────┘              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│   │  Locations   │  │ Preferences  │  │  New Location│              │
│   │  Management  │  │  Settings    │  │  (Search)    │              │
│   └──────────────┘  └──────────────┘  └──────────────┘              │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / REST API
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   BACKEND (Azure Functions v4)                        │
│              Serverless Compute - Node.js 20 Runtime                  │
│                                                                       │
│   ┌─────────────────────────────────────────────────────────┐        │
│   │                    HTTP ENDPOINTS                        │        │
│   │                                                          │        │
│   │  Weather           Locations         Scoring             │        │
│   │  ├─ GetWeatherData ├─ GetUserLocs   └─ aurora-score      │        │
│   │  ├─ GetWeather     ├─ SaveUserLoc                        │        │
│   │  ├─ GetForecast    ├─ DeleteUserLoc                      │        │
│   │  ├─ GetAirQuality  └─ UpdatePrefs                        │        │
│   │  └─ SearchLocations                                      │        │
│   └─────────────────────────────────────────────────────────┘        │
│                                                                       │
│   ┌─────────────────────────────────────────────────────────┐        │
│   │                   TIMER FUNCTIONS                        │        │
│   │                                                          │        │
│   │  DailyForecastAlert .... 7am UTC daily                   │        │
│   │  TonightsSkyAlert ...... 6pm UTC daily                   │        │
│   │  WeatherWarningAlert ... Every 30 minutes                │        │
│   │  AuroraAlert ........... Every hour                      │        │
│   │  NewsDigestAlert ....... Configurable (up to 6x/day)     │        │
│   │  CheckAlertsAndNotify .. Hourly (legacy temp alerts)     │        │
│   └─────────────────────────────────────────────────────────┘        │
│                                                                       │
│   ┌─────────────────────────────────────────────────────────┐        │
│   │                   BOT / WEBHOOK                          │        │
│   │                                                          │        │
│   │  TelegramWebhook ...... Handles /start, /stop, /status   │        │
│   │  SendTelegramAlert ..... Delivery utility                 │        │
│   └─────────────────────────────────────────────────────────┘        │
│                                                                       │
│   ┌─────────────────────────────────────────────────────────┐        │
│   │                  SCORING ENGINES                         │        │
│   │                                                          │        │
│   │  SkyScore.js ....... Stargazing conditions (0-100)       │        │
│   │  AuroraScore.js .... Northern Lights probability (0-100) │        │
│   └─────────────────────────────────────────────────────────┘        │
│                                                                       │
│   ┌─────────────────────────────────────────────────────────┐        │
│   │                  ASTRONOMY MODULES                       │        │
│   │                                                          │        │
│   │  VisiblePlanets.js . Tonight's visible planets           │        │
│   │  ISSPasses.js ...... International Space Station passes   │        │
│   │  MeteorShowers.js .. Active meteor shower calendar        │        │
│   └─────────────────────────────────────────────────────────┘        │
│                                                                       │
│   ┌─────────────────────────────────────────────────────────┐        │
│   │                     UTILITIES                            │        │
│   │                                                          │        │
│   │  MeteoAlarm.js .......... Weather warning parser          │        │
│   │  UserLocationHelper.js .. Primary location lookup         │        │
│   │  NewsSources.js ......... News & crypto data sources      │        │
│   └─────────────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   External   │ │   Database   │ │ Notifications│ │    Auth      │
│     APIs     │ │              │ │              │ │              │
│              │ │ Azure Table  │ │  Telegram    │ │ Azure Entra  │
│ OpenWeather  │ │   Storage    │ │  Bot API     │ │ External ID  │
│ Google Places│ │              │ │              │ │   (CIAM)     │
│ MeteoAlarm   │ │ Azure SQL    │ │  Twilio      │ │              │
│ NOAA SWPC    │ │  (Serverless)│ │  WhatsApp    │ │ Social Login │
│ N2YO (ISS)   │ │              │ │              │ │ (MS, Google) │
│ Windy.com    │ │              │ │              │ │              │
│ VisiblePlanets│ │              │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

---

## Design Philosophy: Alert-First

OmniAlert follows an **alert-first design**. The core value proposition is delivering smart, score-based notifications to your phone — not displaying dashboards. The web app's home page is the **Alert Center**, where users manage their notification preferences. Dashboards exist as a bonus feature for exploring weather data in detail.

```
User Journey:
  1. Sign up / Log in (Azure Entra External ID)
  2. Add a location (Google Places autocomplete)
  3. Configure alert preferences (what alerts, which channels)
  4. Receive smart alerts on Telegram / WhatsApp
  5. (Optional) View detailed weather dashboards
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.3 | UI framework |
| React Router | 6.22.0 | Client-side routing |
| Tailwind CSS | 3.4.19 | Utility-first styling |
| Recharts | 2.15.4 | Temperature & forecast charts |
| Framer Motion | 12.28.1 | Page transitions & animations |
| Lucide React | 0.562.0 | Icon library |
| MSAL Browser | 5.0.2 | Azure Entra authentication |
| date-fns | 3.3.0 | Date formatting |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Azure Functions | v4 | Serverless compute runtime |
| Node.js | 20 LTS | JavaScript runtime |
| @azure/data-tables | 13.3.2 | Azure Table Storage client |
| axios | 1.13.2 | HTTP client for external APIs |
| twilio | 5.11.2 | WhatsApp messaging |
| mssql | 12.2.0 | Azure SQL Database client |
| suncalc | 1.9.0 | Sun/moon position calculations |
| date-fns / date-fns-tz | 4.1.0 / 3.2.0 | Date handling with timezone support |

### External APIs

| Service | Purpose | Auth |
|---------|---------|------|
| OpenWeather One Call 3.0 | Current weather, forecasts, air quality, alerts | API Key |
| Google Places API | Location search & autocomplete | API Key |
| MeteoAlarm | Official EU weather warnings (Ireland/EU) | Free, no key |
| NOAA SWPC | Kp index for aurora predictions | Free, no key |
| N2YO | ISS pass predictions | API Key |
| Visible Planets API | Nightly planet visibility | Free, no key |
| Windy.com | Embedded interactive weather maps | Free embed |
| Telegram Bot API | Bot commands & alert delivery | Bot Token |
| Twilio | WhatsApp alert delivery | Account SID + Token |

### Infrastructure

| Service | Purpose | Tier |
|---------|---------|------|
| Azure Static Web Apps | Frontend hosting with global CDN | Free |
| Azure Functions | Backend API (Consumption plan) | Free tier |
| Azure Table Storage | User locations, preferences, bot data | Free tier |
| Azure SQL Database | Scoring results & history (Serverless) | Pay-per-use |
| Azure Entra External ID | Authentication (CIAM) | Free tier |
| GitHub | Source control & repository | Free |

---

## Database Schema

### Azure Table Storage

Three tables store user data as NoSQL key-value pairs:

**UserLocations** — Saved locations with coordinates and alert settings

| Field | Type | Description |
|-------|------|-------------|
| PartitionKey | string | userId |
| RowKey | string | locationName |
| country | string | ISO country code (e.g., "IE") |
| latitude | number | GPS latitude |
| longitude | number | GPS longitude |
| isPrimary | boolean | Primary location for alerts |
| alertsEnabled | boolean | Whether alerts fire for this location |
| minTemp | number | Low temperature threshold |
| maxTemp | number | High temperature threshold |

**UserPreferences** — Notification settings per user

| Field | Type | Description |
|-------|------|-------------|
| PartitionKey | string | "preferences" |
| RowKey | string | userId |
| telegramEnabled | boolean | Telegram alerts on/off |
| telegramChatId | string | Telegram chat ID for delivery |
| alertTypes | object | Which alert types are enabled |
| stargazingThreshold | number | Minimum SkyScore to trigger alert (20-95) |
| morningForecastTime | string | Preferred delivery time ("HH:MM") |
| quietHoursEnabled | boolean | Suppress alerts during quiet hours |
| quietHoursStart | string | Quiet period start time |
| quietHoursEnd | string | Quiet period end time |

**TelegramUsers** — Bot subscription tracking

| Field | Type | Description |
|-------|------|-------------|
| PartitionKey | string | "telegram" |
| RowKey | string | chatId |
| userId | string | Linked user account |
| subscribed | boolean | Active subscription status |

### Azure SQL Database (Serverless)

Used for scoring results, history, and data that benefits from relational queries. The serverless tier auto-pauses when idle (no cost when not in use).

---

## Data Flows

### 1. User Adds a Location

```
User → SearchLocations (Google Places autocomplete)
     → Selects result
     → SaveUserLocation → Azure Table Storage
     → Frontend fetches weather via GetWeatherData
     → Dashboard displays current conditions
```

**Why it works this way:** Google Places handles the tricky part of turning a typed city name into precise GPS coordinates. Those coordinates are saved once, then reused by every alert and dashboard request — so we only call Google once per location.

### 2. Daily Forecast Alert (7am UTC)

```
Timer fires → DailyForecastAlert
  → Query UserPreferences (who has dailyForecast enabled?)
  → For each eligible user:
      → Get primary location from UserLocations
      → Fetch weather from OpenWeather One Call 3.0
      → Fetch warnings from MeteoAlarm
      → Compute outdoor score & SkyScore preview
      → Build formatted message
      → Send via Telegram / WhatsApp
```

### 3. Tonight's Sky Alert (6pm UTC)

```
Timer fires → TonightsSkyAlert
  → For each eligible user:
      → Get location → Fetch weather data
      → Run SkyScore algorithm (cloud, moon, humidity, wind)
      → If score >= user's threshold:
          → Fetch visible planets, ISS passes, meteor showers
          → Build message with viewing window
          → Send alert
```

**Why threshold-based:** Not every night is worth alerting about. Users choose their own sensitivity — a casual stargazer might set 50, while a serious astrophotographer sets 80. This keeps alerts meaningful rather than noisy.

### 4. Weather Warning Alert (Every 30 min)

```
Timer fires → WeatherWarningAlert
  → Fetch MeteoAlarm feed for Ireland
  → Filter: Yellow, Orange, Red only (ignore Green)
  → Check duplicate tracker (don't re-send same warning)
  → For new warnings:
      → Send to all users with weatherWarnings enabled
      → Track as sent (12-hour expiry)
```

### 5. Aurora Alert (Every hour)

```
Timer fires → AuroraAlert
  → Fetch Kp index from NOAA SWPC
  → If Kp < 4: skip (not visible in Ireland at 53°N)
  → Check 6-hour cooldown per Kp level
  → For eligible users:
      → Run AuroraScore (Kp, clouds, darkness, latitude)
      → Send alert with viewing advice
```

### 6. Authentication Flow

```
User visits app → LoginPage
  → "Sign in with Microsoft" / "Sign in with Google"
  → Redirect to Azure Entra External ID
  → MSAL handles token exchange
  → AuthProvider stores user in React context
  → ProtectedRoute guards all authenticated pages
  → getUserId() replaces hardcoded "user123"
```

**Why Entra External ID (not B2C)?** Entra External ID is Microsoft's newer CIAM (Customer Identity and Access Management) solution. It supports social logins, is simpler to configure than classic B2C, and uses the modern CIAM login endpoint (`ciamlogin.com`).

---

## Frontend Architecture

### Routing (Alert-First)

| Route | Page | Description |
|-------|------|-------------|
| `/login` | LoginPage | Public — sign in via Entra |
| `/` | AlertCenterPage | **Primary** — manage alerts |
| `/locations` | LocationsPage | View/manage saved locations |
| `/locations/new` | NewLocationPage | Add location with search |
| `/dashboard` | DashboardSelectorPage | Choose a location to view |
| `/dashboard/:id` | DashboardPage | Full weather dashboard |
| `/preferences` | PreferencesPage | Notification settings |

### Key Components

**Layout:** `AppLayout` provides a collapsible sidebar navigation with Alert Center listed first (primary), Dashboard marked as "bonus."

**Dashboard Widgets:** Each widget is a self-contained component — QuickStatsBar, TemperatureForecast, HourlyForecast, WindAnalysis, AirQualityBreakdown, MetricsGrid, SunWidget, MoonWidget, WeatherMapWidget (Windy.com embed), WeatherAlertBanner.

**Auth:** `AuthProvider` wraps the entire app with MSAL context. `ProtectedRoute` redirects unauthenticated users to login. Development mode bypasses auth when Entra isn't configured locally.

**Caching:** `weatherCache` service caches API responses for 10 minutes with background refresh, preventing redundant API calls when navigating between pages.

---

## Scoring Engines

### SkyScore (Stargazing Conditions)

Produces a 0-100 score for stargazing/astrophotography quality.

| Factor | Weight | Why |
|--------|--------|-----|
| Cloud Cover | 40% | Can't see stars through clouds |
| Moon Phase | 25% | Bright moon washes out faint objects |
| Moon Altitude | 10% | Moon below horizon = bonus darkness |
| Humidity | 15% | High humidity reduces atmospheric transparency |
| Wind | 10% | Strong wind shakes telescopes/cameras |

| Score | Rating |
|-------|--------|
| 90-100 | Exceptional ✨ |
| 80-89 | Excellent |
| 65-79 | Good |
| 50-64 | Fair |
| 35-49 | Poor |
| 0-34 | Bad |

### AuroraScore (Northern Lights Probability)

Produces a 0-100 score for aurora visibility from Ireland.

Key factors: Kp index (geomagnetic activity), cloud cover, darkness level, observer latitude, light pollution. Ireland at ~53°N typically needs Kp 5+ for visible aurora.

---

## Timer Schedule

| Alert | Cron Expression | Time | Frequency |
|-------|-----------------|------|-----------|
| Daily Forecast | `0 0 7 * * *` | 7am UTC | Once daily |
| Tonight's Sky | `0 0 18 * * *` | 6pm UTC | Once daily |
| Weather Warning | `0 */30 * * * *` | :00 and :30 | Every 30 min |
| Aurora | `0 0 * * * *` | On the hour | Every hour |
| News Digest | Configurable | User-set times | Up to 6x/day |
| Legacy Temp Alerts | `0 0 * * * *` | On the hour | Every hour |

> Ireland is UTC+0 in winter (GMT), UTC+1 in summer (IST).

---

## Security

### Authentication
- **Azure Entra External ID** (CIAM) for user authentication
- Social login providers: Microsoft, Google
- MSAL.js handles token management on the frontend
- Session storage for token cache
- Development mode bypass for local testing without Entra

### API Security
- CORS restricted to specific origins (localhost for dev, production Static Web App URL)
- All API keys stored as Azure Function App application settings (environment variables)
- `local.settings.json` used for local development (gitignored — never committed)

### Secrets Management
- OpenWeather, Twilio, Telegram, Google, N2YO keys all stored as environment variables
- Azure SQL credentials stored as app settings
- No secrets in source code

---

## Environment Variables

### Backend (`local.settings.json`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENWEATHER_API_KEY` | Yes | Weather data (One Call 3.0) |
| `TELEGRAM_BOT_TOKEN` | Yes | Telegram bot & alert delivery |
| `AZURE_STORAGE_CONNECTION_STRING` | Yes | Table Storage connection |
| `AzureWebJobsStorage` | Yes | Functions runtime storage |
| `GOOGLE_API_KEY` | Yes | Location search autocomplete |
| `TWILIO_ACCOUNT_SID` | For WhatsApp | Twilio account |
| `TWILIO_AUTH_TOKEN` | For WhatsApp | Twilio auth |
| `TWILIO_WHATSAPP_FROM` | For WhatsApp | Sender number |
| `N2YO_API_KEY` | For ISS passes | N2YO satellite tracking |
| `SQL_SERVER` | For scoring DB | Azure SQL server |
| `SQL_DATABASE` | For scoring DB | Azure SQL database name |
| `SQL_USER` | For scoring DB | Azure SQL username |
| `SQL_PASSWORD` | For scoring DB | Azure SQL password |

### Frontend (`.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `REACT_APP_API_URL` | Yes | Backend API base URL |
| `REACT_APP_ENTRA_CLIENT_ID` | For auth | Entra app registration |
| `REACT_APP_ENTRA_TENANT_SUBDOMAIN` | For auth | Entra tenant |
| `REACT_APP_ENTRA_TENANT_ID` | For auth | Entra tenant ID |

---

## Project Structure

```
OmniAlert/
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── staticwebapp.config.json
│   ├── src/
│   │   ├── auth/                          # Authentication
│   │   │   ├── AuthProvider.jsx           # MSAL context provider
│   │   │   ├── authConfig.js              # Entra configuration
│   │   │   ├── ProtectedRoute.jsx         # Route guard
│   │   │   └── index.js                   # Auth exports
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── AppLayout.jsx          # Sidebar + header shell
│   │   │   ├── dashboard/
│   │   │   │   ├── QuickStatsBar.jsx      # Key metrics bar
│   │   │   │   ├── TemperatureForecast.jsx# 7-day chart
│   │   │   │   ├── HourlyForecast.jsx     # 24-hour breakdown
│   │   │   │   ├── WindAnalysis.jsx       # Wind compass + gusts
│   │   │   │   ├── AirQualityBreakdown.jsx# AQI + pollutants
│   │   │   │   ├── MetricsGrid.jsx        # Pressure, humidity, etc.
│   │   │   │   ├── SunWidget.jsx          # Sunrise/sunset
│   │   │   │   ├── MoonWidget.jsx         # Moon phase
│   │   │   │   ├── WeatherMapWidget.jsx   # Windy.com embed
│   │   │   │   └── WeatherAlertBanner.jsx # Active warning banner
│   │   │   └── LocationSearch.jsx         # Google Places autocomplete
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx              # Sign in
│   │   │   ├── AlertCenterPage.jsx        # Alert management (home)
│   │   │   ├── LocationsPage.jsx          # Location list
│   │   │   ├── NewLocationPage.jsx        # Add location
│   │   │   ├── DashboardPage.jsx          # Full weather dashboard
│   │   │   └── PreferencesPage.jsx        # Notification settings
│   │   ├── services/
│   │   │   ├── api.js                     # API client
│   │   │   └── weatherCache.js            # Response caching
│   │   ├── App.js                         # Root component
│   │   ├── index.js                       # Entry point
│   │   └── index.css                      # Tailwind imports
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── backend/
│   ├── src/
│   │   ├── functions/
│   │   │   ├── Weather/
│   │   │   │   ├── GetWeatherData.js      # Combined weather endpoint
│   │   │   │   ├── GetWeather.js          # Current conditions
│   │   │   │   ├── GetForecast.js         # 7-day + hourly
│   │   │   │   ├── GetAirQuality.js       # AQI data
│   │   │   │   └── SearchLocations.js     # Google Places proxy
│   │   │   ├── Alerts/
│   │   │   │   ├── DailyForecastAlert.js  # Morning briefing
│   │   │   │   ├── TonightsSkyAlert.js    # Stargazing conditions
│   │   │   │   ├── WeatherWarningAlert.js # Met Éireann warnings
│   │   │   │   ├── AuroraAlert.js         # Northern Lights
│   │   │   │   ├── NewsDigestAlert.js     # News & crypto digest
│   │   │   │   └── CheckAlertsAndNotify.js# Legacy temp alerts
│   │   │   ├── Users/
│   │   │   │   ├── SaveUserLocation.js    # Create/update location
│   │   │   │   ├── GetUserLocations.js    # List user locations
│   │   │   │   ├── DeleteUserLocation.js  # Remove location
│   │   │   │   └── UpdatePreferences.js   # Save alert preferences
│   │   │   └── Bot/
│   │   │       ├── TelegramWebhook.js     # Bot command handler
│   │   │       └── SendTelegramAlert.js   # Message delivery utility
│   │   ├── scoring/
│   │   │   ├── SkyScore.js                # Stargazing algorithm
│   │   │   └── AuroraScore.js             # Aurora algorithm
│   │   ├── astronomy/
│   │   │   ├── VisiblePlanets.js          # Planet visibility
│   │   │   ├── ISSPasses.js               # ISS tracking
│   │   │   └── MeteorShowers.js           # Meteor shower calendar
│   │   └── utils/
│   │       ├── MeteoAlarm.js              # Weather warning parser
│   │       ├── UserLocationHelper.js      # Primary location lookup
│   │       └── NewsSources.js             # News & crypto sources
│   ├── host.json                          # Function app config
│   ├── local.settings.json                # Local env vars (gitignored)
│   └── package.json
│
├── README.md
└── .gitignore
```

---

## Scalability

### Current Limits (Free / Low-Cost Tiers)

| Resource | Limit | Current Usage |
|----------|-------|---------------|
| Azure Functions | 1M executions/month | Well within |
| Table Storage | 5GB data | Minimal |
| Static Web Apps | 100GB bandwidth/month | Well within |
| OpenWeather One Call 3.0 | 1,000 calls/day | ~100-200/day |
| Azure SQL Serverless | Auto-pause when idle | Minimal cost |

### Scaling Path

- Azure Functions Consumption plan auto-scales horizontally
- Table Storage scales automatically with no configuration
- If user base grows significantly: add Azure Redis Cache for weather data, implement Azure Queue Storage for async alert processing, upgrade to Premium Functions plan

---

## Cost Analysis

### Monthly Costs (Current Usage)

| Service | Cost | Notes |
|---------|------|-------|
| Azure Static Web Apps | $0 | Free tier |
| Azure Functions | $0 | Within free tier |
| Azure Table Storage | ~$0.05 | Minimal transactions |
| Azure SQL Serverless | $0-8 | Auto-pauses when idle |
| OpenWeather API | $0 | Within free tier |
| Twilio WhatsApp | ~$1-2 | Pay per message (~$0.009 each) |
| Telegram Bot | $0 | Free |
| Google Places API | ~$0-5 | Per-autocomplete session |
| **Total** | **~$1-15/month** | Varies with usage |

---

## Development Tools

| Tool | Purpose |
|------|---------|
| **GitHub** | Source control & repository |
| **VS Code** | IDE (macOS) |
| **Azurite** | Local Azure Storage emulator |
| **Azure Functions Core Tools v4** | Local function runtime |
| **Azure CLI** | Resource management & deployment |
| **nvm** | Node.js version management |
| **npm** | Package management |