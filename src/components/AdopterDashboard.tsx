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
    healthUpdate: 'Bé ăn ngoan, thích nghi tốt với không gian nhà mới và rất quấn người.',
    weightKg: 4.5,
    mood: 'Vui vẻ & Tăng động' as const,
  });
  const [submittingLog, setSubmittingLog] = useState(false);
  const [logSuccessMessage, setLogSuccessMessage] = useState<string | null>(null);

  // Load user data
  const loadAdopterData = async () => {
    setLoading(true);
    try {
      const [allApps, allLogs, allDonations, notifs] = await Promise.all([
        api.getApplications().catch(() => []),
        api.getCareLogs().catch(() => []),
        api.getDonations().catch(() => []),
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

      const myDonations = allDonations.filter(
        (d) =>
          (d.donorEmail && d.donorEmail.toLowerCase() === myEmail) ||
          d.userId === myUserId ||
          (d.donorName && d.donorName.toLowerCase() === currentUser.fullName.toLowerCase())
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
      alert('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP)');
      return;
    }

    readImageAsDataUrl(file, 1280, 0.85)
      .then((dataUrl) => setCareLogForm((prev) => ({ ...prev, imageUrl: dataUrl, fileName: file.name })))
      .catch(() => alert('Không thể đọc file ảnh'));
  };

  const openLogModalForPet = (pet: Pet) => {
    setSelectedPetForLog(pet);
    setCareLogForm((prev) => ({
      ...prev,
      petId: pet.petId,
      fileName: '',
      note: `Bé ${pet.name} hôm nay rất vui và khỏe mạnh.`,
    }));
    setIsAddCareLogOpen(true);
    setLogSuccessMessage(null);
  };

  const handleSubmitCareLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!careLogForm.petId || !careLogForm.note) {
      alert('Vui lòng điền nội dung nhật ký chăm sóc');
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

      setLogSuccessMessage('Đăng nhật ký chăm sóc thành công! Bài viết đã được lưu vào hệ thống.');
      setTimeout(() => {
        setIsAddCareLogOpen(false);
        setLogSuccessMessage(null);
      }, 1500);

      loadAdopterData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu nhật ký chăm sóc');
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
                  Người Nhận Nuôi Thú Cưng
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
              <span>AI Ghép Đôi Pet</span>
            </button>
            <button
              onClick={() => onNavigateTab('pets')}
              className="px-4 py-2.5 rounded-2xl bg-white text-sky-700 hover:bg-sky-50 font-bold text-xs transition-all shadow-md flex items-center gap-2"
            >
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span>Xem Thú Cưng Cần Chủ</span>
            </button>
          </div>
        </div>

        {/* 4 Key Adopter Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-sky-100 font-medium">Bé Cưng Đã Nhận Nuôi</span>
              <Heart className="w-4 h-4 text-rose-300 fill-rose-300" />
            </div>
            <div className="text-2xl font-black mt-2 text-white">{myAdoptedPets.length}</div>
            <div className="text-[11px] text-sky-200 mt-0.5">
              {myAdoptedPets.length > 0 ? 'Đang hạnh phúc bên gia đình' : 'Chưa có bé nào'}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-sky-100 font-medium">Đơn Xin Nhận Nuôi</span>
              <FileText className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-2xl font-black mt-2 text-white">{applications.length}</div>
            <div className="text-[11px] text-sky-200 mt-0.5">
              {pendingAppsCount > 0 ? `${pendingAppsCount} đơn đang xử lý` : `${approvedAppsCount} đơn đã duyệt`}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-sky-100 font-medium">Nhật Ký Chăm Sóc (Logs)</span>
              <BookOpen className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="text-2xl font-black mt-2 text-white">{careLogs.length}</div>
            <div className="text-[11px] text-sky-200 mt-0.5">Bản tin cập nhật sức khỏe</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-sky-100 font-medium">Đã Ủng Hộ Trạm</span>
              <DollarSign className="w-4 h-4 text-yellow-300" />
            </div>
            <div className="text-2xl font-black mt-2 text-white">
              {totalDonationAmount.toLocaleString('vi-VN')} đ
            </div>
            <div className="text-[11px] text-sky-200 mt-0.5">{donations.length} lượt đóng góp cứu trợ</div>
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
          <span>Thú Cưng Của Tôi ({myAdoptedPets.length})</span>
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
          <span>Đơn Nhận Nuôi ({applications.length})</span>
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
          <span>Nhật Ký Chăm Sóc ({careLogs.length})</span>
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
          <span>Lịch Sử Đóng Góp ({donations.length})</span>
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
          <span>Hộp Thư Thông Báo ({notifications.length})</span>
        </button>
      </div>

      {/* 3. Tab Contents */}

      {/* TAB 1: THÚ CƯNG CỦA TÔI */}
      {activeTab === 'adopted_pets' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                Thú Cưng Bạn Đã Nhận Nuôi Thành Công
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Xem lại hồ sơ y tế, cập nhật tình hình sức khỏe và đăng tải hình ảnh nhật ký của bé sau khi về nhà.
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
                  Bạn Chưa Có Thú Cưng Nào Được Nhận Nuôi
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Các bé cưng cứu hộ rất cần mái ấm yêu thương. Hãy xem danh sách thú cưng đang cần chủ hoặc sử dụng tính năng AI Ghép Đôi Pet để tìm người bạn 4 chân phù hợp nhất!
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => onNavigateTab('pets')}
                  className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors shadow-md"
                >
                  Xem Danh Sách Thú Cưng
                </button>
                <button
                  onClick={() => onNavigateTab('matchmaker')}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                  <span>AI Ghép Đôi Pet</span>
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
                          Đã Nhận Nuôi
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/60 text-white backdrop-blur-sm">
                          {pet.species === 'Dog' ? 'Chó' : pet.species === 'Cat' ? 'Mèo' : pet.species}
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
                            {pet.ageMonths} tháng tuổi
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
                          <span>Tình trạng: {pet.healthStatus || 'Khỏe mạnh'}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{pet.vaccinated ? '✓ Đã tiêm vắc xin' : 'Chưa tiêm vắc xin'}</span>
                          <span>•</span>
                          <span>{pet.sterilized ? '✓ Đã triệt sản' : 'Chưa triệt sản'}</span>
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
                      Hồ Sơ Bệnh Án
                    </button>
                    <button
                      onClick={() => openLogModalForPet(pet)}
                      className="px-3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Viết Care Log</span>
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
              Theo Dõi Tiến Trình Đơn Xin Nhận Nuôi
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cập nhật trực tiếp kết quả xét duyệt từ Ban Quản Trị trạm cứu hộ và phản hồi ghi chú.
            </p>
          </div>

          {applications.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-3xl">
                📄
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-bold text-slate-800 dark:text-white text-base">
                  Bạn Chưa Gửi Đơn Xin Nhận Nuôi Nào
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Khi bạn tìm thấy bé thú cưng ưng ý, hãy nhấn "Gửi Đơn Nhận Nuôi". Mọi trạng thái xét duyệt sẽ hiển thị tại đây!
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('pets')}
                className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors shadow-md"
              >
                Khám Phá Thú Cưng Đang Chờ Chủ
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
                            alt={app.petName || 'Thú cưng'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-slate-800 dark:text-white">
                              Đơn Xin Nhận Nuôi Bé: {app.petName || matchedPet?.name || 'Thú Cưng'}
                            </h3>
                            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                              #{app.applicationId}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Ngày gửi: {app.submittedAt || app.appliedAt || 'Gần đây'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Home className="w-3 h-3" />
                              Không gian: {app.housingType} {app.hasYard ? '(Có sân vườn)' : ''}
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
                          <span>🎉 Lời Nhắn Từ Ban Quản Trị Trạm Cứu Hộ:</span>
                        </div>
                        <p className="leading-relaxed">
                          "{app.adminNotes || app.staffNotes || 'Hồ sơ của bạn rất tuyệt vời! Vui lòng ghé trạm để hoàn tất thủ tục bàn giao bé.'}"
                        </p>
                        <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 flex flex-wrap items-center gap-3 font-semibold text-[11px]">
                          <span>📌 Bước kế tiếp:</span>
                          <span>1. Mang theo CCCD đến trạm</span>
                          <span>2. Ký hợp đồng nhận nuôi</span>
                          <span>3. Đăng ảnh bé lên Care Log</span>
                        </div>
                      </div>
                    )}

                    {app.status === 'Pending' && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Hồ sơ đang được nhân viên trạm cứu hộ xem xét.</span>
                          <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                            Chúng tôi sẽ liên hệ qua số điện thoại <strong>{app.applicantPhone || currentUser.phone}</strong> hoặc email để phỏng vấn ngắn và xác nhận điều kiện nuôi dưỡng.
                          </p>
                        </div>
                      </div>
                    )}

                    {app.status === 'Rejected' && (
                      <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 text-xs text-rose-900 dark:text-rose-200">
                        <div className="font-bold">Ghi chú từ trạm:</div>
                        <p className="mt-0.5">
                          "{app.adminNotes || app.staffNotes || 'Bé cưng hiện tại cần điều kiện chăm sóc đặc biệt hơn. Rất mong bạn tham khảo thêm các bé khác tại trạm!'}"
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
                          <span>Xem lại thông tin bé {matchedPet.name}</span>
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
                Nhật Ký Chăm Sóc Của Bạn
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chia sẻ hình ảnh, cân nặng và sự tiến bộ của bé sau khi được nhận nuôi về nhà mới.
              </p>
            </div>
            {myAdoptedPets.length > 0 && (
              <button
                onClick={() => openLogModalForPet(myAdoptedPets[0])}
                className="px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-md self-start"
              >
                <Plus className="w-4 h-4" />
                <span>Viết Nhật Ký Chăm Sóc Mới</span>
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
                  Chưa Có Bài Viết Nhật Ký Nào
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Trạm cứu hộ và cộng đồng luôn mong được nhìn thấy các bé thú cưng vui tươi, lớn lên mỗi ngày cùng bạn!
                </p>
              </div>
              {myAdoptedPets.length > 0 ? (
                <button
                  onClick={() => openLogModalForPet(myAdoptedPets[0])}
                  className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors shadow-md"
                >
                  Đăng Tải Nhật Ký Đầu Tiên Cho Bé
                </button>
              ) : (
                <button
                  onClick={() => onNavigateTab('carelogs')}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-colors"
                >
                  Xem Nhật Ký Của Các Chủ Nuôi Khác
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
                          Bé: {log.petName || 'Thú Cưng'}
                        </span>
                        {log.mood && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                            {log.mood}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {log.logDate?.split('T')[0] || 'Hôm nay'}
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
                          Tình trạng thể chất:
                        </div>
                        <div>{log.healthUpdate}</div>
                        {log.weightKg && (
                          <div className="font-semibold text-sky-600 dark:text-sky-400">
                            Cân nặng: {log.weightKg} kg
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
                Lịch Sử Đóng Góp & Ủng Hộ Cứu Trợ
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cảm ơn bạn đã chung tay mang lại thức ăn, nơi ở và điều trị y tế cho các bé thú cưng vô gia cư.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('shelters')}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-md self-start"
            >
              <Heart className="w-4 h-4 fill-current" />
              <span>Ủng Hộ Thêm Cho Trạm</span>
            </button>
          </div>

          {donations.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mx-auto text-3xl">
                💝
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-bold text-slate-800 dark:text-white text-base">
                  Chưa Có Lịch Sử Đóng Góp
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Mỗi đóng góp dù nhỏ cũng tiếp thêm kinh phí mua vắc xin, thức ăn và viện phí điều trị cho những sinh linh bé nhỏ.
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('shelters')}
                className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-md"
              >
                Ủng Hộ Cứu Trợ Ngay
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
                      ₫
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-slate-800 dark:text-white">
                          {(d.amount || 0).toLocaleString('vi-VN')} VNĐ
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Thành công
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-3">
                        <span>Phương thức: {d.paymentMethod || 'Chuyển khoản'}</span>
                        <span>•</span>
                        <span>Ngày: {d.donatedAt || d.date || 'Gần đây'}</span>
                        {d.shelterName && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-sky-600 dark:text-sky-400">
                              {d.shelterName}
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
                      Mã GD: {d.transactionCode || d.donationId}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✓ Đã chuyển vào quỹ cứu hộ
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
              Thông Báo Cá Nhân
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cập nhật thông tin phê duyệt đơn nhận nuôi, quyên góp và các hoạt động từ trạm cứu hộ gửi đến bạn.
            </p>
          </div>

          {notifications.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-2xl">
                🔔
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                Không Có Thông Báo Mới
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Khi có cập nhật về đơn nhận nuôi hoặc tin nhắn từ trạm, bạn sẽ nhận được thông báo ngay tại đây!
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
                          {notif.createdAt?.split('T')[0] || 'Mới'}
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
                  <span>Đăng Nhật Ký Chăm Sóc Bé</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Cập nhật khoảnh khắc và tình hình sức khỏe của bé cưng
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
                  Chọn Thú Cưng <span className="text-rose-500">*</span>
                </label>
                <select
                  value={careLogForm.petId}
                  onChange={(e) => setCareLogForm({ ...careLogForm, petId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white"
                  required
                >
                  <option value="">-- Chọn bé cưng cần cập nhật --</option>
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
                  Hình Ảnh Của Bé (Chọn Từ Thư Viện Ảnh Của Bạn)
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
                    <span>Tải ảnh từ máy / điện thoại</span>
                  </button>
                  {careLogForm.fileName && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium truncate max-w-xs">
                      ✓ Đã chọn: {careLogForm.fileName}
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
                  Nhật Ký & Chia Sẻ Khoảnh Khắc <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={careLogForm.note}
                  onChange={(e) => setCareLogForm({ ...careLogForm, note: e.target.value })}
                  placeholder="Hôm nay bé làm quen với thành viên mới, ăn hết bát cơm và rất quấn quýt..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                  required
                />
              </div>

              {/* Mood & Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tâm Trạng Của Bé
                  </label>
                  <select
                    value={careLogForm.mood}
                    onChange={(e: any) => setCareLogForm({ ...careLogForm, mood: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-white"
                  >
                    <option value="Vui vẻ & Tăng động">Vui vẻ & Tăng động</option>
                    <option value="Ngoan ngoãn & Thư giãn">Ngoan ngoãn & Thư giãn</option>
                    <option value="Hơi nhút nhát">Hơi nhút nhát</option>
                    <option value="Khỏe mạnh">Khỏe mạnh</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cân Nặng Hiện Tại (kg)
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
                  Tình Hình Sức Khỏe & Thể Trạng
                </label>
                <input
                  type="text"
                  value={careLogForm.healthUpdate}
                  onChange={(e) => setCareLogForm({ ...careLogForm, healthUpdate: e.target.value })}
                  placeholder="Lông mượt, mắt sáng, ăn uống điều độ..."
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
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingLog}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors shadow-md flex items-center gap-2"
                >
                  {submittingLog ? (
                    <span>Đang lưu...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Đăng Nhật Ký</span>
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
