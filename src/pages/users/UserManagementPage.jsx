import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { userApi } from '../../services/api';
import './UserManagementPage.css';

export default function UserManagementPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'hr' });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchUsers = async () => {
        try {
            const data = await userApi.list();
            setUsers(data);
        } catch (err) {
            console.error('Failed to fetch users', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const openCreate = () => {
        setEditingUser(null);
        setForm({ username: '', password: '', full_name: '', role: 'hr' });
        setError('');
        setShowModal(true);
    };

    const openEdit = (u) => {
        setEditingUser(u);
        setForm({ username: u.username, password: '', full_name: u.full_name, role: u.role });
        setError('');
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            if (editingUser) {
                const payload = { full_name: form.full_name, role: form.role };
                if (form.password) payload.password = form.password;
                await userApi.update(editingUser.id, payload);
            } else {
                if (!form.password) { setError('Mật khẩu là bắt buộc'); setSaving(false); return; }
                await userApi.create(form);
            }
            setShowModal(false);
            fetchUsers();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (u) => {
        try {
            await userApi.update(u.id, { is_active: !u.is_active });
            fetchUsers();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDelete = async (u) => {
        if (!confirm(`Bạn có chắc muốn xóa tài khoản "${u.username}"?`)) return;
        try {
            await userApi.delete(u.id);
            fetchUsers();
        } catch (err) {
            alert(err.message);
        }
    };

    if (currentUser?.role !== 'admin') {
        return (
            <div className="users-page">
                <div className="users-access-denied">
                    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                    <h2>Không có quyền truy cập</h2>
                    <p>Chỉ Admin mới có thể quản lý tài khoản người dùng.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="users-page">
            <div className="users-header">
                <div className="users-header-left">
                    <h1>Quản lý tài khoản</h1>
                    <span className="users-count">{users.length} tài khoản</span>
                </div>
                <button className="users-create-btn" onClick={openCreate}>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Tạo tài khoản
                </button>
            </div>

            <div className="users-table-wrapper">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>Tên đăng nhập</th>
                            <th>Họ tên</th>
                            <th>Vai trò</th>
                            <th>Trạng thái</th>
                            <th>Ngày tạo</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="users-loading">Đang tải...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan="6" className="users-empty">Chưa có tài khoản nào</td></tr>
                        ) : (
                            users.map(u => (
                                <tr key={u.id} className={!u.is_active ? 'inactive-row' : ''}>
                                    <td>
                                        <div className="user-cell-name">
                                            <div className="user-avatar-sm" style={{ background: u.role === 'admin' ? '#6366f1' : u.role === 'hr' ? '#00A09D' : '#714B67' }}>
                                                {u.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="username-text">{u.username}</span>
                                        </div>
                                    </td>
                                    <td>{u.full_name}</td>
                                    <td>
                                        <span className={`role-badge role-${u.role}`}>
                                            {u.role === 'admin' ? 'Admin' : u.role === 'hr' ? 'HR User' : 'Employee'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-badge status-${u.is_active ? 'active' : 'inactive'}`}>
                                            {u.is_active ? 'Hoạt động' : 'Vô hiệu'}
                                        </span>
                                    </td>
                                    <td>{u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                                    <td>
                                        <div className="users-actions">
                                            <button className="action-btn edit-btn" onClick={() => openEdit(u)} title="Chỉnh sửa">
                                                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                            </button>
                                            <button
                                                className={`action-btn ${u.is_active ? 'disable-btn' : 'enable-btn'}`}
                                                onClick={() => handleToggleActive(u)}
                                                title={u.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                                disabled={u.id === currentUser.id}
                                            >
                                                {u.is_active ? (
                                                    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" /></svg>
                                                ) : (
                                                    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                )}
                                            </button>
                                            <button
                                                className="action-btn delete-btn"
                                                onClick={() => handleDelete(u)}
                                                title="Xóa"
                                                disabled={u.id === currentUser.id}
                                            >
                                                <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="users-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="users-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingUser ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản mới'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="modal-form">
                            {error && <div className="modal-error">{error}</div>}

                            <div className="modal-field">
                                <label>Tên đăng nhập</label>
                                <input
                                    type="text"
                                    value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value })}
                                    disabled={!!editingUser}
                                    required
                                    placeholder="Nhập tên đăng nhập"
                                />
                            </div>

                            <div className="modal-field">
                                <label>{editingUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}</label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    required={!editingUser}
                                    placeholder={editingUser ? 'Để trống nếu không đổi' : 'Nhập mật khẩu'}
                                />
                            </div>

                            <div className="modal-field">
                                <label>Họ tên</label>
                                <input
                                    type="text"
                                    value={form.full_name}
                                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                                    required
                                    placeholder="Nhập họ tên"
                                />
                            </div>

                            <div className="modal-field">
                                <label>Vai trò</label>
                                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                    <option value="hr">HR User</option>
                                    <option value="employee">Employee</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="modal-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className="modal-save" disabled={saving}>
                                    {saving ? 'Đang lưu...' : 'Lưu'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
