import React, { useState, useRef } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Stethoscope,
  Heart,
  Check,
  X,
  ShieldCheck,
  LayoutGrid,
  List,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
} from 'lucide-react';
import { Pet, Shelter, PetSpecies, PetHealthStatus, EnergyLevel, AdoptionStatus, User } from '../../types';
import { api } from '../../services/api';
import { readImageAsDataUrl } from '../../utils/imageResize';

interface AdminPetManagerProps {
  pets: Pet[];
  shelters: Shelter[];
  currentUser: User;
  onRefresh: () => void;
  onOpenMedicalModal: (pet: Pet) => void;
}

const SAMPLE_PET_IMAGES = [
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80',
];

const SPECIES_OPTIONS = ['Dog', 'Cat', 'Other'];
const HEALTH_OPTIONS = ['Healthy', 'In Treatment', 'Special Needs', 'Critical'];
const ENERGY_OPTIONS = ['Low', 'Medium', 'High'];
const inputCls =
  'w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200';

// Keep legacy/Vietnamese values already stored in the DB selectable so they aren't silently overwritten
const withCurrent = (options: string[], current?: string) =>
  current && !options.includes(current) ? [current, ...options] : options;

export const AdminPetManager: React.FC<AdminPetManagerProps> = ({
  pets,
  shelters,
  currentUser,
  onRefresh,
  onOpenMedicalModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const addFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Add Pet Modal State
  const [openAddModal, setOpenAddModal] = useState(false);
  const [newPet, setNewPet] = useState({
    name: '',
    species: 'Dog' as PetSpecies,
    breed: 'Mixed Breed',
    ageMonths: 12,
    gender: 'Male' as any,
    healthStatus: 'Healthy' as PetHealthStatus,
    vaccinated: true,
    sterilized: true,
    adoptionStatus: 'Ready' as AdoptionStatus,
    energyLevel: 'Medium' as EnergyLevel,
    goodWithKids: true,
    goodWithPets: true,
    requiresYard: false,
    description: 'Recently rescued pet, gentle, well-behaved, and affectionate.',
    shelterId: shelters[0]?.shelterId || 'SHL-01',
    imageUrl: SAMPLE_PET_IMAGES[0],
    fileName: 'pet_photo.jpg',
    fileSize: 180000,
    mimeType: 'image/jpeg',
    // Initial Medical Record
    initialDiagnosis: 'General intake checkup at shelter',
    initialTreatment: 'First round of vaccination & deworming complete',
    vetName: 'PawFund Veterinarian',
    medications: 'Drontal dewormer, 7-in-1 core vaccine',
    medicalDate: new Date().toISOString().split('T')[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Pet Modal State
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  // Delete Pet Confirmation
  const [petToDelete, setPetToDelete] = useState<Pet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle Local File Upload from User's Device
  const handleFileUpload = (file: File, target: 'add' | 'edit') => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, JPEG, WEBP, or GIF)');
      return;
    }

    readImageAsDataUrl(file, 1280, 0.85).then((dataUrl) => {
      if (target === 'add') {
        setNewPet((prev) => ({
          ...prev,
          imageUrl: dataUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }));
      } else if (editForm) {
        setEditForm((prev: any) => ({
          ...prev,
          imageUrl: dataUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }));
      }
    }).catch(() => {
      alert('Unable to read image file from your device');
    });
  };

  const filteredPets = pets.filter((p) => {
    if (speciesFilter !== 'all') {
      const sp = speciesFilter.toLowerCase();
      const petSp = p.species.toLowerCase();
      const match =
        sp === petSp ||
        ((sp === 'dog' || sp === 'chó') && (petSp === 'dog' || petSp === 'chó')) ||
        ((sp === 'cat' || sp === 'mèo') && (petSp === 'cat' || petSp === 'mèo'));
      if (!match) return false;
    }
    if (statusFilter !== 'all' && p.adoptionStatus !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchBreed = p.breed.toLowerCase().includes(q);
      const matchId = p.petId.toLowerCase().includes(q);
      if (!matchName && !matchBreed && !matchId) return false;
    }
    return true;
  });

  const handleOpenEdit = (pet: Pet) => {
    const primaryImg = pet.primaryImage || (pet.images && pet.images[0]?.imageUrl) || SAMPLE_PET_IMAGES[0];
    setEditingPet(pet);
    setEditForm({
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      ageMonths: pet.ageMonths,
      gender: pet.gender === 'Đực' ? 'Male' : pet.gender === 'Cái' ? 'Female' : pet.gender,
      healthStatus: pet.healthStatus,
      vaccinated: pet.vaccinated,
      sterilized: pet.sterilized,
      adoptionStatus: pet.adoptionStatus,
      energyLevel: pet.energyLevel,
      goodWithKids: pet.goodWithKids,
      goodWithPets: pet.goodWithPets,
      requiresYard: pet.requiresYard,
      description: pet.description,
      shelterId: pet.shelterId,
      imageUrl: primaryImg,
    });
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPet.name.trim()) {
      alert('Please enter a pet name');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createPet(
        {
          ...newPet,
          requesterRole: currentUser.role,
        },
        currentUser.role
      );
      setOpenAddModal(false);
      onRefresh();
      alert(`Successfully published pet ${newPet.name} to the shelter!`);
    } catch (err: any) {
      alert(err.message || 'Error publishing pet profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPet || !editForm) return;

    setIsSubmitting(true);
    try {
      const originalImg =
        editingPet.primaryImage || (editingPet.images && editingPet.images[0]?.imageUrl) || SAMPLE_PET_IMAGES[0];
      const payload = { ...editForm };
      // Only send the photo when it actually changed (data URLs are large)
      if (payload.imageUrl === originalImg) {
        delete payload.imageUrl;
        delete payload.fileName;
        delete payload.fileSize;
        delete payload.mimeType;
      }
      await api.updatePet(editingPet.petId, payload, currentUser.role);
      setEditingPet(null);
      setEditForm(null);
      onRefresh();
      alert(`Successfully updated info for ${editForm.name}!`);
    } catch (err: any) {
      alert(err.message || 'Error updating pet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePet = async () => {
    if (!petToDelete) return;
    setIsDeleting(true);
    try {
      await api.deletePet(petToDelete.petId, currentUser.role);
      setPetToDelete(null);
      onRefresh();
      alert('Pet profile removed from the system');
    } catch (err: any) {
      alert(err.message || 'Error deleting pet');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              Pet Roster Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Publish shelter pets with direct photo uploads and comprehensive medical history.
          </p>
        </div>

        <button
          onClick={() => setOpenAddModal(true)}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-sky-500/25 flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Pet</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by pet name, breed, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Species</option>
            <option value="Dog">Dogs</option>
            <option value="Cat">Cats</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Statuses</option>
            <option value="Ready">Ready for Adoption</option>
            <option value="Pending">Pending Review</option>
            <option value="Adopted">Adopted</option>
          </select>

          <div className="flex border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 ${viewMode === 'table' ? 'bg-sky-500 text-white' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-sky-500 text-white' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Pet</th>
                  <th className="px-4 py-3">Species / Breed</th>
                  <th className="px-4 py-3">Age & Gender</th>
                  <th className="px-4 py-3">Health Status</th>
                  <th className="px-4 py-3">Adoption Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredPets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      No pets found. Click "Add New Pet" to list pets at the shelter!
                    </td>
                  </tr>
                ) : (
                  filteredPets.map((p) => {
                    const img = p.imageUrl || p.primaryImage || (p.images && p.images[0]?.imageUrl) || SAMPLE_PET_IMAGES[0];
                    return (
                      <tr key={p.petId} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img src={img} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span>{p.name}</span>
                                <span className="font-mono text-[10px] text-sky-600 dark:text-sky-400 font-bold px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800">
                                  {p.petId}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {p.vaccinated ? '✓ Vaccinated' : 'Unvaccinated'} • {p.sterilized ? '✓ Neutered/Spayed' : 'Not Neutered'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          <div className="font-semibold">{p.species}</div>
                          <div className="text-slate-400 text-[11px]">{p.breed}</div>
                        </td>

                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          <div>{p.ageMonths} mo</div>
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${p.gender === 'Đực' || p.gender === 'Male' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}`}>
                            {p.gender}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {p.healthStatus}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${p.adoptionStatus === 'Adopted' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : p.adoptionStatus === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'}`}>
                            {p.adoptionStatus === 'Adopted' ? 'Adopted' : p.adoptionStatus === 'Pending' ? 'Pending' : 'Ready'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Edit Pet"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onOpenMedicalModal(p)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              title="View / Add Medical Record"
                            >
                              <Stethoscope className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setPetToDelete(p)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Delete Pet"
                            >
                              <Trash2 className="w-4 h-4" />
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
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPets.map((p) => {
            const img = p.imageUrl || p.primaryImage || (p.images && p.images[0]?.imageUrl) || SAMPLE_PET_IMAGES[0];
            return (
              <div key={p.petId} className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="relative aspect-4/3 bg-slate-100 dark:bg-slate-900">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-lg bg-slate-900/70 text-white text-[11px] font-bold">
                      {p.species} • {p.breed}
                    </span>
                    <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-lg bg-emerald-500 text-white text-[11px] font-bold">
                      {p.adoptionStatus}
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center justify-between">
                      <span>{p.name}</span>
                      <span className="text-xs text-slate-400">{p.ageMonths} mo</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{p.description}</p>
                  </div>
                </div>

                <div className="p-4 pt-0 flex gap-2">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="flex-1 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onOpenMedicalModal(p)}
                    className="flex-1 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1"
                  >
                    <Stethoscope className="w-3.5 h-3.5" /> Medical
                  </button>
                  <button
                    onClick={() => setPetToDelete(p)}
                    className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD NEW PET MODAL (Includes Direct Photo Upload & Initial Medical Record) */}
      {openAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-500 text-white">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    Publish New Pet for Adoption
                  </h3>
                  <p className="text-xs text-slate-400">
                    Publisher: <strong className="text-sky-600 dark:text-sky-400">{currentUser.fullName}</strong> (AdminStaff)
                  </p>
                </div>
              </div>
              <button onClick={() => setOpenAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pet Name (*):</label>
                  <input
                    type="text"
                    required
                    value={newPet.name}
                    onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    placeholder="e.g. Luna, Milo, Charlie..."
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Species (*):</label>
                  <select
                    value={newPet.species}
                    onChange={(e) => setNewPet({ ...newPet, species: e.target.value as PetSpecies })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="Dog">Dogs</option>
                    <option value="Cat">Cats</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Breed:</label>
                  <input
                    type="text"
                    value={newPet.breed}
                    onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    placeholder="Golden Retriever, Domestic Shorthair, Corgi..."
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Age (Months):</label>
                  <input
                    type="number"
                    min="1"
                    value={newPet.ageMonths}
                    onChange={(e) => setNewPet({ ...newPet, ageMonths: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Gender:</label>
                  <select
                    value={newPet.gender}
                    onChange={(e) => setNewPet({ ...newPet, gender: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              {/* DIRECT PHOTO UPLOAD FROM DEVICE */}
              <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-sky-500" />
                    <span>Upload photo directly from your device / library (*):</span>
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    File Picker Active
                  </span>
                </div>

                <input
                  type="file"
                  ref={addFileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'add');
                  }}
                  accept="image/*"
                  className="hidden"
                />

                <div
                  onClick={() => addFileInputRef.current?.click()}
                  className="border-2 border-dashed border-sky-300 dark:border-sky-700 hover:border-sky-500 rounded-2xl p-4 bg-white dark:bg-slate-800 text-center cursor-pointer transition-colors shadow-xs"
                >
                  {newPet.imageUrl ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                      <img
                        src={newPet.imageUrl}
                        alt="Preview"
                        className="w-24 h-24 rounded-2xl object-cover ring-2 ring-sky-500 shadow-md shrink-0"
                      />
                      <div className="text-left space-y-1 flex-1 min-w-0">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          <Check className="w-3 h-3" /> Photo selected
                        </div>
                        <div className="font-semibold text-slate-800 dark:text-white text-xs truncate max-w-xs">
                          {newPet.fileName || 'pet_photo.jpg'}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addFileInputRef.current?.click();
                          }}
                          className="mt-1 px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <Upload className="w-3 h-3" /> Choose another photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-3">
                      <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        Click here to upload photo from your computer or phone
                      </div>
                      <p className="text-[11px] text-slate-400">Supports JPG, PNG, WEBP</p>
                    </div>
                  )}
                </div>
              </div>

              {/* INITIAL MEDICAL RECORD SECTION */}
              <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-emerald-500" />
                  <span>Initial Medical History & Intake Checkup (Optional):</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Initial Diagnosis / Health Condition:
                    </label>
                    <input
                      type="text"
                      value={newPet.initialDiagnosis}
                      onChange={(e) => setNewPet({ ...newPet, initialDiagnosis: e.target.value })}
                      placeholder="e.g. General checkup & deworming..."
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Treatment / Procedures Performed:
                    </label>
                    <input
                      type="text"
                      value={newPet.initialTreatment}
                      onChange={(e) => setNewPet({ ...newPet, initialTreatment: e.target.value })}
                      placeholder="e.g. Vaccinated with 7-in-1 core vaccine..."
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Attending Veterinarian:
                    </label>
                    <input
                      type="text"
                      value={newPet.vetName}
                      onChange={(e) => setNewPet({ ...newPet, vetName: e.target.value })}
                      placeholder="PawFund Veterinarian"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Medications Prescribed:
                    </label>
                    <input
                      type="text"
                      value={newPet.medications}
                      onChange={(e) => setNewPet({ ...newPet, medications: e.target.value })}
                      placeholder="e.g. Canigen, Drontal..."
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Characteristics Checklist */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPet.vaccinated}
                    onChange={(e) => setNewPet({ ...newPet, vaccinated: e.target.checked })}
                    className="rounded text-sky-600"
                  />
                  <span>Vaccinated</span>
                </label>
                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPet.sterilized}
                    onChange={(e) => setNewPet({ ...newPet, sterilized: e.target.checked })}
                    className="rounded text-sky-600"
                  />
                  <span>Neutered / Spayed</span>
                </label>
                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPet.goodWithKids}
                    onChange={(e) => setNewPet({ ...newPet, goodWithKids: e.target.checked })}
                    className="rounded text-sky-600"
                  />
                  <span>Good with kids</span>
                </label>
                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPet.requiresYard}
                    onChange={(e) => setNewPet({ ...newPet, requiresYard: e.target.checked })}
                    className="rounded text-sky-600"
                  />
                  <span>Requires yard</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Personality description & rescue background:
                </label>
                <textarea
                  rows={2}
                  value={newPet.description}
                  onChange={(e) => setNewPet({ ...newPet, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  placeholder="Share pet traits, temperament, and rescue details..."
                />
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
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving to Database...' : 'Publish Pet (Save to Database)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PET MODAL (all attributes) */}
      {editingPet && editForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Edit Pet: {editingPet.name} <span className="text-xs font-normal text-slate-400">#{editingPet.petId}</span>
              </h3>
              <button type="button" onClick={() => setEditingPet(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Pet Name:</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Species:</label>
                  <select
                    value={editForm.species}
                    onChange={(e) => setEditForm({ ...editForm, species: e.target.value })}
                    className={inputCls}
                  >
                    {withCurrent(SPECIES_OPTIONS, editForm.species).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Breed:</label>
                  <input
                    type="text"
                    value={editForm.breed}
                    onChange={(e) => setEditForm({ ...editForm, breed: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Age (Months):</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.ageMonths}
                    onChange={(e) => setEditForm({ ...editForm, ageMonths: Number(e.target.value) })}
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Gender:</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className={inputCls}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Health Status:</label>
                  <select
                    value={editForm.healthStatus}
                    onChange={(e) => setEditForm({ ...editForm, healthStatus: e.target.value })}
                    className={inputCls}
                  >
                    {withCurrent(HEALTH_OPTIONS, editForm.healthStatus).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Adoption Status:</label>
                  <select
                    value={editForm.adoptionStatus}
                    onChange={(e) => setEditForm({ ...editForm, adoptionStatus: e.target.value })}
                    className={inputCls}
                  >
                    <option value="Ready">Ready for Adoption</option>
                    <option value="Pending">Pending Review</option>
                    <option value="Fostered">Fostered</option>
                    <option value="Adopted">Adopted</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Energy Level:</label>
                  <select
                    value={editForm.energyLevel}
                    onChange={(e) => setEditForm({ ...editForm, energyLevel: e.target.value })}
                    className={inputCls}
                  >
                    {withCurrent(ENERGY_OPTIONS, editForm.energyLevel).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Shelter:</label>
                  <select
                    value={editForm.shelterId}
                    onChange={(e) => setEditForm({ ...editForm, shelterId: e.target.value })}
                    className={inputCls}
                  >
                    {!shelters.some((sh) => sh.shelterId === editForm.shelterId) && (
                      <option value={editForm.shelterId}>{editForm.shelterId}</option>
                    )}
                    {shelters.map((sh) => (
                      <option key={sh.shelterId} value={sh.shelterId}>{sh.shelterName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Photo */}
              <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-sky-500" />
                  <span>Pet photo:</span>
                </label>
                <input
                  type="file"
                  ref={editFileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'edit');
                  }}
                  accept="image/*"
                  className="hidden"
                />
                <div className="flex items-center gap-4">
                  {editForm.imageUrl && (
                    <img
                      src={editForm.imageUrl}
                      alt="Preview"
                      className="w-20 h-20 rounded-2xl object-cover ring-2 ring-sky-500 shadow-md shrink-0"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                  >
                    <Upload className="w-3 h-3" /> Choose another photo
                  </button>
                </div>
              </div>

              {/* Characteristics */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                {([
                  ['vaccinated', 'Vaccinated'],
                  ['sterilized', 'Neutered / Spayed'],
                  ['goodWithKids', 'Good with kids'],
                  ['goodWithPets', 'Good with pets'],
                  ['requiresYard', 'Requires yard'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1.5 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editForm[key]}
                      onChange={(e) => setEditForm({ ...editForm, [key]: e.target.checked })}
                      className="rounded text-sky-600"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block font-bold mb-1">Description & Traits:</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingPet(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {petToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-white">Confirm Delete Pet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong>{petToDelete.name}</strong> (#{petToDelete.petId}) from the database?
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setPetToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeletePet}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
