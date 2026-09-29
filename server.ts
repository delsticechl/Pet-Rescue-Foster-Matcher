import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  INITIAL_USERS,
  INITIAL_SHELTERS,
  INITIAL_PETS,
  INITIAL_APPLICATIONS,
  INITIAL_CARE_LOGS,
  INITIAL_DONATIONS,
} from './src/data/initialData';
import {
  Pet,
  AdoptionApplication,
  CareLog,
  Donation,
  User,
  Shelter,
  PetMedicalRecord,
  TransactionExecutionResult,
  TransactionStepLog,
  MatchCriteria,
  EmailNotificationLog,
} from './src/types';
import { openApiSpec } from './src/data/openApiSpec';
import {
  MySqlService,
  getMySqlStatus,
  testMySqlConnection,
  initMySqlSchema,
  MYSQL_SCHEMA_DDL,
} from './src/db/mysql';

dotenv.config();

// In-Memory Relational Store with 3NF consistency & Foreign Key Integrity
let users: User[] = [...INITIAL_USERS];
let shelters: Shelter[] = [...INITIAL_SHELTERS];
let pets: Pet[] = JSON.parse(JSON.stringify(INITIAL_PETS));
let applications: AdoptionApplication[] = JSON.parse(JSON.stringify(INITIAL_APPLICATIONS));
let careLogs: CareLog[] = JSON.parse(JSON.stringify(INITIAL_CARE_LOGS));
let donations: Donation[] = JSON.parse(JSON.stringify(INITIAL_DONATIONS));
let emailLogs: EmailNotificationLog[] = [
  {
    logId: 'EML-9801',
    applicationId: 'APP-003',
    recipientEmail: 'lan.phuong@gmail.com',
    recipientName: 'Trần Thị Lan Phương',
    petName: 'Miu Miu',
    petSpecies: 'Mèo',
    petImage: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
    subject: '[PawFund] Cập nhật hồ sơ nhận nuôi #APP-003 - Phê duyệt thành công 🎉',
    status: 'Approved',
    sentAt: '2026-08-14 10:15:30',
    sender: 'PawFund Notification Service <no-reply@pawfund.org>',
    contentPreview: 'Chúc mừng bạn Lan Phương! Hồ sơ nhận nuôi bé Miu Miu (#PET-003) đã được Ban Quản Trị phê duyệt chính thức.',
    htmlContent: '<div style="font-family:sans-serif;padding:16px;"><h2>Chúc mừng bạn Lan Phương!</h2><p>Hồ sơ nhận nuôi bé <strong>Miu Miu</strong> đã được phê duyệt. Vui lòng mang theo CCCD đến Trạm Cứu Hộ Mèo Sài Gòn để hoàn tất thủ tục.</p></div>',
    smtpStatusCode: '250 2.0.0 (OK): Message queued for delivery by smtp.pawfund.internal',
    deliveryStatus: 'Delivered',
    metadata: {
      ip: '10.244.0.12',
      serverHost: 'smtp-relay-01.pawfund.internal',
      tlsVersion: 'TLSv1.3 (ECDHE-RSA-AES256-GCM-SHA384)',
      messageId: '<20260814.101530.9801@pawfund.org>',
      staffNotes: 'Hồ sơ đạt tiêu chuẩn cao. Đã duyệt giao dịch.',
    },
  },
];

// Helper: Get AI Instance safely
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// SQL Stored Procedure Simulation: sp_MatchPetsForAdopter
function executeSpMatchPetsForAdopter(criteria: MatchCriteria): Pet[] {
  // Only look for pets that are Ready for Adoption
  const candidatePets = pets.filter((p) => p.adoptionStatus === 'Ready');

  const scoredPets = candidatePets.map((pet) => {
    let score = 50; // Base score
    const reasons: string[] = [];

    // 1. Species preference check
    const critSpecies = criteria.species as string | undefined;
    if (critSpecies && critSpecies !== 'Tất cả' && critSpecies !== 'all' && critSpecies !== 'All') {
      const critSp = critSpecies.toLowerCase();
      const pSp = pet.species.toLowerCase();
      const isMatch = (critSp === pSp) ||
        ((critSp === 'dog' || critSp === 'chó') && (pSp === 'dog' || pSp === 'chó')) ||
        ((critSp === 'cat' || critSp === 'mèo') && (pSp === 'cat' || pSp === 'mèo'));

      if (isMatch) {
        score += 20;
        reasons.push(`Matches desired species (${pet.species})`);
      } else {
        score -= 30;
      }
    }

    // 2. Housing & Yard requirements
    if (pet.requiresYard) {
      const hType = criteria.housingType as string | undefined;
      if (criteria.hasYard || hType === 'Biệt thự sân vườn' || hType === 'Townhouse / Villa' || hType === 'House with Yard') {
        score += 15;
        reasons.push('Your home has ample yard space well-suited for this pet');
      } else {
        score -= 25;
        reasons.push('This pet needs an outdoor yard and is not ideal for tight spaces');
      }
    } else {
      score += 10;
      reasons.push('Adaptable temperament, comfortable in apartments or townhomes');
    }

    // 3. Children compatibility
    if (criteria.hasChildren) {
      if (pet.goodWithKids) {
        score += 15;
        reasons.push('Very gentle and safe around children');
      } else {
        score -= 20;
        reasons.push('Prefers a calmer adult-only environment');
      }
    }

    // 4. Other pets compatibility
    if (criteria.hasOtherPets) {
      if (pet.goodWithPets) {
        score += 10;
        reasons.push('Socializes well with other household pets');
      } else {
        score -= 15;
        reasons.push('Prefers being the only pet in the home');
      }
    }

    // 5. Activity & Energy compatibility
    const actPref = criteria.activityPreference as string | undefined;
    if (actPref && actPref !== 'Bất kỳ' && actPref !== 'Any') {
      const pref = actPref.toLowerCase();
      const petEnergy = pet.energyLevel.toLowerCase();
      if (
        pref === petEnergy ||
        (pref === 'high' && petEnergy === 'cao') ||
        (pref === 'medium' && petEnergy === 'trung bình') ||
        (pref === 'low' && petEnergy === 'thấp')
      ) {
        score += 10;
        reasons.push(`Energy level aligns with your lifestyle (${pet.energyLevel})`);
      }
    }

    // 6. Experience requirement
    if (pet.healthStatus === 'Bình thường' || pet.healthStatus === 'Healthy') {
      score += 10;
      reasons.push('Healthy, fully vaccinated, and easy to care for');
    }

    // Clamp score between 10% and 99%
    const finalScore = Math.min(99, Math.max(15, score));

    const shelter = shelters.find((s) => s.shelterId === pet.shelterId);
    const primaryImg = pet.images.find((img) => img.isPrimary) || pet.images[0];

    return {
      ...pet,
      shelterName: shelter ? shelter.shelterName : 'Trạm cứu hộ',
      primaryImage: primaryImg ? primaryImg.imageUrl : '',
      matchScore: finalScore,
      matchReasons: reasons,
    };
  });

  return scoredPets.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}

// SQL Trigger 1 Simulation: trg_CheckPetNotAdoptedBeforeApply
function triggerCheckPetNotAdoptedBeforeApply(petId: string) {
  const pet = pets.find((p) => p.petId === petId);
  if (!pet) {
    throw new Error(`[SQL Error 1452] Cannot add or update a child row: a foreign key constraint fails (PetID '${petId}' does not exist).`);
  }
  if (pet.adoptionStatus === 'Adopted') {
    throw new Error(`[SQL TRIGGER trg_CheckPetNotAdoptedBeforeApply VIOLATION] Thú cưng '${pet.name}' (${petId}) đã có trạng thái 'Adopted'. Không thể tiếp nhận thêm đơn đăng ký mới!`);
  }
}

// SQL Transaction: tx_ApproveAdoptionApplication
function executeTransactionApproveApplication(applicationId: string, staffNotes?: string): TransactionExecutionResult {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const steps: TransactionStepLog[] = [];
  const targetApp = applications.find((a) => a.applicationId === applicationId);

  steps.push({
    step: 1,
    query: 'START TRANSACTION;',
    status: 'SUCCESS',
    message: 'Bắt đầu phiên giao dịch (Isolation Level: REPEATABLE READ)',
    affectedRows: 0,
    timestamp: now,
  });

  if (!targetApp) {
    steps.push({
      step: 2,
      query: `SELECT * FROM ADOPTION_APPLICATIONS WHERE ApplicationID = '${applicationId}' FOR UPDATE;`,
      status: 'ERROR',
      message: `[SQL Error] Application ID '${applicationId}' không tồn tại.`,
      affectedRows: 0,
      timestamp: now,
    });
    steps.push({
      step: 3,
      query: 'ROLLBACK;',
      status: 'ROLLED_BACK',
      message: 'Giao dịch bị hoàn tác (ROLLBACK)',
      affectedRows: 0,
      timestamp: now,
    });
    return {
      transactionId: `TXN-${Date.now()}`,
      success: false,
      steps,
      finalStatus: 'ROLLED_BACK',
      message: 'Không tìm thấy hồ sơ đăng ký nhận nuôi.',
    };
  }

  const targetPet = pets.find((p) => p.petId === targetApp.petId);
  if (!targetPet) {
    steps.push({
      step: 2,
      query: `SELECT * FROM PETS WHERE PetID = '${targetApp.petId}' FOR UPDATE;`,
      status: 'ERROR',
      message: `[SQL Error] Khóa ngoại PetID '${targetApp.petId}' không tồn tại trong bảng PETS.`,
      affectedRows: 0,
      timestamp: now,
    });
    steps.push({
      step: 3,
      query: 'ROLLBACK;',
      status: 'ROLLED_BACK',
      message: 'Giao dịch bị hoàn tác do vi phạm ràng buộc toàn vẹn.',
      affectedRows: 0,
      timestamp: now,
    });
    return {
      transactionId: `TXN-${Date.now()}`,
      success: false,
      steps,
      finalStatus: 'ROLLED_BACK',
      message: 'Không tìm thấy thông tin thú cưng tương ứng.',
    };
  }

  // Step 2: Update Application status to Approved
  targetApp.status = 'Approved';
  targetApp.reviewedAt = now;
  if (staffNotes) targetApp.staffNotes = staffNotes;
  steps.push({
    step: 2,
    query: `UPDATE ADOPTION_APPLICATIONS SET Status = 'Approved', ReviewedAt = '${now}', StaffNotes = '${staffNotes || ''}' WHERE ApplicationID = '${applicationId}';`,
    status: 'SUCCESS',
    message: `Cập nhật trạng thái đơn #${applicationId} thành 'Approved'`,
    affectedRows: 1,
    timestamp: now,
  });

  // Step 3: Trigger 2: Update Pet Status to Adopted or Fostered
  const newPetStatus = targetApp.type === 'Foster' ? 'Fostered' : 'Adopted';
  targetPet.adoptionStatus = newPetStatus;
  steps.push({
    step: 3,
    query: `UPDATE PETS SET AdoptionStatus = '${newPetStatus}' WHERE PetID = '${targetPet.petId}'; -- [Trigger trg_UpdatePetStatusOnAdoptionApproved]`,
    status: 'SUCCESS',
    message: `Trigger tự động chuyển trạng thái bé '${targetPet.name}' sang '${newPetStatus}'`,
    affectedRows: 1,
    timestamp: now,
  });

  // Step 4: Auto Reject conflicting pending applications for the same pet
  let rejectedCount = 0;
  applications.forEach((app) => {
    if (app.petId === targetPet.petId && app.applicationId !== applicationId && (app.status === 'Submitted' || app.status === 'Interviewing')) {
      app.status = 'Rejected';
      app.reviewedAt = now;
      app.staffNotes = `Hệ thống tự động đóng đơn do bé ${targetPet.name} đã được phê duyệt ${targetApp.type === 'Foster' ? 'Foster' : 'nhận nuôi'} thành công.`;
      rejectedCount++;
    }
  });

  steps.push({
    step: 4,
    query: `UPDATE ADOPTION_APPLICATIONS SET Status = 'Rejected', StaffNotes = 'Tự động đóng do bé đã có người nhận nuôi' WHERE PetID = '${targetPet.petId}' AND ApplicationID != '${applicationId}' AND Status IN ('Submitted', 'Interviewing');`,
    status: 'SUCCESS',
    message: `Tự động từ chối ${rejectedCount} đơn đăng ký trùng lặp khác cho bé '${targetPet.name}'`,
    affectedRows: rejectedCount,
    timestamp: now,
  });

  // Step 5: Commit Transaction
  steps.push({
    step: 5,
    query: 'COMMIT;',
    status: 'SUCCESS',
    message: 'Hoàn tất giao dịch thành công (COMMIT)',
    affectedRows: 0,
    timestamp: now,
  });

  return {
    transactionId: `TXN-${Date.now()}`,
    success: true,
    steps,
    finalStatus: 'COMMITTED',
    message: `Đã duyệt thành công đơn nhận nuôi #${applicationId} và đồng bộ CSDL.`,
  };
}

