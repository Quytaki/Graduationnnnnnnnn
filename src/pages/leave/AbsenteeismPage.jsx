import { useState, useEffect, useCallback } from 'react';
import { leaveApi, departmentApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import './leave.css';

export default function AbsenteeismPage() {
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ year: new Date().getFullYear().toString(), department_id: '', search: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await leaveApi.absenteeism({ page: pagination.page, limit: pagination.limit, ...filters });
            setData(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, filters]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { departmentApi.list().then(setDepartments).catch(console.error); }, []);

    // Aggregate stats
    const avgRate = data.length > 0 ? (data.reduce((s, r) => s + r.absenteeism_rate, 0) / data.length).toFixed(1) : 0;
    const highRisk = data.filter(r => r.absenteeism_rate > 10).length;
    const totalAbsent = data.reduce((s, r) => s + r.absent_days, 0);
    const totalLeave = data.reduce((s, r) => s + r.leave_days, 0);

    const getRateClass = (rate) => {
        if (rate > 10) return 'high';
        if (rate > 5) return 'medium';
        return 'low';
    };

    return (
        <div className="leave-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Tỷ lệ vắng mặt</h1>
                    <span className="record-count">{pagination.total} nhân viên</span>
                </div>
            </div>

            <div className="leave-stats">
                <div className="leave-stat-card"><div className="leave-stat-label">Tỷ lệ TB</div><div className="leave-stat-value">{avgRate}%</div></div>
                <div className="leave-stat-card danger"><div className="leave-stat-label">Nguy cơ cao (&gt;10%)</div><div className="leave-stat-value">{highRisk}</div></div>
                <div className="leave-stat-card warning"><div className="leave-stat-label">Tổng ngày vắng</div><div className="leave-stat-value">{totalAbsent}</div></div>
                <div className="leave-stat-card info"><div className="leave-stat-label">Tổng ngày nghỉ phép</div><div className="leave-stat-value">{totalLeave}</div></div>
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
                    <div className="leave-empty"><h3>Không có dữ liệu</h3><p>Dữ liệu vắng mặt sẽ được tính từ attendance và leave records.</p></div>
                ) : (
                    <table className="leave-table">
                        <thead><tr>
                            <th>Nhân viên</th><th>Phòng ban</th>
                            <th className="tac">Ngày làm việc</th><th className="tac">Ngày vắng</th>
                            <th className="tac">Ngày nghỉ phép</th><th className="tac">Tỷ lệ vắng mặt</th>
                            <th>Biểu đồ</th>
                        </tr></thead>
                        <tbody>
                            {data.map(r => (
                                <tr key={r.employee_id}>
                                    <td><div className="leave-emp-cell"><div className="leave-emp-avatar" style={{ background: r.absenteeism_rate > 10 ? '#dc3545' : r.absenteeism_rate > 5 ? '#e49c33' : '#28a745' }}>{r.employee_name?.charAt(0)}</div><span className="leave-emp-name">{r.employee_name}</span></div></td>
                                    <td>{r.department_name || '—'}</td>
                                    <td className="tac">{r.total_working_days}</td>
                                    <td className="tac" style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{r.absent_days}</td>
                                    <td className="tac" style={{ color: 'var(--color-info)' }}>{r.leave_days}</td>
                                    <td className="tac">
                                        <span className={`absenteeism-rate ${getRateClass(r.absenteeism_rate)}`}>
                                            {r.absenteeism_rate > 10 ? '⚠️ ' : ''}{r.absenteeism_rate}%
                                        </span>
                                    </td>
                                    <td>
                                        <div className="leave-progress-wrap">
                                            <div className="leave-progress" style={{ height: 8 }}>
                                                <div className={`leave-progress-fill ${r.absenteeism_rate > 10 ? 'red' : r.absenteeism_rate > 5 ? 'orange' : 'green'}`} style={{ width: `${Math.min(r.absenteeism_rate * 2, 100)}%` }} />
                                            </div>
                                        </div>
                                    </td>
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
    );
}
