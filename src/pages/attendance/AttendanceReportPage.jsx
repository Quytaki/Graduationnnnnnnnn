import { useState, useEffect, useCallback } from 'react';
import { attendanceApi, employeeApi, departmentApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import './attendance.css';

export default function AttendanceReportPage() {
    const [data, setData] = useState([]);
    const [summary, setSummary] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ employee_id: '', department_id: '', date_from: '', date_to: '' });

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit, ...filters };
            Object.keys(params).forEach(k => !params[k] && delete params[k]);
            const result = await attendanceApi.report(params);
            setData(result.data);
            setSummary(result.summary);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, filters]);

    useEffect(() => { fetchReport(); }, [fetchReport]);
    useEffect(() => {
        employeeApi.list({ limit: 200 }).then(r => setEmployees(r.data)).catch(console.error);
        departmentApi.list().then(setDepartments).catch(console.error);
    }, []);

    const fmtTime = (dt) => dt ? new Date(dt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—';

    return (
        <div className="att-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Báo cáo chấm công</h1>
                    <span className="record-count">{pagination.total} bản ghi</span>
                </div>
            </div>

            <div className="att-filter-bar">
                <select value={filters.employee_id} onChange={e => setFilters(f => ({ ...f, employee_id: e.target.value }))}>
                    <option value="">Tất cả nhân viên</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
                <select value={filters.department_id} onChange={e => setFilters(f => ({ ...f, department_id: e.target.value }))}>
                    <option value="">Tất cả phòng ban</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
                <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
            </div>

            {summary && (
                <div className="att-stats">
                    <div className="att-stat-card purple"><span className="att-stat-value">{summary.total_records}</span><span className="att-stat-label">Tổng bản ghi</span></div>
                    <div className="att-stat-card green"><span className="att-stat-value">{summary.present_count}</span><span className="att-stat-label">Có mặt</span></div>
                    <div className="att-stat-card red"><span className="att-stat-value">{summary.absent_count}</span><span className="att-stat-label">Vắng mặt</span></div>
                    <div className="att-stat-card blue"><span className="att-stat-value">{summary.on_leave_count}</span><span className="att-stat-label">Nghỉ phép</span></div>
                    <div className="att-stat-card orange"><span className="att-stat-value">{summary.late_count}</span><span className="att-stat-label">Đi muộn</span></div>
                    <div className="att-stat-card teal"><span className="att-stat-value">{summary.total_worked_hours}h</span><span className="att-stat-label">Tổng giờ làm</span></div>
                </div>
            )}

            <div className="att-table-wrap">
                {loading ? (<div className="att-loading">Đang tải...</div>) : data.length === 0 ? (
                    <div className="att-empty"><h3>Không có dữ liệu</h3></div>
                ) : (
                    <table className="att-table">
                        <thead><tr>
                            <th>Nhân viên</th><th>Phòng ban</th><th>Ngày</th>
                            <th className="tac">Check In</th><th className="tac">Check Out</th>
                            <th className="tac">Giờ làm</th><th className="tac">OT</th>
                            <th className="tac">Trạng thái</th><th className="tac">Đi muộn</th>
                        </tr></thead>
                        <tbody>
                            {data.map(r => (
                                <tr key={r.id}>
                                    <td><div className="att-emp-cell"><div className="att-emp-avatar">{r.employee_name?.charAt(0)}</div><span className="att-emp-name">{r.employee_name}</span></div></td>
                                    <td>{r.department_name || '—'}</td>
                                    <td>{r.date}</td>
                                    <td className="tac">{fmtTime(r.check_in)}</td>
                                    <td className="tac">{fmtTime(r.check_out)}</td>
                                    <td className="tac">{Number(r.worked_hours).toFixed(1)}</td>
                                    <td className="tac"><span className={r.overtime_hours > 0 ? 'ot-val high' : ''}>{Number(r.overtime_hours).toFixed(1)}</span></td>
                                    <td className="tac"><span className={`att-badge ${r.status}`}>{r.status === 'present' ? 'Có mặt' : r.status === 'absent' ? 'Vắng' : r.status === 'half_day' ? 'Nửa ngày' : 'Nghỉ phép'}</span></td>
                                    <td className="tac">{r.check_in_status && <span className={`att-badge ${r.check_in_status}`}>{r.check_in_status === 'late' ? 'Muộn' : 'Đúng giờ'}</span>}</td>
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
