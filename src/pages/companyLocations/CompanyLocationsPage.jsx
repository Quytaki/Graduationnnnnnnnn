import { useState, useEffect, useCallback } from 'react';
import { companyLocationApi } from '../../services/api';
import '../contracts/ContractsPage.css';

export default function CompanyLocationsPage() {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', address: '', latitude: '', longitude: '', radius_meters: 200, is_active: true });
    const [saving, setSaving] = useState(false);

    const fetchLocations = useCallback(async () => {
        setLoading(true);
        try {
            const data = await companyLocationApi.list(false);
            setLocations(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchLocations(); }, [fetchLocations]);

    const openAdd = () => {
        setEditing(null);
        setForm({ name: '', address: '', latitude: '', longitude: '', radius_meters: 200, is_active: true });
        setShowModal(true);
    };

    const openEdit = (loc) => {
        setEditing(loc);
        setForm({ name: loc.name, address: loc.address || '', latitude: loc.latitude, longitude: loc.longitude, radius_meters: loc.radius_meters, is_active: loc.is_active });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name || !form.latitude || !form.longitude) return;
        setSaving(true);
        try {
            const payload = { ...form, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude), radius_meters: parseInt(form.radius_meters) };
            if (editing) {
                await companyLocationApi.update(editing.id, payload);
            } else {
                await companyLocationApi.create(payload);
            }
            setShowModal(false);
            fetchLocations();
        } catch (err) { alert(err.message || 'Lỗi'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Xóa trụ sở "${name}"?`)) return;
        try {
            await companyLocationApi.delete(id);
            fetchLocations();
        } catch (err) { alert(err.message); }
    };

    return (
        <div className="contracts-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Trụ sở công ty</h1>
                    <span className="badge-count">{locations.length} trụ sở</span>
                </div>
                <div className="content-header-right">
                    <button className="header-btn header-btn-primary" onClick={openAdd}>
                        <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Thêm trụ sở
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading-state">Đang tải...</div>
            ) : locations.length === 0 ? (
                <div className="empty-list-state">
                    <div className="empty-icon">📍</div>
                    <h3>Chưa có trụ sở nào</h3>
                    <p>Thêm trụ sở để nhân viên có thể check-in bằng GPS.</p>
                    <button className="header-btn header-btn-primary" onClick={openAdd}>Thêm trụ sở đầu tiên</button>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Tên trụ sở</th>
                                <th>Địa chỉ</th>
                                <th className="tac">Vĩ độ</th>
                                <th className="tac">Kinh độ</th>
                                <th className="tac">Bán kính (m)</th>
                                <th className="tac">Trạng thái</th>
                                <th className="tac" style={{ width: 120 }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {locations.map(loc => (
                                <tr key={loc.id}>
                                    <td><strong>{loc.name}</strong></td>
                                    <td>{loc.address || '—'}</td>
                                    <td className="tac">{loc.latitude}</td>
                                    <td className="tac">{loc.longitude}</td>
                                    <td className="tac">{loc.radius_meters}</td>
                                    <td className="tac">
                                        <span className={`status-badge ${loc.is_active ? 'active' : 'inactive'}`}>
                                            {loc.is_active ? 'Hoạt động' : 'Tắt'}
                                        </span>
                                    </td>
                                    <td className="tac">
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                            <button className="action-btn" title="Sửa" onClick={() => openEdit(loc)}>
                                                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                            </button>
                                            <button className="action-btn action-btn-danger" title="Xóa" onClick={() => handleDelete(loc.id, loc.name)}>
                                                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal — uses global .modal system */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">{editing ? 'Chỉnh sửa trụ sở' : 'Thêm trụ sở mới'}</h2>
                        <form onSubmit={handleSave} className="modal-form">
                            <div className="form-group">
                                <label>Tên trụ sở *</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: Trụ sở chính" required />
                            </div>
                            <div className="form-group">
                                <label>Địa chỉ</label>
                                <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="VD: 123 Nguyễn Huệ, Q.1, TP.HCM" />
                            </div>
                            <div className="modal-grid">
                                <div className="form-group">
                                    <label>Vĩ độ (Latitude) *</label>
                                    <input type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="VD: 10.7769" required />
                                </div>
                                <div className="form-group">
                                    <label>Kinh độ (Longitude) *</label>
                                    <input type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="VD: 106.7009" required />
                                </div>
                            </div>
                            <div className="modal-grid">
                                <div className="form-group">
                                    <label>Bán kính cho phép (mét)</label>
                                    <input type="number" value={form.radius_meters} onChange={e => setForm({ ...form, radius_meters: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Trạng thái</label>
                                    <select value={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}>
                                        <option value="true">Hoạt động</option>
                                        <option value="false">Tắt</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ padding: '10px 14px', background: 'var(--color-neutral-50)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                                💡 <strong>Mẹo:</strong> Mở Google Maps → chuột phải vào vị trí → chọn tọa độ → dán vào Vĩ độ / Kinh độ.
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="header-btn header-btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className="header-btn header-btn-primary" disabled={saving}>
                                    {saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Thêm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
