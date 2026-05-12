const API_BASE = '/api';

async function request(url, options = {}) {
    const token = localStorage.getItem('hrm_token');
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        ...options,
    };

    const response = await fetch(`${API_BASE}${url}`, config);

    if (response.status === 401) {
        // Token expired or invalid — clear and redirect
        localStorage.removeItem('hrm_token');
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
        throw new Error('Session expired');
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || error.error || 'Request failed');
    }

    // DELETE returns 200 with message
    return response.json();
}

export const api = {
    get: (url) => request(url),
    post: (url, data) => request(url, { method: 'POST', body: JSON.stringify(data) }),
    put: (url, data) => request(url, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (url) => request(url, { method: 'DELETE' }),
};

// ── Auth API ──────────────────────────────────────────────
export const authApi = {
    login: (username, password) => api.post('/auth/login', { username, password }),
    me: () => api.get('/auth/me'),
    changePassword: (currentPassword, newPassword) =>
        api.put('/auth/change-password', {
            current_password: currentPassword,
            new_password: newPassword,
        }),
};

// ── User Management API ───────────────────────────────────
export const userApi = {
    list: () => api.get('/users'),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
};

// ── Attendance API ────────────────────────────────────────
export const attendanceApi = {
    list: (params = {}) => {
        const query = new URLSearchParams();
        if (params.search) query.set('search', params.search);
        if (params.employee_id) query.set('employee_id', params.employee_id);
        if (params.department_id) query.set('department_id', params.department_id);
        if (params.status) query.set('status', params.status);
        if (params.date_from) query.set('date_from', params.date_from);
        if (params.date_to) query.set('date_to', params.date_to);
        if (params.page) query.set('page', params.page);
        if (params.limit) query.set('limit', params.limit);
        const qs = query.toString();
        return api.get(`/attendances${qs ? '?' + qs : ''}`);
    },
    create: (data) => api.post('/attendances', data),
    update: (id, data) => api.put(`/attendances/${id}`, data),
    delete: (id) => api.delete(`/attendances/${id}`),
    import: (rows) => api.post('/attendances/import', rows),
    generate: (data) => api.post('/attendances/generate', data),
    report: (params = {}) => {
        const query = new URLSearchParams();
        if (params.employee_id) query.set('employee_id', params.employee_id);
        if (params.department_id) query.set('department_id', params.department_id);
        if (params.date_from) query.set('date_from', params.date_from);
        if (params.date_to) query.set('date_to', params.date_to);
        if (params.page) query.set('page', params.page);
        if (params.limit) query.set('limit', params.limit);
        const qs = query.toString();
        return api.get(`/attendances/report${qs ? '?' + qs : ''}`);
    },
    // Overtime
    listOvertime: (params = {}) => {
        const query = new URLSearchParams();
        if (params.search) query.set('search', params.search);
        if (params.employee_id) query.set('employee_id', params.employee_id);
        if (params.status) query.set('status', params.status);
        if (params.date_from) query.set('date_from', params.date_from);
        if (params.date_to) query.set('date_to', params.date_to);
        if (params.page) query.set('page', params.page);
        if (params.limit) query.set('limit', params.limit);
        const qs = query.toString();
        return api.get(`/attendances/overtime${qs ? '?' + qs : ''}`);
    },
    createOvertime: (data) => api.post('/attendances/overtime', data),
    updateOvertime: (id, data) => api.put(`/attendances/overtime/${id}`, data),
    deleteOvertime: (id) => api.delete(`/attendances/overtime/${id}`),
    overtimeSummary: (params = {}) => {
        const query = new URLSearchParams();
        if (params.period) query.set('period', params.period);
        if (params.employee_id) query.set('employee_id', params.employee_id);
        if (params.department_id) query.set('department_id', params.department_id);
        if (params.page) query.set('page', params.page);
        if (params.limit) query.set('limit', params.limit);
        const qs = query.toString();
        return api.get(`/attendances/overtime/summary${qs ? '?' + qs : ''}`);
    },
};

// ── Employee API ──────────────────────────────────────────
export const employeeApi = {
    list: (params = {}) => {
        const query = new URLSearchParams();
        if (params.search) query.set('search', params.search);
        if (params.department_id) query.set('department_id', params.department_id);
        if (params.status) query.set('status', params.status);
        if (params.page) query.set('page', params.page);
        if (params.limit) query.set('limit', params.limit);
        const qs = query.toString();
        return api.get(`/employees${qs ? '?' + qs : ''}`);
    },
    get: (id) => api.get(`/employees/${id}`),
    create: (data) => api.post('/employees', data),
    update: (id, data) => api.put(`/employees/${id}`, data),
    delete: (id) => api.delete(`/employees/${id}`),
};

// ── Department API ────────────────────────────────────────
export const departmentApi = {
    list: () => api.get('/departments'),
    get: (id) => api.get(`/departments/${id}`),
    create: (data) => api.post('/departments', data),
    update: (id, data) => api.put(`/departments/${id}`, data),
    delete: (id) => api.delete(`/departments/${id}`),
};

// ── Job Position API ──────────────────────────────────────
export const jobPositionApi = {
    list: () => api.get('/job-positions'),
    get: (id) => api.get(`/job-positions/${id}`),
    create: (data) => api.post('/job-positions', data),
    update: (id, data) => api.put(`/job-positions/${id}`, data),
    delete: (id) => api.delete(`/job-positions/${id}`),
};

// ── Contract API ──────────────────────────────────────────
export const contractApi = {
    list: (params = {}) => {
        const query = new URLSearchParams();
        if (params.search) query.set('search', params.search);
        if (params.employee_id) query.set('employee_id', params.employee_id);
        if (params.status) query.set('status', params.status);
        if (params.contract_type) query.set('contract_type', params.contract_type);
        if (params.page) query.set('page', params.page);
        if (params.limit) query.set('limit', params.limit);
        const qs = query.toString();
        return api.get(`/contracts${qs ? '?' + qs : ''}`);
    },
    get: (id) => api.get(`/contracts/${id}`),
    create: (data) => api.post('/contracts', data),
    update: (id, data) => api.put(`/contracts/${id}`, data),
    delete: (id) => api.delete(`/contracts/${id}`),
    approve: (id, action) => api.put(`/contracts/${id}/approve?action=${action}`),
};

// ── Termination API ───────────────────────────────────────
export const terminationApi = {
    list: (params = {}) => {
        const query = new URLSearchParams();
        if (params.search) query.set('search', params.search);
        if (params.employee_id) query.set('employee_id', params.employee_id);
        if (params.status) query.set('status', params.status);
        if (params.reason) query.set('reason', params.reason);
        if (params.page) query.set('page', params.page);
        if (params.limit) query.set('limit', params.limit);
        const qs = query.toString();
        return api.get(`/terminations${qs ? '?' + qs : ''}`);
    },
    get: (id) => api.get(`/terminations/${id}`),
    create: (data) => api.post('/terminations', data),
    update: (id, data) => api.put(`/terminations/${id}`, data),
    delete: (id) => api.delete(`/terminations/${id}`),
    approve: (id, action) => api.put(`/terminations/${id}/approve?action=${action}`),
};

// ── Working Hour API ──────────────────────────────────────
export const workingHourApi = {
    list: (params = {}) => {
        const query = new URLSearchParams();
        if (params.search) query.set('search', params.search);
        if (params.employee_id) query.set('employee_id', params.employee_id);
        if (params.period) query.set('period', params.period);
        if (params.page) query.set('page', params.page);
        if (params.limit) query.set('limit', params.limit);
        const qs = query.toString();
        return api.get(`/working-hours${qs ? '?' + qs : ''}`);
    },
    get: (id) => api.get(`/working-hours/${id}`),
    create: (data) => api.post('/working-hours', data),
    update: (id, data) => api.put(`/working-hours/${id}`, data),
    delete: (id) => api.delete(`/working-hours/${id}`),
};

// ── Incentive Rate API ────────────────────────────────────
export const incentiveRateApi = {
    list: (params = {}) => {
        const query = new URLSearchParams();
        if (params.search) query.set('search', params.search);
        if (params.rate_type) query.set('rate_type', params.rate_type);
        if (params.is_active) query.set('is_active', params.is_active);
        if (params.page) query.set('page', params.page);
        if (params.limit) query.set('limit', params.limit);
        const qs = query.toString();
        return api.get(`/incentive-rates${qs ? '?' + qs : ''}`);
    },
    get: (id) => api.get(`/incentive-rates/${id}`),
    create: (data) => api.post('/incentive-rates', data),
    update: (id, data) => api.put(`/incentive-rates/${id}`, data),
    delete: (id) => api.delete(`/incentive-rates/${id}`),
};

// ── Payroll API ───────────────────────────────────────────
export const payrollApi = {
    list: (params = {}) => {
        const query = new URLSearchParams();
        if (params.search) query.set('search', params.search);
        if (params.employee_id) query.set('employee_id', params.employee_id);
        if (params.period) query.set('period', params.period);
        if (params.status) query.set('status', params.status);
        if (params.page) query.set('page', params.page);
        if (params.limit) query.set('limit', params.limit);
        const qs = query.toString();
        return api.get(`/payroll${qs ? '?' + qs : ''}`);
    },
    get: (id) => api.get(`/payroll/${id}`),
    calculate: (employeeId, period) => api.post(`/payroll/calculate?employee_id=${employeeId}&period=${period}`),
    calculateAll: (period) => api.post(`/payroll/calculate-all?period=${period}`),
    create: (data) => api.post('/payroll', data),
    update: (id, data) => api.put(`/payroll/${id}`, data),
    delete: (id) => api.delete(`/payroll/${id}`),
    confirm: (id, action) => api.put(`/payroll/${id}/confirm?action=${action}`),
    markPaid: (id) => api.put(`/payroll/${id}/mark-paid`),
};

// ── Leave API ─────────────────────────────────────────────
export const leaveApi = {
    list: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
        const qs = query.toString();
        return api.get(`/leaves${qs ? '?' + qs : ''}`);
    },
    create: (data) => api.post('/leaves', data),
    update: (id, data) => api.put(`/leaves/${id}`, data),
    delete: (id) => api.delete(`/leaves/${id}`),
    approve: (id, action) => api.put(`/leaves/${id}/approve?action=${action}`),
    cancel: (id) => api.put(`/leaves/${id}/cancel`),

    // Annual leave balances
    listAnnual: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
        const qs = query.toString();
        return api.get(`/leaves/annual${qs ? '?' + qs : ''}`);
    },
    createBalance: (data) => api.post('/leaves/annual', data),

    // Public holidays
    listHolidays: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
        const qs = query.toString();
        return api.get(`/leaves/public-holidays${qs ? '?' + qs : ''}`);
    },
    createHoliday: (data) => api.post('/leaves/public-holidays', data),
    updateHoliday: (id, data) => api.put(`/leaves/public-holidays/${id}`, data),
    deleteHoliday: (id) => api.delete(`/leaves/public-holidays/${id}`),

    // Unpaid leave
    listUnpaid: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
        const qs = query.toString();
        return api.get(`/leaves/unpaid${qs ? '?' + qs : ''}`);
    },

    // Summary & Absenteeism
    summary: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
        const qs = query.toString();
        return api.get(`/leaves/summary${qs ? '?' + qs : ''}`);
    },
    absenteeism: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
        const qs = query.toString();
        return api.get(`/leaves/absenteeism${qs ? '?' + qs : ''}`);
    },
};

