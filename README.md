# 🎓 University Examination Management System

A full-stack web application for managing university-level examinations, built with modern technologies. It supports role-based access for **Admin**, **Teacher**, and **Student**, enabling seamless exam creation, management, and evaluation.

🌐 **Live Demo:** https://university-exam-system-zzs7.vercel.app/

---

## 🚀 Features

### 🔐 Authentication & Authorization

* Secure login using JWT
* Role-based access control (Admin / Teacher / Student)
* Password change functionality

---

### 👨‍💼 Admin Panel

* Manage departments
* Create & manage teachers and students
* Assign courses
* View system logs and analytics
* Bulk upload students (CSV)

---

### 👩‍🏫 Teacher Dashboard

* Create and manage courses
* Create exams with questions
* Add/update/delete questions
* View student submissions
* Grade exams and publish results
* Analytics for exam performance

---

### 👨‍🎓 Student Portal

* View enrolled courses
* Attempt exams
* Submit answers
* View results and performance

---

## 🛠️ Tech Stack

### Frontend

* React (Vite)
* React Router
* Axios
* Tailwind CSS
* Recharts (analytics)
* Framer Motion (UI animations)

### Backend

* Node.js
* Express.js
* PostgreSQL
* JWT Authentication

### Deployment

* Frontend: Vercel
* Backend: Render

---
## 📁 Project Structure

UNIVERSITY-EXAM-SYSTEM/
│
├── backend/
│   ├── config/              # Database configuration
│   ├── controllers/         # Business logic (Admin, Auth, Teacher, Student)
│   ├── middleware/          # Auth, validation, error handling
│   ├── routes/              # API route definitions
│   ├── uploads/             # File uploads
│   ├── utils/               # Helper utilities & DB setup
│   ├── server.js            # Main backend entry point
│   └── schema.sql           # Database schema
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page-level components
│   │   ├── services/        # API calls (axios)
│   │   ├── context/         # Global state management
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Frontend utilities
│   │   ├── App.jsx          # Root component
│   │   └── main.jsx         # Entry point (Vite)
│   │
│   ├── public/              # Static assets
│   ├── index.html           # Vite root HTML
│   └── vite.config.js       # Vite configuration
│
├── .gitignore
├── package.json
└── README.md

---

## ⚙️ Environment Variables

### 🔹 Frontend (`.env`)

```env
VITE_API_URL=https://your-backend.onrender.com
```

---

### 🔹 Backend (`.env`)

```env
PORT=5002
DATABASE_URL=your_postgresql_connection
JWT_SECRET=your_secret_key
FRONTEND_URL=https://university-exam-system-zzs7.vercel.app
```

---

## 🧪 Running Locally

### 1️⃣ Clone the repo

```bash
git clone <your-repo-url>
cd project-root
```

---

### 2️⃣ Backend setup

```bash
cd backend
npm install
npm run dev
```

---

### 3️⃣ Frontend setup

```bash
cd frontend
npm install
npm run dev
```

---

### 4️⃣ Open in browser

```text
http://localhost:5173
```

---

## 🔒 CORS Configuration

Backend allows:

* Local development (`localhost`)
* Production frontend (Vercel)

Ensure:

```env
FRONTEND_URL=https://your-vercel-app.vercel.app
```

---

## ⚠️ Known Issues / Notes

* CORS must be correctly configured for production
* Environment variables must match exact URLs (no trailing `/`)
* Ensure Vite env variables use `VITE_` prefix

---

## 📈 Future Improvements

* Email notifications
* AI-based proctoring
* Real-time exam monitoring
* Mobile responsiveness enhancements
* Advanced analytics dashboards

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first.

---

## ⭐ Acknowledgements

* React ecosystem
* Vercel & Render for deployment
* Open-source community

---
