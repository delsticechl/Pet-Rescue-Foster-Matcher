import React, { useState } from 'react';
import {
  X,
  Heart,
  Home,
  CheckCircle,
  AlertTriangle,
  User,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Pet, User as UserType, HousingType, ApplicationType } from '../types';
import { api } from '../services/api';

interface AdoptionApplicationModalProps {
  pet: Pet | null;
  currentUser: UserType;
  type: ApplicationType;
  onClose: () => void;
  onSuccess: () => void;
}

// Helper: Trigger celebratory multi-burst confetti effect
const triggerCelebrationConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#0284c7', '#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
    zIndex: 9999,
  });

  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ['#0284c7', '#38bdf8', '#10b981', '#fbbf24'],
      zIndex: 9999,
    });
  }, 200);

  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ['#ec4899', '#8b5cf6', '#38bdf8', '#10b981'],
      zIndex: 9999,
    });
  }, 400);

  setTimeout(() => {
    confetti({
      particleCount: 40,
      spread: 100,
      decay: 0.91,
      scalar: 1.2,
      origin: { y: 0.5 },
      shapes: ['circle'],
      colors: ['#ffd700', '#ff69b4', '#00e5ff', '#76ff03'],
      zIndex: 9999,
    });
  }, 600);
};

export const AdoptionApplicationModal: React.FC<AdoptionApplicationModalProps> = ({
  pet,
  currentUser,
  type,
  onClose,
  onSuccess,
}) => {
  if (!pet) return null;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successAppId, setSuccessAppId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    housingType: 'Single Family House' as HousingType,
    hasYard: false,
    hasBalconyNet: true,
    incomeMonthly: '$1,500 - $2,500 / month',
    otherPets: 'None currently',
    experienceDescription: 'Researched breed-specific nutrition, safe enrichment, and scheduled veterinary checkups.',
    familyAgreement: true,
    commitmentLifelong: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const newApp = await api.createApplication({
        petId: pet.petId,
        userId: currentUser.userId,
        type,
        housingType: formData.housingType,
        hasYard: formData.hasYard,
        experienceDescription: formData.experienceDescription,
        incomeMonthly: formData.incomeMonthly,
        otherPets: formData.otherPets,
      });

      setSuccessAppId(newApp.applicationId);
      triggerCelebrationConfetti();
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error submitting adoption application.');
    } finally {
      setLoading(false);
    }
  };

  const displaySpecies = pet.species === 'Chó' ? 'Dog' : pet.species === 'Mèo' ? 'Cat' : pet.species;

  return (
    <div
      id="adoption-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div
        id="adoption-modal-container"
        className="relative bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">
                {type === 'Adopt' ? 'Adoption Application Form' : 'Foster Care Application Form'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Applicant for: <strong className="text-sky-600 dark:text-sky-400">{pet.name}</strong> ({displaySpecies} • {pet.breed})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        {!successAppId && (
          <div className="px-6 py-3 bg-sky-50/50 dark:bg-sky-950/20 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${step >= 1 ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
              <span className={step === 1 ? 'font-bold text-sky-700 dark:text-sky-300' : 'text-slate-500'}>Applicant & Household</span>
            </div>
            <div className="w-8 h-px bg-slate-300 dark:bg-slate-600" />
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${step >= 2 ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
              <span className={step === 2 ? 'font-bold text-sky-700 dark:text-sky-300' : 'text-slate-500'}>Living Environment</span>
            </div>
            <div className="w-8 h-px bg-slate-300 dark:bg-slate-600" />
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${step >= 3 ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span>
              <span className={step === 3 ? 'font-bold text-sky-700 dark:text-sky-300' : 'text-slate-500'}>Commitment & Submit</span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6">
          {/* Error Banner / Trigger Violation Alert */}
          {errorMessage && (
            <div className="mb-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <strong className="block font-bold">Integrity Constraint (SQL Trigger Warning):</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Success State */}
          {successAppId ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Application Submitted!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Your reference ID is <strong className="text-sky-600 dark:text-sky-400 font-bold">#{successAppId}</strong>.
                  The rescue shelter team has received your application and will review your profile shortly.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-1.5 max-w-md mx-auto">
                <div className="text-slate-400 font-semibold uppercase text-[10px]">Submission Summary:</div>
                <div><strong>Applicant:</strong> {currentUser.fullName} ({currentUser.email})</div>
                <div><strong>Pet:</strong> {pet.name} (ID: {pet.petId})</div>
                <div><strong>Program:</strong> {type === 'Adopt' ? 'Permanent Adoption' : 'Temporary Foster Care'}</div>
                <div><strong>Status:</strong> <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">Submitted (In Review)</span></div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={triggerCelebrationConfetti}
                  className="px-4 py-2.5 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-sky-500 animate-pulse" />
                  <span>Confetti 🎉</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-md transition-colors"
                >
                  Done & Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* STEP 1 */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                    <img
                      src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-sky-500/20"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{currentUser?.fullName || 'User'}</div>
                      <div className="text-slate-500 dark:text-slate-400">{currentUser?.email || ''} • {currentUser?.phone || ''}</div>
                      <div className="text-slate-500 dark:text-slate-400">{currentUser?.address || ''}</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Monthly Household Income Bracket:
                    </label>
                    <select
                      value={formData.incomeMonthly}
                      onChange={(e) => setFormData({ ...formData, incomeMonthly: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    >
                      <option value="Under $1,000 / month">Under $1,000 / month</option>
                      <option value="$1,000 - $2,000 / month">$1,000 - $2,000 / month</option>
                      <option value="$2,000 - $3,500 / month">$2,000 - $3,500 / month</option>
                      <option value="Above $3,500 / month">Above $3,500 / month</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Other pets currently living in your household (if any):
                    </label>
                    <input
                      type="text"
                      value={formData.otherPets}
                      onChange={(e) => setFormData({ ...formData, otherPets: e.target.value })}
                      placeholder="e.g., 1 neutered cat (2 yrs old), or None currently"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Current Housing Type:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Single Family House', val: 'Single Family House' },
                        { label: 'Apartment / Condo', val: 'Apartment / Condo' },
                        { label: 'Rented House', val: 'Rented House' },
                        { label: 'Townhouse / Villa', val: 'Townhouse / Villa' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setFormData({ ...formData, housingType: item.val as HousingType })}
                          className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                            formData.housingType === item.val
                              ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <Home className="w-4 h-4 mb-1 text-sky-500" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasYard}
                        onChange={(e) => setFormData({ ...formData, hasYard: e.target.checked })}
                        className="rounded text-sky-600 focus:ring-sky-500"
                      />
                      <span>Home has an enclosed yard, garden, or secure terrace</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasBalconyNet}
                        onChange={(e) => setFormData({ ...formData, hasBalconyNet: e.target.checked })}
                        className="rounded text-sky-600 focus:ring-sky-500"
                      />
                      <span>Windows and balconies have pet safety nets installed</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Pet Care Experience & Daily Routine Plan:
                    </label>
                    <textarea
                      rows={3}
                      value={formData.experienceDescription}
                      onChange={(e) => setFormData({ ...formData, experienceDescription: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4" /> Humane Adoption Commitments:
                    </div>
                    <ul className="text-xs text-amber-700 dark:text-amber-300/90 list-disc list-inside space-y-1">
                      <li>Never abandon, resell, or transfer the animal to an unauthorized third party.</li>
                      <li>Provide regular veterinary care, vaccinations, and prompt medical attention.</li>
                      <li>Submit periodic post-adoption Care Logs to the rescue network.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-start gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.familyAgreement}
                        onChange={(e) => setFormData({ ...formData, familyAgreement: e.target.checked })}
                        className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                        required
                      />
                      <span>All household members and roommates agree to welcoming {pet.name}.</span>
                    </label>

                    <label className="flex items-start gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.commitmentLifelong}
                        onChange={(e) => setFormData({ ...formData, commitmentLifelong: e.target.checked })}
                        className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                        required
                      />
                      <span>I commit to providing lifelong care and responsibility for this pet (10-15 years).</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                ) : (
                  <div />
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                  >
                    Next Step <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading || !formData.familyAgreement || !formData.commitmentLifelong}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50 transition-all"
                  >
                    {loading ? (
                      <>Processing SQL Transaction...</>
                    ) : (
                      <>
                        <FileCheck className="w-4 h-4" /> Confirm & Submit Application
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
