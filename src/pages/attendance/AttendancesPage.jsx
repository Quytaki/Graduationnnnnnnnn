import { useState, useEffect, useCallback } from 'react';
import { attendanceApi, employeeApi, departmentApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import './attendance.css';

const emptyForm = { employee_id: '', date: '', check_in: '', check_out: '', status: 'present', notes: '' };

export default function AttendancesPage() {
    const [records, setRecords] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [filters, setFilters] = useState({ search: '', status: '', department_id: '', date_from: '', date_to: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit, ...filters };
            Object.keys(params).forEach(k => !params[k] && delete params[k]);
            const result = await attendanceApi.list(params);
            setRecords(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, filters]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        employeeApi.list({ limit: 200 }).then(r => setEmployees(r.data)).catch(console.error);
        departmentApi.list().then(setDepartments).catch(console.error);
    }, []);

    const openModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setForm({
                employee_id: item.employee_id, date: item.date,
                check_in: item.check_in ? item.check_in.substring(11, 16) : '',
                check_out: item.check_out ? item.check_out.substring(11, 16) : '',
                status: item.status, notes: item.notes || '',
            });
        } else {
            setEditingItem(null);
            setForm(emptyForm);
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const data = {
                employee_id: parseInt(form.employee_id),
                date: form.date,
                status: form.status,
                notes: form.notes || null,
            };
            if (form.check_in) data.check_in = `${form.date}T${form.check_in}:00`;
            if (form.check_out) data.check_out = `${form.date}T${form.check_out}:00`;
            // Auto-calc
            if (data.check_in && data.check_out) {
                const diff = (new Date(data.check_out) - new Date(data.check_in)) / 3600000;
                data.worked_hours = Math.round(Math.max(0, diff) * 100) / 100;
                data.overtime_hours = Math.round(Math.max(0, diff - 8) * 100) / 100;
            }
            if (data.check_in) {
                const h = parseInt(form.check_in.split(':')[0]);
                const m = parseInt(form.check_in.split(':')[1]);
                data.check_in_status = (h > 8 || (h === 8 && m > 15)) ? 'late' : 'ontime';
            }
            if (editingItem) await attendanceApi.update(editingItem.id, data);
            else await attendanceApi.create(data);
            setShowModal(false);
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa bản ghi chấm công này?')) return;
        try { await attendanceApi.delete(id); fetchData(); }
        catch (err) { alert(err.message); }
    };

    const fmtTime = (dt) => dt ? new Date(dt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—';

    return (
        <div className="att-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Chấm công</h1>
                    <span className="record-count">{pagination.total} bản ghi</span>
                </div>
                <div className="content-header-right">
                    <button className="header-btn header-btn-primary" onClick={() => openModal()}>
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Thêm mới
                    </button>
                </div>
            </div>

            <div className="att-filter-bar">
                <input type="text" placeholder="Tìm nhân viên..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} style={{ maxWidth: 220 }} />
                <select value={filters.department_id} onChange={e => setFilters(f => ({ ...f, department_id: e.target.value }))}>
                    <option value="">Tất cả phòng ban</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                    <option value="">Tất cả trạng thái</option>
                    <option value="present">Có mặt</option>
                    <option value="absent">Vắng mặt</option>
                    <option value="half_day">Nửa ngày</option>
                    <option value="on_leave">Nghỉ phép</option>
                </select>
                <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
                <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
            </div>

            <div className="att-table-wrap">
                {loading ? (<div className="att-loading">Đang tải...</div>) : records.length === 0 ? (
                    <div className="att-empty"><h3>Chưa có dữ liệu chấm công</h3><p>Tạo mới hoặc import dữ liệu.</p></div>
                ) : (
                    <table className="att-table">
                        <thead><tr>
                            <th>Nhân viên</th><th>Phòng ban</th><th>Ngày</th>
                            <th className="tac">Check In</th><th className="tac">Check Out</th>
                            <th className="tac">Giờ làm</th><th className="tac">OT</th>
                            <th className="tac">Trạng thái</th><th className="tac">Đi muộn</th><th>Thao tác</th>
                        </tr></thead>
                        <tbody>
                            {records.map(r => (
                                <tr key={r.id}>
                                    <td><div className="att-emp-cell"><div className="att-emp-avatar">{r.employee_name?.charAt(0)}</div><span className="att-emp-name">{r.employee_name}</span></div></td>
                                    <td>{r.department_name || '—'}</td>
                                    <td>{r.date}</td>
                                    <td className="tac">{fmtTime(r.check_in)}</td>
                                    <td className="tac">{fmtTime(r.check_out)}</td>
                                    <td className="tac">{Number(r.worked_hours).toFixed(1)}</td>
                                    <td className="tac"><span className={r.overtime_hours > 0 ? 'ot-val high' : ''}>{Number(r.overtime_hours).toFixed(1)}</span></td>
                                    <td className="tac"><span className={`att-badge ${r.status}`}>{r.status === 'present' ? 'Có mặt' : r.status === 'absent' ? 'Vắng' : r.status === 'half_day' ? 'Nửa ngày' : 'Nghỉ phép'}</span></td>
                                    <td className="tac">{r.check_in_status && <span className={`att-badge ${r.check_in_status}`}>{r.check_in_status === 'late' ? 'Muộn' : 'Đúng giờ'}</span>}</td>
                                    <td>
                                        <div className="att-actions">
                                            <button className="att-action-btn" onClick={() => openModal(r)} title="Sửa"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
                                            <button className="att-action-btn danger" onClick={() => handleDelete(r.id)} title="Xóa"><svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {!loading && records.length > 0 && (
                <Pagination currentPage={pagination.page} totalItems={pagination.total} pageSize={pagination.limit}
                    onPageChange={p => setPagination(prev => ({ ...prev, page: p }))}
                    onPageSizeChange={s => setPagination(prev => ({ ...prev, limit: s, page: 1 }))} />
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">{editingItem ? 'Sửa chấm công' : 'Thêm chấm công'}</h2>
                        <form onSubmit={handleSave} className="modal-form">
                            <div className="modal-grid">
                                <div className="form-group">
                                    <label>Nhân viên *</label>
                                    <select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} required>
                                        <option value="">— Chọn —</option>
                                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Ngày *</label>
                                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label>Check In</label>
                                    <input type="time" value={form.check_in} onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Check Out</label>
                                    <input type="time" value={form.check_out} onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Trạng thái</label>
                                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                        <option value="present">Có mặt</option>
                                        <option value="absent">Vắng mặt</option>
                                        <option value="half_day">Nửa ngày</option>
                                        <option value="on_leave">Nghỉ phép</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group" style={{ marginTop: 8 }}>
                                <label>Ghi chú</label>
                                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
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
