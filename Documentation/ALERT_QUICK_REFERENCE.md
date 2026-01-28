# Alert System - Quick Reference

## Alert Schedule

| Alert | When | Condition |
|-------|------|-----------|
| 🌅 Daily Forecast | 7am UTC | Always (if enabled) |
| 🌙 Tonight's Sky | 6pm UTC | If SkyScore ≥ threshold |
| ⚠️ Weather Warning | Every 30min | If new Yellow/Orange/Red |
| 🌌 Aurora | Every hour | If Kp ≥ 4 |

---

## Test Commands

```bash
# Daily Forecast
curl -X POST "https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api/daily-forecast" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "444081216"}'

# Tonight's Sky (force send)
curl -X POST "https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api/tonights-sky" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "444081216", "force": true}'

# Weather Warning
curl "https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api/weather-warning"

# Aurora
curl -X POST "https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api/aurora-alert" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "444081216", "force": true}'
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
│   ├── DailyForecastAlert.js     ← Morning briefing
│   ├── TonightsSkyAlert.js       ← Stargazing
│   ├── WeatherWarningAlert.js    ← Met Éireann
│   ├── AuroraAlert.js            ← Northern lights
│   └── TelegramWebhook.js        ← Bot commands
├── scoring/
│   ├── SkyScore.js               ← Stargazing algorithm
│   └── AuroraScore.js            ← Aurora algorithm
├── astronomy/
│   ├── VisiblePlanets.js         ← FREE API
│   ├── ISSPasses.js              ← N2YO API
│   └── MeteorShowers.js          ← Static data
└── utils/
    ├── MeteoAlarm.js             ← FREE API
    └── UserLocationHelper.js     ← Location lookup
```

---

## Environment Variables

```
OPENWEATHER_API_KEY     ← Required
TELEGRAM_BOT_TOKEN      ← Required
AzureWebJobsStorage     ← Required
N2YO_API_KEY           ← For ISS passes
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
    "auroraAlerts": true
  },
  "stargazingThreshold": 65
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