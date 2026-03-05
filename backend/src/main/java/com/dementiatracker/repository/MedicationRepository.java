package com.dementiatracker.repository;

import com.dementiatracker.model.Medication;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicationRepository extends MongoRepository<Medication, String> {
    List<Medication> findByPatientIdAndActiveTrue(String patientId);

    List<Medication> findByPatientId(String patientId);
}
