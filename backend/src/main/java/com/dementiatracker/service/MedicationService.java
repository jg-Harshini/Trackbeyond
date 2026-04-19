package com.dementiatracker.service;

import com.dementiatracker.model.Medication;
import com.dementiatracker.repository.MedicationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MedicationService {

    @Autowired
    private MedicationRepository medicationRepository;

    public Medication createMedication(Medication medication) {
        medication.setCreatedAt(LocalDateTime.now());
        medication.setUpdatedAt(LocalDateTime.now());
        medication.setActive(true);
        return medicationRepository.save(medication);
    }

    public List<Medication> getActiveMedications(String patientId) {
        return medicationRepository.findByPatientIdAndActiveTrue(patientId);
    }

    public List<Medication> getAllMedications(String patientId) {
        return medicationRepository.findByPatientId(patientId);
    }

    public java.util.Optional<Medication> getMedicationById(String id) {
        return medicationRepository.findById(id);
    }

    public Medication updateMedication(String id, Medication updated) {
        Medication existing = medicationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Medication not found"));
        existing.setMedicationName(updated.getMedicationName());
        existing.setDosage(updated.getDosage());
        existing.setScheduleTimes(updated.getScheduleTimes());
        existing.setNotes(updated.getNotes());
        existing.setUpdatedAt(LocalDateTime.now());
        return medicationRepository.save(existing);
    }

    public void deleteMedication(String id) {
        medicationRepository.deleteById(id);
    }
}
