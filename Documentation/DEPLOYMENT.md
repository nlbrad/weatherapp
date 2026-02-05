# OmniAlert - Azure Deployment Guide

Complete guide to deploying OmniAlert to production on Azure.

---

## Prerequisites

- Azure subscription (free tier works for most resources)
- Azure CLI installed and authenticated (`az login`)
- Azure Functions Core Tools v4 installed
- Node.js 20+ installed
- Code pushed to GitHub repository

---

## Architecture Overview

**Production Resources:**

| Resource | Azure Service | Purpose |
|----------|---------------|---------|
| Frontend | Azure Static Web Apps | React app hosting (global CDN) |
| Backend | Azure Function App | Serverless API (Consumption plan) |
| User Data | Azure Storage Account | Table Storage for locations & preferences |
| Scoring Data | Azure SQL Database | Serverless SQL for scoring history |
| Authentication | Azure Entra External ID | User login (Microsoft, Google) |

**External Services (API keys required):**
- OpenWeatherMap One Call 3.0
- Google Places API
- Telegram Bot API
- Twilio (WhatsApp) — optional
- N2YO (ISS tracking) — optional

---

## Step 1: Create Azure Resources

### 1.1 Create Resource Group

**What is this?** A resource group is a container that holds all your Azure resources. It makes it easy to manage, monitor, and delete everything together.

```bash
az group create \
  --name rg-omnialert \
  --location westeurope
```

### 1.2 Create Storage Account

**What is this?** Azure Storage Account provides Table Storage — a NoSQL database for storing user locations and preferences. It's extremely cheap (pennies per month).

```bash
az storage account create \
  --name saomnialert \
  --resource-group rg-omnialert \
  --location westeurope \
  --sku Standard_LRS
```

> **Note:** Storage account names must be globally unique, lowercase, 3-24 characters, no dashes. If `saomnialert` is taken, try `saomnialert123` or similar.

**Get the connection string (save this!):**
```bash
az storage account show-connection-string \
  --name saomnialert \
  --resource-group rg-omnialert \
  --output tsv
```

### 1.3 Create Function App

**What is this?** Azure Functions hosts your backend API. The Consumption plan means you only pay when code runs — idle time is free.

**Via Azure Portal (recommended for first time):**

1. Go to portal.azure.com → Create a resource
2. Search "Function App" → Create
3. Fill in:
   - **Subscription:** Your subscription
   - **Resource Group:** rg-omnialert
   - **Function App name:** omnialert-backend (must be globally unique)
   - **Runtime stack:** Node.js
   - **Version:** 20 LTS
   - **Region:** West Europe
   - **Operating System:** Linux
   - **Hosting plan:** Consumption (Serverless)
4. Click Next: Storage → Select your storage account (saomnialert) or create new
5. Review + Create → Create
6. Wait 2-3 minutes for deployment

**Via Azure CLI:**
```bash
# Create function app
az functionapp create \
  --resource-group rg-omnialert \
  --consumption-plan-location westeurope \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --name omnialert-backend \
  --storage-account saomnialert \
  --os-type Linux
```

### 1.4 Create Static Web App

**What is this?** Azure Static Web Apps hosts your React frontend with a global CDN, custom domains, and automatic HTTPS.

**Via Azure Portal:**

1. Go to portal.azure.com → Create a resource
2. Search "Static Web App" → Create
3. Fill in:
   - **Subscription:** Your subscription
   - **Resource Group:** rg-omnialert
   - **Name:** omnialert-frontend
   - **Plan type:** Free
   - **Region:** West Europe
   - **Source:** GitHub
   - **Organization:** Your GitHub username
   - **Repository:** Weather_Alert_App
   - **Branch:** main
   - **Build Presets:** React
   - **App location:** `/frontend`
   - **Output location:** `build`
4. Review + Create → Create

> **Note:** This creates a GitHub Actions workflow that auto-deploys on every push to main.

### 1.5 Create Azure SQL Database (Optional)

