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
@Document(collection = "locations")
public class Location {
    @Id
    private String id;

    private String patientId;

    private double latitude;

    private double longitude;

    private double accuracy; // GPS accuracy in meters

    private LocalDateTime timestamp;

    private String source; // e.g. "GPS" or "MANUAL"
    
    private double speed;
    
    private double acceleration;

    // Behavioral sensor data
    private double accX;
    private double accY;
    private double accZ;
    private double gyroAlpha;
    private double gyroBeta;
    private double gyroGamma;

    private String deviceId; // Optional: device identifier
}
