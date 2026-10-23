import {
  Pet,
  Shelter,
  User,
  AdoptionApplication,
  CareLog,
  Donation,
  PetMedicalRecord,
  InAppNotification,
  AiMatchRequest,
  AiMatchResult,
} from '../types';

async function readJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export const api = {
  // USERS & AUTH
  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/users');
    return res.json();
  },

  async updateUserAvatar(userId: string, avatarUrl: string): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`/api/users/${userId}/avatar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarUrl }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update avatar');
    }
    return res.json();
  },

  async login(credentials: { email?: string; username?: string; password?: string }): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed. Please check your credentials.');
    }
    return res.json();
  },

  async register(data: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword?: string;
    phone?: string;
    address?: string;
  }): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    return res.json();
  },

  // PETS
  async getPets(params?: {
    species?: string;
    status?: string;
    search?: string;
    goodWithKids?: boolean;
    requiresYard?: boolean;
  }): Promise<Pet[]> {
    const query = new URLSearchParams();
    if (params?.species) query.append('species', params.species);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.goodWithKids) query.append('goodWithKids', 'true');
    if (params?.requiresYard !== undefined) query.append('requiresYard', String(params.requiresYard));

    const res = await fetch(`/api/pets?${query.toString()}`);
    return res.json();
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
            throw new Error(err.error || 'Image upload failed');
          }
          resolve(await res.json());
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error('Unable to read selected image file from your device'));
      reader.readAsDataURL(file);
    });
  },

  async createPet(data: any, requesterRole: string = 'Admin'): Promise<Pet> {
    const res = await fetch('/api/pets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': requesterRole,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create pet record');
    }
    return res.json();
  },

  async updatePet(id: string, data: Partial<Pet>, requesterRole: string = 'Admin'): Promise<Pet> {
    const res = await fetch(`/api/pets/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': requesterRole,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update pet record');
    }
    return res.json();
  },

  async deletePet(id: string, requesterRole: string = 'Admin'): Promise<{ success: boolean; message: string; deletedPetId: string }> {
    const res = await fetch(`/api/pets/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': requesterRole,
      },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete pet record');
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
      throw new Error(err.error || 'Failed to add medical record');
    }
    return res.json();
  },

  // AI MATCHMAKER (Gemini API)
  async matchPets(request: AiMatchRequest): Promise<{ matches: AiMatchResult[]; poweredBy?: string }> {
    const res = await fetch('/api/match-pet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error while matching pets with AI');
    }
    return res.json();
  },

  // SHELTERS
  async getShelters(): Promise<Shelter[]> {
    const res = await fetch('/api/shelters');
    return res.json();
  },

  // APPLICATIONS
  async getApplications(): Promise<AdoptionApplication[]> {
    const res = await fetch('/api/applications');
    return res.json();
  },

  async createApplication(data: Partial<AdoptionApplication>): Promise<AdoptionApplication> {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await readJson(res);
    if (!res.ok) {
      throw new Error(result.error || `Failed to submit adoption application (HTTP ${res.status})`);
    }
    return result;
  },

  async updateApplicationStatus(
    id: string,
    status: 'Approved' | 'Rejected',
    adminNotes?: string
  ): Promise<{ success: boolean; applicationId: string; status: string; emailDelivery?: any }> {
    const res = await fetch(`/api/applications/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNotes }),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to update application status');
    }
    return result;
  },

  // CARE LOGS
  async getCareLogs(petId?: string): Promise<CareLog[]> {
    const query = petId ? `?petId=${encodeURIComponent(petId)}` : '';
    const res = await fetch(`/api/care-logs${query}`);
    return res.json();
  },

  async createCareLog(data: Partial<CareLog>): Promise<CareLog> {
    const res = await fetch('/api/care-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await readJson(res);
      throw new Error(err.error || `Failed to publish care log (HTTP ${res.status})`);
    }
    return res.json();
  },

  // DONATIONS
  async getDonations(params?: { userId?: string; email?: string }): Promise<Donation[]> {
    const query = new URLSearchParams();
    if (params?.userId) query.set('userId', params.userId);
    if (params?.email) query.set('email', params.email);
    const qs = query.toString();
    const res = await fetch(`/api/donations${qs ? `?${qs}` : ''}`);
    if (!res.ok) return [];
    return res.json();
  },

  async createDonation(data: Partial<Donation>): Promise<{ donation: Donation; emailResult?: any }> {
    const res = await fetch('/api/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await readJson(res);
      throw new Error(err.error || `Failed to process donation (HTTP ${res.status})`);
    }
    return res.json();
  },

  // IN-APP NOTIFICATIONS
  async getNotifications(email?: string): Promise<InAppNotification[]> {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    const res = await fetch(`/api/notifications${query}`);
    return res.json();
  },

  async markNotificationRead(id: string): Promise<void> {
    await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
  },

  // MYSQL DB STATUS
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

  async testMySqlConnection(config?: any): Promise<any> {
    const res = await fetch('/api/mysql/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config || {}),
    });
    return res.json();
  },

  async initMySqlSchema(): Promise<any> {
    const res = await fetch('/api/mysql/init-schema', { method: 'POST' });
    return res.json();
  },
};
