import { useState, useEffect, useCallback } from 'react';
import { leaveApi, departmentApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import './leave.css';

const STATUSES = { draft: 'Nháp', pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', cancelled: 'Đã huỷ' };

export default function UnpaidLeavePage() {
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', department_id: '', status: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await leaveApi.listUnpaid({ page: pagination.page, limit: pagination.limit, ...filters });
            setData(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, filters]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { departmentApi.list().then(setDepartments).catch(console.error); }, []);

    const totalDays = data.reduce((sum, r) => sum + (r.total_days || 0), 0);
    const approvedDays = data.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.total_days || 0), 0);
    const pendingDays = data.filter(r => r.status === 'pending').reduce((sum, r) => sum + (r.total_days || 0), 0);

    return (
        <div className="leave-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Nghỉ không lương</h1>
                    <span className="record-count">{pagination.total} đơn</span>
                </div>
            </div>

            <div className="leave-stats">
                <div className="leave-stat-card warning"><div className="leave-stat-label">Tổng đơn</div><div className="leave-stat-value">{pagination.total}</div></div>
                <div className="leave-stat-card danger"><div className="leave-stat-label">Tổng ngày nghỉ</div><div className="leave-stat-value">{totalDays}</div></div>
                <div className="leave-stat-card success"><div className="leave-stat-label">Đã duyệt</div><div className="leave-stat-value">{approvedDays} ngày</div></div>
                <div className="leave-stat-card"><div className="leave-stat-label">Chờ duyệt</div><div className="leave-stat-value">{pendingDays} ngày</div></div>
            </div>

            <div className="leave-filter-bar">
                <input placeholder="Tìm nhân viên..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
                <select value={filters.department_id} onChange={e => setFilters(f => ({ ...f, department_id: e.target.value }))}>
                    <option value="">Tất cả phòng ban</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                    <option value="">Tất cả trạng thái</option>
                    {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>

            <div className="leave-table-wrap">
                {loading ? <div className="leave-loading">Đang tải...</div> : data.length === 0 ? (
                    <div className="leave-empty"><h3>Không có đơn nghỉ không lương</h3><p>Hiện chưa có đơn nào thuộc loại này.</p></div>
                ) : (
                    <table className="leave-table">
                        <thead><tr>
                            <th>Nhân viên</th><th>Phòng ban</th><th>Từ ngày</th><th>Đến ngày</th>
                            <th className="tac">Số ngày</th><th>Lý do</th><th>Trạng thái</th><th>Người duyệt</th>
                        </tr></thead>
                        <tbody>
                            {data.map(r => (
                                <tr key={r.id}>
                                    <td><div className="leave-emp-cell"><div className="leave-emp-avatar" style={{ background: '#e49c33' }}>{r.employee_name?.charAt(0)}</div><span className="leave-emp-name">{r.employee_name}</span></div></td>
                                    <td>{r.department_name || '—'}</td>
                                    <td>{r.start_date}</td>
                                    <td>{r.end_date}</td>
                                    <td className="tac"><strong>{r.total_days}</strong></td>
                                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason || '—'}</td>
                                    <td><span className={`leave-badge ${r.status}`}>{STATUSES[r.status] || r.status}</span></td>
                                    <td>{r.approver_name || '—'}</td>
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
