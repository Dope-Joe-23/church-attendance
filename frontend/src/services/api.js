import apiClient from './apiClient';

// Member API calls
export const memberApi = {
  getMembers: async () => {
    const response = await apiClient.get('/members/');
    return response.data;
  },

  getMemberById: async (id) => {
    const response = await apiClient.get(`/members/${id}/`);
    return response.data;
  },

  getMemberByMemberId: async (memberId) => {
    const response = await apiClient.get(`/members/by_member_id/`, {
      params: { member_id: memberId },
    });
    return response.data;
  },

  createMember: async (memberData) => {
    const response = await apiClient.post('/members/', memberData);
    return response.data;
  },

  updateMember: async (id, memberData) => {
    const response = await apiClient.put(`/members/${id}/`, memberData);
    return response.data;
  },

  deleteMember: async (id) => {
    await apiClient.delete(`/members/${id}/`);
  },

  getMemberQRCode: async (id) => {
    const response = await apiClient.get(`/members/${id}/qr_code/`);
    return response.data;
  },
};

// Service API calls
export const serviceApi = {
  getServices: async () => {
    const response = await apiClient.get('/services/');
    return response.data;
  },

  getServiceById: async (id) => {
    const response = await apiClient.get(`/services/${id}/`);
    return response.data;
  },

  createService: async (serviceData) => {
    const response = await apiClient.post('/services/', serviceData);
    return response.data;
  },

  updateService: async (id, serviceData) => {
    const response = await apiClient.put(`/services/${id}/`, serviceData);
    return response.data;
  },

  deleteService: async (id) => {
    await apiClient.delete(`/services/${id}/`);
  },

  closeService: async (id) => {
    const response = await apiClient.post(`/services/${id}/close/`);
    return response.data;
  },

  generateInstances: async (id, months = 3) => {
    const response = await apiClient.post(`/services/${id}/generate_instances/`, { months });
    return response.data;
  },

  addServiceInstance: async (id, dateString, location = '', startTime = '', endTime = '') => {
    const response = await apiClient.post(`/services/${id}/add_instance/`, { 
      date: dateString,
      location: location,
      start_time: startTime,
      end_time: endTime
    });
    return response.data;
  },
};

// Attendance API calls
export const attendanceApi = {
  getAttendances: async () => {
    const response = await apiClient.get('/attendance/');
    return response.data;
  },

  getAttendanceById: async (id) => {
    const response = await apiClient.get(`/attendance/${id}/`);
    return response.data;
  },

  checkInMember: async (memberId, serviceId) => {
    const response = await apiClient.post('/attendance/checkin/', {
      member_id: memberId,
      service_id: serviceId,
    });
    return response.data;
  },

  getAttendanceByService: async (serviceId) => {
    const response = await apiClient.get('/attendance/by_service/', {
      params: { service_id: serviceId },
    });
    return response.data;
  },

  createAttendance: async (attendanceData) => {
    const response = await apiClient.post('/attendance/', attendanceData);
    return response.data;
  },

  updateAttendance: async (id, attendanceData) => {
    const response = await apiClient.put(`/attendance/${id}/`, attendanceData);
    return response.data;
  },

  deleteAttendance: async (id) => {
    await apiClient.delete(`/attendance/${id}/`);
  },

  markAbsent: async (serviceId) => {
    const response = await apiClient.post('/attendance/mark_absent/', {
      service_id: serviceId,
    });
    return response.data;
  },
};
