# 📡 API Documentation

Complete reference for the OmniAlert Weather System backend APIs.

---

## Base URLs

| Environment | URL |
|-------------|-----|
| **Production** | `https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api` |
| **Local Development** | `http://localhost:7071/api` |

---

## Authentication

| Type | Status |
|------|--------|
| Current | Anonymous (no auth required) |
| Planned | Azure Entra External ID bearer tokens |

---

## Common Headers

**All Requests:**
```
Content-Type: application/json
```

**All Responses:**
```
Content-Type: application/json
Access-Control-Allow-Origin: *
```

---

## Response Format

### Success Response
```json
{
  "data": { ... },
  "message": "Success message (optional)"
}
```

### Error Response
```json
{
  "error": "Error description",
  "details": "Additional details (optional)"
}
```

---

# 🌤️ Weather APIs

## GET /api/GetWeatherData

**Recommended endpoint** - Returns all weather data in a single call.

### Description
Fetches current conditions, hourly forecast (48h), daily forecast (7 days), air quality, and active alerts. Uses OpenWeather One Call API 3.0.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | number | Yes | Latitude (-90 to 90) |
| `lon` | number | Yes | Longitude (-180 to 180) |

### Example Request
```bash
curl "https://weather-alert-backend.../api/GetWeatherData?lat=53.3498&lon=-6.2603"
```

### Success Response (200)
```json
{
  "location": {
    "lat": 53.3498,
    "lon": -6.2603
  },
  "current": {
    "temp": 12.5,
    "feelsLike": 10.8,
    "humidity": 76,
    "pressure": 1015,
    "visibility": 10000,
    "clouds": 40,
    "windSpeed": 5.2,
    "windDeg": 230,
    "windGust": 8.1,
    "condition": "Clouds",
    "description": "scattered clouds",
    "icon": "03d",
    "uvi": 2.5,
    "dewPoint": 8.2,
    "dt": "2026-02-04T12:00:00.000Z",
    "sunrise": "2026-02-04T08:05:00.000Z",
    "sunset": "2026-02-04T17:23:00.000Z",
    "timezone": "Europe/Dublin"
  },
  "hourly": [
    {
      "dt": "2026-02-04T13:00:00.000Z",
      "temp": 12.8,
      "feelsLike": 11.2,
      "humidity": 74,
      "clouds": 45,
      "windSpeed": 5.5,
      "windGust": 8.5,
      "pop": 0.1,
      "rain": 0,
      "snow": 0,
      "condition": "Clouds",
      "description": "scattered clouds",
      "icon": "03d"
    }
    // ... 47 more hours
  ],
  "daily": [
    {
      "dt": "2026-02-04T12:00:00.000Z",
      "tempMin": 8.2,
      "tempMax": 13.5,
      "humidity": 78,
      "pop": 0.2,
      "rain": 0,
      "snow": 0,
      "condition": "Clouds",
      "description": "overcast clouds",
      "icon": "04d",
      "uvi": 2.8,
      "sunrise": "2026-02-04T08:05:00.000Z",
      "sunset": "2026-02-04T17:23:00.000Z",
      "moonrise": "2026-02-04T10:30:00.000Z",
      "moonset": "2026-02-04T23:45:00.000Z",
      "moonPhase": 0.25
    }
    // ... 6 more days
  ],
  "airQuality": {
    "aqi": 2,
    "aqiLabel": "Fair",
    "components": {
      "co": 233.65,
      "no": 0.42,
      "no2": 12.58,
      "o3": 45.23,
      "so2": 2.15,
      "pm2_5": 8.45,
      "pm10": 12.34,
      "nh3": 1.23
    }
  },
  "alerts": [
    {
      "event": "Wind Warning",
      "sender": "Met Éireann",
      "start": "2026-02-04T18:00:00.000Z",
      "end": "2026-02-05T06:00:00.000Z",
      "description": "Southwest winds of 50 to 65 km/h with gusts of 90 to 110 km/h.",
      "tags": ["Wind"]
    }
  ]
}
```

### Error Responses

**400 Bad Request** - Missing parameters
```json
{
  "error": "lat and lon parameters required"
}
```

**500 Internal Server Error** - API failure
```json
{
  "error": "Failed to fetch weather data",
  "message": "OpenWeather API error"
}
```

