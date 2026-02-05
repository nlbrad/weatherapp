# Alert System Documentation

Complete reference for the OmniAlert notification system.

## Overview

OmniAlert sends automated notifications to users via Telegram based on weather conditions, astronomical events, severe weather warnings, and curated news digests.

```
┌─────────────────────────────────────────────────────────────────┐
│                     ALERT SYSTEM ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │   Timers    │    │   Weather   │    │   User      │        │
│   │  (Azure)    │───▶│   APIs      │───▶│   Prefs     │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│          │                                     │                │
│          ▼                                     ▼                │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │   Score     │    │   Message   │    │  Telegram   │        │
│   │  Modules    │───▶│   Builder   │───▶│    Bot      │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Alert Types

| Alert | Description | Trigger | User Preference |
|-------|-------------|---------|-----------------|
| **Daily Forecast** | Morning weather briefing | 7am UTC daily | `alertTypes.dailyForecast` |
| **Tonight's Sky** | Stargazing conditions | 6pm UTC daily | `alertTypes.stargazingAlerts` |
| **Weather Warning** | Met Éireann warnings | Every 30 mins | `alertTypes.weatherWarnings` |
| **Aurora Alert** | Northern lights | Every hour | `alertTypes.auroraAlerts` |
| **News Digest** | News & crypto digest | User-set times | `alertTypes.newsDigest` |

---

## 1. Daily Forecast Alert

### Purpose
Sends a comprehensive morning weather briefing to help users plan their day.

### Trigger
- **Timer:** Daily at 07:00 UTC
- **Cron:** `0 0 7 * * *`
- **Manual:** `POST /api/daily-forecast`

### File Location
```
backend/src/functions/DailyForecastAlert.js
```

### Dependencies
- `../scoring/SkyScore.js` - Tonight's stargazing preview
- `../utils/MeteoAlarm.js` - Weather warnings
- `../utils/UserLocationHelper.js` - User's saved location

### Message Contents

```
☀️ Good morning! Here's today in Dublin

⚠️ Active Weather Warnings:
🟡 Yellow - Wind
   📍 Dublin, Wicklow
   ⏰ Today 14:00 - Tomorrow 06:00

🌡️ Temperature
   4°C → 14°C (now 8°C)
   Feels like 5°C

⛅ Partly cloudy
🌧️ 30% chance of rain
   14:00-16:00

💨 Wind
   25 km/h SW (gusts 55 km/h)
   ⚠️ Gusty conditions

👁️ Visibility: 8.5 km (Good)
💧 Humidity: 87% (very humid)
☀️ UV Index: 3 (Moderate)

🌅 Sunrise 08:12 · Sunset 17:34
   (9h 22m daylight)

📊 Activity Scores:
   ✅ Outdoor: 72/100 (Good)
   ⚠️ Stargazing tonight: 45/100 (Poor)

💡 Rain clears by evening - good for after-work activities!
```

### Features

| Feature | Description |
|---------|-------------|
| Temperature | Min/max/current + feels like |
| Wind | Speed, direction, gusts |
| Visibility | km + rating (Excellent/Good/Moderate/Poor) |
| UV Index | When >= 3 with advice |
| Humidity | When > 85% or < 30% |
| Daylight | Hours calculated from sunrise/sunset |
| Weather Warnings | Top 2 Yellow+ from MeteoAlarm |
| Outdoor Score | Simple activity score 0-100 |
| SkyScore | Tonight's stargazing preview |
| Smart Tips | Contextual advice based on conditions |

### Outdoor Score Calculation

```javascript
Base: 100

Penalties:
- Temperature < 5°C:  -30
- Temperature > 28°C: -20
- Rain chance > 70%:  -35
- Rain chance > 40%:  -20
- Wind > 40 km/h:     -30
- Wind > 25 km/h:     -15
- Clouds > 90%:       -5

Rating:
90-100: Excellent
70-89:  Good
50-69:  Fair
30-49:  Poor
0-29:   Bad
```

### API Endpoints

```bash
# Preview (no send)
GET /api/daily-forecast?lat=53.35&lon=-6.26

