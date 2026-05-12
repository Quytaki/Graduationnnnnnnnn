import './EmptyState.css';

export default function EmptyState() {
    return (
        <div className="empty-state">
            <div className="empty-state-content">
                {/* Illustration */}
                <div className="empty-state-illustration">
                    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Clock/Calendar illustration */}
                        <circle cx="100" cy="70" r="50" fill="#F3F4F6" />
                        <circle cx="100" cy="70" r="40" fill="white" stroke="#E5E7EB" strokeWidth="2" />
                        <path d="M100 45V70L115 85" stroke="#714B67" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="100" cy="70" r="4" fill="#714B67" />

                        {/* People silhouettes */}
                        <circle cx="55" cy="120" r="12" fill="#E5E7EB" />
                        <rect x="43" y="135" width="24" height="20" rx="4" fill="#E5E7EB" />

                        <circle cx="100" cy="130" r="15" fill="#D1D5DB" />
                        <rect x="85" y="148" width="30" height="12" rx="4" fill="#D1D5DB" />

                        <circle cx="145" cy="120" r="12" fill="#E5E7EB" />
                        <rect x="133" y="135" width="24" height="20" rx="4" fill="#E5E7EB" />
                    </svg>
                </div>

                {/* Message */}
                <h3 className="empty-state-title">Không có dữ liệu chấm công</h3>
                <p className="empty-state-description">
                    Chưa có bản ghi chấm công nào. Dữ liệu sẽ xuất hiện khi nhân viên bắt đầu điểm danh.
                </p>

                {/* AI-enhanced UX hint */}
                <div className="empty-state-hint">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="hint-icon">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="hint-text">
                        <strong>Mẹo:</strong> Nhân viên có thể điểm danh từ trang cá nhân hoặc qua ứng dụng di động.
                    </span>
                </div>

                {/* Action Button */}
                <button className="empty-state-action">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Thêm bản ghi chấm công
                </button>

                {/* AI-enhanced UX Label */}
                <span className="ai-enhanced-label">AI-enhanced UX (Design-only)</span>
            </div>
        </div>
    );
}
