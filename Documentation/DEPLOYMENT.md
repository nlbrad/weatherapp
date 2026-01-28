# Azure Deployment Guide

Complete guide to deploying the Weather Alert System to production Azure environment.

## Prerequisites

- Azure subscription (free tier works)
- Azure CLI installed and authenticated
- Azure Functions Core Tools installed
- Code pushed to Azure DevOps repository

## Architecture Overview

**Production Resources:**
- Frontend: Azure Static Web Apps
- Backend: Azure Function App (Consumption plan)
- Database: Azure Storage Account (Table Storage)
- External: OpenWeatherMap API, Twilio WhatsApp API

## Step 1: Create Azure Resources

### 1.1 Create Resource Group
```bash
az group create \
  --name rg-weather-alert \
  --location westeurope
```

**Purpose:** Logical container for all resources

### 1.2 Create Storage Account
```bash
az storage account create \
  --name saweatheralerts \
  --resource-group rg-weather-alert \
  --location westeurope \
  --sku Standard_LRS
```

**Configuration:**
- **Name:** Must be globally unique, lowercase, no dashes
- **SKU:** Standard_LRS (Locally Redundant Storage - cheapest)
- **Purpose:** Stores UserLocations table

**Get connection string:**
```bash
az storage account show-connection-string \
  --name saweatheralerts \
  --resource-group rg-weather-alert \
  --output tsv
```

Save this connection string for later!

### 1.3 Create Function App

**Via Azure Portal:**

1. Go to portal.azure.com → Create a resource
2. Search "Function App" → Create
3. Fill in:
   - **Subscription:** Your subscription
   - **Resource Group:** rg-weather-alert
   - **Name:** weather-alert-backend (must be unique)
   - **Runtime:** Node.js
   - **Version:** 20 LTS
   - **Region:** West Europe (or your choice)
   - **OS:** Linux
   - **Plan:** Consumption (Serverless)
4. Storage → Create new (auto-generated name)
5. Review + Create → Create

**Wait 2-3 minutes for deployment**

**Via Azure CLI:**
```bash
# Create storage for function app
az storage account create \
  --name safunctionweather \
  --resource-group rg-weather-alert \
  --location westeurope \
  --sku Standard_LRS

# Create function app
az functionapp create \
  --resource-group rg-weather-alert \
  --consumption-plan-location westeurope \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --name weather-alert-backend \
  --storage-account safunctionweather \
  --os-type Linux
```

## Step 2: Configure Function App

### 2.1 Add Application Settings (Environment Variables)

**Via Azure Portal:**

1. Go to Function App → Configuration
2. Add these settings (click "+ New application setting" for each):

| Name | Value | Notes |
|------|-------|-------|
| `OPENWEATHER_API_KEY` | Your API key | From openweathermap.org |
| `AZURE_STORAGE_CONNECTION_STRING` | Storage connection string | From Step 1.2 |
| `TWILIO_ACCOUNT_SID` | Twilio SID | Starts with AC... |
| `TWILIO_AUTH_TOKEN` | Twilio token | From console.twilio.com |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` | Sandbox number |
| `TEST_WHATSAPP_NUMBER` | Your phone | Include country code |

3. Click "Save" → Confirm restart

**Via Azure CLI:**
```bash
az functionapp config appsettings set \
  --name weather-alert-backend \
  --resource-group rg-weather-alert \
  --settings \
    OPENWEATHER_API_KEY="your_key" \
    AZURE_STORAGE_CONNECTION_STRING="your_connection_string" \
    TWILIO_ACCOUNT_SID="your_sid" \
    TWILIO_AUTH_TOKEN="your_token" \
    TWILIO_WHATSAPP_FROM="whatsapp:+14155238886" \
    TEST_WHATSAPP_NUMBER="+353XXXXXXXXX"
```

### 2.2 Configure CORS

**Via Azure Portal:**

1. Function App → CORS (under API section)
2. Add allowed origins:
   - `http://localhost:3000` (for local testing)
   - Your Static Web App URL (from Step 3)
3. Click "Save"

**Via Azure CLI:**
```bash
az functionapp cors add \
  --name weather-alert-backend \
  --resource-group rg-weather-alert \
  --allowed-origins \
    "http://localhost:3000" \
    "https://your-static-app.azurestaticapps.net"
```

## Step 3: Deploy Backend Code

### 3.1 Login to Azure
```bash
az login
```

### 3.2 Deploy Functions
```bash
cd ~/vscode/weather-alert-app/backend

func azure functionapp publish weather-alert-backend
```

**What happens:**
- Code is packaged and uploaded
- `npm install` runs in Azure
- Functions are deployed and started
- URLs are displayed

**Expected output:**
```
Deployment successful.
Functions in weather-alert-backend:
    CheckAlertsAndNotifyHttp: [httpTrigger]
        Invoke url: https://weather-alert-backend-xxx.azurewebsites.net/api/checkalerts
    GetUserLocations: [httpTrigger]
        Invoke url: https://weather-alert-backend-xxx.azurewebsites.net/api/getuserlocations
    GetWeather: [httpTrigger]
        Invoke url: https://weather-alert-backend-xxx.azurewebsites.net/api/getweather
    SaveUserLocation: [httpTrigger]
        Invoke url: https://weather-alert-backend-xxx.azurewebsites.net/api/saveuserlocation
```

