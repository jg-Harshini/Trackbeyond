package com.dementiatracker.controller;

import com.dementiatracker.model.User;
import com.dementiatracker.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/{userId}")
    @PreAuthorize("hasAnyRole('PATIENT', 'CARETAKER')")
    public ResponseEntity<?> getUser(@PathVariable String userId) {
        return userService.getUserById(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-patient-id/{patientId}")
    @PreAuthorize("hasAnyRole('PATIENT', 'CARETAKER')")
    public ResponseEntity<?> getUserByPatientId(@PathVariable String patientId) {
        System.out.println("Searching for user with patientId: " + patientId);
        return userService.getUserByPatientId(patientId)
                .map(user -> {
                    System.out.println("Found user: " + user.getUsername() + " for patientId: " + patientId);
                    return ResponseEntity.ok(user);
                })
                .orElseGet(() -> {
                    System.out.println("No user found for patientId: " + patientId);
                    return ResponseEntity.notFound().build();
                });
    }

    @PutMapping("/{userId}")
    @PreAuthorize("hasAnyRole('PATIENT', 'CARETAKER')")
    public ResponseEntity<?> updateUser(@PathVariable String userId, @RequestBody User user) {
        try {
            User updated = userService.updateUser(userId, user);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/link")
    @PreAuthorize("hasRole('CARETAKER')")
    public ResponseEntity<?> linkCaretakerToPatient(
            @RequestParam String caretakerId,
            @RequestParam String shareablePatientId) {
        try {
            userService.linkCaretakerToPatient(caretakerId, shareablePatientId);
            return ResponseEntity.ok().body("Successfully linked to patient");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
