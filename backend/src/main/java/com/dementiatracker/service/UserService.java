package com.dementiatracker.service;

import com.dementiatracker.model.User;
import com.dementiatracker.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Register a new user
     */
    public User registerUser(User user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("Username already exists");
        }

        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        // Generate patient ID for patients
        if (user.getRole() == User.Role.PATIENT) {
            user.setPatientId(UUID.randomUUID().toString());
        }

        return userRepository.save(user);
    }

    /**
     * Link caretaker to patient using shareable patient ID
     */
    public void linkCaretakerToPatient(String caretakerId, String shareablePatientId) {
        User patient = userRepository.findByPatientId(shareablePatientId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        User caretaker = userRepository.findById(caretakerId)
                .orElseThrow(() -> new RuntimeException("Caretaker not found"));

        if (patient.getRole() != User.Role.PATIENT) {
            throw new RuntimeException("Invalid patient ID");
        }

        if (caretaker.getRole() != User.Role.CARETAKER) {
            throw new RuntimeException("User is not a caretaker");
        }

        // Add bidirectional link
        patient.getLinkedCaretakerIds().add(caretakerId);
        caretaker.getLinkedPatientIds().add(shareablePatientId);

        userRepository.save(patient);
        userRepository.save(caretaker);
    }

    /**
     * Get user by shareable patient ID (UUID)
     */
    public Optional<User> getUserByPatientId(String patientId) {
        return userRepository.findByPatientId(patientId);
    }

    /**
     * Get user by ID
     */
    public Optional<User> getUserById(String userId) {
        return userRepository.findById(userId);
    }

    /**
     * Get user by username
     */
    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    /**
     * Update user profile
     */
    public User updateUser(String userId, User updatedUser) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setFullName(updatedUser.getFullName());
        user.setEmail(updatedUser.getEmail());
        user.setPhoneNumber(updatedUser.getPhoneNumber());
        user.setUpdatedAt(LocalDateTime.now());

        return userRepository.save(user);
    }
}
