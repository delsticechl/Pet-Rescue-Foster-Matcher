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
  InAppNotification,
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

// Load default config from environment variables
export function getMySqlEnvConfig(): MySqlConfig {
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
      connectTimeout: 5000,
    };

    activePool = mysql.createPool(poolOptions);
  }

  return activePool;
}

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

  let testPool: Pool | null = null;
  let isTemp = false;
  try {
    if (configToTest) {
      testPool = mysql.createPool({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        multipleStatements: true,
        connectTimeout: 4000,
      });
      isTemp = true;
    } else {
      // Reuse the shared pool (creates it if not yet created) - NO tempPool that gets closed!
      testPool = getMySqlPool();
      isTemp = false;
    }

    const connection = await testPool.getConnection();
    const latency = Date.now() - startTime;

    const [verRows] = await connection.query<RowDataPacket[]>('SELECT VERSION() AS version');
    const version = verRows[0]?.version || 'MySQL 8.0';

    const [tblRows] = await connection.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = ?',
      [cfg.database]
    );
    const tablesCount = tblRows[0]?.total || 0;

    connection.release();

    connectionStatus = {
      isConnected: true,
      lastChecked: new Date().toISOString(),
      serverVersion: version,
      latencyMs: latency,
      tablesCount,
      error: null,
    };

    if (isTemp && testPool) {
      await testPool.end().catch(() => {});
    }

    return {
      success: true,
      message: `Ket noi MySQL thanh cong! Phien ban: ${version}`,
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      serverVersion: version,
      latencyMs: latency,
      tablesCount,
    };
  } catch (err: any) {
    if (isTemp && testPool) {
      await testPool.end().catch(() => {});
    }

    const errMsg = err.message || String(err);
    connectionStatus = {
      isConnected: false,
      lastChecked: new Date().toISOString(),
      error: errMsg,
    };

    return {
      success: false,
      message: `Loi ket noi MySQL: ${errMsg}`,
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      error: errMsg,
    };
  }
}

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

export const MYSQL_SCHEMA_DDL = `
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

CREATE TABLE IF NOT EXISTS adoption_applications (
  application_id VARCHAR(50) PRIMARY KEY,
  pet_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50),
  applicant_name VARCHAR(100) NOT NULL,
  applicant_email VARCHAR(100) NOT NULL,
  applicant_phone VARCHAR(20) NOT NULL,
  applicant_address VARCHAR(255) NOT NULL,
  housing_type VARCHAR(100) NOT NULL,
  has_yard BOOLEAN NOT NULL DEFAULT FALSE,
  has_children BOOLEAN NOT NULL DEFAULT FALSE,
  pet_experience TEXT,
  other_pets VARCHAR(255),
  status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  admin_notes TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
`;

