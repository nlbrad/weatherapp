# Alert System - Quick Reference

## Alert Schedule

| Alert | When | Condition |
|-------|------|-----------|
| 🌅 Daily Forecast | 7am UTC | Always (if enabled) |
| 🌙 Tonight's Sky | 6pm UTC | If SkyScore ≥ threshold |
| ⚠️ Weather Warning | Every 30min | If new Yellow/Orange/Red |
| 🌌 Aurora | Every hour | If Kp ≥ 4 |
| 📰 News Digest | User-set times | Up to 6x/day (on :00/:30) |

---

## Test Commands

```bash
# Daily Forecast
curl -X POST "https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api/daily-forecast" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "YOUR_CHAT_ID"}'

# Tonight's Sky (force send)
curl -X POST "https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api/tonights-sky" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "YOUR_CHAT_ID", "force": true}'

# Weather Warning
curl "https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api/weather-warning"

# Aurora
curl -X POST "https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api/aurora-alert" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "YOUR_CHAT_ID", "force": true}'

# News Digest
curl -X POST "https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api/news-digest" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "YOUR_CHAT_ID"}'
```

---

## Batch Test (All Users)

```bash
# Test all alerts to all enabled users
curl ".../api/daily-forecast/batch-test?force=true"
curl ".../api/tonights-sky/batch-test?force=true"
curl ".../api/weather-warning/batch-test?force=true"
curl ".../api/aurora-alert/batch-test?force=true"
```

---

## Files

```
backend/src/
├── functions/
│   ├── Alerts/
│   │   ├── DailyForecastAlert.js     ← Morning briefing
│   │   ├── TonightsSkyAlert.js       ← Stargazing
│   │   ├── WeatherWarningAlert.js    ← Met Éireann
│   │   ├── AuroraAlert.js            ← Northern lights
│   │   ├── NewsDigestAlert.js        ← News & crypto digest
│   │   ├── CheckAlertsAndNotify.js   ← Legacy temp alerts
│   │   └── ComputeAuroraScore.js     ← Aurora score endpoint
│   ├── Bot/
│   │   ├── TelegramWebhook.js        ← Bot commands
│   │   └── SendTelegramAlert.js      ← Send utility
│   └── Users/
│       ├── SaveUserLocation.js       ← Create/update location
│       ├── GetUserLocations.js       ← List locations
│       ├── DeleteUserLocation.js     ← Remove location
│       └── UpdatePreferences.js      ← Save preferences
├── scoring/
│   ├── SkyScore.js                   ← Stargazing algorithm
│   └── AuroraScore.js                ← Aurora algorithm
├── astronomy/
│   ├── VisiblePlanets.js             ← FREE API
│   ├── ISSPasses.js                  ← N2YO API
│   └── MeteorShowers.js              ← Static data
├── utils/
│   ├── MeteoAlarm.js                 ← FREE API
│   ├── UserLocationHelper.js         ← Location lookup
│   ├── IntentDetector.js             ← NLP for bot
│   └── NewsSources.js                ← News & crypto sources
└── database/
    └── connection.js                 ← Azure SQL helper
```

---

## Environment Variables

```
OPENWEATHER_API_KEY                  ← Required
TELEGRAM_BOT_TOKEN                   ← Required
AzureWebJobsStorage                  ← Required
AZURE_STORAGE_CONNECTION_STRING      ← Required
GOOGLE_API_KEY                       ← Location search
N2YO_API_KEY                         ← ISS passes
SQL_SERVER                           ← Azure SQL
SQL_DATABASE                         ← Azure SQL
SQL_USER                             ← Azure SQL
SQL_PASSWORD                         ← Azure SQL
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `UserPreferences` | Alert settings, Telegram ID |
| `UserLocations` | Saved locations with lat/lon |
| `TelegramUsers` | Bot subscription status |

---

## User Preferences

```json
{
  "telegramEnabled": true,
  "telegramChatId": "444081216",
  "alertTypes": {
    "dailyForecast": true,
    "weatherWarnings": true,
    "stargazingAlerts": true,
    "auroraAlerts": true,
    "newsDigest": true
  },
  "stargazingThreshold": 65,
  "newsDigestTimes": ["07:00", "12:00", "18:30"]
}
```

---

## SkyScore Ratings

| Score | Rating |
|-------|--------|
| 90-100 | Exceptional ✨ |
| 80-89 | Excellent |
| 65-79 | Good |
| 50-64 | Fair |
| 35-49 | Poor |
| 0-34 | Bad |

---

## Kp Index (Aurora)

| Kp | Ireland | Action |
|----|---------|--------|
| 0-3 | ❌ | Not visible |
| 4 | ⚠️ | Unlikely |
| 5 | ✅ | Possible |
| 6+ | ✅✅ | Good chance |

---

## Warning Levels

| Level | Color | Show? |
|-------|-------|-------|
| 1 | 🟢 Green | ❌ No |
| 2 | 🟡 Yellow | ✅ Yes |
| 3 | 🟠 Orange | ✅ Yes |
| 4 | 🔴 Red | ✅ Yes |

---

## Troubleshooting

**Alert not sending?**
1. Is `telegramEnabled: true`?
2. Is the alert type enabled?
3. Is Chat ID correct?
4. Is SkyScore ≥ threshold?

**Telegram test fails?**
1. Send `/start` to bot first
2. Check Chat ID is correct
3. Check `TELEGRAM_BOT_TOKEN` in Azure

**No weather data?**
1. Check `OPENWEATHER_API_KEY`
2. Verify coordinates are valid

**News Digest not sending?**
1. Is `alertTypes.newsDigest` enabled?
2. Are delivery times on `:00` or `:30`?
3. Check dedup — already sent this slot?