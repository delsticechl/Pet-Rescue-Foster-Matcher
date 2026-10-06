import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Stethoscope,
  Heart,
  FileText,
  Mail,
  BarChart3,
  Sparkles,
  Layers,
  CheckCircle2,
  Lock,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import {
  AdoptionApplication,
  Pet,
  Shelter,
  User as UserType,
  EmailNotificationLog,
} from '../types';
import { api } from '../services/api';
import { AdminAccessGuard } from './admin/AdminAccessGuard';
import { AdminPetManager } from './admin/AdminPetManager';
import { AdminApplicationsTable } from './admin/AdminApplicationsTable';
import { AdminMedicalRecords } from './admin/AdminMedicalRecords';
import { AdminEmailLogsHub } from './admin/AdminEmailLogsHub';
import { AdminShelterAnalytics } from './admin/AdminShelterAnalytics';
import { PetQrCodeModal } from './PetQrCodeModal';
import { AdminCsvExportModal } from './admin/AdminCsvExportModal';
import { exportPetAndApplicationStatsCsv } from '../utils/csvExporter';

interface AdminDashboardProps {
  currentUser: UserType;
  onRefreshPets: () => void;
  onSwitchUser?: (user: UserType) => void;
  onOpenAuthModal?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onRefreshPets,
  onSwitchUser,
  onOpenAuthModal,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'pets' | 'applications' | 'medical' | 'emailLogs' | 'analytics'>('pets');
  const [applications, setApplications] = useState<AdoptionApplication[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailNotificationLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected pet for medical modal & QR modal
  const [selectedPetForMedical, setSelectedPetForMedical] = useState<Pet | null>(null);
  const [selectedPetForQr, setSelectedPetForQr] = useState<Pet | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

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
      const [apps, pList, shList, eLogs] = await Promise.all([
        api.getApplications(),
        api.getPets(),
        api.getShelters(),
        api.getEmailLogs(),
      ]);
      setApplications(apps);
      setPets(pList);
      setShelters(shList);
      setEmailLogs(eLogs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefreshAll = () => {
    fetchData();
    onRefreshPets();
  };

  // Check if current user is an Admin
  const isAdmin = currentUser.role === 'Admin';

  // If user is not Admin, do not render dashboard interface
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
            <Mail className="w-5 h-5" />
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

      {/* Top Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <ShieldCheck className="w-3.5 h-3.5" /> Administrative Hub & Pet Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Administrator Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Logged in as: <strong className="text-sky-400">{currentUser.fullName}</strong> ({currentUser.role}).
            Full authority to publish pet profiles with local photo uploads, manage clinical records, and approve adoption transactions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-admin-quick-export-csv"
            onClick={() => {
              const res = exportPetAndApplicationStatsCsv(pets, applications, shelters);
              showToast(
                'CSV Downloaded Successfully!',
                `Exported ${res.rowCount} pet records and application metrics to ${res.fileName}`
              );
            }}
            className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            title="Download quick summary CSV report"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Quick CSV Download</span>
          </button>

          <button
            id="btn-admin-open-csv-modal"
            onClick={() => setIsCsvModalOpen(true)}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Detailed CSV Report</span>
          </button>

          <div className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 font-mono">
            Auth: <strong className="text-emerald-400">{currentUser.role} Access</strong>
          </div>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs border-b border-slate-200 dark:border-slate-800">
        <button
          id="btn-admin-tab-pets"
          onClick={() => setActiveAdminTab('pets')}
          className={`px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeAdminTab === 'pets'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Manage & Publish Pets ({pets.length})</span>
        </button>

        <button
          id="btn-admin-tab-applications"
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
          id="btn-admin-tab-medical"
          onClick={() => setActiveAdminTab('medical')}
          className={`px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeAdminTab === 'medical'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Clinical & Vaccination Logs</span>
        </button>

        <button
          id="btn-admin-tab-emaillogs"
          onClick={() => setActiveAdminTab('emailLogs')}
          className={`px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeAdminTab === 'emailLogs'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Simulated SMTP Email Hub ({emailLogs.length})</span>
        </button>

        <button
          id="btn-admin-tab-analytics"
          onClick={() => setActiveAdminTab('analytics')}
          className={`px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeAdminTab === 'analytics'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics & Shelter KPIs</span>
        </button>
      </div>

      {/* Tab 1: Pet Management Center */}
      {activeAdminTab === 'pets' && (
        <AdminPetManager
          pets={pets}
          shelters={shelters}
          currentUser={currentUser}
          onRefresh={handleRefreshAll}
          onOpenMedicalModal={(pet) => setSelectedPetForMedical(pet)}
          onOpenQrCode={(pet) => setSelectedPetForQr(pet)}
          onOpenCsvExport={() => setIsCsvModalOpen(true)}
        />
      )}

      {/* Tab 2: Applications Review Table */}
      {activeAdminTab === 'applications' && (
        <AdminApplicationsTable
          applications={applications}
          currentUser={currentUser}
          onRefresh={handleRefreshAll}
          showToast={showToast}
          onOpenCsvExport={() => setIsCsvModalOpen(true)}
        />
      )}

      {/* Tab 3: Medical Records & Clinical Follow-ups */}
      {activeAdminTab === 'medical' && (
        <AdminMedicalRecords
          pets={pets}
          selectedPetForModal={selectedPetForMedical}
          onCloseModal={() => setSelectedPetForMedical(null)}
          onRefresh={handleRefreshAll}
          showToast={showToast}
        />
      )}

      {/* Tab 4: Simulated Email Notification Hub */}
      {activeAdminTab === 'emailLogs' && (
        <AdminEmailLogsHub
          emailLogs={emailLogs}
          onRefresh={handleRefreshAll}
        />
      )}

      {/* Tab 5: Shelter Analytics & SQL Reports */}
      {activeAdminTab === 'analytics' && (
        <AdminShelterAnalytics
          pets={pets}
          applications={applications}
          shelters={shelters}
          onOpenCsvExport={() => setIsCsvModalOpen(true)}
        />
      )}

      {/* QR Code Standee Modal */}
      {selectedPetForQr && (
        <PetQrCodeModal
          pet={selectedPetForQr}
          onClose={() => setSelectedPetForQr(null)}
          showToast={showToast}
        />
      )}

      {/* CSV Export Modal */}
      {isCsvModalOpen && (
        <AdminCsvExportModal
          isOpen={isCsvModalOpen}
          onClose={() => setIsCsvModalOpen(false)}
          pets={pets}
          applications={applications}
          shelters={shelters}
          showToast={showToast}
        />
      )}
    </div>
  );
};
