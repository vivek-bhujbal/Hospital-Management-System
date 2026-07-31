# Hospital Management System

A full-stack, end-to-end Hospital Management platform built with a FastAPI backend and Next.js frontend. It features 4 distinct modules with real-time UI polling, JWT-based authentication, and a scalable MySQL database.

## 🚀 Tech Stack
- **Frontend**: Next.js (App Router), React 18, Tailwind CSS, TypeScript
- **Backend**: FastAPI, SQLAlchemy, PyJWT, Passlib, Uvicorn
- **Database**: MySQL

## 👤 Roles and Features
1. **Patient**: Book appointments, view medical history, see billing and dues.
2. **Receptionist**: Register walk-in patients, manage today's queue (check-in), book appointments, and collect payments (generate receipts).
3. **Doctor**: View daily consultation queue, write prescriptions, and complete active appointments.
4. **Admin**: View hospital-wide analytics, manage doctor profiles, and review total collected revenue vs. pending dues.

---

## 💻 Setup Instructions

### 1. Database (MySQL) Setup
Ensure you have MySQL installed and running (default port `3306`).
1. Log in to MySQL as root (or another user):
   ```bash
   mysql -u root -p
   ```
2. Create the database:
   ```sql
   CREATE DATABASE hospital_management;
   ```

### 2. Backend (FastAPI) Setup
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/Scripts/activate # Windows
   # source venv/bin/activate # Mac/Linux
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up the `.env` file (update your `DATABASE_URL` with your exact DB credentials):
   ```env
   DATABASE_URL=mysql+pymysql://root:root@localhost:3306/hospital_management
   JWT_SECRET=your_super_secret_key
   JWT_ALGORITHM=HS256
   ```
5. Initialize the Database tables:
   ```bash
   python init_db.py
   ```
6. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### 3. Frontend (Next.js) Setup
1. Open a new terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies via npm:
   ```bash
   npm install
   ```
3. Set up the `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Run the Next.js development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser. Register an account and test the different roles!

---

## 🚢 Deployment

### Running with Docker Compose (Recommended)
The entire stack (MySQL Database, FastAPI Backend, Next.js Frontend) can be spun up seamlessly using Docker Compose.

1. Ensure Docker and Docker Compose are installed on your machine.
2. From the root directory of the project, run:
   ```bash
   docker-compose up --build -d
   ```
3. The services will be available at:
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:8000](http://localhost:8000)
   - **Database**: `localhost:3306`

*Note: The frontend is configured to talk to the backend container internally via `http://backend:8000`, and the backend connects to the database via `db:3306`.*

### Deploying the Frontend (Vercel)
The Next.js frontend is fully compatible with Vercel out-of-the-box.
1. Push your code to GitHub.
2. Import the project in the Vercel dashboard.
3. Ensure the **Root Directory** is set to `frontend`.
4. Add the `NEXT_PUBLIC_API_URL` environment variable pointing to your deployed FastAPI backend URL.
5. Click **Deploy**.
