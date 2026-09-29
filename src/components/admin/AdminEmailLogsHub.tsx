import React, { useState } from 'react';
import { Mail, CheckCheck, RefreshCw, Inbox, Eye, Check, X, Terminal, Send } from 'lucide-react';
import { EmailNotificationLog, AdoptionApplication, ApplicationStatus } from '../../types';
import { api } from '../../services/api';

interface AdminEmailLogsHubProps {
  emailLogs: EmailNotificationLog[];
  onRefresh: () => void;
  showToast: (title: string, description: string) => void;
}

export const AdminEmailLogsHub: React.FC<AdminEmailLogsHubProps> = ({
  emailLogs,
  onRefresh,
  showToast,
}) => {
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<EmailNotificationLog | null>(null);

  return (
    <div id="simulated-email-logs-hub" className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              SMTP Trigger Audit & Simulated Email Delivery Hub
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated event-driven notification logs dispatched whenever application status transitions occur (Submitted, Interviewing, Approved, Rejected)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> Relay SMTP Active (250 OK)
          </span>
          <button
            onClick={() => {
              onRefresh();
              showToast('Refreshed', 'Synchronized email dispatch logs from the server.');
            }}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {emailLogs.length === 0 ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <Inbox className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <div className="text-sm font-semibold">No email trigger dispatches recorded yet</div>
          <p className="text-xs">
            Click <strong>Send Status Update</strong> on the applications table or approve an application to trigger notification events.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3">Log ID</th>
                <th className="px-4 py-3">Application & Pet</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Email Subject</th>
                <th className="px-4 py-3">Delivery Status</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3 text-right">Payload & SMTP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-mono">
              {emailLogs.map((log) => (
                <tr key={log.logId} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors text-slate-700 dark:text-slate-300">
                  <td className="px-4 py-3 font-bold text-sky-600 dark:text-sky-400 font-mono">
                    {log.logId}
                  </td>
                  <td className="px-4 py-3 font-sans">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>{log.petName || 'Pet Profile'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({log.applicationId})</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-sans">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{log.recipientName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{log.recipientEmail}</div>
                  </td>
                  <td className="px-4 py-3 max-w-xs font-sans">
                    <div className="font-medium truncate text-slate-800 dark:text-slate-200" title={log.subject}>
                      {log.subject}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{log.contentPreview}</div>
                  </td>
                  <td className="px-4 py-3 font-sans">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <Check className="w-3 h-3 text-emerald-600" /> Delivered (250 OK)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-400 font-mono">
                    {log.sentAt}
                  </td>
                  <td className="px-4 py-3 text-right font-sans">
                    <button
                      id={`btn-view-email-payload-${log.logId}`}
                      onClick={() => setSelectedLogForDetails(log)}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-sky-500" /> View Payload & SMTP
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Email Details Modal */}
      {selectedLogForDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    SMTP Envelope & Email Payload ({selectedLogForDetails.logId})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Transmission handshake headers and rendered HTML message body
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLogForDetails(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SMTP Envelope Specs */}
            <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-300 font-mono text-[11px] space-y-1 border border-slate-800">
              <div className="text-emerald-400 font-bold mb-1 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> {selectedLogForDetails.smtpStatusCode}
              </div>
              <div><strong>Message-ID:</strong> {selectedLogForDetails.metadata?.messageId || `<${selectedLogForDetails.logId}@pawfund.org>`}</div>
              <div><strong>Sender:</strong> {selectedLogForDetails.sender}</div>
              <div><strong>Recipient:</strong> {selectedLogForDetails.recipientName} &lt;{selectedLogForDetails.recipientEmail}&gt;</div>
              <div><strong>Server Relay:</strong> {selectedLogForDetails.metadata?.serverHost || 'smtp-relay-01.pawfund.internal'}</div>
              <div><strong>TLS Version:</strong> {selectedLogForDetails.metadata?.tlsVersion || 'TLSv1.3'}</div>
              <div><strong>Sent Timestamp:</strong> {selectedLogForDetails.sentAt}</div>
            </div>

            {/* Subject */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
              <div className="text-[10px] uppercase font-bold text-slate-400">Subject</div>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                {selectedLogForDetails.subject}
              </div>
            </div>

            {/* Formatted HTML Render Preview */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-slate-400">Rendered Message Body (HTML Preview)</div>
              <div
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-y-auto max-h-60"
                dangerouslySetInnerHTML={{ __html: selectedLogForDetails.htmlContent }}
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setSelectedLogForDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
