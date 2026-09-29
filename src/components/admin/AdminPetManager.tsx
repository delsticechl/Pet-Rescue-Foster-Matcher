import React, { useState, useRef } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Stethoscope,
  Heart,
  Sparkles,
  Check,
  X,
  Eye,
  ShieldCheck,
  Building2,
  Tag,
  Zap,
  Info,
  Layers,
  LayoutGrid,
  List,
  AlertTriangle,
  QrCode,
  FileSpreadsheet,
  Download,
  Upload,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { Pet, Shelter, PetSpecies, PetHealthStatus, EnergyLevel, AdoptionStatus, User } from '../../types';
import { api } from '../../services/api';

interface AdminPetManagerProps {
  pets: Pet[];
  shelters: Shelter[];
  currentUser: User;
  onRefresh: () => void;
  onOpenMedicalModal: (pet: Pet) => void;
  onOpenQrCode?: (pet: Pet) => void;
  onOpenCsvExport?: () => void;
}

const SAMPLE_PET_IMAGES = [
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1561037404-61cd46aa615b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=800&q=80',
];

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const AdminPetManager: React.FC<AdminPetManagerProps> = ({
  pets,
  shelters,
  currentUser,
  onRefresh,
  onOpenMedicalModal,
  onOpenQrCode,
  onOpenCsvExport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [shelterFilter, setShelterFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // File Input References for Uploading from Computer
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Add Pet Modal State
  const [openAddModal, setOpenAddModal] = useState(false);
  const [newPet, setNewPet] = useState({
    name: '',
    species: 'Dog' as PetSpecies,
    breed: 'Mixed Breed',
    ageMonths: 12,
    gender: 'Male' as 'Male' | 'Female' | 'Đực' | 'Cái',
    healthStatus: 'Healthy' as PetHealthStatus,
    vaccinated: true,
    sterilized: true,
    adoptionStatus: 'Ready' as AdoptionStatus,
    energyLevel: 'Medium' as EnergyLevel,
    goodWithKids: true,
    goodWithPets: true,
    requiresYard: false,
    description: 'Recently rescued, friendly and looking for a caring forever family.',
    shelterId: shelters[0]?.shelterId || 'SHL-01',
    imageUrl: SAMPLE_PET_IMAGES[0],
    fileName: 'sample_pet_1.jpg',
    fileSize: 185000,
    mimeType: 'image/jpeg',
    uploadSource: 'LocalUpload' as 'LocalUpload' | 'ExternalURL',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Pet Modal State
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  // Delete Pet Confirmation Modal State
  const [petToDelete, setPetToDelete] = useState<Pet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Local File Upload Handler
  const handleFileUpload = (file: File, target: 'add' | 'edit') => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, JPEG, WEBP, or GIF)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (target === 'add') {
        setNewPet((prev) => ({
          ...prev,
          imageUrl: dataUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          uploadSource: 'LocalUpload',
        }));
      } else if (editForm) {
        setEditForm((prev: any) => ({
          ...prev,
          imageUrl: dataUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          uploadSource: 'LocalUpload',
        }));
      }
    };
    reader.onerror = () => {
      alert('Failed to read image file from your device.');
    };
    reader.readAsDataURL(file);
  };

  // Filtering
  const filteredPets = pets.filter((p) => {
    if (speciesFilter !== 'all') {
      const sp = speciesFilter.toLowerCase();
      const petSp = p.species.toLowerCase();
      const match = (sp === petSp) ||
        ((sp === 'dog' || sp === 'chó') && (petSp === 'dog' || petSp === 'chó')) ||
        ((sp === 'cat' || sp === 'mèo') && (petSp === 'cat' || petSp === 'mèo')) ||
        ((sp === 'other' || sp === 'khác') && (petSp === 'other' || petSp === 'khác'));
      if (!match) return false;
    }
    if (statusFilter !== 'all' && p.adoptionStatus !== statusFilter) return false;
    if (shelterFilter !== 'all' && p.shelterId !== shelterFilter) return false;
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
    const imgObj = pet.images && pet.images[0];

    setEditingPet(pet);
    setEditForm({
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      ageMonths: pet.ageMonths,
      gender: pet.gender,
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
      fileName: imgObj?.fileName || 'existing_photo.jpg',
      fileSize: imgObj?.fileSize,
      mimeType: imgObj?.mimeType || 'image/jpeg',
      uploadSource: imgObj?.uploadSource || 'LocalUpload',
    });
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createPet({ ...newPet, requesterRole: currentUser.role }, currentUser.role);
      setOpenAddModal(false);
      onRefresh();
      // Reset form
      setNewPet({
        name: '',
        species: 'Dog',
        breed: 'Mixed Breed',
        ageMonths: 12,
        gender: 'Male',
        healthStatus: 'Healthy',
        vaccinated: true,
        sterilized: true,
        adoptionStatus: 'Ready',
        energyLevel: 'Medium',
        goodWithKids: true,
        goodWithPets: true,
        requiresYard: false,
        description: 'Recently rescued, friendly and looking for a caring forever family.',
        shelterId: shelters[0]?.shelterId || 'SHL-01',
        imageUrl: SAMPLE_PET_IMAGES[0],
        fileName: 'sample_pet_1.jpg',
        fileSize: 185000,
        mimeType: 'image/jpeg',
        uploadSource: 'LocalUpload',
      });
      alert(`Pet profile for ${newPet.name} published successfully!`);
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
      await api.updatePet(editingPet.petId, { ...editForm, requesterRole: currentUser.role }, currentUser.role);
      setEditingPet(null);
      setEditForm(null);
      onRefresh();
      alert(`Pet profile for ${editForm.name} updated successfully!`);
    } catch (err: any) {
      alert(err.message || 'Error updating pet profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (petId: string, newStatus: AdoptionStatus) => {
    try {
      await api.updatePet(petId, { adoptionStatus: newStatus, requesterRole: currentUser.role }, currentUser.role);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update adoption status');
    }
  };

  const handleDeletePet = async () => {
    if (!petToDelete) return;
    setIsDeleting(true);
    try {
      await api.deletePet(petToDelete.petId, currentUser.role);
      setPetToDelete(null);
      onRefresh();
      alert(`Pet record #${petToDelete.petId} deleted successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to delete pet record');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Header & Publish Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              Pet Management Center
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Publish new pet profiles with device photo upload, manage medical records, update shelter assignments, and track adoption statuses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onOpenCsvExport && (
            <button
              id="btn-admin-pet-export-csv"
              onClick={onOpenCsvExport}
              className="px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs flex items-center justify-center gap-2 transition-transform hover:scale-105"
              title="Export pet dataset and adoption metrics to CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Export CSV Report</span>
            </button>
          )}

          <button
            id="btn-admin-publish-pet"
            onClick={() => setOpenAddModal(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 transition-transform hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>+ Publish New Pet</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
          <div className="text-slate-400 font-semibold uppercase text-[10px]">Total Pets</div>
          <div className="text-xl font-black text-slate-800 dark:text-white">{pets.length} animals</div>
          <div className="text-sky-600 dark:text-sky-400 font-medium text-[11px]">3NF Standardized</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
          <div className="text-slate-400 font-semibold uppercase text-[10px]">Ready for Adoption</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            {pets.filter((p) => p.adoptionStatus === 'Ready').length} pets
          </div>
          <div className="text-slate-400 text-[11px]">Eligible for adoption</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
          <div className="text-slate-400 font-semibold uppercase text-[10px]">Pending / Interviewing</div>
          <div className="text-xl font-black text-amber-500">
            {pets.filter((p) => p.adoptionStatus === 'Pending').length} pets
          </div>
          <div className="text-slate-400 text-[11px]">Applications in review</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
          <div className="text-slate-400 font-semibold uppercase text-[10px]">Adopted to Homes</div>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
            {pets.filter((p) => p.adoptionStatus === 'Adopted').length} pets
          </div>
          <div className="text-indigo-500 font-medium text-[11px]">Successful adoptions</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, PET-ID, breed, or species..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Species */}
          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="all">Species: All</option>
            <option value="Dog">Dogs</option>
            <option value="Cat">Cats</option>
            <option value="Other">Other Animals</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="all">Status: All</option>
            <option value="Ready">Ready for Adoption</option>
            <option value="Pending">Pending Review</option>
            <option value="Adopted">Adopted</option>
            <option value="Fostered">Fostered</option>
          </select>

          {/* Shelter */}
          <select
            value={shelterFilter}
            onChange={(e) => setShelterFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 font-medium max-w-[160px] truncate"
          >
            <option value="all">Shelter: All</option>
            {shelters.map((s) => (
              <option key={s.shelterId} value={s.shelterId}>{s.shelterName}</option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-sky-500 text-white' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-sky-500 text-white' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}
              title="Grid View"
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
                  <th className="px-4 py-3">Pet & ID</th>
                  <th className="px-4 py-3">Species / Breed</th>
                  <th className="px-4 py-3">Age & Gender</th>
                  <th className="px-4 py-3">Assigned Shelter</th>
                  <th className="px-4 py-3">Health Status</th>
                  <th className="px-4 py-3">Adoption Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredPets.map((p) => {
                  const shelter = shelters.find((s) => s.shelterId === p.shelterId);
                  const img = p.primaryImage || (p.images && p.images[0]?.imageUrl) || SAMPLE_PET_IMAGES[0];
                  const imgObj = p.images && p.images[0];

                  return (
                    <tr key={p.petId} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      {/* Name & Photo */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={img}
                            alt={p.name}
                            className="w-11 h-11 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{p.name}</span>
                              <span className="font-mono text-[10px] text-sky-600 dark:text-sky-400 font-bold px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800">
                                {p.petId}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                              {p.vaccinated && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Vaccinated</span>
                              )}
                              {p.sterilized && (
                                <span className="text-indigo-600 dark:text-indigo-400 font-medium ml-1">✓ Neutered</span>
                              )}
                              {imgObj?.fileName && (
                                <span className="text-slate-400 ml-1 truncate max-w-[100px]" title={imgObj.fileName}>
                                  📁 {imgObj.fileName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Species & Breed */}
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        <div className="font-semibold">{p.species === 'Chó' ? 'Dog' : p.species === 'Mèo' ? 'Cat' : p.species}</div>
                        <div className="text-slate-400 text-[11px]">{p.breed}</div>
                      </td>

                      {/* Age & Gender */}
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        <div>
                          {p.ageMonths >= 12
                            ? `${(p.ageMonths / 12).toFixed(1).replace('.0', '')} yrs`
                            : `${p.ageMonths} mos`}
                        </div>
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                            p.gender === 'Đực' || p.gender === 'Male'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {p.gender === 'Đực' ? 'Male' : p.gender === 'Cái' ? 'Female' : p.gender}
                        </span>
                      </td>

                      {/* Shelter */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <div className="font-medium truncate max-w-[140px]" title={shelter?.shelterName}>
                          {shelter?.shelterName || p.shelterId}
                        </div>
                        <div className="text-[10px] text-slate-400">{shelter?.address?.split(',')[0]}</div>
                      </td>

                      {/* Health Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                            p.healthStatus === 'Healthy' || p.healthStatus === 'Bình thường'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {p.healthStatus === 'Bình thường' ? 'Healthy' : p.healthStatus}
                        </span>
                      </td>

                      {/* Adoption Status Selector */}
                      <td className="px-4 py-3">
                        <select
                          value={p.adoptionStatus}
                          onChange={(e) => handleQuickStatusChange(p.petId, e.target.value as AdoptionStatus)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
                            p.adoptionStatus === 'Ready'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                              : p.adoptionStatus === 'Pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                              : p.adoptionStatus === 'Adopted'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'
                              : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <option value="Ready">Ready for Adoption</option>
                          <option value="Pending">Pending Review</option>
                          <option value="Adopted">Adopted</option>
                          <option value="Fostered">Fostered</option>
                        </select>
                      </td>

                      {/* Admin Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onOpenQrCode && (
                            <button
                              onClick={() => onOpenQrCode(p)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                              title="Generate QR Code Standee"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-sky-950/50 text-sky-600 dark:text-sky-400"
                            title="Edit pet profile"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onOpenMedicalModal(p)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                            title="Add medical record & vaccination"
                          >
                            <Stethoscope className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPetToDelete(p)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                            title="Delete pet profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPets.map((p) => {
            const shelter = shelters.find((s) => s.shelterId === p.shelterId);
            const img = p.primaryImage || (p.images && p.images[0]?.imageUrl) || SAMPLE_PET_IMAGES[0];

            return (
              <div
                key={p.petId}
                className="bg-white dark:bg-slate-800 rounded-3xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-100 dark:bg-slate-900">
                  <img src={img} alt={p.name} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-xs">
                    {p.petId}
                  </span>
                  <span
                    className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs ${
                      p.adoptionStatus === 'Ready'
                        ? 'bg-emerald-500/90 text-white'
                        : p.adoptionStatus === 'Pending'
                        ? 'bg-amber-500/90 text-white'
                        : 'bg-indigo-500/90 text-white'
                    }`}
                  >
                    {p.adoptionStatus}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">{p.name}</h3>
                    <span className="text-slate-400">
                      {p.gender === 'Đực' ? 'Male' : p.gender === 'Cái' ? 'Female' : p.gender} • {p.species === 'Chó' ? 'Dog' : p.species === 'Mèo' ? 'Cat' : p.species}
                    </span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                    {p.breed} • {p.ageMonths >= 12 ? `${(p.ageMonths / 12).toFixed(1).replace('.0', '')} yrs old` : `${p.ageMonths} mos old`}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                    <Building2 className="w-3 h-3 text-sky-500" />
                    <span>{shelter?.shelterName || p.shelterId}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                  {onOpenQrCode && (
                    <button
                      onClick={() => onOpenQrCode(p)}
                      className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-semibold text-xs flex items-center justify-center"
                      title="Generate QR Code Standee"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-sky-50 hover:text-sky-600 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => onOpenMedicalModal(p)}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center justify-center gap-1"
                  >
                    <Stethoscope className="w-3.5 h-3.5" /> Medical
                  </button>
                  <button
                    onClick={() => setPetToDelete(p)}
                    className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD NEW PET MODAL */}
      {openAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-500 text-white">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    Publish New Pet (PETS & PET_IMAGES Tables)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Publisher Role: <strong className="text-sky-600 dark:text-sky-400">{currentUser.fullName}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setOpenAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pet Name (*):</label>
                  <input
                    type="text"
                    value={newPet.name}
                    onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    placeholder="e.g. Milo, Bella, Buster..."
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Species (*):</label>
                  <select
                    value={newPet.species}
                    onChange={(e) => setNewPet({ ...newPet, species: e.target.value as PetSpecies })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
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
                    placeholder="e.g. Golden Mix, Corgi..."
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Adoption Status:</label>
                  <select
                    value={newPet.adoptionStatus}
                    onChange={(e) => setNewPet({ ...newPet, adoptionStatus: e.target.value as AdoptionStatus })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="Ready">Ready for Adoption</option>
                    <option value="Pending">Pending Review</option>
                    <option value="Adopted">Adopted</option>
                    <option value="Fostered">Fostered</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Shelter (*):</label>
                  <select
                    value={newPet.shelterId}
                    onChange={(e) => setNewPet({ ...newPet, shelterId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    {shelters.map((s) => (
                      <option key={s.shelterId} value={s.shelterId}>{s.shelterName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LOCAL PHOTO UPLOAD FROM COMPUTER */}
              <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-sky-500" />
                    <span>Upload Pet Photo from Computer:</span>
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Device File Picker Enabled
                  </span>
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={addFileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'add');
                  }}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  className="hidden"
                />

                {/* Upload Dropzone / Preview Area */}
                <div
                  onClick={() => addFileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileUpload(file, 'add');
                  }}
                  className="border-2 border-dashed border-sky-300 dark:border-sky-700 hover:border-sky-500 dark:hover:border-sky-500 rounded-2xl p-4 bg-white dark:bg-slate-800 text-center cursor-pointer transition-colors shadow-xs"
                >
                  {newPet.imageUrl ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                      <img
                        src={newPet.imageUrl}
                        alt="Preview"
                        className="w-24 h-24 rounded-2xl object-cover ring-2 ring-sky-500 shadow-md shrink-0"
                      />
                      <div className="text-left space-y-1.5 flex-1 min-w-0">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          <Check className="w-3 h-3" /> Image Selected
                        </div>
                        <div className="font-semibold text-slate-800 dark:text-white text-xs truncate max-w-xs">
                          {newPet.fileName || 'selected_pet_photo.png'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {newPet.fileSize ? `Size: ${formatBytes(newPet.fileSize)} • ` : ''}
                          {newPet.mimeType || 'image/jpeg'} • Stored as MySQL LONGTEXT
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addFileInputRef.current?.click();
                            }}
                            className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                          >
                            <Upload className="w-3 h-3" /> Choose Another Photo
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewPet((prev) => ({
                                ...prev,
                                imageUrl: '',
                                fileName: undefined,
                                fileSize: undefined,
                              }));
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-[11px] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-3">
                      <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 flex items-center justify-center mx-auto">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        Click to choose a photo from your computer or drag and drop here
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Supports PNG, JPG, JPEG, WEBP, GIF files (converted and saved directly to the database)
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick Sample Presets Alternative */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-slate-400 shrink-0">Or pick a sample photo:</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {SAMPLE_PET_IMAGES.map((imgUrl, i) => (
                      <img
                        key={i}
                        src={imgUrl}
                        alt=""
                        onClick={() =>
                          setNewPet((prev) => ({
                            ...prev,
                            imageUrl: imgUrl,
                            fileName: `sample_pet_${i + 1}.jpg`,
                            fileSize: 185000,
                            uploadSource: 'ExternalURL',
                          }))
                        }
                        className={`w-8 h-8 rounded-lg object-cover cursor-pointer transition-transform hover:scale-110 shrink-0 ${
                          newPet.imageUrl === imgUrl ? 'ring-2 ring-sky-500 scale-105' : 'opacity-60'
                        }`}
                      />
                    ))}
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
                  <span>Good with Kids</span>
                </label>
                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPet.requiresYard}
                    onChange={(e) => setNewPet({ ...newPet, requiresYard: e.target.checked })}
                    className="rounded text-sky-600"
                  />
                  <span>Requires Yard</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rescue Story & Description:</label>
                <textarea
                  rows={2}
                  value={newPet.description}
                  onChange={(e) => setNewPet({ ...newPet, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  placeholder="Tell adopters about this pet's rescue background and personality..."
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
                  id="btn-confirm-publish-pet"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Pet Profile (Save to Database)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PET MODAL */}
      {editingPet && editForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-500 text-white">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    Edit Pet Profile: {editingPet.name} ({editingPet.petId})
                  </h3>
                  <p className="text-xs text-slate-400">Update relational records in PETS and PET_IMAGES tables</p>
                </div>
              </div>
              <button onClick={() => setEditingPet(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pet Name:</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Species:</label>
                  <select
                    value={editForm.species}
                    onChange={(e) => setEditForm({ ...editForm, species: e.target.value as PetSpecies })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Breed:</label>
                  <input
                    type="text"
                    value={editForm.breed}
                    onChange={(e) => setEditForm({ ...editForm, breed: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Age (Months):</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.ageMonths}
                    onChange={(e) => setEditForm({ ...editForm, ageMonths: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Gender:</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Adoption Status:</label>
                  <select
                    value={editForm.adoptionStatus}
                    onChange={(e) => setEditForm({ ...editForm, adoptionStatus: e.target.value as AdoptionStatus })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="Ready">Ready for Adoption</option>
                    <option value="Pending">Pending Review</option>
                    <option value="Adopted">Adopted</option>
                    <option value="Fostered">Fostered</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Shelter:</label>
                  <select
                    value={editForm.shelterId}
                    onChange={(e) => setEditForm({ ...editForm, shelterId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    {shelters.map((s) => (
                      <option key={s.shelterId} value={s.shelterId}>{s.shelterName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LOCAL PHOTO UPLOAD IN EDIT MODAL */}
              <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-sky-500" />
                    <span>Update Photo from Computer:</span>
                  </label>
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                    Device File Upload
                  </span>
                </div>

                <input
                  type="file"
                  ref={editFileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'edit');
                  }}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  className="hidden"
                />

                <div
                  onClick={() => editFileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileUpload(file, 'edit');
                  }}
                  className="border-2 border-dashed border-sky-300 dark:border-sky-700 hover:border-sky-500 rounded-2xl p-4 bg-white dark:bg-slate-800 text-center cursor-pointer transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                    <img
                      src={editForm.imageUrl}
                      alt="Current photo"
                      className="w-24 h-24 rounded-2xl object-cover ring-2 ring-sky-500 shadow-md shrink-0"
                    />
                    <div className="text-left space-y-1 flex-1 min-w-0">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        <Check className="w-3 h-3" /> Photo Attached
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-white text-xs truncate max-w-xs">
                        {editForm.fileName || 'current_pet_photo.png'}
                      </div>
                      {editForm.fileSize && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          Size: {formatBytes(editForm.fileSize)} • {editForm.mimeType || 'image/jpeg'}
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            editFileInputRef.current?.click();
                          }}
                          className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3" /> Select New Photo from Computer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sample thumbnails row */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-slate-400 shrink-0">Preset library:</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {SAMPLE_PET_IMAGES.map((imgUrl, i) => (
                      <img
                        key={i}
                        src={imgUrl}
                        alt=""
                        onClick={() =>
                          setEditForm((prev: any) => ({
                            ...prev,
                            imageUrl: imgUrl,
                            fileName: `preset_pet_${i + 1}.jpg`,
                            uploadSource: 'ExternalURL',
                          }))
                        }
                        className={`w-8 h-8 rounded-lg object-cover cursor-pointer transition-transform hover:scale-110 shrink-0 ${
                          editForm.imageUrl === imgUrl ? 'ring-2 ring-sky-500 scale-105' : 'opacity-60'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.vaccinated}
                    onChange={(e) => setEditForm({ ...editForm, vaccinated: e.target.checked })}
                    className="rounded text-sky-600"
                  />
                  <span>Vaccinated</span>
                </label>
                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.sterilized}
                    onChange={(e) => setEditForm({ ...editForm, sterilized: e.target.checked })}
                    className="rounded text-sky-600"
                  />
                  <span>Neutered / Spayed</span>
                </label>
                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.goodWithKids}
                    onChange={(e) => setEditForm({ ...editForm, goodWithKids: e.target.checked })}
                    className="rounded text-sky-600"
                  />
                  <span>Good with Kids</span>
                </label>
                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.requiresYard}
                    onChange={(e) => setEditForm({ ...editForm, requiresYard: e.target.checked })}
                    className="rounded text-sky-600"
                  />
                  <span>Requires Yard</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rescue Story & Notes:</label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
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
                  className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes (Update)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {petToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 text-xs text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Confirm Deletion of Pet Record?
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Are you sure you want to delete the record for <strong className="text-slate-800 dark:text-slate-200">{petToDelete.name} ({petToDelete.petId})</strong> from the database?
              </p>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPetToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePet}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md disabled:opacity-50"
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
