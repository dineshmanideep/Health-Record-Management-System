# Health Record Management System

A comprehensive health record management system that centralizes patient health records, allowing patients to access their medical history from any hospital and enabling healthcare providers to make informed decisions quickly.

## 🏥 Features

### For Patients
- Centralized health record storage with detailed health information
- Access medical history anytime, anywhere
- View prescriptions and test reports
- Share records with any hospital
- Store blood group, emergency contacts, and address information

### For Doctors
- View complete patient history instantly
- Create prescriptions and treatment plans
- Collaborate with healthcare professionals
- Track specialization, qualifications, and experience

### For Nurses
- Manage assigned patients
- Update patient vital signs
- Track medication administration
- Manage daily tasks and schedules
- Shift management (Morning/Evening/Night)
- Department assignment tracking

### For Hospitals
- Manage doctors, nurses, and departments
- Address and contact information management

### For Admins
- System-wide user management
- Hospital management
- Generate reports and analytics
- Configure system settings
- Multi-level access control (Admin/Super Admin/Moderator)


## 🛠️ Tech Stack

### Frontend
- **Vite** v7.3.1 - Build tool
- **React** v19.2.0 - UI library
- **React Router DOM** v7.13.1 - Routing
- **Axios** v1.13.6 - HTTP client
- **Tailwind CSS** v4.2.1 - Utility-first CSS framework
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

### Backend
- **Node.js** - Runtime environment
- **Express** v5.2.1 - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** v9.2.4 - ODM (Object Data Modeling)
- **JWT** (jsonwebtoken) v9.0.3 - Authentication
- **bcryptjs** v3.0.3 - Password hashing
- **CORS** - Cross-Origin Resource Sharing
- **dotenv** - Environment variable management

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running locally or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Edit the `.env` file and update:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/health-record-system
JWT_SECRET=your_jwt_secret_key_change_this_in_production
NODE_ENV=development
```

4. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

##  User Roles (TBD)

The system supports 5 different user roles




## 🗄️ Database Models

### User Model
- Personal information
- Medical records
- Emergency contacts
- Blood group

### Doctor Model
- Professional credentials
- Specialization
- Hospital affiliation
- Patient list
- Consultation fees

### Nurse Model
- Qualifications
- Department assignment
- Shift information
- Assigned patients

### Hospital Model
- Registration details
- Address and contact
- Facilities and departments
- Bed availability
- Staff (doctors and nurses)

### Admin Model
- System permissions
- Access levels
- Activity tracking