**What is this?** Azure SQL Serverless is a pay-per-use database that auto-pauses when idle (no cost when not in use). Used for scoring history and advanced queries. You can skip this initially — the app works without it.

**Via Azure Portal:**

1. Go to portal.azure.com → Create a resource
2. Search "SQL Database" → Create
3. Fill in:
   - **Resource Group:** rg-omnialert
   - **Database name:** omnialert-db
   - **Server:** Create new
     - **Server name:** omnialert-sql (must be unique)
     - **Location:** West Europe
     - **Authentication:** SQL authentication
     - **Admin login:** sqladmin
     - **Password:** (create a strong password)
   - **Compute + storage:** Configure database
     - **Service tier:** General Purpose
     - **Compute tier:** Serverless
     - **Max vCores:** 1
     - **Min vCores:** 0.5
     - **Auto-pause delay:** 60 minutes
4. Review + Create → Create

**Configure firewall:**
```bash
# Allow Azure services
az sql server firewall-rule create \
  --resource-group rg-omnialert \
  --server omnialert-sql \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 1.6 Set Up Azure Entra External ID (Authentication)

**What is this?** Azure Entra External ID (formerly Azure AD B2C) provides user authentication with social logins (Microsoft, Google). The free tier supports up to 50,000 monthly active users.

**Via Azure Portal:**

1. Go to entra.microsoft.com
2. Create an External ID tenant (or use existing)
3. Register a new application:
   - **Name:** OmniAlert
   - **Supported account types:** Personal Microsoft accounts + social
   - **Redirect URI:** `https://your-static-app.azurestaticapps.net` (add localhost for dev)
4. Note down:
   - **Application (client) ID**
   - **Directory (tenant) ID**
   - **Tenant subdomain** (the part before `.onmicrosoft.com`)
5. Configure user flows for sign-up/sign-in
6. Add Google as an identity provider (optional)

> **Detailed guide:** See Microsoft's [External ID quickstart documentation](https://learn.microsoft.com/en-us/entra/external-id/customers/quickstart-tenant-setup)

---

## Step 2: Configure Function App

### 2.1 Add Environment Variables

**Via Azure Portal:**

1. Go to Function App → Configuration → Application settings
2. Click "+ New application setting" for each variable
3. Add all required settings (see table below)
4. Click "Save" → Confirm restart

**Required Settings:**

| Name | Value | Notes |
|------|-------|-------|
| `OPENWEATHER_API_KEY` | Your API key | From openweathermap.org |
| `AZURE_STORAGE_CONNECTION_STRING` | Connection string | From Step 1.2 |
| `GOOGLE_API_KEY` | Your API key | From Google Cloud Console |
| `TELEGRAM_BOT_TOKEN` | Bot token | From @BotFather |

**Optional Settings (add as needed):**

| Name | Value | Notes |
|------|-------|-------|
| `TWILIO_ACCOUNT_SID` | Account SID | For WhatsApp alerts |
| `TWILIO_AUTH_TOKEN` | Auth token | For WhatsApp alerts |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` | Sandbox number |
| `N2YO_API_KEY` | API key | For ISS pass tracking |
| `SQL_SERVER` | `omnialert-sql.database.windows.net` | Azure SQL server |
| `SQL_DATABASE` | `omnialert-db` | Database name |
| `SQL_USER` | `sqladmin` | Database user |
| `SQL_PASSWORD` | Your password | Database password |

**Via Azure CLI:**
```bash
az functionapp config appsettings set \
  --name omnialert-backend \
  --resource-group rg-omnialert \
  --settings \
    OPENWEATHER_API_KEY="your_key" \
    AZURE_STORAGE_CONNECTION_STRING="your_connection_string" \
    GOOGLE_API_KEY="your_key" \
    TELEGRAM_BOT_TOKEN="your_bot_token"
