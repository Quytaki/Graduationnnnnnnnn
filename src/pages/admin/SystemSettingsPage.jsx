import { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import './SystemSettingsPage.css';

export default function SystemSettingsPage() {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        adminApi.getSettings()
            .then(res => setSettings(res.settings || {}))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await adminApi.updateSettings(settings);
            setMessage({ type: 'success', text: 'Đã lưu cấu hình thành công!' });
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Lưu thất bại' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="settings-loading">Đang tải cấu hình...</div>;

    return (
        <div className="settings-page">
            <h1>Cấu hình hệ thống</h1>

            {message.text && <div className={`settings-msg ${message.type}`}>{message.text}</div>}

            <div className="settings-card">
                <h3 className="settings-card-title">
                    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4z" clipRule="evenodd" /></svg>
                    Thông tin công ty
                </h3>
                <div className="settings-grid">
                    <div className="settings-field">
                        <label>Tên công ty</label>
                        <input value={settings.company_name || ''} onChange={e => handleChange('company_name', e.target.value)} />
                    </div>
                    <div className="settings-field">
                        <label>Múi giờ</label>
                        <select value={settings.timezone || ''} onChange={e => handleChange('timezone', e.target.value)}>
                            <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                            <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                            <option value="UTC">UTC (GMT+0)</option>
                        </select>
                    </div>
                    <div className="settings-field">
                        <label>Tiền tệ</label>
                        <select value={settings.currency || ''} onChange={e => handleChange('currency', e.target.value)}>
                            <option value="VND">VND - Việt Nam Đồng</option>
                            <option value="USD">USD - US Dollar</option>
                        </select>
                    </div>
                    <div className="settings-field">
                        <label>Định dạng ngày</label>
                        <select value={settings.date_format || ''} onChange={e => handleChange('date_format', e.target.value)}>
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <h3 className="settings-card-title">
                    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                    Quy tắc chấm công
                </h3>
                <div className="settings-grid">
                    <div className="settings-field">
                        <label>Giờ vào chuẩn</label>
                        <input type="time" value={settings.work_start_time || '08:00'} onChange={e => handleChange('work_start_time', e.target.value)} />
                    </div>
                    <div className="settings-field">
                        <label>Giờ ra chuẩn</label>
                        <input type="time" value={settings.work_end_time || '17:00'} onChange={e => handleChange('work_end_time', e.target.value)} />
                    </div>
                    <div className="settings-field">
                        <label>Ngưỡng đi trễ (phút)</label>
                        <input type="number" value={settings.late_threshold_minutes || 15} onChange={e => handleChange('late_threshold_minutes', parseInt(e.target.value))} />
                    </div>
                    <div className="settings-field">
                        <label>Giờ làm chuẩn / ngày</label>
                        <input type="number" value={settings.standard_work_hours || 8} onChange={e => handleChange('standard_work_hours', parseInt(e.target.value))} />
                    </div>
                    <div className="settings-field">
                        <label>Ngày làm chuẩn / tháng</label>
                        <input type="number" value={settings.standard_work_days || 22} onChange={e => handleChange('standard_work_days', parseInt(e.target.value))} />
                    </div>
                    <div className="settings-field">
                        <label>Bán kính GPS mặc định (m)</label>
                        <input type="number" value={settings.gps_radius_default || 200} onChange={e => handleChange('gps_radius_default', parseInt(e.target.value))} />
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <h3 className="settings-card-title">
                    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0z" clipRule="evenodd" /></svg>
                    Tùy chọn khác
                </h3>
                <div className="settings-grid">
                    <div className="settings-field">
                        <label>Cho phép nhân viên sửa hồ sơ</label>
                        <div className="settings-toggle">
                            <button
                                className={`settings-toggle-switch ${settings.allow_employee_profile_edit ? 'active' : ''}`}
                                onClick={() => handleChange('allow_employee_profile_edit', !settings.allow_employee_profile_edit)}
                            />
                            <span className="settings-toggle-label">{settings.allow_employee_profile_edit ? 'Bật' : 'Tắt'}</span>
                        </div>
                    </div>
                    <div className="settings-field">
                        <label>Tự động check-out</label>
                        <div className="settings-toggle">
                            <button
                                className={`settings-toggle-switch ${settings.auto_checkout_enabled ? 'active' : ''}`}
                                onClick={() => handleChange('auto_checkout_enabled', !settings.auto_checkout_enabled)}
                            />
                            <span className="settings-toggle-label">{settings.auto_checkout_enabled ? 'Bật' : 'Tắt'}</span>
                        </div>
                    </div>
                    {settings.auto_checkout_enabled && (
                        <div className="settings-field">
                            <label>Giờ tự động check-out</label>
                            <input type="time" value={settings.auto_checkout_time || '23:59'} onChange={e => handleChange('auto_checkout_time', e.target.value)} />
                        </div>
                    )}
                </div>
            </div>

            <div className="settings-actions">
                <button className="settings-save-btn" onClick={handleSave} disabled={saving}>
                    {saving ? 'Đang lưu...' : '💾 Lưu cấu hình'}
                </button>
            </div>
        </div>
    );
}
