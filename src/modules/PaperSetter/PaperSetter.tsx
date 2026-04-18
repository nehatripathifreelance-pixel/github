import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  FileText, 
  CheckCircle2, 
  HelpCircle,
  Type,
  ListChecks,
  AlignLeft,
  Settings2,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit2,
  ChevronLeft,
  Image as ImageIcon,
  Upload,
  X as CloseIcon,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { supabase, testSupabaseConnection } from '../../lib/supabase';
import { useEffect } from 'react';

type QuestionType = 'MCQ' | 'FILL_BLANKS' | 'ONE_SENTENCE' | 'SHORT_ANSWER' | 'LONG_ANSWER';

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  marks: number;
  options?: string[];
  correctAnswer?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  diagramUrl?: string;
}

interface Paper {
  id: string;
  title: string;
  course: string;
  subject: string;
  totalMarks: number;
  duration: number;
  questions: Question[];
}

export const PaperSetter: React.FC = () => {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message?: string; details?: string }>({ connected: true });
  const [paper, setPaper] = useState<Paper>({
    id: `p${Math.random().toString(36).substr(2, 9)}`,
    title: '',
    course: '',
    subject: '',
    totalMarks: 100,
    duration: 180,
    questions: []
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const result = await testSupabaseConnection();
      setDbStatus(result);
      
      const { data: cData } = await supabase.from('courses').select('*');
      if (cData) setCourses(cData);
      
      // Fetch papers AFTER courses are loaded so mapping works correctly
      const { data: pData, error } = await supabase.from('exam_papers').select('*');
      if (pData) {
        const formattedPapers = pData.map(p => {
          const course = cData?.find(c => c.id === p.course_id);
          return {
            id: p.id,
            title: p.title,
            course: course?.name || p.course_id || 'N/A',
            subject: 'General',
            totalMarks: p.total_marks,
            duration: p.duration,
            questions: p.questions || []
          };
        });
        setPapers(formattedPapers);
      }
    };
    init();
  }, []);

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('*');
    if (data) setCourses(data);
  };

  const fetchPapers = async () => {
    const { data, error } = await supabase.from('exam_papers').select('*');
    if (error) {
      console.error('Error fetching papers:', error);
      return;
    }
    if (data) {
      const formattedPapers: Paper[] = data.map(p => {
        const course = courses.find(c => c.id === p.course_id);
        return {
          id: p.id,
          title: p.title,
          course: course?.name || p.course_id || 'N/A',
          subject: 'General',
          totalMarks: p.total_marks,
          duration: p.duration,
          questions: p.questions || []
        };
      });
      setPapers(formattedPapers);
    }
  };

  const fetchPaper = async (id: string) => {
    const { data, error } = await supabase.from('exam_papers').select('*').eq('id', id).single();
    if (error) {
      console.error('Error fetching paper:', error);
      return;
    }
    if (data) {
      setPaper({
        id: data.id,
        title: data.title,
        course: data.course_id || '',
        subject: 'General',
        totalMarks: data.total_marks,
        duration: data.duration,
        questions: data.questions || []
      });
      setView('edit');
    }
  };

  const savePaper = async () => {
    if (!paper.title) {
      alert('Please enter a paper title');
      return;
    }
    setIsSaving(true);
    
    const paperData: any = {
      title: paper.title,
      course_id: paper.course || null,
      total_marks: paper.totalMarks,
      duration: paper.duration,
      questions: paper.questions
    };

    let error;
    if (view === 'edit' && paper.id && !paper.id.startsWith('p')) {
      const { error: err } = await supabase.from('exam_papers').update(paperData).eq('id', paper.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('exam_papers').insert([paperData]);
      error = err;
    }
    
    if (error) {
      console.error('Error saving paper:', error);
      setIsSaving(false);
      alert('Error saving paper: ' + error.message);
      return;
    }

    await fetchPapers();
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setView('list');
    }, 2000);
  };

  const handleCreateNew = () => {
    setPaper({
      id: `p${Math.random().toString(36).substr(2, 9)}`,
      title: '',
      course: '',
      subject: '',
      totalMarks: 100,
      duration: 180,
      questions: []
    });
    setView('edit');
  };

  const handleDeletePaper = async (id: string | number) => {
    if (!window.confirm('Are you sure you want to delete this paper? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase.from('exam_papers').delete().eq('id', id);
      if (error) {
        console.error('Error deleting paper:', error);
        if (error.code === '23503') {
          alert('Cannot delete paper: This paper is currently linked to one or more exams. Please remove the exams first.');
        } else {
          alert('Error deleting paper: ' + error.message);
        }
      } else {
        await fetchPapers();
      }
    } catch (err: any) {
      console.error('Exception deleting paper:', err);
      alert('An unexpected error occurred while deleting the paper.');
    }
  };

  const addQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      text: '',
      marks: type === 'MCQ' ? 2 : type === 'LONG_ANSWER' ? 10 : 5,
      difficulty: 'MEDIUM',
      options: type === 'MCQ' ? ['', '', '', ''] : undefined
    };
    setPaper({ ...paper, questions: [...paper.questions, newQuestion] });
    setActiveQuestion(newQuestion.id);
  };

  const removeQuestion = (id: string) => {
    setPaper({ ...paper, questions: paper.questions.filter(q => q.id !== id) });
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setPaper({
      ...paper,
      questions: paper.questions.map(q => q.id === id ? { ...q, ...updates } : q)
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Database Connection Warning */}
      {!dbStatus.connected && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex flex-col gap-1 text-rose-700 font-medium"
        >
          <div className="flex items-center gap-3 font-medium">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              {dbStatus.message || 'Database connection failed.'}
            </p>
          </div>
          {dbStatus.details && (
            <p className="text-xs text-rose-600 ml-8 opacity-80 font-normal">
              {dbStatus.details}
            </p>
          )}
        </motion.div>
      )}

      {view === 'list' ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Question Papers</h1>
              <p className="text-slate-500">Manage and create examination papers.</p>
            </div>
            <button 
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              <Plus className="w-5 h-5" />
              Create New Paper
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {papers.length === 0 ? (
              <div className="col-span-full bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-300" />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-1">No papers found</h4>
                <p className="text-slate-500 mb-6">Start by creating your first examination paper.</p>
                <button 
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Create First Paper
                </button>
              </div>
            ) : (
              papers.map((p) => (
                <motion.div 
                  key={p.id}
                  whileHover={{ y: -4 }}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           fetchPaper(p.id);
                         }}
                         className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                         title="Edit Paper"
                       >
                         <Edit2 className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           handleDeletePaper(p.id);
                         }}
                         className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                         title="Delete Paper"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1">{p.title}</h3>
                  <p className="text-sm text-slate-500 mb-4">{p.subject} • {p.course}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Questions</p>
                        <p className="text-sm font-bold text-slate-700">{p.questions.length}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Marks</p>
                        <p className="text-sm font-bold text-slate-700">{p.totalMarks}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => fetchPaper(p.id)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                    >
                      Edit Paper →
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('list')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-slate-500" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Paper Setter</h1>
                <p className="text-slate-500">Configure your examination paper.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 text-slate-500 hover:bg-primary/5 rounded-lg transition-colors border border-primary/10">
                <Eye className="w-5 h-5" />
              </button>
              <button className="p-2 text-slate-500 hover:bg-primary/5 rounded-lg transition-colors border border-primary/10">
                <Copy className="w-5 h-5" />
              </button>
              <button 
                onClick={savePaper}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isSaving ? 'Saving...' : 'Save Paper'}
              </button>
            </div>
          </div>

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 z-50 bg-primary text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold">Paper Saved!</p>
              <p className="text-xs text-white/80">Question paper has been stored in the system.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Paper Config */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-indigo-500" />
              Paper Configuration
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paper Title</label>
                <input 
                  type="text" 
                  value={paper.title}
                  onChange={(e) => setPaper({ ...paper, title: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course</label>
                <select 
                  value={paper.course}
                  onChange={(e) => setPaper({ ...paper, course: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Select Course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject</label>
                <input 
                  type="text" 
                  value={paper.subject}
                  onChange={(e) => setPaper({ ...paper, subject: e.target.value })}
                  placeholder="e.g. Mathematics"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Marks</label>
                  <input 
                    type="number" 
                    value={paper.totalMarks}
                    onChange={(e) => setPaper({ ...paper, totalMarks: parseInt(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duration (Min)</label>
                  <input 
                    type="number" 
                    value={paper.duration}
                    onChange={(e) => setPaper({ ...paper, duration: parseInt(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Add Question</h3>
            <div className="grid grid-cols-1 gap-2">
              {[
                { type: 'MCQ', label: 'Multiple Choice', icon: ListChecks, color: 'text-blue-600', bg: 'bg-blue-50' },
                { type: 'FILL_BLANKS', label: 'Fill in the Blanks', icon: HelpCircle, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { type: 'ONE_SENTENCE', label: 'One Sentence', icon: Type, color: 'text-green-600', bg: 'bg-green-50' },
                { type: 'SHORT_ANSWER', label: 'Short Answer', icon: AlignLeft, color: 'text-amber-600', bg: 'bg-amber-50' },
                { type: 'LONG_ANSWER', label: 'Long Answer', icon: FileText, color: 'text-red-600', bg: 'bg-red-50' },
              ].map((btn) => (
                <button
                  key={btn.type}
                  onClick={() => addQuestion(btn.type as QuestionType)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group text-left"
                >
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110", btn.bg)}>
                    <btn.icon className={cn("w-5 h-5", btn.color)} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{btn.label}</span>
                  <Plus className="w-4 h-4 text-slate-300 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Questions List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Questions ({paper.questions.length})</h3>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-bold text-indigo-600">{paper.questions.reduce((acc, q) => acc + q.marks, 0)}</span>
              <span>/ {paper.totalMarks} Marks</span>
            </div>
          </div>

          <div className="space-y-4">
            {paper.questions.map((q, index) => (
              <motion.div
                layout
                key={q.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "bg-white rounded-2xl border transition-all overflow-hidden",
                  activeQuestion === q.id ? "border-indigo-500 shadow-lg shadow-indigo-50" : "border-slate-200 shadow-sm"
                )}
              >
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50"
                  onClick={() => setActiveQuestion(activeQuestion === q.id ? null : q.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 truncate max-w-md">
                        {q.text || <span className="text-slate-400 italic">No question text...</span>}
                      </h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">
                          {q.type?.replace('_', ' ') || ''}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {q.marks} Marks
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                          q.difficulty === 'EASY' ? "text-green-600 bg-green-50" : 
                          q.difficulty === 'MEDIUM' ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50"
                        )}>
                          {q.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeQuestion(q.id); }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {activeQuestion === q.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                <AnimatePresence>
                  {activeQuestion === q.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 p-6 bg-slate-50/30"
                    >
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question Text</label>
                          <textarea 
                            value={q.text}
                            onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                            placeholder="Enter the question here..."
                            className="w-full mt-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Diagram / Image (Optional)</label>
                          <div className="mt-1 flex items-center gap-4">
                            {q.diagramUrl ? (
                              <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-slate-200">
                                <img src={q.diagramUrl} alt="Diagram" className="w-full h-full object-cover" />
                                <button 
                                  onClick={() => updateQuestion(q.id, { diagramUrl: undefined })}
                                  className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full shadow-lg"
                                >
                                  <CloseIcon className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div 
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = (e: any) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        updateQuestion(q.id, { diagramUrl: event.target?.result as string });
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  };
                                  input.click();
                                }}
                                className="w-32 h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-all cursor-pointer bg-white"
                              >
                                <Upload className="w-6 h-6 mb-2" />
                                <span className="text-[10px] font-bold">Upload Diagram</span>
                              </div>
                            )}
                            <div className="flex-1 text-xs text-slate-500">
                              <p>Add a diagram, chart, or any image related to this question.</p>
                              <p className="mt-1">Supported formats: JPG, PNG, WEBP</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Marks</label>
                            <input 
                              type="number" 
                              value={q.marks}
                              onChange={(e) => updateQuestion(q.id, { marks: parseInt(e.target.value) })}
                              className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Difficulty</label>
                            <select 
                              value={q.difficulty}
                              onChange={(e) => updateQuestion(q.id, { difficulty: e.target.value as any })}
                              className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                              <option value="EASY">Easy</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HARD">Hard</option>
                            </select>
                          </div>
                        </div>

                        {q.type === 'MCQ' && (
                          <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Options</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {q.options?.map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-white border border-slate-200 rounded flex items-center justify-center text-xs font-bold text-slate-400">
                                    {String.fromCharCode(65 + optIdx)}
                                  </div>
                                  <input 
                                    type="text" 
                                    value={opt}
                                    onChange={(e) => {
                                      const newOpts = [...(q.options || [])];
                                      newOpts[optIdx] = e.target.value;
                                      updateQuestion(q.id, { options: newOpts });
                                    }}
                                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder={`Option ${optIdx + 1}`}
                                  />
                                  <input 
                                    type="radio" 
                                    name={`correct-${q.id}`}
                                    checked={q.correctAnswer === opt && opt !== ''}
                                    onChange={() => updateQuestion(q.id, { correctAnswer: opt })}
                                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {paper.questions.length === 0 && (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-8 h-8 text-slate-300" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1">No questions added yet</h4>
              <p className="text-slate-500 mb-6">Select a question type from the left panel to start building your paper.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
