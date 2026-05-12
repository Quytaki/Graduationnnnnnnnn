import { useState, useEffect, useCallback, useRef } from 'react';
import { applicationApi, candidateApi, recruitRequestApi, aiScreeningApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import './RecruitmentStyles.css';

const STAGES = [
    { value: 'applied', label: 'Ứng tuyển', color: '#5c6bc0' },
    { value: 'screening', label: 'Sàng lọc', color: '#ef6c00' },
    { value: 'interview', label: 'Phỏng vấn', color: '#1565c0' },
    { value: 'offer', label: 'Đề nghị', color: '#6a1b9a' },
    { value: 'hired', label: 'Đã tuyển', color: '#2e7d32' },
    { value: 'rejected', label: 'Từ chối', color: '#c62828' },
];

const STAGE_LABELS = Object.fromEntries(STAGES.map(s => [s.value, s.label]));

export default function ApplicationsPage() {
    const [items, setItems] = useState([]);
    const [candidates, setCandidates] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('kanban'); // kanban | table
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ candidate_id: '', request_id: '', notes: '' });
    const [search, setSearch] = useState('');
    const [filterStage, setFilterStage] = useState('');
    const [filterRequest, setFilterRequest] = useState('');
    const [dragItem, setDragItem] = useState(null);
    const [dragOverStage, setDragOverStage] = useState(null);

    // AI Screening state
    const [selectedApp, setSelectedApp] = useState(null);
    const [screeningResults, setScreeningResults] = useState([]);
    const [screeningLoading, setScreeningLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 200, total: 0, total_pages: 1 });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (search) params.search = search;
            if (filterStage) params.stage = filterStage;
            if (filterRequest) params.request_id = filterRequest;
            const result = await applicationApi.list(params);
            setItems(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search, filterStage, filterRequest]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        candidateApi.list({ limit: 200 }).then(r => setCandidates(r.data)).catch(console.error);
        recruitRequestApi.list({ limit: 200 }).then(r => setRequests(r.data)).catch(console.error);
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await applicationApi.create({
                candidate_id: parseInt(form.candidate_id),
                request_id: parseInt(form.request_id),
                notes: form.notes || null,
            });
            setShowModal(false);
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleStageChange = async (appId, newStage) => {
        try {
            await applicationApi.updateStage(appId, newStage);
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleHire = async (appId) => {
        if (!window.confirm('Tuyển ứng viên này? Sẽ tạo nhân viên mới trong hệ thống.')) return;
        try {
            const result = await applicationApi.hire(appId);
            alert(result.message);
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Xóa ứng tuyển này?')) return;
        try { await applicationApi.delete(id); fetchData(); }
        catch (err) { alert(err.message); }
    };

    // Drag & Drop
    const onDragStart = (e, app) => {
        setDragItem(app);
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = (e, stage) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverStage(stage);
    };

    const onDragLeave = () => {
        setDragOverStage(null);
    };

    const onDrop = async (e, stage) => {
        e.preventDefault();
        setDragOverStage(null);
        if (dragItem && dragItem.stage !== stage) {
            await handleStageChange(dragItem.id, stage);
        }
        setDragItem(null);
    };

    // AI Screening
    const openDetail = async (app) => {
        setSelectedApp(app);
        setScreeningResults([]);
        try {
            const results = await aiScreeningApi.getResults(app.id);
            setScreeningResults(results);
        } catch (err) { console.error(err); }
    };

    const runScreening = async () => {
        if (!selectedApp) return;
        setScreeningLoading(true);
        try {
            const result = await aiScreeningApi.screen({ application_id: selectedApp.id });
            setScreeningResults(prev => [result, ...prev]);
            fetchData(); // Refresh to get updated AI score
        } catch (err) { alert(err.message); }
        finally { setScreeningLoading(false); }
    };

    const getScoreClass = (score) => {
        if (score >= 80) return 'high';
        if (score >= 50) return 'mid';
        return 'low';
    };

    const getItemsByStage = (stage) => items.filter(a => a.stage === stage);

    const parseJSON = (str) => {
        try { return JSON.parse(str); } catch { return null; }
    };

    return (
        <div className="contracts-page" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Ứng tuyển</h1>
                    <span className="record-count">{pagination.total} bản ghi</span>
                </div>
                <div className="content-header-right">
                    <div className="recruitment-view-toggle">
                        <button className={`recruitment-view-btn ${viewMode === 'kanban' ? 'active' : ''}`}
                            onClick={() => setViewMode('kanban')}>
                            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm5 0a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H8a1 1 0 01-1-1V4zm5 0a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
                            Kanban
                        </button>
                        <button className={`recruitment-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}>
                            <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                            Bảng
                        </button>
                    </div>
                    <button className="header-btn header-btn-primary" onClick={() => { setForm({ candidate_id: '', request_id: '', notes: '' }); setShowModal(true); }}>
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Thêm ứng tuyển
                    </button>
                </div>
            </div>

            {viewMode === 'table' && (
                <div className="filter-bar">
                    <input type="text" placeholder="Tìm theo tên ứng viên..." value={search}
                        onChange={e => setSearch(e.target.value)} className="filter-input" style={{ maxWidth: 280 }} />
                    <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="filter-select">
                        <option value="">Tất cả giai đoạn</option>
                        {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <select value={filterRequest} onChange={e => setFilterRequest(e.target.value)} className="filter-select">
                        <option value="">Tất cả yêu cầu</option>
                        {requests.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                    </select>
                </div>
            )}

            {loading ? (
                <div className="loading-state">Đang tải...</div>
            ) : viewMode === 'kanban' ? (
                /* ── Kanban View ──────────────────────── */
                <div className="pipeline-container">
                    {STAGES.map(stage => {
                        const stageItems = getItemsByStage(stage.value);
                        return (
                            <div key={stage.value} className="pipeline-column"
                                onDragOver={(e) => onDragOver(e, stage.value)}
                                onDragLeave={onDragLeave}
                                onDrop={(e) => onDrop(e, stage.value)}>
                                <div className="pipeline-column-header" style={{ borderTop: `3px solid ${stage.color}` }}>
                                    <span className="pipeline-column-title">{stage.label}</span>
                                    <span className="pipeline-column-count">{stageItems.length}</span>
                                </div>
                                <div className={`pipeline-column-body ${dragOverStage === stage.value ? 'drag-over' : ''}`}>
                                    {stageItems.map(app => (
                                        <div key={app.id}
                                            className={`pipeline-card ${dragItem?.id === app.id ? 'dragging' : ''}`}
                                            draggable
                                            onDragStart={(e) => onDragStart(e, app)}
                                            onClick={() => openDetail(app)}>
                                            <div className="pipeline-card-name">{app.candidate_name}</div>
                                            <div className="pipeline-card-position">{app.position_name || app.request_title || '—'}</div>
                                            <div className="pipeline-card-footer">
                                                {app.ai_score !== null && app.ai_score !== undefined ? (
                                                    <span className={`ai-score-badge ai-score-${getScoreClass(app.ai_score)}`}>
                                                        🤖 {Math.round(app.ai_score)}
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>—</span>
                                                )}
                                                <div className="pipeline-card-actions" onClick={e => e.stopPropagation()}>
                                                    {stage.value !== 'hired' && stage.value !== 'rejected' && (
                                                        <button className="action-btn hire-btn" onClick={() => handleHire(app.id)} title="Tuyển">
                                                            <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                        </button>
                                                    )}
                                                    <button className="action-btn delete-btn" onClick={() => handleDelete(app.id)} title="Xóa">
                                                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {stageItems.length === 0 && (
                                        <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                                            Kéo thả để chuyển giai đoạn
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ── Table View ──────────────────────── */
                <>
                    <div className="attendance-table-wrapper">
                        {items.length === 0 ? (
                            <div className="empty-list-state">
                                <h3>Chưa có ứng tuyển</h3>
                                <p>Tạo ứng tuyển mới.</p>
                            </div>
                        ) : (
                            <table className="attendance-table" role="grid">
                                <thead className="table-header">
                                    <tr>
                                        <th className="table-cell">Ứng viên</th>
                                        <th className="table-cell">Vị trí</th>
                                        <th className="table-cell">Phòng ban</th>
                                        <th className="table-cell">AI Score</th>
                                        <th className="table-cell">Giai đoạn</th>
                                        <th className="table-cell">Ngày ứng tuyển</th>
                                        <th className="table-cell table-cell-action">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="table-body">
                                    {items.map((a, i) => (
                                        <tr key={a.id} className={`table-row ${i % 2 === 0 ? 'table-row-even' : 'table-row-odd'}`}
                                            style={{ cursor: 'pointer' }} onClick={() => openDetail(a)}>
                                            <td className="table-cell"><strong>{a.candidate_name}</strong></td>
                                            <td className="table-cell">{a.position_name || '—'}</td>
                                            <td className="table-cell">{a.department_name || '—'}</td>
                                            <td className="table-cell">
                                                {a.ai_score !== null && a.ai_score !== undefined ? (
                                                    <span className={`ai-score-badge ai-score-${getScoreClass(a.ai_score)}`}>
                                                        🤖 {Math.round(a.ai_score)}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="table-cell">
                                                <span className={`status-badge badge-${a.stage}`}>{STAGE_LABELS[a.stage]}</span>
                                            </td>
                                            <td className="table-cell">{a.applied_at ? new Date(a.applied_at).toLocaleDateString('vi-VN') : '—'}</td>
                                            <td className="table-cell table-cell-action" onClick={e => e.stopPropagation()}>
                                                {a.stage !== 'hired' && a.stage !== 'rejected' && (
                                                    <button className="action-btn hire-btn" onClick={() => handleHire(a.id)} title="Tuyển">
                                                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                    </button>
                                                )}
                                                <button className="action-btn delete-btn" onClick={() => handleDelete(a.id)} title="Xóa">
                                                    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}

            {/* Create Application Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">Tạo ứng tuyển mới</h2>
                        <form onSubmit={handleSave} className="modal-form">
                            <div className="form-group">
                                <label>Ứng viên *</label>
                                <select value={form.candidate_id} onChange={e => setForm(f => ({ ...f, candidate_id: e.target.value }))} required>
                                    <option value="">— Chọn ứng viên —</option>
                                    {candidates.map(c => <option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ''}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Yêu cầu tuyển dụng *</label>
                                <select value={form.request_id} onChange={e => setForm(f => ({ ...f, request_id: e.target.value }))} required>
                                    <option value="">— Chọn yêu cầu —</option>
                                    {requests.filter(r => r.status === 'approved').map(r => (
                                        <option key={r.id} value={r.id}>{r.title} — {r.job_position_name || 'N/A'}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Ghi chú</label>
                                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="header-btn header-btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className="header-btn header-btn-primary">Tạo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail Side Panel with AI Screening */}
            {selectedApp && (
                <>
                    <div className="detail-panel-overlay" onClick={() => setSelectedApp(null)} />
                    <div className="detail-panel">
                        <div className="detail-panel-header">
                            <h2 className="detail-panel-title">{selectedApp.candidate_name}</h2>
                            <button className="detail-panel-close" onClick={() => setSelectedApp(null)}>
                                <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                        <div className="detail-panel-body">
                            {/* Info Section */}
                            <div className="detail-section">
                                <h3 className="detail-section-title">Thông tin ứng tuyển</h3>
                                <div className="detail-row"><span className="detail-label">Vị trí</span><span className="detail-value">{selectedApp.position_name || '—'}</span></div>
                                <div className="detail-row"><span className="detail-label">Phòng ban</span><span className="detail-value">{selectedApp.department_name || '—'}</span></div>
                                <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{selectedApp.candidate_email || '—'}</span></div>
                                <div className="detail-row"><span className="detail-label">SĐT</span><span className="detail-value">{selectedApp.candidate_phone || '—'}</span></div>
                                <div className="detail-row"><span className="detail-label">Giai đoạn</span><span className="detail-value"><span className={`status-badge badge-${selectedApp.stage}`}>{STAGE_LABELS[selectedApp.stage]}</span></span></div>
                            </div>

                            {/* Stage Quick Actions */}
                            <div className="detail-section">
                                <h3 className="detail-section-title">Chuyển giai đoạn</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                    {STAGES.filter(s => s.value !== selectedApp.stage).map(s => (
                                        <button key={s.value} className="header-btn header-btn-secondary"
                                            style={{ fontSize: 'var(--font-size-xs)' }}
                                            onClick={() => { handleStageChange(selectedApp.id, s.value); setSelectedApp(prev => ({ ...prev, stage: s.value })); }}>
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* AI Screening Panel */}
                            <div className="detail-section">
                                <div className="ai-panel">
                                    <div className="ai-panel-header">
                                        <span className="ai-panel-title">
                                            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 7H7v6h6V7z" /><path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" /></svg>
                                            AI Screening
                                        </span>
                                        <button className="header-btn header-btn-primary" onClick={runScreening}
                                            disabled={screeningLoading}
                                            style={{ fontSize: 'var(--font-size-xs)', padding: '4px 12px' }}>
                                            {screeningLoading ? <span className="ai-spinner" /> : '🔍 Chạy AI'}
                                        </button>
                                    </div>
                                    <div className="ai-panel-body">
                                        {screeningResults.length > 0 ? (
                                            (() => {
                                                const latest = screeningResults[0];
                                                const breakdown = parseJSON(latest.criteria_breakdown) || [];
                                                const mustHave = parseJSON(latest.must_have_check) || {};
                                                return (
                                                    <>
                                                        <div className="ai-score-display">
                                                            <div className={`ai-score-circle ${getScoreClass(latest.score || 0)}`}>
                                                                {Math.round(latest.score || 0)}
                                                            </div>
                                                            <div>
                                                                <div className="ai-recommendation">{latest.recommendation || '—'}</div>
                                                                <div className="ai-summary">{latest.summary || ''}</div>
                                                            </div>
                                                        </div>

                                                        {breakdown.length > 0 && (
                                                            <table className="ai-criteria-table">
                                                                <thead><tr><th>Tiêu chí</th><th>Điểm</th><th>Trọng số</th><th>Tiến độ</th></tr></thead>
                                                                <tbody>
                                                                    {breakdown.map((c, i) => (
                                                                        <tr key={i}>
                                                                            <td>{c.name}</td>
                                                                            <td><strong>{c.score}</strong></td>
                                                                            <td>{c.weight}%</td>
                                                                            <td>
                                                                                <div className="ai-criteria-bar">
                                                                                    <div className={`ai-criteria-bar-fill ${getScoreClass(c.score)}`} style={{ width: `${c.score}%` }} />
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}

                                                        {mustHave.items && mustHave.items.length > 0 && (
                                                            <div className="ai-must-have">
                                                                <div className="ai-must-have-title">
                                                                    Yêu cầu bắt buộc {mustHave.passed ? '✅' : '❌'}
                                                                </div>
                                                                {mustHave.items.map((item, i) => (
                                                                    <div key={i} className="ai-must-have-item">
                                                                        <span className={`ai-must-have-icon ${item.met ? 'passed' : 'failed'}`}>
                                                                            {item.met ? '✓' : '✗'}
                                                                        </span>
                                                                        <span>{item.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div style={{ marginTop: 'var(--space-3)', textAlign: 'center' }}>
                                                            <button className="header-btn header-btn-secondary" onClick={runScreening}
                                                                disabled={screeningLoading}
                                                                style={{ fontSize: 'var(--font-size-xs)' }}>
                                                                {screeningLoading ? <span className="ai-spinner" /> : '🔄 Chạy lại'}
                                                            </button>
                                                        </div>
                                                    </>
                                                );
                                            })()
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                                Chưa có kết quả screening. Bấm "Chạy AI" để bắt đầu.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
