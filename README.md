# Nexis Talent Assessment – Round 1 Online Assessment Platform

A modern, responsive, production-ready full-stack online assessment web platform designed to conduct first-round screening tests for candidates applying for technical and cross-functional developer profiles:
- Web Developer cum Sales Engineer
- Web Developer cum HR Recruiter
- Web Developer cum Digital Marketing

---

## 🎨 UI/UX Design System
- **Theme**: Professional Green & White corporate palette
  - **Primary Green**: `#198754`
  - **Dark Green**: `#146C43`
  - **Light Accent Green**: `#EAF7EF`
  - **Base White**: `#FFFFFF`
  - **Dark Text**: `#212529`
- **Human-Crafted Aesthetic**: Non-robotic, clean card layouts, subtle borders, soft shadows, clear visual hierarchy, accessible input focus rings, and responsive typography on mobile, tablet, and desktop.

---

## 🚀 Key Features

### 1. Candidate Experience
- **Registration & Verification**:
  - Full Name, Degree (dropdown + custom option), Semester (1st to 8th, Passed Out), Year (1st to 4th Year, Passed Out), Branch, College Name, Graduation Year (2024–2029+).
  - Strict Email validation and 10-digit Indian mobile number validation (`^[6-9]\d{9}$`).
  - Resume document upload (`.pdf`, `.doc`, `.docx` up to 5MB) with drag-and-drop & live file preview.
  - Mandatory consent confirmation.
  - Zero profile selection (common assessment across all three profiles).
  - No admin controls or links visible anywhere on candidate pages.
- **Anti-Cheating Randomized Question Sequencing**:
  - Every candidate receives a unique randomized sequence of the 30 curated questions generated and locked on the server.
  - Adjacent candidates sitting next to each other never see the same questions at the same time.
- **Strict Single-Question Navigation**:
  - Displays exactly one question at a time with 4 options (A, B, C, D).
  - Selecting an option immediately records the answer and auto-advances.
  - No Next button, no Back button.
  - Candidates cannot revisit previous questions or modify submitted answers.
- **Server-Synced 25-Minute Countdown Timer**:
  - Authority resides on the backend with stored start time and deadline.
  - Refreshing the browser or switching tabs does not alter or reset the countdown.
  - Automatic test submission on timer expiration.
- **Score-Hidden Completion Receipt**:
  - Displays official submission receipt with Candidate ID, Reference ID, timestamp, and company name.
  - Candidate scores, percentages, and answer keys are strictly withheld.
  - Retake prevention guards against repeated attempts.

### 2. Isolated Admin Portal (`/admin/login`)
- **Private Route**: Completely segregated from candidate portal.
- **Authentication**: JWT tokens with bcrypt password hashing.
  - Default Admin: `admin@nexis.internal`
  - Default Password: `NexisAdmin@2026`
- **Dashboard & Analytics**:
  - Real-time KPI statistics: Total Registered Candidates, Total Attempts, Completed Tests, Incomplete Tests, Timed-Out Submissions, and Qualified Candidates (&ge; 60%).
  - Search candidates by Name, Email, College, or Phone.
  - Filter by Test Status and Graduation Year.
  - View individual candidate assessment audits with question-by-question candidate selections, correct answers, and correctness badges.
  - Download candidate uploaded resumes securely.
  - 1-Click CSV data export.
  - Safe cascade deletion with confirmation modal.

---

## 🛠️ Project Structure
```
online-assessment-round1/
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── candidateController.js
│   │   │   ├── assessmentController.js
│   │   │   └── adminController.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── upload.js
│   │   ├── routes/
│   │   │   ├── candidateRoutes.js
│   │   │   ├── assessmentRoutes.js
│   │   │   └── adminRoutes.js
│   │   ├── database.js
│   │   └── index.js
│   ├── uploads/
│   └── package.json
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── CandidateRegistration.jsx
│   │   │   ├── AssessmentRoom.jsx
│   │   │   ├── AssessmentCompletion.jsx
│   │   │   ├── AdminLogin.jsx
│   │   │   └── AdminDashboard.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── test_assessment.mjs
└── README.md
```

---

## 🏃 Running the Application

### Option A: Unified Full-Stack Production Server (Recommended)
1. Start the server (serves both API and pre-built React frontend):
   ```bash
   cd server
   node src/index.js
   ```
2. Open your browser:
   - Candidate Assessment: [http://localhost:5000](http://localhost:5000)
   - Admin Login: [http://localhost:5000/admin/login](http://localhost:5000/admin/login)

### Option B: Development Mode (Vite HMR)
1. Start the backend:
   ```bash
   cd server
   npm run dev
   ```
2. In a separate terminal, start the Vite client:
   ```bash
   cd client
   npm run dev
   ```
3. Access at [http://localhost:5173](http://localhost:5173).
