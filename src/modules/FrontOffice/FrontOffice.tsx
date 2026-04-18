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
  AlertCircle
} from 'lucide-react';
import { supabase, testSupabaseConnection } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../../lib/utils';

export const FrontOffice: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'enquiries'>('enquiries');
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState<any>(null);
  const [enquiryForm, setEnquiryForm] = useState<any>({
    status: 'Pending'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [dbStatus, setDbStatus] = useState({ connected: true, message: '' });

  useEffect(() => {
    const init = async () => {
      const result = await testSupabaseConnection();
      setDbStatus(result);
      if (result.connected) {
        await fetchEnquiries();
      }
    };
    init();
  }, []);

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

  const deleteEnquiry = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this enquiry?')) {
      const { error } = await supabase.from('enquiries').delete().eq('id', id);
      if (error) alert(`Error deleting enquiry: ${error.message}`);
      else fetchEnquiries();
    }
  };

  const filteredEnquiries = enquiries.filter(e => 
    (e.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.phone || '').includes(searchQuery)
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
              setEditingEnquiry(null);
              setEnquiryForm({ status: 'Pending' });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            Add Enquiry
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
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
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
                  <td className="px-8 py-5">
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
      </div>

      {/* Enquiry Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-primary/5">
                <div>
                  <h2 className="text-2xl font-black text-primary">{editingEnquiry ? 'Edit Enquiry' : 'Add Enquiry'}</h2>
                  <p className="text-slate-500 text-sm">Log a new student enquiry details below.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-6">
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
              <div className="p-8 bg-slate-50 flex items-center justify-end gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-slate-500 font-bold hover:text-primary transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEnquiry}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
                >
                  {isSaving ? (
                    'Saving...'
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {editingEnquiry ? 'Update Enquiry' : 'Save Enquiry'}
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
