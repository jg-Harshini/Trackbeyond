package com.dementiatracker.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {
    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    private String password; // Will be hashed

    private String email;

    private String fullName;

    private String phoneNumber;

    private Role role; // PATIENT or CARETAKER

    private String patientId; // For patients: their own ID, For caretakers: null

    private Set<String> linkedPatientIds = new HashSet<>(); // For caretakers: list of patient IDs they monitor

    private Set<String> linkedCaretakerIds = new HashSet<>(); // For patients: list of caretaker IDs

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private boolean enabled = true;

    public enum Role {
        PATIENT,
        CARETAKER
    }
}
