import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../pages/ess/ess.css';

const navItems = [
    {
        name: 'Trang chủ', path: '/ess', icon: (
            <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
        )
    },
    {
        name: 'Hồ sơ cá nhân', path: '/ess/profile', icon: (
            <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
        )
    },
    {
        name: 'Bảng lương', path: '/ess/salary', icon: (
            <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
        )
    },
    {
        name: 'Nghỉ phép', path: '/ess/leaves', icon: (
            <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
        )
    },
    {
        name: 'Lịch làm việc', path: '/ess/schedule', icon: (
            <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
        )
    },
];

export default function ESSLayout({ children, profile }) {
    const { user, logout } = useAuth();
    const userName = profile?.name || user?.full_name || 'Nhân viên';
    const deptName = profile?.department_name || '';
    const avatarColor = profile?.avatar_color || '#714B67';

    return (
        <div className="ess-layout">
            <aside className="ess-sidebar">
                <div className="ess-sidebar-header">
                    <div className="ess-sidebar-brand">Cổng nhân viên</div>
                    <div className="ess-user-card">
                        <div className="ess-user-avatar" style={{ background: avatarColor }}>
                            {userName.charAt(0)}
                        </div>
                        <div className="ess-user-info">
                            <span className="ess-user-name">{userName}</span>
                            <span className="ess-user-dept">{deptName}</span>
                        </div>
                    </div>
                </div>

                <nav className="ess-nav">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/ess'}
                            className={({ isActive }) => `ess-nav-item ${isActive ? 'active' : ''}`}
                        >
                            {item.icon}
                            <span>{item.name}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="ess-sidebar-footer">
                    <button className="ess-logout-btn" onClick={logout}>
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                        </svg>
                        Đăng xuất
                    </button>
                </div>
            </aside>

            <div className="ess-content">
                {children}
            </div>
        </div>
    );
}
