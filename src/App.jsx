import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// ── Shared layouts ──────────────────────────────────────
import TopNavBar from './components/TopNavBar/TopNavBar';
import LeftSidebar from './components/LeftSidebar/LeftSidebar';
import AdminTopNavBar from './components/AdminTopNavBar/AdminTopNavBar';
import AdminLeftSidebar from './components/AdminLeftSidebar/AdminLeftSidebar';

// ── Pages ───────────────────────────────────────────────
import LoginPage from './pages/login/LoginPage';
import EmployeeListPage from './pages/employees/EmployeeListPage';
import EmployeeFormPage from './pages/employees/EmployeeFormPage';
import DepartmentsPage from './pages/departments/DepartmentsPage';
import JobPositionsPage from './pages/jobPositions/JobPositionsPage';
import ContractsPage from './pages/contracts/ContractsPage';
import TerminationsPage from './pages/terminations/TerminationsPage';
import OrgChartPage from './pages/orgchart/OrgChartPage';
import WorkingHoursPage from './pages/payroll/WorkingHoursPage';
import IncentiveRatePage from './pages/payroll/IncentiveRatePage';
import PayrollSummaryPage from './pages/payroll/PayrollSummaryPage';
import UserManagementPage from './pages/users/UserManagementPage';
import AttendancesPage from './pages/attendance/AttendancesPage';
import ImportAttendancePage from './pages/attendance/ImportAttendancePage';
import AttendanceReportPage from './pages/attendance/AttendanceReportPage';
import GenerateAttendancePage from './pages/attendance/GenerateAttendancePage';
import OvertimePage from './pages/attendance/OvertimePage';
import OvertimeSummaryPage from './pages/attendance/OvertimeSummaryPage';
import LeaveRequestPage from './pages/leave/LeaveRequestPage';
import AnnualLeavePage from './pages/leave/AnnualLeavePage';
import PublicHolidaysPage from './pages/leave/PublicHolidaysPage';
import UnpaidLeavePage from './pages/leave/UnpaidLeavePage';
import LeaveRequestLinePage from './pages/leave/LeaveRequestLinePage';
import LeaveSummaryPage from './pages/leave/LeaveSummaryPage';
import AbsenteeismPage from './pages/leave/AbsenteeismPage';
import ESSDashboardPage from './pages/ess/ESSDashboardPage';
import ESSProfilePage from './pages/ess/ESSProfilePage';
import ESSSalaryPage from './pages/ess/ESSSalaryPage';
import ESSLeavePage from './pages/ess/ESSLeavePage';
import ESSSchedulePage from './pages/ess/ESSSchedulePage';
import CandidatesPage from './pages/recruitment/CandidatesPage';
import RecruitmentRequestsPage from './pages/recruitment/RecruitmentRequestsPage';
import ApplicationsPage from './pages/recruitment/ApplicationsPage';
import InterviewsPage from './pages/recruitment/InterviewsPage';
import OffersPage from './pages/recruitment/OffersPage';
import RecruitmentReportPage from './pages/recruitment/RecruitmentReportPage';
import CompanyLocationsPage from './pages/companyLocations/CompanyLocationsPage';

// ── Admin-only pages ────────────────────────────────────
import AuditLogPage from './pages/admin/AuditLogPage';
import SystemSettingsPage from './pages/admin/SystemSettingsPage';
import DatabaseInfoPage from './pages/admin/DatabaseInfoPage';

import './App.css';

