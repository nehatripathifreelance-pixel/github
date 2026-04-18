import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Calendar, 
  FileText, 
  CreditCard, 
  Award, 
  Clock, 
  ClipboardList, 
  History,
  Play,
  Timer,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Download,
  Search,
  Filter,
  User,
  MapPin,
  LayoutDashboard
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface StudentData {
  id: string;
  name: string;
  courseId: string;
  courseName: string;
  branch: string;
  year: string;
  batch: string;
}

export const StudentPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'exams' | 'results' | 'fees' | 'courses' | 'timetable' | 'syllabus' | 'studylog'>('overview');
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [syllabus, setSyllabus] = useState<any[]>([]);
  const [studyLogs, setStudyLogs] = useState<any[]>([]);
  
  // Exam Interface states
  const [activeView, setActiveView] = useState<'panel' | 'take_exam'>('panel');
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Student Profile
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*, courses(name)')
        .eq('id', user.id)
        .single();

      if (student) {
        setStudentData({
          id: student.id,
          name: student.name,
          courseId: student.course_id,
          courseName: student.courses?.name || 'N/A',
          branch: student.branch,
          year: student.year,
          batch: student.batch
        });

        // 2. Fetch all related data in parallel
        const [examsRes, resultsRes, feesRes, coursesRes, timetableRes, syllabusRes, studyLogsRes] = await Promise.all([
          supabase.from('exams').select('*, papers:exam_papers(*)').eq('course', student.courses?.name).order('date', { ascending: true }),
          supabase.from('results').select('*, exams(*)').eq('student_id', student.id).eq('is_published', true).order('created_at', { ascending: false }),
          supabase.from('fees').select('*').eq('student_id', student.id).order('due_date', { ascending: true }),
          supabase.from('courses').select('*'),
          supabase.from('timetable').select('*').eq('course_id', student.course_id),
          supabase.from('syllabus').select('*').eq('course_id', student.course_id).order('unit_number', { ascending: true }),
          supabase.from('study_activities').select('*').eq('course_id', student.course_id).order('date', { ascending: false })
        ]);

        if (examsRes.data) setExams(examsRes.data);
        if (resultsRes.data) setResults(resultsRes.data);
        if (feesRes.data) setFees(feesRes.data);
        if (coursesRes.data) setCourses(coursesRes.data);
        if (timetableRes.data) setTimetable(timetableRes.data);
        if (syllabusRes.data) setSyllabus(syllabusRes.data);
        if (studyLogsRes.data) setStudyLogs(studyLogsRes.data);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Exam Timer Logic
  useEffect(() => {
    let timer: any;
    if (activeView === 'take_exam' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && activeView === 'take_exam') {
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
    setActiveView('take_exam');
  };

  const handleFinishExam = async () => {
    if (!selectedExam || !studentData) return;

    const resultData = {
      id: `RES${Math.floor(1000 + Math.random() * 9000)}`,
      student_id: studentData.id,
      student_name: studentData.name,
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

    setActiveView('panel');
    setActiveTab('results');
    fetchStudentData();
    alert('Exam submitted successfully! Results will be published after evaluation.');
  };

  const handleMakePayment = async (fee: any) => {
    if (!window.confirm(`Proceed to pay ${formatCurrency(fee.amount)}?`)) return;

    const { error } = await supabase
      .from('fees')
      .update({ 
        status: 'PAID',
        payment_mode: 'Online',
        payment_method: 'Card/UPI',
        transaction_id: `TXN${Math.floor(100000 + Math.random() * 900000)}`
      })
      .eq('id', fee.id);

    if (error) {
      console.error('Error making payment:', error);
      alert('Payment failed. Please try again.');
      return;
    }

    fetchStudentData();
    alert('Payment successful!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (activeView === 'take_exam') {
    return (
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
              
              <h3 className="text-lg font-black text-slate-800 mb-6">{q.text}</h3>

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
            onClick={handleFinishExam}
            className="px-12 py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
          >
            Submit Exam
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Student Panel</h1>
          <p className="text-slate-500 font-medium">Welcome back, {studentData?.name}. Here's your academic overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white border border-primary/10 rounded-xl shadow-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-slate-700">{studentData?.courseName}</span>
          </div>
          <div className="px-4 py-2 bg-white border border-primary/10 rounded-xl shadow-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-slate-700">{studentData?.year}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 p-1 bg-primary/5 rounded-2xl overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'exams', label: 'Exams', icon: FileText },
          { id: 'results', label: 'Results', icon: Award },
          { id: 'fees', label: 'Fees', icon: CreditCard },
          { id: 'courses', label: 'My Course', icon: BookOpen },
          { id: 'timetable', label: 'Time Table', icon: Calendar },
          { id: 'syllabus', label: 'Syllabus', icon: ClipboardList },
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
            {/* Stats */}
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[32px] border border-primary/10 shadow-sm">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
                    <Award className="w-6 h-6" />
                  </div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Latest Score</p>
                  <p className="text-3xl font-black text-slate-900">
                    {results[0] ? `${results[0].marks}/${results[0].total_marks}` : 'N/A'}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-primary/10 shadow-sm">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Pending Fees</p>
                  <p className="text-3xl font-black text-slate-900">
                    {formatCurrency(fees.filter(f => f.status === 'PENDING').reduce((acc, f) => acc + f.amount, 0))}
                  </p>
                </div>
              </div>

              {/* Upcoming Exams */}
              <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-800">Upcoming Exams</h3>
                  <button onClick={() => setActiveTab('exams')} className="text-xs font-bold text-primary hover:underline">View All</button>
                </div>
                <div className="space-y-4">
                  {exams.filter(e => e.status !== 'COMPLETED').slice(0, 3).map((exam) => (
                    <div key={exam.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between group hover:bg-white hover:border-primary/10 border border-transparent transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center border border-slate-100 group-hover:border-primary/10">
                          <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(exam.date).toLocaleString('default', { month: 'short' })}</span>
                          <span className="text-sm font-black text-slate-800">{new Date(exam.date).getDate()}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{exam.title}</h4>
                          <p className="text-xs text-slate-500">{exam.subject} • {exam.time}</p>
                        </div>
                      </div>
                      {exam.status === 'ONGOING' ? (
                        <button 
                          onClick={() => handleStartExam(exam)}
                          className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Start Now
                        </button>
                      ) : (
                        <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                          Upcoming
                        </span>
                      )}
                    </div>
                  ))}
                  {exams.filter(e => e.status !== 'COMPLETED').length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-slate-400 font-bold">No upcoming exams scheduled.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Overview */}
            <div className="space-y-8">
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
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{slot.startTime}</p>
                        <h4 className="font-bold text-slate-800">{slot.subject}</h4>
                        <p className="text-xs text-slate-500">{slot.faculty} • {slot.room}</p>
                      </div>
                    </div>
                  ))}
                  {timetable.filter(t => t.day === new Date().toLocaleDateString('en-US', { weekday: 'long' })).length === 0 && (
                    <p className="text-slate-400 font-bold text-center py-4">No classes scheduled for today.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'exams' && (
          <motion.div 
            key="exams"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {exams.map((exam) => (
                <div key={exam.id} className="bg-white p-6 rounded-[32px] border border-primary/10 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        exam.status === 'UPCOMING' ? "bg-amber-50 text-amber-600" : 
                        exam.status === 'ONGOING' ? "bg-indigo-50 text-indigo-600" : "bg-green-50 text-green-600"
                      )}>
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800">{exam.title}</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{exam.subject}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      exam.status === 'UPCOMING' ? "bg-amber-50 text-amber-600" : 
                      exam.status === 'ONGOING' ? "bg-indigo-50 text-indigo-600" : "bg-green-50 text-green-600"
                    )}>
                      {exam.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date & Time</p>
                      <p className="text-sm font-bold text-slate-800">{formatDate(exam.date)}</p>
                      <p className="text-xs text-slate-500">{exam.time}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                      <p className="text-sm font-bold text-slate-800">{exam.duration} Minutes</p>
                      <p className="text-xs text-slate-500">Online Exam</p>
                    </div>
                  </div>

                  {exam.status === 'ONGOING' ? (
                    <button 
                      onClick={() => handleStartExam(exam)}
                      className="w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Start Examination
                    </button>
                  ) : exam.status === 'COMPLETED' ? (
                    <button className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black cursor-not-allowed flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Exam Completed
                    </button>
                  ) : (
                    <div className="w-full py-4 bg-amber-50 text-amber-600 rounded-2xl font-black flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4" />
                      Starts in {formatDate(exam.date)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'results' && (
          <motion.div 
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-[32px] border border-primary/10 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-primary/5 border-b border-primary/10">
                    <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Examination</th>
                    <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Subject</th>
                    <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Score</th>
                    <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {results.map((res) => (
                    <tr key={res.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-slate-800">{res.exams?.title}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(res.created_at)}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-slate-700">{res.exams?.subject}</p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900">{res.marks}/{res.total_marks}</span>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full",
                                res.status === 'PASSED' ? "bg-emerald-500" : "bg-rose-500"
                              )}
                              style={{ width: `${(res.marks/res.total_marks) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center w-fit gap-1.5",
                          res.status === 'PASSED' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {res.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                          <Download className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {results.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold">No results published yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'fees' && (
          <motion.div 
            key="fees"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-[32px] border border-primary/10 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-primary/5 border-b border-primary/10">
                    <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Description</th>
                    <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Amount</th>
                    <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Due Date</th>
                    <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {fees.map((fee) => (
                    <tr key={fee.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-slate-800">{fee.description}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-slate-900">{formatCurrency(fee.amount)}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-slate-600">{formatDate(fee.due_date)}</p>
                      </td>
                      <td className="px-8 py-5">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          fee.status === 'PAID' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {fee.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        {fee.status !== 'PAID' && (
                          <button 
                            onClick={() => handleMakePayment(fee)}
                            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                          >
                            Pay Now
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'courses' && (
          <motion.div 
            key="courses"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {courses.map((course) => (
              <div key={course.id} className={cn(
                "bg-white p-8 rounded-[32px] border transition-all group",
                course.id === studentData?.courseId ? "border-primary shadow-xl ring-4 ring-primary/5" : "border-primary/10 shadow-sm"
              )}>
                <div className="flex items-center justify-between mb-6">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    course.id === studentData?.courseId ? "bg-primary text-white" : "bg-primary/10 text-primary"
                  )}>
                    <BookOpen className="w-6 h-6" />
                  </div>
                  {course.id === studentData?.courseId && (
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">Enrolled</span>
                  )}
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">{course.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-6">{course.description}</p>
                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                    <p className="text-sm font-bold text-slate-700">{course.duration}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Credits</p>
                    <p className="text-sm font-bold text-slate-700">{course.credits}</p>
                  </div>
                </div>
              </div>
            ))}
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-primary/5 border-b border-primary/10">
                    <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Time Slot</th>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                      <th key={day} className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest text-center">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    '09:00 AM - 10:00 AM',
                    '10:00 AM - 11:00 AM',
                    '11:00 AM - 12:00 PM',
                    '12:00 PM - 01:00 PM',
                    '02:00 PM - 03:00 PM',
                    '03:00 PM - 04:00 PM'
                  ].map(slot => (
                    <tr key={slot} className="group hover:bg-primary/5 transition-colors">
                      <td className="px-8 py-8 text-sm font-black text-slate-500 border-r border-slate-50 bg-white group-hover:bg-primary/5">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {slot}
                        </div>
                      </td>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                        const startTime = slot.split(' - ')[0];
                        const daySlots = timetable.filter(s => s.day === day && s.startTime === startTime);
                        return (
                          <td key={day} className="px-4 py-4 min-w-[180px]">
                            {daySlots.map(s => (
                              <div key={s.id} className="p-4 bg-white border border-primary/10 rounded-2xl shadow-sm">
                                <p className="text-xs font-black text-primary uppercase tracking-tight mb-1">{s.subject}</p>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                                  <User className="w-3 h-3" />
                                  {s.faculty}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-1">
                                  <MapPin className="w-3 h-3" />
                                  {s.room}
                                </div>
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Course Syllabus</h3>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">{studentData?.courseName}</p>
                </div>
              </div>
              <div className="space-y-4">
                {syllabus.map((item) => (
                  <div key={item.id} className="flex items-start gap-6 p-6 bg-slate-50 rounded-[24px] group hover:bg-white hover:border-primary/10 border border-transparent transition-all">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary font-black text-lg shadow-sm shrink-0 group-hover:border-primary/10 border border-slate-100">
                      {item.unitNumber}
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-800 mb-1">{item.title}</h4>
                      <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
                {syllabus.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-slate-400 font-bold">Syllabus not yet updated for this course.</p>
                  </div>
                )}
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
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {studyLogs.map((log) => (
              <div key={log.id} className="bg-white rounded-[32px] border border-primary/10 shadow-sm overflow-hidden hover:shadow-md transition-all">
                <div className="p-6 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800">{formatDate(log.date)}</h3>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{log.batch}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activities Covered</p>
                    <div className="space-y-2">
                      {log.activities.map((activity: string, i: number) => (
                        <div key={i} className="flex items-center gap-3 text-sm text-slate-600 font-bold">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                          {activity}
                        </div>
                      ))}
                    </div>
                  </div>
                  {(log.assignment_subject || log.assignment_topic) && (
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <p className="text-xs font-black text-primary uppercase tracking-widest">Assignment</p>
                      </div>
                      <p className="text-sm font-black text-slate-800">{log.assignment_subject}</p>
                      <p className="text-xs text-slate-500 font-bold mt-1">{log.assignment_topic}</p>
                    </div>
                  )}
                  {log.remarks && (
                    <div className="pt-4 border-t border-slate-50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Teacher's Remarks</p>
                      <p className="text-xs text-slate-500 font-medium italic">"{log.remarks}"</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {studyLogs.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-[32px] border border-primary/10">
                <p className="text-slate-400 font-bold">No study logs entered by faculty yet.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
