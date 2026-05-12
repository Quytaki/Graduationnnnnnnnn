import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { employeeApi, departmentApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import ExportButton from '../../components/ExportButton/ExportButton';
import { exportEmployeesExcel, exportEmployeesPDF } from '../../utils/exportReport';
import './EmployeeListPage.css';

export default function EmployeeListPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [filterDept, setFilterDept] = useState(searchParams.get('department_id') || '');
    const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
    const [selectedIds, setSelectedIds] = useState([]);
    const [showFilters, setShowFilters] = useState(false);

    const currentPage = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('limit') || '50');

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: currentPage, limit: pageSize };
            if (search) params.search = search;
            if (filterDept) params.department_id = filterDept;
            if (filterStatus) params.status = filterStatus;
            const result = await employeeApi.list(params);
            setEmployees(result.data);
            setPagination(result.pagination);
        } catch (err) {
            console.error('Failed to fetch employees:', err);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, search, filterDept, filterStatus]);

    useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
    useEffect(() => {
        departmentApi.list().then(setDepartments).catch(console.error);
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams);
        if (search) params.set('search', search);
        else params.delete('search');
        params.set('page', '1');
        setSearchParams(params);
    };

    const handlePageChange = (page) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', String(page));
        setSearchParams(params);
    };

    const handlePageSizeChange = (size) => {
        const params = new URLSearchParams(searchParams);
        params.set('limit', String(size));
        params.set('page', '1');
        setSearchParams(params);
    };

    const handleFilterDept = (deptId) => {
        setFilterDept(deptId);
        const params = new URLSearchParams(searchParams);
        if (deptId) params.set('department_id', deptId);
        else params.delete('department_id');
        params.set('page', '1');
        setSearchParams(params);
    };

    const handleFilterStatus = (status) => {
        setFilterStatus(status);
        const params = new URLSearchParams(searchParams);
        if (status) params.set('status', status);
        else params.delete('status');
        params.set('page', '1');
        setSearchParams(params);
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Bạn có chắc muốn xóa "${name}"?`)) return;
        try {
            await employeeApi.delete(id);
            fetchEmployees();
        } catch (err) {
            alert('Lỗi khi xóa nhân viên: ' + err.message);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === employees.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(employees.map(e => e.id));
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('vi-VN');
    };

    // Export all matching records (up to 5000)
    const handleExportExcel = async () => {
        try {
            const params = { page: 1, limit: 5000 };
            if (search) params.search = search;
            if (filterDept) params.department_id = filterDept;
            if (filterStatus) params.status = filterStatus;
            const result = await employeeApi.list(params);
            exportEmployeesExcel(result.data);
        } catch (err) { alert('Lỗi xuất Excel: ' + err.message); }
    };

    const handleExportPDF = async () => {
        try {
            const params = { page: 1, limit: 5000 };
            if (search) params.search = search;
            if (filterDept) params.department_id = filterDept;
            if (filterStatus) params.status = filterStatus;
            const result = await employeeApi.list(params);
            exportEmployeesPDF(result.data);
        } catch (err) { alert('Lỗi xuất PDF: ' + err.message); }
    };

    return (
        <div className="employee-list-page">
            {/* Content Header */}
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Nhân viên</h1>
                    <span className="record-count">{pagination.total} bản ghi</span>
                </div>
                <div className="content-header-right">
                    <ExportButton
                        onExportExcel={handleExportExcel}
                        onExportPDF={handleExportPDF}
                        disabled={loading || employees.length === 0}
                    />
                    <button className="header-btn header-btn-primary" onClick={() => navigate('/employees/new')}>
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Thêm mới
                    </button>
                    <button
                        className={`header-btn header-btn-filter ${showFilters ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                        </svg>
                        Bộ lọc
                        <svg className="btn-dropdown" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <div className="view-toggle">
                        <button className="view-btn active" title="Dạng danh sách">
                            <svg viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            {showFilters && (
                <div className="filter-bar">
                    <form className="search-form" onSubmit={handleSearch}>
                        <input
                            type="text"
                            placeholder="Tìm theo tên hoặc email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="filter-input"
                        />
                        <button type="submit" className="filter-search-btn">Tìm</button>
                    </form>
                    <select value={filterDept} onChange={(e) => handleFilterDept(e.target.value)} className="filter-select">
                        <option value="">Tất cả phòng ban</option>
                        {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                    <select value={filterStatus} onChange={(e) => handleFilterStatus(e.target.value)} className="filter-select">
                        <option value="">Tất cả trạng thái</option>
                        <option value="active">Đang hoạt động</option>
                        <option value="archived">Lưu trữ</option>
                    </select>
                    {(search || filterDept || filterStatus) && (
                        <button className="filter-clear" onClick={() => {
                            setSearch(''); setFilterDept(''); setFilterStatus('');
                            setSearchParams({ page: '1' });
                        }}>Xóa bộ lọc</button>
                    )}
                </div>
            )}

            {/* Table */}
            <div className="attendance-table-wrapper">
                {loading ? (
                    <div className="loading-state">Đang tải...</div>
                ) : employees.length === 0 ? (
                    <div className="empty-list-state">
                        <svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="30" stroke="#e0e0e0" strokeWidth="2" /><path d="M22 28a4 4 0 118 0 4 4 0 01-8 0zm12 0a4 4 0 118 0 4 4 0 01-8 0zM20 40s4 6 12 6 12-6 12-6" stroke="#ccc" strokeWidth="2" strokeLinecap="round" /></svg>
                        <h3>Không tìm thấy nhân viên</h3>
                        <p>Hãy thử điều chỉnh bộ lọc hoặc tạo nhân viên mới.</p>
                        <button className="header-btn header-btn-primary" onClick={() => navigate('/employees/new')}>
                            Tạo nhân viên
                        </button>
                    </div>
                ) : (
                    <table className="attendance-table" role="grid">
                        <thead className="table-header">
                            <tr>
                                <th className="table-cell table-cell-checkbox">
                                    <input type="checkbox"
                                        checked={selectedIds.length === employees.length && employees.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="table-cell">Nhân viên</th>
                                <th className="table-cell">Chức danh</th>
                                <th className="table-cell">Vai trò</th>
                                <th className="table-cell">Phòng ban</th>
                                <th className="table-cell">Email công việc</th>
                                <th className="table-cell">Ngày vào</th>
                                <th className="table-cell">Trạng thái</th>
                                <th className="table-cell table-cell-action">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {employees.map((emp, index) => (
                                <tr
                                    key={emp.id}
                                    className={`table-row ${index % 2 === 0 ? 'table-row-even' : 'table-row-odd'} ${selectedIds.includes(emp.id) ? 'selected' : ''}`}
                                    onClick={() => navigate(`/employees/${emp.id}/edit`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td className="table-cell table-cell-checkbox" onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={selectedIds.includes(emp.id)} onChange={() => toggleSelect(emp.id)} />
                                    </td>
                                    <td className="table-cell">
                                        <div className="employee-info">
                                            <div className="employee-avatar" style={{ backgroundColor: emp.avatar_color || '#714B67' }}>
                                                {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <div className="employee-details">
                                                <span className="employee-name">{emp.name}</span>
                                                {emp.email && <span className="employee-department">{emp.email}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="table-cell">{emp.job_position_name || '—'}</td>
                                    <td className="table-cell">
                                        <span className={`role-tag role-${emp.role || 'staff'}`}>
                                            {{director:'Giám đốc',department_head:'Trưởng phòng',team_lead:'Trưởng nhóm',senior:'NV cao cấp',staff:'Nhân viên'}[emp.role||'staff']}
                                        </span>
                                    </td>
                                    <td className="table-cell">{emp.department_name || '—'}</td>
                                    <td className="table-cell">{emp.work_email || '—'}</td>
                                    <td className="table-cell">{formatDate(emp.hire_date)}</td>
                                    <td className="table-cell">
                                        <span className={`status-badge ${emp.status}`}>
                                            {emp.status === 'active' ? 'Đang hoạt động' : 'Lưu trữ'}
                                        </span>
                                    </td>
                                    <td className="table-cell table-cell-action" onClick={e => e.stopPropagation()}>
                                        <button className="action-btn edit-btn" title="Sửa" onClick={() => navigate(`/employees/${emp.id}/edit`)}>
                                            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                        </button>
                                        <button className="action-btn delete-btn" title="Xóa" onClick={() => handleDelete(emp.id, emp.name)}>
                                            <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {!loading && employees.length > 0 && (
                <Pagination
                    currentPage={pagination.page}
                    totalItems={pagination.total}
                    pageSize={pagination.limit}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                />
            )}
        </div>
    );
}
