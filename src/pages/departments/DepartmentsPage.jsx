import { useState, useEffect } from 'react';
import { departmentApi } from '../../services/api';
import './DepartmentsPage.css';

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [form, setForm] = useState({ name: '', company: 'TechCorp', description: '', color: '#714B67' });

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const data = await departmentApi.list();
            setDepartments(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchDepartments(); }, []);

    const openModal = (dept = null) => {
        if (dept) {
            setEditingDept(dept);
            setForm({ name: dept.name, company: dept.company, description: dept.description || '', color: dept.color || '#714B67' });
        } else {
            setEditingDept(null);
            setForm({ name: '', company: 'TechCorp', description: '', color: '#714B67' });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingDept) {
                await departmentApi.update(editingDept.id, form);
            } else {
                await departmentApi.create(form);
            }
            setShowModal(false);
            fetchDepartments();
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Xóa phòng ban "${name}"?`)) return;
        try {
            await departmentApi.delete(id);
            fetchDepartments();
        } catch (err) { alert(err.message); }
    };

    return (
        <div className="departments-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Phòng ban</h1>
                    <span className="record-count">{departments.length} bản ghi</span>
                </div>
                <div className="content-header-right">
                    <button className="header-btn header-btn-primary" onClick={() => openModal()}>
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Thêm mới
                    </button>
                </div>
            </div>

            <div className="dept-grid">
                {loading ? (
                    <div className="loading-state">Đang tải...</div>
                ) : departments.map(dept => (
                    <div key={dept.id} className="dept-card">
                        <div className="dept-card-header">
                            <div className="dept-color-dot" style={{ backgroundColor: dept.color }}></div>
                            <div className="dept-card-info">
                                <h3 className="dept-name">{dept.name}</h3>
                                <span className="dept-company">{dept.company}</span>
                            </div>
                            <div className="dept-card-actions">
                                <button className="action-btn edit-btn" onClick={() => openModal(dept)} title="Sửa">
                                    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                </button>
                                <button className="action-btn delete-btn" onClick={() => handleDelete(dept.id, dept.name)} title="Xóa">
                                    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        </div>
                        {dept.description && <p className="dept-description">{dept.description}</p>}
                        <div className="dept-stats">
                            <span className="dept-stat">{dept.employee_count} nhân viên</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">{editingDept ? 'Sửa phòng ban' : 'Thêm phòng ban'}</h2>
                        <form onSubmit={handleSave} className="modal-form">
                            <div className="form-group">
                                <label>Tên</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                            </div>
                            <div className="form-group">
                                <label>Công ty</label>
                                <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label>Mô tả</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                            </div>
                            <div className="form-group">
                                <label>Màu sắc</label>
                                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="header-btn header-btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className="header-btn header-btn-primary">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
