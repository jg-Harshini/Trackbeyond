import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Container,
    Paper,
    Typography,
    Box,
    Button,
    AppBar,
    Toolbar,
    Grid,
    Card,
    CardContent,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Chip,
    Badge,
    IconButton,
    Alert
} from '@mui/material';
import { Logout, Add, Notifications, PersonAdd, Delete } from '@mui/icons-material';
import MapView from './MapView';
import { locationService } from '../services/locationService';
import { safeZoneService } from '../services/safeZoneService';
import { alertService } from '../services/alertService';
import { userService } from '../services/userService';
import { medicationService } from '../services/medicationService';
import websocketService from '../services/websocketService';

const CaretakerDashboard = () => {
    const { user, logout } = useAuth();
    const [patients, setPatients] = useState([]);
    const [safeZones, setSafeZones] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [openZoneDialog, setOpenZoneDialog] = useState(false);
    const [openLinkDialog, setOpenLinkDialog] = useState(false);
    const [openAlertsDialog, setOpenAlertsDialog] = useState(false);
    const [locationHistory, setLocationHistory] = useState([]);
    const [newZone, setNewZone] = useState({
        name: '',
        centerLatitude: 0,
        centerLongitude: 0,
        radiusInMeters: 500,
        patientId: ''
    });
    const [linkPatientId, setLinkPatientId] = useState('');
    const [mapCenter, setMapCenter] = useState(null); // null = not yet loaded

    // Medication state
    const [medications, setMedications] = useState([]);
    const [openMedDialog, setOpenMedDialog] = useState(false);
    const [newMed, setNewMed] = useState({ medicationName: '', dosage: '', scheduleTimes: [''], notes: '' });

    useEffect(() => {
        loadUserData();

        websocketService.connect(() => {
            console.log('WebSocket connected for caretaker');
        });

        return () => {
            websocketService.disconnect();
        };
    }, []);

    useEffect(() => {
        if (selectedPatient) {
            loadPatientData(selectedPatient);
            loadLocationHistory(selectedPatient);
            loadMedications(selectedPatient);

            const locationSub = websocketService.subscribeToLocation(selectedPatient, (location) => {
                updatePatientLocation(selectedPatient, location);
                if (location) {
                    setMapCenter({ lat: location.latitude, lng: location.longitude });
                }
            });

            return () => {
                if (locationSub) locationSub.unsubscribe();
            };
        }
    }, [selectedPatient]);

    useEffect(() => {
        if (patients.length > 0) {
            const subs = patients.map(patient => {
                return websocketService.subscribeToAlerts(patient.id, (alert) => {
                    setAlerts(prev => {
                        if (prev.some(a => a.id === alert.id)) return prev;
                        return [alert, ...prev];
                    });
                });
            });

            return () => {
                subs.forEach(sub => sub && sub.unsubscribe());
            };
        }
    }, [patients]);

    const loadUserData = async () => {
        try {
            const userData = await userService.getUser(user.userId);
            if (userData.linkedPatientIds && userData.linkedPatientIds.length > 0) {
                const patientPromises = userData.linkedPatientIds.map(async (patientId) => {
                    const [location, patientUser] = await Promise.all([
                        locationService.getCurrentLocation(patientId).catch(() => null),
                        userService.getUserByPatientId(patientId).catch(() => null)
                    ]);
                    return {
                        id: patientId,
                        name: patientUser?.username || `Patient ${patientId.substring(0, 8)}`,
                        location
                    };
                });
                const patientsData = await Promise.all(patientPromises);
                setPatients(patientsData);

                if (patientsData.length > 0) {
                    const firstPatientId = patientsData[0].id;
                    setSelectedPatient(firstPatientId);
                    // Set initial map center from first patient's location
                    if (patientsData[0].location) {
                        setMapCenter({
                            lat: patientsData[0].location.latitude,
                            lng: patientsData[0].location.longitude
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    };

    const loadPatientData = async (patientId) => {
        try {
            const [zones, patientAlerts] = await Promise.all([
                safeZoneService.getActiveSafeZones(patientId),
                alertService.getUnacknowledgedAlerts(patientId)
            ]);

            setSafeZones(zones);
            setAlerts(patientAlerts);

            // Set map center to patient's actual current location
            const location = await locationService.getCurrentLocation(patientId).catch(() => null);
            if (location) {
                setMapCenter({ lat: location.latitude, lng: location.longitude });
            }
        } catch (error) {
            console.error('Error loading patient data:', error);
        }
    };

    const loadLocationHistory = async (patientId) => {
        try {
            const history = await locationService.getLocationHistory(patientId);
            setLocationHistory(history.slice(0, 10));
        } catch (error) {
            console.error('Error loading location history:', error);
        }
    };

    const updatePatientLocation = (patientId, location) => {
        setPatients(prev => prev.map(p =>
            p.id === patientId ? { ...p, location } : p
        ));
    };

    const handleMapClick = (coords) => {
        if (selectedPatient) {
            setNewZone({
                ...newZone,
                centerLatitude: coords.lat,
                centerLongitude: coords.lng,
                patientId: selectedPatient
            });
            setOpenZoneDialog(true);
        }
    };

    const handleCreateZone = async () => {
        try {
            await safeZoneService.createSafeZone(newZone);
            setOpenZoneDialog(false);
            loadPatientData(selectedPatient);
            setNewZone({
                name: '',
                centerLatitude: 0,
                centerLongitude: 0,
                radiusInMeters: 500,
                patientId: ''
            });
        } catch (error) {
            console.error('Error creating safe zone:', error);
        }
    };

    const handleDeleteZone = async (zoneId) => {
        try {
            await safeZoneService.deleteSafeZone(zoneId);
            setSafeZones(prev => prev.filter(z => z.id !== zoneId));
        } catch (error) {
            console.error('Error deleting safe zone:', error);
        }
    };

    const loadMedications = async (patientId) => {
        try {
            const meds = await medicationService.getPatientMedications(patientId);
            setMedications(meds);
        } catch (error) {
            console.error('Error loading medications:', error);
        }
    };

    const handleAddMedication = async () => {
        try {
            const med = {
                ...newMed,
                patientId: selectedPatient,
                createdByCaretakerId: user.userId,
                scheduleTimes: newMed.scheduleTimes.filter(t => t.trim() !== '')
            };
            await medicationService.createMedication(med);
            setOpenMedDialog(false);
            setNewMed({ medicationName: '', dosage: '', scheduleTimes: [''], notes: '' });
            loadMedications(selectedPatient);
        } catch (error) {
            console.error('Error adding medication:', error);
        }
    };

    const handleDeleteMedication = async (medId) => {
        try {
            await medicationService.deleteMedication(medId);
            setMedications(prev => prev.filter(m => m.id !== medId));
        } catch (error) {
            console.error('Error deleting medication:', error);
        }
    };

    const addTimeSlot = () => setNewMed(prev => ({ ...prev, scheduleTimes: [...prev.scheduleTimes, ''] }));
    const updateTimeSlot = (index, value) => {
        const times = [...newMed.scheduleTimes];
        times[index] = value;
        setNewMed(prev => ({ ...prev, scheduleTimes: times }));
    };
    const removeTimeSlot = (index) => {
        const times = newMed.scheduleTimes.filter((_, i) => i !== index);
        setNewMed(prev => ({ ...prev, scheduleTimes: times.length ? times : [''] }));
    };

    const handleLinkPatient = async () => {
        try {
            await userService.linkCaretakerToPatient(user.userId, linkPatientId);
            setOpenLinkDialog(false);
            setLinkPatientId('');
            loadUserData();
        } catch (error) {
            console.error('Error linking patient:', error);
            alert('Failed to link patient. Please check the Patient ID.');
        }
    };

    const handleAcknowledgeAlert = async (alertId) => {
        try {
            await alertService.acknowledgeAlert(alertId, user.userId);
            setAlerts(prev => prev.filter(a => a.id !== alertId));
        } catch (error) {
            console.error('Error acknowledging alert:', error);
        }
    };

    // Helper: get patient display name from patientId
    const getPatientDisplayName = (patientId) => {
        const p = patients.find(p => p.id === patientId);
        return p ? p.name : `Patient ${patientId?.substring(0, 8)}`;
    };

    return (
        <Box>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Caretaker Dashboard
                    </Typography>
                    <IconButton color="inherit" onClick={() => setOpenAlertsDialog(true)}>
                        <Badge badgeContent={alerts.length} color="error">
                            <Notifications />
                        </Badge>
                    </IconButton>
                    <Button color="inherit" onClick={() => setOpenLinkDialog(true)} startIcon={<PersonAdd />}>
                        Link Patient
                    </Button>
                    <Button color="inherit" onClick={logout} startIcon={<Logout />}>
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={3}>
                        {/* Patient List */}
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Linked Patients
                                </Typography>
                                <List>
                                    {patients.map((patient) => (
                                        <ListItem
                                            key={patient.id}
                                            button
                                            selected={selectedPatient === patient.id}
                                            onClick={() => setSelectedPatient(patient.id)}
                                            sx={{ borderRadius: 1, mb: 0.5 }}
                                        >
                                            <ListItemText
                                                primary={
                                                    <Typography variant="body1" fontWeight={600}>
                                                        {patient.name}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                                        ID: {patient.id.substring(0, 12)}…
                                                    </Typography>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                    {patients.length === 0 && (
                                        <Typography variant="body2" color="text.secondary">
                                            No linked patients. Click "Link Patient" to add one.
                                        </Typography>
                                    )}
                                </List>
                            </CardContent>
                        </Card>

                        {/* Safe Zones with delete */}
                        <Card sx={{ mt: 2 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Safe Zones
                                </Typography>
                                <List dense>
                                    {safeZones.map((zone) => (
                                        <ListItem key={zone.id} sx={{ pr: 5 }}>
                                            <ListItemText
                                                primary={zone.name}
                                                secondary={`Radius: ${zone.radiusInMeters}m`}
                                            />
                                            <ListItemSecondaryAction>
                                                <IconButton
                                                    edge="end"
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteZone(zone.id)}
                                                    title="Delete zone"
                                                >
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    ))}
                                    {safeZones.length === 0 && (
                                        <Typography variant="body2" color="text.secondary">
                                            No safe zones. Click the map to add one.
                                        </Typography>
                                    )}
                                </List>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<Add />}
                                    onClick={() => setOpenZoneDialog(true)}
                                    disabled={!selectedPatient}
                                    sx={{ mt: 1 }}
                                >
                                    Add Zone
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Location History */}
                        <Card sx={{ mt: 2 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Location History
                                </Typography>
                                <List dense sx={{ maxHeight: '300px', overflow: 'auto' }}>
                                    {locationHistory.map((loc) => (
                                        <ListItem key={loc.id}>
                                            <ListItemText
                                                primary={new Date(loc.timestamp).toLocaleString()}
                                                secondary={`Lat: ${loc.latitude.toFixed(6)}, Lng: ${loc.longitude.toFixed(6)}`}
                                            />
                                        </ListItem>
                                    ))}
                                    {locationHistory.length === 0 && (
                                        <Typography variant="body2" color="text.secondary">
                                            No history available
                                        </Typography>
                                    )}
                                </List>
                            </CardContent>
                        </Card>

                        {/* Medications Management */}
                        <Card sx={{ mt: 2 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>💊 Medications</Typography>
                                <List dense>
                                    {medications.map((med) => (
                                        <ListItem key={med.id} sx={{ pr: 5 }}>
                                            <ListItemText
                                                primary={<strong>{med.medicationName}</strong>}
                                                secondary={`${med.dosage} — ${(med.scheduleTimes || []).join(', ')}`}
                                            />
                                            <ListItemSecondaryAction>
                                                <IconButton edge="end" size="small" color="error"
                                                    onClick={() => handleDeleteMedication(med.id)} title="Remove medication">
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    ))}
                                    {medications.length === 0 && (
                                        <Typography variant="body2" color="text.secondary">
                                            No medications added yet.
                                        </Typography>
                                    )}
                                </List>
                                <Button fullWidth variant="outlined" startIcon={<Add />}
                                    onClick={() => setOpenMedDialog(true)}
                                    disabled={!selectedPatient} sx={{ mt: 1 }}>
                                    Add Medication
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Map */}
                    <Grid item xs={12} md={9}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Patient Location Map
                                </Typography>
                                {selectedPatient && mapCenter ? (
                                    <MapView
                                        patients={patients.filter(p => p.id === selectedPatient)}
                                        safeZones={safeZones}
                                        center={mapCenter}
                                        onMapClick={handleMapClick}
                                    />
                                ) : selectedPatient ? (
                                    <Box height="500px" display="flex" alignItems="center" justifyContent="center">
                                        <Typography color="text.secondary">
                                            Loading patient location…
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Box height="500px" display="flex" alignItems="center" justifyContent="center">
                                        <Typography color="text.secondary">
                                            Select a patient to view their location
                                        </Typography>
                                    </Box>
                                )}
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    Click on the map to create a new safe zone
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Container>

            {/* Create Safe Zone Dialog */}
            <Dialog open={openZoneDialog} onClose={() => setOpenZoneDialog(false)}>
                <DialogTitle>Create Safe Zone</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Zone Name"
                        margin="normal"
                        value={newZone.name}
                        onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                    />
                    <TextField
                        fullWidth
                        label="Radius (meters)"
                        type="number"
                        margin="normal"
                        value={newZone.radiusInMeters || ''}
                        onChange={(e) => setNewZone({ ...newZone, radiusInMeters: parseInt(e.target.value) || 0 })}
                    />
                    <Typography variant="caption" color="text.secondary">
                        Center: {newZone.centerLatitude.toFixed(6)}, {newZone.centerLongitude.toFixed(6)}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenZoneDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateZone} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>

            {/* Link Patient Dialog */}
            <Dialog open={openLinkDialog} onClose={() => setOpenLinkDialog(false)}>
                <DialogTitle>Link Patient</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" gutterBottom>
                        Enter the shareable Patient ID provided by the patient
                    </Typography>
                    <TextField
                        fullWidth
                        label="Patient ID"
                        margin="normal"
                        value={linkPatientId}
                        onChange={(e) => setLinkPatientId(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenLinkDialog(false)}>Cancel</Button>
                    <Button onClick={handleLinkPatient} variant="contained">Link</Button>
                </DialogActions>
            </Dialog>

            {/* Alerts Dialog */}
            <Dialog open={openAlertsDialog} onClose={() => setOpenAlertsDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Active Alerts</DialogTitle>
                <DialogContent>
                    {alerts.length > 0 ? (
                        <List>
                            {alerts.map((alert) => (
                                <ListItem key={alert.id} alignItems="flex-start">
                                    <ListItemText
                                        primary={
                                            <Box>
                                                <Chip
                                                    label={alert.type}
                                                    color={
                                                        alert.type === 'EMERGENCY' || alert.type === 'FALL' ? 'error' :
                                                            alert.type === 'FOG' || alert.type === 'MEDICATION_DUE' ? 'warning' : 'default'
                                                    }
                                                    size="small"
                                                    sx={{ mr: 1 }}
                                                />
                                                <Typography variant="body2" component="span" fontWeight={600}>
                                                    {getPatientDisplayName(alert.patientId)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                                    (ID: {alert.patientId?.substring(0, 12)}…)
                                                </Typography>
                                            </Box>
                                        }
                                        secondary={
                                            <Box>
                                                <Typography variant="body2">{alert.message}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(alert.triggeredAt).toLocaleString()}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handleAcknowledgeAlert(alert.id)}
                                        sx={{ mt: 1, ml: 1, flexShrink: 0 }}
                                    >
                                        Acknowledge
                                    </Button>
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Typography color="text.secondary">No active alerts</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAlertsDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Add Medication Dialog */}
            <Dialog open={openMedDialog} onClose={() => setOpenMedDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Medication</DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="Medication Name" margin="normal"
                        value={newMed.medicationName}
                        onChange={(e) => setNewMed({ ...newMed, medicationName: e.target.value })} />
                    <TextField fullWidth label="Dosage (e.g. 500mg)" margin="normal"
                        value={newMed.dosage}
                        onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })} />
                    <Typography variant="body2" sx={{ mt: 2, mb: 1 }}><strong>Schedule Times</strong></Typography>
                    {newMed.scheduleTimes.map((time, index) => (
                        <Box key={index} display="flex" alignItems="center" gap={1} mb={1}>
                            <TextField type="time" size="small" value={time}
                                onChange={(e) => updateTimeSlot(index, e.target.value)}
                                inputProps={{ step: 300 }} sx={{ flexGrow: 1 }} />
                            <IconButton size="small" color="error"
                                onClick={() => removeTimeSlot(index)}
                                disabled={newMed.scheduleTimes.length === 1}>
                                <Delete fontSize="small" />
                            </IconButton>
                        </Box>
                    ))}
                    <Button size="small" startIcon={<Add />} onClick={addTimeSlot} sx={{ mt: 0.5 }}>
                        Add Time
                    </Button>
                    <TextField fullWidth label="Notes (optional)" margin="normal" multiline rows={2}
                        value={newMed.notes}
                        onChange={(e) => setNewMed({ ...newMed, notes: e.target.value })} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenMedDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddMedication} variant="contained"
                        disabled={!newMed.medicationName || !newMed.dosage}>
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CaretakerDashboard;
