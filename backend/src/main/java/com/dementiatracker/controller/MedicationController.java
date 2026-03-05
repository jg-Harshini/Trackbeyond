package com.dementiatracker.controller;

import com.dementiatracker.model.Medication;
import com.dementiatracker.service.MedicationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medications")
@lombok.extern.slf4j.Slf4j
public class MedicationController {

    @Autowired
    private MedicationService medicationService;

    @PostMapping
    @PreAuthorize("hasRole('CARETAKER')")
    public ResponseEntity<?> createMedication(@RequestBody Medication medication) {
        log.info("Received request to create medication: {} for patient: {}",
                medication.getMedicationName(), medication.getPatientId());
        try {
            Medication created = medicationService.createMedication(medication);
            log.info("Successfully created medication with ID: {}", created.getId());
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
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('CARETAKER')")
    public ResponseEntity<?> deleteMedication(@PathVariable String id) {
        try {
            medicationService.deleteMedication(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
