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

## Endpoints

### 1. Get Weather

Fetch current weather conditions for a city.

**Endpoint:** `GET /GetWeather`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `city` | string | Yes | City name (e.g., "Dublin") |
| `country` | string | No | ISO country code (e.g., "IE") |

**Example Request:**
```bash
curl "https://weather-alert-backend-xxx.azurewebsites.net/api/getweather?city=Dublin&country=IE"
```

**Success Response (200):**
```json
{
  "location": {
    "name": "Dublin",
    "country": "IE"
  },
  "weather": {
    "temp": 12.5,
    "feelsLike": 10.3,
    "tempMin": 11.0,
    "tempMax": 14.0,
    "humidity": 82,
    "pressure": 1013,
    "condition": "Clouds",
    "description": "broken clouds",
    "icon": "04d"
  },
  "wind": {
    "speed": 4.5,
    "direction": 230
  },
  "timestamp": "2026-01-21T12:00:00.000Z"
}
```

**Error Response (400):**
```json
{
  "error": "City parameter is required"
}
```

**Error Response (500):**
```json
{
  "error": "Failed to fetch weather data",
  "details": "City not found"
}
```

---

### 2. Save User Location

Save or update a location with alert preferences.

**Endpoint:** `POST /SaveUserLocation`

**Request Body:**
```json
{
  "userId": "user123",
  "locationName": "Dublin",
  "country": "IE",
  "alertsEnabled": true,
  "minTemp": 5,
  "maxTemp": 25
}
```

**Field Descriptions:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | User identifier |
| `locationName` | string | Yes | City name |
| `country` | string | No | ISO country code |
| `alertsEnabled` | boolean | No | Enable alerts (default: true) |
| `minTemp` | number | No | Min temperature threshold °C (default: 0) |
| `maxTemp` | number | No | Max temperature threshold °C (default: 30) |

