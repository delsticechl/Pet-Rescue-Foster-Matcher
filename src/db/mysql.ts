import mysql, { Pool, PoolOptions, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import dotenv from 'dotenv';
import {
  Pet,
  Shelter,
  AdoptionApplication,
  CareLog,
  Donation,
  User,
  PetMedicalRecord,
  PetImage,
  EmailNotificationLog,
} from '../types';

dotenv.config();

// MySQL Configuration interface
export interface MySqlConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  waitForConnections?: boolean;
  connectionLimit?: number;
  queueLimit?: number;
  ssl?: boolean | object;
}

// Default configuration loaded from Environment Variables
export function getMySqlEnvConfig(): MySqlConfig {
  // If MYSQL_URL / DATABASE_URL is provided, parse it or fallback to individual vars
  const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (dbUrl && dbUrl.startsWith('mysql://')) {
    try {
      const parsed = new URL(dbUrl);
      return {
        host: parsed.hostname || 'localhost',
        port: parsed.port ? parseInt(parsed.port, 10) : 3306,
        user: parsed.username || 'root',
        password: parsed.password || '',
        database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'pawfund_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      };
    } catch {
      // fallback
    }
  }

  return {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE || 'pawfund_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

let activePool: Pool | null = null;
let currentConfig: MySqlConfig = getMySqlEnvConfig();
let connectionStatus: {
  isConnected: boolean;
  lastChecked: string | null;
  serverVersion?: string;
  latencyMs?: number;
  error?: string | null;
  tablesCount?: number;
} = {
  isConnected: false,
  lastChecked: null,
  error: null,
};

/**
 * Creates or retrieves the singleton MySQL Connection Pool
 */
export function getMySqlPool(customConfig?: Partial<MySqlConfig>): Pool {
  if (customConfig) {
    currentConfig = { ...currentConfig, ...customConfig };
    if (activePool) {
      activePool.end().catch(() => {});
      activePool = null;
    }
  }

  if (!activePool) {
    const poolOptions: PoolOptions = {
      host: currentConfig.host,
      port: currentConfig.port,
      user: currentConfig.user,
      password: currentConfig.password,
      database: currentConfig.database,
      waitForConnections: currentConfig.waitForConnections ?? true,
      connectionLimit: currentConfig.connectionLimit ?? 10,
      queueLimit: currentConfig.queueLimit ?? 0,
      multipleStatements: true,
      dateStrings: true,
      connectTimeout: 8000,
    };

    activePool = mysql.createPool(poolOptions);
  }

  return activePool;
}

/**
 * Test connectivity with the MySQL database
 */
export async function testMySqlConnection(configToTest?: Partial<MySqlConfig>): Promise<{
  success: boolean;
  message: string;
  host: string;
  port: number;
  database: string;
  serverVersion?: string;
  latencyMs?: number;
  tablesCount?: number;
  error?: string;
}> {
  const cfg = configToTest ? { ...currentConfig, ...configToTest } : currentConfig;
  const startTime = Date.now();

  let tempPool: Pool | null = null;
  try {
    const poolOptions: PoolOptions = {
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      multipleStatements: true,
      connectTimeout: 5000,
    };

    tempPool = mysql.createPool(poolOptions);
    const connection = await tempPool.getConnection();
    const latency = Date.now() - startTime;

    // Fetch MySQL version
    const [verRows] = await connection.query<RowDataPacket[]>('SELECT VERSION() AS version');
    const version = verRows[0]?.version || 'MySQL 8.0';

    // Count tables in current database
    const [tblRows] = await connection.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = ?',
      [cfg.database]
    );
    const tablesCount = tblRows[0]?.total || 0;

    connection.release();
    if (tempPool !== activePool) {
      await tempPool.end().catch(() => {});
    }

    connectionStatus = {
      isConnected: true,
      lastChecked: new Date().toISOString(),
      serverVersion: version,
      latencyMs: latency,
      tablesCount,
      error: null,
    };

    // If test succeeded and no config was specified, keep active pool updated
    if (!configToTest) {
      activePool = tempPool;
    }

    return {
      success: true,
      message: `Kết nối MySQL thành công! Phiên bản: ${version}`,
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      serverVersion: version,
      latencyMs: latency,
      tablesCount,
    };
  } catch (err: any) {
    if (tempPool && tempPool !== activePool) {
      await tempPool.end().catch(() => {});
    }

    const errMsg = err.message || String(err);
    connectionStatus = {
      isConnected: false,
      lastChecked: new Date().toISOString(),
      error: errMsg,
    };

    return {
      success: false,
      message: `Lỗi kết nối MySQL: ${errMsg}`,
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      error: errMsg,
    };
  }
}

/**
 * Get current cached status
 */
export function getMySqlStatus() {
  return {
    ...connectionStatus,
    config: {
      host: currentConfig.host,
      port: currentConfig.port,
      user: currentConfig.user,
      database: currentConfig.database,
      hasPassword: Boolean(currentConfig.password),
    },
  };
}

/**
 * Execute raw SQL query with parameters
 */
export async function executeMySqlQuery<T = any>(sql: string, params: any[] = []): Promise<T> {
  const pool = getMySqlPool();
  const [results] = await pool.query(sql, params);
  return results as T;
}

/**
 * Complete DDL Script for creating MySQL 3NF relational schema
 */
export const MYSQL_SCHEMA_DDL = `
-- ==========================================================
-- PawFund Rescue & Adoption Platform - MySQL Relational Schema (3NF)
-- ==========================================================

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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  FOREIGN KEY (manager_id) REFERENCES users(user_id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  FOREIGN KEY (shelter_id) REFERENCES shelters(shelter_id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS care_logs (
  log_id VARCHAR(20) PRIMARY KEY,
  pet_id VARCHAR(20) NOT NULL,
  staff_name VARCHAR(100) NOT NULL,
  log_date VARCHAR(30) NOT NULL,
  category VARCHAR(50) NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS donations (
  donation_id VARCHAR(20) PRIMARY KEY,
  donor_name VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date VARCHAR(30) NOT NULL,
  target VARCHAR(150) NOT NULL,
  message TEXT,
  payment_method VARCHAR(50) DEFAULT 'Transfer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  metadata JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

/**
 * Initialize all database tables and schema in MySQL
 */
export async function initMySqlSchema(): Promise<{ success: boolean; message: string; tablesCreated?: string[] }> {
  try {
    const pool = getMySqlPool();
    // Split statements and execute individually to avoid multiple statement delimiter errors
    const statements = MYSQL_SCHEMA_DDL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const sql of statements) {
      await pool.query(sql);
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = ?',
      [currentConfig.database]
    );

    const tables = rows.map((r) => r.TABLE_NAME || r.table_name);

    return {
      success: true,
      message: `Khởi tạo Schema MySQL thành công! Đã tạo ${tables.length} bảng dữ liệu.`,
      tablesCreated: tables,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Lỗi khi tạo Schema MySQL: ${err.message || String(err)}`,
    };
  }
}

