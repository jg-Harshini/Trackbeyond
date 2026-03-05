package com.dementiatracker.controller;

import com.dementiatracker.model.SafeZone;
import com.dementiatracker.service.SafeZoneService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/safezones")
public class SafeZoneController {

    @Autowired
    private SafeZoneService safeZoneService;

    @PostMapping
    @PreAuthorize("hasRole('CARETAKER')")
    public ResponseEntity<?> createSafeZone(@RequestBody SafeZone safeZone) {
        try {
            SafeZone created = safeZoneService.createSafeZone(safeZone);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('PATIENT', 'CARETAKER')")
    public ResponseEntity<List<SafeZone>> getPatientSafeZones(@PathVariable String patientId) {
        List<SafeZone> zones = safeZoneService.getPatientSafeZones(patientId);
        return ResponseEntity.ok(zones);
    }

    @GetMapping("/patient/{patientId}/active")
    @PreAuthorize("hasAnyRole('PATIENT', 'CARETAKER')")
    public ResponseEntity<List<SafeZone>> getActiveSafeZones(@PathVariable String patientId) {
        List<SafeZone> zones = safeZoneService.getActiveSafeZones(patientId);
        return ResponseEntity.ok(zones);
    }

    @PutMapping("/{zoneId}")
    @PreAuthorize("hasRole('CARETAKER')")
    public ResponseEntity<?> updateSafeZone(@PathVariable String zoneId, @RequestBody SafeZone safeZone) {
        try {
            SafeZone updated = safeZoneService.updateSafeZone(zoneId, safeZone);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{zoneId}")
    @PreAuthorize("hasRole('CARETAKER')")
    public ResponseEntity<?> deleteSafeZone(@PathVariable String zoneId) {
        try {
            safeZoneService.deleteSafeZone(zoneId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
