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

Node.js – Runtime environment

Express.js – REST API framework

MongoDB – NoSQL database

Mongoose – ODM for MongoDB

Firebase – Push notifications

JWT – Authentication

Docker – Containerization

Jenkins – CI/CD pipeline

🏗 Architecture Overview

The backend follows a modular MVC-inspired structure:

Models       → Database schemas
Controllers  → Business logic
Routes       → API endpoints
Middlewares  → Authentication & validation
Services     → Reusable business logic
Utils        → Helper utilities
Cron         → Background jobs
Config       → External integrations

This structure ensures:

Clean separation of concerns

Easy scalability

Maintainability

Clear responsibility boundaries

📁 Project Structure
all-in-the-ring-backend/
├─ config/                  # Database & Firebase configuration
├─ controllers/             # Application business logic
├─ cron/                    # Background jobs
├─ logs/                    # Log files
├─ middlewares/             # Auth, validation, rate limiting
├─ models/                  # Mongoose schemas
├─ routes/                  # REST API routes
├─ services/                # Core reusable logic
├─ utils/                   # Helper utilities
├─ Dockerfile               # Docker container setup
├─ Jenkinsfile              # CI/CD configuration
├─ server.js                # Application entry point
└─ package.json             # Project dependencies
👥 User Roles & Hierarchy

The system supports four primary roles:

🔹 Admin

Manages users, mentors, instructors, prisoners

Creates & manages classes

Sends notifications

Handles static content

Manages support tickets

🔹 Mentor

Supervises instructors

Creates mentorship activities

Assigns users to activities

Tracks user progress

🔹 Instructor

Conducts classes

Creates prisoner profiles

Marks attendance

Provides session feedback

Manages assigned users

🔹 User

Registers for classes

Submits journals & questionnaires

Tracks progress & rewards

Communicates with mentor/instructor

⚠ Prisoners do not directly access the system. Instructors manage attendance and records on their behalf.

📚 Core Features

Role-based authentication & authorization

Location-based class management

Session-based attendance tracking

Journal & notes modules

Questionnaire system

Milestone & reward tracking

Mentorship activity management

Instructor-user assignment system

One-to-one chat support

Push notifications (Firebase)

Incident reporting

Support ticket system

Dynamic static content management

Soft delete with rollback capability

PDF progress report generation

Background cron jobs for data integrity

🔐 Security Features

JWT-based authentication

Role-based access control (RBAC)

Input validation middleware

API rate limiting

Server rate limiting

Secure environment variable handling

Logging middleware

Soft delete tracking & rollback

📊 API Structure

All APIs follow RESTful standards and are grouped by domain:

/auth
/classes
/register-class
/attendance
/mentorship
/milestones
/notifications
/support
/incidents
/static-content
/location
/admin
/instructor
/mentor

Each route is modular and mapped to its respective controller.

⚙️ Environment Setup
1️⃣ Clone the repository
git clone <repository-url>
cd all-in-the-ring-backend
2️⃣ Install dependencies
npm install
3️⃣ Configure Environment Variables

Create a .env file in the root directory:

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email

Ensure sensitive credentials are never committed.

4️⃣ Run the application

Development mode:

npm run dev

Production mode:

npm start
🐳 Docker Deployment

Build Docker image:

docker build -t all-in-the-ring-backend .

Run container:

docker run -p 5000:5000 all-in-the-ring-backend
🔄 CI/CD (Jenkins)

The project includes a Jenkinsfile to:

Install dependencies

Build Docker image

Run tests

Deploy to server

📄 Logging

Centralized logger middleware

Logs stored in /logs

Useful for debugging & monitoring

📈 Scalability & Design Principles

Modular architecture

Clear separation of business logic

Reusable services layer

Background job processing

Soft delete with recovery

Structured mentorship hierarchy

📌 Production Status

This backend is:

Production-ready

Modular

Secure

Scalable

Designed for structured training & rehabilitation systems