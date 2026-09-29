import React from 'react';
import { Heart, ShieldCheck, Home, Sparkles, MapPin, Activity, CheckCircle, Clock, QrCode } from 'lucide-react';
import { Pet } from '../types';

interface PetCardProps {
  pet: Pet;
  onViewDetails: (pet: Pet) => void;
  onApply: (pet: Pet, type: 'Adopt' | 'Foster') => void;
  onShowQrCode?: (pet: Pet) => void;
}

export const PetCard: React.FC<PetCardProps> = ({ pet, onViewDetails, onApply, onShowQrCode }) => {
  const primaryImg = pet.images?.find((img) => img.isPrimary) || pet.images?.[0] || {
    imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
  };

  const formatAge = (months: number) => {
    if (months < 12) return `${months} mos`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years}y ${rem}m` : `${years} yrs`;
  };

  const getStatusBadge = () => {
    switch (pet.adoptionStatus) {
      case 'Ready':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/90 text-white backdrop-blur-md shadow-xs flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Ready for Adoption
          </span>
        );
      case 'Fostered':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/90 text-white backdrop-blur-md shadow-xs flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> In Foster Care
          </span>
        );
      case 'Adopted':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700/90 text-white backdrop-blur-md shadow-xs flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 fill-current text-rose-400" /> Adopted
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/90 text-white backdrop-blur-md shadow-xs">
            {pet.adoptionStatus}
          </span>
        );
    }
  };

  const displaySpecies = pet.species === 'Chó' ? 'Dog' : pet.species === 'Mèo' ? 'Cat' : pet.species;
  const displayGender = pet.gender === 'Đực' || pet.gender === 'Male' ? '♂ Male' : '♀ Female';
  const displayEnergy = pet.energyLevel === 'Cao' || pet.energyLevel === 'High' ? 'High' : pet.energyLevel === 'Thấp' || pet.energyLevel === 'Low' ? 'Low' : 'Medium';

  return (
    <div
      id={`pet-card-${pet.petId}`}
      className="group bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
        <img
          src={primaryImg.imageUrl}
          alt={pet.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        {/* Top Badges & QR Code Trigger */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 pointer-events-auto">{getStatusBadge()}</div>
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {pet.matchScore !== undefined && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-md flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" /> {pet.matchScore}% Match
              </span>
            )}
            {onShowQrCode && (
              <button
                id={`btn-qr-${pet.petId}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowQrCode(pet);
                }}
                title={`Adoption QR Code for ${pet.name}`}
                className="p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md shadow-md hover:scale-110 transition-all cursor-pointer border border-white/20"
              >
                <QrCode className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Overlay Info */}
        <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl font-bold text-white drop-shadow-md">{pet.name}</h3>
            <span className="text-xs font-medium bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md">
              {displayGender} • {formatAge(pet.ageMonths)}
            </span>
          </div>
          <p className="text-xs text-slate-200 line-clamp-1 mt-0.5 drop-shadow-xs font-medium">
            {displaySpecies} • {pet.breed}
          </p>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Key Traits Chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {pet.vaccinated && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3" /> Vaccinated
              </span>
            )}
            {pet.sterilized && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                Neutered
              </span>
            )}
            {pet.requiresYard ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Home className="w-3 h-3" /> Needs Yard
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Apartment OK
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
              <Activity className="w-3 h-3" /> Energy: {displayEnergy}
            </span>
          </div>

          {/* Description Excerpt */}
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-3 leading-relaxed">
            {pet.description}
          </p>

          {/* Match reasons if present */}
          {pet.matchReasons && pet.matchReasons.length > 0 && (
            <div className="mb-3 p-2 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
              <p className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-1 mb-1">
                <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Compatibility Highlights:
              </p>
              <ul className="text-[10px] text-indigo-700 dark:text-indigo-300/90 list-disc list-inside space-y-0.5">
                {pet.matchReasons.slice(0, 2).map((reason, idx) => (
                  <li key={idx} className="line-clamp-1">
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Shelter Location Tag */}
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
            <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span className="truncate">{pet.shelterName || 'PawFund Rescue Center'}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <button
            id={`btn-view-detail-${pet.petId}`}
            onClick={() => onViewDetails(pet)}
            className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Profile & Health
          </button>
          <button
            id={`btn-adopt-${pet.petId}`}
            disabled={pet.adoptionStatus === 'Adopted'}
            onClick={() => onApply(pet, 'Adopt')}
            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
              pet.adoptionStatus === 'Adopted'
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white shadow-xs hover:shadow-md'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            {pet.adoptionStatus === 'Adopted' ? 'Adopted' : 'Adopt Me'}
          </button>
        </div>
      </div>
    </div>
  );
};