# Send to specific chat
POST /api/daily-forecast
Content-Type: application/json
{
  "chatId": "444081216",
  "locationName": "Dublin",
  "lat": 53.35,
  "lon": -6.26
}

# Batch send to all users
GET /api/daily-forecast/batch-test?force=true
```

---

## 2. Tonight's Sky Alert

### Purpose
Alerts users when stargazing conditions meet their threshold, including visible planets, ISS passes, and meteor showers.

### Trigger
- **Timer:** Daily at 18:00 UTC (6pm)
- **Cron:** `0 0 18 * * *`
- **Manual:** `POST /api/tonights-sky`

### File Location
```
backend/src/functions/TonightsSkyAlert.js
```

### Dependencies
- `../scoring/SkyScore.js` - Main scoring algorithm
- `../astronomy/VisiblePlanets.js` - Planet visibility
- `../astronomy/ISSPasses.js` - Space station passes
- `../astronomy/MeteorShowers.js` - Active meteor showers
- `../utils/UserLocationHelper.js` - User's saved location

### Message Contents

```
🌙 Tonight's Sky in Dublin

⭐ SkyScore: 78/100 - Good

🌑 Moon: Waning Crescent (12%)
   Sets at 22:45 - dark skies after!

👁️ Visible Planets:
   • Venus - West after sunset (very bright!)
   • Jupiter - South, high in sky
   • Saturn - Southwest, golden color

🛰️ ISS Passes Tonight:
   • 19:34 - Bright pass! (mag -3.2)
     Duration: 6 min, West → East
   • 21:08 - Visible pass (mag -2.1)
     Duration: 4 min, Southwest → East

☁️ Conditions:
   Cloud cover: 15% (clearing)
   Best window: 22:00 - 02:00

💡 Great night for stargazing! 
   Moon sets early, giving dark skies.
```

### SkyScore Algorithm

```javascript
// File: backend/src/scoring/SkyScore.js

Weights:
- Cloud Cover:  40% (most important)
- Moon Phase:   25% (brightness)
- Moon Altitude: 10% (below horizon = bonus)
- Humidity:     15% (affects transparency)
- Wind:         10% (telescope stability)

Rating Scale:
90-100: Exceptional ✨
80-89:  Excellent
65-79:  Good
50-64:  Fair
35-49:  Poor
0-34:   Bad
```

### Threshold-Based Alerting

Users set a minimum SkyScore threshold (20-95) in Settings. Alerts only send when:

```javascript
if (skyScore >= userThreshold) {
  sendAlert();
}
```

| Threshold | Description |
|-----------|-------------|
| 20-49 | All viewable conditions - most alerts |
| 50-64 | Fair conditions - frequent alerts |
| 65-79 | Good conditions - balanced |
| 80-95 | Excellent only - fewer alerts |

### Data Sources

| Data | Source | API Key Required |
|------|--------|------------------|
| Weather | OpenWeather One Call 3.0 | Yes |
| Moon Phase | OpenWeather | Yes |
| Planets | api.visibleplanets.dev | **No** (FREE) |
| ISS Passes | N2YO.com | Yes |
| Meteors | Static calendar | No |

### API Endpoints

```bash
# Preview (no send)
GET /api/tonights-sky?lat=53.35&lon=-6.26

# Send to specific chat
POST /api/tonights-sky
Content-Type: application/json
{
  "chatId": "444081216",
  "threshold": 65
}

# Force send (bypass threshold)
POST /api/tonights-sky
{
  "chatId": "444081216",
  "force": true
}

# Batch send to all eligible users
GET /api/tonights-sky/batch-test?force=true
```

---

## 3. Weather Warning Alert

### Purpose
Sends detailed alerts when Met Éireann issues Yellow, Orange, or Red weather warnings.

### Trigger
- **Timer:** Every 30 minutes
- **Cron:** `0 */30 * * * *`
- **Manual:** `POST /api/weather-warning`

### File Location
```
backend/src/functions/WeatherWarningAlert.js
```

### Dependencies
- `../utils/MeteoAlarm.js` - Warning data
- Azure Table Storage - Sent warning tracking

### Message Contents

```
🚨 WEATHER WARNING

