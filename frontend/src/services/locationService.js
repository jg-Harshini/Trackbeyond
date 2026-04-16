import api from './api';

export const locationService = {
    async updateLocation(patientId, latitude, longitude, speed = 0, acceleration = 0) {
        const response = await api.post('/locations', {
            patientId,
            latitude,
            longitude,
            speed,
            acceleration
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

