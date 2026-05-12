import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { employeeApi, departmentApi, jobPositionApi } from '../../services/api';
import './EmployeeFormPage.css';

const AVATAR_COLORS = [
    '#714B67', '#00A09D', '#4A90A4', '#D97706', '#059669',
    '#7C3AED', '#DC2626', '#EC4899', '#0891B2', '#8B5CF6',
    '#2563EB', '#F59E0B', '#6366F1', '#14B8A6', '#E11D48',
];

const ROLE_OPTIONS = [
    { value: 'director', label: 'Giám đốc' },
    { value: 'department_head', label: 'Trưởng phòng' },
    { value: 'team_lead', label: 'Trưởng nhóm' },
    { value: 'senior', label: 'Nhân viên cao cấp' },
    { value: 'staff', label: 'Nhân viên' },
];

const emptyForm = {
    name: '', email: '', phone: '',
    department_id: '', job_position_id: '',
    company: 'TechCorp', work_address: '',
    work_email: '', work_phone: '',
    hire_date: '', status: 'active',
    avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    role: 'staff',
    manager_id: '',
};

export default function EmployeeFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [form, setForm] = useState(emptyForm);
    const [departments, setDepartments] = useState([]);
    const [jobPositions, setJobPositions] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        departmentApi.list().then(setDepartments).catch(console.error);
        jobPositionApi.list().then(setJobPositions).catch(console.error);
        employeeApi.list({ limit: 200 }).then(r => setAllEmployees(r.data)).catch(console.error);

        if (isEdit) {
            setLoading(true);
            employeeApi.get(id)
                .then(emp => {
                    setForm({
                        name: emp.name || '',
                        email: emp.email || '',
                        phone: emp.phone || '',
                        department_id: emp.department_id || '',
                        job_position_id: emp.job_position_id || '',
                        company: emp.company || 'TechCorp',
                        work_address: emp.work_address || '',
                        work_email: emp.work_email || '',
                        work_phone: emp.work_phone || '',
                        hire_date: emp.hire_date || '',
                        status: emp.status || 'active',
                        avatar_color: emp.avatar_color || '#714B67',
                        role: emp.role || 'staff',
                        manager_id: emp.manager_id || '',
                    });
                })
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [id, isEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setError('Tên nhân viên là bắt buộc');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const data = {
                ...form,
                department_id: form.department_id ? parseInt(form.department_id) : null,
                job_position_id: form.job_position_id ? parseInt(form.job_position_id) : null,
                manager_id: form.manager_id ? parseInt(form.manager_id) : null,
            };
            if (isEdit) {
                await employeeApi.update(id, data);
            } else {
                await employeeApi.create(data);
            }
            navigate('/employees');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const initials = form.name
        ? form.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    // Filter out self from manager dropdown
    const managerCandidates = allEmployees.filter(emp =>
        String(emp.id) !== String(id) &&
        ['director', 'department_head', 'team_lead', 'senior'].includes(emp.role || 'staff')
    );

    const roleLabel = ROLE_OPTIONS.find(r => r.value === form.role)?.label || 'Nhân viên';

    if (loading) {
        return <div className="form-page"><div className="loading-state">Đang tải...</div></div>;
    }

    return (
        <div className="form-page">
            {/* Form Header */}
            <div className="form-header">
                <div className="form-header-left">
                    <button className="back-btn" onClick={() => navigate('/employees')} title="Quay lại">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <h1 className="page-title">{isEdit ? 'Sửa nhân viên' : 'Thêm nhân viên'}</h1>
                </div>
                <div className="form-header-right">
                    <button type="button" className="header-btn header-btn-secondary" onClick={() => navigate('/employees')}>
                        Hủy
                    </button>
                    <button type="submit" form="employee-form" className="header-btn header-btn-primary" disabled={saving}>
                        {saving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                </div>
            </div>

            {error && <div className="form-error">{error}</div>}

            {/* Employee Card Header */}
            <div className="employee-card-header">
                <div className="employee-avatar-large" style={{ backgroundColor: form.avatar_color }}>
                    {initials}
                </div>
                <div className="employee-card-info">
                    <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Tên nhân viên"
                        className="employee-name-input"
                        required
                    />
                    <input
                        name="company"
                        value={form.company}
                        onChange={handleChange}
                        placeholder="Công ty"
                        className="employee-title-input"
                    />
                </div>
                <div className="status-toggle">
                    <select name="status" value={form.status} onChange={handleChange} className="status-select">
                        <option value="active">Đang hoạt động</option>
                        <option value="archived">Lưu trữ</option>
                    </select>
                </div>
            </div>

            {/* Form Body */}
            <form id="employee-form" className="form-body" onSubmit={handleSubmit}>
                {/* Organization section — NEW */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" style={{marginRight: 6, verticalAlign: '-3px', color: '#714B67'}}>
                            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                        </svg>
                        Tổ chức & Phân cấp
                    </h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Vai trò</label>
                            <select name="role" value={form.role} onChange={handleChange}>
                                {ROLE_OPTIONS.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Quản lý trực tiếp</label>
                            <select name="manager_id" value={form.manager_id} onChange={handleChange}>
                                <option value="">— Không có —</option>
                                {managerCandidates.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.name} ({ROLE_OPTIONS.find(r => r.value === emp.role)?.label || 'NV'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h3 className="form-section-title">Thông tin công việc</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Phòng ban</label>
                            <select name="department_id" value={form.department_id} onChange={handleChange}>
                                <option value="">— Chọn —</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Chức danh</label>
                            <select name="job_position_id" value={form.job_position_id} onChange={handleChange}>
                                <option value="">— Chọn —</option>
                                {jobPositions.map(j => (
                                    <option key={j.id} value={j.id}>{j.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Email công việc</label>
                            <input name="work_email" type="email" value={form.work_email} onChange={handleChange} placeholder="work@company.com" />
                        </div>
                        <div className="form-group">
                            <label>SĐT công việc</label>
                            <input name="work_phone" type="tel" value={form.work_phone} onChange={handleChange} placeholder="+1-555-0000" />
                        </div>
                        <div className="form-group">
                            <label>Địa chỉ làm việc</label>
                            <input name="work_address" value={form.work_address} onChange={handleChange} placeholder="123 Street, City" />
                        </div>
                        <div className="form-group">
                            <label>Ngày vào làm</label>
                            <input name="hire_date" type="date" value={form.hire_date} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h3 className="form-section-title">Thông tin cá nhân</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Email cá nhân</label>
                            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="personal@email.com" />
                        </div>
                        <div className="form-group">
                            <label>Số điện thoại</label>
                            <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+1-555-0000" />
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
