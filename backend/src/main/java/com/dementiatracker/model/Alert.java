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
@Document(collection = "alerts")
public class Alert {
    @Id
    private String id;

    private String patientId;

    private String safeZoneId;

    private AlertType type;

    private String message;

    private double patientLatitude;

    private double patientLongitude;

    private LocalDateTime triggeredAt;

    private boolean acknowledged = false;

    private LocalDateTime acknowledgedAt;

    private String acknowledgedByCaretakerId;

    public enum AlertType {
        ZONE_EXIT, // Patient exited safe zone
        ZONE_ENTRY, // Patient re-entered safe zone
        EMERGENCY, // Patient triggered emergency alert
        FALL, // Fall detected via accelerometer
        FOG, // Freezing of Gait detected via accelerometer
        MEDICATION_DUE, // Medication not taken on schedule
        BEHAVIORAL_ANOMALY // Abnormal behavior detected via ML model
    }
}
