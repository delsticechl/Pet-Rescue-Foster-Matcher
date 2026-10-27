import React, { useState } from 'react';
import {
  Stethoscope,
  Plus,
  X,
  Calendar,
  User,
  CheckCircle2,
  Search,
  Lock,
} from 'lucide-react';
import { Pet, PetMedicalRecord, User as UserType } from '../../types';
import { api } from '../../services/api';

interface AdminMedicalRecordsProps {
  pets: Pet[];
  currentUser: UserType;
  preSelectedPet?: Pet | null;
  onRefresh: () => void;
  showToast: (title: string, description: string) => void;
}

export const AdminMedicalRecords: React.FC<AdminMedicalRecordsProps> = ({
  pets,
  preSelectedPet,
  onRefresh,
  showToast,
}) => {
  const [selectedPetId, setSelectedPetId] = useState<string>(
    preSelectedPet?.petId || pets[0]?.petId || ''
  );
  const [openAddModal, setOpenAddModal] = useState(false);
  const [medicalForm, setMedicalForm] = useState({
    diagnosis: '',
    treatment: '',
    vetName: 'PawFund Veterinarian',
    medicalDate: new Date().toISOString().split('T')[0],
    medications: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedPet = pets.find((p) => p.petId === selectedPetId) || pets[0];
  const isAdopted = selectedPet?.adoptionStatus === 'Adopted';
  const records = selectedPet?.medicalRecords || selectedPet?.medicalHistory || [];

  const handleAddMedical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPet) return;
    if (isAdopted) {
      alert('This pet has already been adopted! Medical records at the shelter are frozen.');
      return;
    }
    if (!medicalForm.diagnosis || !medicalForm.treatment) {
      alert('Please enter both diagnosis and treatment plan');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.addMedicalRecord(selectedPet.petId, medicalForm);
      onRefresh();
      showToast('Medical record added', `Recorded medical record for ${selectedPet.name} successfully.`);
      setOpenAddModal(false);
      setMedicalForm({
        diagnosis: '',
        treatment: '',
        vetName: 'PawFund Veterinarian',
        medicalDate: new Date().toISOString().split('T')[0],
        medications: '',
      });
    } catch (err: any) {
      alert(err.message || 'Error adding medical record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPets = pets.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.petId.toLowerCase().includes(q);
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden animate-in fade-in">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-emerald-500" />
            Pet Medical Records & Veterinary History
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track health status, clinical diagnoses, treatments, and medications for shelter pets
          </p>
        </div>

        {selectedPet && (
          <div>
            {isAdopted ? (
              <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Medical Records Frozen (Pet Adopted)
              </div>
            ) : (
              <button
                onClick={() => setOpenAddModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Medical Record
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-700">
        {/* Left: Pet Selector (4 cols) */}
        <div className="md:col-span-4 p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by pet name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="max-h-[600px] overflow-y-auto space-y-1.5 pr-1">
            {filteredPets.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">No pets found.</div>
            ) : (
              filteredPets.map((p) => {
                const isSelected = p.petId === selectedPet?.petId;
                const img = p.imageUrl || p.primaryImage || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=200&q=80';
                return (
                  <button
                    key={p.petId}
                    onClick={() => setSelectedPetId(p.petId)}
                    className={`w-full p-2.5 rounded-2xl text-left flex items-center gap-3 transition-all ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-700'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/40 border border-transparent'
                    }`}
                  >
                    <img src={img} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-800 dark:text-white truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {p.species} • {p.breed} • {p.adoptionStatus === 'Adopted' ? 'Adopted' : 'Available'}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Medical History Details (8 cols) */}
        <div className="md:col-span-8 p-6 space-y-5">
          {selectedPet ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 gap-2">
                <div>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    Medical history: {selectedPet.name}
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                      {selectedPet.petId}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Status: <strong className="text-emerald-600 dark:text-emerald-400">{selectedPet.healthStatus}</strong> •
                    {selectedPet.vaccinated ? ' Vaccinated' : ' Unvaccinated'} •
                    {selectedPet.sterilized ? ' Neutered/Spayed' : ' Not Neutered'}
                  </p>
                </div>

                {isAdopted && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                    ✓ Found Forever Home
                  </span>
                )}
              </div>

              {records.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                  <Stethoscope className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-600 dark:text-slate-300">No medical records recorded yet.</p>
                  {!isAdopted && (
                    <button
                      onClick={() => setOpenAddModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-sky-500 text-white font-bold text-xs"
                    >
                      + Add first medical record
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {records.map((r) => (
                    <div
                      key={r.recordId}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-emerald-500" />
                          Diagnosis: {r.diagnosis}
                        </span>
                        <span className="text-[11px] text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          {r.medicalDate}
                        </span>
                      </div>

                      <div className="text-slate-600 dark:text-slate-300">
                        <strong>Treatment:</strong> {r.treatment}
                      </div>

                      {r.medications && (
                        <div className="text-slate-600 dark:text-slate-300">
                          <strong>Medications:</strong> {r.medications}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between">
                        <span>Attending Vet: <strong>{r.vetName}</strong></span>
                        <span className="font-mono text-[10px]">ID: {r.recordId}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">Please select a pet to view medical records.</div>
          )}
        </div>
      </div>

      {/* ADD MEDICAL RECORD MODAL */}
      {openAddModal && selectedPet && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-emerald-500" /> Add Medical Record
                </h3>
                <p className="text-[11px] text-slate-400">
                  Record examination for: <strong>{selectedPet.name}</strong> ({selectedPet.petId})
                </p>
              </div>
              <button onClick={() => setOpenAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMedical} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Date of Exam / Treatment:</label>
                <input
                  type="date"
                  value={medicalForm.medicalDate}
                  onChange={(e) => setMedicalForm({ ...medicalForm, medicalDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Diagnosis (*):</label>
                <input
                  type="text"
                  required
                  value={medicalForm.diagnosis}
                  onChange={(e) => setMedicalForm({ ...medicalForm, diagnosis: e.target.value })}
                  placeholder="e.g. General checkup, mild dermatitis, vaccination..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Treatment Plan (*):</label>
                <textarea
                  rows={2}
                  required
                  value={medicalForm.treatment}
                  onChange={(e) => setMedicalForm({ ...medicalForm, treatment: e.target.value })}
                  placeholder="Treatment methods, dosage, care guidelines..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Attending Vet:</label>
                  <input
                    type="text"
                    value={medicalForm.vetName}
                    onChange={(e) => setMedicalForm({ ...medicalForm, vetName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Medications Prescribed:</label>
                  <input
                    type="text"
                    value={medicalForm.medications}
                    onChange={(e) => setMedicalForm({ ...medicalForm, medications: e.target.value })}
                    placeholder="Medication names if any"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setOpenAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isSubmitting ? 'Saving...' : 'Save Medical Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
