# Tóm tắt API theo Trang

> File API service: [api.js](file:///e:/code/DATN2/src/services/api.js) — Base URL: `/api`

---

## 1. Xác thực (`authApi`)

| Trang | API | Method | Endpoint | Tác dụng |
|-------|-----|--------|----------|----------|
| LoginPage | `authApi.login` | POST | `/auth/login` | Đăng nhập, trả token JWT |
| AuthContext | `authApi.me` | GET | `/auth/me` | Lấy thông tin user hiện tại (role, name) |
| TopNavBar | `authApi.changePassword` | PUT | `/auth/change-password` | Đổi mật khẩu |

---

## 2. Quản lý tài khoản (`userApi`) — Admin only

| Trang | API | Method | Endpoint | Tác dụng |
|-------|-----|--------|----------|----------|
| UserManagementPage | `userApi.list` | GET | `/users` | Danh sách tài khoản |
| | `userApi.create` | POST | `/users` | Tạo tài khoản mới |
| | `userApi.update` | PUT | `/users/{id}` | Cập nhật tài khoản |
| | `userApi.delete` | DELETE | `/users/{id}` | Xóa tài khoản |

---

## 3. Nhân viên (`employeeApi`)

| Trang | API | Method | Endpoint | Tác dụng |
|-------|-----|--------|----------|----------|
| EmployeeListPage | `employeeApi.list` | GET | `/employees` | DS nhân viên (search, phòng ban, trạng thái, phân trang) |
| | `employeeApi.delete` | DELETE | `/employees/{id}` | Xóa nhân viên |
| EmployeeFormPage | `employeeApi.get` | GET | `/employees/{id}` | Chi tiết 1 nhân viên |
| | `employeeApi.create` | POST | `/employees` | Thêm nhân viên |
| | `employeeApi.update` | PUT | `/employees/{id}` | Cập nhật nhân viên |

---

## 4. Phòng ban (`departmentApi`)

| Trang | API | Method | Endpoint | Tác dụng |
|-------|-----|--------|----------|----------|
| DepartmentsPage | `departmentApi.list` | GET | `/departments` | DS phòng ban |
| | `departmentApi.create` | POST | `/departments` | Thêm phòng ban |
| | `departmentApi.update` | PUT | `/departments/{id}` | Sửa phòng ban |
| | `departmentApi.delete` | DELETE | `/departments/{id}` | Xóa phòng ban |

> **Lưu ý:** `departmentApi.list` được dùng ở nhiều trang khác (Employees, Contracts, Leave, Attendance, Recruitment) để lấy danh sách phòng ban cho bộ lọc/dropdown.

---

## 5. Chức danh (`jobPositionApi`)

| Trang | API | Method | Endpoint | Tác dụng |
|-------|-----|--------|----------|----------|
| JobPositionsPage | `jobPositionApi.list` | GET | `/job-positions` | DS chức danh |
| | `jobPositionApi.create` | POST | `/job-positions` | Thêm chức danh |
| | `jobPositionApi.update` | PUT | `/job-positions/{id}` | Sửa chức danh |
| | `jobPositionApi.delete` | DELETE | `/job-positions/{id}` | Xóa chức danh |

---

## 6. Hợp đồng (`contractApi`)

| Trang | API | Method | Endpoint | Tác dụng |
|-------|-----|--------|----------|----------|
| ContractsPage | `contractApi.list` | GET | `/contracts` | DS hợp đồng (search, NV, trạng thái, loại) |
| | `contractApi.create` | POST | `/contracts` | Tạo hợp đồng |
| | `contractApi.update` | PUT | `/contracts/{id}` | Cập nhật hợp đồng |
| | `contractApi.delete` | DELETE | `/contracts/{id}` | Xóa hợp đồng |
| | `contractApi.approve` | PUT | `/contracts/{id}/approve?action=` | Duyệt/từ chối/hoàn (workflow) |

---

## 7. Nghỉ việc (`terminationApi`)

| Trang | API | Method | Endpoint | Tác dụng |
|-------|-----|--------|----------|----------|
| TerminationsPage | `terminationApi.list` | GET | `/terminations` | DS nghỉ việc |
| | `terminationApi.create` | POST | `/terminations` | Tạo đề xuất nghỉ việc |
| | `terminationApi.update` | PUT | `/terminations/{id}` | Cập nhật |
| | `terminationApi.delete` | DELETE | `/terminations/{id}` | Xóa |
| | `terminationApi.approve` | PUT | `/terminations/{id}/approve?action=` | Duyệt workflow |

---

## 8. Chấm công (`attendanceApi`)

| Trang | API | Method | Endpoint | Tác dụng |
|-------|-----|--------|----------|----------|
| AttendancesPage | `attendanceApi.list` | GET | `/attendances` | DS chấm công (search, NV, phòng ban, trạng thái, khoảng ngày) |
| | `attendanceApi.create` | POST | `/attendances` | Thêm bản ghi chấm công |
| | `attendanceApi.update` | PUT | `/attendances/{id}` | Sửa chấm công |
| | `attendanceApi.delete` | DELETE | `/attendances/{id}` | Xóa chấm công |
| ImportAttendancePage | `attendanceApi.import` | POST | `/attendances/import` | Import hàng loạt từ Excel |
| GenerateAttendancePage | `attendanceApi.generate` | POST | `/attendances/generate` | Tạo chấm công tự động |
| AttendanceReportPage | `attendanceApi.report` | GET | `/attendances/report` | Báo cáo chấm công tổng hợp |
| OvertimePage | `attendanceApi.listOvertime` | GET | `/attendances/overtime` | DS tăng ca |
| | `attendanceApi.createOvertime` | POST | `/attendances/overtime` | Thêm tăng ca |
| | `attendanceApi.updateOvertime` | PUT | `/attendances/overtime/{id}` | Sửa tăng ca |
| | `attendanceApi.deleteOvertime` | DELETE | `/attendances/overtime/{id}` | Xóa tăng ca |
| OvertimeSummaryPage | `attendanceApi.overtimeSummary` | GET | `/attendances/overtime/summary` | Tổng hợp tăng ca theo kỳ/phòng ban |

---

## 9. Bảng lương

### 9a. Giờ làm việc (`workingHourApi`)
| Trang | API | Method | Endpoint | Tác dụng |
|-------|-----|--------|----------|----------|
| WorkingHoursPage | `workingHourApi.list` | GET | `/working-hours` | DS giờ làm việc theo kỳ |
| | `workingHourApi.create` | POST | `/working-hours` | Thêm |
| | `workingHourApi.update` | PUT | `/working-hours/{id}` | Sửa |
| | `workingHourApi.delete` | DELETE | `/working-hours/{id}` | Xóa |

### 9b. Phụ cấp (`incentiveRateApi`)
| Trang | API | Method | Endpoint | Tác dụng |
|-------|-----|--------|----------|----------|
| IncentiveRatePage | `incentiveRateApi.list` | GET | `/incentive-rates` | DS phụ cấp (loại, tìm kiếm) |
| | `incentiveRateApi.create` | POST | `/incentive-rates` | Thêm phụ cấp |
| | `incentiveRateApi.update` | PUT | `/incentive-rates/{id}` | Sửa phụ cấp |
| | `incentiveRateApi.delete` | DELETE | `/incentive-rates/{id}` | Xóa phụ cấp |

### 9c. Tổng hợp lương (`payrollApi`)
| Trang | API | Method | Endpoint | Tác dụng |
|-------|-----|--------|----------|----------|
| PayrollSummaryPage | `payrollApi.list` | GET | `/payroll` | DS bảng lương (NV, kỳ, trạng thái) |
| | `payrollApi.calculate` | POST | `/payroll/calculate` | Tính lương 1 NV |
| | `payrollApi.calculateAll` | POST | `/payroll/calculate-all` | Tính lương tất cả NV theo kỳ |
| | `payrollApi.delete` | DELETE | `/payroll/{id}` | Xóa bảng lương |
| | `payrollApi.confirm` | PUT | `/payroll/{id}/confirm?action=` | Xác nhận / hoàn nháp |
| | `payrollApi.markPaid` | PUT | `/payroll/{id}/mark-paid` | Đánh dấu đã thanh toán |

---

## 10. Nghỉ phép (`leaveApi`)

| Trang | API | Method | Endpoint | Tác dụng |
|-------|-----|--------|----------|----------|
| LeaveRequestPage | `leaveApi.list` | GET | `/leaves` | DS đơn xin nghỉ |
| | `leaveApi.create` | POST | `/leaves` | Tạo đơn nghỉ |
| | `leaveApi.update` | PUT | `/leaves/{id}` | Sửa đơn nghỉ |
| | `leaveApi.delete` | DELETE | `/leaves/{id}` | Xóa đơn nghỉ |
| | `leaveApi.approve` | PUT | `/leaves/{id}/approve?action=` | Duyệt/từ chối |
| LeaveRequestLinePage | `leaveApi.list` | GET | `/leaves` (status=approved) | Chi tiết phép đã duyệt |
| AnnualLeavePage | `leaveApi.listAnnual` | GET | `/leaves/annual` | Số dư phép năm |
| | `leaveApi.createBalance` | POST | `/leaves/annual` | Tạo/cập nhật phép năm |
| PublicHolidaysPage | `leaveApi.listHolidays` | GET | `/leaves/public-holidays` | DS ngày lễ |
| | `leaveApi.createHoliday` | POST | `/leaves/public-holidays` | Thêm ngày lễ |
| | `leaveApi.updateHoliday` | PUT | `/leaves/public-holidays/{id}` | Sửa ngày lễ |
| | `leaveApi.deleteHoliday` | DELETE | `/leaves/public-holidays/{id}` | Xóa ngày lễ |
| UnpaidLeavePage | `leaveApi.listUnpaid` | GET | `/leaves/unpaid` | DS nghỉ không lương |
| LeaveSummaryPage | `leaveApi.summary` | GET | `/leaves/summary` | Tổng hợp phép |
| AbsenteeismPage | `leaveApi.absenteeism` | GET | `/leaves/absenteeism` | Tỷ lệ vắng mặt |

---

## 11. Tuyển dụng

| Trang | API | Method | Endpoint | Tác dụng |
|-------|-----|--------|----------|----------|
| CandidatesPage | `candidateApi.list` | GET | `/recruitment/candidates` | DS ứng viên |
| | `candidateApi.create` | POST | `/recruitment/candidates` | Thêm ứng viên |
| | `candidateApi.upload` | POST | `/recruitment/candidates/upload` | Upload CV (multipart) |
| | `candidateApi.update` | PUT | `/recruitment/candidates/{id}` | Sửa |
| | `candidateApi.delete` | DELETE | `/recruitment/candidates/{id}` | Xóa |
| | `aiScreeningApi.screen` | POST | `/recruitment/ai/screen` | Sàng lọc AI |
| | `recruitEmailApi.send` | POST | `/recruitment/email/send` | Gửi email |
| RecruitmentRequestsPage | `recruitRequestApi.list/create/update/delete` | CRUD | `/recruitment/requests` | Yêu cầu tuyển dụng |
| | `recruitRequestApi.approve` | PUT | `/recruitment/requests/{id}/approve` | Duyệt yêu cầu |
| ApplicationsPage | `applicationApi.list/create/update/delete` | CRUD | `/recruitment/applications` | Ứng tuyển |
| | `applicationApi.updateStage` | PUT | `/recruitment/applications/{id}/stage` | Chuyển giai đoạn |
| | `applicationApi.hire` | POST | `/recruitment/applications/{id}/hire` | Tuyển dụng |
| InterviewsPage | `interviewApi.list/create/update/delete` | CRUD | `/recruitment/interviews` | Phỏng vấn |
| OffersPage | `offerApi.list/create/update/delete` | CRUD | `/recruitment/offers` | Đề nghị |
| | `offerApi.updateStatus` | PUT | `/recruitment/offers/{id}/status` | Cập nhật trạng thái offer |
| RecruitmentReportPage | `recruitReportApi.pipeline` | GET | `/recruitment/reports/pipeline` | Báo cáo pipeline |

---

## 12. Sơ đồ tổ chức (`orgChartApi`)

| Trang | API | Method | Endpoint | Tác dụng |
|-------|-----|--------|----------|----------|
| OrgChartPage | `orgChartApi.getFullChart` | GET | `/org-chart` | Toàn bộ sơ đồ |
| | `orgChartApi.getDepartmentChart` | GET | `/org-chart/department/{id}` | Sơ đồ theo phòng ban |

---

## 13. Trụ sở (`companyLocationApi`)

| Trang | API | Method | Endpoint | Tác dụng |
|-------|-----|--------|----------|----------|
| CompanyLocationsPage | `companyLocationApi.list` | GET | `/company-locations` | DS trụ sở (tọa độ GPS) |
| | `companyLocationApi.create` | POST | `/company-locations` | Thêm trụ sở |
| | `companyLocationApi.update` | PUT | `/company-locations/{id}` | Sửa |
| | `companyLocationApi.delete` | DELETE | `/company-locations/{id}` | Xóa |

---

## 14. Cổng nhân viên ESS (`essApi`) — Employee only

| Trang | API | Method | Endpoint | Tác dụng |
|-------|-----|--------|----------|----------|
| ESSDashboardPage | `essApi.getProfile` | GET | `/ess/profile` | Thông tin cá nhân |
| | `essApi.getAttendanceStatus` | GET | `/ess/attendance/status` | Trạng thái chấm công hôm nay |
| | `essApi.checkIn` | POST | `/ess/attendance/check-in` | Check-in GPS |
| | `essApi.checkOut` | POST | `/ess/attendance/check-out` | Check-out |
| | `essApi.getCompanyLocations` | GET | `/ess/attendance/locations` | DS trụ sở (cho GPS check-in) |
| ESSProfilePage | `essApi.getProfile` | GET | `/ess/profile` | Xem hồ sơ cá nhân |
| | `essApi.updateProfile` | PUT | `/ess/profile` | Cập nhật hồ sơ |
| ESSSalaryPage | `essApi.getSalary` | GET | `/ess/salary` | Bảng lương cá nhân |
| ESSLeavePage | `essApi.getLeaves` | GET | `/ess/leaves` | DS đơn nghỉ cá nhân |
| | `essApi.submitLeave` | POST | `/ess/leaves` | Nộp đơn xin nghỉ |
| ESSSchedulePage | `essApi.getSchedule` | GET | `/ess/schedule` | Lịch làm việc cá nhân |

---

## 15. Admin Panel (`adminApi`) — Admin only

| Trang | API | Method | Endpoint | Tác dụng |
|-------|-----|--------|----------|----------|
| DatabaseInfoPage | `adminApi.getSystemInfo` | GET | `/admin/system-info` | Thống kê DB (số NV, hợp đồng, v.v.) |
| AuditLogPage | `adminApi.getAuditLog` | GET | `/admin/audit-log` | Nhật ký hoạt động hệ thống |
| SystemSettingsPage | `adminApi.getSettings` | GET | `/admin/settings` | Lấy cấu hình hệ thống |
| | `adminApi.updateSettings` | PUT | `/admin/settings` | Lưu cấu hình |

---

## Tổng kết

| Nhóm | Số API | Số trang |
|------|--------|----------|
| Auth | 3 | 2 |
| Users | 4 | 1 |
| Employees | 5 | 2 |
| Departments | 4 | 1 |
| Job Positions | 4 | 1 |
| Contracts | 5 | 1 |
| Terminations | 5 | 1 |
| Attendance + Overtime | 13 | 6 |
| Payroll (Working Hours + Incentive + Payroll) | 14 | 3 |
| Leave | 13 | 7 |
| Recruitment | 21 | 6 |
| Org Chart | 3 | 1 |
| Company Locations | 4 | 1 |
| ESS | 9 | 5 |
| Admin | 4 | 3 |
| **Tổng** | **~111** | **~41** |
