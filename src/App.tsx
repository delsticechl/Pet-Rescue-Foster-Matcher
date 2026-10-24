import React, { useState, useEffect } from 'react';
import {
  Heart,
  Search,
  Sparkles,
  SlidersHorizontal,
  PawPrint,
  AlertTriangle,
  RefreshCw,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { Pet, User, Shelter } from './types';
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
import { AdopterDashboard } from './components/AdopterDashboard';
import { AuthModal } from './components/AuthModal';
import { AvatarUploadModal } from './components/AvatarUploadModal';
import { useRealtimeSocket } from './hooks/useRealtimeSocket';
import { realtimeWs } from './services/websocket';
import confetti from 'canvas-confetti';

type TabKey = 'pets' | 'matchmaker' | 'carelogs' | 'shelters' | 'admin' | 'adopter';
const VALID_TABS: TabKey[] = ['pets', 'matchmaker', 'carelogs', 'shelters', 'admin', 'adopter'];
const LS_USER = 'pawfund.session.user';
const LS_TAB = 'pawfund.session.tab';

// Session helpers: never let storage problems (private mode, quota) break the app
function loadSavedUser(): User | null {
  try {
    const raw = localStorage.getItem(LS_USER);
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u && typeof u.userId === 'string' ? ({ avatarUrl: '', ...u } as User) : null;
  } catch {
    return null;
  }
}
function loadSavedTab(): TabKey {
  try {
    const t = localStorage.getItem(LS_TAB) as TabKey | null;
    return t && VALID_TABS.includes(t) ? t : 'pets';
  } catch {
    return 'pets';
  }
}

export const App: React.FC = () => {
  // Diagnostics: proves this build is running and shows what was restored (remove when no longer needed)
  useEffect(() => {
    try {
      console.info(
        '[PawFund session v2] build active | saved user:',
        localStorage.getItem(LS_USER) ? JSON.parse(localStorage.getItem(LS_USER)!).userId : '(none)',
        '| saved tab:',
        localStorage.getItem(LS_TAB) || '(none)'
      );
    } catch (e) {
      console.warn('[PawFund session v2] localStorage is not available:', e);
    }
  }, []);

  // Global Data State
  const [pets, setPets] = useState<Pet[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(() => loadSavedUser() || INITIAL_USERS[0] || null);
  const [loading, setLoading] = useState<boolean>(true);

  // MySQL Connection Status
  const [mySqlStatus, setMySqlStatus] = useState<{
    isConnected: boolean;
    error?: string | null;
    serverVersion?: string;
  } | null>(null);
  const [isRetryingDb, setIsRetryingDb] = useState(false);

  // Navigation & Theme
  const [activeTab, setActiveTab] = useState<TabKey>(loadSavedTab);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Filters for Catalog
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [selectedEnergy, setSelectedEnergy] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [kidFriendlyOnly, setKidFriendlyOnly] = useState<boolean>(false);

  // Modals
  const [selectedPetDetail, setSelectedPetDetail] = useState<Pet | null>(null);
  const [selectedPetForApply, setSelectedPetForApply] = useState<Pet | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showAvatarModal, setShowAvatarModal] = useState<boolean>(false);

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

  // Remember who is signed in and which tab is open across reloads.
  // The avatar is left out (it can be several hundred KB); it is re-fetched on load.
  useEffect(() => {
    try {
      if (currentUser) {
        const { avatarUrl, ...rest } = currentUser;
        localStorage.setItem(LS_USER, JSON.stringify(rest));
      } else {
        localStorage.removeItem(LS_USER);
      }
    } catch {
      /* ignore */
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_TAB, activeTab);
    } catch {
      /* ignore */
    }
  }, [activeTab]);

  // Ensure Admin tab is only accessible if user has Admin role
  useEffect(() => {
    if (activeTab === 'admin' && currentUser?.role !== 'Admin') {
      setActiveTab('pets');
    }
  }, [activeTab, currentUser]);

  // Initial Data Fetch & MySQL check
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [petsData, sheltersData, usersData, dbStatus] = await Promise.all([
        api.getPets(),
        api.getShelters(),
        api.getUsers(),
        api.getMySqlStatus().catch(() => ({ isConnected: false, error: 'Chưa kết nối MySQL' })),
      ]);
      setPets(petsData);
      setShelters(sheltersData);
      setAllUsers(usersData);
      setMySqlStatus(dbStatus as any);
      // Re-attach the saved session to the fresh record (avatar, role, etc.)
      const savedId = loadSavedUser()?.userId;
      const freshUser = savedId ? usersData.find((u: User) => u.userId === savedId) : undefined;
      console.info('[PawFund session v2] after load: saved id =', savedId || '(none)', '| found in user list =', !!freshUser);
      if (freshUser) {
        setCurrentUser(freshUser);
      } else if (!currentUser && usersData.length > 0) {
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

  const refreshPets = async () => {
    try {
      const petsData = await api.getPets();
      setPets(petsData);
    } catch (e) {
      console.error(e);
    }
  };

  // Real-Time WebSocket integration
  useRealtimeSocket(currentUser);

  useEffect(() => {
    // 1. Thú cưng được thêm, cập nhật hoặc xóa
    const unsubPetCreated = realtimeWs.on('pet:created', (payload) => {
      refreshPets();
      showGlobalToast(
        'Thú cưng mới vừa được đăng tải! 🐾',
        `Bé ${payload.data?.name || 'thú cưng'} đã có mặt tại trạm cứu hộ và đang tìm mái ấm.`
      );
    });

    const unsubPetUpdated = realtimeWs.on('pet:updated', () => {
      refreshPets();
    });

    const unsubPetDeleted = realtimeWs.on('pet:deleted', () => {
      refreshPets();
    });

    // 2. Trạng thái đơn nhận nuôi được duyệt / cập nhật (cho Adopter)
    const unsubAppUpdated = realtimeWs.on('application:status_updated', (payload) => {
      const { status, petName, applicantEmail, adminNotes } = payload.data;
      const myEmail = currentUser?.email?.toLowerCase();
      const targetEmail = applicantEmail?.toLowerCase();

      if (targetEmail && targetEmail === myEmail) {
        if (status === 'Approved') {
          try {
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
          } catch {
            // ignore
          }
          showGlobalToast(
            `🎉 Chúc mừng! Đơn nhận nuôi bé ${petName} ĐÃ ĐƯỢC DUYỆT!`,
            `Lời nhắn từ trạm: "${adminNotes || 'Vui lòng đến trạm để hoàn tất thủ tục đón bé về nhà!'}"`
          );
        } else if (status === 'Rejected') {
          showGlobalToast(
            `Thông báo về đơn xin nhận nuôi bé ${petName}`,
            `Đơn của bạn chưa thể phê duyệt kỳ này. Lời nhắn: "${adminNotes || 'Cảm ơn bạn đã quan tâm!'}"`
          );
        }
      }
    });

    // 3. Đơn nhận nuôi mới được gửi (cho AdminStaff)
    const unsubAppCreated = realtimeWs.on('application:created', (payload) => {
      if (currentUser?.role === 'Admin') {
        showGlobalToast(
          'Đơn nhận nuôi mới vừa được gửi! 📋',
          `Người nộp: ${payload.data?.applicantName} - Thú cưng: ${payload.data?.petName || 'Bé cưng'}.`
        );
      }
    });

    // 4. Nhật ký chăm sóc mới vừa đăng
    const unsubCareLog = realtimeWs.on('care_log:created', (payload) => {
      showGlobalToast(
        'Nhật ký chăm sóc mới vừa đăng! 📖',
        `Chủ nuôi ${payload.data?.authorName || 'yêu thương'} vừa chia sẻ khoảnh khắc vui vẻ mới của thú cưng.`
      );
    });

    return () => {
      unsubPetCreated();
      unsubPetUpdated();
      unsubPetDeleted();
      unsubAppUpdated();
      unsubAppCreated();
      unsubCareLog();
    };
  }, [currentUser?.email, currentUser?.role]);

  const handleRetryDbConnection = async () => {
    setIsRetryingDb(true);
    try {
      const res = await api.testMySqlConnection();
      if (res.success) {
        setMySqlStatus({ isConnected: true, serverVersion: res.serverVersion });
        showGlobalToast('Kết nối MySQL thành công!', `Máy chủ MySQL ${res.serverVersion} đã hoạt động.`);
        refreshPets();
      } else {
        setMySqlStatus({ isConnected: false, error: res.message });
        showGlobalToast('Chưa kết nối được MySQL', res.message);
      }
    } catch (e: any) {
      setMySqlStatus({ isConnected: false, error: e.message });
    } finally {
      setIsRetryingDb(false);
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
        onOpenAvatarUpload={() => setShowAvatarModal(true)}
      />

      {/* MySQL Connection Notice / Guide Banner (Shown when MySQL is not connected) */}
      {mySqlStatus && !mySqlStatus.isConnected && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Trạng thái MySQL:</strong> Chưa phát hiện máy chủ MySQL đang chạy. Hệ thống đang hoạt động ở chế độ dữ liệu an toàn (chỉ duy nhất tài khoản <code>AdminStaff</code>).
                Để kết nối MySQL thực tế, hãy cấu hình các biến <code>MYSQL_HOST</code>, <code>MYSQL_PORT</code>, <code>MYSQL_USER</code>, <code>MYSQL_PASSWORD</code>, <code>MYSQL_DATABASE</code> trong file <code>.env</code>.
              </span>
            </div>
            <button
              onClick={handleRetryDbConnection}
              disabled={isRetryingDb}
              className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shrink-0 flex items-center gap-1 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetryingDb ? 'animate-spin' : ''}`} />
              <span>{isRetryingDb ? 'Đang thử lại...' : 'Kiểm tra kết nối'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* VIEW 1: PET CATALOG & ADOPTION HOME */}
        {activeTab === 'pets' && (
          <div className="space-y-8">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 text-white p-6 sm:p-10 shadow-xl">
              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-sky-100">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Hệ Thống Cứu Hộ & Nhận Nuôi Thú Cưng
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                  Trao Yêu Thương, <br />
                  <span className="text-amber-300">Đón Người Bạn Nhỏ</span> Về Nhà
                </h1>
                <p className="text-xs sm:text-sm text-sky-100 leading-relaxed max-w-lg">
                  Kết nối trực tiếp với các bé chó mèo cần tìm chủ tại trạm cứu hộ. Mọi hồ sơ sức khỏe và lịch sử khám chữa bệnh đều được công khai minh bạch.
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('matchmaker')}
                    className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
                  >
                    <Sparkles className="w-4 h-4" /> AI Tìm Bạn Bốn Chân Phù Hợp
                  </button>
                  <button
                    onClick={() => setActiveTab('shelters')}
                    className="px-5 py-3 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs flex items-center gap-2 border border-white/20"
                  >
                    <Heart className="w-4 h-4 text-rose-300 fill-current" /> Quyên Góp Cho Trạm
                  </button>
                </div>
              </div>

              {/* Decorative background shape */}
              <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute right-10 top-1/2 -translate-y-1/2 hidden lg:block opacity-85">
                <img
                  src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=500&q=80"
                  alt="Pet Hero"
                  className="w-72 h-72 rounded-3xl object-cover shadow-2xl border-4 border-white/20 rotate-3 hover:rotate-0 transition-transform duration-500"
                />
              </div>
            </div>

            {/* AI Matchmaker Prompt Card */}
            <div
              onClick={() => setActiveTab('matchmaker')}
              className="p-5 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-sky-500/10 to-transparent border border-sky-500/30 dark:border-sky-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-sky-500/15 transition-all group shadow-xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2">
                    Bạn chưa biết nên chọn bé cưng nào phù hợp?
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                      Tích hợp AI Gemini
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Mô tả không gian nhà và lối sống của bạn, AI sẽ tìm kiếm và gợi ý các bé có tính cách hòa hợp nhất!
                  </p>
                </div>
              </div>

              <span className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold text-xs shrink-0 self-start sm:self-center shadow-md shadow-sky-500/20 group-hover:bg-sky-600 transition-colors">
                Thử Ghép Đôi AI →
              </span>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên bé, giống loài hoặc đặc điểm (ví dụ: Corgi, mèo con, ngoan)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Species Filter */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  {[
                    { key: 'all', label: 'Tất Cả Loài' },
                    { key: 'Dog', label: 'Chó Cưng' },
                    { key: 'Cat', label: 'Mèo Cưng' },
                    { key: 'Other', label: 'Khác' },
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
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Bộ Lọc:
                </div>

                {/* Energy */}
                <select
                  value={selectedEnergy}
                  onChange={(e) => setSelectedEnergy(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs"
                >
                  <option value="all">Mức năng lượng: Tất cả</option>
                  <option value="Low">Thấp (Trầm tính / Ngoan)</option>
                  <option value="Medium">Trung bình (Cân bằng)</option>
                  <option value="High">Cao (Năng động / Thích chạy nhảy)</option>
                </select>

                {/* Status */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="Ready">Sẵn sàng nhận nuôi</option>
                  <option value="Pending">Đang xử lý hồ sơ</option>
                  <option value="Adopted">Đã tìm được nhà mới</option>
                </select>

                {/* Kid friendly check */}
                <label className="flex items-center gap-1.5 cursor-pointer ml-auto text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={kidFriendlyOnly}
                    onChange={(e) => setKidFriendlyOnly(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span>Thân thiện với trẻ em</span>
                </label>
              </div>
            </div>

            {/* Pets Grid */}
            {loading ? (
              <div className="text-center py-20 space-y-3">
                <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Đang tải danh sách thú cưng...</p>
              </div>
            ) : filteredPets.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2">
                <PawPrint className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Chưa có bé thú cưng nào phù hợp
                </h3>
                <p className="text-xs text-slate-400">
                  {currentUser?.role === 'Admin'
                    ? 'Bạn đang đăng nhập với tư cách AdminStaff. Hãy vào mục "Quản Trị Trạm" để đăng tải thú cưng mới có sẵn tại trạm!'
                    : 'Hãy thử điều chỉnh từ khóa tìm kiếm hoặc các tiêu chí bộ lọc nhé!'}
                </p>
                {currentUser?.role === 'Admin' && (
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab('admin')}
                      className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs transition-all shadow-md"
                    >
                      Đến Bàn Quản Trị Đăng Thú Cưng →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-500">
                    Hiển thị {filteredPets.length} bé thú cưng tại trạm
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredPets.map((pet) => (
                    <PetCard
                      key={pet.petId}
                      pet={pet}
                      onViewDetails={(p) => setSelectedPetDetail(p)}
                      onApply={(p) => setSelectedPetForApply(p)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: AI PET MATCHMAKER (GEMINI FLASH) */}
        {activeTab === 'matchmaker' && (
          <SmartMatchmaker
            onViewDetails={(pet) => setSelectedPetDetail(pet)}
            onApply={(pet) => setSelectedPetForApply(pet)}
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

        {/* VIEW 5: ADOPTER DASHBOARD (Bảng điều khiển & Hồ sơ Người nhận nuôi) */}
        {activeTab === 'adopter' && (
          currentUser ? (
            <AdopterDashboard
              currentUser={currentUser}
              pets={pets}
              onViewPetDetail={(pet) => setSelectedPetDetail(pet)}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
              onRefreshData={loadInitialData}
            />
          ) : (
            <div className="p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 max-w-lg mx-auto shadow-xl">
              <div className="w-16 h-16 rounded-3xl bg-sky-50 dark:bg-sky-950/60 text-sky-500 flex items-center justify-center mx-auto text-3xl">
                🔐
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                Vui Lòng Đăng Nhập Tài Khoản Adopter
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Đăng nhập hoặc đăng ký tài khoản để quản lý thú cưng đã nhận nuôi, theo dõi đơn đăng ký và lịch sử chăm sóc.
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors shadow-md"
              >
                Đăng Nhập / Đăng Ký Ngay
              </button>
            </div>
          )
        )}

        {/* VIEW 6: ADMIN / STAFF DASHBOARD (Restricted to AdminStaff only) */}
        {activeTab === 'admin' && currentUser?.role === 'Admin' && (
          <AdminDashboard
            currentUser={currentUser}
            onRefreshPets={refreshPets}
            onSwitchUser={setCurrentUser}
            onOpenAuthModal={() => setShowAuthModal(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-8 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold">
              🐾
            </div>
            <span className="font-bold text-slate-800 dark:text-white">
              PawFund Rescue & Foster Network
            </span>
          </div>
          <div>
            Hệ thống nhận nuôi thú cưng • Cơ sở dữ liệu MySQL • AI Matching • Care Log trọn đời
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
          onViewCareLog={() => {
            setSelectedPetDetail(null);
            setActiveTab('carelogs');
          }}
        />
      )}

      {selectedPetForApply && currentUser && (
        <AdoptionApplicationModal
          pet={selectedPetForApply}
          currentUser={currentUser}
          onClose={() => setSelectedPetForApply(null)}
          onSuccess={() => {
            setSelectedPetForApply(null);
            refreshPets();
            showGlobalToast(
              'Đơn nhận nuôi đã được gửi!',
              `Chúng tôi đã tiếp nhận hồ sơ xin nhận nuôi bé ${selectedPetForApply.name}. Bạn sẽ nhận được thông báo ngay khi Ban quản trị duyệt hồ sơ!`
            );
          }}
        />
      )}

      {showAvatarModal && currentUser && (
        <AvatarUploadModal
          key={currentUser.userId}
          isOpen={showAvatarModal}
          currentUser={currentUser}
          onClose={() => setShowAvatarModal(false)}
          onAvatarUpdated={(newUrl) => {
            setCurrentUser((prev) => prev ? { ...prev, avatarUrl: newUrl } : prev);
            setShowAvatarModal(false);
          }}
        />
      )}

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setShowAuthModal(false);
            showGlobalToast('Đăng nhập thành công', `Chào mừng ${user.fullName} (${user.role})!`);
          }}
          allUsers={allUsers}
        />
      )}
    </div>
  );
};

export default App;
