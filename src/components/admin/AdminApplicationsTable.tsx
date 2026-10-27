import React, { useState } from 'react';
import {
  FileText,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Mail,
  Send,
  User,
  X,
  Check,
} from 'lucide-react';
import {
  AdoptionApplication,
  User as UserType,
} from '../../types';
import { api } from '../../services/api';

interface AdminApplicationsTableProps {
  applications: AdoptionApplication[];
  currentUser: UserType;
  onRefresh: () => void;
  showToast: (title: string, description: string) => void;
}

export const AdminApplicationsTable: React.FC<AdminApplicationsTableProps> = ({
  applications,
  onRefresh,
  showToast,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredApplications = applications.filter((app) => {
    if (statusFilter === 'All') return true;
    return app.status === statusFilter;
  });

  const handleApprove = async (app: AdoptionApplication) => {
    const adminNotes = window.prompt(
      `Enter approval message for ${app.applicantName}:`,
      'Your application looks great! Please visit the shelter to finalize the adoption process.'
    );
    if (adminNotes === null) return;

    setProcessingId(app.applicationId);
    try {
      await api.updateApplicationStatus(app.applicationId, 'Approved', adminNotes);
      onRefresh();
      showToast(
        'Adoption application approved! 🎉',
        `Approved application #${app.applicationId} for ${app.applicantName}. Notification and email sent successfully!`
      );
    } catch (err: any) {
      alert(err.message || 'Error approving application');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (app: AdoptionApplication) => {
    const adminNotes = window.prompt(
      `Enter rejection reason for ${app.applicantName} (optional):`,
      'Current living conditions or space do not meet the pet requirements at this time.'
    );
    if (adminNotes === null) return;

    setProcessingId(app.applicationId);
    try {
      await api.updateApplicationStatus(app.applicationId, 'Rejected', adminNotes);
      onRefresh();
      showToast(
        'Application rejected',
        `Updated application #${app.applicationId} status and sent notification to ${app.applicantName}.`
      );
    } catch (err: any) {
      alert(err.message || 'Error rejecting application');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden animate-in fade-in">
      {/* Header Controls */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-500" /> Adoption Applications Management
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Review applications, send instant in-app alerts and official emails
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-slate-500 font-medium">Filter status:</span>
          {[
            { id: 'All', label: 'All' },
            { id: 'Pending', label: 'Pending' },
            { id: 'Approved', label: 'Approved' },
            { id: 'Rejected', label: 'Rejected' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                statusFilter === st.id
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Applications Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3">App ID</th>
              <th className="px-4 py-3">Applicant</th>
              <th className="px-4 py-3">Pet Applied</th>
              <th className="px-4 py-3">Housing & Experience</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Review & Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {filteredApplications.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                  No adoption applications found in this section.
                </td>
              </tr>
            ) : (
              filteredApplications.map((app) => (
                <tr key={app.applicationId} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-sky-600 dark:text-sky-400">
                    {app.applicationId}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800 dark:text-slate-100">{app.applicantName}</div>
                    <div className="text-[11px] text-slate-400">{app.applicantEmail} • {app.applicantPhone}</div>
                    {app.applicantAddress && (
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{app.applicantAddress}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{app.petName || 'Pet'}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{app.petId}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs">
                    <div className="text-[11px]">
                      <strong>Home:</strong> {app.housingType} • {app.hasYard ? 'Yard' : 'No Yard'}
                    </div>
                    {app.petExperience && (
                      <div className="text-[10px] text-slate-400 truncate mt-0.5" title={app.petExperience}>
                        Experience: {app.petExperience}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        app.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : app.status === 'Rejected'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {app.status === 'Approved' && <CheckCircle className="w-3 h-3" />}
                      {app.status === 'Rejected' && <XCircle className="w-3 h-3" />}
                      {app.status === 'Pending' && <Clock className="w-3 h-3" />}
                      {app.status === 'Approved' ? 'Approved' : app.status === 'Rejected' ? 'Rejected' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {app.status === 'Pending' ? (
                        <>
                          <button
                            type="button"
                            disabled={processingId === app.applicationId}
                            onClick={() => handleApprove(app)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            type="button"
                            disabled={processingId === app.applicationId}
                            onClick={() => handleReject(app)}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold text-xs transition-colors flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Processed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
