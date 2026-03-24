import api from './api';

export const reportService = {
    getPatientReports: (patientId) => {
        return api.get(`/reports/patient/${patientId}`).then(res => res.data);
    }
};
