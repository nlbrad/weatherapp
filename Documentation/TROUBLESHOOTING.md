# OmniAlert - Troubleshooting Guide

Common issues and solutions for the OmniAlert Weather Alert System.

---

## Table of Contents

1. [Local Development Issues](#local-development-issues)
2. [Backend / Azure Functions Issues](#backend--azure-functions-issues)
3. [Frontend Issues](#frontend-issues)
4. [Authentication Issues](#authentication-issues)
5. [Telegram Bot Issues](#telegram-bot-issues)
6. [WhatsApp / Twilio Issues](#whatsapp--twilio-issues)
7. [Weather API Issues](#weather-api-issues)
8. [Alert System Issues](#alert-system-issues)
9. [Database Issues](#database-issues)
10. [Deployment Issues](#deployment-issues)
11. [Performance Issues](#performance-issues)

---

## Local Development Issues

### Functions Won't Start

**Symptom:** `Initializing HttpWorker timed out` or functions hang on startup

**Solution 1: Check host.json**
```bash
cat backend/host.json
```

Should look like this (NO `customHandler` section):
```json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  }
}
```

If there's a `customHandler` section, remove it.

**Solution 2: Reinstall node_modules**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm start
```

**Solution 3: Check for syntax errors**
```bash
# Test each function file
node --check src/functions/GetWeather.js
node --check src/functions/GetWeatherData.js
node --check src/functions/SaveUserLocation.js
# ... repeat for other files
```

**Solution 4: Verify Node.js version**
```bash
node --version  # Should be v20.x.x

# If wrong version:
nvm use 20
```

---

### Azurite Connection Failed

**Symptom:** `connect ECONNREFUSED 127.0.0.1:10002`

**Cause:** Azurite (storage emulator) isn't running.

**Solution:**
```bash
# Terminal 1: Start Azurite
cd backend
npx azurite

# Terminal 2: Then start functions
npm start
```

Azurite must be running BEFORE you start the backend.

---

### CORS Errors Locally

**Symptom:** `Access to fetch blocked by CORS policy` in browser console

**Solution 1: Check proxy setting**

In `frontend/package.json`, ensure you have:
```json
{
  "proxy": "http://localhost:7071"
}
```

**After adding/changing proxy, you MUST restart the frontend:**
```bash
# Ctrl+C to stop, then:
npm start
```

**Solution 2: Check API URL**

In `frontend/.env.local`:
```env
REACT_APP_API_URL=http://localhost:7071/api
```

---

### Tailwind CSS Not Working

**Symptom:** No styling, plain HTML elements

**Cause:** Tailwind v4 installed instead of v3 (incompatible config format)

**Solution:**
```bash
cd frontend

# Check current version
npm list tailwindcss

# If v4.x.x, downgrade to v3:
npm uninstall tailwindcss
npm install -D tailwindcss@3 postcss@8 autoprefixer@10

# Regenerate config
npx tailwindcss init -p

# Restart
npm start
```

---

### Port Already in Use

**Symptom:** `Port 3000 is already in use`

**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm start
```

For backend port 7071:
```bash
lsof -ti:7071 | xargs kill -9
```

---

## Backend / Azure Functions Issues

### Function Returns 500 Error

**Step 1: Check logs**

Locally:
```bash
# Logs appear in the terminal running `npm start`
```

In Azure:
```bash
az webapp log tail \
  --name omnialert-backend \
  --resource-group rg-omnialert
```

Or via Portal: Function App → Monitor → Log stream

**Step 2: Common causes**

| Error in logs | Cause | Fix |
|---------------|-------|-----|
| `OPENWEATHER_API_KEY is not defined` | Missing env var | Add to `local.settings.json` or Azure config |
| `Invalid API key` | Wrong or expired key | Get new key from openweathermap.org |
| `getaddrinfo ENOTFOUND` | Network issue | Check internet connection |
| `TableNotFoundError` | Table doesn't exist | Save a location first (auto-creates table) |

---

### Timer Triggers Not Running

**Symptom:** Scheduled alerts (daily forecast, etc.) never fire

**Check 1: Verify timer is registered**
```bash
az functionapp function list \
  --name omnialert-backend \
  --resource-group rg-omnialert \
  --output table
```

Look for functions with `timerTrigger` type.

**Check 2: Verify cron expression**

In your function file, the schedule should look like:
```javascript
schedule: '0 0 7 * * *'  // 7am UTC daily
```

**Check 3: View invocation history**

Azure Portal → Function App → Functions → [Your Function] → Monitor → Invocations

**Check 4: Is the function disabled?**

Azure Portal → Function App → Functions → Check for "Disabled" badge

---

### Function App Not Starting (Azure)

**Symptom:** 503 errors or timeout in production

**Check environment variables:**
```bash
az functionapp config appsettings list \
  --name omnialert-backend \
  --resource-group rg-omnialert \
  --output table
```

**Common issues:**

| Missing Variable | Symptom |
|------------------|---------|
| `AZURE_STORAGE_CONNECTION_STRING` | App won't start at all |
| `OPENWEATHER_API_KEY` | Weather endpoints return 500 |
| `TELEGRAM_BOT_TOKEN` | Alert functions fail |
| `GOOGLE_API_KEY` | Location search fails |

**Fix: Add missing settings and restart**
```bash
az functionapp config appsettings set \
  --name omnialert-backend \
  --resource-group rg-omnialert \
  --settings KEY="value"

az functionapp restart \
  --name omnialert-backend \
  --resource-group rg-omnialert
```

---

## Frontend Issues

### App Loads but Shows "Failed to load locations"

**Check 1: Is the backend running?**
```bash
# Local
curl http://localhost:7071/api/GetUserLocations?userId=dev-user-123

# Production
curl https://your-backend.azurewebsites.net/api/GetUserLocations?userId=test
```

**Check 2: Browser console (F12)**

Look for:
- CORS errors → See [CORS section](#cors-errors-locally)
- 401 Unauthorized → Auth token issue
- 500 errors → Backend problem

**Check 3: Network tab**

F12 → Network tab → Look at failed requests → Check response body for error details

---

### Dashboard Shows No Data

**Symptom:** Dashboard loads but widgets are empty or show loading forever

**Causes & Solutions:**

1. **Location has no coordinates**
   - Delete the location and re-add it
   - Make sure to select from the autocomplete dropdown (not just type and submit)

2. **OpenWeather API issue**
   ```bash
   # Test directly
   curl "https://api.openweathermap.org/data/3.0/onecall?lat=53.35&lon=-6.26&appid=YOUR_KEY&units=metric"
   ```

3. **Cache issue**
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Or clear site data: F12 → Application → Storage → Clear site data

---

### Locations Don't Persist

**Symptom:** Added locations disappear on page refresh

**Check 1: API actually saving?**

Watch the Network tab when you save a location. The POST to `/SaveUserLocation` should return 200.

**Check 2: Correct user ID?**

In dev mode, the app uses `dev-user-123`. Check that locations are being saved with this ID:
```bash
curl "http://localhost:7071/api/GetUserLocations?userId=dev-user-123"
```

**Check 3: Azurite running?**

Locally, data is stored in Azurite. If Azurite isn't running when you save, data is lost.

---

## Authentication Issues

### Login Redirects but Nothing Happens

**Symptom:** Click "Sign in" → redirects to Microsoft → comes back but still not logged in

**Check 1: Redirect URI mismatch**

In Azure Portal → Entra → App Registration → Authentication:
- Redirect URI must EXACTLY match your app URL
- Include `http://localhost:3000` for local dev
- Include `https://your-app.azurestaticapps.net` for production

**Check 2: Browser console**

Look for MSAL errors like:
- `redirect_uri_mismatch` → Fix redirect URI in Entra
- `invalid_client` → Wrong client ID in `.env`
- `AADSTS50011` → Reply URL not registered

**Check 3: Verify frontend config**

In `frontend/.env.local` or `.env.production`:
```env
REACT_APP_ENTRA_CLIENT_ID=your-actual-client-id
REACT_APP_ENTRA_TENANT_SUBDOMAIN=your-tenant-subdomain
```

---

### "Dev Mode" Active When It Shouldn't Be

**Symptom:** App shows "Development Mode" banner in production

**Cause:** Entra environment variables not set or incorrect

**Solution:**

1. Verify `.env.production` has all Entra variables
2. Rebuild: `npm run build`
3. Redeploy

---

### Token Expired / Session Lost

**Symptom:** App works, then suddenly shows login page

**Cause:** MSAL token expired and silent refresh failed

**Solutions:**
- User can simply log in again
- Check that `offline_access` scope is included in `authConfig.js`
- Verify session storage isn't being cleared by browser privacy settings

---

## Telegram Bot Issues

### Bot Not Responding to Commands

**Symptom:** Send `/start` to bot but get no response

**Check 1: Webhook configured?**
```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo"
```

Should show your Azure Function URL. If empty or wrong:
```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://your-backend.azurewebsites.net/api/telegram-webhook"
```

**Check 2: Function deployed?**
```bash
az functionapp function list \
  --name omnialert-backend \
  --resource-group rg-omnialert | grep -i telegram
```

**Check 3: Bot token correct?**

Verify `TELEGRAM_BOT_TOKEN` in Azure Function App settings matches the token from @BotFather.

---

### Alerts Not Being Delivered

**Symptom:** Timer runs, logs say "sent", but no message in Telegram

**Check 1: Chat ID correct?**

Your Telegram Chat ID should be in `UserPreferences` table. Verify:
```bash
# Send /start to bot - it replies with your Chat ID
# Compare to what's stored in your preferences
```

**Check 2: Test manual send**
```bash
curl -X POST "https://your-backend.azurewebsites.net/api/send-telegram" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "YOUR_CHAT_ID", "message": "Test message"}'
```

**Check 3: Bot blocked?**

If you blocked the bot in Telegram, unblock it and send `/start` again.

---

### "Unauthorized" Error from Telegram API

**Symptom:** Logs show `401 Unauthorized` when sending messages

**Cause:** Invalid bot token

**Solution:**
1. Go to Telegram → @BotFather → `/mybots` → Select your bot → API Token
2. Copy the token
3. Update `TELEGRAM_BOT_TOKEN` in Azure Function App settings
4. Restart the Function App

---

## WhatsApp / Twilio Issues

### Not Receiving WhatsApp Alerts

**Check 1: Sandbox still connected?**

Twilio sandbox expires after 72 hours of inactivity. Rejoin:
1. Open WhatsApp
2. Send the join code to `+1 415 523 8886`
3. Wait for confirmation

**Check 2: Credentials correct?**
```bash
az functionapp config appsettings list \
  --name omnialert-backend \
  --resource-group rg-omnialert | grep TWILIO
```

Verify:
- `TWILIO_ACCOUNT_SID` starts with `AC`
- `TWILIO_AUTH_TOKEN` is correct
- `TWILIO_WHATSAPP_FROM` is `whatsapp:+14155238886` (sandbox number)

**Check 3: Phone number format**

Must be E.164 format with country code: `+353871234567` (no spaces, no dashes)

---

### "Authenticate" Error from Twilio

**Symptom:** Logs show `Error: Authenticate`

**Cause:** Wrong Account SID or Auth Token

**Solution:**
1. Go to https://console.twilio.com
2. Copy fresh credentials from the dashboard
3. Update in Azure Function App settings
4. Restart Function App

---

## Weather API Issues

### "401 Unauthorized" from OpenWeather

**Causes:**
1. API key not yet activated (new keys take ~15 minutes)
2. Key is invalid or deleted
3. Not subscribed to "One Call API 3.0"

**Test your key:**
```bash
curl "https://api.openweathermap.org/data/3.0/onecall?lat=53.35&lon=-6.26&appid=YOUR_KEY&units=metric"
```

**Solution:**
1. Go to https://home.openweathermap.org/api_keys
2. Verify key is active
3. Check you're subscribed to One Call 3.0 (has a free tier)
4. If new key, wait 15 minutes

---

### Weather Data Missing or Incomplete

**Symptom:** Some fields are null or missing

**Possible causes:**
1. OpenWeather doesn't have data for that location
2. Air quality not available in that region
3. API response format changed

**Debug:**
```bash
# Get raw API response
curl "http://localhost:7071/api/GetWeatherData?lat=53.35&lon=-6.26" | jq .
```

Check which fields are null and handle gracefully in the frontend.

---

### Location Search Returns No Results

**Symptom:** Typing in location search shows nothing

**Check 1: Google API key configured?**
```bash
# Check if set
az functionapp config appsettings list \
  --name omnialert-backend \
  --resource-group rg-omnialert | grep GOOGLE
```

**Check 2: Places API enabled?**

Go to Google Cloud Console → APIs & Services → Verify "Places API" is enabled.

**Check 3: API key restrictions**

If you restricted the key, make sure it allows the Places API.

**Test directly:**
```bash
curl "http://localhost:7071/api/SearchLocations?query=Dublin"
```

---

## Alert System Issues

### SkyScore Always Shows 0 or NaN

**Symptom:** Tonight's Sky alert shows "0/100" or "NaN/100"

**Cause:** Missing or invalid weather data being passed to scoring function

**Debug:**
```bash
# Test SkyScore endpoint
curl "http://localhost:7071/api/tonights-sky?lat=53.35&lon=-6.26" | jq .
```

Check for:
- Valid cloud cover percentage (0-100)
- Moon phase data present
- No null values in weather response

**Fix:** The SkyScore.js file should have null checks. See ALERT_SYSTEM.md for the algorithm.

---

### Weather Warnings Not Showing

**Symptom:** Met Éireann has active warnings but app shows none

**Check 1: MeteoAlarm API working?**
```bash
curl "https://feeds.meteoalarm.org/api/v1/warnings/feeds-ireland" | jq .
```

**Check 2: User has warnings enabled?**

In UserPreferences, `alertTypes.weatherWarnings` should be `true`.

**Check 3: Warning level filter**

We filter out "Green" (no warning). Only Yellow, Orange, Red are shown.

---

### Aurora Alerts Never Fire

**Symptom:** Never get aurora alerts even during geomagnetic storms

**Check 1: Current Kp index**
```bash
curl "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json" | jq .
```

Aurora alerts only fire when Kp ≥ 4 (for Ireland at ~53°N).

**Check 2: User has aurora alerts enabled?**

Check `alertTypes.auroraAlerts` in UserPreferences.

**Check 3: 6-hour cooldown**

To prevent spam, we only send one alert per Kp level every 6 hours. Check logs for "cooldown" messages.

---

## Database Issues

### "TableNotFoundError"

**Symptom:** `TableNotFound` error when fetching locations

**Cause:** Table hasn't been created yet

**Solution:** Tables are auto-created when you first save data. Save a location:
```bash
curl -X POST "http://localhost:7071/api/SaveUserLocation" \
  -H "Content-Type: application/json" \
  -d '{"userId": "test", "locationName": "Dublin", "country": "IE", "latitude": 53.35, "longitude": -6.26}'
```

---

### Can't Connect to Table Storage

**Symptom:** Connection refused or timeout errors

**Local:**
- Ensure Azurite is running
- Check `AZURE_STORAGE_CONNECTION_STRING` is `UseDevelopmentStorage=true`

**Production:**
- Check connection string is the REAL Azure connection string (not development)
- Verify storage account exists and is accessible

**Test connection:**
```bash
az storage table list --connection-string "YOUR_CONNECTION_STRING"
```

---

### Azure SQL Connection Failed

**Symptom:** Scoring functions fail with SQL connection errors

**Check 1: Firewall rules**

Azure Portal → SQL Server → Networking → Firewall rules

Ensure "Allow Azure services" is ON.

**Check 2: Credentials correct?**

Verify `SQL_SERVER`, `SQL_DATABASE`, `SQL_USER`, `SQL_PASSWORD` in Function App settings.

**Check 3: Database paused?**

Serverless SQL auto-pauses after inactivity. First connection after pause takes ~60 seconds to "wake up."

---

## Deployment Issues

### Deployment Fails

**Symptom:** `func azure functionapp publish` fails

**Check 1: Logged in?**
```bash
az login
az account show  # Verify correct subscription
```

**Check 2: Function app exists?**
```bash
az functionapp list --output table
```

**Check 3: Build locally first**
```bash
cd backend
npm install
npm start  # Make sure it starts without errors
```

Then deploy:
```bash
func azure functionapp publish your-app-name
```

---

### Frontend Deploy Succeeds but Site Shows Old Version

**Cause:** Browser cache or CDN cache

**Solutions:**
1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. Clear browser cache
3. Wait 5-10 minutes for CDN cache to expire
4. Check deployment logs in Azure Portal → Static Web App → Deployment history

---

## Performance Issues

### Slow Dashboard Load

**Causes & Solutions:**

1. **Too many API calls** — Dashboard makes parallel requests. Check Network tab to see what's slow.

2. **No caching** — Weather data is cached for 10 minutes. If cache isn't working:
   - Check `weatherCache.js` is being used
   - Verify cache TTL settings

3. **Large payload** — If `GetWeatherData` returns too much data, consider splitting into separate endpoints.

---

### High Azure Costs

**Monitor costs:**
```bash
az consumption usage list \
  --start-date 2026-01-01 \
  --end-date 2026-01-31 \
  --output table
```

**Common causes:**
- Timer functions running too frequently
- SQL database not auto-pausing (check for keep-alive queries)
- Storage egress charges

**Optimizations:**
- Reduce timer frequency if possible
- Cache weather data to reduce API calls
- Use the free tier limits (1M function executions/month)

---

## Getting Help

### Debug Checklist

When something isn't working:

1. [ ] Check browser console for errors (F12 → Console)
2. [ ] Check Network tab for failed requests (F12 → Network)
3. [ ] Check backend logs (`npm start` terminal or Azure Log stream)
4. [ ] Verify environment variables are set
5. [ ] Test API endpoints directly with curl
6. [ ] Try locally before debugging production
7. [ ] Check Azure service health: https://status.azure.com

### Useful Commands

```bash
# Check all Azure resources
az resource list --resource-group rg-omnialert --output table

# Check function app status
az functionapp show --name omnialert-backend --resource-group rg-omnialert

# View function app logs
az webapp log tail --name omnialert-backend --resource-group rg-omnialert

# List function app settings
az functionapp config appsettings list --name omnialert-backend --resource-group rg-omnialert

# Check storage tables
az storage table list --connection-string "YOUR_CONNECTION_STRING"

# Test Telegram webhook
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

### Still Stuck?

1. Search the error message online
2. Check [Azure Status](https://status.azure.com) for service issues
3. Review recent code changes (did something break after a deploy?)
4. Check the relevant documentation section (ALERT_SYSTEM.md, API_DOCS.md, etc.)
5. Start fresh — sometimes restarting Azurite, backend, and frontend fixes mysterious issues