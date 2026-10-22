import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Stethoscope,
  FileText,
  Bell,
  Layers,
  RefreshCw,
  Camera,
} from 'lucide-react';
import {
  AdoptionApplication,
  Pet,
  Shelter,
  User as UserType,
  InAppNotification,
} from '../types';
import { api } from '../services/api';
import { AdminPetManager } from './admin/AdminPetManager';
import { AdminApplicationsTable } from './admin/AdminApplicationsTable';
import { AdminMedicalRecords } from './admin/AdminMedicalRecords';
import { realtimeWs } from '../services/websocket';

interface AdminDashboardProps {
  currentUser: UserType;
  onRefreshPets: () => void;
  onSwitchUser?: (user: UserType) => void;
  onOpenAuthModal?: () => void;
  onOpenAvatarUpload?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onRefreshPets,
  onOpenAvatarUpload,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'pets' | 'applications' | 'medical' | 'notifications'>('pets');
  const [applications, setApplications] = useState<AdoptionApplication[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected pet for medical modal
  const [selectedPetForMedical, setSelectedPetForMedical] = useState<Pet | null>(null);

  // Toast Notification
  const [toastNotification, setToastNotification] = useState<{
    id: string;
    title: string;
    description: string;
  } | null>(null);

  const showToast = (title: string, description: string) => {
    setToastNotification({
      id: String(Date.now()),
      title,
      description,
    });
    setTimeout(() => {
      setToastNotification((prev) => (prev?.title === title ? null : prev));
    }, 6000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [apps, pList, shList, notifs] = await Promise.all([
        api.getApplications(),
        api.getPets(),
        api.getShelters(),
        api.getNotifications(),
      ]);
      setApplications(apps);
      setPets(pList);
      setShelters(shList);
      setNotifications(notifs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-Time WebSocket sync for Admin
  useEffect(() => {
    const unsubApp = realtimeWs.on('application:created', (payload) => {
      fetchData();
      showToast(
        'New Adoption Application Received! 📋',
        `Applicant: ${payload.data?.applicantName} applied to adopt ${payload.data?.petName || 'a pet'}.`
      );
    });

    const unsubPet = realtimeWs.on('pet:created', () => {
      fetchData();
    });

    const unsubCare = realtimeWs.on('care_log:created', (payload) => {
      showToast(
        'New Pet Care Log Shared! 📖',
        `Adopter ${payload.data?.authorName || 'User'} just shared a daily care update.`
      );
    });

    return () => {
      unsubApp();
      unsubPet();
      unsubCare();
    };
  }, []);

  const handleRefreshAll = () => {
    fetchData();
    onRefreshPets();
  };

  const isAdmin = currentUser.role === 'Admin';
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 relative">
      {/* Toast Notification */}
      {toastNotification && (
        <div
          id="admin-toast-notification"
          className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-sky-500/50 flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 mt-0.5 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-xs text-sky-300 flex items-center justify-between">
              <span>{toastNotification.title}</span>
              <button
                onClick={() => setToastNotification(null)}
                className="text-slate-400 hover:text-white ml-2 text-xs"
              >
                ✕
              </button>
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
              {toastNotification.description}
            </div>
          </div>
        </div>
      )}

      {/* Top Banner with Avatar Change Option */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-slate-800">
        <div className="flex items-center gap-5">
          <div className="relative group shrink-0">
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
              alt={currentUser.fullName}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-sky-500/40 shadow-lg"
            />
            {onOpenAvatarUpload && (
              <button
                onClick={onOpenAvatarUpload}
                title="Change Avatar from computer"
                className="absolute inset-0 rounded-2xl bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity"
              >
                <Camera className="w-4 h-4 mb-0.5" />
                Change
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
              <ShieldCheck className="w-3.5 h-3.5" /> Shelter Operations & Pet Management
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Admin & Staff Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Logged in as <strong className="text-sky-400">{currentUser.fullName}</strong> ({currentUser.role}). Full access to list pets, upload photos, manage medical records, and review adoption applications.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {onOpenAvatarUpload && (
            <button
              onClick={onOpenAvatarUpload}
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Change Photo</span>
            </button>
          )}

          <button
            onClick={handleRefreshAll}
            className="px-3.5 py-2 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Admin Management Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveAdminTab('pets')}
          className={`px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeAdminTab === 'pets'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Pet Management ({pets.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('applications')}
          className={`px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeAdminTab === 'applications'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Adoption Applications ({applications.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('medical')}
          className={`px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeAdminTab === 'medical'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Medical Records & Vaccines</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('notifications')}
          className={`px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeAdminTab === 'notifications'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications History ({notifications.length})</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeAdminTab === 'pets' && (
        <AdminPetManager
          pets={pets}
          shelters={shelters}
          currentUser={currentUser}
          onRefresh={handleRefreshAll}
          onOpenMedicalModal={(pet) => {
            setSelectedPetForMedical(pet);
            setActiveAdminTab('medical');
          }}
        />
      )}

      {activeAdminTab === 'applications' && (
        <AdminApplicationsTable
          applications={applications}
          currentUser={currentUser}
          onRefresh={handleRefreshAll}
          showToast={showToast}
        />
      )}

      {activeAdminTab === 'medical' && (
        <AdminMedicalRecords
          pets={pets}
          currentUser={currentUser}
          preSelectedPet={selectedPetForMedical}
          onRefresh={handleRefreshAll}
          showToast={showToast}
        />
      )}

      {activeAdminTab === 'notifications' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-sky-500" />
                Live Web & Email Notification History
              </h3>
              <p className="text-xs text-slate-400">
                Logged notifications sent to adopters upon application decisions or updates
              </p>
            </div>
            <button
              onClick={handleRefreshAll}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No notifications generated yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {notifications.map((n) => (
                <div key={n.notificationId} className="py-3.5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                      {n.title}
                    </span>
                    <span className="text-[11px] text-slate-400">{n.createdAt?.slice(0, 19).replace('T', ' ')}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{n.message}</p>
                  {n.recipientEmail && (
                    <span className="inline-block text-[10px] text-sky-600 dark:text-sky-400 font-medium">
                      Recipient: {n.recipientEmail}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
