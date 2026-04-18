import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Camera,
  FileText,
  ShieldAlert,
  Heart,
  GraduationCap,
  Edit2,
  Trash2,
  AlertTriangle,
  Save,
  Truck,
  Building2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, safeLocalStorageSet } from '../../lib/utils';
import { exportToPDF, exportToExcel } from '../../lib/exportUtils';
import { supabase, testSupabaseConnection } from '../../lib/supabase';

interface Student {
  id: string;
  rollNumber: string;
  title?: string;
  firstName?: string;
  middleName?: string;
  surname?: string;
  name: string;
  email: string;
  phone: string;
  courseId: string;
  courseName?: string;
  branch: string;
  batch: string;
  year: string;
  semester: string;
  session?: string;
  bloodGroup?: string;
  religion?: string;
  caste?: string;
  category?: string;
  address?: string;
  state?: string;
  pincode?: string;
  permanentAddress?: string;
  permanentState?: string;
  permanentPincode?: string;
  transportMode?: string;
  vehicleNumber?: string;
  routeName?: string;
  isHosteller?: boolean;
  hostelName?: string;
  roomNumber?: string;
  fatherName?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherOccupation?: string;
  parentPhone?: string;
  parentEmail?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyAddress?: string;
  allergy?: string;
  status: 'Active' | 'Inactive';
  photoUrl?: string;
  studentDocsUrl?: string;
  parentDocsUrl?: string;
  signatureUrl?: string;
}

