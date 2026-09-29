export type UserRole = 'Adopter' | 'RescueStaff' | 'Admin';

export interface User {
  userId: string;
  username?: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  role: UserRole;
  avatarUrl: string;
  createdAt: string;
}

export type PetSpecies = 'Dog' | 'Cat' | 'Other' | 'Chó' | 'Mèo' | 'Khác';
export type PetHealthStatus = 'Healthy' | 'In Treatment' | 'Special Needs' | 'Critical' | 'Bình thường' | 'Đang điều trị' | 'Khuyết tật' | 'Cần theo dõi đặc biệt';
export type AdoptionStatus = 'Pending' | 'Ready' | 'Adopted' | 'Fostered';
export type EnergyLevel = 'Low' | 'Medium' | 'High' | 'Thấp' | 'Trung bình' | 'Cao';

export interface PetImage {
  imageId: string;
  petId: string;
  imageUrl: string;
  isPrimary: boolean;
  caption?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  uploadSource?: 'LocalUpload' | 'ExternalURL';
  uploadedAt?: string;
}

export interface PetMedicalRecord {
  recordId: string;
  petId: string;
  medicalDate: string;
  diagnosis: string;
  treatment: string;
  vetName: string;
  nextFollowUp?: string;
  medications?: string;
  reminderStatus?: 'Pending' | 'Completed' | 'Dismissed';
}

export type HealthReminderUrgency = 'Overdue' | 'Today' | 'Urgent' | 'Upcoming' | 'Future';
export type HealthReminderCategory = 'Vaccination' | 'PostOp' | 'InjuryTreatment' | 'Deworming' | 'GeneralCheckup';

export interface HealthReminder {
  reminderId: string;
  petId: string;
  petName: string;
  petSpecies: PetSpecies;
  petBreed: string;
  petImage: string;
  shelterId: string;
  shelterName?: string;
  recordId: string;
  medicalDate: string;
  diagnosis: string;
  treatment: string;
  vetName: string;
  dueDate: string;
  daysRemaining: number;
  urgency: HealthReminderUrgency;
  category: HealthReminderCategory;
  categoryLabel: string;
  medications?: string;
  status: 'Pending' | 'Completed';
  adopterId?: string;
  adopterName?: string;
  adopterEmail?: string;
  adopterPhone?: string;
}

export interface HealthReminderSummary {
  total: number;
  overdue: number;
  today: number;
  next7Days: number;
  next30Days: number;
}

export interface Pet {
  petId: string;
  name: string;
  species: PetSpecies;
  breed: string;
  ageMonths: number;
  gender: 'Đực' | 'Cái';
  healthStatus: PetHealthStatus;
  vaccinated: boolean;
  sterilized: boolean;
  adoptionStatus: AdoptionStatus;
  energyLevel: EnergyLevel;
  goodWithKids: boolean;
  goodWithPets: boolean;
  requiresYard: boolean;
  description: string;
  shelterId: string;
  createdAt: string;
  images: PetImage[];
  medicalRecords?: PetMedicalRecord[];
  // Calculated/Joined
  shelterName?: string;
  primaryImage?: string;
  matchScore?: number;
  matchReasons?: string[];
}

export interface Shelter {
  shelterId: string;
  shelterName: string;
  address: string;
  phone: string;
  email: string;
  managerId: string;
  managerName?: string;
  description: string;
  bankAccount: string;
  bankName: string;
  capacity: number;
  currentPetsCount: number;
  rating: number;
  imageUrl: string;
}

export type ApplicationType = 'Adopt' | 'Foster';
export type ApplicationStatus = 'Submitted' | 'Interviewing' | 'Approved' | 'Rejected';
export type HousingType = 'Single Family House' | 'Apartment / Condo' | 'Rented House' | 'Townhouse / Villa' | 'Nhà riêng' | 'Chung cư' | 'Nhà thuê' | 'Biệt thự sân vườn';

export interface AdoptionApplication {
  applicationId: string;
  petId: string;
  userId: string;
  type: ApplicationType;
  housingType: HousingType;
  hasYard: boolean;
  experienceDescription: string;
  incomeMonthly: string;
  otherPets: string;
  interviewTime?: string;
  staffNotes?: string;
  status: ApplicationStatus;
  appliedAt: string;
  reviewedAt?: string;
  // Joined fields for display
  petName?: string;
  petSpecies?: PetSpecies;
  petBreed?: string;
  petImage?: string;
  applicantName?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  applicantAddress?: string;
  shelterName?: string;
}

export interface CareLog {
  logId: string;
  petId: string;
  userId: string;
  logDate: string;
  note: string;
  imageUrl: string;
  healthUpdate: string;
  weightKg?: number;
  mood?: 'Vui vẻ & Tăng động' | 'Ngoan ngoãn & Thư giãn' | 'Hơi nhút nhát' | 'Khỏe mạnh';
  // Joined
  petName?: string;
  adopterName?: string;
}

export interface Donation {
  donationId: string;
  userId?: string;
  shelterId: string;
  shelterName?: string;
  amount: number;
  paymentMethod: 'MoMo' | 'VietQR' | 'Chuyển khoản' | 'Thẻ quốc tế';
  transactionCode: string;
  donorName: string;
  message?: string;
  donatedAt: string;
}

export interface MatchCriteria {
  species?: PetSpecies | 'Tất cả';
  housingType: HousingType;
  hasYard: boolean;
  hasChildren: boolean;
  hasOtherPets: boolean;
  experienceLevel: 'Chưa có' | 'Cơ bản' | 'Nhiều năm kinh nghiệm';
  timeCommitmentHoursPerDay: number;
  preferredAgeGroup?: 'Con (< 6 tháng)' | 'Trưởng thành (6-36 tháng)' | 'Lớn tuổi (> 3 năm)' | 'Bất kỳ';
  activityPreference?: EnergyLevel | 'Bất kỳ';
}

export interface ShelterStatistics {
  shelterId: string;
  shelterName: string;
  totalPets: number;
  readyPets: number;
  adoptedPets: number;
  fosteredPets: number;
  pendingApplications: number;
  totalDonationAmount: number;
  donationCount: number;
}

export interface TransactionStepLog {
  step: number;
  query: string;
  status: 'SUCCESS' | 'ERROR' | 'ROLLED_BACK';
  message: string;
  affectedRows: number;
  timestamp: string;
}

export interface TransactionExecutionResult {
  transactionId: string;
  success: boolean;
  steps: TransactionStepLog[];
  finalStatus: 'COMMITTED' | 'ROLLED_BACK';
  message: string;
}

export interface EmailNotificationLog {
  logId: string;
  applicationId: string;
  recipientEmail: string;
  recipientName: string;
  petName: string;
  petSpecies?: string;
  petImage?: string;
  subject: string;
  status: ApplicationStatus;
  sentAt: string;
  sender: string;
  contentPreview: string;
  htmlContent: string;
  smtpStatusCode: string;
  deliveryStatus: 'Delivered' | 'Queued' | 'Sent';
  metadata: {
    ip: string;
    serverHost: string;
    tlsVersion: string;
    messageId: string;
    interviewTime?: string;
    staffNotes?: string;
  };
}
