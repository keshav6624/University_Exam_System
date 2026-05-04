# University Exam Management System — API Documentation

**Base URL:** `http://localhost:5000/api`  
**Auth:** Bearer JWT token in `Authorization` header

---

## Authentication (`/api/auth`)

### POST `/auth/login`
Login for all roles (admin, teacher, student).

**Request:**
```json
{ "email": "admin@university.edu", "password": "Password@123" }
```
**Response:**
```json
{ "success": true, "token": "jwt...", "user": { "id": 1, "name": "...", "role": "admin" } }
```

### GET `/auth/me`
Get current authenticated user profile. **Requires auth.**

### PUT `/auth/change-password`
**Requires auth.**
```json
{ "current_password": "old", "new_password": "newPassword@123" }
```

---

## AI Assistant (`/api/chatbot`)

### POST `/chatbot/message`
Send a question to the in-app assistant. **Requires auth.**

**Request:**
```json
{
  "message": "How do I start an exam?",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello!" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "reply": "Students can open the Exams page...",
  "source": "openai",
  "suggestions": ["How do I log in?", "How do I start an exam?"]
}
```

**Optional environment variables:**
```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

---

## Admin Portal (`/api/admin`) — Role: admin

### GET `/admin/dashboard`
Dashboard stats: total users, exams, courses, recent activity.

### Departments
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/departments?search=&page=&limit=` | List departments with user/course counts |
| POST | `/admin/departments` | Create department `{name, code, description}` |
| PUT | `/admin/departments/:id` | Update department |
| DELETE | `/admin/departments/:id` | Delete (fails if users assigned) |

### Teachers
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/teachers?search=&department_id=&page=` | List teachers |
| POST | `/admin/teachers` | Create teacher `{name, email, password, department_id, employee_id, phone}` |
| PUT | `/admin/teachers/:id` | Update teacher |

### Students
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/students?search=&department_id=&page=` | List students |
| POST | `/admin/students` | Create student |
| POST | `/admin/students/bulk` | Bulk CSV upload (multipart/form-data, field: `file`) |

**CSV Format:**
```
name,email,password,department_id,student_id,phone
John Doe,john@student.edu,Password@123,1,STU001,+1234567890
```

### Users
| Method | Route | Description |
|--------|-------|-------------|
| PUT | `/admin/users/:id/status` | `{status: "active"|"suspended"|"inactive"}` |

### Courses & Logs
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/courses?search=&page=` | All courses with teacher/student counts |
| POST | `/admin/courses/assign` | `{course_id, student_ids: [1,2,3]}` |
| GET | `/admin/logs?search=&action=&role=&page=` | System activity logs |

---

## Teacher Portal (`/api/teacher`) — Role: teacher

### GET `/teacher/dashboard`
Stats: courses, exams, pending submissions, pending grading.

### Courses
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/teacher/courses?search=&page=` | My courses |
| POST | `/teacher/courses` | `{title, code, description, credits, semester, academic_year, department_id}` |
| PUT | `/teacher/courses/:id` | Update course |

### Exams
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/teacher/exams?search=&course_id=&status=&page=` | My exams |
| GET | `/teacher/exams/:id` | Exam with questions |
| POST | `/teacher/exams` | Create exam |
| PUT | `/teacher/exams/:id` | Update exam |
| DELETE | `/teacher/exams/:id` | Delete (draft/published only) |

**Create Exam Body:**
```json
{
  "title": "Midterm Exam",
  "course_id": 1,
  "exam_type": "midterm",
  "start_time": "2024-12-01T09:00:00Z",
  "end_time": "2024-12-01T11:00:00Z",
  "duration_minutes": 90,
  "total_marks": 50,
  "pass_marks": 20,
  "negative_marking": 0.25,
  "shuffle_questions": true,
  "instructions": "Read carefully..."
}
```

**Exam Status Flow:** `draft → published → active → completed → results_published`

### Questions
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/teacher/exams/:examId/questions` | Add question |
| PUT | `/teacher/exams/:examId/questions/:qId` | Update question |
| DELETE | `/teacher/exams/:examId/questions/:qId` | Delete question |

**Question Body (MCQ):**
```json
{
  "question_text": "What is O(1)?",
  "question_type": "mcq",
  "options": [{"text":"O(n)"}, {"text":"Constant"}, {"text":"O(log n)"}],
  "correct_answer": "Constant",
  "marks": 2,
  "explanation": "O(1) means constant time.",
  "order_index": 1
}
```

**Question Types:** `mcq` | `true_false` | `short_answer`

### Grading & Results
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/teacher/exams/:examId/submissions?search=&page=` | All submissions |
| PUT | `/teacher/submissions/:subId/grade` | Manually grade short answers |
| POST | `/teacher/exams/:examId/publish` | Publish results to students |
| GET | `/teacher/exams/:examId/analytics` | Class analytics |

### Advanced Intelligence (Phases 2-4)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/teacher/exams/:examId/reasoning-graph` | Concept misconception graph |
| GET | `/teacher/exams/:examId/quality-radar` | Question quality scorecard |
| GET | `/teacher/exams/:examId/plagiarism-risk` | Short answer similarity + style drift |
| GET | `/teacher/exams/:examId/workload-balance` | Grading queue prioritization |
| POST | `/teacher/exams/:examId/adaptive-viva/run` | Trigger viva candidate detection |
| POST | `/teacher/exams/:examId/equate` | Equated score model for fairness |
| GET | `/teacher/exams/:examId/digital-twin` | Predicted outcomes simulation |

**Grade Submission Body:**
```json
{
  "grades": [
    { "question_id": 5, "marks_awarded": 3, "feedback": "Good explanation" }
  ]
}
```

---

## Student Portal (`/api/student`) — Role: student

### GET `/student/dashboard`
Stats: enrolled courses, upcoming exams, available results.

### GET `/student/courses`
All enrolled courses with teacher info.

### Exams
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/student/exams?filter=upcoming\|past&course_id=` | List exams |
| GET | `/student/exams/:id` | Exam details |
| POST | `/student/exams/:id/start` | Start/resume exam → returns questions + timer |
| POST | `/student/exams/:id/autosave` | Recovery-safe autosave during exam |
| POST | `/student/exams/:id/submit` | Submit answers |

**Submit Body:**
```json
{
  "answers": [
    { "question_id": 1, "answer": "Constant" },
    { "question_id": 2, "answer": "True" },
    { "question_id": 3, "answer": "Stack uses LIFO, Queue uses FIFO" }
  ],
  "auto_submitted": false,
  "time_taken": 1450,
  "tab_switches": 0
}
```

### Results
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/student/results?page=` | All published results |
| GET | `/student/results/:submission_id` | Detailed result with answers |
| GET | `/student/results/:submission_id/dispute-pack` | Trust audit pack for disputes |
| GET | `/student/transcript` | Skill transcript from performance history |

### Admin Audit
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/audit/disputes/:submissionId` | Full dispute audit trail for admin review |

---

## Response Format

All responses follow:
```json
{
  "success": true|false,
  "message": "...",
  "data": {}
}
```

**Pagination (on list endpoints):**
```json
{
  "pagination": {
    "total": 100, "page": 1, "limit": 10,
    "totalPages": 10, "hasNext": true, "hasPrev": false
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email" }]
}
```

## Status Codes
| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized (missing/invalid/expired token) |
| 403 | Forbidden (wrong role / suspended) |
| 404 | Not Found |
| 409 | Conflict (duplicate email/code) |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
