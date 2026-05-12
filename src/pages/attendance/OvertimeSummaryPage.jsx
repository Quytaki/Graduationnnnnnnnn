import { useState, useEffect, useCallback } from 'react';
import { attendanceApi, departmentApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import './attendance.css';

export default function OvertimeSummaryPage() {
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ period: '', department_id: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit, ...filters };
            Object.keys(params).forEach(k => !params[k] && delete params[k]);
            const result = await attendanceApi.overtimeSummary(params);
            setData(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, filters]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { departmentApi.list().then(setDepartments).catch(console.error); }, []);

    return (
        <div className="att-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Tổng hợp tăng ca</h1>
                    <span className="record-count">{pagination.total} nhân viên</span>
                </div>
            </div>

            <div className="att-filter-bar">
                <input type="month" value={filters.period} onChange={e => setFilters(f => ({ ...f, period: e.target.value }))} style={{ maxWidth: 180 }} />
                <select value={filters.department_id} onChange={e => setFilters(f => ({ ...f, department_id: e.target.value }))}>
                    <option value="">Tất cả phòng ban</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>

            <div className="att-table-wrap">
                {loading ? (<div className="att-loading">Đang tải...</div>) : data.length === 0 ? (
                    <div className="att-empty"><h3>Chưa có dữ liệu tổng hợp</h3><p>Tạo bản ghi tăng ca trước.</p></div>
                ) : (
                    <table className="att-table">
                        <thead><tr>
                            <th>Nhân viên</th><th>Phòng ban</th><th>Kỳ</th>
                            <th className="tac">Tổng giờ OT</th>
                            <th className="tac">Đã duyệt</th>
                            <th className="tac">Chờ duyệt</th>
                            <th className="tac">Từ chối</th>
                            <th className="tac">Số lượt</th>
                        </tr></thead>
                        <tbody>
                            {data.map((r, i) => (
                                <tr key={`${r.employee_id}-${r.period}-${i}`}>
                                    <td><div className="att-emp-cell"><div className="att-emp-avatar">{r.employee_name?.charAt(0)}</div><span className="att-emp-name">{r.employee_name}</span></div></td>
                                    <td>{r.department_name || '—'}</td>
                                    <td><span className="period-badge">{r.period}</span></td>
                                    <td className="tac"><span className="ot-val high">{r.total_hours}</span></td>
                                    <td className="tac"><span className="att-badge approved">{r.approved_hours}</span></td>
                                    <td className="tac"><span className="att-badge pending">{r.pending_hours}</span></td>
                                    <td className="tac"><span className="att-badge rejected">{r.rejected_hours}</span></td>
                                    <td className="tac">{r.entry_count}</td>
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