---

## GET /api/GetWeather

Legacy endpoint for current weather. Supports both city name and coordinates.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `city` | string | Yes* | City name |
| `country` | string | No | ISO country code (e.g., "IE") |
| `lat` | number | Yes* | Latitude (preferred) |
| `lon` | number | Yes* | Longitude (preferred) |

*Either `city` or `lat`/`lon` required. Coordinates take priority.

### Example Requests
```bash
# By city name
curl "https://.../api/GetWeather?city=Dublin&country=IE"

# By coordinates (recommended)
curl "https://.../api/GetWeather?lat=53.3498&lon=-6.2603"
```

### Success Response (200)
```json
{
  "location": {
    "name": "Dublin",
    "country": "IE",
    "lat": 53.3498,
    "lon": -6.2603
  },
  "weather": {
    "temp": 12.5,
    "feelsLike": 10.8,
    "tempMin": 10.2,
    "tempMax": 14.1,
    "humidity": 76,
    "pressure": 1015,
    "condition": "Clouds",
    "description": "scattered clouds",
    "icon": "03d"
  },
  "wind": {
    "speed": 5.2,
    "direction": 230,
    "gust": 8.1
  },
  "visibility": 10000,
  "clouds": 40,
  "airQuality": {
    "aqi": 2,
    "label": "Fair",
    "pm25": 8.45,
    "pm10": 12.34
  },
  "timestamp": "2026-02-04T12:00:00.000Z"
}
```

### Error Responses

**400 Bad Request**
```json
{
  "error": "City parameter is required"
}
```

**404 Not Found**
```json
{
  "error": "City not found"
}
```

---

## GET /api/GetForecast

Returns 7-day daily and 48-hour hourly forecasts.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | number | Yes* | Latitude |
| `lon` | number | Yes* | Longitude |
| `city` | string | Yes* | City name (fallback) |
| `country` | string | No | ISO country code |

### Example Request
```bash
curl "https://.../api/GetForecast?lat=53.3498&lon=-6.2603"
```

### Success Response (200)
```json
{
  "location": {
    "lat": 53.3498,
    "lon": -6.2603
  },
  "daily": [
    {
      "date": "2026-02-04",
      "tempHigh": 13.5,
      "tempLow": 8.2,
      "humidity": 78,
      "condition": "Clouds",
      "description": "overcast clouds",
      "icon": "04d",
      "pop": 0.2,
      "rain": 0,
      "snow": 0,
      "uvi": 2.8
    }
    // ... 6 more days
  ],
  "hourly": [
    {
      "time": "2026-02-04T13:00:00.000Z",
      "temp": 12.8,
      "feelsLike": 11.2,
      "humidity": 74,
      "condition": "Clouds",
      "description": "scattered clouds",
      "icon": "03d",
      "pop": 0.1,
      "windSpeed": 5.5,
      "windGust": 8.5
    }
    // ... 47 more hours
  ]
}
```

---

## GET /api/SearchLocations

Location autocomplete using Google Places API.

### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | Search text (min 2 chars) |
| `limit` | number | No | 6 | Max results (1-10) |

### Example Request
```bash
curl "https://.../api/SearchLocations?query=Dub&limit=5"
```

### Success Response (200)
```json
{
  "locations": [
    {
      "name": "Dublin",
      "country": "IE",
      "state": "Leinster",
      "lat": 53.3498,
      "lon": -6.2603,
      "displayName": "Dublin, Ireland",
      "placeId": "ChIJL6wn6oAOZ0gRoHExl6nHAAo",
      "id": "Dublin-Leinster-IE-53.35"
    },
    {
      "name": "Dubai",
      "country": "AE",
      "state": "Dubai",
      "lat": 25.2048,
      "lon": 55.2708,
      "displayName": "Dubai, United Arab Emirates",
      "placeId": "ChIJRcbZaklDXz4RYlEphFBu5r0",
      "id": "Dubai-Dubai-AE-25.20"
    }
  ]
}
```

### Error Responses

**400 Bad Request**
```json
{
  "error": "Query parameter required (minimum 2 characters)"
}
```

---

# 📍 Location APIs

## GET /api/GetUserLocations

