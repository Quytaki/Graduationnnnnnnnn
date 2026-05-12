import { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import './DatabaseInfoPage.css';

export default function DatabaseInfoPage() {
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminApi.getSystemInfo()
            .then(res => setInfo(res))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="db-loading">Đang tải thông tin hệ thống...</div>;
    if (!info) return <div className="db-loading">Không thể tải dữ liệu</div>;

    const s = info.stats;

    return (
        <div className="db-info-page">
            <h1>Thông tin cơ sở dữ liệu</h1>
            <div className="db-info-subtitle">Tổng quan dữ liệu trong hệ thống HRM</div>

            <div className="db-stats-grid">
                <div className="db-stat-card purple">
                    <div className="db-stat-icon">👥</div>
                    <div className="db-stat-label">Nhân viên</div>
                    <div className="db-stat-value">{s.employees?.total || 0}</div>
                    <div className="db-stat-detail">
                        <div className="db-stat-detail-row"><span>Đang làm</span><span>{s.employees?.active || 0}</span></div>
                        <div className="db-stat-detail-row"><span>Nghỉ việc</span><span>{s.employees?.archived || 0}</span></div>
                    </div>
                </div>

                <div className="db-stat-card blue">
                    <div className="db-stat-icon">🏢</div>
                    <div className="db-stat-label">Phòng ban</div>
                    <div className="db-stat-value">{s.departments || 0}</div>
                    <div className="db-stat-detail">
                        <div className="db-stat-detail-row"><span>Chức danh</span><span>{s.job_positions || 0}</span></div>
                    </div>
                </div>

                <div className="db-stat-card green">
                    <div className="db-stat-icon">📄</div>
                    <div className="db-stat-label">Hợp đồng</div>
                    <div className="db-stat-value">{s.contracts?.total || 0}</div>
                    <div className="db-stat-detail">
                        <div className="db-stat-detail-row"><span>Nháp</span><span>{s.contracts?.draft || 0}</span></div>
                        <div className="db-stat-detail-row"><span>Đang chạy</span><span>{s.contracts?.running || 0}</span></div>
                        <div className="db-stat-detail-row"><span>Hết hạn</span><span>{s.contracts?.expired || 0}</span></div>
                    </div>
                </div>

                <div className="db-stat-card orange">
                    <div className="db-stat-icon">📋</div>
                    <div className="db-stat-label">Chấm công</div>
                    <div className="db-stat-value">{s.attendance_records || 0}</div>
                    <div className="db-stat-detail">
                        <div className="db-stat-detail-row"><span>Tăng ca</span><span>{s.overtime_records || 0}</span></div>
                    </div>
                </div>

                <div className="db-stat-card pink">
                    <div className="db-stat-icon">🏖️</div>
                    <div className="db-stat-label">Đơn nghỉ phép</div>
                    <div className="db-stat-value">{s.leave_requests?.total || 0}</div>
                    <div className="db-stat-detail">
                        <div className="db-stat-detail-row"><span>Chờ duyệt</span><span>{s.leave_requests?.pending || 0}</span></div>
                        <div className="db-stat-detail-row"><span>Đã duyệt</span><span>{s.leave_requests?.approved || 0}</span></div>
                    </div>
                </div>

                <div className="db-stat-card teal">
                    <div className="db-stat-icon">💰</div>
                    <div className="db-stat-label">Bảng lương</div>
                    <div className="db-stat-value">{s.payroll_records || 0}</div>
                    <div className="db-stat-detail">
                        <div className="db-stat-detail-row"><span>Giờ làm</span><span>{s.working_hours || 0}</span></div>
                        <div className="db-stat-detail-row"><span>Phụ cấp</span><span>{s.incentive_rates || 0}</span></div>
                    </div>
                </div>

                <div className="db-stat-card purple">
                    <div className="db-stat-icon">🔑</div>
                    <div className="db-stat-label">Tài khoản</div>
                    <div className="db-stat-value">{s.users?.total || 0}</div>
                    <div className="db-stat-detail">
                        <div className="db-stat-detail-row"><span>Admin</span><span>{s.users?.admin || 0}</span></div>
                        <div className="db-stat-detail-row"><span>HR</span><span>{s.users?.hr || 0}</span></div>
                        <div className="db-stat-detail-row"><span>Employee</span><span>{s.users?.employee || 0}</span></div>
                    </div>
                </div>

                <div className="db-stat-card blue">
                    <div className="db-stat-icon">🎯</div>
                    <div className="db-stat-label">Tuyển dụng</div>
                    <div className="db-stat-value">{s.recruitment?.candidates || 0}</div>
                    <div className="db-stat-detail">
                        <div className="db-stat-detail-row"><span>Yêu cầu</span><span>{s.recruitment?.requests || 0}</span></div>
                        <div className="db-stat-detail-row"><span>Ứng tuyển</span><span>{s.recruitment?.applications || 0}</span></div>
                        <div className="db-stat-detail-row"><span>Phỏng vấn</span><span>{s.recruitment?.interviews || 0}</span></div>
                        <div className="db-stat-detail-row"><span>Đề nghị</span><span>{s.recruitment?.offers || 0}</span></div>
                    </div>
                </div>

                <div className="db-stat-card green">
                    <div className="db-stat-icon">📍</div>
                    <div className="db-stat-label">Trụ sở công ty</div>
                    <div className="db-stat-value">{s.company_locations || 0}</div>
                    <div className="db-stat-detail">
                        <div className="db-stat-detail-row"><span>Ngày lễ</span><span>{s.public_holidays || 0}</span></div>
                        <div className="db-stat-detail-row"><span>Leave Bal.</span><span>{s.leave_balances || 0}</span></div>
                    </div>
                </div>

                <div className="db-stat-card orange">
                    <div className="db-stat-icon">❌</div>
                    <div className="db-stat-label">Nghỉ việc</div>
                    <div className="db-stat-value">{s.terminations?.total || 0}</div>
                    <div className="db-stat-detail">
                        <div className="db-stat-detail-row"><span>Chờ duyệt</span><span>{s.terminations?.pending || 0}</span></div>
                        <div className="db-stat-detail-row"><span>Hoàn thành</span><span>{s.terminations?.completed || 0}</span></div>
                    </div>
                </div>
            </div>

            <div className="db-section-title">Thông tin hệ thống</div>
            <div className="db-server-info">
                <div className="db-server-item">
                    <label>Thời gian server</label>
                    <span>{info.server_time ? new Date(info.server_time).toLocaleString('vi-VN') : '—'}</span>
                </div>
                <div className="db-server-item">
                    <label>Database</label>
                    <span>SQLite / PostgreSQL</span>
                </div>
                <div className="db-server-item">
                    <label>Backend</label>
                    <span>FastAPI + Python</span>
                </div>
                <div className="db-server-item">
                    <label>Frontend</label>
                    <span>React + Vite</span>
                </div>
            </div>
        </div>
    );
}
