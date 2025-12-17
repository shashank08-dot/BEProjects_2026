# Team_39 – Smart Gateless Parking System Using LPR

# Gateless Parking Management System

## Project Title

Smart Gateless Parking System Using LPR

## Project Type

Full-Stack Web Application with Desktop ALPR Integration

## Branch

Computer Science and Engineering (CSE)

---

## 📌 Project Description

This project presents a comprehensive smart parking management system that eliminates the need for physical gates and barriers. The system enables users to find, book, and manage parking spots across Karnataka (Bangalore, Mysore, Hubli, etc.) through an intuitive web interface.

**Key Features:**

- **Automatic License Plate Recognition (ALPR)**: Real-time vehicle entry/exit detection using computer vision
- **Smart Booking System**: Search, reserve, and manage parking spots with real-time availability
- **Payment Integration**: Secure payment processing via Stripe
- **Security Features**: 
  - Threat/Weapon detection using YOLOv8
  - Fire detection and alerts
  - Text-to-speech security announcements
- **Real-time Monitoring**: Live tracking of vehicle entries, exits, and violations
- **Dashboard Analytics**: Revenue tracking, booking management, and location analytics
- **Multi-location Support**: Manage multiple parking locations from a single dashboard

---

## 🧠 Core Components

1. **Web Application (Next.js)**
   - User authentication (Clerk)
   - Booking management
   - Payment processing
   - Dashboard for administrators

2. **ALPR Desktop Application (Python/PyQt6)**
   - Real-time camera feed processing
   - License plate recognition
   - Entry/Exit detection
   - Backend API integration

3. **Security System**
   - Threat detection (YOLOv8)
   - Fire detection
   - Audio alerts (Text-to-Speech)

4. **Backend Services**
   - RESTful API endpoints
   - MongoDB database
   - Real-time data processing

---

## ⚙️ Technologies Used

### Frontend
- **Next.js 14** (React Framework)
- **TypeScript**
- **Tailwind CSS**
- **Radix UI** (Component Library)
- **React Hook Form** (Form Management)
- **Zustand** (State Management)

### Backend
- **Next.js API Routes**
- **MongoDB** (Database)
- **Mongoose** (ODM)

### ALPR System
- **Python 3.x**
- **PyQt6** (Desktop GUI)
- **OpenCV** (Computer Vision)
- **Ultralytics YOLO** (Object Detection)
- **NumPy** (Image Processing)

### Security & AI
- **YOLOv8** (Threat & Fire Detection)
- **Transformers** (Text-to-Speech)
- **Hugging Face Models**

### Services & Integrations
- **Clerk** (Authentication)
- **Stripe** (Payment Processing)
- **Google Maps API** (Location Services)
- **Resend** (Email Notifications)

---

## 📂 Project Structure

```
gatelessparking-main/
│── app/                          # Next.js application
│   ├── (guest)/                  # Public routes
│   │   ├── page.tsx              # Home page
│   │   ├── book/                 # Booking pages
│   │   └── mybookings/           # User bookings
│   ├── dashboard/                # Admin dashboard
│   │   ├── bookings/             # Booking management
│   │   ├── locations/            # Location management
│   │   └── revenue/              # Revenue analytics
│   ├── api/                      # API routes
│   │   ├── plate/                # License plate detection
│   │   ├── parkinglocation/      # Location management
│   │   └── security/             # Security endpoints
│   └── sign-in/                  # Authentication pages
│
├── Main/                         # ALPR Desktop Application
│   ├── main.py                   # Main ALPR application
│   ├── security_*.py             # Security modules
│   ├── requirements-security.txt # Python dependencies
│   └── model.pt                  # Fire detection model
│
├── components/                   # React components
│   ├── ui/                       # UI components
│   ├── map.tsx                   # Google Maps integration
│   ├── search-component.tsx      # Search functionality
│   └── ...
│
├── lib/                          # Utility libraries
│   ├── db.ts                     # Database connection
│   ├── google-maps.ts            # Maps utilities
│   └── security/                 # Security modules
│
├── schemas/                      # Database schemas
│   ├── booking.ts
│   ├── detection.ts
│   └── parking-locations.ts
│
├── actions/                      # Server actions
│   └── actions.ts
│
├── package.json                  # Node.js dependencies
├── next.config.mjs               # Next.js configuration
└── README.md                     # This file
```

---

## 🔧 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Required Variables

```env
# Database
MONGODB_URI=<your_mongodb_connection_string>

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<clerk_public_key>
CLERK_SECRET_KEY=<clerk_secret_key>
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Google Maps
NEXT_PUBLIC_MAPS_API_KEY=<google_maps_api_key>

# Payment Processing (Stripe)
NEXT_PUBLIC_STRIPE_APPLICATION_ID=<stripe_public_key>
STRIPE_SECRET_KEY=<stripe_secret_key>

# Email Notifications (Resend)
RESEND_API_KEY=<resend_api_key>
VIOLATION_EMAIL=<your_email_for_violations>
OVERSTAY_EMAIL=<your_email_for_overstays>

# ALPR API
APP_KEY=<your_app_key_for_alpr_api>
```

### Optional Variables (Security Features)

```env
# Security & AI Features
HF_API_TOKEN=<huggingface_token>
THREAT_DETECTION_MODEL=Subh775/Threat-Detection-YOLOv8n
TTS_MODEL=ai4bharat/indic-parler-tts

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
```

