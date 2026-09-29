import React, { useState, useEffect } from 'react';
import {
  Heart,
  Search,
  Filter,
  Sparkles,
  SlidersHorizontal,
  PawPrint,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
  Sun,
  Moon,
} from 'lucide-react';
import { Pet, User, Shelter, PetSpecies, EnergyLevel } from './types';
import { INITIAL_USERS } from './data/initialData';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { PetCard } from './components/PetCard';
import { PetDetailModal } from './components/PetDetailModal';
import { AdoptionApplicationModal } from './components/AdoptionApplicationModal';
import { SmartMatchmaker } from './components/SmartMatchmaker';
import { CareLogView } from './components/CareLogView';
import { SheltersAndDonation } from './components/SheltersAndDonation';
import { AdminDashboard } from './components/AdminDashboard';
import { SqlErdStudio } from './components/SqlErdStudio';
import { AuthModal } from './components/AuthModal';
import { HealthReminderModal } from './components/HealthReminderModal';
import { PetQrCodeModal } from './components/PetQrCodeModal';

export const App: React.FC = () => {
  // Global Data State
  const [pets, setPets] = useState<Pet[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(INITIAL_USERS[0] || null);
  const [loading, setLoading] = useState<boolean>(true);
  const [urgentReminderCount, setUrgentReminderCount] = useState<number>(0);

  // Navigation & Theme
  const [activeTab, setActiveTab] = useState<'pets' | 'matchmaker' | 'carelogs' | 'shelters' | 'admin' | 'erd'>('pets');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Filters for Catalog
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [selectedEnergy, setSelectedEnergy] = useState<string>('all');
  const [selectedShelter, setSelectedShelter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [kidFriendlyOnly, setKidFriendlyOnly] = useState<boolean>(false);

  // Modals
  const [selectedPetDetail, setSelectedPetDetail] = useState<Pet | null>(null);
  const [selectedPetForApply, setSelectedPetForApply] = useState<Pet | null>(null);
  const [selectedPetForQr, setSelectedPetForQr] = useState<Pet | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [isHealthReminderModalOpen, setIsHealthReminderModalOpen] = useState<boolean>(false);

  // Global Toast
  const [toast, setToast] = useState<{ id: string; title: string; description: string } | null>(null);

  const showGlobalToast = (title: string, description: string) => {
    setToast({ id: String(Date.now()), title, description });
    setTimeout(() => {
      setToast((prev) => (prev?.title === title ? null : prev));
    }, 6000);
  };

  // Theme synchronization
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Ensure Admin tab is only accessible if user has Admin role
  useEffect(() => {
    if (activeTab === 'admin' && currentUser?.role !== 'Admin') {
      setActiveTab('pets');
    }
  }, [activeTab, currentUser]);

  // Initial Data Fetch
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [petsData, sheltersData, usersData, remindersData] = await Promise.all([
        api.getPets(),
        api.getShelters(),
        api.getUsers(),
        api.getHealthReminders().catch(() => ({ reminders: [], summary: { overdue: 0, today: 0, next7Days: 0, next30Days: 0, total: 0 } })),
      ]);
      setPets(petsData);
      setShelters(sheltersData);
      setAllUsers(usersData);
      setUrgentReminderCount(remindersData.summary.overdue + remindersData.summary.today + remindersData.summary.next7Days);
      if (!currentUser && usersData.length > 0) {
        setCurrentUser(usersData[0]);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Check URL parameters for direct deep-linking to pet details (e.g. ?petId=PET-001)
  useEffect(() => {
    if (pets.length === 0) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const petParam = params.get('petId') || params.get('pet') || (window.location.hash.includes('petId=') ? window.location.hash.split('petId=')[1] : null);
      if (petParam) {
        const found = pets.find((p) => p.petId.toLowerCase() === petParam.toLowerCase());
        if (found) {
          setSelectedPetDetail(found);
        }
      }
    } catch (e) {
      console.error('Error parsing petId from URL:', e);
    }
  }, [pets]);

  // Sync selectedPetDetail with URL search params
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (selectedPetDetail) {
        url.searchParams.set('petId', selectedPetDetail.petId);
      } else {
        url.searchParams.delete('petId');
        url.searchParams.delete('pet');
      }
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      // Ignore
    }
  }, [selectedPetDetail]);

  const refreshPets = async () => {
    try {
      const [petsData, remindersData] = await Promise.all([
        api.getPets(),
        api.getHealthReminders().catch(() => ({ reminders: [], summary: { overdue: 0, today: 0, next7Days: 0, next30Days: 0, total: 0 } })),
      ]);
      setPets(petsData);
      setUrgentReminderCount(remindersData.summary.overdue + remindersData.summary.today + remindersData.summary.next7Days);
    } catch (e) {
      console.error(e);
    }
  };

  // Filter logic
  const filteredPets = pets.filter((pet) => {
    if (selectedSpecies !== 'all') {
      const sp = pet.species.toLowerCase();
      const sel = selectedSpecies.toLowerCase();
      if (sel === 'dog' && sp !== 'dog' && sp !== 'chó') return false;
      if (sel === 'cat' && sp !== 'cat' && sp !== 'mèo') return false;
      if (sel === 'other' && sp !== 'other' && sp !== 'khác') return false;
    }
    if (selectedEnergy !== 'all') {
      const en = pet.energyLevel.toLowerCase();
      const sel = selectedEnergy.toLowerCase();
      if (sel === 'low' && en !== 'low' && en !== 'thấp') return false;
      if (sel === 'medium' && en !== 'medium' && en !== 'trung bình') return false;
      if (sel === 'high' && en !== 'high' && en !== 'cao') return false;
    }
    if (selectedShelter !== 'all' && pet.shelterId !== selectedShelter) return false;
    if (statusFilter !== 'all' && pet.adoptionStatus !== statusFilter) return false;
    if (kidFriendlyOnly && !pet.goodWithKids) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = pet.name.toLowerCase().includes(q);
      const matchBreed = pet.breed.toLowerCase().includes(q);
      const matchDesc = (pet.description || '').toLowerCase().includes(q);
      if (!matchName && !matchBreed && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-200 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        allUsers={allUsers}
        onSwitchUser={setCurrentUser}
        darkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenAuth={() => setShowAuthModal(true)}
        healthReminderCount={urgentReminderCount}
        onOpenHealthReminders={() => setIsHealthReminderModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* VIEW 1: PET CATALOG & ADOPTION HOME */}
        {activeTab === 'pets' && (
          <div className="space-y-8">
            {/* Hero Interactive Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 text-white p-6 sm:p-10 shadow-xl">
              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-sky-100">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Relational 3NF Architecture & Adoption Matcher
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                  Give Love, <br />
                  <span className="text-amber-300">Welcome a Friend</span> Home
                </h1>
                <p className="text-xs sm:text-sm text-sky-100 leading-relaxed max-w-lg">
                  Connect directly with rescue dogs and cats from accredited animal shelters. With smart stored procedure matching and verified medical histories, find your ideal pet today.
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    id="btn-hero-smart-match"
                    onClick={() => setActiveTab('matchmaker')}
                    className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
                  >
                    <Sparkles className="w-4 h-4" /> Smart Matchmaker (Stored Proc)
                  </button>
                  <button
                    id="btn-hero-donate"
                    onClick={() => setActiveTab('shelters')}
                    className="px-5 py-3 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs flex items-center gap-2 border border-white/20"
                  >
                    <Heart className="w-4 h-4 text-rose-300 fill-current" /> Verified Shelters & Donate
                  </button>
                </div>
              </div>

              {/* Decorative background shapes */}
              <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute right-10 top-1/2 -translate-y-1/2 hidden lg:block opacity-85">
                <img
                  src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=500&q=80"
                  alt="Pet Hero"
                  className="w-72 h-72 rounded-3xl object-cover shadow-2xl border-4 border-white/20 rotate-3 hover:rotate-0 transition-transform duration-500"
                />
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-search-pets"
                    type="text"
                    placeholder="Search by name, breed, keywords (e.g. Golden, Corgi, kitten)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Species Filter */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  {[
                    { key: 'all', label: 'All Species' },
                    { key: 'Dog', label: 'Dogs' },
                    { key: 'Cat', label: 'Cats' },
                    { key: 'Other', label: 'Other' },
                  ].map((sp) => (
                    <button
                      key={sp.key}
                      onClick={() => setSelectedSpecies(sp.key)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedSpecies === sp.key
                          ? 'bg-sky-500 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Secondary Filters */}
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Filters:
                </div>

                {/* Energy */}
                <select
                  value={selectedEnergy}
                  onChange={(e) => setSelectedEnergy(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs"
                >
                  <option value="all">Energy Level: All</option>
                  <option value="Low">Low (Calm / Gentle)</option>
                  <option value="Medium">Medium (Balanced)</option>
                  <option value="High">High (Energetic / Active)</option>
                </select>

                {/* Shelter */}
                <select
                  value={selectedShelter}
                  onChange={(e) => setSelectedShelter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs"
                >
                  <option value="all">All Rescue Shelters</option>
                  {shelters.map((s) => (
                    <option key={s.shelterId} value={s.shelterId}>
                      {s.shelterName}
                    </option>
                  ))}
                </select>

                {/* Status */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs"
                >
                  <option value="all">All Adoption Statuses</option>
                  <option value="Ready">Ready for Adoption</option>
                  <option value="Adopted">Adopted</option>
                  <option value="Fostered">In Foster Care</option>
                </select>

                {/* Kid friendly check */}
                <label className="flex items-center gap-1.5 cursor-pointer ml-auto text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={kidFriendlyOnly}
                    onChange={(e) => setKidFriendlyOnly(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span>Kid Friendly</span>
                </label>
              </div>
            </div>

            {/* Pets Grid */}
            {loading ? (
              <div className="text-center py-20 space-y-3">
                <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Loading PETS database...</p>
              </div>
            ) : filteredPets.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2">
                <PawPrint className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No matching pets found
                </h3>
                <p className="text-xs text-slate-400">Try adjusting your filters or search keywords!</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-500">
                    Showing {filteredPets.length} pets available
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredPets.map((pet) => (
                    <PetCard
                      key={pet.petId}
                      pet={pet}
                      onViewDetails={(p) => setSelectedPetDetail(p)}
                      onApply={(p) => setSelectedPetForApply(p)}
                      onShowQrCode={(p) => setSelectedPetForQr(p)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: SMART MATCHMAKER (STORED PROCEDURE ALGORITHM) */}
        {activeTab === 'matchmaker' && (
          <SmartMatchmaker
            onViewDetails={(pet) => setSelectedPetDetail(pet)}
            onApply={(pet) => setSelectedPetForApply(pet)}
            onShowQrCode={(pet) => setSelectedPetForQr(pet)}
          />
        )}

        {/* VIEW 3: CARE LOGS */}
        {activeTab === 'carelogs' && currentUser && (
          <CareLogView currentUser={currentUser} pets={pets} />
        )}

        {/* VIEW 4: SHELTERS & DONATIONS */}
        {activeTab === 'shelters' && currentUser && (
          <SheltersAndDonation currentUser={currentUser} />
        )}

        {/* VIEW 5: ADMIN / STAFF DASHBOARD (Restricted to Admin account only) */}
        {activeTab === 'admin' && currentUser?.role === 'Admin' && (
          <AdminDashboard
            currentUser={currentUser}
            onRefreshPets={refreshPets}
            onSwitchUser={setCurrentUser}
            onOpenAuthModal={() => setShowAuthModal(true)}
          />
        )}

        {/* VIEW 6: ERD & SQL STUDIO */}
        {activeTab === 'erd' && <SqlErdStudio />}
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-8 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold">
              🐾
            </div>
            <span className="font-bold text-slate-800 dark:text-white">
              Pet Rescue & Foster Matcher System
            </span>
          </div>
          <div>
            &copy; 2024 PawFund. All rights reserved. | <a href="/privacy" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      {toast && (
        <div
          id="global-toast-notification"
          className="fixed bottom-6 right-6 z-60 max-w-md bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-sky-500/50 flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 mt-0.5 shrink-0">
            🔔
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-xs text-sky-300 flex items-center justify-between">
              <span>{toast.title}</span>
              <button
                onClick={() => setToast(null)}
                className="text-slate-400 hover:text-white ml-2 text-xs"
              >
                ✕
              </button>
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
              {toast.description}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {selectedPetDetail && (
        <PetDetailModal
          pet={selectedPetDetail}
          onClose={() => setSelectedPetDetail(null)}
          onApply={(p) => {
            setSelectedPetDetail(null);
            setSelectedPetForApply(p);
          }}
          onOpenHealthReminders={() => setIsHealthReminderModalOpen(true)}
          onOpenQrCode={(p) => setSelectedPetForQr(p)}
        />
      )}

      {/* PET QR CODE MODAL */}
      <PetQrCodeModal
        pet={selectedPetForQr}
        isOpen={!!selectedPetForQr}
        onClose={() => setSelectedPetForQr(null)}
        showToast={showGlobalToast}
      />

      {/* HEALTH REMINDERS MODAL */}
      <HealthReminderModal
        isOpen={isHealthReminderModalOpen}
        onClose={() => setIsHealthReminderModalOpen(false)}
        currentUser={currentUser}
        onSelectPet={(pet) => setSelectedPetDetail(pet)}
        onRefreshPets={refreshPets}
        showToast={showGlobalToast}
      />

      {selectedPetForApply && currentUser && (
        <AdoptionApplicationModal
          pet={selectedPetForApply}
          currentUser={currentUser}
          onClose={() => setSelectedPetForApply(null)}
          onSuccess={() => {
            setSelectedPetForApply(null);
            refreshPets();
          }}
        />
      )}

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setShowAuthModal(false);
          }}
          allUsers={allUsers}
        />
      )}
    </div>
  );
};

export default App;
