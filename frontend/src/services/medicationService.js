import api from './api';

export const medicationService = {
    async createMedication(medicationData) {
        const response = await api.post('/medications', medicationData);
        return response.data;
    },

    async getPatientMedications(patientId) {
        const response = await api.get(`/medications/patient/${patientId}`);
        return response.data;
    },

    async deleteMedication(id) {
        const response = await api.delete(`/medications/${id}`);
        return response.data;
    }
};
