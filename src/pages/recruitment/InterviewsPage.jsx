import { useState, useEffect, useCallback } from 'react';
import { interviewApi, applicationApi, employeeApi, recruitEmailApi } from '../../services/api';
import { buildInterviewInvite } from './emailTemplates';
import Pagination from '../../components/Pagination/Pagination';
import './RecruitmentStyles.css';

const RESULT_LABELS = { pending: 'Chờ kết quả', passed: 'Đạt', failed: 'Không đạt' };
const TYPE_LABELS = { online: 'Online', offline: 'Tại văn phòng' };

const emptyForm = {
    application_id: '', interviewer_id: '', scheduled_at: '',
    duration_minutes: 60, interview_type: 'offline', location: '', notes: '',
};

export default function InterviewsPage() {
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [applications, setApplications] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [search, setSearch] = useState('');
    const [filterResult, setFilterResult] = useState('');
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailTarget, setEmailTarget] = useState(null);
    const [emailForm, setEmailForm] = useState({ subject: '', content: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (search) params.search = search;
            if (filterResult) params.result = filterResult;
            const result = await interviewApi.list(params);
            setItems(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search, filterResult]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        applicationApi.list({ limit: 200 }).then(r => setApplications(r.data)).catch(console.error);
        employeeApi.list({ limit: 200 }).then(r => setEmployees(r.data)).catch(console.error);
    }, []);

    const openModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setForm({
                application_id: item.application_id,
                interviewer_id: item.interviewer_id || '',
                scheduled_at: item.scheduled_at ? item.scheduled_at.slice(0, 16) : '',
                duration_minutes: item.duration_minutes || 60,
                interview_type: item.interview_type || 'offline',
                location: item.location || '',
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
                application_id: parseInt(form.application_id),
                interviewer_id: form.interviewer_id ? parseInt(form.interviewer_id) : null,
                duration_minutes: parseInt(form.duration_minutes) || 60,
                scheduled_at: form.scheduled_at,
            };
            if (editingItem) await interviewApi.update(editingItem.id, data);
            else await interviewApi.create(data);
            setShowModal(false);
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleResult = async (id, result) => {
        try {
            await interviewApi.update(id, { result });
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Xóa lịch phỏng vấn này?')) return;
        try { await interviewApi.delete(id); fetchData(); }
        catch (err) { alert(err.message); }
    };

    const openEmailModal = (interview) => {
        const app = applications.find(a => a.id === interview.application_id);
        const scheduled = interview.scheduled_at ? new Date(interview.scheduled_at).toLocaleString('vi-VN') : '';
        const subject = `Thư mời phỏng vấn - ${interview.position_name || 'Vị trí tuyển dụng'}`;
        const content = `Kính gửi ${interview.candidate_name},\n\nChúng tôi mời bạn tham gia buổi phỏng vấn:\n\n📅 Thời gian: ${scheduled}\n📍 ${interview.interview_type === 'online' ? 'Hình thức: Online' : `Địa điểm: ${interview.location || 'Tại văn phòng'}`}\n⏱ Thời lượng: ${interview.duration_minutes || 60} phút\n\nVui lòng xác nhận bằng cách phản hồi email này.\n\nTrân trọng,\nPhòng Nhân sự`;

        setEmailTarget({ interview, candidateId: app?.candidate_id, applicationId: interview.application_id });
        setEmailForm({ subject, content });
        setShowEmailModal(true);
    };

    const handleSendEmail = async () => {
        if (!emailTarget) return;
        try {
            await recruitEmailApi.send({
                candidate_id: emailTarget.candidateId,
                application_id: emailTarget.applicationId,
                email_type: 'interview_invite',
                subject: emailForm.subject,
                content: emailForm.content,
            });
            alert('Email đã được gửi!');
            setShowEmailModal(false);
        } catch (err) { alert(err.message); }
    };

    const formatDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

    // Group by date
    const groupedByDate = items.reduce((groups, item) => {
        const date = item.scheduled_at ? item.scheduled_at.split('T')[0] : 'unknown';
        if (!groups[date]) groups[date] = [];
        groups[date].push(item);
        return groups;
    }, {});

    return (
        <div className="contracts-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Phỏng vấn</h1>
                    <span className="record-count">{pagination.total} bản ghi</span>
                </div>
                <div className="content-header-right">
                    <button className="header-btn header-btn-primary" onClick={() => openModal()}>
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Tạo lịch phỏng vấn
                    </button>
                </div>
            </div>

            <div className="filter-bar">
                <input type="text" placeholder="Tìm theo tên ứng viên..." value={search}
                    onChange={e => setSearch(e.target.value)} className="filter-input" style={{ maxWidth: 280 }} />
                <select value={filterResult} onChange={e => setFilterResult(e.target.value)} className="filter-select">
                    <option value="">Tất cả kết quả</option>
                    <option value="pending">Chờ kết quả</option>
                    <option value="passed">Đạt</option>
                    <option value="failed">Không đạt</option>
                </select>
            </div>

            <div className="attendance-table-wrapper">
                {loading ? (
                    <div className="loading-state">Đang tải...</div>
                ) : items.length === 0 ? (
                    <div className="empty-list-state">
                        <h3>Chưa có lịch phỏng vấn</h3>
                        <p>Tạo lịch phỏng vấn mới.</p>
                    </div>
                ) : (
                    Object.entries(groupedByDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, interviews]) => (
                        <div key={date} style={{ marginBottom: 'var(--space-4)' }}>
                            <div style={{
                                padding: 'var(--space-2) var(--space-6)',
                                background: 'var(--color-neutral-50)',
                                borderBottom: '1px solid var(--border-color-light)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 'var(--font-weight-semibold)',
                                color: 'var(--text-secondary)',
                            }}>
                                📅 {date === 'unknown' ? 'Không xác định' : formatDate(date)}
                            </div>
                            <table className="attendance-table" role="grid">
                                <thead className="table-header">
                                    <tr>
                                        <th className="table-cell">Ứng viên</th>
                                        <th className="table-cell">Vị trí</th>
                                        <th className="table-cell">Thời gian</th>
                                        <th className="table-cell">Người PV</th>
                                        <th className="table-cell">Hình thức</th>
                                        <th className="table-cell">Kết quả</th>
                                        <th className="table-cell table-cell-action">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="table-body">
                                    {interviews.map((iv, i) => (
                                        <tr key={iv.id} className={`table-row ${i % 2 === 0 ? 'table-row-even' : 'table-row-odd'}`}>
                                            <td className="table-cell"><strong>{iv.candidate_name || '—'}</strong></td>
                                            <td className="table-cell">{iv.position_name || '—'}</td>
                                            <td className="table-cell">{formatDateTime(iv.scheduled_at)}</td>
                                            <td className="table-cell">{iv.interviewer_name || '—'}</td>
                                            <td className="table-cell">
                                                <span className={`status-badge badge-${iv.interview_type}`}>{TYPE_LABELS[iv.interview_type] || iv.interview_type}</span>
                                            </td>
                                            <td className="table-cell">
                                                <span className={`status-badge badge-${iv.result === 'passed' ? 'hired' : iv.result === 'failed' ? 'rejected' : 'pending'}`}>
                                                    {RESULT_LABELS[iv.result] || iv.result}
                                                </span>
                                            </td>
                                            <td className="table-cell table-cell-action" style={{ width: 140 }}>
                                                {iv.result === 'pending' && (
                                                    <>
                                                        <button className="action-btn approve-btn" onClick={() => handleResult(iv.id, 'passed')} title="Đạt">
                                                            <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                        </button>
                                                        <button className="action-btn delete-btn" onClick={() => handleResult(iv.id, 'failed')} title="Không đạt">
                                                            <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                        </button>
                                                    </>
                                                )}
                                                <button className="action-btn email-btn" onClick={() => openEmailModal(iv)} title="Gửi email mời">
                                                    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                                                </button>
                                                <button className="action-btn edit-btn" onClick={() => openModal(iv)} title="Sửa">
                                                    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                                </button>
                                                <button className="action-btn delete-btn" onClick={() => handleDelete(iv.id)} title="Xóa">
                                                    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))
                )}
            </div>

            {!loading && items.length > 0 && (
                <Pagination currentPage={pagination.page} totalItems={pagination.total} pageSize={pagination.limit}
                    onPageChange={p => setPagination(prev => ({ ...prev, page: p }))}
                    onPageSizeChange={s => setPagination(prev => ({ ...prev, limit: s, page: 1 }))} />
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">{editingItem ? 'Sửa lịch phỏng vấn' : 'Tạo lịch phỏng vấn'}</h2>
                        <form onSubmit={handleSave} className="modal-form">
                            <div className="modal-grid">
                                <div className="form-group">
                                    <label>Ứng tuyển *</label>
                                    <select value={form.application_id} onChange={e => setForm(f => ({ ...f, application_id: e.target.value }))} required disabled={!!editingItem}>
                                        <option value="">— Chọn —</option>
                                        {applications.map(a => <option key={a.id} value={a.id}>{a.candidate_name} — {a.position_name || a.request_title}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Người phỏng vấn</label>
                                    <select value={form.interviewer_id} onChange={e => setForm(f => ({ ...f, interviewer_id: e.target.value }))}>
                                        <option value="">— Chọn —</option>
                                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Ngày giờ *</label>
                                    <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label>Thời lượng (phút)</label>
                                    <input type="number" min="15" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Hình thức</label>
                                    <select value={form.interview_type} onChange={e => setForm(f => ({ ...f, interview_type: e.target.value }))}>
                                        <option value="offline">Tại văn phòng</option>
                                        <option value="online">Online</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Địa điểm / Link</label>
                                    <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder={form.interview_type === 'online' ? 'Link meeting...' : 'Phòng họp...'} />
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

            {/* Email Modal */}
            {showEmailModal && (
                <div className="modal-overlay" onClick={() => setShowEmailModal(false)}>
                    <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">Gửi email mời phỏng vấn</h2>
                        <div className="modal-form">
                            <div className="form-group">
                                <label>Tiêu đề</label>
                                <input value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label>Nội dung</label>
                                <textarea value={emailForm.content} onChange={e => setEmailForm(f => ({ ...f, content: e.target.value }))} rows={10} />
                            </div>
                            <div className="modal-actions">
                                <button className="header-btn header-btn-secondary" onClick={() => setShowEmailModal(false)}>Hủy</button>
                                <button className="header-btn header-btn-primary" onClick={handleSendEmail}>
                                    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                                    Gửi email
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
