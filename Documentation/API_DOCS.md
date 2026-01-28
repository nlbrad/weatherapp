# API Documentation

Complete reference for Weather Alert System backend APIs.

## Base URLs

**Local Development:**
```
http://localhost:7071/api
```

**Production:**
```
https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api
```

## Authentication

Currently: **None** (anonymous access)

Future: Bearer token with Azure AD B2C

## Common Headers

**All requests:**
```
Content-Type: application/json
```

**All responses include:**
```
Access-Control-Allow-Origin: *
Content-Type: application/json
```

---

## Weather Endpoints

### Get Weather

Fetch current weather conditions for a city.

**Endpoint:** `GET /getweather`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `city` | string | Yes | City name (e.g., "Dublin") |
| `country` | string | No | ISO country code (e.g., "IE") |

**Example:**
```bash
curl "https://weather-alert-backend-xxx.azurewebsites.net/api/getweather?city=Dublin&country=IE"
```

---

### Get Weather Data (Full)

Fetch comprehensive weather data including hourly/daily forecast.

**Endpoint:** `GET /getweatherdata`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | number | Yes | Latitude |
| `lon` | number | Yes | Longitude |

**Example:**
```bash
curl "https://weather-alert-backend-xxx.azurewebsites.net/api/getweatherdata?lat=53.35&lon=-6.26"
```

---

### Search Locations

Autocomplete search for locations.

**Endpoint:** `GET /searchlocations`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search term (min 2 chars) |
| `limit` | number | No | Max results (default: 6) |

**Example:**
```bash
curl "https://weather-alert-backend-xxx.azurewebsites.net/api/searchlocations?query=Dublin&limit=5"
```

---

## Location Endpoints

### Get User Locations

Retrieve all saved locations for a user.

**Endpoint:** `GET /getuserlocations`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | User identifier |

**Example:**
```bash
curl "https://weather-alert-backend-xxx.azurewebsites.net/api/getuserlocations?userId=user123"
```

