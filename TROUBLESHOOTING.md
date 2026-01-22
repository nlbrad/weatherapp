# Troubleshooting Guide

Common issues and solutions for the Weather Alert System.

## Table of Contents

1. [Local Development Issues](#local-development-issues)
2. [Deployment Issues](#deployment-issues)
3. [API Errors](#api-errors)
4. [Frontend Issues](#frontend-issues)
5. [Backend Issues](#backend-issues)
6. [Database Issues](#database-issues)
7. [WhatsApp Issues](#whatsapp-issues)
8. [Performance Issues](#performance-issues)

---

## Local Development Issues

### Functions Won't Start

**Symptom:** `Initializing HttpWorker timed out`

**Causes & Solutions:**

**1. Custom Handler in host.json**
```bash
# Check host.json
cat backend/host.json

# Should NOT contain customHandler section
# If it does, remove it:
{
  "version": "2.0",
  "logging": {...},
  "extensionBundle": {...}
  // NO customHandler section!
}
```

**2. Corrupted node_modules**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm start
```

**3. Syntax errors in function files**
```bash
# Check all functions
node --check src/functions/GetWeather.js
node --check src/functions/SaveUserLocation.js
node --check src/functions/GetUserLocations.js
node --check src/functions/CheckAlertsAndNotify.js
```

**4. Wrong Node.js version**
```bash
node --version  # Should be v20.x.x

# If wrong version:
nvm use 20
```

---

### Azurite Connection Failed

**Symptom:** `connect ECONNREFUSED 127.0.0.1:10002`

**Solution:**
```bash
# Make sure Azurite is running
npx azurite

# In another terminal:
cd backend
npm start
```

**Permanent Solution:**
```bash
# Terminal 1: Azurite (leave running)
npx azurite

# Terminal 2: Backend (leave running)
npm start

# Terminal 3: Frontend (leave running)
cd ../frontend
npm start

# Terminal 4: Your working terminal
```

---

### CORS Errors Locally

**Symptom:** `blocked by CORS policy`

**Solution 1: Use Proxy (Recommended)**
```json
// frontend/package.json
{
  "proxy": "http://localhost:7071",
  ...
}

// frontend/src/services/api.js
const API_BASE_URL = '/api';
```

**After adding proxy:**
```bash
# MUST restart frontend
cd frontend
npm start
```

**Solution 2: Add CORS Headers to Functions**
Already implemented - check function returns include:
```javascript
headers: {
  'Access-Control-Allow-Origin': '*'
}
```

---

### Tailwind CSS Not Working

**Symptom:** No styling, plain HTML

**Cause:** Wrong Tailwind version (v4 instead of v3)

**Solution:**
```bash
cd frontend

# Check version
npm list tailwindcss

# If v4.x.x, downgrade:
npm uninstall tailwindcss
npm install -D tailwindcss@3 postcss@8 autoprefixer@10

# Reinitialize
npx tailwindcss init -p

# Update tailwind.config.js:
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: []
}

# Update src/index.css:
@tailwind base;
@tailwind components;
@tailwind utilities;

# Restart
npm start
```

---

### Port Already in Use

**Symptom:** `Port 3000 is already in use`

**Solution:**
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm start
```

---

## Deployment Issues

### Function App Not Starting in Azure

**Symptom:** Functions timeout or 503 errors

**Check Environment Variables:**
```bash
az functionapp config appsettings list \
  --name weather-alert-backend \
  --resource-group rg-weather-alert
```

**Verify Required Settings:**
- `OPENWEATHER_API_KEY` (not empty)
- `AZURE_STORAGE_CONNECTION_STRING` (not "UseDevelopmentStorage=true")
- `TWILIO_ACCOUNT_SID` (starts with "AC")
- `TWILIO_AUTH_TOKEN` (not empty)

**Fix:**
```bash
# Update settings
az functionapp config appsettings set \
  --name weather-alert-backend \
  --resource-group rg-weather-alert \
  --settings KEY=VALUE

# Restart
az functionapp restart \
  --name weather-alert-backend \
  --resource-group rg-weather-alert
```

---

### Deployment Fails

**Symptom:** `func azure functionapp publish` fails

**Solution 1: Not logged in**
```bash
az login
az account show  # Verify correct subscription
```

**Solution 2: Wrong function app name**
```bash
# List all function apps
az functionapp list --output table

# Use exact name from list
func azure functionapp publish YOUR-EXACT-NAME
```

**Solution 3: Build errors**
```bash
# Test build locally first
cd backend
npm install
npm run build  # If you have a build script

# Then deploy
func azure functionapp publish weather-alert-backend
```

---

### Static Web App Deployment Issues

**Symptom:** Deployment goes to preview instead of production

**Solution:**
```bash
# Specify production environment
npx @azure/static-web-apps-cli deploy ./build \
  --deployment-token YOUR_TOKEN \
  --env production
```

**Get Fresh Token:**
1. Azure Portal → Static Web App
2. Overview → "Manage deployment token"
3. Copy token
4. Use in deployment command

---

## API Errors

### 400 Bad Request

**Causes:**
1. Missing required parameters
2. Invalid parameter format
3. Malformed JSON

**Debug:**
```bash
# Check request format
curl -X POST URL \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","locationName":"Dublin"}'

# Verify JSON is valid
echo '{"test":"value"}' | jq .
```

---

### 500 Internal Server Error

**Check Function Logs:**

**Via Portal:**
1. Function App → Log stream
2. Watch for errors
3. Note the error message

**Via CLI:**
```bash
az webapp log tail \
  --name weather-alert-backend \
  --resource-group rg-weather-alert
```

**Common Causes:**
- API key invalid/expired
- Database connection failed
- External API down

---

### Table Not Found Error

**Symptom:** `TableNotFound` in response

**Solution:** Create the table by adding first location
```bash
curl -X POST https://your-function-app.azurewebsites.net/api/saveuserlocation \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "locationName": "Dublin",
    "country": "IE",
    "alertsEnabled": true,
    "minTemp": 5,
    "maxTemp": 25
  }'
```

The SaveUserLocation function auto-creates the table.

---

## Frontend Issues

### App Loads but Shows "Failed to load locations"

**Causes:**
1. Backend not running
2. Wrong API URL
3. CORS not configured
4. Network issue

**Debug Steps:**

**1. Check backend is running:**
```bash
curl https://your-backend-url.azurewebsites.net/api/getweather?city=Dublin&country=IE
```

**2. Check browser console (F12):**
- Look for CORS errors
- Look for network errors
- Check API URLs being called

**3. Verify API URL in code:**
```javascript
// frontend/src/services/api.js
const API_BASE_URL = 'https://weather-alert-backend-xxx.azurewebsites.net/api';
```

**4. Check CORS in Azure:**
```bash
az functionapp cors show \
  --name weather-alert-backend \
  --resource-group rg-weather-alert
```

Should include your frontend URL.

---

### Locations Don't Persist

**Symptom:** Locations disappear on refresh

**Cause:** Not saving to database, using only local state

**Debug:**
```bash
# Check if data is in database
curl "https://your-backend.azurewebsites.net/api/getuserlocations?userId=user123"
```

**If empty:** SaveUserLocation isn't working
**If has data:** Frontend not calling API on load

**Check:** `useEffect` in App.js calls `loadLocations()`

---

### Add Location Button Doesn't Work

**Debug:**
1. Check browser console for errors
2. Verify form fields have values
3. Check API is being called (Network tab)
4. Verify response is successful

**Common Issue:** Missing country code
- Make country code optional in validation
- Or provide default value

---

## Backend Issues

### Timer Trigger Not Running

**Check if scheduled:**
```bash
az functionapp function show \
  --name weather-alert-backend \
  --resource-group rg-weather-alert \
  --function-name CheckAlertsAndNotify
```

**View Trigger History:**
1. Azure Portal → Function App
2. Functions → CheckAlertsAndNotify
3. Monitor → Invocations

**If not running:**
- Check cron expression is valid: `0 0 * * * *`
- Verify function deployed successfully
- Check function isn't disabled

**Manual Test:**
```bash
curl https://your-backend.azurewebsites.net/api/checkalerts
```

---

### Weather API Returns Error

**Symptom:** `Failed to fetch weather data`

**Causes:**
1. Invalid API key
2. API key not activated (takes 10-15 mins)
3. City name wrong
4. Rate limit exceeded

**Debug:**
```bash
# Test API key directly
curl "https://api.openweathermap.org/data/2.5/weather?q=Dublin&appid=YOUR_KEY&units=metric"
```

**Solutions:**
- Verify key at https://home.openweathermap.org/api_keys
- Wait 15 mins if just created
- Check spelling of city name
- Verify not over 1,000 calls/day limit

---

### Function Timeout

**Symptom:** Requests take >30 seconds

**Causes:**
- External API slow/down
- Too many locations to process
- Database query inefficient

**Solutions:**
1. **Increase timeout** (Consumption plan default: 5 mins)
```bash
# Not usually needed, but can increase
az functionapp config set \
  --name weather-alert-backend \
  --resource-group rg-weather-alert \
  --function-timeout 00:10:00
```

2. **Optimize queries:**
- Add indexes
- Reduce data fetched
- Cache weather data

3. **Process in batches:**
- Don't process all locations at once
- Use queue for async processing

---

## Database Issues

### Can't Connect to Storage

**Symptom:** Connection refused or timeout

**Check Connection String:**

**Local:**
- Should be `UseDevelopmentStorage=true`
- Azurite must be running

**Production:**
- Should start with `DefaultEndpointsProtocol=https;AccountName=...`
- Verify in Function App Configuration

**Test Connection:**
```bash
# Via Azure CLI
az storage table list \
  --connection-string "YOUR_CONNECTION_STRING"
```

---

### Data Not Persisting

**Symptom:** Data saves but disappears

**Causes:**
1. Using wrong storage account
2. Connection string pointing to emulator
3. Table gets deleted
Verify:

# List tables in storage account
az storage table list \
  --account-name saweatheralerts

# Check if UserLocations exists
az storage entity query \
  --table-name UserLocations \
  --account-name saweatheralerts

# WhatsApp Issues
Not Receiving Alerts
1. Check Twilio Sandbox Connection:

Open WhatsApp
Look for messages from +1 415 523 8886
If no recent messages, rejoin sandbox:

Send "join [your-code]" to the Twilio number
Wait for confirmation

2. Verify Credentials:

# Check Function App settings
az functionapp config appsettings list \
  --name weather-alert-backend \
  --resource-group rg-weather-alert \
  | grep TWILIO

3. Check Function Logs:
Look for:

"Failed to send WhatsApp message: Authenticate" → Wrong credentials
"No test WhatsApp number configured" → Missing TEST_WHATSAPP_NUMBER
"Alert sent! SID: ..." → Success!

4. Verify Temperature Triggers:
# Check current temp vs thresholds
curl "https://your-backend.azurewebsites.net/api/getweather?city=Dublin&country=IE"
curl "https://your-backend.azurewebsites.net/api/getuserlocations?userId=user123"

# Current temp should be outside min/max range

"Authenticate" Error from Twilio
Causes:

Wrong Account SID
Wrong Auth Token
Credentials from different Twilio project

Solution:

Go to https://console.twilio.com
Copy fresh credentials from dashboard
Update Function App settings
Restart Function App


Message Says "Alert sent" but Nothing Received
Causes:

Wrong phone number format
Number not in sandbox
Sandbox expired

Debug:
# Check Twilio logs
# Go to console.twilio.com → Monitor → Logs → Messaging
# Look for your messages and any errors

Fix Phone Number:

Must include country code: +353873587293
No spaces or dashes
Must match number that joined sandbox

Performance Issues
Slow Page Load
Causes:

Too many API calls
Large images
No caching

// Cache weather data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getWeatherCached(city, country) {
  const key = `${city}-${country}`;
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchWeather(city, country);
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

High Azure Costs
Monitor Costs:
bashaz consumption usage list \
  --start-date 2026-01-01 \
  --end-date 2026-01-31
Common Causes:

Too many API calls
Storage egress charges
Function executions

Optimize:

Cache weather data (reduce API calls)
Use CDN for static assets
Batch database operations
Review timer trigger frequency

Getting Help
Check Logs First
Backend:

# Real-time logs
az webapp log tail \
  --name weather-alert-backend \
  --resource-group rg-weather-alert

# Historical logs
az webapp log download \
  --name weather-alert-backend \
  --resource-group rg-weather-alert

  Frontend:

Browser DevTools → Console tab
Browser DevTools → Network tab

Debug Checklist

 Check browser console for errors
 Check Function App logs
 Verify environment variables
 Test API with curl
 Check Azure service status
 Review recent code changes
 Test locally first

Still Stuck?

Review relevant documentation section
Check Azure service health
Search error message online
Check Azure DevOps for similar issues
Start fresh Claude conversation with context

# Check all resources
az resource list --resource-group rg-weather-alert --output table

# Check function app status
az functionapp show --name weather-alert-backend --resource-group rg-weather-alert

# View app insights (if configured)
az monitor app-insights component show \
  --app weather-alert-backend \
  --resource-group rg-weather-alert

# Check storage account status
az storage account show \
  --name saweatheralerts \
  --resource-group rg-weather-alert