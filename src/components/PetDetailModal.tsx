import React, { useState } from 'react';
import {
  X,
  Heart,
  Home,
  MapPin,
  Calendar,
  Stethoscope,
  Info,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { Pet } from '../types';

interface PetDetailModalProps {
  pet: Pet | null;
  onClose: () => void;
  onApply: (pet: Pet, type: 'Adopt' | 'Foster') => void;
  onViewCareLog?: (pet: Pet) => void;
}

export const PetDetailModal: React.FC<PetDetailModalProps> = ({
  pet,
  onClose,
  onApply,
  onViewCareLog,
}) => {
  if (!pet) return null;

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'info' | 'medical'>('info');

  const images = pet.images && pet.images.length > 0 ? pet.images : [
    {
      imageId: 'img-1',
      petId: pet.petId,
      imageUrl: pet.imageUrl || pet.primaryImage || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
      isPrimary: true,
    },
  ];

  const formatAge = (months: number) => {
    if (months < 12) return `${months} tháng tuổi`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years} tuổi ${rem} tháng` : `${years} tuổi`;
  };

  const isAdopted = pet.adoptionStatus === 'Adopted';
  const medicalRecords = pet.medicalRecords || pet.medicalHistory || [];

  return (
    <div
      id="pet-detail-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div
        id="pet-detail-modal-container"
        className="relative bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              {pet.name}
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                Mã: {pet.petId}
              </span>
            </h2>

            {isAdopted && (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã Được Nhận Nuôi
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Visuals & Basic Badges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left: Image Gallery */}
            <div className="space-y-3">
              <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
                <img
                  src={images[selectedImageIndex]?.imageUrl || pet.imageUrl}
                  alt={pet.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-slate-900/70 backdrop-blur-md text-white text-xs font-bold">
                  {pet.species} • {pet.breed}
                </div>
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={img.imageId || idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        selectedImageIndex === idx ? 'border-sky-500 scale-95 ring-2 ring-sky-500/20' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Quick Highlights */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Độ tuổi</span>
                    <strong className="text-slate-800 dark:text-slate-200">{formatAge(pet.ageMonths)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Giới tính</span>
                    <strong className="text-slate-800 dark:text-slate-200">{pet.gender}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Mức năng lượng</span>
                    <strong className="text-slate-800 dark:text-slate-200">{pet.energyLevel}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Tình trạng sức khỏe</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{pet.healthStatus}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap gap-2 text-xs">
                  <span className={`px-2.5 py-1 rounded-xl font-medium ${pet.vaccinated ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500'}`}>
                    {pet.vaccinated ? '✓ Đã tiêm phòng' : 'Chưa tiêm phòng'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-xl font-medium ${pet.sterilized ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500'}`}>
                    {pet.sterilized ? '✓ Đã triệt sản' : 'Chưa triệt sản'}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-medium">
                    {pet.requiresYard ? 'Cần sân vườn rộng' : 'Thích hợp căn hộ'}
                  </span>
                </div>
              </div>

              {isAdopted ? (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2 text-xs text-amber-800 dark:text-amber-200">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Bé đã tìm được gia đình trọn đời!
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Hồ sơ y tế tại trạm đã được đóng băng. Bạn có thể theo dõi cuộc sống thường nhật của bé qua mục <strong>Care Log</strong> của chủ nuôi.
                  </p>
                  {onViewCareLog && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onViewCareLog(pet);
                      }}
                      className="mt-1 w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> Xem Nhật Ký Chăm Sóc (Care Log)
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onApply(pet, 'Adopt')}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-extrabold text-xs shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <Heart className="w-4 h-4 fill-current text-rose-300" />
                  Nộp Đơn Nhận Nuôi {pet.name}
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs (Overview & Medical History Only) */}
          <div className="border-b border-slate-200 dark:border-slate-700 flex gap-4">
            <button
              onClick={() => setActiveTab('info')}
              className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'info'
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Info className="w-4 h-4" /> Tổng Quan & Tính Cách
            </button>
            <button
              onClick={() => setActiveTab('medical')}
              className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'medical'
                  ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Stethoscope className="w-4 h-4" /> Lịch Sử Khám Chữa Bệnh ({medicalRecords.length})
            </button>
          </div>

          {/* TAB 1: OVERVIEW & TRAITS */}
          {activeTab === 'info' && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1.5">Mô tả về bé:</h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {pet.description || 'Chưa có thông tin mô tả chi tiết.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Thân thiện với trẻ em</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {pet.goodWithKids ? 'Rất thân thiện & hiền lành' : 'Cần người lớn giám sát'}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Hòa đồng thú cưng khác</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {pet.goodWithPets ? 'Rất hòa đồng' : 'Thích ở một mình hơn'}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Yêu cầu không gian</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {pet.requiresYard ? 'Cần nhà có sân vườn' : 'Căn hộ chung cư đều được'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEDICAL HISTORY */}
          {activeTab === 'medical' && (
            <div className="space-y-3">
              {medicalRecords.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                  <Stethoscope className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Bé chưa có lịch sử bệnh án ghi nhận hoặc thể trạng hoàn toàn khỏe mạnh khi tiếp nhận.
                </div>
              ) : (
                <div className="space-y-3">
                  {medicalRecords.map((med) => (
                    <div
                      key={med.recordId}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-sky-500" />
                          Chẩn đoán: {med.diagnosis}
                        </span>
                        <span className="text-[11px] text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          {med.medicalDate}
                        </span>
                      </div>

                      <div className="text-slate-600 dark:text-slate-300">
                        <strong>Phác đồ / Điều trị:</strong> {med.treatment}
                      </div>

                      {med.medications && (
                        <div className="text-slate-600 dark:text-slate-300">
                          <strong>Thuốc đã dùng:</strong> {med.medications}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                        Bác sĩ phụ trách: <span className="font-medium text-slate-600 dark:text-slate-300">{med.vetName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
