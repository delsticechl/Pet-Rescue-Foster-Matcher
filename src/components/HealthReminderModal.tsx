import React, { useState, useEffect } from 'react';
import {
  Bell,
  Calendar,
  Clock,
  Stethoscope,
  Syringe,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  Mail,
  Filter,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Info,
  ChevronRight,
  Send,
  RotateCcw
} from 'lucide-react';
import { HealthReminder, HealthReminderSummary, Pet, User } from '../types';
import { api } from '../services/api';

interface HealthReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSelectPet: (pet: Pet) => void;
  onRefreshPets: () => void;
  showToast: (title: string, description: string) => void;
}

export const HealthReminderModal: React.FC<HealthReminderModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectPet,
  onRefreshPets,
  showToast,
}) => {
  const [reminders, setReminders] = useState<HealthReminder[]>([]);
  const [summary, setSummary] = useState<HealthReminderSummary>({
    total: 0,
    overdue: 0,
    today: 0,
    next7Days: 0,
    next30Days: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedUrgency, setSelectedUrgency] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterMyPetsOnly, setFilterMyPetsOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Action Modal / Inline Form for recording completion
  const [activeCompletingReminder, setActiveCompletingReminder] = useState<HealthReminder | null>(null);
  const [completionForm, setCompletionForm] = useState({
    nextFollowUp: '',
    newDiagnosis: '',
    newTreatment: '',
    vetName: 'Dr. PawFund Veterinarian',
    medications: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const res = await api.getHealthReminders();
      setReminders(res.reminders);
      setSummary(res.summary);
    } catch (err: any) {
      console.error('Failed to load health reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReminders();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredReminders = reminders.filter((r) => {
    // My Pets Only Filter
    if (filterMyPetsOnly && currentUser) {
      if (r.adopterId !== currentUser.userId) return false;
    }

    // Urgency Filter
    if (selectedUrgency === 'overdue_today') {
      if (r.urgency !== 'Overdue' && r.urgency !== 'Today') return false;
    } else if (selectedUrgency === '7days') {
      if (r.urgency !== 'Overdue' && r.urgency !== 'Today' && r.urgency !== 'Urgent') return false;
    } else if (selectedUrgency === '30days') {
      if (!['Overdue', 'Today', 'Urgent', 'Upcoming'].includes(r.urgency)) return false;
    }

    // Category Filter
    if (selectedCategory !== 'All' && selectedCategory !== 'Tất cả' && r.category !== selectedCategory) {
      return false;
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchName = r.petName.toLowerCase().includes(q);
      const matchBreed = r.petBreed.toLowerCase().includes(q);
      const matchDiag = r.diagnosis.toLowerCase().includes(q);
      const matchTreatment = r.treatment.toLowerCase().includes(q);
      const matchVet = r.vetName.toLowerCase().includes(q);
      const matchMed = r.medications?.toLowerCase().includes(q) ?? false;
      const matchAdopter = r.adopterName?.toLowerCase().includes(q) ?? false;
      return matchName || matchBreed || matchDiag || matchTreatment || matchVet || matchMed || matchAdopter;
    }

    return true;
  });

  const handleCompleteCheckup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompletingReminder) return;

    setIsSubmitting(true);
    try {
      await api.completeHealthReminder({
        petId: activeCompletingReminder.petId,
        recordId: activeCompletingReminder.recordId,
        nextFollowUp: completionForm.nextFollowUp || undefined,
        newDiagnosis: completionForm.newDiagnosis || `Completed scheduled checkup: ${activeCompletingReminder.diagnosis}`,
        newTreatment: completionForm.newTreatment || 'Vaccination / health checkup completed according to clinical protocol.',
        vetName: completionForm.vetName,
        medications: completionForm.medications || undefined,
      });

      showToast(
        'Checkup Recorded Successfully',
        `New medical update and vaccination recorded for ${activeCompletingReminder.petName}.`
      );

      setActiveCompletingReminder(null);
      setCompletionForm({
        nextFollowUp: '',
        newDiagnosis: '',
        newTreatment: '',
        vetName: 'Dr. PawFund Veterinarian',
        medications: '',
      });
      fetchReminders();
      onRefreshPets();
    } catch (err: any) {
      alert(err.message || 'Error updating health record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReminderEmail = async (reminder: HealthReminder) => {
    setSendingEmailId(reminder.reminderId);
    try {
      const res = await api.sendHealthReminderNotification({
        reminderId: reminder.reminderId,
        petId: reminder.petId,
      });
      showToast(
        'Reminder Notification Dispatched 📬',
        res.message || `Sent clinical reminder notice for ${reminder.petName}.`
      );
    } catch (err: any) {
      alert(err.message || 'Error sending email notice');
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleOpenPetDetail = async (petId: string) => {
    try {
      const pet = await api.getPetById(petId);
      onSelectPet(pet);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const isAdmin = currentUser?.role === 'Admin';

  return (
    <div
      id="health-reminder-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in"
    >
      <div
        id="health-reminder-modal-container"
        className="relative bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-sky-500/10 via-teal-500/10 to-indigo-500/10 dark:from-sky-950/40 dark:via-teal-950/40 dark:to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-500/20">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Clinical Reminders & Vaccine Schedule
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  PET_MEDICAL_RECORDS
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated auditing for upcoming checkups (`nextFollowUp`), booster shots, and deworming treatments
              </p>
            </div>
          </div>
          <button
            id="close-health-reminder-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metric Summary Ribbon */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedUrgency('overdue_today')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                selectedUrgency === 'overdue_today'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Overdue / Today: <strong>{summary.overdue + summary.today}</strong>
            </button>

            <button
              onClick={() => setSelectedUrgency('7days')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                selectedUrgency === '7days'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Within 7 Days: <strong>{summary.next7Days}</strong>
            </button>

            <button
              onClick={() => setSelectedUrgency('30days')}
              className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all ${
                selectedUrgency === '30days'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 border border-sky-200 dark:border-sky-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Within 30 Days: <strong>{summary.next30Days}</strong>
            </button>

            <button
              onClick={() => setSelectedUrgency('All')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                selectedUrgency === 'All'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
                  : 'bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
              }`}
            >
              All: <strong>{summary.total}</strong>
            </button>
          </div>

          {currentUser && (
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={filterMyPetsOnly}
                onChange={(e) => setFilterMyPetsOnly(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500"
              />
              <span>My pets only</span>
            </label>
          )}
        </div>

        {/* Controls & Search Bar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by pet name, vet, diagnosis, vaccine..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'All', label: 'All Categories' },
              { id: 'Vaccination', label: '💉 Vaccines', icon: Syringe },
              { id: 'PostOp', label: '🩹 Post-Op / Wounds' },
              { id: 'Deworming', label: '💊 Deworming' },
              { id: 'GeneralCheckup', label: '🩺 General Checkup' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-700 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reminder Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-xs">Loading medical schedule records...</div>
          ) : filteredReminders.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-3 p-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <div className="text-sm font-bold text-slate-800 dark:text-white">
                No matching reminders found!
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                All pet vaccinations and follow-up examinations are up to date.
              </p>
              {(selectedUrgency !== 'All' || selectedCategory !== 'All' || searchTerm) && (
                <button
                  onClick={() => {
                    setSelectedUrgency('All');
                    setSelectedCategory('All');
                    setSearchTerm('');
                    setFilterMyPetsOnly(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
                </button>
              )}
            </div>
          ) : (
            filteredReminders.map((reminder) => {
              const isOverdue = reminder.urgency === 'Overdue';
              const isToday = reminder.urgency === 'Today';
              const isUrgent = reminder.urgency === 'Urgent';
              const isCompleted = reminder.status === 'Completed';

              return (
                <div
                  key={reminder.reminderId}
                  id={`reminder-card-${reminder.reminderId}`}
                  className={`p-5 rounded-3xl bg-white dark:bg-slate-800 border transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                    isCompleted
                      ? 'border-slate-200 dark:border-slate-700 opacity-60'
                      : isOverdue
                      ? 'border-rose-300 dark:border-rose-800 ring-1 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/10'
                      : isToday
                      ? 'border-amber-300 dark:border-amber-800 ring-1 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/10'
                      : isUrgent
                      ? 'border-amber-200 dark:border-amber-900 bg-amber-50/10'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {/* Left Column: Pet info & Countdown badge */}
                  <div className="flex items-start gap-4">
                    <img
                      src={reminder.petImage}
                      alt={reminder.petName}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-700 shrink-0"
                    />
                    <div className="space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 dark:text-white">
                          {reminder.petName}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {reminder.petSpecies} • {reminder.petBreed}
                        </span>

                        {/* Urgency Status Badge */}
                        {isCompleted ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </span>
                        ) : isOverdue ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500 text-white animate-pulse flex items-center gap-1 shadow-xs">
                            <AlertTriangle className="w-3 h-3" /> Overdue by {Math.abs(reminder.daysRemaining)} days ({reminder.dueDate})
                          </span>
                        ) : isToday ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-white animate-bounce flex items-center gap-1 shadow-xs">
                            <Clock className="w-3 h-3" /> TODAY - Immediate follow-up required
                          </span>
                        ) : isUrgent ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Due in {reminder.daysRemaining} days ({reminder.dueDate})
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Due in {reminder.daysRemaining} days ({reminder.dueDate})
                          </span>
                        )}
                      </div>

                      {/* Diagnosis & Treatment Description */}
                      <div className="text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5 pt-0.5">
                        <Stethoscope className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <span>{reminder.diagnosis}</span>
                      </div>

                      <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                        <strong>Treatment Plan:</strong> {reminder.treatment}
                      </div>

                      {reminder.medications && (
                        <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                          <strong>Medications:</strong> <code className="text-sky-600 dark:text-sky-400">{reminder.medications}</code>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                        <span>👨‍⚕️ Vet: <strong>{reminder.vetName}</strong></span>
                        <span>•</span>
                        <span>📍 {reminder.shelterName}</span>
                        {reminder.adopterName && (
                          <>
                            <span>•</span>
                            <span className="text-teal-600 dark:text-teal-400 font-medium">
                              Adopter: {reminder.adopterName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-row md:flex-col gap-2 shrink-0 justify-end">
                    {isAdmin && (
                      <>
                        <button
                          id={`complete-btn-${reminder.reminderId}`}
                          onClick={() => {
                            setActiveCompletingReminder(reminder);
                            setCompletionForm({
                              nextFollowUp: '',
                              newDiagnosis: `Follow-up checkup completed after: ${reminder.diagnosis}`,
                              newTreatment: 'Booster vaccination administered / health exam cleared.',
                              vetName: reminder.vetName,
                              medications: '',
                            });
                          }}
                          className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
                        </button>

                        <button
                          id={`send-email-btn-${reminder.reminderId}`}
                          disabled={sendingEmailId === reminder.reminderId}
                          onClick={() => handleSendReminderEmail(reminder)}
                          className="px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          {sendingEmailId === reminder.reminderId ? 'Dispatching...' : 'Send Reminder Notice'}
                        </button>
                      </>
                    )}

                    <button
                      id={`view-pet-btn-${reminder.reminderId}`}
                      onClick={() => handleOpenPetDetail(reminder.petId)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>View Pet</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Completion Modal / Record Checkup Form */}
        {activeCompletingReminder && (
          <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in zoom-in-95 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                      Record Clinical Checkup & Vaccination Results
                    </h3>
                    <p className="text-slate-400">
                      Pet: <strong>{activeCompletingReminder.petName}</strong> ({activeCompletingReminder.petId})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveCompletingReminder(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCompleteCheckup} className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Diagnosis / Clinical Procedure
                  </label>
                  <input
                    type="text"
                    required
                    value={completionForm.newDiagnosis}
                    onChange={(e) => setCompletionForm({ ...completionForm, newDiagnosis: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Treatment Protocol / Vaccines Administered
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={completionForm.newTreatment}
                    onChange={(e) => setCompletionForm({ ...completionForm, newTreatment: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Attending Veterinarian
                    </label>
                    <input
                      type="text"
                      required
                      value={completionForm.vetName}
                      onChange={(e) => setCompletionForm({ ...completionForm, vetName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Next Follow-Up Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={completionForm.nextFollowUp}
                      onChange={(e) => setCompletionForm({ ...completionForm, nextFollowUp: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prescribed Medications (Optional)
                  </label>
                  <input
                    type="text"
                    value={completionForm.medications}
                    onChange={(e) => setCompletionForm({ ...completionForm, medications: e.target.value })}
                    placeholder="e.g. Broadline, Drontal Plus, Antibiotics..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCompletingReminder(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isSubmitting ? 'Saving...' : 'Confirm Checkup Recorded'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
