import { useState } from 'react';
import { attendanceApi } from '../../services/api';
import './attendance.css';

export default function GenerateAttendancePage() {
    const [form, setForm] = useState({
        start_date: '', end_date: '',
        default_status: 'present',
        default_check_in: '08:00', default_check_out: '17:00',
    });
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState(null);

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!form.start_date || !form.end_date) { alert('Vui lòng chọn ngày'); return; }
        setGenerating(true); setResult(null);
        try {
            const res = await attendanceApi.generate(form);
            setResult(res);
        } catch (err) { setResult({ error: err.message }); }
        finally { setGenerating(false); }
    };

    return (
        <div className="att-page">
            <div className="content-header"><div className="content-header-left"><h1 className="page-title">Tạo chấm công tự động</h1></div></div>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-5)', maxWidth: 600 }}>
                Tự động tạo bản ghi cho tất cả nhân viên đang hoạt động. Cuối tuần sẽ bỏ qua. Bản ghi đã tồn tại không bị ghi đè.
            </p>
            <form className="att-gen-form" onSubmit={handleGenerate}>
                <div className="form-row">
                    <div className="form-group"><label>Ngày bắt đầu *</label><input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required /></div>
                    <div className="form-group"><label>Ngày kết thúc *</label><input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label>Check-in mặc định</label><input type="time" value={form.default_check_in} onChange={e => setForm(f => ({ ...f, default_check_in: e.target.value }))} /></div>
                    <div className="form-group"><label>Check-out mặc định</label><input type="time" value={form.default_check_out} onChange={e => setForm(f => ({ ...f, default_check_out: e.target.value }))} /></div>
                </div>
                <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
                    <label>Trạng thái mặc định</label>
                    <select value={form.default_status} onChange={e => setForm(f => ({ ...f, default_status: e.target.value }))}>
                        <option value="present">Có mặt</option><option value="absent">Vắng mặt</option>
                    </select>
                </div>
                <button type="submit" className="header-btn header-btn-primary" disabled={generating} style={{ width: '100%', justifyContent: 'center' }}>
                    {generating ? 'Đang tạo...' : '⚡ Tạo chấm công'}
                </button>
            </form>
            {result && (
                <div className="att-gen-result" style={result.error ? { background: '#fee2e2', color: '#991b1b' } : {}}>
                    {result.error ? `❌ ${result.error}` : `✅ Đã tạo ${result.created} bản ghi cho ${result.employees} nhân viên. Bỏ qua ${result.skipped} đã tồn tại.`}
                </div>
            )}
        </div>
    );
}
