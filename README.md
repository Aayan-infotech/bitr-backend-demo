🎯 All In The Ring – Backend
A Norway-based training and rehabilitation management system backend designed to manage structured learning programs for community users and prisoners within correctional facilities.

This backend enables secure, role-based operations including:

Admin management

Mentorship hierarchy

Class scheduling

Attendance tracking

Progress & milestone reporting

Notifications

Support system

Incident reporting

Built with scalability, modularity, and clean architecture principles.

🚀 Tech Stack
Technology	Purpose
Node.js	Runtime environment
Express.js	REST API framework
MongoDB	NoSQL database
Mongoose	ODM for MongoDB
Firebase	Push notifications
JWT	Authentication
Docker	Containerization
Jenkins	CI/CD pipeline
🏗 Architecture Overview
The backend follows a modular MVC-inspired structure:

text
Routes → Middlewares → Controllers → Services → Models → Database
Component Breakdown
Layer	Responsibility
Models	Database schemas (Mongoose)
Controllers	Business logic & request handling
Routes	API endpoint definitions
Middlewares	Authentication, validation, rate limiting
Services	Reusable business logic
Utils	Helper utilities
Cron	Background jobs
Config	External integrations (DB, Firebase)
This structure ensures:

✅ Clean separation of concerns

✅ Easy scalability

✅ Maintainability

✅ Clear responsibility boundaries

📁 Project Structure
text
all-in-the-ring-backend/
├── config/                  # Database & Firebase configuration
├── controllers/             # Application business logic
│   ├── admin/               # Admin-specific controllers
│   ├── mentor/              # Mentor-specific controllers
│   ├── instructor/          # Instructor-specific controllers
│   └── user/                # User-specific controllers
├── cron/                     # Background jobs
├── logs/                      # Log files
├── middlewares/               # Auth, validation, rate limiting
├── models/                    # Mongoose schemas
├── routes/                    # REST API routes
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── classRoutes.js
│   └── ...
├── services/                  # Core reusable logic
├── utils/                     # Helper utilities
├── Dockerfile                 # Docker container setup
├── Jenkinsfile                # CI/CD configuration
├── server.js                  # Application entry point
└── package.json               # Project dependencies
👥 User Roles & Hierarchy
The system supports four primary roles with strict permissions:

🔹 Admin
Manages users, mentors, instructors, prisoners

Creates & manages classes

Sends mass notifications

Handles static content (Privacy, Terms, About)

Manages support tickets

🔹 Mentor
Supervises instructors

Creates mentorship activities

Assigns users to activities

Tracks user progress

🔹 Instructor
Conducts assigned classes

Creates & manages prisoner profiles

Marks attendance (users & prisoners)

Provides session feedback

Manages assigned users

🔹 User
Registers for available classes

Submits journals & questionnaires

Tracks progress & earns rewards

Communicates with mentor/instructor

⚠ Note: Prisoners do not directly access the system. Instructors manage all attendance, progress, and records on their behalf.

📚 Core Features
🔐 Authentication & Authorization
JWT-based authentication

Role-based access control (RBAC)

Secure password hashing

OTP verification support

📅 Class Management
Location-based class creation

Daily/weekly/monthly schedules

Instructor assignment

User registration system

📝 Session Management
Notes & journals

Questionnaires

Feedback collection

Attendance tracking

🏆 Progress & Rewards
Milestone tracking

Reward system based on attendance

PDF progress report generation

Performance monitoring

💬 Communication
One-to-one chat (hierarchy-restricted)

Push notifications (Firebase)

Mass notifications (Admin)

🛠 Support & Incidents
Support ticket system

Incident reporting

Admin ticket management

📄 Content Management
Dynamic static content (Privacy, Terms, About)

Soft delete with rollback capability

Audit logging

⏱ Background Jobs
Cron jobs for data integrity

Automated report generation

Notification scheduling

🔒 Security Features
✅ JWT-based authentication

✅ Role-based access control (RBAC)

✅ Input validation middleware

✅ API rate limiting

✅ Server rate limiting

✅ Secure environment variable handling

✅ Logging middleware

✅ Soft delete tracking & rollback

📊 API Structure
All APIs follow RESTful standards and are grouped by domain:

Endpoint Group	Description
/auth	Authentication & authorization
/classes	Class management
/register-class	Class registration
/attendance	Attendance marking & tracking
/mentorship	Mentorship activities
/milestones	Progress & rewards
/notifications	Push & in-app notifications
/support	Support tickets
/incidents	Incident reporting
/static-content	Privacy, Terms, About
/location	Location-based assignments
/admin	Admin operations
/instructor	Instructor operations
/mentor	Mentor operations
Each route is modular and mapped to its respective controller with proper middleware protection.

⚙️ Environment Setup
1️⃣ Clone the Repository
bash
git clone <repository-url>
cd all-in-the-ring-backend
2️⃣ Install Dependencies
bash
npm install
3️⃣ Configure Environment Variables
Create a .env file in the root directory:

env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
⚠ Never commit sensitive credentials to version control.

4️⃣ Run the Application
Development Mode:

bash
npm run dev
Production Mode:

bash
npm start
🐳 Docker Deployment
Build Docker Image
bash
docker build -t all-in-the-ring-backend .
Run Container
bash
docker run -p 5000:5000 all-in-the-ring-backend
🔄 CI/CD (Jenkins)
The project includes a Jenkinsfile that automates:

Dependency installation

Docker image build

Test execution

Production deployment

📄 Logging
Centralized logger middleware

Logs stored in /logs directory

Request/response logging

Error tracking for debugging & monitoring

📈 Scalability & Design Principles
✅ Modular architecture – Easy to add new features

✅ Separation of concerns – Clean, maintainable code

✅ Reusable services – DRY principle

✅ Background job processing – Cron-based automation

✅ Soft delete with recovery – Data safety

✅ Structured mentorship hierarchy – Clear role workflows

📌 Production Status
✅ Production-ready
✅ Modular & maintainable
✅ Secure & scalable
✅ Designed for structured training & rehabilitation systems

📬 Contact & Support
For questions, support, or contributions, please reach out to the development team or create a support ticket within the system.