// ── ESS (Employee Self Service) API ───────────────────────
export const essApi = {
    getProfile: () => api.get('/ess/profile'),
    updateProfile: (data) => api.put('/ess/profile', data),
    getSalary: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
        const qs = query.toString();
        return api.get(`/ess/salary${qs ? '?' + qs : ''}`);
    },
    getLeaves: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
        const qs = query.toString();
        return api.get(`/ess/leaves${qs ? '?' + qs : ''}`);
    },
    submitLeave: (data) => api.post('/ess/leaves', data),
    getSchedule: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
        const qs = query.toString();
        return api.get(`/ess/schedule${qs ? '?' + qs : ''}`);
    },
    // GPS Attendance
    getAttendanceStatus: () => api.get('/ess/attendance/status'),
    checkIn: (data) => api.post('/ess/attendance/check-in', data),
    checkOut: (data = {}) => api.post('/ess/attendance/check-out', data),
    getCompanyLocations: () => api.get('/ess/attendance/locations'),
};

// ── Company Location API (Admin) ──────────────────────────
export const companyLocationApi = {
    list: (activeOnly = false) => api.get(`/company-locations?active_only=${activeOnly}`),
    create: (data) => api.post('/company-locations', data),
    update: (id, data) => api.put(`/company-locations/${id}`, data),
    delete: (id) => api.delete(`/company-locations/${id}`),
};

