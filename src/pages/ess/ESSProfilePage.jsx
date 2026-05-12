import { useState, useEffect } from 'react';
import { essApi } from '../../services/api';
import ESSLayout from '../../components/ESSLayout/ESSLayout';
import './ess.css';

export default function ESSProfilePage() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ phone: '', email: '', work_phone: '', work_email: '', work_address: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        essApi.getProfile()
            .then(data => {
                setProfile(data);
                setForm({ phone: data.phone || '', email: data.email || '', work_phone: data.work_phone || '', work_email: data.work_email || '', work_address: data.work_address || '' });
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await essApi.updateProfile(form);
            const updated = await essApi.getProfile();
            setProfile(updated);
            setEditing(false);
            alert('Cập nhật thành công!');
        } catch (err) { alert(err.message); }
        finally { setSaving(false); }
    };

    if (loading) return <ESSLayout><div className="ess-loading">Đang tải...</div></ESSLayout>;

    return (
        <ESSLayout profile={profile}>
            <div className="ess-page">
                <h1 className="ess-page-title">Hồ sơ cá nhân</h1>

                <div className="ess-profile-header">
                    <div className="ess-profile-avatar" style={{ background: profile?.avatar_color || '#714B67' }}>
                        {profile?.name?.charAt(0)}
                    </div>
                    <div className="ess-profile-info">
                        <h2>{profile?.name}</h2>
                        <p>{profile?.position_name || '—'} • {profile?.department_name || '—'}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Ngày vào làm: {profile?.hire_date || '—'}</p>
                    </div>
                    {!editing && (
                        <button className="header-btn header-btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setEditing(true)}>
                            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                            Chỉnh sửa
                        </button>
                    )}
                </div>

                <div className="ess-profile-form">
                    <h3 style={{ margin: '0 0 16px', fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)' }}>Thông tin liên hệ</h3>
                    <div className="ess-form-grid">
                        <div className="ess-form-group">
                            <label>Họ tên</label>
                            <input value={profile?.name || ''} readOnly />
                        </div>
                        <div className="ess-form-group">
                            <label>Phòng ban</label>
                            <input value={profile?.department_name || ''} readOnly />
                        </div>
                        <div className="ess-form-group">
                            <label>Chức vụ</label>
                            <input value={profile?.position_name || ''} readOnly />
                        </div>
                        <div className="ess-form-group">
                            <label>Công ty</label>
                            <input value={profile?.company || ''} readOnly />
                        </div>
                        <div className="ess-form-group">
                            <label>Email cá nhân</label>
                            <input value={form.email} readOnly={!editing} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                        </div>
                        <div className="ess-form-group">
                            <label>Điện thoại</label>
                            <input value={form.phone} readOnly={!editing} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                        </div>
                        <div className="ess-form-group">
                            <label>Email công việc</label>
                            <input value={form.work_email} readOnly={!editing} onChange={e => setForm(f => ({ ...f, work_email: e.target.value }))} />
                        </div>
                        <div className="ess-form-group">
                            <label>Điện thoại công việc</label>
                            <input value={form.work_phone} readOnly={!editing} onChange={e => setForm(f => ({ ...f, work_phone: e.target.value }))} />
                        </div>
                        <div className="ess-form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Địa chỉ làm việc</label>
                            <input value={form.work_address} readOnly={!editing} onChange={e => setForm(f => ({ ...f, work_address: e.target.value }))} />
                        </div>
                    </div>

                    {editing && (
                        <div className="ess-form-actions">
                            <button className="header-btn header-btn-secondary" onClick={() => setEditing(false)}>Huỷ</button>
                            <button className="header-btn header-btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    )}
                </div>

                {profile?.contract && (
                    <div className="ess-profile-form" style={{ marginTop: 20 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)' }}>Hợp đồng hiện tại</h3>
                        <div className="ess-form-grid">
                            <div className="ess-form-group"><label>Tên hợp đồng</label><input value={profile.contract.name || ''} readOnly /></div>
                            <div className="ess-form-group"><label>Lương cơ bản</label><input value={new Intl.NumberFormat('vi-VN').format(profile.contract.salary) + ' ₫'} readOnly /></div>
                            <div className="ess-form-group"><label>Ngày bắt đầu</label><input value={profile.contract.start_date || ''} readOnly /></div>
                            <div className="ess-form-group"><label>Ngày kết thúc</label><input value={profile.contract.end_date || '—'} readOnly /></div>
                        </div>
                    </div>
                )}
            </div>
        </ESSLayout>
    );
}
