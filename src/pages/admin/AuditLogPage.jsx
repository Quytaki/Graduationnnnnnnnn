import { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import './AuditLogPage.css';

const typeIcons = { employee: '👤', contract: '📄', leave: '🏖️', termination: '❌', user: '🔑' };
const typeLabels = { employee: 'Nhân viên', contract: 'Hợp đồng', leave: 'Nghỉ phép', termination: 'Nghỉ việc', user: 'Tài khoản' };

export default function AuditLogPage() {
    const [data, setData] = useState([]);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchLog = async (p = 1) => {
        setLoading(true);
        try {
            const result = await adminApi.getAuditLog({ page: p, limit: 30 });
            setData(result.data || []);
            setPagination(result.pagination || {});
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchLog(page); }, [page]);

    const formatTime = (ts) => {
        if (!ts) return '—';
        const d = new Date(ts);
        return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="audit-log-page">
            <div className="audit-log-header">
                <h1>Nhật ký hệ thống</h1>
                <span className="audit-log-count">{pagination.total || 0} hoạt động</span>
            </div>

            {loading ? (
                <div className="audit-loading">Đang tải nhật ký...</div>
            ) : data.length === 0 ? (
                <div className="audit-empty">Chưa có hoạt động nào được ghi nhận</div>
            ) : (
                <>
                    <div className="audit-log-timeline">
                        {data.map((item, i) => (
                            <div key={i} className="audit-log-item">
                                <div className={`audit-icon ${item.type}`}>
                                    {typeIcons[item.type] || '📋'}
                                </div>
                                <div className="audit-content">
                                    <div className="audit-description">{item.description}</div>
                                    <div className="audit-meta">
                                        <span className={`audit-type-badge ${item.type}`}>
                                            {typeLabels[item.type] || item.type}
                                        </span>
                                        <span className="audit-time">{formatTime(item.timestamp)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {pagination.total_pages > 1 && (
                        <div className="audit-pagination">
                            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Trước</button>
                            <span>Trang {page} / {pagination.total_pages}</span>
                            <button disabled={page >= pagination.total_pages} onClick={() => setPage(page + 1)}>Sau →</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
