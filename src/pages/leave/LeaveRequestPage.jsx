import { useState, useEffect, useCallback } from 'react';
import { leaveApi, employeeApi, departmentApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import ExportButton from '../../components/ExportButton/ExportButton';
import { exportLeaveExcel, exportLeavePDF } from '../../utils/exportReport';
import './leave.css';

const LEAVE_TYPES = { annual: 'Phép năm', unpaid: 'Không lương', sick: 'Ốm đau', maternity: 'Thai sản', other: 'Khác' };
const STATUSES = { draft: 'Nháp', pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', cancelled: 'Đã huỷ' };

export default function LeaveRequestPage() {
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', department_id: '', leave_type: '', status: '' });
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ employee_id: '', leave_type: 'annual', start_date: '', end_date: '', total_days: 1, reason: '', notes: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit, ...filters };
            const result = await leaveApi.list(params);
            setData(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, filters]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        employeeApi.list({ limit: 200 }).then(r => setEmployees(r.data)).catch(console.error);
        departmentApi.list().then(setDepartments).catch(console.error);
    }, []);

    const openCreate = () => { setEditing(null); setForm({ employee_id: '', leave_type: 'annual', start_date: '', end_date: '', total_days: 1, reason: '', notes: '' }); setShowModal(true); };
    const openEdit = (item) => { setEditing(item); setForm({ employee_id: item.employee_id, leave_type: item.leave_type, start_date: item.start_date, end_date: item.end_date, total_days: item.total_days, reason: item.reason || '', notes: item.notes || '' }); setShowModal(true); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form, employee_id: parseInt(form.employee_id), total_days: parseFloat(form.total_days) };
            if (editing) await leaveApi.update(editing.id, payload);
            else await leaveApi.create(payload);
            setShowModal(false);
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleApprove = async (id, action) => {
        if (!window.confirm(`Bạn chắc chắn muốn ${action === 'approved' ? 'duyệt' : 'từ chối'} đơn này?`)) return;
        try { await leaveApi.approve(id, action); fetchData(); }
        catch (err) { alert(err.message); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Xoá đơn xin nghỉ này?')) return;
        try { await leaveApi.delete(id); fetchData(); }
        catch (err) { alert(err.message); }
    };

    const handleExportExcel = async () => {
        try {
            const params = { page: 1, limit: 5000, ...filters };
            const result = await leaveApi.list(params);
            exportLeaveExcel(result.data);
        } catch (err) { alert('Lỗi xuất Excel: ' + err.message); }
    };

    const handleExportPDF = async () => {
        try {
            const params = { page: 1, limit: 5000, ...filters };
            const result = await leaveApi.list(params);
            exportLeavePDF(result.data);
        } catch (err) { alert('Lỗi xuất PDF: ' + err.message); }
    };

    return (
        <div className="leave-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Đơn xin nghỉ phép</h1>
                    <span className="record-count">{pagination.total} đơn</span>
                </div>
                <div className="content-header-right">
                    <ExportButton
                        onExportExcel={handleExportExcel}
                        onExportPDF={handleExportPDF}
                        disabled={loading || data.length === 0}
                    />
                    <button className="header-btn header-btn-primary" onClick={openCreate}>
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Tạo đơn
                    </button>
                </div>
            </div>

            <div className="leave-filter-bar">
                <input placeholder="Tìm nhân viên..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
                <select value={filters.department_id} onChange={e => setFilters(f => ({ ...f, department_id: e.target.value }))}>
                    <option value="">Tất cả phòng ban</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select value={filters.leave_type} onChange={e => setFilters(f => ({ ...f, leave_type: e.target.value }))}>
                    <option value="">Tất cả loại</option>
                    {Object.entries(LEAVE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                    <option value="">Tất cả trạng thái</option>
                    {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>

            <div className="leave-table-wrap">
                {loading ? <div className="leave-loading">Đang tải...</div> : data.length === 0 ? (
                    <div className="leave-empty"><h3>Chưa có đơn xin nghỉ</h3><p>Tạo đơn xin nghỉ mới để bắt đầu.</p></div>
                ) : (
                    <table className="leave-table">
                        <thead><tr>
                            <th>Nhân viên</th><th>Phòng ban</th><th>Loại phép</th>
                            <th>Từ ngày</th><th>Đến ngày</th><th className="tac">Số ngày</th>
                            <th>Lý do</th><th>Trạng thái</th><th>Người duyệt</th><th>Thao tác</th>
                        </tr></thead>
                        <tbody>
                            {data.map(r => (
                                <tr key={r.id}>
                                    <td><div className="leave-emp-cell"><div className="leave-emp-avatar">{r.employee_name?.charAt(0)}</div><span className="leave-emp-name">{r.employee_name}</span></div></td>
                                    <td>{r.department_name || '—'}</td>
                                    <td><span className={`leave-badge ${r.leave_type}`}>{LEAVE_TYPES[r.leave_type] || r.leave_type}</span></td>
                                    <td>{r.start_date}</td>
                                    <td>{r.end_date}</td>
                                    <td className="tac"><strong>{r.total_days}</strong></td>
                                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason || '—'}</td>
                                    <td><span className={`leave-badge ${r.status}`}>{STATUSES[r.status] || r.status}</span></td>
                                    <td>{r.approver_name || '—'}</td>
                                    <td>
                                        <div className="leave-actions">
                                            {r.status === 'pending' && (
                                                <>
                                                    <button className="leave-action-btn approve" title="Duyệt" onClick={() => handleApprove(r.id, 'approved')}>
                                                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                    </button>
                                                    <button className="leave-action-btn reject" title="Từ chối" onClick={() => handleApprove(r.id, 'rejected')}>
                                                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                    </button>
                                                </>
                                            )}
                                            <button className="leave-action-btn edit" title="Sửa" onClick={() => openEdit(r)}>
                                                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                            </button>
                                            <button className="leave-action-btn delete" title="Xoá" onClick={() => handleDelete(r.id)}>
                                                <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {!loading && data.length > 0 && (
                <Pagination currentPage={pagination.page} totalItems={pagination.total} pageSize={pagination.limit}
                    onPageChange={p => setPagination(prev => ({ ...prev, page: p }))}
                    onPageSizeChange={s => setPagination(prev => ({ ...prev, limit: s, page: 1 }))} />
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">{editing ? 'Sửa đơn xin nghỉ' : 'Tạo đơn xin nghỉ'}</h2>
                        <form className="modal-form" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nhân viên *</label>
                                <select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} required>
                                    <option value="">Chọn nhân viên</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                </select>
                            </div>
                            <div className="modal-grid">
                                <div className="form-group">
                                    <label>Loại phép *</label>
                                    <select value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}>
                                        {Object.entries(LEAVE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Số ngày *</label>
                                    <input type="number" step="0.5" min="0.5" value={form.total_days} onChange={e => setForm(f => ({ ...f, total_days: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label>Từ ngày *</label>
                                    <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label>Đến ngày *</label>
                                    <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Lý do</label>
                                <textarea rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label>Ghi chú</label>
                                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="header-btn header-btn-secondary" onClick={() => setShowModal(false)}>Huỷ</button>
                                <button type="submit" className="header-btn header-btn-primary">{editing ? 'Cập nhật' : 'Tạo đơn'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
