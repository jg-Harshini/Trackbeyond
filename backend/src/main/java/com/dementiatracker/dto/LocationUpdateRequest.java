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
}