// SQL View Simulation: vw_ShelterStatistics
function getShelterStatistics() {
  return shelters.map((shelter) => {
    const shelterPets = pets.filter((p) => p.shelterId === shelter.shelterId);
    const readyPets = shelterPets.filter((p) => p.adoptionStatus === 'Ready').length;
    const adoptedPets = shelterPets.filter((p) => p.adoptionStatus === 'Adopted').length;
    const fosteredPets = shelterPets.filter((p) => p.adoptionStatus === 'Fostered').length;

    const petIds = shelterPets.map((p) => p.petId);
    const pendingApps = applications.filter(
      (a) => petIds.includes(a.petId) && (a.status === 'Submitted' || a.status === 'Interviewing')
    ).length;

    const shelterDonations = donations.filter((d) => d.shelterId === shelter.shelterId);
    const totalDonation = shelterDonations.reduce((sum, d) => sum + d.amount, 0);

    return {
      shelterId: shelter.shelterId,
      shelterName: shelter.shelterName,
      totalPets: shelterPets.length,
      readyPets,
      adoptedPets,
      fosteredPets,
      pendingApplications: pendingApps,
      totalDonationAmount: totalDonation,
      donationCount: shelterDonations.length,
    };
  });
}

// Helper: Populate Joined Fields for Pets
function enrichPet(pet: Pet): Pet {
  const shelter = shelters.find((s) => s.shelterId === pet.shelterId);
  const primaryImg = pet.images.find((img) => img.isPrimary) || pet.images[0];
  return {
    ...pet,
    shelterName: shelter ? shelter.shelterName : 'Trạm cứu hộ',
    primaryImage: primaryImg ? primaryImg.imageUrl : '',
  };
}

// Helper: Populate Joined Fields for Applications
function enrichApplication(app: AdoptionApplication): AdoptionApplication {
  const pet = pets.find((p) => p.petId === app.petId);
  const user = users.find((u) => u.userId === app.userId);
  const shelter = pet ? shelters.find((s) => s.shelterId === pet.shelterId) : null;
  const primaryImg = pet?.images?.find((i) => i.isPrimary) || pet?.images?.[0];

  return {
    ...app,
    petName: pet?.name || 'Thú cưng',
    petSpecies: pet?.species || 'Chó',
    petBreed: pet?.breed || '',
    petImage: primaryImg?.imageUrl || '',
    applicantName: user?.fullName || 'Người dùng',
    applicantEmail: user?.email || '',
    applicantPhone: user?.phone || '',
    applicantAddress: user?.address || '',
    shelterName: shelter?.shelterName || 'Trạm cứu hộ',
  };
}

// Helper: Populate Joined Fields for CareLogs
function enrichCareLog(log: CareLog): CareLog {
  const pet = pets.find((p) => p.petId === log.petId);
  const user = users.find((u) => u.userId === log.userId);
  return {
    ...log,
    petName: pet?.name || 'Thú cưng',
    adopterName: user?.fullName || 'Người nhận nuôi',
  };
}