Retrieves all saved locations for a user.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | User identifier |

### Example Request
```bash
curl "https://.../api/GetUserLocations?userId=user123"
```

### Success Response (200)
```json
{
  "userId": "user123",
  "locations": [
    {
      "locationName": "Dublin",
      "country": "IE",
      "latitude": 53.3498,
      "longitude": -6.2603,
      "alertsEnabled": true,
      "minTemp": 5,
      "maxTemp": 25,
      "isPrimary": true,
      "createdAt": "2026-01-15T10:30:00.000Z"
    },
    {
      "locationName": "London",
      "country": "GB",
      "latitude": 51.5074,
      "longitude": -0.1278,
      "alertsEnabled": true,
      "minTemp": 0,
      "maxTemp": 30,
      "isPrimary": false,
      "createdAt": "2026-01-20T14:22:00.000Z"
    }
  ]
}
```

### Error Responses

**400 Bad Request**
```json
{
  "error": "userId parameter is required"
}
```

---

## POST /api/SaveUserLocation

Creates or updates a user's saved location.

### Request Body
```json
{
  "userId": "user123",
  "locationName": "Dublin",
  "country": "IE",
  "latitude": 53.3498,
  "longitude": -6.2603,
  "alertsEnabled": true,
  "minTemp": 5,
  "maxTemp": 25,
  "isPrimary": false
}
```

### Field Descriptions
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `userId` | string | Yes | - | User identifier |
| `locationName` | string | Yes | - | City/location name |
| `country` | string | No | "" | ISO country code |
| `latitude` | number | Yes | - | Latitude coordinate |
| `longitude` | number | Yes | - | Longitude coordinate |
| `alertsEnabled` | boolean | No | true | Enable temperature alerts |
| `minTemp` | number | No | 0 | Minimum temp threshold (°C) |
| `maxTemp` | number | No | 30 | Maximum temp threshold (°C) |
| `isPrimary` | boolean | No | false | Primary location flag |

### Example Request
```bash
curl -X POST "https://.../api/SaveUserLocation" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "locationName": "Cork",
    "country": "IE",
    "latitude": 51.8985,
    "longitude": -8.4756,
    "alertsEnabled": true,
    "minTemp": 5,
    "maxTemp": 25
  }'
```

### Success Response (200)
```json
{
  "message": "Location saved successfully",
  "location": {
    "userId": "user123",
    "locationName": "Cork",
    "country": "IE",
    "latitude": 51.8985,
    "longitude": -8.4756,
    "alertsEnabled": true,
    "minTemp": 5,
    "maxTemp": 25,
    "createdAt": "2026-02-04T12:00:00.000Z"
  }
}
```

### Error Responses

**400 Bad Request**
```json
{
  "error": "userId and locationName are required"
}
```

**400 Bad Request** - Missing coordinates
```json
{
  "error": "latitude and longitude are required"
}
```

---

## DELETE /api/DeleteUserLocation

Removes a saved location.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | User identifier |
| `locationName` | string | Yes | Name of location to delete |

### Example Request
```bash
curl -X DELETE "https://.../api/DeleteUserLocation?userId=user123&locationName=Cork"
```

### Success Response (200)
```json
{
  "message": "Location deleted successfully",
  "userId": "user123",
  "locationName": "Cork"
}
```

### Error Responses

**400 Bad Request**
```json
{
  "error": "userId and locationName parameters are required"
}
```

**404 Not Found**
```json
{
  "error": "Location not found"
}
```

---

# 🔔 Alert APIs

## GET /api/CheckAlerts

Manually triggers an alert check for all users with alerts enabled.

### Example Request
```bash
curl "https://.../api/CheckAlerts"
```

### Success Response (200)
```json
{
  "message": "Alert check completed",
  "locationsChecked": 15,
  "alertsSent": 3,
  "timestamp": "2026-02-04T12:00:00.000Z"
}
```

---

## POST /api/daily-forecast

Sends a daily weather forecast alert. Usually triggered by timer at 7:00 AM.

### Request Body
```json
{
  "chatId": "444081216",
  "userId": "user123",
  "force": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chatId` | string | No | Telegram chat ID (for single user) |
| `userId` | string | No | User ID (for single user) |
| `force` | boolean | No | Bypass cooldown checks |

