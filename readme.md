# 🏢 Hệ thống Quản lý Nhân sự

> **Graduation Project — Human Resource Management System**

Hệ thống quản lý nhân sự được xây dựng nhằm hỗ trợ doanh nghiệp số hóa và tập trung các nghiệp vụ **quản lý nhân viên, hợp đồng, chấm công, tính lương, nghỉ phép và tuyển dụng** trên một nền tảng thống nhất.

Hệ thống được thiết kế theo mô hình phân quyền giữa **Admin, bộ phận quản lý/HR và nhân viên**, đồng thời cung cấp cổng **Employee Self-Service (ESS)** để nhân viên chủ động quản lý thông tin cá nhân, chấm công, nghỉ phép, lịch làm việc và bảng lương.

---

## ✨ Tổng quan

Hệ thống tập trung vào các nghiệp vụ chính của quản trị nhân sự:

* 👤 Quản lý nhân viên
* 🏢 Quản lý phòng ban và chức danh
* 📄 Quản lý hợp đồng lao động
* ⏱️ Quản lý chấm công và tăng ca
* 💰 Tính và quản lý bảng lương
* 🏖️ Quản lý nghỉ phép và ngày lễ
* 📋 Quản lý quy trình nghỉ việc
* 🎯 Quản lý tuyển dụng
* 🤖 Sàng lọc CV bằng AI
* 🏗️ Sơ đồ tổ chức doanh nghiệp
* 📍 Quản lý địa điểm/trụ sở
* 👨‍💼 Cổng nhân viên ESS
* ⚙️ Quản trị và cấu hình hệ thống
* 📝 Nhật ký hoạt động và thông tin hệ thống

---

## 🧩 Các phân hệ chính

### 👥 Quản lý nhân sự

Quản lý tập trung thông tin nhân viên và các dữ liệu liên quan:

* Hồ sơ nhân viên
* Phòng ban
* Chức danh
* Hợp đồng
* Quy trình nghỉ việc
* Sơ đồ tổ chức
* Địa điểm làm việc

### ⏰ Chấm công & tăng ca

Hỗ trợ quản lý dữ liệu chấm công theo nhân viên và phòng ban:

* Theo dõi chấm công
* Tìm kiếm và lọc dữ liệu
* Import dữ liệu chấm công từ Excel
* Tạo dữ liệu chấm công
* Quản lý tăng ca
* Tổng hợp tăng ca
* Báo cáo chấm công

### 💵 Tiền lương

Hệ thống hỗ trợ quy trình tổng hợp và xử lý tiền lương:

* Quản lý giờ làm việc
* Quản lý phụ cấp
* Tính lương theo kỳ
* Tính lương hàng loạt
* Xác nhận bảng lương
* Theo dõi trạng thái thanh toán

### 🌴 Nghỉ phép

Quản lý toàn bộ quy trình nghỉ phép của nhân viên:

* Tạo và xử lý đơn nghỉ phép
* Duyệt / từ chối đơn
* Quản lý phép năm
* Quản lý ngày nghỉ lễ
* Theo dõi nghỉ không lương
* Thống kê và tổng hợp nghỉ phép
* Báo cáo tỷ lệ vắng mặt

### 🎯 Tuyển dụng

Quản lý quy trình tuyển dụng từ yêu cầu tuyển dụng đến tiếp nhận nhân viên:

* Yêu cầu tuyển dụng
* Ứng viên
* Upload CV
* Hồ sơ ứng tuyển
* Các vòng phỏng vấn
* Offer
* Quy trình tuyển dụng
* Báo cáo pipeline

### 🤖 AI hỗ trợ tuyển dụng

Hệ thống tích hợp chức năng **AI CV Screening** nhằm hỗ trợ quá trình sàng lọc ứng viên.

Chức năng bao gồm:

* Upload CV
* Phân tích CV
* Sàng lọc ứng viên
* Hỗ trợ đánh giá mức độ phù hợp với vị trí tuyển dụng

> AI đóng vai trò hỗ trợ HR trong quá trình sàng lọc, không thay thế hoàn toàn quyết định tuyển dụng.

### 👨‍💼 Employee Self-Service (ESS)

Cổng dành cho nhân viên, cho phép nhân viên chủ động truy cập các thông tin cá nhân:

* Hồ sơ cá nhân
* Chấm công
* Check-in / Check-out bằng GPS
* Lịch làm việc
* Bảng lương cá nhân
* Theo dõi đơn nghỉ phép
* Gửi yêu cầu nghỉ phép

### ⚙️ Quản trị hệ thống

Khu vực quản trị dành cho Admin:

* Quản lý tài khoản
* Thông tin hệ thống
* Thống kê cơ sở dữ liệu
* Nhật ký hoạt động
* Cấu hình hệ thống
* Phân quyền truy cập

---

## 🔐 Xác thực & phân quyền

Hệ thống sử dụng cơ chế xác thực bằng **JWT** và kiểm soát quyền truy cập theo vai trò.

Các nhóm quyền chính:

| Vai trò          | Phạm vi                                                |
| ---------------- | ------------------------------------------------------ |
| **Admin**        | Quản trị toàn bộ hệ thống và tài khoản                 |
| **HR / Quản lý** | Quản lý nghiệp vụ nhân sự được phân quyền              |
| **Employee**     | Sử dụng các chức năng dành cho nhân viên thông qua ESS |

---

## 🛠️ Công nghệ sử dụng

### Frontend

* **React 18**
* **Vite**
* **React Router**
* JavaScript / ES Modules
* XLSX — xử lý dữ liệu Excel
* jsPDF — xuất tài liệu PDF
* jsPDF AutoTable — tạo bảng trong PDF

### Backend

* RESTful API
* JWT Authentication
* API được tổ chức theo từng nhóm nghiệp vụ

### Kiến trúc

```text
┌──────────────────────────────┐
│          React + Vite        │
│                              │
│  HR Management │ ESS │ Admin │
└──────────────┬───────────────┘
               │
               │ REST API
               ▼
┌──────────────────────────────┐
│           Backend            │
│                              │
│ Auth │ Employee │ Attendance │
│ Payroll │ Leave │ Recruitment│
│ ESS │ Admin │ Organization    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│          Database            │
└──────────────────────────────┘
```

---

## 📊 Quy mô hệ thống

Theo tài liệu API hiện tại của project:

| Phân hệ               |       Số API |
| --------------------- | -----------: |
| Authentication        |            3 |
| Users                 |            4 |
| Employees             |            5 |
| Departments           |            4 |
| Job Positions         |            4 |
| Contracts             |            5 |
| Terminations          |            5 |
| Attendance & Overtime |           13 |
| Payroll               |           14 |
| Leave                 |           13 |
| Recruitment           |           21 |
| Organization Chart    |            3 |
| Company Locations     |            4 |
| Employee Self-Service |            9 |
| Admin                 |            4 |
| **Tổng cộng**         | **~111 API** |

Hệ thống hiện có khoảng **41 trang/chức năng giao diện** được tổ chức theo từng nhóm nghiệp vụ.

---

## 🚀 Cài đặt

### 1. Clone repository

```bash
git clone https://github.com/Quytaki/Graduationnnnnnnnn.git
cd Graduationnnnnnnnn
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình Backend

Đảm bảo backend/API server đã được khởi động và cấu hình đúng **Base URL `/api`**.

Các API của frontend được tổ chức thông qua lớp service và sử dụng endpoint `/api`.

### 4. Chạy môi trường development

```bash
npm run dev
```

Sau đó truy cập địa chỉ được Vite cung cấp trên terminal.

### 5. Build production

```bash
npm run build
```

### 6. Preview production build

```bash
npm run preview
```

---

## 📁 Cấu trúc project

```text
Graduationnnnnnnn/
│
├── public/                 # Static assets
│
├── src/
│   ├── components/        # UI components
│   ├── pages/             # Các trang chức năng
│   ├── services/          # API services
│   ├── context/           # Application context
│   └── ...
│
├── server/                # Backend / server-side resources
│
├── api_summary.md         # Tổng hợp API theo từng trang
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 📚 Tài liệu API

Chi tiết các API được sử dụng trong hệ thống được tổng hợp tại:

**[`api_summary.md`](./api_summary.md)**

Tài liệu bao gồm:

* Endpoint
* HTTP Method
* API service
* Trang sử dụng API
* Mục đích của từng API
* Phân nhóm theo từng nghiệp vụ

---

## 🎓 Mục tiêu đồ án

Project được thực hiện với mục tiêu xây dựng một hệ thống quản lý nhân sự có khả năng mô phỏng các quy trình nghiệp vụ thực tế trong doanh nghiệp.

Các nghiệp vụ được tập trung trong cùng một hệ thống nhằm giảm việc quản lý dữ liệu phân tán và hỗ trợ HR cũng như nhân viên trong quá trình sử dụng.

---

## 🔗 Repository

**GitHub:**
https://github.com/Quytaki/Graduationnnnnnnnn

---

## 👨‍💻 Author

**Quytaki**

GitHub:
https://github.com/Quytaki