// Helper: Generate Simulated Email Notification & Log
function createAndRecordSimulatedEmail(
  applicationId: string,
  targetStatus?: string,
  customNote?: string,
  interviewTime?: string
): EmailNotificationLog {
  const targetApp = applications.find((a) => a.applicationId === applicationId);
  const enrichedApp = targetApp ? enrichApplication(targetApp) : null;
  const pet = pets.find((p) => p.petId === targetApp?.petId);
  const user = users.find((u) => u.userId === targetApp?.userId);
  const shelter = shelters.find((s) => s.shelterId === pet?.shelterId);

  const status = (targetStatus || targetApp?.status || 'Submitted') as any;
  const applicantName = enrichedApp?.applicantName || user?.fullName || 'Người nhận nuôi';
  const applicantEmail = enrichedApp?.applicantEmail || user?.email || 'adopter@pawfund.org';
  const petName = enrichedApp?.petName || pet?.name || 'Bé Thú Cưng';
  const shelterName = shelter?.shelterName || 'Trạm Cứu Hộ Động Vật PawFund';

  let subject = `[PawFund] Cập nhật tiến độ hồ sơ nhận nuôi #${applicationId}`;
  let contentPreview = '';
  let htmlContent = '';

  if (status === 'Approved') {
    subject = `🎉 [PawFund] Chúc mừng! Hồ sơ nhận nuôi #${applicationId} (${petName}) đã được DUYỆT`;
    contentPreview = `Xin chào ${applicantName}, hồ sơ xin nhận nuôi bé ${petName} đã được Ban Quản Trị phê duyệt chính thức.`;
    htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #0284c7, #0369a1); padding: 24px; color: #ffffff; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">🐾 PawFund - Chúc Mừng Nhận Nuôi Thành Công!</h1>
        </div>
        <div style="padding: 24px;">
          <p>Xin chào <strong>${applicantName}</strong>,</p>
          <p>Ban Quản trị Trạm <strong>${shelterName}</strong> xin trân trọng thông báo: Hồ sơ đăng ký nhận nuôi bé <strong>${petName}</strong> (Mã đơn: <code>#${applicationId}</code>) của bạn đã được <span style="color: #10b981; font-weight: bold;">PHÊ DUYỆT CHÍNH THỨC</span>.</p>
          ${customNote ? `<div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 12px; margin: 16px 0; font-size: 13px;"><em>Ghi chú từ quản trị viên:</em> ${customNote}</div>` : ''}
          <h3 style="color: #0369a1; margin-top: 20px;">Các bước tiếp theo:</h3>
          <ol style="padding-left: 20px; font-size: 14px; color: #334155;">
            <li>Mang theo CCCD/Hộ chiếu đến địa chỉ: <strong>${shelter?.address || 'Trụ sở trạm cứu hộ'}</strong>.</li>
            <li>Ký Biên bản Cam kết Nhận nuôi & Chăm sóc nhân đạo.</li>
            <li>Nhận Sổ tiêm chủng y tế và đón bé ${petName} về tổ ấm mới!</li>
          </ol>
        </div>
        <div style="background: #f1f5f9; padding: 12px; text-align: center; font-size: 11px; color: #64748b;">
          Email tự động gửi từ PawFund Platform Mail Relay Service. Vui lòng không phản hồi trực tiếp thư này.
        </div>
      </div>
    `;
  } else if (status === 'Interviewing') {
    const formattedTime = interviewTime || targetApp?.interviewTime || 'theo lịch hẹn trao đổi của trạm';
    subject = `📅 [PawFund] Lịch phỏng vấn nhận nuôi bé ${petName} - Hồ sơ #${applicationId}`;
    contentPreview = `Xin chào ${applicantName}, hồ sơ #${applicationId} đã chuyển sang bước Phỏng vấn. Lịch hẹn dự kiến: ${formattedTime}.`;
    htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #0284c7, #4f46e5); padding: 24px; color: #ffffff; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">📅 Lịch Phỏng Vấn Nhận Nuôi Thú Cưng</h1>
        </div>
        <div style="padding: 24px;">
          <p>Xin chào <strong>${applicantName}</strong>,</p>
          <p>Hồ sơ đăng ký nhận nuôi bé <strong>${petName}</strong> (Mã đơn: <code>#${applicationId}</code>) đã vượt qua vòng sơ loại và được chuyển sang giai đoạn <strong>Phỏng vấn / Gặp mặt trực tiếp</strong>.</p>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin: 16px 0;">
            <p style="margin: 0 0 6px 0;">⏰ <strong>Thời gian dự kiến:</strong> ${formattedTime}</p>
            <p style="margin: 0;">📍 <strong>Địa điểm / Hình thức:</strong> ${shelterName} (${shelter?.phone || 'Hotline trạm'})</p>
          </div>
          ${customNote ? `<div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px; margin: 16px 0; font-size: 13px;"><em>Ghi chú phỏng vấn:</em> ${customNote}</div>` : ''}
        </div>
        <div style="background: #f1f5f9; padding: 12px; text-align: center; font-size: 11px; color: #64748b;">
          Email tự động gửi từ PawFund Platform Mail Relay Service.
        </div>
      </div>
    `;
  } else if (status === 'Rejected') {
    subject = `ℹ️ [PawFund] Thông báo về hồ sơ nhận nuôi #${applicationId} (${petName})`;
    contentPreview = `Xin chào ${applicantName}, cảm ơn bạn đã quan tâm. Rất tiếc hồ sơ #${applicationId} hiện chưa phù hợp với điều kiện của bé ${petName}.`;
    htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #ffffff;">
        <div style="background: #475569; padding: 24px; color: #ffffff; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">Thông Báo Về Hồ Sơ Nhận Nuôi #${applicationId}</h1>
        </div>
        <div style="padding: 24px;">
          <p>Xin chào <strong>${applicantName}</strong>,</p>
          <p>PawFund chân thành cảm ơn tấm lòng yêu thương động vật của bạn dành cho bé <strong>${petName}</strong>.</p>
          <p>Sau khi rà soát điều kiện không gian và tiêu chí an toàn, trạm rất tiếc chưa thể ghép đôi bạn với bé ${petName} trong đợt này.</p>
          ${customNote ? `<div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0; font-size: 13px; color: #991b1b;"><em>Lý do / Phản hồi từ trạm:</em> ${customNote}</div>` : ''}
          <p style="margin-top: 16px;">Bạn vẫn có thể tìm kiếm và ứng tuyển nhận nuôi các bé cưng khác phù hợp hơn trên hệ thống PawFund bất kỳ lúc nào.</p>
        </div>
        <div style="background: #f1f5f9; padding: 12px; text-align: center; font-size: 11px; color: #64748b;">
          PawFund Animal Rescue Network.
        </div>
      </div>
    `;
  } else {
    subject = `📬 [PawFund] Cập nhật trạng thái hồ sơ #${applicationId} - ${status}`;
    contentPreview = `Xin chào ${applicantName}, trạng thái hồ sơ nhận nuôi bé ${petName} đã được cập nhật thành: ${status}.`;
    htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #ffffff;">
        <div style="background: #0284c7; padding: 20px; color: #ffffff; text-align: center;">
          <h2 style="margin: 0;">Thông Báo Cập Nhật Trạng Thái Hồ Sơ</h2>
        </div>
        <div style="padding: 20px;">
          <p>Xin chào <strong>${applicantName}</strong>,</p>
          <p>Hồ sơ nhận nuôi bé <strong>${petName}</strong> (Mã đơn: <code>#${applicationId}</code>) hiện có trạng thái: <strong>${status}</strong>.</p>
          ${customNote ? `<div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 12px; margin: 16px 0; font-size: 13px;"><em>Ghi chú:</em> ${customNote}</div>` : ''}
        </div>
      </div>
    `;
  }

  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);
  const logId = `EML-${Date.now().toString().slice(-4)}`;

  const log: EmailNotificationLog = {
    logId,
    applicationId,
    recipientEmail: applicantEmail,
    recipientName: applicantName,
    petName,
    petSpecies: enrichedApp?.petSpecies || pet?.species,
    petImage: enrichedApp?.petImage || pet?.images?.[0]?.imageUrl,
    subject,
    status,
    sentAt: dateStr,
    sender: 'PawFund Notification Service <no-reply@pawfund.org>',
    contentPreview,
    htmlContent,
    smtpStatusCode: '250 2.0.0 (OK): Message queued for delivery by smtp-relay.pawfund.internal',
    deliveryStatus: 'Delivered',
    metadata: {
      ip: '10.244.1.84',
      serverHost: 'mail-gateway.pawfund.internal',
      tlsVersion: 'TLSv1.3 (Cipher: TLS_AES_256_GCM_SHA384)',
      messageId: `<${Date.now()}.${logId}@mail.pawfund.org>`,
      interviewTime: interviewTime || targetApp?.interviewTime,
      staffNotes: customNote || targetApp?.staffNotes,
    },
  };

  emailLogs.unshift(log);
  return log;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ----------------------------------------------------
  // RESTFUL API STANDARDS & MIDDLEWARE
  // ----------------------------------------------------
  // High-precision response time calculation header
  app.use((req, res, next) => {
    const start = process.hrtime();
    const originalSend = res.send;
    res.send = function (body) {
      if (!res.headersSent) {
        const diff = process.hrtime(start);
        const timeMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
        res.setHeader('X-Response-Time', `${timeMs}ms`);
      }
      return originalSend.call(this, body);
    };
    next();
  });

  // REST standard headers and CORS
  app.use((req, res, next) => {
    res.setHeader('X-API-Version', '1.0.0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-Role'
    );
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Length, Location, X-API-Version, X-Response-Time, X-Total-Count, X-Page, X-Per-Page'
    );
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // Create unified RESTful API router (Mounted at /api/v1 and /api for full backwards compatibility)
  const apiRouter = express.Router();

  // 1. ROOT SERVICE DISCOVERY & HATEOAS
  apiRouter.get('/', (req, res) => {
    const base = req.baseUrl || '/api/v1';
    res.json({
      title: 'PawFund Pet Rescue & Foster Platform RESTful API',
      version: '1.0.0',
      description: 'Standard RESTful API compliant with OpenAPI 3.0.0 and Richardson Maturity Model Level 3.',
      status: 'active',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      openapi: `${base}/openapi.json`,
      _links: {
        self: { href: `${base}`, methods: ['GET'] },
        openapi: { href: `${base}/openapi.json`, methods: ['GET'] },
        health: { href: `${base}/health`, methods: ['GET'] },
        stats: { href: `${base}/stats`, methods: ['GET'] },
        pets: { href: `${base}/pets`, methods: ['GET', 'POST'] },
        shelters: { href: `${base}/shelters`, methods: ['GET', 'POST'] },
        applications: { href: `${base}/applications`, methods: ['GET', 'POST'] },
        careLogs: { href: `${base}/care-logs`, methods: ['GET', 'POST'] },
        healthReminders: { href: `${base}/health-reminders`, methods: ['GET'] },
        donations: { href: `${base}/donations`, methods: ['GET', 'POST'] },
        users: { href: `${base}/users`, methods: ['GET'] },
        upload: { href: `${base}/upload`, methods: ['POST'] },
      },
    });
  });

  // OpenAPI 3.0 Document JSON
  apiRouter.get('/openapi.json', (req, res) => {
    res.json(openApiSpec);
  });

  // ----------------------------------------------------
  // MYSQL CONNECTION & CONFIGURATION ENDPOINTS
  // ----------------------------------------------------
  apiRouter.get('/mysql/status', (req, res) => {
    res.json(getMySqlStatus());
  });

  apiRouter.post('/mysql/test', async (req, res) => {
    const { host, port, user, password, database } = req.body || {};
    const configToTest = {
      ...(host ? { host } : {}),
      ...(port ? { port: Number(port) } : {}),
      ...(user ? { user } : {}),
      ...(password !== undefined ? { password } : {}),
      ...(database ? { database } : {}),
    };
    const result = await testMySqlConnection(Object.keys(configToTest).length > 0 ? configToTest : undefined);
    res.json(result);
  });

  apiRouter.post('/mysql/init-schema', async (req, res) => {
    const result = await initMySqlSchema();
    res.json(result);
  });

  apiRouter.get('/mysql/schema-sql', (req, res) => {
    res.type('text/plain').send(MYSQL_SCHEMA_DDL);
  });

  apiRouter.post('/mysql/seed', async (req, res) => {
    try {
      const status = getMySqlStatus();
      if (!status.isConnected) {
        const testRes = await testMySqlConnection();
        if (!testRes.success) {
          return res.status(400).json({ success: false, message: 'Chưa kết nối được với MySQL. Vui lòng kiểm tra lại thông tin máy chủ MySQL.' });
        }
      }

      // Ensure schema tables exist first
      await initMySqlSchema();

      // Seed Users
      for (const u of INITIAL_USERS) {
        await MySqlService.execute(
          `INSERT IGNORE INTO users (user_id, username, full_name, email, password_hash, phone, address, role, avatar_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [u.userId, u.username || '', u.fullName, u.email, 'hashed_pwd', u.phone || '', u.address || '', u.role, u.avatarUrl || '']
        );
      }

      // Seed Shelters
      for (const s of INITIAL_SHELTERS) {
        await MySqlService.execute(
          `INSERT IGNORE INTO shelters (shelter_id, shelter_name, address, phone, email, manager_id, capacity, current_occupancy, image_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.shelterId, s.shelterName, s.address, s.phone, s.email, s.managerId, s.capacity, s.currentOccupancy || 0, s.imageUrl || '']
        );
      }

      // Seed Pets & Images & Medical records
      for (const p of INITIAL_PETS) {
        await MySqlService.execute(
          `INSERT IGNORE INTO pets (pet_id, name, species, breed, age_months, gender, health_status, vaccinated, sterilized, adoption_status, energy_level, requires_yard, good_with_kids, good_with_pets, description, shelter_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.petId,
            p.name,
            p.species,
            p.breed || '',
            p.ageMonths || 12,
            p.gender,
            p.healthStatus,
            p.vaccinated ? 1 : 0,
            p.sterilized ? 1 : 0,
            p.adoptionStatus || 'Ready',
            p.energyLevel || 'Medium',
            p.requiresYard ? 1 : 0,
            p.goodWithKids ? 1 : 0,
            p.goodWithPets ? 1 : 0,
            p.description || '',
            p.shelterId,
          ]
        );

        if (p.images && p.images.length > 0) {
          for (const img of p.images) {
            await MySqlService.execute(
              `INSERT IGNORE INTO pet_images (image_id, pet_id, image_url, is_primary, caption)
               VALUES (?, ?, ?, ?, ?)`,
              [img.imageId, p.petId, img.imageUrl, img.isPrimary ? 1 : 0, img.caption || '']
            );
          }
        } else if (p.imageUrl) {
          await MySqlService.execute(
            `INSERT IGNORE INTO pet_images (image_id, pet_id, image_url, is_primary)
             VALUES (?, ?, ?, 1)`,
            [`IMG-${p.petId}-1`, p.petId, p.imageUrl]
          );
        }

        if (p.medicalHistory && p.medicalHistory.length > 0) {
          for (const med of p.medicalHistory) {
            await MySqlService.execute(
              `INSERT IGNORE INTO pet_medical_records (record_id, pet_id, medical_date, diagnosis, treatment, vet_name, next_follow_up, medications, reminder_status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [med.recordId, p.petId, med.medicalDate, med.diagnosis, med.treatment, med.vetName, med.nextFollowUp || null, med.medications || null, med.reminderStatus || 'Pending']
            );
          }
        }
      }

      // Seed Donations
      for (const d of INITIAL_DONATIONS) {
        await MySqlService.execute(
          `INSERT IGNORE INTO donations (donation_id, donor_name, amount, date, target, message, payment_method)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [d.donationId, d.donorName, d.amount, d.date, d.target, d.message || '', d.paymentMethod || 'Transfer']
        );
      }

      // Seed Care Logs
      for (const c of INITIAL_CARE_LOGS) {
        await MySqlService.execute(
          `INSERT IGNORE INTO care_logs (log_id, pet_id, staff_name, log_date, category, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [c.logId, c.petId, c.staffName, c.logDate, c.category, c.notes]
        );
      }

      res.json({ success: true, message: 'Đã nhập dữ liệu mẫu vào MySQL thành công!' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Lỗi nhập dữ liệu vào MySQL: ${err.message || String(err)}` });
    }
  });

  // Health Probe
  apiRouter.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      databaseEngine: 'In-Memory 3NF Relational Engine',
      entities: {
        users: users.length,
        shelters: shelters.length,
        pets: pets.length,
        applications: applications.length,
        careLogs: careLogs.length,
        donations: donations.length,
        emailLogs: emailLogs.length,
      },
    });
  });

  // Aggregated System Stats
  apiRouter.get('/stats', (req, res) => {
    const shelterStats = getShelterStatistics();
    const totalPets = pets.length;
    const readyPets = pets.filter((p) => p.adoptionStatus === 'Ready').length;
    const adoptedPets = pets.filter((p) => p.adoptionStatus === 'Adopted').length;
    const fosteredPets = pets.filter((p) => p.adoptionStatus === 'Fostered').length;
    const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);

    res.json({
      totalPets,
      readyPets,
      adoptedPets,
      fosteredPets,
      totalShelters: shelters.length,
      totalUsers: users.length,
      totalApplications: applications.length,
      totalDonations,
      shelterBreakdown: shelterStats,
      generatedAt: new Date().toISOString(),
    });
  });

  // Local Image Upload from Computer (Base64 storage with metadata)
  apiRouter.post('/upload', (req, res) => {
    const { dataUrl, fileName, fileSize, mimeType } = req.body;
    if (!dataUrl) {
      return res.status(400).json({ error: 'No image data provided for upload', code: 'INVALID_REQUEST' });
    }
    const imageId = `IMG-UPL-${Date.now()}`;
    const calculatedSize = fileSize || Math.round((dataUrl.length * 3) / 4);
    res.status(201).json({
      success: true,
      imageId,
      imageUrl: dataUrl,
      fileName: fileName || 'uploaded_pet_photo.png',
      fileSize: calculatedSize,
      mimeType: mimeType || 'image/jpeg',
      uploadSource: 'LocalUpload',
      uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });
  });

  // USERS & AUTH
  apiRouter.get('/users', (req, res) => {
    res.json(users);
  });

  apiRouter.get('/users/:id', (req, res) => {
    const user = users.find((u) => u.userId === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND', statusCode: 404 });
    }
    res.json(user);
  });

  apiRouter.post('/auth/login', (req, res) => {
    const { email, username, password } = req.body;
    const identifier = (username || email || '').trim().toLowerCase();

    // Specific check for AdminStaff credentials
    if (identifier === 'adminstaff' || identifier === 'adminstaff@pawfund.org') {
      if (password && password !== 'adminstaff123@') {
        return res.status(401).json({ error: 'Mật khẩu quản trị viên không chính xác (Yêu cầu: adminstaff123@)' });
      }
      const adminUser = users.find((u) => u.username === 'AdminStaff' || u.userId === 'USR-ADMIN') || {
        userId: 'USR-ADMIN',
        username: 'AdminStaff',
        fullName: 'AdminStaff',
        email: 'adminstaff@pawfund.org',
        phone: '0988776655',
        address: 'Văn Phòng Điều Hành & Cứu Hộ PawFund Toàn Quốc',
        role: 'Admin',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        createdAt: '2025-01-01 00:00:00',
      };
      return res.json({ user: adminUser, token: `mock-jwt-token-adminstaff` });
    }

    const user = users.find(
      (u) =>
        u.email.toLowerCase() === identifier ||
        (u.username && u.username.toLowerCase() === identifier) ||
        u.fullName.toLowerCase() === identifier
    ) || users[0];

    res.json({ user, token: `mock-jwt-token-${user.userId}` });
  });

  apiRouter.post('/auth/register', (req, res) => {
    const { fullName, email, phone, address } = req.body;
    if (!fullName || !email) {
      return res.status(400).json({ error: 'Họ tên và email là bắt buộc' });
    }
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Email đã tồn tại trên hệ thống' });
    }

    const newUser: User = {
      userId: `USR-${String(users.length + 1).padStart(3, '0')}`,
      fullName,
      email,
      phone: phone || 'Chưa cập nhật',
      address: address || 'Chưa cập nhật',
      role: 'Adopter',
      avatarUrl: `https://images.unsplash.com/photo-${1535713875002 + users.length}?auto=format&fit=crop&w=200&q=80`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    users.push(newUser);
    res.status(201).json({ user: newUser, token: `mock-jwt-token-${newUser.userId}` });
  });

  // SHELTERS
  apiRouter.get('/shelters', (req, res) => {
    const stats = getShelterStatistics();
    const enriched = shelters.map((s) => {
      const st = stats.find((item) => item.shelterId === s.shelterId);
      return {
        ...s,
        currentPetsCount: st ? st.totalPets : s.currentPetsCount,
      };
    });
    res.json(enriched);
  });

  apiRouter.get('/shelters/:id', (req, res) => {
    const shelter = shelters.find((s) => s.shelterId === req.params.id);
    if (!shelter) {
      return res.status(404).json({ error: 'Shelter not found', code: 'SHELTER_NOT_FOUND', statusCode: 404 });
    }
    const stats = getShelterStatistics().find((item) => item.shelterId === shelter.shelterId);
    const shelterPets = pets.filter((p) => p.shelterId === shelter.shelterId);
    const base = req.baseUrl || '/api/v1';

    res.json({
      ...shelter,
      currentPetsCount: stats ? stats.totalPets : shelter.currentPetsCount,
      statistics: stats,
      _links: {
        self: `${base}/shelters/${shelter.shelterId}`,
        pets: `${base}/pets?shelterId=${shelter.shelterId}`,
        donations: `${base}/donations?shelterId=${shelter.shelterId}`,
      },
    });
  });

  apiRouter.post('/shelters', (req, res) => {
    const { shelterName, address, phone, email, managerId, capacity } = req.body;
    if (!shelterName || !address) {
      return res.status(400).json({ error: 'Shelter Name and Address are required', code: 'VALIDATION_ERROR' });
    }
    const newShelterId = `SHL-${String(shelters.length + 1).padStart(3, '0')}`;
    const newShelter: Shelter = {
      shelterId: newShelterId,
      shelterName,
      address,
      phone: phone || '0900000000',
      email: email || `contact@${newShelterId.toLowerCase()}.pawfund.org`,
      managerId: managerId || 'USR-ADMIN',
      capacity: Number(capacity) || 50,
      currentPetsCount: 0,
      bankAccount: req.body.bankAccount || '9988776655',
      bankName: req.body.bankName || 'Vietcombank - CN Tân Bình',
      rating: Number(req.body.rating) || 5.0,
      description: req.body.description || 'Trạm cứu hộ động vật trực thuộc PawFund Network.',
      imageUrl: req.body.imageUrl || 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=800&q=80',
    };
    shelters.push(newShelter);
    const base = req.baseUrl || '/api/v1';
    res.setHeader('Location', `${base}/shelters/${newShelterId}`);
    res.status(201).json(newShelter);
  });

  apiRouter.put('/shelters/:id', (req, res) => {
    const idx = shelters.findIndex((s) => s.shelterId === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Shelter not found', code: 'SHELTER_NOT_FOUND', statusCode: 404 });
    }
    shelters[idx] = { ...shelters[idx], ...req.body, shelterId: req.params.id };
    res.json(shelters[idx]);
  });

  apiRouter.patch('/shelters/:id', (req, res) => {
    const idx = shelters.findIndex((s) => s.shelterId === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Shelter not found', code: 'SHELTER_NOT_FOUND', statusCode: 404 });
    }
    shelters[idx] = { ...shelters[idx], ...req.body, shelterId: req.params.id };
    res.json(shelters[idx]);
  });

  apiRouter.delete('/shelters/:id', (req, res) => {
    const idx = shelters.findIndex((s) => s.shelterId === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Shelter not found', code: 'SHELTER_NOT_FOUND', statusCode: 404 });
    }
    const removed = shelters.splice(idx, 1)[0];
    res.json({ success: true, message: `Shelter ${removed.shelterName} deleted.`, deletedShelterId: req.params.id });
  });

  // PETS (with multi-criteria filter, sorting, pagination, and HATEOAS)
  apiRouter.get('/pets', (req, res) => {
    const {
      species,
      status,
      shelterId,
      search,
      vaccinated,
      sterilized,
      requiresYard,
      goodWithKids,
      energyLevel,
      sortBy,
      order,
      page,
      limit,
    } = req.query;

    let result = pets.map(enrichPet);

    if (species && species !== 'all' && species !== 'Tất cả') {
      const sp = String(species).toLowerCase();
      result = result.filter((p) => {
        const petSp = p.species.toLowerCase();
        if (sp === 'dog' || sp === 'chó') return petSp === 'chó' || petSp === 'dog';
        if (sp === 'cat' || sp === 'mèo') return petSp === 'mèo' || petSp === 'cat';
        if (sp === 'other' || sp === 'khác') return petSp === 'khác' || petSp === 'other';
        return petSp === sp;
      });
    }
    if (status && status !== 'all' && status !== 'Tất cả') {
      result = result.filter((p) => p.adoptionStatus === status);
    }
    if (shelterId && shelterId !== 'all' && shelterId !== 'Tất cả') {
      result = result.filter((p) => p.shelterId === shelterId);
    }
    if (energyLevel && energyLevel !== 'all' && energyLevel !== 'Tất cả') {
      result = result.filter((p) => p.energyLevel === energyLevel);
    }
    if (vaccinated === 'true') {
      result = result.filter((p) => p.vaccinated);
    }
    if (sterilized === 'true') {
      result = result.filter((p) => p.sterilized);
    }
    if (requiresYard === 'false') {
      result = result.filter((p) => !p.requiresYard);
    } else if (requiresYard === 'true') {
      result = result.filter((p) => p.requiresYard);
    }
    if (goodWithKids === 'true') {
      result = result.filter((p) => p.goodWithKids);
    }
    if (search) {
      const q = String(search).toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.breed.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.petId.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (sortBy === 'name') {
      result.sort((a, b) =>
        order === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)
      );
    } else if (sortBy === 'ageMonths') {
      result.sort((a, b) => (order === 'desc' ? b.ageMonths - a.ageMonths : a.ageMonths - b.ageMonths));
    } else if (sortBy === 'createdAt') {
      result.sort((a, b) =>
        order === 'asc'
          ? (a.createdAt || '').localeCompare(b.createdAt || '')
          : (b.createdAt || '').localeCompare(a.createdAt || '')
      );
    }

    const totalCount = result.length;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || (page ? 10 : totalCount)));
    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    res.setHeader('X-Total-Count', String(totalCount));
    res.setHeader('X-Page', String(pageNum));
    res.setHeader('X-Per-Page', String(limitNum));

    const startIndex = (pageNum - 1) * limitNum;
    const paginatedItems = result.slice(startIndex, startIndex + limitNum);

    // If client requested v1 route or specifically provided page/limit or asked for paginated format
    const isV1 = req.baseUrl === '/api/v1';
    const isExplicitPagination = page !== undefined || limit !== undefined;

    if (isV1 && isExplicitPagination) {
      const base = req.baseUrl || '/api/v1';
      return res.json({
        data: paginatedItems,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        _links: {
          self: `${base}/pets?page=${pageNum}&limit=${limitNum}`,
          first: `${base}/pets?page=1&limit=${limitNum}`,
          last: `${base}/pets?page=${totalPages}&limit=${limitNum}`,
          ...(pageNum < totalPages ? { next: `${base}/pets?page=${pageNum + 1}&limit=${limitNum}` } : {}),
          ...(pageNum > 1 ? { prev: `${base}/pets?page=${pageNum - 1}&limit=${limitNum}` } : {}),
        },
      });
    }

    // Default array for maximum compatibility with existing React hooks
    res.json(isExplicitPagination ? paginatedItems : result);
  });

  apiRouter.get('/pets/:id', (req, res) => {
    const pet = pets.find((p) => p.petId === req.params.id);
    if (!pet) {
      return res.status(404).json({
        error: `Pet with ID '${req.params.id}' was not found.`,
        code: 'PET_NOT_FOUND',
        statusCode: 404,
      });
    }
    const base = req.baseUrl || '/api/v1';
    res.json({
      ...enrichPet(pet),
      _links: {
        self: `${base}/pets/${pet.petId}`,
        shelter: `${base}/shelters/${pet.shelterId}`,
        medicalRecords: `${base}/pets/${pet.petId}/medical-records`,
        applications: `${base}/pets/${pet.petId}/applications`,
      },
    });
  });

  apiRouter.post('/pets', (req, res) => {
    // Role Authorization Check: Only Admin and RescueStaff can create pets
    const userRole = req.headers['x-user-role'] || req.body.requesterRole;
    if (userRole && userRole !== 'Admin' && userRole !== 'RescueStaff') {
      return res.status(403).json({
        error: 'Access denied: Only Administrators or Rescue Shelter Staff can publish new pet profiles.',
        code: 'FORBIDDEN',
      });
    }

    const {
      name,
      species,
      breed,
      ageMonths,
      gender,
      healthStatus,
      vaccinated,
      sterilized,
      adoptionStatus,
      energyLevel,
      goodWithKids,
      goodWithPets,
      requiresYard,
      description,
      shelterId,
      imageUrl,
      fileName,
      fileSize,
      mimeType,
      uploadSource,
    } = req.body;

    if (!name || !species || !shelterId) {
      return res.status(400).json({
        error: 'Please provide Name, Species, and Shelter ID',
        code: 'VALIDATION_ERROR',
      });
    }

    const newPetId = `PET-${String(pets.length + 1).padStart(3, '0')}`;
    const newPet: Pet = {
      petId: newPetId,
      name,
      species: species || 'Dog',
      breed: breed || 'Mixed Breed',
      ageMonths: Number(ageMonths) || 12,
      gender: gender || 'Đực',
      healthStatus: healthStatus || 'Healthy',
      vaccinated: Boolean(vaccinated),
      sterilized: Boolean(sterilized),
      adoptionStatus: adoptionStatus || 'Ready',
      energyLevel: energyLevel || 'Medium',
      goodWithKids: Boolean(goodWithKids),
      goodWithPets: Boolean(goodWithPets),
      requiresYard: Boolean(requiresYard),
      description: description || 'Looking for a warm and loving forever home.',
      shelterId,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      images: [
        {
          imageId: `IMG-${newPetId}-1`,
          petId: newPetId,
          imageUrl: imageUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
          isPrimary: true,
          caption: `Intake photo of ${name}`,
          fileName: fileName || (imageUrl?.startsWith('data:') ? 'uploaded_pet_photo.png' : undefined),
          fileSize: fileSize || (imageUrl?.startsWith('data:') ? Math.round((imageUrl.length * 3) / 4) : undefined),
          mimeType: mimeType || (imageUrl?.startsWith('data:') ? 'image/jpeg' : undefined),
          uploadSource: uploadSource || (imageUrl?.startsWith('data:') ? 'LocalUpload' : 'ExternalURL'),
          uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        },
      ],
      medicalRecords: [],
    };

    pets.unshift(newPet);
    const base = req.baseUrl || '/api/v1';
    res.setHeader('Location', `${base}/pets/${newPet.petId}`);
    res.status(201).json(enrichPet(newPet));
  });

  apiRouter.put('/pets/:id', (req, res) => {
    const userRole = req.headers['x-user-role'] || req.body.requesterRole;
    if (userRole && userRole !== 'Admin' && userRole !== 'RescueStaff') {
      return res.status(403).json({
        error: 'Access denied: Only Administrators or Shelter Staff can update pet profiles.',
        code: 'FORBIDDEN',
      });
    }

    const index = pets.findIndex((p) => p.petId === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Pet not found', code: 'PET_NOT_FOUND', statusCode: 404 });
    }

    let updatedImages = pets[index].images;
    if (req.body.imageUrl) {
      const isDataUrl = req.body.imageUrl.startsWith('data:');
      const newImgObj = {
        imageId: `IMG-${req.params.id}-${Date.now().toString().slice(-4)}`,
        petId: req.params.id,
        imageUrl: req.body.imageUrl,
        isPrimary: true,
        caption: `Photo of ${req.body.name || pets[index].name}`,
        fileName: req.body.fileName || (isDataUrl ? 'updated_pet_photo.png' : undefined),
        fileSize: req.body.fileSize || (isDataUrl ? Math.round((req.body.imageUrl.length * 3) / 4) : undefined),
        mimeType: req.body.mimeType || (isDataUrl ? 'image/jpeg' : undefined),
        uploadSource: req.body.uploadSource || (isDataUrl ? 'LocalUpload' : 'ExternalURL'),
        uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      if (updatedImages.length > 0) {
        updatedImages = updatedImages.map((img, i) =>
          i === 0 ? { ...img, ...newImgObj } : img
        );
      } else {
        updatedImages = [newImgObj];
      }
    }

    pets[index] = {
      ...pets[index],
      ...req.body,
      images: updatedImages,
      petId: req.params.id, // Immutable PK
    };
    res.json(enrichPet(pets[index]));
  });

  apiRouter.patch('/pets/:id', (req, res) => {
    const userRole = req.headers['x-user-role'] || req.body.requesterRole;
    if (userRole && userRole !== 'Admin' && userRole !== 'RescueStaff') {
      return res.status(403).json({
        error: 'Access denied: Only Administrators or Shelter Staff can patch pet profiles.',
        code: 'FORBIDDEN',
      });
    }

    const index = pets.findIndex((p) => p.petId === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Pet not found', code: 'PET_NOT_FOUND', statusCode: 404 });
    }

    pets[index] = {
      ...pets[index],
      ...req.body,
      petId: req.params.id,
    };
    res.json(enrichPet(pets[index]));
  });

  apiRouter.delete('/pets/:id', (req, res) => {
    const userRole = req.headers['x-user-role'] || req.query.requesterRole;
    if (userRole && userRole !== 'Admin' && userRole !== 'RescueStaff') {
      return res.status(403).json({
        error: 'Access denied: Only Administrators can delete pet records.',
        code: 'FORBIDDEN',
      });
    }

    const index = pets.findIndex((p) => p.petId === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Pet not found', code: 'PET_NOT_FOUND', statusCode: 404 });
    }

    const deletedPet = pets.splice(index, 1)[0];
    res.json({
      success: true,
      message: `Successfully deleted pet profile for ${deletedPet.name} (${deletedPet.petId}).`,
      deletedPetId: req.params.id,
    });
  });

  // SUB-RESOURCES FOR PETS: MEDICAL RECORDS & APPLICATIONS
  function getHealthReminderCategory(diagnosis: string, treatment: string): { category: any; label: string } {
    const text = `${diagnosis} ${treatment}`.toLowerCase();
    if (text.includes('vaccine') || text.includes('tiêm') || text.includes('dại') || text.includes('purevax') || text.includes('vanguard')) {
      return { category: 'Vaccination', label: 'Tiêm phòng Vaccine' };
    }
    if (text.includes('phẫu thuật') || text.includes('triệt sản') || text.includes('tháo chỉ') || text.includes('vết thương')) {
      return { category: 'PostOp', label: 'Tái khám hậu phẫu / Vết thương' };
    }
    if (text.includes('giun') || text.includes('ve') || text.includes('rận') || text.includes('tai') || text.includes('ký sinh')) {
      return { category: 'Deworming', label: 'Tẩy giun & Ký sinh trùng' };
    }
    return { category: 'GeneralCheckup', label: 'Khám tổng quát định kỳ' };
  }

  function getCalculatedHealthReminders(referenceDateStr?: string) {
    const baseDate = referenceDateStr ? new Date(referenceDateStr) : new Date('2026-08-14');
    baseDate.setHours(0, 0, 0, 0);

    const reminders: any[] = [];

    pets.forEach((pet) => {
      const shelter = shelters.find((s) => s.shelterId === pet.shelterId);
      const primaryImg = pet.images.find((img) => img.isPrimary) || pet.images[0];
      const imgUrl = primaryImg ? primaryImg.imageUrl : 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80';

      const approvedApp = applications.find((a) => a.petId === pet.petId && a.status === 'Approved');
      const adopter = approvedApp ? users.find((u) => u.userId === approvedApp.userId) : undefined;

      (pet.medicalRecords || []).forEach((record) => {
        if (!record.nextFollowUp) return;

        const dueDate = new Date(record.nextFollowUp);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - baseDate.getTime();
        const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));

        let urgency: string = 'Upcoming';
        if (daysRemaining < 0) {
          urgency = 'Overdue';
        } else if (daysRemaining === 0) {
          urgency = 'Today';
        } else if (daysRemaining <= 7) {
          urgency = 'Urgent';
        } else if (daysRemaining <= 30) {
          urgency = 'Upcoming';
        } else {
          urgency = 'Future';
        }

        const catInfo = getHealthReminderCategory(record.diagnosis, record.treatment);

        reminders.push({
          reminderId: `REM-${record.recordId}`,
          petId: pet.petId,
          petName: pet.name,
          petSpecies: pet.species,
          petBreed: pet.breed,
          petImage: imgUrl,
          shelterId: pet.shelterId,
          shelterName: shelter ? shelter.shelterName : 'Trạm cứu hộ PawFund',
          recordId: record.recordId,
          medicalDate: record.medicalDate,
          diagnosis: record.diagnosis,
          treatment: record.treatment,
          vetName: record.vetName,
          dueDate: record.nextFollowUp,
          daysRemaining,
          urgency,
          category: catInfo.category,
          categoryLabel: catInfo.label,
          medications: record.medications,
          status: record.reminderStatus === 'Completed' ? 'Completed' : 'Pending',
          adopterId: adopter?.userId,
          adopterName: adopter?.fullName,
          adopterEmail: adopter?.email,
          adopterPhone: adopter?.phone,
        });
      });
    });

    return reminders.sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;
      return a.daysRemaining - b.daysRemaining;
    });
  }

  // GET /pets/:id/medical & /pets/:id/medical-records
  const handleGetPetMedicalRecords = (req: any, res: any) => {
    const pet = pets.find((p) => p.petId === req.params.id);
    if (!pet) {
      return res.status(404).json({ error: 'Pet not found', code: 'PET_NOT_FOUND', statusCode: 404 });
    }
    res.json(pet.medicalRecords || []);
  };
  apiRouter.get('/pets/:id/medical', handleGetPetMedicalRecords);
  apiRouter.get('/pets/:id/medical-records', handleGetPetMedicalRecords);

  // POST /pets/:id/medical & /pets/:id/medical-records
  const handlePostPetMedicalRecord = (req: any, res: any) => {
    const pet = pets.find((p) => p.petId === req.params.id);
    if (!pet) return res.status(404).json({ error: 'Không tìm thấy thú cưng', code: 'PET_NOT_FOUND' });

    const { diagnosis, treatment, vetName, nextFollowUp, medications } = req.body;
    if (!diagnosis || !treatment) {
      return res.status(400).json({ error: 'Chẩn đoán và phương pháp điều trị là bắt buộc', code: 'VALIDATION_ERROR' });
    }

    if (!pet.medicalRecords) pet.medicalRecords = [];

    const newRecordId = `MED-${Date.now().toString().slice(-4)}`;
    const newRecord: PetMedicalRecord = {
      recordId: newRecordId,
      petId: pet.petId,
      medicalDate: new Date().toISOString().split('T')[0],
      diagnosis,
      treatment,
      vetName: vetName || 'BS. Thú y Trạm cứu hộ',
      nextFollowUp,
      medications,
    };

    pet.medicalRecords.unshift(newRecord);
    const base = req.baseUrl || '/api/v1';
    res.setHeader('Location', `${base}/pets/${pet.petId}/medical-records/${newRecordId}`);
    res.status(201).json(newRecord);
  };
  apiRouter.post('/pets/:id/medical', handlePostPetMedicalRecord);
  apiRouter.post('/pets/:id/medical-records', handlePostPetMedicalRecord);

  // GET /pets/:id/applications
  apiRouter.get('/pets/:id/applications', (req, res) => {
    const pet = pets.find((p) => p.petId === req.params.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found', code: 'PET_NOT_FOUND' });

    const petApps = applications
      .filter((a) => a.petId === req.params.id)
      .map(enrichApplication);
    res.json(petApps);
  });

  // HEALTH REMINDERS
  apiRouter.get('/health-reminders', (req, res) => {
    const { petId, shelterId, userId, urgency, category, daysWindow, referenceDate } = req.query;

    let reminders = getCalculatedHealthReminders(typeof referenceDate === 'string' ? referenceDate : undefined);

    if (petId) {
      reminders = reminders.filter((r) => r.petId === petId);
    }
    if (shelterId && shelterId !== 'Tất cả') {
      reminders = reminders.filter((r) => r.shelterId === shelterId);
    }
    if (userId) {
      reminders = reminders.filter((r) => r.adopterId === userId);
    }
    if (urgency && urgency !== 'Tất cả') {
      reminders = reminders.filter((r) => r.urgency === urgency);
    }
    if (category && category !== 'Tất cả') {
      reminders = reminders.filter((r) => r.category === category);
    }
    if (daysWindow) {
      const window = Number(daysWindow);
      if (!isNaN(window)) {
        reminders = reminders.filter((r) => r.daysRemaining <= window);
      }
    }

    const summary = {
      total: reminders.length,
      overdue: reminders.filter((r) => r.urgency === 'Overdue' && r.status !== 'Completed').length,
      today: reminders.filter((r) => r.urgency === 'Today' && r.status !== 'Completed').length,
      next7Days: reminders.filter((r) => (r.urgency === 'Today' || r.urgency === 'Urgent') && r.status !== 'Completed').length,
      next30Days: reminders.filter((r) => ['Overdue', 'Today', 'Urgent', 'Upcoming'].includes(r.urgency) && r.status !== 'Completed').length,
    };

    res.json({
      reminders,
      summary,
      referenceDate: '2026-08-14',
    });
  });

  apiRouter.post('/health-reminders/complete', (req, res) => {
    const { petId, recordId, nextFollowUp, newDiagnosis, newTreatment, vetName, medications } = req.body;

    const pet = pets.find((p) => p.petId === petId);
    if (!pet) return res.status(404).json({ error: 'Không tìm thấy thú cưng', code: 'PET_NOT_FOUND' });

    const targetRecord = (pet.medicalRecords || []).find((r) => r.recordId === recordId);
    if (targetRecord) {
      targetRecord.reminderStatus = 'Completed';
    }

    let newRecord: PetMedicalRecord | null = null;
    if (nextFollowUp || newDiagnosis) {
      if (!pet.medicalRecords) pet.medicalRecords = [];
      newRecord = {
        recordId: `MED-${Date.now().toString().slice(-4)}`,
        petId: pet.petId,
        medicalDate: new Date().toISOString().split('T')[0],
        diagnosis: newDiagnosis || `Hoàn tất đợt tái khám (${targetRecord?.diagnosis || 'Định kỳ'})`,
        treatment: newTreatment || 'Đã kiểm tra sức khỏe và tiêm phòng/dùng thuốc theo chỉ định',
        vetName: vetName || targetRecord?.vetName || 'BS. Thú y PawFund',
        nextFollowUp: nextFollowUp || undefined,
        medications: medications || undefined,
        reminderStatus: 'Pending',
      };
      pet.medicalRecords.unshift(newRecord);
    }

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái tái khám cho bé ${pet.name}.`,
      pet: enrichPet(pet),
      newRecord,
    });
  });

  apiRouter.post('/health-reminders/send-notification', (req, res) => {
    const { reminderId, petId, customNote } = req.body;
    const reminders = getCalculatedHealthReminders();
    const reminder = reminders.find((r) => r.reminderId === reminderId || (r.petId === petId && r.urgency !== 'Future'));

    if (!reminder) {
      return res.status(404).json({ error: 'Không tìm thấy lịch hẹn tái khám cần gửi thông báo' });
    }

    const recipientEmail = reminder.adopterEmail || 'shelter-staff@pawfund.org';
    const recipientName = reminder.adopterName || 'Nhân viên trạm cứu hộ';

    const emailLog: EmailNotificationLog = {
      logId: `EML-MED-${Date.now().toString().slice(-4)}`,
      applicationId: `HEALTH-${reminder.petId}`,
      recipientEmail,
      recipientName,
      petName: reminder.petName,
      petSpecies: reminder.petSpecies,
      petImage: reminder.petImage,
      subject: `🔔 [PawFund Health] Nhắc nhở lịch tiêm / tái khám cho bé ${reminder.petName} (${reminder.dueDate})`,
      status: 'Submitted' as any,
      sentAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      sender: 'PawFund Veterinary Health Alert <health-alerts@pawfund.org>',
      contentPreview: `Thông báo: Bé ${reminder.petName} có lịch ${reminder.categoryLabel} vào ngày ${reminder.dueDate} (${reminder.daysRemaining >= 0 ? `Còn ${reminder.daysRemaining} ngày` : `Đã quá hạn ${Math.abs(reminder.daysRemaining)} ngày`}).`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #0284c7, #0d9488); padding: 24px; color: #ffffff; text-align: center;">
            <h1 style="margin: 0; font-size: 22px;">🩺 PawFund - Lời Nhắc Y Tế Thú Cưng</h1>
            <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 13px;">Hệ Thống Theo Dõi Sức Khỏe & Tiêm Phòng Định Kỳ</p>
          </div>
          <div style="padding: 24px;">
            <p>Xin chào <strong>${recipientName}</strong>,</p>
            <p>PawFund xin gửi lời nhắc nhở quan trọng về sức khỏe của bé <strong>${reminder.petName}</strong> (Mã: <code>${reminder.petId}</code>):</p>
            
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #15803d;">
                📅 Lịch hẹn: ${reminder.dueDate} (${reminder.daysRemaining === 0 ? 'HÔM NAY' : reminder.daysRemaining > 0 ? `Còn ${reminder.daysRemaining} ngày nữa` : `ĐÃ QUÁ HẠN ${Math.abs(reminder.daysRemaining)} NGÀY`})
              </p>
              <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Loại lịch:</strong> ${reminder.categoryLabel}</p>
              <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Chẩn đoán trước đó:</strong> ${reminder.diagnosis}</p>
              <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Phương pháp / Vaccine:</strong> ${reminder.treatment}</p>
              <p style="margin: 0; font-size: 13px;"><strong>Bác sĩ phụ trách:</strong> ${reminder.vetName}</p>
            </div>

            ${customNote ? `<div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 12px; margin: 16px 0; font-size: 13px;"><em>Ghi chú thêm:</em> ${customNote}</div>` : ''}

            <p style="font-size: 13px; color: #475569;">Vui lòng đưa bé đến trạm hoặc phòng khám thú y gần nhất đúng hạn để đảm bảo hiệu lực vaccine và sự an toàn cho bé.</p>
          </div>
          <div style="background: #f1f5f9; padding: 12px; text-align: center; font-size: 11px; color: #64748b;">
            PawFund Medical Management System • Giao thức cảnh báo tự động SMTP
          </div>
        </div>
      `,
      smtpStatusCode: '250 2.0.0 (OK): Message queued for delivery by smtp.pawfund.internal',
      deliveryStatus: 'Delivered',
      metadata: {
        ip: '10.244.0.12',
        serverHost: 'smtp-health-relay.pawfund.internal',
        tlsVersion: 'TLSv1.3',
        messageId: `<${Date.now()}@pawfund.org>`,
        staffNotes: `Đã kích hoạt thông báo y tế cho bé ${reminder.petName}`,
      },
    };

    emailLogs.unshift(emailLog);

    res.status(201).json({
      success: true,
      message: `Đã phát thông báo nhắc nhở y tế thành công tới ${recipientEmail}.`,
      emailLog,
    });
  });

  // ADOPTION APPLICATIONS
  apiRouter.get('/applications', (req, res) => {
    const { userId, shelterId, status } = req.query;
    let result = applications.map(enrichApplication);

    if (userId) {
      result = result.filter((a) => a.userId === userId);
    }
    if (status && status !== 'Tất cả') {
      result = result.filter((a) => a.status === status);
    }
    if (shelterId && shelterId !== 'Tất cả') {
      result = result.filter((a) => {
        const pet = pets.find((p) => p.petId === a.petId);
        return pet && pet.shelterId === shelterId;
      });
    }

    res.json(result);
  });

  apiRouter.get('/applications/:id', (req, res) => {
    const app = applications.find((a) => a.applicationId === req.params.id);
    if (!app) {
      return res.status(404).json({ error: 'Application not found', code: 'APPLICATION_NOT_FOUND', statusCode: 404 });
    }
    const base = req.baseUrl || '/api/v1';
    res.json({
      ...enrichApplication(app),
      _links: {
        self: `${base}/applications/${app.applicationId}`,
        pet: `${base}/pets/${app.petId}`,
        applicant: `${base}/users/${app.userId}`,
      },
    });
  });

  // Submit Application with SQL Trigger 1 check
  apiRouter.post('/applications', (req, res) => {
    const { petId, userId, type, housingType, hasYard, experienceDescription, incomeMonthly, otherPets } = req.body;

    if (!petId || !userId) {
      return res.status(400).json({ error: 'Thiếu thông tin petId hoặc userId', code: 'VALIDATION_ERROR' });
    }

    try {
      triggerCheckPetNotAdoptedBeforeApply(petId);

      const newAppId = `APP-${Date.now().toString().slice(-4)}`;
      const newApp: AdoptionApplication = {
        applicationId: newAppId,
        petId,
        userId,
        type: type || 'Adopt',
        housingType: housingType || 'Nhà riêng',
        hasYard: Boolean(hasYard),
        experienceDescription: experienceDescription || 'Sẵn sàng yêu thương và chăm sóc bé theo hướng dẫn trạm.',
        incomeMonthly: incomeMonthly || 'Thu nhập ổn định',
        otherPets: otherPets || 'Không có',
        status: 'Submitted',
        appliedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      applications.unshift(newApp);
      const base = req.baseUrl || '/api/v1';
      res.setHeader('Location', `${base}/applications/${newAppId}`);
      res.status(201).json(enrichApplication(newApp));
    } catch (err: any) {
      return res.status(400).json({
        error: err.message,
        code: 'SQL_TRIGGER_VIOLATION',
        sqlTriggerTriggered: 'trg_CheckPetNotAdoptedBeforeApply',
      });
    }
  });

  // Update Status / Interview Schedule / Staff Notes
  const handleUpdateApplicationStatus = (req: any, res: any) => {
    const { status, interviewTime, staffNotes } = req.body;
    const targetApp = applications.find((a) => a.applicationId === req.params.id);

    if (!targetApp) return res.status(404).json({ error: 'Không tìm thấy hồ sơ đăng ký', code: 'APPLICATION_NOT_FOUND' });

    // If changing to 'Approved', trigger the ACID transaction!
    if (status === 'Approved') {
      const txResult = executeTransactionApproveApplication(req.params.id, staffNotes);
      if (!txResult.success) {
        return res.status(400).json(txResult);
      }
      const emailLog = createAndRecordSimulatedEmail(req.params.id, 'Approved', staffNotes);
      return res.json({
        application: enrichApplication(targetApp),
        transactionResult: txResult,
        emailLog,
      });
    }

    // Other status transitions
    if (status) targetApp.status = status;
    if (interviewTime) targetApp.interviewTime = interviewTime;
    if (staffNotes) targetApp.staffNotes = staffNotes;
    targetApp.reviewedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const emailLog = createAndRecordSimulatedEmail(req.params.id, status || targetApp.status, staffNotes, interviewTime);

    res.json({
      application: enrichApplication(targetApp),
      emailLog,
    });
  };

  apiRouter.put('/applications/:id/status', handleUpdateApplicationStatus);
  apiRouter.patch('/applications/:id', handleUpdateApplicationStatus);
  apiRouter.put('/applications/:id', handleUpdateApplicationStatus);

  apiRouter.delete('/applications/:id', (req, res) => {
    const idx = applications.findIndex((a) => a.applicationId === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Application not found', code: 'APPLICATION_NOT_FOUND', statusCode: 404 });
    }
    const deleted = applications.splice(idx, 1)[0];
    res.json({ success: true, message: `Application ${deleted.applicationId} was cancelled/deleted.` });
  });

  // EMAIL NOTIFICATION SIMULATION ENDPOINTS
  apiRouter.get('/notifications/email-logs', (req, res) => {
    res.json(emailLogs);
  });

  apiRouter.post('/notifications/simulate-email', (req, res) => {
    const { applicationId, status, customNote, interviewTime } = req.body;
    if (!applicationId) {
      return res.status(400).json({ error: 'Thiếu applicationId để kích hoạt email giả lập', code: 'VALIDATION_ERROR' });
    }

    const emailLog = createAndRecordSimulatedEmail(applicationId, status, customNote, interviewTime);
    res.status(201).json({
      success: true,
      message: `Đã kích hoạt giả lập gửi email thành công tới ${emailLog.recipientEmail}`,
      emailLog,
    });
  });

  // CARE LOGS
  apiRouter.get('/care-logs', (req, res) => {
    const { petId, userId } = req.query;
    let result = careLogs.map(enrichCareLog);

    if (petId) result = result.filter((l) => l.petId === petId);
    if (userId) result = result.filter((l) => l.userId === userId);

    res.json(result);
  });

  apiRouter.get('/care-logs/:id', (req, res) => {
    const log = careLogs.find((l) => l.logId === req.params.id);
    if (!log) {
      return res.status(404).json({ error: 'Care log not found', code: 'LOG_NOT_FOUND', statusCode: 404 });
    }
    res.json(enrichCareLog(log));
  });

  apiRouter.post('/care-logs', (req, res) => {
    const { petId, userId, note, imageUrl, healthUpdate, weightKg, mood } = req.body;
    if (!petId || !userId || !note) {
      return res.status(400).json({ error: 'Vui lòng cung cấp PetID, UserID và Ghi chú nhật ký', code: 'VALIDATION_ERROR' });
    }

    const newLogId = `LOG-${Date.now().toString().slice(-4)}`;
    const newLog: CareLog = {
      logId: newLogId,
      petId,
      userId,
      logDate: new Date().toISOString().split('T')[0],
      note,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?auto=format&fit=crop&w=800&q=80',
      healthUpdate: healthUpdate || 'Sức khỏe ổn định, ăn uống tốt.',
      weightKg: Number(weightKg) || undefined,
      mood: mood || 'Vui vẻ & Tăng động',
    };

    careLogs.unshift(newLog);
    const base = req.baseUrl || '/api/v1';
    res.setHeader('Location', `${base}/care-logs/${newLogId}`);
    res.status(201).json(enrichCareLog(newLog));
  });

  apiRouter.delete('/care-logs/:id', (req, res) => {
    const idx = careLogs.findIndex((l) => l.logId === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Care log not found', code: 'LOG_NOT_FOUND', statusCode: 404 });
    }
    careLogs.splice(idx, 1);
    res.json({ success: true, message: `Care log ${req.params.id} deleted successfully.` });
  });

  // DONATIONS
  apiRouter.get('/donations', (req, res) => {
    const { shelterId } = req.query;
    let list = donations;
    if (shelterId && shelterId !== 'Tất cả') {
      list = list.filter((d) => d.shelterId === shelterId);
    }
    const enriched = list.map((d) => {
      const shelter = shelters.find((s) => s.shelterId === d.shelterId);
      return {
        ...d,
        shelterName: shelter ? shelter.shelterName : 'Trạm cứu hộ',
      };
    });
    res.json(enriched);
  });

  apiRouter.get('/donations/:id', (req, res) => {
    const donation = donations.find((d) => d.donationId === req.params.id);
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found', code: 'DONATION_NOT_FOUND', statusCode: 404 });
    }
    const shelter = shelters.find((s) => s.shelterId === donation.shelterId);
    res.json({ ...donation, shelterName: shelter?.shelterName || 'Trạm cứu hộ' });
  });

  apiRouter.post('/donations', (req, res) => {
    const { shelterId, userId, amount, paymentMethod, donorName, message } = req.body;
    if (!shelterId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Số tiền và Trạm nhận quyên góp không hợp lệ', code: 'VALIDATION_ERROR' });
    }

    const newDonationId = `DON-${Date.now().toString().slice(-4)}`;
    const newDonation: Donation = {
      donationId: newDonationId,
      shelterId,
      userId: userId || undefined,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'VietQR',
      transactionCode: `TXN${Math.floor(100000000 + Math.random() * 900000000)}`,
      donorName: donorName || 'Nhà Hảo Tâm Ẩn Danh',
      message: message || 'Mong trạm cứu hộ có thêm nhiều kinh phí chăm sóc các bé!',
      donatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    donations.unshift(newDonation);
    const base = req.baseUrl || '/api/v1';
    res.setHeader('Location', `${base}/donations/${newDonationId}`);
    res.status(201).json(newDonation);
  });

  // ADVANCED SQL & STORED PROCEDURE APIS
  apiRouter.post('/sql/stored-procedure/match-pets', (req, res) => {
    const criteria: MatchCriteria = req.body;
    const rankedPets = executeSpMatchPetsForAdopter(criteria);
    res.json({
      procedureName: 'sp_MatchPetsForAdopter',
      criteria,
      resultCount: rankedPets.length,
      matchedPets: rankedPets,
      sqlCode: `
CREATE PROCEDURE sp_MatchPetsForAdopter(
    IN p_HousingType VARCHAR(50),
    IN p_HasYard BOOLEAN,
    IN p_HasChildren BOOLEAN,
    IN p_HasOtherPets BOOLEAN,
    IN p_Species VARCHAR(20),
    IN p_ActivityPreference VARCHAR(20)
)
BEGIN
    SELECT 
        p.PetID, p.Name, p.Species, p.Breed, p.AgeMonths, p.Gender,
        p.RequiresYard, p.GoodWithKids, p.GoodWithPets, p.EnergyLevel,
        s.ShelterName,
        (50 
         + (CASE WHEN p.Species = p_Species THEN 20 ELSE -30 END)
         + (CASE WHEN p.RequiresYard = TRUE AND p_HasYard = TRUE THEN 15 
                 WHEN p.RequiresYard = TRUE AND p_HasYard = FALSE THEN -25 
                 ELSE 10 END)
         + (CASE WHEN p_HasChildren = TRUE AND p.GoodWithKids = TRUE THEN 15 
                 WHEN p_HasChildren = TRUE AND p.GoodWithKids = FALSE THEN -20 
                 ELSE 0 END)
         + (CASE WHEN p_HasOtherPets = TRUE AND p.GoodWithPets = TRUE THEN 10 
                 WHEN p_HasOtherPets = TRUE AND p.GoodWithPets = FALSE THEN -15 
                 ELSE 0 END)
        ) AS MatchingScore
    FROM PETS p
    JOIN SHELTERS s ON p.ShelterID = s.ShelterID
    WHERE p.AdoptionStatus = 'Ready'
    ORDER BY MatchingScore DESC;
END;
      `.trim(),
    });
  });

  apiRouter.post('/sql/execute-transaction/approve-application', (req, res) => {
    const { applicationId, staffNotes } = req.body;
    if (!applicationId) return res.status(400).json({ error: 'ApplicationID là bắt buộc', code: 'VALIDATION_ERROR' });

    const result = executeTransactionApproveApplication(applicationId, staffNotes);
    res.json(result);
  });

  apiRouter.get('/sql/views/shelter-stats', (req, res) => {
    const stats = getShelterStatistics();
    res.json({
      viewName: 'vw_ShelterStatistics',
      data: stats,
      sqlDefinition: `
CREATE OR REPLACE VIEW vw_ShelterStatistics AS
SELECT 
    s.ShelterID,
    s.ShelterName,
    COUNT(p.PetID) AS TotalPets,
    SUM(CASE WHEN p.AdoptionStatus = 'Ready' THEN 1 ELSE 0 END) AS ReadyPets,
    SUM(CASE WHEN p.AdoptionStatus = 'Adopted' THEN 1 ELSE 0 END) AS AdoptedPets,
    SUM(CASE WHEN p.AdoptionStatus = 'Fostered' THEN 1 ELSE 0 END) AS FosteredPets,
    COUNT(DISTINCT a.ApplicationID) AS TotalApplications,
    COALESCE(SUM(d.Amount), 0) AS TotalDonations
FROM SHELTERS s
LEFT JOIN PETS p ON s.ShelterID = p.ShelterID
LEFT JOIN ADOPTION_APPLICATIONS a ON p.PetID = a.PetID AND a.Status IN ('Submitted', 'Interviewing')
LEFT JOIN DONATIONS d ON s.ShelterID = d.ShelterID
GROUP BY s.ShelterID, s.ShelterName;
      `.trim(),
    });
  });

  apiRouter.post('/sql/raw-query-simulator', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Truy vấn SQL không được để trống', code: 'VALIDATION_ERROR' });

    const cleanQuery = query.trim();
    const upperQuery = cleanQuery.toUpperCase();

    // 1. If connected to MySQL, execute directly on the live MySQL database!
    const mysqlStatus = getMySqlStatus();
    if (mysqlStatus.isConnected) {
      try {
        const start = Date.now();
        const rows = await MySqlService.execute(cleanQuery);
        const duration = Math.max(0.1, Date.now() - start);
        const count = Array.isArray(rows) ? rows.length : (rows?.affectedRows ?? 0);
        return res.json({
          success: true,
          source: 'Live MySQL Database',
          rowCount: count,
          executionTimeMs: duration,
          data: rows,
          notice: `Đã thực thi trực tiếp trên máy chủ MySQL (${mysqlStatus.config.host}:${mysqlStatus.config.port}/${mysqlStatus.config.database})`,
        });
      } catch (sqlErr: any) {
        return res.status(400).json({
          error: `Lỗi thực thi MySQL: ${sqlErr.message || String(sqlErr)}`,
          code: 'MYSQL_EXECUTION_ERROR',
        });
      }
    }

    try {
      if (upperQuery.startsWith('SELECT') && upperQuery.includes('PETS')) {
        let result = pets.map(enrichPet);
        if (upperQuery.includes("ADOPTIONSTATUS = 'READY'") || upperQuery.includes("ADOPTIONSTATUS='READY'")) {
          result = result.filter((p) => p.adoptionStatus === 'Ready');
        }
        if (upperQuery.includes("SPECIES = 'CHÓ'") || upperQuery.includes("SPECIES='CHÓ'")) {
          result = result.filter((p) => p.species === 'Chó');
        }
        if (upperQuery.includes("SPECIES = 'MÈO'") || upperQuery.includes("SPECIES='MÈO'")) {
          result = result.filter((p) => p.species === 'Mèo');
        }
        return res.json({
          success: true,
          rowCount: result.length,
          executionTimeMs: 1.42,
          data: result,
        });
      }

      if (upperQuery.startsWith('SELECT') && upperQuery.includes('VW_SHELTERSTATISTICS')) {
        const stats = getShelterStatistics();
        return res.json({
          success: true,
          rowCount: stats.length,
          executionTimeMs: 2.15,
          data: stats,
        });
      }

      if (upperQuery.startsWith('SELECT') && upperQuery.includes('ADOPTION_APPLICATIONS')) {
        const result = applications.map(enrichApplication);
        return res.json({
          success: true,
          rowCount: result.length,
          executionTimeMs: 1.88,
          data: result,
        });
      }

      if (upperQuery.startsWith('SELECT') && upperQuery.includes('DONATIONS')) {
        return res.json({
          success: true,
          rowCount: donations.length,
          executionTimeMs: 0.95,
          data: donations,
        });
      }

      const stats = getShelterStatistics();
      return res.json({
        success: true,
        rowCount: stats.length,
        executionTimeMs: 1.5,
        data: stats,
        notice: 'Truy vấn được mô phỏng thành công trên mô hình CSDL 3NF.',
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message, code: 'SQL_SYNTAX_ERROR' });
    }
  });

  // GEMINI AI PET ASSISTANT
  apiRouter.post('/ai/ask-pet-assistant', async (req, res) => {
    const { prompt, petId } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt không được để trống', code: 'VALIDATION_ERROR' });

    const pet = petId ? pets.find((p) => p.petId === petId) : null;
    const petContext = pet
      ? `Thông tin thú cưng đang xét: Tên: ${pet.name}, Loài: ${pet.species}, Giống: ${pet.breed}, Tuổi: ${pet.ageMonths} tháng, Sức khỏe: ${pet.healthStatus}, Năng lượng: ${pet.energyLevel}, Thích hợp trẻ nhỏ: ${pet.goodWithKids ? 'Có' : 'Không'}, Cần sân vườn: ${pet.requiresYard ? 'Có' : 'Không'}. Mô tả: ${pet.description}`
      : 'Không có ngữ cảnh thú cưng cụ thể.';

    try {
      const client = getGeminiClient();
      if (!client) {
        return res.json({
          answer: `[AI Pet Assistant Tư vấn]: Dựa trên hồ sơ của bé ${pet?.name || 'thú cưng'}, đây là bé rất thích hợp với gia đình yêu thương, cần sự kiên nhẫn trong 1-2 tuần đầu để bé làm quen nhà mới. Hãy chuẩn bị sẵn bát ăn, chuồng ngủ êm ái và lịch tiêm phòng định kỳ.`,
          source: 'local_expert_engine',
        });
      }

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Bạn là Chuyên gia Tư vấn Cứu hộ và Nhận nuôi Thú cưng của hệ thống Pet Rescue & Foster Matcher Việt Nam.
Hãy trả lời câu hỏi của người dùng một cách chu đáo, chân thành, giàu cảm xúc và thực tế về quy trình nhận nuôi, chăm sóc hậu nhận nuôi và chuẩn bị không gian sống.

${petContext}

Câu hỏi của người nhận nuôi: ${prompt}`,
              },
            ],
          },
        ],
      });

      res.json({
        answer: response.text,
        source: 'gemini-2.5-flash',
      });
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      res.json({
        answer: `Lời khuyên từ trạm cứu hộ: Nhận nuôi một bé thú cưng như ${pet?.name || 'bé'} là một cam kết lâu dài 10-15 năm. Hãy chắc chắn các thành viên trong gia đình đều đồng thuận và chuẩn bị không gian an toàn cho bé nhé!`,
        source: 'fallback',
      });
    }
  });

  // Catch-all 404 for API Router
  apiRouter.use((req, res) => {
    res.status(404).json({
      error: `Resource '${req.method} ${req.originalUrl}' not found.`,
      code: 'ROUTE_NOT_FOUND',
      statusCode: 404,
      timestamp: new Date().toISOString(),
      _links: {
        apiRoot: '/api/v1',
        openapi: '/api/v1/openapi.json',
      },
    });
  });

  // Mount API Router for v1 and legacy paths
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  // ----------------------------------------------------
  // VITE OR STATIC SERVING
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pet Rescue & Foster Matcher server is listening on http://0.0.0.0:${PORT}`);
    // Non-blocking background check for MySQL connection
    testMySqlConnection().then((res) => {
      if (res.success) {
        console.log(`[MySQL] ${res.message} (Bảng: ${res.tablesCount}, Độ trễ: ${res.latencyMs}ms)`);
      } else {
        console.log(`[MySQL] Trạng thái: ${res.message}`);
      }
    }).catch(() => {});
  });
}

startServer();
