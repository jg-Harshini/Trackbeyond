# Dementia Patient Tracking System

A comprehensive web application for tracking dementia patients using GPS technology with real-time location monitoring, geofencing alerts, and role-based access control.

## Features

### For Patients
- **Shareable Patient ID**: Generate and share a unique ID with caretakers
- **Location Tracking**: Automatic GPS location updates
- **Profile Management**: View and update personal information
- **Location History**: View past location data

### For Caretakers
- **Real-time Map View**: Track patient locations on Google Maps
- **Safe Zone Management**: Create circular geofences by clicking on the map
- **Automatic Alerts**: Receive instant notifications when patients exit safe zones
- **Multiple Patient Support**: Link and monitor multiple patients
- **Alert Dashboard**: View and acknowledge geofencing alerts

### Technical Features
- **Role-Based Authentication**: Separate dashboards for patients and caretakers
- **Real-time Updates**: WebSocket integration for live location and alert updates
- **Geofencing**: Haversine formula for accurate distance calculations
- **MongoDB Atlas**: Cloud database for scalable data storage

## Technology Stack

### Backend
- Java Spring Boot 3.2.2
- MongoDB Atlas
- Spring Security with JWT
- WebSocket (STOMP)

### Frontend
- React
- Material-UI (MUI)
- Google Maps API
- Axios
- WebSocket (SockJS + STOMP)

## Prerequisites

- Java 17 or higher
- Node.js 18 or higher
- MongoDB Atlas account
- Google Maps API key

## Usage Guide

### Patient Workflow

1. **Register**: Create an account with role "Patient"
2. **Login**: Access the patient dashboard
3. **Share ID**: Copy your shareable Patient ID from the dashboard
4. **Send ID**: Share this ID with your caretakers
5. **Location Tracking**: Your location will be automatically tracked

### Caretaker Workflow

1. **Register**: Create an account with role "Caretaker"
2. **Login**: Access the caretaker dashboard
3. **Link Patient**: Click "Link Patient" and enter the patient's shareable ID
4. **View Map**: See patient location on Google Maps in real-time
5. **Create Safe Zones**: Click anywhere on the map to create a safe zone
   - Enter zone name (e.g., "Home", "Park")
   - Set radius in meters
   - Click "Create"
6. **Monitor Alerts**: Receive automatic notifications when patients exit safe zones
7. **Acknowledge Alerts**: Click the notification icon to view and acknowledge alerts

## Geofencing Implementation

The system uses the **Haversine formula** to calculate distances between GPS coordinates:

```java
distance = 2 * R * arcsin(sqrt(
    sin²((lat2 - lat1) / 2) + 
    cos(lat1) * cos(lat2) * sin²((lon2 - lon1) / 2)
))
```

Where:
- R = Earth's radius (6,371 km)
- lat1, lon1 = Patient's current location
- lat2, lon2 = Safe zone center

**Alert Triggering**: When `distance > zone.radius`, an alert is automatically created and sent via WebSocket to all linked caretakers.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Locations
- `POST /api/locations` - Update patient location
- `GET /api/locations/patient/{id}/current` - Get current location
- `GET /api/locations/patient/{id}/history` - Get location history

### Safe Zones
- `POST /api/safezones` - Create safe zone (Caretaker only)
- `GET /api/safezones/patient/{id}` - Get patient safe zones
- `PUT /api/safezones/{id}` - Update safe zone
- `DELETE /api/safezones/{id}` - Delete safe zone

### Alerts
- `GET /api/alerts/patient/{id}` - Get all alerts
- `GET /api/alerts/patient/{id}/unacknowledged` - Get unacknowledged alerts
- `PUT /api/alerts/{id}/acknowledge` - Acknowledge alert

### Users
- `GET /api/users/{id}` - Get user details
- `PUT /api/users/{id}` - Update user profile
- `POST /api/users/link` - Link caretaker to patient

## WebSocket Topics

- `/topic/location/{patientId}` - Real-time location updates
- `/topic/alerts/{patientId}` - Real-time alert notifications

## Project Structure

```
dementia-tracker/
├── backend/
│   ├── src/main/java/com/dementiatracker/
│   │   ├── config/          # Security & WebSocket config
│   │   ├── controller/      # REST controllers
│   │   ├── dto/             # Data transfer objects
│   │   ├── model/           # Entity models
│   │   ├── repository/      # MongoDB repositories
│   │   ├── security/        # JWT utilities
│   │   └── service/         # Business logic
│   └── pom.xml
└── frontend/
    ├── src/
    │   ├── components/      # React components
    │   ├── context/         # React context (Auth)
    │   ├── services/        # API services
    │   └── App.jsx
    └── package.json
```


This project is for educational and personal use.

## Support

For issues or questions, please create an issue in the repository.
