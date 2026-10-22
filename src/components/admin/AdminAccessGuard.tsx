import React from 'react';
import { ShieldAlert, Lock, Sparkles, LogIn, ArrowRight } from 'lucide-react';
import { User } from '../../types';

interface AdminAccessGuardProps {
  currentUser: User;
  onSwitchToAdmin: () => void;
  onOpenAuthModal: () => void;
}

export const AdminAccessGuard: React.FC<AdminAccessGuardProps> = ({
  currentUser,
  onSwitchToAdmin,
  onOpenAuthModal,
}) => {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in zoom-in-95">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto ring-8 ring-amber-500/5">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <ShieldAlert className="w-3.5 h-3.5" /> Protected Administration Area
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">
            Administrator Privileges Required (AdminStaff)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            Publishing new pet profiles with local device photo uploads, executing ACID adoption approval transactions, and clinical record management are restricted to administrator accounts (<strong className="text-sky-600 dark:text-sky-400">AdminStaff</strong>).
          </p>
        </div>

        {/* Current User Info */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs text-left flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={currentUser.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200">{currentUser.fullName}</div>
              <div className="text-slate-400 font-mono text-[11px]">{currentUser.email}</div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
            Role: {currentUser.role}
          </span>
        </div>

        {/* Quick Admin Login CTA */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white text-left space-y-3 border border-indigo-500/30 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> Preconfigured Admin Credentials
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
              ROLE: ADMIN
            </span>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
            <div>Username: <strong className="text-white">AdminStaff</strong></div>
            <div>Password: <strong className="text-amber-300">adminstaff123@</strong></div>
          </div>

          <button
            id="btn-switch-to-adminstaff"
            onClick={onSwitchToAdmin}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
          >
            <LogIn className="w-4 h-4 text-amber-300" />
            <span>1-Click Switch To AdminStaff Account</span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </button>
        </div>

        <div>
          <button
            onClick={onOpenAuthModal}
            className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline"
          >
            Or log in with another account via Authentication Dialog
          </button>
        </div>
      </div>
    </div>
  );
};
