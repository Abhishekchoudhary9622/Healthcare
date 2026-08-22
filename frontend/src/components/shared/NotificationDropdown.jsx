import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Trash2, Calendar, Pill, AlertTriangle, Video, Info, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.data;
    },
    staleTime: 1000 * 30, // 30s stale time
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.put('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'APPOINTMENT':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'MEDICATION':
        return <Pill className="h-4 w-4 text-emerald-500" />;
      case 'RISK_ALERT':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'TELEMEDICINE':
        return <Video className="h-4 w-4 text-purple-500" />;
      default:
        return <Info className="h-4 w-4 text-indigo-500" />;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'UNREAD') return !n.read;
    if (filter === 'APPOINTMENT') return n.type === 'APPOINTMENT';
    if (filter === 'MEDICATION') return n.type === 'MEDICATION';
    if (filter === 'RISK_ALERT') return n.type === 'RISK_ALERT';
    return true;
  });

  const handleItemClick = (notif) => {
    if (!notif.read) {
      markReadMutation.mutate(notif._id);
    }
    if (notif.link) {
      setIsOpen(false);
      navigate(notif.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-9 w-9 flex items-center justify-center rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--border)] text-[var(--text-secondary)] transition-colors"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-tertiary)]">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1 p-2 border-b border-[var(--border)] bg-[var(--bg-secondary)] overflow-x-auto text-[11px]">
            {['ALL', 'UNREAD', 'APPOINTMENT', 'MEDICATION', 'RISK_ALERT'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors',
                  filter === f
                    ? 'bg-brand-600 text-white'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                )}
              >
                {f === 'ALL' ? 'All' : f === 'UNREAD' ? 'Unread' : f === 'APPOINTMENT' ? 'Appointments' : f === 'MEDICATION' ? 'Meds' : 'Alerts'}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-[var(--border)]">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No notifications to display
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleItemClick(notif)}
                  className={cn(
                    'p-3.5 flex gap-3 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer group relative',
                    !notif.read && 'bg-brand-500/5'
                  )}
                >
                  <div className="h-8 w-8 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={cn('text-xs font-semibold truncate', !notif.read ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-secondary)]')}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                        {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(notif._id); }}
                        className="p-1 text-[var(--text-muted)] hover:text-brand-500 rounded"
                        title="Mark read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(notif._id); }}
                      className="p-1 text-[var(--text-muted)] hover:text-red-500 rounded"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
