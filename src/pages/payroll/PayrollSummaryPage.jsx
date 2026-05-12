import { useState, useEffect, useCallback } from 'react';
import { payrollApi, employeeApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import ExportButton from '../../components/ExportButton/ExportButton';
import { exportPayrollExcel, exportPayrollPDF } from '../../utils/exportReport';
import './PayrollSummaryPage.css';

const STATUSES = [
    { value: 'draft', label: 'Nháp' },
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'paid', label: 'Đã chi' },
];

export default function PayrollSummaryPage() {
    const [records, setRecords] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [filterPeriod, setFilterPeriod] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch] = useState('');

    // Calculate form
    const [showCalcModal, setShowCalcModal] = useState(false);
    const [calcEmpId, setCalcEmpId] = useState('');
    const [calcPeriod, setCalcPeriod] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (search) params.search = search;
            if (filterPeriod) params.period = filterPeriod;
            if (filterStatus) params.status = filterStatus;
            const result = await payrollApi.list(params);
            setRecords(result.data);
            setPagination(result.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search, filterPeriod, filterStatus]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        employeeApi.list({ limit: 200 }).then(r => setEmployees(r.data)).catch(console.error);
    }, []);

    const handleCalculate = async (e) => {
        e.preventDefault();
        setCalculating(true);
        try {
            await payrollApi.calculate(calcEmpId, calcPeriod);
            setShowCalcModal(false);
            fetchData();
        } catch (err) { alert(err.message); }
        finally { setCalculating(false); }
    };

    const handleCalculateAll = async () => {
        if (!filterPeriod) { alert('Vui lòng chọn kỳ trước'); return; }
        if (!window.confirm(`Tính lương cho TẤT CẢ nhân viên đủ điều kiện trong kỳ ${filterPeriod}?`)) return;
        setCalculating(true);
        try {
            const result = await payrollApi.calculateAll(filterPeriod);
            alert(`Đã tính: ${result.calculated}, Bỏ qua: ${result.skipped}${result.errors?.length ? '\nLỗi: ' + result.errors.join(', ') : ''}`);
            fetchData();
        } catch (err) { alert(err.message); }
        finally { setCalculating(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Xóa bảng lương này?')) return;
        try { await payrollApi.delete(id); fetchData(); }
        catch (err) { alert(err.message); }
    };

    const handleConfirm = async (id, action) => {
        const msg = action === 'confirmed' ? 'Xác nhận bảng lương này?' : 'Hoàn bảng lương về trạng thái nháp?';
        if (!window.confirm(msg)) return;
        try { await payrollApi.confirm(id, action); fetchData(); }
        catch (err) { alert(err.message); }
    };

    const handleMarkPaid = async (id) => {
        if (!window.confirm('Đánh dấu đã thanh toán? Thao tác này không thể hoàn tác.')) return;
        try { await payrollApi.markPaid(id); fetchData(); }
        catch (err) { alert(err.message); }
    };

    const fmt = (n) => Number(n || 0).toLocaleString('vi-VN') + ' ₫';

    const getStatusLabel = (s) => ({ draft: 'Nháp', confirmed: 'Đã xác nhận', paid: 'Đã thanh toán' })[s] || s;

    const getStatusClass = (s) => ({
        draft: 'payroll-draft', confirmed: 'payroll-confirmed', paid: 'payroll-paid',
    })[s] || '';

    // Summary totals
    const totals = records.reduce((acc, r) => ({
        base: acc.base + (r.base_salary || 0),
        ot: acc.ot + (r.overtime_pay || 0),
        incentive: acc.incentive + (r.incentive_total || 0),
        deductions: acc.deductions + (r.deductions || 0),
        gross: acc.gross + (r.gross_salary || 0),
        net: acc.net + (r.net_salary || 0),
    }), { base: 0, ot: 0, incentive: 0, deductions: 0, gross: 0, net: 0 });

    return (
        <div className="payroll-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Tổng hợp lương</h1>
                    <span className="record-count">{pagination.total} bản ghi</span>
                </div>
                <div className="content-header-right">
                    <ExportButton
                        onExportExcel={() => exportPayrollExcel(records, filterPeriod)}
                        onExportPDF={() => exportPayrollPDF(records, filterPeriod)}
                        disabled={loading || records.length === 0}
                    />
                    <button className="header-btn header-btn-secondary" onClick={handleCalculateAll} disabled={calculating || !filterPeriod}>
                        {calculating ? 'Đang tính...' : '⚡ Tính tất cả'}
                    </button>
                    <button className="header-btn header-btn-primary" onClick={() => setShowCalcModal(true)}>
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" /></svg>
                        Tính lương
                    </button>
                </div>
            </div>

            <div className="filter-bar">
                <input type="text" placeholder="Tìm theo tên nhân viên..." value={search}
                    onChange={e => setSearch(e.target.value)} className="filter-input" style={{ maxWidth: 280 }} />
                <input type="month" value={filterPeriod} onChange={e => { setFilterPeriod(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                    className="filter-input" style={{ maxWidth: 180 }} />
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="filter-select">
                    <option value="">Tất cả trạng thái</option>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>

            {/* Summary Cards */}
            {records.length > 0 && (
                <div className="payroll-summary-cards">
                    <div className="summary-card"><span className="sc-label">Tổng lương cơ bản</span><span className="sc-value">{fmt(totals.base)}</span></div>
                    <div className="summary-card"><span className="sc-label">Tổng tăng ca</span><span className="sc-value sc-blue">{fmt(totals.ot)}</span></div>
                    <div className="summary-card"><span className="sc-label">Tổng phụ cấp</span><span className="sc-value sc-purple">{fmt(totals.incentive)}</span></div>
                    <div className="summary-card"><span className="sc-label">Tổng khấu trừ</span><span className="sc-value sc-red">{fmt(totals.deductions)}</span></div>
                    <div className="summary-card sc-highlight"><span className="sc-label">Tổng thực nhận</span><span className="sc-value sc-green">{fmt(totals.net)}</span></div>
                </div>
            )}

            <div className="attendance-table-wrapper">
                {loading ? (<div className="loading-state">Đang tải...</div>) : records.length === 0 ? (
                    <div className="empty-list-state"><h3>Chưa có bảng lương</h3><p>Nhấn nút Tính lương để tạo bảng lương cho nhân viên.</p></div>
                ) : (
                    <table className="attendance-table" role="grid">
                        <thead className="table-header">
                            <tr>
                                <th className="table-cell">Nhân viên</th>
                                <th className="table-cell">Kỳ</th>
                                <th className="table-cell tar">Lương CB</th>
                                <th className="table-cell tar">Tăng ca</th>
                                <th className="table-cell tar">Phụ cấp</th>
                                <th className="table-cell tar">Khấu trừ</th>
                                <th className="table-cell tar">Tổng</th>
                                <th className="table-cell tar net-col">Thực nhận</th>
                                <th className="table-cell">Trạng thái</th>
                                <th className="table-cell table-cell-action">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {records.map((r, i) => (
                                <tr key={r.id} className={`table-row ${i % 2 === 0 ? 'table-row-even' : 'table-row-odd'}`}>
                                    <td className="table-cell">
                                        <strong>{r.employee_name}</strong>
                                        {r.job_position_name && <div className="cell-sub">{r.job_position_name}</div>}
                                    </td>
                                    <td className="table-cell"><span className="period-badge">{r.period}</span></td>
                                    <td className="table-cell tar">{fmt(r.base_salary)}</td>
                                    <td className="table-cell tar">{fmt(r.overtime_pay)}</td>
                                    <td className="table-cell tar">{fmt(r.incentive_total)}</td>
                                    <td className="table-cell tar sc-red">{fmt(r.deductions)}</td>
                                    <td className="table-cell tar">{fmt(r.gross_salary)}</td>
                                    <td className="table-cell tar net-col"><strong>{fmt(r.net_salary)}</strong></td>
                                    <td className="table-cell">
                                        <span className={`contract-status ${getStatusClass(r.status)}`}>
                                            {getStatusLabel(r.status)}
                                        </span>
                                    </td>
                                    <td className="table-cell table-cell-action">
                                        {/* Workflow buttons */}
                                        {r.status === 'draft' && (
                                            <button className="action-btn approve-btn" onClick={() => handleConfirm(r.id, 'confirmed')} title="Xác nhận">
                                                <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                            </button>
                                        )}
                                        {r.status === 'confirmed' && (
                                            <>
                                                <button className="action-btn paid-btn" onClick={() => handleMarkPaid(r.id)} title="Đánh dấu đã thanh toán">
                                                    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" /></svg>
                                                </button>
                                                <button className="action-btn revert-btn" onClick={() => handleConfirm(r.id, 'draft')} title="Hoàn về nháp">
                                                    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                                                </button>
                                            </>
                                        )}
                                        {r.status === 'paid' && (
                                            <span className="locked-badge" title="Đã thanh toán - không thể chỉnh sửa">🔒</span>
                                        )}
                                        {r.status !== 'paid' && (
                                            <button className="action-btn delete-btn" onClick={() => handleDelete(r.id)} title="Xóa">
                                                <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {!loading && records.length > 0 && (
                <Pagination currentPage={pagination.page} totalItems={pagination.total} pageSize={pagination.limit}
                    onPageChange={p => setPagination(prev => ({ ...prev, page: p }))}
                    onPageSizeChange={s => setPagination(prev => ({ ...prev, limit: s, page: 1 }))} />
            )}

            {showCalcModal && (
                <div className="modal-overlay" onClick={() => setShowCalcModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">Tính lương</h2>
                        <form onSubmit={handleCalculate} className="modal-form">
                            <div className="form-group">
                                <label>Nhân viên *</label>
                                <select value={calcEmpId} onChange={e => setCalcEmpId(e.target.value)} required>
                                    <option value="">— Chọn —</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Kỳ *</label>
                                <input type="month" value={calcPeriod} onChange={e => setCalcPeriod(e.target.value)} required />
                            </div>
                            <div className="calc-info">
                                <p>Sẽ tự động tính theo công thức:</p>
                                <code>Lương ròng = Lương CB + Tăng ca×1.5 + Phụ cấp − 10.5% Khấu trừ</code>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="header-btn header-btn-secondary" onClick={() => setShowCalcModal(false)}>Hủy</button>
                                <button type="submit" className="header-btn header-btn-primary" disabled={calculating}>
                                    {calculating ? 'Đang tính...' : 'Tính lương'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
