/**
 * HRM System — Export Utility
 * Supports Excel (.xlsx) and PDF exports using SheetJS and jsPDF.
 */
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Helpers ────────────────────────────────────────────────

function getTimestamp() {
    return new Date().toISOString().slice(0, 10); // "2025-02-15"
}

function buildFilename(title) {
    return `${title}_${getTimestamp()}`;
}

// ── Excel Export ───────────────────────────────────────────

/**
 * Export rows to an Excel file.
 * @param {string} title - Sheet / file title (e.g. "Danh_sach_nhan_vien")
 * @param {string[]} headers - Column header labels
 * @param {Array<Array>} rows - 2D array of cell values
 */
export function exportExcel(title, headers, rows) {
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-width columns
    const colWidths = headers.map((h, i) => ({
        wch: Math.max(
            h.length + 2,
            ...rows.map(r => String(r[i] ?? '').length)
        )
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
    XLSX.writeFile(wb, `${buildFilename(title)}.xlsx`);
}

// ── PDF Export ─────────────────────────────────────────────

/**
 * Export rows to a PDF file with a styled table.
 * @param {string} title - Report title shown in the PDF header
 * @param {string[]} headers - Column header labels
 * @param {Array<Array>} rows - 2D array of cell values
 * @param {string} [orientation='landscape'] - 'landscape' | 'portrait'
 */
export function exportPDF(title, headers, rows, orientation = 'landscape') {
    const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, 40, { align: 'center' });

    // Subtitle: date
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, pageWidth / 2, 58, { align: 'center' });
    doc.setTextColor(0);

    autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 72,
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: {
            fillColor: [113, 75, 103],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
        },
        alternateRowStyles: { fillColor: [248, 246, 250] },
        margin: { left: 30, right: 30 },
    });

    doc.save(`${buildFilename(title)}.pdf`);
}

// ══════════════════════════════════════════════════════════
//  REPORT BUILDERS — one per module
// ══════════════════════════════════════════════════════════

// ── Employees ─────────────────────────────────────────────

const EMPLOYEE_HEADERS = [
    'Họ tên', 'Email', 'Điện thoại',
    'Phòng ban', 'Chức danh', 'Công ty',
    'Email công việc', 'SĐT công việc',
    'Ngày vào', 'Trạng thái',
];

function employeeRows(employees) {
    return employees.map(e => [
        e.name || '',
        e.email || '',
        e.phone || '',
        e.department_name || '',
        e.job_position_name || '',
        e.company || '',
        e.work_email || '',
        e.work_phone || '',
        e.hire_date || '',
        e.status === 'active' ? 'Đang hoạt động' : 'Lưu trữ',
    ]);
}

export function exportEmployeesExcel(employees) {
    exportExcel('Danh_sach_nhan_vien', EMPLOYEE_HEADERS, employeeRows(employees));
}

export function exportEmployeesPDF(employees) {
    exportPDF('Danh sách Nhân viên', EMPLOYEE_HEADERS, employeeRows(employees), 'landscape');
}

// ── Payroll ───────────────────────────────────────────────

const PAYROLL_HEADERS = [
    'Nhân viên', 'Chức danh', 'Kỳ',
    'Lương CB', 'Tăng ca', 'Phụ cấp',
    'Khấu trừ', 'Lương gộp', 'Thực nhận',
    'Trạng thái',
];

const PAYROLL_STATUS = { draft: 'Nháp', confirmed: 'Đã xác nhận', paid: 'Đã chi' };

function fmtMoney(n) {
    return Number(n || 0).toLocaleString('vi-VN') + ' ₫';
}

function payrollRows(records) {
    return records.map(r => [
        r.employee_name || '',
        r.job_position_name || '',
        r.period || '',
        fmtMoney(r.base_salary),
        fmtMoney(r.overtime_pay),
        fmtMoney(r.incentive_total),
        fmtMoney(r.deductions),
        fmtMoney(r.gross_salary),
        fmtMoney(r.net_salary),
        PAYROLL_STATUS[r.status] || r.status || '',
    ]);
}

export function exportPayrollExcel(records, period) {
    const title = period ? `Bang_luong_${period}` : 'Bang_luong';
    exportExcel(title, PAYROLL_HEADERS, payrollRows(records));
}

export function exportPayrollPDF(records, period) {
    const title = period ? `Bảng lương tháng ${period}` : 'Bảng lương';
    exportPDF(title, PAYROLL_HEADERS, payrollRows(records), 'landscape');
}

// ── Leave Requests ────────────────────────────────────────

const LEAVE_HEADERS = [
    'Nhân viên', 'Phòng ban', 'Loại phép',
    'Từ ngày', 'Đến ngày', 'Số ngày',
    'Lý do', 'Trạng thái', 'Người duyệt',
];

const LEAVE_TYPES_LABEL = {
    annual: 'Phép năm', unpaid: 'Không lương',
    sick: 'Ốm đau', maternity: 'Thai sản', other: 'Khác',
};
const LEAVE_STATUS_LABEL = {
    draft: 'Nháp', pending: 'Chờ duyệt',
    approved: 'Đã duyệt', rejected: 'Từ chối', cancelled: 'Đã huỷ',
};

function leaveRows(data) {
    return data.map(r => [
        r.employee_name || '',
        r.department_name || '',
        LEAVE_TYPES_LABEL[r.leave_type] || r.leave_type || '',
        r.start_date || '',
        r.end_date || '',
        r.total_days ?? '',
        r.reason || '',
        LEAVE_STATUS_LABEL[r.status] || r.status || '',
        r.approver_name || '',
    ]);
}

export function exportLeaveExcel(data) {
    exportExcel('Don_xin_nghi_phep', LEAVE_HEADERS, leaveRows(data));
}

export function exportLeavePDF(data) {
    exportPDF('Danh sách Đơn xin nghỉ phép', LEAVE_HEADERS, leaveRows(data), 'landscape');
}