export const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [view, setView] = useState<'list' | 'register'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message?: string; details?: string }>({ connected: true });
  const [academicSettings, setAcademicSettings] = useState<any>({
    castes: ['General', 'OBC', 'SC', 'ST', 'EWS'],
    religions: ['Hinduism', 'Islam', 'Christianity', 'Sikhism', 'Buddhism', 'Jainism'],
    branches: ['Computer Science', 'Information Technology', 'Mechanical', 'Civil', 'Electronics', 'Physiotherapy', 'Biology', 'Medicine', 'Science'],
    batches: ['Morning', 'Evening', 'Weekend'],
    sessions: ['2023-24', '2024-25', '2025-26'],
    courses: ['B.Tech Computer Science', 'B.Tech IT', 'B.Tech Mechanical', 'B.Tech Civil', 'Bachelor of Physiotherapy'],
    semesters: ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester', '1st Year', '2nd Year', '3rd Year', '4th Years']
  });

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
    'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 
    'Lakshadweep', 'Puducherry'
  ];

  useEffect(() => {
    const init = async () => {
      const result = await testSupabaseConnection();
      setDbStatus(result);
      await fetchAcademicSettings();
      const currentCourses = await fetchCourses();
      await fetchStudents(currentCourses);
    };
    init();
  }, []);

  const fetchAcademicSettings = async () => {
    const { data, error } = await supabase.from('app_settings').select('*').eq('key', 'academic').single();
    if (data && data.value) {
      setAcademicSettings(data.value);
    }
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('*');
    if (data) {
      setCourses(data);
      return data;
    }
    return [];
  };

  const fetchStudents = async (currentCourses?: any[]) => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching students:', error);
      // Fallback to local storage if supabase fails
      const saved = localStorage.getItem('edunexus_students');
      if (saved) setStudents(JSON.parse(saved));
    } else if (data) {
      if (data.length > 0) {
        setAvailableColumns(Object.keys(data[0]));
      }
      const coursesToUse = currentCourses || courses;
      const formattedStudents: Student[] = data.map(s => {
        const studentCourse = coursesToUse.find((c: any) => c.id === s.course_id);
        return {
          id: s.id,
          rollNumber: s.roll_no || '',
          title: s.title,
          firstName: s.first_name,
          middleName: s.middle_name,
          surname: s.surname,
          name: s.name,
          email: s.email || '',
          phone: s.phone || '',
          courseId: s.course_id || '',
          courseName: studentCourse?.name || '',
          branch: s.branch || '',
          batch: s.batch || '',
          year: s.year || '',
          semester: s.semester || '',
          bloodGroup: s.blood_group,
          religion: s.religion,
          caste: s.caste,
          category: s.category,
          address: s.residential_address,
          state: s.state,
          pincode: s.pincode,
          permanentAddress: s.permanent_address,
          permanentState: s.permanent_state,
          permanentPincode: s.permanent_pincode,
          transportMode: s.transport_mode,
          vehicleNumber: s.vehicle_number,
          routeName: s.route_name,
          isHosteller: s.is_hosteller,
          hostelName: s.hostel_name,
          roomNumber: s.room_number,
          fatherName: s.father_name,
          fatherOccupation: s.father_occupation,
          motherName: s.mother_name,
          motherOccupation: s.mother_occupation,
          parentPhone: s.parent_phone,
          parentEmail: s.parent_email,
          emergencyName: s.emergency_contact_name,
          emergencyPhone: s.emergency_phone,
          emergencyAddress: s.emergency_address,
          allergy: s.allergies,
          photoUrl: s.photo_url,
          studentDocsUrl: (s.student_documents && s.student_documents[0]) || s.student_docs_url || '',
          parentDocsUrl: (s.parent_documents && s.parent_documents[0]) || s.parent_docs_url || '',
          signatureUrl: s.signature_url,
          status: s.status as 'Active' | 'Inactive'
        };
      });
      setStudents(formattedStudents);
      safeLocalStorageSet('edunexus_students', formattedStudents);
    }
  };

  const saveStudents = async (newStudents: Student[]) => {
    setStudents(newStudents);
    safeLocalStorageSet('edunexus_students', newStudents);
  };

  const addStudentToSupabase = async (student: any) => {
    const { error } = await supabase.from('students').insert([student]);
    if (error) {
      console.error('Error adding student to Supabase:', error);
      return { success: false, error };
    }
    return { success: true };
  };

  const updateStudentInSupabase = async (student: any) => {
    const { error } = await supabase.from('students').update(student).eq('id', student.id);
    if (error) {
      console.error('Error updating student in Supabase:', error);
      return { success: false, error };
    }
    return { success: true };
  };

  const deleteStudentFromSupabase = async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) console.error('Error deleting student from Supabase:', error);
  };

  const INITIAL_FORM_STATE = {
    title: 'Mr.',
    firstName: '',
    middleName: '',
    surname: '',
    rollNumber: '',
    course: '',
    branch: '',
    batch: '',
    year: '',
    semester: '',
    session: '',
    phone: '',
    email: '',
    address: '',
    bloodGroup: '',
    religion: '',
    caste: '',
    category: '',
    state: '',
    pincode: '',
    permanentAddress: '',
    permanentState: '',
    permanentPincode: '',
    transportMode: 'Private/Self',
    vehicleNumber: '',
    routeName: '',
    isHosteller: false,
    hostelName: '',
    roomNumber: '',
    fatherName: '',
    fatherOccupation: '',
    motherName: '',
    motherOccupation: '',
    parentPhone: '',
    parentEmail: '',
    emergencyName: '',
    emergencyAddress: '',
    emergencyPhone: '',
    allergy: '',
    photoUrl: '',
    studentDocsUrl: '',
    parentDocsUrl: '',
    signatureUrl: '',
  };

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  const [generatedId, setGeneratedId] = useState('');

  useEffect(() => {
    if (view === 'register') {
      const year = new Date().getFullYear();
      const random = Math.floor(1000 + Math.random() * 9000);
      setGeneratedId(`STU${year}${random}`);
    }
  }, [view]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const studentData: any = {
      id: editingStudent?.id || generatedId,
      roll_no: formData.rollNumber,
      title: formData.title,
      first_name: formData.firstName,
      middle_name: formData.middleName,
      surname: formData.surname,
      name: `${formData.title} ${formData.firstName} ${formData.surname}`,
      email: formData.email,
      phone: formData.phone,
      course_id: formData.course || null,
      branch: formData.branch,
      batch: formData.batch,
      year: formData.year,
      semester: formData.semester,
      session: formData.session,
      blood_group: formData.bloodGroup,
      religion: formData.religion,
      caste: formData.caste,
      category: formData.category,
      residential_address: formData.address,
      state: formData.state,
      pincode: formData.pincode,
      permanent_address: formData.permanentAddress,
      permanent_state: formData.permanentState,
      permanent_pincode: formData.permanentPincode,
      transport_mode: formData.transportMode,
      vehicle_number: formData.vehicleNumber,
      route_name: formData.routeName,
      is_hosteller: formData.isHosteller,
      hostel_name: formData.hostelName,
      room_number: formData.roomNumber,
      father_name: formData.fatherName,
      father_occupation: formData.fatherOccupation,
      mother_name: formData.motherName,
      mother_occupation: formData.motherOccupation,
      parent_phone: formData.parentPhone,
      parent_email: formData.parentEmail,
      emergency_phone: formData.emergencyPhone,
      emergency_address: formData.emergencyAddress,
      allergies: formData.allergy,
      photo_url: formData.photoUrl,
      student_documents: formData.studentDocsUrl ? [formData.studentDocsUrl] : null,
      parent_documents: formData.parentDocsUrl ? [formData.parentDocsUrl] : null,
      signature_url: formData.signatureUrl,
      status: 'Active'
    };

    // Dynamically add columns if they exist in the DB schema
    const hasFetchedColumns = availableColumns.length > 0;
    if (!hasFetchedColumns || availableColumns.includes('emergency_contact_name')) {
      studentData.emergency_contact_name = formData.emergencyName;
    }

    let result;
    if (editingStudent) {
      result = await updateStudentInSupabase(studentData);
    } else {
      result = await addStudentToSupabase(studentData);
      
      if (result.success) {
        // Create User Credentials for Login only for NEW students
        // Use student ID as the unique identifier for credentials
        await supabase.from('user_credentials').upsert({
          id: studentData.id,
          password: '12345',
          role: 'STUDENT',
          name: studentData.name,
          email: studentData.email
        });

        // Initialize fees for student based on course
        const studentCourse = courses.find(c => c.id === formData.course);
        if (studentCourse && studentCourse.fee_amount > 0) {
          await supabase.from('fees').insert({
            student_id: studentData.id,
            amount: studentCourse.fee_amount,
            date: new Date().toISOString().split('T')[0],
            status: 'PENDING',
            description: `Admission Fee: ${studentCourse.name}`
          });
        }
      }
    }

    if (!result.success) {
      console.error('Save error details:', result.error);
      setIsSubmitting(false);
      
      const errMsg = result.error?.message || 'Unknown error';
      if (errMsg.includes('emergency_contact_name') || result.error?.code === 'PGRST204') {
        const sqlFix = "ALTER TABLE students ADD COLUMN emergency_contact_name TEXT;";
        alert(`Database Schema Error: The 'emergency_contact_name' column appears to be missing in your Supabase 'students' table.\n\nPlease run this SQL in your Supabase SQL Editor to fix it:\n\n${sqlFix}\n\nAlternatively, run the full setup script again.`);
      } else {
        alert(`Failed to save student: ${errMsg}`);
      }
      return;
    }

    await fetchStudents();
    setIsSubmitting(false);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setView('list');
      setEditingStudent(null);
      setFormData(INITIAL_FORM_STATE);
    }, 2000);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this student record?')) {
      await deleteStudentFromSupabase(id);
      setStudents(students.filter(s => s.id !== id));
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      title: student.title || 'Mr.',
      firstName: student.firstName || '',
      middleName: student.middleName || '',
      surname: student.surname || '',
      rollNumber: student.rollNumber || '',
      course: student.courseId || '',
      branch: student.branch || '',
      batch: student.batch || '',
      year: student.year || '',
      semester: student.semester || '',
      session: student.session || '',
      phone: student.phone || '',
      email: student.email || '',
      address: student.address || '',
      state: student.state || '',
      pincode: student.pincode || '',
      permanentAddress: student.permanentAddress || '',
      permanentState: student.permanentState || '',
      permanentPincode: student.permanentPincode || '',
      transportMode: student.transportMode || 'Private/Self',
      vehicleNumber: student.vehicleNumber || '',
      routeName: student.routeName || '',
      isHosteller: student.isHosteller || false,
      hostelName: student.hostelName || '',
      roomNumber: student.roomNumber || '',
      bloodGroup: student.bloodGroup || '',
      religion: student.religion || '',
      caste: student.caste || '',
      category: student.category || '',
      fatherName: student.fatherName || '',
      fatherOccupation: student.fatherOccupation || '',
      motherName: student.motherName || '',
      motherOccupation: student.motherOccupation || '',
      parentPhone: student.parentPhone || '',
      parentEmail: student.parentEmail || '',
      emergencyName: student.emergencyName || '',
      emergencyAddress: student.emergencyAddress || '',
      emergencyPhone: student.emergencyPhone || '',
      allergy: student.allergy || '',
      photoUrl: student.photoUrl || '',
      studentDocsUrl: student.studentDocsUrl || '',
      parentDocsUrl: student.parentDocsUrl || '',
      signatureUrl: student.signatureUrl || '',
    });
    setGeneratedId(student.id);
    setView('register');
  };

  const handleExportPDF = () => {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Branch', 'Year', 'Status'];
    const data = students.map(s => [s.id, s.name, s.email, s.phone, s.branch, s.year, s.status]);
    exportToPDF('Student List', headers, data, 'Student_List');
  };

  const handleExportExcel = () => {
    exportToExcel(students, 'Student_List');
  };

  const handleViewDocument = (dataUrl: string) => {
    if (!dataUrl) return;
    try {
      if (dataUrl.startsWith('data:')) {
        const parts = dataUrl.split(';base64,');
        if (parts.length < 2) return;
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([uInt8Array], { type: contentType });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        window.open(dataUrl, '_blank');
      }
    } catch (e) {
      console.error('Error opening document:', e);
      alert('Could not open document. It might be corrupted or in an invalid format.');
    }
  };

  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-700">{value || '-'}</p>
    </div>
  );

  const DocCard = ({ title, url, onView, isImage }: { title: string; url?: string; onView: () => void; isImage?: boolean }) => (
    <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 flex flex-col items-center gap-4 text-center">
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center",
        url ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
      )}>
        {url ? <CheckCircle2 className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
      </div>
      <div>
        <p className="text-sm font-black text-slate-800 mb-1">{title}</p>
        <p className={cn("text-[10px] font-bold", url ? "text-green-600" : "text-slate-400")}>
          {url ? 'Document Verified' : 'No Document Found'}
        </p>
      </div>
      {url && (
        <button 
          onClick={onView}
          className="w-full py-3 bg-white border border-slate-200 text-primary rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all shadow-sm"
        >
          View {isImage ? 'Signature' : 'Document'}
        </button>
      )}
    </div>
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
          <h1 className="text-3xl font-bold text-primary tracking-tight">Student Management</h1>
          <p className="text-slate-500">Manage student records and registrations.</p>
        </div>
        <div className="flex items-center gap-3">
          {view === 'list' ? (
            <button 
              onClick={() => setView('register')}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <UserPlus className="w-5 h-5" />
              Register Student
            </button>
          ) : (
            <button 
              onClick={() => setView('list')}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-primary/10 text-slate-600 rounded-xl font-bold hover:bg-background transition-all shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to List
            </button>
          )}
        </div>
      </div>

      {view === 'list' ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-primary/10 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search students by name, ID or email..." 
                className="w-full pl-12 pr-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-3 bg-background text-slate-600 rounded-xl text-sm font-bold hover:bg-primary/5 transition-all">
                <Filter className="w-4 h-4" />
                Filters
              </button>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-4 py-3 bg-background text-slate-600 rounded-xl text-sm font-bold hover:bg-primary/5 transition-all"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
                <button 
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-4 py-3 bg-background text-slate-600 rounded-xl text-sm font-bold hover:bg-primary/5 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Excel
                </button>
              </div>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-primary/5 border-b border-primary/10">
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-wider">Student</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-wider">Roll No</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-wider">Branch & Year</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.filter(s => 
                    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (s.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (s.rollNumber && s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()))
                  ).map((student) => (
                    <tr key={student.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
                            {(student.name || '').charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-primary">{student.name}</p>
                            <p className="text-xs text-slate-500">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                          {student.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-indigo-600">
                          {student.rollNumber || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-bold text-slate-700">{student.courseName || student.branch}</p>
                          <p className="text-xs text-slate-500">{student.year} • {student.batch}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Phone className="w-3 h-3" />
                            {student.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          student.status === 'Active' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setViewingStudent(student)}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                            title="View Details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEdit(student)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(student.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl border border-primary/10 shadow-xl overflow-hidden"
        >
          <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-12">
            {/* Section: Personal Information */}
            <div className="space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-primary/10">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-primary">Personal Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Title</label>
                  <select 
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option>Mr.</option>
                    <option>Ms.</option>
                    <option>Mrs.</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                  <input 
                    type="text" 
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Middle Name</label>
                  <input 
                    type="text" 
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleInputChange}
                    placeholder="Enter middle name"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Surname</label>
                  <input 
                    type="text" 
                    name="surname"
                    required
                    value={formData.surname}
                    onChange={handleInputChange}
                    placeholder="Enter surname"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student ID (Auto)</label>
                  <input 
                    type="text" 
                    readOnly
                    value={generatedId}
                    className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm font-mono font-bold text-primary outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Roll Number</label>
                  <input 
                    type="text" 
                    name="rollNumber"
                    required
                    value={formData.rollNumber}
                    onChange={handleInputChange}
                    placeholder="Enter roll number"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Session</label>
                  <select 
                    name="session"
                    required
                    value={formData.session}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Select Session</option>
                    {(academicSettings.sessions || []).map((s: string) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course</label>
                  <select 
                    name="course"
                    required
                    value={formData.course}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Select Course</option>
                    {courses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch</label>
                  <select 
                    name="branch"
                    required
                    value={formData.branch}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Select Branch</option>
                    {academicSettings.branches.map((b: string) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Batch</label>
                  <select 
                    name="batch"
                    required
                    value={formData.batch}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Select Batch</option>
                    {academicSettings.batches.map((b: string) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Year</label>
                  <select 
                    name="year"
                    required
                    value={formData.year}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Select Year</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semester</label>
                  <select 
                    name="semester"
                    required
                    value={formData.semester}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Select Semester</option>
                    {[1,2,3,4,5,6,7,8].map(s => (
                      <option key={s} value={s.toString()}>{s}{s === 1 ? 'st' : s === 2 ? 'nd' : s === 3 ? 'rd' : 'th'} Semester</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="tel" 
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full pl-11 pr-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="email" 
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="student@example.com"
                      className="w-full pl-11 pr-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Blood Group</label>
                  <select 
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Select Blood Group</option>
                    <option>A+</option>
                    <option>A-</option>
                    <option>B+</option>
                    <option>B-</option>
                    <option>O+</option>
                    <option>O-</option>
                    <option>AB+</option>
                    <option>AB-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Religion</label>
                  <select 
                    name="religion"
                    value={formData.religion}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Select Religion</option>
                    {academicSettings.religions.map((r: string) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Caste</label>
                  <select 
                    name="caste"
                    value={formData.caste}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Select Caste</option>
                    {academicSettings.castes.map((c: string) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                  <select 
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Select Category</option>
                    <option>General</option>
                    <option>OBC</option>
                    <option>SC</option>
                    <option>ST</option>
                    <option>EWS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Residential Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
                    <textarea 
                      name="address"
                      required
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter full address"
                      rows={3}
                      className="w-full pl-11 pr-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">State</label>
                    <select 
                      name="state"
                      required
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      <option value="">Select State</option>
                      {indianStates.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pincode</label>
                    <input 
                      type="text" 
                      name="pincode"
                      required
                      value={formData.pincode}
                      onChange={handleInputChange}
                      placeholder="XXXXXX"
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Permanent Address</label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              permanentAddress: prev.address,
                              permanentState: prev.state,
                              permanentPincode: prev.pincode
                            }));
                          }
                        }}
                        className="rounded text-primary focus:ring-primary/20" 
                      />
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-primary uppercase tracking-widest transition-colors">Same as residential</span>
                    </label>
                  </div>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
                    <textarea 
                      name="permanentAddress"
                      required
                      value={formData.permanentAddress}
                      onChange={handleInputChange}
                      placeholder="Enter permanent address"
                      rows={3}
                      className="w-full pl-11 pr-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">State</label>
                    <select 
                      name="permanentState"
                      required
                      value={formData.permanentState}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      <option value="">Select State</option>
                      {indianStates.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pincode</label>
                    <input 
                      type="text" 
                      name="permanentPincode"
                      required
                      value={formData.permanentPincode}
                      onChange={handleInputChange}
                      placeholder="XXXXXX"
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Transport & Hostel Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                      <Truck className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-slate-700">Transport Details</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transport Mode</label>
                      <select 
                        name="transportMode"
                        value={formData.transportMode}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      >
                        <option value="Private/Self">Private/Self</option>
                        <option value="College Bus">College Bus</option>
                        <option value="Public Transport">Public Transport</option>
                      </select>
                    </div>
                    {formData.transportMode === 'College Bus' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Route Name</label>
                          <input 
                            type="text" 
                            name="routeName"
                            value={formData.routeName}
                            onChange={handleInputChange}
                            placeholder="e.g. Route 01"
                            className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle No</label>
                          <input 
                            type="text" 
                            name="vehicleNumber"
                            value={formData.vehicleNumber}
                            onChange={handleInputChange}
                            placeholder="e.g. MH12AB1234"
                            className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-slate-700">Hostel Details</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center gap-2 py-2">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          name="isHosteller"
                          checked={formData.isHosteller}
                          onChange={(e) => setFormData(prev => ({ ...prev, isHosteller: e.target.checked }))}
                          className="rounded text-primary focus:ring-primary/20" 
                        />
                        <span className="text-sm font-bold text-slate-600 group-hover:text-primary transition-colors">Accommodation Required (Hosteller)</span>
                      </label>
                    </div>
                    {formData.isHosteller && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hostel Name</label>
                          <input 
                            type="text" 
                            name="hostelName"
                            value={formData.hostelName}
                            onChange={handleInputChange}
                            placeholder="e.g. Tagore Hall"
                            className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Room No</label>
                          <input 
                            type="text" 
                            name="roomNumber"
                            value={formData.roomNumber}
                            onChange={handleInputChange}
                            placeholder="e.g. 101-A"
                            className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upload Student Photo</label>
                <div className="flex items-center gap-6">
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
                            setFormData(prev => ({ ...prev, photoUrl: event.target?.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className="w-32 h-32 bg-background border-2 border-dashed border-primary/20 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-primary/40 hover:text-primary transition-all cursor-pointer group overflow-hidden"
                  >
                    {formData.photoUrl ? (
                      <img src={formData.photoUrl} alt="Student" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold">Upload Photo</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p className="font-bold text-primary">Requirements:</p>
                    <p>• Passport size photo (3.5 x 4.5 cm)</p>
                    <p>• JPG, PNG format only</p>
                    <p>• Max size: 2MB</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Family Details */}
            <div className="space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-primary/10">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Heart className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-primary">Family Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    Father's Information
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Father's Name</label>
                      <input 
                        type="text" 
                        name="fatherName"
                        required
                        value={formData.fatherName}
                        onChange={handleInputChange}
                        placeholder="Enter father's name"
                        className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Occupation</label>
                      <input 
                        type="text" 
                        name="fatherOccupation"
                        value={formData.fatherOccupation}
                        onChange={handleInputChange}
                        placeholder="Enter occupation"
                        className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    Mother's Information
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mother's Name</label>
                      <input 
                        type="text" 
                        name="motherName"
                        required
                        value={formData.motherName}
                        onChange={handleInputChange}
                        placeholder="Enter mother's name"
                        className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Occupation</label>
                      <input 
                        type="text" 
                        name="motherOccupation"
                        value={formData.motherOccupation}
                        onChange={handleInputChange}
                        placeholder="Enter occupation"
                        className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parent's Contact Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="tel" 
                      name="parentPhone"
                      required
                      value={formData.parentPhone}
                      onChange={handleInputChange}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full pl-11 pr-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parent's Email ID</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="email" 
                      name="parentEmail"
                      value={formData.parentEmail}
                      onChange={handleInputChange}
                      placeholder="parent@example.com"
                      className="w-full pl-11 pr-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Emergency Contact */}
            <div className="space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-primary/10">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-primary">Emergency Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Name</label>
                  <input 
                    type="text" 
                    name="emergencyName"
                    required
                    value={formData.emergencyName}
                    onChange={handleInputChange}
                    placeholder="Enter contact name"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Emergency Phone</label>
                  <input 
                    type="tel" 
                    name="emergencyPhone"
                    required
                    value={formData.emergencyPhone}
                    onChange={handleInputChange}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Any Allergies / Medical Conditions</label>
                  <input 
                    type="text" 
                    name="allergy"
                    value={formData.allergy}
                    onChange={handleInputChange}
                    placeholder="e.g. Peanuts, Asthma"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Emergency Address</label>
                <input 
                  type="text" 
                  name="emergencyAddress"
                  value={formData.emergencyAddress}
                  onChange={handleInputChange}
                  placeholder="Enter emergency address"
                  className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Section: Document Uploads */}
            <div className="space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-primary/10">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-primary">Document Uploads</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student Documents</label>
                  <div 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.pdf,image/*';
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setFormData(prev => ({ ...prev, studentDocsUrl: event.target?.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className="h-32 bg-background border-2 border-dashed border-primary/20 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-primary/40 hover:text-primary transition-all cursor-pointer group overflow-hidden"
                  >
                    {formData.studentDocsUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                          <span className="text-[10px] font-bold text-green-600">Uploaded</span>
                        </div>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDocument(formData.studentDocsUrl!);
                          }}
                          className="px-4 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-bold hover:bg-primary/20 transition-all"
                        >
                          View Document
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold">Upload (PDF/JPG)</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">Aadhar, Marksheets, etc.</p>
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parent Documents</label>
                  <div 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.pdf,image/*';
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setFormData(prev => ({ ...prev, parentDocsUrl: event.target?.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className="h-32 bg-background border-2 border-dashed border-primary/20 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-primary/40 hover:text-primary transition-all cursor-pointer group overflow-hidden"
                  >
                    {formData.parentDocsUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                          <span className="text-[10px] font-bold text-green-600">Uploaded</span>
                        </div>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDocument(formData.parentDocsUrl!);
                          }}
                          className="px-4 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-bold hover:bg-primary/20 transition-all"
                        >
                          View Document
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold">Upload (PDF/JPG)</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">Parent ID Proofs</p>
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student Signature</label>
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
                            setFormData(prev => ({ ...prev, signatureUrl: event.target?.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className="h-32 bg-background border-2 border-dashed border-primary/20 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-primary/40 hover:text-primary transition-all cursor-pointer group overflow-hidden"
                  >
                    {formData.signatureUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                          <span className="text-[10px] font-bold text-green-600">Uploaded</span>
                        </div>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDocument(formData.signatureUrl!);
                          }}
                          className="px-4 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-bold hover:bg-primary/20 transition-all"
                        >
                          View Signature
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold">Upload Signature</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">Clear image of signature</p>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-12 border-t border-primary/10 flex items-center justify-end gap-4">
              <button 
                type="button"
                onClick={() => setView('list')}
                className="px-8 py-4 text-slate-500 font-bold hover:text-primary transition-colors"
              >
                Cancel
              </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "px-12 py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-3",
                    isSubmitting && "opacity-80 cursor-not-allowed"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {editingStudent ? 'Updating...' : 'Registering...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {editingStudent ? 'Update Student' : 'Complete Registration'}
                    </>
                  )}
                </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 z-50 bg-green-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold">Registration Successful!</p>
              <p className="text-xs text-white/80">Student record has been created.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student Details Modal */}
      <AnimatePresence>
        {viewingStudent && (
          <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-primary font-bold text-2xl shadow-sm overflow-hidden">
                    {viewingStudent.photoUrl ? (
                      <img src={viewingStudent.photoUrl} alt={viewingStudent.name} className="w-full h-full object-cover" />
                    ) : (
                      viewingStudent.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-primary">{viewingStudent.name}</h2>
                    <p className="text-slate-500 font-medium font-mono text-sm">Student ID: {viewingStudent.id} • Roll No: {viewingStudent.rollNumber || 'N/A'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingStudent(null)}
                  className="p-3 hover:bg-white rounded-2xl transition-all"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12">
                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                  {/* Academic Info */}
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-primary/10">
                       <GraduationCap className="w-4 h-4" /> Academic Info
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <DetailRow label="Course" value={viewingStudent.courseName || 'N/A'} />
                      <DetailRow label="Branch" value={viewingStudent.branch} />
                      <DetailRow label="Year / Semester" value={`${viewingStudent.year || '-'} / ${viewingStudent.semester || '-'}`} />
                      <DetailRow label="Batch / Session" value={`${viewingStudent.batch || '-'} / ${viewingStudent.session || '-'}`} />
                    </div>
                  </div>

                  {/* Personal Info */}
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-primary/10">
                       <Users className="w-4 h-4" /> Personal Info
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailRow label="Blood Group" value={viewingStudent.bloodGroup || 'N/A'} />
                      <DetailRow label="Religion" value={viewingStudent.religion || 'N/A'} />
                      <DetailRow label="Caste" value={viewingStudent.caste || 'N/A'} />
                      <DetailRow label="Category" value={viewingStudent.category || 'N/A'} />
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-primary/10">
                       <Phone className="w-4 h-4" /> Contact Info
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <DetailRow label="Phone" value={viewingStudent.phone} />
                      <DetailRow label="Email" value={viewingStudent.email} />
                      <DetailRow label="Residential Address" value={`${viewingStudent.address || ''} ${viewingStudent.state ? ', ' + viewingStudent.state : ''} ${viewingStudent.pincode || ''}`} />
                      <DetailRow label="Permanent Address" value={`${viewingStudent.permanentAddress || ''} ${viewingStudent.permanentState ? ', ' + viewingStudent.permanentState : ''} ${viewingStudent.permanentPincode || ''}`} />
                    </div>
                  </div>

                  {/* Family Info */}
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-primary/10">
                       <Heart className="w-4 h-4" /> Family Info
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <DetailRow label="Father's Name" value={`${viewingStudent.fatherName || '-'} (${viewingStudent.fatherOccupation || 'N/A'})`} />
                      <DetailRow label="Mother's Name" value={`${viewingStudent.motherName || '-'} (${viewingStudent.motherOccupation || 'N/A'})`} />
                      <DetailRow label="Parent Contact" value={`${viewingStudent.parentPhone || '-'} / ${viewingStudent.parentEmail || '-'}`} />
                    </div>
                  </div>

                  {/* Emergency & Health */}
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-primary/10">
                       <AlertTriangle className="w-4 h-4" /> Emergency & Health
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <DetailRow label="Contact Person" value={viewingStudent.emergencyName || 'N/A'} />
                      <DetailRow label="Emergency Phone" value={viewingStudent.emergencyPhone || 'N/A'} />
                      <DetailRow label="Allergies / Notes" value={viewingStudent.allergy || 'None'} />
                    </div>
                  </div>

                  {/* Status Info */}
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-primary/10">
                       <ShieldAlert className="w-4 h-4" /> Status
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold gap-2 w-fit ${
                        viewingStudent.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${viewingStudent.status === 'Active' ? 'bg-green-500 animate-pulse' : 'bg-rose-500'}`} />
                        {viewingStudent.status} Student
                      </div>
                    </div>
                  </div>

                  {/* Transport & Hostel */}
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-primary/10">
                       <Truck className="w-4 h-4" /> Transport & Hostel
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <DetailRow label="Transport Mode" value={viewingStudent.transportMode || 'Private'} />
                      {viewingStudent.transportMode === 'College Bus' && (
                        <>
                          <DetailRow label="Route" value={viewingStudent.routeName || '-'} />
                          <DetailRow label="Vehicle No" value={viewingStudent.vehicleNumber || '-'} />
                        </>
                      )}
                      <DetailRow label="Hosteller" value={viewingStudent.isHosteller ? 'Yes' : 'No'} />
                      {viewingStudent.isHosteller && (
                        <>
                          <DetailRow label="Hostel" value={viewingStudent.hostelName || '-'} />
                          <DetailRow label="Room No" value={viewingStudent.roomNumber || '-'} />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Documents Section */}
                <div className="space-y-6 pt-8 border-t border-slate-100">
                  <h3 className="text-sm font-black text-primary uppercase tracking-widest">Uploaded Documents</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <DocCard 
                      title="Student Documents" 
                      url={viewingStudent.studentDocsUrl} 
                      onView={() => handleViewDocument(viewingStudent.studentDocsUrl!)} 
                    />
                    <DocCard 
                      title="Parent Documents" 
                      url={viewingStudent.parentDocsUrl} 
                      onView={() => handleViewDocument(viewingStudent.parentDocsUrl!)} 
                    />
                    <DocCard 
                      title="Signature" 
                      url={viewingStudent.signatureUrl} 
                      onView={() => handleViewDocument(viewingStudent.signatureUrl!)} 
                      isImage
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 flex items-center justify-end gap-3 border-t border-slate-100">
                <button 
                  onClick={() => {
                    handleEdit(viewingStudent);
                    setViewingStudent(null);
                  }}
                  className="px-6 py-3 bg-white border border-primary/10 text-primary rounded-2xl font-bold hover:bg-primary/5 transition-all shadow-sm flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" /> Edit Profile
                </button>
                <button 
                  onClick={() => setViewingStudent(null)}
                  className="px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
