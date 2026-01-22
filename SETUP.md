# Local Development Setup Guide

## Prerequisites

- **macOS** (tested on macOS with Apple Silicon)
- **Node.js v20.x** (managed with nvm)
- **npm** (comes with Node.js)
- **Git**
- **Azure CLI**
- **Azure Functions Core Tools v4**
- **Visual Studio Code** (recommended)

## Initial Setup

### 1. Install Node.js with nvm
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Add to shell profile
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.zshrc
source ~/.zshrc

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version  # Should show v20.x.x
```

### 2. Install Azure Tools
```bash
# Install Azure CLI
brew update && brew install azure-cli

# Install Azure Functions Core Tools
brew tap azure/functions
brew install azure-functions-core-tools@4

# Verify installations
az --version
func --version  # Should show 4.6.0 or higher
```

### 3. Clone Repository
```bash
# Clone from Azure DevOps
git clone https://dev.azure.com/neilsbradshaw/Weather_Alert_App/_git/Weather_Alert_App
cd Weather_Alert_App
```

## Frontend Setup

### Install Dependencies
```bash
cd frontend
npm install
```

**Key packages installed:**
- `react` & `react-dom` - UI framework
- `tailwindcss` - Styling
- `lucide-react` - Icons
- `@testing-library/*` - Testing utilities

### Configure Environment

**For local development (optional):**
Create `frontend/.env.local`:
```
REACT_APP_API_URL=http://localhost:7071/api
```

### Run Development Server
```bash
npm start
```

App opens at `http://localhost:3000`

**Features:**
- Hot reload on file changes
- Proxies API requests to backend
- Shows helpful errors

## Backend Setup

### Install Dependencies
```bash
cd backend
npm install
```

**Key packages:**
- `@azure/functions` - Functions SDK
- `@azure/data-tables` - Table Storage client
- `axios` - HTTP client for weather API
- `twilio` - WhatsApp messaging

### Configure Local Settings

Create `backend/local.settings.json`:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "OPENWEATHER_API_KEY": "your_openweather_api_key",
    "AZURE_STORAGE_CONNECTION_STRING": "UseDevelopmentStorage=true",
    "TWILIO_ACCOUNT_SID": "your_twilio_account_sid",
    "TWILIO_AUTH_TOKEN": "your_twilio_auth_token",
    "TWILIO_WHATSAPP_FROM": "whatsapp:+14155238886",
    "TEST_WHATSAPP_NUMBER": "+353XXXXXXXXX"
  }
}
```

**⚠️ IMPORTANT:** This file is gitignored. Never commit API keys!

### Get API Keys

**OpenWeatherMap:**
1. Sign up at https://openweathermap.org/api
2. Get free API key from dashboard
3. Copy to `OPENWEATHER_API_KEY`

**Twilio (for WhatsApp):**
1. Sign up at https://www.twilio.com/try-twilio
2. Copy Account SID and Auth Token
3. Go to Messaging → Try WhatsApp
4. Send sandbox join code from your phone
5. Copy credentials to config

### Start Azurite (Storage Emulator)

**Terminal 1:**
```bash
cd backend
npx azurite
```

Leave this running. It simulates Azure Table Storage locally.

### Start Functions

**Terminal 2:**
```bash
cd backend
npm start
```

Functions available at `http://localhost:7071/api/`

You should see:
```
Functions:
    CheckAlertsAndNotifyHttp: [GET,POST] http://localhost:7071/api/CheckAlerts
    GetUserLocations: [GET] http://localhost:7071/api/GetUserLocations
    GetWeather: [GET,POST] http://localhost:7071/api/GetWeather
    SaveUserLocation: [POST] http://localhost:7071/api/SaveUserLocation
    CheckAlertsAndNotify: timerTrigger
```

## Testing Locally

### Test Backend APIs
```bash
# Get weather
curl "http://localhost:7071/api/GetWeather?city=Dublin&country=IE"

# Save location
curl -X POST http://localhost:7071/api/SaveUserLocation \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "locationName": "Dublin",
    "country": "IE",
    "alertsEnabled": true,
    "minTemp": 5,
    "maxTemp": 25
  }'

# Get locations
curl "http://localhost:7071/api/GetUserLocations?userId=user123"

# Trigger alert check
curl "http://localhost:7071/api/CheckAlerts"
```

### Test Frontend

1. Open `http://localhost:3000`
2. App should load with dashboard
3. Add a location (e.g., London, GB)
4. Should fetch and display current weather
5. Click "Check Alerts Now" to test WhatsApp

## Common Issues & Solutions

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Azurite Connection Failed

**Error:** `connect ECONNREFUSED 127.0.0.1:10002`

**Solution:** Make sure Azurite is running in another terminal

### Functions Timeout

**Error:** `Initializing HttpWorker timed out`

**Solutions:**
- Check `host.json` doesn't have `customHandler` section
- Delete `node_modules` and `npm install` again
- Check for syntax errors: `node --check src/functions/*.js`

### CORS Errors

**Error:** `blocked by CORS policy`

**Solution:** 
- Make sure `proxy` is set in `frontend/package.json`
- Restart frontend after adding proxy

### Tailwind Not Working

**Error:** No styling on frontend

**Solution:**
```bash
# Check Tailwind version
npm list tailwindcss  # Should be v3.x.x

# If v4, downgrade
npm uninstall tailwindcss
npm install -D tailwindcss@3 postcss@8 autoprefixer@10
npx tailwindcss init -p
```

## Development Workflow

### Typical Development Session

**Terminal 1 - Azurite:**
```bash
cd backend
npx azurite
```

**Terminal 2 - Backend:**
```bash
cd backend
npm start
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm start
```

**Terminal 4 - Commands/Git:**
```bash
# Your working terminal for git, testing, etc.
```

### Making Changes

1. Edit code in VSCode
2. Save files
3. Frontend: Hot reloads automatically
4. Backend: Restart if adding new functions
5. Test in browser at `localhost:3000`

### Committing Changes
```bash
# Check status
git status

# Add files
git add .

# Commit
git commit -m "Description of changes"

# Push to Azure DevOps
git push
```

## Project Structure
```
Weather_Alert_App/
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── staticwebapp.config.json
│   ├── src/
│   │   ├── services/
│   │   │   └── api.js              # API client
│   │   ├── App.js                   # Main component
│   │   ├── index.js                 # Entry point
│   │   └── index.css                # Tailwind imports
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
└── backend/
    ├── src/
    │   └── functions/
    │       ├── GetWeather.js
    │       ├── SaveUserLocation.js
    │       ├── GetUserLocations.js
    │       └── CheckAlertsAndNotify.js
    ├── host.json                    # Function app config
    ├── local.settings.json          # Local env vars (gitignored)
    └── package.json
```

## Next Steps

Once local development is working:
1. See DEPLOYMENT.md for deploying to Azure
2. See API_DOCS.md for API reference
3. See TROUBLESHOOTING.md for common issues