// ==========================================================
// MySQL Repository / Query Service
// ==========================================================

export const MySqlService = {
  // Test connection
  test: testMySqlConnection,
  getStatus: getMySqlStatus,
  initSchema: initMySqlSchema,
  execute: executeMySqlQuery,

  // Pets
  async getPets(): Promise<Pet[]> {
    const pool = getMySqlPool();
    const [petRows] = await pool.query<RowDataPacket[]>('SELECT * FROM pets ORDER BY created_at DESC');
    const [imgRows] = await pool.query<RowDataPacket[]>('SELECT * FROM pet_images ORDER BY is_primary DESC');
    const [medRows] = await pool.query<RowDataPacket[]>('SELECT * FROM pet_medical_records ORDER BY medical_date DESC');

    const imagesByPet = (imgRows as any[]).reduce((acc, img) => {
      if (!acc[img.pet_id]) acc[img.pet_id] = [];
      acc[img.pet_id].push({
        imageId: img.image_id,
        petId: img.pet_id,
        imageUrl: img.image_url,
        isPrimary: Boolean(img.is_primary),
        caption: img.caption,
        fileName: img.file_name,
        fileSize: img.file_size,
        mimeType: img.mime_type,
        uploadSource: img.upload_source,
        uploadedAt: img.uploaded_at,
      });
      return acc;
    }, {} as Record<string, PetImage[]>);

    const medicalByPet = (medRows as any[]).reduce((acc, med) => {
      if (!acc[med.pet_id]) acc[med.pet_id] = [];
      acc[med.pet_id].push({
        recordId: med.record_id,
        petId: med.pet_id,
        medicalDate: med.medical_date,
        diagnosis: med.diagnosis,
        treatment: med.treatment,
        vetName: med.vet_name,
        nextFollowUp: med.next_follow_up,
        medications: med.medications,
        reminderStatus: med.reminder_status,
      });
      return acc;
    }, {} as Record<string, PetMedicalRecord[]>);

    return (petRows as any[]).map((row) => {
      const petImgs = imagesByPet[row.pet_id] || [];
      const primaryImg = petImgs.find((i) => i.isPrimary) || petImgs[0];
      return {
        petId: row.pet_id,
        name: row.name,
        species: row.species,
        breed: row.breed || '',
        ageMonths: Number(row.age_months),
        gender: row.gender,
        healthStatus: row.health_status,
        vaccinated: Boolean(row.vaccinated),
        sterilized: Boolean(row.sterilized),
        adoptionStatus: row.adoption_status,
        energyLevel: row.energy_level,
        requiresYard: Boolean(row.requires_yard),
        goodWithKids: Boolean(row.good_with_kids),
        goodWithPets: Boolean(row.good_with_pets),
        description: row.description || '',
        shelterId: row.shelter_id,
        createdAt: row.created_at,
        imageUrl: primaryImg ? primaryImg.imageUrl : 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
        images: petImgs,
        medicalHistory: medicalByPet[row.pet_id] || [],
      };
    });
  },

  async getPetById(id: string): Promise<Pet | null> {
    const pool = getMySqlPool();
    const [petRows] = await pool.query<RowDataPacket[]>('SELECT * FROM pets WHERE pet_id = ?', [id]);
    if (petRows.length === 0) return null;

    const row = petRows[0] as any;
    const [imgRows] = await pool.query<RowDataPacket[]>('SELECT * FROM pet_images WHERE pet_id = ? ORDER BY is_primary DESC', [id]);
    const [medRows] = await pool.query<RowDataPacket[]>('SELECT * FROM pet_medical_records WHERE pet_id = ? ORDER BY medical_date DESC', [id]);

    const images: PetImage[] = (imgRows as any[]).map((img) => ({
      imageId: img.image_id,
      petId: img.pet_id,
      imageUrl: img.image_url,
      isPrimary: Boolean(img.is_primary),
      caption: img.caption,
      fileName: img.file_name,
      fileSize: img.file_size,
      mimeType: img.mime_type,
      uploadSource: img.upload_source,
      uploadedAt: img.uploaded_at,
    }));

    const medicalHistory: PetMedicalRecord[] = (medRows as any[]).map((med) => ({
      recordId: med.record_id,
      petId: med.pet_id,
      medicalDate: med.medical_date,
      diagnosis: med.diagnosis,
      treatment: med.treatment,
      vetName: med.vet_name,
      nextFollowUp: med.next_follow_up,
      medications: med.medications,
      reminderStatus: med.reminder_status,
    }));

    const primaryImg = images.find((i) => i.isPrimary) || images[0];

    return {
      petId: row.pet_id,
      name: row.name,
      species: row.species,
      breed: row.breed || '',
      ageMonths: Number(row.age_months),
      gender: row.gender,
      healthStatus: row.health_status,
      vaccinated: Boolean(row.vaccinated),
      sterilized: Boolean(row.sterilized),
      adoptionStatus: row.adoption_status,
      energyLevel: row.energy_level,
      requiresYard: Boolean(row.requires_yard),
      goodWithKids: Boolean(row.good_with_kids),
      goodWithPets: Boolean(row.good_with_pets),
      description: row.description || '',
      shelterId: row.shelter_id,
      createdAt: row.created_at,
      imageUrl: primaryImg ? primaryImg.imageUrl : '',
      images,
      medicalHistory,
    };
  },

  async createPet(pet: Pet): Promise<Pet> {
    const pool = getMySqlPool();
    await pool.query(
      `INSERT INTO pets (
        pet_id, name, species, breed, age_months, gender, health_status,
        vaccinated, sterilized, adoption_status, energy_level, requires_yard,
        good_with_kids, good_with_pets, description, shelter_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pet.petId,
        pet.name,
        pet.species,
        pet.breed || '',
        pet.ageMonths || 12,
        pet.gender,
        pet.healthStatus,
        pet.vaccinated ? 1 : 0,
        pet.sterilized ? 1 : 0,
        pet.adoptionStatus || 'Ready',
        pet.energyLevel || 'Medium',
        pet.requiresYard ? 1 : 0,
        pet.goodWithKids ? 1 : 0,
        pet.goodWithPets ? 1 : 0,
        pet.description || '',
        pet.shelterId,
      ]
    );

    // Save primary image if exists
    if (pet.imageUrl) {
      await pool.query(
        `INSERT INTO pet_images (image_id, pet_id, image_url, is_primary) VALUES (?, ?, ?, 1)`,
        [`IMG-${Date.now()}`, pet.petId, pet.imageUrl]
      );
    }

    return pet;
  },

  async updatePet(id: string, pet: Partial<Pet>): Promise<boolean> {
    const pool = getMySqlPool();
    const updates: string[] = [];
    const values: any[] = [];

    if (pet.name !== undefined) { updates.push('name = ?'); values.push(pet.name); }
    if (pet.species !== undefined) { updates.push('species = ?'); values.push(pet.species); }
    if (pet.breed !== undefined) { updates.push('breed = ?'); values.push(pet.breed); }
    if (pet.ageMonths !== undefined) { updates.push('age_months = ?'); values.push(pet.ageMonths); }
    if (pet.gender !== undefined) { updates.push('gender = ?'); values.push(pet.gender); }
    if (pet.healthStatus !== undefined) { updates.push('health_status = ?'); values.push(pet.healthStatus); }
    if (pet.vaccinated !== undefined) { updates.push('vaccinated = ?'); values.push(pet.vaccinated ? 1 : 0); }
    if (pet.sterilized !== undefined) { updates.push('sterilized = ?'); values.push(pet.sterilized ? 1 : 0); }
    if (pet.adoptionStatus !== undefined) { updates.push('adoption_status = ?'); values.push(pet.adoptionStatus); }
    if (pet.energyLevel !== undefined) { updates.push('energy_level = ?'); values.push(pet.energyLevel); }
    if (pet.requiresYard !== undefined) { updates.push('requires_yard = ?'); values.push(pet.requiresYard ? 1 : 0); }
    if (pet.goodWithKids !== undefined) { updates.push('good_with_kids = ?'); values.push(pet.goodWithKids ? 1 : 0); }
    if (pet.goodWithPets !== undefined) { updates.push('good_with_pets = ?'); values.push(pet.goodWithPets ? 1 : 0); }
    if (pet.description !== undefined) { updates.push('description = ?'); values.push(pet.description); }
    if (pet.shelterId !== undefined) { updates.push('shelter_id = ?'); values.push(pet.shelterId); }

    if (updates.length === 0) return true;

    values.push(id);
    const [res] = await pool.query<ResultSetHeader>(
      `UPDATE pets SET ${updates.join(', ')} WHERE pet_id = ?`,
      values
    );

    return res.affectedRows > 0;
  },

  async deletePet(id: string): Promise<boolean> {
    const pool = getMySqlPool();
    const [res] = await pool.query<ResultSetHeader>('DELETE FROM pets WHERE pet_id = ?', [id]);
    return res.affectedRows > 0;
  },

  // Shelters
  async getShelters(): Promise<Shelter[]> {
    const pool = getMySqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM shelters ORDER BY shelter_name ASC');
    return (rows as any[]).map((r) => ({
      shelterId: r.shelter_id,
      shelterName: r.shelter_name,
      address: r.address,
      phone: r.phone,
      email: r.email,
      managerId: r.manager_id,
      capacity: r.capacity,
      currentOccupancy: r.current_occupancy || 0,
      imageUrl: r.image_url || 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=800&q=80',
    }));
  },

  // Applications
  async getApplications(): Promise<AdoptionApplication[]> {
    const pool = getMySqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM adoption_applications ORDER BY submitted_at DESC');
    return (rows as any[]).map((r) => ({
      applicationId: r.application_id,
      petId: r.pet_id,
      applicantName: r.applicant_name,
      applicantEmail: r.applicant_email,
      applicantPhone: r.applicant_phone,
      applicantAddress: r.applicant_address,
      housingType: r.housing_type,
      hasYard: Boolean(r.has_yard),
      hasChildren: Boolean(r.has_children),
      petExperience: r.pet_experience || '',
      otherPets: r.other_pets || '',
      status: r.status,
      adminNotes: r.admin_notes || '',
      submittedAt: r.submitted_at,
      reviewedAt: r.reviewed_at || undefined,
    }));
  },

  // Donations
  async getDonations(): Promise<Donation[]> {
    const pool = getMySqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM donations ORDER BY date DESC');
    return (rows as any[]).map((r) => ({
      donationId: r.donation_id,
      donorName: r.donor_name,
      amount: Number(r.amount),
      date: r.date,
      target: r.target,
      message: r.message || '',
      paymentMethod: r.payment_method || 'Transfer',
    }));
  },

  // Care logs
  async getCareLogs(): Promise<CareLog[]> {
    const pool = getMySqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM care_logs ORDER BY log_date DESC');
    return (rows as any[]).map((r) => ({
      logId: r.log_id,
      petId: r.pet_id,
      staffName: r.staff_name,
      logDate: r.log_date,
      category: r.category,
      notes: r.notes,
    }));
  },

  // Users
  async getUsers(): Promise<User[]> {
    const pool = getMySqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users ORDER BY full_name ASC');
    return (rows as any[]).map((r) => ({
      userId: r.user_id,
      username: r.username,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone || '',
      address: r.address || '',
      role: r.role,
      avatarUrl: r.avatar_url || '',
      createdAt: r.created_at,
    }));
  },
};

export default MySqlService;
