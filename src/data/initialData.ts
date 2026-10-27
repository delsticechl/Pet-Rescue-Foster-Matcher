import { User, Shelter, Pet, AdoptionApplication, CareLog, Donation } from '../types';

export const INITIAL_USERS: User[] = [
  {
    userId: 'USR-ADMIN',
    username: 'AdminStaff',
    fullName: 'AdminStaff',
    email: 'adminstaff@pawfund.org',
    phone: '0988776655',
    address: 'PawFund National Rescue & Operations Office',
    role: 'Admin',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    createdAt: '2026-01-01 00:00:00',
  },
];

export const INITIAL_SHELTERS: Shelter[] = [
  {
    shelterId: 'SHL-01',
    shelterName: 'PawFund Animal Rescue Shelter',
    address: '264 Au Co, Nhat Tan, Tay Ho, Hanoi',
    phone: '0903112233',
    email: 'contact@pawfund.org',
    managerId: 'USR-ADMIN',
    managerName: 'AdminStaff',
    description: 'Rescue shelter dedicated to treating, rehabilitating, and finding forever homes for abandoned pets.',
    bankAccount: '19034567890011',
    bankName: 'Techcombank - PawFund Rescue Fund',
    capacity: 60,
    currentPetsCount: 0,
    rating: 5.0,
    imageUrl: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=600&q=80',
  },
];

export const INITIAL_PETS: Pet[] = [];
export const INITIAL_APPLICATIONS: AdoptionApplication[] = [];
export const INITIAL_CARE_LOGS: CareLog[] = [];
export const INITIAL_DONATIONS: Donation[] = [];
