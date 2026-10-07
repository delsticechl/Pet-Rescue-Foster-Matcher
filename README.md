# 🐾 Pawfund - Pet Rescue & Foster Relational Network

> A comprehensive platform for managing rescue shelters, facilitating ACID transaction-compliant adoption workflows, and matching pets with adopters using Artificial Intelligence (Google Gemini AI).

## 📌 Project Overview

**Pawfund** is a software solution designed to optimize rescue operations, clinical care management, and pet adoption processes. Built upon a **3NF (Third Normal Form)** database architecture, the system guarantees strict data integrity during concurrent adoption requests.

The platform addresses fragmented management by consolidating information across Adopters, Shelters, Pet profiles, Clinical logs, and Financial donations into a unified system.

## 👥 Authors & Contributors

This project was researched and developed by:

* 👩‍💻 **Hoang Thi Khanh Huyen** — *Co-Author & Core Developer*
* 👩‍💻 **Ngo Huynh Mai Khoi** — *Co-Author & Core Developer*

## 🚀 Key Features

### 1. 🤖 Smart AI Matchmaker
* Integrates **Google Gemini API** to analyze living environments, leisure time, and prior pet care experience of candidates.
* Evaluates and calculates percentage compatibility scores between potential adopters and individual pet characteristics.

### 2. 🛡️ ACID Transaction Management
* Manages adoption applications while strictly enforcing **ACID** database properties.
* Automatically updates pet status to `Adopted` and resolves competing applications upon approval.
* Integrates a simulated SMTP email engine to send automated status notifications to applicants.

### 3. 📋 Care & Clinical Logs Management
* Tracks vaccination history, deworming schedules, spay/neuter operations, and health metrics for each pet in real time.

### 4. 🏥 Shelter Management & Donations
* Monitors capacity limits and real-time pet occupancy across multiple rescue centers.
* Maintains a transparent historical record of donations from benefactors.

## 🛠️ Tech Stack

### **Frontend**
* **Framework:** React, TypeScript
* **Styling:** Tailwind CSS, Lucide React Icons
* **UI Components:** Dynamic Modals, Real-time Status Badges, Data Tables

### **Backend**
* **Runtime:** Node.js (Express Framework)
* **Language:** TypeScript
* **RESTful API:** Standardized endpoints for CRUD operations
* **Authentication & Authorization:** Role-Based Access Control (`AdminStaff`, `RescueStaff`, `Adopter`)

### **Database & AI**
* **Database:** MySQL / Relational Database Model (3NF Normalized)
* **AI Framework:** Google Gemini API (`@google/genai`)

## 📐 Database Architecture (3NF Schema)

The system is engineered around core relational entities:

* `USERS`: User accounts, authentication roles, and profile details.
* `SHELTERS`: Rescue center profiles and capacity tracking.
* `PETS`: Detailed pet profiles (Foreign Key: `shelterId`).
* `APPLICATIONS`: Adoption applications (Foreign Keys: `userId`, `petId`).
* `CARE_LOGS`: Medical history & vaccination logs (Foreign Key: `petId`).
* `DONATIONS`: Sponsorship records (Foreign Keys: `userId`, `shelterId`).

## ⚙️ Installation & Setup

### **Prerequisites:**
* Node.js (v18.x or higher)
* MySQL Server (v8.0 or higher)
* NPM or Yarn

### **Step-by-step Execution:**

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/pawfund.git
   cd pawfund
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables (`.env`):**
   Create a `.env` file in the root directory and populate it with your environment settings:
   ```env
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_here
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=pawfund_db
   ```

4. **Launch the application:**
   ```bash
   # Development mode
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

## 📡 Primary API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/pets` | Fetch pet list (supports pagination & filtering) |
| `POST` | `/applications` | Submit an adoption application |
| `PUT` | `/applications/:id/status` | Update application status (Approve/Reject via ACID transaction) |
| `GET` | `/shelters` | Fetch shelter list and occupancy statistics |
| `POST` | `/care-logs` | Add a clinical/vaccination entry for a pet |
| `POST` | `/matchmaker` | Trigger Gemini AI matching algorithm |

## 📄 License

Developed for academic research and technology demonstration purposes. All rights reserved by **Hoang Thi Khanh Huyen** and **Ngo Huynh Mai Khoi**.
