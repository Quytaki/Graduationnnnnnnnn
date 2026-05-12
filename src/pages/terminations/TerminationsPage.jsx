import { useState, useEffect, useCallback } from 'react';
import { terminationApi, employeeApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import './TerminationsPage.css';

const REASONS = [
    { value: 'resignation', label: 'Tự nghỉ' },
    { value: 'dismissal', label: 'Sa thải' },
    { value: 'layoff', label: 'Cắt giảm' },
    { value: 'end_of_contract', label: 'Hết hợp đồng' },
    { value: 'retirement', label: 'Nghỉ hưu' },
    { value: 'mutual_agreement', label: 'Thỏa thuận' },
];
const STATUSES = [
    { value: 'pending', label: 'Chờ xử lý' },
    { value: 'approved', label: 'Đã duyệt' },
    { value: 'completed', label: 'Hoàn thành' },
    { value: 'cancelled', label: 'Đã hủy' },
];

const emptyForm = {
    employee_id: '', termination_date: '', reason: 'resignation',
    description: '', notice_date: '', last_working_day: '', status: 'pending',
};

export default function TerminationsPage() {
    const [terminations, setTerminations] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterReason, setFilterReason] = useState('');
    const [search, setSearch] = useState('');

    const fetchTerminations = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (search) params.search = search;
            if (filterStatus) params.status = filterStatus;
            if (filterReason) params.reason = filterReason;
            const result = await terminationApi.list(params);
            setTerminations(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search, filterStatus, filterReason]);

    useEffect(() => { fetchTerminations(); }, [fetchTerminations]);
    useEffect(() => {
        employeeApi.list({ limit: 200 }).then(r => setEmployees(r.data)).catch(console.error);
    }, []);

    const openModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setForm({
                employee_id: item.employee_id, termination_date: item.termination_date,
                reason: item.reason, description: item.description || '',
                notice_date: item.notice_date || '', last_working_day: item.last_working_day || '',
                status: item.status,
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
                notice_date: form.notice_date || null,
                last_working_day: form.last_working_day || null,
            };
            if (editingItem) await terminationApi.update(editingItem.id, data);
            else await terminationApi.create(data);
            setShowModal(false);
            fetchTerminations();
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Xóa bản ghi nghỉ việc này?')) return;
        try { await terminationApi.delete(id); fetchTerminations(); }
        catch (err) { alert(err.message); }
    };

    const handleApprove = async (id, action) => {
        const msgs = {
            approved: 'Duyệt đơn nghỉ việc này?',
            completed: 'Hoàn tất nghỉ việc? Nhân viên sẽ bị vô hiệu hóa và tất cả hợp đồng sẽ bị hủy.',
            cancelled: 'Hủy đơn nghỉ việc?',
        };
        if (!window.confirm(msgs[action] || 'Xác nhận?')) return;
        try { await terminationApi.approve(id, action); fetchTerminations(); }
        catch (err) { alert(err.message); }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    const getReasonLabel = (r) => REASONS.find(x => x.value === r)?.label || r;

    const getStatusLabel = (s) => ({ pending: 'Chờ xử lý', approved: 'Đã duyệt', completed: 'Hoàn thành', cancelled: 'Đã hủy' })[s] || s;

    const getStatusClass = (s) => ({
        pending: 'term-pending', approved: 'term-approved',
        completed: 'term-completed', cancelled: 'term-cancelled',
    })[s] || '';

    const getReasonClass = (r) => ({
        resignation: 'reason-resignation', dismissal: 'reason-dismissal',
        layoff: 'reason-layoff', retirement: 'reason-retirement',
        end_of_contract: 'reason-endcontract', mutual_agreement: 'reason-mutual',
    })[r] || '';

    return (
        <div className="terminations-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Nghỉ việc</h1>
                    <span className="record-count">{pagination.total} bản ghi</span>
                </div>
                <div className="content-header-right">
                    <button className="header-btn header-btn-primary" onClick={() => openModal()}>
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Thêm mới
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="filter-bar">
                <input type="text" placeholder="Tìm theo tên nhân viên..." value={search}
                    onChange={e => setSearch(e.target.value)} className="filter-input" style={{ maxWidth: 280 }} />
                <select value={filterReason} onChange={e => { setFilterReason(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="filter-select">
                    <option value="">Tất cả lý do</option>
                    {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="filter-select">
                    <option value="">Tất cả trạng thái</option>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="attendance-table-wrapper">
                {loading ? (
                    <div className="loading-state">Đang tải...</div>
                ) : terminations.length === 0 ? (
                    <div className="empty-list-state">
                        <h3>Chưa có bản ghi nghỉ việc</h3>
                        <p>Chưa có bản ghi nghỉ việc nào để hiển thị.</p>
                    </div>
                ) : (
                    <table className="attendance-table" role="grid">
                        <thead className="table-header">
                            <tr>
                                <th className="table-cell">Nhân viên</th>
                                <th className="table-cell">Lý do</th>
                                <th className="table-cell">Ngày nghỉ</th>
                                <th className="table-cell">Ngày thông báo</th>
                                <th className="table-cell">Ngày làm cuối</th>
                                <th className="table-cell">Trạng thái</th>
                                <th className="table-cell table-cell-action">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {terminations.map((t, i) => (
                                <tr key={t.id} className={`table-row ${i % 2 === 0 ? 'table-row-even' : 'table-row-odd'}`}>
                                    <td className="table-cell"><strong>{t.employee_name || '—'}</strong></td>
                                    <td className="table-cell">
                                        <span className={`reason-badge ${getReasonClass(t.reason)}`}>{getReasonLabel(t.reason)}</span>
                                    </td>
                                    <td className="table-cell">{formatDate(t.termination_date)}</td>
                                    <td className="table-cell">{formatDate(t.notice_date)}</td>
                                    <td className="table-cell">{formatDate(t.last_working_day)}</td>
                                    <td className="table-cell">
                                        <span className={`contract-status ${getStatusClass(t.status)}`}>{getStatusLabel(t.status)}</span>
                                    </td>
                                    <td className="table-cell table-cell-action">
                                        {/* Workflow buttons */}
                                        {t.status === 'pending' && (
                                            <button className="action-btn approve-btn" onClick={() => handleApprove(t.id, 'approved')} title="Duyệt">
                                                <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                            </button>
                                        )}
                                        {t.status === 'approved' && (
                                            <button className="action-btn paid-btn" onClick={() => handleApprove(t.id, 'completed')} title="Hoàn tất nghỉ việc">
                                                <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            </button>
                                        )}
                                        {t.status !== 'completed' && t.status !== 'cancelled' && (
                                            <button className="action-btn revert-btn" onClick={() => handleApprove(t.id, 'cancelled')} title="Hủy">
                                                <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                            </button>
                                        )}
                                        {t.status !== 'completed' && (
                                            <>
                                                <button className="action-btn edit-btn" onClick={() => openModal(t)} title="Sửa">
                                                    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                                </button>
                                                <button className="action-btn delete-btn" onClick={() => handleDelete(t.id)} title="Xóa">
                                                    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                </button>
                                            </>
                                        )}
                                        {t.status === 'completed' && (
                                            <span className="locked-badge" title="Đã hoàn tất">🔒</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {!loading && terminations.length > 0 && (
                <Pagination currentPage={pagination.page} totalItems={pagination.total} pageSize={pagination.limit}
                    onPageChange={p => setPagination(prev => ({ ...prev, page: p }))}
                    onPageSizeChange={s => setPagination(prev => ({ ...prev, limit: s, page: 1 }))} />
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">{editingItem ? 'Sửa nghỉ việc' : 'Thêm nghỉ việc'}</h2>
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
                                    <label>Lý do *</label>
                                    <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
                                        {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Ngày nghỉ việc *</label>
                                    <input type="date" value={form.termination_date} onChange={e => setForm(f => ({ ...f, termination_date: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label>Ngày thông báo</label>
                                    <input type="date" value={form.notice_date} onChange={e => setForm(f => ({ ...f, notice_date: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Ngày làm cuối</label>
                                    <input type="date" value={form.last_working_day} onChange={e => setForm(f => ({ ...f, last_working_day: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginTop: 8 }}>
                                <label>Mô tả</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Thông tin chi tiết về việc nghỉ..." />
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