```

### 2.2 Configure CORS

**What is CORS?** Cross-Origin Resource Sharing controls which websites can call your API. You need to allow your frontend URL.

**Via Azure Portal:**
1. Function App → API → CORS
2. Add allowed origins:
   - `http://localhost:3000` (for local development)
   - `https://your-static-app.azurestaticapps.net` (your production frontend)
3. Click "Save"

**Via Azure CLI:**
```bash
az functionapp cors add \
  --name omnialert-backend \
  --resource-group rg-omnialert \
  --allowed-origins \
    "http://localhost:3000" \
    "https://omnialert-frontend.azurestaticapps.net"
```

---

## Step 3: Deploy Backend

### 3.1 Login to Azure

```bash
az login
az account show  # Verify correct subscription
```

### 3.2 Deploy Functions

```bash
cd backend
func azure functionapp publish omnialert-backend
```

**What happens:**
1. Code is packaged into a zip file
2. Uploaded to Azure
3. `npm install` runs in Azure
4. Functions are registered and started
5. URLs are displayed

**Expected output:**
```
Deployment successful.
Remote build succeeded!
Functions in omnialert-backend:
    GetWeatherData: [GET] https://omnialert-backend.azurewebsites.net/api/GetWeatherData
    GetWeather: [GET,POST] https://omnialert-backend.azurewebsites.net/api/GetWeather
    GetForecast: [GET] https://omnialert-backend.azurewebsites.net/api/GetForecast
    SearchLocations: [GET] https://omnialert-backend.azurewebsites.net/api/SearchLocations
    SaveUserLocation: [POST] https://omnialert-backend.azurewebsites.net/api/SaveUserLocation
    GetUserLocations: [GET] https://omnialert-backend.azurewebsites.net/api/GetUserLocations
    DailyForecastAlert: [GET,POST] https://omnialert-backend.azurewebsites.net/api/daily-forecast
    TonightsSkyAlert: [GET,POST] https://omnialert-backend.azurewebsites.net/api/tonights-sky
    ... (more functions)
```

### 3.3 Test Backend APIs

```bash
# Test weather endpoint
curl "https://omnialert-backend.azurewebsites.net/api/GetWeatherData?lat=53.35&lon=-6.26"

# Test location search
curl "https://omnialert-backend.azurewebsites.net/api/SearchLocations?query=Dublin"

# Save a test location
curl -X POST "https://omnialert-backend.azurewebsites.net/api/SaveUserLocation" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "locationName": "Dublin",
    "country": "IE",
    "latitude": 53.3498,
    "longitude": -6.2603,
    "alertsEnabled": true,
    "isPrimary": true
  }'

# Retrieve locations
curl "https://omnialert-backend.azurewebsites.net/api/GetUserLocations?userId=test-user"
```

All should return JSON responses!

---

## Step 4: Deploy Frontend

If you connected GitHub in Step 1.4, your frontend auto-deploys on every push. Otherwise, deploy manually:

### 4.1 Configure Frontend Environment

Create `frontend/.env.production`:
```env
REACT_APP_API_URL=https://omnialert-backend.azurewebsites.net/api
REACT_APP_ENTRA_CLIENT_ID=your-client-id
REACT_APP_ENTRA_TENANT_SUBDOMAIN=your-tenant-subdomain
REACT_APP_ENTRA_TENANT_ID=your-tenant-id
```

### 4.2 Build Production Bundle

```bash
cd frontend
npm run build
```

Creates optimized production build in `build/` folder.

### 4.3 Deploy to Static Web Apps (Manual)

**Get deployment token:**
1. Azure Portal → Your Static Web App
2. Overview → "Manage deployment token"
3. Copy the token

**Deploy:**
```bash
npx @azure/static-web-apps-cli deploy ./build \
  --deployment-token YOUR_TOKEN_HERE \
  --env production
```

### 4.4 Update CORS (if needed)

Add your actual Static Web App URL to Function App CORS:
```bash
az functionapp cors add \
  --name omnialert-backend \
  --resource-group rg-omnialert \
  --allowed-origins "https://your-actual-url.azurestaticapps.net"
```