export async function initMySqlSchema(): Promise<{ success: boolean; message: string; tablesCreated?: string[] }> {
  try {
    const pool = getMySqlPool();
    const statements = MYSQL_SCHEMA_DDL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const sql of statements) {
      await pool.query(sql);
    }

    // ── Schema Migrations ─────────────────────────────────────────────────────
    // Migration 1: rename legacy `staff_name` -> `author_name` in care_logs,
    //              or add `author_name` if both columns are absent.
    try {
      const [staffCols] = await pool.query<RowDataPacket[]>(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'care_logs' AND COLUMN_NAME = 'staff_name'`,
        [currentConfig.database]
      );
      const [authorCols] = await pool.query<RowDataPacket[]>(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'care_logs' AND COLUMN_NAME = 'author_name'`,
        [currentConfig.database]
      );
      if ((staffCols as any[]).length > 0 && (authorCols as any[]).length === 0) {
        // Rename old staff_name -> author_name
        await pool.query(
          `ALTER TABLE care_logs CHANGE COLUMN staff_name author_name VARCHAR(100) NOT NULL DEFAULT ''`
        );
        console.log('✅ Migrated care_logs.staff_name -> author_name');
      } else if ((staffCols as any[]).length === 0 && (authorCols as any[]).length === 0) {
        // Neither column exists — add author_name
        await pool.query(
          `ALTER TABLE care_logs ADD COLUMN author_name VARCHAR(100) NOT NULL DEFAULT ''`
        );
        console.log('✅ Added missing column care_logs.author_name');
      }
    } catch (migErr: any) {
      console.warn('⚠️ care_logs author_name migration skipped:', migErr.message);
    }

    // Migration 2: add optional columns missing from old care_logs schema
    const careLogExtraColumns: Record<string, string> = {
      user_id: 'VARCHAR(50)',
      image_url: 'LONGTEXT',
      health_update: 'TEXT',
      mood: 'VARCHAR(50)',
      weight_kg: 'DECIMAL(6,2)',
    };
    for (const [col, colDef] of Object.entries(careLogExtraColumns)) {
      try {
        const [existing] = await pool.query<RowDataPacket[]>(
          `SELECT COLUMN_NAME FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'care_logs' AND COLUMN_NAME = ?`,
          [currentConfig.database, col]
        );
        if ((existing as any[]).length === 0) {
          await pool.query(`ALTER TABLE care_logs ADD COLUMN ${col} ${colDef}`);
          console.log(`✅ Added missing column care_logs.${col}`);
        }
      } catch (colErr: any) {
        console.warn(`⚠️ Could not add care_logs.${col}:`, colErr.message);
      }
    }
    // Migration 3: add columns missing from older adoption_applications / donations / notifications tables
    const extraColumns: Record<string, Record<string, string>> = {
      adoption_applications: {
        user_id: 'VARCHAR(50)',
        has_children: 'BOOLEAN NOT NULL DEFAULT FALSE',
        pet_experience: 'TEXT',
        other_pets: 'VARCHAR(255)',
        admin_notes: 'TEXT',
      },
      donations: {
        user_id: 'VARCHAR(50)',
        donor_email: 'VARCHAR(100)',
        target: 'VARCHAR(150)',
        message: 'TEXT',
        payment_method: "VARCHAR(50) DEFAULT 'Transfer'",
      },
      in_app_notifications: {
        user_id: 'VARCHAR(50)',
        recipient_email: 'VARCHAR(100)',
        link: 'VARCHAR(255)',
      },
    };
    for (const [table, cols] of Object.entries(extraColumns)) {
      for (const [col, colDef] of Object.entries(cols)) {
        try {
          const [existing] = await pool.query<RowDataPacket[]>(
            `SELECT COLUMN_NAME FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            [currentConfig.database, table, col]
          );
          if ((existing as any[]).length === 0) {
            await pool.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${colDef}`);
            console.log(`✅ Added missing column ${table}.${col}`);
          }
        } catch (colErr: any) {
          console.warn(`⚠️ Could not add ${table}.${col}:`, colErr.message);
        }
      }
    }
    // Older schema.sql defined the status ENUM with 'Reviewing' and care_logs.pet_id etc; widen safely
    try {
      await pool.query(
        `ALTER TABLE adoption_applications MODIFY COLUMN status ENUM('Pending','Reviewing','Approved','Rejected') NOT NULL DEFAULT 'Pending'`
      );
    } catch (e: any) {
      console.warn('⚠️ adoption_applications.status migration skipped:', e.message);
    }
    // Make legacy NOT NULL contact columns tolerant of empty values
    try {
      await pool.query(`ALTER TABLE adoption_applications MODIFY COLUMN applicant_phone VARCHAR(30) NOT NULL DEFAULT ''`);
      await pool.query(`ALTER TABLE adoption_applications MODIFY COLUMN applicant_address VARCHAR(255) NOT NULL DEFAULT ''`);
    } catch (e: any) {
      console.warn('⚠️ adoption_applications contact column migration skipped:', e.message);
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Seed ONLY AdminStaff user if users table is empty
    const [uRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM users');
    if ((uRows[0]?.total || 0) === 0) {
      await pool.query(
        `INSERT INTO users (user_id, username, full_name, email, password_hash, phone, address, role, avatar_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'USR-ADMIN',
          'AdminStaff',
          'AdminStaff',
          'adminstaff@pawfund.org',
          'adminstaff123@', // Plain/hash for AdminStaff
          '0988776655',
          'Văn Phòng Cứu Hộ PawFund Toàn Quốc',
          'Admin',
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        ]
      );
    }

    // Ensure default shelter exists
    const [sRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM shelters');
    if ((sRows[0]?.total || 0) === 0) {
      await pool.query(
        `INSERT INTO shelters (shelter_id, shelter_name, address, phone, email, manager_id, capacity, current_occupancy, bank_account, bank_name, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'SHL-01',
          'Trạm Cứu Hộ Động Vật PawFund',
          '264 Âu Cơ, P. Nhật Tân, Q. Tây Hồ, Hà Nội',
          '0903112233',
          'contact@pawfund.org',
          'USR-ADMIN',
          60,
          0,
          '19034567890011',
          'Techcombank - PawFund Rescue Fund',
          'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=600&q=80',
        ]
      );
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

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

/**
 * Returns a shelter_id guaranteed to exist (pets.shelter_id has a foreign key).
 * Uses the requested one if present, else the first shelter, else creates a default.
 */
async function ensureShelterId(requested?: string): Promise<string> {
  const pool = getMySqlPool();
  if (requested) {
    const [r] = await pool.query<RowDataPacket[]>('SELECT shelter_id FROM shelters WHERE shelter_id = ? LIMIT 1', [requested]);
    if (r.length > 0) return requested;
  }
  const [any] = await pool.query<RowDataPacket[]>('SELECT shelter_id FROM shelters ORDER BY created_at ASC LIMIT 1');
  if (any.length > 0) return any[0].shelter_id;

  // No shelters at all: need a manager user to satisfy shelters.manager_id FK
  let managerId: string | undefined;
  const [admins] = await pool.query<RowDataPacket[]>("SELECT user_id FROM users WHERE role IN ('Admin','RescueStaff') LIMIT 1");
  if (admins.length > 0) {
    managerId = admins[0].user_id;
  } else {
    const [anyUser] = await pool.query<RowDataPacket[]>('SELECT user_id FROM users LIMIT 1');
    if (anyUser.length > 0) managerId = anyUser[0].user_id;
  }
  if (!managerId) {
    managerId = 'USR-ADMIN';
    await pool.query(
      `INSERT INTO users (user_id, username, full_name, email, password_hash, phone, address, role, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [managerId, 'AdminStaff', 'AdminStaff', 'adminstaff@pawfund.org', 'adminstaff123@', '0988776655', 'Văn Phòng Cứu Hộ PawFund', 'Admin', '']
    );
  }
  await pool.query(
    `INSERT INTO shelters (shelter_id, shelter_name, address, phone, email, manager_id, capacity, current_occupancy, bank_account, bank_name, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['SHL-01', 'Trạm Cứu Hộ Động Vật PawFund', '264 Âu Cơ, P. Nhật Tân, Q. Tây Hồ, Hà Nội', '0903112233', 'contact@pawfund.org', managerId, 60, 0, '19034567890011', 'Techcombank - PawFund Rescue Fund', '']
  );
  return 'SHL-01';
}

export const MySqlService = {
  test: testMySqlConnection,
  getStatus: getMySqlStatus,
  initSchema: initMySqlSchema,

  // Pets
  async getPets(): Promise<Pet[]> {
    const pool = getMySqlPool();
    const [petRows] = await pool.query<RowDataPacket[]>('SELECT * FROM pets ORDER BY created_at DESC');
    const [imgRows] = await pool.query<RowDataPacket[]>('SELECT * FROM pet_images ORDER BY is_primary DESC');
    const [medRows] = await pool.query<RowDataPacket[]>('SELECT * FROM pet_medical_records ORDER BY medical_date DESC');

    const imagesByPet: Record<string, PetImage[]> = {};
    for (const img of imgRows as any[]) {
      if (!imagesByPet[img.pet_id]) imagesByPet[img.pet_id] = [];
      imagesByPet[img.pet_id].push({
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
    }

    const medicalByPet: Record<string, PetMedicalRecord[]> = {};
    for (const med of medRows as any[]) {
      if (!medicalByPet[med.pet_id]) medicalByPet[med.pet_id] = [];
      medicalByPet[med.pet_id].push({
        recordId: med.record_id,
        petId: med.pet_id,
        medicalDate: med.medical_date,
        diagnosis: med.diagnosis,
        treatment: med.treatment,
        vetName: med.vet_name,
        nextFollowUp: med.next_follow_up,
        medications: med.medications,
      });
    }

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
        imageUrl: primaryImg ? primaryImg.imageUrl : '',
        primaryImage: primaryImg ? primaryImg.imageUrl : '',
        images: petImgs,
        medicalRecords: medicalByPet[row.pet_id] || [],
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

    const medicalRecords: PetMedicalRecord[] = (medRows as any[]).map((med) => ({
      recordId: med.record_id,
      petId: med.pet_id,
      medicalDate: med.medical_date,
      diagnosis: med.diagnosis,
      treatment: med.treatment,
      vetName: med.vet_name,
      nextFollowUp: med.next_follow_up,
      medications: med.medications,
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
      primaryImage: primaryImg ? primaryImg.imageUrl : '',
      images,
      medicalRecords,
      medicalHistory: medicalRecords,
    };
  },

  async createPetWithDetails(
    pet: Pet,
    primaryImage?: { imageUrl: string; fileName?: string; fileSize?: number; mimeType?: string },
    initialMedicalRecord?: Partial<PetMedicalRecord>
  ): Promise<Pet> {
    const pool = getMySqlPool();
    const shelterId = await ensureShelterId(pet.shelterId);
    pet = { ...pet, shelterId };
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
        pet.healthStatus || 'Healthy',
        pet.vaccinated ? 1 : 0,
        pet.sterilized ? 1 : 0,
        pet.adoptionStatus || 'Ready',
        pet.energyLevel || 'Medium',
        pet.requiresYard ? 1 : 0,
        pet.goodWithKids ? 1 : 0,
        pet.goodWithPets ? 1 : 0,
        pet.description || '',
        shelterId,
      ]
    );

    try {
    const savedImages: PetImage[] = [];
    if (primaryImage?.imageUrl || pet.imageUrl) {
      const imgId = genId('IMG');
      const imgUrl = primaryImage?.imageUrl || pet.imageUrl || '';
      await pool.query(
        `INSERT INTO pet_images (image_id, pet_id, image_url, is_primary, file_name, file_size, mime_type, upload_source)
         VALUES (?, ?, ?, 1, ?, ?, ?, 'LocalUpload')`,
        [imgId, pet.petId, imgUrl, primaryImage?.fileName || 'pet_photo.jpg', primaryImage?.fileSize || 0, primaryImage?.mimeType || 'image/jpeg']
      );
      savedImages.push({
        imageId: imgId,
        petId: pet.petId,
        imageUrl: imgUrl,
        isPrimary: true,
      });
    }

    const savedMedical: PetMedicalRecord[] = [];
    if (initialMedicalRecord?.diagnosis && initialMedicalRecord?.treatment) {
      const recId = genId('MED');
      await pool.query(
        `INSERT INTO pet_medical_records (record_id, pet_id, medical_date, diagnosis, treatment, vet_name, medications)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          recId,
          pet.petId,
          initialMedicalRecord.medicalDate || new Date().toISOString().split('T')[0],
          initialMedicalRecord.diagnosis,
          initialMedicalRecord.treatment,
          initialMedicalRecord.vetName || 'Bác sĩ thú y PawFund',
          initialMedicalRecord.medications || '',
        ]
      );
      savedMedical.push({
        recordId: recId,
        petId: pet.petId,
        medicalDate: initialMedicalRecord.medicalDate || new Date().toISOString().split('T')[0],
        diagnosis: initialMedicalRecord.diagnosis,
        treatment: initialMedicalRecord.treatment,
        vetName: initialMedicalRecord.vetName || 'Bác sĩ thú y PawFund',
        medications: initialMedicalRecord.medications || '',
      });
    }

    return {
      ...pet,
      images: savedImages,
      medicalRecords: savedMedical,
      medicalHistory: savedMedical,
    };
    } catch (err) {
      // Don't leave a half-created pet behind if the photo / medical insert fails
      await pool.query('DELETE FROM pets WHERE pet_id = ?', [pet.petId]).catch(() => undefined);
      throw err;
    }
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
    if (pet.shelterId !== undefined) { updates.push('shelter_id = ?'); values.push(await ensureShelterId(pet.shelterId)); }

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

  async addMedicalRecord(petId: string, record: Partial<PetMedicalRecord>): Promise<PetMedicalRecord> {
    const pool = getMySqlPool();
    const recordId = `MED-${Date.now()}`;
    await pool.query(
      `INSERT INTO pet_medical_records (record_id, pet_id, medical_date, diagnosis, treatment, vet_name, medications)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId,
        petId,
        record.medicalDate || new Date().toISOString().split('T')[0],
        record.diagnosis || '',
        record.treatment || '',
        record.vetName || 'Bác sĩ PawFund',
        record.medications || '',
      ]
    );
    return {
      recordId,
      petId,
      medicalDate: record.medicalDate || new Date().toISOString().split('T')[0],
      diagnosis: record.diagnosis || '',
      treatment: record.treatment || '',
      vetName: record.vetName || 'Bác sĩ PawFund',
      medications: record.medications || '',
    };
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
      currentPetsCount: r.current_occupancy || 0,
      rating: 5.0,
      description: r.description || 'Trạm cứu hộ PawFund tiếp nhận và chăm sóc thú cưng.',
      bankAccount: r.bank_account || '',
      bankName: r.bank_name || '',
      imageUrl: r.image_url || 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=600&q=80',
    }));
  },

  // Applications
  async getApplications(): Promise<AdoptionApplication[]> {
    const pool = getMySqlPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, p.name AS pet_name, p.species AS pet_species, p.breed AS pet_breed
       FROM adoption_applications a
       LEFT JOIN pets p ON a.pet_id = p.pet_id
       ORDER BY a.submitted_at DESC`
    );
    return (rows as any[]).map((r) => ({
      applicationId: r.application_id,
      petId: r.pet_id,
      userId: r.user_id,
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
      petName: r.pet_name,
      petSpecies: r.pet_species,
      petBreed: r.pet_breed,
    }));
  },

  async createApplication(app: Partial<AdoptionApplication>): Promise<AdoptionApplication> {
    const pool = getMySqlPool();
    const appId = genId('APP');
    await pool.query(
      `INSERT INTO adoption_applications (
        application_id, pet_id, user_id, applicant_name, applicant_email, applicant_phone,
        applicant_address, housing_type, has_yard, has_children, pet_experience, other_pets, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        appId,
        app.petId,
        app.userId || null,
        app.applicantName,
        app.applicantEmail,
        app.applicantPhone || '',
        app.applicantAddress || '',
        app.housingType || 'Apartment / Condo',
        app.hasYard ? 1 : 0,
        app.hasChildren ? 1 : 0,
        app.petExperience || '',
        app.otherPets || '',
      ]
    );

    return {
      applicationId: appId,
      petId: app.petId!,
      userId: app.userId || '',
      applicantName: app.applicantName!,
      applicantEmail: app.applicantEmail!,
      applicantPhone: app.applicantPhone || '',
      applicantAddress: app.applicantAddress || '',
      housingType: app.housingType || 'Apartment / Condo',
      hasYard: Boolean(app.hasYard),
      hasChildren: Boolean(app.hasChildren),
      petExperience: app.petExperience || '',
      otherPets: app.otherPets || '',
      status: 'Pending',
      submittedAt: new Date().toISOString(),
    };
  },

  async updateApplicationStatus(appId: string, status: 'Approved' | 'Rejected', adminNotes?: string): Promise<boolean> {
    const pool = getMySqlPool();
    const [res] = await pool.query<ResultSetHeader>(
      `UPDATE adoption_applications SET status = ?, admin_notes = ?, reviewed_at = CURRENT_TIMESTAMP WHERE application_id = ?`,
      [status, adminNotes || '', appId]
    );

    // If approved, update pet status to Adopted!
    if (status === 'Approved') {
      const [appRows] = await pool.query<RowDataPacket[]>('SELECT pet_id FROM adoption_applications WHERE application_id = ?', [appId]);
      if (appRows.length > 0) {
        await pool.query('UPDATE pets SET adoption_status = "Adopted" WHERE pet_id = ?', [appRows[0].pet_id]);
      }
    }

    return res.affectedRows > 0;
  },

  // Care logs
  async getCareLogs(petId?: string): Promise<CareLog[]> {
    const pool = getMySqlPool();
    let query = 'SELECT c.*, p.name AS pet_name FROM care_logs c LEFT JOIN pets p ON c.pet_id = p.pet_id';
    const params: any[] = [];
    if (petId) {
      query += ' WHERE c.pet_id = ?';
      params.push(petId);
    }
    query += ' ORDER BY c.created_at DESC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return (rows as any[]).map((r) => ({
      logId: r.log_id,
      petId: r.pet_id,
      userId: r.user_id,
      authorName: r.author_name,
      logDate: r.log_date,
      note: r.notes,
      notes: r.notes,
      imageUrl: r.image_url || '',
      healthUpdate: r.health_update || '',
      mood: r.mood || 'Khỏe mạnh',
      weightKg: r.weight_kg != null ? Number(r.weight_kg) : undefined,
      petName: r.pet_name,
    }));
  },

  async createCareLog(log: Partial<CareLog>): Promise<CareLog> {
    const pool = getMySqlPool();
    const logId = genId('LOG');
    await pool.query(
      `INSERT INTO care_logs (log_id, pet_id, user_id, author_name, log_date, notes, image_url, health_update, mood, weight_kg)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        log.petId,
        log.userId || null,
        log.authorName || 'Người nhận nuôi',
        log.logDate || new Date().toISOString().split('T')[0],
        log.note || log.notes || '',
        log.imageUrl || '',
        log.healthUpdate || '',
        log.mood || 'Vui vẻ & Tăng động',
        log.weightKg ?? null,
      ]
    );

    return {
      logId,
      petId: log.petId!,
      userId: log.userId || '',
      authorName: log.authorName || 'Người nhận nuôi',
      logDate: log.logDate || new Date().toISOString().split('T')[0],
      note: log.note || log.notes || '',
      notes: log.note || log.notes || '',
      imageUrl: log.imageUrl || '',
      healthUpdate: log.healthUpdate || '',
      weightKg: log.weightKg ?? undefined,
      mood: log.mood || 'Khỏe mạnh',
    };
  },

  // Donations
  async getDonations(): Promise<Donation[]> {
    const pool = getMySqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM donations ORDER BY created_at DESC');
    return (rows as any[]).map((r) => ({
      donationId: r.donation_id,
      userId: r.user_id,
      donorName: r.donor_name,
      donorEmail: r.donor_email,
      amount: Number(r.amount),
      date: r.date,
      target: r.target || 'Quỹ y tế & thức ăn cho thú cưng',
      message: r.message || '',
      paymentMethod: r.payment_method || 'Chuyển khoản',
    }));
  },

  async createDonation(data: Partial<Donation>): Promise<Donation> {
    const pool = getMySqlPool();
    const donationId = genId('DON');
    await pool.query(
      `INSERT INTO donations (donation_id, user_id, donor_name, donor_email, amount, date, target, message, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        donationId,
        data.userId || null,
        data.donorName || 'Nhà hảo tâm',
        data.donorEmail || '',
        data.amount || 100000,
        data.date || new Date().toISOString().split('T')[0],
        data.target || 'Quỹ cứu trợ PawFund',
        data.message || '',
        data.paymentMethod || 'VietQR',
      ]
    );

    return {
      donationId,
      userId: data.userId,
      donorName: data.donorName || 'Nhà hảo tâm',
      donorEmail: data.donorEmail,
      amount: data.amount || 100000,
      date: data.date || new Date().toISOString().split('T')[0],
      target: data.target || 'Quỹ cứu trợ PawFund',
      message: data.message || '',
      paymentMethod: data.paymentMethod || 'VietQR',
    };
  },

  // In-App Notifications
  async getNotifications(userIdOrEmail?: string): Promise<InAppNotification[]> {
    const pool = getMySqlPool();
    let query = 'SELECT * FROM in_app_notifications';
    const params: any[] = [];
    if (userIdOrEmail) {
      query += ' WHERE user_id = ? OR recipient_email = ?';
      params.push(userIdOrEmail, userIdOrEmail);
    }
    query += ' ORDER BY created_at DESC LIMIT 50';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return (rows as any[]).map((r) => ({
      notificationId: r.notification_id,
      userId: r.user_id,
      recipientEmail: r.recipient_email,
      title: r.title,
      message: r.message,
      type: r.type,
      isRead: Boolean(r.is_read),
      link: r.link,
      createdAt: r.created_at,
    }));
  },

  async createNotification(notif: Partial<InAppNotification>): Promise<InAppNotification> {
    const pool = getMySqlPool();
    const id = genId('NOTIF');
    await pool.query(
      `INSERT INTO in_app_notifications (notification_id, user_id, recipient_email, title, message, type, is_read, link)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        id,
        notif.userId || null,
        notif.recipientEmail || null,
        notif.title || 'Thông báo mới',
        notif.message || '',
        notif.type || 'system',
        notif.link || '',
      ]
    );
    return {
      notificationId: id,
      userId: notif.userId,
      recipientEmail: notif.recipientEmail,
      title: notif.title || 'Thông báo mới',
      message: notif.message || '',
      type: (notif.type as any) || 'system',
      isRead: false,
      link: notif.link,
      createdAt: new Date().toISOString(),
    };
  },

  async markNotificationRead(id: string): Promise<boolean> {
    const pool = getMySqlPool();
    const [res] = await pool.query<ResultSetHeader>(
      'UPDATE in_app_notifications SET is_read = 1 WHERE notification_id = ?',
      [id]
    );
    return res.affectedRows > 0;
  },

  // Users
  async getUsers(): Promise<User[]> {
    const pool = getMySqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users ORDER BY created_at ASC');
    return (rows as any[]).map((r) => ({
      userId: r.user_id,
      username: r.username,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone || '',
      address: r.address || '',
      role: r.role,
      avatarUrl: r.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      createdAt: r.created_at,
    }));
  },

  async getUserByEmailOrUsername(identifier: string): Promise<any | null> {
    const pool = getMySqlPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1',
      [identifier, identifier]
    );
    if (rows.length === 0) return null;
    return rows[0];
  },

  async createUser(data: {
    fullName: string;
    email: string;
    passwordHash: string;
    phone?: string;
    address?: string;
    role?: 'Adopter' | 'Admin';
  }): Promise<User> {
    const pool = getMySqlPool();
    const userId = `USR-${Date.now()}`;
    await pool.query(
      `INSERT INTO users (user_id, username, full_name, email, password_hash, phone, address, role, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        data.email.split('@')[0],
        data.fullName,
        data.email,
        data.passwordHash,
        data.phone || '',
        data.address || '',
        data.role || 'Adopter',
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      ]
    );

    return {
      userId,
      username: data.email.split('@')[0],
      fullName: data.fullName,
      email: data.email,
      phone: data.phone || '',
      address: data.address || '',
      role: data.role || 'Adopter',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      createdAt: new Date().toISOString(),
    };
  },

  async updateUserAvatar(userId: string, avatarUrl: string): Promise<boolean> {
    const pool = getMySqlPool();
    const [res] = await pool.query<any>('UPDATE users SET avatar_url = ? WHERE user_id = ?', [avatarUrl, userId]);
    return res.affectedRows > 0;
  },
};

export default MySqlService;
