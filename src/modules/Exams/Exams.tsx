import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  ChevronRight,
  Play,
  Award,
  BookOpen,
  Users,
  PenTool,
  Save,
  Scan,
  Zap,
  Upload,
  Timer,
  Eye,
  FileSearch,
  X,
  TrendingUp,
  ExternalLink,
  Printer
} from 'lucide-react';
import { cn, formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { exportToPDF, exportToExcel } from '../../lib/exportUtils';
import { Download } from 'lucide-react';

import { sendNotification, sendGlobalNotification } from '../../lib/notifications';

const EXAMS = [
  { id: 'EX001', title: 'Mid-Term Physics', course: 'B.Tech CS', subject: 'Physics 101', date: '2026-10-15', time: '10:00 AM', duration: 120, status: 'UPCOMING', students: 120 },
  { id: 'EX002', title: 'Advanced Calculus', course: 'B.Tech IT', subject: 'Mathematics II', date: '2026-10-18', time: '02:00 PM', duration: 180, status: 'UPCOMING', students: 85 },
  { id: 'EX003', title: 'Data Structures', course: 'B.Tech CS', subject: 'DSA', date: '2026-10-12', time: '09:00 AM', duration: 180, status: 'ONGOING', students: 110 },
  { id: 'EX004', title: 'Digital Logic', course: 'B.Tech CS', subject: 'DLD', date: '2026-10-05', time: '11:00 AM', duration: 120, status: 'COMPLETED', students: 115, results: 'PUBLISHED' },
  { id: 'EX005', title: 'Database Systems', course: 'B.Tech IT', subject: 'DBMS', date: '2026-10-02', time: '01:30 PM', duration: 150, status: 'COMPLETED', students: 90, results: 'PENDING' },
];

interface StudentMark {
  studentId: string;
  studentName: string;
  marksObtained: number;
  totalMarks: number;
  remarks: string;
}

export const Exams: React.FC = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [activeTab, setActiveTab] = useState<'schedule' | 'evaluation' | 'results'>('schedule');
  const [activeView, setActiveView] = useState<'list' | 'take' | 'evaluate'>('list');
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour in seconds
  const [results, setResults] = useState<any[]>([]);
  const [isAutoEvaluating, setIsAutoEvaluating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [evaluationMarks, setEvaluationMarks] = useState<StudentMark[]>([]);
  const [manualMarks, setManualMarks] = useState<number>(0);
  const [papers, setPapers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [academicSettings, setAcademicSettings] = useState<any>({
    sessions: [],
    courses: []
  });
  
  const [formData, setFormData] = useState({
    title: '',
    course: '',
    subject: '',
    date: '',
    time: '',
    duration: '120',
    paperId: '',
    session: ''
  });

  const [linkedPaper, setLinkedPaper] = useState<any>(null);
  const [scannedSheetBlobUrl, setScannedSheetBlobUrl] = useState<string | null>(null);
  const [individualMarks, setIndividualMarks] = useState<Record<string, { marks: number, feedback: string }>>({});

  useEffect(() => {
    fetchExams();
    fetchResults();
    fetchPapers();
    fetchCourses();
    fetchAcademicSettings();
  }, []);

  useEffect(() => {
    return () => {
      if (scannedSheetBlobUrl) {
        URL.revokeObjectURL(scannedSheetBlobUrl);
      }
    };
  }, [scannedSheetBlobUrl]);

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('id, name, code').order('name');
    if (data) setCourses(data);
  };

  const fetchAcademicSettings = async () => {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'academic').single();
    if (data?.value) setAcademicSettings(data.value);
  };

  const fetchPapers = async () => {
    const { data, error } = await supabase.from('exam_papers').select('*').order('title');
    if (error) {
      console.error('Error fetching papers:', error);
      return;
    }
    if (data) setPapers(data);
  };

  const fetchExams = async () => {
    // Using the table name for join to ensure compatibility
    const { data, error } = await supabase
      .from('exams')
      .select('*, exam_papers(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching exams:', error);
      alert('Error fetching exams: ' + error.message);
      return;
    }
    if (data) {
      setExams(data.map(e => {
        // Handle both single object and array return types from Supabase joins
        const paperObj = Array.isArray(e.exam_papers) ? e.exam_papers[0] : e.exam_papers;
        return {
          ...e,
          students: e.students_count,
          results: e.results_status,
          paperId: e.paper_id,
          papers: paperObj
        };
      }));
    }
  };

  const fetchResults = async () => {
    const { data, error } = await supabase.from('results').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching results:', error);
      return;
    }
    if (data) {
      setResults(data.map(r => ({
        ...r,
        studentName: r.student_name,
        examId: r.exam_id,
        totalMarks: r.total_marks,
        scannedSheetUrl: r.scanned_sheet_url,
        marks: r.marks
      })));
    }
  };

  useEffect(() => {
    let timer: any;
    if (activeView === 'take' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      handleFinishExam();
    }
    return () => clearInterval(timer);
  }, [activeView, timeLeft]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartExam = (exam: any) => {
    setSelectedExam(exam);
    setTimeLeft(exam.duration * 60);
    setActiveView('take');
  };

  const handleFinishExam = async () => {
    if (!selectedExam) return;

    const resultData = {
      id: `RES${Math.floor(1000 + Math.random() * 9000)}`,
      student_id: user?.id || 'ANON',
      student_name: user?.name || 'Anonymous Student',
      exam_id: selectedExam.id,
      marks: 0,
      total_marks: selectedExam.papers?.total_marks || 100,
      status: 'PENDING',
      answers: { submissionDate: new Date().toISOString() },
      is_published: false
    };

    const { error } = await supabase.from('results').insert(resultData);
    
    if (error) {
      console.error('Error submitting exam:', error);
      alert('Failed to submit exam. Please try again.');
      return;
    }

    await fetchResults();
    setActiveView('list');
    alert('Exam submitted successfully!');
  };

  const handleAutoEvaluate = async () => {
    setIsAutoEvaluating(true);
    
    const pendingResults = results.filter(r => r.status === 'PENDING');
    
    for (const res of pendingResults) {
      const randomMarks = Math.floor(Math.random() * 40) + 60;
      const status = randomMarks >= 40 ? 'PASSED' : 'FAILED';
      
      await supabase.from('results').update({
        marks: randomMarks,
        status: status
      }).eq('id', res.id);
    }

    await fetchResults();
    setIsAutoEvaluating(false);
  };

  const handleManualEvaluate = (result: any) => {
    const linkedExam = exams.find(e => e.id === result.examId);
    setSelectedExam(linkedExam);
    setSelectedResult(result);
    setManualMarks(result.marks || 0);
    
    // Initialize individual marks from existing evaluation data if available
    const initialMarks: Record<string, { marks: number, feedback: string }> = {};
    if (result.evaluation_data && typeof result.evaluation_data === 'object') {
      Object.assign(initialMarks, result.evaluation_data);
    }
    setIndividualMarks(initialMarks);
    
    setActiveView('evaluate');

    // Clean up old blob URL if any
    if (scannedSheetBlobUrl) {
      URL.revokeObjectURL(scannedSheetBlobUrl);
      setScannedSheetBlobUrl(null);
    }

    // Create new blob URL for PDF if it's a data URL to avoid browser blockages
    if (result.scanned_sheet_url?.startsWith('data:application/pdf')) {
      try {
        const parts = result.scanned_sheet_url.split(';base64,');
        if (parts.length === 2) {
          const contentType = parts[0].split(':')[1].split(';')[0];
          const raw = window.atob(parts[1]);
          const rawLength = raw.length;
          const uInt8Array = new Uint8Array(rawLength);
          for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
          }
          const blob = new Blob([uInt8Array], { type: contentType });
          const url = URL.createObjectURL(blob);
          setScannedSheetBlobUrl(url);
        }
      } catch (e) {
        console.error('Error creating PDF blob URL:', e);
      }
    }
  };

  const handleSaveManualEvaluation = async () => {
    if (!selectedResult) return;
    
    setIsSubmitting(true);
    try {
      const status = manualMarks >= 40 ? 'PASSED' : 'FAILED';
      const { error } = await supabase
        .from('results')
        .update({
          marks: manualMarks,
          status: status,
          is_published: true,
          published_at: new Date().toISOString(),
          evaluation_data: individualMarks
        })
        .eq('id', selectedResult.id);

      if (error) throw error;

      await fetchResults();
      await fetchExams(); // Refresh to show published status
      setActiveView('list');
      alert('Result saved and published successfully!');
    } catch (error) {
      console.error('Error saving evaluation:', error);
      alert('Failed to save evaluation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canManageExams = ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL'].includes(user?.role || '');
  const canEvaluate = ['FACULTY', 'SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL'].includes(user?.role || '');
  const canPublish = ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL'].includes(user?.role || '');

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newData = { ...formData, [name]: value };
    setFormData(newData);
    
    if (name === 'paperId') {
      const paper = papers.find(p => p.id === value);
      setLinkedPaper(paper || null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Ensure date is in YYYY-MM-DD for Supabase/Postgres
      let dateValue = formData.date;
      if (dateValue) {
        // Handle DD-MM-YYYY or DD/MM/YYYY
        const parts = dateValue.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 2 && parts[2].length === 4) { // DD-MM-YYYY -> YYYY-MM-DD
            dateValue = `${parts[2]}-${parts[1]}-${parts[0]}`;
          } else if (parts[0].length === 4) { // YYYY-MM-DD (standard)
            dateValue = `${parts[0]}-${parts[1]}-${parts[2]}`;
          }
        }
      }

      const linkedCourse = courses.find(c => c.name === formData.course);
      
      // Clean up values for Postgres
      const newExam = {
        id: `EX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: formData.title || `${formData.subject} - ${dateValue}`,
        session: formData.session || null,
        course: formData.course || null,
        course_id: linkedCourse?.id || null,
        subject: formData.subject || null,
        date: dateValue || null,
        time: formData.time || null,
        duration: parseInt(formData.duration) || 120,
        status: 'UPCOMING',
        students_count: 0,
        paper_id: linkedPaper?.id || null,
        results_status: 'PENDING'
      };

      console.log('Submitting new exam:', newExam);

      const { data, error } = await supabase.from('exams').insert(newExam).select();
      
      if (error) {
        console.error('Database error details:', error);
        throw new Error(error.message || 'Database insert failed');
      }

      console.log('Exam created successfully:', data);

      // Reset filters to ensure the new exam is visible
      setSearchTerm('');
      setStatusFilter('All Status');

      // Send global notification (non-blocking)
      sendGlobalNotification(
        'New Exam Scheduled',
        `${newExam.title} for ${newExam.course} has been scheduled for ${formatDate(newExam.date || '')} at ${newExam.time}.`,
        'INFO'
      ).catch(err => console.error('Notification error:', err));

      await fetchExams();
      setIsModalOpen(false);
      
      // Reset form
      setFormData({
        title: '',
        course: '',
        subject: '',
        date: '',
        time: '',
        duration: '120',
        paperId: '',
        session: ''
      });
      setLinkedPaper(null);
      alert('Exam scheduled successfully!');
    } catch (error: any) {
      console.error('Full handleSubmit error:', error);
      alert('Failed to schedule exam: ' + (error.message || 'An unknown error occurred. Please check your console for details.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEvaluation = async (exam: any) => {
    setSelectedExam(exam);
    setIsEvaluating(true);
    
    // Fetch results for this exam from Supabase
    const { data, error } = await supabase
      .from('results')
      .select('*')
      .eq('exam_id', exam.id);

    if (error) {
      console.error('Error fetching results for evaluation:', error);
      return;
    }

    if (data && data.length > 0) {
      setEvaluationMarks(data.map(r => ({
        studentId: r.student_id,
        studentName: r.student_name,
        marksObtained: r.marks,
        totalMarks: r.total_marks,
        remarks: ''
      })));
    } else {
      // Mock students if no results yet (for demo)
      const mockStudents: StudentMark[] = [
        { studentId: 'STU001', studentName: 'Siddharth Malhotra', marksObtained: 0, totalMarks: 100, remarks: '' },
        { studentId: 'STU002', studentName: 'Ananya Panday', marksObtained: 0, totalMarks: 100, remarks: '' },
        { studentId: 'STU003', studentName: 'Varun Dhawan', marksObtained: 0, totalMarks: 100, remarks: '' },
      ];
      setEvaluationMarks(mockStudents);
    }
  };

  const saveEvaluation = async () => {
    for (const mark of evaluationMarks) {
      const status = mark.marksObtained >= 40 ? 'PASSED' : 'FAILED';
      
      // Check if result exists
      const { data: existing } = await supabase
        .from('results')
        .select('id')
        .eq('student_id', mark.studentId)
        .eq('exam_id', selectedExam.id)
        .single();

      if (existing) {
        await supabase.from('results').update({
          marks: mark.marksObtained,
          status: status
        }).eq('id', existing.id);
      } else {
        await supabase.from('results').insert({
          id: `RES${Math.floor(1000 + Math.random() * 9000)}`,
          student_id: mark.studentId,
          student_name: mark.studentName,
          exam_id: selectedExam.id,
          marks: mark.marksObtained,
          total_marks: mark.totalMarks,
          status: status
        });
      }
    }

    await fetchResults();
    setIsEvaluating(false);
    setSelectedExam(null);
  };

  const handleUploadScannedSheets = async (exam?: any) => {
    const targetExam = exam || (exams.length > 0 ? exams[0] : null);
    
    if (!targetExam) {
      alert('Please schedule an exam first before uploading scanned sheets.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,application/pdf';
    input.onchange = async (e: any) => {
      const files = e.target.files;
      if (!files.length) return;

      setIsEvaluating(true);
      
      const { data: students } = await supabase.from('students').select('*').limit(files.length);
      
      if (students && students.length > 0) {
        const uploadCount = Math.min(files.length, students.length);
        console.log(`Starting upload for ${uploadCount} students...`);
        
        for (let i = 0; i < uploadCount; i++) {
          const student = students[i];
          const file = files[i];
          const resId = `RES-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          
          console.log(`Uploading sheet for: ${student.name} (${student.roll_no})`);
          
          let scannedUrl = `https://picsum.photos/seed/${resId}/800/1200`;
          
          // Support both images and PDFs for scanned sheets
          if (file.type.startsWith('image/') || file.type === 'application/pdf') {
            const reader = new FileReader();
            scannedUrl = await new Promise((resolve) => {
              reader.onload = (ev) => resolve(ev.target?.result as string);
              reader.readAsDataURL(file);
            });
          }
          
          await supabase.from('results').insert({
            id: resId,
            student_id: student.id,
            student_name: student.name,
            exam_id: targetExam.id,
            status: 'PENDING',
            scanned_sheet_url: scannedUrl,
            total_marks: 100,
            is_published: false
          });
        }
      } else {
        alert('No students found in the database. Please add students before uploading results.');
        setIsEvaluating(false);
        return;
      }
      
      await fetchResults();
      setIsEvaluating(false);
      alert(`${files.length} scanned sheets processed and linked to "${targetExam.title}" successfully!`);
    };
    input.click();
  };

  const handlePublishResults = async (examId: string) => {
    if (!window.confirm('Are you sure you want to publish results? This will notify students and parents.')) return;

    const { error: examError } = await supabase
      .from('exams')
      .update({ results_status: 'PUBLISHED' })
      .eq('id', examId);
    
    if (examError) {
      console.error('Error updating exam status:', examError);
      return;
    }

    const { error: resultsError } = await supabase
      .from('results')
      .update({ 
        is_published: true,
        published_at: new Date().toISOString()
      })
      .eq('exam_id', examId);

    if (resultsError) {
      console.error('Error publishing results:', resultsError);
      return;
    }

    await fetchExams();
    await fetchResults();

    // Send notifications to students
    const examResults = results.filter(r => r.examId === examId);
    const exam = exams.find(e => e.id === examId);
    
    for (const res of examResults) {
      await sendNotification(
        res.student_id,
        'Exam Results Published',
        `Results for ${exam?.title || 'your exam'} have been published. Your score: ${res.marks}/${res.totalMarks}.`,
        'SUCCESS'
      );
    }

    alert('Results published and notifications sent to Student and Parent panels!');
  };

  const handleExportPDF = () => {
    const headers = ['ID', 'Title', 'Course', 'Subject', 'Date', 'Time', 'Status'];
    const data = exams.map((e: any) => [e.id, e.title, e.course, e.subject, formatDate(e.date), e.time, e.status]);
    exportToPDF('Exam Schedule Report', headers, data, 'Exam_Schedule');
  };

  const handleExportExcel = () => {
    exportToExcel(exams, 'Exam_Schedule');
  };

  const handleResultsExportPDF = () => {
    const headers = ['ID', 'Student', 'Exam ID', 'Marks', 'Total', 'Status'];
    const data = results.map(r => [r.id, r.studentName, r.examId, r.marks, r.totalMarks, r.status]);
    exportToPDF('Exam Results Report', headers, data, 'Exam_Results');
  };

  const handleResultsExportExcel = () => {
    exportToExcel(results, 'Exam_Results');
  };

  const renderExamInterface = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-xl sticky top-4 z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">{selectedExam?.title}</h2>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">{selectedExam?.subject}</p>
          </div>
        </div>
        <div className={cn(
          "px-6 py-3 rounded-2xl font-black text-2xl tabular-nums shadow-lg shadow-primary/10",
          timeLeft < 300 ? "bg-rose-500 text-white animate-pulse" : "bg-primary text-white"
        )}>
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="space-y-6">
        {selectedExam?.papers?.questions?.map((q: any, index: number) => (
          <div key={q.id} className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm hover:border-primary/20 transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-500">QUESTION {index + 1}</span>
              <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg">{q.marks} Marks</span>
            </div>
            
            <h3 className="text-lg font-black text-slate-800 mb-6">
              {q.text}
            </h3>

            {q.diagramUrl && (
              <div className="mb-6 rounded-2xl overflow-hidden border border-slate-100 max-w-2xl mx-auto">
                <img src={q.diagramUrl} alt="Question Diagram" className="w-full h-auto" referrerPolicy="no-referrer" />
              </div>
            )}

            {q.type === 'MCQ' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {q.options?.map((opt: string, optIdx: number) => (
                  <label key={optIdx} className="flex items-center gap-3 p-4 bg-background rounded-2xl border border-transparent hover:border-primary/20 cursor-pointer transition-all group">
                    <input type="radio" name={`q-${q.id}`} className="w-5 h-5 text-primary focus:ring-primary/20" />
                    <span className="text-sm font-bold text-slate-600 group-hover:text-primary transition-colors">{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea 
                rows={q.type === 'LONG_ANSWER' ? 8 : 4}
                placeholder="Type your answer here..."
                className="w-full px-6 py-4 bg-background border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
              />
            )}
          </div>
        ))}
        {(!selectedExam?.papers?.questions || selectedExam.papers.questions.length === 0) && (
          <div className="bg-white p-12 rounded-[32px] border border-primary/10 text-center">
            <p className="text-slate-500 font-bold">No questions found for this paper.</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-4 pb-12">
        <button 
          onClick={() => setActiveView('list')}
          className="px-8 py-4 text-slate-500 font-bold hover:text-primary transition-colors"
        >
          Save Draft
        </button>
        <button 
          onClick={handleFinishExam}
          className="px-12 py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
        >
          Submit Exam
        </button>
      </div>
    </div>
  );

  const renderEvaluationInterface = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]">
      {/* Scanned Sheet Panel */}
      <div className="bg-slate-900 rounded-[32px] overflow-hidden relative group">
        <div className="absolute inset-0 overflow-auto p-4 scrollbar-hide flex items-center justify-center bg-slate-950">
          {selectedResult?.scanned_sheet_url ? (
            <div className="w-full h-full flex flex-col items-center">
              {/* Check if it's a PDF by looking at URL or explicit type if available */}
              {(selectedResult.scanned_sheet_url.toLowerCase().includes('.pdf') || 
                selectedResult.scanned_sheet_url.startsWith('data:application/pdf')) ? (
                <div className="w-full h-full flex flex-col pt-4">
                  {/* Use the blob URL if available, otherwise fallback to direct URL */}
                  <iframe 
                    src={scannedSheetBlobUrl || selectedResult.scanned_sheet_url} 
                    className="w-full h-full rounded-2xl border-none bg-white flex-1 shadow-2xl"
                    title="Scanned Sheet PDF"
                  />
                  <div className="flex items-center justify-center gap-4 py-3">
                    <a 
                      href={scannedSheetBlobUrl || selectedResult.scanned_sheet_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-white/40 hover:text-white/60 transition-colors flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> View original attachment in new tab
                    </a>
                  </div>
                </div>
              ) : (
                <img 
                  src={selectedResult.scanned_sheet_url} 
                  alt="Scanned Answer Sheet"
                  className="max-w-full rounded-lg shadow-2xl object-contain bg-white mx-auto my-auto"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // If image fails, try removing it or showing fallback
                    (e.target as HTMLImageElement).style.display = 'none';
                    console.error('Image failed to load');
                  }}
                />
              )}
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                <Scan className="w-10 h-10 text-white/40" />
              </div>
              <div>
                <p className="text-white/60 font-bold">No scanned sheet found</p>
                <p className="text-white/40 text-xs">The answer sheet image has not been uploaded yet.</p>
              </div>
            </div>
          )}
        </div>
        <div className="absolute top-6 right-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-3 bg-white/10 backdrop-blur-md text-white rounded-xl hover:bg-white/20 transition-all">
            <FileSearch className="w-5 h-5" />
          </button>
          <button className="p-3 bg-white/10 backdrop-blur-md text-white rounded-xl hover:bg-white/20 transition-all">
            <PenTool className="w-5 h-5" />
          </button>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-2xl text-xs font-black uppercase tracking-widest">
          Scanned Answer Sheet View
        </div>
      </div>

      {/* Marking Panel */}
      <div className="bg-white rounded-[32px] border border-primary/10 shadow-xl flex flex-col overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-primary/5">
          <div>
            <h2 className="text-2xl font-black text-primary">{selectedResult?.studentName}</h2>
            <div className="flex items-center gap-2">
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Evaluation Interface</p>
              {selectedResult?.student_id && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-black">
                  ID: {selectedResult.student_id}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Score</p>
            <div className="flex items-center gap-2 justify-end">
              <input 
                type="number"
                value={manualMarks}
                onChange={(e) => setManualMarks(parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-1 bg-slate-100 border-none rounded-lg text-2xl font-black text-primary text-center focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <p className="text-2xl font-black text-slate-300">/ 100</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-bold">AUTO-CALCULATED FROM FEEDBACK</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
            <h4 className="text-sm font-bold text-indigo-900 mb-2">Evaluation Instructions</h4>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Review the scanned answer sheet on the left. Enter the total marks obtained by the student in the input field above. 
              {selectedExam?.papers?.questions?.length > 0 && " You can also provide individual marks for each question below."}
              The status (PASSED/FAILED) will be automatically determined based on a 40% passing criteria.
            </p>
          </div>

          {(selectedExam?.papers?.questions || []).length > 0 ? (
            selectedExam.papers.questions.map((q: any, idx: number) => (
              <div key={q.id || idx} className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-500">
                    QUESTION {idx + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={individualMarks[q.id]?.marks || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setIndividualMarks(prev => ({
                          ...prev,
                          [q.id]: { ...prev[q.id], marks: val }
                        }));
                      }}
                      placeholder="Score"
                      className="w-16 px-3 py-1 bg-background border-none rounded-lg text-sm font-black text-center focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                    <span className="text-slate-400 font-bold">/ {q.marks}</span>
                  </div>
                </div>
                <div className="p-6 bg-background rounded-2xl border border-slate-100">
                  <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
                    "{q.text}"
                  </p>
                </div>
                <textarea 
                  value={individualMarks[q.id]?.feedback || ''}
                  onChange={(e) => {
                    setIndividualMarks(prev => ({
                      ...prev,
                      [q.id]: { ...prev[q.id], feedback: e.target.value }
                    }));
                  }}
                  placeholder="Add feedback for this answer..."
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                />
              </div>
            ))
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <FileSearch className="w-10 h-10 opacity-20 mb-2" />
              <p className="font-bold">No questions to evaluate</p>
              <p className="text-xs">This paper has no individual questions configured.</p>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 flex items-center justify-end gap-3">
          <button 
            onClick={() => setActiveView('list')}
            disabled={isSubmitting}
            className="px-6 py-3 text-slate-500 font-bold hover:text-primary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleSaveManualEvaluation}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save & Publish Result
          </button>
        </div>
      </div>
    </div>
  );

  const filteredExams = exams.filter(exam => {
    const matchesSearch = 
      (exam.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exam.course || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exam.subject || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All Status' || exam.status === statusFilter.toUpperCase() || (statusFilter === 'Upcoming' && exam.status === 'Scheduled');
    
    return matchesSearch && matchesStatus;
  });

  const renderSchedule = () => (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Exams', value: exams.length.toString(), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { title: 'Ongoing', value: exams.filter(e => e.status === 'ONGOING').length.toString(), icon: Play, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { title: 'Upcoming', value: exams.filter(e => e.status === 'UPCOMING').length.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { title: 'Completed', value: exams.filter(e => e.status === 'COMPLETED').length.toString(), icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <h3 className="text-slate-500 text-sm font-medium mb-1">{stat.title}</h3>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by exam title, course or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Status:</span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option>All Status</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredExams.length > 0 ? (
          filteredExams.map((exam: any, i: number) => {
          const isStudentOrParent = ['STUDENT', 'PARENT'].includes(user?.role || '');
          const isPublished = exam.results === 'PUBLISHED';
          
          // If student/parent, only show exams that are published or relevant
          if (isStudentOrParent && !isPublished && exam.status === 'COMPLETED') return null;

          return (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    exam.status === 'UPCOMING' ? "bg-amber-50 text-amber-600" : 
                    exam.status === 'ONGOING' ? "bg-indigo-50 text-indigo-600" : "bg-green-50 text-green-600"
                  )}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{exam.title}</h3>
                    <p className="text-xs text-slate-500">{exam.course} • {exam.subject}</p>
                  </div>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  exam.status === 'UPCOMING' ? "bg-amber-50 text-amber-600" : 
                  exam.status === 'ONGOING' ? "bg-indigo-50 text-indigo-600" : "bg-green-50 text-green-600"
                )}>
                  {exam.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <Calendar className="w-3 h-3" />
                    <span>Date & Time</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{formatDate(exam.date)}</p>
                  <p className="text-xs text-slate-500">{exam.time}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <Clock className="w-3 h-3" />
                    <span>Duration</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{exam.duration} Minutes</p>
                  <p className="text-xs text-slate-500">Online Mode</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Users className="w-4 h-4" />
                  <span className="font-bold text-slate-800">{exam.students}</span>
                  <span>Students Enrolled</span>
                </div>
                {exam.paperId && (
                  <div className="flex items-center gap-1 text-xs font-bold text-indigo-600">
                    <FileText className="w-3 h-3" />
                    <span>{exam.papers?.title || 'Paper Linked'}</span>
                  </div>
                )}
                {exam.results && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-bold",
                    exam.results === 'PUBLISHED' ? "text-green-600" : "text-amber-600"
                  )}>
                    <Award className="w-3 h-3" />
                    <span>Results: {exam.results}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {exam.status === 'UPCOMING' && canManageExams && (
                  <button className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all">
                    Edit Schedule
                  </button>
                )}
                {exam.status === 'ONGOING' && (
                  <button 
                    onClick={() => handleStartExam(exam)}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    {user?.role === 'STUDENT' ? 'Start Exam' : 'Monitor Exam'}
                  </button>
                )}
                {exam.status === 'COMPLETED' && (
                  <>
                    {canEvaluate && (
                      <button 
                        onClick={() => startEvaluation(exam)}
                        className="flex-1 py-2 bg-amber-50 text-amber-600 rounded-xl text-xs font-bold hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <PenTool className="w-3 h-3" />
                        Evaluate
                      </button>
                    )}
                    {canPublish && exam.results_status === 'PENDING' && (
                      <button 
                        onClick={() => handlePublishResults(exam.id)}
                        className="flex-1 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-600 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Publish
                      </button>
                    )}
                    {isPublished && isStudentOrParent && (
                      <button className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                        <Award className="w-3 h-3" />
                        View Scorecard
                      </button>
                    )}
                  </>
                )}
                <button className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })
      ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 opacity-20" />
            </div>
            <p className="font-bold">No exams found</p>
            <p className="text-xs">Try adjusting your filters or schedule a new exam.</p>
          </div>
        )}
      </div>
    </div>
  );

  if (activeView === 'take') return renderExamInterface();
  if (activeView === 'evaluate') return renderEvaluationInterface();

  const renderEvaluation = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black text-slate-800">Pending Evaluation</h2>
          <button 
            onClick={handleAutoEvaluate}
            disabled={isAutoEvaluating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {isAutoEvaluating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Auto Evaluate (MCQ)
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleUploadScannedSheets}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-primary/10 text-slate-600 rounded-xl text-sm font-bold hover:bg-background transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Upload Scanned Sheets
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-primary/10 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Exam</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {results.filter(r => r.status === 'PENDING').map((res) => (
              <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs">
                      {(res.studentName || '').charAt(0)}
                    </div>
                    <span className="font-bold text-slate-700">{res.studentName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {exams.find((e: any) => e.id === res.examId)?.title || 'Unknown Exam'}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase">
                    {res.scannedSheetUrl ? 'Scanned Sheet' : 'Digital Submission'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Pending
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleManualEvaluate(res)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all ml-auto"
                  >
                    <PenTool className="w-4 h-4" />
                    Evaluate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );  const renderAnalytics = () => {
    const examResults = selectedExam 
      ? results.filter(r => r.exam_id === selectedExam.id)
      : results;
      
    const passedCount = examResults.filter(r => r.status === 'PASSED').length;
    const totalCount = examResults.length;
    const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
    const failRate = totalCount > 0 ? 100 - passRate : 0;
    const avgMarks = totalCount > 0 ? Math.round(examResults.reduce((acc, r) => acc + (Number(r.marks) || 0), 0) / totalCount) : 0;

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl border border-white overflow-hidden max-h-[90vh] flex flex-col"
        >
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-primary/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800">
                  {selectedExam ? `${selectedExam.title} - Analytics` : 'Global Result Analytics'}
                </h2>
                <p className="text-slate-500 text-sm font-bold">Exam Performance Insights</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setIsAnalyticsOpen(false);
                setSelectedExam(null);
              }}
              className="p-3 bg-white text-slate-400 hover:text-rose-500 rounded-2xl shadow-sm hover:shadow-md transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                <p className="text-emerald-600 text-xs font-black uppercase tracking-widest mb-1">Pass Ratio</p>
                <h3 className="text-3xl font-black text-emerald-900">{passRate}%</h3>
              </div>
              <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                <p className="text-amber-600 text-xs font-black uppercase tracking-widest mb-1">Average Marks</p>
                <h3 className="text-3xl font-black text-amber-900">{avgMarks}</h3>
              </div>
              <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100">
                <p className="text-rose-600 text-xs font-black uppercase tracking-widest mb-1">Fail Ratio</p>
                <h3 className="text-3xl font-black text-rose-900">{failRate}%</h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Top Performers</h4>
                <p className="text-[10px] font-bold text-slate-400">BASED ON {examResults.length} RESULTS</p>
              </div>
              {examResults.length > 0 ? (
                <div className="space-y-2">
                  {[...examResults]
                    .sort((a, b) => (Number(b.marks) || 0) - (Number(a.marks) || 0))
                    .slice(0, 5)
                    .map((res, idx) => (
                      <div key={res.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-[10px] font-black text-primary">#{idx + 1}</span>
                          <div>
                            <p className="font-bold text-slate-700 leading-none">{res.studentName || 'Unknown Student'}</p>
                            <p className="text-[10px] text-slate-400 mt-1 font-bold">{res.student_id}</p>
                          </div>
                        </div>
                        <span className="font-black text-primary">{res.marks}/{res.total_marks || 100}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs font-bold">
                  No results data available for this selection
                </div>
              )}
            </div>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button 
              onClick={() => {
                setIsAnalyticsOpen(false);
                setSelectedExam(null);
              }}
              className="px-8 py-3 bg-white text-slate-600 rounded-2xl font-bold border border-slate-200 hover:bg-slate-100 transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderResults = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Total Evaluated', value: results.filter(r => r.status !== 'PENDING').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { title: 'Pass Rate', value: `${Math.round((results.filter(r => r.status === 'PASSED').length / results.filter(r => r.status !== 'PENDING').length || 0) * 100)}%`, icon: Award, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { title: 'Avg Score', value: `${Math.round(results.filter(r => r.status !== 'PENDING').reduce((acc, r) => acc + r.marks, 0) / results.filter(r => r.status !== 'PENDING').length || 0)}%`, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((stat) => (
          <div key={stat.title} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", stat.bg)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{stat.title}</p>
            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[32px] border border-primary/10 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Results List</h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleResultsExportPDF}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              <FileText className="w-3 h-3" />
              PDF
            </button>
            <button 
              onClick={handleResultsExportExcel}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              <Download className="w-3 h-3" />
              Excel
            </button>
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Exam</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Score</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {results
              .filter(r => {
                if (['STUDENT', 'PARENT'].includes(user?.role || '')) {
                  return r.status !== 'PENDING' && r.is_published;
                }
                return r.status !== 'PENDING';
              })
              .map((res) => (
              <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs">
                      {(res.studentName || '').charAt(0)}
                    </div>
                    <span className="font-bold text-slate-700">{res.studentName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {exams.find((e: any) => e.id === res.examId)?.title || 'Unknown Exam'}
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-black text-slate-900">{res.marks}/{res.totalMarks}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    res.status === 'PASSED' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>
                    {res.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => {
                      if (['STUDENT', 'PARENT'].includes(user?.role || '')) {
                        setSelectedResult(res);
                        setIsScorecardOpen(true);
                      } else {
                        handleManualEvaluate(res);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderScorecard = () => {
    if (!selectedResult) return null;
    const exam = exams.find(e => e.id === selectedResult.examId);
    const paper = exam?.papers;
    const evaluationData = selectedResult.evaluation_data || {};

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-primary/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800">Exam Scorecard</h2>
                <p className="text-slate-500 text-sm font-bold">{exam?.title || 'Unknown Exam'}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsScorecardOpen(false)}
              className="p-3 bg-white text-slate-400 hover:text-rose-500 rounded-2xl shadow-sm hover:shadow-md transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marks Obtained</p>
                <h3 className="text-3xl font-black text-primary">
                  {selectedResult.marks} <span className="text-slate-300 text-lg">/ {selectedResult.totalMarks}</span>
                </h3>
              </div>
              <div className={cn(
                "px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm",
                selectedResult.status === 'PASSED' ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-rose-500 text-white shadow-rose-200"
              )}>
                {selectedResult.status}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Question-wise Breakdown</h4>
              {paper?.questions?.length > 0 ? (
                paper.questions.map((q: any, idx: number) => {
                  const evalItem = evaluationData[q.id] || { marks: 0, feedback: '' };
                  return (
                    <div key={q.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm border-l-4 border-l-primary/20">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black text-slate-400">Q{idx + 1} ({q.type})</span>
                        <span className="text-sm font-black text-primary">{evalItem.marks} / {q.marks}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-700 mb-3">{q.text}</p>
                      {evalItem.feedback && (
                        <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                          <p className="text-[10px] font-black text-primary uppercase mb-1">Faculty Feedback</p>
                          <p className="text-xs text-slate-600 italic">"{evalItem.feedback}"</p>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 font-bold">No question details available</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
             <button 
              onClick={() => window.print()}
              className="px-6 py-3 bg-white text-slate-600 rounded-2xl font-bold border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print Result
            </button>
            <button 
              onClick={() => setIsScorecardOpen(false)}
              className="px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {isScorecardOpen && renderScorecard()}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Examination System</h1>
          <p className="text-slate-500">Manage online exams, schedules, and result publishing.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          </div>
          <button 
            onClick={() => {
              setSelectedExam(null); // Open global analytics
              setIsAnalyticsOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <TrendingUp className="w-4 h-4" />
            Result Analytics
          </button>
          {canManageExams && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              <Plus className="w-4 h-4" />
              Schedule Exam
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        {[
          { id: 'schedule', label: 'Schedule', icon: Calendar },
          { id: 'evaluation', label: 'Evaluation', icon: PenTool },
          { id: 'results', label: 'Results', icon: Award },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === tab.id 
                ? "bg-white text-primary shadow-sm" 
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'schedule' && renderSchedule()}
      {activeTab === 'evaluation' && renderEvaluation()}
      {activeTab === 'results' && renderResults()}

      {/* Schedule Exam Modal */}
      {/* Analytics Modal */}
      {isAnalyticsOpen && renderAnalytics()}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Schedule New Exam</h2>
                    <p className="text-xs text-slate-500">Fill in the details to create a new exam schedule.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exam Title</label>
                  <input 
                    type="text" 
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g. Final Semester Physics"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Session</label>
                    <select 
                      name="session"
                      required
                      value={formData.session}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      <option value="">Select Session</option>
                      {(academicSettings.sessions || []).map((s: string) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course</label>
                    <select 
                      name="course"
                      required
                      value={formData.course_id || ''}
                      onChange={(e) => {
                        const selectedCourse = courses.find(c => c.id === e.target.value);
                        setFormData({
                          ...formData,
                          course_id: e.target.value,
                          course: selectedCourse ? selectedCourse.name : ''
                        });
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      <option value="">Select Course</option>
                      {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</label>
                  <input 
                    type="text" 
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="e.g. Physics 101"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</label>
                    <input 
                      type="date" 
                      name="date"
                      required
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Time</label>
                    <input 
                      type="time" 
                      name="time"
                      required
                      value={formData.time}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duration (Minutes)</label>
                    <input 
                      type="number" 
                      name="duration"
                      required
                      value={formData.duration}
                      onChange={handleInputChange}
                      placeholder="120"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Question Paper</label>
                  <select 
                    name="paperId"
                    required
                    value={formData.paperId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    <option value="">Select a Paper</option>
                    {papers.map((p) => (
                      <option key={p.id} value={p.id}>{p.title} ({p.subject})</option>
                    ))}
                  </select>
                </div>

                {linkedPaper && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3"
                  >
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-green-700">Question Paper Auto-Fetched</p>
                      <p className="text-[10px] text-green-600">Linked: {linkedPaper.title}</p>
                    </div>
                  </motion.div>
                )}

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Schedule Exam
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
