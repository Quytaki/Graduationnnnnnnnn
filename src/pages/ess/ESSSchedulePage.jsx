import { useState, useEffect, useCallback } from 'react';
import { essApi } from '../../services/api';
import ESSLayout from '../../components/ESSLayout/ESSLayout';
import Pagination from '../../components/Pagination/Pagination';
import './ess.css';

const STATUS_MAP = { present: 'Có mặt', absent: 'Vắng mặt', late: 'Đi trễ' };

export default function ESSSchedulePage() {
    const [data, setData] = useState([]);
    const [summary, setSummary] = useState({ total_records: 0, present: 0, absent: 0, late: 0 });
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [month, setMonth] = useState('');

    useEffect(() => { essApi.getProfile().then(setProfile).catch(console.error); }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await essApi.getSchedule({ page: pagination.page, limit: pagination.limit, month });
            setData(result.data);
            setSummary(result.summary);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, month]);

    useEffect(() => { fetchData(); }, [fetchData]);

    return (
        <ESSLayout profile={profile}>
            <div className="ess-page">
                <h1 className="ess-page-title">Lịch làm việc</h1>

                <div className="ess-schedule-summary">
                    <div className="ess-schedule-stat">
                        <div className="value">{summary.total_records}</div>
                        <div className="label">Tổng ghi nhận</div>
                    </div>
                    <div className="ess-schedule-stat success">
                        <div className="value">{summary.present}</div>
                        <div className="label">Có mặt</div>
                    </div>
                    <div className="ess-schedule-stat danger">
                        <div className="value">{summary.absent}</div>
                        <div className="label">Vắng mặt</div>
                    </div>
                    <div className="ess-schedule-stat warning">
                        <div className="value">{summary.late}</div>
                        <div className="label">Đi trễ</div>
                    </div>
                </div>

                <div className="ess-filter-bar">
                    <input type="month" value={month} onChange={e => setMonth(e.target.value)} title="Lọc theo tháng" />
                    {month && (
                        <button className="header-btn header-btn-secondary" onClick={() => setMonth('')} style={{ padding: '7px 14px', fontSize: 13 }}>Xoá lọc</button>
                    )}
                </div>

                <div className="ess-table-wrap">
                    {loading ? <div className="ess-loading">Đang tải...</div> : data.length === 0 ? (
                        <div className="ess-empty"><h3>Chưa có dữ liệu chấm công</h3><p>Dữ liệu sẽ hiển thị khi có ghi nhận chấm công.</p></div>
                    ) : (
                        <table className="ess-table">
                            <thead><tr>
                                <th>Ngày</th><th>Giờ vào</th><th>Giờ ra</th>
                                <th className="tac">Giờ làm</th><th className="tac">Tăng ca</th><th>Trạng thái</th>
                            </tr></thead>
                            <tbody>
                                {data.map(a => (
                                    <tr key={a.id}>
                                        <td><strong>{a.date}</strong></td>
                                        <td>{a.check_in || '—'}</td>
                                        <td>{a.check_out || '—'}</td>
                                        <td className="tac">{a.worked_hours > 0 ? `${a.worked_hours}h` : '—'}</td>
                                        <td className="tac" style={{ color: a.overtime_hours > 0 ? 'var(--color-warning)' : 'inherit' }}>
                                            {a.overtime_hours > 0 ? `+${a.overtime_hours}h` : '—'}
                                        </td>
                                        <td><span className={`ess-badge ${a.status}`}>{STATUS_MAP[a.status] || a.status}</span></td>
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
            </div>
        </ESSLayout>
    );
}
