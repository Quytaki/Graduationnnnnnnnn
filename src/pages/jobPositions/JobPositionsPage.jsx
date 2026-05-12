import { useState, useEffect } from 'react';
import { jobPositionApi, departmentApi } from '../../services/api';
import './JobPositionsPage.css';

export default function JobPositionsPage() {
    const [jobPositions, setJobPositions] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingJob, setEditingJob] = useState(null);
    const [form, setForm] = useState({ name: '', department_id: '', description: '' });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [jobs, depts] = await Promise.all([jobPositionApi.list(), departmentApi.list()]);
            setJobPositions(jobs);
            setDepartments(depts);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const openModal = (job = null) => {
        if (job) {
            setEditingJob(job);
            setForm({ name: job.name, department_id: job.department_id || '', description: job.description || '' });
        } else {
            setEditingJob(null);
            setForm({ name: '', department_id: '', description: '' });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const data = { ...form, department_id: form.department_id ? parseInt(form.department_id) : null };
            if (editingJob) {
                await jobPositionApi.update(editingJob.id, data);
            } else {
                await jobPositionApi.create(data);
            }
            setShowModal(false);
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Xóa chức danh "${name}"?`)) return;
        try { await jobPositionApi.delete(id); fetchData(); }
        catch (err) { alert(err.message); }
    };

    return (
        <div className="job-positions-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Chức danh</h1>
                    <span className="record-count">{jobPositions.length} bản ghi</span>
                </div>
                <div className="content-header-right">
                    <button className="header-btn header-btn-primary" onClick={() => openModal()}>
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Thêm mới
                    </button>
                </div>
            </div>

            <div className="attendance-table-wrapper">
                {loading ? (
                    <div className="loading-state">Đang tải...</div>
                ) : (
                    <table className="attendance-table" role="grid">
                        <thead className="table-header">
                            <tr>
                                <th className="table-cell">Chức danh</th>
                                <th className="table-cell">Phòng ban</th>
                                <th className="table-cell">Mô tả</th>
                                <th className="table-cell">Nhân viên</th>
                                <th className="table-cell table-cell-action">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {jobPositions.map((job, index) => (
                                <tr key={job.id} className={`table-row ${index % 2 === 0 ? 'table-row-even' : 'table-row-odd'}`}>
                                    <td className="table-cell"><strong>{job.name}</strong></td>
                                    <td className="table-cell">{job.department_name || '—'}</td>
                                    <td className="table-cell" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.description || '—'}</td>
                                    <td className="table-cell"><span className="dept-stat">{job.employee_count}</span></td>
                                    <td className="table-cell table-cell-action">
                                        <button className="action-btn edit-btn" onClick={() => openModal(job)} title="Sửa">
                                            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                        </button>
                                        <button className="action-btn delete-btn" onClick={() => handleDelete(job.id, job.name)} title="Xóa">
                                            <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">{editingJob ? 'Sửa chức danh' : 'Thêm chức danh'}</h2>
                        <form onSubmit={handleSave} className="modal-form">
                            <div className="form-group">
                                <label>Tên</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                            </div>
                            <div className="form-group">
                                <label>Phòng ban</label>
                                <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                                    <option value="">— Chọn —</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Mô tả</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
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
