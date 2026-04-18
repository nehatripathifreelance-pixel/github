import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Receipt,
  Wallet,
  MessageSquare,
  Edit2,
  Trash2,
  X,
  Save,
  FileText,
  Printer,
  Share2,
  Smartphone
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import { supabase, testSupabaseConnection } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { exportToPDF, exportToExcel } from '../../lib/exportUtils';

import { sendNotification } from '../../lib/notifications';

import html2canvas from 'html2canvas';

interface FeeTransaction {
  id: string;
  studentId: string;
  student: string;
  roll: string;
  amount: number;
  date: string;
  dueDate: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL';
  type: string;
  feeGroup: string;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ONE_TIME';
  phone: string;
  parentPhone: string;
  fine: number;
  discount: number;
  discountReason: string;
  finalAmount?: number;
  paymentMode: string;
  transactionId?: string;
  semester?: number;
  year?: number;
  installments?: { amount: number; date: string; status: 'PAID' | 'PENDING' }[];
}

interface FeeGroup {
  id: string;
  name: string;
  description: string;
  course_id: string;
  total_amount: number;
  items: { name: string; amount: number }[];
}

export const Fees: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'transactions' | 'groups'>('transactions');
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  const [feeGroups, setFeeGroups] = useState<FeeGroup[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [paymentSchemes, setPaymentSchemes] = useState<string[]>(['Cash', 'UPI', 'Card', 'Cheque', 'DD']);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [courseFilter, setCourseFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<FeeTransaction | null>(null);
  const [editingGroup, setEditingGroup] = useState<FeeGroup | null>(null);
  
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentCourseFilter, setStudentCourseFilter] = useState('All');
  const [studentYearFilter, setStudentYearFilter] = useState('All');
  const [studentSemesterFilter, setStudentSemesterFilter] = useState('All');

  const [settings, setSettings] = useState<any>({
    collegeName: 'Sun Group of Institutions',
    address: 'B-10, Industrial Market, Sakinaka, Mumbai',
    logo: '',
    website: '',
    phone: '',
    email: ''
  });

  const [dbStatus, setDbStatus] = useState<{connected: boolean, message: string, details?: string} | null>(null);

  const [form, setForm] = useState<Partial<FeeTransaction>>({
    status: 'PENDING',
    paymentMode: 'Cash',
    frequency: 'MONTHLY',
    fine: 0,
    discount: 0
  });

  const [groupForm, setGroupForm] = useState<Partial<FeeGroup>>({
    name: '',
    description: '',
    course_id: '',
    items: [{ name: 'Tuition Fee', amount: 0 }]
  });

  const canManageFees = user?.role === 'SUPER_ADMIN' || user?.role === 'COLLEGE_ADMIN' || user?.role === 'ACCOUNTANT';
  const isStudentOrParent = user?.role === 'STUDENT' || user?.role === 'PARENT';

  useEffect(() => {
    const init = async () => {
      const status = await testSupabaseConnection();
      setDbStatus(status);
      
      if (status.connected) {
        await fetchCourses();
        await fetchFeeGroups();
        await fetchTransactions();
        await fetchStudents();
        await fetchPaymentSchemes();
        await fetchGeneralSettings();
      }
    };
    init();
  }, [user]);

  const fetchTransactions = async () => {
    try {
      let query = supabase
        .from('fees')
        .select(`
          *,
          students:student_id (
            name,
            roll_no,
            branch,
            phone,
            id
          )
        `);

      if (user?.role === 'STUDENT') {
        const { data: student } = await supabase.from('students').select('id').eq('email', user.email).maybeSingle();
        if (student) {
          query = query.eq('student_id', student.id);
        }
      } else if (user?.role === 'PARENT') {
        const { data: parent } = await supabase.from('parents').select('student_ids').eq('email', user.email).maybeSingle();
        if (parent?.student_ids?.length > 0) {
          query = query.in('student_id', parent.student_ids);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setTransactions(data.map(t => {
          const studentData = Array.isArray(t.students) ? t.students[0] : t.students;
          const studentCourse = courses.find(c => c.id === studentData?.branch || c.name === studentData?.branch);
          return {
            id: t.id,
            studentId: t.student_id,
            student: studentData?.name || 'Unknown',
            roll: studentData?.roll_no || 'N/A',
            amount: Number(t.amount),
            date: t.date,
            dueDate: t.due_date || t.date,
            status: t.status as any,
            type: t.description || 'Fee Payment',
            feeGroup: studentCourse?.name || studentData?.branch || 'N/A',
            frequency: 'MONTHLY',
            phone: studentData?.phone || '',
            parentPhone: studentData?.phone || '',
            fine: Number(t.fine) || 0,
            discount: Number(t.discount) || 0,
            discountReason: t.discount_reason || '',
            finalAmount: Number(t.final_amount) || (Number(t.amount) + (Number(t.fine) || 0) - (Number(t.discount) || 0)),
            paymentMode: (t.payment_method as any) || paymentSchemes[0] || 'Cash',
            semester: t.semester,
            year: t.year
          };
        }));
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchGeneralSettings = async () => {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'general').single();
    if (data?.value) setSettings(data.value);
  };

  const fetchPaymentSchemes = async () => {
    const { data, error } = await supabase.from('app_settings').select('*').eq('key', 'fees').single();
    let schemes = ['Cash', 'UPI', 'Card', 'Cheque', 'DD'];
    
    if (data && data.value && data.value.paymentSchemes) {
      schemes = data.value.paymentSchemes;
      // Ensure Cheque and DD are present
      if (!schemes.includes('Cheque')) schemes.push('Cheque');
      if (!schemes.includes('DD')) schemes.push('DD');
    }
    
    setPaymentSchemes(schemes);
    if (!editingTxn) {
      setForm(prev => ({ ...prev, paymentMode: schemes[0] }));
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, roll_no, phone, parent_phone, branch, course_id, year, semester');
      
      if (error) throw error;
      
      if (data) {
        console.log('Fetched students for fees:', data.length);
        setStudents(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase.from('courses').select('*');
      if (error) throw error;
      if (data) {
        setCourses(data.map(c => ({
          ...c,
          feePattern: c.fee_pattern,
          feeAmount: c.fee_amount
        })));
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchFeeGroups = async () => {
    const { data, error } = await supabase.from('fee_groups').select('*');
    if (error) {
      console.error('Error fetching fee groups:', error);
      return;
    }
    if (data) {
      setFeeGroups(data.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        course_id: g.course_id,
        total_amount: g.total_amount,
        items: g.items || []
      })));
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const baseAmount = Number(form.amount) || 0;
      const fine = Number(form.fine) || 0;
      const discount = Number(form.discount) || 0;
      const finalAmount = baseAmount + fine - discount;

      const txnData: any = {
        amount: baseAmount,
        fine: fine,
        discount: discount,
        discount_reason: form.discountReason || '',
        final_amount: finalAmount,
        date: form.date || new Date().toISOString().split('T')[0],
        due_date: form.dueDate || form.date || new Date().toISOString().split('T')[0],
        status: form.status || 'PENDING',
        payment_method: form.paymentMode || paymentSchemes[0] || 'Cash',
        payment_mode: form.paymentMode || paymentSchemes[0] || 'Cash',
        student_id: form.studentId,
        transaction_id: form.transactionId || ''
      };

      if (!txnData.student_id) {
        alert('Validation Error: Please select a valid student from the search results.');
        setIsSaving(false);
        return;
      }

      // Final check for amounts to avoid NaN
      if (isNaN(txnData.amount) || isNaN(txnData.final_amount)) {
        alert('Validation Error: Invalid amount values. Please check the form.');
        setIsSaving(false);
        return;
      }

      console.log('Final Payment Payload:', txnData);

      let result;
      if (editingTxn) {
        result = await supabase.from('fees').update(txnData).eq('id', editingTxn.id).select();
      } else {
        result = await supabase.from('fees').insert(txnData).select();
      }

      if (result.error) {
        console.error('Supabase raw error in handleSave:', result.error);
        const detail = result.error.details || '';
        const hint = result.error.hint || '';
        throw new Error(`${result.error.message}\n${detail}\n${hint}`);
      }

      const savedTxn = result.data?.[0];
      let currentFeeId = savedTxn?.id;

      // Auto mark fees income if status is PAID
      if (txnData.status === 'PAID' && currentFeeId) {
        // Get or create "Fee Income" category
        let { data: category } = await supabase
          .from('income_categories')
          .select('id')
          .eq('name', 'Fee Income')
          .maybeSingle();
        
        if (!category) {
          const catData: any = { name: 'Fee Income', description: 'Automatically recorded fee payments' };
          const { data: newCategory, error: catError } = await supabase
            .from('income_categories')
            .insert(catData)
            .select()
            .maybeSingle();
          
          if (catError && catError.message?.includes('column "description" does not exist')) {
            delete catData.description;
            const { data: retryCat } = await supabase.from('income_categories').insert(catData).select().single();
            category = retryCat;
          } else {
            category = newCategory;
          }
        }

      if (category) {
        // Check if income already exists for this fee to avoid duplicates
        const { data: existingIncome } = await supabase
          .from('income')
          .select('id')
          .eq('reference_id', currentFeeId)
          .maybeSingle();

        if (!existingIncome) {
          await supabase.from('income').insert({
            source: 'Student Fee',
            category_id: category.id,
            amount: txnData.amount,
            date: txnData.date,
            description: `Fee Payment: ${txnData.description} - Student ID: ${txnData.student_id}`,
            reference_id: currentFeeId,
            payment_method: txnData.payment_method
          });
        }
      }

        // Send notification to student
        await sendNotification(
          txnData.student_id,
          'Fee Payment Received',
          `Your payment of ${formatCurrency(txnData.amount)} for ${txnData.description} has been received successfully.`,
          'SUCCESS'
        );
      }
      
      await fetchTransactions();
      setIsModalOpen(false);
      setEditingTxn(null);
      setForm({ status: 'PENDING', paymentMode: paymentSchemes[0] || 'Cash', frequency: 'MONTHLY', fine: 0, discount: 0 });
      alert('Payment saved successfully!');
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      alert('Failed to save payment: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveGroup = async () => {
    if (!groupForm.name || !groupForm.course_id) {
      alert('Required Fields Missing: Please enter both Group Name and assign to a Course.');
      return;
    }

    setIsSaving(true);
    
    // Ensure totalAmount is a valid number and rounded to 2 decimal places
    const totalAmount = (groupForm.items || []).reduce((acc, item) => {
      const val = typeof item.amount === 'string' ? parseFloat(item.amount) : Number(item.amount);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    
    // Create the data object for saving
    // Better course_id handling
    let cid = (groupForm.course_id || '').trim();
    // If cid is not a valid UUID (usually 36 chars), set to null
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cid);
    
    const groupData: any = {
      name: groupForm.name?.trim(),
      course_id: isUUID ? cid : null,
      total_amount: Math.round(totalAmount * 100) / 100,
      items: (groupForm.items || []).filter(item => item.name && item.name.trim() !== '')
    };

    if (!groupData.name) {
      alert('Validation Error: Fee Group Name is required.');
      setIsSaving(false);
      return;
    }

    if (groupData.items.length === 0) {
      alert('Validation Error: At least one fee item is required.');
      setIsSaving(false);
      return;
    }

    // Strip any potential null/undefined to avoid DB errors (except course_id which can be null)
    Object.keys(groupData).forEach(key => {
      if (key !== 'course_id' && (groupData[key] === undefined || groupData[key] === null)) {
        delete groupData[key];
      }
    });

    try {
      console.log('Final Prepared Group Data:', groupData);
      let result;
      
      if (editingGroup) {
        result = await supabase.from('fee_groups').update(groupData).eq('id', editingGroup.id).select();
      } else {
        result = await supabase.from('fee_groups').insert(groupData).select();
      }

      if (result.error) {
        console.error('Supabase raw error:', result.error);
        const detail = result.error.details || '';
        const hint = result.error.hint || '';
        throw new Error(`${result.error.message}\n${detail}\n${hint}`);
      }

      if (!result.data || result.data.length === 0) {
        throw new Error('No data returned from database after save.');
      }

      console.log('Fee group saved successfully:', result.data[0]);
      await fetchFeeGroups();
      setIsGroupModalOpen(false);
      setEditingGroup(null);
      setGroupForm({ name: '', description: '', course_id: '', items: [{ name: 'Tuition Fee', amount: 0 }] });
      alert('Success: Fee group has been saved successfully!');
    } catch (err: any) {
      console.error('Final Error in handleSaveGroup:', err);
      alert('Save Failed!\n\n' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRollChange = async (roll: string) => {
    setForm({ ...form, roll });
    const student = students.find(s => s.roll_no === roll);
    
    if (student) {
      // Find course details for fee amount
      const course = courses.find(c => c.id === student.course_id || c.name === student.branch);
      
      // Find fee group for this student's branch/course
      const { data: group } = await supabase
        .from('fee_groups')
        .select('*')
        .eq('course_id', student.course_id || student.branch)
        .limit(1)
        .maybeSingle();

      setForm(prev => ({
        ...prev,
        studentId: student.id,
        student: student.name,
        phone: student.phone,
        parentPhone: student.parent_phone || student.phone,
        feeGroup: group?.name || course?.name || student.branch,
        amount: course?.feeAmount || group?.total_amount || 0,
        type: group?.items?.[0]?.name || 'Tuition Fee'
      }));
    } else {
      setForm(prev => ({ ...prev, studentId: '', student: '', amount: 0 }));
    }
  };

  const handleStudentSelect = async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      // Find course details for fee amount
      const course = courses.find(c => c.id === student.course_id || c.name === student.branch);
      
      const { data: group } = await supabase
        .from('fee_groups')
        .select('*')
        .eq('course_id', student.course_id || student.branch)
        .limit(1)
        .maybeSingle();

      setForm(prev => ({
        ...prev,
        studentId: student.id,
        student: student.name,
        roll: student.roll_no,
        phone: student.phone,
        parentPhone: student.parent_phone || student.phone,
        feeGroup: group?.name || course?.name || student.branch,
        amount: course?.feeAmount || group?.total_amount || 0,
        type: group?.items?.[0]?.name || 'Tuition Fee',
        semester: Number(student.semester) || 1,
        year: Number(student.year) || 1
      }));
    }
  };

  const handleQuickSearch = () => {
    const filtered = students.filter(s => {
      const matchesSearch = (s.name || '').toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
                           (s.roll_no || '').toLowerCase().includes(studentSearchQuery.toLowerCase());
      
      const selectedCourse = courses.find(c => c.id === studentCourseFilter);
      const matchesCourse = studentCourseFilter === 'All' || 
                           s.course_id === studentCourseFilter || 
                           (selectedCourse && s.branch === selectedCourse.name);
      
      const matchesYear = studentYearFilter === 'All' || s.year?.toString() === studentYearFilter;
      const matchesSem = studentSemesterFilter === 'All' || s.semester?.toString() === studentSemesterFilter;
      return matchesSearch && matchesCourse && matchesYear && matchesSem;
    });

    if (filtered.length > 0) {
      handleStudentSelect(filtered[0].id);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      const { error } = await supabase.from('fees').delete().eq('id', id);
      if (error) {
        console.error('Error deleting transaction:', error);
        return;
      }
      await fetchTransactions();
    }
  };

  const shareReceipt = (txn: FeeTransaction) => {
    const message = `*Fee Receipt - EduNexus College*\n\nStudent: ${txn.student}\nRoll No: ${txn.roll}\nFee Type: ${txn.type}\nAmount Paid: ${formatCurrency(txn.amount)}\nDate: ${formatDate(txn.date)}\nPayment Mode: ${txn.paymentMode}\nTransaction ID: ${txn.transactionId || 'N/A'}\n\nThank you for your payment!`;
    
    // Share to Student
    const studentUrl = `https://wa.me/${(txn.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(studentUrl, '_blank');

    // Share to Parent
    setTimeout(() => {
      const parentUrl = `https://wa.me/${(txn.parentPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(parentUrl, '_blank');
    }, 1000);
  };

  const sendDueReminder = (txn: FeeTransaction) => {
    const message = `*Fee Due Reminder - EduNexus College*\n\nHello ${txn.student},\nYour ${txn.type} of ${formatCurrency(txn.amount)} is due on ${formatDate(txn.dueDate)}. Please clear your dues to avoid fines.\n\nRegards,\nAccounts Dept.`;
    
    // Send to Student
    const studentUrl = `https://wa.me/${(txn.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(studentUrl, '_blank');

    // Send to Parent
    setTimeout(() => {
      const parentUrl = `https://wa.me/${(txn.parentPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(parentUrl, '_blank');
    }, 1000);
  };

  const printNoDuesCertificate = (txn: FeeTransaction) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>No Dues Certificate - ${txn.student}</title>
            <style>
              @page { size: A4 landscape; margin: 0; }
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                margin: 0; 
                padding: 40px; 
                background-color: #fff;
                color: #000;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              .certificate-container {
                border: 8px double #000;
                padding: 30px;
                width: 1000px;
                position: relative;
                background-color: #fff;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
              }
              .inner-border {
                border: 2px solid #000;
                padding: 20px;
                height: 100%;
              }
              .header { text-align: center; margin-bottom: 30px; }
              .foundation-name { font-size: 18px; font-weight: bold; margin: 0; }
              .institution-name { font-size: 36px; font-weight: 900; margin: 5px 0; color: #000; }
              .address { font-size: 14px; margin: 5px 0; }
              .courses-offered { font-size: 12px; font-style: italic; margin: 5px 0; border-bottom: 1px solid #000; padding-bottom: 10px; }
              
              .cert-title { 
                text-align: center; 
                font-size: 28px; 
                font-weight: bold; 
                text-decoration: underline; 
                margin: 30px 0;
                background: #eee;
                display: inline-block;
                padding: 5px 20px;
                left: 50%;
                transform: translateX(-50%);
                position: relative;
              }
              
              .info-row { display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 18px; }
              .info-item { flex: 1; display: flex; align-items: flex-end; gap: 10px; }
              .label { font-weight: bold; white-space: nowrap; }
              .value { border-bottom: 1px dashed #000; flex: 1; padding-bottom: 2px; }
              
              .accommodation-status { text-align: center; margin: 40px 0; }
              .accommodation-title { font-size: 20px; font-weight: bold; margin-bottom: 20px; }
              .accommodation-line { border-bottom: 1px dashed #000; width: 300px; margin: 0 auto; height: 30px; }
              
              .signatures { display: flex; justify-content: space-between; margin-top: 80px; font-size: 18px; font-weight: bold; }
              .sig-box { text-align: center; width: 250px; border-top: 1px solid #000; padding-top: 10px; }
              
              .note { font-size: 14px; margin-top: 40px; font-style: italic; }
              .cert-no { position: absolute; right: 40px; top: 40px; font-size: 20px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="certificate-container">
              <div class="inner-border">
                <div class="cert-no">139</div>
                <div class="header">
                  <p class="foundation-name">Sri Kailashnath Foundation®</p>
                  <h1 class="institution-name">SUN GROUP OF INSTITUTIONS</h1>
                  <p class="address">B 10 Industrial Market Near gate Number 5, Sakinaka Metro Station Andheri East 400072.</p>
                  <p class="courses-offered">{Course offers : MBBS, BDS, BAMS, BHMS, BUMS, BPT, B.PHARM,D.PHARM, B.SC.NURSING, BMLT, GNM, DMLT & More}</p>
                  <p class="foundation-name">9833057189/9902925117</p>
                </div>

                <div class="cert-title">No Due Certificate</div>

                <div class="info-row">
                  <div class="info-item">
                    <span class="label">Name :</span>
                    <span class="value">${txn.student}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Father Name :</span>
                    <span class="value">N/A</span>
                  </div>
                </div>

                <div class="info-row">
                  <div class="info-item">
                    <span class="label">Course :</span>
                    <span class="value">${txn.feeGroup}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Mobile No. :</span>
                    <span class="value">${txn.phone}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Fee Status :</span>
                    <span class="value">${txn.status}</span>
                  </div>
                </div>

                <div class="info-row" style="width: 50%;">
                  <div class="info-item">
                    <span class="label">Sem/Year :</span>
                    <span class="value">${txn.semester || 1} / ${txn.year || 1}</span>
                  </div>
                </div>

                <div class="accommodation-status">
                  <div class="accommodation-title">Exam Accommodation Status</div>
                  <div class="accommodation-line"></div>
                </div>

                <div class="signatures">
                  <div class="sig-box">Student/Parent's Sign.</div>
                  <div class="sig-box">Authority's Sign. and Stamp</div>
                </div>

                <p class="note">Note : Student/Parent must show all fee receipts of Semester/Year for any correction or confirmation to Authority.</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const shareNoDuesWhatsApp = async (txn: FeeTransaction) => {
    // Create a hidden element to render the certificate for capture
    const element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.innerHTML = `
      <div id="cert-capture" style="width: 800px; padding: 40px; background: white; border: 10px double black; font-family: sans-serif;">
        <div style="text-align: center;">
          <p style="margin: 0; font-weight: bold;">Sri Kailashnath Foundation®</p>
          <h1 style="margin: 5px 0; font-size: 32px;">SUN GROUP OF INSTITUTIONS</h1>
          <p style="margin: 5px 0; font-size: 12px;">B 10 Industrial Market, Sakinaka, Mumbai 400072</p>
          <hr/>
          <h2 style="text-decoration: underline; margin: 20px 0;">No Due Certificate</h2>
        </div>
        <div style="margin-top: 30px; line-height: 2;">
          <p><strong>Name:</strong> ${txn.student}</p>
          <p><strong>Course:</strong> ${txn.feeGroup}</p>
          <p><strong>Sem/Year:</strong> ${txn.semester || 1} / ${txn.year || 1}</p>
          <p><strong>Fee Status:</strong> PAID</p>
          <p><strong>Date:</strong> ${formatDate(new Date().toISOString())}</p>
        </div>
        <div style="margin-top: 50px; display: flex; justify-content: space-between;">
          <div style="border-top: 1px solid black; width: 200px; text-align: center; padding-top: 5px;">Student Sign</div>
          <div style="border-top: 1px solid black; width: 200px; text-align: center; padding-top: 5px;">Authority Sign</div>
        </div>
      </div>
    `;
    document.body.appendChild(element);

    try {
      const canvas = await html2canvas(element.querySelector('#cert-capture') as HTMLElement);
      const dataUrl = canvas.toDataURL('image/png');
      
      // Since we can't directly send an image file via wa.me link, 
      // we'll provide a text message with a link to the certificate if we had a hosting service.
      // For now, we'll send a text confirmation and open the image in a new tab for the user to save/share.
      
      const message = `*No Dues Certificate - Sun Group of Institutions*\n\nDear ${txn.student},\nYour No Dues Certificate for Sem ${txn.semester || 1}/Year ${txn.year || 1} has been generated successfully.\n\nStatus: PAID\n\nRegards,\nAdministration`;
      const waUrl = `https://wa.me/${(txn.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      
      window.open(waUrl, '_blank');
      
      // Also show the image for the user
      const imgWindow = window.open('');
      if (imgWindow) {
        imgWindow.document.write(`<img src="${dataUrl}" style="max-width: 100%;" />`);
        imgWindow.document.title = "No Dues Certificate - Save and Share";
      }
    } catch (err) {
      console.error('Error generating certificate image:', err);
    } finally {
      document.body.removeChild(element);
    }
  };

  const printReceipt = (txn: FeeTransaction) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const totalAmount = txn.amount + txn.fine - txn.discount;
      const amountInWords = "Only";

      printWindow.document.write(`
        <html>
          <head>
            <title>Fee Receipt - ${txn.id}</title>
            <style>
              @page { size: A4 portrait; margin: 10mm; }
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                margin: 0; 
                padding: 0; 
                background-color: #fff;
                color: #000;
              }
              .receipt-container {
                border: 2px solid #000;
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
                background-color: #fff;
                position: relative;
                page-break-inside: avoid;
              }
              .header { text-align: center; position: relative; margin-bottom: 2px; padding-bottom: 5px; border-bottom: 2px solid #ef4444; }
              .logo { position: absolute; left: 10px; top: 0; width: 50px; height: 50px; object-fit: contain; }
              .foundation-name { font-size: 13px; font-weight: bold; margin: 0; }
              .institution-name { font-size: 22px; font-weight: 900; margin: 2px 0; color: #ef4444; text-transform: uppercase; }
              .estd { font-size: 10px; position: absolute; right: 10px; top: 0; }
              .id-no { font-size: 10px; position: absolute; right: 10px; top: 18px; border: 1px solid #000; padding: 2px 10px; border-radius: 15px; background: white; }
              .tagline { font-size: 11px; font-style: italic; color: #444; margin: 2px 0; }
              .receipt-title { 
                text-align: center; 
                font-size: 18px; 
                font-weight: bold; 
                text-decoration: underline; 
                margin: 8px 0;
                color: #000;
                text-transform: uppercase;
              }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px; font-size: 12px; }
              .info-item { border-bottom: 1px dotted #000; padding: 2px 0; display: flex; align-items: flex-end; overflow: hidden; }
              .info-label { font-weight: bold; margin-right: 5px; font-size: 11px; white-space: nowrap; }
              
              table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 12px; }
              th, td { border: 1px solid #000; padding: 6px; text-align: left; }
              th { background-color: #f9fafb; font-weight: bold; text-transform: uppercase; }
              .col-sr { width: 40px; text-align: center; }
              .col-amt { width: 120px; text-align: right; }
              
              .total-words { font-size: 12px; margin: 10px 0; border-bottom: 1px dotted #000; padding-bottom: 3px; }
              .notice { font-size: 9px; line-height: 1.2; margin-top: 10px; color: #444; border-top: 1px solid #eee; padding-top: 5px; }
              .signatures { display: flex; justify-content: space-between; margin-top: 40px; font-size: 13px; font-weight: bold; }
              .sig-line { border-top: 1.5px solid #000; padding-top: 5px; min-width: 140px; text-align: center; }
              .footer-address { text-align: center; font-size: 9px; margin-top: 15px; border-top: 1px solid #000; padding-top: 5px; font-weight: bold; color: #333; }
            </style>
          </head>
          <body>
            <div class="receipt-container">
              <div class="header">
                ${settings.logo ? `<img src="${settings.logo}" class="logo" />` : `<div class="logo bg-slate-200"></div>`}
                <p class="estd">Estd. 2015</p>
                <div class="id-no" title="${txn.id}">I.D. No: ${txn.id.substring(0, 15)}${txn.id.length > 15 ? '...' : ''}</div>
                <p class="foundation-name">Sri Kailashnath Foundation®</p>
                <h1 class="institution-name">${settings.collegeName || 'SUN GROUP OF INSTITUTIONS'}</h1>
                <p class="tagline">"Education is a seed of success..."</p>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px dashed #000; margin-bottom: 10px;">
                <span style="font-size: 11px; font-weight: bold;">Admission | Lecture | Training assistance | Placement assistance</span>
                <span style="font-size: 13px; font-weight: bold;">Date: ${formatDate(txn.date)}</span>
              </div>

              <div class="receipt-title">Fee Receipt</div>

              <div class="info-grid">
                <div class="info-item"><span class="info-label">Name of the Candidate:</span> ${txn.student}</div>
                <div class="info-item"><span class="info-label">Course:</span> ${txn.feeGroup}</div>
                <div class="info-item"><span class="info-label">Sem/Year:</span> ${txn.frequency}</div>
                <div class="info-item"><span class="info-label">Batch/Reg.No.:</span> ${txn.roll}</div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th class="col-sr">Sr. No.</th>
                    <th>Particulars</th>
                    <th>Mode of Payment</th>
                    <th class="col-amt">Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="col-sr">01</td>
                    <td>${txn.type}</td>
                    <td>${txn.paymentMode}</td>
                    <td class="col-amt">${txn.amount.toFixed(2)}</td>
                  </tr>
                  ${txn.fine > 0 ? `
                  <tr>
                    <td class="col-sr">02</td>
                    <td>Late Fine</td>
                    <td>-</td>
                    <td class="col-amt">${txn.fine.toFixed(2)}</td>
                  </tr>` : ''}
                  ${txn.discount > 0 ? `
                  <tr>
                    <td class="col-sr">03</td>
                    <td>Discount</td>
                    <td>-</td>
                    <td class="col-amt">-${txn.discount.toFixed(2)}</td>
                  </tr>` : ''}
                  <tr style="background: #f9fafb;">
                    <td colspan="3" style="text-align: right; font-weight: bold; font-size: 14px;">Total =</td>
                    <td class="col-amt" style="font-weight: bold; font-size: 14px;">${totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div class="total-words">
                <span class="info-label">Total in words:</span> Rupees ${totalAmount.toFixed(0)} ${amountInWords}
              </div>

              <div class="notice">
                <strong>Notice:</strong><br/>
                1) Fee once paid will not be returned or transferred under any circumstances.<br/>
                2) Admission will not be cancelled, if you will cancel the admission, you have to pay total course academic fee.<br/>
                3) Please submit all original documents in College/University for Government verification.<br/>
                4) Please follow rules and regulations of Institutions as per Notice Board.<br/>
                5) Parent, Please visit office Weekly or Monthly after prior appointment for any queries.
              </div>

              <div class="signatures">
                <span class="sig-line">Candidate's Sign</span>
                <span class="sig-line">Authority's Sign</span>
              </div>

              <div class="footer-address">
                ${settings.address || 'B-10, Industrial Market, Sakinaka Metro Station, Near Gate No. 5, Andheri (E), Mumbai 400072'}
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const handleExportPDF = () => {
    const headers = ['ID', 'Student', 'Type', 'Amount', 'Fine', 'Disc', 'Total', 'Status'];
    const data = transactions.map(t => [
      t.id, 
      t.student, 
      t.type, 
      formatCurrency(t.amount), 
      formatCurrency(t.fine), 
      formatCurrency(t.discount), 
      formatCurrency(t.amount + t.fine - t.discount),
      t.status
    ]);
    exportToPDF('Fee Collection Report', headers, data, 'Fee_Report');
  };

  const handleExportExcel = () => {
    exportToExcel(transactions, 'Fee_Report');
  };

  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch = (txn.student || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (txn.roll || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (txn.id || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || txn.status === statusFilter;
    const matchesCourse = courseFilter === 'All' || txn.feeGroup === courseFilter;

    return matchesSearch && matchesStatus && matchesCourse;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fee Management</h1>
          <p className="text-slate-500">Track collections, manage installments, and generate receipts.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-primary/10 text-slate-600 rounded-xl text-sm font-bold hover:bg-background transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-primary/10 text-slate-600 rounded-xl text-sm font-bold hover:bg-background transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          </div>
          {canManageFees && (
            activeTab === 'transactions' ? (
              <button 
                onClick={() => {
                  setEditingTxn(null);
                  setForm({ status: 'PENDING', paymentMode: paymentSchemes[0] || 'Cash', frequency: 'MONTHLY', fine: 0, discount: 0 });
                  setStudentSearchQuery('');
                  setStudentCourseFilter('All');
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              >
                <Plus className="w-4 h-4" />
                New Payment
              </button>
            ) : (
              <button 
                onClick={() => {
                  setEditingGroup(null);
                  setGroupForm({ name: '', description: '', course_id: '', items: [{ name: 'Tuition Fee', amount: 0 }] });
                  setIsGroupModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                <Plus className="w-4 h-4" />
                New Fee Group
              </button>
            )
          )}
        </div>
      </div>

      {/* Database Connection Status Warning */}
      {dbStatus && !dbStatus.connected && (
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-[32px] flex items-start gap-4 mb-8">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-600 shadow-sm shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-rose-900 mb-1">{dbStatus.message}</h3>
            <p className="text-rose-700/80 text-sm font-medium leading-relaxed mb-4">{dbStatus.details}</p>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
              >
                Retry Connection
              </button>
              <a 
                href="/settings"
                className="px-6 py-2 bg-white text-rose-600 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-50 transition-all"
              >
                Go to Settings
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('transactions')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeTab === 'transactions' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Receipt className="w-4 h-4" />
          Transactions
        </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'groups' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Wallet className="w-4 h-4" />
            Fee Structure
          </button>
      </div>

      {activeTab === 'transactions' ? (
        <>
          {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Collection', value: formatCurrency(transactions.filter(t => t.status === 'PAID').reduce((acc, t) => acc + t.amount + t.fine - t.discount, 0)), change: '+12%', icon: Wallet, color: 'text-green-600', bg: 'bg-green-50', trend: 'up' },
          { title: 'Pending Fees', value: formatCurrency(transactions.filter(t => t.status === 'PENDING').reduce((acc, t) => acc + t.amount, 0)), change: '-5%', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', trend: 'down' },
          { title: 'Overdue Payments', value: formatCurrency(transactions.filter(t => t.status === 'OVERDUE').reduce((acc, t) => acc + t.amount, 0)), change: '+8%', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', trend: 'up' },
          { title: 'Total Discounts', value: formatCurrency(transactions.reduce((acc, t) => acc + t.discount, 0)), change: '+2%', icon: TrendingDown, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: 'up' },
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                stat.trend === 'up' ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
              )}>
                {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium mb-1">{stat.title}</h3>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search student, roll no or transaction ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="All">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="OVERDUE">Overdue</option>
            </select>
            <select 
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="All">All Courses</option>
              {courses.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Transaction ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type & Group</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((txn, i) => (
                <motion.tr 
                  key={txn.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-800">{txn.id}</span>
                    {txn.transactionId && <p className="text-[10px] text-slate-400">Ref: {txn.transactionId}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{txn.student}</p>
                      <p className="text-xs text-slate-400">{txn.roll}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600 font-medium">{txn.type}</p>
                    <p className="text-xs text-slate-400">{txn.feeGroup}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p className="font-bold text-slate-900">{formatCurrency(txn.amount + txn.fine - txn.discount)}</p>
                      {txn.fine > 0 && <p className="text-[10px] text-rose-500">Fine: +{formatCurrency(txn.fine)}</p>}
                      {txn.discount > 0 && <p className="text-[10px] text-green-500">Disc: -{formatCurrency(txn.discount)}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-500">{formatDate(txn.dueDate)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      txn.status === 'PAID' ? "bg-green-50 text-green-600" : 
                      txn.status === 'PENDING' ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                    )}>
                      {txn.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {txn.status === 'PAID' && (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => printNoDuesCertificate(txn)}
                            title="No Dues Certificate"
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <button 
                        onClick={() => sendDueReminder(txn)}
                        title="Send Due Reminder"
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <Smartphone className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => shareReceipt(txn)}
                        title="Share on WhatsApp"
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => printReceipt(txn)}
                        title="Print Receipt"
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {canManageFees && (
                        <>
                          <button 
                            onClick={() => {
                              setEditingTxn(txn);
                              setForm(txn);
                              setStudentSearchQuery('');
                              setStudentCourseFilter('All');
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(txn.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {feeGroups.map((group) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Wallet className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingGroup(group);
                      setGroupForm(group);
                      setIsGroupModalOpen(true);
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-1">{group.name}</h3>
              <p className="text-xs font-bold text-indigo-600 mb-2">{courses.find(c => c.id === group.course_id)?.name || 'General'}</p>
              <p className="text-sm text-slate-500 mb-4">{group.description}</p>
              
              <div className="space-y-2 mb-6">
                {group.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{item.name}</span>
                    <span className="font-bold text-slate-800">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Amount</p>
                  <p className="text-xl font-black text-indigo-600">{formatCurrency(group.total_amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned Course</p>
                  <p className="text-sm font-bold text-slate-700">{courses.find(c => c.id === group.course_id)?.name || 'None'}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-3xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-primary/5">
                <div>
                  <h2 className="text-2xl font-black text-primary">{editingTxn ? 'Edit Payment' : 'New Payment'}</h2>
                  <p className="text-slate-500 text-sm">Enter detailed payment information.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Search Student</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input 
                            type="text"
                            placeholder="Name or roll no..."
                            value={studentSearchQuery}
                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleQuickSearch()}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>
                        <button 
                          onClick={handleQuickSearch}
                          className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
                        >
                          Search
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filter Branch</label>
                      <select 
                        value={studentCourseFilter}
                        onChange={(e) => setStudentCourseFilter(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      >
                        <option value="All">All Branches</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filter Year</label>
                      <select 
                        value={studentYearFilter}
                        onChange={(e) => setStudentYearFilter(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      >
                        <option value="All">All Years</option>
                        {[1,2,3,4].map(y => <option key={y} value={y.toString()}>Year {y}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filter Sem</label>
                      <select 
                        value={studentSemesterFilter}
                        onChange={(e) => setStudentSemesterFilter(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      >
                        <option value="All">All Sems</option>
                        {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s.toString()}>Sem {s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Student Result</label>
                    <select 
                      value={form.studentId || ''}
                      onChange={(e) => handleStudentSelect(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      <option value="">Choose Student</option>
                      {students
                        .filter(s => {
                          const matchesSearch = (s.name || '').toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
                                               (s.roll_no || '').toLowerCase().includes(studentSearchQuery.toLowerCase());
                          
                          const selectedCourse = courses.find(c => c.id === studentCourseFilter);
                          const matchesCourse = studentCourseFilter === 'All' || 
                                               s.course_id === studentCourseFilter || 
                                               (selectedCourse && s.branch === selectedCourse.name);
                          
                          const matchesYear = studentYearFilter === 'All' || s.year?.toString() === studentYearFilter;
                          const matchesSem = studentSemesterFilter === 'All' || s.semester?.toString() === studentSemesterFilter;
                          return matchesSearch && matchesCourse && matchesYear && matchesSem;
                        })
                        .map(s => {
                          const course = courses.find(c => c.id === s.course_id || c.id === s.branch || c.name === s.branch);
                          return (
                            <option key={s.id} value={s.id}>
                              {s.name} | {s.roll_no} | {course?.name || s.branch || 'No Course'}
                            </option>
                          );
                        })
                      }
                    </select>
                    {studentSearchQuery && students.filter(s => (s.name || '').toLowerCase().includes(studentSearchQuery.toLowerCase()) || (s.roll_no || '').toLowerCase().includes(studentSearchQuery.toLowerCase())).length === 0 && (
                      <p className="text-[10px] text-rose-500 font-bold">No students found matching your search.</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</label>
                    <input 
                      type="text" 
                      value={form.student || ''}
                      readOnly
                      placeholder="Auto-filled"
                      className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Roll No</label>
                    <input 
                      type="text" 
                      value={form.roll || ''}
                      readOnly
                      placeholder="Auto-filled"
                      className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch</label>
                    <select 
                      value={form.feeGroup || ''}
                      onChange={(e) => setForm({...form, feeGroup: e.target.value})}
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      <option value="">Select Branch</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student Phone</label>
                    <input 
                      type="tel" 
                      value={form.phone || ''}
                      onChange={(e) => setForm({...form, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parent Phone</label>
                    <input 
                      type="tel" 
                      value={form.parentPhone || ''}
                      onChange={(e) => setForm({...form, parentPhone: e.target.value})}
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semester</label>
                    <select 
                      value={form.semester || 1}
                      onChange={(e) => setForm({...form, semester: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Year</label>
                    <select 
                      value={form.year || 1}
                      onChange={(e) => setForm({...form, year: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Frequency</label>
                    <select 
                      value={form.frequency || 'MONTHLY'}
                      onChange={(e) => setForm({...form, frequency: e.target.value as any})}
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                      <option value="ONE_TIME">One Time</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Base Amount</label>
                    <input 
                      type="number" 
                      value={form.amount || ''}
                      onChange={(e) => setForm({...form, amount: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fine (if any)</label>
                    <input 
                      type="number" 
                      value={form.fine || 0}
                      onChange={(e) => setForm({...form, fine: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Discount</label>
                    <input 
                      type="number" 
                      value={form.discount || 0}
                      onChange={(e) => setForm({...form, discount: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Discount Reason</label>
                    <input 
                      type="text" 
                      value={form.discountReason || ''}
                      onChange={(e) => setForm({...form, discountReason: e.target.value})}
                      placeholder="Reason..."
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</label>
                    <input 
                      type="date" 
                      value={form.dueDate || ''}
                      onChange={(e) => setForm({...form, dueDate: e.target.value})}
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Mode</label>
                    <select 
                      value={form.paymentMode || paymentSchemes[0] || 'Cash'}
                      onChange={(e) => setForm({...form, paymentMode: e.target.value})}
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      {paymentSchemes.map(scheme => (
                        <option key={scheme} value={scheme}>{scheme}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                    <select 
                      value={form.status || 'PENDING'}
                      onChange={(e) => setForm({...form, status: e.target.value as any})}
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      <option value="PAID">Paid</option>
                      <option value="PENDING">Pending</option>
                      <option value="OVERDUE">Overdue</option>
                      <option value="PARTIAL">Partial</option>
                    </select>
                  </div>

                  <div className="col-span-1 md:col-span-3">
                    <div className="bg-indigo-50 p-6 rounded-[24px] border border-indigo-100 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Calculation Details</p>
                        <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                          <span>{formatCurrency(form.amount || 0)}</span>
                          <Plus className="w-3 h-3" />
                          <span className="text-rose-500">{formatCurrency(form.fine || 0)}</span>
                          <span className="text-slate-400">-</span>
                          <span className="text-green-600">{formatCurrency(form.discount || 0)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Final Amount To Pay</p>
                        <p className="text-3xl font-black text-indigo-700">
                          {formatCurrency((Number(form.amount) || 0) + (Number(form.fine) || 0) - (Number(form.discount) || 0))}
                        </p>
                      </div>
                    </div>
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
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(
                    "flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-2xl font-bold transition-all shadow-lg shadow-primary/20",
                    isSaving ? "opacity-70 cursor-not-allowed" : "hover:bg-primary/90"
                  )}
                >
                  {isSaving ? (
                    <Clock className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {isSaving ? 'Processing...' : (editingTxn ? 'Update Payment' : 'Save Payment')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Fee Group Modal */}
      <AnimatePresence>
        {isGroupModalOpen && (
          <div className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl my-auto relative flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50 shrink-0">
                <div>
                  <h2 className="text-2xl font-black text-indigo-600">{editingGroup ? 'Edit Fee Group' : 'New Fee Group'}</h2>
                  <p className="text-slate-500 text-sm">Define fee components and link to a course.</p>
                </div>
                <button 
                  onClick={() => setIsGroupModalOpen(false)}
                  className="p-2 hover:bg-white rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Group Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. B.Tech 1st Year Fees"
                      value={groupForm.name || ''}
                      onChange={(e) => setGroupForm({...groupForm, name: e.target.value})}
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign to Course</label>
                    <select 
                      value={groupForm.course_id || ''}
                      onChange={(e) => setGroupForm({...groupForm, course_id: e.target.value})}
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    >
                      <option value="">Select Course</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                  <textarea 
                    value={groupForm.description || ''}
                    onChange={(e) => setGroupForm({...groupForm, description: e.target.value})}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                    rows={2}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fee Items</label>
                    <button 
                      onClick={() => setGroupForm({...groupForm, items: [...(groupForm.items || []), { name: '', amount: 0 }]})}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Item
                    </button>
                  </div>
                  <div className="space-y-3">
                    {groupForm.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <input 
                          type="text" 
                          placeholder="Item Name"
                          value={item.name}
                          onChange={(e) => {
                            const newItems = [...(groupForm.items || [])];
                            newItems[idx].name = e.target.value;
                            setGroupForm({...groupForm, items: newItems});
                          }}
                          className="flex-1 px-4 py-2 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                        <input 
                          type="number" 
                          placeholder="Amount"
                          value={item.amount || ''}
                          onChange={(e) => {
                            const newItems = [...(groupForm.items || [])];
                            newItems[idx].amount = Number(e.target.value);
                            setGroupForm({...groupForm, items: newItems});
                          }}
                          className="w-32 px-4 py-2 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                        <button 
                          onClick={() => {
                            const newItems = (groupForm.items || []).filter((_, i) => i !== idx);
                            setGroupForm({...groupForm, items: newItems});
                          }}
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-8 bg-slate-50 flex items-center justify-end gap-3 shrink-0 rounded-b-[32px]">
                <button 
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-6 py-3 text-slate-500 font-bold hover:text-indigo-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveGroup}
                  disabled={isSaving}
                  className={cn(
                    "flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200",
                    isSaving ? "opacity-70 cursor-not-allowed" : "hover:bg-indigo-700"
                  )}
                >
                  {isSaving ? (
                    <Clock className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {isSaving ? 'Saving...' : (editingGroup ? 'Update Group' : 'Save Group')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
