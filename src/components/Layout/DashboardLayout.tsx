import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Calendar, 
  FileText, 
  CreditCard, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Search,
  TrendingUp,
  TrendingDown,
  GraduationCap,
  Library,
  UserCheck,
  ClipboardList,
  BarChart3,
  UserPlus,
  MessageSquare,
  Award,
  Heart,
  CheckCircle2,
  Clock,
  AlertCircle,
  Megaphone
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { NotificationType } from '../../lib/notifications';
import { NoticeTicker } from '../NoticeTicker';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

interface SidebarItem {
  title: string;
  icon: React.ElementType;
  path: string;
  roles: string[];
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'FACULTY', 'STUDENT', 'PRINCIPAL', 'ACCOUNTANT', 'LIBRARIAN', 'STAFF'] },
  { title: 'Faculty Panel', icon: UserCheck, path: '/faculty-panel', roles: ['FACULTY'] },
  { title: 'Student Panel', icon: UserCheck, path: '/student-panel', roles: ['STUDENT'] },
  { title: 'Parent Panel', icon: Heart, path: '/parent-panel', roles: ['PARENT'] },
  { title: 'Accountant Panel', icon: CreditCard, path: '/accountant-panel', roles: ['ACCOUNTANT'] },
  { title: 'Front Office', icon: MessageSquare, path: '/front-office', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'STAFF'] },
  { title: 'Admissions', icon: UserPlus, path: '/admissions', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'STAFF'] },
  { title: 'Students', icon: Users, path: '/students', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'STAFF'] },
  { title: 'Faculty', icon: UserCheck, path: '/faculty', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'STAFF'] },
  { title: 'Parents', icon: Heart, path: '/parents', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'STAFF'] },
  { title: 'Communication', icon: Megaphone, path: '/communication', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL'] },
  { title: 'Courses', icon: BookOpen, path: '/courses', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'FACULTY', 'STUDENT'] },
  { title: 'Attendance', icon: ClipboardList, path: '/attendance', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'FACULTY', 'STUDENT'] },
  { title: 'Exams', icon: FileText, path: '/exams', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'FACULTY', 'STUDENT'] },
  { title: 'Results', icon: Award, path: '/results', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'FACULTY', 'STUDENT'] },
  { title: 'Paper Setter', icon: FileText, path: '/paper-setter', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'FACULTY'] },
  { title: 'Fees', icon: CreditCard, path: '/fees', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'STUDENT'] },
  { title: 'Income', icon: TrendingUp, path: '/income', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'ACCOUNTANT'] },
  { title: 'Expenses', icon: TrendingDown, path: '/expenses', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'ACCOUNTANT'] },
  { title: 'Reports', icon: BarChart3, path: '/reports', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL'] },
  { title: 'Settings', icon: Settings, path: '/settings', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN'] },
];

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [settings, setSettings] = useState({ collegeName: 'Sun Group of Institutions', logo: '' });

  useEffect(() => {
    fetchSettings();
    fetchNotifications();
    
    // Subscribe to notifications
    const channel = supabase
      .channel('notifications_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.eq.ALL`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).or(`user_id.eq.${user.id},user_id.eq.ALL`);
    fetchNotifications();
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('app_settings').select('*').eq('key', 'general').single();
    if (data && data.value) {
      setSettings(data.value);
    } else {
      // Fallback to localStorage if Supabase fails or is empty
      try {
        const saved = localStorage.getItem('edu_nexus_general_settings');
        if (saved) setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing settings from localStorage', e);
      }
    }
  };

  if (!user) return null;

  const filteredItems = SIDEBAR_ITEMS.filter(item => item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNoticeAudience = () => {
    const role = user.role;
    if (['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL'].includes(role)) return 'Admin';
    if (['FACULTY', 'STAFF', 'LIBRARIAN', 'ACCOUNTANT'].includes(role)) return 'Staff';
    if (role === 'STUDENT') return 'Students';
    if (role === 'PARENT') return 'Parents';
    return 'All';
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside 
        className={cn(
          "bg-white border-r border-primary/10 transition-all duration-300 flex flex-col hidden lg:flex h-full",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
            {settings.logo ? (
              <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <GraduationCap className="text-white w-6 h-6" />
            )}
          </div>
          {isSidebarOpen && (
            <span className="font-bold text-xl text-red-600 truncate tracking-tight">
              {settings.collegeName}
            </span>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto pt-4">
          {filteredItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative",
                location.pathname === item.path 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-slate-500 hover:bg-primary/5 hover:text-primary"
              )}
            >
              <item.icon className={cn("w-5 h-5 transition-colors", location.pathname === item.path ? "text-white" : "text-slate-400 group-hover:text-primary")} />
              {isSidebarOpen && <span className="font-bold text-sm">{item.title}</span>}
              {location.pathname === item.path && isSidebarOpen && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full"
                />
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all w-full group",
              !isSidebarOpen && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            {isSidebarOpen && <span className="font-bold text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-primary/10 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 hover:bg-primary/5 rounded-xl transition-colors hidden lg:block text-primary"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2.5 hover:bg-primary/5 rounded-xl transition-colors lg:hidden text-primary"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative hidden xl:block">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="pl-11 pr-4 py-2.5 bg-background border-none rounded-xl text-sm w-64 xl:w-80 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2.5 hover:bg-primary/5 rounded-xl transition-colors relative text-slate-500"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-accent rounded-full border-2 border-white"></span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsNotificationsOpen(false)}
                      className="fixed inset-0 z-40"
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-[calc(100vw-32px)] sm:w-80 bg-white rounded-2xl shadow-2xl border border-primary/10 z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-primary">Notifications</h3>
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-sm text-slate-400 font-medium">No notifications yet</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-50">
                            {notifications.map((n) => (
                              <div 
                                key={n.id} 
                                onClick={() => markAsRead(n.id)}
                                className={cn(
                                  "p-4 hover:bg-primary/5 transition-colors cursor-pointer relative",
                                  !n.is_read && "bg-primary/[0.02]"
                                )}
                              >
                                {!n.is_read && (
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                                )}
                                <div className="flex gap-3">
                                  <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                    n.type === 'SUCCESS' ? "bg-green-100 text-green-600" :
                                    n.type === 'WARNING' ? "bg-amber-100 text-amber-600" :
                                    n.type === 'ERROR' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                                  )}>
                                    {n.type === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4" /> :
                                     n.type === 'WARNING' ? <AlertCircle className="w-4 h-4" /> :
                                     n.type === 'ERROR' ? <X className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-800 leading-tight">{n.title}</p>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                                    <p className="text-[10px] text-slate-400 mt-2 font-medium">
                                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="h-8 w-px bg-slate-100 mx-1"></div>
            <Link to="/profile" className="flex items-center gap-3 pl-2 hover:bg-primary/5 p-1 rounded-xl transition-colors">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-primary">{user.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.role?.replace('_', ' ') || ''}</p>
              </div>
              <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} 
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden relative">
          <div className="max-w-7xl mx-auto">
            <NoticeTicker audience={getNoticeAudience() as any} />
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center overflow-hidden">
                    {settings.logo ? (
                      <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <GraduationCap className="text-white w-6 h-6" />
                    )}
                  </div>
                  <span className="font-bold text-xl text-primary tracking-tight">
                    {settings.collegeName.split(' ')[0]}
                  </span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {filteredItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all",
                      location.pathname === item.path 
                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                        : "text-slate-500 hover:bg-primary/5"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5", location.pathname === item.path ? "text-white" : "text-slate-400")} />
                    <span className="font-bold text-sm">{item.title}</span>
                  </Link>
                ))}
              </nav>
              <div className="p-6 border-t border-slate-100">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all w-full"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-bold text-sm">Logout</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
