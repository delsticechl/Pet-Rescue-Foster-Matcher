import React, { useState } from 'react';
import {
  X,
  Heart,
  ShieldCheck,
  Home,
  Activity,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  Send,
  Stethoscope,
  Info,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Bell,
  AlertTriangle,
  Syringe,
  QrCode,
} from 'lucide-react';
import { Pet } from '../types';
import { api } from '../services/api';

interface PetDetailModalProps {
  pet: Pet | null;
  onClose: () => void;
  onApply: (pet: Pet, type: 'Adopt' | 'Foster') => void;
  onOpenHealthReminders?: () => void;
  onOpenQrCode?: (pet: Pet) => void;
}

export const PetDetailModal: React.FC<PetDetailModalProps> = ({
  pet,
  onClose,
  onApply,
  onOpenHealthReminders,
  onOpenQrCode,
}) => {
  if (!pet) return null;

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'info' | 'medical' | 'ai'>('info');

  // Compute Upcoming Health Reminders for this Pet
  const baseDate = new Date('2026-08-14');
  baseDate.setHours(0, 0, 0, 0);

  const upcomingFollowUps = (pet.medicalRecords || [])
    .filter((r) => r.nextFollowUp && r.reminderStatus !== 'Completed')
    .map((record) => {
      const dueDate = new Date(record.nextFollowUp!);
      dueDate.setHours(0, 0, 0, 0);
      const diff = Math.round((dueDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...record,
        daysRemaining: diff,
        isOverdue: diff < 0,
        isToday: diff === 0,
        isUrgent: diff > 0 && diff <= 7,
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const urgentReminder = upcomingFollowUps[0];

  // AI Assistant Chat State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: `Hello! I am your AI Pet Rescue Care Advisor. What would you like to know about ${pet.name}'s personality, diet, daily routine, or transition into your home?`,
    },
  ]);

  const images = pet.images && pet.images.length > 0 ? pet.images : [
    { imageId: '1', petId: pet.petId, imageUrl: pet.primaryImage || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80', isPrimary: true }
  ];

  const handleSendAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || aiLoading) return;

    const userText = aiPrompt.trim();
    setAiMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setAiPrompt('');
    setAiLoading(true);

    try {
      const res = await api.askAiAssistant(userText, pet.petId);
      setAiMessages((prev) => [...prev, { role: 'assistant', text: res.answer }]);
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Could not connect to the AI advisor right now. Please reach out directly to the shelter team!' },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const formatAge = (months: number) => {
    if (months < 12) return `${months} months old`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years}y ${rem}m old` : `${years} years old`;
  };

  const displaySpecies = pet.species === 'Chó' ? 'Dog' : pet.species === 'Mèo' ? 'Cat' : pet.species;
  const displayGender = pet.gender === 'Đực' || pet.gender === 'Male' ? '♂ Male' : '♀ Female';
  const displayHealth = pet.healthStatus === 'Bình thường' ? 'Healthy' : pet.healthStatus;
  const displayEnergy = pet.energyLevel === 'Cao' || pet.energyLevel === 'High' ? 'High' : pet.energyLevel === 'Thấp' || pet.energyLevel === 'Low' ? 'Low' : 'Medium';

  return (
    <div
      id="pet-detail-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div
        id="pet-detail-modal-container"
        className="relative bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              {pet.name}
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                ID: {pet.petId}
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {onOpenQrCode && (
              <button
                id="btn-detail-modal-qr"
                onClick={() => onOpenQrCode(pet)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <QrCode className="w-4 h-4" />
                <span>QR Standee</span>
              </button>
            )}
            <button
              id="btn-close-pet-modal"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Grid: Gallery & Quick Facts */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Gallery Column (5 cols) */}
            <div className="md:col-span-5 space-y-3">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 relative">
                <img
                  src={images[selectedImageIndex]?.imageUrl || images[0]?.imageUrl}
                  alt={pet.name}
                  className="w-full h-full object-cover"
                />
                {images[selectedImageIndex]?.caption && (
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs text-white text-[11px] p-2 text-center">
                    {images[selectedImageIndex].caption}
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={img.imageId || idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                        selectedImageIndex === idx
                          ? 'border-sky-500 ring-2 ring-sky-500/20'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img.imageUrl} alt="thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Shelter Info Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Home className="w-3.5 h-3.5" /> Sheltered At
                </div>
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {pet.shelterName || 'PawFund Rescue Center'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span>Regional Rescue Network Hub</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span>Adoption Helpline: 0903 112 233</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Column (7 cols) */}
            <div className="md:col-span-7 space-y-5">
              {/* Health Reminder Alert Banner if approaching or overdue */}
              {urgentReminder && (
                <div
                  id="pet-detail-health-reminder-banner"
                  className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 text-xs ${
                    urgentReminder.isOverdue
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                      : urgentReminder.isToday
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                      : 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-xl bg-white dark:bg-slate-800 shrink-0 mt-0.5 shadow-xs">
                      {urgentReminder.isOverdue ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                      ) : (
                        <Bell className="w-4 h-4 text-sky-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>Upcoming Clinical Checkup: {urgentReminder.nextFollowUp}</span>
                        {urgentReminder.isOverdue ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-black">
                            Overdue by {Math.abs(urgentReminder.daysRemaining)} days
                          </span>
                        ) : urgentReminder.isToday ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-black">
                            Due Today
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-sky-500 text-white text-[10px] font-bold">
                            In {urgentReminder.daysRemaining} days
                          </span>
                        )}
                      </div>
                      <div className="opacity-90 mt-0.5">
                        <strong>Treatment:</strong> {urgentReminder.diagnosis} — {urgentReminder.treatment}
                      </div>
                    </div>
                  </div>

                  {onOpenHealthReminders && (
                    <button
                      onClick={onOpenHealthReminders}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-[11px] shrink-0 border border-current shadow-xs transition-colors"
                    >
                      View Calendar
                    </button>
                  )}
                </div>
              )}

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200 dark:border-slate-700 gap-4">
                <button
                  id="tab-pet-info"
                  onClick={() => setActiveTab('info')}
                  className={`pb-2.5 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
                    activeTab === 'info'
                      ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  <Info className="w-4 h-4" /> Overview & Traits
                </button>
                <button
                  id="tab-pet-medical"
                  onClick={() => setActiveTab('medical')}
                  className={`pb-2.5 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
                    activeTab === 'medical'
                      ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  <Stethoscope className="w-4 h-4" /> Medical History (
                  {pet.medicalRecords?.length || 0})
                </button>
                <button
                  id="tab-pet-ai"
                  onClick={() => setActiveTab('ai')}
                  className={`pb-2.5 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
                    activeTab === 'ai'
                      ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-indigo-500" /> AI Care Advisor
                </button>
              </div>

              {/* TAB 1: INFO */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  {/* Grid Attribute Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] text-slate-400">Species & Breed</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {displaySpecies} • {pet.breed}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] text-slate-400">Age</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {formatAge(pet.ageMonths)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] text-slate-400">Gender</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {displayGender}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] text-slate-400">Health Status</div>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {displayHealth}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] text-slate-400">Energy Level</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {displayEnergy}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] text-slate-400">Adoption Status</div>
                      <div className="text-xs font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                        {pet.adoptionStatus === 'Ready' ? 'Ready for Adoption' : pet.adoptionStatus}
                      </div>
                    </div>
                  </div>

                  {/* Compatibility Badges */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Home Suitability & Compatibility:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                        pet.vaccinated ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-700 dark:text-emerald-300' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Vaccinated: {pet.vaccinated ? 'Up to date' : 'Pending'}</span>
                      </div>

                      <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                        pet.sterilized ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 text-sky-700 dark:text-sky-300' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Neutered: {pet.sterilized ? 'Yes' : 'Not yet'}</span>
                      </div>

                      <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                        pet.goodWithKids ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 text-indigo-700 dark:text-indigo-300' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                        <UserCheck className="w-4 h-4 shrink-0" />
                        <span>Kids: {pet.goodWithKids ? 'Very Friendly' : 'Caution Advised'}</span>
                      </div>

                      <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                        pet.goodWithPets ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 text-teal-700 dark:text-teal-300' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                        <Heart className="w-4 h-4 shrink-0" />
                        <span>Other Pets: {pet.goodWithPets ? 'Friendly' : 'Prefer Only Pet'}</span>
                      </div>

                      <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                        pet.requiresYard ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-700 dark:text-amber-300' : 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 text-purple-700 dark:text-purple-300'
                      }`}>
                        <Home className="w-4 h-4 shrink-0" />
                        <span>{pet.requiresYard ? 'Needs Fenced Yard' : 'Apartment Friendly'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Rescue Story & Personality:
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {pet.description}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: MEDICAL RECORDS */}
              {activeTab === 'medical' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Clinical History & Vaccinations (PET_MEDICAL_RECORDS)
                    </span>
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200">
                      Veterinary Inspected
                    </span>
                  </div>

                  {pet.medicalRecords && pet.medicalRecords.length > 0 ? (
                    <div className="space-y-3">
                      {pet.medicalRecords.map((record) => (
                        <div
                          key={record.recordId}
                          className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                              <Stethoscope className="w-3.5 h-3.5" /> {record.diagnosis}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {record.medicalDate}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300">
                            <strong>Treatment / Plan:</strong> {record.treatment}
                          </div>
                          {record.medications && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              <strong>Medications:</strong> {record.medications}
                            </div>
                          )}
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                            <span>Attending Vet: {record.vetName}</span>
                            {record.nextFollowUp && (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">
                                Follow-up Date: {record.nextFollowUp}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">No special clinical treatments recorded. Animal in stable condition.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: AI ADOPTION ASSISTANT */}
              {activeTab === 'ai' && (
                <div className="space-y-3 flex flex-col h-[320px]">
                  <div className="flex-1 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                    {aiMessages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shrink-0 text-xs">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-sky-500 text-white rounded-br-none'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-xs'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                        <Sparkles className="w-3.5 h-3.5 animate-spin text-sky-500" />
                        AI is reviewing {pet.name}'s profile and preparing recommendations...
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSendAi} className="flex gap-2">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder={`Ask about nutrition, home prep, or routines for ${pet.name}...`}
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      type="submit"
                      disabled={aiLoading || !aiPrompt.trim()}
                      className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            All adoption applications are tracked and verified through relational SQL transactions.
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              id="btn-modal-foster"
              disabled={pet.adoptionStatus === 'Adopted'}
              onClick={() => {
                onClose();
                onApply(pet, 'Foster');
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
            >
              Apply to Foster
            </button>
            <button
              id="btn-modal-adopt"
              disabled={pet.adoptionStatus === 'Adopted'}
              onClick={() => {
                onClose();
                onApply(pet, 'Adopt');
              }}
              className={`px-6 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shadow-md transition-all ${
                pet.adoptionStatus === 'Adopted'
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700'
              }`}
            >
              <Heart className="w-4 h-4 fill-current" />
              {pet.adoptionStatus === 'Adopted' ? 'Already Adopted' : 'Apply for Adoption'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