🟠 Orange - Wind
📍 Dublin, Wicklow, Wexford
⏰ Tomorrow 06:00 - Tomorrow 18:00

Southwest winds of 65-80 km/h with gusts 
up to 110 km/h, strongest in coastal areas.

⚠️ What to expect:
• Dangerous driving conditions
• Risk of fallen trees and structural damage
• Potential power outages

💡 Orange warning: Be prepared. Only travel if necessary.

─────────────
Source: Met Éireann via MeteoAlarm
```

### MeteoAlarm Integration

```
API: https://feeds.meteoalarm.org/api/v1/warnings/feeds-ireland
Format: JSON (CAP standard)
Auth: None required (FREE)
```

### Warning Levels

| Level | Color | Emoji | Action |
|-------|-------|-------|--------|
| 1 | Green | 🟢 | **Filtered out** - No warning |
| 2 | Yellow | 🟡 | Be aware |
| 3 | Orange | 🟠 | Be prepared |
| 4 | Red | 🔴 | Take action |

### Warning Types

| Type | Emoji |
|------|-------|
| Wind | 💨 |
| Rain | 🌧️ |
| Snow/Ice | ❄️ |
| Thunderstorm | ⛈️ |
| Fog | 🌫️ |
| High Temperature | 🌡️ |
| Low Temperature | 🥶 |
| Coastal | 🌊 |
| Flooding | 💧 |

### Duplicate Prevention

Warnings are tracked to avoid sending the same alert multiple times:

```javascript
// In-memory tracking (resets on function restart)
const sentWarnings = new Map();

// Key format: warning_id-type-severity
// Expires after 12 hours (allows re-alerting for ongoing warnings)
```

### API Endpoints

```bash
# Preview current warnings
GET /api/weather-warning

# Send to specific chat
POST /api/weather-warning
Content-Type: application/json
{
  "chatId": "444081216"
}

# Force send to all users
GET /api/weather-warning/batch-test?force=true
```

---

## 4. Aurora Alert

### Purpose
Monitors geomagnetic activity (Kp index) and alerts users when Northern Lights might be visible in Ireland.

### Trigger
- **Timer:** Every hour
- **Cron:** `0 0 * * * *`
- **Manual:** `POST /api/aurora-alert`

### File Location
```
backend/src/functions/AuroraAlert.js
```

### Dependencies
- `../scoring/AuroraScore.js` - Scoring algorithm
- `../utils/UserLocationHelper.js` - User's saved location

### Message Contents

```
🌌 Aurora Alert - Dublin

🟢 AuroraScore: 72/100 - Good

⚡ Kp Index: 5 (Minor Storm)
   G1 Minor Storm - Aurora visible at 55°N
   ✅ Above threshold for 53°N latitude

📅 Kp Forecast:
   Next 3hr: Kp 5 | Next 6hr: Kp 4

🌤️ Conditions:
   ☁️ Cloud cover: 25%
   ✨ Clear skies - excellent!
   🌙 Dark enough for viewing

💡 Recommendation:
Good chance of aurora. Find a spot away 
from light pollution with a view north.

📍 Best viewing:
• Find a dark location away from city lights
• Look north towards the horizon
• Give your eyes 20+ mins to adjust
• Check between 10pm - 2am

