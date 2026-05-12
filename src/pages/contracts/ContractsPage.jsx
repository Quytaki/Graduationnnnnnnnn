import { useState, useEffect, useCallback } from 'react';
import { contractApi, employeeApi, departmentApi, jobPositionApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import './ContractsPage.css';

const CONTRACT_TYPES = [
    { value: 'permanent', label: 'Không thời hạn' },
    { value: 'fixed-term', label: 'Có thời hạn' },
    { value: 'internship', label: 'Thực tập' },
    { value: 'freelance', label: 'Tự do' },
];
const STATUSES = [
    { value: 'draft', label: 'Nháp' },
    { value: 'running', label: 'Đang hiệu lực' },
    { value: 'expired', label: 'Hết hạn' },
    { value: 'cancelled', label: 'Đã hủy' },
];
const WAGE_TYPES = [
    { value: 'monthly', label: 'Theo tháng' },
    { value: 'hourly', label: 'Theo giờ' },
];

const STATUS_LABELS = {
    draft: 'Nháp',
    running: 'Hiệu lực',
    expired: 'Hết hạn',
    cancelled: 'Đã hủy',
};

const emptyForm = {
    employee_id: '', reference: '', contract_type: 'permanent',
    start_date: '', end_date: '', salary: '', wage_type: 'monthly',
    department_id: '', job_position_id: '', notes: '',
};

export default function ContractsPage() {
    const [contracts, setContracts] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [jobPositions, setJobPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [search, setSearch] = useState('');

    const fetchContracts = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (search) params.search = search;
            if (filterStatus) params.status = filterStatus;
            if (filterType) params.contract_type = filterType;
            const result = await contractApi.list(params);
            setContracts(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search, filterStatus, filterType]);

    useEffect(() => { fetchContracts(); }, [fetchContracts]);
    useEffect(() => {
        employeeApi.list({ limit: 200 }).then(r => setEmployees(r.data)).catch(console.error);
        departmentApi.list().then(setDepartments).catch(console.error);
        jobPositionApi.list().then(setJobPositions).catch(console.error);
    }, []);

    const openModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setForm({
                employee_id: item.employee_id, reference: item.reference || '',
                contract_type: item.contract_type, start_date: item.start_date,
                end_date: item.end_date || '', salary: item.salary || '',
                wage_type: item.wage_type, department_id: item.department_id || '',
                job_position_id: item.job_position_id || '',
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
                salary: form.salary ? parseFloat(form.salary) : null,
                department_id: form.department_id ? parseInt(form.department_id) : null,
                job_position_id: form.job_position_id ? parseInt(form.job_position_id) : null,
                end_date: form.end_date || null,
            };
            if (editingItem) await contractApi.update(editingItem.id, data);
            else await contractApi.create(data);
            setShowModal(false);
            fetchContracts();
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (id, ref) => {
        if (!window.confirm(`Xóa hợp đồng "${ref}"?`)) return;
        try { await contractApi.delete(id); fetchContracts(); }
        catch (err) { alert(err.message); }
    };

    const handleApprove = async (id, action) => {
        const msg = action === 'running'
            ? 'Phê duyệt hợp đồng này? Nhân viên sẽ được kích hoạt.'
            : 'Hoàn hợp đồng về trạng thái nháp?';
        if (!window.confirm(msg)) return;
        try {
            await contractApi.approve(id, action);
            fetchContracts();
        } catch (err) { alert(err.message); }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
    const formatSalary = (s) => s ? Number(s).toLocaleString('vi-VN') + ' ₫' : '—';

    const getStatusClass = (s) => ({
        draft: 'status-draft', running: 'status-running',
        expired: 'status-expired', cancelled: 'status-cancelled',
    })[s] || '';

    const getTypeLabel = (t) => CONTRACT_TYPES.find(ct => ct.value === t)?.label || t;

    return (
        <div className="contracts-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Hợp đồng</h1>
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
                <input type="text" placeholder="Tìm theo nhân viên hoặc mã HĐ..." value={search}
                    onChange={e => setSearch(e.target.value)} className="filter-input" style={{ maxWidth: 280 }} />
                <select value={filterType} onChange={e => { setFilterType(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="filter-select">
                    <option value="">Tất cả loại</option>
                    {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
                ) : contracts.length === 0 ? (
                    <div className="empty-list-state">
                        <h3>Chưa có hợp đồng</h3>
                        <p>Tạo hợp đồng mới để bắt đầu.</p>
                        <button className="header-btn header-btn-primary" onClick={() => openModal()}>Tạo hợp đồng</button>
                    </div>
                ) : (
                    <table className="attendance-table" role="grid">
                        <thead className="table-header">
                            <tr>
                                <th className="table-cell">Mã HĐ</th>
                                <th className="table-cell">Nhân viên</th>
                                <th className="table-cell">Loại</th>
                                <th className="table-cell">Ngày bắt đầu</th>
                                <th className="table-cell">Ngày kết thúc</th>
                                <th className="table-cell">Lương</th>
                                <th className="table-cell">Trạng thái</th>
                                <th className="table-cell table-cell-action">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {contracts.map((c, i) => (
                                <tr key={c.id} className={`table-row ${i % 2 === 0 ? 'table-row-even' : 'table-row-odd'}`}>
                                    <td className="table-cell"><strong>{c.reference || `#${c.id}`}</strong></td>
                                    <td className="table-cell">{c.employee_name || '—'}</td>
                                    <td className="table-cell"><span className="type-badge">{getTypeLabel(c.contract_type)}</span></td>
                                    <td className="table-cell">{formatDate(c.start_date)}</td>
                                    <td className="table-cell">{formatDate(c.end_date)}</td>
                                    <td className="table-cell">{formatSalary(c.salary)}</td>
                                    <td className="table-cell">
                                        <span className={`contract-status ${getStatusClass(c.status)}`}>
                                            {STATUS_LABELS[c.status] || c.status}
                                        </span>
                                    </td>
                                    <td className="table-cell table-cell-action">
                                        {/* Approve/Reject buttons for draft contracts */}
                                        {c.status === 'draft' && (
                                            <button className="action-btn approve-btn" onClick={() => handleApprove(c.id, 'running')} title="Phê duyệt">
                                                <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                            </button>
                                        )}
                                        {/* Revert button for running contracts */}
                                        {c.status === 'running' && (
                                            <button className="action-btn revert-btn" onClick={() => handleApprove(c.id, 'draft')} title="Hoàn về nháp">
                                                <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                                            </button>
                                        )}
                                        <button className="action-btn edit-btn" onClick={() => openModal(c)} title="Sửa">
                                            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                        </button>
                                        <button className="action-btn delete-btn" onClick={() => handleDelete(c.id, c.reference)} title="Xóa">
                                            <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {!loading && contracts.length > 0 && (
                <Pagination currentPage={pagination.page} totalItems={pagination.total} pageSize={pagination.limit}
                    onPageChange={p => setPagination(prev => ({ ...prev, page: p }))}
                    onPageSizeChange={s => setPagination(prev => ({ ...prev, limit: s, page: 1 }))} />
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">{editingItem ? 'Sửa hợp đồng' : 'Thêm hợp đồng mới'}</h2>
                        {!editingItem && (
                            <div className="workflow-notice">
                                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                                <span>Hợp đồng mới sẽ được tạo ở trạng thái <strong>Nháp</strong>. Cần phê duyệt để có hiệu lực.</span>
                            </div>
                        )}
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
                                    <label>Mã hợp đồng</label>
                                    <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Tự động tạo" />
                                </div>
                                <div className="form-group">
                                    <label>Loại hợp đồng</label>
                                    <select value={form.contract_type} onChange={e => setForm(f => ({ ...f, contract_type: e.target.value }))}>
                                        {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Ngày bắt đầu *</label>
                                    <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label>Ngày kết thúc</label>
                                    <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Lương</label>
                                    <input type="number" step="0.01" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="0" />
                                </div>
                                <div className="form-group">
                                    <label>Loại lương</label>
                                    <select value={form.wage_type} onChange={e => setForm(f => ({ ...f, wage_type: e.target.value }))}>
                                        {WAGE_TYPES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Phòng ban</label>
                                    <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                                        <option value="">— Từ nhân viên —</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Chức danh</label>
                                    <select value={form.job_position_id} onChange={e => setForm(f => ({ ...f, job_position_id: e.target.value }))}>
                                        <option value="">— Từ nhân viên —</option>
                                        {jobPositions.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group" style={{ marginTop: 8 }}>
                                <label>Ghi chú</label>
                                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
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
