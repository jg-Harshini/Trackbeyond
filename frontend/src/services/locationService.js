import api from './api';

export const locationService = {
    async updateLocation(patientId, latitude, longitude, speed = 0, acceleration = 0, 
                        accX = 0, accY = 0, accZ = 9.8, 
                        gyroAlpha = 0, gyroBeta = 0, gyroGamma = 0) {
        const response = await api.post('/locations', {
            patientId,
            latitude,
            longitude,
            speed,
            acceleration,
            accX,
            accY,
            accZ,
            gyroAlpha,
            gyroBeta,
            gyroGamma
        });
        return response.data;
    },

    async getCurrentLocation(patientId) {
        const response = await api.get(`/locations/patient/${patientId}/current`);
        return response.data;
    },

    async getLocationHistory(patientId) {
        const response = await api.get(`/locations/patient/${patientId}/history`);
        return response.data;
    }
};

