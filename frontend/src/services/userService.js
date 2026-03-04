import api from './api';

export const userService = {
    async getUser(userId) {
        const response = await api.get(`/users/${userId}`);
        return response.data;
    },

    async getUserByPatientId(patientId) {
        const response = await api.get(`/users/by-patient-id/${patientId}`);
        return response.data;
    },

    async updateUser(userId, userData) {
        const response = await api.put(`/users/${userId}`, userData);
        return response.data;
    },

    async linkCaretakerToPatient(caretakerId, shareablePatientId) {
        const response = await api.post('/users/link', null, {
            params: { caretakerId, shareablePatientId }
        });
        return response.data;
    }
};

