package com.dementiatracker.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "reports")
public class Report {
    @Id
    private String id;
    private String patientId;
    private ReportType type;
    private String description;
    private LocalDateTime generatedAt;
    private String status; // e.g., "PENDING_REVIEW", "REVIEWED"

    public enum ReportType {
        FALL,
        FOG,
        BEHAVIORAL
    }
}
