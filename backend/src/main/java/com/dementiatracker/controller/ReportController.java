package com.dementiatracker.controller;

import com.dementiatracker.model.Report;
import com.dementiatracker.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class ReportController {

    @Autowired
    private ReportService reportService;

    @GetMapping("/patient/{patientId}")
    public List<Report> getPatientReports(@PathVariable String patientId) {
        return reportService.getPatientReports(patientId);
    }
}
