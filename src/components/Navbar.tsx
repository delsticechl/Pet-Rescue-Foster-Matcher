import React from 'react';
import { Heart, Search, ShieldCheck, Database, BookOpen, Building2, Sun, Moon, User as UserIcon, Sparkles, ChevronDown, Check, Bell } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: User | null;
  allUsers: User[];
  onSwitchUser: (user: User) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAuth: () => void;
  applicationCount?: number;
  healthReminderCount?: number;
  onOpenHealthReminders?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  allUsers,
  onSwitchUser,
  darkMode,
  onToggleDarkMode,
  onOpenAuth,
  applicationCount = 0,
  healthReminderCount = 0,
  onOpenHealthReminders,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);

  const isAdmin = currentUser?.role === 'Admin';

  const navItems = [
    { id: 'pets', label: 'Find Pets', icon: Search },
    { id: 'matchmaker', label: 'Smart Matchmaker', icon: Sparkles, badge: 'SQL' },
    { id: 'carelogs', label: 'Care Logs', icon: BookOpen },
    { id: 'shelters', label: 'Shelters & Donate', icon: Building2 },
    ...(isAdmin
      ? [
          {
            id: 'admin',
            label: 'Admin Hub & Pets',
            icon: ShieldCheck,
            badge: 'Admin',
            badgeCount: applicationCount,
          },
        ]
      : []),
    { id: 'erd', label: 'DB & REST API Studio', icon: Database, badge: 'REST' },
  ];

  return (
    <header
      id="main-header"
      className="sticky top-0 z-40 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            id="brand-logo"
            onClick={() => onSelectTab('pets')}
            className="flex items-center space-x-3 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-800 dark:text-white tracking-tight flex items-center gap-1.5">
                Pet Rescue <span className="text-sky-600 dark:text-sky-400 font-semibold">& Foster</span>
              </span>
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 -mt-1">
                3NF Relational Rescue & Foster Network
              </span>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav id="desktop-nav" className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => onSelectTab(item.id)}
                  className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      {item.badge}
                    </span>
                  )}
                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-amber-500 text-white">
                      {item.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Actions & Role Switcher */}
          <div className="flex items-center space-x-2.5">
            {/* Health Reminder Bell Notification */}
            <button
              id="health-reminder-nav-btn"
              onClick={onOpenHealthReminders}
              title="Health & Vaccination Follow-up Reminders"
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <Bell className="w-5 h-5 group-hover:scale-110 transition-transform text-slate-600 dark:text-slate-300" />
              {healthReminderCount > 0 && (
                <span
                  id="health-reminder-badge"
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-rose-500 text-white flex items-center justify-center animate-pulse ring-2 ring-white dark:ring-slate-900 shadow-sm"
                >
                  {healthReminderCount}
                </span>
              )}
            </button>

            {/* Theme Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={onToggleDarkMode}
              title="Toggle Light / Dark Mode"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            {/* Role & User Switcher Dropdown */}
            <div className="relative">
              <button
                id="user-profile-button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2 p-1.5 pr-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-left"
              >
                {currentUser?.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName || 'User'}
                    className="w-7 h-7 rounded-lg object-cover ring-1 ring-sky-500/30"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/60 flex items-center justify-center text-sky-600 dark:text-sky-300">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                    {currentUser?.fullName || 'Guest / Select User'}
                  </div>
                  <div className="text-[10px] font-medium text-sky-600 dark:text-sky-400">
                    Role: {currentUser ? (currentUser.role === 'RescueStaff' ? 'Rescue Staff' : currentUser.role === 'Admin' ? 'Administrator' : 'Adopter') : 'Not Signed In'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>

              {userDropdownOpen && (
                <div
                  id="user-dropdown-menu"
                  className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 text-sm"
                >
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Switch Account (Simulated RBAC)
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {allUsers.map((u) => {
                      const isSelected = currentUser && u.userId === currentUser.userId;
                      return (
                        <button
                          key={u.userId}
                          id={`switch-user-${u.userId}`}
                          onClick={() => {
                            onSwitchUser(u);
                            setUserDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                            isSelected ? 'bg-sky-50/60 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <img src={u.avatarUrl} alt={u.fullName} className="w-7 h-7 rounded-full object-cover" />
                            <div>
                              <div className="text-xs font-medium">{u.fullName}</div>
                              <div className="text-[10px] text-slate-400">{u.role} • {u.email}</div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-sky-600" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 px-3 flex flex-col gap-1.5">
                    <button
                      id="open-auth-modal-btn"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenAuth();
                      }}
                      className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center justify-between py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5" /> Sign In / Switch Account
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold">
                        AdminStaff
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div id="mobile-nav" className="flex lg:hidden overflow-x-auto py-2 border-t border-slate-200 dark:border-slate-800 gap-1 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-sky-500 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
