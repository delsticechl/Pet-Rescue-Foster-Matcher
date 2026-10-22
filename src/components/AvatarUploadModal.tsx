import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onAvatarUpdated: (newAvatarUrl: string) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?auto=format&fit=crop&w=300&q=80',
];

export const AvatarUploadModal: React.FC<AvatarUploadModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAvatarUpdated,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>(currentUser.avatarUrl || PRESET_AVATARS[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WEBP, GIF).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file size must be less than 10MB.');
      return;
    }

    setError(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleSaveAvatar = async () => {
    if (!previewUrl) return;
    setIsSubmitting(true);
    setError(null);

    try {
      let finalAvatarUrl = previewUrl;

      // If user chose a local file, upload via uploadImage endpoint to get optimized URL if available
      if (selectedFile) {
        try {
          const uploadRes = await api.uploadImage(selectedFile);
          if (uploadRes?.imageUrl) {
            finalAvatarUrl = uploadRes.imageUrl;
          }
        } catch {
          // If upload endpoint fails, fallback directly to base64 previewUrl
          finalAvatarUrl = previewUrl;
        }
      }

      await api.updateUserAvatar(currentUser.userId, finalAvatarUrl);
      onAvatarUpdated(finalAvatarUrl);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update avatar. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                Change Profile Avatar
              </h2>
              <p className="text-xs text-slate-400">
                Upload a custom photo from your computer or choose a preset
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Avatar & Preview */}
          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
            <div className="relative group">
              <img
                src={previewUrl}
                alt="Avatar preview"
                className="w-28 h-28 rounded-full object-cover ring-4 ring-sky-500/20 shadow-xl border-2 border-white dark:border-slate-700"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-slate-900/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-semibold transition-opacity"
              >
                <Camera className="w-6 h-6 mb-1" />
                Browse
              </button>
            </div>

            <div className="text-center sm:text-left space-y-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300">
                {currentUser.role === 'Admin' ? 'Admin / Staff' : 'Adopter'}
              </span>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                {currentUser.fullName}
              </h3>
              <p className="text-xs text-slate-400">{currentUser.email}</p>
              {selectedFile && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>

          {/* File Upload Zone */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileChange(f);
              }}
            />
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-sky-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Click or drag & drop an image here
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Supports JPG, PNG, WEBP, or GIF (max 10MB)
              </p>
              <button
                type="button"
                className="mt-3 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors inline-flex items-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Select file from computer
              </button>
            </div>
          </div>

          {/* Preset Avatars */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Or pick a quick avatar:
              </span>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPreviewUrl(url);
                    setSelectedFile(null);
                    setError(null);
                  }}
                  className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all hover:scale-105 ${
                    previewUrl === url
                      ? 'border-sky-500 ring-2 ring-sky-500/30'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                  {previewUrl === url && (
                    <div className="absolute inset-0 bg-sky-500/40 flex items-center justify-center text-white">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSaveAvatar}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save New Avatar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
