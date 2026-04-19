package com.dementiatracker.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LocationUpdateRequest {
    private String patientId;
    private double latitude;
    private double longitude;
    private double speed;
    private double acceleration;
    private double accX;
    private double accY;
    private double accZ;
    private double gyroAlpha;
    private double gyroBeta;
    private double gyroGamma;
}
