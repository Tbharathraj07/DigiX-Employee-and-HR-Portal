# DigiX Employee & HR Portal

A modern, responsive, corporate SaaS web application built for **DigiX Technologies**.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production
```bash
npm run build
```

---

## 👥 Demo Personas & Roles

The portal features a single login page with 1-click demo login cards, plus an in-app **Role Switcher pill** in the top navigation bar to toggle between roles on the fly:

1. **Employee**: Alex Rivera (`alex.rivera@digix.internal`)
   - *Senior Frontend Engineer* (Engineering)
   - Dashboard, My Profile, My Projects, My Tasks, My Team, Attendance, Leave, Training, Documents, Announcements, AI Assistant, Settings.

2. **HR Manager**: Sarah Jenkins (`sarah.jenkins@digix.internal`)
   - *Head of Talent & People Ops* (Human Resources)
   - Dashboard, Employees, Employee Profiles, Attendance, Leave Requests, Recruitment (ATS Kanban), Onboarding, Training, Documents, Announcements, Reports, Settings.

3. **System Admin**: Marcus Vance (`marcus.vance@digix.internal`)
   - *Principal Infrastructure & Security Admin* (IT & Security)
   - Dashboard, Users, Employees, HR Management, Projects, Roles & Permissions Matrix, System Settings, Security / Activity Logs, Reports.

---

## 🎨 Design System & Branding

- **Primary Color**: DigiX Blue (`#0B57D0` / `rgb(11, 87, 208)`)
- **Canvas & Neutral Surfaces**: Clean white (`#FFFFFF`) with slate borders (`#E2E8F0`) and light gray surfaces (`#F8FAFC`, `#F1F5F9`)
- **Typography**: Inter / Modern sans-serif with crisp hierarchy
- **Responsiveness**: Fully optimized for Desktop, Tablet, and Mobile with collapsible sidebar navigation and drawer overlays
- **Icons**: Lucide React corporate iconography
- **Command Palette**: Press `⌘K` or click the search bar to jump anywhere in the portal.

---

## 📁 Key Features

- **Interactive Clock-in / Punch Timer**: Clock in and clock out live, tracking daily work hours and overtime.
- **Leave Management & Approval Flow**: Employees submit leave requests; HR reviews with instant Approve/Reject feedback and manager notes.
- **Interactive ATS Recruitment Kanban**: Move candidate profiles across stages from *Applied* through *Technical Interview* to *Hired*.
- **DigiX AI Assistant**: Chatbot answering questions regarding company leave policy, remote work, health benefits, and holiday schedules.
- **Fine-Grained RBAC Matrix**: Admins can toggle Read, Write, and Delete permissions per system module.
- **Security Audit Logs**: Real-time searchable activity log with user, IP, action, and severity badge.
- **Local Persistence**: State changes persist across browser refreshes with a 1-click "Reset Demo Data" option in the user profile menu.
