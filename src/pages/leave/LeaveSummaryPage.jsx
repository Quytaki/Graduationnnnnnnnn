import { useState, useEffect, useCallback } from 'react';
import { leaveApi, departmentApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import './leave.css';

export default function LeaveSummaryPage() {
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ year: new Date().getFullYear().toString(), department_id: '', search: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await leaveApi.summary({ page: pagination.page, limit: pagination.limit, ...filters });
            setData(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, filters]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { departmentApi.list().then(setDepartments).catch(console.error); }, []);

    // Compute aggregate stats
    const totalUsed = data.reduce((s, r) => s + r.total_leave_days, 0);
    const totalAnnual = data.reduce((s, r) => s + r.annual_used, 0);
    const totalSick = data.reduce((s, r) => s + r.sick_used, 0);
    const totalUnpaid = data.reduce((s, r) => s + r.unpaid_used, 0);

    return (
        <div className="leave-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Tổng hợp nghỉ phép</h1>
                    <span className="record-count">{pagination.total} nhân viên</span>
                </div>
            </div>

            <div className="leave-stats">
                <div className="leave-stat-card"><div className="leave-stat-label">Tổng ngày nghỉ</div><div className="leave-stat-value">{totalUsed}</div></div>
                <div className="leave-stat-card info"><div className="leave-stat-label">Phép năm đã dùng</div><div className="leave-stat-value">{totalAnnual}</div></div>
                <div className="leave-stat-card danger"><div className="leave-stat-label">Nghỉ ốm</div><div className="leave-stat-value">{totalSick}</div></div>
                <div className="leave-stat-card warning"><div className="leave-stat-label">Không lương</div><div className="leave-stat-value">{totalUnpaid}</div></div>
            </div>

            <div className="leave-filter-bar">
                <input placeholder="Tìm nhân viên..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
                <select value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}>
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={filters.department_id} onChange={e => setFilters(f => ({ ...f, department_id: e.target.value }))}>
                    <option value="">Tất cả phòng ban</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>

            <div className="leave-table-wrap">
                {loading ? <div className="leave-loading">Đang tải...</div> : data.length === 0 ? (
                    <div className="leave-empty"><h3>Chưa có dữ liệu</h3><p>Dữ liệu tổng hợp nghỉ phép sẽ hiển thị khi có đơn nghỉ.</p></div>
                ) : (
                    <table className="leave-table">
                        <thead><tr>
                            <th>Nhân viên</th><th>Phòng ban</th>
                            <th className="tac">Tổng phép</th><th className="tac">Phép năm</th>
                            <th className="tac">Còn lại</th><th className="tac">Nghỉ ốm</th>
                            <th className="tac">Không lương</th><th className="tac">Tổng nghỉ</th>
                            <th>Tiến độ</th>
                        </tr></thead>
                        <tbody>
                            {data.map(r => {
                                const pct = r.annual_total > 0 ? (r.annual_used / r.annual_total) * 100 : 0;
                                return (
                                    <tr key={r.employee_id}>
                                        <td><div className="leave-emp-cell"><div className="leave-emp-avatar">{r.employee_name?.charAt(0)}</div><span className="leave-emp-name">{r.employee_name}</span></div></td>
                                        <td>{r.department_name || '—'}</td>
                                        <td className="tac">{r.annual_total}</td>
                                        <td className="tac" style={{ color: 'var(--color-info)', fontWeight: 600 }}>{r.annual_used}</td>
                                        <td className="tac" style={{ color: 'var(--color-success)', fontWeight: 600 }}>{r.annual_remaining}</td>
                                        <td className="tac" style={{ color: 'var(--color-danger)' }}>{r.sick_used}</td>
                                        <td className="tac" style={{ color: 'var(--color-warning)' }}>{r.unpaid_used}</td>
                                        <td className="tac"><strong>{r.total_leave_days}</strong></td>
                                        <td>
                                            <div className="leave-progress-wrap">
                                                <div className="leave-progress">
                                                    <div className={`leave-progress-fill ${pct >= 80 ? 'red' : pct >= 50 ? 'orange' : 'green'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                                </div>
                                                <div className="leave-progress-text">{Math.round(pct)}% phép năm</div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
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
    );
}
