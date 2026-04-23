import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  ClipboardList, 
  FileText, 
  Award, 
  BookOpen, 
  History, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus, 
  Save, 
  ChevronRight, 
  LayoutDashboard,
  Timer,
  Printer,
  Download,
  Edit2,
  Trash2,
  AlertCircle,
  Megaphone,
  Volume2,
  Bell
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';

interface Student {
  id: string;
  name: string;
  roll_no: string;
  course_id: string;
  batch: string;
  attendance_status?: 'Present' | 'Absent' | 'Late';
}

interface Course {
  id: string;
  name: string;
}

interface Exam {
  id: string;
  title: string;
  subject: string;
  date: string;
  time: string;
  status: string;
}

interface Result {
  id: string;
  student_id: string;
  exam_id: string;
  marks_obtained: number;
  total_marks: number;
  status: string;
  evaluation_data?: any;
  published_at?: string;
  exams?: {
    title: string;
    subject: string;
  };
  students?: {
    name: string;
  };
}

// import { NoticeTicker } from '../../components/NoticeTicker';

export const FacultyPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'timetable' | 'exams' | 'evaluation' | 'syllabus' | 'studylog'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  
  // Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [syllabus, setSyllabus] = useState<any[]>([]);
  const [studyLogs, setStudyLogs] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});

  // Filter State
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStudyLog, setNewStudyLog] = useState({
    course_id: '',
    batch: '',
    activities: [''],
    assignment_subject: '',
    assignment_topic: '',
    remarks: ''
  });

  useEffect(() => {
    fetchInitialData();
    fetchNotices();

    // Real-time notices
    const channel = supabase
      .channel('notices_faculty')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notices' 
      }, (payload) => {
        // Only show if targeted at All or Faculty
        if (payload.new.audience === 'All' || payload.new.audience === 'Faculty' || payload.new.audience === 'Staff') {
          setNotices(prev => [payload.new, ...prev]);
          playNotificationSound();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const playNotificationSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log('Could not play notification sound:', e));
  };

  const fetchNotices = async () => {
    const { data } = await supabase
      .from('notices')
      .select('*')
      .or('audience.eq.All,audience.eq.Faculty,audience.eq.Staff')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setNotices(data);
  };

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [coursesRes, examsRes, logsRes, settingsRes] = await Promise.all([
        supabase.from('courses').select('id, name').order('name'),
        supabase.from('exams').select('*').order('date', { ascending: false }),
        supabase.from('study_activities').select('*, courses(name)').order('date', { ascending: false }),
        supabase.from('app_settings').select('*')
      ]);

      if (coursesRes.data) setCourses(coursesRes.data);
      if (examsRes.data) setExams(examsRes.data);
      if (logsRes.data) setStudyLogs(logsRes.data);
      if (settingsRes.data) {
        const settingsObj = settingsRes.data.reduce((acc: any, curr: any) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {});
        setSettings(settingsObj.academic || {});
      }

      if (user) {
        const [ttRes, syllabusRes] = await Promise.all([
          supabase.from('timetable').select('*, courses(name)').eq('faculty', user.name).order('start_time'),
          supabase.from('syllabus').select('*, courses(name)').order('unit_number', { ascending: true })
        ]);
        if (ttRes.data) setTimetable(ttRes.data);
        if (syllabusRes.data) setSyllabus(syllabusRes.data);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentsForAttendance = async () => {
    if (!selectedCourse) return;
    setIsLoading(true);
    try {
      let query = supabase.from('students').select('id, name, roll_no, course_id, batch').eq('course_id', selectedCourse);
      if (selectedBatch) query = query.eq('batch', selectedBatch);
      
      const { data } = await query.order('name');
      if (data) {
        setStudents(data.map(s => ({ ...s, attendance_status: 'Present' })));
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    setIsSubmitting(true);
    try {
      const attendanceData = students.map(s => ({
        student_id: s.id,
        date: attendanceDate,
        status: s.attendance_status || 'Present',
        course: selectedCourse,
        batch: selectedBatch,
        method: 'MANUAL'
      }));

      const { error } = await supabase.from('attendance').insert(attendanceData);
      if (error) throw error;
      alert('Attendance marked successfully!');
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Failed to mark attendance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchResultsForEvaluation = async (examId: string) => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('results')
        .select('*, exams(title, subject), students(name)')
        .eq('exam_id', examId);
      if (data) setResults(data);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setIsLoading(true); // wait, should be false
      setIsLoading(false);
    }
  };

  const handleUpdateMarks = async (resultId: string, marks: number, totalMarks: number) => {
    try {
      const { error } = await supabase
        .from('results')
        .update({ marks_obtained: marks, status: 'draft' })
        .eq('id', resultId);
      if (error) throw error;
      setResults(prev => prev.map(r => r.id === resultId ? { ...r, marks_obtained: marks, status: 'draft' } : r));
    } catch (error) {
      console.error('Error updating marks:', error);
    }
  };

  const handlePublishResults = async (examId: string) => {
    try {
      const { error } = await supabase
        .from('results')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('exam_id', examId);
      if (error) throw error;
      
      await supabase.from('exams').update({ status: 'published' }).eq('id', examId);
      alert('Results published successfully!');
      fetchInitialData();
    } catch (error) {
      console.error('Error publishing results:', error);
    }
  };

  const handleCreateStudyLog = async () => {
    if (!newStudyLog.course_id || !newStudyLog.batch) {
      alert('Please select course and batch');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('study_activities').insert([{
        ...newStudyLog,
        teacher_id: user?.id,
        date: new Date().toISOString().split('T')[0]
      }]);
      if (error) throw error;
      alert('Study log created successfully!');
      setNewStudyLog({
        course_id: '',
        batch: '',
        activities: [''],
        assignment_subject: '',
        assignment_topic: '',
        remarks: ''
      });
      fetchInitialData();
    } catch (error) {
      console.error('Error creating study log:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintDocument = (type: 'studylog' | 'timetable' | 'syllabus') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let title = '';
    let content = '';

    if (type === 'studylog') {
      title = 'Study Log History';
      content = `
        <div class="header">
          <h1 class="college">Study Log History</h1>
          <p class="receipt-no">Faculty: ${user?.name}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase;">Date</th>
              <th style="padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase;">Course</th>
              <th style="padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase;">Batch</th>
              <th style="padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase;">Activities</th>
            </tr>
          </thead>
          <tbody>
            ${studyLogs.map(log => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px; font-size: 12px; font-weight: 700;">${formatDate(log.date)}</td>
                <td style="padding: 12px; font-size: 12px;">${log.courses?.name}</td>
                <td style="padding: 12px; font-size: 12px;">${log.batch}</td>
                <td style="padding: 12px; font-size: 12px;">${Array.isArray(log.activities) ? log.activities.join(', ') : log.activities}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (type === 'timetable') {
      title = 'Faculty Time Table';
      content = `
        <div class="header">
          <h1 class="college">Faculty Time Table</h1>
          <p class="receipt-no">Faculty: ${user?.name}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase;">Day</th>
              <th style="padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase;">Subject</th>
              <th style="padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase;">Time</th>
              <th style="padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase;">Batch</th>
            </tr>
          </thead>
          <tbody>
            ${timetable.map(slot => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px; font-size: 12px; font-weight: 700;">${slot.day}</td>
                <td style="padding: 12px; font-size: 12px;">${slot.subject} ${slot.room ? `(${slot.room})` : ''}</td>
                <td style="padding: 12px; font-size: 12px;">${slot.start_time} - ${slot.end_time}</td>
                <td style="padding: 12px; font-size: 12px;">${slot.courses?.name || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (type === 'syllabus') {
      title = 'Syllabus Blueprint';
      content = `
        <div class="header">
          <h1 class="college">Syllabus Blueprint</h1>
        </div>
        <div style="margin-top: 20px;">
          ${syllabus.map(item => `
            <div class="unit-card">
              <h3 class="unit-title">${item.courses?.name} - Unit ${item.unit_number}: ${item.unit_title || item.title}</h3>
              <p class="unit-desc">${item.description || 'No description provided.'}</p>
            </div>
          `).join('')}
        </div>
      `;
    }

  const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 20px; margin-bottom: 30px; }
            .college { font-size: 24px; font-weight: 900; color: #ef4444; text-transform: uppercase; margin: 0; }
            .receipt-no { font-size: 12px; color: #64748b; margin-top: 5px; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase; }
            td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
            .unit-card { margin-bottom: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
            .unit-title { margin: 0; color: #ef4444; font-size: 16px; font-weight: 900; }
            .unit-desc { margin: 10px 0 0; font-size: 14px; color: #475569; }
          </style>
        </head>
        <body>
          ${content}
          <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px;">
            <p>Generated via Faculty Panel • ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 1000);
  };

  const handleDownloadCSV = (type: 'studylog' | 'timetable') => {
    let dataToExport: any[] = [];
    let filename = '';

    if (type === 'studylog') {
      dataToExport = studyLogs.map(log => ({
        Date: formatDate(log.date),
        Course: log.courses?.name,
        Batch: log.batch,
        Activities: Array.isArray(log.activities) ? log.activities.join('; ') : log.activities,
        Assignment: log.assignment_subject ? `${log.assignment_subject}: ${log.assignment_topic}` : 'None'
      }));
      filename = `faculty_study_log_${user?.name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'timetable') {
      dataToExport = timetable.map(slot => ({
        Day: slot.day,
        Subject: slot.subject,
        Time: `${slot.start_time} - ${slot.end_time}`,
        Batch: slot.batch,
        Room: slot.room || 'N/A'
      }));
      filename = `faculty_timetable_${user?.name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    }

    if (dataToExport.length === 0) return;

    const headers = Object.keys(dataToExport[0]).join(',');
    const rows = dataToExport.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
      ).join(',')
    ).join('\n');

    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async (type: string) => {
    const shareData = {
      title: `${type} - Faculty Panel`,
      text: `Academic data share: ${type}`,
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) { console.log(err); }
    } else {
      alert(`Share this link: ${window.location.href}`);
    }
  };

  if (isLoading && activeTab === 'overview') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      {/* Live Notice Ticker */}
      {/* <NoticeTicker audience="Staff" /> */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Faculty Panel</h1>
          <p className="text-slate-500 font-medium">Welcome back, {user?.name}. Manage your classes and students.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white border border-primary/10 rounded-xl shadow-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 p-1 bg-primary/5 rounded-2xl overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'attendance', label: 'Attendance', icon: Users },
          { id: 'timetable', label: 'Schedule', icon: Calendar },
          { id: 'exams', label: 'Examination', icon: FileText },
          { id: 'evaluation', label: 'Evaluation', icon: Award },
          { id: 'syllabus', label: 'Syllabus', icon: BookOpen },
          { id: 'studylog', label: 'Study Log', icon: History }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
              activeTab === tab.id ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-primary"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div 
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[32px] border border-primary/10 shadow-sm">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Students</p>
                  <p className="text-3xl font-black text-slate-900">124</p>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-primary/10 shadow-sm">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Today's Classes</p>
                  <p className="text-3xl font-black text-slate-900">{timetable.filter(t => t.day === new Date().toLocaleDateString('en-US', { weekday: 'long' })).length}</p>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-primary/10 shadow-sm">
                  <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Pending Results</p>
                  <p className="text-3xl font-black text-slate-900">{exams.filter(e => e.results_status === 'PENDING').length}</p>
                </div>
              </div>

              {/* Announcements */}
              <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-indigo-600" />
                    Notice Board
                  </h3>
                  <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-lg">Real-time</span>
                </div>
                <div className="space-y-4">
                  {notices.map((notice, i) => (
                    <div key={`notice-${i}`} className="p-5 bg-indigo-50/30 rounded-3xl border border-indigo-100 group relative overflow-hidden transition-all hover:bg-indigo-50/50">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                          <Bell className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-indigo-400">{formatDate(notice.created_at)}</span>
                            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] font-black uppercase rounded">{notice.type}</span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm">{notice.title}</h4>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{notice.content}</p>
                        </div>
                        <Volume2 className="w-10 h-10 absolute -right-3 -bottom-3 text-indigo-200/20 group-hover:scale-110 transition-transform" />
                      </div>
                    </div>
                  ))}
                  {notices.length === 0 && (
                    <div className="py-8 text-center text-slate-400 font-bold">No notifications yet.</div>
                  )}
                </div>
              </div>

              {/* Recent Study Logs */}
              <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-800">Recent Study Logs</h3>
                  <button onClick={() => setActiveTab('studylog')} className="text-xs font-bold text-primary hover:underline">Create New</button>
                </div>
                <div className="space-y-4">
                  {studyLogs.slice(0, 3).map((log) => (
                    <div key={log.id} className="p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-primary/10 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{formatDate(log.date)}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{log.batch}</span>
                      </div>
                      <h4 className="font-bold text-slate-800">{log.courses?.name}</h4>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-1">{log.activities.join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Quick Actions */}
              <div className="bg-primary p-8 rounded-[32px] text-white shadow-xl shadow-primary/20">
                <h3 className="text-xl font-black mb-6">Quick Actions</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => setActiveTab('attendance')}
                    className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-between group transition-all"
                  >
                    <span className="font-bold">Mark Attendance</span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => setActiveTab('evaluation')}
                    className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-between group transition-all"
                  >
                    <span className="font-bold">Evaluate Results</span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => setActiveTab('studylog')}
                    className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-between group transition-all"
                  >
                    <span className="font-bold">Update Study Log</span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Today's Schedule */}
              <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
                <h3 className="text-xl font-black text-slate-800 mb-6">Today's Schedule</h3>
                <div className="space-y-6">
                  {timetable.filter(t => t.day === new Date().toLocaleDateString('en-US', { weekday: 'long' })).map((slot) => (
                    <div key={slot.id} className="flex gap-4">
                      <div className="w-px bg-slate-100 relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full"></div>
                      </div>
                      <div className="pb-6">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{slot.start_time} - {slot.end_time}</p>
                        <h4 className="font-bold text-slate-800">{slot.subject}</h4>
                        <p className="text-xs text-slate-500">{slot.courses?.name} • Room {slot.room}</p>
                      </div>
                    </div>
                  ))}
                  {timetable.filter(t => t.day === new Date().toLocaleDateString('en-US', { weekday: 'long' })).length === 0 && (
                    <p className="text-center text-slate-400 font-bold py-4">No classes scheduled for today.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'attendance' && (
          <motion.div 
            key="attendance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Course</label>
                <select 
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-6 py-4 bg-background border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                >
                  <option value="">Choose Course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Batch</label>
                <input 
                  type="text"
                  placeholder="e.g. 2023-27"
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full px-6 py-4 bg-background border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Date</label>
                <input 
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full px-6 py-4 bg-background border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
              <div className="flex items-end">
                <button 
                  onClick={fetchStudentsForAttendance}
                  disabled={!selectedCourse}
                  className="px-8 py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  Fetch Students
                </button>
              </div>
            </div>

            {students.length > 0 && (
              <div className="bg-white rounded-[32px] border border-primary/10 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-800">Mark Attendance</h3>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setStudents(prev => prev.map(s => ({ ...s, attendance_status: 'Present' })))}
                      className="text-xs font-bold text-emerald-600 hover:underline"
                    >
                      Mark All Present
                    </button>
                    <button 
                      onClick={handleMarkAttendance}
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-primary text-white rounded-xl text-xs font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Attendance'}
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-primary/5">
                        <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Roll No</th>
                        <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Student Name</th>
                        <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-primary/5 transition-colors">
                          <td className="px-8 py-5 text-sm font-mono font-bold text-slate-600">{student.roll_no}</td>
                          <td className="px-8 py-5 text-sm font-black text-slate-800">{student.name}</td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              {(['Present', 'Absent', 'Late'] as const).map((status) => (
                                <button
                                  key={status}
                                  onClick={() => setStudents(prev => prev.map(s => s.id === student.id ? { ...s, attendance_status: status } : s))}
                                  className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    student.attendance_status === status 
                                      ? status === 'Present' ? "bg-emerald-500 text-white" : status === 'Absent' ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                                      : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                  )}
                                >
                                  {status}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'timetable' && (
          <motion.div 
            key="timetable"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-[32px] border border-primary/10 shadow-sm overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800">Weekly Schedule</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleDownloadCSV('timetable')}
                  className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all border border-emerald-100 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>
                <button 
                  onClick={() => handlePrintDocument('timetable')}
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button 
                  onClick={() => handleShare('Faculty Schedule')}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all"
                >
                  Share
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-primary/5">
                    <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Day</th>
                    <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Time</th>
                    <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Subject</th>
                    <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Course</th>
                    <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Room</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {timetable.map((slot) => (
                    <tr key={slot.id} className={cn(
                      "transition-colors",
                      slot.type === 'Holiday' ? "bg-rose-50/30 hover:bg-rose-50/50" :
                      slot.type === 'Event' ? "bg-amber-50/30 hover:bg-amber-50/50" :
                      "hover:bg-primary/5"
                    )}>
                      <td className="px-8 py-5 text-sm font-black text-slate-800">{slot.day}</td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-600">{slot.start_time} - {slot.end_time}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          {slot.type === 'Holiday' && <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black uppercase rounded">Holiday</span>}
                          {slot.type === 'Event' && <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[8px] font-black uppercase rounded">Event</span>}
                          <span className={cn(
                            "text-sm font-black",
                            slot.type === 'Holiday' ? "text-rose-600" :
                            slot.type === 'Event' ? "text-amber-600" :
                            "text-primary"
                          )}>{slot.subject}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-700">{slot.courses?.name || 'Academic'}</td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-500">{slot.room}</td>
                    </tr>
                  ))}
                  {timetable.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold">No schedule found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'exams' && (
          <motion.div 
            key="exams"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {exams.map((exam) => (
              <div key={exam.id} className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm hover:border-primary/20 transition-all space-y-6 group">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    exam.status === 'UPCOMING' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                  )}>
                    {exam.status}
                  </span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-primary/5 rounded-xl text-primary transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">{exam.title}</h3>
                  <p className="text-sm font-bold text-primary mt-1">{exam.subject}</p>
                </div>
                <div className="space-y-3 pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                    <Calendar className="w-4 h-4" />
                    {formatDate(exam.date)}
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                    <Clock className="w-4 h-4" />
                    {exam.time}
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setActiveTab('evaluation');
                    fetchResultsForEvaluation(exam.id);
                  }}
                  className="w-full py-3 bg-primary/5 text-primary rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                >
                  Manage Results
                </button>
              </div>
            ))}
            <button className="bg-background border-2 border-dashed border-primary/20 rounded-[32px] p-8 flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-primary/40 hover:text-primary transition-all group">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-black uppercase tracking-widest text-xs">Schedule New Exam</span>
            </button>
          </motion.div>
        )}

        {activeTab === 'evaluation' && (
          <motion.div 
            key="evaluation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Result Evaluation</h3>
                  <p className="text-sm text-slate-500 font-medium">Update student marks and publish results.</p>
                </div>
                {results.length > 0 && !results[0].is_published && (
                  <button 
                    onClick={() => handlePublishResults(results[0].exam_id)}
                    className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Publish All Results
                  </button>
                )}
              </div>

              {results.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-primary/5">
                        <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Student Name</th>
                        <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Exam</th>
                        <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Marks Obtained</th>
                        <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Status</th>
                        <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {results.map((res) => (
                        <tr key={res.id} className="hover:bg-primary/5 transition-colors">
                          <td className="px-8 py-5 text-sm font-black text-slate-800">{res.students?.name || 'N/A'}</td>
                          <td className="px-8 py-5">
                            <p className="text-sm font-bold text-slate-700">{res.exams?.title}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{res.exams?.subject}</p>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <input 
                                type="number"
                                value={res.marks_obtained || 0}
                                onChange={(e) => handleUpdateMarks(res.id, Number(e.target.value), res.total_marks)}
                                className="w-20 px-3 py-2 bg-background border-none rounded-xl text-sm font-black focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                              />
                              <span className="text-sm font-bold text-slate-400">/ {res.total_marks}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                              res.status === 'published' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                            )}>
                              {res.status === 'published' ? (res.marks_obtained >= (res.total_marks * 0.4) ? 'PASSED' : 'FAILED') : 'DRAFT'}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <button className="p-2 text-slate-400 hover:text-primary transition-all">
                              <Download className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <Award className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">Select an exam to start evaluation.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'syllabus' && (
          <motion.div 
            key="syllabus"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Syllabus Management</h3>
                  <p className="text-sm text-slate-500 font-medium">View and manage unit-wise curriculum.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handlePrintDocument('syllabus')}
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" /> Export/Print
                  </button>
                  <button className="px-6 py-3 bg-primary text-white rounded-xl text-xs font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Unit
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courses.map(course => {
                  const courseSyllabus = syllabus.filter(s => s.course_id === course.id);
                  return (
                    <div key={course.id} className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-slate-800">{course.name}</h4>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{courseSyllabus.length} Units</span>
                      </div>
                      <div className="space-y-2">
                        {courseSyllabus.map(item => (
                          <div key={item.id} className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between group">
                            <span className="text-xs font-bold text-slate-600">Unit {item.unit_number}: {item.unit_title || item.title}</span>
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-primary">
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {courseSyllabus.length === 0 && <p className="text-xs text-slate-400 italic">No syllabus units found.</p>}
                      </div>
                      <button className="w-full py-3 bg-white text-primary rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all border border-primary/10">
                        View Full Syllabus
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'studylog' && (
          <motion.div 
            key="studylog"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm space-y-6">
                <h3 className="text-xl font-black text-slate-800">Create Study Log</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Course</label>
                    <select 
                      value={newStudyLog.course_id}
                      onChange={(e) => setNewStudyLog(prev => ({ ...prev, course_id: e.target.value }))}
                      className="w-full px-6 py-4 bg-background border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      <option value="">Select Course</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Batch</label>
                    <input 
                      type="text"
                      placeholder="e.g. 2023-27"
                      value={newStudyLog.batch}
                      onChange={(e) => setNewStudyLog(prev => ({ ...prev, batch: e.target.value }))}
                      className="w-full px-6 py-4 bg-background border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Activities</label>
                    {newStudyLog.activities.map((act, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input 
                          type="text"
                          value={act}
                          onChange={(e) => {
                            const newActs = [...newStudyLog.activities];
                            newActs[idx] = e.target.value;
                            setNewStudyLog(prev => ({ ...prev, activities: newActs }));
                          }}
                          placeholder={`Activity ${idx + 1}`}
                          className="flex-1 px-6 py-4 bg-background border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                        {idx === newStudyLog.activities.length - 1 && (
                          <button 
                            onClick={() => setNewStudyLog(prev => ({ ...prev, activities: [...prev.activities, ''] }))}
                            className="p-4 bg-primary/5 text-primary rounded-2xl hover:bg-primary hover:text-white transition-all"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Assignment (Optional)</label>
                    <input 
                      type="text"
                      placeholder="Subject"
                      value={newStudyLog.assignment_subject}
                      onChange={(e) => setNewStudyLog(prev => ({ ...prev, assignment_subject: e.target.value }))}
                      className="w-full px-6 py-4 bg-background border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all mb-2"
                    />
                    <input 
                      type="text"
                      placeholder="Topic"
                      value={newStudyLog.assignment_topic}
                      onChange={(e) => setNewStudyLog(prev => ({ ...prev, assignment_topic: e.target.value }))}
                      className="w-full px-6 py-4 bg-background border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <button 
                    onClick={handleCreateStudyLog}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {isSubmitting ? 'Saving...' : 'Save Study Log'}
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-slate-800">Study Log History</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDownloadCSV('studylog')}
                      className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all border border-emerald-100 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Export CSV
                    </button>
                    <button 
                      onClick={() => handlePrintDocument('studylog')}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" /> Print Logs
                    </button>
                    <button 
                      onClick={() => handleShare('Faculty Study Logs')}
                      className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all"
                    >
                      Share
                    </button>
                  </div>
                </div>
                <div className="space-y-6">
                  {studyLogs.map((log) => (
                    <div key={log.id} className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest">{formatDate(log.date)}</p>
                          <h4 className="font-black text-slate-800">{log.courses?.name}</h4>
                        </div>
                        <span className="px-3 py-1 bg-white rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-100">{log.batch}</span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Activities Done:</p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {log.activities.map((act: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              {act}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {log.assignment_subject && (
                        <div className="pt-4 border-t border-slate-200">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Assignment Given:</p>
                          <div className="p-3 bg-white rounded-xl border border-slate-100">
                            <p className="text-sm font-bold text-slate-800">{log.assignment_subject}</p>
                            <p className="text-xs text-slate-500">{log.assignment_topic}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
