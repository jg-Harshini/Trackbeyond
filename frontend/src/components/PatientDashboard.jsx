import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Container,
    Typography,
    Box,
    Button,
    AppBar,
    Toolbar,
    Card,
    CardContent,
    Grid,
    Chip,
    Alert
} from '@mui/material';
import { Logout, LocationOn, ContentCopy, Warning } from '@mui/icons-material';
import { locationService } from '../services/locationService';
import { alertService } from '../services/alertService';
import websocketService from '../services/websocketService';
import MapView from './MapView';

const PatientDashboard = () => {
    const { user, logout } = useAuth();
    const [currentLocation, setCurrentLocation] = useState(null);
    const [locationHistory, setLocationHistory] = useState([]);
    const [copied, setCopied] = useState(false);
    const [mapCenter, setMapCenter] = useState(null); // null until real location loaded
    const [watchId, setWatchId] = useState(null);
    const [geoError, setGeoError] = useState(null);
    const [emergencyStatus, setEmergencyStatus] = useState(null); // 'success' | 'error' | null

    useEffect(() => {
        loadCurrentLocation();

        // Connect to WebSocket
        websocketService.connect(() => {
            websocketService.subscribeToLocation(user.patientId, (location) => {
                setCurrentLocation(location);
                if (location) {
                    setMapCenter({ lat: location.latitude, lng: location.longitude });
                }
            });
        });

        // Use watchPosition for real-time tracking
        let id = null;
        if (navigator.geolocation) {
            id = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    updateLocation(latitude, longitude);
                    setGeoError(null);
                },
                (error) => {
                    console.error('Error watching position:', error);
                    let errorMsg = 'Unknown error';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMsg = "Location permission denied. Please enable location access.";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMsg = "Location information is unavailable.";
                            break;
                        case error.TIMEOUT:
                            errorMsg = "Request to get user location timed out.";
                            break;
                    }
                    setGeoError(errorMsg);
                },
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
            );
            setWatchId(id);
        } else {
            setGeoError("Geolocation is not supported by this browser or requires HTTPS.");
        }

        return () => {
            if (id !== null) {
                navigator.geolocation.clearWatch(id);
            }
            websocketService.disconnect();
        };
    }, [user.patientId]);

    const loadCurrentLocation = async () => {
        try {
            const location = await locationService.getCurrentLocation(user.patientId);
            setCurrentLocation(location);
            // Pin map to real location on load/refresh
            if (location) {
                setMapCenter({ lat: location.latitude, lng: location.longitude });
            }
        } catch (error) {
            console.error('Error loading current location:', error);
        }
    };

    const loadLocationHistory = async () => {
        try {
            const history = await locationService.getLocationHistory(user.patientId);
            setLocationHistory(history.slice(0, 10)); // Show last 10 locations
        } catch (error) {
            console.error('Error loading location history:', error);
        }
    };

    const updateLocation = async (latitude, longitude) => {
        try {
            await locationService.updateLocation(user.patientId, latitude, longitude);
        } catch (error) {
            console.error('Error updating location:', error);
        }
    };

    const handleEmergency = async () => {
        try {
            await alertService.triggerEmergencyAlert(user.patientId);
            setEmergencyStatus('success');
            setTimeout(() => setEmergencyStatus(null), 4000);
        } catch (error) {
            console.error('Error sending emergency alert:', error);
            setEmergencyStatus('error');
            setTimeout(() => setEmergencyStatus(null), 4000);
        }
    };

    const copyPatientId = () => {
        navigator.clipboard.writeText(user.patientId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Box>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Patient Dashboard
                    </Typography>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleEmergency}
                        sx={{ mr: 2 }}
                        startIcon={<Warning />}
                    >
                        Emergency
                    </Button>
                    <Button color="inherit" onClick={logout} startIcon={<Logout />}>
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Profile Information
                                </Typography>
                                <Typography variant="body1">
                                    <strong>Name:</strong> {user.username}
                                </Typography>
                                <Typography variant="body1" sx={{ mt: 1 }}>
                                    <strong>Role:</strong> <Chip label="Patient" color="primary" size="small" />
                                </Typography>
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="body2" gutterBottom>
                                        <strong>Shareable Patient ID:</strong>
                                    </Typography>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
                                            {user.patientId}
                                        </Typography>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={copyPatientId}
                                            startIcon={<ContentCopy />}
                                        >
                                            {copied ? 'Copied!' : 'Copy'}
                                        </Button>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                        Share this ID with your caretakers to allow them to track your location
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    <LocationOn /> Current Location
                                </Typography>
                                {geoError && (
                                    <Box sx={{ mb: 2, p: 1, bgcolor: '#fff4f4', borderLeft: '4px solid #d32f2f' }}>
                                        <Typography variant="body2" color="error">
                                            <strong>Tracking Error:</strong> {geoError}
                                        </Typography>
                                    </Box>
                                )}
                                {currentLocation ? (
                                    <Box>
                                        <Typography variant="body2">
                                            <strong>Latitude:</strong> {currentLocation.latitude.toFixed(6)}
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>Longitude:</strong> {currentLocation.longitude.toFixed(6)}
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>Last Updated:</strong> {new Date(currentLocation.timestamp).toLocaleString()}
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        No location data available
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {emergencyStatus === 'success' && (
                        <Grid item xs={12}>
                            <Alert severity="success">
                                Emergency alert sent! Your caretakers have been notified.
                            </Alert>
                        </Grid>
                    )}
                    {emergencyStatus === 'error' && (
                        <Grid item xs={12}>
                            <Alert severity="error">
                                Failed to send emergency alert. Please try again or call emergency services directly.
                            </Alert>
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Your Real-Time Location
                                </Typography>
                                {mapCenter ? (
                                    <MapView
                                        patients={[{ id: user.patientId, location: currentLocation }]}
                                        center={mapCenter}
                                        showSafeZones={false}
                                    />
                                ) : (
                                    <Box height="300px" display="flex" alignItems="center" justifyContent="center">
                                        <Typography color="text.secondary">Loading your location…</Typography>
                                    </Box>
                                )}
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    This map shows your current location being shared with your caretakers.
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default PatientDashboard;
