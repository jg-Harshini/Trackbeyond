package com.dementiatracker.service;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class MlAnalysisService {

    @Value("${ml.service.url:http://localhost:8000}")
    private String mlServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MlRequest {
        private String patientId;
        private List<Double> features;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MlResponse {
        private int prediction;
        private double score;
        private String status;
        private String modelType;
    }

    /**
     * Call the Python ML service to analyze patient behavior
     */
    public boolean isBehaviorAbnormal(String patientId, List<Double> features) {
        try {
            String url = mlServiceUrl + "/predict";
            MlRequest request = new MlRequest(patientId, features);
            MlResponse response = restTemplate.postForObject(url, request, MlResponse.class);
            
            // IsolationForest returns -1 for anomalies (outliers) and 1 for normal (inliers)
            // 8 features: lat, lon, accX, accY, accZ, gyroAlpha, gyroBeta, gyroGamma
            System.out.println("ML Service Response for " + patientId + ": " + response);
            return response != null && response.getPrediction() == -1;
        } catch (Exception e) {
            System.err.println("Error calling ML service: " + e.getMessage());
            return false; // Fail safe
        }
    }
}
