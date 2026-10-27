import React, { useState } from 'react';
import { Sparkles, Heart, Search, CheckCircle, Home, Baby, Dog, Cat, Zap, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { Pet, AiMatchResult } from '../types';
import { api } from '../services/api';
import { PetCard } from './PetCard';

interface SmartMatchmakerProps {
  onViewDetails: (pet: Pet) => void;
  onApply: (pet: Pet, type: 'Adopt' | 'Foster') => void;
}

const QUICK_TAGS = [
  'Small apartment',
  'Kids under 6 at home',
  'Already have pets',
  'Busy work schedule',
  'First-time pet owner',
  'Enjoys outdoor walks',
  'Prefers calm and gentle',
  'Spacious yard available',
];

export const SmartMatchmaker: React.FC<SmartMatchmakerProps> = ({ onViewDetails, onApply }) => {
  const [description, setDescription] = useState(
    'I live in an apartment, work office hours, and want a well-behaved, loving companion.'
  );
  const [speciesPreference, setSpeciesPreference] = useState<'All' | 'Dog' | 'Cat'>('All');
  const [livingSpace, setLivingSpace] = useState<'Apartment' | 'HouseWithYard' | 'Rented'>('Apartment');
  const [familyWithKids, setFamilyWithKids] = useState(false);
  const [hasOtherPets, setHasOtherPets] = useState(false);

  const [loading, setLoading] = useState(false);
  const [matchedResults, setMatchedResults] = useState<AiMatchResult[] | null>(null);
  const [poweredBy, setPoweredBy] = useState<string>('');

  const toggleTag = (tag: string) => {
    if (description.includes(tag)) {
      setDescription(description.replace(tag, '').replace(/,\s*,/g, ',').trim());
    } else {
      setDescription((prev) => (prev ? `${prev}, ${tag}` : tag));
    }
  };

  const handleRunAiMatching = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!description.trim() && speciesPreference === 'All') return;

    setLoading(true);
    try {
      const res = await api.matchPets({
        lifestyleDescription: description,
        speciesPreference,
        livingSpace,
        familyWithKids,
        hasOtherPets,
      });
      setMatchedResults(res.matches || []);
      setPoweredBy(res.poweredBy || 'AI Match Engine');
    } catch (err) {
      console.error('Matching error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-2xl relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 border border-white/25 text-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> AI Pet Matchmaker • Smart Companion Finder
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Match the Perfect Companion for Your Lifestyle
          </h1>
          <p className="text-xs sm:text-sm text-sky-100 leading-relaxed">
            Instead of manual filters, share your lifestyle, routine, and living environment.
            Our AI matches the personality and needs of shelter pets to find your ideal four-legged friend.
          </p>
        </div>
      </div>

      {/* Main Matching Control */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <form onSubmit={handleRunAiMatching} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
              1. Describe your home, family, and daily routine:
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. I live in an apartment, work from 9 to 5, looking for a calm cat or dog who loves cuddles..."
              className="w-full p-3.5 text-xs rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
            />

            {/* Quick tags */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 self-center mr-1">Quick suggestions:</span>
              {QUICK_TAGS.map((tag) => {
                const isSelected = description.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-medium transition-all ${
                      isSelected
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    + {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Species preference:
              </label>
              <select
                value={speciesPreference}
                onChange={(e) => setSpeciesPreference(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
              >
                <option value="All">All (Dogs & Cats)</option>
                <option value="Dog">Dogs</option>
                <option value="Cat">Cats</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Living space:
              </label>
              <select
                value={livingSpace}
                onChange={(e) => setLivingSpace(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
              >
                <option value="Apartment">Apartment / Condo</option>
                <option value="HouseWithYard">House with Yard</option>
                <option value="Rented">Rented House / Studio</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={familyWithKids}
                  onChange={(e) => setFamilyWithKids(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Family with young kids</span>
              </label>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={hasOtherPets}
                  onChange={(e) => setHasOtherPets(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Already have other pets</span>
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-black text-xs shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing & matching with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Find Matches with AI
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* MATCHED RESULTS SECTION */}
      {matchedResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Best Match Results ({matchedResults.length} pets)
            </h2>
            {poweredBy && (
              <span className="text-[11px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                Powered by: {poweredBy}
              </span>
            )}
          </div>

          {matchedResults.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-xs text-slate-400 space-y-2">
              <Dog className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-bold text-slate-600 dark:text-slate-300">No pets matched these criteria yet.</p>
              <p>Try broadening your description or adjusting preference criteria!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matchedResults.map((item) => {
                const pet = item.pet;
                if (!pet) return null;

                return (
                  <div
                    key={item.petId}
                    className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col group"
                  >
                    <div className="relative aspect-4/3 bg-slate-100 dark:bg-slate-900 overflow-hidden">
                      <img
                        src={pet.imageUrl || pet.primaryImage || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80'}
                        alt={pet.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Compatibility badge */}
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-xl bg-emerald-500 text-white text-xs font-black shadow-md flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> {item.score}% Match
                      </div>
                      <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-xl bg-slate-900/75 backdrop-blur-md text-white text-xs font-bold">
                        {pet.species} • {pet.breed}
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-slate-800 dark:text-white">{pet.name}</h3>
                          <span className="text-xs text-slate-400">{pet.gender}</span>
                        </div>

                        {/* AI Match Explanation */}
                        <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/60 text-xs text-sky-900 dark:text-sky-200 leading-relaxed">
                          <span className="font-bold block text-[11px] text-sky-700 dark:text-sky-300 mb-0.5">
                            💡 Match reason:
                          </span>
                          {item.reason}
                        </div>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => onViewDetails(pet)}
                          className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition-colors"
                        >
                          View Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => onApply(pet, 'Adopt')}
                          className="flex-1 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-1"
                        >
                          <Heart className="w-3.5 h-3.5 fill-current" /> Adopt
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
