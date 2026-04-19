package com.dementiatracker.controller;

import com.dementiatracker.model.Alert;
import com.dementiatracker.service.AlertService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    @Autowired
    private AlertService alertService;

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('PATIENT', 'CARETAKER')")
    public ResponseEntity<List<Alert>> getPatientAlerts(@PathVariable String patientId) {
        List<Alert> alerts = alertService.getPatientAlerts(patientId);
        return ResponseEntity.ok(alerts);
    }

    @GetMapping("/patient/{patientId}/unacknowledged")
    @PreAuthorize("hasAnyRole('PATIENT', 'CARETAKER')")
    public ResponseEntity<List<Alert>> getUnacknowledgedAlerts(@PathVariable String patientId) {
        List<Alert> alerts = alertService.getUnacknowledgedAlerts(patientId);
        return ResponseEntity.ok(alerts);
    }

    @PutMapping("/{alertId}/acknowledge")
    @PreAuthorize("hasRole('CARETAKER')")
    public ResponseEntity<?> acknowledgeAlert(@PathVariable String alertId, @RequestParam String caretakerId) {
        try {
            Alert alert = alertService.acknowledgeAlert(alertId, caretakerId);
            return ResponseEntity.ok(alert);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/patient/{patientId}/acknowledge-all")
    @PreAuthorize("hasRole('CARETAKER')")
    public ResponseEntity<?> acknowledgeAllAlerts(@PathVariable String patientId, @RequestParam String caretakerId) {
        try {
            alertService.acknowledgeAllAlerts(patientId, caretakerId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/emergency/{patientId}")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<?> triggerEmergencyAlert(@PathVariable String patientId) {
        try {
            Alert alert = alertService.createEmergencyAlert(patientId);
            return ResponseEntity.ok(alert);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/fall/{patientId}")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<?> triggerFallAlert(@PathVariable String patientId) {
        try {
            Alert alert = alertService.createFallAlert(patientId);
            return ResponseEntity.ok(alert);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/fog/{patientId}")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<?> triggerFogAlert(@PathVariable String patientId) {
        try {
            Alert alert = alertService.createFogAlert(patientId);
            return ResponseEntity.ok(alert);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/medication/{patientId}")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<?> triggerMedicationAlert(
            @PathVariable String patientId,
            @RequestParam String medicationName,
            @RequestParam String scheduledTime) {
        try {
            Alert alert = alertService.createMedicationAlert(patientId, medicationName, scheduledTime);
            return ResponseEntity.ok(alert);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
