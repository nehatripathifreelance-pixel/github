import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Printer,
  X,
  User,
  Filter,
  DollarSign,
  Download,
  Calendar,
  Plus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Student {
  id: string;
  name: string;
  roll_no: string;
  course_id: string;
  batch: string;
  courses?: { name: string };
}

interface FeeRecord {
  id: string;
  student_id: string;
  amount: number;
  date: string;
  due_date: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL';
  type: string;
  description: string;
  payment_method?: string;
  transaction_id?: string;
}

export const AccountantPanel: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentFees, setStudentFees] = useState<FeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [stats, setStats] = useState({
    collectedToday: 0,
    pendingTotal: 0,
    collectedMonth: 0
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    type: 'TUITION',
    description: '',
    payment_method: 'CASH',
    transaction_id: ''
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const firstDayMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const { data: todayFees } = await supabase
      .from('fees')
      .select('amount')
      .eq('status', 'PAID')
      .gte('date', today);
    
    const { data: monthFees } = await supabase
      .from('fees')
      .select('amount')
      .eq('status', 'PAID')
      .gte('date', firstDayMonth);

    const { data: pendingFees } = await supabase
      .from('fees')
      .select('amount')
      .in('status', ['PENDING', 'OVERDUE']);

    setStats({
      collectedToday: todayFees?.reduce((acc, f) => acc + (f.amount || 0), 0) || 0,
      collectedMonth: monthFees?.reduce((acc, f) => acc + (f.amount || 0), 0) || 0,
      pendingTotal: pendingFees?.reduce((acc, f) => acc + (f.amount || 0), 0) || 0,
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*, courses(name)')
        .or(`name.ilike.%${searchQuery}%,roll_no.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error searching students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setStudents([]);
    setSearchQuery('');
    fetchStudentFees(student.id);
  };

  const fetchStudentFees = async (studentId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('fees')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      setStudentFees(data || []);
    } catch (error) {
      console.error('Error fetching student fees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollectFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIsSubmitting(true);

    try {
      const feeData = {
        student_id: selectedStudent.id,
        amount: paymentForm.amount,
        final_amount: paymentForm.amount,
        type: paymentForm.type,
        description: paymentForm.description,
        status: 'PAID',
        date: new Date().toISOString().split('T')[0],
        payment_method: paymentForm.payment_method,
        transaction_id: paymentForm.transaction_id,
        due_date: new Date().toISOString().split('T')[0]
      };

      const { data: savedFee, error } = await supabase
        .from('fees')
        .insert(feeData)
        .select()
        .single();

      if (error) throw error;

      // Also record as income
      const { data: category } = await supabase
        .from('income_categories')
        .select('id')
        .eq('name', 'Fee Income')
        .maybeSingle();

      if (category) {
        await supabase.from('income').insert({
          source: 'Student Fee',
          category_id: category.id,
          amount: feeData.amount,
          date: feeData.date,
          description: `Fee Payment: ${feeData.description} - Student: ${selectedStudent.name}`,
          reference_id: savedFee.id,
          payment_method: feeData.payment_method
        });
      }

      alert('Fee collected successfully!');
      setShowPaymentModal(false);
      fetchStudentFees(selectedStudent.id);
      fetchStats();
      setPaymentForm({
        amount: 0,
        type: 'TUITION',
        description: '',
        payment_method: 'CASH',
        transaction_id: ''
      });
    } catch (error) {
      console.error('Error collecting fee:', error);
      alert('Failed to collect fee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const printReceipt = (fee: FeeRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Fee Receipt - ${selectedStudent?.name}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .receipt-title { font-size: 24px; font-weight: 800; color: #4f46e5; margin: 0; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-item { margin-bottom: 10px; }
            .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
            .value { font-size: 16px; font-weight: 600; margin-top: 4px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .table th { background: #f8fafc; padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
            .table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
            .total-row { background: #4f46e5; color: white; }
            .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="receipt-title">FEE RECEIPT</h1>
            <p>Official Payment Confirmation</p>
          </div>
          
          <div class="info-grid">
            <div class="info-item">
              <div class="label">Student Name</div>
              <div class="value">${selectedStudent?.name}</div>
            </div>
            <div class="info-item">
              <div class="label">Roll Number</div>
              <div class="value">${selectedStudent?.roll_no}</div>
            </div>
            <div class="info-item">
              <div class="label">Date</div>
              <div class="value">${formatDate(fee.date)}</div>
            </div>
            <div class="info-item">
              <div class="label">Receipt No</div>
              <div class="value">${fee.id.slice(0, 8).toUpperCase()}</div>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Type</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${fee.description || 'Fees Payment'}</td>
                <td>${fee.type}</td>
                <td>${formatCurrency(fee.amount)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="2" style="text-align: right; font-weight: 800;">TOTAL PAID</td>
                <td style="font-weight: 800;">${formatCurrency(fee.amount)}</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 40px; display: flex; justify-content: space-between;">
            <div>
              <div class="label">Payment Mode</div>
              <div class="value">${fee.payment_method || 'N/A'}</div>
            </div>
            <div style="text-align: right;">
              <div style="width: 150px; height: 60px; border-bottom: 1px solid #e2e8f0; margin-bottom: 10px;"></div>
              <div class="label">Authorized Signatory</div>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your payment. Keep this receipt for your records.</p>
            <p>Computer Generated Receipt - No Physical Signature Required</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Accountant Panel</h1>
          <p className="text-slate-500 font-medium">Manage fee collections and student accounts</p>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Today</p>
            <p className="text-lg font-black text-emerald-600">{formatCurrency(stats.collectedToday)}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">This Month</p>
            <p className="text-lg font-black text-indigo-600">{formatCurrency(stats.collectedMonth)}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending</p>
            <p className="text-lg font-black text-rose-600">{formatCurrency(stats.pendingTotal)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Student Search & Profiles */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text"
                placeholder="Search Student (Name/Roll No)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              <button 
                onClick={handleSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-white rounded-lg"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {students.map((student) => (
                <button
                  key={student.id}
                  onClick={() => selectStudent(student)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold">
                    {student.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors">{student.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Roll: {student.roll_no}</p>
                  </div>
                </button>
              ))}
              {students.length === 0 && searchQuery && !isLoading && (
                <p className="text-center py-4 text-xs text-slate-400 font-medium font-mono italic">No students found</p>
              )}
            </div>
          </div>

          {selectedStudent && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-2xl border-2 border-white">
                  {selectedStudent.name[0]}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 leading-tight">{selectedStudent.name}</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedStudent.courses?.name || 'No Course'}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Roll Number</span>
                  <span className="text-slate-900 font-black">{selectedStudent.roll_no}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Batch</span>
                  <span className="text-slate-900 font-black">{selectedStudent.batch}</span>
                </div>
              </div>
              <button 
                onClick={() => setShowPaymentModal(true)}
                className="w-full mt-6 bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus className="w-5 h-5" />
                Collect New Fee
              </button>
            </motion.div>
          )}
        </div>

        {/* Right Column: Fee History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-black text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment History
              </h2>
              {selectedStudent && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Student Filter Active</span>
                  <button 
                    onClick={() => { setSelectedStudent(null); setStudentFees([]); }}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-12 text-center">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-xs text-slate-400 font-mono italic">Loading records...</p>
                </div>
              ) : studentFees.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <History className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-slate-500 font-medium">Select a student or no records found</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {studentFees.map((fee) => (
                      <tr key={fee.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-bold text-slate-700">{formatDate(fee.date)}</p>
                          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">REF: {fee.id.slice(0, 8)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-600 px-2 py-1 bg-slate-100 rounded-lg">{fee.type}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-black text-slate-900">{formatCurrency(fee.amount)}</p>
                          <p className="text-[10px] text-slate-400 font-medium italic">{fee.payment_method}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            fee.status === 'PAID' ? "bg-emerald-100 text-emerald-600" :
                            fee.status === 'OVERDUE' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                          )}>
                            {fee.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => printReceipt(fee)}
                            className="p-2 hover:bg-primary/5 rounded-xl text-primary transition-all group"
                          >
                            <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Collect Payment</h2>
                    <p className="text-primary font-bold text-[10px] uppercase tracking-widest">FOR: {selectedStudent?.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCollectFee} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="number"
                        required
                        value={paymentForm.amount || ''}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                        className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-none rounded-xl text-lg font-black text-slate-800 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fee Type</label>
                    <select
                      value={paymentForm.type}
                      onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}
                      className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none"
                    >
                      <option value="TUITION">Tuition Fee</option>
                      <option value="ADMISSION">Admission Fee</option>
                      <option value="EXAM">Exam Fee</option>
                      <option value="LIBRARY">Library Fee</option>
                      <option value="OTHER">Other Fee</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['CASH', 'UPI', 'CARD'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentForm({ ...paymentForm, payment_method: m })}
                        className={cn(
                          "py-3 rounded-xl text-xs font-black transition-all border-2",
                          paymentForm.payment_method === m ? "bg-primary border-primary text-white" : "border-slate-100 text-slate-500 hover:border-slate-200"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. 1st Semester Tuition Fee"
                    value={paymentForm.description}
                    onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                    className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction ID (Optional)</label>
                  <input 
                    type="text"
                    placeholder="Ref No / UPI ID"
                    value={paymentForm.transaction_id}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })}
                    className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? "Processing..." : "Confirm & Collect"}
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

// Internal icon for usage
const History = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
);
