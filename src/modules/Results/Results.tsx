import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  Users,
  BookOpen,
  Eye,
  Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { motion } from 'motion/react';
import { exportToPDF, exportToExcel } from '../../lib/exportUtils';

interface Result {
  id: string;
  studentName: string;
  studentRoll: string;
  examTitle: string;
  subject: string;
  marks: number;
  totalMarks: number;
  status: 'PASSED' | 'FAILED';
  date: string;
  course: string;
}

export const Results: React.FC = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState('All');
  const [courses, setCourses] = useState<any[]>([]);

  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    fetchUser();
    fetchData();
    fetchSettings();
  }, []);

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

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('staff').select('role').eq('id', user.id).single();
      setUser({ ...user, role: profile?.role || 'STAFF' });
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch courses for filter
    const { data: coursesData } = await supabase.from('courses').select('*');
    if (coursesData) setCourses(coursesData);

    const isStaff = !['STUDENT', 'PARENT'].includes(user?.role || '');
    let query = supabase
      .from('results')
      .select(`
        *,
        exams:exam_id (
          title,
          subject,
          course,
          course_id
        )
      `);
    
    // Students/Parents only see published results
    if (!isStaff) {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching results:', error);
    } else if (data) {
      setResults(data.map(r => {
        const examObj = Array.isArray(r.exams) ? r.exams[0] : r.exams;
        return {
          id: r.id,
          studentName: r.student_name,
          studentRoll: r.student_id, // Use student_id as roll fallback
          examTitle: examObj?.title || 'Unknown Exam',
          subject: examObj?.subject || 'N/A',
          marks: r.marks,
          totalMarks: r.total_marks,
          status: r.status,
          date: new Date(r.created_at).toLocaleDateString(),
          course: examObj?.course || 'N/A',
          scannedSheetUrl: r.scanned_sheet_url,
          isPublished: r.is_published
        };
      }));
    }
    setIsLoading(false);
  };

  const filteredResults = results.filter(r => {
    const matchesSearch = 
      (r.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.examTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCourse = courseFilter === 'All' || r.course === courseFilter;
    
    return matchesSearch && matchesCourse;
  });

  const stats = [
    { title: 'Total Results', value: results.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Pass Rate', value: `${Math.round((results.filter(r => r.status === 'PASSED').length / results.length || 0) * 100)}%`, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Avg Score', value: `${Math.round(results.reduce((acc, r) => acc + (r.marks/r.totalMarks * 100), 0) / results.length || 0)}%`, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  const handleExportPDF = () => {
    const headers = ['Student', 'Exam', 'Subject', 'Score', 'Status', 'Date'];
    const data = filteredResults.map(r => [r.studentName, r.examTitle, r.subject, `${r.marks}/${r.totalMarks}`, r.status, r.date]);
    exportToPDF('Exam Results', headers, data, 'Exam_Results');
  };

  const handleExportExcel = () => {
    exportToExcel(filteredResults, 'Exam_Results');
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
          <title>Result Receipt - ${result.studentName}</title>
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
            <p class="title">Result for ${result.examTitle}</p>
          </div>
          
          <div class="stats">
            <div class="stat-box">
              <div class="stat-label">Marks Obtained</div>
              <div class="stat-value">${result.marks} / ${result.totalMarks}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Percentage</div>
              <div class="stat-value">${Math.round((result.marks / result.totalMarks) * 100)}%</div>
            </div>
          </div>

          <table class="info-table">
            <tr>
              <td class="info-label">Student Name</td>
              <td>${result.studentName}</td>
            </tr>
            <tr>
              <td class="info-label">Registration ID</td>
              <td>${result.studentRoll}</td>
            </tr>
            <tr>
              <td class="info-label">Subject</td>
              <td>${result.subject}</td>
            </tr>
            <tr>
              <td class="info-label">Examination Date</td>
              <td>${result.date}</td>
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
      // printWindow.close(); // Keep it open for them to save as PDF if they want
    }, 500);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Academic Results</h1>
          <p className="text-slate-500 text-sm font-medium">View and manage published examination results.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-[32px] border border-primary/10 shadow-sm"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{stat.title}</p>
            <p className="text-3xl font-black text-slate-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-primary/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search by student, exam or subject..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-background border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-4 py-3 bg-background border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          >
            <option value="All">All Courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <button className="flex items-center gap-2 px-4 py-3 bg-background text-slate-600 rounded-2xl text-sm font-bold hover:bg-primary/5 transition-all">
            <Filter className="w-4 h-4" />
            More Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-primary/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary/5 border-b border-primary/10">
                <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Student</th>
                <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Examination</th>
                <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Subject</th>
                <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Score</th>
                <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm font-bold text-slate-400">Loading results...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <Award className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-bold text-slate-400">No results found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredResults.map((res) => (
                  <tr key={res.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black text-xs shadow-sm">
                          {(res.studentName || '').charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{res.studentName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{res.studentRoll}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-slate-700">{res.examTitle}</p>
                      <p className="text-[10px] text-slate-500">{res.course}</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-600">{res.subject}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900">{res.marks}/{res.totalMarks}</span>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-1000",
                              res.status === 'PASSED' ? "bg-emerald-500" : "bg-rose-500"
                            )}
                            style={{ width: `${(res.marks/res.totalMarks) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center w-fit gap-1.5",
                        res.status === 'PASSED' 
                          ? "bg-emerald-50 text-emerald-600" 
                          : res.status === 'FAILED' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {res.status === 'PASSED' ? <CheckCircle2 className="w-3 h-3" /> : res.status === 'FAILED' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {res.status}
                        {!res.isPublished && <span className="ml-1 opacity-60">(Draft)</span>}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => {
                          setSelectedResult(res);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Result Detail Modal */}
      {isModalOpen && selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">{selectedResult.studentName}'s Result</h2>
                  <p className="text-sm font-bold text-slate-500 opacity-60 uppercase tracking-widest">{selectedResult.examTitle} • {selectedResult.subject}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
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
                      <p className="text-3xl font-black text-slate-900">{selectedResult.marks} <span className="text-lg text-slate-400">/ {selectedResult.totalMarks}</span></p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Percentage</p>
                      <p className="text-3xl font-black text-slate-900">{Math.round((selectedResult.marks / selectedResult.totalMarks) * 100)}%</p>
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
                      <span className="text-sm font-black text-slate-800">{selectedResult.date}</span>
                    </div>
                  </div>

                  <div className="p-8 bg-indigo-50 rounded-[40px] border border-indigo-100 relative overflow-hidden group">
                    <TrendingUp className="w-32 h-32 absolute -right-8 -bottom-8 text-indigo-500/10 group-hover:scale-110 transition-transform duration-500" />
                    <h4 className="text-lg font-black text-indigo-900 mb-2">Performance Summary</h4>
                    <p className="text-xs text-indigo-700 leading-relaxed relative z-10">
                      Student has {selectedResult.status === 'PASSED' ? 'successfully passed' : 'not cleared'} the {selectedResult.subject} examination with a score of {selectedResult.marks} out of {selectedResult.totalMarks}.
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
                    {selectedResult.scannedSheetUrl && (
                      <button 
                        onClick={() => handleDownloadSheet(selectedResult.scannedSheetUrl, selectedResult.studentName)}
                        className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:underline"
                      >
                        <Download className="w-3 h-3" /> Download Paper
                      </button>
                    )}
                  </div>
                  <div className="aspect-[3/4] bg-slate-100 rounded-[40px] border-4 border-slate-50 overflow-hidden relative shadow-inner">
                    {selectedResult.scannedSheetUrl ? (
                      selectedResult.scannedSheetUrl.includes('application/pdf') || selectedResult.scannedSheetUrl.endsWith('.pdf') ? (
                        <iframe 
                          src={selectedResult.scannedSheetUrl} 
                          className="w-full h-full border-none"
                          title="Answer Sheet"
                        />
                      ) : (
                        <img 
                          src={selectedResult.scannedSheetUrl} 
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
                onClick={() => setIsModalOpen(false)}
                className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-black hover:bg-slate-50 transition-all shadow-sm"
              >
                Close
              </button>
              <button 
                onClick={() => handleDownloadReceipt(selectedResult)}
                className="px-8 py-3 bg-primary text-white rounded-2xl text-sm font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