### 3.3 Test Backend APIs
```bash
# Test weather endpoint
curl "https://weather-alert-backend-xxx.azurewebsites.net/api/getweather?city=Dublin&country=IE"

# Add a location
curl -X POST https://weather-alert-backend-xxx.azurewebsites.net/api/saveuserlocation \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "locationName": "Dublin",
    "country": "IE",
    "alertsEnabled": true,
    "minTemp": 5,
    "maxTemp": 25
  }'

# Retrieve locations
curl "https://weather-alert-backend-xxx.azurewebsites.net/api/getuserlocations?userId=user123"
```

All should return JSON responses!

## Step 4: Deploy Frontend

### 4.1 Update API URL

Edit `frontend/src/services/api.js`:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  'https://weather-alert-backend-xxx.azurewebsites.net/api';
```

Replace `xxx` with your actual function app URL.

### 4.2 Remove Development Proxy

Edit `frontend/package.json` - remove this line:
```json
"proxy": "http://localhost:7071",
```

### 4.3 Commit Changes
```bash
git add .
git commit -m "Update frontend for production deployment"
git push
```

### 4.4 Build Production Bundle
```bash
cd frontend
npm run build
```

Creates optimized production build in `build/` folder.

### 4.5 Deploy to Static Web Apps

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

**Or via Azure CLI:**
```bash
az staticwebapp deploy \
  --name your-static-app-name \
  --resource-group rg-weather-alert \
  --app-location ./build \
  --output-location .
```

### 4.6 Update CORS with Static App URL

Now that you have the Static Web App URL, add it to Function App CORS:
```bash
az functionapp cors add \
  --name weather-alert-backend \
  --resource-group rg-weather-alert \
  --allowed-origins "https://your-actual-url.azurestaticapps.net"
```

## Step 5: Verify Deployment

### 5.1 Test Production App

1. Open your Static Web App URL in browser
2. Should see weather dashboard
3. Add a location → Should fetch weather
4. Click "Check Alerts Now" → Should receive WhatsApp

### 5.2 Verify Timer Trigger

**Check if timer is scheduled:**
```bash
az functionapp function show \
  --name weather-alert-backend \
  --resource-group rg-weather-alert \
  --function-name CheckAlertsAndNotify
```

Timer should run every hour automatically!

### 5.3 Monitor Function Logs

**Via Azure Portal:**
1. Function App → Log stream (under Monitoring)
2. Watch live logs
3. Trigger an alert to see output

**Via Azure CLI:**
```bash
az webapp log tail \
  --name weather-alert-backend \
  --resource-group rg-weather-alert
```

## Deployment Checklist

**Before deploying:**
- [ ] All environment variables configured
- [ ] API keys valid and active
- [ ] Twilio WhatsApp sandbox connected
- [ ] Code committed to repository
- [ ] Local testing passed

**After deploying:**
- [ ] Backend APIs responding correctly
- [ ] Frontend loads and displays data
- [ ] Can add new locations
- [ ] Alerts send to WhatsApp
- [ ] Timer trigger scheduled
- [ ] CORS working from frontend
- [ ] No errors in Function logs

## Troubleshooting Deployment

### Function App Not Starting

**Check:**
```bash
# View app settings
az functionapp config appsettings list \
  --name weather-alert-backend \
  --resource-group rg-weather-alert
```

**Common issues:**
- Missing `AZURE_STORAGE_CONNECTION_STRING`
- Wrong connection string format
- `customHandler` in host.json (remove it!)

### CORS Errors

**Verify CORS settings:**
```bash
az functionapp cors show \
  --name weather-alert-backend \
  --resource-group rg-weather-alert
```

Should include both localhost and Static App URL.

### WhatsApp Not Sending

**Check logs:**
1. Function App → Log stream
2. Trigger alert
3. Look for "Failed to send WhatsApp message"

**Common issues:**
- Twilio sandbox expired (rejoin)
- Wrong credentials
- Missing TEST_WHATSAPP_NUMBER

### Table Not Found Error

**Solution:** Add a location first - it auto-creates the table.

## Updating Deployment

### Update Backend
```bash
cd backend
func azure functionapp publish weather-alert-backend
```

### Update Frontend
```bash
cd frontend
npm run build
npx @azure/static-web-apps-cli deploy ./build \
  --deployment-token YOUR_TOKEN \
  --env production
```

## CI/CD Pipeline (Future Enhancement)

Currently using manual deployment. Future improvement: Azure DevOps pipeline for automatic deployment on git push.

## Cost Monitoring

**View costs:**
```bash
az consumption usage list \
  --start-date 2026-01-01 \
  --end-date 2026-01-31
```

**Set budget alert:**
1. Azure Portal → Cost Management
2. Budgets → Create
3. Set threshold (e.g., $10/month)
4. Configure email alerts

## Production URLs

**After deployment, save these:**
```
Frontend: https://calm-bush-003e62103.1.azurestaticapps.net
Backend: https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api
Storage: saweatheralerts (Table: UserLocations)
```

## Rollback Procedure

**If deployment fails:**
```bash
# List deployment slots
az functionapp deployment list-publishing-profiles \
  --name weather-alert-backend \
  --resource-group rg-weather-alert

# Redeploy previous version
func azure functionapp publish weather-alert-backend --previous
```

## Security Best Practices

1. **Never commit secrets** - Always use environment variables
2. **Rotate API keys** - Periodically update Twilio, OpenWeather keys
3. **Enable HTTPS only** - Azure does this by default
4. **Restrict CORS** - Only allow specific origins
5. **Monitor logs** - Watch for suspicious activity