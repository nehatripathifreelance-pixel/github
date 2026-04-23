import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Calendar, 
  Trash2, 
  Edit2, 
  X,
  Save,
  MessageSquare,
  AlertCircle,
  Camera,
  UserCheck,
  Clock,
  LogOut,
  MapPin,
  RefreshCw,
  IdCard
} from 'lucide-react';
import Webcam from 'react-webcam';
import { supabase, testSupabaseConnection } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../../lib/utils';

export const FrontOffice: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'enquiries' | 'visitors'>('enquiries');
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState<any>(null);
  const [editingVisitor, setEditingVisitor] = useState<any>(null);
  
  const [enquiryForm, setEnquiryForm] = useState<any>({
    status: 'Pending'
  });

  const [visitorForm, setVisitorForm] = useState<any>({
    name: '',
    phone: '',
    purpose: '',
    person_to_meet: '',
    id_proof_type: 'Aadhaar',
    id_proof_number: '',
    remarks: ''
  });

  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const webcamRef = React.useRef<Webcam>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [dbStatus, setDbStatus] = useState({ connected: true, message: '' });

  useEffect(() => {
    const init = async () => {
      const result = await testSupabaseConnection();
      setDbStatus(result);
      if (result.connected) {
        await fetchEnquiries();
        await fetchVisitors();
      }
    };
    init();
  }, []);

  const fetchVisitors = async () => {
    const { data, error } = await supabase
      .from('visitor_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching visitors:', error);
    } else if (data) {
      setVisitors(data);
    }
  };

  const fetchEnquiries = async () => {
    const { data, error } = await supabase
      .from('enquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching enquiries:', error);
    } else if (data) {
      setEnquiries(data);
    }
  };

  const handleSaveEnquiry = async () => {
    if (!enquiryForm.student_name || !enquiryForm.phone) {
      alert('Student Name and Phone are required');
      return;
    }
    setIsSaving(true);

    const enquiryData: any = {
      student_name: enquiryForm.student_name.trim(),
      parent_name: enquiryForm.parent_name?.trim() || '',
      phone: enquiryForm.phone.trim(),
      status: enquiryForm.status
    };

    try {
      let error;
      if (editingEnquiry) {
        const { error: err } = await supabase
          .from('enquiries')
          .update(enquiryData)
          .eq('id', editingEnquiry.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('enquiries')
          .insert([enquiryData]);
        error = err;
      }

      if (error) throw error;

      setIsModalOpen(false);
      setEditingEnquiry(null);
      setEnquiryForm({ status: 'Pending' });
      await fetchEnquiries();
    } catch (error: any) {
      alert(`Error saving enquiry: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveVisitor = async () => {
    if (!visitorForm.name || !visitorForm.phone) {
      alert('Name and Phone are required');
      return;
    }
    setIsSaving(true);

    const visitorId = capturedPhoto ? `VIS-${Date.now()}` : `VIS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const visitorData: any = {
      visitor_no: editingVisitor?.visitor_no || visitorId,
      name: visitorForm.name.trim(),
      phone: visitorForm.phone.trim(),
      purpose: visitorForm.purpose || '',
      person_to_meet: visitorForm.person_to_meet || '',
      photo_url: capturedPhoto,
      id_proof_type: visitorForm.id_proof_type,
      id_proof_number: visitorForm.id_proof_number,
      remarks: visitorForm.remarks || ''
    };

    try {
      let error;
      if (editingVisitor) {
        const { error: err } = await supabase
          .from('visitor_log')
          .update(visitorData)
          .eq('id', editingVisitor.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('visitor_log')
          .insert([visitorData]);
        error = err;
      }

      if (error) throw error;

      setIsModalOpen(false);
      setEditingVisitor(null);
      setCapturedPhoto(null);
      setVisitorForm({
        name: '',
        phone: '',
        purpose: '',
        person_to_meet: '',
        id_proof_type: 'Aadhaar',
        id_proof_number: '',
        remarks: ''
      });
      await fetchVisitors();
    } catch (error: any) {
      alert(`Error saving visitor: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVisitorCheckOut = async (id: string) => {
    if (window.confirm('Mark visitor as checked out?')) {
      const { error } = await supabase
        .from('visitor_log')
        .update({ out_time: new Date().toISOString() })
        .eq('id', id);
      
      if (error) {
        alert(`Error checking out: ${error.message}`);
      } else {
        await fetchVisitors();
      }
    }
  };

  const deleteEnquiry = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this enquiry?')) {
      const { error } = await supabase.from('enquiries').delete().eq('id', id);
      if (error) alert(`Error deleting enquiry: ${error.message}`);
      else fetchEnquiries();
    }
  };

  const deleteVisitor = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this visitor log?')) {
      const { error } = await supabase.from('visitor_log').delete().eq('id', id);
      if (error) alert(`Error deleting record: ${error.message}`);
      else fetchVisitors();
    }
  };

  const capturePhoto = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedPhoto(imageSrc);
      setIsCameraActive(false);
    }
  };

  const filteredEnquiries = enquiries.filter(e => 
    (e.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.phone || '').includes(searchQuery)
  );

  const filteredVisitors = visitors.filter(v => 
    (v.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.phone || '').includes(searchQuery) ||
    (v.visitor_no || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Database Connection Warning */}
      {!dbStatus.connected && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium">Database connection issue: {dbStatus.message}. Please check your Supabase configuration.</p>
        </motion.div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Front Office</h1>
          <p className="text-slate-500 font-medium mt-1">Manage student enquiries and follow-ups.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (activeTab === 'enquiries') {
                setEditingEnquiry(null);
                setEnquiryForm({ status: 'Pending' });
              } else {
                setEditingVisitor(null);
                setVisitorForm({
                  name: '',
                  phone: '',
                  purpose: '',
                  person_to_meet: '',
                  id_proof_type: 'Aadhaar',
                  id_proof_number: '',
                  remarks: ''
                });
                setCapturedPhoto(null);
              }
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            {activeTab === 'enquiries' ? 'Add Enquiry' : 'Log Visitor'}
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by student name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-2xl">
          <button 
            onClick={() => setActiveTab('enquiries')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'enquiries' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All Enquiries
          </button>
          <button 
            onClick={() => setActiveTab('visitors')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'visitors' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Visitor Log
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        {activeTab === 'enquiries' ? (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Details</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Parent Name</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                        <MessageSquare className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-bold">No enquiries found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEnquiries.map((enquiry) => (
                  <tr key={enquiry.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                          <Users className="w-5 h-5" />
                        </div>
                        <p className="font-bold text-slate-700">{enquiry.student_name}</p>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-medium text-slate-600">{enquiry.parent_name || '-'}</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {enquiry.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        enquiry.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600' :
                        enquiry.status === 'Follow-up' ? 'bg-amber-50 text-amber-600' :
                        'bg-slate-50 text-slate-600'
                      }`}>
                        {enquiry.status}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(enquiry.created_at)}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingEnquiry(enquiry);
                            setEnquiryForm(enquiry);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-white rounded-xl transition-all shadow-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteEnquiry(enquiry.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl transition-all shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Visitor Info</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Purpose / Meeting</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">IN Time</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">OUT Time</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry Photo</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                        <UserCheck className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-bold">No visitors found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVisitors.map((visitor) => (
                  <tr key={visitor.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                          <IdCard className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-700">{visitor.name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{visitor.visitor_no}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold mt-0.5">
                            <Phone className="w-3 h-3" />
                            {visitor.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-slate-700">{visitor.purpose || '-'}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold">
                          <Users className="w-3 h-3 text-primary/60" />
                          To meet: <span className="text-primary">{visitor.person_to_meet || '-'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-medium">{formatDate(visitor.in_time)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {visitor.out_time ? (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-rose-500" />
                          <span className="font-medium">{formatDate(visitor.out_time)}</span>
                        </div>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-black tracking-widest uppercase">
                          Inside
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      {visitor.photo_url ? (
                        <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                          <img 
                            src={visitor.photo_url} 
                            alt={visitor.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center border border-dashed border-slate-200">
                          <Camera className="w-5 h-5 text-slate-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        {!visitor.out_time && (
                          <button 
                            onClick={() => handleVisitorCheckOut(visitor.id)}
                            title="Check Out"
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-sm border border-emerald-100"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setEditingVisitor(visitor);
                            setVisitorForm(visitor);
                            setCapturedPhoto(visitor.photo_url);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-white rounded-xl transition-all shadow-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteVisitor(visitor.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl transition-all shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* General Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden my-auto"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-primary/5">
                <div>
                  <h2 className="text-2xl font-black text-primary">
                    {activeTab === 'enquiries' 
                      ? (editingEnquiry ? 'Edit Enquiry' : 'Add Enquiry')
                      : (editingVisitor ? 'Edit Visitor Record' : 'New Visitor Entry')
                    }
                  </h2>
                  <p className="text-slate-500 text-sm">
                    {activeTab === 'enquiries' 
                      ? 'Log a new student enquiry details below.' 
                      : 'Capture visitor details with a mandatory entry photo.'
                    }
                  </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-8">
                {activeTab === 'enquiries' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</label>
                        <input 
                          type="text" 
                          value={enquiryForm.student_name || ''}
                          onChange={(e) => setEnquiryForm({...enquiryForm, student_name: e.target.value})}
                          placeholder="Enter student name"
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parent Name</label>
                        <input 
                          type="text" 
                          value={enquiryForm.parent_name || ''}
                          onChange={(e) => setEnquiryForm({...enquiryForm, parent_name: e.target.value})}
                          placeholder="Enter parent name"
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                        <input 
                          type="tel" 
                          value={enquiryForm.phone || ''}
                          onChange={(e) => setEnquiryForm({...enquiryForm, phone: e.target.value})}
                          placeholder="Enter contact number"
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                        <select 
                          value={enquiryForm.status || 'Pending'}
                          onChange={(e) => setEnquiryForm({...enquiryForm, status: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Follow-up">Follow-up</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-8">
                      {/* Photo Section */}
                      <div className="w-full md:w-64 space-y-4">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Live Photo</label>
                        <div className="w-full aspect-[4/3] bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200 relative group shadow-inner">
                          {isCameraActive ? (
                            <Webcam
                              audio={false}
                              ref={webcamRef as any}
                              screenshotFormat="image/jpeg"
                              className="w-full h-full object-cover"
                              {...({
                                videoConstraints: { width: 1280, height: 720, facingMode: "user" }
                              } as any)}
                            />
                          ) : capturedPhoto ? (
                            <img src={capturedPhoto} className="w-full h-full object-cover" alt="Visitor" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                              <Camera className="w-8 h-8 opacity-40" />
                              <p className="text-[10px] font-black uppercase">No photo captured</p>
                            </div>
                          )}
                          
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {isCameraActive ? (
                              <button 
                                onClick={capturePhoto}
                                className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg hover:bg-emerald-600 transition-all font-bold text-xs flex items-center gap-1"
                              >
                                <Camera className="w-4 h-4" />
                                Capture
                              </button>
                            ) : (
                              <button 
                                onClick={() => setIsCameraActive(true)}
                                className="p-3 bg-primary text-white rounded-xl shadow-lg hover:bg-primary/90 transition-all font-bold text-xs flex items-center gap-1"
                              >
                                <RefreshCw className="w-4 h-4" />
                                {capturedPhoto ? 'Retake' : 'Start Camera'}
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold text-center">Capture a clear front-facing photo of the visitor.</p>
                      </div>

                      {/* Details Section */}
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Visitor Name</label>
                            <input 
                              type="text" 
                              value={visitorForm.name}
                              onChange={(e) => setVisitorForm({...visitorForm, name: e.target.value})}
                              placeholder="Full Name"
                              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile Number</label>
                            <input 
                              type="tel" 
                              value={visitorForm.phone}
                              onChange={(e) => setVisitorForm({...visitorForm, phone: e.target.value})}
                              placeholder="10-digit number"
                              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Purpose</label>
                            <input 
                              type="text" 
                              value={visitorForm.purpose}
                              onChange={(e) => setVisitorForm({...visitorForm, purpose: e.target.value})}
                              placeholder="e.g. Admission"
                              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Person to Meet</label>
                            <input 
                              type="text" 
                              value={visitorForm.person_to_meet}
                              onChange={(e) => setVisitorForm({...visitorForm, person_to_meet: e.target.value})}
                              placeholder="Name/Dept"
                              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ID Proof Type</label>
                            <select 
                              value={visitorForm.id_proof_type}
                              onChange={(e) => setVisitorForm({...visitorForm, id_proof_type: e.target.value})}
                              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                            >
                              <option value="Aadhaar">Aadhaar Card</option>
                              <option value="Driving License">Driving License</option>
                              <option value="PAN Card">PAN Card</option>
                              <option value="Voter ID">Voter ID</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ID Number</label>
                            <input 
                              type="text" 
                              value={visitorForm.id_proof_number}
                              onChange={(e) => setVisitorForm({...visitorForm, id_proof_number: e.target.value})}
                              placeholder="Last 4 digits or Full"
                              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remarks</label>
                      <textarea 
                        value={visitorForm.remarks}
                        onChange={(e) => setVisitorForm({...visitorForm, remarks: e.target.value})}
                        placeholder="Any additional notes..."
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none resize-none h-20"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50 flex items-center justify-end gap-3 border-t border-slate-100">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-slate-500 font-bold hover:text-primary transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={activeTab === 'enquiries' ? handleSaveEnquiry : handleSaveVisitor}
                  disabled={isSaving || (activeTab === 'visitors' && !capturedPhoto)}
                  className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
                >
                  {isSaving ? (
                    'Processing...'
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {activeTab === 'enquiries' 
                        ? (editingEnquiry ? 'Update Enquiry' : 'Save Enquiry')
                        : (editingVisitor ? 'Update Entry' : 'Check-In Visitor')
                      }
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
