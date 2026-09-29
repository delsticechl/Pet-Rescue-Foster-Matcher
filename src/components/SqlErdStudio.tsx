import React, { useState } from 'react';
import {
  Database,
  Key,
  Link,
  Code2,
  Play,
  Copy,
  Check,
  Table,
  Layers,
  Sparkles,
  ShieldCheck,
  Clock,
  Terminal,
  Upload,
  Globe,
  Server,
} from 'lucide-react';
import { api } from '../services/api';
import { RestApiExplorer } from './RestApiExplorer';
import { MySqlConnectionPanel } from './MySqlConnectionPanel';

export const SqlErdStudio: React.FC<{ defaultTab?: 'erd' | 'query' | 'ddl' | 'rest' | 'mysql' }> = ({ defaultTab = 'erd' }) => {
  const [activeTab, setActiveTab] = useState<'erd' | 'query' | 'ddl' | 'rest' | 'mysql'>(defaultTab);
  const [queryInput, setQueryInput] = useState<string>(
    "SELECT * FROM vw_ShelterStatistics;"
  );
  const [queryResult, setQueryResult] = useState<any | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [copiedDdl, setCopiedDdl] = useState(false);

  // ERD Entities definition in English
  const tables = [
    {
      name: 'USERS',
      description: 'System user accounts (Adopters, Rescue Staff, Administrators)',
      color: 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
      headerBg: 'bg-blue-600 text-white',
      columns: [
        { name: 'UserID', type: 'VARCHAR(20)', pk: true, fk: false, null: false },
        { name: 'FullName', type: 'VARCHAR(100)', pk: false, fk: false, null: false },
        { name: 'Email', type: 'VARCHAR(100)', pk: false, fk: false, null: false, unique: true },
        { name: 'PasswordHash', type: 'VARCHAR(255)', pk: false, fk: false, null: false },
        { name: 'Phone', type: 'VARCHAR(20)', pk: false, fk: false, null: true },
        { name: 'Address', type: 'VARCHAR(255)', pk: false, fk: false, null: true },
        { name: 'Role', type: "ENUM('Adopter','RescueStaff','Admin')", pk: false, fk: false, null: false },
        { name: 'CreatedAt', type: 'TIMESTAMP', pk: false, fk: false, null: false },
      ],
    },
    {
      name: 'SHELTERS',
      description: 'Rescue facilities and shelters managing intake and capacity',
      color: 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20',
      headerBg: 'bg-emerald-600 text-white',
      columns: [
        { name: 'ShelterID', type: 'VARCHAR(20)', pk: true, fk: false, null: false },
        { name: 'ShelterName', type: 'VARCHAR(150)', pk: false, fk: false, null: false },
        { name: 'Address', type: 'VARCHAR(255)', pk: false, fk: false, null: false },
        { name: 'Phone', type: 'VARCHAR(20)', pk: false, fk: false, null: false },
        { name: 'Email', type: 'VARCHAR(100)', pk: false, fk: false, null: false },
        { name: 'ManagerID', type: 'VARCHAR(20)', pk: false, fk: true, ref: 'USERS.UserID', null: false },
        { name: 'Capacity', type: 'INT', pk: false, fk: false, null: false },
      ],
    },
    {
      name: 'PETS',
      description: 'Rescued animal master profile (Central Core Entity in 3NF)',
      color: 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/20',
      headerBg: 'bg-sky-600 text-white',
      columns: [
        { name: 'PetID', type: 'VARCHAR(20)', pk: true, fk: false, null: false },
        { name: 'Name', type: 'VARCHAR(100)', pk: false, fk: false, null: false },
        { name: 'Species', type: "ENUM('Dog','Cat','Other')", pk: false, fk: false, null: false },
        { name: 'Breed', type: 'VARCHAR(100)', pk: false, fk: false, null: true },
        { name: 'AgeMonths', type: 'INT', pk: false, fk: false, null: false },
        { name: 'Gender', type: "ENUM('Male','Female')", pk: false, fk: false, null: false },
        { name: 'HealthStatus', type: "VARCHAR(50)", pk: false, fk: false, null: false },
        { name: 'Vaccinated', type: 'BOOLEAN', pk: false, fk: false, null: false },
        { name: 'Sterilized', type: 'BOOLEAN', pk: false, fk: false, null: false },
        { name: 'AdoptionStatus', type: "ENUM('Pending','Ready','Adopted','Fostered')", pk: false, fk: false, null: false },
        { name: 'EnergyLevel', type: "ENUM('Low','Medium','High')", pk: false, fk: false, null: false },
        { name: 'RequiresYard', type: 'BOOLEAN', pk: false, fk: false, null: false },
        { name: 'GoodWithKids', type: 'BOOLEAN', pk: false, fk: false, null: false },
        { name: 'ShelterID', type: 'VARCHAR(20)', pk: false, fk: true, ref: 'SHELTERS.ShelterID', null: false },
        { name: 'CreatedAt', type: 'TIMESTAMP', pk: false, fk: false, null: false },
      ],
    },
    {
      name: 'PET_IMAGES',
      description: 'Multimedia pet images with local upload storage & metadata (1:N)',
      color: 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20',
      headerBg: 'bg-purple-600 text-white',
      columns: [
        { name: 'ImageID', type: 'VARCHAR(30)', pk: true, fk: false, null: false },
        { name: 'PetID', type: 'VARCHAR(20)', pk: false, fk: true, ref: 'PETS.PetID', null: false },
        { name: 'ImageURL', type: 'LONGTEXT', pk: false, fk: false, null: false },
        { name: 'FileName', type: 'VARCHAR(255)', pk: false, fk: false, null: true },
        { name: 'FileSize', type: 'INT', pk: false, fk: false, null: true },
        { name: 'MimeType', type: 'VARCHAR(50)', pk: false, fk: false, null: true },
        { name: 'UploadSource', type: "ENUM('LocalUpload','ExternalURL')", pk: false, fk: false, null: false },
        { name: 'IsPrimary', type: 'BOOLEAN', pk: false, fk: false, null: false },
        { name: 'Caption', type: 'VARCHAR(255)', pk: false, fk: false, null: true },
        { name: 'UploadedAt', type: 'TIMESTAMP', pk: false, fk: false, null: false },
      ],
    },
    {
      name: 'ADOPTION_APPLICATIONS',
      description: 'Adoption and foster applications (N:N bridge with status tracking)',
      color: 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20',
      headerBg: 'bg-indigo-600 text-white',
      columns: [
        { name: 'ApplicationID', type: 'VARCHAR(20)', pk: true, fk: false, null: false },
        { name: 'PetID', type: 'VARCHAR(20)', pk: false, fk: true, ref: 'PETS.PetID', null: false },
        { name: 'UserID', type: 'VARCHAR(20)', pk: false, fk: true, ref: 'USERS.UserID', null: false },
        { name: 'Type', type: "ENUM('Adopt','Foster')", pk: false, fk: false, null: false },
        { name: 'HousingType', type: "VARCHAR(50)", pk: false, fk: false, null: false },
        { name: 'HasYard', type: 'BOOLEAN', pk: false, fk: false, null: false },
        { name: 'Status', type: "ENUM('Submitted','Interviewing','Approved','Rejected')", pk: false, fk: false, null: false },
        { name: 'AppliedAt', type: 'TIMESTAMP', pk: false, fk: false, null: false },
        { name: 'ReviewedAt', type: 'TIMESTAMP', pk: false, fk: false, null: true },
      ],
    },
    {
      name: 'CARE_LOGS',
      description: 'Monthly post-adoption follow-up reports and wellness check-ins',
      color: 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20',
      headerBg: 'bg-teal-600 text-white',
      columns: [
        { name: 'LogID', type: 'VARCHAR(20)', pk: true, fk: false, null: false },
        { name: 'PetID', type: 'VARCHAR(20)', pk: false, fk: true, ref: 'PETS.PetID', null: false },
        { name: 'UserID', type: 'VARCHAR(20)', pk: false, fk: true, ref: 'USERS.UserID', null: false },
        { name: 'LogDate', type: 'DATE', pk: false, fk: false, null: false },
        { name: 'Note', type: 'TEXT', pk: false, fk: false, null: false },
        { name: 'ImageURL', type: 'LONGTEXT', pk: false, fk: false, null: true },
        { name: 'HealthUpdate', type: 'VARCHAR(255)', pk: false, fk: false, null: true },
        { name: 'WeightKg', type: 'DECIMAL(4,2)', pk: false, fk: false, null: true },
      ],
    },
    {
      name: 'DONATIONS',
      description: 'Charity funding transactions supporting animal shelter operations',
      color: 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20',
      headerBg: 'bg-amber-600 text-white',
      columns: [
        { name: 'DonationID', type: 'VARCHAR(20)', pk: true, fk: false, null: false },
        { name: 'UserID', type: 'VARCHAR(20)', pk: false, fk: true, ref: 'USERS.UserID', null: true },
        { name: 'ShelterID', type: 'VARCHAR(20)', pk: false, fk: true, ref: 'SHELTERS.ShelterID', null: false },
        { name: 'Amount', type: 'DECIMAL(12,2)', pk: false, fk: false, null: false },
        { name: 'PaymentMethod', type: 'VARCHAR(50)', pk: false, fk: false, null: false },
        { name: 'TransactionCode', type: 'VARCHAR(50)', pk: false, fk: false, null: false, unique: true },
        { name: 'DonatedAt', type: 'TIMESTAMP', pk: false, fk: false, null: false },
      ],
    },
    {
      name: 'PET_MEDICAL_RECORDS',
      description: 'Veterinary health history, vaccination log, and scheduled follow-ups',
      color: 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20',
      headerBg: 'bg-rose-600 text-white',
      columns: [
        { name: 'RecordID', type: 'VARCHAR(20)', pk: true, fk: false, null: false },
        { name: 'PetID', type: 'VARCHAR(20)', pk: false, fk: true, ref: 'PETS.PetID', null: false },
        { name: 'MedicalDate', type: 'DATE', pk: false, fk: false, null: false },
        { name: 'Diagnosis', type: 'VARCHAR(255)', pk: false, fk: false, null: false },
        { name: 'Treatment', type: 'TEXT', pk: false, fk: false, null: false },
        { name: 'VetName', type: 'VARCHAR(100)', pk: false, fk: false, null: false },
        { name: 'NextFollowUp', type: 'DATE', pk: false, fk: false, null: true },
      ],
    },
  ];

  const fullDdlSql = `
-- =========================================================================
-- PET RESCUE & FOSTER MATCHER DATABASE SCHEMA
-- Relational 3NF Model Architecture (MySQL 8.0+ / InnoDB Engine)
-- Updated with Device File Upload Storage (LONGTEXT Base64 / File Metadata)
-- =========================================================================

-- 1. Table USERS
CREATE TABLE USERS (
    UserID VARCHAR(20) PRIMARY KEY,
    FullName VARCHAR(100) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    Phone VARCHAR(20),
    Address VARCHAR(255),
    Role ENUM('Adopter', 'RescueStaff', 'Admin') NOT NULL DEFAULT 'Adopter',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Table SHELTERS
CREATE TABLE SHELTERS (
    ShelterID VARCHAR(20) PRIMARY KEY,
    ShelterName VARCHAR(150) NOT NULL,
    Address VARCHAR(255) NOT NULL,
    Phone VARCHAR(20) NOT NULL,
    Email VARCHAR(100) NOT NULL,
    ManagerID VARCHAR(20) NOT NULL,
    Capacity INT NOT NULL DEFAULT 50,
    CONSTRAINT fk_shelter_manager FOREIGN KEY (ManagerID) REFERENCES USERS(UserID) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Table PETS
CREATE TABLE PETS (
    PetID VARCHAR(20) PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Species ENUM('Dog', 'Cat', 'Other') NOT NULL,
    Breed VARCHAR(100),
    AgeMonths INT NOT NULL,
    Gender ENUM('Male', 'Female') NOT NULL,
    HealthStatus VARCHAR(50) NOT NULL DEFAULT 'Healthy',
    Vaccinated BOOLEAN NOT NULL DEFAULT FALSE,
    Sterilized BOOLEAN NOT NULL DEFAULT FALSE,
    AdoptionStatus ENUM('Pending', 'Ready', 'Adopted', 'Fostered') NOT NULL DEFAULT 'Ready',
    EnergyLevel ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
    RequiresYard BOOLEAN NOT NULL DEFAULT FALSE,
    GoodWithKids BOOLEAN NOT NULL DEFAULT TRUE,
    GoodWithPets BOOLEAN NOT NULL DEFAULT TRUE,
    Description TEXT,
    ShelterID VARCHAR(20) NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pet_shelter FOREIGN KEY (ShelterID) REFERENCES SHELTERS(ShelterID) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Table PET_IMAGES (Configured for Local Computer Uploads & Metadata)
-- NOTE: Uses LONGTEXT to safely accommodate Base64 data strings without truncation,
-- accompanied by original file metadata (FileName, FileSize, MimeType, UploadSource).
CREATE TABLE PET_IMAGES (
    ImageID VARCHAR(30) PRIMARY KEY,
    PetID VARCHAR(20) NOT NULL,
    ImageURL LONGTEXT NOT NULL COMMENT 'Stores Base64 Data URL from local uploads or CDN storage path',
    FileName VARCHAR(255) NULL COMMENT 'Original file name uploaded from computer',
    FileSize INT NULL COMMENT 'File size in bytes',
    MimeType VARCHAR(50) NULL COMMENT 'MIME format e.g. image/jpeg, image/png, image/webp',
    UploadSource ENUM('LocalUpload', 'ExternalURL') NOT NULL DEFAULT 'LocalUpload',
    IsPrimary BOOLEAN NOT NULL DEFAULT FALSE,
    Caption VARCHAR(255),
    UploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_image_pet FOREIGN KEY (PetID) REFERENCES PETS(PetID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Table ADOPTION_APPLICATIONS
CREATE TABLE ADOPTION_APPLICATIONS (
    ApplicationID VARCHAR(20) PRIMARY KEY,
    PetID VARCHAR(20) NOT NULL,
    UserID VARCHAR(20) NOT NULL,
    Type ENUM('Adopt', 'Foster') NOT NULL DEFAULT 'Adopt',
    HousingType VARCHAR(50) NOT NULL,
    HasYard BOOLEAN NOT NULL DEFAULT FALSE,
    ExperienceDescription TEXT,
    Status ENUM('Submitted', 'Interviewing', 'Approved', 'Rejected') NOT NULL DEFAULT 'Submitted',
    StaffNotes TEXT,
    AppliedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ReviewedAt TIMESTAMP NULL,
    CONSTRAINT fk_app_pet FOREIGN KEY (PetID) REFERENCES PETS(PetID) ON UPDATE CASCADE,
    CONSTRAINT fk_app_user FOREIGN KEY (UserID) REFERENCES USERS(UserID) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Table CARE_LOGS
CREATE TABLE CARE_LOGS (
    LogID VARCHAR(20) PRIMARY KEY,
    PetID VARCHAR(20) NOT NULL,
    UserID VARCHAR(20) NOT NULL,
    LogDate DATE NOT NULL,
    Note TEXT NOT NULL,
    ImageURL LONGTEXT,
    HealthUpdate VARCHAR(255),
    WeightKg DECIMAL(4,2),
    CONSTRAINT fk_log_pet FOREIGN KEY (PetID) REFERENCES PETS(PetID) ON DELETE CASCADE,
    CONSTRAINT fk_log_user FOREIGN KEY (UserID) REFERENCES USERS(UserID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Table DONATIONS
CREATE TABLE DONATIONS (
    DonationID VARCHAR(20) PRIMARY KEY,
    UserID VARCHAR(20) NULL,
    ShelterID VARCHAR(20) NOT NULL,
    Amount DECIMAL(12,2) NOT NULL CHECK (Amount > 0),
    PaymentMethod VARCHAR(50) NOT NULL,
    TransactionCode VARCHAR(50) NOT NULL UNIQUE,
    DonatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_donation_user FOREIGN KEY (UserID) REFERENCES USERS(UserID),
    CONSTRAINT fk_donation_shelter FOREIGN KEY (ShelterID) REFERENCES SHELTERS(ShelterID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Table PET_MEDICAL_RECORDS
CREATE TABLE PET_MEDICAL_RECORDS (
    RecordID VARCHAR(20) PRIMARY KEY,
    PetID VARCHAR(20) NOT NULL,
    MedicalDate DATE NOT NULL,
    Diagnosis VARCHAR(255) NOT NULL,
    Treatment TEXT NOT NULL,
    VetName VARCHAR(100) NOT NULL,
    NextFollowUp DATE NULL,
    CONSTRAINT fk_med_pet FOREIGN KEY (PetID) REFERENCES PETS(PetID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================================
-- TRIGGER 1: Prevent duplicate application if pet is already 'Adopted'
-- =========================================================================
DELIMITER $$
CREATE TRIGGER trg_CheckPetNotAdoptedBeforeApply
BEFORE INSERT ON ADOPTION_APPLICATIONS
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(20);
    SELECT AdoptionStatus INTO v_status FROM PETS WHERE PetID = NEW.PetID;
    
    IF v_status = 'Adopted' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'This pet has already been adopted. New applications are closed!';
    END IF;
END$$
DELIMITER ;

-- =========================================================================
-- TRIGGER 2: Auto-update pet adoption status upon approval
-- =========================================================================
DELIMITER $$
CREATE TRIGGER trg_UpdatePetStatusOnAdoptionApproved
AFTER UPDATE ON ADOPTION_APPLICATIONS
FOR EACH ROW
BEGIN
    IF NEW.Status = 'Approved' AND OLD.Status <> 'Approved' THEN
        IF NEW.Type = 'Foster' THEN
            UPDATE PETS SET AdoptionStatus = 'Fostered' WHERE PetID = NEW.PetID;
        ELSE
            UPDATE PETS SET AdoptionStatus = 'Adopted' WHERE PetID = NEW.PetID;
        END IF;
    END IF;
END$$
DELIMITER ;

-- =========================================================================
-- VIEW: vw_ShelterStatistics (Aggregated Shelter KPIs)
-- =========================================================================
CREATE OR REPLACE VIEW vw_ShelterStatistics AS
SELECT 
    s.ShelterID,
    s.ShelterName,
    COUNT(DISTINCT p.PetID) AS TotalPets,
    SUM(CASE WHEN p.AdoptionStatus = 'Ready' THEN 1 ELSE 0 END) AS ReadyPets,
    SUM(CASE WHEN p.AdoptionStatus = 'Adopted' THEN 1 ELSE 0 END) AS AdoptedPets,
    SUM(CASE WHEN p.AdoptionStatus = 'Fostered' THEN 1 ELSE 0 END) AS FosteredPets,
    COALESCE(SUM(d.Amount), 0) AS TotalDonations
FROM SHELTERS s
LEFT JOIN PETS p ON s.ShelterID = p.ShelterID
LEFT JOIN DONATIONS d ON s.ShelterID = d.ShelterID
GROUP BY s.ShelterID, s.ShelterName;
  `.trim();

  const handleExecuteQuery = async () => {
    setQueryLoading(true);
    setQueryError(null);
    try {
      const res = await api.executeRawSql(queryInput);
      setQueryResult(res);
    } catch (err: any) {
      setQueryError(err.message || 'SQL query execution failed');
      setQueryResult(null);
    } finally {
      setQueryLoading(false);
    }
  };

  const handleCopyDdl = () => {
    navigator.clipboard.writeText(fullDdlSql);
    setCopiedDdl(true);
    setTimeout(() => setCopiedDdl(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <Database className="w-3.5 h-3.5" /> Database Architecture & ERD Studio (3NF)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Relational Model & MySQL Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Standardized 8-table 3NF schema with Primary & Foreign Keys, referential integrity,
            device upload storage (<code className="text-sky-300">LONGTEXT</code> Base64), Stored Procedures, and ACID transactions.
          </p>
        </div>

        <div className="flex bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 shrink-0">
          <button
            onClick={() => setActiveTab('erd')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'erd' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            ERD Diagram (8 Tables)
          </button>
          <button
            onClick={() => setActiveTab('query')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'query' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Interactive SQL Runner
          </button>
          <button
            onClick={() => setActiveTab('ddl')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ddl' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            DDL & Triggers Script
          </button>
          <button
            onClick={() => setActiveTab('rest')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'rest' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> REST API & OpenAPI 3.0
          </button>
          <button
            onClick={() => setActiveTab('mysql')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'mysql' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" /> Kết Nối MySQL (File Riêng)
          </button>
        </div>
      </div>

      {/* TAB 1: VISUAL ERD DIAGRAM */}
      {activeTab === 'erd' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-500 shrink-0" />
              <span>
                <strong>3NF Compliance:</strong> No partial or transitive dependencies. Features local device file upload storage (<code className="font-mono font-bold text-sky-700 dark:text-sky-300">LONGTEXT</code>) for high-resolution images.
              </span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-sky-200/60 dark:bg-sky-900 text-sky-800 dark:text-sky-200">
              8 Entity Relations
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {tables.map((tbl) => (
              <div
                key={tbl.name}
                id={`erd-table-${tbl.name}`}
                className={`rounded-2xl border ${tbl.color} overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col`}
              >
                {/* Table Header */}
                <div className={`px-4 py-3 ${tbl.headerBg} flex items-center justify-between font-mono`}>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Table className="w-4 h-4" /> {tbl.name}
                  </div>
                  <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded font-sans">3NF</span>
                </div>

                <div className="p-3 bg-white/60 dark:bg-slate-900/60 text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 line-clamp-1">
                  {tbl.description}
                </div>

                {/* Column List */}
                <div className="p-3 space-y-1.5 flex-1 bg-white/80 dark:bg-slate-900/80 font-mono text-[11px]">
                  {tbl.columns.map((col) => (
                    <div
                      key={col.name}
                      className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {col.pk && (
                          <span className="text-[9px] font-bold px-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            PK
                          </span>
                        )}
                        {col.fk && (
                          <span className="text-[9px] font-bold px-1 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                            FK
                          </span>
                        )}
                        <span className={`font-semibold ${col.pk ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                          {col.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                        {col.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE SQL QUERY RUNNER */}
      {activeTab === 'query' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-sky-500" /> Live Interactive SQL Simulator
                </h3>
                <p className="text-xs text-slate-400">Execute SELECT, JOIN, and VIEW statements directly against the 3NF data store</p>
              </div>

              {/* Preset Query Buttons */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  onClick={() => setQueryInput("SELECT * FROM vw_ShelterStatistics;")}
                  className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-[11px] font-semibold border border-sky-200"
                >
                  VIEW: vw_ShelterStatistics
                </button>
                <button
                  onClick={() => setQueryInput("SELECT * FROM PETS WHERE AdoptionStatus = 'Ready';")}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200"
                >
                  SELECT Ready Pets
                </button>
                <button
                  onClick={() => setQueryInput("SELECT * FROM PET_IMAGES;")}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-200"
                >
                  SELECT Pet Images
                </button>
                <button
                  onClick={() => setQueryInput("SELECT * FROM ADOPTION_APPLICATIONS;")}
                  className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[11px] font-semibold border border-purple-200"
                >
                  SELECT Applications
                </button>
                <button
                  onClick={() => setQueryInput("SELECT * FROM DONATIONS;")}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[11px] font-semibold border border-amber-200"
                >
                  SELECT Donations
                </button>
              </div>
            </div>

            {/* SQL Editor */}
            <div className="relative font-mono text-xs">
              <textarea
                rows={4}
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                className="w-full p-4 rounded-2xl bg-slate-900 text-sky-300 border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-sky-500 leading-relaxed"
                placeholder="Enter SQL statement e.g. SELECT * FROM PETS..."
              />
              <button
                id="btn-execute-raw-sql"
                onClick={handleExecuteQuery}
                disabled={queryLoading || !queryInput.trim()}
                className="absolute bottom-4 right-4 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50 font-sans"
              >
                {queryLoading ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                Execute Query
              </button>
            </div>

            {/* Error Display */}
            {queryError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-mono">
                [SQL Error]: {queryError}
              </div>
            )}

            {/* Result Table */}
            {queryResult && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    ✓ Query executed successfully ({queryResult.rowCount} rows returned in {queryResult.executionTimeMs} ms)
                  </span>
                  {queryResult.notice && <span className="italic text-[11px]">{queryResult.notice}</span>}
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 max-h-96">
                  {Array.isArray(queryResult.data) && queryResult.data.length > 0 ? (
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-400 uppercase text-[10px] sticky top-0 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          {Object.keys(queryResult.data[0]).slice(0, 7).map((key) => (
                            <th key={key} className="px-4 py-2.5 whitespace-nowrap">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {queryResult.data.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            {Object.keys(row).slice(0, 7).map((k) => (
                              <td key={k} className="px-4 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                                {typeof row[k] === 'object' ? JSON.stringify(row[k]) : String(row[k])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs">No records returned.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DDL SCRIPT & TRIGGERS */}
      {activeTab === 'ddl' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-500" /> Full DDL Schema, Stored Procedures & Triggers
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Includes updated PET_IMAGES schema for local device file uploads (<code className="text-sky-400">LONGTEXT</code> Base64)</p>
            </div>
            <button
              onClick={handleCopyDdl}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all shrink-0"
            >
              {copiedDdl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedDdl ? 'Copied SQL!' : 'Copy SQL Script'}
            </button>
          </div>

          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 overflow-hidden shadow-xl">
            <pre className="font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto max-h-[550px] scrollbar-thin">
              {fullDdlSql}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 4: RESTFUL API EXPLORER & OPENAPI 3.0 */}
      {activeTab === 'rest' && <RestApiExplorer />}

      {/* TAB 5: MYSQL CONNECTION & LIVE DATABASE */}
      {activeTab === 'mysql' && <MySqlConnectionPanel />}
    </div>
  );
};
