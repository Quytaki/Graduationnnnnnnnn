import { useState, useEffect, useCallback } from 'react';
import { candidateApi, aiScreeningApi, recruitEmailApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import './RecruitmentStyles.css';

const SOURCES = [
    { value: 'referral', label: 'Giới thiệu' },
    { value: 'website', label: 'Website' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'other', label: 'Khác' },
];

const SOURCE_LABELS = { referral: 'Giới thiệu', website: 'Website', linkedin: 'LinkedIn', other: 'Khác' };

export default function CandidatesPage() {
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [uploadMode, setUploadMode] = useState(false);
    const [search, setSearch] = useState('');
    const [filterSource, setFilterSource] = useState('');
    const [form, setForm] = useState({ name: '', email: '', phone: '', source: 'other', notes: '' });
    const [cvFile, setCvFile] = useState(null);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [screeningResults, setScreeningResults] = useState([]);
    const [screeningLoading, setScreeningLoading] = useState(false);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (search) params.search = search;
            if (filterSource) params.source = filterSource;
            const result = await candidateApi.list(params);
            setItems(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search, filterSource]);

    useEffect(() => { fetch(); }, [fetch]);

    const openModal = (upload = false) => {
        setUploadMode(upload);
        setForm({ name: '', email: '', phone: '', source: 'other', notes: '' });
        setCvFile(null);
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (uploadMode && cvFile) {
                const formData = new FormData();
                formData.append('name', form.name);
                if (form.email) formData.append('email', form.email);
                if (form.phone) formData.append('phone', form.phone);
                formData.append('source', form.source);
                if (form.notes) formData.append('notes', form.notes);
                formData.append('cv', cvFile);
                await candidateApi.upload(formData);
            } else {
                await candidateApi.create(form);
            }
            setShowModal(false);
            fetch();
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Xóa ứng viên "${name}"?`)) return;
        try { await candidateApi.delete(id); fetch(); }
        catch (err) { alert(err.message); }
    };

    const openDetail = async (candidate) => {
        setSelectedCandidate(candidate);
        setScreeningResults([]);
    };

    const runScreening = async (applicationId) => {
        setScreeningLoading(true);
        try {
            const result = await aiScreeningApi.screen({ application_id: applicationId });
            setScreeningResults(prev => [result, ...prev]);
        } catch (err) { alert(err.message); }
        finally { setScreeningLoading(false); }
    };

    const getScoreClass = (score) => {
        if (score >= 80) return 'high';
        if (score >= 50) return 'mid';
        return 'low';
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

    return (
        <div className="contracts-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Ứng viên</h1>
                    <span className="record-count">{pagination.total} bản ghi</span>
                </div>
                <div className="content-header-right">
                    <button className="header-btn header-btn-secondary" onClick={() => openModal(true)}>
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                        Upload CV
                    </button>
                    <button className="header-btn header-btn-primary" onClick={() => openModal(false)}>
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Thêm mới
                    </button>
                </div>
            </div>

            <div className="filter-bar">
                <input type="text" placeholder="Tìm theo tên, email, SĐT..." value={search}
                    onChange={e => setSearch(e.target.value)} className="filter-input" style={{ maxWidth: 280 }} />
                <select value={filterSource} onChange={e => { setFilterSource(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="filter-select">
                    <option value="">Tất cả nguồn</option>
                    {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>

            <div className="attendance-table-wrapper">
                {loading ? (
                    <div className="loading-state">Đang tải...</div>
                ) : items.length === 0 ? (
                    <div className="empty-list-state">
                        <h3>Chưa có ứng viên</h3>
                        <p>Thêm ứng viên mới hoặc upload CV.</p>
                        <button className="header-btn header-btn-primary" onClick={() => openModal(false)}>Thêm ứng viên</button>
                    </div>
                ) : (
                    <table className="attendance-table" role="grid">
                        <thead className="table-header">
                            <tr>
                                <th className="table-cell">Họ tên</th>
                                <th className="table-cell">Email</th>
                                <th className="table-cell">Điện thoại</th>
                                <th className="table-cell">Nguồn</th>
                                <th className="table-cell">CV</th>
                                <th className="table-cell">Ứng tuyển</th>
                                <th className="table-cell">Ngày tạo</th>
                                <th className="table-cell table-cell-action">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {items.map((c, i) => (
                                <tr key={c.id} className={`table-row ${i % 2 === 0 ? 'table-row-even' : 'table-row-odd'}`}
                                    style={{ cursor: 'pointer' }} onClick={() => openDetail(c)}>
                                    <td className="table-cell"><strong>{c.name}</strong></td>
                                    <td className="table-cell">{c.email || '—'}</td>
                                    <td className="table-cell">{c.phone || '—'}</td>
                                    <td className="table-cell">
                                        <span className={`status-badge badge-${c.source || 'other'}`}>
                                            {SOURCE_LABELS[c.source] || c.source}
                                        </span>
                                    </td>
                                    <td className="table-cell">
                                        {c.cv_file ? (
                                            <span style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-xs)' }}>✓ Có CV</span>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>—</span>
                                        )}
                                    </td>
                                    <td className="table-cell">
                                        <span className="status-badge badge-applied">{c.application_count || 0}</span>
                                    </td>
                                    <td className="table-cell">{formatDate(c.created_at)}</td>
                                    <td className="table-cell table-cell-action" onClick={e => e.stopPropagation()}>
                                        <button className="action-btn delete-btn" onClick={() => handleDelete(c.id, c.name)} title="Xóa">
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

            {/* Add/Upload Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">{uploadMode ? 'Upload CV ứng viên' : 'Thêm ứng viên mới'}</h2>
                        <form onSubmit={handleSave} className="modal-form">
                            <div className="modal-grid">
                                <div className="form-group">
                                    <label>Họ tên *</label>
                                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Điện thoại</label>
                                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Nguồn</label>
                                    <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                                        {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            {uploadMode && (
                                <div className="form-group" style={{ marginTop: 8 }}>
                                    <label>File CV (PDF, DOCX, TXT) *</label>
                                    <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={e => setCvFile(e.target.files[0])} required />
                                </div>
                            )}
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

            {/* Detail Side Panel */}
            {selectedCandidate && (
                <>
                    <div className="detail-panel-overlay" onClick={() => setSelectedCandidate(null)} />
                    <div className="detail-panel">
                        <div className="detail-panel-header">
                            <h2 className="detail-panel-title">{selectedCandidate.name}</h2>
                            <button className="detail-panel-close" onClick={() => setSelectedCandidate(null)}>
                                <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                        <div className="detail-panel-body">
                            <div className="detail-section">
                                <h3 className="detail-section-title">Thông tin cơ bản</h3>
                                <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{selectedCandidate.email || '—'}</span></div>
                                <div className="detail-row"><span className="detail-label">Điện thoại</span><span className="detail-value">{selectedCandidate.phone || '—'}</span></div>
                                <div className="detail-row"><span className="detail-label">Nguồn</span><span className="detail-value"><span className={`status-badge badge-${selectedCandidate.source}`}>{SOURCE_LABELS[selectedCandidate.source] || selectedCandidate.source}</span></span></div>
                                <div className="detail-row"><span className="detail-label">CV</span><span className="detail-value">{selectedCandidate.cv_file ? '✓ Đã upload' : 'Chưa có'}</span></div>
                                <div className="detail-row"><span className="detail-label">Ngày tạo</span><span className="detail-value">{formatDate(selectedCandidate.created_at)}</span></div>
                            </div>

                            {selectedCandidate.notes && (
                                <div className="detail-section">
                                    <h3 className="detail-section-title">Ghi chú</h3>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{selectedCandidate.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
