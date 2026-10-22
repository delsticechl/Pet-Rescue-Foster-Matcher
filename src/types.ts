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

export interface Pet {
  petId: string;
  name: string;
  species: PetSpecies;
  breed: string;
  ageMonths: number;
  gender: 'Đực' | 'Cái' | 'Male' | 'Female';
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
  imageUrl?: string;
  primaryImage?: string;
  images: PetImage[];
  medicalRecords?: PetMedicalRecord[];
  medicalHistory?: PetMedicalRecord[];
  // Joined/Display fields
  shelterName?: string;
  matchScore?: number;
  matchReasons?: string[];
  matchExplanation?: string;
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
export type ApplicationStatus = 'Pending' | 'Submitted' | 'Interviewing' | 'Approved' | 'Rejected';
export type HousingType = 'Single Family House' | 'Apartment / Condo' | 'Rented House' | 'Townhouse / Villa' | 'Nhà riêng' | 'Chung cư' | 'Nhà thuê' | 'Biệt thự sân vườn';

export interface AdoptionApplication {
  applicationId: string;
  petId: string;
  userId: string;
  type?: ApplicationType;
  housingType: HousingType;
  hasYard: boolean;
  hasChildren?: boolean;
  experienceDescription?: string;
  petExperience?: string;
  incomeMonthly?: string;
  otherPets?: string;
  interviewTime?: string;
  staffNotes?: string;
  adminNotes?: string;
  status: ApplicationStatus;
  appliedAt?: string;
  submittedAt?: string;
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
  notes?: string;
  imageUrl: string;
  healthUpdate?: string;
  weightKg?: number;
  mood?: 'Vui vẻ & Tăng động' | 'Ngoan ngoãn & Thư giãn' | 'Hơi nhút nhát' | 'Khỏe mạnh';
  staffName?: string;
  authorName?: string;
  category?: string;
  // Joined
  petName?: string;
  adopterName?: string;
}

export interface Donation {
  donationId: string;
  userId?: string;
  shelterId?: string;
  shelterName?: string;
  amount: number;
  paymentMethod: 'MoMo' | 'VietQR' | 'Chuyển khoản' | 'Thẻ quốc tế' | 'Transfer';
  transactionCode?: string;
  donorName: string;
  donorEmail?: string;
  target?: string;
  message?: string;
  donatedAt?: string;
  date?: string;
}

export interface InAppNotification {
  notificationId: string;
  userId?: string;
  recipientEmail?: string;
  title: string;
  message: string;
  type: 'adoption' | 'donation' | 'pet' | 'system';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface AiMatchRequest {
  lifestyleDescription: string;
  speciesPreference?: 'Dog' | 'Cat' | 'All';
  livingSpace?: 'Apartment' | 'HouseWithYard' | 'Rented';
  familyWithKids?: boolean;
  hasOtherPets?: boolean;
}

export interface AiMatchResult {
  petId: string;
  score: number;
  reason: string;
  pet?: Pet;
}

export interface TransactionExecutionResult {
  transactionId: string;
  success: boolean;
  finalStatus: 'COMMITTED' | 'ROLLED_BACK';
  message: string;
}

export interface EmailNotificationLog {
  logId: string;
  applicationId?: string;
  recipientEmail: string;
  recipientName: string;
  petName?: string;
  petSpecies?: string;
  petImage?: string;
  subject: string;
  status: string;
  sentAt: string;
  sender: string;
  contentPreview: string;
  htmlContent?: string;
  deliveryStatus: 'Delivered' | 'Queued' | 'Sent';
}
