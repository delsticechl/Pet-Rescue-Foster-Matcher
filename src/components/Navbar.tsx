import React, { useState, useEffect } from 'react';
import {
  Heart,
  Search,
  ShieldCheck,
  BookOpen,
  Building2,
  Sun,
  Moon,
  Sparkles,
  ChevronDown,
  Bell,
  User as UserIcon,
  Camera,
} from 'lucide-react';
import { User, InAppNotification } from '../types';
import { api } from '../services/api';
import { useRealtimeSocket } from '../hooks/useRealtimeSocket';
import { realtimeWs } from '../services/websocket';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: User | null;
  allUsers: User[];
  onSwitchUser: (user: User) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAuth: () => void;
  onOpenAvatarUpload?: () => void;
  applicationCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  allUsers: _allUsers,
  onSwitchUser: _onSwitchUser,
  darkMode,
  onToggleDarkMode,
  onOpenAuth,
  onOpenAvatarUpload,
  applicationCount = 0,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  // Realtime socket connection runs silently in the background
  useRealtimeSocket(currentUser);

  const isAdmin = currentUser?.role === 'Admin';
  const isAdopter = currentUser?.role === 'Adopter';

  // Load real in-app notifications
  const fetchNotifications = async () => {
    try {
      const list = await api.getNotifications(currentUser?.email);
      setNotifications(list);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [currentUser?.email]);

  // Real-Time WebSocket notification listener
  useEffect(() => {
    const unsubNew = realtimeWs.on('notification:new', (payload) => {
      const notifData = payload.data;
      const myEmail = currentUser?.email?.toLowerCase();
      const targetEmail = notifData.recipientEmail?.toLowerCase();

      if (!targetEmail || targetEmail === myEmail || isAdmin) {
        const newNotifItem: InAppNotification = {
          notificationId: notifData.notificationId || `NOTIF-${Date.now()}`,
          recipientEmail: targetEmail || myEmail || '',
          title: notifData.title,
          message: notifData.message,
          type: notifData.type || 'system',
          isRead: false,
          createdAt: payload.timestamp || new Date().toISOString(),
        };

        setNotifications((prev) => [
          newNotifItem,
          ...prev.filter((n) => n.notificationId !== newNotifItem.notificationId),
        ]);
      }
    });

    const unsubRead = realtimeWs.on('notification:read', (payload) => {
      const { notificationId } = payload.data;
      if (notificationId) {
        setNotifications((prev) =>
          prev.map((n) => (n.notificationId === notificationId ? { ...n, isRead: true } : n))
        );
      }
    });

    return () => {
      unsubNew();
      unsubRead();
    };
  }, [currentUser?.email, isAdmin]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // ignore
    }
  };

  // Navigation Items:
  // - Adopters see Adopter Dashboard
  // - Admin/Staff ONLY see Shelter Management (no adopter profile tab to declutter)
  const navItems = [
    { id: 'pets', label: 'Adopt Pets', icon: Search },
    { id: 'matchmaker', label: 'AI Pet Matchmaker', icon: Sparkles, badge: 'AI' },
    { id: 'carelogs', label: 'Care Logs', icon: BookOpen },
    { id: 'shelters', label: 'Shelters & Donate', icon: Building2 },
    ...(currentUser && isAdopter
      ? [
          {
            id: 'adopter',
            label: 'Adopter Dashboard',
            icon: Heart,
            badge: 'My Hub',
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            id: 'admin',
            label: 'Shelter Management',
            icon: ShieldCheck,
            badge: 'Admin',
            badgeCount: applicationCount,
          },
        ]
      : []),
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
                PawFund <span className="text-sky-600 dark:text-sky-400 font-semibold">Rescue</span>
              </span>
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 -mt-1">
                Pet Adoption & Foster Network
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
                  className={`relative px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-900/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      {item.badge}
                    </span>
                  )}
                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                      {item.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Actions: Notification Bell + Theme Toggle + User Avatar / Account */}
          <div className="flex items-center space-x-2">
            {/* Real Web Notification Bell */}
            <div className="relative">
              <button
                id="notification-bell-btn"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                title="Notifications"
                className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-rose-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-sm animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-sky-500" /> Live Notifications
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {unreadCount} unread
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.notificationId}
                          onClick={() => handleMarkAsRead(n.notificationId)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors space-y-1 ${
                            n.isRead
                              ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 opacity-75'
                              : 'bg-sky-50/50 dark:bg-sky-950/30 border-sky-100 dark:border-sky-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-800 dark:text-slate-200 text-[11px] flex items-center gap-1">
                              {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />}
                              {n.title}
                            </strong>
                            <span className="text-[10px] text-slate-400">
                              {n.createdAt?.slice(11, 16)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* User Account / Role Badge */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 pl-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-bold"
                >
                  <img
                    src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                    alt={currentUser.fullName}
                    className="w-6 h-6 rounded-lg object-cover ring-1 ring-slate-300 dark:ring-slate-600"
                  />
                  <span className="hidden sm:inline text-slate-700 dark:text-slate-200">
                    {currentUser.fullName}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                      currentUser.role === 'Admin'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50 text-xs animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                      <div className="font-bold text-slate-800 dark:text-white truncate">
                        {currentUser.fullName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
                    </div>

                    <div className="pt-1 space-y-0.5">
                      {/* Change Avatar Button */}
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          if (onOpenAvatarUpload) onOpenAvatarUpload();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/60 flex items-center gap-2 font-medium"
                      >
                        <Camera className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        <span>Change Avatar</span>
                      </button>

                      {isAdopter && (
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onSelectTab('adopter');
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/60 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-2 font-medium"
                        >
                          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                          <span>Adopter Dashboard</span>
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onSelectTab('admin');
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-2 font-medium"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                          <span>Shelter Management</span>
                        </button>
                      )}

                      <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenAuth();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>Switch Account / Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
