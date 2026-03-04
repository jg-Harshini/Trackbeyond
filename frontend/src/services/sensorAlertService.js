import api from './api';

// Fall alert
export const triggerFallAlert = (patientId) =>
    api.post(`/alerts/fall/${patientId}`).then(r => r.data);

// FOG alert
export const triggerFogAlert = (patientId) =>
    api.post(`/alerts/fog/${patientId}`).then(r => r.data);

// Medication due alert
export const triggerMedicationAlert = (patientId, medicationName, scheduledTime) =>
    api.post(`/alerts/medication/${patientId}`, null, {
        params: { medicationName, scheduledTime }
    }).then(r => r.data);
