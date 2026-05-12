import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './TopNavBar.css';

const routeNames = {
    '/employees': { module: 'Nhân sự', page: 'Nhân viên' },
    '/employees/new': { module: 'Nhân sự', page: 'Thêm nhân viên' },
    '/departments': { module: 'Nhân sự', page: 'Phòng ban' },
    '/job-positions': { module: 'Nhân sự', page: 'Chức danh' },
    '/contracts': { module: 'Nhân sự', page: 'Hợp đồng' },
    '/terminations': { module: 'Nhân sự', page: 'Nghỉ việc' },
    '/working-hours': { module: 'Bảng lương', page: 'Giờ làm việc' },
    '/incentive-rates': { module: 'Bảng lương', page: 'Phụ cấp' },
    '/payroll': { module: 'Bảng lương', page: 'Tổng hợp lương' },
    '/attendances': { module: 'Chấm công', page: 'Chấm công' },
    '/attendance-reports': { module: 'Chấm công', page: 'Báo cáo chấm công' },
    '/users': { module: 'Quản trị', page: 'Quản lý tài khoản' },
};

export default function TopNavBar() {
    const { user, logout } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const location = useLocation();
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Derive breadcrumb from current route
    const getRouteInfo = () => {
        // Check exact match first
        if (routeNames[location.pathname]) return routeNames[location.pathname];
        // Check edit pattern
        if (location.pathname.match(/^\/employees\/\d+\/edit$/)) return { module: 'Nhân sự', page: 'Sửa nhân viên' };
        return { module: 'HRM', page: 'Tổng quan' };
    };

    const { module, page } = getRouteInfo();

    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const getRoleBadge = (role) => {
        if (role === 'admin') return 'Quản trị viên';
        if (role === 'hr') return 'Nhân sự';
        return 'Nhân viên';
    };

    return (
        <header className="top-navbar">
            <div className="navbar-left">
                <div className="navbar-logo">
                    <svg className="logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="32" height="32" rx="6" fill="#714B67" />
                        <path d="M8 12h16M8 16h12M8 20h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span className="logo-text">Hệ thống HRM</span>
                </div>
                <nav className="navbar-breadcrumb" aria-label="Breadcrumb">
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-item">{module}</span>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-item active">{page}</span>
                </nav>
            </div>

            <div className="navbar-right">
                <div className="navbar-search">
                    <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Tìm kiếm..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        aria-label="Global search"
                    />
                    <kbd className="search-shortcut">Ctrl+K</kbd>
                </div>

                <div className="navbar-user" ref={dropdownRef}>
                    <button
                        className="user-button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        aria-expanded={isDropdownOpen}
                        aria-haspopup="true"
                    >
                        <div className="user-avatar" style={{ background: user?.role === 'admin' ? '#714B67' : '#00A09D' }}>
                            <span className="avatar-initials">{getInitials(user?.full_name)}</span>
                        </div>
                        <div className="user-info">
                            <span className="user-name">{user?.full_name || 'Người dùng'}</span>
                            <span className="user-role-tag">{getRoleBadge(user?.role)}</span>
                        </div>
                        <svg className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>

                    {isDropdownOpen && (
                        <div className="user-dropdown" role="menu">
                            <div className="dropdown-user-info">
                                <span className="dropdown-username">{user?.username}</span>
                                <span className={`dropdown-role-badge role-${user?.role}`}>{getRoleBadge(user?.role)}</span>
                            </div>
                            <div className="dropdown-divider"></div>
                            <button className="dropdown-item" role="menuitem" onClick={() => setIsDropdownOpen(false)}>
                                <svg className="dropdown-item-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                                Hồ sơ
                            </button>
                            <button className="dropdown-item" role="menuitem" onClick={() => setIsDropdownOpen(false)}>
                                <svg className="dropdown-item-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                                Cài đặt
                            </button>
                            <div className="dropdown-divider"></div>
                            <button className="dropdown-item dropdown-item-danger" role="menuitem" onClick={logout}>
                                <svg className="dropdown-item-icon" viewBox="0 0 20 20" fill="currentColor">
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