// ── Org Chart API ─────────────────────────────────────────
export const orgChartApi = {
    getFullChart: () => api.get('/org-chart'),
    getDepartmentChart: (deptId) => api.get(`/org-chart/department/${deptId}`),
    getEmployeeContext: (empId) => api.get(`/org-chart/employee/${empId}`),
};

// ── Recruitment API ───────────────────────────────────────

export const candidateApi = {
    list: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
        const qs = query.toString();
        return api.get(`/recruitment/candidates${qs ? '?' + qs : ''}`);
    },
    get: (id) => api.get(`/recruitment/candidates/${id}`),
    create: (data) => api.post('/recruitment/candidates', data),
    upload: async (formData) => {
        const token = localStorage.getItem('hrm_token');
        const response = await fetch('/api/recruitment/candidates/upload', {
            method: 'POST',
            headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body: formData,
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
            throw new Error(error.detail || 'Upload failed');
        }
        return response.json();
    },
    update: (id, data) => api.put(`/recruitment/candidates/${id}`, data),
    delete: (id) => api.delete(`/recruitment/candidates/${id}`),
};

export const recruitRequestApi = {
    list: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
        const qs = query.toString();
        return api.get(`/recruitment/requests${qs ? '?' + qs : ''}`);
    },
    get: (id) => api.get(`/recruitment/requests/${id}`),
    create: (data) => api.post('/recruitment/requests', data),
    update: (id, data) => api.put(`/recruitment/requests/${id}`, data),
    approve: (id, action) => api.put(`/recruitment/requests/${id}/approve?action=${action}`),
    delete: (id) => api.delete(`/recruitment/requests/${id}`),
};

