package com.dementiatracker.service;

import com.dementiatracker.model.Alert;
import com.dementiatracker.model.Location;
import com.dementiatracker.model.SafeZone;
import com.dementiatracker.repository.LocationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class LocationService {

    @Autowired
    private LocationRepository locationRepository;

    @Autowired
    private GeofencingService geofencingService;

    @Autowired
    private AlertService alertService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Update patient location and check geofencing
     */
    public Location updateLocation(String patientId, double latitude, double longitude, String source) {
        log.info("Updating location for patient {}: ({}, {}) from {}", patientId, latitude, longitude, source);
        // Save new location
        Location location = new Location();
        location.setPatientId(patientId);
        location.setLatitude(latitude);
        location.setLongitude(longitude);
        location.setTimestamp(LocalDateTime.now());
        location.setSource(source);

        Location savedLocation = locationRepository.save(location);

        // Send real-time location update via WebSocket
        messagingTemplate.convertAndSend("/topic/location/" + patientId, savedLocation);

        // Check geofencing violations
        checkGeofencing(patientId, savedLocation);

        return savedLocation;
    }

    /**
     * Check if patient has violated any safe zones
     */
    private void checkGeofencing(String patientId, Location location) {
        boolean inAnyZone = geofencingService.isInAnySafeZone(patientId, location);
        List<SafeZone> activeZones = geofencingService.getActiveSafeZones(patientId);

        if (!activeZones.isEmpty()) {
            if (!inAnyZone) {
                // Patient is outside of all their safe zones
                // Check if we already have an unacknowledged exit alert
                List<Alert> existingAlerts = alertService.getUnacknowledgedAlerts(patientId);
                boolean alreadyAlerted = existingAlerts.stream()
                        .anyMatch(a -> a.getType() == Alert.AlertType.ZONE_EXIT);

                if (!alreadyAlerted) {
                    // For now, we take the first zone as a reference for the alert
                    SafeZone zone = activeZones.get(0);
                    alertService.createZoneExitAlert(patientId, zone, location);
                }
            } else {
                // Patient is inside at least one zone
                // If they were previously outside, we could send a "back in zone" alert
                // and acknowledge previous exit alerts
                List<Alert> unacknowledgedExitAlerts = alertService.getUnacknowledgedAlerts(patientId).stream()
                        .filter(a -> a.getType() == Alert.AlertType.ZONE_EXIT)
                        .collect(java.util.stream.Collectors.toList());

                for (Alert alert : unacknowledgedExitAlerts) {
                    alertService.acknowledgeAlert(alert.getId(), "SYSTEM_REENTRY");
                }
            }
        }
    }

    /**
     * Get current location for a patient
     */
    public Optional<Location> getCurrentLocation(String patientId) {
        return locationRepository.findFirstByPatientIdOrderByTimestampDesc(patientId);
    }

    /**
     * Get location history for a patient
     */
    public List<Location> getLocationHistory(String patientId) {
        return locationRepository.findByPatientIdOrderByTimestampDesc(patientId);
    }

    /**
     * Get location history within time range
     */
    public List<Location> getLocationHistory(String patientId, LocalDateTime start, LocalDateTime end) {
        return locationRepository.findByPatientIdAndTimestampBetween(patientId, start, end);
    }
}
