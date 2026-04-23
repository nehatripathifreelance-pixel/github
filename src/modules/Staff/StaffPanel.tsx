import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  BookOpen, 
  Bell, 
  LogOut, 
  User, 
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  Download,
  Share2,
  Printer,
  Search,
  Filter
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const StaffPanel: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'attendance' | 'academic' | 'profile'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [notices, setNotices] = useState<any[]>([]);
  const [staffData, setStaffData] = useState<any>(null);
  const [studyLogs, setStudyLogs] = useState<any[]>([]);
  const [timetables, setTimetables] = useState<any[]>([]);
  const [syllabi, setSyllabi] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchStaffData();
      fetchNotices();
      fetchAcademicData();
    }
  }, [user]);

  const fetchStaffData = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();
      
      if (data) setStaffData(data);
    } catch (error) {
      console.error('Error fetching staff data:', error);
    }
  };

  const fetchNotices = async () => {
    try {
      const { data } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setNotices(data || []);
    } catch (error) {
      console.error('Error fetching notices:', error);
    }
  };

  const fetchAcademicData = async () => {
    setIsLoading(true);
    try {
      const [{ data: logs }, { data: schedule }, { data: courseSyllabi }] = await Promise.all([
        supabase.from('study_activities').select('*, students(name)').order('date', { ascending: false }),
        supabase.from('timetable').select('*').order('day'),
        supabase.from('syllabus').select('*')
      ]);

      setStudyLogs(logs || []);
      setTimetables(schedule || []);
      setSyllabi(courseSyllabi || []);
    } catch (error) {
      console.error('Error fetching academic data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePrintDocument = (type: string, data: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let content = '';
    const dateStr = new Date().toLocaleDateString();

    if (type === 'study-log') {
      content = `
        <div style="font-family: sans-serif; padding: 40px;">
          <h1 style="color: #ef4444; margin-bottom: 5px;">STUDY PROGRESS LOG</h1>
          <p style="color: #64748b; margin-top: 0;">Generated on: ${dateStr}</p>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left;">Date</th>
                <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left;">Student</th>
                <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left;">Subject</th>
                <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left;">Topic Covered</th>
                <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left;">Duration</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((log: any) => `
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 12px;">${log.date}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 12px;">${log.students?.name || 'N/A'}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 12px;">${log.subject}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 12px;">${log.topic}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 12px;">${log.duration} mins</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (type === 'timetable') {
      content = `
        <div style="font-family: sans-serif; padding: 40px;">
          <h1 style="color: #ef4444; margin-bottom: 5px;">ACADEMIC TIMETABLE</h1>
          <p style="color: #64748b; margin-top: 0;">Generated on: ${dateStr}</p>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left;">Day</th>
                <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left;">Time</th>
                <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left;">Subject</th>
                <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left;">Faculty</th>
                <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left;">Room</th>
              </tr>
            </thead>
            <tbody>
              ${data.sort((a: any, b: any) => {
                const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                return days.indexOf(a.day_of_week) - days.indexOf(b.day_of_week);
              }).map((slot: any) => `
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 12px;">${slot.day_of_week}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 12px;">${slot.start_time} - ${slot.end_time}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 12px;">${slot.subject_name}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 12px;">${slot.faculty_name}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 12px;">${slot.room_no}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    printWindow.document.write(`<html><head><title>Print Report</title></head><body>${content}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleShare = (type: string, data: any) => {
    const text = `Check out the latest ${type} from our college portal.`;
    if (navigator.share) {
      navigator.share({
        title: `${type.toUpperCase()} - College Portal`,
        text: text,
        url: window.location.href,
      }).catch(console.error);
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + window.location.href)}`;
      window.open(waUrl, '_blank');
    }
  };

  const handleExportCSV = (type: string, data: any[]) => {
    let headers: string[] = [];
    let rows: any[] = [];

    if (type === 'study-log') {
      headers = ['Date', 'Student', 'Subject', 'Topic', 'Duration'];
      rows = data.map(log => [log.date, log.students?.name, log.subject, log.topic, log.duration]);
    } else if (type === 'timetable') {
      headers = ['Day', 'Start Time', 'End Time', 'Subject', 'Faculty', 'Room'];
      rows = data.map(slot => [slot.day_of_week, slot.start_time, slot.end_time, slot.subject_name, slot.faculty_name, slot.room_no]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${type}_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Users className="w-5 h-5" />
          </div>
          <span className="font-black text-primary tracking-tight">STAFF PANEL</span>
        </div>
        <button onClick={() => logout()} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar - Desktop */}
      <div className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col sticky top-0 h-screen">
        <div className="p-8 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="block font-black text-primary tracking-tight leading-tight uppercase">Staff</span>
              <span className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase">Portal v2.0</span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary font-bold">
                {user?.name?.charAt(0) || 'S'}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-slate-800 text-sm truncate">{user?.name}</p>
                <p className="text-[10px] font-black text-primary uppercase tracking-wider truncate">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'dashboard', icon: TrendingUp, label: 'Dashboard' },
            { id: 'attendance', icon: Clock, label: 'Attendance' },
            { id: 'academic', icon: BookOpen, label: 'Academic Records' },
            { id: 'profile', icon: User, label: 'My Profile' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all group",
                activeTab === tab.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:bg-primary/5 hover:text-primary"
              )}
            >
              <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-white" : "group-hover:scale-110 transition-transform")} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold hover:bg-rose-100 transition-all border border-rose-100"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-black text-slate-800 tracking-tight">Staff Dashboard</h1>
                  <p className="text-slate-500 font-medium">Welcome back, {user?.name || 'Staff Member'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-slate-600">{formatDate(new Date().toISOString())}</span>
                  </div>
                </div>
              </div>

              {/* Notice Ticker */}
              {notices.length > 0 && (
                <div className="bg-primary p-1 rounded-2xl shadow-lg shadow-primary/20 overflow-hidden relative group">
                  <div className="bg-primary/95 absolute left-0 top-0 bottom-0 px-4 flex items-center gap-2 z-10 border-r border-white/10">
                    <Bell className="w-4 h-4 text-white animate-bounce" />
                    <span className="text-[10px] font-black tracking-widest text-white uppercase">NOTICE</span>
                  </div>
                  <div className="whitespace-nowrap flex overflow-hidden py-3">
                    <motion.div
                      animate={{ x: [0, -1000] }}
                      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                      className="flex gap-12 pl-[150px]"
                    >
                      {notices.map((n, i) => (
                        <span key={i} className="text-white text-sm font-bold drop-shadow-sm">
                          {n.title}: {n.message}
                        </span>
                      ))}
                    </motion.div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-800">100%</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Attendance</p>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-800">Active</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Status</p>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-800">{timetables.length}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Scheduled Slots</p>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-800">{studyLogs.length}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Logs Updated</p>
                </div>
              </div>

              {/* Notices Feed */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                    <Bell className="w-6 h-6 text-primary" />
                    Latest Announcements
                  </h3>
                </div>
                <div className="space-y-4">
                  {notices.map((notice, i) => (
                    <div key={i} className="flex gap-4 p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:border-primary/20 transition-all group">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary font-bold shadow-sm shrink-0">
                        {notice.type?.[0] || 'N'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-slate-800">{notice.title}</h4>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatDate(notice.created_at)}</span>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2">{notice.message}</p>
                      </div>
                    </div>
                  ))}
                  {notices.length === 0 && (
                    <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                      <Bell className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest">No New Notices</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'academic' && (
            <motion.div
              key="academic"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-black text-slate-800 tracking-tight">Academic Documents</h1>
                  <p className="text-slate-500 font-medium">Download, print or share academic records.</p>
                </div>
              </div>

              {/* Study Logs */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-6 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Study Progress Logs</h3>
                      <p className="text-sm text-slate-400 uppercase font-black tracking-widest mt-1">Student Progress History</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleExportCSV('study-log', studyLogs)}
                      className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-2 text-sm font-bold"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                    <button 
                      onClick={() => handlePrintDocument('study-log', studyLogs)}
                      className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-200 transition-all shadow-sm"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleShare('Study ProgressLog', studyLogs)}
                      className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-200 transition-all shadow-sm"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Student</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Subject</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Topic</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {studyLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-bold text-slate-600">{log.date}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-800">{log.students?.name || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm font-bold text-primary">{log.subject}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{log.topic}</td>
                          <td className="px-6 py-4 text-sm font-mono text-slate-500">{log.duration} mins</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Timetable */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-6 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Academic Timetable</h3>
                      <p className="text-sm text-slate-400 uppercase font-black tracking-widest mt-1">Class Schedules</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleExportCSV('timetable', timetables)}
                      className="p-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm flex items-center gap-2 text-sm font-bold"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                    <button 
                      onClick={() => handlePrintDocument('timetable', timetables)}
                      className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-200 transition-all shadow-sm"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleShare('Academic Timetable', timetables)}
                      className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-200 transition-all shadow-sm"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Day</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Time Slot</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Subject</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Faculty</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Room</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {timetables.map((slot) => (
                        <tr key={slot.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-black text-primary uppercase">{slot.day_of_week}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-700">{slot.start_time} - {slot.end_time}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-800">{slot.subject_name}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{slot.faculty_name}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">{slot.room_no}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Syllabus */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-6 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Course Syllabus</h3>
                      <p className="text-sm text-slate-400 uppercase font-black tracking-widest mt-1">Curriculum Details</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {syllabi.map((item, i) => (
                    <div key={i} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:border-emerald-200 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                          Unit {item.unit_no || i + 1}
                        </span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleShare('Syllabus Unit', item)} className="p-2 text-slate-400 hover:text-emerald-500">
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-bold text-slate-800 mb-2">{item.unit_title}</h4>
                      <p className="text-sm text-slate-500 line-clamp-3">{item.description}</p>
                    </div>
                  ))}
                  {syllabi.length === 0 && (
                    <div className="col-span-full text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                      <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No Syllabus Data</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'attendance' && (
            <motion.div
              key="attendance"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
               <h1 className="text-3xl font-black text-slate-800 tracking-tight">Staff Attendance</h1>
               <div className="bg-white p-12 rounded-[40px] text-center border border-slate-100 shadow-sm">
                <Clock className="w-20 h-20 text-primary/20 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-slate-800">Attendance Tracking</h3>
                <p className="text-slate-500 max-w-md mx-auto mt-2">Your biometric and manual attendance logs can be viewed here soon. Currently all staff marked as 100% Present.</p>
               </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">My Profile</h1>
              <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
                <div className="bg-primary h-32 md:h-48 relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
                </div>
                <div className="px-8 md:px-12 pb-12 relative">
                  <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-16 md:-mt-20 mb-10">
                    <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-[40px] p-2 shadow-2xl relative z-10 group">
                      <div className="w-full h-full bg-slate-100 rounded-[32px] flex items-center justify-center text-primary text-4xl font-black border-4 border-white overflow-hidden">
                        {staffData?.photo_url ? (
                          <img src={staffData.photo_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          user?.name?.charAt(0) || 'S'
                        )}
                      </div>
                    </div>
                    <div className="pb-4">
                      <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight">{staffData?.name || user?.name}</h2>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-black tracking-widest uppercase">{user?.role}</span>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-xs font-black tracking-widest uppercase">{staffData?.status || 'Active'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">Employment Details</h3>
                        <div className="grid grid-cols-1 gap-6">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Staff ID</p>
                            <p className="text-sm font-bold text-slate-700">{staffData?.id || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Designation</p>
                            <p className="text-sm font-bold text-slate-700">{staffData?.designation || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Department</p>
                            <p className="text-sm font-bold text-slate-700">{staffData?.branch || 'N/A'}</p>
                          </div>
                   
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-4">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">Contact Information</h3>
                        <div className="grid grid-cols-1 gap-6">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                            <p className="text-sm font-bold text-slate-700">{staffData?.email || user?.email || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                            <p className="text-sm font-bold text-slate-700">{staffData?.phone || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Address</p>
                            <p className="text-sm font-bold text-slate-700">{staffData?.address || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
