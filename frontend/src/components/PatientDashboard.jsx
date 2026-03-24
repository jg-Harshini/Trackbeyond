import React, { useState, useEffect, useRef } from 'react';
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
    Alert,
    List,
    ListItem,
    ListItemText,
    Divider
} from '@mui/material';
import { Logout, LocationOn, ContentCopy, Warning, WifiTethering } from '@mui/icons-material';

import { locationService } from '../services/locationService';
import { alertService } from '../services/alertService';
import { medicationService } from '../services/medicationService';
import { triggerFallAlert, triggerFogAlert, triggerMedicationAlert } from '../services/sensorAlertService';
import websocketService from '../services/websocketService';
import MapView from './MapView';

// ─── Constants ────────────────────────────────────────────────────────────────
const FALL_THRESHOLD = 25;        // m/s² spike considered a fall
const STILL_THRESHOLD = 3;        // m/s² — below this = lying still
const STILL_DURATION = 1500;      // ms still after impact = fall confirmed
const FOG_MIN_HZ = 3;             // Minimum FOG frequency (Hz)
const FOG_MAX_HZ = 8;             // Maximum FOG frequency (Hz)
const FOG_WINDOW_MS = 2000;       // Detection window
const SAMPLE_RATE = 50;           // Approximate Hz
const FALL_COOLDOWN = 10000;      // ms between fall alerts
const FOG_COOLDOWN = 15000;       // ms between FOG alerts
const MED_REMINDER_WINDOW = 15;   // minutes before scheduled time to warn
const MED_OVERDUE_WINDOW = 30;    // minutes after scheduled time to alert caretaker

