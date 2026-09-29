-- ==========================================================
-- PawFund Rescue & Adoption Platform
-- MySQL Relational Database Schema (3NF Architecture)
-- File: src/db/schema.sql
-- ==========================================================

-- Tạo database (nếu chưa có)
CREATE DATABASE IF NOT EXISTS pawfund_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pawfund_db;

-- 1. BẢNG NGƯỜI DÙNG (USERS)
CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(20) PRIMARY KEY,
  username VARCHAR(50),
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address VARCHAR(255),
  role ENUM('Adopter', 'RescueStaff', 'Admin') NOT NULL DEFAULT 'Adopter',
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. BẢNG TRẠM CỨU HỘ (SHELTERS)
CREATE TABLE IF NOT EXISTS shelters (
  shelter_id VARCHAR(20) PRIMARY KEY,
  shelter_name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100) NOT NULL,
  manager_id VARCHAR(20) NOT NULL,
  capacity INT NOT NULL DEFAULT 50,
  current_occupancy INT NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_shelters_manager (manager_id),
  CONSTRAINT fk_shelters_manager FOREIGN KEY (manager_id) REFERENCES users(user_id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BẢNG THÚ CƯNG (PETS) - 3NF
CREATE TABLE IF NOT EXISTS pets (
  pet_id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  species VARCHAR(20) NOT NULL,
  breed VARCHAR(100),
  age_months INT NOT NULL DEFAULT 12,
  gender ENUM('Đực', 'Cái') NOT NULL,
  health_status VARCHAR(100) NOT NULL DEFAULT 'Healthy',
  vaccinated BOOLEAN NOT NULL DEFAULT FALSE,
  sterilized BOOLEAN NOT NULL DEFAULT FALSE,
  adoption_status ENUM('Pending', 'Ready', 'Adopted', 'Fostered') NOT NULL DEFAULT 'Ready',
  energy_level VARCHAR(20) NOT NULL DEFAULT 'Medium',
  requires_yard BOOLEAN NOT NULL DEFAULT FALSE,
  good_with_kids BOOLEAN NOT NULL DEFAULT TRUE,
  good_with_pets BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  shelter_id VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pets_shelter (shelter_id),
  INDEX idx_pets_status (adoption_status),
  INDEX idx_pets_species (species),
  CONSTRAINT fk_pets_shelter FOREIGN KEY (shelter_id) REFERENCES shelters(shelter_id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. BẢNG HÌNH ẢNH THÚ CƯNG (PET_IMAGES) - 1:N
CREATE TABLE IF NOT EXISTS pet_images (
  image_id VARCHAR(30) PRIMARY KEY,
  pet_id VARCHAR(20) NOT NULL,
  image_url LONGTEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  caption VARCHAR(255),
  file_name VARCHAR(255),
  file_size INT,
  mime_type VARCHAR(50),
  upload_source VARCHAR(30) DEFAULT 'ExternalURL',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pet_images_pet (pet_id),
  CONSTRAINT fk_pet_images_pet FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. BẢNG HỒ SƠ Y TẾ (PET_MEDICAL_RECORDS) - 1:N
CREATE TABLE IF NOT EXISTS pet_medical_records (
  record_id VARCHAR(30) PRIMARY KEY,
  pet_id VARCHAR(20) NOT NULL,
  medical_date VARCHAR(30) NOT NULL,
  diagnosis VARCHAR(255) NOT NULL,
  treatment TEXT NOT NULL,
  vet_name VARCHAR(100) NOT NULL,
  next_follow_up VARCHAR(30),
  medications TEXT,
  reminder_status VARCHAR(20) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_medical_pet (pet_id),
  CONSTRAINT fk_medical_pet FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. BẢNG ĐƠN NHẬN NUÔI (ADOPTION_APPLICATIONS)
CREATE TABLE IF NOT EXISTS adoption_applications (
  application_id VARCHAR(20) PRIMARY KEY,
  pet_id VARCHAR(20) NOT NULL,
  applicant_name VARCHAR(100) NOT NULL,
  applicant_email VARCHAR(100) NOT NULL,
  applicant_phone VARCHAR(20) NOT NULL,
  applicant_address VARCHAR(255) NOT NULL,
  housing_type VARCHAR(100) NOT NULL,
  has_yard BOOLEAN NOT NULL DEFAULT FALSE,
  has_children BOOLEAN NOT NULL DEFAULT FALSE,
  pet_experience TEXT,
  other_pets VARCHAR(255),
  status ENUM('Pending', 'Reviewing', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  admin_notes TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_applications_pet (pet_id),
  INDEX idx_applications_status (status),
  CONSTRAINT fk_applications_pet FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. BẢNG NHẬT KÝ CHĂM SÓC (CARE_LOGS)
CREATE TABLE IF NOT EXISTS care_logs (
  log_id VARCHAR(20) PRIMARY KEY,
  pet_id VARCHAR(20) NOT NULL,
  staff_name VARCHAR(100) NOT NULL,
  log_date VARCHAR(30) NOT NULL,
  category VARCHAR(50) NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_carelogs_pet (pet_id),
  CONSTRAINT fk_carelogs_pet FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. BẢNG QUYÊN GÓP ỦNG HỘ (DONATIONS)
CREATE TABLE IF NOT EXISTS donations (
  donation_id VARCHAR(20) PRIMARY KEY,
  donor_name VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date VARCHAR(30) NOT NULL,
  target VARCHAR(150) NOT NULL,
  message TEXT,
  payment_method VARCHAR(50) DEFAULT 'Transfer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_donations_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. BẢNG LỊCH SỬ THÔNG BÁO EMAIL (EMAIL_NOTIFICATION_LOGS)
CREATE TABLE IF NOT EXISTS email_notification_logs (
  log_id VARCHAR(30) PRIMARY KEY,
  application_id VARCHAR(20),
  recipient_email VARCHAR(100) NOT NULL,
  recipient_name VARCHAR(100) NOT NULL,
  pet_name VARCHAR(100),
  pet_species VARCHAR(50),
  pet_image TEXT,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sender VARCHAR(150) NOT NULL,
  content_preview TEXT,
  html_content LONGTEXT,
  smtp_status_code VARCHAR(100),
  delivery_status VARCHAR(50),
  metadata JSON,
  INDEX idx_email_app (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- VIEW THỐNG KÊ TRẠM CỨU HỘ (vw_ShelterStatistics)
-- ==========================================================
CREATE OR REPLACE VIEW vw_ShelterStatistics AS
SELECT 
  s.shelter_id,
  s.shelter_name,
  s.capacity,
  COUNT(p.pet_id) AS total_pets,
  SUM(CASE WHEN p.adoption_status = 'Ready' THEN 1 ELSE 0 END) AS ready_for_adoption,
  SUM(CASE WHEN p.adoption_status = 'Adopted' THEN 1 ELSE 0 END) AS total_adopted,
  ROUND((COUNT(p.pet_id) / s.capacity) * 100, 1) AS occupancy_rate
FROM shelters s
LEFT JOIN pets p ON s.shelter_id = p.shelter_id
GROUP BY s.shelter_id, s.shelter_name, s.capacity;
