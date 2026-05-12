import { useState, useEffect, useCallback } from 'react';
import { recruitRequestApi, departmentApi, jobPositionApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import './RecruitmentStyles.css';

const STATUS_LABELS = { pending: 'Chờ duyệt', approved: 'Đã duyệt', closed: 'Đã đóng' };

const emptyForm = { title: '', department_id: '', job_position_id: '', quantity: 1, description: '', requirements: '' };

export default function RecruitmentRequestsPage() {
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDept, setFilterDept] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (search) params.search = search;
            if (filterStatus) params.status = filterStatus;
            if (filterDept) params.department_id = filterDept;
            const result = await recruitRequestApi.list(params);
            setItems(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search, filterStatus, filterDept]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        departmentApi.list().then(setDepartments).catch(console.error);
        jobPositionApi.list().then(setPositions).catch(console.error);
    }, []);

    const openModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setForm({
                title: item.title, department_id: item.department_id || '',
                job_position_id: item.job_position_id || '', quantity: item.quantity,
                description: item.description || '', requirements: item.requirements || '',
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
                quantity: parseInt(form.quantity) || 1,
                department_id: form.department_id ? parseInt(form.department_id) : null,
                job_position_id: form.job_position_id ? parseInt(form.job_position_id) : null,
            };
            if (editingItem) await recruitRequestApi.update(editingItem.id, data);
            else await recruitRequestApi.create(data);
            setShowModal(false);
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleApprove = async (id, action) => {
        const msg = action === 'approved' ? 'Phê duyệt yêu cầu này?' : action === 'closed' ? 'Đóng yêu cầu này?' : 'Hoàn về chờ duyệt?';
        if (!window.confirm(msg)) return;
        try { await recruitRequestApi.approve(id, action); fetchData(); }
        catch (err) { alert(err.message); }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Xóa yêu cầu "${title}"?`)) return;
        try { await recruitRequestApi.delete(id); fetchData(); }
        catch (err) { alert(err.message); }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

    return (
        <div className="contracts-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Yêu cầu tuyển dụng</h1>
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
                <input type="text" placeholder="Tìm theo tiêu đề..." value={search}
                    onChange={e => setSearch(e.target.value)} className="filter-input" style={{ maxWidth: 280 }} />
                <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="filter-select">
                    <option value="">Tất cả phòng ban</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="filter-select">
                    <option value="">Tất cả trạng thái</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="approved">Đã duyệt</option>
                    <option value="closed">Đã đóng</option>
                </select>
            </div>

            <div className="attendance-table-wrapper">
                {loading ? (
                    <div className="loading-state">Đang tải...</div>
                ) : items.length === 0 ? (
                    <div className="empty-list-state">
                        <h3>Chưa có yêu cầu tuyển dụng</h3>
                        <p>Tạo yêu cầu mới để bắt đầu.</p>
                        <button className="header-btn header-btn-primary" onClick={() => openModal()}>Tạo yêu cầu</button>
                    </div>
                ) : (
                    <table className="attendance-table" role="grid">
                        <thead className="table-header">
                            <tr>
                                <th className="table-cell">Tiêu đề</th>
                                <th className="table-cell">Vị trí</th>
                                <th className="table-cell">Phòng ban</th>
                                <th className="table-cell">SL</th>
                                <th className="table-cell">Ứng tuyển</th>
                                <th className="table-cell">Trạng thái</th>
                                <th className="table-cell">Ngày tạo</th>
                                <th className="table-cell table-cell-action">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {items.map((r, i) => (
                                <tr key={r.id} className={`table-row ${i % 2 === 0 ? 'table-row-even' : 'table-row-odd'}`}>
                                    <td className="table-cell"><strong>{r.title}</strong></td>
                                    <td className="table-cell">{r.job_position_name || '—'}</td>
                                    <td className="table-cell">{r.department_name || '—'}</td>
                                    <td className="table-cell">{r.quantity}</td>
                                    <td className="table-cell"><span className="status-badge badge-applied">{r.application_count || 0}</span></td>
                                    <td className="table-cell">
                                        <span className={`status-badge badge-${r.status}`}>{STATUS_LABELS[r.status] || r.status}</span>
                                    </td>
                                    <td className="table-cell">{formatDate(r.created_at)}</td>
                                    <td className="table-cell table-cell-action">
                                        {r.status === 'pending' && (
                                            <button className="action-btn approve-btn" onClick={() => handleApprove(r.id, 'approved')} title="Phê duyệt">
                                                <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                            </button>
                                        )}
                                        {r.status === 'approved' && (
                                            <button className="action-btn" onClick={() => handleApprove(r.id, 'closed')} title="Đóng" style={{ color: 'var(--color-warning)' }}>
                                                <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                            </button>
                                        )}
                                        <button className="action-btn edit-btn" onClick={() => openModal(r)} title="Sửa">
                                            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                        </button>
                                        <button className="action-btn delete-btn" onClick={() => handleDelete(r.id, r.title)} title="Xóa">
                                            <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {!loading && items.length > 0 && (
                <Pagination currentPage={pagination.page} totalItems={pagination.total} pageSize={pagination.limit}
                    onPageChange={p => setPagination(prev => ({ ...prev, page: p }))}
                    onPageSizeChange={s => setPagination(prev => ({ ...prev, limit: s, page: 1 }))} />
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">{editingItem ? 'Sửa yêu cầu tuyển dụng' : 'Tạo yêu cầu mới'}</h2>
                        <form onSubmit={handleSave} className="modal-form">
                            <div className="form-group">
                                <label>Tiêu đề *</label>
                                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="VD: Tuyển Frontend Developer" />
                            </div>
                            <div className="modal-grid">
                                <div className="form-group">
                                    <label>Vị trí</label>
                                    <select value={form.job_position_id} onChange={e => setForm(f => ({ ...f, job_position_id: e.target.value }))}>
                                        <option value="">— Chọn —</option>
                                        {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Phòng ban</label>
                                    <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                                        <option value="">— Chọn —</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Số lượng</label>
                                    <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginTop: 8 }}>
                                <label>Mô tả công việc</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Mô tả chi tiết về công việc..." />
                            </div>
                            <div className="form-group">
                                <label>Yêu cầu</label>
                                <textarea value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} rows={3} placeholder="Yêu cầu kỹ năng, kinh nghiệm..." />
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