export const applicationApi = {
    list: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
        const qs = query.toString();
        return api.get(`/recruitment/applications${qs ? '?' + qs : ''}`);
    },
    get: (id) => api.get(`/recruitment/applications/${id}`),
    create: (data) => api.post('/recruitment/applications', data),
    update: (id, data) => api.put(`/recruitment/applications/${id}`, data),
    updateStage: (id, stage) => api.put(`/recruitment/applications/${id}/stage?stage=${stage}`),
    hire: (id) => api.post(`/recruitment/applications/${id}/hire`),
    delete: (id) => api.delete(`/recruitment/applications/${id}`),
};

export const interviewApi = {
    list: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
        const qs = query.toString();
        return api.get(`/recruitment/interviews${qs ? '?' + qs : ''}`);
    },
    get: (id) => api.get(`/recruitment/interviews/${id}`),
    create: (data) => api.post('/recruitment/interviews', data),
    update: (id, data) => api.put(`/recruitment/interviews/${id}`, data),
    delete: (id) => api.delete(`/recruitment/interviews/${id}`),
};

export const offerApi = {
    list: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
        const qs = query.toString();
        return api.get(`/recruitment/offers${qs ? '?' + qs : ''}`);
    },
    create: (data) => api.post('/recruitment/offers', data),
    update: (id, data) => api.put(`/recruitment/offers/${id}`, data),
    updateStatus: (id, status) => api.put(`/recruitment/offers/${id}/status?status=${status}`),
    delete: (id) => api.delete(`/recruitment/offers/${id}`),
};

export const aiScreeningApi = {
    screen: (data) => api.post('/recruitment/ai/screen', data),
    getResults: (applicationId) => api.get(`/recruitment/ai/results/${applicationId}`),
    listTemplates: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
        const qs = query.toString();
        return api.get(`/recruitment/ai/templates${qs ? '?' + qs : ''}`);
    },
    createTemplate: (data) => api.post('/recruitment/ai/templates', data),
    updateTemplate: (id, data) => api.put(`/recruitment/ai/templates/${id}`, data),
    deleteTemplate: (id) => api.delete(`/recruitment/ai/templates/${id}`),
};

export const recruitEmailApi = {
    send: (data) => api.post('/recruitment/email/send', data),
    logs: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
        const qs = query.toString();
        return api.get(`/recruitment/email/logs${qs ? '?' + qs : ''}`);
    },
};

export const recruitReportApi = {
    pipeline: (params = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
        const qs = query.toString();
        return api.get(`/recruitment/reports/pipeline${qs ? '?' + qs : ''}`);
    },
};

// ── Admin API (admin-only) ────────────────────────────────
export const adminApi = {
    getSystemInfo: () => api.get('/admin/system-info'),
    getAuditLog: (params = {}) => {
        const query = new URLSearchParams();
        if (params.page) query.set('page', params.page);
        if (params.limit) query.set('limit', params.limit);
        const qs = query.toString();
        return api.get(`/admin/audit-log${qs ? '?' + qs : ''}`);
    },
    getSettings: () => api.get('/admin/settings'),
    updateSettings: (data) => api.put('/admin/settings', data),
};