─────────────
Source: NOAA Space Weather Prediction Center
```

### Kp Index Reference

| Kp | Level | Description | Ireland Visibility |
|----|-------|-------------|-------------------|
| 0-1 | Quiet | No activity | ❌ Not visible |
| 2-3 | Unsettled | Low activity | ❌ Not visible |
| 4 | Active | Elevated | ⚠️ Unlikely |
| 5 | Minor Storm (G1) | Aurora at 55°N | ✅ Possible! |
| 6 | Moderate Storm (G2) | Aurora at 50°N | ✅ Good chance |
| 7 | Strong Storm (G3) | Aurora at 45°N | ✅ Very likely |
| 8-9 | Severe/Extreme | Widespread | ✅ Almost certain |

> **Ireland is at ~53°N, so typically needs Kp 5+ for visible aurora**

### Kp Data Source

```
API: https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json
Source: NOAA Space Weather Prediction Center
Auth: None required (FREE)
Format: JSON array of [timestamp, kp, a_running, station_count]
```

### Alert Logic

```javascript
// Only check users if Kp is high enough for Ireland
if (kpIndex < 4 && !force) {
  return; // Skip - too low for Ireland
}

// Don't spam - 6 hour cooldown per Kp level
if (hasRecentAlert(`kp-${Math.floor(kpIndex)}`)) {
  return; // Already alerted for this Kp level
}
```

### API Endpoints

```bash
# Preview current conditions
GET /api/aurora-alert?lat=53.35&lon=-6.26

# Send to specific chat
POST /api/aurora-alert
Content-Type: application/json
{
  "chatId": "444081216",
  "force": true
}

# Batch send to all users
GET /api/aurora-alert/batch-test?force=true
```

---

## 5. News Digest Alert

### Purpose
Sends a curated news and cryptocurrency market digest at user-configured times throughout the day.

### Trigger
- **Timer:** Runs every hour on `:00` and `:30` — checks against each user's configured delivery times
- **Manual:** `POST /api/news-digest`

### File Location
```
backend/src/functions/NewsDigestAlert.js
```

### Dependencies
- `../utils/NewsSources.js` - News feeds and crypto data sources

### Message Contents

```
📰 News Digest

📈 Markets:
   BTC: $67,234 (+2.3%)
   ETH: $3,456 (+1.1%)
   Gold: $2,341 (-0.2%)
   S&P 500: 5,234 (+0.5%)

😨 Fear & Greed Index: 72 (Greed)

🗞️ Top Stories:
   • [Headline 1] — Source
   • [Headline 2] — Source
   • [Headline 3] — Source