### Example Request
```bash
# Send to specific Telegram chat
curl -X POST "https://.../api/daily-forecast" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "444081216", "force": true}'
```

### Success Response (200)
```json
{
  "success": true,
  "messageSent": true,
  "location": "Dublin",
  "summary": {
    "temp": 12,
    "condition": "Partly Cloudy",
    "high": 14,
    "low": 8
  }
}
```

### Batch Endpoint
```bash
# Send to all subscribed users
curl "https://.../api/daily-forecast/batch-test?force=true"
```

---

## POST /api/tonights-sky

Sends stargazing condition alerts. Usually triggered by timer at 6:00 PM.

### Request Body
```json
{
  "chatId": "444081216",
  "force": false
}
```

### Success Response (200)
```json
{
  "success": true,
  "messageSent": true,
  "skyScore": 72,
  "rating": "Good",
  "conditions": {
    "cloudCover": 15,
    "moonPhase": 0.25,
    "isDark": true
  }
}
```

---

## POST /api/weather-warning

Sends Met Éireann weather warnings (Yellow, Orange, Red).

### Request Body
```json
{
  "chatId": "444081216",
  "force": false
}
```

### Success Response (200)
```json
{
  "success": true,
  "warningsFound": 2,
  "warnings": [
    {
      "type": "Wind",
      "level": "Yellow",
      "headline": "Wind Warning for Ireland",
      "start": "2026-02-04T18:00:00.000Z",
      "end": "2026-02-05T06:00:00.000Z"
    }
  ]
}
```

---

## POST /api/aurora-alert

Sends Northern Lights alerts when Kp index is favorable.

### Request Body
```json
{
  "chatId": "444081216",
  "lat": 53.3498,
  "lon": -6.2603,
  "locationName": "Dublin",
  "force": false
}
```

### Success Response (200)
```json
{
  "success": true,
  "messageSent": true,
  "shouldAlert": true,
  "score": 72,
  "kpIndex": 5,
  "rating": "Good",
  "conditions": {
    "cloudCover": 20,
    "isDark": true,
    "minKpNeeded": 5
  }
}
```

---

# 📊 Scoring APIs

## GET /api/aurora-score

Computes aurora/Northern Lights viewing score.

### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lat` | number | Yes | - | Latitude |
| `lon` | number | Yes | - | Longitude |
| `windows` | boolean | No | true | Include viewing windows |
| `aiData` | boolean | No | false | Include AI-formatted data |

### Example Request
```bash
curl "https://.../api/aurora-score?lat=53.3498&lon=-6.2603"
```

### Success Response (200)
```json
{
  "location": {
    "lat": 53.3498,
    "lon": -6.2603
  },
  "timestamp": "2026-02-04T22:00:00.000Z",
  "current": {
    "score": 72,
    "rating": "Good",
    "factors": {
      "kpIndex": {
        "value": 5,
        "minNeeded": 5,
        "difference": 0,
        "level": "Minor Storm",
        "description": "Aurora visible at 55°N",
        "penalty": 0,
        "maxPenalty": 40
      },
      "darkness": {
        "sunAltitude": -25,
        "twilightPhase": "astronomical",
        "isDark": true,
        "penalty": 0,
        "maxPenalty": 25
      },
      "cloudCover": {
        "value": 20,
        "penalty": 6,
        "maxPenalty": 25
      },
      "viewing": {
        "penalty": 2,
        "maxPenalty": 10
      }
    },
    "reasons": [
      "Kp 5 - aurora possible at your latitude",
      "Astronomically dark - ideal for aurora viewing",
      "Clear skies (20% clouds)"
    ],
    "recommendation": "Good chance of aurora. Find a spot away from light pollution with a view north."
  },
  "kpIndex": {
    "current": 5,
    "forecast3hr": 5,
    "forecast6hr": 4,
    "forecast24hr": [5, 5, 4, 4, 3, 3, 3, 3]
  },
  "windows": [
    {
      "start": "2026-02-04T22:00:00.000Z",
      "end": "2026-02-05T05:30:00.000Z",
      "durationMinutes": 450,
      "avgScore": 68,
      "maxScore": 75,
      "maxKp": 5
    }
  ]
}
```

