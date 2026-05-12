import { useState, useEffect, useCallback } from 'react';
import { incentiveRateApi, departmentApi, jobPositionApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import './IncentiveRatePage.css';

const RATE_TYPES = [
    { value: 'fixed', label: 'Số cố định' },
    { value: 'percentage', label: 'Phần trăm (%)' },
    { value: 'per_hour', label: 'Theo giờ' },
];
const APPLICABLE = [
    { value: 'all', label: 'Tất cả nhân viên' },
    { value: 'department', label: 'Theo phòng ban' },
    { value: 'position', label: 'Theo chức danh' },
];

const emptyForm = {
    name: '', code: '', rate_type: 'fixed', rate_value: '',
    description: '', applicable_to: 'all', department_id: '', job_position_id: '', is_active: 'active',
};

export default function IncentiveRatePage() {
    const [rates, setRates] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [filterType, setFilterType] = useState('');
    const [search, setSearch] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (search) params.search = search;
            if (filterType) params.rate_type = filterType;
            const result = await incentiveRateApi.list(params);
            setRates(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search, filterType]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        departmentApi.list().then(setDepartments).catch(console.error);
        jobPositionApi.list().then(setPositions).catch(console.error);
    }, []);

    const openModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setForm({
                name: item.name, code: item.code || '', rate_type: item.rate_type,
                rate_value: item.rate_value, description: item.description || '',
                applicable_to: item.applicable_to, department_id: item.department_id || '',
                job_position_id: item.job_position_id || '', is_active: item.is_active,
            });
        } else { setEditingItem(null); setForm(emptyForm); }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const data = {
                ...form, rate_value: parseFloat(form.rate_value),
                department_id: form.department_id ? parseInt(form.department_id) : null,
                job_position_id: form.job_position_id ? parseInt(form.job_position_id) : null,
            };
            if (editingItem) await incentiveRateApi.update(editingItem.id, data);
            else await incentiveRateApi.create(data);
            setShowModal(false); fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Xóa "${name}"?`)) return;
        try { await incentiveRateApi.delete(id); fetchData(); }
        catch (err) { alert(err.message); }
    };

    const fmtValue = (type, val) => {
        if (type === 'percentage') return `${val}%`;
        if (type === 'per_hour') return `${Number(val).toLocaleString('vi-VN')} ₫/h`;
        return Number(val).toLocaleString('vi-VN') + ' ₫';
    };

    return (
        <div className="incentive-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Phụ cấp</h1>
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
                <input type="text" placeholder="Tìm theo tên hoặc mã..." value={search}
                    onChange={e => setSearch(e.target.value)} className="filter-input" style={{ maxWidth: 280 }} />
                <select value={filterType} onChange={e => { setFilterType(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="filter-select">
                    <option value="">Tất cả loại</option>
                    {RATE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
            </div>

            {/* Info Card: Salary Formula */}
            <div className="formula-card">
                <h3>📋 Công thức tính lương</h3>
                <div className="formula-body">
                    <div className="formula-line"><span className="formula-label">Lương cơ bản</span><span className="formula-desc">Từ hợp đồng đang chạy</span></div>
                    <div className="formula-op">+</div>
                    <div className="formula-line"><span className="formula-label">Tăng ca</span><span className="formula-desc">Giờ OT × (Lương CB ÷ Giờ chuẩn) × 1.5</span></div>
                    <div className="formula-op">+</div>
                    <div className="formula-line"><span className="formula-label">Phụ cấp</span><span className="formula-desc">Tổng các khoản phụ cấp áp dụng</span></div>
                    <div className="formula-op">=</div>
                    <div className="formula-line formula-total"><span className="formula-label">Tổng thu nhập</span><span className="formula-desc">Tổng trước khấu trừ</span></div>
                    <div className="formula-op">−</div>
                    <div className="formula-line"><span className="formula-label">Khấu trừ (10.5%)</span><span className="formula-desc">BHXH 8% + BHYT 1.5% + BHTN 1%</span></div>
                    <div className="formula-op">=</div>
                    <div className="formula-line formula-net"><span className="formula-label">Lương ròng</span><span className="formula-desc">Thực nhận</span></div>
                </div>
            </div>

            <div className="attendance-table-wrapper">
                {loading ? (<div className="loading-state">Đang tải...</div>) : rates.length === 0 ? (
                    <div className="empty-list-state"><h3>Chưa có phụ cấp</h3><p>Tạo các khoản phụ cấp để sử dụng khi tính lương.</p></div>
                ) : (
                    <table className="attendance-table" role="grid">
                        <thead className="table-header">
                            <tr>
                                <th className="table-cell">Tên</th>
                                <th className="table-cell">Mã</th>
                                <th className="table-cell">Loại</th>
                                <th className="table-cell tac">Giá trị</th>
                                <th className="table-cell">Áp dụng</th>
                                <th className="table-cell">Trạng thái</th>
                                <th className="table-cell table-cell-action">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {rates.map((r, i) => (
                                <tr key={r.id} className={`table-row ${i % 2 === 0 ? 'table-row-even' : 'table-row-odd'}`}>
                                    <td className="table-cell"><strong>{r.name}</strong>{r.description && <div className="cell-sub">{r.description}</div>}</td>
                                    <td className="table-cell"><code className="code-badge">{r.code || '—'}</code></td>
                                    <td className="table-cell"><span className="type-badge">{RATE_TYPES.find(t => t.value === r.rate_type)?.label || r.rate_type}</span></td>
                                    <td className="table-cell tac"><strong className="value-highlight">{fmtValue(r.rate_type, r.rate_value)}</strong></td>
                                    <td className="table-cell">
                                        {r.applicable_to === 'all' ? 'Tất cả NV' :
                                            r.applicable_to === 'department' ? (r.department_name || 'Phòng ban') :
                                                (r.job_position_name || 'Chức danh')}
                                    </td>
                                    <td className="table-cell">
                                        <span className={`contract-status ${r.is_active === 'active' ? 'status-running' : 'status-expired'}`}>{r.is_active}</span>
                                    </td>
                                    <td className="table-cell table-cell-action">
                                        <button className="action-btn edit-btn" onClick={() => openModal(r)} title="Sửa">
                                            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                        </button>
                                        <button className="action-btn delete-btn" onClick={() => handleDelete(r.id, r.name)} title="Xóa">
                                            <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {!loading && rates.length > 0 && (
                <Pagination currentPage={pagination.page} totalItems={pagination.total} pageSize={pagination.limit}
                    onPageChange={p => setPagination(prev => ({ ...prev, page: p }))}
                    onPageSizeChange={s => setPagination(prev => ({ ...prev, limit: s, page: 1 }))} />
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">{editingItem ? 'Sửa phụ cấp' : 'Thêm phụ cấp'}</h2>
                        <form onSubmit={handleSave} className="modal-form">
                            <div className="modal-grid">
                                <div className="form-group">
                                    <label>Tên *</label>
                                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="VD: Phụ cấp ăn trưa" />
                                </div>
                                <div className="form-group">
                                    <label>Mã</label>
                                    <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="VD: LUNCH" />
                                </div>
                                <div className="form-group">
                                    <label>Loại</label>
                                    <select value={form.rate_type} onChange={e => setForm(f => ({ ...f, rate_type: e.target.value }))}>
                                        {RATE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Giá trị *</label>
                                    <input type="number" step="0.01" value={form.rate_value} onChange={e => setForm(f => ({ ...f, rate_value: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label>Áp dụng cho</label>
                                    <select value={form.applicable_to} onChange={e => setForm(f => ({ ...f, applicable_to: e.target.value }))}>
                                        {APPLICABLE.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Trạng thái</label>
                                    <select value={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.value }))}>
                                        <option value="active">Hoạt động</option>
                                        <option value="inactive">Ngưng</option>
                                    </select>
                                </div>
                                {form.applicable_to === 'department' && (
                                    <div className="form-group">
                                        <label>Phòng ban</label>
                                        <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                                            <option value="">— Chọn —</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                {form.applicable_to === 'position' && (
                                    <div className="form-group">
                                        <label>Chức danh</label>
                                        <select value={form.job_position_id} onChange={e => setForm(f => ({ ...f, job_position_id: e.target.value }))}>
                                            <option value="">— Chọn —</option>
                                            {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="form-group" style={{ marginTop: 8 }}>
                                <label>Mô tả</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
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
