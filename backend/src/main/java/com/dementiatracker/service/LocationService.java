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
    public Location updateLocation(String patientId, double latitude, double longitude, double speed, double acceleration, 
                                 double accX, double accY, double accZ, 
                                 double gyroAlpha, double gyroBeta, double gyroGamma, 
                                 String source) {
        log.info("Updating location for patient {}: ({}, {}) Speed: {}, Accel: {} from {}", 
            patientId, latitude, longitude, speed, acceleration, source);
        
        // Save new location
        Location location = new Location();
        location.setPatientId(patientId);
        location.setLatitude(latitude);
        location.setLongitude(longitude);
        location.setSpeed(speed);
        location.setAcceleration(acceleration);
        location.setAccX(accX);
        location.setAccY(accY);
        location.setAccZ(accZ);
        location.setGyroAlpha(gyroAlpha);
        location.setGyroBeta(gyroBeta);
        location.setGyroGamma(gyroGamma);
        location.setTimestamp(LocalDateTime.now());
        location.setSource(source);

        Location savedLocation = locationRepository.save(location);

        // Append to baseline CSV for model training if not already trained
        appendLocationToBaseline(savedLocation);

        // Send real-time location update via WebSocket
        messagingTemplate.convertAndSend("/topic/location/" + patientId, savedLocation);

        // Check geofencing violations
        checkGeofencing(patientId, savedLocation);

        return savedLocation;
    }

    private void appendLocationToBaseline(Location loc) {
        String patientId = loc.getPatientId();
        // Construct the expected file path (sharing directory with ML service)
        // Adjust path as needed for local environment
        java.io.File directory = new java.io.File("../ml_service/data/patients");
        if (!directory.exists()) {
            directory.mkdirs();
        }
        
        java.io.File csvFile = new java.io.File(directory, patientId + "_baseline.csv");
        
        try {
            boolean isNew = !csvFile.exists();
            // Check line count if file exists
            if (!isNew) {
                long lineCount = java.nio.file.Files.lines(csvFile.toPath()).count();
                if (lineCount >= 10001) { // 1 header + 10000 data rows
                    return; // Already has enough data
                }
            }

            java.io.FileWriter fw = new java.io.FileWriter(csvFile, true);
            if (isNew) {
                fw.write("timestamp,lat,lon,accX,accY,accZ,gyroAlpha,gyroBeta,gyroGamma,hour,minute\n");
            }
            
            LocalDateTime ts = loc.getTimestamp();
            String row = String.format("%s,%.6f,%.6f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%d,%d\n",
                ts.format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                loc.getLatitude(), loc.getLongitude(), 
                loc.getAccX(), loc.getAccY(), loc.getAccZ(),
                loc.getGyroAlpha(), loc.getGyroBeta(), loc.getGyroGamma(),
                ts.getHour(), ts.getMinute());
            
            fw.write(row);
            fw.close();
            
            // Check if we just hit the 10,000 threshold
            long lineCountAfter = java.nio.file.Files.lines(csvFile.toPath()).count();
            if (lineCountAfter == 10001) {
                log.info("Baseline data complete for patient {}. Triggering ML training.", patientId);
                // Trigger ML training (optional: this usually happens via MlAnalysisService)
            }
            
        } catch (java.io.IOException e) {
            log.error("Error writing baseline data: {}", e.getMessage());
        }
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
