import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  MapPin, 
  Shield,
  User,
  Heart,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  BookOpen,
  Calendar,
  Award,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Bell,
  LogOut,
  Receipt,
  ArrowRight,
  X
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, Navigate } from 'react-router-dom';

interface Parent {
  id: string;
  studentName: string;
  studentRoll: string;
  fatherName: string;
  fatherOccupation: string;
  motherName: string;
  motherOccupation: string;
  phone: string;
  email: string;
  address: string;
}

interface ChildProgress {
  student: any;
  attendance: number;
  attendanceHistory: any[];
  results: any[];
  pendingFees: number;
  feesHistory: any[];
  upcomingExams: any[];
}

export const Parents: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [parents, setParents] = useState<Parent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [childProgress, setChildProgress] = useState<ChildProgress | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'results' | 'fees'>('overview');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<any>(null);

  const isParent = user?.role === 'PARENT';

  useEffect(() => {
    if (isParent) {
      fetchChildProgress();
    } else {
      fetchParents();
    }
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
          .eq('course', student.course_id)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true });

        const presentCount = attendance?.filter(a => a.status === 'Present').length || 0;
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

  const fetchParents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, roll_no, father_name, father_occupation, mother_name, mother_occupation, parent_phone, parent_email, residential_address')
        .order('name');

      if (error) {
        console.error('Error fetching parents:', error);
      } else if (data) {
        setParents(data.map(s => ({
          id: s.id,
          studentName: s.name,
          studentRoll: s.roll_no,
          fatherName: s.father_name || 'N/A',
          fatherOccupation: s.father_occupation || 'N/A',
          motherName: s.mother_name || 'N/A',
          motherOccupation: s.mother_occupation || 'N/A',
          phone: s.parent_phone || 'N/A',
          email: s.parent_email || 'N/A',
          address: s.residential_address || 'N/A'
        })));
      }
    } catch (error) {
      console.error('Unexpected error in fetchParents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredParents = parents.filter(p => 
    (p.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.fatherName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.motherName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone.includes(searchQuery)
  );

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

  if (isParent) {
    return <Navigate to="/parent-panel" replace />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Parent Directory</h1>
          <p className="text-slate-500 text-sm font-medium">Manage parent information and communication.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            <MessageSquare className="w-5 h-5" />
            Broadcast Message
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-primary/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search by student or parent name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-background border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-3 bg-background text-slate-600 rounded-2xl text-sm font-bold hover:bg-primary/5 transition-all">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredParents.map((parent, index) => (
            <motion.div
              key={parent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-[32px] border border-primary/10 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all overflow-hidden group"
            >
              <div className="p-6 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 line-clamp-1">{parent.studentName}</h3>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">{parent.studentRoll}</p>
                  </div>
                </div>
                <button className="p-2 text-slate-400 hover:text-primary hover:bg-white rounded-xl transition-all">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <User className="w-3 h-3" /> Father
                    </p>
                    <p className="text-sm font-bold text-slate-800">{parent.fatherName}</p>
                    <p className="text-[10px] text-slate-500">{parent.fatherOccupation}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Heart className="w-3 h-3" /> Mother
                    </p>
                    <p className="text-sm font-bold text-slate-800">{parent.motherName}</p>
                    <p className="text-[10px] text-slate-500">{parent.motherOccupation}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    {parent.phone}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="truncate">{parent.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="truncate">{parent.address}</span>
                  </div>
                </div>

                <div className="pt-4">
                  <button className="w-full py-3 bg-primary/5 text-primary rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                    Contact Parent
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {filteredParents.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800">No Parents Found</h3>
              <p className="text-slate-500 text-sm">No parent records match your current search criteria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

