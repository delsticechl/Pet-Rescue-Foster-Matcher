import React from 'react';
import { Heart, ShieldCheck, Home, Activity, CheckCircle, Clock } from 'lucide-react';
import { Pet } from '../types';

interface PetCardProps {
  pet: Pet;
  onViewDetails: (pet: Pet) => void;
  onApply: (pet: Pet, type: 'Adopt' | 'Foster') => void;
}

export const PetCard: React.FC<PetCardProps> = ({ pet, onViewDetails, onApply }) => {
  const primaryImg =
    pet.imageUrl ||
    pet.primaryImage ||
    (pet.images && pet.images[0]?.imageUrl) ||
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80';

  const formatAge = (months: number) => {
    if (months < 12) return `${months} tháng`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years}t ${rem}th` : `${years} tuổi`;
  };

  const isAdopted = pet.adoptionStatus === 'Adopted';

  return (
    <div
      id={`pet-card-${pet.petId}`}
      className="group bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
    >
      <div>
        {/* Image Container */}
        <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
          <img
            src={primaryImg}
            alt={pet.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

          {/* Top Status Badge */}
          <div className="absolute top-3 left-3">
            {isAdopted ? (
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-600 text-white shadow-md flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Đã có chủ
              </span>
            ) : pet.adoptionStatus === 'Pending' ? (
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500 text-white shadow-md flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Đang xét duyệt
              </span>
            ) : (
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-sky-500 text-white shadow-md">
                Sẵn sàng nhận nuôi
              </span>
            )}
          </div>

          {/* Bottom Info on Image */}
          <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-black text-white drop-shadow-md">{pet.name}</h3>
              <span className="text-xs font-semibold bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg">
                {pet.gender} • {formatAge(pet.ageMonths)}
              </span>
            </div>
            <p className="text-xs text-slate-200 line-clamp-1 mt-0.5 drop-shadow-xs font-medium">
              {pet.species} • {pet.breed}
            </p>
          </div>
        </div>

        {/* Traits & Description */}
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {pet.vaccinated && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3" /> Đã tiêm
              </span>
            )}
            {pet.sterilized && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                Triệt sản
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
              {pet.requiresYard ? 'Cần sân rộng' : 'Chung cư OK'}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {pet.description || 'Bé đang có mặt tại trạm cứu hộ, rất mong được đón về mái ấm mới.'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 pt-0 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onViewDetails(pet)}
          className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          Hồ sơ & Y tế
        </button>
        <button
          type="button"
          disabled={isAdopted}
          onClick={() => onApply(pet, 'Adopt')}
          className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            isAdopted
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white shadow-md shadow-sky-500/20'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          {isAdopted ? 'Đã có chủ' : 'Nhận Nuôi'}
        </button>
      </div>
    </div>
  );
};
