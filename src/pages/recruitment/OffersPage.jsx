import { useState, useEffect, useCallback } from 'react';
import { offerApi, applicationApi, recruitEmailApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import './RecruitmentStyles.css';

const STATUS_LABELS = { pending: 'Chờ xác nhận', accepted: 'Đã chấp nhận', rejected: 'Đã từ chối' };
const emptyForm = { application_id: '', salary: '', start_date: '', notes: '' };

export default function OffersPage() {
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (search) params.search = search;
            if (filterStatus) params.status = filterStatus;
            const result = await offerApi.list(params);
            setItems(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search, filterStatus]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        applicationApi.list({ limit: 200 }).then(r => setApplications(r.data)).catch(console.error);
    }, []);

    const openModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setForm({
                application_id: item.application_id,
                salary: item.salary || '',
                start_date: item.start_date || '',
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
                application_id: parseInt(form.application_id),
                salary: form.salary ? parseFloat(form.salary) : null,
                start_date: form.start_date || null,
                notes: form.notes || null,
            };
            if (editingItem) await offerApi.update(editingItem.id, data);
            else await offerApi.create(data);
            setShowModal(false);
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleStatusChange = async (id, status) => {
        const msg = status === 'accepted' ? 'Ứng viên chấp nhận offer?' : 'Ứng viên từ chối offer?';
        if (!window.confirm(msg)) return;
        try { await offerApi.updateStatus(id, status); fetchData(); }
        catch (err) { alert(err.message); }
    };

    const handleHire = async (offer) => {
        if (!window.confirm(`Tuyển ứng viên ${offer.candidate_name}? Sẽ tạo nhân viên mới.`)) return;
        try {
            const result = await applicationApi.hire(offer.application_id);
            alert(result.message);
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Xóa đề nghị này?')) return;
        try { await offerApi.delete(id); fetchData(); }
        catch (err) { alert(err.message); }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
    const formatSalary = (s) => s ? new Intl.NumberFormat('vi-VN').format(s) + ' ₫' : '—';

    return (
        <div className="contracts-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Đề nghị</h1>
                    <span className="record-count">{pagination.total} bản ghi</span>
                </div>
                <div className="content-header-right">
                    <button className="header-btn header-btn-primary" onClick={() => openModal()}>
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Tạo đề nghị
                    </button>
                </div>
            </div>

            <div className="filter-bar">
                <input type="text" placeholder="Tìm theo tên ứng viên..." value={search}
                    onChange={e => setSearch(e.target.value)} className="filter-input" style={{ maxWidth: 280 }} />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-select">
                    <option value="">Tất cả trạng thái</option>
                    <option value="pending">Chờ xác nhận</option>
                    <option value="accepted">Đã chấp nhận</option>
                    <option value="rejected">Đã từ chối</option>
                </select>
            </div>

            <div className="attendance-table-wrapper">
                {loading ? (
                    <div className="loading-state">Đang tải...</div>
                ) : items.length === 0 ? (
                    <div className="empty-list-state">
                        <h3>Chưa có đề nghị</h3>
                        <p>Tạo đề nghị lương cho ứng viên.</p>
                    </div>
                ) : (
                    <table className="attendance-table" role="grid">
                        <thead className="table-header">
                            <tr>
                                <th className="table-cell">Ứng viên</th>
                                <th className="table-cell">Vị trí</th>
                                <th className="table-cell">Phòng ban</th>
                                <th className="table-cell">Lương đề nghị</th>
                                <th className="table-cell">Ngày bắt đầu</th>
                                <th className="table-cell">Trạng thái</th>
                                <th className="table-cell">Ngày tạo</th>
                                <th className="table-cell table-cell-action" style={{ width: 160 }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {items.map((o, i) => (
                                <tr key={o.id} className={`table-row ${i % 2 === 0 ? 'table-row-even' : 'table-row-odd'}`}>
                                    <td className="table-cell"><strong>{o.candidate_name || '—'}</strong></td>
                                    <td className="table-cell">{o.position_name || '—'}</td>
                                    <td className="table-cell">{o.department_name || '—'}</td>
                                    <td className="table-cell" style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-success-dark)' }}>{formatSalary(o.salary)}</td>
                                    <td className="table-cell">{o.start_date || '—'}</td>
                                    <td className="table-cell">
                                        <span className={`status-badge badge-${o.status}`}>{STATUS_LABELS[o.status] || o.status}</span>
                                    </td>
                                    <td className="table-cell">{formatDate(o.created_at)}</td>
                                    <td className="table-cell table-cell-action">
                                        {o.status === 'pending' && (
                                            <>
                                                <button className="action-btn approve-btn" onClick={() => handleStatusChange(o.id, 'accepted')} title="Chấp nhận">
                                                    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                </button>
                                                <button className="action-btn delete-btn" onClick={() => handleStatusChange(o.id, 'rejected')} title="Từ chối">
                                                    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                </button>
                                            </>
                                        )}
                                        {o.status === 'accepted' && (
                                            <button className="action-btn hire-btn" onClick={() => handleHire(o)} title="Tuyển (tạo nhân viên)">
                                                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg>
                                            </button>
                                        )}
                                        <button className="action-btn edit-btn" onClick={() => openModal(o)} title="Sửa">
                                            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                        </button>
                                        <button className="action-btn delete-btn" onClick={() => handleDelete(o.id)} title="Xóa">
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
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">{editingItem ? 'Sửa đề nghị' : 'Tạo đề nghị mới'}</h2>
                        <form onSubmit={handleSave} className="modal-form">
                            <div className="form-group">
                                <label>Ứng tuyển *</label>
                                <select value={form.application_id} onChange={e => setForm(f => ({ ...f, application_id: e.target.value }))} required disabled={!!editingItem}>
                                    <option value="">— Chọn —</option>
                                    {applications.filter(a => ['interview', 'offer', 'screening'].includes(a.stage))
                                        .map(a => <option key={a.id} value={a.id}>{a.candidate_name} — {a.position_name || a.request_title}</option>)
                                    }
                                </select>
                            </div>
                            <div className="modal-grid">
                                <div className="form-group">
                                    <label>Lương đề nghị</label>
                                    <input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="VD: 15000000" />
                                </div>
                                <div className="form-group">
                                    <label>Ngày bắt đầu</label>
                                    <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
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