// ── Shared HRM Routes (used by both Admin and HR) ──────
function HRMRoutes({ userRole }) {
    return (
        <>
            {/* Employee Module */}
            <Route path="/employees" element={<EmployeeListPage />} />
            <Route path="/employees/new" element={<EmployeeFormPage />} />
            <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />

            {/* Department & Job Positions */}
            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/job-positions" element={<JobPositionsPage />} />

            {/* Contracts & Terminations */}
            <Route path="/contracts" element={<ContractsPage />} />
            <Route path="/terminations" element={<TerminationsPage />} />
            <Route path="/org-chart" element={<OrgChartPage />} />
            <Route path="/company-locations" element={<CompanyLocationsPage />} />

            {/* Payroll */}
            <Route path="/working-hours" element={<WorkingHoursPage />} />
            <Route path="/incentive-rates" element={<IncentiveRatePage />} />
            <Route path="/payroll" element={<PayrollSummaryPage />} />

            {/* Attendance Module */}
            <Route path="/attendances" element={<AttendancesPage />} />
            <Route path="/attendance-import" element={<ImportAttendancePage />} />
            <Route path="/attendance-reports" element={<AttendanceReportPage />} />
            <Route path="/attendance-generate" element={<GenerateAttendancePage />} />
            <Route path="/overtime" element={<OvertimePage />} />
            <Route path="/overtime-summary" element={<OvertimeSummaryPage />} />

            {/* Leave Management Module */}
            <Route path="/leave-requests" element={<LeaveRequestPage />} />
            <Route path="/annual-leave" element={<AnnualLeavePage />} />
            <Route path="/public-holidays" element={<PublicHolidaysPage />} />
            <Route path="/unpaid-leave" element={<UnpaidLeavePage />} />
            <Route path="/leave-request-lines" element={<LeaveRequestLinePage />} />
            <Route path="/leave-summary" element={<LeaveSummaryPage />} />
            <Route path="/absenteeism" element={<AbsenteeismPage />} />

            {/* Recruitment Module */}
            <Route path="/recruitment/candidates" element={<CandidatesPage />} />
            <Route path="/recruitment/requests" element={<RecruitmentRequestsPage />} />
            <Route path="/recruitment/applications" element={<ApplicationsPage />} />
            <Route path="/recruitment/interviews" element={<InterviewsPage />} />
            <Route path="/recruitment/offers" element={<OffersPage />} />
            <Route path="/recruitment/reports" element={<RecruitmentReportPage />} />
        </>
    );
}

export default function App() {
    const { user, loading } = useAuth();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

    if (loading) {
        return (
            <div className="app-loading">
                <div className="app-loading-spinner"></div>
            </div>
        );
    }

    if (!user) {
        return <LoginPage />;
    }

    // ── Employee role → ESS Portal ──────────────────────────
    if (user.role === 'employee') {
        return (
            <Routes>
                <Route path="/ess" element={<ESSDashboardPage />} />
                <Route path="/ess/profile" element={<ESSProfilePage />} />
                <Route path="/ess/salary" element={<ESSSalaryPage />} />
                <Route path="/ess/leaves" element={<ESSLeavePage />} />
                <Route path="/ess/schedule" element={<ESSSchedulePage />} />
                <Route path="*" element={<Navigate to="/ess" replace />} />
            </Routes>
        );
    }

    // ── Admin role → Admin Panel (dark theme, full access) ──
    if (user.role === 'admin') {
        return (
            <div className="app app-admin">
                <AdminTopNavBar />
                <div className="app-layout">
                    <AdminLeftSidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
                    <main className="main-content">
                        <Routes>
                            {/* All HRM routes */}
                            {HRMRoutes({ userRole: 'admin' })}

                            {/* Admin-only: Quản trị module */}
                            <Route path="/users" element={<UserManagementPage />} />
                            <Route path="/admin/audit-log" element={<AuditLogPage />} />
                            <Route path="/admin/settings" element={<SystemSettingsPage />} />
                            <Route path="/admin/database" element={<DatabaseInfoPage />} />

                            {/* Default redirect */}
                            <Route path="/login" element={<Navigate to="/employees" replace />} />
                            <Route path="/" element={<Navigate to="/employees" replace />} />
                            <Route path="*" element={<Navigate to="/employees" replace />} />
                        </Routes>
                    </main>
                </div>
            </div>
        );
    }

    // ── HR role → HRM Layout (no admin module) ──────────────
    return (
        <div className="app">
            <TopNavBar />
            <div className="app-layout">
                <LeftSidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
                <main className="main-content">
                    <Routes>
                        {/* All HRM routes */}
                        {HRMRoutes({ userRole: 'hr' })}

                        {/* Block admin routes for HR — redirect to employees */}
                        <Route path="/users" element={<Navigate to="/employees" replace />} />
                        <Route path="/admin/*" element={<Navigate to="/employees" replace />} />

                        {/* Default redirect */}
                        <Route path="/login" element={<Navigate to="/employees" replace />} />
                        <Route path="/" element={<Navigate to="/employees" replace />} />
                        <Route path="*" element={<Navigate to="/employees" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}
