import {
  Pet,
  Shelter,
  User,
  AdoptionApplication,
  CareLog,
  Donation,
  MatchCriteria,
  PetMedicalRecord,
  TransactionExecutionResult,
  ShelterStatistics,
  HealthReminder,
  HealthReminderSummary,
} from '../types';

export const api = {
  // USERS & AUTH
  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/users');
    return res.json();
  },

  async login(credentials: { email?: string; username?: string; password?: string } | string): Promise<{ user: User; token: string }> {
    const payload = typeof credentials === 'string' ? { email: credentials } : credentials;
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Đăng nhập thất bại');
    }
    return res.json();
  },

  async register(data: { fullName: string; email: string; phone?: string; address?: string }): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Đăng ký thất bại');
    }
    return res.json();
  },

  // PETS
  async getPets(params?: {
    species?: string;
    status?: string;
    shelterId?: string;
    search?: string;
    vaccinated?: boolean;
    sterilized?: boolean;
    requiresYard?: boolean;
    goodWithKids?: boolean;
  }): Promise<Pet[]> {
    const query = new URLSearchParams();
    if (params?.species) query.append('species', params.species);
    if (params?.status) query.append('status', params.status);
    if (params?.shelterId) query.append('shelterId', params.shelterId);
    if (params?.search) query.append('search', params.search);
    if (params?.vaccinated) query.append('vaccinated', 'true');
    if (params?.sterilized) query.append('sterilized', 'true');
    if (params?.requiresYard !== undefined) query.append('requiresYard', String(params.requiresYard));
    if (params?.goodWithKids) query.append('goodWithKids', 'true');

    const res = await fetch(`/api/pets?${query.toString()}`);
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data || []);
  },

  async getPetById(id: string): Promise<Pet> {
    const res = await fetch(`/api/pets/${id}`);
    if (!res.ok) throw new Error('Pet not found');
    return res.json();
  },

  async uploadImage(file: File): Promise<{
    imageId: string;
    imageUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadSource: 'LocalUpload';
    uploadedAt: string;
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataUrl,
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type,
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to upload photo');
          }
          resolve(await res.json());
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file from your device'));
      reader.readAsDataURL(file);
    });
  },

  async createPet(data: Partial<Pet> & { imageUrl?: string; fileName?: string; fileSize?: number; mimeType?: string; uploadSource?: string; requesterRole?: string }, requesterRole?: string): Promise<Pet> {
    const role = requesterRole || data.requesterRole || 'Admin';
    const res = await fetch('/api/pets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': role,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create pet profile');
    }
    return res.json();
  },

  async updatePet(id: string, data: Partial<Pet> & { imageUrl?: string; fileName?: string; fileSize?: number; mimeType?: string; uploadSource?: string; requesterRole?: string }, requesterRole?: string): Promise<Pet> {
    const role = requesterRole || data.requesterRole || 'Admin';
    const res = await fetch(`/api/pets/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': role,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update pet profile');
    }
    return res.json();
  },

  async deletePet(id: string, requesterRole?: string): Promise<{ success: boolean; message: string; deletedPetId: string }> {
    const role = requesterRole || 'Admin';
    const res = await fetch(`/api/pets/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': role,
      },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete pet profile');
    }
    return res.json();
  },

  async addMedicalRecord(petId: string, record: Partial<PetMedicalRecord>): Promise<PetMedicalRecord> {
    const res = await fetch(`/api/pets/${petId}/medical`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Thêm hồ sơ y tế thất bại');
    }
    return res.json();
  },

  // HEALTH REMINDERS
  async getHealthReminders(params?: {
    petId?: string;
    shelterId?: string;
    userId?: string;
    urgency?: string;
    category?: string;
    daysWindow?: number;
    referenceDate?: string;
  }): Promise<{ reminders: HealthReminder[]; summary: HealthReminderSummary; referenceDate: string }> {
    const query = new URLSearchParams();
    if (params?.petId) query.append('petId', params.petId);
    if (params?.shelterId) query.append('shelterId', params.shelterId);
    if (params?.userId) query.append('userId', params.userId);
    if (params?.urgency) query.append('urgency', params.urgency);
    if (params?.category) query.append('category', params.category);
    if (params?.daysWindow !== undefined) query.append('daysWindow', String(params.daysWindow));
    if (params?.referenceDate) query.append('referenceDate', params.referenceDate);

    const res = await fetch(`/api/health-reminders?${query.toString()}`);
    if (!res.ok) throw new Error('Không thể tải danh sách nhắc nhở y tế');
    return res.json();
  },

  async completeHealthReminder(data: {
    petId: string;
    recordId: string;
    nextFollowUp?: string;
    newDiagnosis?: string;
    newTreatment?: string;
    vetName?: string;
    medications?: string;
  }): Promise<{ success: boolean; message: string; pet: Pet; newRecord?: PetMedicalRecord }> {
    const res = await fetch('/api/health-reminders/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Cập nhật lịch tái khám thất bại');
    }
    return res.json();
  },

  async sendHealthReminderNotification(data: {
    reminderId?: string;
    petId: string;
    customNote?: string;
  }): Promise<{ success: boolean; message: string; emailLog: any }> {
    const res = await fetch('/api/health-reminders/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gửi thông báo nhắc nhở thất bại');
    }
    return res.json();
  },

  // SHELTERS
  async getShelters(): Promise<Shelter[]> {
    const res = await fetch('/api/shelters');
    return res.json();
  },

  // APPLICATIONS
  async getApplications(params?: { userId?: string; shelterId?: string; status?: string }): Promise<AdoptionApplication[]> {
    const query = new URLSearchParams();
    if (params?.userId) query.append('userId', params.userId);
    if (params?.shelterId) query.append('shelterId', params.shelterId);
    if (params?.status) query.append('status', params.status);

    const res = await fetch(`/api/applications?${query.toString()}`);
    return res.json();
  },

  async createApplication(data: Partial<AdoptionApplication>): Promise<AdoptionApplication> {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Nộp đơn thất bại');
    }
    return result;
  },

  async updateApplicationStatus(
    id: string,
    status: string,
    extra?: { interviewTime?: string; staffNotes?: string }
  ): Promise<{ application: AdoptionApplication; transactionResult?: TransactionExecutionResult }> {
    const res = await fetch(`/api/applications/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...extra }),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || result.error || 'Cập nhật trạng thái thất bại');
    }
    return result;
  },

  // CARE LOGS
  async getCareLogs(params?: { petId?: string; userId?: string }): Promise<CareLog[]> {
    const query = new URLSearchParams();
    if (params?.petId) query.append('petId', params.petId);
    if (params?.userId) query.append('userId', params.userId);

    const res = await fetch(`/api/care-logs?${query.toString()}`);
    return res.json();
  },

  async createCareLog(data: Partial<CareLog>): Promise<CareLog> {
    const res = await fetch('/api/care-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Đăng nhật ký thất bại');
    }
    return res.json();
  },

  // DONATIONS
  async getDonations(): Promise<Donation[]> {
    const res = await fetch('/api/donations');
    return res.json();
  },

  async createDonation(data: Partial<Donation>): Promise<Donation> {
    const res = await fetch('/api/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gửi quyên góp thất bại');
    }
    return res.json();
  },

  // SQL & PROCEDURES
  async runMatchingProcedure(criteria: MatchCriteria): Promise<{
    procedureName: string;
    criteria: MatchCriteria;
    resultCount: number;
    matchedPets: Pet[];
    sqlCode: string;
  }> {
    const res = await fetch('/api/sql/stored-procedure/match-pets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(criteria),
    });
    return res.json();
  },

  async getShelterStatsView(): Promise<{
    viewName: string;
    data: ShelterStatistics[];
    sqlDefinition: string;
  }> {
    const res = await fetch('/api/sql/views/shelter-stats');
    return res.json();
  },

  async executeRawSql(query: string): Promise<any> {
    const res = await fetch('/api/sql/raw-query-simulator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Lỗi truy vấn SQL');
    return result;
  },

  // AI ASSISTANT
  async askAiAssistant(prompt: string, petId?: string): Promise<{ answer: string; source: string }> {
    const res = await fetch('/api/ai/ask-pet-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, petId }),
    });
    return res.json();
  },

  // EMAIL NOTIFICATION SIMULATION
  async getEmailLogs(): Promise<import('../types').EmailNotificationLog[]> {
    const res = await fetch('/api/notifications/email-logs');
    return res.json();
  },

  async sendSimulatedStatusEmail(payload: {
    applicationId: string;
    status?: string;
    customNote?: string;
    interviewTime?: string;
  }): Promise<{ success: boolean; emailLog: import('../types').EmailNotificationLog; message: string }> {
    const res = await fetch('/api/notifications/simulate-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gửi email giả lập thất bại');
    }
    return data;
  },

  // MYSQL DATABASE CONNECTION & MANAGEMENT
  async getMySqlStatus(): Promise<{
    isConnected: boolean;
    lastChecked: string | null;
    serverVersion?: string;
    latencyMs?: number;
    tablesCount?: number;
    error?: string | null;
    config: {
      host: string;
      port: number;
      user: string;
      database: string;
      hasPassword: boolean;
    };
  }> {
    const res = await fetch('/api/mysql/status');
    return res.json();
  },

  async testMySqlConnection(config?: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  }): Promise<{
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
    const res = await fetch('/api/mysql/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config || {}),
    });
    return res.json();
  },

  async initMySqlSchema(): Promise<{
    success: boolean;
    message: string;
    tablesCreated?: string[];
  }> {
    const res = await fetch('/api/mysql/init-schema', {
      method: 'POST',
    });
    return res.json();
  },

  async seedMySqlData(): Promise<{
    success: boolean;
    message: string;
  }> {
    const res = await fetch('/api/mysql/seed', {
      method: 'POST',
    });
    return res.json();
  },

  async getMySqlSchemaSql(): Promise<string> {
    const res = await fetch('/api/mysql/schema-sql');
    return res.text();
  },
};
