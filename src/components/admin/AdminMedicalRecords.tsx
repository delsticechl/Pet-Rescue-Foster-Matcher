import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Plus,
  X,
  Calendar,
  User,
  FileText,
  Check,
  Bell,
  AlertTriangle,
  Clock,
  Mail,
  CheckCircle2,
  Filter,
  Search,
  RotateCcw
} from 'lucide-react';
import { Pet, PetMedicalRecord, HealthReminder, HealthReminderSummary } from '../../types';
import { api } from '../../services/api';

interface AdminMedicalRecordsProps {
  pets: Pet[];
  selectedPetForModal: Pet | null;
  onCloseModal: () => void;
  onRefresh: () => void;
  showToast: (title: string, description: string) => void;
}

export const AdminMedicalRecords: React.FC<AdminMedicalRecordsProps> = ({
  pets,
  selectedPetForModal,
  onCloseModal,
  onRefresh,
  showToast,
}) => {
  const [activePet, setActivePet] = useState<Pet | null>(selectedPetForModal);
  const [medicalForm, setMedicalForm] = useState({
    diagnosis: 'Routine 7-way core vaccination & parasite treatment',
    treatment: 'Booster vaccination for DHPP/rabies and oral broad-spectrum deworming',
    vetName: 'Dr. PawFund Veterinarian',
    nextFollowUp: '2026-09-15',
    medications: 'Vanguard Plus 5/L + Drontal Plus',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Health Reminders Data
  const [reminders, setReminders] = useState<HealthReminder[]>([]);
  const [summary, setSummary] = useState<HealthReminderSummary>({
    total: 0,
    overdue: 0,
    today: 0,
    next7Days: 0,
    next30Days: 0,
  });
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [reminderFilter, setReminderFilter] = useState<'all' | 'overdue' | 'today' | '7days'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  const loadReminders = async () => {
    try {
      setLoadingReminders(true);
      const res = await api.getHealthReminders();
      setReminders(res.reminders);
      setSummary(res.summary);
    } catch (err) {
      console.error('Failed to fetch reminders:', err);
    } finally {
      setLoadingReminders(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  const currentPet = activePet || selectedPetForModal;

  const handleAddMedical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPet) return;
    setIsSubmitting(true);
    try {
      await api.addMedicalRecord(currentPet.petId, medicalForm);
      onRefresh();
      loadReminders();
      showToast('Medical Record Created', `Added clinical entry for ${currentPet.name} (${currentPet.petId}).`);
      setActivePet(null);
      onCloseModal();
    } catch (err: any) {
      alert(err.message || 'Error adding medical record');
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
        'Reminder Dispatched 📬',
        res.message || `Sent follow-up reminder for ${reminder.petName}.`
      );
    } catch (err: any) {
      alert(err.message || 'Error sending reminder notice');
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleMarkComplete = async (reminder: HealthReminder) => {
    try {
      await api.completeHealthReminder({
        petId: reminder.petId,
        recordId: reminder.recordId,
      });
      showToast(
        'Status Updated',
        `Marked follow-up examination complete for ${reminder.petName}.`
      );
      loadReminders();
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  const filteredReminders = reminders.filter((r) => {
    if (reminderFilter === 'overdue' && r.urgency !== 'Overdue') return false;
    if (reminderFilter === 'today' && r.urgency !== 'Today') return false;
    if (reminderFilter === '7days' && !['Overdue', 'Today', 'Urgent'].includes(r.urgency)) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchName = r.petName.toLowerCase().includes(q);
      const matchDiag = r.diagnosis.toLowerCase().includes(q);
      const matchVet = r.vetName.toLowerCase().includes(q);
      const matchAdopter = r.adopterName?.toLowerCase().includes(q) ?? false;
      return matchName || matchDiag || matchVet || matchAdopter;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* 1. HEALTH REMINDER SYSTEM BANNER & DASHBOARD */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 mb-1">
              <Bell className="w-3.5 h-3.5" /> Health Reminders & Vaccination Monitoring
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Upcoming Veterinary Checkups & Boosters
            </h3>
            <p className="text-xs text-slate-400">
              Evaluates <code className="text-sky-600 dark:text-sky-400 font-semibold">nextFollowUp</code> in <code className="text-sky-600 dark:text-sky-400 font-semibold">PET_MEDICAL_RECORDS</code> and computes countdown windows
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setReminderFilter(reminderFilter === 'overdue' ? 'all' : 'overdue')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                reminderFilter === 'overdue'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Overdue: {summary.overdue}
            </button>

            <button
              onClick={() => setReminderFilter(reminderFilter === 'today' ? 'all' : 'today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                reminderFilter === 'today'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Today: {summary.today}
            </button>

            <button
              onClick={() => setReminderFilter(reminderFilter === '7days' ? 'all' : '7days')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                reminderFilter === '7days'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Next 7 Days: {summary.next7Days}
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by pet name, vet, diagnosis..."
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

          <div className="text-slate-400 text-xs">
            Showing <strong>{filteredReminders.length}</strong> / {reminders.length} reminder alerts
          </div>
        </div>

        {/* Reminders Table / List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-semibold bg-slate-50 dark:bg-slate-900/40">
                <th className="py-3 px-4 rounded-l-xl">Pet</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Diagnosis & Plan</th>
                <th className="py-3 px-4">Veterinarian / Shelter</th>
                <th className="py-3 px-4">Adopter</th>
                <th className="py-3 px-4 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingReminders ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading clinical reminders...
                  </td>
                </tr>
              ) : filteredReminders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No clinical follow-ups currently required for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredReminders.map((r) => {
                  const isOverdue = r.urgency === 'Overdue';
                  const isToday = r.urgency === 'Today';
                  const isUrgent = r.urgency === 'Urgent';
                  const isCompleted = r.status === 'Completed';

                  return (
                    <tr
                      key={r.reminderId}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors ${
                        isCompleted ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={r.petImage}
                            alt=""
                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                          <div>
                            <div className="font-bold text-slate-800 dark:text-white">
                              {r.petName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {r.petSpecies} • {r.petBreed}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-sky-500" /> {r.dueDate}
                          </div>
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" /> Completed
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> Overdue {Math.abs(r.daysRemaining)} days
                            </span>
                          ) : isToday ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                              <Clock className="w-3 h-3" /> Today
                            </span>
                          ) : isUrgent ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <Clock className="w-3 h-3" /> In {r.daysRemaining} days
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                              In {r.daysRemaining} days
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {r.diagnosis}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {r.treatment}
                        </div>
                        {r.medications && (
                          <div className="text-[10px] text-sky-600 dark:text-sky-400 font-mono mt-0.5">
                            Rx: {r.medications}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        <div>{r.vetName}</div>
                        <div className="text-[11px] text-slate-400">{r.shelterName}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {r.adopterName ? (
                          <div>
                            <div className="font-semibold text-teal-600 dark:text-teal-400">
                              {r.adopterName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {r.adopterEmail}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">In Shelter Care</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isCompleted && (
                            <button
                              onClick={() => handleMarkComplete(r)}
                              title="Mark checkup complete"
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleSendReminderEmail(r)}
                            disabled={sendingEmailId === r.reminderId}
                            title="Dispatch reminder notification"
                            className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 transition-colors"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. PET LIST & MEDICAL RECORD CREATION */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-sky-500" /> Active Pet Profiles & Clinical Records
            </h3>
            <p className="text-xs text-slate-400">Select any pet profile to record new clinical findings, surgeries, or vaccines</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {pets.map((p) => (
            <div
              key={p.petId}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center gap-3">
                <img
                  src={p.primaryImage || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=200&q=80'}
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-800 dark:text-slate-200">{p.name} ({p.petId})</div>
                  <div className="text-slate-400">{p.species} • {p.healthStatus}</div>
                  <div className="text-[11px] text-sky-600 dark:text-sky-400">
                    {p.medicalRecords?.length || 0} medical entries
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActivePet(p)}
                className="w-full py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Medical Entry
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Medical Record Modal */}
      {currentPet && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    Add Medical Record: {currentPet.name} ({currentPet.petId})
                  </h3>
                  <p className="text-xs text-slate-400">Table PET_MEDICAL_RECORDS - 3NF Relational Storage</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActivePet(null);
                  onCloseModal();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMedical} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Diagnosis / Clinical Purpose (*):</label>
                <input
                  type="text"
                  value={medicalForm.diagnosis}
                  onChange={(e) => setMedicalForm({ ...medicalForm, diagnosis: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Treatment Protocol / Vaccines Administered (*):</label>
                <input
                  type="text"
                  value={medicalForm.treatment}
                  onChange={(e) => setMedicalForm({ ...medicalForm, treatment: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Attending Veterinarian:</label>
                  <input
                    type="text"
                    value={medicalForm.vetName}
                    onChange={(e) => setMedicalForm({ ...medicalForm, vetName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Next Follow-Up (nextFollowUp):</label>
                  <input
                    type="date"
                    value={medicalForm.nextFollowUp}
                    onChange={(e) => setMedicalForm({ ...medicalForm, nextFollowUp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Prescribed Medications (Optional):</label>
                <input
                  type="text"
                  value={medicalForm.medications}
                  onChange={(e) => setMedicalForm({ ...medicalForm, medications: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setActivePet(null);
                    onCloseModal();
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Clinical Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
