package com.dementiatracker.service;

import com.dementiatracker.model.Alert;
import com.dementiatracker.model.Location;
import com.dementiatracker.model.SafeZone;
import com.dementiatracker.model.Report;
import com.dementiatracker.repository.AlertRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AlertService {

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ReportService reportService;

    /**
     * Create and send alert when patient exits safe zone
     */
    public Alert createZoneExitAlert(String patientId, SafeZone safeZone, Location location) {
        Alert alert = new Alert();
        alert.setPatientId(patientId);
        alert.setSafeZoneId(safeZone.getId());
        alert.setType(Alert.AlertType.ZONE_EXIT);
        alert.setMessage(String.format("Patient has exited safe zone: %s", safeZone.getName()));
        alert.setPatientLatitude(location.getLatitude());
        alert.setPatientLongitude(location.getLongitude());
        alert.setTriggeredAt(LocalDateTime.now());
        alert.setAcknowledged(false);

        Alert savedAlert = alertRepository.save(alert);

        // Send real-time notification via WebSocket
        messagingTemplate.convertAndSend("/topic/alerts/" + patientId, savedAlert);

        return savedAlert;
    }

    /**
     * Create alert when patient re-enters safe zone
     */
    public Alert createZoneEntryAlert(String patientId, SafeZone safeZone, Location location) {
        Alert alert = new Alert();
        alert.setPatientId(patientId);
        alert.setSafeZoneId(safeZone.getId());
        alert.setType(Alert.AlertType.ZONE_ENTRY);
        alert.setMessage(String.format("Patient has re-entered safe zone: %s", safeZone.getName()));
        alert.setPatientLatitude(location.getLatitude());
        alert.setPatientLongitude(location.getLongitude());
        alert.setTriggeredAt(LocalDateTime.now());
        alert.setAcknowledged(false);

        Alert savedAlert = alertRepository.save(alert);

        // Send real-time notification via WebSocket
        messagingTemplate.convertAndSend("/topic/alerts/" + patientId, savedAlert);

        return savedAlert;
    }

    /**
     * Create emergency alert triggered by patient
     */
    public Alert createEmergencyAlert(String patientId) {
        Alert alert = new Alert();
        alert.setPatientId(patientId);
        alert.setType(Alert.AlertType.EMERGENCY);
        alert.setMessage("EMERGENCY: Patient has triggered an emergency alert!");
        alert.setTriggeredAt(LocalDateTime.now());
        alert.setAcknowledged(false);

        Alert savedAlert = alertRepository.save(alert);
        messagingTemplate.convertAndSend("/topic/alerts/" + patientId, savedAlert);
        return savedAlert;
    }

    /**
     * Create fall detection alert
     */
    public Alert createFallAlert(String patientId) {
        Alert alert = new Alert();
        alert.setPatientId(patientId);
        alert.setType(Alert.AlertType.FALL);
        alert.setMessage("FALL DETECTED: A potential fall has been detected for this patient.");
        alert.setTriggeredAt(LocalDateTime.now());
        alert.setAcknowledged(false);

        Alert savedAlert = alertRepository.save(alert);

        // Generate formal report
        reportService.generateReport(patientId, Report.ReportType.FALL,
                "Automated report: A fall was detected by the patient's device sensors.");

        // Check for frequent incidents (5+) in the last 24h
        if (reportService.countRecentIncidents(patientId) > 5) {
            triggerHospitalAlert(patientId);
        }

        messagingTemplate.convertAndSend("/topic/alerts/" + patientId, savedAlert);
        return savedAlert;
    }

    /**
     * Create Freezing of Gait (FOG) alert
     */
    public Alert createFogAlert(String patientId) {
        Alert alert = new Alert();
        alert.setPatientId(patientId);
        alert.setType(Alert.AlertType.FOG);
        alert.setMessage(
                "FREEZING OF GAIT: Rhythmic trembling pattern detected — patient may be experiencing freezing of gait.");
        alert.setTriggeredAt(LocalDateTime.now());
        alert.setAcknowledged(false);

        Alert savedAlert = alertRepository.save(alert);

        // Generate formal report
        reportService.generateReport(patientId, Report.ReportType.FOG,
                "Automated report: Freezing of Gait (FOG) symptoms were detected by the patient's device sensors.");

        // Check for frequent incidents (5+) in the last 24h
        if (reportService.countRecentIncidents(patientId) > 5) {
            triggerHospitalAlert(patientId);
        }

        messagingTemplate.convertAndSend("/topic/alerts/" + patientId, savedAlert);
        return savedAlert;
    }

    private void triggerHospitalAlert(String patientId) {
        Alert alert = new Alert();
        alert.setPatientId(patientId);
        alert.setType(Alert.AlertType.EMERGENCY);
        alert.setMessage("URGENT: This patient has experienced more than 5 Fall/FOG incidents in the last 24 hours. Please take them to a hospital for evaluation.");
        alert.setTriggeredAt(LocalDateTime.now());
        alert.setAcknowledged(false);
        alertRepository.save(alert);
        messagingTemplate.convertAndSend("/topic/alerts/" + patientId, alert);
    }

    /**
     * Create medication due alert
     */
    public Alert createMedicationAlert(String patientId, String medicationName, String scheduledTime) {
        Alert alert = new Alert();
        alert.setPatientId(patientId);
        alert.setType(Alert.AlertType.MEDICATION_DUE);
        alert.setMessage(
                String.format("MEDICATION DUE: %s scheduled at %s has not been taken.", medicationName, scheduledTime));
        alert.setTriggeredAt(LocalDateTime.now());
        alert.setAcknowledged(false);

        Alert savedAlert = alertRepository.save(alert);
        messagingTemplate.convertAndSend("/topic/alerts/" + patientId, savedAlert);
        return savedAlert;
    }

    /**
     * Get all alerts for a patient
     */
    public List<Alert> getPatientAlerts(String patientId) {
        return alertRepository.findByPatientIdOrderByTriggeredAtDesc(patientId);
    }

    /**
     * Get unacknowledged alerts for a patient
     */
    public List<Alert> getUnacknowledgedAlerts(String patientId) {
        return alertRepository.findByPatientIdAndAcknowledgedFalseOrderByTriggeredAtDesc(patientId);
    }

    /**
     * Acknowledge an alert
     */
    public Alert acknowledgeAlert(String alertId, String caretakerId) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));

        alert.setAcknowledged(true);
        alert.setAcknowledgedAt(LocalDateTime.now());
        alert.setAcknowledgedByCaretakerId(caretakerId);

        return alertRepository.save(alert);
    }
}
