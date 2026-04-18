import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Calendar, 
  Award, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  ChevronRight,
  Receipt,
  X,
  ArrowRight,
  Clock
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface ChildProgress {
  student: any;
  attendance: number;
  attendanceHistory: any[];
  results: any[];
  pendingFees: number;
  feesHistory: any[];
  upcomingExams: any[];
}

export const ParentPanel: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [childProgress, setChildProgress] = useState<ChildProgress | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'results' | 'fees'>('overview');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<any>(null);

  useEffect(() => {
    fetchChildProgress();
  }, [user]);

  const fetchChildProgress = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 1. Find the student linked to this parent
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .or(`parent_email.eq.${user.email},parent_phone.eq.${user.email}`)
        .maybeSingle();

      if (student) {
        // 2. Fetch Attendance
        const { data: attendance } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', student.id)
          .order('date', { ascending: false });

        // 3. Fetch Results
        const { data: results } = await supabase
          .from('results')
          .select('*, exams(title, date)')
          .eq('student_id', student.id)
          .order('created_at', { ascending: false });

        // 4. Fetch Fees
        const { data: fees } = await supabase
          .from('fees')
          .select('*')
          .eq('student_id', student.id)
          .order('due_date', { ascending: true });

        // 5. Fetch Upcoming Exams
        const { data: exams } = await supabase
          .from('exams')
          .select('*')
          .eq('course', student.branch) // Using branch as course for now
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true });

        const presentCount = attendance?.filter(a => a.status === 'Present' || a.status === 'PRESENT').length || 0;
        const totalAttendance = attendance?.length || 0;
        const attendancePercentage = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

        const pendingFees = fees?.filter(f => f.status === 'PENDING').reduce((acc, f) => acc + Number(f.amount), 0) || 0;

        setChildProgress({
          student,
          attendance: attendancePercentage,
          attendanceHistory: attendance || [],
          results: results || [],
          pendingFees,
          feesHistory: fees || [],
          upcomingExams: exams || []
        });
      }
    } catch (error) {
      console.error('Error fetching child progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePayment = async (fee: any) => {
    setSelectedFee(fee);
    setIsPaymentModalOpen(true);
  };

  const confirmPayment = async () => {
    if (!selectedFee) return;
    
    try {
      const { error } = await supabase
        .from('fees')
        .update({ 
          status: 'PAID',
          payment_mode: 'Online'
        })
        .eq('id', selectedFee.id);

      if (error) throw error;
      
      setIsPaymentModalOpen(false);
      fetchChildProgress();
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Parent Panel</h1>
          <p className="text-slate-500 text-sm font-medium">Welcome back, {user?.name}. Monitor your child's progress.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all border border-red-100"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        {(['overview', 'attendance', 'results', 'fees'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all capitalize",
              activeTab === tab 
                ? "bg-white text-primary shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : childProgress ? (
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Stats Overview */}
              <div className="lg:col-span-2 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-[32px] border border-primary/10 shadow-sm">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Attendance</p>
                    <p className="text-2xl font-black text-slate-800">{childProgress.attendance}%</p>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-primary/10 shadow-sm">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4">
                      <Award className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Latest Result</p>
                    <p className="text-2xl font-black text-slate-800">
                      {childProgress.results[0]?.marks || 0}/{childProgress.results[0]?.total_marks || 100}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-primary/10 shadow-sm">
                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-4">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Pending Fees</p>
                    <p className="text-2xl font-black text-slate-800">{formatCurrency(childProgress.pendingFees)}</p>
                  </div>
                </div>

                {/* Notifications Section */}
                <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
                  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                    <Bell className="w-6 h-6 text-primary" />
                    Recent Notifications
                  </h3>
                  <div className="space-y-4">
                    {/* Attendance Notifications */}
                    {childProgress.attendanceHistory.slice(0, 2).map((att, i) => (
                      <div key={`att-${i}`} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-l-4 border-blue-500">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">Attendance Update</p>
                          <p className="text-xs text-slate-500">Your child was marked <span className="font-bold text-blue-600">{att.status}</span> on {formatDate(att.date)}</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{formatDate(att.date)}</span>
                      </div>
                    ))}

                    {/* Result Notifications */}
                    {childProgress.results.slice(0, 2).map((res, i) => (
                      <div key={`res-${i}`} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-l-4 border-amber-500">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                          <Award className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">Result Declared</p>
                          <p className="text-xs text-slate-500">Result for <span className="font-bold">{res.exams?.title}</span> has been published. Score: {res.marks}/{res.total_marks}</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{formatDate(res.created_at)}</span>
                      </div>
                    ))}

                    {childProgress.attendanceHistory.length === 0 && childProgress.results.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-slate-400 text-sm">No recent notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-8">
                {/* Upcoming Exams */}
                <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Upcoming Exams
                  </h3>
                  <div className="space-y-4">
                    {childProgress.upcomingExams.length > 0 ? childProgress.upcomingExams.map((exam, i) => (
                      <div key={i} className="p-4 border border-slate-100 rounded-2xl space-y-2">
                        <p className="font-bold text-slate-800 text-sm">{exam.title}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatDate(exam.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {exam.time}
                          </span>
                        </div>
                      </div>
                    )) : (
                      <p className="text-xs text-slate-400 text-center py-4">No upcoming exams</p>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-primary p-8 rounded-[32px] text-white shadow-xl shadow-primary/20">
                  <h3 className="text-lg font-black mb-6">Quick Actions</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setActiveTab('fees')}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-sm font-bold transition-all flex items-center justify-between px-4"
                    >
                      Pay Pending Fees <ChevronRight className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setActiveTab('attendance')}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-sm font-bold transition-all flex items-center justify-between px-4"
                    >
                      View Full Attendance <ChevronRight className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setActiveTab('results')}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-sm font-bold transition-all flex items-center justify-between px-4"
                    >
                      View All Results <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 mb-6">Attendance History</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-slate-100">
                      <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Subject</th>
                      <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {childProgress.attendanceHistory.map((att, i) => (
                      <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 text-sm font-bold text-slate-800">{formatDate(att.date)}</td>
                        <td className="py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            (att.status === 'Present' || att.status === 'PRESENT') ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                          )}>
                            {att.status}
                          </span>
                        </td>
                        <td className="py-4 text-sm text-slate-600">{att.subject || 'N/A'}</td>
                        <td className="py-4 text-sm text-slate-500">{att.time || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 mb-6">Exam Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {childProgress.results.map((res, i) => (
                  <div key={i} className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-primary uppercase tracking-widest">{res.exams?.date ? formatDate(res.exams.date) : 'N/A'}</p>
                        <h4 className="font-black text-slate-800">{res.exams?.title || 'Unknown Exam'}</h4>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-primary">{res.marks}/{res.total_marks}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        res.status === 'PASSED' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                      )}>
                        {res.status}
                      </span>
                      <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                        View Details <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'fees' && (
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
                <h3 className="text-xl font-black text-slate-800 mb-6">Fee Management</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-slate-100">
                        <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Description</th>
                        <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Amount</th>
                        <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Due Date</th>
                        <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {childProgress.feesHistory.map((fee, i) => (
                        <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 text-sm font-bold text-slate-800">{fee.description || 'Fee Payment'}</td>
                          <td className="py-4 text-sm font-black text-slate-900">{formatCurrency(fee.amount)}</td>
                          <td className="py-4 text-sm text-slate-500">{formatDate(fee.due_date)}</td>
                          <td className="py-4">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                              fee.status === 'PAID' ? "bg-green-50 text-green-600" : 
                              fee.status === 'PENDING' ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                            )}>
                              {fee.status}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            {fee.status === 'PENDING' && (
                              <button 
                                onClick={() => handlePayment(fee)}
                                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/10"
                              >
                                Pay Now
                              </button>
                            )}
                            {fee.status === 'PAID' && (
                              <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                                <Receipt className="w-5 h-5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-[32px] border border-primary/10">
          <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">No Child Linked</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2">
            We couldn't find any student records linked to your account ({user?.email}). Please contact the administration.
          </p>
        </div>
      )}

      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Make Payment</h3>
                  <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Amount to Pay</p>
                    <p className="text-3xl font-black text-primary">{formatCurrency(selectedFee?.amount || 0)}</p>
                    <p className="text-sm text-slate-500 mt-2 font-medium">{selectedFee?.description}</p>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-800">Select Payment Method</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button className="p-4 border-2 border-primary bg-primary/5 rounded-2xl text-left transition-all">
                        <CreditCard className="w-6 h-6 text-primary mb-2" />
                        <p className="font-bold text-slate-800 text-sm">Card / UPI</p>
                      </button>
                      <button className="p-4 border-2 border-slate-100 hover:border-primary/20 rounded-2xl text-left transition-all">
                        <Receipt className="w-6 h-6 text-slate-400 mb-2" />
                        <p className="font-bold text-slate-800 text-sm">Net Banking</p>
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={confirmPayment}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                  >
                    Confirm & Pay Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
