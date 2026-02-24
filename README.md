<div align="center">

# 🎯 All In The Ring – Backend

### Enterprise-Grade Training & Rehabilitation Management API  
Built with **Node.js | Express | MongoDB | Firebase | Docker**

---

🚀 Scalable • 🔐 Secure • 🏗 Modular • ☁️ Cloud Ready

</div>

---

# 📌 Project Description

**All In The Ring Backend** is a Norway-based training and rehabilitation management system designed to manage structured learning programs for community users and prisoners within correctional facilities.

The platform enables secure, role-based operations including:

- Admin management  
- Mentorship hierarchy  
- Class scheduling  
- Attendance tracking  
- Progress & milestone reporting  
- Notifications  
- Support ticket system  
- Incident reporting  

The system is built with clean architecture principles to ensure scalability, maintainability, and strict hierarchical communication.

---

# ✨ Core Features

- 🔐 JWT Authentication & Role-Based Access Control (RBAC)  
- 👥 Multi-Role Hierarchy (Admin, Mentor, Instructor, User)  
- 📅 Location-Based Class Scheduling  
- 📝 Attendance Tracking (Users & Prisoners via Instructor)  
- 📊 Progress & Milestone Reporting  
- 🏆 Reward System Based on Participation  
- 📄 PDF Progress Report Generation  
- 💬 Hierarchy-Restricted Communication  
- 🔔 Firebase Push Notifications  
- 📬 Support Ticket Management  
- 🚨 Incident Reporting System  
- 📜 Dynamic Static Content Management  
- ⏱ Cron-Based Background Jobs  
- 🐳 Docker Support  
- 🔄 Jenkins CI/CD Ready  

---

# 🏗 Architecture Highlights

- Modular MVC-Inspired Architecture  
- Clean Separation of Concerns  
- Service Layer Abstraction  
- Centralized Logging & Error Handling  
- Input Validation Middleware  
- Rate Limiting & Security Middleware  
- Soft Delete with Rollback Support  
- Background Job Processing (Cron)  

---

# 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
Runtime | Node.js |
Framework | Express.js |
Database | MongoDB (Mongoose) |
Authentication | JWT |
Notifications | Firebase Cloud Messaging |
Email | Nodemailer |
Validation | Custom Middleware |
Background Jobs | Node Cron |
DevOps | Docker + Jenkins |
Architecture | Modular & Scalable |

---

# 📦 Main Dependencies

| Package | Purpose |
|----------|----------|
express | REST API framework |
mongoose | MongoDB ODM |
jsonwebtoken | Authentication |
bcrypt | Password hashing |
firebase-admin | Push notifications |
nodemailer | Email notifications |
node-cron | Background jobs |
multer | File handling |
dotenv | Environment configuration |
cors | Cross-origin support |
winston/morgan | Logging middleware |

---

# 🧪 Available Scripts

| Script | Purpose |
|--------|----------|
npm run dev | Start server in development mode |
npm start | Start production server |

---

# 👥 User Roles & Hierarchy

| Role | Responsibilities |
|------|------------------|
Admin | Manages users, classes, notifications, support, static content |
Mentor | Supervises instructors, assigns activities, tracks progress |
Instructor | Conducts classes, marks attendance, manages prisoner records |
User | Registers for classes, submits journals, tracks milestones |

⚠️ **Prisoners do not access the system directly.**  
Instructors manage their attendance, progress, and records.

---

# 📚 API Structure

| Endpoint Group | Description |
|----------------|-------------|
/auth | Authentication & authorization |
/classes | Class management |
/register-class | Class registration |
/attendance | Attendance tracking |
/mentorship | Mentorship activities |
/milestones | Progress & rewards |
/notifications | Push notifications |
/support | Support tickets |
/incidents | Incident reporting |
/static-content | Privacy, Terms, About |
/location | Location assignments |
/admin | Admin operations |
/instructor | Instructor operations |
/mentor | Mentor operations |

---

# 📂 Project Structure

```bash
all-in-the-ring-backend/
├── config/         # DB & Firebase configuration
├── controllers/    # Business logic (role-based)
│   ├── admin/
│   ├── mentor/
│   ├── instructor/
│   └── user/
├── cron/           # Background jobs
├── logs/           # Application logs
├── middlewares/    # Auth, validation, rate limiting
├── models/         # Mongoose schemas
├── routes/         # API routes
├── services/       # Reusable business logic
├── utils/          # Helper utilities
├── Dockerfile      # Container setup
├── Jenkinsfile     # CI/CD pipeline
├── server.js       # Entry point
└── package.json

# ⚙️ Installation

git clone <repo-url>
cd all-in-the-ring-backend
npm install


▶️ Running the Application
# Development
npm run dev

# Production
npm start

Server will start on:

http://localhost:5000
🌍 Environment Variables

Create a .env file:

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

⚠️ Never commit .env to version control.

🔒 Security Features

JWT-based authentication

Role-based access control

Input validation middleware

API rate limiting

Secure environment handling

Centralized logging

Soft delete with recovery

🐳 Docker Support
docker build -t all-in-the-ring-backend .
docker run -p 5000:5000 all-in-the-ring-backend
🔄 CI/CD (Jenkins)

The Jenkins pipeline automates:

Dependency installation

Docker image build

Test execution

Production deployment

📜 Logging

Centralized logger middleware

Logs stored in /logs directory

Request/response logging

Error tracking for debugging

📈 Scalability & Design Principles

Modular architecture

Separation of concerns

Reusable services (DRY)

Background job automation

Soft delete with rollback

Structured mentorship hierarchy

📌 Production Status

✅ Production-ready
✅ Secure & scalable
✅ Modular & maintainable
✅ Designed for institutional deployment

📬 Contact & Support

For questions, support, or contributions, please contact the development team or create a support ticket within the system.

<div align="center">


</div> ```