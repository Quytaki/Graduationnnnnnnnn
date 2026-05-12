import { useState, useEffect, useCallback } from 'react';
import { leaveApi, departmentApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import './leave.css';

const LEAVE_TYPES = { annual: 'Phép năm', unpaid: 'Không lương', sick: 'Ốm đau', maternity: 'Thai sản', other: 'Khác' };
const STATUSES = { draft: 'Nháp', pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', cancelled: 'Đã huỷ' };

export default function LeaveRequestLinePage() {
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', department_id: '', leave_type: '', date_from: '', date_to: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await leaveApi.list({ page: pagination.page, limit: pagination.limit, status: 'approved', ...filters });
            setData(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, filters]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { departmentApi.list().then(setDepartments).catch(console.error); }, []);

    // Group by month for timeline view
    const grouped = {};
    data.forEach(r => {
        const month = r.start_date?.slice(0, 7) || 'Unknown';
        if (!grouped[month]) grouped[month] = [];
        grouped[month].push(r);
    });

    return (
        <div className="leave-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Chi tiết nghỉ phép</h1>
                    <span className="record-count">{pagination.total} dòng</span>
                </div>
            </div>

            <div className="leave-filter-bar">
                <input placeholder="Tìm nhân viên..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
                <select value={filters.department_id} onChange={e => setFilters(f => ({ ...f, department_id: e.target.value }))}>
                    <option value="">Tất cả phòng ban</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select value={filters.leave_type} onChange={e => setFilters(f => ({ ...f, leave_type: e.target.value }))}>
                    <option value="">Tất cả loại</option>
                    {Object.entries(LEAVE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} title="Từ ngày" />
                <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} title="Đến ngày" />
            </div>

            <div className="leave-table-wrap">
                {loading ? <div className="leave-loading">Đang tải...</div> : data.length === 0 ? (
                    <div className="leave-empty"><h3>Chưa có dữ liệu</h3><p>Các đơn nghỉ đã duyệt sẽ hiển thị ở đây.</p></div>
                ) : (
                    <table className="leave-table">
                        <thead><tr>
                            <th>Tháng</th><th>Nhân viên</th><th>Phòng ban</th><th>Loại phép</th>
                            <th>Từ ngày</th><th>Đến ngày</th><th className="tac">Số ngày</th><th>Trạng thái</th><th>Lý do</th>
                        </tr></thead>
                        <tbody>
                            {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([month, items]) => (
                                items.map((r, idx) => (
                                    <tr key={r.id}>
                                        {idx === 0 && (
                                            <td rowSpan={items.length} style={{ fontWeight: 600, color: 'var(--color-primary)', verticalAlign: 'top', borderRight: '2px solid var(--color-primary-bg)' }}>
                                                {month}
                                            </td>
                                        )}
                                        <td><div className="leave-emp-cell"><div className="leave-emp-avatar">{r.employee_name?.charAt(0)}</div><span className="leave-emp-name">{r.employee_name}</span></div></td>
                                        <td>{r.department_name || '—'}</td>
                                        <td><span className={`leave-badge ${r.leave_type}`}>{LEAVE_TYPES[r.leave_type] || r.leave_type}</span></td>
                                        <td>{r.start_date}</td>
                                        <td>{r.end_date}</td>
                                        <td className="tac"><strong>{r.total_days}</strong></td>
                                        <td><span className={`leave-badge ${r.status}`}>{STATUSES[r.status] || r.status}</span></td>
                                        <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason || '—'}</td>
                                    </tr>
                                ))
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
