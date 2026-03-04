package com.dementiatracker.controller;

import com.dementiatracker.dto.LocationUpdateRequest;
import com.dementiatracker.model.Location;
import com.dementiatracker.service.LocationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/locations")
@CrossOrigin
public class LocationController {

    @Autowired
    private LocationService locationService;

    @PostMapping
    @PreAuthorize("hasAnyRole('PATIENT', 'CARETAKER')")
    public ResponseEntity<?> updateLocation(@RequestBody LocationUpdateRequest request) {
        try {
            Location location = locationService.updateLocation(
                    request.getPatientId(),
                    request.getLatitude(),
                    request.getLongitude(),
                    "MANUAL");
            return ResponseEntity.ok(location);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/patient/{patientId}/current")
    @PreAuthorize("hasAnyRole('PATIENT', 'CARETAKER')")
    public ResponseEntity<?> getCurrentLocation(@PathVariable String patientId) {
        return locationService.getCurrentLocation(patientId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/patient/{patientId}/history")
    @PreAuthorize("hasAnyRole('PATIENT', 'CARETAKER')")
    public ResponseEntity<List<Location>> getLocationHistory(@PathVariable String patientId) {
        List<Location> history = locationService.getLocationHistory(patientId);
        return ResponseEntity.ok(history);
    }

    @GetMapping("/patient/{patientId}/history/range")
    @PreAuthorize("hasAnyRole('PATIENT', 'CARETAKER')")
    public ResponseEntity<List<Location>> getLocationHistoryRange(
            @PathVariable String patientId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        List<Location> history = locationService.getLocationHistory(patientId, start, end);
        return ResponseEntity.ok(history);
    }
}
