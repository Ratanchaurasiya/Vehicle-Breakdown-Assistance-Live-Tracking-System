# AutoRescue - Roadside Assistance Platform

Welcome to **AutoRescue**, a real-time vehicle breakdown assistance and garage management platform. This project provides an end-to-end simulation of a roadside rescue control room that coordinates interaction between **Customers**, **Mechanics**, and **Platform Admins**.

---

## 🚀 Quick Start Instructions

This project is organized as a monorepo with separate `frontend` and `backend` services. Scripts in the root directory make setup simple.

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine.

### Installation
From the project root directory, run the following command to install dependencies for both the frontend and backend:
```bash
npm run install:all
```

### Running the Services
You need to run both the backend server and frontend client simultaneously. Open two separate terminals and run:

1. **Terminal 1: Start the Backend Server** (runs on [http://localhost:5000](http://localhost:5000))
   ```bash
   npm run dev:backend
   ```

2. **Terminal 2: Start the Frontend Client** (runs on [http://localhost:5173](http://localhost:5173))
   ```bash
   npm run dev:frontend
   ```

---

## 🔑 Login Credentials

The mock database comes seeded with default users. You can log in using the following details:

| Role | Username / Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `adminratan` | `chaurasiyaratantata` | Main platform control center access |
| **Customer** | `ratan@example.com` | `password123` | Pre-registered vehicle owner (Gold subscription plan) |
| **Mechanic** | `rajesh@example.com` | `password123` | Associated with *Metro Auto Care* garage |

*Note: You can also use the **Quick Google Sign-In / Register** simulation buttons or complete a full **Sign Up** registration flow from the portal.*

---

## 🛠️ Technology Stack

### Backend
- **Core**: Node.js, Express.js
- **Real-Time Communication**: `socket.io` for bi-directional live tracking, chat messages, and alarms.
- **Database**: Mock JSON-based file storage (`db.json` inside the `backend` folder) read and updated synchronously via helper file utilities.

### Frontend
- **Framework**: React (v19) + Vite
- **Mapping / Geo-services**: `leaflet` map components for coordinate tracking.
- **Styling**: Modern CSS Custom Properties (CSS variables) supporting vibrant accent alerts, smooth gradient micro-animations, glassmorphism overlays, and fully responsive grid-flex structures.
- **Icons**: `lucide-react` icon library.

---

## 📋 Features Overview

### 1. 🚗 Customer Dashboard
- **Request Roadside Assistance**: 
  - Choose between registered vehicles or specify a custom vehicle on the fly.
  - Select vehicle category (Car, Bike, Truck) which auto-matches a corresponding **Rapido-style rescue service option** (e.g., *Rapid two-wheeler Mechanic*, *Mobile Service Van*, *Flatbed Tow Truck*, *Heavy Recovery Crane*).
  - Choose from nearby recommended garages based on the problem type.
- **AI-Based Problem Diagnosis**: 
  - Mock image scanner scanner allowing users to upload a photo of their vehicle's breakdown issue (e.g., *Black Smoke*, *Flat Tyre*, *Oil Puddle*).
  - Simulates neural network evaluation, outputs diagnostic details, diagnostic confidence rates, estimated cost structures, and safety guidelines.
- **Live Mechanic Tracking**:
  - Interactive Leaflet-powered map displaying customer and mechanic positions.
  - Real-time estimation of ETA.
  - Checkpoint tracking (Request sent, Mechanic assigned, Mechanic arrived, Undergoing inspection/repair, Repair completed).
- **Interactive Live Chat**: Direct messaging window to coordinate with the dispatched mechanic.
- **Invoices & Promos**:
  - Dynamically updated breakdown invoice billing sheet.
  - Coupon integration (e.g., `AUTORESCUE10`, `FIRSTFREE`, `GOLDMEMBER`) to apply instant discounts.
  - Choice of payment methods (UPI, Cards, Cash).
- **Feedback & Disputes**:
  - Order review submissions (Star rating + review text).
  - Dispute Center ticket forms to submit complaints about arrival delays, billing discrepancy, or service issues.
- **Predictive Maintenance Warnings**: Automated alert banners alerting customers when an Engine Oil Service, Tyre Alignment, or General Diagnostics inspection is due, calculated based on the customer's vehicle service logs history.
- **1-Tap Emergency SOS Alert**: Floating red emergency button that immediately broadcasts a critical GPS coordinate alert to all active admin and mechanic panels.

### 2. 👨‍🔧 Mechanic Dashboard
- **Breakdown Notifications**: Immediate workspace alert cards with user coordinates and description upon incoming customer requests.
- **Accept/Reject Actions**: Immediate socket broadcasts notifying the client when a job has been accepted.
- **Simulated Navigation**: Live location update buttons simulating step-by-step route progress toward the customer.
- **Geofence Alerts**: Emits geofence triggers automatically when arriving within a 100m client service boundary, sending native notifications to both customer and admin.
- **Repair Phase Updates**: Progression selectors to change work statuses (e.g. Inspecting, Repairing, Completed).
- **Billing Console**: Form tool to search and add specific replacement parts or labour cost items directly to the customer's invoice.
- **Direct Messaging**: Dedicated messaging drawer to chat with the stranded driver.

### 3. 👑 Admin Center
- **Overall Metrics**: Real-time counters showing total platform bookings, combined revenues, and average service rating.
- **Telemetry Live Map**: Oversees all active vehicle breakdowns, garage markers, and mechanic positions in one unified mapping interface.
- **Geofencing Activity Logs**: Live feed recording time stamps of all entry/exit logs within client service zones.
- **Ticket Dispute Resolution**: Overview panel of complaints submitted by customers, with single-click options to resolve active disputes.
- **Telemetry Service Book**: Chronological logs of all completed transactions, parts replacement details, customer feedback, and paid amounts.
- **Global Role Switcher**: (Exclusive to authenticated admins) Navbar controls allowing admins to switch dashboards between Customer, Mechanic, and Admin to validate simulated workflows in one browser window.

---

## 📂 Project Directory Structure

```text
garage/
├── backend/
│   ├── db.json           # Mock JSON database seeding user registry, history & promo codes
│   ├── server.js         # Express HTTP Server & Socket.io events handler
│   └── package.json      # Node scripts and dependencies (Express, CORS, Socket.io)
├── frontend/
│   ├── public/           # Static assets
│   ├── src/
│   │   ├── assets/       # Images (hero graphics, logos)
│   │   ├── components/   
│   │   │   ├── AdminDashboard.jsx     # Telemetry logs, billing sheets, and disputes
│   │   │   ├── CustomerDashboard.jsx  # SOS alerts, AI scanner, diagnostics, maps
│   │   │   ├── MechanicDashboard.jsx  # Job accept/reject, route simulator, invoice builder
│   │   │   ├── ChatComponent.jsx      # Real-time WebSocket chat portal
│   │   │   └── MapComponent.jsx       # Leaflet maps wrapper for customer/mechanic tracking
│   │   ├── App.css       # Layout styles & keyframe animations
│   │   ├── index.css     # Global modern theme styles, variables and fonts
│   │   ├── App.jsx       # Entry Shell, Authentication handlers, and socket listeners
│   │   └── main.jsx      # React App initialization
│   ├── package.json      # React and Vite configuration dependencies
│   └── vite.config.js    # Vite configuration mapping
└── package.json          # Workspace manager script configurations
```
