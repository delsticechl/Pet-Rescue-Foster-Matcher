import React, { useState } from 'react';
import { Sparkles, Code2, Heart, Search, CheckCircle, Home, Baby, Dog, Cat, Zap, ShieldCheck } from 'lucide-react';
import { MatchCriteria, Pet, HousingType, PetSpecies, EnergyLevel } from '../types';
import { api } from '../services/api';
import { PetCard } from './PetCard';

interface SmartMatchmakerProps {
  onViewDetails: (pet: Pet) => void;
  onApply: (pet: Pet, type: 'Adopt' | 'Foster') => void;
  onShowQrCode?: (pet: Pet) => void;
}

export const SmartMatchmaker: React.FC<SmartMatchmakerProps> = ({ onViewDetails, onApply, onShowQrCode }) => {
  const [criteria, setCriteria] = useState<MatchCriteria>({
    species: 'all' as any,
    housingType: 'Apartment / Condo',
    hasYard: false,
    hasChildren: true,
    hasOtherPets: false,
    experienceLevel: 'Cơ bản',
    timeCommitmentHoursPerDay: 2,
    activityPreference: 'Medium',
  });

  const [loading, setLoading] = useState(false);
  const [matchedResults, setMatchedResults] = useState<Pet[] | null>(null);
  const [showSqlCode, setShowSqlCode] = useState(false);
  const [sqlProcedureCode, setSqlProcedureCode] = useState<string>('');

  const handleRunAlgorithm = async () => {
    setLoading(true);
    try {
      const res = await api.runMatchingProcedure(criteria);
      setMatchedResults(res.matchedPets);
      setSqlProcedureCode(res.sqlCode);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-indigo-900 via-sky-900 to-slate-900 text-white relative overflow-hidden shadow-xl border border-sky-500/20">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-2xl relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 border border-sky-400/30 text-sky-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Stored Procedure Algorithm & AI Matchmaker
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Find Your Ideal Four-Legged Companion
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Powered by MySQL Stored Procedures calculating a multi-dimensional Compatibility Score (%)
            between your lifestyle requirements and each rescued pet's behavioral traits.
          </p>
        </div>
      </div>

      {/* Main Grid: Questionnaire & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Questionnaire (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Search className="w-4 h-4 text-sky-500" /> Match Criteria
              </h2>
              <button
                onClick={() => setShowSqlCode(!showSqlCode)}
                className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1"
              >
                <Code2 className="w-3.5 h-3.5" /> {showSqlCode ? 'Hide SQL' : 'View SQL'}
              </button>
            </div>

            {/* 1. Species */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                1. Desired Species:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'All Pets', val: 'all' },
                  { label: 'Dogs', val: 'Dog' },
                  { label: 'Cats', val: 'Cat' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setCriteria({ ...criteria, species: item.val as any })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      criteria.species === item.val
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Housing Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                2. Housing Type:
              </label>
              <select
                value={criteria.housingType}
                onChange={(e) => setCriteria({ ...criteria, housingType: e.target.value as HousingType })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="Apartment / Condo">Apartment / Flat</option>
                <option value="Single Family House">Single Family Home</option>
                <option value="Rented House">Rented House / Shared Space</option>
                <option value="Townhouse / Villa">Townhouse with Yard</option>
              </select>
            </div>

            {/* 3. Toggles: Yard, Kids, Pets */}
            <div className="space-y-3 pt-1">
              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 cursor-pointer">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Home className="w-3.5 h-3.5 text-sky-500" /> Enclosed Yard or Garden
                </span>
                <input
                  type="checkbox"
                  checked={criteria.hasYard}
                  onChange={(e) => setCriteria({ ...criteria, hasYard: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 cursor-pointer">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Baby className="w-3.5 h-3.5 text-indigo-500" /> Young Children in Home (&lt; 10 yrs)
                </span>
                <input
                  type="checkbox"
                  checked={criteria.hasChildren}
                  onChange={(e) => setCriteria({ ...criteria, hasChildren: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 cursor-pointer">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Dog className="w-3.5 h-3.5 text-amber-500" /> Other Household Pets
                </span>
                <input
                  type="checkbox"
                  checked={criteria.hasOtherPets}
                  onChange={(e) => setCriteria({ ...criteria, hasOtherPets: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
              </label>
            </div>

            {/* 4. Energy Level Preference */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                4. Preferred Energy Level:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Low', val: 'Low' },
                  { label: 'Medium', val: 'Medium' },
                  { label: 'High', val: 'High' },
                ].map((eng) => (
                  <button
                    key={eng.val}
                    type="button"
                    onClick={() => setCriteria({ ...criteria, activityPreference: eng.val as any })}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition-all ${
                      criteria.activityPreference === eng.val
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {eng.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Run Button */}
            <button
              id="btn-run-stored-procedure"
              type="button"
              onClick={handleRunAlgorithm}
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Sparkles className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-300" />
              )}
              {loading ? 'Executing Stored Procedure...' : 'Find Matches (Stored Procedure)'}
            </button>
          </div>
        </div>

        {/* Right Column: Matched Pets Display (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* SQL Procedure Code Viewer Accordion */}
          {showSqlCode && (
            <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 border border-slate-700 font-mono text-xs shadow-lg space-y-2">
              <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                <span className="text-[11px] font-bold text-sky-400 uppercase">
                  Database Routine: sp_MatchPetsForAdopter
                </span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                  SQL Stored Procedure
                </span>
              </div>
              <pre className="overflow-x-auto text-[11px] text-slate-200 leading-relaxed max-h-60 scrollbar-thin">
                {sqlProcedureCode || `
CREATE PROCEDURE sp_MatchPetsForAdopter(
    IN p_HousingType VARCHAR(50),
    IN p_HasYard BOOLEAN,
    IN p_HasChildren BOOLEAN,
    IN p_HasOtherPets BOOLEAN,
    IN p_Species VARCHAR(20),
    IN p_ActivityPreference VARCHAR(20)
)
BEGIN
    SELECT 
        p.PetID, p.Name, p.Species, p.Breed, p.AgeMonths, p.Gender,
        p.RequiresYard, p.GoodWithKids, p.GoodWithPets, p.EnergyLevel,
        s.ShelterName,
        -- Weighted Compatibility Score Algorithm (%)
        (50 
         + (CASE WHEN p.Species = p_Species THEN 20 ELSE -30 END)
         + (CASE WHEN p.RequiresYard = TRUE AND p_HasYard = TRUE THEN 15 
                 WHEN p.RequiresYard = TRUE AND p_HasYard = FALSE THEN -25 
                 ELSE 10 END)
         + (CASE WHEN p_HasChildren = TRUE AND p.GoodWithKids = TRUE THEN 15 
                 WHEN p_HasChildren = TRUE AND p.GoodWithKids = FALSE THEN -20 
                 ELSE 0 END)
         + (CASE WHEN p_HasOtherPets = TRUE AND p.GoodWithPets = TRUE THEN 10 
                 WHEN p_HasOtherPets = TRUE AND p.GoodWithPets = FALSE THEN -15 
                 ELSE 0 END)
        ) AS MatchingScore
    FROM PETS p
    JOIN SHELTERS s ON p.ShelterID = s.ShelterID
    WHERE p.AdoptionStatus = 'Ready'
    ORDER BY MatchingScore DESC;
END;
                `}
              </pre>
            </div>
          )}

          {/* Results Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Matching Recommendations
                {matchedResults && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                    {matchedResults.length} matches found
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">Ranked by Compatibility Score (%) descending</p>
            </div>

            {matchedResults === null ? (
              <div className="text-center py-16 px-4 bg-white dark:bg-slate-800/60 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 mx-auto flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                  Select your criteria and click "Find Matches"
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  The algorithm evaluates all rescued animals currently ready for adoption across network shelters.
                </p>
              </div>
            ) : matchedResults.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500">No pets matched these specific constraints. Try broadening your criteria!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {matchedResults.map((pet) => (
                  <PetCard
                    key={pet.petId}
                    pet={pet}
                    onViewDetails={onViewDetails}
                    onApply={onApply}
                    onShowQrCode={onShowQrCode}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