---

## Step 5: Configure Telegram Bot Webhook

**What is this?** For the Telegram bot to receive messages, you need to tell Telegram where to send them (your Azure Function URL).

```bash
# Set webhook
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://omnialert-backend.azurewebsites.net/api/telegram-webhook"

# Verify webhook
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

You should see `"url": "https://omnialert-backend.azurewebsites.net/api/telegram-webhook"` in the response.

---

## Step 6: Verify Deployment

### 6.1 Test Production App

1. Open your Static Web App URL in browser
2. Sign in with Microsoft or Google
3. Navigate to Locations → Add a new location
4. Search for a city → Save it
5. Navigate to Dashboard → Select your location
6. Should display current weather, forecast, etc.

### 6.2 Test Telegram Alerts

1. Open Telegram → Find your bot
2. Send `/start` to register
3. Test a manual alert:
```bash
curl -X POST "https://omnialert-backend.azurewebsites.net/api/daily-forecast" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "YOUR_CHAT_ID", "locationName": "Dublin", "lat": 53.35, "lon": -6.26}'
```
4. You should receive a weather briefing in Telegram!

### 6.3 Verify Timer Triggers

Timer functions run automatically. Check they're scheduled:

```bash
# View function status
az functionapp function list \
  --name omnialert-backend \
  --resource-group rg-omnialert \
  --output table
```

### 6.4 Monitor Logs

**Via Azure Portal:**
1. Function App → Monitor → Log stream
2. Watch live logs as functions execute

**Via Azure CLI:**
```bash
az webapp log tail \
  --name omnialert-backend \
  --resource-group rg-omnialert
```

---

## Deployment Checklist

### Before Deploying

- [ ] All API keys obtained and tested locally
- [ ] OpenWeather API key activated (takes ~15 min for new keys)
- [ ] Telegram bot created and token saved
- [ ] Local testing passed (backend + frontend)
- [ ] Code committed and pushed to GitHub

### After Deploying Backend

- [ ] All environment variables set in Function App
- [ ] CORS configured with frontend URL
- [ ] `GetWeatherData` endpoint returns weather JSON
- [ ] `SaveUserLocation` endpoint saves to Table Storage
- [ ] Timer functions visible in function list

### After Deploying Frontend

- [ ] App loads without errors
- [ ] Login works (redirects to Entra and back)
- [ ] Can search and add locations
- [ ] Dashboard displays weather data
- [ ] No CORS errors in browser console

### After Full Deployment

- [ ] Telegram webhook configured
- [ ] Test alert sends successfully
- [ ] User preferences save correctly
- [ ] Timer alerts fire on schedule (check logs)

---

## Updating Deployments

### Update Backend

```bash
cd backend
func azure functionapp publish omnialert-backend
```

### Update Frontend

If using GitHub Actions (automatic):
```bash
git add .
git commit -m "Update frontend"
git push
```

If manual deployment:
```bash
cd frontend
npm run build
npx @azure/static-web-apps-cli deploy ./build \
  --deployment-token YOUR_TOKEN \
  --env production
```

---

## CI/CD with GitHub Actions

If you connected GitHub when creating the Static Web App, a workflow file was auto-created at `.github/workflows/azure-static-web-apps-*.yml`. This deploys the frontend automatically on every push to main.

For backend CI/CD, create `.github/workflows/backend-deploy.yml`:

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Deploy to Azure Functions
        uses: Azure/functions-action@v1
        with:
          app-name: omnialert-backend
          package: ./backend
          publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

**To set up:**
1. Azure Portal → Function App → Deployment Center → Manage publish profile
2. Download the publish profile
3. GitHub → Repository → Settings → Secrets → New repository secret
4. Name: `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`
5. Value: Paste the entire contents of the downloaded file

---

## Cost Monitoring

### View Current Costs

```bash
az consumption usage list \
  --start-date 2026-01-01 \
  --end-date 2026-01-31 \
  --output table
