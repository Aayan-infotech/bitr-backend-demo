<div align="center">

# 🎯 All In The Ring – Backend

### Enterprise-Grade Training & Rehabilitation Management API  
Built with **Node.js · Express · MongoDB · Firebase · Docker**

---

🚀 Scalable • 🔐 Secure • 🏗 Modular • ☁️ Cloud Ready

</div>

---

# 📌 Project Overview

**All In The Ring – Backend** is a Norway-based training and rehabilitation management system designed to manage structured learning programs for community users and prisoners within correctional facilities.

The platform enables secure, role-based operations across administrative, educational, and rehabilitation workflows while maintaining strict hierarchical communication and institutional-grade data security.

---

# 🎯 Key Capabilities

- Admin management  
- Structured mentorship hierarchy  
- Location-based class scheduling  
- Attendance tracking (users & prisoners)  
- Progress and milestone reporting  
- Reward system management  
- Push notifications  
- Support ticket system  
- Incident reporting  
- Dynamic static content management  

---

# ✨ Core Features

- 🔐 JWT Authentication & Role-Based Access Control (RBAC)  
- 👥 Multi-Role Hierarchy (Admin, Mentor, Instructor, User)  
- 📅 Location-Based Class Scheduling  
- 📝 Instructor-Managed Attendance System  
- 📊 Progress & Milestone Tracking  
- 🏆 Participation-Based Reward System  
- 📄 PDF Progress Report Generation  
- 💬 Hierarchy-Restricted Communication  
- 🔔 Firebase Push Notifications  
- 📬 Support Ticket Management  
- 🚨 Incident Reporting Module  
- 📜 Static Content Management (Privacy, Terms, About)  
- ⏱ Cron-Based Background Processing  
- 🐳 Docker Container Support  
- 🔄 Jenkins CI/CD Integration  

---

# 🏗 Architecture

The backend follows a modular MVC-inspired architecture:

```
Routes → Middlewares → Controllers → Services → Models → Database
```

### Architecture Principles

- Clear separation of concerns  
- Service-layer abstraction  
- Centralized logging & structured error handling  
- Input validation middleware  
- Security & rate-limiting middleware  
- Soft delete with rollback support  
- Cron-based background processing  

---

# 🛠 Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (Mongoose ODM) |
| Authentication | JWT |
| Notifications | Firebase Cloud Messaging |
| Email | Nodemailer |
| Background Jobs | node-cron |
| DevOps | Docker + Jenkins |
| Architecture | Modular & Scalable |

---

# 📦 Main Dependencies

| Package | Purpose |
|----------|----------|
| express | REST API framework |
| mongoose | MongoDB object modeling |
| jsonwebtoken | Authentication |
| bcrypt | Password hashing |
| firebase-admin | Push notifications |
| nodemailer | Email services |
| node-cron | Background job scheduling |
| multer | File uploads |
| dotenv | Environment configuration |
| cors | Cross-origin support |
| winston / morgan | Logging middleware |

---

# 👥 User Roles & Hierarchy

| Role | Responsibilities |
|------|------------------|
| **Admin** | Manages users, classes, notifications, support, static content |
| **Mentor** | Supervises instructors, assigns activities, tracks progress |
| **Instructor** | Conducts classes, marks attendance, manages prisoner records |
| **User** | Registers for classes, submits journals, tracks milestones |

⚠️ **Important:**  
Prisoners do not directly access the system. Instructors manage attendance, progress, and records on their behalf.

---

# 📚 API Structure

| Endpoint Group | Description |
|----------------|-------------|
| `/auth` | Authentication & authorization |
| `/classes` | Class management |
| `/register-class` | Class registration |
| `/attendance` | Attendance tracking |
| `/mentorship` | Mentorship activities |
| `/milestones` | Progress & rewards |
| `/notifications` | Push notifications |
| `/support` | Support tickets |
| `/incidents` | Incident reporting |
| `/static-content` | Privacy, Terms, About |
| `/location` | Location assignments |
| `/admin` | Admin operations |
| `/instructor` | Instructor operations |
| `/mentor` | Mentor operations |

All routes follow RESTful standards and are protected with appropriate authentication and role-based middleware.

---

# 📂 Project Structure

```bash
all-in-the-ring-backend/
├── config/         # Database & Firebase configuration
├── controllers/    # Business logic (role-based)
│   ├── admin/
│   ├── mentor/
│   ├── instructor/
│   └── user/
├── cron/           # Background jobs
├── logs/           # Application logs
├── middlewares/    # Authentication, validation, rate limiting
├── models/         # Mongoose schemas
├── routes/         # API route definitions
├── services/       # Reusable business logic
├── utils/          # Helper utilities
├── Dockerfile      # Container setup
├── Jenkinsfile     # CI/CD pipeline
├── server.js       # Application entry point
└── package.json
```

---

# ⚙️ Installation

## 1️⃣ Clone Repository

```bash
git clone <repository-url>
cd all-in-the-ring-backend
```

## 2️⃣ Install Dependencies

```bash
npm install
```

---

# ▶️ Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

Server runs at:

```
http://localhost:5000
```

---

# 🌍 Environment Variables

Create a `.env` file in the root directory:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
```

⚠️ Never commit the `.env` file to version control.

---

# 🔒 Security Features

- JWT-based authentication  
- Role-based access control (RBAC)  
- Input validation middleware  
- API rate limiting  
- Secure environment configuration  
- Centralized logging  
- Soft delete with recovery capability  

---

# 🐳 Docker Deployment

Build Docker image:

```bash
docker build -t all-in-the-ring-backend .
```

Run container:

```bash
docker run -p 5000:5000 all-in-the-ring-backend
```

---

# 🔄 CI/CD Pipeline (Jenkins)

The Jenkins pipeline automates:

- Dependency installation  
- Docker image build  
- Test execution  
- Production deployment  

---

# 📜 Logging & Monitoring

- Centralized logger middleware  
- Logs stored in `/logs` directory  
- Request & response logging  
- Structured error tracking for debugging and monitoring  

---

# 📈 Scalability & Design Principles

- Modular architecture  
- Strict separation of concerns  
- Reusable services (DRY principle)  
- Background job automation  
- Soft delete with rollback  
- Structured mentorship hierarchy  

---

# 📌 Production Status

✅ Production-ready  
✅ Secure & scalable  
✅ Modular & maintainable  
✅ Designed for institutional deployment  

---

# 📬 Contact & Support

For questions, support, or contributions:

- Contact the development team  
- Or create a support ticket within the system  

---