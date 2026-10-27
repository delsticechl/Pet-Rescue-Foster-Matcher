-- ============================================================
-- PawFund - MySQL schema
-- Tổng hợp từ MYSQL_SCHEMA_DDL + các migration trong initMySqlSchema()
-- ============================================================

CREATE DATABASE IF NOT EXISTS pawfund_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pawfund_db;

-- ------------------------------------------------------------
-- users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address VARCHAR(255),
  role ENUM('Adopter', 'RescueStaff', 'Admin') NOT NULL DEFAULT 'Adopter',
  avatar_url LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- shelters
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shelters (
  shelter_id VARCHAR(50) PRIMARY KEY,
  shelter_name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100) NOT NULL,
  manager_id VARCHAR(50) NOT NULL,
  capacity INT NOT NULL DEFAULT 50,
  current_occupancy INT NOT NULL DEFAULT 0,
  image_url TEXT,
  bank_account VARCHAR(50),
  bank_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(user_id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- pets
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pets (
  pet_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  species VARCHAR(30) NOT NULL,
  breed VARCHAR(100),
  age_months INT NOT NULL DEFAULT 12,
  gender VARCHAR(20) NOT NULL,
  health_status VARCHAR(100) NOT NULL DEFAULT 'Healthy',
  vaccinated BOOLEAN NOT NULL DEFAULT FALSE,
  sterilized BOOLEAN NOT NULL DEFAULT FALSE,
  adoption_status ENUM('Pending', 'Ready', 'Adopted', 'Fostered') NOT NULL DEFAULT 'Ready',
  energy_level VARCHAR(30) NOT NULL DEFAULT 'Medium',
  requires_yard BOOLEAN NOT NULL DEFAULT FALSE,
  good_with_kids BOOLEAN NOT NULL DEFAULT TRUE,
  good_with_pets BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  shelter_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shelter_id) REFERENCES shelters(shelter_id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- pet_images
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pet_images (
  image_id VARCHAR(50) PRIMARY KEY,
  pet_id VARCHAR(50) NOT NULL,
  image_url LONGTEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  caption VARCHAR(255),
  file_name VARCHAR(255),
  file_size INT,
  mime_type VARCHAR(50),
  upload_source VARCHAR(30) DEFAULT 'LocalUpload',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- pet_medical_records
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pet_medical_records (
  record_id VARCHAR(50) PRIMARY KEY,
  pet_id VARCHAR(50) NOT NULL,
  medical_date VARCHAR(30) NOT NULL,
  diagnosis VARCHAR(255) NOT NULL,
  treatment TEXT NOT NULL,
  vet_name VARCHAR(100) NOT NULL,
  next_follow_up VARCHAR(30),
  medications TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- adoption_applications
-- (đã gộp migration: status có 'Reviewing', phone/address DEFAULT '')
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS adoption_applications (
  application_id VARCHAR(50) PRIMARY KEY,
  pet_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50),
  applicant_name VARCHAR(100) NOT NULL,
  applicant_email VARCHAR(100) NOT NULL,
  applicant_phone VARCHAR(30) NOT NULL DEFAULT '',
  applicant_address VARCHAR(255) NOT NULL DEFAULT '',
  housing_type VARCHAR(100) NOT NULL,
  has_yard BOOLEAN NOT NULL DEFAULT FALSE,
  has_children BOOLEAN NOT NULL DEFAULT FALSE,
  pet_experience TEXT,
  other_pets VARCHAR(255),
  status ENUM('Pending', 'Reviewing', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  admin_notes TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- care_logs
-- (đã gộp migration: thêm weight_kg)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS care_logs (
  log_id VARCHAR(50) PRIMARY KEY,
  pet_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50),
  author_name VARCHAR(100) NOT NULL,
  log_date VARCHAR(30) NOT NULL,
  notes TEXT NOT NULL,
  image_url LONGTEXT,
  health_update TEXT,
  mood VARCHAR(50),
  weight_kg DECIMAL(6,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- donations
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donations (
  donation_id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  donor_name VARCHAR(100) NOT NULL,
  donor_email VARCHAR(100),
  amount DECIMAL(12,2) NOT NULL,
  date VARCHAR(30) NOT NULL,
  target VARCHAR(150),
  message TEXT,
  payment_method VARCHAR(50) DEFAULT 'Transfer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- in_app_notifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS in_app_notifications (
  notification_id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  recipient_email VARCHAR(100),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'adoption',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  link VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Dữ liệu khởi tạo (seed) - giống initMySqlSchema()
-- Lưu ý: password_hash đang là chuỗi thường như trong code;
-- nên đổi sang hash (bcrypt) khi triển khai thật.
-- ============================================================
INSERT IGNORE INTO users
  (user_id, username, full_name, email, password_hash, phone, address, role, avatar_url)
VALUES
  ('USR-ADMIN', 'AdminStaff', 'AdminStaff', 'adminstaff@pawfund.org', 'adminstaff123@',
   '0988776655', 'Văn Phòng Cứu Hộ PawFund Toàn Quốc', 'Admin',
   'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80');

INSERT IGNORE INTO shelters
  (shelter_id, shelter_name, address, phone, email, manager_id, capacity, current_occupancy,
   bank_account, bank_name, image_url)
VALUES
  ('SHL-01', 'Trạm Cứu Hộ Động Vật PawFund',
   '264 Âu Cơ, P. Nhật Tân, Q. Tây Hồ, Hà Nội', '0903112233', 'contact@pawfund.org',
   'USR-ADMIN', 60, 0, '19034567890011', 'Techcombank - PawFund Rescue Fund',
   'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=600&q=80');