const PatientDashboard = () => {
    const { user, logout } = useAuth();
    const [currentLocation, setCurrentLocation] = useState(null);
    const [mapCenter, setMapCenter] = useState(null);
    const [geoError, setGeoError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [emergencyStatus, setEmergencyStatus] = useState(null);

    // Sensor states
    const [sensorEnabled, setSensorEnabled] = useState(false);
    const [sensorError, setSensorError] = useState(null);
    const [fallStatus, setFallStatus] = useState(null);   // 'detected' | null
    const [fogStatus, setFogStatus] = useState(null);     // 'detected' | null

    // Medication states
    const [medications, setMedications] = useState([]);
    // takenDoses: { "medicationId_HH:MM_YYYY-MM-DD": true }
    const [takenDoses, setTakenDoses] = useState(() => {
        try { return JSON.parse(localStorage.getItem('takenDoses') || '{}'); }
        catch { return {}; }
    });
    const [medReminders, setMedReminders] = useState([]); // { name, time }
    const [medAlertsSent, setMedAlertsSent] = useState({}); // prevent duplicate alerts

    // Refs for sensor detection logic
    const impactTimeRef = useRef(null);
    const stillStartRef = useRef(null);
    const fogSamplesRef = useRef([]);
    const lastFallAlertRef = useRef(0);
    const lastFogAlertRef = useRef(0);
    const lastLocationRef = useRef(null);

    // ── Init ────────────────────────────────────────────────────────────────
    useEffect(() => {
        loadCurrentLocation();
        loadMedications();

        websocketService.connect(() => {
            websocketService.subscribeToLocation(user.patientId, (location) => {
                setCurrentLocation(location);
                if (location) setMapCenter({ lat: location.latitude, lng: location.longitude });
            });
        });

        return () => websocketService.disconnect();
    }, [user.patientId]);

    // ── Medication reminder polling ──────────────────────────────────────────
    useEffect(() => {
        if (medications.length === 0) return;
        const interval = setInterval(() => checkMedicationReminders(), 60000);
        checkMedicationReminders(); // run immediately too
        return () => clearInterval(interval);
    }, [medications, takenDoses]);

    // ── API calls ───────────────────────────────────────────────────────────
    const loadCurrentLocation = async () => {
        try {
            const location = await locationService.getCurrentLocation(user.patientId);
            setCurrentLocation(location);
            if (location) setMapCenter({ lat: location.latitude, lng: location.longitude });
        } catch (error) {
            console.error('Error loading current location:', error);
        }
    };

    const loadMedications = async () => {
        try {
            const meds = await medicationService.getPatientMedications(user.patientId);
            setMedications(meds);
        } catch (error) {
            console.error('Error loading medications:', error);
        }
    };

    const updateLocation = async (latitude, longitude) => {
        try {
            const saved = await locationService.updateLocation(user.patientId, latitude, longitude);
            setCurrentLocation(saved);
            setMapCenter({ lat: latitude, lng: longitude });
        } catch (error) {
            console.error('Error updating location:', error);
        }
    };

    // ── Sensor (DeviceMotion) ────────────────────────────────────────────────
    const enableSensor = async () => {
        // iOS 13+ requires explicit permission
        if (typeof DeviceMotionEvent !== 'undefined' &&
            typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceMotionEvent.requestPermission();
                if (permission !== 'granted') {
                    setSensorError('Motion sensor permission denied. Please allow access and try again.');
                    return;
                }
            } catch (e) {
                setSensorError('Could not request sensor permission: ' + e.message);
                return;
            }
        }

        if (!window.DeviceMotionEvent) {
            setSensorError('DeviceMotion not supported on this device/browser.');
            return;
        }

        window.addEventListener('devicemotion', handleMotion);

        // Also start GPS watchPosition now
        if (navigator.geolocation) {
            // Helper to calculate distance in meters between two coordinates
            const calcDistance = (lat1, lon1, lat2, lon2) => {
                const R = 6371e3;
                const rad = Math.PI / 180;
                const dLat = (lat2 - lat1) * rad;
                const dLon = (lon2 - lon1) * rad;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            };

            navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude, accuracy } = pos.coords;

                    // Don't update if the accuracy is extremely poor (e.g. > 50 meters)
                    if (accuracy > 50) return;

                    // Prevent GPS drift jitter when stationary by adding a 5-meter threshold
                    if (lastLocationRef.current) {
                        const dist = calcDistance(
                            lastLocationRef.current.latitude,
                            lastLocationRef.current.longitude,
                            latitude,
                            longitude
                        );
                        // If moved less than 5 meters, consider it GPS jitter/drift and ignore
                        if (dist < 5) return;
                    }

                    lastLocationRef.current = { latitude, longitude };
                    updateLocation(latitude, longitude);
                },
                (err) => setGeoError(err.message),
                { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
            );
        }

        setSensorEnabled(true);
        setSensorError(null);
    };

    const handleMotion = (event) => {
        const { x, y, z } = event.accelerationIncludingGravity || {};
        if (x == null || y == null || z == null) return;

        const magnitude = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();

        // ── Fall detection ─────────────────────────────────────────────────
        if (magnitude > FALL_THRESHOLD) {
            impactTimeRef.current = now;
            stillStartRef.current = null;
        }

        if (impactTimeRef.current && magnitude < STILL_THRESHOLD) {
            if (!stillStartRef.current) stillStartRef.current = now;
            if (now - stillStartRef.current > STILL_DURATION) {
                if (now - lastFallAlertRef.current > FALL_COOLDOWN) {
                    lastFallAlertRef.current = now;
                    impactTimeRef.current = null;
                    stillStartRef.current = null;
                    handleFallDetected();
                }
            }
        } else if (magnitude > STILL_THRESHOLD) {
            stillStartRef.current = null;
        }

        // ── FOG detection (zero-crossing rate on Z axis) ───────────────────
        const samples = fogSamplesRef.current;
        samples.push({ z: z, t: now });
        // Keep only last FOG_WINDOW_MS
        fogSamplesRef.current = samples.filter(s => now - s.t < FOG_WINDOW_MS);

        if (fogSamplesRef.current.length > 20) {
            const zcr = countZeroCrossings(fogSamplesRef.current.map(s => s.z));
            const windowSec = FOG_WINDOW_MS / 1000;
            const estimatedHz = zcr / (2 * windowSec);

            if (estimatedHz >= FOG_MIN_HZ && estimatedHz <= FOG_MAX_HZ) {
                if (now - lastFogAlertRef.current > FOG_COOLDOWN) {
                    lastFogAlertRef.current = now;
                    handleFogDetected();
                }
            }
        }
    };

    const countZeroCrossings = (data) => {
        let count = 0;
        for (let i = 1; i < data.length; i++) {
            if ((data[i - 1] >= 0 && data[i] < 0) || (data[i - 1] < 0 && data[i] >= 0)) count++;
        }
        return count;
    };

    const handleFallDetected = async () => {
        setFallStatus('detected');
        setTimeout(() => setFallStatus(null), 8000);
        try {
            await triggerFallAlert(user.patientId);
        } catch (e) { console.error('Fall alert error:', e); }
    };

    const handleFogDetected = async () => {
        setFogStatus('detected');
        setTimeout(() => setFogStatus(null), 8000);
        try {
            await triggerFogAlert(user.patientId);
        } catch (e) { console.error('FOG alert error:', e); }
    };

    // ── Medication reminder logic ────────────────────────────────────────────
    const checkMedicationReminders = () => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        const upcoming = [];

        medications.forEach(med => {
            (med.scheduleTimes || []).forEach(time => {
                const [h, m] = time.split(':').map(Number);
                const schedMinutes = h * 60 + m;
                const doseKey = `${med.id}_${time}_${todayStr}`;
                const alreadyTaken = takenDoses[doseKey];

                const diff = schedMinutes - nowMinutes; // positive = in future

                if (!alreadyTaken) {
                    // Reminder: within window before scheduled time
                    if (diff >= 0 && diff <= MED_REMINDER_WINDOW) {
                        upcoming.push({ name: med.medicationName, time, dosage: med.dosage, doseKey });
                    }

                    // Overdue: past scheduled time, alert caretaker once
                    if (diff < 0 && Math.abs(diff) >= MED_OVERDUE_WINDOW) {
                        const alertKey = `alerted_${doseKey}`;
                        if (!medAlertsSent[alertKey]) {
                            setMedAlertsSent(prev => ({ ...prev, [alertKey]: true }));
                            triggerMedicationAlert(user.patientId, med.medicationName, time)
                                .catch(e => console.error('Med alert error:', e));
                        }
                    }
                }
            });
        });

        setMedReminders(upcoming);
    };

    const markAsTaken = (doseKey) => {
        const updated = { ...takenDoses, [doseKey]: true };
        setTakenDoses(updated);
        localStorage.setItem('takenDoses', JSON.stringify(updated));
        // Re-check to clear the reminder banner
        setMedReminders(prev => prev.filter(r => r.doseKey !== doseKey));
    };

    // ── Other handlers ───────────────────────────────────────────────────────
    const handleEmergency = async () => {
        try {
            await alertService.triggerEmergencyAlert(user.patientId);
            setEmergencyStatus('success');
            setTimeout(() => setEmergencyStatus(null), 4000);
        } catch (error) {
            setEmergencyStatus('error');
            setTimeout(() => setEmergencyStatus(null), 4000);
        }
    };

    const copyPatientId = () => {
        navigator.clipboard.writeText(user.patientId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Today's medication schedule ──────────────────────────────────────────
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySchedule = medications.flatMap(med =>
        (med.scheduleTimes || []).map(time => ({
            medicationId: med.id,
            name: med.medicationName,
            dosage: med.dosage,
            time,
            doseKey: `${med.id}_${time}_${todayStr}`,
        }))
    ).sort((a, b) => a.time.localeCompare(b.time));

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <Box>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>Patient Dashboard</Typography>
                    <Button variant="contained" color="error" onClick={handleEmergency}
                        sx={{ mr: 2 }} startIcon={<Warning />}>
                        Emergency
                    </Button>
                    <Button color="inherit" onClick={logout} startIcon={<Logout />}>Logout</Button>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Grid container spacing={3}>

                    {/* Status banners */}
                    {emergencyStatus === 'success' && (
                        <Grid item xs={12}>
                            <Alert severity="success">Emergency alert sent! Your caretakers have been notified.</Alert>
                        </Grid>
                    )}
                    {emergencyStatus === 'error' && (
                        <Grid item xs={12}>
                            <Alert severity="error">Failed to send emergency alert. Please try again.</Alert>
                        </Grid>
                    )}
                    {fallStatus === 'detected' && (
                        <Grid item xs={12}>
                            <Alert severity="error" icon={false}>
                                ⚠️ <strong>FALL DETECTED</strong> — Your caretakers have been alerted.
                            </Alert>
                        </Grid>
                    )}
                    {fogStatus === 'detected' && (
                        <Grid item xs={12}>
                            <Alert severity="warning" icon={false}>
                                🚶 <strong>FREEZING OF GAIT DETECTED</strong> — Your caretakers have been alerted.
                            </Alert>
                        </Grid>
                    )}
                    {medReminders.map(rem => (
                        <Grid item xs={12} key={rem.doseKey}>
                            <Alert severity="warning"
                                action={
                                    <Button color="inherit" size="small" onClick={() => markAsTaken(rem.doseKey)}>
                                        Mark Taken
                                    </Button>
                                }>
                                💊 <strong>Medication Reminder:</strong> {rem.name} ({rem.dosage}) is due at {rem.time}
                            </Alert>
                        </Grid>
                    ))}

                    {/* Profile + Patient ID */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Profile</Typography>
                                <Typography variant="body1"><strong>Name:</strong> {user.username}</Typography>
                                <Typography variant="body1" sx={{ mt: 1 }}>
                                    <strong>Role:</strong> <Chip label="Patient" color="primary" size="small" />
                                </Typography>
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="body2" gutterBottom><strong>Shareable Patient ID:</strong></Typography>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
                                            {user.patientId}
                                        </Typography>
                                        <Button size="small" variant="outlined" onClick={copyPatientId} startIcon={<ContentCopy />}>
                                            {copied ? 'Copied!' : 'Copy'}
                                        </Button>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                        Share this ID with your caretakers
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Motion Sensor Card */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    <WifiTethering sx={{ mr: 1, verticalAlign: 'middle' }} />
                                    Motion Sensor
                                </Typography>
                                {sensorError && (
                                    <Alert severity="error" sx={{ mb: 2 }}>{sensorError}</Alert>
                                )}
                                {geoError && (
                                    <Alert severity="warning" sx={{ mb: 2 }}>{geoError}</Alert>
                                )}
                                {!sensorEnabled ? (
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Enable the motion sensor to start fall and freezing-of-gait detection.
                                            On iPhone, a permission prompt will appear.
                                        </Typography>
                                        <Button variant="contained" startIcon={<WifiTethering />} onClick={enableSensor}>
                                            Enable Motion Sensor
                                        </Button>
                                    </Box>
                                ) : (
                                    <Box>
                                        <Chip label="✅ Sensor Active" color="success" sx={{ mb: 1 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            Fall detection and freezing of gait monitoring are running.
                                        </Typography>
                                        <Box sx={{ mt: 2 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Detects falls (sharp acceleration spike + stillness) and FOG (3–8 Hz rhythmic trembling).
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Location Card */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    <LocationOn sx={{ mr: 1, verticalAlign: 'middle' }} />
                                    Current Location
                                </Typography>
                                {currentLocation ? (
                                    <Box>
                                        <Typography variant="body2"><strong>Lat:</strong> {currentLocation.latitude?.toFixed(6)}</Typography>
                                        <Typography variant="body2"><strong>Lng:</strong> {currentLocation.longitude?.toFixed(6)}</Typography>
                                        <Typography variant="body2"><strong>Updated:</strong> {new Date(currentLocation.timestamp).toLocaleString()}</Typography>
                                    </Box>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">No location data yet</Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Today's Medications */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>💊 Today's Medications</Typography>
                                {todaySchedule.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">No medications scheduled.</Typography>
                                ) : (
                                    <List dense>
                                        {todaySchedule.map((dose) => {
                                            const taken = takenDoses[dose.doseKey];
                                            return (
                                                <React.Fragment key={dose.doseKey}>
                                                    <ListItem
                                                        secondaryAction={
                                                            taken ? (
                                                                <Chip label="Taken ✓" color="success" size="small" />
                                                            ) : (
                                                                <Button size="small" variant="outlined" color="success"
                                                                    onClick={() => markAsTaken(dose.doseKey)}>
                                                                    Mark Taken
                                                                </Button>
                                                            )
                                                        }
                                                    >
                                                        <ListItemText
                                                            primary={`${dose.time} — ${dose.name}`}
                                                            secondary={dose.dosage}
                                                        />
                                                    </ListItem>
                                                    <Divider />
                                                </React.Fragment>
                                            );
                                        })}
                                    </List>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Map */}
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Your Real-Time Location</Typography>
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