🔗 Links are clickable in Telegram
```

### User Configuration

Users can set up to **6 delivery times per day**. Times must be on the hour or half-hour (`:00` or `:30`) since the backend timer checks at those intervals.

```
Valid:   07:00, 07:30, 12:00, 18:30
Invalid: 07:15, 12:45 (won't trigger)
```

### Deduplication

A dedup mechanism prevents the same digest from being sent twice for the same time slot.

### API Endpoints

```bash
# Send to specific chat
POST /api/news-digest
Content-Type: application/json
{
  "chatId": "444081216"
}
```

---

## User Location System

### Overview

All alerts use the user's saved primary location from the `UserLocations` table.

### File Location
```
backend/src/utils/UserLocationHelper.js
```

### Functions

```javascript
// Get user's primary location
const location = await getUserLocation(userId, context);
// Returns: { latitude, longitude, locationName, country }

// Get all user locations
const locations = await getAllUserLocations(userId, context);
```

### Location Priority

1. Location marked as `isPrimary = true`
2. First location with `alertsEnabled = true`
3. First location in list
4. Default: Dublin (53.3498, -6.2603)

### Database Schema

```
Table: UserLocations
PartitionKey: userId
RowKey: locationName

Fields:
- locationName: string
- country: string (ISO code)
- latitude: number
- longitude: number
- isPrimary: boolean
- alertsEnabled: boolean
- minTemp: number
- maxTemp: number
```

---

## Telegram Bot

### Bot Details
- **Name:** Weather Alert Dublin
- **Username:** @WeatherAlertDublinBot
- **Token Env:** `TELEGRAM_BOT_TOKEN`

### Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Register and get Chat ID |
| `/stop` | Unsubscribe from alerts |
| `/status` | Check subscription status |
| `/test` | Send test message |
| `/help` | Show available commands |

### File Location
```
backend/src/functions/TelegramWebhook.js
```

### Message Formatting

All messages use Telegram Markdown:
- `*bold*` for headings
- `_italic_` for descriptions
- Emojis for visual hierarchy

---

## User Preferences

### Database Schema

```
Table: UserPreferences
PartitionKey: "preferences"
RowKey: userId

Fields:
- telegramEnabled: boolean
- telegramChatId: string
- alertTypes: {
    dailyForecast: boolean,
    weatherWarnings: boolean,
    temperatureAlerts: boolean,
    stargazingAlerts: boolean,
    auroraAlerts: boolean,
    newsDigest: boolean
  }
- stargazingThreshold: number (20-95)
- newsDigestTimes: string[] (e.g. ["07:00", "12:00", "18:30"])
- morningForecastTime: string ("HH:MM")
- quietHoursEnabled: boolean
- quietHoursStart: string
- quietHoursEnd: string
```

### Settings Page

Users configure preferences at `/settings`:
- Enable/disable Telegram
- Set Chat ID
- Toggle alert types
- Set stargazing threshold (with SkyScore info tooltip)
- Configure News Digest delivery times (up to 6)
- Set alert location
- Configure quiet hours

---

## Batch Processing

### How It Works

Each alert function has a batch processor that:

1. Queries `UserPreferences` for eligible users
2. Filters by:
   - `telegramEnabled = true`
   - Relevant `alertType` enabled
3. Fetches user's location from `UserLocations`
4. Generates personalized alert
5. Checks thresholds (if applicable)
6. Sends via Telegram

### Batch Test Endpoints

```bash
# Daily Forecast
GET /api/daily-forecast/batch-test?force=true

# Tonight's Sky
GET /api/tonights-sky/batch-test?force=true

# Weather Warning
GET /api/weather-warning/batch-test?force=true

# Aurora Alert
GET /api/aurora-alert/batch-test?force=true
```

### Response Format

```json
{
  "success": true,
  "totalUsers": 10,
  "processed": 8,
  "sent": 5,
  "skipped": 3,
  "errors": [],
  "users": [
    { "userId": "user123", "status": "sent" },
    { "userId": "user456", "status": "below_threshold" },
    { "userId": "user789", "status": "no_chatId" }
  ]
}
```

---

## Environment Variables

```bash
# Required
OPENWEATHER_API_KEY=xxx              # OpenWeather One Call 3.0
TELEGRAM_BOT_TOKEN=xxx               # Telegram Bot API
AzureWebJobsStorage=xxx              # Functions runtime storage
AZURE_STORAGE_CONNECTION_STRING=xxx   # Azure Table Storage connection

# Location & Search
GOOGLE_API_KEY=xxx                   # Google Places autocomplete

# Astronomy
N2YO_API_KEY=xxx                     # ISS pass data (for Tonight's Sky)

# Database (Azure SQL)
SQL_SERVER=xxx                       # Azure SQL server
SQL_DATABASE=xxx                     # Azure SQL database name
SQL_USER=xxx                         # Azure SQL username
SQL_PASSWORD=xxx                     # Azure SQL password

# WhatsApp (optional)
TWILIO_ACCOUNT_SID=xxx               # Twilio account
TWILIO_AUTH_TOKEN=xxx                # Twilio auth
TWILIO_WHATSAPP_FROM=xxx             # Sender number
```

---

## File Structure

```
backend/src/
├── functions/
│   ├── Alerts/
│   │   ├── DailyForecastAlert.js      # Morning briefing
│   │   ├── TonightsSkyAlert.js        # Stargazing alert
│   │   ├── WeatherWarningAlert.js     # Met Éireann warnings
│   │   ├── AuroraAlert.js             # Northern lights
│   │   ├── NewsDigestAlert.js         # News & crypto digest
│   │   ├── CheckAlertsAndNotify.js    # Legacy temp alerts
│   │   └── ComputeAuroraScore.js      # Aurora score HTTP endpoint
│   ├── Bot/
│   │   ├── TelegramWebhook.js         # Bot command handler
│   │   └── SendTelegramAlert.js       # Message delivery utility
│   └── Users/
│       ├── SaveUserLocation.js        # Create/update location
│       ├── GetUserLocations.js        # List user locations
│       ├── DeleteUserLocation.js      # Remove location
│       └── UpdatePreferences.js       # Save alert preferences
│
├── scoring/
│   ├── SkyScore.js                    # Stargazing score
│   └── AuroraScore.js                 # Aurora score
│
├── astronomy/
│   ├── VisiblePlanets.js              # Planet visibility
│   ├── ISSPasses.js                   # ISS tracking
│   └── MeteorShowers.js              # Meteor calendar
│
├── utils/
│   ├── MeteoAlarm.js                  # Weather warning parser
│   ├── UserLocationHelper.js          # Primary location lookup
│   ├── IntentDetector.js              # NLP for bot commands
│   └── NewsSources.js                 # News & crypto data sources
│
└── database/
    └── connection.js                  # Azure SQL connection helper
```

---

## Timer Schedule Summary

| Alert | Cron Expression | UTC Time | Local (Ireland) |
|-------|-----------------|----------|-----------------|
| Daily Forecast | `0 0 7 * * *` | 07:00 | 07:00/08:00 |
| Tonight's Sky | `0 0 18 * * *` | 18:00 | 18:00/19:00 |
| Weather Warning | `0 */30 * * * *` | Every 30 min | Every 30 min |
| Aurora Alert | `0 0 * * * *` | Every hour | Every hour |
| News Digest | Configurable | User-set times | Up to 6x/day |
| Legacy Temp Alerts | `0 0 * * * *` | Every hour | Every hour |

> Note: Ireland is UTC+0 in winter, UTC+1 in summer (IST)

---

## Testing

### Manual Testing

```bash
# Test Daily Forecast
curl -X POST "https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api/daily-forecast" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "YOUR_CHAT_ID", "locationName": "Dublin"}'

