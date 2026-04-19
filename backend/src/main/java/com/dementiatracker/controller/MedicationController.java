package com.dementiatracker.controller;

import com.dementiatracker.model.Medication;
import com.dementiatracker.service.MedicationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medications")
@lombok.extern.slf4j.Slf4j
public class MedicationController {

    @Autowired
    private MedicationService medicationService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostMapping
    @PreAuthorize("hasRole('CARETAKER')")
    public ResponseEntity<?> createMedication(@RequestBody Medication medication) {
        log.info("Received request to create medication: {} for patient: {}",
                medication.getMedicationName(), medication.getPatientId());
        try {
            Medication created = medicationService.createMedication(medication);
            log.info("Successfully created medication with ID: {}", created.getId());
            // Notify patient dashboard to refresh
            messagingTemplate.convertAndSend("/topic/medications/" + created.getPatientId(), "REFRESH");
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            log.error("Error creating medication: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('PATIENT', 'CARETAKER')")
    public ResponseEntity<List<Medication>> getPatientMedications(@PathVariable String patientId) {
        List<Medication> medications = medicationService.getActiveMedications(patientId);
        return ResponseEntity.ok(medications);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CARETAKER')")
    public ResponseEntity<?> updateMedication(@PathVariable String id, @RequestBody Medication medication) {
        try {
            Medication updated = medicationService.updateMedication(id, medication);
            // Notify patient dashboard to refresh
            messagingTemplate.convertAndSend("/topic/medications/" + updated.getPatientId(), "REFRESH");
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('CARETAKER')")
    public ResponseEntity<?> deleteMedication(@PathVariable String id) {
        try {
            // Retrieve the medication first to get the patientId for the websocket notification
            Medication existing = medicationService.getMedicationById(id).orElse(null);
            String patientId = existing != null ? existing.getPatientId() : null;

            medicationService.deleteMedication(id);

            if (patientId != null) {
                messagingTemplate.convertAndSend("/topic/medications/" + patientId,
                        java.util.Map.of("action", "REFRESH"));
            }

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
