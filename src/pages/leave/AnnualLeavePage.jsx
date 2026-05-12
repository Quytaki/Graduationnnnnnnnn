import { useState, useEffect, useCallback } from 'react';
import { leaveApi, departmentApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import './leave.css';

export default function AnnualLeavePage() {
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ year: new Date().getFullYear().toString(), department_id: '', search: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit, ...filters };
            const result = await leaveApi.listAnnual(params);
            setData(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, filters]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { departmentApi.list().then(setDepartments).catch(console.error); }, []);

    const getProgressColor = (used, total) => {
        const pct = total > 0 ? (used / total) * 100 : 0;
        if (pct >= 80) return 'red';
        if (pct >= 50) return 'orange';
        return 'green';
    };

    return (
        <div className="leave-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Phép năm</h1>
                    <span className="record-count">{pagination.total} nhân viên</span>
                </div>
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
                    <div className="leave-empty"><h3>Chưa có dữ liệu phép năm</h3><p>Duyệt đơn xin phép năm hoặc tạo số dư phép mới.</p></div>
                ) : (
                    <table className="leave-table">
                        <thead><tr>
                            <th>Nhân viên</th><th>Phòng ban</th><th>Năm</th>
                            <th className="tac">Tổng phép</th><th className="tac">Đã dùng</th><th className="tac">Còn lại</th>
                            <th>Tiến độ</th>
                            <th className="tac">Nghỉ ốm</th><th className="tac">Không lương</th>
                        </tr></thead>
                        <tbody>
                            {data.map(r => {
                                const pct = r.annual_total > 0 ? (r.annual_used / r.annual_total) * 100 : 0;
                                return (
                                    <tr key={r.id}>
                                        <td><div className="leave-emp-cell"><div className="leave-emp-avatar">{r.employee_name?.charAt(0)}</div><span className="leave-emp-name">{r.employee_name}</span></div></td>
                                        <td>{r.department_name || '—'}</td>
                                        <td><span className="leave-badge annual">{r.year}</span></td>
                                        <td className="tac"><strong>{r.annual_total}</strong></td>
                                        <td className="tac" style={{ color: 'var(--color-warning)' }}>{r.annual_used}</td>
                                        <td className="tac" style={{ color: 'var(--color-success)', fontWeight: 600 }}>{r.annual_remaining}</td>
                                        <td>
                                            <div className="leave-progress-wrap">
                                                <div className="leave-progress-text">{r.annual_used}/{r.annual_total} ngày ({Math.round(pct)}%)</div>
                                                <div className="leave-progress">
                                                    <div className={`leave-progress-fill ${getProgressColor(r.annual_used, r.annual_total)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="tac">{r.sick_used}</td>
                                        <td className="tac">{r.unpaid_used}</td>
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
