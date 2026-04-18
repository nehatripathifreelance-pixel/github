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
  Upload,
  CheckCircle2,
  ChevronLeft,
  Camera,
  FileText,
  ShieldAlert,
  Heart,
  Briefcase,
  Edit2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, safeLocalStorageSet } from '../../lib/utils';
import { supabase, testSupabaseConnection } from '../../lib/supabase';

interface FacultyMember {
  id: string;
  title?: string;
  firstName?: string;
  middleName?: string;
  surname?: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  batch?: string;
  joiningYear?: string;
  designation: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  photoUrl?: string;
  staffDocsUrl?: string;
  nomineeDocsUrl?: string;
  signatureUrl?: string;
  bankName?: string;
  ifscCode?: string;
  accountNumber?: string;
  bankBranch?: string;
  address?: string;
  state?: string;
  pincode?: string;
  permanentAddress?: string;
  permanentState?: string;
  permanentPincode?: string;
  transportMode?: string;
  vehicleNumber?: string;
  routeName?: string;
  bloodGroup?: string;
  religion?: string;
  caste?: string;
  category?: string;
  fatherName?: string;
  motherName?: string;
  parentPhone?: string;
  emergencyName?: string;
  emergencyPhone?: string;
}

const MOCK_FACULTY: FacultyMember[] = [
  { id: 'FAC2024001', name: 'Dr. Rajesh Khanna', email: 'rajesh.k@example.com', phone: '+91 98765 43230', branch: 'Computer Science', designation: 'Professor', status: 'Active' },
  { id: 'FAC2024002', name: 'Prof. Sunita Williams', email: 'sunita.w@example.com', phone: '+91 98765 43231', branch: 'Information Technology', designation: 'Assistant Professor', status: 'Active' },
  { id: 'FAC2023045', name: 'Dr. Vikram Sarabhai', email: 'vikram.s@example.com', phone: '+91 98765 43232', branch: 'Mechanical Engineering', designation: 'Head of Department', status: 'On Leave' },
];

