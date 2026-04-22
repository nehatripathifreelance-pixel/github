import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Calendar, 
  Clock, 
  User, 
  MapPin,
  Save,
  Sparkles,
  Download,
  Printer,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  X,
  ClipboardList,
  FileText,
  History,
  MessageSquare
} from 'lucide-react';
import { cn, formatDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { AlertTriangle } from 'lucide-react';
import { supabase, testSupabaseConnection } from '../../lib/supabase';

interface Course {
  id: string;
  name: string;
  code: string;
  department: string;
  duration: string;
  semesters: number;
  credits: number;
  description: string;
  feePattern: 'SEMESTER' | 'ANNUAL';
  feeAmount: number;
}

interface SyllabusItem {
  id: string;
  courseId: string;
  unitNumber: number;
  title: string;
  description: string;
}

interface StudyActivity {
  id: string;
  date: string;
  batch: string;
  courseId: string;
  activities: string[];
  assignmentSubject: string;
  assignmentTopic: string;
  remarks: string;
  teacherId: string;
}

interface TimeTableSlot {
  id: string;
  courseId: string;
  subject: string;
  faculty: string;
  room: string;
  day: string;
  type: string;
  batch: string;
  startTime: string;
  endTime: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
  '07:00 AM - 08:20 AM',
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM',
  '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM'
];

export const Courses: React.FC = () => {
  const { user } = useAuth();
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message?: string; details?: string }>({ connected: true });
  const [activeTab, setActiveTab] = useState<'courses' | 'timetable' | 'syllabus' | 'studylog'>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [timetable, setTimetable] = useState<TimeTableSlot[]>([]);
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>([]);
  const [studyLogs, setStudyLogs] = useState<StudyActivity[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('All');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('All');
  
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);
  const [isStudyLogModalOpen, setIsStudyLogModalOpen] = useState(false);
  
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingSlot, setEditingSlot] = useState<TimeTableSlot | null>(null);
  const [editingSyllabus, setEditingSyllabus] = useState<SyllabusItem | null>(null);
  const [editingStudyLog, setEditingStudyLog] = useState<StudyActivity | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Form states
  const [courseForm, setCourseForm] = useState<Partial<Course>>({});
  const [slotForm, setSlotForm] = useState<Partial<TimeTableSlot>>({});
  const [syllabusForm, setSyllabusForm] = useState<Partial<SyllabusItem>>({});
  const [studyLogForm, setStudyLogForm] = useState<Partial<StudyActivity>>({
    activities: ['', '', '', '', '']
  });

  useEffect(() => {
    const init = async () => {
      const result = await testSupabaseConnection();
      setDbStatus(result);
      await fetchData();
    };
    init();
  }, []);

  const fetchData = async () => {
    const [coursesRes, syllabusRes, studyLogsRes, timetableRes] = await Promise.all([
      supabase.from('courses').select('*'),
      supabase.from('syllabus').select('*'),
      supabase.from('study_activities').select('*'),
      supabase.from('timetable').select('*')
    ]);

    if (coursesRes.data) {
      setCourses(coursesRes.data.map(c => ({
        ...c,
        feePattern: c.fee_pattern,
        feeAmount: c.fee_amount
      })));
    }
    if (syllabusRes.data) {
      setSyllabus(syllabusRes.data.map(s => ({
        id: s.id,
        courseId: s.course_id,
        unitNumber: Number(s.unit_number),
        title: s.unit_title || s.title,
        description: s.description
      })));
    }
    if (studyLogsRes.data) {
      setStudyLogs(studyLogsRes.data.map(s => ({
        id: s.id,
        date: s.date,
        batch: s.batch,
        courseId: s.course_id,
        activities: s.activities,
        assignmentSubject: s.assignment_subject,
        assignmentTopic: s.assignment_topic,
        remarks: s.remarks,
        teacherId: s.teacher_id
      })));
    }
    if (timetableRes.data) {
      setTimetable(timetableRes.data.map(t => ({
        id: t.id,
        courseId: t.course_id,
        subject: t.subject,
        faculty: t.faculty,
        room: t.room,
        day: t.day,
        startTime: t.start_time,
        endTime: t.end_time
      })));
    }

    // Fallback to initial data if no courses in Supabase
    if (!coursesRes.data || coursesRes.data.length === 0) {
      const initialCourses = [
        { name: 'Computer Science & Engineering', code: 'CSE', department: 'Engineering', duration: '4 Years', semesters: 8, credits: 160, description: 'Core computer science principles and applications.', fee_pattern: 'SEMESTER', fee_amount: 25000 },
        { name: 'Information Technology', code: 'IT', department: 'Engineering', duration: '4 Years', semesters: 8, credits: 158, description: 'Focus on information systems and network technologies.', fee_pattern: 'SEMESTER', fee_amount: 24000 },
        { name: 'Electronics & Communication', code: 'ECE', department: 'Engineering', duration: '4 Years', semesters: 8, credits: 162, description: 'Study of electronic circuits and communication systems.', fee_pattern: 'SEMESTER', fee_amount: 26000 }
      ];
      await supabase.from('courses').insert(initialCourses);
      fetchData(); // Re-fetch to get the generated IDs
    }
  };

  const handleAddCourse = async () => {
    const data: any = {
      name: courseForm.name || '',
      code: courseForm.code || '',
      department: courseForm.department || '',
      duration: courseForm.duration || '',
      semesters: Number(courseForm.semesters) || 0,
      credits: Number(courseForm.credits) || 0,
      description: courseForm.description || '',
      fee_pattern: courseForm.feePattern || 'SEMESTER',
      fee_amount: Number(courseForm.feeAmount) || 0
    };

    let error;
    if (editingCourse) {
      const { error: err } = await supabase.from('courses').update(data).eq('id', editingCourse.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('courses').insert(data);
      error = err;
    }

    if (!error) {
      fetchData();
      setIsCourseModalOpen(false);
      setEditingCourse(null);
      setCourseForm({});
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (!error) fetchData();
    }
  };

  const handlePrintTimetable = (course?: Course, batch?: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const filteredTimetable = timetable.filter(s => 
      (!course || s.courseId === course.id) && 
      (!batch || batch === 'All' || s.batch === batch)
    );

    const title = `${course?.name || 'Academic'} Timetable ${batch && batch !== 'All' ? `- ${batch}` : ''}`;

    const content = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; }
            .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #ef4444; }
            .title { font-size: 24px; font-weight: 800; color: #ef4444; text-transform: uppercase; margin: 0; }
            .subtitle { color: #64748b; font-size: 14px; margin-top: 5px; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: fixed; }
            th { background: #f8fafc; padding: 12px; font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; border: 1px solid #e2e8f0; }
            td { padding: 12px; border: 1px solid #e2e8f0; font-size: 12px; vertical-align: top; }
            .slot { background: #f1f5f9; padding: 8px; border-radius: 8px; margin-bottom: 4px; }
            .slot-subject { font-weight: 800; font-size: 11px; color: #0f172a; display: block; }
            .slot-info { font-size: 10px; color: #64748b; font-weight: 500; }
            .time-col { background: #f8fafc; font-weight: 800; width: 120px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${title}</h1>
            <p class="subtitle">Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th class="time-col">Time Slot</th>
                ${DAYS.map(day => `<th>${day}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${TIME_SLOTS.map(slot => {
                const startTime = slot.split(' - ')[0];
                return `
                  <tr>
                    <td class="time-col">${slot}</td>
                    ${DAYS.map(day => {
                      const daySlots = filteredTimetable.filter(s => s.day === day && s.startTime === startTime);
                      return `
                        <td>
                          ${daySlots.map(s => `
                            <div class="slot">
                              <span class="slot-subject">${s.subject}</span>
                              <span class="slot-info">${s.faculty} (${s.room})</span>
                              ${!batch || batch === 'All' ? `<span class="slot-info" style="display:block; font-style:italic;">Batch: ${s.batch}</span>` : ''}
                            </div>
                          `).join('')}
                        </td>
                      `;
                    }).join('')}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleShareWhatsApp = (type: 'Timetable' | 'StudyLog', data: any) => {
    let text = `*Academic ${type} Update*\n\n`;
    
    if (type === 'Timetable') {
      text += `Course: ${data.courseName}\nBatch: ${data.batch}\n\n`;
      text += `Check out the updated timetable on the Parents Panel.`;
    } else {
      text += `*Study Log for ${formatDate(data.date)}*\n`;
      text += `Batch: ${data.batch}\n`;
      text += `Course: ${data.courseName}\n\n`;
      text += `*Activities:*\n${data.activities.map((a: string, i: number) => `${i+1}. ${a}`).join('\n')}\n\n`;
      if (data.assignmentSubject) text += `*Assignment:* ${data.assignmentSubject} - ${data.assignmentTopic}\n`;
      if (data.remarks) text += `*Remarks:* ${data.remarks}\n`;
    }

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleAddSlot = async () => {
    const data = {
      course_id: slotForm.courseId || '',
      batch: slotForm.batch || '',
      type: slotForm.type || 'Regular',
      subject: slotForm.subject || '',
      faculty: slotForm.faculty || '',
      room: slotForm.room || '',
      day: slotForm.day || '',
      start_time: slotForm.startTime || '',
      end_time: slotForm.endTime || ''
    };

    let error;
    if (editingSlot) {
      const { error: err } = await supabase.from('timetable').update(data).eq('id', editingSlot.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('timetable').insert(data);
      error = err;
    }

    if (!error) {
      fetchData();
      setIsTimetableModalOpen(false);
      setEditingSlot(null);
      setSlotForm({});
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this slot?')) {
      const { error } = await supabase.from('timetable').delete().eq('id', id);
      if (!error) fetchData();
    }
  };

  const handleSaveSyllabus = async () => {
    if (!syllabusForm.courseId || !syllabusForm.title || !syllabusForm.unitNumber) {
      alert('Please fill in all required fields (Course, Unit Number, and Title)');
      return;
    }

    const data = {
      course_id: syllabusForm.courseId,
      unit_number: String(syllabusForm.unitNumber),
      unit_title: syllabusForm.title,
      description: syllabusForm.description || ''
    };

    let error;
    if (editingSyllabus) {
      const { error: err } = await supabase.from('syllabus').update(data).eq('id', editingSyllabus.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('syllabus').insert(data);
      error = err;
    }

    if (error) {
      console.error('Error saving syllabus:', error);
      alert('Failed to save syllabus item. ' + error.message);
    } else {
      await fetchData();
      setIsSyllabusModalOpen(false);
      setEditingSyllabus(null);
      setSyllabusForm({});
    }
  };

  const handleDeleteSyllabus = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this syllabus item?')) {
      const { error } = await supabase.from('syllabus').delete().eq('id', id);
      if (!error) fetchData();
    }
  };

  const handleSaveStudyLog = async () => {
    if (!studyLogForm.courseId || !studyLogForm.batch) {
      alert('Please select a Course and enter the Batch');
      return;
    }

    const data = {
      date: studyLogForm.date || new Date().toISOString().split('T')[0],
      batch: studyLogForm.batch,
      course_id: studyLogForm.courseId,
      activities: (studyLogForm.activities || []).filter(a => a && a.trim() !== ''),
      assignment_subject: studyLogForm.assignmentSubject || '',
      assignment_topic: studyLogForm.assignmentTopic || '',
      remarks: studyLogForm.remarks || ''
    };

    let error;
    if (editingStudyLog) {
      const { error: err } = await supabase.from('study_activities').update(data).eq('id', editingStudyLog.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('study_activities').insert(data);
      error = err;
    }

    if (error) {
      console.error('Error saving study log:', error);
      alert('Failed to save study log. ' + error.message);
    } else {
      await fetchData();
      setIsStudyLogModalOpen(false);
      setEditingStudyLog(null);
      setStudyLogForm({ activities: ['', '', '', '', ''] });
    }
  };

  const handleDeleteStudyLog = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this study log?')) {
      const { error } = await supabase.from('study_activities').delete().eq('id', id);
      if (!error) fetchData();
    }
  };

  const generateAITimetable = () => {
    setIsGeneratingAI(true);
    setTimeout(async () => {
      const subjects = ['Data Structures', 'Algorithms', 'Operating Systems', 'Database Systems', 'Computer Networks', 'Software Engineering'];
      const faculties = ['Dr. Smith', 'Prof. Johnson', 'Dr. Williams', 'Prof. Brown', 'Dr. Jones'];
      const rooms = ['Room 101', 'Room 102', 'Lab 1', 'Lab 2', 'Seminar Hall'];
      
      const newSlots: TimeTableSlot[] = [];
      
      courses.forEach(course => {
        DAYS.forEach(day => {
          // Add 3-4 random slots per day for each course
          const numSlots = Math.floor(Math.random() * 2) + 3;
          const usedTimes = new Set();
          
          for (let i = 0; i < numSlots; i++) {
            let timeIdx;
            do {
              timeIdx = Math.floor(Math.random() * TIME_SLOTS.length);
            } while (usedTimes.has(timeIdx));
            
            usedTimes.add(timeIdx);
            const timeRange = TIME_SLOTS[timeIdx].split(' - ');
            
            newSlots.push({
              id: Math.random().toString(36).substr(2, 9),
              courseId: course.id,
              subject: subjects[Math.floor(Math.random() * subjects.length)],
              faculty: faculties[Math.floor(Math.random() * faculties.length)],
              room: rooms[Math.floor(Math.random() * rooms.length)],
              day,
              type: 'Regular',
              batch: ['Morning', 'Evening', 'Weekend'][Math.floor(Math.random() * 3)],
              startTime: timeRange[0],
              endTime: timeRange[1]
            });
          }
        });
      });
      
      const formattedSlots = newSlots.map(slot => ({
        course_id: slot.courseId,
        batch: slot.batch,
        subject: slot.subject,
        faculty: slot.faculty,
        room: slot.room,
        day: slot.day,
        start_time: slot.startTime,
        end_time: slot.endTime
      }));
      
      const { error } = await supabase.from('timetable').insert(formattedSlots);
      if (!error) fetchData();
      setIsGeneratingAI(false);
    }, 2000);
  };

  const filteredCourses = courses.filter(c => 
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.code || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Database Connection Warning */}
      {!dbStatus.connected && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex flex-col gap-1 text-rose-700"
        >
          <div className="flex items-center gap-3 font-medium">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              {dbStatus.message || 'Database connection failed.'}
            </p>
          </div>
          {dbStatus.details && (
            <p className="text-xs text-rose-600 ml-8 opacity-80">
              {dbStatus.details}
            </p>
          )}
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Course Management</h1>
          <p className="text-slate-500">Manage academic courses and plan time tables.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'courses' ? (
            <button 
              onClick={() => {
                setEditingCourse(null);
                setCourseForm({});
                setIsCourseModalOpen(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <Plus className="w-5 h-5" />
              Add New Course
            </button>
          ) : activeTab === 'timetable' ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={generateAITimetable}
                disabled={isGeneratingAI}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
              >
                {isGeneratingAI ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                AI Planner
              </button>
              <button 
                onClick={() => {
                  setEditingSlot(null);
                  setSlotForm({});
                  setIsTimetableModalOpen(true);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                <Plus className="w-5 h-5" />
                Add Slot
              </button>
            </div>
          ) : activeTab === 'syllabus' ? (
            <button 
              onClick={() => {
                setEditingSyllabus(null);
                setSyllabusForm({});
                setIsSyllabusModalOpen(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <Plus className="w-5 h-5" />
              Add Syllabus Item
            </button>
          ) : (
            <button 
              onClick={() => {
                setEditingStudyLog(null);
                setStudyLogForm({ activities: ['', '', '', '', ''] });
                setIsStudyLogModalOpen(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <Plus className="w-5 h-5" />
              Log Study Activity
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-primary/5 rounded-2xl w-full overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('courses')}
          className={cn(
            "px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'courses' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-primary"
          )}
        >
          <BookOpen className="w-4 h-4" />
          Courses
        </button>
        <button 
          onClick={() => setActiveTab('timetable')}
          className={cn(
            "px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'timetable' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-primary"
          )}
        >
          <Calendar className="w-4 h-4" />
          Time Table
        </button>
        <button 
          onClick={() => setActiveTab('syllabus')}
          className={cn(
            "px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'syllabus' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-primary"
          )}
        >
          <ClipboardList className="w-4 h-4" />
          Syllabus
        </button>
        <button 
          onClick={() => setActiveTab('studylog')}
          className={cn(
            "px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'studylog' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-primary"
          )}
        >
          <History className="w-4 h-4" />
          Study Log
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'courses' ? (
          <motion.div 
            key="courses"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Search & Filter */}
            <div className="bg-white p-6 rounded-3xl border border-primary/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search courses by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-background text-slate-600 rounded-xl text-sm font-bold hover:bg-primary/5 hover:text-primary transition-all">
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-background text-slate-600 rounded-xl text-sm font-bold hover:bg-primary/5 hover:text-primary transition-all">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white p-6 rounded-3xl border border-primary/10 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          setEditingCourse(course);
                          setCourseForm(course);
                          setIsCourseModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteCourse(course.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mb-4">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-1 rounded-md">
                      {course.code}
                    </span>
                    <h3 className="text-xl font-black text-slate-800 mt-2 line-clamp-1">{course.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mt-1">{course.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Duration</p>
                      <p className="text-sm font-bold text-slate-700">{course.duration}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Credits</p>
                      <p className="text-sm font-bold text-slate-700">{course.credits} Points</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : activeTab === 'timetable' ? (
          <motion.div 
            key="timetable"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Actions & Filters */}
            <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Filter Course</p>
                  <select 
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="bg-background border-none rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="All">All Courses</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Filter Batch</p>
                  <select 
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="bg-background border-none rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="All">All Batches</option>
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Weekend">Weekend</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handlePrintTimetable(
                    selectedCourseId !== 'All' ? courses.find(c => c.id === selectedCourseId) : undefined,
                    selectedBatch
                  )}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-sm font-bold hover:bg-indigo-100 transition-all border border-indigo-100"
                >
                  <Printer className="w-5 h-5" />
                  Print Timetable
                </button>
                <button 
                  onClick={() => handleShareWhatsApp('Timetable', { 
                    courseName: selectedCourseId !== 'All' ? courses.find(c => c.id === selectedCourseId)?.name : 'All Courses',
                    batch: selectedBatch
                  })}
                  className="flex items-center gap-2 px-6 py-3 bg-green-50 text-green-600 rounded-2xl text-sm font-bold hover:bg-green-100 transition-all border border-green-100"
                >
                  <MessageSquare className="w-5 h-5" />
                  Share on WhatsApp
                </button>
              </div>
            </div>

            {/* Time Table View */}
            <div className="bg-white rounded-3xl border border-primary/10 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 w-48">Time Slot</th>
                      {DAYS.map(day => (
                        <th key={day} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {TIME_SLOTS.map(slot => (
                      <tr key={slot} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-8 text-sm font-bold text-slate-500 sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 border-r border-slate-50">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {slot}
                          </div>
                        </td>
                        {DAYS.map(day => {
                          const startTime = slot.split(' - ')[0];
                          const daySlots = timetable.filter(s => 
                            s.day === day && 
                            s.startTime === startTime &&
                            (selectedCourseId === 'All' || s.courseId === selectedCourseId) &&
                            (selectedBatch === 'All' || s.batch === selectedBatch)
                          );
                          
                          return (
                            <td key={day} className="px-4 py-4 min-w-[200px]">
                              {daySlots.length > 0 ? (
                                <div className="space-y-2">
                                  {daySlots.map(s => (
                                    <div 
                                      key={s.id}
                                      className={cn(
                                        "p-3 border rounded-2xl relative group/slot",
                                        s.type === 'Holiday' ? "bg-rose-50 border-rose-100" :
                                        s.type === 'Event' ? "bg-amber-50 border-amber-100" :
                                        "bg-primary/5 border-primary/10"
                                      )}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                          {s.type === 'Holiday' && <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black uppercase rounded shrink-0">Holiday</span>}
                                          {s.type === 'Event' && <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[8px] font-black uppercase rounded shrink-0">Event</span>}
                                          <p className={cn(
                                            "text-xs font-black uppercase tracking-tight truncate",
                                            s.type === 'Holiday' ? "text-rose-600" :
                                            s.type === 'Event' ? "text-amber-600" :
                                            "text-primary"
                                          )}>{s.subject}</p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover/slot:opacity-100 transition-opacity">
                                          <button 
                                            onClick={() => {
                                              setEditingSlot(s);
                                              setSlotForm(s);
                                              setIsTimetableModalOpen(true);
                                            }}
                                            className="p-1 text-slate-400 hover:text-primary"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteSlot(s.id)}
                                            className="p-1 text-slate-400 hover:text-rose-600"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                                        <User className="w-3 h-3" />
                                        {s.faculty}
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-1">
                                        <MapPin className="w-3 h-3" />
                                        {s.room}
                                      </div>
                                      <div className="mt-1 text-[9px] font-black text-primary/40 uppercase tracking-widest">{s.batch}</div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="h-full min-h-[60px] flex items-center justify-center border-2 border-dashed border-slate-50 rounded-2xl text-slate-300 group-hover:border-slate-100 transition-colors">
                                  <Plus className="w-4 h-4" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'syllabus' ? (
          <motion.div 
            key="syllabus"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-6">
              {courses.map(course => {
                const courseSyllabus = syllabus.filter(s => s.courseId === course.id).sort((a, b) => a.unitNumber - b.unitNumber);
                return (
                  <div key={course.id} className="bg-white rounded-3xl border border-primary/10 shadow-sm overflow-hidden">
                    <div className="p-6 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-800">{course.name}</h3>
                          <p className="text-xs text-slate-500 font-bold">{course.code}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      {courseSyllabus.length > 0 ? (
                        <div className="space-y-4">
                          {courseSyllabus.map(item => (
                            <div key={item.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl group">
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary font-black text-sm shadow-sm shrink-0">
                                {item.unitNumber}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-slate-800">{item.title}</h4>
                                <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => {
                                    setEditingSyllabus(item);
                                    setSyllabusForm(item);
                                    setIsSyllabusModalOpen(true);
                                  }}
                                  className="p-2 text-slate-400 hover:text-primary hover:bg-white rounded-lg transition-all"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteSyllabus(item.id)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                          <ClipboardList className="w-12 h-12 mb-4 opacity-20" />
                          <p className="font-bold">No syllabus items added yet.</p>
                          <button 
                            onClick={() => {
                              setEditingSyllabus(null);
                              setSyllabusForm({ courseId: course.id });
                              setIsSyllabusModalOpen(true);
                            }}
                            className="mt-4 text-primary font-bold hover:underline"
                          >
                            Add First Unit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="studylog"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {studyLogs.map((log, index) => {
                const course = courses.find(c => c.id === log.courseId);
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-3xl border border-primary/10 shadow-sm overflow-hidden hover:shadow-xl transition-all group"
                  >
                    <div className="p-6 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                          <History className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-800">{formatDate(log.date)}</h3>
                          <p className="text-xs text-slate-500 font-bold">{log.batch} • {course?.name}</p>
                        </div>
                      </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleShareWhatsApp('StudyLog', {
                              ...log,
                              courseName: course?.name || 'Course'
                            })}
                            className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-all"
                            title="Share on WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                            setEditingStudyLog(log);
                            setStudyLogForm(log);
                            setIsStudyLogModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-white rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteStudyLog(log.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today's Study Activities</p>
                        <div className="space-y-1.5">
                          {log.activities.map((activity, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                              <span className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">{i + 1}</span>
                              {activity}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Assignment Subject</p>
                          <p className="text-sm font-bold text-slate-700">{log.assignmentSubject || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Assignment Topic</p>
                          <p className="text-sm font-bold text-slate-700">{log.assignmentTopic || 'N/A'}</p>
                        </div>
                      </div>
                      {log.remarks && (
                        <div className="pt-4 border-t border-slate-50">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Remarks</p>
                          <p className="text-sm text-slate-600 italic mt-1">"{log.remarks}"</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Course Modal */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-primary/5">
              <div>
                <h2 className="text-2xl font-black text-primary">{editingCourse ? 'Edit Course' : 'Add New Course'}</h2>
                <p className="text-slate-500 text-sm">Enter course details below.</p>
              </div>
              <button 
                onClick={() => setIsCourseModalOpen(false)}
                className="p-2 hover:bg-white rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course Name</label>
                  <input 
                    type="text" 
                    value={courseForm.name || ''}
                    onChange={(e) => setCourseForm({...courseForm, name: e.target.value})}
                    placeholder="e.g. Computer Science"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course Code</label>
                  <input 
                    type="text" 
                    value={courseForm.code || ''}
                    onChange={(e) => setCourseForm({...courseForm, code: e.target.value})}
                    placeholder="e.g. CSE"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department</label>
                  <select 
                    value={courseForm.department || ''}
                    onChange={(e) => setCourseForm({...courseForm, department: e.target.value})}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Select Department</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Science">Science</option>
                    <option value="Arts">Arts</option>
                    <option value="Commerce">Commerce</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</label>
                  <input 
                    type="text" 
                    value={courseForm.duration || ''}
                    onChange={(e) => setCourseForm({...courseForm, duration: e.target.value})}
                    placeholder="e.g. 4 Years"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semesters</label>
                  <input 
                    type="number" 
                    value={courseForm.semesters || ''}
                    onChange={(e) => setCourseForm({...courseForm, semesters: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Credits</label>
                  <input 
                    type="number" 
                    value={courseForm.credits || ''}
                    onChange={(e) => setCourseForm({...courseForm, credits: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fee Pattern</label>
                  <select 
                    value={courseForm.feePattern || 'SEMESTER'}
                    onChange={(e) => setCourseForm({...courseForm, feePattern: e.target.value as any})}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="SEMESTER">Semester Wise</option>
                    <option value="ANNUAL">Annual Wise</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fee Amount (per period)</label>
                  <input 
                    type="number" 
                    value={courseForm.feeAmount || ''}
                    onChange={(e) => setCourseForm({...courseForm, feeAmount: Number(e.target.value)})}
                    placeholder="e.g. 25000"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea 
                  rows={3}
                  value={courseForm.description || ''}
                  onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                  className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                />
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsCourseModalOpen(false)}
                className="px-6 py-3 text-slate-500 font-bold hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddCourse}
                className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                <Save className="w-5 h-5" />
                {editingCourse ? 'Update Course' : 'Save Course'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Timetable Modal */}
      {isTimetableModalOpen && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-primary/5">
              <div>
                <h2 className="text-2xl font-black text-primary">{editingSlot ? 'Edit Slot' : 'Add Time Table Slot'}</h2>
                <p className="text-slate-500 text-sm">Schedule a new class session.</p>
              </div>
              <button 
                onClick={() => setIsTimetableModalOpen(false)}
                className="p-2 hover:bg-white rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Slot Type</label>
                  <select 
                    value={slotForm.type || 'Regular'}
                    onChange={(e) => setSlotForm({...slotForm, type: e.target.value})}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all border-none"
                  >
                    <option value="Regular">Regular Class</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Event">Event / Seminar</option>
                    <option value="Lab">Lab Session</option>
                    <option value="Exam">Examination</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course</label>
                  <select 
                    value={slotForm.courseId || ''}
                    onChange={(e) => setSlotForm({...slotForm, courseId: e.target.value})}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Select Course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</label>
                  <input 
                    type="text" 
                    value={slotForm.subject || ''}
                    onChange={(e) => setSlotForm({...slotForm, subject: e.target.value})}
                    placeholder="e.g. Data Structures"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faculty</label>
                  <input 
                    type="text" 
                    value={slotForm.faculty || ''}
                    onChange={(e) => setSlotForm({...slotForm, faculty: e.target.value})}
                    placeholder="e.g. Dr. Smith"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Room / Lab</label>
                  <input 
                    type="text" 
                    value={slotForm.room || ''}
                    onChange={(e) => setSlotForm({...slotForm, room: e.target.value})}
                    placeholder="e.g. Room 101"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Day</label>
                  <select 
                    value={slotForm.day || ''}
                    onChange={(e) => setSlotForm({...slotForm, day: e.target.value})}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Select Day</option>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Batch</label>
                  <select 
                    value={slotForm.batch || ''}
                    onChange={(e) => setSlotForm({...slotForm, batch: e.target.value})}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Select Batch</option>
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Weekend">Weekend</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Time</label>
                  <select 
                    value={slotForm.startTime || ''}
                    onChange={(e) => {
                      const selectedSlot = TIME_SLOTS.find(s => s.startsWith(e.target.value));
                      if (selectedSlot) {
                        const [start, end] = selectedSlot.split(' - ');
                        setSlotForm({...slotForm, startTime: start, endTime: end});
                      }
                    }}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Select Slot</option>
                    {TIME_SLOTS.map(s => <option key={s} value={s.split(' - ')[0]}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsTimetableModalOpen(false)}
                className="px-6 py-3 text-slate-500 font-bold hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddSlot}
                className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                <Save className="w-5 h-5" />
                {editingSlot ? 'Update Slot' : 'Save Slot'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Syllabus Modal */}
      {isSyllabusModalOpen && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-primary/5">
              <div>
                <h2 className="text-2xl font-black text-primary">{editingSyllabus ? 'Edit Syllabus Item' : 'Add Syllabus Item'}</h2>
                <p className="text-slate-500 text-sm">Define a new unit for the course syllabus.</p>
              </div>
              <button 
                onClick={() => setIsSyllabusModalOpen(false)}
                className="p-2 hover:bg-white rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course</label>
                  <select 
                    value={syllabusForm.courseId || ''}
                    onChange={(e) => setSyllabusForm({...syllabusForm, courseId: e.target.value})}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Select Course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit Number</label>
                  <input 
                    type="number" 
                    value={syllabusForm.unitNumber || ''}
                    onChange={(e) => setSyllabusForm({...syllabusForm, unitNumber: Number(e.target.value)})}
                    placeholder="e.g. 1"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit Title</label>
                <input 
                  type="text" 
                  value={syllabusForm.title || ''}
                  onChange={(e) => setSyllabusForm({...syllabusForm, title: e.target.value})}
                  placeholder="e.g. Introduction to Computer Science"
                  className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description / Topics</label>
                <textarea 
                  rows={4}
                  value={syllabusForm.description || ''}
                  onChange={(e) => setSyllabusForm({...syllabusForm, description: e.target.value})}
                  placeholder="List topics covered in this unit..."
                  className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                />
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsSyllabusModalOpen(false)}
                className="px-6 py-3 text-slate-500 font-bold hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSyllabus}
                className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                <Save className="w-5 h-5" />
                {editingSyllabus ? 'Update Item' : 'Save Item'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Study Log Modal */}
      {isStudyLogModalOpen && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-6 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl my-auto overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-primary/5">
              <div>
                <h2 className="text-2xl font-black text-primary">Today's Study Activities</h2>
                <p className="text-slate-500 text-sm">Log topics covered and assignments given.</p>
              </div>
              <button 
                onClick={() => setIsStudyLogModalOpen(false)}
                className="p-2 hover:bg-white rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</label>
                  <input 
                    type="date" 
                    value={studyLogForm.date || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setStudyLogForm({...studyLogForm, date: e.target.value})}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Batch</label>
                  <input 
                    type="text" 
                    value={studyLogForm.batch || ''}
                    onChange={(e) => setStudyLogForm({...studyLogForm, batch: e.target.value})}
                    placeholder="e.g. 12:20"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course</label>
                  <select 
                    value={studyLogForm.courseId || ''}
                    onChange={(e) => setStudyLogForm({...studyLogForm, courseId: e.target.value})}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Select Course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Activities Covered</label>
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-primary/5 rounded-lg flex items-center justify-center text-xs font-black text-primary shrink-0">{i + 1})</span>
                      <input 
                        type="text" 
                        value={studyLogForm.activities?.[i] || ''}
                        onChange={(e) => {
                          const newActivities = [...(studyLogForm.activities || ['', '', '', '', ''])];
                          newActivities[i] = e.target.value;
                          setStudyLogForm({...studyLogForm, activities: newActivities});
                        }}
                        placeholder={`Activity ${i + 1}...`}
                        className="w-full px-4 py-2.5 bg-background border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-800 mb-4">Assignment Details</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</label>
                    <input 
                      type="text" 
                      value={studyLogForm.assignmentSubject || ''}
                      onChange={(e) => setStudyLogForm({...studyLogForm, assignmentSubject: e.target.value})}
                      placeholder="e.g. Child Health Nursing"
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Topic</label>
                    <input 
                      type="text" 
                      value={studyLogForm.assignmentTopic || ''}
                      onChange={(e) => setStudyLogForm({...studyLogForm, assignmentTopic: e.target.value})}
                      placeholder="e.g. Growth & Development"
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Remarks / Authority's Signature</label>
                <textarea 
                  rows={2}
                  value={studyLogForm.remarks || ''}
                  onChange={(e) => setStudyLogForm({...studyLogForm, remarks: e.target.value})}
                  placeholder="Enter any additional remarks..."
                  className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                />
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsStudyLogModalOpen(false)}
                className="px-6 py-3 text-slate-500 font-bold hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveStudyLog}
                className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                <Save className="w-5 h-5" />
                {editingStudyLog ? 'Update Log' : 'Save Log'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
