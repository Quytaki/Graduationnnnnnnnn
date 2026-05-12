import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { essApi } from '../../services/api';
import ESSLayout from '../../components/ESSLayout/ESSLayout';
import './ess.css';

function AttendanceWidget() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [gpsStatus, setGpsStatus] = useState('idle'); // idle | loading | success | error
    const [timer, setTimer] = useState(0);

    const fetchStatus = async () => {
        try {
            const data = await essApi.getAttendanceStatus();
            setStatus(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchStatus(); }, []);

    // Live timer: update worked_hours every 30s if checked in but not out
    useEffect(() => {
        if (status?.checked_in && !status?.checked_out && status?.check_in_time) {
            const updateTimer = () => {
                const diff = (Date.now() - new Date(status.check_in_time).getTime()) / 1000 / 3600;
                setTimer(diff);
            };
            updateTimer();
            const interval = setInterval(updateTimer, 30000);
            return () => clearInterval(interval);
        }
    }, [status]);

    const formatDuration = (hours) => {
        const h = Math.floor(hours);
        const m = Math.floor((hours - h) * 60);
        return `${h}h ${m.toString().padStart(2, '0')}m`;
    };

    const formatTime = (dt) => {
        if (!dt) return '—';
        const d = new Date(dt);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const getGPS = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Trình duyệt không hỗ trợ GPS'));
                return;
            }
            setGpsStatus('loading');
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setGpsStatus('success');
                    resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                },
                (err) => {
                    setGpsStatus('error');
                    if (err.code === 1) reject(new Error('Bạn cần cho phép truy cập vị trí để check-in'));
                    else if (err.code === 2) reject(new Error('Không thể lấy vị trí. Kiểm tra GPS trên thiết bị.'));
                    else reject(new Error('Hết thời gian lấy vị trí. Thử lại.'));
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        });
    };

    const handleCheckIn = async () => {
        setError('');
        setSuccess('');
        setActionLoading(true);
        try {
            const coords = await getGPS();
            const result = await essApi.checkIn(coords);
            setSuccess(result.message);
            fetchStatus();
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Check-in thất bại');
        } finally {
            setActionLoading(false);
            setGpsStatus('idle');
        }
    };

    const handleCheckOut = async () => {
        setError('');
        setSuccess('');
        setActionLoading(true);
        try {
            const result = await essApi.checkOut({});
            setSuccess(result.message);
            fetchStatus();
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Check-out thất bại');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="attendance-widget">
                <div className="attendance-widget-header">
                    <span className="attendance-widget-icon">📍</span>
                    <span>CHẤM CÔNG HÔM NAY</span>
                </div>
                <div className="attendance-widget-body" style={{ textAlign: 'center', padding: 20 }}>
                    Đang tải...
                </div>
            </div>
        );
    }

    const isCompleted = status?.checked_in && status?.checked_out;
    const isCheckedIn = status?.checked_in && !status?.checked_out;
    const isNotStarted = !status?.checked_in;

    return (
        <div className={`attendance-widget ${isCompleted ? 'completed' : isCheckedIn ? 'active' : ''}`}>
            <div className="attendance-widget-header">
                <span className="attendance-widget-icon">📍</span>
                <span>CHẤM CÔNG HÔM NAY</span>
                {status?.location_name && (
                    <span className="attendance-widget-location">{status.location_name}</span>
                )}
            </div>

            <div className="attendance-widget-body">
                {/* Status Row */}
                <div className="attendance-status-row">
                    <div className={`attendance-status-badge ${isCompleted ? 'completed' : isCheckedIn ? 'active' : 'pending'}`}>
                        {isCompleted ? '✅ Hoàn thành' : isCheckedIn ? '🟢 Đang làm việc' : '⏳ Chưa check-in'}
                    </div>
                    {status?.check_in_status && (
                        <div className={`attendance-cin-status ${status.check_in_status}`}>
                            {status.check_in_status === 'ontime' ? 'Đúng giờ' : 'Đi trễ'}
                        </div>
                    )}
                </div>

                {/* Time Info */}
                <div className="attendance-time-grid">
                    <div className="attendance-time-item">
                        <div className="attendance-time-label">Giờ vào</div>
                        <div className="attendance-time-value">{formatTime(status?.check_in_time)}</div>
                    </div>
                    <div className="attendance-time-item">
                        <div className="attendance-time-label">Giờ ra</div>
                        <div className="attendance-time-value">{formatTime(status?.check_out_time)}</div>
                    </div>
                    <div className="attendance-time-item">
                        <div className="attendance-time-label">Đã làm</div>
                        <div className="attendance-time-value highlight">
                            {isCheckedIn ? formatDuration(timer) : isCompleted ? formatDuration(status.worked_hours) : '—'}
                        </div>
                    </div>
                    {(isCompleted && status.overtime_hours > 0) && (
                        <div className="attendance-time-item">
                            <div className="attendance-time-label">Tăng ca</div>
                            <div className="attendance-time-value overtime">+{formatDuration(status.overtime_hours)}</div>
                        </div>
                    )}
                </div>

                {/* Messages */}
                {error && <div className="attendance-msg error">{error}</div>}
                {success && <div className="attendance-msg success">{success}</div>}

                {/* Action Button */}
                {isNotStarted && (
                    <div className="attendance-action-area">
                        <button className="attendance-btn checkin" onClick={handleCheckIn} disabled={actionLoading}>
                            {actionLoading ? (
                                gpsStatus === 'loading' ? '📡 Đang lấy vị trí...' : '⏳ Đang xử lý...'
                            ) : (
                                <>🟢 CHECK-IN</>
                            )}
                        </button>
                        <div className="attendance-hint">⚠️ Bạn phải ở tại trụ sở công ty để check-in</div>
                    </div>
                )}

                {isCheckedIn && (
                    <div className="attendance-action-area">
                        <button className="attendance-btn checkout" onClick={handleCheckOut} disabled={actionLoading}>
                            {actionLoading ? '⏳ Đang xử lý...' : '🔴 CHECKOUT'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}


export default function ESSDashboardPage() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        essApi.getProfile()
            .then(data => setProfile(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <ESSLayout><div className="ess-loading">Đang tải...</div></ESSLayout>;

    const lb = profile?.leave_balance || {};
    const contract = profile?.contract;

    return (
        <ESSLayout profile={profile}>
            <div className="ess-page">
                <h1 className="ess-page-title">Xin chào, {profile?.name || 'Nhân viên'} 👋</h1>

                {/* Attendance Widget - prominent at top */}
                <AttendanceWidget />

                <div className="ess-dashboard-grid">
                    <div className="ess-dash-card" onClick={() => navigate('/ess/profile')}>
                        <div className="ess-dash-card-icon primary">
                            <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                        </div>
                        <div className="ess-dash-card-label">Vị trí</div>
                        <div className="ess-dash-card-value">{profile?.position_name || '—'}</div>
                        <div className="ess-dash-card-sub">{profile?.department_name || '—'}</div>
                    </div>

                    <div className="ess-dash-card info" onClick={() => navigate('/ess/salary')}>
                        <div className="ess-dash-card-icon info">
                            <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                        </div>
                        <div className="ess-dash-card-label">Lương cơ bản</div>
                        <div className="ess-dash-card-value">{contract ? new Intl.NumberFormat('vi-VN').format(contract.salary) + ' ₫' : '—'}</div>
                        <div className="ess-dash-card-sub">Hợp đồng: {contract?.name || 'Chưa có'}</div>
                    </div>

                    <div className="ess-dash-card success" onClick={() => navigate('/ess/leaves')}>
                        <div className="ess-dash-card-icon success">
                            <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                        </div>
                        <div className="ess-dash-card-label">Phép năm còn lại</div>
                        <div className="ess-dash-card-value">{lb.annual_remaining || 0} / {lb.annual_total || 12}</div>
                        <div className="ess-dash-card-sub">Đã dùng: {lb.annual_used || 0} ngày</div>
                    </div>

                    <div className="ess-dash-card warning" onClick={() => navigate('/ess/schedule')}>
                        <div className="ess-dash-card-icon warning">
                            <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                        </div>
                        <div className="ess-dash-card-label">Lịch làm việc</div>
                        <div className="ess-dash-card-value">Xem lịch</div>
                        <div className="ess-dash-card-sub">Ngày vào: {profile?.hire_date || '—'}</div>
                    </div>
                </div>

                <div className="ess-table-wrap" style={{ marginTop: 16 }}>
                    <table className="ess-table">
                        <thead><tr>
                            <th>Thông tin</th><th>Giá trị</th>
                        </tr></thead>
                        <tbody>
                            <tr><td>Họ tên</td><td><strong>{profile?.name}</strong></td></tr>
                            <tr><td>Email</td><td>{profile?.email || '—'}</td></tr>
                            <tr><td>Điện thoại</td><td>{profile?.phone || '—'}</td></tr>
                            <tr><td>Phòng ban</td><td>{profile?.department_name || '—'}</td></tr>
                            <tr><td>Chức vụ</td><td>{profile?.position_name || '—'}</td></tr>
                            <tr><td>Công ty</td><td>{profile?.company || '—'}</td></tr>
                            <tr><td>Nghỉ ốm đã dùng</td><td>{lb.sick_used || 0} / {lb.sick_total || 30} ngày</td></tr>
                            <tr><td>Nghỉ không lương</td><td>{lb.unpaid_used || 0} ngày</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </ESSLayout>
    );
}
