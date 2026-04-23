import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Calendar, 
  Award, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  ChevronRight,
  Receipt,
  Printer,
  X,
  ArrowRight,
  Clock,
  FileText,
  TrendingUp,
  Download,
  Volume2,
  History,
  MessageSquare,
  Megaphone,
  BookOpen
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { NoticeTicker } from '../../components/NoticeTicker';

interface ChildProgress {
  student: any;
  attendance: number;
  attendanceHistory: any[];
  results: any[];
  pendingFees: number;
  feesHistory: any[];
  upcomingExams: any[];
  application: any | null;
  courses: any[];
  timetable: any[];
}

export const ParentPanel: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [childProgress, setChildProgress] = useState<ChildProgress | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'results' | 'fees' | 'application' | 'timetable' | 'courses' | 'studylog'>('overview');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<any>(null);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [notices, setNotices] = useState<any[]>([]);
  const [studyLogs, setStudyLogs] = useState<any[]>([]);
  const [syllabus, setSyllabus] = useState<any[]>([]);

  useEffect(() => {
    fetchChildProgress();
    fetchSettings();
    fetchNotices();
    
    // Real-time notices
    const channel = supabase
      .channel('notices_all')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notices' 
      }, (payload) => {
        setNotices(prev => [payload.new, ...prev]);
        playNotificationSound();
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
      .or('audience.eq.All,audience.eq.Parents')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setNotices(data);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*');
    if (data) {
      const settingsObj = data.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      setSettings(settingsObj.academic || {});
    }
  };

  const fetchChildProgress = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 1. Find the student linked to this parent
      // Derive student ID from parent login ID (P-STU... -> STU...)
      const studentId = user.id.startsWith('P-') ? user.id.replace('P-', '') : '';
      
      let student;
      if (studentId) {
        const { data } = await supabase.from('students').select('*').eq('id', studentId).maybeSingle();
        student = data;
      }

      // Fallback if not found by ID (legacy/manual check)
      if (!student) {
        const { data } = await supabase
          .from('students')
          .select('*')
          .or(`parent_email.eq.${user.email},parent_phone.eq.${user.email}`)
          .maybeSingle();
        student = data;
      }

      if (student) {
        // 2. Fetch Attendance
        const { data: attendance } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', student.id)
          .order('date', { ascending: false });

        // 3. Fetch Results
        const { data: results } = await supabase
          .from('results')
          .select('*, exams(title, date)')
          .eq('student_id', student.id)
          .order('created_at', { ascending: false });

        // 4. Fetch Fees
        const { data: fees } = await supabase
          .from('fees')
          .select('*')
          .eq('student_id', student.id)
          .order('due_date', { ascending: true });

        // 5. Fetch Upcoming Exams
        const { data: exams } = await supabase
          .from('exams')
          .select('*')
          .eq('course_id', student.course_id)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true });

        // 6. Fetch Study Logs for student's course
        const { data: logs } = await supabase
          .from('study_activities')
          .select('*, staff(name, designation)')
          .eq('course_id', student.course_id)
          .eq('batch', student.batch)
          .order('date', { ascending: false })
          .limit(10);
        
        setStudyLogs(logs || []);

        // 7. Fetch Application status
        const { data: application } = await supabase
          .from('applications')
          .select('*, courses(name)')
          .or(`email.eq.${student.email},phone.eq.${student.phone}`)
          .maybeSingle();

        // 8. Fetch Course Details
        const { data: courses } = await supabase
          .from('courses')
          .select('*')
          .eq('id', student.course_id);

        // 9. Fetch Timetable
        const { data: timetable } = await supabase
          .from('timetable')
          .select('*')
          .eq('course_id', student.course_id)
          .eq('batch', student.batch)
          .order('day');

        // 10. Fetch Syllabus
        const { data: syllabusData } = await supabase
          .from('syllabus')
          .select('*')
          .eq('course_id', student.course_id)
          .order('unit_number', { ascending: true });
        
        setSyllabus(syllabusData || []);

        const attendanceList = attendance || [];
        const presentCount = attendanceList.filter(a => a.status === 'Present' || a.status === 'PRESENT').length;
        const totalAttendance = attendanceList.length;
        const attendancePercentage = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

        const feesList = fees || [];
        const pendingFees = feesList.filter(f => f.status === 'PENDING').reduce((acc, f) => acc + Number(f.amount), 0);

        setChildProgress({
          student,
          attendance: attendancePercentage,
          attendanceHistory: attendanceList,
          results: results || [],
          pendingFees,
          feesHistory: feesList,
          upcomingExams: exams || [],
          application: application || null,
          courses: courses || [],
          timetable: timetable || []
        });
      } else {
        setChildProgress(null);
      }
    } catch (error) {
      console.error('Error fetching child progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePayment = async (fee: any) => {
    setSelectedFee(fee);
    setIsPaymentModalOpen(true);
  };

  const confirmPayment = async () => {
    if (!selectedFee) return;
    
    try {
      const { error } = await supabase
        .from('fees')
        .update({ 
          status: 'PAID',
          payment_mode: 'Online'
        })
        .eq('id', selectedFee.id);

      if (error) throw error;
      
      setIsPaymentModalOpen(false);
      fetchChildProgress();
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  };

  const handleDownloadFeeReceipt = (fee: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Fee Receipt - ${childProgress?.student?.name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 20px; margin-bottom: 30px; }
            .college { font-size: 24px; font-weight: 900; color: #ef4444; text-transform: uppercase; margin: 0; }
            .receipt-no { font-size: 12px; color: #64748b; margin-top: 5px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
            .info-group { margin-bottom: 20px; }
            .label { font-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1; display: block; font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 800; }
            .value { font-size: 14px; font-weight: 700; color: #1e293b; }
            .payment-box { background: #f8fafc; padding: 30px; border-radius: 24px; border: 1px solid #e2e8f0; margin-top: 30px; }
            .total-row { display: flex; justify-content: space-between; align-items: center; padding-top: 20px; border-top: 2px dashed #cbd5e1; margin-top: 20px; }
            .total-label { font-size: 18px; font-weight: 800; }
            .total-value { font-size: 24px; font-weight: 900; color: #ef4444; }
            .footer { margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
            .status-seal { position: absolute; top: 150px; right: 50px; border: 4px solid #22c55e; color: #22c55e; padding: 10px 30px; font-size: 24px; font-weight: 900; text-transform: uppercase; transform: rotate(-15deg); opacity: 0.2; border-radius: 12px; pointer-events: none; }
          </style>
        </head>
        <body>
          <div class="status-seal">PAID</div>
          <div class="header">
            ${settings.logo ? `<img src="${settings.logo}" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px;" referrerPolicy="no-referrer" />` : ''}
            <h1 class="college">Fee Payment Receipt</h1>
            <p class="receipt-no">Receipt #${fee.id.substring(0, 8).toUpperCase()}</p>
          </div>

          <div class="grid">
            <div class="column">
              <div class="info-group">
                <span class="label">Student Name</span>
                <span class="value">${childProgress?.student?.name}</span>
              </div>
              <div class="info-group">
                <span class="label">Student ID</span>
                <span class="value">${childProgress?.student?.id}</span>
              </div>
              <div class="info-group">
                <span class="label">Course</span>
                <span class="value">${childProgress?.student?.branch || 'N/A'}</span>
              </div>
            </div>
            <div class="column">
              <div class="info-group">
                <span class="label">Payment Date</span>
                <span class="value">${formatDate(fee.date || fee.created_at)}</span>
              </div>
              <div class="info-group">
                <span class="label">Payment Status</span>
                <span class="value">PAID</span>
              </div>
              <div class="info-group">
                <span class="label">Payment Mode</span>
                <span class="value">${fee.payment_mode || 'Online'}</span>
              </div>
            </div>
          </div>

          <div class="payment-box">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="font-weight: 600;">Description</span>
              <span style="font-weight: 600;">Amount</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: #475569;">
              <span>${fee.description || 'College Semester Fees'}</span>
              <span>${formatCurrency(fee.amount)}</span>
            </div>
            
            <div class="total-row">
              <span class="total-label">Total Amount Paid</span>
              <span class="total-value">${formatCurrency(fee.amount)}</span>
            </div>
          </div>

          <div class="footer">
            <p>This is an electronically generated receipt and does not require a physical signature.</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handlePrintDocument = (type: 'studylog' | 'timetable' | 'syllabus') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let title = '';
    let content = '';

    if (type === 'studylog') {
      title = 'Study Log Report';
      content = `
        <div class="header">
          <h1 class="college">Study Log Report</h1>
          <p class="receipt-no">Student: ${childProgress?.student?.name} | Batch: ${childProgress?.student?.batch}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase;">Date</th>
              <th style="padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase;">Activities</th>
              <th style="padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase;">Assignment</th>
            </tr>
          </thead>
          <tbody>
            ${studyLogs.map(log => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px; font-size: 12px; font-weight: 700;">${formatDate(log.date)}</td>
                <td style="padding: 12px; font-size: 12px;">${Array.isArray(log.activities) ? log.activities.join(', ') : log.activities}</td>
                <td style="padding: 12px; font-size: 12px;">${log.assignment_subject ? `<b>${log.assignment_subject}</b>: ${log.assignment_topic}` : 'None'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (type === 'timetable') {
      title = 'Class Time Table';
      content = `
        <div class="header">
          <h1 class="college">Class Time Table</h1>
          <p class="receipt-no">Batch: ${childProgress?.student?.batch} | Course: ${childProgress?.student?.branch}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase;">Day</th>
              <th style="padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase;">Subject</th>
              <th style="padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase;">Time</th>
              <th style="padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase;">Faculty</th>
            </tr>
          </thead>
          <tbody>
            ${childProgress?.timetable.map(slot => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px; font-size: 12px; font-weight: 700;">${slot.day}</td>
                <td style="padding: 12px; font-size: 12px;">${slot.subject} ${slot.room ? `(${slot.room})` : ''}</td>
                <td style="padding: 12px; font-size: 12px;">${slot.start_time} - ${slot.end_time}</td>
                <td style="padding: 12px; font-size: 12px;">${slot.faculty}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (type === 'syllabus') {
      title = 'Course Syllabus';
      content = `
        <div class="header">
          <h1 class="college">Course Syllabus</h1>
          <p class="receipt-no">Course: ${childProgress?.student?.branch}</p>
        </div>
        <div style="margin-top: 20px;">
          ${syllabus.map(item => `
            <div class="unit-card">
              <h3 class="unit-title">Unit ${item.unit_number || '#'}: ${item.unit_title || item.title}</h3>
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
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${content}
          <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px;">
            <p>Generated via Parent Portal • ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    
    // Use a more robust printing approach
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
        Course: childProgress?.student?.branch,
        Batch: childProgress?.student?.batch,
        Activities: Array.isArray(log.activities) ? log.activities.join('; ') : log.activities,
        Assignment: log.assignment_subject ? `${log.assignment_subject}: ${log.assignment_topic}` : 'None'
      }));
      filename = `study_log_${childProgress?.student?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'timetable') {
      dataToExport = childProgress?.timetable.map(slot => ({
        Day: slot.day,
        Subject: slot.subject,
        Time: `${slot.start_time} - ${slot.end_time}`,
        Faculty: slot.faculty,
        Room: slot.room || 'N/A'
      }));
      filename = `timetable_${childProgress?.student?.batch}_${new Date().toISOString().split('T')[0]}.csv`;
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
      title: `${type} - Parent Portal`,
      text: `Check out the ${type} for my child in the Parent Portal.`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share failed:', err);
      }
    } else {
      // Fallback
      alert(`Share this link: ${window.location.href}`);
    }
  };

  const handleDownloadSheet = (url: string, name: string) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `Answer_Sheet_${name.replace(/\s+/g, '_')}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadReceipt = (result: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Result Receipt - ${childProgress?.student?.name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 20px; margin-bottom: 30px; }
            .college { font-size: 24px; font-weight: 900; color: #ef4444; text-transform: uppercase; margin: 0; }
            .title { font-size: 18px; font-weight: 700; margin-top: 10px; }
            .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0; }
            .stat-box { background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; }
            .stat-label { font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }
            .stat-value { font-size: 24px; font-weight: 900; }
            .info-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            .info-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
            .info-label { font-weight: 700; color: #475569; width: 150px; }
            .status { display: inline-block; padding: 4px 12px; rounded-pill: 9999px; font-size: 10px; font-weight: 900; text-transform: uppercase; border-radius: 999px; }
            .passed { background: #f0fdf4; color: #166534; }
            .failed { background: #fef2f2; color: #991b1b; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            ${settings.logo ? `<img src="${settings.logo}" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px;" referrerPolicy="no-referrer" />` : ''}
            <h1 class="college">Academic Result Receipt</h1>
            <p class="title">Result for ${result.exams?.title || 'Examination'}</p>
          </div>
          
          <div class="stats">
            <div class="stat-box">
              <div class="stat-label">Marks Obtained</div>
              <div class="stat-value">${result.marks_obtained} / ${result.total_marks}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Percentage</div>
              <div class="stat-value">${Math.round((result.marks_obtained / result.total_marks) * 100)}%</div>
            </div>
          </div>

          <table class="info-table">
            <tr>
              <td class="info-label">Student Name</td>
              <td>${childProgress?.student?.name}</td>
            </tr>
            <tr>
              <td class="info-label">Registration ID</td>
              <td>${childProgress?.student?.id}</td>
            </tr>
            <tr>
              <td class="info-label">Subject</td>
              <td>${result.exams?.subject || result.subject || 'N/A'}</td>
            </tr>
            <tr>
              <td class="info-label">Examination Date</td>
              <td>${result.exams?.date ? formatDate(result.exams.date) : formatDate(result.created_at)}</td>
            </tr>
            <tr>
              <td class="info-label">Result Status</td>
              <td>
                <span class="status ${result.status.toLowerCase()}">${result.status}</span>
              </td>
            </tr>
          </table>

          <div class="footer">
            <p>This is a computer generated result receipt and does not require a physical signature.</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Parent Panel</h1>
          <p className="text-slate-500 text-sm font-medium">Welcome back, {user?.name}. Monitor your child's progress.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all border border-red-100"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit overflow-x-auto no-scrollbar">
        {(['overview', 'attendance', 'studylog', 'results', 'fees', 'application', 'timetable', 'courses'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all capitalize whitespace-nowrap",
              activeTab === tab 
                ? "bg-white text-primary shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab === 'studylog' ? 'Study Log' : 
             tab === 'application' ? 'Admission Application' : 
             tab === 'timetable' ? 'Time Table' : 
             tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : childProgress ? (
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Stats Overview */}
              <div className="lg:col-span-2 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-[32px] border border-primary/10 shadow-sm">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Attendance</p>
                    <p className="text-2xl font-black text-slate-800">{childProgress.attendance}%</p>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-primary/10 shadow-sm">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4">
                      <Award className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Latest Result</p>
                    <p className="text-2xl font-black text-slate-800">
                      {childProgress.results[0]?.marks_obtained || 0}/{childProgress.results[0]?.total_marks || 100}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-primary/10 shadow-sm">
                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-4">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Pending Fees</p>
                    <p className="text-2xl font-black text-slate-800">{formatCurrency(childProgress.pendingFees)}</p>
                  </div>
                </div>

                {/* Notifications Section */}
                <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
                  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                    <Bell className="w-6 h-6 text-primary" />
                    Recent Notifications
                  </h3>
                  <div className="space-y-4">
                    {/* Broadcast System Notices */}
                    {notices.map((notice, i) => (
                      <div key={`notice-${i}`} className="flex items-start gap-4 p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100 relative overflow-hidden group animate-in fade-in slide-in-from-right-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                          <Megaphone className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-widest rounded">OFFICIAL {notice.type}</span>
                            <span className="text-[10px] font-bold text-indigo-400">{formatDate(notice.created_at)}</span>
                          </div>
                          <p className="text-sm font-black text-slate-800">{notice.title}</p>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">{notice.content}</p>
                        </div>
                        <Volume2 className="w-12 h-12 absolute -right-4 -bottom-4 text-indigo-200/20 group-hover:scale-110 transition-transform" />
                      </div>
                    ))}

                    {/* Attendance Notifications */}
                    {childProgress.attendanceHistory.slice(0, 2).map((att, i) => (
                      <div key={`att-${i}`} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-l-4 border-blue-500">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">Attendance Update</p>
                          <p className="text-xs text-slate-500">Your child was marked <span className="font-bold text-blue-600">{att.status}</span> on {formatDate(att.date)}</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{formatDate(att.date)}</span>
                      </div>
                    ))}

                    {/* Result Notifications */}
                    {childProgress.results.slice(0, 2).map((res, i) => (
                      <div key={`res-${i}`} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-l-4 border-amber-500">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                          <Award className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">Result Declared</p>
                          <p className="text-xs text-slate-500">Result for <span className="font-bold">{res.exams?.title}</span> has been published. Score: {res.marks}/{res.total_marks}</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{formatDate(res.created_at)}</span>
                      </div>
                    ))}

                    {childProgress.attendanceHistory.length === 0 && childProgress.results.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-slate-400 text-sm">No recent notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-8">
                {/* Upcoming Exams */}
                <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Upcoming Exams
                  </h3>
                  <div className="space-y-4">
                    {childProgress.upcomingExams.length > 0 ? childProgress.upcomingExams.map((exam, i) => (
                      <div key={i} className="p-4 border border-slate-100 rounded-2xl space-y-2">
                        <p className="font-bold text-slate-800 text-sm">{exam.title}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatDate(exam.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {exam.time}
                          </span>
                        </div>
                      </div>
                    )) : (
                      <p className="text-xs text-slate-400 text-center py-4">No upcoming exams</p>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-primary p-8 rounded-[32px] text-white shadow-xl shadow-primary/20">
                  <h3 className="text-lg font-black mb-6">Quick Actions</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setActiveTab('fees')}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-sm font-bold transition-all flex items-center justify-between px-4"
                    >
                      Pay Pending Fees <ChevronRight className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setActiveTab('attendance')}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-sm font-bold transition-all flex items-center justify-between px-4"
                    >
                      View Full Attendance <ChevronRight className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setActiveTab('results')}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-sm font-bold transition-all flex items-center justify-between px-4"
                    >
                      View All Results <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeTab as any) === 'studylog' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800">Complete Study Log</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDownloadCSV('studylog')}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all border border-emerald-100"
                  >
                    <Download className="w-4 h-4" /> Download CSV
                  </button>
                  <button 
                    onClick={() => handlePrintDocument('studylog')}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <Printer className="w-4 h-4" /> Print Report
                  </button>
                  <button 
                    onClick={() => handleShare('Study Log')}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all"
                  >
                    <MessageSquare className="w-4 h-4" /> Share
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {studyLogs.map((log, i) => (
                  <div key={i} className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm space-y-6 group hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                          <History className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-primary uppercase tracking-widest">{formatDate(log.date)}</p>
                          <h4 className="font-black text-slate-800">Daily Study Log</h4>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">{log.batch}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed Activities</p>
                      <div className="space-y-2">
                        {Array.isArray(log.activities) ? log.activities.map((act: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                            <div className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">{idx + 1}</div>
                            {act}
                          </div>
                        )) : <p className="text-sm text-slate-400 italic">No activities listed</p>}
                      </div>
                    </div>

                    {log.assignment_subject && (
                      <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Assignment</p>
                        <p className="text-sm font-black text-indigo-900">{log.assignment_subject}</p>
                        <p className="text-xs text-indigo-700 mt-0.5">{log.assignment_topic}</p>
                      </div>
                    )}

                    {log.remarks && (
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Remarks</p>
                        <p className="text-sm text-slate-600 italic leading-relaxed">"{log.remarks}"</p>
                      </div>
                    )}
                  </div>
                ))}

                {studyLogs.length === 0 && (
                  <div className="md:col-span-2 py-20 bg-slate-50 rounded-[40px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                    <History className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-bold">No study logs available yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 mb-6">Attendance History</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-slate-100">
                      <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Subject</th>
                      <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {childProgress.attendanceHistory.map((att, i) => (
                      <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 text-sm font-bold text-slate-800">{formatDate(att.date)}</td>
                        <td className="py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            (att.status === 'Present' || att.status === 'PRESENT') ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                          )}>
                            {att.status}
                          </span>
                        </td>
                        <td className="py-4 text-sm text-slate-600">{att.subject || 'N/A'}</td>
                        <td className="py-4 text-sm text-slate-500">{att.time || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 mb-6">Exam Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {childProgress.results.map((res, i) => (
                  <div key={i} className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-primary uppercase tracking-widest">{res.exams?.date ? formatDate(res.exams.date) : 'N/A'}</p>
                        <h4 className="font-black text-slate-800">{res.exams?.title || 'Unknown Exam'}</h4>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-primary">{res.marks}/{res.total_marks}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        res.status === 'PASSED' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                      )}>
                        {res.status}
                      </span>
                      <button 
                        onClick={() => {
                          setSelectedResult(res);
                          setIsResultModalOpen(true);
                        }}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        View Details <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'fees' && (
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
                <h3 className="text-xl font-black text-slate-800 mb-6">Fee Management</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-slate-100">
                        <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Description</th>
                        <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Amount</th>
                        <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Due Date</th>
                        <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {childProgress.feesHistory.map((fee, i) => (
                        <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 text-sm font-bold text-slate-800">{fee.description || 'Fee Payment'}</td>
                          <td className="py-4 text-sm font-black text-slate-900">{formatCurrency(fee.amount)}</td>
                          <td className="py-4 text-sm text-slate-500">{formatDate(fee.due_date)}</td>
                          <td className="py-4">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                              fee.status === 'PAID' ? "bg-green-50 text-green-600" : 
                              fee.status === 'PENDING' ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                            )}>
                              {fee.status}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            {fee.status === 'PENDING' && (
                              <button 
                                onClick={() => handlePayment(fee)}
                                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/10"
                              >
                                Pay Now
                              </button>
                            )}
                            {fee.status === 'PAID' && (
                              <button 
                                onClick={() => handleDownloadFeeReceipt(fee)}
                                className="p-2 text-slate-400 hover:text-primary transition-colors"
                              >
                                <Receipt className="w-5 h-5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'application' && (
            <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 mb-6">Admission Application</h3>
              {childProgress.application ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Application Status</p>
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest",
                        childProgress.application.status === 'Approved' ? "bg-emerald-50 text-emerald-600" : 
                        childProgress.application.status === 'Pending' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {childProgress.application.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</p>
                        <p className="text-sm font-bold text-slate-800">{childProgress.application.full_name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Applied For</p>
                        <p className="text-sm font-bold text-slate-800">{childProgress.application.courses?.name || childProgress.application.branch}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                        <p className="text-sm font-bold text-slate-800">{childProgress.application.email}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                        <p className="text-sm font-bold text-slate-800">{childProgress.application.phone}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-8 bg-indigo-50 rounded-3xl border border-indigo-100 flex flex-col items-center justify-center text-center">
                    <FileText className="w-12 h-12 text-indigo-600 mb-4" />
                    <h4 className="text-lg font-black text-indigo-900 mb-2">Application ID: #{childProgress.application.id.substring(0, 8).toUpperCase()}</h4>
                    <p className="text-sm text-indigo-700">Detailed admission application submitted on {formatDate(childProgress.application.created_at)}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No application record found for this student.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timetable' && (
            <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800">Class Time Table</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDownloadCSV('timetable')}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all border border-emerald-100"
                  >
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                  <button 
                    onClick={() => handlePrintDocument('timetable')}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <button 
                    onClick={() => handleShare('Time Table')}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all"
                  >
                    <MessageSquare className="w-4 h-4" /> Share
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-slate-100">
                      <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Day</th>
                      <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Subject</th>
                      <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Time</th>
                      <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Faculty</th>
                      <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {childProgress.timetable.map((item, i) => (
                      <tr key={i} className={cn(
                        "group transition-colors",
                        item.type === 'Holiday' ? "bg-rose-50/50" : 
                        item.type === 'Event' ? "bg-amber-50/50" : "hover:bg-slate-50/50"
                      )}>
                        <td className="py-4 text-sm font-black text-slate-800 uppercase">{item.day}</td>
                        <td className="py-4">
                          <p className="text-sm font-bold text-slate-800">{item.subject}</p>
                          <p className="text-[10px] text-slate-400">Room: {item.room || 'N/A'}</p>
                        </td>
                        <td className="py-4 text-sm font-medium text-slate-600">{item.start_time} - {item.end_time}</td>
                        <td className="py-4 text-sm text-slate-500">{item.faculty}</td>
                        <td className="py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            item.type === 'Regular' ? "bg-blue-50 text-blue-600" :
                            item.type === 'Holiday' ? "bg-rose-100 text-rose-600" :
                            item.type === 'Event' ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-600"
                          )}>
                            {item.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {childProgress.timetable.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 italic">No timetable entries found for this batch.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
                <h3 className="text-xl font-black text-slate-800 mb-6">Enrolled Courses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {childProgress.courses.map((course, i) => (
                    <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{course.code}</span>
                        </div>
                        <h4 className="text-lg font-black text-slate-800">{course.name}</h4>
                        <p className="text-sm text-slate-500 mt-1">{course.description || 'Full-time academic course'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">Duration</p>
                        <p className="text-sm font-black text-slate-900">{course.duration} Years</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {syllabus.length > 0 && (
                <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-black text-slate-800">Course Syllabus</h3>
                      <p className="text-sm text-slate-500 font-medium">Curriculum overview and unit breakdown.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handlePrintDocument('syllabus')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                      >
                        <Printer className="w-4 h-4" /> Print
                      </button>
                      <button 
                        onClick={() => handleShare('Syllabus')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all"
                      >
                        <MessageSquare className="w-4 h-4" /> Share
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {syllabus.map((item, i) => (
                      <div key={i} className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg">Unit {item.unit_number}</span>
                        </div>
                        <h4 className="font-black text-slate-800">{item.unit_title || item.title}</h4>
                        <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-[32px] border border-primary/10">
          <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">No Child Linked</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2">
            We couldn't find any student records linked to your account ({user?.email}). Please contact the administration.
          </p>
        </div>
      )}

      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Make Payment</h3>
                  <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Amount to Pay</p>
                    <p className="text-3xl font-black text-primary">{formatCurrency(selectedFee?.amount || 0)}</p>
                    <p className="text-sm text-slate-500 mt-2 font-medium">{selectedFee?.description}</p>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-800">Select Payment Method</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button className="p-4 border-2 border-primary bg-primary/5 rounded-2xl text-left transition-all">
                        <CreditCard className="w-6 h-6 text-primary mb-2" />
                        <p className="font-bold text-slate-800 text-sm">Card / UPI</p>
                      </button>
                      <button className="p-4 border-2 border-slate-100 hover:border-primary/20 rounded-2xl text-left transition-all">
                        <Receipt className="w-6 h-6 text-slate-400 mb-2" />
                        <p className="font-bold text-slate-800 text-sm">Net Banking</p>
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={confirmPayment}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                  >
                    Confirm & Pay Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Result Detail Modal */}
      {isResultModalOpen && selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setIsResultModalOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">{childProgress?.student?.name}'s Result</h2>
                  <p className="text-sm font-bold text-slate-500 opacity-60 uppercase tracking-widest">{selectedResult.exams?.title || 'Examination'} • {selectedResult.exams?.subject || 'N/A'}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsResultModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <TrendingUp className="w-5 h-5 rotate-45 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 lg:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Result Info */}
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Marks</p>
                      <p className="text-3xl font-black text-slate-900">{selectedResult.marks} <span className="text-lg text-slate-400">/ {selectedResult.total_marks}</span></p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Percentage</p>
                      <p className="text-3xl font-black text-slate-900">{Math.round((selectedResult.marks / selectedResult.total_marks) * 100)}%</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                      <span className="text-sm font-bold text-slate-500">Passing Status</span>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        selectedResult.status === 'PASSED' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {selectedResult.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                      <span className="text-sm font-bold text-slate-500">Exam Date</span>
                      <span className="text-sm font-black text-slate-800">{selectedResult.exams?.date ? formatDate(selectedResult.exams.date) : formatDate(selectedResult.created_at)}</span>
                    </div>
                  </div>

                  <div className="p-8 bg-indigo-50 rounded-[40px] border border-indigo-100 relative overflow-hidden group">
                    <TrendingUp className="w-32 h-32 absolute -right-8 -bottom-8 text-indigo-500/10 group-hover:scale-110 transition-transform duration-500" />
                    <h4 className="text-lg font-black text-indigo-900 mb-2">Performance Summary</h4>
                    <p className="text-xs text-indigo-700 leading-relaxed relative z-10">
                      Student has {selectedResult.status === 'PASSED' ? 'successfully passed' : 'not cleared'} the {selectedResult.exams?.subject || 'examination'} with a score of {selectedResult.marks} out of {selectedResult.total_marks}.
                    </p>
                  </div>
                </div>

                {/* Scanned Sheet Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Scanned Answer Sheet
                    </h4>
                    {selectedResult.scanned_sheet_url && (
                      <button 
                        onClick={() => handleDownloadSheet(selectedResult.scanned_sheet_url, childProgress?.student?.name)}
                        className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:underline"
                      >
                        <Download className="w-3 h-3" /> Download Paper
                      </button>
                    )}
                  </div>
                  <div className="aspect-[3/4] bg-slate-100 rounded-[40px] border-4 border-slate-50 overflow-hidden relative shadow-inner">
                    {selectedResult.scanned_sheet_url ? (
                      selectedResult.scanned_sheet_url.includes('application/pdf') || selectedResult.scanned_sheet_url.endsWith('.pdf') ? (
                        <iframe 
                          src={selectedResult.scanned_sheet_url} 
                          className="w-full h-full border-none"
                          title="Answer Sheet"
                        />
                      ) : (
                        <img 
                          src={selectedResult.scanned_sheet_url} 
                          alt="Answer Sheet" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                        <FileText className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm font-bold">No scanned sheet available</p>
                        <p className="text-[10px] mt-1">Digital submission or direct marks entry.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
               <button 
                onClick={() => setIsResultModalOpen(false)}
                className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-black hover:bg-slate-50 transition-all shadow-sm"
              >
                Close
              </button>
              <button 
                onClick={() => handleDownloadReceipt(selectedResult)}
                className="px-8 py-3 bg-primary text-white rounded-2xl text-sm font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