### Kp Index Reference
| Kp | Level | Ireland Visibility |
|----|-------|-------------------|
| 0-2 | Quiet | ❌ Not visible |
| 3 | Unsettled | ❌ Not visible |
| 4 | Active | ⚠️ Unlikely |
| 5 | Minor Storm (G1) | ✅ Possible |
| 6 | Moderate Storm (G2) | ✅ Good chance |
| 7+ | Strong Storm (G3+) | ✅ Very likely |

---

# 🤖 Bot APIs

## POST /api/telegram-webhook

Webhook endpoint for Telegram bot commands.

### Request Body (from Telegram)
```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 1,
    "from": {
      "id": 444081216,
      "first_name": "John",
      "username": "johndoe"
    },
    "chat": {
      "id": 444081216,
      "type": "private"
    },
    "date": 1707048000,
    "text": "/weather Dublin"
  }
}
```

### Supported Commands
| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/help` | List commands |
| `/weather [location]` | Current weather |
| `/forecast [location]` | 7-day forecast |
| `/aurora` | Aurora conditions |
| `/sky` | Stargazing score |
| `/locations` | List saved locations |
| `/settings` | Notification preferences |

### Success Response (200)
```json
{
  "success": true,
  "command": "weather",
  "responseSent": true
}
```

---

## POST /api/whatsapp-webhook

Webhook endpoint for Twilio WhatsApp messages.

### Request Body (from Twilio)
```
Body=What's the weather?
From=whatsapp:+353851234567
To=whatsapp:+14155238886
```

### Supported Intents
| Intent | Example Messages |
|--------|-----------------|
| `weather_now` | "What's the weather?", "Current conditions" |
| `weather_forecast` | "Weekly forecast", "Tomorrow's weather" |
| `sky_score` | "Good for stargazing?", "Can I see stars?" |
| `aurora_score` | "Northern lights?", "Aurora tonight?" |
| `outdoor_score` | "Good for hiking?", "Should I cycle?" |
| `list_locations` | "My locations", "Show saved places" |
| `help` | "Help", "What can you do?" |

### Success Response (200)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Current weather in Dublin: 12°C, Partly Cloudy...</Message>
</Response>
```

---

# 📋 Timer Triggers

These functions run automatically on a schedule.

| Function | Cron Expression | Schedule | Description |
|----------|-----------------|----------|-------------|
| `CheckAlertsAndNotify` | `0 0 * * * *` | Every hour | Temperature threshold alerts |
| `DailyForecastAlert` | `0 0 7 * * *` | 7:00 AM UTC | Morning weather briefing |
| `TonightsSkyAlert` | `0 0 18 * * *` | 6:00 PM UTC | Evening stargazing alert |
| `WeatherWarningAlert` | `0 */30 * * * *` | Every 30 min | Met Éireann warnings |
| `AuroraAlert` | `0 0 * * * *` | Every hour | Aurora/Kp index monitoring |

---

# ⚠️ Error Codes

| HTTP Code | Meaning | Common Causes |
|-----------|---------|---------------|
| 200 | Success | Request completed |
| 400 | Bad Request | Missing/invalid parameters |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal error, API failure |
| 503 | Service Unavailable | External API down |

---

# 🔒 Rate Limits

| Service | Limit | Notes |
|---------|-------|-------|
| OpenWeather | 1,000 calls/day | Free tier |
| Google Places | $200 credit/month | Then pay-per-use |
| Azure Functions | 1M executions/month | Free tier |

### Caching Strategy

Weather data is cached for 10 minutes to minimize API calls:
- Frontend: `weatherCache.js` with localStorage persistence
- Backend: In-memory cache per function instance

---

# 📝 Changelog

| Version | Date | Changes |
|---------|------|---------|
| 3.0.0 | 2026-02 | Alert-first redesign, scoring engine |
| 2.0.0 | 2026-01 | Dashboard widgets, Windy maps |
| 1.0.0 | 2025-12 | Initial release |

---

# 🔗 Related Documentation

- [ALERT_SYSTEM.md](./ALERT_SYSTEM.md) - Detailed alert configuration
- [PHASE_3A_ARCHITECTURE.md](./PHASE_3A_ARCHITECTURE.md) - Scoring engine details

---

**Last Updated:** February 4, 2026