# Test Tonight's Sky
curl -X POST "https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api/tonights-sky" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "YOUR_CHAT_ID", "force": true}'

# Test Weather Warning
curl -X POST "https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api/weather-warning" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "YOUR_CHAT_ID"}'

# Test Aurora Alert
curl -X POST "https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api/aurora-alert" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "YOUR_CHAT_ID", "force": true}'

# Test News Digest
curl -X POST "https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api/news-digest" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "YOUR_CHAT_ID"}'
```

### Check Logs

```bash
# Azure Functions logs
az functionapp log show --name weather-alert-backend --resource-group your-rg

# Or view in Azure Portal:
# Function App → Functions → [function] → Monitor
```

---

## Troubleshooting

### Alert Not Sending

1. **Check preferences:** Is `telegramEnabled = true`?
2. **Check alert type:** Is the specific alert enabled?
3. **Check Chat ID:** Is it correct in preferences?
4. **Check threshold:** Is SkyScore >= user's threshold?
5. **Check logs:** Any errors in Azure Function logs?

### Telegram Test Fails

1. Have you started the bot? Send `/start` first
2. Is Chat ID correct? Bot replies with your ID
3. Is `TELEGRAM_BOT_TOKEN` set in Azure?

### Weather Data Missing

1. Is `OPENWEATHER_API_KEY` set?
2. Is the API key valid? (One Call 3.0 subscription)
3. Are coordinates valid?

### ISS Passes Empty

1. Is `N2YO_API_KEY` set?
2. Check N2YO free tier limits (300 calls/hr)
3. Verify API key is correct

### News Digest Not Sending

1. Is `alertTypes.newsDigest` enabled?
2. Are delivery times set on `:00` or `:30`?
3. Check deduplication — already sent for this time slot?

---

## Future Enhancements

- [ ] Rain start/stop alerts
- [ ] Temperature threshold alerts (beyond legacy)
- [ ] Multiple locations per alert
- [ ] Push notifications (web/mobile)
- [ ] Alert history page
- [ ] Custom RSS feeds for News Digest
- [ ] Keyword alerts ("Notify me when X is mentioned")
- [ ] Category toggles for News Digest sections
- [ ] AI-generated summaries for news articles