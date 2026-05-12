import ActionButton from './ActionButton';
import './AttendanceTable.css';

export default function AttendanceTable({ data, onAction }) {
    const formatDateTime = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const columns = [
        { key: 'company', label: 'Công ty', sortable: true },
        { key: 'employee', label: 'Nhân viên', sortable: true },
        { key: 'checkIn', label: 'Vào ca', sortable: true },
        { key: 'checkOut', label: 'Ra ca', sortable: true },
        { key: 'action', label: 'Thao tác', sortable: false }
    ];

    return (
        <div className="attendance-table-wrapper">
            <table className="attendance-table" role="grid">
                <thead className="table-header">
                    <tr>
                        {/* Checkbox column */}
                        <th className="table-cell table-cell-checkbox">
                            <input type="checkbox" aria-label="Select all rows" />
                        </th>
                        {columns.map((col) => (
                            <th key={col.key} className={`table-cell table-cell-${col.key}`}>
                                <div className="table-header-content">
                                    <span>{col.label}</span>
                                    {col.sortable && (
                                        <button className="sort-button" aria-label={`Sort by ${col.label}`}>
                                            <svg viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="table-body">
                    {data.map((row, index) => (
                        <tr
                            key={row.id}
                            className={`table-row ${index % 2 === 0 ? 'table-row-even' : 'table-row-odd'}`}
                        >
                            {/* Checkbox */}
                            <td className="table-cell table-cell-checkbox">
                                <input type="checkbox" aria-label={`Select ${row.employee}`} />
                            </td>

                            {/* Company */}
                            <td className="table-cell table-cell-company">
                                <div className="company-info">
                                    <div className="company-avatar">
                                        {row.companyInitial || row.company.charAt(0)}
                                    </div>
                                    <span className="company-name">{row.company}</span>
                                </div>
                            </td>

                            {/* Employee */}
                            <td className="table-cell table-cell-employee">
                                <div className="employee-info">
                                    <div className="employee-avatar" style={{ backgroundColor: row.avatarColor || '#714B67' }}>
                                        {row.employeeInitial || row.employee.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="employee-details">
                                        <span className="employee-name">{row.employee}</span>
                                        {row.department && (
                                            <span className="employee-department">{row.department}</span>
                                        )}
                                    </div>
                                </div>
                            </td>

                            {/* Check In */}
                            <td className="table-cell table-cell-checkin">
                                {row.checkIn ? (
                                    <div className="datetime-cell">
                                        <span className="datetime-value">{formatDateTime(row.checkIn)}</span>
                                        {row.checkInStatus && (
                                            <span className={`datetime-status ${row.checkInStatus}`}>
                                                {row.checkInStatus === 'late' ? 'Muộn' : 'Đúng giờ'}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="datetime-empty">—</span>
                                )}
                            </td>

                            {/* Check Out */}
                            <td className="table-cell table-cell-checkout">
                                {row.checkOut ? (
                                    <div className="datetime-cell">
                                        <span className="datetime-value">{formatDateTime(row.checkOut)}</span>
                                    </div>
                                ) : (
                                    <span className="datetime-empty">—</span>
                                )}
                            </td>

                            {/* Action */}
                            <td className="table-cell table-cell-action">
                                <ActionButton
                                    isCheckedIn={row.isCheckedIn}
                                    onAction={() => onAction(row.id, row.isCheckedIn ? 'signout' : 'signin')}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
