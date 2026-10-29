import { readImageAsDataUrl } from '../utils/imageResize';
import React, { useState, useEffect, useRef } from 'react';
import {
  UserCheck,
  Heart,
  FileText,
  BookOpen,
  DollarSign,
  Bell,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Upload,
  Calendar,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  Home,
  Check,
  ShieldCheck,
  Info,
  ExternalLink,
  ChevronRight,
  Smile,
  Scale,
} from 'lucide-react';
import {
  User,
  Pet,
  AdoptionApplication,
  CareLog,
  Donation,
  InAppNotification,
} from '../types';
import { api } from '../services/api';
import { realtimeWs } from '../services/websocket';

interface AdopterDashboardProps {
  currentUser: User;
  pets: Pet[];
  onViewPetDetail: (pet: Pet) => void;
  onNavigateTab: (tab: string) => void;
  onRefreshData?: () => void;
}

export const AdopterDashboard: React.FC<AdopterDashboardProps> = ({
  currentUser,
  pets,
  onViewPetDetail,
  onNavigateTab,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'adopted_pets' | 'applications' | 'carelogs' | 'donations' | 'notifications'>('adopted_pets');

  // Data states
  const [applications, setApplications] = useState<AdoptionApplication[]>([]);
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Care Log modal
  const [isAddCareLogOpen, setIsAddCareLogOpen] = useState(false);
  const [selectedPetForLog, setSelectedPetForLog] = useState<Pet | null>(null);
  const careLogFileInputRef = useRef<HTMLInputElement>(null);

  const [careLogForm, setCareLogForm] = useState({
    petId: '',
    note: '',
    imageUrl: 'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?auto=format&fit=crop&w=800&q=80',
    fileName: '',
    healthUpdate: 'Eating well, adapting wonderfully to home environment, very affectionate.',
    weightKg: 4.5,
    mood: 'Playful & Energetic' as any,
  });
  const [submittingLog, setSubmittingLog] = useState(false);
  const [logSuccessMessage, setLogSuccessMessage] = useState<string | null>(null);

  // Load user data
  const loadAdopterData = async () => {
    setLoading(true);
    try {
      const [allApps, allLogs, myDonations, notifs] = await Promise.all([
        api.getApplications().catch(() => []),
        api.getCareLogs().catch(() => []),
        api.getDonations({ userId: currentUser.userId, email: currentUser.email }).catch(() => []),
        api.getNotifications(currentUser.email).catch(() => []),
      ]);

      // Filter by current user email or userId
      const myEmail = currentUser.email.toLowerCase();
      const myUserId = currentUser.userId;

      const myApps = allApps.filter(
        (app) =>
          (app.applicantEmail && app.applicantEmail.toLowerCase() === myEmail) ||
          app.userId === myUserId
      );

      const myLogs = allLogs.filter(
        (log) =>
          log.userId === myUserId ||
          (log.adopterName && log.adopterName.toLowerCase() === currentUser.fullName.toLowerCase())
      );

      setApplications(myApps);
      setCareLogs(myLogs);
      setDonations(myDonations);
      setNotifications(notifs);
    } catch (e) {
      console.error('Error fetching adopter data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdopterData();
  }, [currentUser]);

  // Real-Time WebSocket listeners for Adopter Dashboard
  useEffect(() => {
    const unsubApp = realtimeWs.on('application:status_updated', () => {
      loadAdopterData();
      if (onRefreshData) onRefreshData();
    });

    const unsubCareLog = realtimeWs.on('care_log:created', () => {
      loadAdopterData();
    });

    const unsubNotif = realtimeWs.on('notification:new', () => {
      loadAdopterData();
    });

    const unsubDonation = realtimeWs.on('donation:created', () => {
      loadAdopterData();
    });

    return () => {
      unsubApp();
      unsubCareLog();
      unsubNotif();
      unsubDonation();
    };
  }, [currentUser?.email, onRefreshData]);

  // Determine adopted pets for this adopter:
  // 1. Pets where user has an 'Approved' application
  // 2. Or pets with adoptionStatus === 'Adopted' linked to this user
  const approvedPetIds = new Set(
    applications
      .filter((app) => app.status === 'Approved')
      .map((app) => app.petId)
  );

  const myAdoptedPets = pets.filter((pet) => approvedPetIds.has(pet.petId));

  // Handle Care Log Image selection
  const handleCareLogFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP)');
      return;
    }

    readImageAsDataUrl(file, 1280, 0.85)
      .then((dataUrl) => setCareLogForm((prev) => ({ ...prev, imageUrl: dataUrl, fileName: file.name })))
      .catch(() => alert('Unable to read image file'));
  };

  const openLogModalForPet = (pet: Pet) => {
    setSelectedPetForLog(pet);
    setCareLogForm((prev) => ({
      ...prev,
      petId: pet.petId,
      fileName: '',
      note: `${pet.name} is happy and healthy today.`,
    }));
    setIsAddCareLogOpen(true);
    setLogSuccessMessage(null);
  };

  const handleSubmitCareLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!careLogForm.petId || !careLogForm.note) {
      alert('Please enter your care log message');
      return;
    }

    setSubmittingLog(true);
    try {
      await api.createCareLog({
        petId: careLogForm.petId,
        userId: currentUser.userId,
        adopterName: currentUser.fullName,
        note: careLogForm.note,
        imageUrl: careLogForm.imageUrl,
        healthUpdate: careLogForm.healthUpdate,
        weightKg: Number(careLogForm.weightKg) || undefined,
        mood: careLogForm.mood,
      });

      setLogSuccessMessage('Care log published successfully! Saved to the system.');
      setTimeout(() => {
        setIsAddCareLogOpen(false);
        setLogSuccessMessage(null);
      }, 1500);

      loadAdopterData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Error saving care log');
    } finally {
      setSubmittingLog(false);
    }
  };

  const totalDonationAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
  const pendingAppsCount = applications.filter((a) => a.status === 'Pending' || a.status === 'Submitted').length;
  const approvedAppsCount = applications.filter((a) => a.status === 'Approved').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header Banner & Profile Overview */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-800 text-white shadow-xl p-6 sm:p-8">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                alt={currentUser.fullName}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white/20 shadow-lg"
              />
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow">
                Adopter
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {currentUser.fullName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-sky-100 backdrop-blur-sm border border-white/10">
                  Pet Adopter
                </span>
              </div>
              <p className="text-sm text-sky-100/90 mt-1 flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {currentUser.email}
                </span>
                {currentUser.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {currentUser.phone}
                  </span>
                )}
                {currentUser.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {currentUser.address}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('matchmaker')}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all backdrop-blur-sm border border-white/20 flex items-center gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>AI Pet Matchmaker</span>
            </button>
            <button
              onClick={() => onNavigateTab('pets')}
              className="px-4 py-2.5 rounded-2xl bg-white text-sky-700 hover:bg-sky-50 font-bold text-xs transition-all shadow-md flex items-center gap-2"
            >
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span>Browse Adoptable Pets</span>
            </button>
          </div>
        </div>

        {/* 4 Key Adopter Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-sky-100 font-medium">Adopted Pets</span>
              <Heart className="w-4 h-4 text-rose-300 fill-rose-300" />
            </div>
            <div className="text-2xl font-black mt-2 text-white">{myAdoptedPets.length}</div>
            <div className="text-[11px] text-sky-200 mt-0.5">
              {myAdoptedPets.length > 0 ? 'Thriving in their new home' : 'No adopted pets yet'}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-sky-100 font-medium">Adoption Applications</span>
              <FileText className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-2xl font-black mt-2 text-white">{applications.length}</div>
            <div className="text-[11px] text-sky-200 mt-0.5">
              {pendingAppsCount > 0 ? `${pendingAppsCount} pending review` : `${approvedAppsCount} approved`}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-sky-100 font-medium">Care Logs</span>
              <BookOpen className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="text-2xl font-black mt-2 text-white">{careLogs.length}</div>
            <div className="text-[11px] text-sky-200 mt-0.5">Health & progress updates</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-sky-100 font-medium">Total Donated</span>
              <DollarSign className="w-4 h-4 text-yellow-300" />
            </div>
            <div className="text-2xl font-black mt-2 text-white">
              ${totalDonationAmount.toLocaleString('en-US')}
            </div>
            <div className="text-[11px] text-sky-200 mt-0.5">{donations.length} contributions made</div>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs Inside Dashboard */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('adopted_pets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'adopted_pets'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>My Pets ({myAdoptedPets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'applications'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Applications ({applications.length})</span>
          {pendingAppsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white">
              {pendingAppsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('carelogs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'carelogs'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Care Logs ({careLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('donations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'donations'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Donations ({donations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications ({notifications.length})</span>
        </button>
      </div>

      {/* 3. Tab Contents */}

      {/* TAB 1: THÚ CƯNG CỦA TÔI */}
      {activeTab === 'adopted_pets' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                Pets You Have Adopted
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review medical history, post health updates, and share photos as your pet settles in.
              </p>
            </div>
          </div>

          {myAdoptedPets.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-sky-50 dark:bg-sky-950/60 text-sky-500 flex items-center justify-center mx-auto text-3xl">
                🐾
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-bold text-slate-800 dark:text-white text-base">
                  You Have Not Adopted Any Pets Yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Rescue pets need loving homes. Explore available pets or use our AI Matchmaker to find your ideal four-legged companion!
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => onNavigateTab('pets')}
                  className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors shadow-md"
                >
                  Browse Available Pets
                </button>
                <button
                  onClick={() => onNavigateTab('matchmaker')}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                  <span>AI Pet Matchmaker</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myAdoptedPets.map((pet) => (
                <div
                  key={pet.petId}
                  className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Pet Image */}
                    <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={pet.imageUrl || pet.primaryImage}
                        alt={pet.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-md flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Adopted
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/60 text-white backdrop-blur-sm">
                          {pet.species === 'Chó' || pet.species === 'Dog' ? 'Dog' : pet.species === 'Mèo' || pet.species === 'Cat' ? 'Cat' : pet.species}
                        </span>
                      </div>
                    </div>

                    {/* Pet Details */}
                    <div className="p-5 space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            {pet.name}
                          </h3>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {pet.ageMonths} months old
                          </span>
                        </div>
                        <div className="text-xs text-sky-600 dark:text-sky-400 font-medium mt-0.5">
                          {pet.breed} • {pet.gender}
                        </div>
                      </div>

                      {/* Health overview snippet */}
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                        <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Status: {pet.healthStatus || 'Healthy'}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{pet.vaccinated ? '✓ Vaccinated' : 'Unvaccinated'}</span>
                          <span>•</span>
                          <span>{pet.sterilized ? '✓ Neutered/Spayed' : 'Not Neutered'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions for this adopted pet */}
                  <div className="p-5 pt-0 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onViewPetDetail(pet)}
                      className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors text-center"
                    >
                      Medical Records
                    </button>
                    <button
                      onClick={() => openLogModalForPet(pet)}
                      className="px-3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Write Care Log</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ĐƠN NHẬN NUÔI CỦA TÔI */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              Adoption Application Tracking
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Track real-time application status, review decisions, and notes from shelter staff.
            </p>
          </div>

          {applications.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-3xl">
                📄
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-bold text-slate-800 dark:text-white text-base">
                  No Applications Submitted Yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  When you find a pet you love, click "Adopt Me" to submit an application. Status updates will appear here!
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('pets')}
                className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors shadow-md"
              >
                Explore Pets Waiting for a Home
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => {
                const matchedPet = pets.find((p) => p.petId === app.petId);

                return (
                  <div
                    key={app.applicationId}
                    className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                          <img
                            src={
                              matchedPet?.imageUrl ||
                              matchedPet?.primaryImage ||
                              app.petImage ||
                              'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=300&q=80'
                            }
                            alt={app.petName || 'Pet'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-slate-800 dark:text-white">
                              Application for: {app.petName || matchedPet?.name || 'Pet'}
                            </h3>
                            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                              #{app.applicationId}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Date: {app.submittedAt || app.appliedAt || 'Recent'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Home className="w-3 h-3" />
                              Housing: {app.housingType} {app.hasYard ? '(With Yard)' : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div>
                        {app.status === 'Approved' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>ĐÃ ĐƯỢC DUYỆT (CHÚC MỪNG!)</span>
                          </div>
                        )}
                        {app.status === 'Pending' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <span>ĐANG CHỜ DUYỆT HỒ SƠ</span>
                          </div>
                        )}
                        {app.status === 'Under Review' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            <Info className="w-4 h-4 text-sky-500" />
                            <span>ĐANG THẨM ĐỊNH / HẸN GẶP</span>
                          </div>
                        )}
                        {app.status === 'Rejected' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <XCircle className="w-4 h-4 text-rose-500" />
                            <span>CHƯA PHÙ HỢP ĐỢT NÀY</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin Notes / Guidance */}
                    {app.status === 'Approved' && (
                      <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>🎉 Message from Shelter Team:</span>
                        </div>
                        <p className="leading-relaxed">
                          "{app.adminNotes || app.staffNotes || 'Your application looks wonderful! Please visit the shelter to complete the adoption.'}"
                        </p>
                        <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 flex flex-wrap items-center gap-3 font-semibold text-[11px]">
                          <span>📌 Next Steps:</span>
                          <span>1. Bring valid ID / passport to shelter</span>
                          <span>2. Sign adoption agreement</span>
                          <span>3. Post pet updates on Care Log</span>
                        </div>
                      </div>
                    )}

                    {app.status === 'Pending' && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Your application is currently under review by shelter staff.</span>
                          <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                            We will contact you via phone <strong>{app.applicantPhone || currentUser.phone}</strong> or email for a brief interview and housing verification.
                          </p>
                        </div>
                      </div>
                    )}

                    {app.status === 'Rejected' && (
                      <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 text-xs text-rose-900 dark:text-rose-200">
                        <div className="font-bold">Notes from shelter:</div>
                        <p className="mt-0.5">
                          "{app.adminNotes || app.staffNotes || 'This pet requires specific accommodations at this time. We warmly invite you to explore other pets at our shelter!'}"
                        </p>
                      </div>
                    )}

                    {/* View Pet Link */}
                    {matchedPet && (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => onViewPetDetail(matchedPet)}
                          className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                        >
                          <span>View {matchedPet.name}'s Profile</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: NHẬT KÝ CHĂM SÓC (MY CARE LOGS) */}
      {activeTab === 'carelogs' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                Your Pet Care Logs
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Share photos, health status, and heartwarming milestones as your pet settles into family life.
              </p>
            </div>
            {myAdoptedPets.length > 0 && (
              <button
                onClick={() => openLogModalForPet(myAdoptedPets[0])}
                className="px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-md self-start"
              >
                <Plus className="w-4 h-4" />
                <span>Write New Care Log</span>
              </button>
            )}
          </div>

          {careLogs.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-3xl">
                📸
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-bold text-slate-800 dark:text-white text-base">
                  No Care Logs Written Yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  The shelter and community love seeing your pet grow happy and healthy in their new home!
                </p>
              </div>
              {myAdoptedPets.length > 0 ? (
                <button
                  onClick={() => openLogModalForPet(myAdoptedPets[0])}
                  className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors shadow-md"
                >
                  Post First Care Log Update
                </button>
              ) : (
                <button
                  onClick={() => onNavigateTab('carelogs')}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-colors"
                >
                  Browse Community Care Logs
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {careLogs.map((log) => (
                <div
                  key={log.logId}
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800 dark:text-white">
                          Pet: {log.petName || 'Pet'}
                        </span>
                        {log.mood && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                            {log.mood}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {log.logDate?.split('T')[0] || 'Today'}
                      </span>
                    </div>

                    {log.imageUrl && (
                      <div className="relative aspect-16/10 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img
                          src={log.imageUrl}
                          alt="Care log"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {log.note || log.notes}
                    </p>

                    {log.healthUpdate && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">
                          Physical condition:
                        </div>
                        <div>{log.healthUpdate}</div>
                        {log.weightKg && (
                          <div className="font-semibold text-sky-600 dark:text-sky-400">
                            Weight: {log.weightKg} kg
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: LỊCH SỬ ĐÓNG GÓP & ỦNG HỘ */}
      {activeTab === 'donations' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                Donation & Support History
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Thank you for helping us provide food, medical care, and shelter for rescued animals.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('shelters')}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-md self-start"
            >
              <Heart className="w-4 h-4 fill-current" />
              <span>Make a Donation</span>
            </button>
          </div>

          {donations.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mx-auto text-3xl">
                💝
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-bold text-slate-800 dark:text-white text-base">
                  No Donation History Yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Every donation helps provide vital vaccines, nutritious food, and emergency veterinary care for rescue pets.
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('shelters')}
                className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-md"
              >
                Donate to Rescue Shelter
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {donations.map((d) => (
                <div
                  key={d.donationId}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg shrink-0">
                      $
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-slate-800 dark:text-white">
                          {(d.amount || 0).toLocaleString('en-US')} USD
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Successful
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-3">
                        <span>Method: {d.paymentMethod || 'Transfer'}</span>
                        <span>•</span>
                        <span>Date: {d.donatedAt || d.date || 'Recent'}</span>
                        {(d.shelterName || d.target) && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-sky-600 dark:text-sky-400">
                              {d.shelterName || d.target}
                            </span>
                          </>
                        )}
                      </div>
                      {d.message && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-1">
                          "{d.message}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 block">
                      TxID: {d.transactionCode || d.donationId}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✓ Transferred to rescue fund
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: HỘP THƯ THÔNG BÁO (MY NOTIFICATIONS) */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              Your Notifications
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Stay informed on application approvals, donation receipts, and shelter news.
            </p>
          </div>

          {notifications.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-2xl">
                🔔
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                No New Notifications
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                When your application status changes or updates arrive from the shelter, they appear here!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.notificationId}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    notif.isRead
                      ? 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      : 'bg-sky-50/60 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/80 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                        notif.type === 'adoption'
                          ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300'
                          : notif.type === 'donation'
                          ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {notif.type === 'adoption' ? (
                        <Heart className="w-4 h-4 fill-current" />
                      ) : notif.type === 'donation' ? (
                        <DollarSign className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {notif.createdAt?.split('T')[0] || 'New'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ĐĂNG TẢI NHẬT KÝ CHĂM SÓC MỚI (CARE LOG) */}
      {isAddCareLogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-sky-600" />
                  <span>Post Care Log Update</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Share happy moments and health progress of your pet
                </p>
              </div>
              <button
                onClick={() => setIsAddCareLogOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitCareLog} className="p-6 space-y-4 overflow-y-auto">
              {logSuccessMessage ? (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-center text-xs font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>{logSuccessMessage}</span>
                </div>
              ) : null}

              {/* Select Pet */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Pet <span className="text-rose-500">*</span>
                </label>
                <select
                  value={careLogForm.petId}
                  onChange={(e) => setCareLogForm({ ...careLogForm, petId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white"
                  required
                >
                  <option value="">-- Choose adopted pet --</option>
                  {myAdoptedPets.map((p) => (
                    <option key={p.petId} value={p.petId}>
                      {p.name} ({p.breed})
                    </option>
                  ))}
                  {myAdoptedPets.length === 0 && pets.map((p) => (
                    <option key={p.petId} value={p.petId}>
                      {p.name} ({p.breed})
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Photo Directly From Device */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pet Photo (Choose from your device)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={careLogFileInputRef}
                    accept="image/*"
                    onChange={handleCareLogFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => careLogFileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-2 border border-slate-200 dark:border-slate-700"
                  >
                    <Upload className="w-4 h-4 text-sky-500" />
                    <span>Upload photo from device</span>
                  </button>
                  {careLogForm.fileName && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium truncate max-w-xs">
                      ✓ Selected: {careLogForm.fileName}
                    </span>
                  )}
                </div>

                {careLogForm.imageUrl && (
                  <div className="mt-2.5 relative aspect-16/9 w-40 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img
                      src={careLogForm.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Note / Caption */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Care Log & Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={careLogForm.note}
                  onChange={(e) => setCareLogForm({ ...careLogForm, note: e.target.value })}
                  placeholder="Today the pet made new friends, finished dinner happily, and loved playing in the yard..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                  required
                />
              </div>

              {/* Mood & Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pet Mood
                  </label>
                  <select
                    value={careLogForm.mood}
                    onChange={(e: any) => setCareLogForm({ ...careLogForm, mood: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-white"
                  >
                    <option value="Playful & Energetic">Playful & Energetic</option>
                    <option value="Calm & Relaxed">Calm & Relaxed</option>
                    <option value="A Bit Shy">A Bit Shy</option>
                    <option value="Healthy & Active">Healthy & Active</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Current Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={careLogForm.weightKg}
                    onChange={(e) => setCareLogForm({ ...careLogForm, weightKg: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Health Update */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Health Status & Condition
                </label>
                <input
                  type="text"
                  value={careLogForm.healthUpdate}
                  onChange={(e) => setCareLogForm({ ...careLogForm, healthUpdate: e.target.value })}
                  placeholder="Shiny coat, bright eyes, eating well..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddCareLogOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-xs hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLog}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors shadow-md flex items-center gap-2"
                >
                  {submittingLog ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Publish Care Log</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