**Response:**
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
      "isPrimary": true,
      "minTemp": 0,
      "maxTemp": 30
    }
  ]
}
```

---

### Save User Location

Save or update a user's location.

**Endpoint:** `POST /saveuserlocation`

**Request Body:**
```json
{
  "userId": "user123",
  "locationName": "Dublin",
  "country": "IE",
  "latitude": 53.3498,
  "longitude": -6.2603,
  "alertsEnabled": true,
  "isPrimary": true,
  "minTemp": 0,
  "maxTemp": 30
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | User identifier |
| `locationName` | string | Yes | City name |
| `country` | string | No | ISO country code |
| `latitude` | number | Yes | Latitude |
| `longitude` | number | Yes | Longitude |
| `alertsEnabled` | boolean | No | Enable alerts (default: true) |
| `isPrimary` | boolean | No | Primary location for alerts |
| `minTemp` | number | No | Min temp threshold °C |
| `maxTemp` | number | No | Max temp threshold °C |

---

### Delete User Location

**Endpoint:** `DELETE /deleteuserlocation`

**Query Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| `userId` | string | Yes |
| `locationName` | string | Yes |

---

## Preferences Endpoints

### Get User Preferences

**Endpoint:** `GET /userpreferences`

**Query Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| `userId` | string | Yes |

**Response:**
```json
{
  "userId": "user123",
  "preferences": {
    "telegramEnabled": true,
    "telegramChatId": "444081216",
    "alertTypes": {
      "dailyForecast": true,
      "weatherWarnings": true,
      "temperatureAlerts": false,
      "stargazingAlerts": true,
      "auroraAlerts": true
    },
    "stargazingThreshold": 65,
    "morningForecastTime": "07:00",
    "quietHoursEnabled": false,
    "temperatureUnit": "celsius",
    "windSpeedUnit": "kmh",
    "timeFormat": "24h"
  }
}
```

---

### Save User Preferences

**Endpoint:** `POST /userpreferences`

**Request Body:**
```json
{
  "userId": "user123",
  "preferences": {
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
}
```

---

## Alert Endpoints

### Daily Forecast

Morning weather briefing alert.

**Timer:** Daily at 07:00 UTC

#### Preview
```bash
GET /api/daily-forecast?lat=53.35&lon=-6.26&location=Dublin
```

#### Send to Chat
```bash
POST /api/daily-forecast
Content-Type: application/json

{
  "chatId": "444081216",
  "lat": 53.35,
  "lon": -6.26,
  "locationName": "Dublin"
}
```

#### Batch Send (All Users)
```bash
GET /api/daily-forecast/batch-test?force=true
```

**Response:**
```json
{
  "success": true,
  "processed": 5,
  "sent": 4,
  "skipped": 1,
  "errors": []
}
```

---

### Tonight's Sky

Stargazing conditions alert.

**Timer:** Daily at 18:00 UTC

#### Preview
```bash
GET /api/tonights-sky?lat=53.35&lon=-6.26
```

**Response:**
```json
{
  "skyScore": 78,
  "rating": "Good",
  "moonPhase": "Waning Crescent",
  "moonIllumination": 12,
  "planets": [...],
  "issPasses": [...],
  "meteorShowers": [...],
  "message": "..."
}
```

#### Send to Chat
```bash
POST /api/tonights-sky
Content-Type: application/json

{
  "chatId": "444081216",
  "threshold": 65,
  "force": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `chatId` | string | Telegram chat ID |
| `threshold` | number | Min SkyScore to send (default: 65) |
| `force` | boolean | Send even if below threshold |

#### Batch Send
```bash
GET /api/tonights-sky/batch-test?force=true
```

---

### Weather Warning

Met Éireann severe weather alerts.

**Timer:** Every 30 minutes

#### Preview Current Warnings
```bash
GET /api/weather-warning
```

**Response:**
```json
{
  "warningCount": 2,
  "warnings": [
    {
      "type": "Wind",
      "severity": "Yellow",
      "regions": "Dublin, Wicklow",
      "onset": "2026-01-28T14:00:00Z",
      "expires": "2026-01-29T06:00:00Z"
    }
  ],
  "message": "..."
}
```

#### Send to Chat
```bash
POST /api/weather-warning
Content-Type: application/json

{
  "chatId": "444081216"
}
```

#### Batch Send
```bash
GET /api/weather-warning/batch-test?force=true
```

---

### Aurora Alert

Northern lights visibility alert.

**Timer:** Every hour

#### Preview
```bash
GET /api/aurora-alert?lat=53.35&lon=-6.26
```

**Response:**
```json
{
  "score": 72,
  "rating": "Good",
  "kpIndex": 5,
  "kpLevel": "Minor Storm",
  "cloudCover": 25,
  "isDark": true,
  "shouldAlert": true,
  "message": "..."
}
```

#### Send to Chat
```bash
POST /api/aurora-alert
Content-Type: application/json

{
  "chatId": "444081216",
  "lat": 53.35,
  "lon": -6.26,
  "locationName": "Dublin",
  "force": true
}
```

#### Batch Send
```bash
GET /api/aurora-alert/batch-test?force=true
```

---

## Telegram Endpoints

### Send Telegram Message

Send a message to a Telegram chat.

**Endpoint:** `POST /telegram/send`

**Request Body:**
```json
{
  "chatId": "444081216",
  "message": "Hello from Weather Alert!"
}
```

---

### Telegram Webhook

Handles incoming Telegram bot commands.

**Endpoint:** `POST /telegram/webhook`

This endpoint is called by Telegram when users interact with the bot.

**Supported Commands:**
| Command | Description |
|---------|-------------|
| `/start` | Register and get Chat ID |
| `/stop` | Unsubscribe from alerts |
| `/status` | Check subscription status |
| `/test` | Send test message |
| `/help` | Show available commands |

---

## Score Endpoints

### Compute Sky Score

Calculate stargazing conditions score.

**Endpoint:** `GET /sky-score`

**Query Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| `lat` | number | Yes |
| `lon` | number | Yes |

**Response:**
```json
{
  "score": 78,
  "rating": "Good",
  "factors": {
    "cloudCover": { "value": 25, "penalty": 10 },
    "moonPhase": { "value": 0.12, "penalty": 3 },
    "humidity": { "value": 65, "penalty": 5 },
    "wind": { "value": 15, "penalty": 2 }
  },
  "recommendation": "Good conditions for stargazing!"
}
```

---

### Compute Aurora Score

Calculate northern lights visibility score.

**Endpoint:** `GET /aurora-score`

**Query Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| `lat` | number | Yes |
| `lon` | number | Yes |

**Response:**
```json
{
  "score": 65,
  "rating": "Good",
  "kpIndex": 5,
  "factors": {
    "kpIndex": { "value": 5, "needed": 5, "penalty": 0 },
    "cloudCover": { "value": 30, "penalty": 8 },
    "darkness": { "isDark": true, "penalty": 0 }
  }
}
```

---

## Error Responses

All endpoints return consistent error formats:

**400 Bad Request:**
```json
{
  "error": "Missing required parameter: userId"
}
```

**404 Not Found:**
```json
{
  "error": "Location not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to fetch weather data",
  "details": "API rate limit exceeded"
}
```

---

## Rate Limits

| Service | Limit | Notes |
|---------|-------|-------|
| OpenWeather | 1000/day | One Call 3.0 subscription |
| N2YO | 300/hour | Free tier |
| Telegram | 30 msg/sec | Per bot |
| MeteoAlarm | None | Free, public API |
| VisiblePlanets | None | Free, no key |

---

## Environment Variables

```bash
# Required
OPENWEATHER_API_KEY=xxx
TELEGRAM_BOT_TOKEN=xxx
AzureWebJobsStorage=xxx

# Optional
N2YO_API_KEY=xxx
GOOGLE_API_KEY=xxx
```