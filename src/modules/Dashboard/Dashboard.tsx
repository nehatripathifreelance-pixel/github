import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  School, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  BookOpen,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Award,
  QrCode,
  UserCheck,
  Bell,
  ChevronRight,
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, Navigate } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, testSupabaseConnection } from '../../lib/supabase';
import QRCode from 'react-qr-code';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<any[]>([]);
  const [feeDistribution, setFeeDistribution] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQRPayment, setShowQRPayment] = useState(false);
  const [attendancePercent, setAttendancePercent] = useState(0);
  const [todayStudyActivities, setTodayStudyActivities] = useState<any[]>([]);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message: string; details?: string } | null>(null);
  const [collegeName, setCollegeName] = useState('EduNexus');

  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  useEffect(() => {
    if (user) {
      checkConnection();
      fetchDashboardData();
      fetchCollegeName();
    }
  }, [user]);

  const fetchCollegeName = async () => {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'general').single();
    if (data?.value?.collegeName) {
      setCollegeName(data.value.collegeName);
    }
  };

  const checkConnection = async () => {
    const status = await testSupabaseConnection();
    setDbStatus(status);
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Stats
      const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
      const { count: facultyCount } = await supabase.from('staff').select('*', { count: 'exact', head: true });
      const { count: applicationCount } = await supabase.from('applications').select('*', { count: 'exact', head: true });
      
      const { data: feesData } = await supabase.from('fees').select('amount, status, description');
      const totalCollected = (feesData || [])
        .filter(f => f.status === 'PAID')
        .reduce((acc, f) => acc + (f.amount || 0), 0);
      const totalPending = (feesData || [])
        .filter(f => f.status === 'PENDING' || f.status === 'OVERDUE')
        .reduce((acc, f) => acc + (f.amount || 0), 0);

      setStats([
        { title: 'Total Students', value: studentCount?.toLocaleString() || '0', change: '+2%', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: 'up' },
        { title: 'Admission Apps', value: applicationCount?.toLocaleString() || '0', change: '+12%', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50', trend: 'up' },
        { title: 'Fees Collected', value: formatCurrency(totalCollected), change: '+5%', icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50', trend: 'up' },
        { title: 'Pending Fees', value: formatCurrency(totalPending), change: '-3%', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', trend: 'down' },
      ]);

      // 2. Fetch Enrollment Data (Applications by month)
      const { data: appsByMonth } = await supabase.from('applications').select('created_at');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentYear = new Date().getFullYear();
      const monthlyData = months.map((m, i) => {
        const count = (appsByMonth || []).filter(a => {
          const d = new Date(a.created_at);
          return d.getMonth() === i && d.getFullYear() === currentYear;
        }).length;
        return { name: m, students: count };
      });
      setEnrollmentData(monthlyData.slice(0, 6)); // Show first 6 months for now or last 6

      // 3. Fee Distribution (Group by description)
      const feeGroups: Record<string, number> = {};
      (feesData || []).forEach(f => {
        const desc = f.description || 'Other';
        const type = desc.split(':')[0].trim();
        feeGroups[type] = (feeGroups[type] || 0) + (f.amount || 0);
      });
      
      const totalFees = Object.values(feeGroups).reduce((a, b) => a + b, 0);
      const distribution = Object.entries(feeGroups).map(([name, value]) => ({
        name,
        value: totalFees > 0 ? Math.round((value / totalFees) * 100) : 0
      })).sort((a, b) => b.value - a.value).slice(0, 4);

      setFeeDistribution(distribution.length > 0 ? distribution : [
        { name: 'Tuition', value: 100 }
      ]);

      // 4. Fetch Recent Activities (Latest feed)
      const { data: recentExams } = await supabase.from('exams').select('*').order('created_at', { ascending: false }).limit(2);
      const { data: recentFees } = await supabase.from('fees').select('*, students(name)').order('created_at', { ascending: false }).limit(2);
      const { data: recentLogs } = await supabase.from('study_activities').select('*, courses(name)').order('created_at', { ascending: false }).limit(2);
      
      const feed = [
        ...(recentExams || []).map(e => ({
          user: 'Admin',
          action: 'scheduled new exam:',
          target: e.title,
          time: formatDate(e.created_at),
          icon: Calendar,
          color: 'text-blue-600',
          bg: 'bg-blue-50'
        })),
        ...(recentFees || []).map(f => ({
          user: f.students?.name || 'Student',
          action: 'paid fee for',
          target: f.description || 'Tuition Fee',
          time: formatDate(f.created_at),
          icon: CreditCard,
          color: 'text-green-600',
          bg: 'bg-green-50'
        })),
        ...(recentLogs || []).map(l => ({
          user: 'Faculty',
          action: 'updated study log for',
          target: l.courses?.name || 'Course',
          time: formatDate(l.created_at),
          icon: BookOpen,
          color: 'text-amber-600',
          bg: 'bg-amber-50'
        }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setActivities(feed.length > 0 ? feed : [
        { user: 'System', action: 'Welcome to', target: `${collegeName} Dashboard`, time: 'Just now', icon: Bell, color: 'text-indigo-600', bg: 'bg-indigo-50' }
      ]);

      // 5. Upcoming Exams
      const { data: exams } = await supabase
        .from('exams')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(4);
      setUpcomingExams(exams || []);

      // 6. Today's Study Log
      const today = new Date().toISOString().split('T')[0];
      const { data: todayLogs } = await supabase
        .from('study_activities')
        .select('*, courses(name)')
        .gte('created_at', today)
        .order('created_at', { ascending: false });
      setTodayStudyActivities(todayLogs || []);

      // 7. Attendance (for Students/Parents)
      if (user.role === 'STUDENT' || user.role === 'PARENT') {
        const studentId = user.role === 'STUDENT' ? user.id : 'STU001'; // Mock for parent
        const { data: att } = await supabase.from('attendance').select('status').eq('student_id', studentId);
        if (att && att.length > 0) {
          const present = att.filter(a => a.status.toUpperCase() === 'PRESENT').length;
          setAttendancePercent(Math.round((present / att.length) * 100));
        } else {
          setAttendancePercent(85); // Mock
        }
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  if (user.role === 'PARENT') {
    return <Navigate to="/parent-panel" replace />;
  }

  const isStaff = ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'FACULTY'].includes(user.role);
  const isParent = user.role === 'PARENT';
  const isStudent = user.role === 'STUDENT';

  return (
    <div className="space-y-8">
      {/* Troubleshooting Modal */}
      <AnimatePresence>
        {showTroubleshooting && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-red-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-600 shadow-sm">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Database Connection Issue</h2>
                    <p className="text-red-600/80 text-sm font-bold uppercase tracking-wider">Troubleshooting Guide</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTroubleshooting(false)}
                  className="p-2 hover:bg-white rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
                <div className="space-y-4">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-xs">1</div>
                    Environment Variables
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    When deploying to <span className="font-bold text-slate-900">Vercel</span> or <span className="font-bold text-slate-900">Netlify</span>, you must manually add your Supabase credentials in the project settings.
                  </p>
                  <div className="bg-slate-50 p-4 rounded-2xl space-y-2 font-mono text-xs">
                    <p className="text-slate-400"># Add these to your deployment settings:</p>
                    <p><span className="text-indigo-600">VITE_SUPABASE_URL</span>=your_supabase_project_url</p>
                    <p><span className="text-indigo-600">VITE_SUPABASE_ANON_KEY</span>=your_supabase_anon_key</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-xs">2</div>
                    Supabase Project Status
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Ensure your Supabase project is active and not paused. Log in to the <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline">Supabase Dashboard</a> to check.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-xs">3</div>
                    Database Schema
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    If you've connected but see errors, you may need to run the initial SQL setup. Copy the contents of <span className="font-bold text-slate-900">supabase_setup.sql</span> and run it in the Supabase SQL Editor.
                  </p>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col gap-2">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-800 font-bold uppercase tracking-wider">
                      Error Message
                    </p>
                  </div>
                  <p className="text-sm text-amber-900 font-medium ml-8">
                    {dbStatus?.message || 'Unknown error'}
                  </p>
                  {dbStatus?.details && (
                    <p className="text-xs text-amber-800/70 ml-8 font-mono bg-white/50 p-2 rounded-lg">
                      {dbStatus.details}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-8 bg-slate-50 flex items-center justify-end gap-3">
                <button 
                  onClick={() => {
                    checkConnection();
                    fetchDashboardData();
                  }}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Retry Connection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Welcome Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Welcome back, {user.name}!</h1>
          <p className="text-slate-500 text-sm sm:text-base">Here's what's happening at your college today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {dbStatus && (
            <button 
              onClick={() => !dbStatus.connected && setShowTroubleshooting(true)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 border transition-all",
                dbStatus.connected 
                  ? "bg-green-50 text-green-600 border-green-100 cursor-default" 
                  : "bg-red-50 text-red-600 border-red-100 hover:bg-red-100 cursor-pointer"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full animate-pulse", dbStatus.connected ? "bg-green-500" : "bg-red-500")} />
              {dbStatus.connected ? "DB Connected" : "DB Disconnected - Click to Fix"}
            </button>
          )}
          <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl flex items-center gap-2 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">{formatDate(new Date())}</span>
          </div>
          {isStaff && (
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
              Generate Report
            </button>
          )}
        </div>
      </div>

      {/* Role-Based Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {isStaff && (
          <>
            <QuickActionCard 
              title="Add Exam" 
              icon={Plus} 
              color="bg-blue-600" 
              onClick={() => window.location.hash = '#/exams'} 
            />
            <QuickActionCard 
              title="Publish Results" 
              icon={Award} 
              color="bg-green-600" 
              onClick={() => window.location.hash = '#/exams'} 
            />
            <QuickActionCard 
              title="Update Course" 
              icon={BookOpen} 
              color="bg-amber-600" 
              onClick={() => window.location.hash = '#/courses'} 
            />
            <QuickActionCard 
              title="Mark Attendance" 
              icon={UserCheck} 
              color="bg-indigo-600" 
              onClick={() => window.location.hash = '#/attendance'} 
            />
          </>
        )}
        {isParent && (
          <>
            <QuickActionCard 
              title="Child Progress" 
              icon={TrendingUp} 
              color="bg-indigo-600" 
              onClick={() => window.location.hash = '#/parents'} 
            />
            <QuickActionCard 
              title="Make Payment" 
              icon={CreditCard} 
              color="bg-emerald-600" 
              onClick={() => window.location.hash = '#/fees'} 
            />
            <QuickActionCard 
              title="Check Attendance" 
              icon={UserCheck} 
              color="bg-blue-600" 
              onClick={() => window.location.hash = '#/attendance'} 
            />
            <QuickActionCard 
              title="View Results" 
              icon={Award} 
              color="bg-amber-600" 
              onClick={() => window.location.hash = '#/exams'} 
            />
          </>
        )}
        {isStudent && (
          <>
            <QuickActionCard 
              title="My Courses" 
              icon={BookOpen} 
              color="bg-indigo-600" 
              onClick={() => window.location.hash = '#/courses'} 
            />
            <QuickActionCard 
              title="Pay Fees" 
              icon={CreditCard} 
              color="bg-emerald-600" 
              onClick={() => window.location.hash = '#/fees'} 
            />
            <QuickActionCard 
              title="Class Schedule" 
              icon={Calendar} 
              color="bg-blue-600" 
              onClick={() => window.location.hash = '#/reports'} 
            />
            <QuickActionCard 
              title="Examinations" 
              icon={FileText} 
              color="bg-amber-600" 
              onClick={() => window.location.hash = '#/exams'} 
            />
          </>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                stat.trend === 'up' ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
              )}>
                {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium mb-1">{stat.title}</h3>
            <p className="text-2xl font-bold text-primary">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrollment Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-primary/10 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-primary">Enrollment Trends</h3>
            <select className="text-xs font-medium bg-background border-none rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-64 sm:h-72 w-full relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={enrollmentData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="students" fill="#065F46" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fee Distribution or Attendance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">{isStudent || isParent ? 'Attendance Overview' : 'Fee Distribution'}</h3>
          {isStudent || isParent ? (
            <div className="flex flex-col items-center justify-center h-full pb-8 pt-4">
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-slate-100"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={502.4}
                    strokeDashoffset={502.4 - (502.4 * attendancePercent) / 100}
                    className="text-indigo-600 transition-all duration-1000"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-black text-slate-800">{attendancePercent}%</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Attendance</span>
                </div>
              </div>
              <p className="mt-6 text-sm text-slate-500 text-center font-medium">
                Keep it above 75% to be eligible for exams.
              </p>
            </div>
          ) : (
            <>
              <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={feeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {feeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 mt-4">
                {feeDistribution.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                      <span className="text-sm text-slate-600">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-800">{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Activities & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities (Latest Feed) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Latest Feed</h3>
            <Bell className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-6">
            {activities.map((activity, i) => (
              <div key={i} className="flex gap-4 group cursor-pointer">
                <div className={cn("w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110", activity.bg)}>
                  <activity.icon className={cn("w-5 h-5", activity.color)} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-600">
                    <span className="font-bold text-slate-800">{activity.user}</span> {activity.action} <span className="font-bold text-slate-800">{activity.target}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {activity.time}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Exams */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Upcoming Exams</h3>
            <button 
              onClick={() => window.location.hash = '#/exams'}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {upcomingExams.length > 0 ? upcomingExams.map((exam, i) => {
              const d = new Date(exam.date);
              const day = String(d.getDate()).padStart(2, '0');
              const month = d.toLocaleString('default', { month: 'short' });
              
              return (
                <div key={i} className="p-4 bg-slate-50 rounded-xl flex items-center justify-between border border-transparent hover:border-indigo-100 hover:bg-white transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-lg flex flex-col items-center justify-center border border-slate-200 group-hover:border-indigo-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{month}</span>
                      <span className="text-sm font-bold text-slate-800">{day}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{exam.title}</h4>
                      <p className="text-xs text-slate-500">{exam.time} • {exam.subject}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider",
                    exam.status === 'UPCOMING' ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
                  )}>
                    {exam.status}
                  </span>
                </div>
              );
            }) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">No upcoming exams scheduled.</p>
              </div>
            )}
          </div>
        </div>

        {/* Today's Study Activities */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-800">Today's Study Activities</h3>
            </div>
            <button 
              onClick={() => window.location.hash = '#/courses'}
              className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-100 transition-colors"
            >
              Log Today's Work
            </button>
          </div>
          <div className="space-y-4">
            {todayStudyActivities.length > 0 ? todayStudyActivities.map((log, i) => (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-4 bg-slate-50 rounded-xl border border-transparent hover:border-indigo-100 hover:bg-white transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-widest leading-none">
                    {log.courses?.name || 'Academic'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">{log.batch} • Day Log</h4>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {log.activity || 'No activities logged for this session.'}
                </p>
                {log.assignment_details && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-1 h-1 bg-amber-400 rounded-full" />
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Assignment: {log.assignment_details}</p>
                  </div>
                )}
              </motion.div>
            )) : (
              <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">No study activities logged today.</p>
                <p className="text-[10px] text-slate-400 mt-1">Activities logged by faculty will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Payment Modal */}
      <AnimatePresence>
        {showQRPayment && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
                <div>
                  <h2 className="text-2xl font-black text-emerald-800">Quick Pay</h2>
                  <p className="text-emerald-600 text-sm font-bold">Scan to pay pending fees</p>
                </div>
                <button 
                  onClick={() => setShowQRPayment(false)}
                  className="p-2 hover:bg-white rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-emerald-800" />
                </button>
              </div>
              <div className="p-8 flex flex-col items-center text-center">
                <div className="p-6 bg-white border-4 border-emerald-100 rounded-[32px] mb-6">
                  <QRCode 
                    value="upi://pay?pa=edunexus@upi&pn=EduNexus%20College&am=5000&cu=INR" 
                    size={200}
                    fgColor="#065f46"
                  />
                </div>
                <div className="space-y-2 mb-8">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Amount to Pay</p>
                  <p className="text-4xl font-black text-slate-900">₹5,000.00</p>
                  <p className="text-xs text-slate-400">Tuition Fee - Semester 4</p>
                </div>
                <div className="w-full grid grid-cols-2 gap-4">
                  <button className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">
                    Download QR
                  </button>
                  <button className="py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
                    I've Paid
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface QuickActionProps {
  title: string;
  icon: any;
  color: string;
  onClick: () => void;
}

const QuickActionCard: React.FC<QuickActionProps> = ({ title, icon: Icon, color, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all flex items-center gap-4 group text-left"
  >
    <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-110", color)}>
      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
    </div>
    <span className="font-bold text-slate-700 text-xs sm:text-sm">{title}</span>
  </button>
);

