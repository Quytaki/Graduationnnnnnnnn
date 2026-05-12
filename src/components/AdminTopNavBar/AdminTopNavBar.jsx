import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './AdminTopNavBar.css';

const routeNames = {
    '/employees': { module: 'Nhân sự', page: 'Nhân viên' },
    '/employees/new': { module: 'Nhân sự', page: 'Thêm nhân viên' },
    '/departments': { module: 'Nhân sự', page: 'Phòng ban' },
    '/job-positions': { module: 'Nhân sự', page: 'Chức danh' },
    '/contracts': { module: 'Nhân sự', page: 'Hợp đồng' },
    '/terminations': { module: 'Nhân sự', page: 'Nghỉ việc' },
    '/org-chart': { module: 'Nhân sự', page: 'Sơ đồ tổ chức' },
    '/company-locations': { module: 'Nhân sự', page: 'Trụ sở' },
    '/working-hours': { module: 'Bảng lương', page: 'Giờ làm việc' },
    '/incentive-rates': { module: 'Bảng lương', page: 'Phụ cấp' },
    '/payroll': { module: 'Bảng lương', page: 'Tổng hợp lương' },
    '/attendances': { module: 'Chấm công', page: 'Chấm công' },
    '/attendance-import': { module: 'Chấm công', page: 'Import chấm công' },
    '/attendance-reports': { module: 'Chấm công', page: 'Báo cáo chấm công' },
    '/attendance-generate': { module: 'Chấm công', page: 'Tạo tự động' },
    '/overtime': { module: 'Chấm công', page: 'Tăng ca' },
    '/overtime-summary': { module: 'Chấm công', page: 'Tổng hợp tăng ca' },
    '/leave-requests': { module: 'Nghỉ phép', page: 'Đơn xin nghỉ' },
    '/annual-leave': { module: 'Nghỉ phép', page: 'Phép năm' },
    '/public-holidays': { module: 'Nghỉ phép', page: 'Ngày lễ' },
    '/unpaid-leave': { module: 'Nghỉ phép', page: 'Không lương' },
    '/leave-request-lines': { module: 'Nghỉ phép', page: 'Chi tiết phép' },
    '/leave-summary': { module: 'Nghỉ phép', page: 'Tổng hợp phép' },
    '/absenteeism': { module: 'Nghỉ phép', page: 'Tỷ lệ vắng mặt' },
    '/recruitment/candidates': { module: 'Tuyển dụng', page: 'Ứng viên' },
    '/recruitment/requests': { module: 'Tuyển dụng', page: 'Yêu cầu tuyển dụng' },
    '/recruitment/applications': { module: 'Tuyển dụng', page: 'Ứng tuyển' },
    '/recruitment/interviews': { module: 'Tuyển dụng', page: 'Phỏng vấn' },
    '/recruitment/offers': { module: 'Tuyển dụng', page: 'Đề nghị' },
    '/recruitment/reports': { module: 'Tuyển dụng', page: 'Báo cáo' },
    '/users': { module: 'Quản trị', page: 'Quản lý tài khoản' },
    '/admin/audit-log': { module: 'Quản trị', page: 'Nhật ký hệ thống' },
    '/admin/settings': { module: 'Quản trị', page: 'Cấu hình hệ thống' },
    '/admin/database': { module: 'Quản trị', page: 'Thông tin CSDL' },
};

export default function AdminTopNavBar() {
    const { user, logout } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const location = useLocation();
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getRouteInfo = () => {
        if (routeNames[location.pathname]) return routeNames[location.pathname];
        if (location.pathname.match(/^\/employees\/\d+\/edit$/)) return { module: 'Nhân sự', page: 'Sửa nhân viên' };
        return { module: 'Admin', page: 'Bảng điều khiển' };
    };

    const { module, page } = getRouteInfo();

    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    return (
        <header className="admin-navbar">
            <div className="admin-navbar-left">
                <div className="admin-navbar-logo">
                    <svg className="admin-logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="32" height="32" rx="6" fill="url(#adminGrad)" />
                        <path d="M8 12h16M8 16h12M8 20h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        <defs>
                            <linearGradient id="adminGrad" x1="0" y1="0" x2="32" y2="32">
                                <stop stopColor="#6366f1" />
                                <stop offset="1" stopColor="#4f46e5" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <span className="admin-logo-text">Admin Panel</span>
                    <span className="admin-logo-badge">Super Admin</span>
                </div>
                <nav className="admin-navbar-breadcrumb" aria-label="Breadcrumb">
                    <span className="admin-breadcrumb-separator">/</span>
                    <span className="admin-breadcrumb-item">{module}</span>
                    <span className="admin-breadcrumb-separator">/</span>
                    <span className="admin-breadcrumb-item active">{page}</span>
                </nav>
            </div>

            <div className="admin-navbar-right">
                <div className="admin-navbar-search">
                    <svg className="admin-search-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Tìm kiếm..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        aria-label="Admin search"
                    />
                    <kbd className="admin-search-shortcut">Ctrl+K</kbd>
                </div>

                <div className="admin-navbar-user" ref={dropdownRef}>
                    <button
                        className="admin-user-button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        aria-expanded={isDropdownOpen}
                    >
                        <div className="admin-user-avatar">
                            <span>{getInitials(user?.full_name)}</span>
                        </div>
                        <div className="admin-user-info">
                            <span className="admin-user-name">{user?.full_name || 'Admin'}</span>
                            <span className="admin-user-role-tag">Super Admin</span>
                        </div>
                        <svg className={`admin-dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>

                    {isDropdownOpen && (
                        <div className="admin-user-dropdown" role="menu">
                            <div className="admin-dropdown-user-info">
                                <span className="admin-dropdown-username">{user?.username}</span>
                                <span className="admin-dropdown-role-badge role-admin">Super Admin</span>
                            </div>
                            <div className="admin-dropdown-divider"></div>
                            <button className="admin-dropdown-item" role="menuitem" onClick={() => setIsDropdownOpen(false)}>
                                <svg className="admin-dropdown-item-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                                Hồ sơ
                            </button>
                            <button className="admin-dropdown-item" role="menuitem" onClick={() => setIsDropdownOpen(false)}>
                                <svg className="admin-dropdown-item-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                                Cài đặt
                            </button>
                            <div className="admin-dropdown-divider"></div>
                            <button className="admin-dropdown-item admin-dropdown-item-danger" role="menuitem" onClick={logout}>
                                <svg className="admin-dropdown-item-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                                </svg>
                                Đăng xuất
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