export const Faculty: React.FC = () => {
  const [view, setView] = useState<'list' | 'register'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [facultyList, setFacultyList] = useState<FacultyMember[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message?: string; details?: string }>({ connected: true });
  const [editingStaff, setEditingStaff] = useState<FacultyMember | null>(null);

  const [academicSettings, setAcademicSettings] = useState<any>({
    castes: ['General', 'OBC', 'SC', 'ST', 'EWS'],
    religions: ['Hinduism', 'Islam', 'Christianity', 'Sikhism', 'Buddhism', 'Jainism'],
    branches: ['Computer Science', 'Information Technology', 'Mechanical Engineering', 'Administration']
  });

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ].sort();

  useEffect(() => {
    checkConnection();
    fetchAcademicSettings();
    fetchFaculty();
  }, []);

  const checkConnection = async () => {
    const result = await testSupabaseConnection();
    setDbStatus(result);
  };

  const fetchAcademicSettings = async () => {
    const { data, error } = await supabase.from('app_settings').select('*').eq('key', 'academic').single();
    if (error) {
      console.warn('Error fetching academic settings, using defaults:', error);
      return;
    }
    if (data && data.value) {
      setAcademicSettings((prev: any) => ({
        ...prev,
        ...data.value
      }));
    }
  };

  const fetchFaculty = async () => {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching faculty:', error);
      const saved = localStorage.getItem('edu_nexus_faculty');
      setFacultyList(saved ? JSON.parse(saved) : MOCK_FACULTY);
    } else if (data) {
      if (data.length > 0) {
        setAvailableColumns(Object.keys(data[0]));
      }
      const formattedFaculty: FacultyMember[] = data.map(f => ({
        id: f.id,
        title: f.title,
        firstName: f.first_name,
        middleName: f.middle_name,
        surname: f.surname,
        name: f.name,
        email: f.email || '',
        phone: f.phone || '',
        branch: f.branch || '',
        batch: f.batch || '',
        joiningYear: f.joining_year,
        designation: f.designation || '',
        status: f.status as 'Active' | 'On Leave' | 'Inactive',
        photoUrl: f.photo_url,
        staffDocsUrl: (f.staff_documents && f.staff_documents[0]) || f.staff_docs_url || '',
        nomineeDocsUrl: (f.nominee_documents && f.nominee_documents[0]) || f.nominee_docs_url || '',
        signatureUrl: f.signature_url,
        bankName: f.bank_name,
        ifscCode: f.ifsc_code,
        accountNumber: f.account_number,
        bankBranch: f.branch_name,
        address: f.address,
        state: f.state,
        pincode: f.pincode,
        permanentAddress: f.permanent_address,
        permanentState: f.permanent_state,
        permanentPincode: f.permanent_pincode,
        transportMode: f.transport_mode,
        vehicleNumber: f.vehicle_number,
        routeName: f.route_name,
        bloodGroup: f.blood_group,
        religion: f.religion,
        caste: f.caste,
        category: f.category,
        fatherName: f.father_name,
        motherName: f.mother_name,
        parentPhone: f.parent_phone,
        emergencyName: f.emergency_contact_name,
        emergencyPhone: f.emergency_phone
      }));
      setFacultyList(formattedFaculty);
      safeLocalStorageSet('edu_nexus_faculty', formattedFaculty);
    }
  };

  const addFacultyToSupabase = async (formData: any, generatedId: string) => {
    const staffData: any = {
      id: generatedId,
      name: `${formData.title} ${formData.firstName} ${formData.surname}`,
      first_name: formData.firstName,
      middle_name: formData.middleName,
      surname: formData.surname,
      email: formData.email,
      phone: formData.phone,
      branch: formData.branch,
      batch: formData.batch,
      joining_year: formData.joiningYear,
      designation: formData.designation || 'Staff',
      status: formData.status || 'Active',
      photo_url: formData.photoUrl,
      address: formData.address,
      state: formData.state,
      pincode: formData.pincode,
      permanent_address: formData.permanentAddress,
      permanent_state: formData.permanentState,
      permanent_pincode: formData.permanentPincode,
      transport_mode: formData.transportMode,
      vehicle_number: formData.vehicleNumber,
      route_name: formData.routeName,
      blood_group: formData.bloodGroup,
      religion: formData.religion,
      caste: formData.caste,
      category: formData.category,
      father_name: formData.fatherName,
      father_occupation: formData.fatherOccupation,
      mother_name: formData.motherName,
      mother_occupation: formData.motherOccupation,
      parent_phone: formData.parentPhone,
      parent_email: formData.parentEmail,
      emergency_phone: formData.emergencyPhone,
      emergency_address: formData.emergencyAddress,
      bank_name: formData.bankName,
      ifsc_code: formData.ifscCode,
      account_number: formData.accountNumber,
      branch_name: formData.bankBranch,
      allergies: formData.allergy,
      staff_documents: formData.staffDocsUrl ? [formData.staffDocsUrl] : null,
      nominee_documents: formData.nomineeDocsUrl ? [formData.nomineeDocsUrl] : null,
      signature_url: formData.signatureUrl,
      role: 'FACULTY'
    };

    // Dynamically check columns
    const hasFetchedColumns = availableColumns.length > 0;
    if (!hasFetchedColumns || availableColumns.includes('emergency_contact_name')) {
      staffData.emergency_contact_name = formData.emergencyName;
    }

    let error;
    if (editingStaff) {
      const { error: err } = await supabase
        .from('staff')
        .update(staffData)
        .eq('id', editingStaff.id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from('staff')
        .insert([staffData]);
      error = err;
    }

    if (error) {
      console.error('Error saving faculty to Supabase:', error);
      return { success: false, error };
    }
    return { success: true };
  };

  const deleteFacultyFromSupabase = async (id: string) => {
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) console.error('Error deleting faculty from Supabase:', error);
  };

  // Registration Form State
  const INITIAL_FORM_STATE = {
    title: 'Mr.',
    firstName: '',
    middleName: '',
    surname: '',
    branch: '',
    batch: '', 
    joiningYear: '', 
    phone: '',
    email: '',
    address: '',
    state: '',
    pincode: '',
    permanentAddress: '',
    permanentState: '',
    permanentPincode: '',
    transportMode: 'Private',
    vehicleNumber: '',
    routeName: '',
    bloodGroup: '',
    religion: '',
    caste: '',
    category: '',
    fatherName: '',
    fatherOccupation: '',
    motherName: '',
    motherOccupation: '',
    parentPhone: '',
    parentEmail: '',
    emergencyName: '',
    emergencyAddress: '',
    emergencyPhone: '',
    bankName: '',
    ifscCode: '',
    accountNumber: '',
    bankBranch: '',
    allergy: '',
    photoUrl: '',
    staffDocsUrl: '',
    nomineeDocsUrl: '',
    signatureUrl: '',
  };

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  const [generatedId, setGeneratedId] = useState('');

  useEffect(() => {
    if (view === 'register' && !editingStaff) {
      const year = new Date().getFullYear();
      const random = Math.floor(1000 + Math.random() * 9000);
      setGeneratedId(`FAC${year}${random}`);
    }
  }, [view, editingStaff]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validate required fields
    if (!formData.firstName || !formData.phone || !formData.email) {
      alert('Please fill in all required fields (Name, Phone, Email)');
      setIsSubmitting(false);
      return;
    }

    const result = await addFacultyToSupabase(formData, generatedId);

    if (result.success && !editingStaff) {
      // Create User Credentials for Login only for new staff
      await supabase.from('user_credentials').upsert({
        id: generatedId,
        password: '12345',
        role: 'FACULTY',
        name: `${formData.firstName} ${formData.surname}`,
        email: formData.email
      });
    }

    if (!result.success) {
      console.error('Staff save error details:', result.error);
      setIsSubmitting(false);
      alert(`Failed to save staff: ${result.error?.message || 'Unknown error'}`);
      return;
    }

    await fetchFaculty();
    setIsSubmitting(false);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setView('list');
      setEditingStaff(null);
      setFormData(INITIAL_FORM_STATE);
    }, 2000);
  };

  const handleEdit = async (staff: FacultyMember) => {
    // Fetch full data for editing
    const { data, error } = await supabase.from('staff').select('*').eq('id', staff.id).single();
    if (error) {
      alert('Error fetching full staff details: ' + error.message);
      return;
    }

    if (data) {
      const nameParts = data.name.split(' ');
      const title = nameParts[0];
      const firstName = nameParts[1] || '';
      const surname = nameParts.slice(2).join(' ') || '';

      setFormData({
        title,
        firstName,
        middleName: data.middle_name || '',
        surname,
        branch: data.branch || '',
        batch: data.batch || '', 
        joiningYear: data.joining_year || '',  
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        state: data.state || '',
        pincode: data.pincode || '',
        permanentAddress: data.permanent_address || '',
        permanentState: data.permanent_state || '',
        permanentPincode: data.permanent_pincode || '',
        transportMode: data.transport_mode || 'Private',
        vehicleNumber: data.vehicle_number || '',
        routeName: data.route_name || '',
        bloodGroup: data.blood_group || '',
        religion: data.religion || '',
        caste: data.caste || '',
        category: data.category || '',
        fatherName: data.father_name || '',
        fatherOccupation: data.father_occupation || '',
        motherName: data.mother_name || '',
        motherOccupation: data.mother_occupation || '',
        parentPhone: data.parent_phone || '',
        parentEmail: data.parent_email || '',
        emergencyName: data.emergency_contact_name || '',
        emergencyAddress: data.emergency_address || '',
        emergencyPhone: data.emergency_phone || '',
        bankName: data.bank_name || '',
        ifscCode: data.ifsc_code || '',
        accountNumber: data.account_number || '',
        bankBranch: data.branch_name || '',
        allergy: data.allergies || '',
        photoUrl: data.photo_url || '',
        staffDocsUrl: (data.staff_documents && data.staff_documents[0]) || '',
        nomineeDocsUrl: (data.nominee_documents && data.nominee_documents[0]) || '',
        signatureUrl: data.signature_url || '',
      });
      setGeneratedId(data.id);
      setEditingStaff(staff);
      setView('register');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      await deleteFacultyFromSupabase(id);
      const newList = facultyList.filter(f => f.id !== id);
      setFacultyList(newList);
      safeLocalStorageSet('edu_nexus_faculty', newList);
    }
  };

  const filteredFaculty = facultyList.filter(staff => 
    (staff.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (staff.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (staff.branch || '').toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1 className="text-3xl font-bold text-primary tracking-tight">Faculty & Staff Management</h1>
          <p className="text-slate-500">Manage staff records and new faculty registrations.</p>
        </div>
        <div className="flex items-center gap-3">
          {view === 'list' ? (
            <button 
              onClick={() => setView('register')}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <UserPlus className="w-5 h-5" />
              Add Staff Member
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
                placeholder="Search staff by name, ID or department..." 
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
              <button className="flex items-center gap-2 px-4 py-3 bg-background text-slate-600 rounded-xl text-sm font-bold hover:bg-primary/5 transition-all">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Faculty Table */}
          <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-primary/5 border-b border-primary/10">
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-wider">Staff Member</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-wider">Staff ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-wider">Branch & Designation</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFaculty.map((staff) => (
                    <tr key={staff.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
                            {(staff.name || '').charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-primary">{staff.name}</p>
                            <p className="text-xs text-slate-500">{staff.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                          {staff.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-bold text-slate-700">{staff.branch}</p>
                          <p className="text-xs text-slate-500">{staff.designation}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3" />
                            {staff.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          staff.status === 'Active' ? "bg-green-100 text-green-700" : 
                          staff.status === 'On Leave' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {staff.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(staff)}
                            className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(staff.id)}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
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
                  <Briefcase className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-primary">Staff Personal Information</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    <option>Dr.</option>
                    <option>Prof.</option>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Staff ID (Auto)</label>
                  <input 
                    type="text" 
                    readOnly
                    value={generatedId}
                    className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm font-mono font-bold text-primary outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch / Dept</label>
                  <select 
                    name="branch"
                    required
                    value={formData.branch}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Select Branch</option>
                    {(academicSettings.branches || []).map((b: string) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Batch (Optional)</label>
                  <input 
                    type="text" 
                    name="batch"
                    value={formData.batch}
                    onChange={handleInputChange}
                    placeholder="Enter batch if applicable"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Year of Joining</label>
                  <input 
                    type="text" 
                    name="joiningYear"
                    value={formData.joiningYear}
                    onChange={handleInputChange}
                    placeholder="YYYY"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      placeholder="staff@example.com"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Permanent Address</label>
                  <div className="flex flex-col gap-4">
                    <button 
                      type="button"
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        permanentAddress: prev.address,
                        permanentState: prev.state,
                        permanentPincode: prev.pincode
                      }))}
                      className="text-[10px] w-fit font-bold text-primary hover:underline"
                    >
                      Same as residential
                    </button>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
                      <textarea 
                        name="permanentAddress"
                        value={formData.permanentAddress}
                        onChange={handleInputChange}
                        placeholder="Enter full address"
                        rows={3}
                        className="w-full pl-11 pr-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">State</label>
                    <select 
                      name="permanentState"
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
                      value={formData.permanentPincode}
                      onChange={handleInputChange}
                      placeholder="XXXXXX"
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Transport Details */}
              <div className="space-y-4 pt-4 border-t border-primary/5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transport Details</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transport Mode</label>
                    <select 
                      name="transportMode"
                      value={formData.transportMode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      <option value="Private">Private/Self</option>
                      <option value="College Bus">College Bus</option>
                      <option value="Public Transport">Public Transport</option>
                    </select>
                  </div>
                  {formData.transportMode === 'College Bus' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Route Name</label>
                        <input 
                          type="text" 
                          name="routeName"
                          value={formData.routeName}
                          onChange={handleInputChange}
                          placeholder="Enter route name"
                          className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bus Number</label>
                        <input 
                          type="text" 
                          name="vehicleNumber"
                          value={formData.vehicleNumber}
                          onChange={handleInputChange}
                          placeholder="Enter bus number"
                          className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upload Staff Photo</label>
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
                      <img src={formData.photoUrl} alt="Staff" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold">Upload Photo</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p className="font-bold text-primary">Requirements:</p>
                    <p>• Official passport size photo</p>
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bank Name</label>
                  <input 
                    type="text" 
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    placeholder="Enter bank name"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">IFSC Code</label>
                  <input 
                    type="text" 
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    placeholder="Enter IFSC code"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Number</label>
                  <input 
                    type="text" 
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    placeholder="Enter account number"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bank Branch Name</label>
                  <input 
                    type="text" 
                    name="bankBranch"
                    value={formData.bankBranch}
                    onChange={handleInputChange}
                    placeholder="Enter branch name"
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Staff Documents</label>
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
                            setFormData(prev => ({ ...prev, staffDocsUrl: event.target?.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className="h-32 bg-background border-2 border-dashed border-primary/20 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-primary/40 hover:text-primary transition-all cursor-pointer group overflow-hidden"
                  >
                    {formData.staffDocsUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                        <span className="text-[10px] font-bold text-green-600">Uploaded</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold">Upload (PDF/JPG)</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">ID Proofs, Experience Certs</p>
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parent/Nominee Documents</label>
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
                            setFormData(prev => ({ ...prev, nomineeDocsUrl: event.target?.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className="h-32 bg-background border-2 border-dashed border-primary/20 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-primary/40 hover:text-primary transition-all cursor-pointer group overflow-hidden"
                  >
                    {formData.nomineeDocsUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                        <span className="text-[10px] font-bold text-green-600">Uploaded</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold">Upload (PDF/JPG)</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">Nominee ID Proofs</p>
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Staff Signature</label>
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
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                        <span className="text-[10px] font-bold text-green-600">Uploaded</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold">Upload Signature</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">Clear image of signature, bank cheque.</p>
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
                    Registering...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Complete Registration
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
              <p className="font-bold">Staff Registered Successfully!</p>
              <p className="text-xs text-white/80">Faculty record has been created.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
