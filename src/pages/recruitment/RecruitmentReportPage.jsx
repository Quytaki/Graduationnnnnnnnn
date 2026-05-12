import { useState, useEffect } from 'react';
import { recruitReportApi } from '../../services/api';
import './RecruitmentStyles.css';

const STAGE_LABELS = {
    applied: 'Ứng tuyển', screening: 'Sàng lọc', interview: 'Phỏng vấn',
    offer: 'Đề nghị', hired: 'Đã tuyển', rejected: 'Từ chối',
};

export default function RecruitmentReportPage() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            try {
                const data = await recruitReportApi.pipeline();
                setReport(data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchReport();
    }, []);

    if (loading) return <div className="contracts-page"><div className="loading-state">Đang tải báo cáo...</div></div>;
    if (!report) return <div className="contracts-page"><div className="empty-list-state"><h3>Không thể tải báo cáo</h3></div></div>;

    const maxCount = Math.max(...(report.pipeline || []).map(s => s.count), 1);

    return (
        <div className="contracts-page">
            <div className="content-header">
                <div className="content-header-left">
                    <h1 className="page-title">Báo cáo tuyển dụng</h1>
                </div>
            </div>

            <div className="report-grid">
                {/* Summary Cards */}
                <div className="report-card">
                    <div className="report-card-title">
                        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                        Tổng ứng viên
                    </div>
                    <div className="stat-number">{report.total_candidates}</div>
                    <div className="stat-label">Ứng viên trong hệ thống</div>
                </div>

                <div className="report-card">
                    <div className="report-card-title">
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" /></svg>
                        Tổng ứng tuyển
                    </div>
                    <div className="stat-number">{report.total_applications}</div>
                    <div className="stat-label">Hồ sơ ứng tuyển</div>
                </div>

                <div className="report-card">
                    <div className="report-card-title">
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                        Thời gian tuyển TB
                    </div>
                    <div className="stat-number">
                        {report.avg_time_to_hire_days !== null && report.avg_time_to_hire_days !== undefined
                            ? `${report.avg_time_to_hire_days}`
                            : '—'}
                    </div>
                    <div className="stat-label">Ngày (từ ứng tuyển → tuyển)</div>
                </div>

                <div className="report-card">
                    <div className="report-card-title">
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        Đã tuyển
                    </div>
                    <div className="stat-number" style={{ color: 'var(--color-success)' }}>
                        {(report.pipeline || []).find(s => s.stage === 'hired')?.count || 0}
                    </div>
                    <div className="stat-label">Ứng viên đã tuyển thành công</div>
                </div>

                {/* Pipeline Funnel */}
                <div className="report-card" style={{ gridColumn: '1 / -1' }}>
                    <div className="report-card-title">
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>
                        Pipeline tuyển dụng
                    </div>
                    <div className="funnel">
                        {(report.pipeline || []).map(stage => (
                            <div key={stage.stage} className="funnel-stage">
                                <span className="funnel-label">{STAGE_LABELS[stage.stage] || stage.stage}</span>
                                <div className="funnel-bar-container">
                                    <div className={`funnel-bar ${stage.stage}`}
                                        style={{ width: `${Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 8 : 0)}%` }}>
                                        {stage.count > 0 && <span className="funnel-bar-text">{stage.percentage}%</span>}
                                    </div>
                                </div>
                                <span className="funnel-count">{stage.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Conversion Rates */}
                {report.conversion_rates && report.conversion_rates.length > 0 && (
                    <div className="report-card" style={{ gridColumn: '1 / -1' }}>
                        <div className="report-card-title">
                            <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" /></svg>
                            Tỷ lệ chuyển đổi
                        </div>
                        <div className="conversion-list">
                            {report.conversion_rates.map((c, i) => (
                                <div key={i} className="conversion-item">
                                    <span className="conversion-stage">{STAGE_LABELS[c.from_stage] || c.from_stage}</span>
                                    <span className="conversion-arrow">→</span>
                                    <span className="conversion-stage">{STAGE_LABELS[c.to_stage] || c.to_stage}</span>
                                    <span className="conversion-rate">{c.rate}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
