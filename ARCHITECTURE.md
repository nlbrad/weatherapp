# Weather Alert System - Architecture Overview

## System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
│        Azure Static Web Apps (Global CDN)                    │
│  https://calm-bush-003e62103.1.azurestaticapps.net          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Azure Functions)                   │
│         Serverless Compute - Node.js 20 Runtime              │
│  https://weather-alert-backend-cxc6ghhhagd7dgb8              │
│           .westeurope-01.azurewebsites.net                   │
│                                                               │
│  ┌────────────────┐  ┌─────────────────┐                   │
│  │  GetWeather    │  │ SaveUserLocation│                   │
│  │  HTTP Trigger  │  │  HTTP Trigger   │                   │
│  └────────────────┘  └─────────────────┘                   │
│                                                               │
│  ┌────────────────┐  ┌─────────────────┐                   │
│  │GetUserLocations│  │CheckAlertsAndNotify                 │
│  │  HTTP Trigger  │  │ Timer + HTTP     │                   │
│  └────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ OpenWeather  │    │ Azure Table  │    │   Twilio     │
│     API      │    │   Storage    │    │  WhatsApp    │
│              │    │saweatheralerts│   │     API      │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Technology Stack

### Frontend
- **Framework:** React 19.2.3
- **Styling:** Tailwind CSS v3
- **Icons:** Lucide React
- **Hosting:** Azure Static Web Apps (Free tier)
- **Build Tool:** Create React App with webpack

### Backend
- **Runtime:** Azure Functions v4 (Node.js 20 LTS)
- **Language:** JavaScript (ES6+)
- **Triggers:** HTTP, Timer (cron: `0 0 * * * *`)
- **Hosting:** Azure Function App (Consumption plan - Serverless)

### Database
- **Service:** Azure Table Storage (NoSQL)
- **Storage Account:** saweatheralerts
- **Tables:** UserLocations
- **Schema:**
  - PartitionKey: userId (groups data by user)
  - RowKey: locationName (unique per user)
  - Attributes: country, alertsEnabled, minTemp, maxTemp, createdAt

### External Services
- **Weather Data:** OpenWeatherMap API (Free tier: 1,000 calls/day)
- **Notifications:** Twilio WhatsApp API (~$0.009/message)

### Development Tools
- **Version Control:** Git with Azure DevOps Repos
- **Local Development:** 
  - Azurite (Azure Storage Emulator)
  - Azure Functions Core Tools v4.6.0
- **IDE:** Visual Studio Code on macOS
- **Package Manager:** npm

## Data Flow

### User Adds Location
1. User enters location details in frontend form
2. Frontend calls `POST /api/SaveUserLocation`
3. Backend validates data and saves to Table Storage
4. Frontend calls `GET /api/GetWeather` for current conditions
5. Frontend displays location card with live weather

### Automatic Alert Checking (Every Hour)
1. Timer trigger fires CheckAlertsAndNotify function
2. Function queries all locations from Table Storage
3. For each location with alertsEnabled=true:
   - Fetches current weather from OpenWeatherMap
   - Compares temperature to user's thresholds
   - If outside range: sends WhatsApp alert via Twilio
4. Logs results and alert count

### Manual Alert Check
1. User clicks "Check Alerts Now" button
2. Frontend calls `GET /api/CheckAlerts`
3. Same logic as timer trigger but runs immediately
4. Returns confirmation to frontend

## Security

### Authentication
- **Current:** None (demo/development)
- **Planned:** Azure AD B2C for user authentication

### API Security
- Functions use anonymous auth level (development)
- CORS enabled for specific origins:
  - `http://localhost:3000` (development)
  - `https://calm-bush-003e62103.1.azurestaticapps.net` (production)

### Secrets Management
- All API keys stored as Function App environment variables
- Never committed to source control
- Local development uses `local.settings.json` (gitignored)

## Scalability

### Current Limits (Free Tier)
- **Functions:** 1M executions/month, 400K GB-seconds compute
- **Storage:** 5GB data, 20K transactions/month
- **Static Web App:** 100GB bandwidth/month
- **OpenWeather API:** 1,000 calls/day

### Scaling Path
- Consumption plan auto-scales to handle load
- Table Storage scales automatically
- Can upgrade to Premium plans if needed

## Cost Analysis

### Current Monthly Costs
- Azure Static Web Apps: **$0** (Free tier)
- Azure Functions: **$0** (within free tier)
- Azure Table Storage: **$0** (within free tier)
- OpenWeatherMap: **$0** (Free tier)
- Twilio WhatsApp: **~$1-2** (pay per message)

**Total: ~$1-2/month** for light usage

## Known Limitations

1. **Single User ID:** Currently hardcoded to "user123"
2. **No User Management:** No login/signup system
3. **WhatsApp Sandbox:** Twilio sandbox expires, needs reconnection
4. **No Edit Functionality:** Can't edit location thresholds without re-adding
5. **Basic Error Handling:** Limited user feedback on errors
6. **No Data Backup:** Relies on Azure's built-in redundancy

## Future Architecture Considerations

### Phase 2 Enhancements
- Add Azure AD B2C authentication
- Implement user management system
- Add Azure Application Insights for monitoring
- Use Azure Key Vault for secrets management

### Phase 3 - AI Features
- Integrate Azure OpenAI for smart notifications
- Add conversational interface via WhatsApp
- Implement predictive weather alerts

### Scalability Improvements
- Add Azure Redis Cache for weather data caching
- Implement rate limiting with Azure API Management
- Add Azure Front Door with WAF for security