package com.dementiatracker.service;

import com.dementiatracker.model.Report;
import com.dementiatracker.repository.ReportRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReportService {

    @Autowired
    private ReportRepository reportRepository;

    public Report generateReport(String patientId, Report.ReportType type, String description) {
        Report report = new Report();
        report.setPatientId(patientId);
        report.setType(type);
        report.setDescription(description);
        report.setGeneratedAt(LocalDateTime.now());
        report.setStatus("PENDING_REVIEW");
        return reportRepository.save(report);
    }

    public List<Report> getPatientReports(String patientId) {
        return reportRepository.findByPatientIdOrderByGeneratedAtDesc(patientId);
    }

    public long countRecentIncidents(String patientId, int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        return reportRepository.countByPatientIdAndGeneratedAtAfter(patientId, since);
    }
}
