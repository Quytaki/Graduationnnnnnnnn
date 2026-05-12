import { useState, useEffect, useCallback } from 'react';
import { workingHourApi, employeeApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import './WorkingHoursPage.css';

const emptyForm = {
    employee_id: '', period: '', standard_hours: 176,
    actual_hours: '', overtime_hours: '', late_hours: '',
    absent_days: 0, working_days: 22, notes: '',
};

export default function WorkingHoursPage() {
    const [records, setRecords] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [filterPeriod, setFilterPeriod] = useState('');
    const [search, setSearch] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (search) params.search = search;
            if (filterPeriod) params.period = filterPeriod;
            const result = await workingHourApi.list(params);
            setRecords(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search, filterPeriod]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        employeeApi.list({ limit: 200 }).then(r => setEmployees(r.data)).catch(console.error);
    }, []);

    const openModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setForm({
                employee_id: item.employee_id, period: item.period,
                standard_hours: item.standard_hours, actual_hours: item.actual_hours,
                overtime_hours: item.overtime_hours, late_hours: item.late_hours,
                absent_days: item.absent_days, working_days: item.working_days,
                notes: item.notes || '',
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
                ...form,
                employee_id: parseInt(form.employee_id),
                standard_hours: parseFloat(form.standard_hours),
                actual_hours: parseFloat(form.actual_hours || 0),
                overtime_hours: parseFloat(form.overtime_hours || 0),
                late_hours: parseFloat(form.late_hours || 0),
                absent_days: parseFloat(form.absent_days || 0),
                working_days: parseFloat(form.working_days || 22),
            };
            if (editingItem) await workingHourApi.update(editingItem.id, data);
            else await workingHourApi.create(data);
            setShowModal(false);
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Xóa bản ghi giờ làm này?')) return;
        try { await workingHourApi.delete(id); fetchData(); }
        catch (err) { alert(err.message); }
    };

    const fmtNum = (n) => n != null ? Number(n).toFixed(1) : '0.0';

    return (
        <div className="working-hours-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Giờ làm việc</h1>
                    <span className="record-count">{pagination.total} bản ghi</span>
                </div>
                <div className="content-header-right">
                    <button className="header-btn header-btn-primary" onClick={() => openModal()}>
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Thêm mới
                    </button>
                </div>
            </div>

            <div className="filter-bar">
                <input type="text" placeholder="Tìm theo tên nhân viên..." value={search}
                    onChange={e => setSearch(e.target.value)} className="filter-input" style={{ maxWidth: 280 }} />
                <input type="month" value={filterPeriod} onChange={e => { setFilterPeriod(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                    className="filter-input" style={{ maxWidth: 180 }} />
            </div>

            <div className="attendance-table-wrapper">
                {loading ? (<div className="loading-state">Đang tải...</div>) : records.length === 0 ? (
                    <div className="empty-list-state"><h3>Chưa có bản ghi giờ làm</h3><p>Dữ liệu sẽ xuất hiện khi được tạo.</p></div>
                ) : (
                    <table className="attendance-table" role="grid">
                        <thead className="table-header">
                            <tr>
                                <th className="table-cell">Nhân viên</th>
                                <th className="table-cell">Kỳ</th>
                                <th className="table-cell tac">Chuẩn (h)</th>
                                <th className="table-cell tac">Thực tế (h)</th>
                                <th className="table-cell tac">Tăng ca (h)</th>
                                <th className="table-cell tac">Muộn (h)</th>
                                <th className="table-cell tac">Vắng (ngày)</th>
                                <th className="table-cell tac">Ngày công</th>
                                <th className="table-cell table-cell-action">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {records.map((r, i) => (
                                <tr key={r.id} className={`table-row ${i % 2 === 0 ? 'table-row-even' : 'table-row-odd'}`}>
                                    <td className="table-cell"><strong>{r.employee_name}</strong></td>
                                    <td className="table-cell"><span className="period-badge">{r.period}</span></td>
                                    <td className="table-cell tac">{fmtNum(r.standard_hours)}</td>
                                    <td className="table-cell tac">{fmtNum(r.actual_hours)}</td>
                                    <td className="table-cell tac">
                                        <span className={r.overtime_hours > 0 ? 'ot-highlight' : ''}>{fmtNum(r.overtime_hours)}</span>
                                    </td>
                                    <td className="table-cell tac">
                                        <span className={r.late_hours > 0 ? 'late-highlight' : ''}>{fmtNum(r.late_hours)}</span>
                                    </td>
                                    <td className="table-cell tac">
                                        <span className={r.absent_days > 0 ? 'absent-highlight' : ''}>{fmtNum(r.absent_days)}</span>
                                    </td>
                                    <td className="table-cell tac">{fmtNum(r.working_days)}</td>
                                    <td className="table-cell table-cell-action">
                                        <button className="action-btn edit-btn" onClick={() => openModal(r)} title="Sửa">
                                            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                        </button>
                                        <button className="action-btn delete-btn" onClick={() => handleDelete(r.id)} title="Xóa">
                                            <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        </button>
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
                        <h2 className="modal-title">{editingItem ? 'Sửa giờ làm việc' : 'Thêm giờ làm việc'}</h2>
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
                                    <label>Kỳ *</label>
                                    <input type="month" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label>Giờ chuẩn</label>
                                    <input type="number" step="0.1" value={form.standard_hours} onChange={e => setForm(f => ({ ...f, standard_hours: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Giờ thực tế</label>
                                    <input type="number" step="0.1" value={form.actual_hours} onChange={e => setForm(f => ({ ...f, actual_hours: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Giờ tăng ca</label>
                                    <input type="number" step="0.1" value={form.overtime_hours} onChange={e => setForm(f => ({ ...f, overtime_hours: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Giờ muộn</label>
                                    <input type="number" step="0.1" value={form.late_hours} onChange={e => setForm(f => ({ ...f, late_hours: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Ngày vắng</label>
                                    <input type="number" step="0.5" value={form.absent_days} onChange={e => setForm(f => ({ ...f, absent_days: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Ngày công</label>
                                    <input type="number" step="0.5" value={form.working_days} onChange={e => setForm(f => ({ ...f, working_days: e.target.value }))} />
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