```

### Set Budget Alert

1. Azure Portal → Cost Management + Billing
2. Budgets → Create
3. Set monthly threshold (e.g., $10)
4. Configure email alerts at 80%, 100%, 120%

### Expected Monthly Costs

| Service | Estimated Cost | Notes |
|---------|----------------|-------|
| Static Web Apps | $0 | Free tier |
| Function App | $0 | Free tier (1M executions/month) |
| Table Storage | ~$0.05 | Minimal transactions |
| SQL Serverless | $0-8 | Auto-pauses when idle |
| **Total** | **~$0-10/month** | Mostly free tier usage |

---

## Troubleshooting Deployment

### Function App Not Starting

**Check environment variables:**
```bash
az functionapp config appsettings list \
  --name omnialert-backend \
  --resource-group rg-omnialert \
  --output table
```

**Common issues:**
- Missing `AZURE_STORAGE_CONNECTION_STRING`
- Connection string still says `UseDevelopmentStorage=true`
- Missing required API keys

**Fix:** Add missing settings and restart:
```bash
az functionapp restart \
  --name omnialert-backend \
  --resource-group rg-omnialert
```

### CORS Errors in Browser

**Check current CORS settings:**
```bash
az functionapp cors show \
  --name omnialert-backend \
  --resource-group rg-omnialert
```

**Fix:** Add your frontend URL:
```bash
az functionapp cors add \
  --name omnialert-backend \
  --resource-group rg-omnialert \
  --allowed-origins "https://your-frontend.azurestaticapps.net"
```

### Telegram Alerts Not Sending

1. **Verify webhook is set:**
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

2. **Check Function logs** for errors
3. **Verify `TELEGRAM_BOT_TOKEN`** is set correctly in app settings
4. **Test manually:**
```bash
curl -X POST "https://omnialert-backend.azurewebsites.net/api/daily-forecast" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "YOUR_CHAT_ID", "force": true}'
```

### Authentication Not Working

1. **Check Entra configuration:**
   - Redirect URI matches your Static Web App URL exactly
   - Application is configured for the correct account types
2. **Check frontend environment:**
   - `REACT_APP_ENTRA_CLIENT_ID` matches your app registration
   - `REACT_APP_ENTRA_TENANT_SUBDOMAIN` is correct
3. **Check browser console** for MSAL errors

### Table Storage Errors

**"Table not found" error:**
- Tables are auto-created when you first save a location
- Try saving a test location via the API

**Connection errors:**
- Verify connection string is correct (not the development one)
- Check storage account firewall allows Azure services

---

## Production URLs

After deployment, record your URLs:

```
Frontend:    https://[your-app].azurestaticapps.net
Backend:     https://[your-app]-backend.azurewebsites.net/api
Storage:     [your-storage-account] (Tables: UserLocations, UserPreferences, TelegramUsers)
SQL Server:  [your-server].database.windows.net
```

---

## Rollback Procedure

### Backend Rollback

```bash
# List recent deployments
az functionapp deployment list \
  --name omnialert-backend \
  --resource-group rg-omnialert

# Redeploy previous version (re-run from that commit)
git checkout <previous-commit>
func azure functionapp publish omnialert-backend
git checkout main
```

### Frontend Rollback

If using GitHub Actions, revert the commit and push. Otherwise:

```bash
git checkout <previous-commit>
cd frontend
npm run build
npx @azure/static-web-apps-cli deploy ./build --deployment-token YOUR_TOKEN
git checkout main
```

---

## Security Best Practices

1. **Never commit secrets** — Use environment variables and `.gitignore`
2. **Rotate API keys periodically** — Update in Azure Portal, not in code
3. **Restrict CORS** — Only allow your specific frontend origin
4. **Use HTTPS only** — Azure enforces this by default
5. **Enable Azure Defender** — For SQL database threat detection
6. **Monitor logs** — Set up alerts for unusual activity
7. **Use managed identities** — Where possible, avoid storing credentials