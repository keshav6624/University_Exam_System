# UniExam — Frontend

React.js frontend for the University Examination & Assessment Management System.

## Tech Stack

- **React 18** with hooks
- **React Router v6** for routing
- **Tailwind CSS** for styling
- **Axios** for HTTP requests
- **Recharts** for analytics charts
- **jsPDF** for PDF generation
- **React Hot Toast** for notifications
- **Framer Motion** for animations
- **PapaParse** for CSV parsing

## Project Structure

```
src/
├── App.jsx                    # Root app with routes
├── index.js                   # Entry point
├── index.css                  # Tailwind + global styles
│
├── context/
│   ├── AuthContext.jsx        # JWT auth state management
│   └── ThemeContext.jsx       # Dark/light theme
│
├── hooks/
│   └── useApi.js              # API call hooks
│
├── services/
│   └── api.js                 # Axios instance + all API endpoints
│
├── utils/
│   ├── helpers.js             # Date formatting, grade helpers, etc.
│   └── pdfGenerator.js        # PDF result generation
│
├── components/
│   └── common/
│       ├── Layout.jsx         # Main layout with sidebar
│       ├── Sidebar.jsx        # Role-aware sidebar navigation
│       ├── ProtectedRoute.jsx # JWT + role-based route guard
│       ├── Modal.jsx          # Reusable modal dialog
│       ├── Table.jsx          # Data table + Pagination
│       ├── StatCard.jsx       # Dashboard stat card
│       ├── SearchBar.jsx      # Search input
│       ├── Badge.jsx          # Status badges
│       ├── ConfirmDialog.jsx  # Confirmation modal
│       └── EmptyState.jsx     # Empty state placeholder
│
└── pages/
    ├── auth/
    │   └── Login.jsx          # Unified login with demo buttons
    │
    ├── student/
    │   ├── StudentDashboard.jsx
    │   ├── StudentCourses.jsx
    │   ├── StudentExams.jsx
    │   ├── ExamAttempt.jsx    # Full exam UI with timer + anti-cheat
    │   ├── StudentResults.jsx
    │   └── ResultDetail.jsx   # Result with PDF download
    │
    ├── teacher/
    │   ├── TeacherDashboard.jsx
    │   ├── TeacherCourses.jsx
    │   ├── TeacherExams.jsx
    │   ├── ExamEditor.jsx     # Create/edit exam + questions
    │   ├── TeacherGrading.jsx # Grade subjective answers
    │   └── TeacherAnalytics.jsx
    │
    └── admin/
        ├── AdminDashboard.jsx
        ├── AdminDepartments.jsx
        ├── AdminTeachers.jsx
        ├── AdminStudents.jsx  # With bulk CSV upload
        ├── AdminCourses.jsx
        └── AdminLogs.jsx
```

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

The app will start at `http://localhost:3000` and proxy API calls to `http://localhost:5000`.

## Environment Variables

Create `.env` in the frontend root:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Demo Login Credentials

The login page has quick-fill buttons for demo access:

| Role    | Email                | Password  |
|---------|----------------------|-----------|
| Student | student@uni.edu      | demo123   |
| Teacher | teacher@uni.edu      | demo123   |
| Admin   | admin@uni.edu        | demo123   |

## Key Features

### Authentication
- JWT stored in localStorage
- Auto-logout on session expiry (2 hours)
- Role-based route protection
- Redirect to role-specific dashboard after login

### Student Portal
- Dashboard with upcoming exams and recent results
- Course enrollment view
- Exam attempt with countdown timer
- MCQ, True/False, Short Answer question types
- Flag for review, question navigator
- Auto-submit on timeout
- View results and download PDF report

### Anti-Cheat Features (ExamAttempt.jsx)
- Tab switch detection with 3-warning system
- Auto-submit after 3 tab switches
- Fullscreen enforcement
- Question shuffle support

### Teacher Portal
- Create and manage courses
- Full exam editor (details + questions)
- MCQ, True/False, Short Answer question builder
- Negative marking, question shuffle settings
- Grade subjective answers per submission
- Class analytics with charts (score distribution, pass/fail, per-question accuracy)
- Publish results to students

### Admin Portal
- System-wide dashboard with charts
- Department CRUD
- Teacher management with activate/suspend
- Student management with bulk CSV upload
- Course assignment (student/teacher enrollment)
- System audit logs

## Design System

The app uses a custom design system built on Tailwind CSS:

- **Dark/Light theme** via CSS variables and Tailwind `dark:` prefix
- **Color palette**: Primary (Indigo), Accent (Orange)
- **Typography**: Playfair Display (display), DM Sans (body), JetBrains Mono (code)
- **Components**: `.card`, `.btn-primary`, `.btn-secondary`, `.input`, `.badge-*`, `.table-cell`, etc.
