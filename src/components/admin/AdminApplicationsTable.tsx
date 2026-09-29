import React, { useState } from 'react';
import {
  FileText,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Mail,
  Send,
  Calendar,
  User,
  Sparkles,
  ArrowRight,
  Database,
  X,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import {
  AdoptionApplication,
  TransactionExecutionResult,
  ApplicationStatus,
  User as UserType,
} from '../../types';
import { api } from '../../services/api';

interface AdminApplicationsTableProps {
  applications: AdoptionApplication[];
  currentUser: UserType;
  onRefresh: () => void;
  showToast: (title: string, description: string) => void;
  onOpenCsvExport?: () => void;
}

export const AdminApplicationsTable: React.FC<AdminApplicationsTableProps> = ({
  applications,
  currentUser,
  onRefresh,
  showToast,
  onOpenCsvExport,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Email Notification Modal State
  const [selectedAppForEmail, setSelectedAppForEmail] = useState<AdoptionApplication | null>(null);
  const [emailStatusChoice, setEmailStatusChoice] = useState<ApplicationStatus>('Approved');
  const [emailCustomNote, setEmailCustomNote] = useState<string>('');
  const [emailInterviewTime, setEmailInterviewTime] = useState<string>('2026-08-22T15:00');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Interview modal
  const [selectedAppForInterview, setSelectedAppForInterview] = useState<AdoptionApplication | null>(null);
  const [interviewDate, setInterviewDate] = useState<string>('2026-08-20T14:30');
  const [staffNoteText, setStaffNoteText] = useState<string>('Housing environment meets foster / adoption requirements.');

  // Transaction visualizer state
  const [txResultModal, setTxResultModal] = useState<TransactionExecutionResult | null>(null);

  const filteredApplications = applications.filter((app) => {
    if (statusFilter === 'All' || statusFilter === 'Tất cả') return true;
    return app.status === statusFilter;
  });

  const handleOpenSendEmailModal = (app: AdoptionApplication) => {
    setSelectedAppForEmail(app);
    setEmailStatusChoice(app.status);
    setEmailCustomNote(app.staffNotes || 'Status update and next steps from the animal shelter team.');
    setEmailInterviewTime(app.interviewTime || '2026-08-22T15:00');
  };

  const handleSendStatusUpdateEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedAppForEmail) return;

    setIsSendingEmail(true);
    try {
      const res = await api.sendSimulatedStatusEmail({
        applicationId: selectedAppForEmail.applicationId,
        status: emailStatusChoice,
        customNote: emailCustomNote,
        interviewTime: emailStatusChoice === 'Interviewing' ? emailInterviewTime : undefined,
      });

      onRefresh();
      showToast(
        '📨 Email Trigger Fired!',
        `Simulated status update email "${emailStatusChoice}" dispatched to ${res.emailLog.recipientName} (${res.emailLog.recipientEmail}) [SMTP 250 OK].`
      );
      setSelectedAppForEmail(null);
    } catch (err: any) {
      alert(err.message || 'Error triggering simulated email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleApproveWithTransaction = async (app: AdoptionApplication) => {
    if (
      !window.confirm(
        `Execute ACID SQL Transaction to APPROVE application #${app.applicationId} for pet ${app.petName}? Pet status will automatically update to 'Adopted' and competing applications will be resolved.`
      )
    ) {
      return;
    }

    try {
      const res = await api.updateApplicationStatus(app.applicationId, 'Approved', {
        staffNotes: 'Application exceeds shelter standards. Officially approved with ACID transactional lock.',
      });

      if (res.transactionResult) {
        setTxResultModal(res.transactionResult);
      }
      onRefresh();
      showToast(
        '📨 Auto Email Notification Triggered!',
        `Approved application #${app.applicationId} and sent automated congratulatory notice to ${app.applicantName}.`
      );
    } catch (err: any) {
      alert(err.message || 'Error executing SQL transaction');
    }
  };

  const handleSetInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForInterview) return;

    try {
      await api.updateApplicationStatus(selectedAppForInterview.applicationId, 'Interviewing', {
        interviewTime: interviewDate,
        staffNotes: staffNoteText,
      });
      const applicantName = selectedAppForInterview.applicantName;
      setSelectedAppForInterview(null);
      onRefresh();
      showToast(
        '📨 Interview Scheduled & Email Dispatched!',
        `Interview date confirmed with simulated notification sent to ${applicantName}.`
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRejectApplication = async (app: AdoptionApplication) => {
    const reason = window.prompt(
      'Enter reason for rejection (optional):',
      'Housing space or lifestyle constraints not currently aligned with pet energy level.'
    );
    if (reason === null) return;

    try {
      await api.updateApplicationStatus(app.applicationId, 'Rejected', {
        staffNotes: reason,
      });
      onRefresh();
      showToast(
        '📨 Rejection Trigger Logged!',
        `Status set to Rejected and notification email logged for ${app.applicantName}.`
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden animate-in fade-in">
      {/* Header Controls */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-500" /> Adoption Applications (ADOPTION_APPLICATIONS)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enforces ACID Transactions upon Approval/Rejection with automated SMTP trigger notifications
          </p>
        </div>

        {/* Status Filters & Export */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {onOpenCsvExport && (
            <button
              id="btn-admin-apps-export-csv"
              onClick={onOpenCsvExport}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold flex items-center gap-1.5 transition-colors mr-1"
              title="Download pet records and application metrics to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export CSV</span>
            </button>
          )}

          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-slate-500 font-medium">Filter:</span>
          {['All', 'Submitted', 'Interviewing', 'Approved', 'Rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                statusFilter === st
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {st}
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
              <th className="px-4 py-3">Applicant Info</th>
              <th className="px-4 py-3">Selected Pet</th>
              <th className="px-4 py-3">Living Environment</th>
              <th className="px-4 py-3">Status & Schedule</th>
              <th className="px-4 py-3 text-right">Actions & ACID Transaction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {filteredApplications.map((app) => (
              <tr key={app.applicationId} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 font-mono font-bold text-sky-600 dark:text-sky-400">
                  {app.applicationId}
                </td>
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-800 dark:text-slate-100">{app.applicantName}</div>
                  <div className="text-[11px] text-slate-400">{app.applicantEmail} • {app.applicantPhone}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{app.petName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{app.petId}</div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs">
                  <div className="text-[11px]">
                    <strong>Home:</strong> {app.housingType} • {app.hasYard ? 'Has Yard' : 'No Yard'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5" title={app.experienceNote}>
                    {app.experienceNote}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        app.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : app.status === 'Interviewing'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : app.status === 'Rejected'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {app.status === 'Approved' && <CheckCircle className="w-3 h-3" />}
                      {app.status === 'Interviewing' && <Clock className="w-3 h-3" />}
                      {app.status === 'Rejected' && <XCircle className="w-3 h-3" />}
                      {app.status}
                    </span>
                    {app.interviewTime && (
                      <div className="text-[10px] text-sky-600 dark:text-sky-400 font-mono">
                        📅 {app.interviewTime.replace('T', ' ')}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Simulated Email Trigger Button */}
                    <button
                      id={`btn-send-status-update-${app.applicationId}`}
                      onClick={() => handleOpenSendEmailModal(app)}
                      className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1"
                      title="Send custom status email and log notification"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Send Status Update</span>
                    </button>

                    {app.status === 'Submitted' && (
                      <>
                        <button
                          onClick={() => setSelectedAppForInterview(app)}
                          className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold text-[11px]"
                        >
                          Schedule
                        </button>
                        <button
                          onClick={() => handleApproveWithTransaction(app)}
                          className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs"
                        >
                          Approve (ACID)
                        </button>
                        <button
                          onClick={() => handleRejectApplication(app)}
                          className="px-2.5 py-1 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-semibold text-[11px]"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {app.status === 'Interviewing' && (
                      <>
                        <button
                          onClick={() => handleApproveWithTransaction(app)}
                          className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectApplication(app)}
                          className="px-2.5 py-1 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-semibold text-[11px]"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Send Status Update Email Modal */}
      {selectedAppForEmail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-500 text-white">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    Send Status Notification Email (SMTP Trigger)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Application #{selectedAppForEmail.applicationId} - Pet {selectedAppForEmail.petName}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedAppForEmail(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendStatusUpdateEmail} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status Notification:</label>
                <select
                  value={emailStatusChoice}
                  onChange={(e) => setEmailStatusChoice(e.target.value as ApplicationStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold"
                >
                  <option value="Submitted">Submitted (Review in progress)</option>
                  <option value="Interviewing">Interviewing (Invitation to shelter interview)</option>
                  <option value="Approved">Approved (Adoption application officially accepted)</option>
                  <option value="Rejected">Rejected (Polite outcome notice)</option>
                </select>
              </div>

              {emailStatusChoice === 'Interviewing' && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Interview Date & Time:</label>
                  <input
                    type="datetime-local"
                    value={emailInterviewTime}
                    onChange={(e) => setEmailInterviewTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Staff Note / Message:</label>
                <textarea
                  rows={2}
                  value={emailCustomNote}
                  onChange={(e) => setEmailCustomNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSelectedAppForEmail(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-send-status-update"
                  type="submit"
                  disabled={isSendingEmail}
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingEmail ? 'Sending...' : 'Dispatch Email'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Interview Modal */}
      {selectedAppForInterview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Schedule Shelter Interview</h3>
              <button onClick={() => setSelectedAppForInterview(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSetInterview} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Interview Date & Time:</label>
                <input
                  type="datetime-local"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Staff Note:</label>
                <textarea
                  rows={2}
                  value={staffNoteText}
                  onChange={(e) => setStaffNoteText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSelectedAppForInterview(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  Confirm & Dispatch Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Result Visualizer Modal */}
      {txResultModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  ACID Transaction Result Visualizer
                </h3>
                <p className="text-xs text-slate-400">Stored Procedure Execution & Database Commitment</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[11px] space-y-2 border border-slate-800">
              <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4" /> TRANSACTION COMMITTED SUCCESSFULLY
              </div>
              <div><strong>Transaction ID:</strong> {txResultModal.transactionId}</div>
              <div><strong>Duration:</strong> {txResultModal.executionTimeMs}ms</div>
              <div className="text-slate-400 mt-2"><strong>Execution Steps:</strong></div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {txResultModal.steps.map((st, i) => (
                  <li key={i}>{st}</li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setTxResultModal(null)}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold"
              >
                Close Visualizer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
