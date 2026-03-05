package com.dementiatracker.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "medications")
public class Medication {

    @Id
    private String id;

    private String patientId;

    private String medicationName;

    private String dosage; // e.g. "500mg"

    private List<String> scheduleTimes; // e.g. ["08:00", "14:00", "20:00"]

    private String notes;

    private String createdByCaretakerId;

    private boolean active = true;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
