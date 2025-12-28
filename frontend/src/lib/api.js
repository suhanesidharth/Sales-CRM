import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Organizations
export const getOrganizations = (params) => axios.get(`${API_URL}/organizations`, { params });
export const getOrganization = (id) => axios.get(`${API_URL}/organizations/${id}`);
export const createOrganization = (data) => axios.post(`${API_URL}/organizations`, data);
export const updateOrganization = (id, data) => axios.put(`${API_URL}/organizations/${id}`, data);
export const deleteOrganization = (id) => axios.delete(`${API_URL}/organizations/${id}`);

// Leads
export const getLeads = (params) => axios.get(`${API_URL}/leads`, { params });
export const getLead = (id) => axios.get(`${API_URL}/leads/${id}`);
export const createLead = (data) => axios.post(`${API_URL}/leads`, data);
export const updateLead = (id, data) => axios.put(`${API_URL}/leads/${id}`, data);
export const deleteLead = (id) => axios.delete(`${API_URL}/leads/${id}`);

// Milestones
export const getMilestones = (params) => axios.get(`${API_URL}/milestones`, { params });
export const createMilestone = (data) => axios.post(`${API_URL}/milestones`, data);
export const updateMilestone = (id, data) => axios.put(`${API_URL}/milestones/${id}`, data);
export const deleteMilestone = (id) => axios.delete(`${API_URL}/milestones/${id}`);

// Documents
export const getDocuments = (params) => axios.get(`${API_URL}/documents`, { params });
export const createDocument = (data) => axios.post(`${API_URL}/documents`, data);
export const updateDocument = (id, data) => axios.put(`${API_URL}/documents/${id}`, data);
export const deleteDocument = (id) => axios.delete(`${API_URL}/documents/${id}`);

// Sales Flow
export const getSalesFlow = (params) => axios.get(`${API_URL}/sales-flow`, { params });
export const createSalesFlow = (data) => axios.post(`${API_URL}/sales-flow`, data);
export const updateSalesFlow = (id, data) => axios.put(`${API_URL}/sales-flow/${id}`, data);
export const deleteSalesFlow = (id) => axios.delete(`${API_URL}/sales-flow/${id}`);

// Analytics
export const getDashboardAnalytics = () => axios.get(`${API_URL}/analytics/dashboard`);
