import { useState, useEffect, useCallback } from 'react';
import { essApi } from '../../services/api';
import ESSLayout from '../../components/ESSLayout/ESSLayout';
import Pagination from '../../components/Pagination/Pagination';
import './ess.css';

const LEAVE_TYPES = { annual: 'Phép năm', unpaid: 'Không lương', sick: 'Ốm đau', maternity: 'Thai sản', other: 'Khác' };
const STATUSES = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', cancelled: 'Đã huỷ' };

export default function ESSLeavePage() {
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ leave_type: 'annual', start_date: '', end_date: '', total_days: 1, reason: '' });

    useEffect(() => { essApi.getProfile().then(setProfile).catch(console.error); }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await essApi.getLeaves({ page: pagination.page, limit: pagination.limit });
            setData(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await essApi.submitLeave({ ...form, total_days: parseFloat(form.total_days) });
            setShowModal(false);
            setForm({ leave_type: 'annual', start_date: '', end_date: '', total_days: 1, reason: '' });
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const lb = profile?.leave_balance || {};

    return (
        <ESSLayout profile={profile}>
            <div className="ess-page">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h1 className="ess-page-title" style={{ margin: 0 }}>Nghỉ phép của tôi</h1>
                    <button className="header-btn header-btn-primary" onClick={() => setShowModal(true)}>
                        <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Xin nghỉ phép
                    </button>
                </div>

                <div className="ess-leave-balance-bar">
                    <div className="ess-leave-balance-item" style={{ borderTop: '3px solid var(--color-success)' }}>
                        <div className="value" style={{ color: 'var(--color-success)' }}>{lb.annual_remaining || 0}</div>
                        <div className="label">Phép năm còn</div>
                    </div>
                    <div className="ess-leave-balance-item" style={{ borderTop: '3px solid var(--color-info)' }}>
                        <div className="value">{lb.annual_used || 0} / {lb.annual_total || 12}</div>
                        <div className="label">Phép năm đã dùng</div>
                    </div>
                    <div className="ess-leave-balance-item" style={{ borderTop: '3px solid var(--color-danger)' }}>
                        <div className="value">{lb.sick_used || 0} / {lb.sick_total || 30}</div>
                        <div className="label">Nghỉ ốm</div>
                    </div>
                    <div className="ess-leave-balance-item" style={{ borderTop: '3px solid var(--color-warning)' }}>
                        <div className="value">{lb.unpaid_used || 0}</div>
                        <div className="label">Không lương</div>
                    </div>
                </div>

                <div className="ess-table-wrap">
                    {loading ? <div className="ess-loading">Đang tải...</div> : data.length === 0 ? (
                        <div className="ess-empty"><h3>Chưa có đơn nghỉ phép</h3><p>Nhấn "Xin nghỉ phép" để tạo đơn mới.</p></div>
                    ) : (
                        <table className="ess-table">
                            <thead><tr>
                                <th>Loại phép</th><th>Từ ngày</th><th>Đến ngày</th>
                                <th className="tac">Số ngày</th><th>Lý do</th><th>Trạng thái</th><th>Ngày tạo</th>
                            </tr></thead>
                            <tbody>
                                {data.map(r => (
                                    <tr key={r.id}>
                                        <td><span className={`ess-badge ${r.leave_type === 'annual' ? 'approved' : r.leave_type === 'sick' ? 'absent' : 'pending'}`}>{r.leave_type_label || LEAVE_TYPES[r.leave_type]}</span></td>
                                        <td>{r.start_date}</td>
                                        <td>{r.end_date}</td>
                                        <td className="tac"><strong>{r.total_days}</strong></td>
                                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason || '—'}</td>
                                        <td><span className={`ess-badge ${r.status}`}>{STATUSES[r.status] || r.status}</span></td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '—'}</td>
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
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <h2 className="modal-title">Xin nghỉ phép</h2>
                            <form className="modal-form" onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label>Loại phép *</label>
                                    <select value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}>
                                        {Object.entries(LEAVE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                                <div className="modal-grid">
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
                                    <label>Số ngày *</label>
                                    <input type="number" step="0.5" min="0.5" value={form.total_days} onChange={e => setForm(f => ({ ...f, total_days: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label>Lý do</label>
                                    <textarea rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Nhập lý do xin nghỉ..." />
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="header-btn header-btn-secondary" onClick={() => setShowModal(false)}>Huỷ</button>
                                    <button type="submit" className="header-btn header-btn-primary">Gửi đơn</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </ESSLayout>
    );
}