**Example Request:**
```bash
curl -X POST https://weather-alert-backend-xxx.azurewebsites.net/api/saveuserlocation \
  -H "Content-Type: application/json " 
-d '{
"userId": "user123",
"locationName": "London",
"country": "GB",
"alertsEnabled": true,
"minTemp": 10,
"maxTemp": 28
}'

**Success Response (200):**
```json
{
  "message": "Location saved successfully",
  "location": {
    "partitionKey": "user123",
    "rowKey": "London",
    "locationName": "London",
    "country": "GB",
    "alertsEnabled": true,
    "minTemp": 10,
    "maxTemp": 28,
    "createdAt": "2026-01-21T12:00:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "error": "userId and locationName are required"
}
```

**Notes:**
- If location exists, it will be updated (upsert operation)
- PartitionKey = userId, RowKey = locationName
- Combination must be unique

---

### 3. Get User Locations

Retrieve all saved locations for a user.

**Endpoint:** `GET /GetUserLocations`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | User identifier |

**Example Request:**
```bash
curl "https://weather-alert-backend-xxx.azurewebsites.net/api/getuserlocations?userId=user123"
```

**Success Response (200):**
```json
{
  "userId": "user123",
  "locations": [
    {
      "locationName": "Dublin",
      "country": "IE",
      "alertsEnabled": true,
      "minTemp": 5,
      "maxTemp": 25,
      "createdAt": "2026-01-21T10:00:00.000Z"
    },
    {
      "locationName": "London",
      "country": "GB",
      "alertsEnabled": true,
      "minTemp": 10,
      "maxTemp": 28,
      "createdAt": "2026-01-21T11:00:00.000Z"
    }
  ]
}
```

**Empty Result (200):**
```json
{
  "userId": "user123",
  "locations": []
}
```

**Error Response (400):**
```json
{
  "error": "userId parameter is required"
}
```

---

### 4. Check Alerts (Manual Trigger)

Manually trigger alert checking for all locations.

**Endpoint:** `GET /CheckAlerts`

**No Parameters Required**

**Example Request:**
```bash
curl "https://weather-alert-backend-xxx.azurewebsites.net/api/checkalerts"
```

**Success Response (200):**
```json
{
  "message": "Alert check completed"
}
```

**What It Does:**
1. Queries all locations with `alertsEnabled: true`
2. Fetches current weather for each
3. Compares temperature to thresholds
4. Sends WhatsApp alerts if outside range
5. Logs results

**WhatsApp Alert Example:**
🥶 Cold Alert for Dublin!
Current: 3°C
Your minimum: 5°C
Conditions: light rain
Dress warmly!

---

## Timer Trigger (Automatic)

**Function:** `CheckAlertsAndNotify`

**Schedule:** Every hour (cron: `0 0 * * * *`)

**Behavior:** Same as manual check but runs automatically

**Cannot be called directly** - runs on schedule

**View logs:**
- Azure Portal → Function App → Log stream
- Watch for "CheckAlertsAndNotify timer triggered"

---

## Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Missing required parameters |
| 404 | Not Found | Invalid endpoint |
| 500 | Internal Server Error | API failure, database error |
| 503 | Service Unavailable | Function app not running |

---

## Rate Limits

**Azure Functions (Consumption Plan):**
- No hard rate limit
- Scales automatically
- Free tier: 1M executions/month

**OpenWeatherMap API:**
- 1,000 calls/day (free tier)
- 60 calls/minute

**Twilio WhatsApp:**
- No rate limit
- Pay per message (~$0.009)

---

## Data Models

### Location Entity (Table Storage)
```javascript
{
  partitionKey: string,      // User ID (e.g., "user123")
  rowKey: string,            // Location name (e.g., "Dublin")
  locationName: string,      // City name
  country: string,           // ISO country code
  alertsEnabled: boolean,    // Whether to send alerts
  minTemp: number,           // Min temp threshold (°C)
  maxTemp: number,           // Max temp threshold (°C)
  createdAt: string         // ISO timestamp
}
```

### Weather Response
```javascript
{
  location: {
    name: string,            // City name
    country: string          // Country code
  },
  weather: {
    temp: number,            // Current temp (°C)
    feelsLike: number,       // Feels like temp (°C)
    tempMin: number,         // Min temp today
    tempMax: number,         // Max temp today
    humidity: number,        // Humidity %
    pressure: number,        // Pressure hPa
    condition: string,       // Main condition
    description: string,     // Detailed description
    icon: string            // Icon code
  },
  wind: {
    speed: number,           // Wind speed m/s
    direction: number        // Wind direction degrees
  },
  timestamp: string         // ISO timestamp
}
```

---

## Testing

### Integration Tests
```bash
# Test full flow
curl -X POST http://localhost:7071/api/saveuserlocation \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","locationName":"TestCity","country":"US","minTemp":0,"maxTemp":100}'

curl "http://localhost:7071/api/getuserlocations?userId=test"
curl "http://localhost:7071/api/getweather?city=TestCity&country=US"
curl "http://localhost:7071/api/checkalerts"
```

### Load Testing
```bash
# Test concurrent requests
for i in {1..100}; do
  curl "http://localhost:7071/api/getweather?city=Dublin&country=IE" &
done
```

---

## Future API Enhancements

### Planned Endpoints

**Delete Location:**

DELETE /DeleteLocation?userId=user123&locationName=Dublin

**Update Thresholds:**

PATCH /UpdateThresholds
Body: { userId, locationName, minTemp, maxTemp }

**Get Alert History:**

GET /GetAlertHistory?userId=user123&startDate=2026-01-01

**User Registration:**

POST /RegisterUser
Body: { email, phone, preferences }

---

## Webhooks (Future)

**Twilio Webhook for Incoming Messages:**

POST /ReceiveWhatsAppMessage
Body: { From, Body, ... }

For conversational AI feature (Phase 3)

---

## SDK Examples

### JavaScript/Node.js
```javascript
const API_BASE = 'https://weather-alert-backend-xxx.azurewebsites.net/api';

// Get weather
async function getWeather(city, country) {
  const response = await fetch(
    `${API_BASE}/getweather?city=${city}&country=${country}`
  );
  return await response.json();
}

// Save location
async function saveLocation(location) {
  const response = await fetch(`${API_BASE}/saveuserlocation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(location)
  });
  return await response.json();
}

// Get locations
async function getUserLocations(userId) {
  const response = await fetch(
    `${API_BASE}/getuserlocations?userId=${userId}`
  );
  return await response.json();
}
```

### Python
```python
import requests

API_BASE = 'https://weather-alert-backend-xxx.azurewebsites.net/api'

def get_weather(city, country):
    response = requests.get(
        f'{API_BASE}/getweather',
        params={'city': city, 'country': country}
    )
    return response.json()

def save_location(location_data):
    response = requests.post(
        f'{API_BASE}/saveuserlocation',
        json=location_data
    )
    return response.json()
```

---

## Support

For issues or questions:
- Check logs in Azure Portal
- See TROUBLESHOOTING.md
- Review error messages in browser console