### ALPR Desktop App Configuration

Create a `.env` file in the `Main/` directory:

```env
# Backend API
BACKEND_API=http://localhost:3000/api/plate
APP_KEY=<your_app_key>

# Location Settings
LOCATION=Underground Parking Lot
LOCATION_ID=<location_id>
CAMERA_ID=<camera_id>
CAMERA_MODE=entry  # or "exit"

# Camera Configuration
FRAME_RESIZE_WIDTH=800
CAMERA_FPS=15
FRAME_SKIP=2

# Detection Settings
DETECTION_INTERVAL_MS=1000
COOLDOWN_TIME=15

# Security Features
ENABLE_THREAT_DETECTION=true
ENABLE_FIRE_DETECTION=true
ENABLE_TTS=true
```

---

## ▶️ How to Run the Project

### 1. Install Dependencies

**Web Application:**
```bash
npm install
# or
yarn install
# or
pnpm install
```

**ALPR Desktop Application:**
```bash
cd Main
pip install -r requirements-security.txt
```

### 2. Set Up Environment Variables

- Copy `.env.example` to `.env.local` (if available) or create `.env.local` manually
- Fill in all required environment variables (see above)

### 3. Run the Web Application

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run the ALPR Desktop Application

```bash
cd Main
python main.py
```

Or use the provided batch files:
- `start-entry-camera.bat` - Start entry camera
- `start-exit-camera.bat` - Start exit camera
- `start-both-cameras.bat` - Start both cameras

### 5. Access the Application

1. **User Flow**: Sign Up → Search Parking → Book Spot → Pay → Receive Confirmation
2. **Admin Flow**: Sign In → Dashboard → Manage Locations → View Bookings → Monitor Revenue
3. **ALPR Flow**: Start Desktop App → Camera Detects Vehicle → Plate Recognized → API Updates Booking Status

---

## 🔒 Security Features

### Threat Detection
- Detects weapons (guns, knives) in real-time using YOLOv8
- Automatic alerts with vehicle information
- Audio announcements via text-to-speech

### Fire Detection
- Real-time fire, flame, and smoke detection
- Immediate alerts to security personnel
- Email notifications for critical events

### API Endpoints
- `/api/security/threat-detection` - Detect threats in images
- `/api/security/fire-detection` - Detect fire in images
- `/api/security/text-to-speech` - Generate audio alerts
- `/api/security/alert` - Complete security alert pipeline

See [SECURITY_FEATURES.md](./SECURITY_FEATURES.md) for detailed documentation.

---

## 📱 Features

### For Users
- 🔍 **Smart Search**: Find parking spots by location, date, and time
- 📅 **Easy Booking**: Reserve parking spots in advance
- 💳 **Secure Payments**: Stripe-powered payment processing
- 📧 **Email Notifications**: Booking confirmations and reminders
- 📱 **My Bookings**: View and manage all your reservations

### For Administrators
- 📊 **Dashboard**: Real-time analytics and insights
- 🏢 **Location Management**: Add, edit, and manage parking locations
- 📈 **Revenue Tracking**: Monitor earnings and booking statistics
- 🚗 **Vehicle Tracking**: Real-time entry/exit monitoring
- ⚠️ **Violation Alerts**: Automatic detection of unauthorized vehicles

---

## 🚫 Large Files & Models

Due to GitHub file size limitations, the following files are not included in the repository:

- **YOLO Model Files** (`.pt` files for threat and fire detection)
- **Trained ALPR Models** (if using custom models)

### Model Setup

1. **Fire Detection Model**: Place `model.pt` in the `Main/` directory
2. **Threat Detection**: Uses Hugging Face model or local `threat.pt` file
3. **YOLOv8 Base Model**: Automatically downloaded on first run

---

## 📚 Additional Documentation

- [SECURITY_FEATURES.md](./SECURITY_FEATURES.md) - Security system documentation
- [SECURITY_QUICK_START.md](./SECURITY_QUICK_START.md) - Quick start guide for security features
- [GOOGLE_MAPS_SETUP.md](./GOOGLE_MAPS_SETUP.md) - Google Maps API setup
- [Main/QUICK_START.md](./Main/QUICK_START.md) - ALPR system quick start
- [Main/DUAL_CAMERA_SETUP_GUIDE.md](./Main/DUAL_CAMERA_SETUP_GUIDE.md) - Multi-camera setup

---

## 🛠️ Development

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- Python 3.8+
- MongoDB database
- Google Maps API key
- Clerk account (for authentication)
- Stripe account (for payments)

### Build for Production

```bash
npm run build
npm start
```

---

## ⚠️ Important Notes

- **Camera Setup**: Ensure cameras are properly configured and accessible
- **API Keys**: All API keys must be valid and have proper permissions
- **Database**: MongoDB connection must be active for the application to function
- **Network**: ALPR desktop app requires network connectivity to backend API
- **Security Models**: First run may take time to download AI models

---

## 📄 License

See [LICENSE](./LICENSE) file for details.

---

## 🤝 Contributing

This is a private project. For issues or suggestions, please contact the development team.

---

## ⚠️ Disclaimer

This system is developed for parking management purposes. Security features are supplementary and should not be the sole means of security in critical environments.
