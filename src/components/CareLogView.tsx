import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Plus, Calendar, Scale, Smile, Image as ImageIcon, Heart, CheckCircle2, X, Search, RotateCcw, Upload, Check } from 'lucide-react';
import { CareLog, User, Pet } from '../types';
import { api } from '../services/api';

interface CareLogViewProps {
  currentUser: User;
  pets: Pet[];
}

export const CareLogView: React.FC<CareLogViewProps> = ({ currentUser, pets }) => {
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const logFileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    petId: '',
    note: '',
    imageUrl: 'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?auto=format&fit=crop&w=800&q=80',
    fileName: 'care_photo_1.jpg',
    healthUpdate: 'Eating well, energetic, playful, and adjusting smoothly to the home environment.',
    weightKg: 4.5,
    mood: 'Happy & Active',
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getCareLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, JPEG, WEBP, GIF)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        imageUrl: reader.result as string,
        fileName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase().trim();
    const matchPetName = log.petName?.toLowerCase().includes(query) ?? false;
    const matchNote = log.note?.toLowerCase().includes(query) ?? false;
    const matchHealth = log.healthUpdate?.toLowerCase().includes(query) ?? false;
    const matchAdopter = log.adopterName?.toLowerCase().includes(query) ?? false;
    return matchPetName || matchNote || matchHealth || matchAdopter;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.petId || !formData.note) return;

    try {
      await api.createCareLog({
        ...formData,
        userId: currentUser.userId,
      });
      setOpenCreateModal(false);
      setFormData({
        petId: pets[0]?.petId || '',
        note: '',
        imageUrl: 'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?auto=format&fit=crop&w=800&q=80',
        fileName: 'care_photo_1.jpg',
        healthUpdate: 'Eating well, energetic, playful, and adjusting smoothly to the home environment.',
        weightKg: 4.5,
        mood: 'Happy & Active',
      });
      fetchLogs();
    } catch (err: any) {
      alert(err.message || 'Error creating care log');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-md">
            <Heart className="w-3.5 h-3.5 fill-current text-rose-300" /> CARE_LOGS Tracking Board
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Post-Adoption Care Logs
          </h1>
          <p className="text-xs sm:text-sm text-sky-100 max-w-xl">
            Where adoptive families upload photos, log weight, and report health milestones to ensure lifelong wellbeing.
          </p>
        </div>

        <button
          id="btn-open-create-carelog"
          onClick={() => {
            if (pets.length > 0 && !formData.petId) setFormData((prev) => ({ ...prev, petId: pets[0].petId }));
            setOpenCreateModal(true);
          }}
          className="px-5 py-3 rounded-2xl bg-white text-sky-700 hover:bg-sky-50 font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-105 shrink-0"
        >
          <Plus className="w-4 h-4" /> New Care Log
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="care-log-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by pet name, adopter, notes, or health status..."
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition-all"
          />
          {searchTerm && (
            <button
              id="care-log-search-clear"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            Showing <strong className="text-slate-800 dark:text-white font-bold">{filteredLogs.length}</strong> of {logs.length} logs
          </span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1 transition-colors text-[11px]"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Log Feed */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Loading care logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500">No care logs posted yet. Be the first to share an update!</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-3">
          <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
            No care logs matched "{searchTerm}"
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try searching for a different pet name or broader keywords.
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 transition-colors inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> View All Logs
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredLogs.map((log) => (
            <div
              key={log.logId}
              id={`care-log-card-${log.logId}`}
              className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col"
            >
              {/* Photo */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                <img
                  src={log.imageUrl}
                  alt="care log photo"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/60 backdrop-blur-md text-white">
                    {log.petName}
                  </span>
                  {log.mood && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/90 text-white backdrop-blur-md flex items-center gap-1">
                      <Smile className="w-3 h-3" /> {log.mood}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-3 right-3 text-white text-[11px] font-medium bg-black/50 backdrop-blur-md px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {log.logDate}
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed italic">
                    "{log.note}"
                  </p>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                    <div className="text-[11px] text-slate-400 font-semibold uppercase">Health Status:</div>
                    <div className="text-slate-600 dark:text-slate-300">{log.healthUpdate}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {log.adopterName || 'Adopter'}
                    </span>
                  </div>
                  {log.weightKg && (
                    <span className="flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded-md">
                      <Scale className="w-3.5 h-3.5" /> {log.weightKg} kg
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Care Log Modal */}
      {openCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-500" /> New Care Log Entry
              </h3>
              <button onClick={() => setOpenCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Pet:
                </label>
                <select
                  value={formData.petId}
                  onChange={(e) => setFormData({ ...formData, petId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  required
                >
                  <option value="">-- Choose Pet --</option>
                  {pets.map((p) => (
                    <option key={p.petId} value={p.petId}>{p.name} ({p.petId})</option>
                  ))}
                </select>
              </div>

              {/* Photo Upload from Computer */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pet Photo (Upload from Computer):
                </label>
                <input
                  type="file"
                  ref={logFileInputRef}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                  className="hidden"
                />
                <div
                  onClick={() => logFileInputRef.current?.click()}
                  className="border-2 border-dashed border-sky-300 dark:border-sky-700 hover:border-sky-500 rounded-2xl p-3 bg-sky-50/50 dark:bg-sky-950/30 text-center cursor-pointer transition-colors flex items-center justify-center gap-3"
                >
                  <img src={formData.imageUrl} alt="preview" className="w-12 h-12 rounded-xl object-cover ring-1 ring-sky-500" />
                  <div className="text-left text-xs">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5 text-sky-500" /> Choose Photo from Device
                    </div>
                    <div className="text-[11px] text-slate-400">{formData.fileName || 'Click to browse...'}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Current Weight (kg):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    value={formData.weightKg}
                    onChange={(e) => setFormData({ ...formData, weightKg: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mood / Behavior:
                  </label>
                  <select
                    value={formData.mood}
                    onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="Happy & Active">Happy & Active</option>
                    <option value="Calm & Relaxed">Calm & Relaxed</option>
                    <option value="A Bit Shy">A Bit Shy</option>
                    <option value="Energetic">Energetic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Health & Wellbeing Update:
                </label>
                <input
                  type="text"
                  value={formData.healthUpdate}
                  onChange={(e) => setFormData({ ...formData, healthUpdate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Daily Notes & Story:
                </label>
                <textarea
                  rows={2}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Share a story or recent progress..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setOpenCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold shadow-md"
                >
                  Publish Log Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
