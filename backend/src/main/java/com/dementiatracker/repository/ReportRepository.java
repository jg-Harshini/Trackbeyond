package com.dementiatracker.repository;

import com.dementiatracker.model.Report;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends MongoRepository<Report, String> {
    List<Report> findByPatientIdOrderByGeneratedAtDesc(String patientId);
}
