import { useState, useEffect, useCallback } from 'react';
import { leaveApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import './leave.css';

export default function PublicHolidaysPage() {
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ year: new Date().getFullYear().toString() });
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', date: '', year: new Date().getFullYear(), is_recurring: false, description: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await leaveApi.listHolidays({ page: pagination.page, limit: pagination.limit, ...filters });
            setData(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, filters]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreate = () => { setEditing(null); setForm({ name: '', date: '', year: parseInt(filters.year), is_recurring: false, description: '' }); setShowModal(true); };
    const openEdit = (item) => { setEditing(item); setForm({ name: item.name, date: item.date, year: item.year, is_recurring: item.is_recurring, description: item.description || '' }); setShowModal(true); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form, year: parseInt(form.year) };
            if (editing) await leaveApi.updateHoliday(editing.id, payload);
            else await leaveApi.createHoliday(payload);
            setShowModal(false);
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Xoá ngày lễ này?')) return;
        try { await leaveApi.deleteHoliday(id); fetchData(); }
        catch (err) { alert(err.message); }
    };

    const formatDate = (d) => {
        if (!d) return '';
        return new Date(d + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <div className="leave-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Ngày lễ</h1>
                    <span className="record-count">{pagination.total} ngày lễ</span>
                </div>
                <div className="content-header-right">
                    <button className="header-btn header-btn-primary" onClick={openCreate}>
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Thêm ngày lễ
                    </button>
                </div>
            </div>

            <div className="leave-filter-bar">
                <select value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}>
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            {loading ? <div className="leave-loading">Đang tải...</div> : data.length === 0 ? (
                <div className="leave-empty"><h3>Chưa có ngày lễ</h3><p>Thêm ngày lễ cho năm {filters.year}.</p></div>
            ) : (
                <div className="holiday-card-grid">
                    {data.map(h => (
                        <div key={h.id} className="holiday-card">
                            <div className="holiday-card-name">{h.name}</div>
                            <div className="holiday-card-date">📅 {formatDate(h.date)}</div>
                            <div className="holiday-card-footer">
                                <div>
                                    {h.is_recurring && <span className="leave-badge recurring">Hàng năm</span>}
                                </div>
                                <div className="leave-actions">
                                    <button className="leave-action-btn edit" title="Sửa" onClick={() => openEdit(h)}>
                                        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                    </button>
                                    <button className="leave-action-btn delete" title="Xoá" onClick={() => handleDelete(h.id)}>
                                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </div>
                            {h.description && <div className="holiday-card-desc">{h.description}</div>}
                        </div>
                    ))}
                </div>
            )}

            {!loading && data.length > 0 && (
                <Pagination currentPage={pagination.page} totalItems={pagination.total} pageSize={pagination.limit}
                    onPageChange={p => setPagination(prev => ({ ...prev, page: p }))}
                    onPageSizeChange={s => setPagination(prev => ({ ...prev, limit: s, page: 1 }))} />
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">{editing ? 'Sửa ngày lễ' : 'Thêm ngày lễ'}</h2>
                        <form className="modal-form" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Tên ngày lễ *</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                            </div>
                            <div className="modal-grid">
                                <div className="form-group">
                                    <label>Ngày *</label>
                                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label>Năm *</label>
                                    <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} required />
                                </div>
                            </div>
                            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <input type="checkbox" id="recurring" checked={form.is_recurring} onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))} style={{ width: 'auto' }} />
                                <label htmlFor="recurring" style={{ margin: 0 }}>Lặp lại hàng năm</label>
                            </div>
                            <div className="form-group">
                                <label>Mô tả</label>
                                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="header-btn header-btn-secondary" onClick={() => setShowModal(false)}>Huỷ</button>
                                <button type="submit" className="header-btn header-btn-primary">{editing ? 'Cập nhật' : 'Thêm'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
