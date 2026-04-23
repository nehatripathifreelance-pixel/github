import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard, 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  MessageSquare,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Mail,
  Phone,
  DollarSign,
  PieChart,
  History,
  Share2,
  Smartphone,
  FileDown,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { cn, formatDate, formatCurrency } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { exportToPDF, exportToExcel } from '../../lib/exportUtils';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

type ReportType = 
  | 'PROFIT_LOSS' 
  | 'DUES_FEES' 
  | 'FINE' 
  | 'INCOME_EXPENSE' 
  | 'EXAMINATION' 
  | 'LEDGER' 
  | 'STUDENT_LEDGER' 
  | 'PASSING_REPORT'
  | 'ADMISSION_REPORT';

interface ReportCategory {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const REPORT_CATEGORIES: ReportCategory[] = [
  { id: 'PROFIT_LOSS', title: 'Profit & Loss', description: 'Overall financial performance summary', icon: TrendingUp, color: 'text-emerald-600' },
  { id: 'DUES_FEES', title: 'Dues Fees', description: 'Pending fee payments and reminders', icon: CreditCard, color: 'text-amber-600' },
  { id: 'FINE', title: 'Fine Reports', description: 'Summary of fines and penalties', icon: AlertCircle, color: 'text-rose-600' },
  { id: 'INCOME_EXPENSE', title: 'Income & Expense', description: 'Detailed transaction history', icon: BarChart3, color: 'text-indigo-600' },
  { id: 'EXAMINATION', title: 'Examination', description: 'Exam performance and statistics', icon: FileText, color: 'text-blue-600' },
  { id: 'LEDGER', title: 'General Ledger', description: 'Accounting ledger for all accounts', icon: BookOpen, color: 'text-slate-600' },
  { id: 'STUDENT_LEDGER', title: 'Student Ledger', description: 'Individual student financial history', icon: Users, color: 'text-cyan-600' },
  { id: 'PASSING_REPORT', title: 'Passing Report', description: 'Exam pass/fail analysis and trends', icon: CheckCircle2, color: 'text-green-600' },
  { id: 'ADMISSION_REPORT', title: 'Admission Report', description: 'Detailed analysis of admission applications', icon: FileText, color: 'text-amber-600' },
];

const ReportFilters: React.FC<{ filters: any, setFilters: (f: any) => void, masterData: any, includeDate?: boolean, dateRange?: any, setDateRange?: (d: any) => void }> = ({ filters, setFilters, masterData, includeDate, dateRange, setDateRange }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4">
    <div className="space-y-1">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Course</label>
      <select 
        value={filters.course}
        onChange={(e) => setFilters({...filters, course: e.target.value})}
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
      >
        <option value="">All Courses</option>
        {masterData.courses.map((c: any) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
    <div className="space-y-1">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Branch</label>
      <select 
        value={filters.branch}
        onChange={(e) => setFilters({...filters, branch: e.target.value})}
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
      >
        <option value="">All Branches</option>
        {masterData.branches.map((b: string) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </select>
    </div>
    <div className="space-y-1">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Year</label>
      <select 
        value={filters.year}
        onChange={(e) => setFilters({...filters, year: e.target.value})}
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
      >
        <option value="">All Years</option>
        {masterData.years.map((y: string) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
    {includeDate && setDateRange && (
      <>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">From Date</label>
          <input 
            type="date" 
            value={dateRange.start}
            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">To Date</label>
          <input 
            type="date" 
            value={dateRange.end}
            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </>
    )}
    {!includeDate && (
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Session</label>
        <select 
          value={filters.session}
          onChange={(e) => setFilters({...filters, session: e.target.value})}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">All Sessions</option>
          {masterData.sessions.map((s: string) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    )}
  </div>
);

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filters, setFilters] = useState({ student: '', branch: '', year: '', session: '', course: '', status: 'All' });
  const [masterData, setMasterData] = useState({ students: [], courses: [], sessions: [], years: [], branches: [], incomeCategories: [], expenseCategories: [] });
  const [papers, setPapers] = useState<any[]>([]);
  const [duesData, setDuesData] = useState<any[]>([]);
  const [admissionData, setAdmissionData] = useState<any[]>([]);
  const [financialData, setFinancialData] = useState<{ income: any[], expenses: any[] }>({ income: [], expenses: [] });
  const [examResults, setExamResults] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);

  useEffect(() => {
    fetchMasterData();
    fetchPapers();
    fetchDues();
    fetchAdmissionData();
    fetchFinancialData();
    fetchResults();
  }, []);

  const fetchResults = async () => {
    const [resultsRes, examsRes] = await Promise.all([
      supabase.from('results').select('*, students(name, roll_no, branch, year)'),
      supabase.from('exams').select('*')
    ]);
    if (resultsRes.data) setExamResults(resultsRes.data);
    if (examsRes.data) setExams(examsRes.data);
  };

  const fetchMasterData = async () => {
    const [studentsRes, coursesRes, settingsRes, incomeCatRes, expenseCatRes] = await Promise.all([
      supabase.from('students').select('id, name, branch, year, batch'),
      supabase.from('courses').select('id, name'),
      supabase.from('app_settings').select('value').eq('key', 'academic').single(),
      supabase.from('income_categories').select('*'),
      supabase.from('expense_categories').select('*')
    ]);

    setMasterData({
      students: studentsRes.data || [],
      courses: coursesRes.data || [],
      sessions: ['2023-24', '2024-25', '2025-26'] as any,
      years: ['1st Year', '2nd Year', '3rd Year', '4th Year'] as any,
      branches: settingsRes.data?.value?.branches || [],
      incomeCategories: incomeCatRes.data || [],
      expenseCategories: expenseCatRes.data || []
    });
  };

  const fetchFinancialData = async () => {
    const [incomeRes, expensesRes, feesRes] = await Promise.all([
      supabase.from('income').select('*, income_categories(name)'),
      supabase.from('expenses').select('*, expense_categories(name)'),
      supabase.from('fees').select('*, students(name, roll_no, branch, year)').eq('status', 'PAID')
    ]);

    // Combine income from 'income' table and PAID 'fees'
    const feeIncome = (feesRes.data || []).map(f => ({
      id: f.id,
      amount: f.amount,
      date: f.date || f.created_at,
      description: `Fee Collection - ${f.students?.name} (${f.students?.roll_no})`,
      category_id: 'fees',
      income_categories: { name: 'Fee Collection' }
    }));

    setFinancialData({
      income: [...(incomeRes.data || []), ...feeIncome],
      expenses: expensesRes.data || []
    });
  };

  const fetchAdmissionData = async () => {
    const { data } = await supabase
      .from('applications')
      .select('*, courses(name)')
      .order('created_at', { ascending: false });
    if (data) setAdmissionData(data);
  };

  const fetchPapers = async () => {
    const { data } = await supabase.from('papers').select('*');
    if (data) setPapers(data);
  };

  const fetchDues = async () => {
    const { data } = await supabase
      .from('fees')
      .select(`
        *,
        students (
          id,
          name,
          roll_no,
          branch,
          year,
          batch,
          phone
        )
      `);
    
    if (data) {
      setDuesData(data.map(d => ({
        id: d.id,
        student_id: d.student_id,
        name: d.students?.name,
        roll: d.students?.roll_no,
        branch: d.students?.branch,
        year: d.students?.year,
        batch: d.students?.batch,
        total: Number(d.amount),
        paid: Number(d.paid_amount || 0),
        dues: Number(d.amount) - Number(d.paid_amount || 0),
        phone: d.students?.phone,
        status: d.status,
        type: d.description || 'Fee',
        created_at: d.created_at,
        date: d.date
      })));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const sendWhatsAppReminder = (studentName: string, amount: number, phone?: string) => {
    const message = `Dear Parent, this is a reminder regarding the pending fees of ₹${amount} for your ward ${studentName}. Please clear the dues at the earliest. - EduNexus College`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = phone ? `https://wa.me/${phone}?text=${encodedMessage}` : `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareReceiptWhatsApp = (student: any) => {
    const message = `Dear Parent, fee receipt for ${student.name} (Roll: ${student.roll}) for amount ₹${student.total} has been generated. Status: PAID. - EduNexus College`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = student.phone ? `https://wa.me/${student.phone}?text=${encodedMessage}` : `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const downloadPaperWord = async (paper: any) => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: paper.title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Course: ${paper.course}`, bold: true }),
              new TextRun({ text: `\tSubject: ${paper.subject}`, bold: true }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Total Marks: ${paper.total_marks || paper.totalMarks}`, bold: true }),
              new TextRun({ text: `\tDuration: ${paper.duration} Min`, bold: true }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "", spacing: { after: 200 } }),
          ...paper.questions.flatMap((q: any, i: number) => [
            new Paragraph({
              children: [
                new TextRun({ text: `Q${i + 1}. ${q.text}`, bold: true }),
                new TextRun({ text: `\t(${q.marks} Marks)`, italics: true }),
              ],
              spacing: { before: 200 },
            }),
            ...(q.type === 'MCQ' ? q.options.map((opt: string, optIdx: number) => 
              new Paragraph({ text: `${String.fromCharCode(65 + optIdx)}) ${opt}`, indent: { left: 720 } })
            ) : []),
          ]),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${paper.title.replace(/\s+/g, '_')}.docx`);
  };

  const downloadPaperPDF = (paper: any) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(paper.title, 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Course: ${paper.course} | Subject: ${paper.subject}`, 105, 30, { align: 'center' });
    doc.text(`Total Marks: ${paper.total_marks || paper.totalMarks} | Duration: ${paper.duration} Min`, 105, 38, { align: 'center' });
    
    let y = 50;
    paper.questions.forEach((q: any, i: number) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.text(`Q${i + 1}. ${q.text} (${q.marks} Marks)`, 14, y);
      y += 7;
      
      if (q.type === 'MCQ') {
        q.options.forEach((opt: string, optIdx: number) => {
          doc.setFont("helvetica", "normal");
          doc.text(`${String.fromCharCode(65 + optIdx)}) ${opt}`, 20, y);
          y += 6;
        });
      }
      y += 5;
    });
    
    doc.save(`${paper.title.replace(/\s+/g, '_')}.pdf`);
  };

  const handleExportDuesPDF = () => {
    const headers = ['Student Name', 'Roll No', 'Total Fee', 'Paid', 'Dues'];
    const data = filteredDues.map(s => [s.name, s.roll, formatCurrency(s.total), formatCurrency(s.paid), formatCurrency(s.dues)]);
    exportToPDF('Dues Fees Report', headers, data, 'Dues_Report');
  };

  const handleExportDuesExcel = () => {
    const data = filteredDues.map(s => ({
      'Student Name': s.name,
      'Roll No': s.roll,
      'Total Fee': s.total,
      'Paid': s.paid,
      'Dues': s.dues
    }));
    exportToExcel(data, 'Dues_Report');
  };

  const filteredDues = duesData.filter(student => {
    const matchesSearch = (student.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (student.roll || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStudent = !filters.student || student.student_id === filters.student;
    
    // Course filter matching
    const matchesCourse = !filters.course || student.course_id === filters.course;
    const matchesBranch = !filters.branch || student.branch === filters.branch;
    
    const matchesYear = !filters.year || student.year === filters.year;
    const matchesSession = !filters.session || student.batch === filters.session;
    
    const dueDate = new Date(student.date || student.created_at).getTime();
    const matchesDate = (!dateRange.start || dueDate >= new Date(dateRange.start).getTime()) && 
                       (!dateRange.end || dueDate <= new Date(dateRange.end).getTime());

    const hasDues = student.dues > 0;
    
    return matchesSearch && matchesStudent && matchesBranch && matchesCourse && matchesYear && matchesSession && matchesDate && hasDues;
  });

  const filteredFinancialData = {
    income: financialData.income.filter(item => {
      const matchesSearch = (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (item.income_categories?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const itemDate = new Date(item.date).getTime();
      const matchesDate = (!dateRange.start || itemDate >= new Date(dateRange.start).getTime()) && 
                         (!dateRange.end || itemDate <= new Date(dateRange.end).getTime());

      // Financials usually don't have course/branch directly unless linked to fees
      // We will skip branch/course for general income unless it's a fee (already in description usually)
      return matchesSearch && matchesDate;
    }),
    expenses: financialData.expenses.filter(item => {
      const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (item.expense_categories?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const itemDate = new Date(item.date).getTime();
      const matchesDate = (!dateRange.start || itemDate >= new Date(dateRange.start).getTime()) && 
                         (!dateRange.end || itemDate <= new Date(dateRange.end).getTime());

      return matchesSearch && matchesDate;
    })
  };

  const filteredExamResults = examResults.filter(result => {
    const matchesSearch = (result.students?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (result.students?.roll_no || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStudent = !filters.student || result.student_id === filters.student;
    
    // Exact match for branch/course
    const matchesBranch = !filters.branch || result.students?.branch === filters.branch;
    const matchesCourse = !filters.course || result.students?.course_id === filters.course;
    
    const matchesYear = !filters.year || result.students?.year === filters.year;
    
    const resultDate = new Date(result.created_at).getTime();
    const matchesDate = (!dateRange.start || resultDate >= new Date(dateRange.start).getTime()) && 
                       (!dateRange.end || resultDate <= new Date(dateRange.end).getTime());
    
    return matchesSearch && matchesStudent && matchesBranch && matchesCourse && matchesYear && matchesDate;
  });

  const handleExportCSV = (data: any[], fileName: string) => {
    exportToExcel(data, fileName); // exportToExcel uses xlsx which generates standard CSV-compatible Excel files
  };

  const renderProfitLoss = () => {
    const totalIncome = filteredFinancialData.income.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalExpenses = filteredFinancialData.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = totalIncome - totalExpenses;

    return (
      <div className="space-y-6">
        <ReportFilters 
          filters={filters} 
          setFilters={setFilters} 
          masterData={masterData} 
          includeDate={true} 
          dateRange={dateRange} 
          setDateRange={setDateRange} 
        />
        <div className="flex items-center justify-end gap-3">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button 
            onClick={() => {
              const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
              const data = [
                ...filteredFinancialData.income.map(i => [formatDate(i.date), i.description || 'Income', i.income_categories?.name, 'CREDIT', formatCurrency(i.amount)]),
                ...filteredFinancialData.expenses.map(e => [formatDate(e.date), e.purpose || e.title, e.expense_categories?.name, 'DEBIT', formatCurrency(e.amount)])
              ];
              exportToPDF('Profit & Loss Report', headers, data, 'Profit_Loss');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-50 transition-all shadow-sm"
          >
            <FileDown className="w-4 h-4" /> PDF
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-emerald-900/50 text-sm font-bold uppercase tracking-wider mb-1">Total Income</h3>
            <p className="text-3xl font-black text-emerald-900">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-rose-900/50 text-sm font-bold uppercase tracking-wider mb-1">Total Expense</h3>
            <p className="text-3xl font-black text-rose-900">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white">
                <PieChart className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-indigo-900/50 text-sm font-bold uppercase tracking-wider mb-1">Net Profit</h3>
            <p className="text-3xl font-black text-indigo-900">{formatCurrency(netProfit)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-800">Recent Transactions</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[...filteredFinancialData.income, ...filteredFinancialData.expenses]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((txn, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <Calendar className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{txn.description || txn.title}</p>
                        <p className="text-xs text-slate-500">{formatDate(txn.date)} • {txn.income_categories?.name || txn.expense_categories?.name || 'General'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-black", filteredFinancialData.income.includes(txn) ? "text-emerald-600" : "text-rose-600")}>
                        {filteredFinancialData.income.includes(txn) ? '+' : '-'}{formatCurrency(txn.amount)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDuesFees = () => (
    <div className="space-y-6">
      <ReportFilters 
        filters={filters} 
        setFilters={setFilters} 
        masterData={masterData} 
        includeDate={true} 
        dateRange={dateRange} 
        setDateRange={setDateRange} 
      />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search student or roll number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button 
            onClick={() => {
              const data = filteredDues.map(s => ({
                'Student Name': s.name,
                'Roll No': s.roll,
                'Branch': s.branch,
                'Year': s.year,
                'Total Fee': s.total,
                'Paid': s.paid,
                'Dues': s.dues,
                'Status': s.status
              }));
              handleExportCSV(data, 'Dues_Report');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> CSV
          </button>
          <button 
            onClick={handleExportDuesPDF}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Roll No</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Fee</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Paid</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dues</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
            {filteredDues.map((student) => (
              <tr key={student.roll} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">
                      {student.name?.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 block">{student.name}</span>
                      <span className="text-[10px] text-slate-400">{masterData.courses.find((c: any) => c.id === student.branch)?.name || student.branch}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{student.roll}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-700">{formatCurrency(student.total)}</td>
                <td className="px-6 py-4 text-sm font-bold text-emerald-600">{formatCurrency(student.paid)}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-sm font-bold",
                    student.dues > 0 ? "text-rose-600" : "text-emerald-600"
                  )}>
                    {formatCurrency(student.dues)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {student.dues > 0 && (
                      <button 
                        onClick={() => sendWhatsAppReminder(student.name, student.dues, student.phone)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Send WhatsApp Reminder"
                      >
                        <Smartphone className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => shareReceiptWhatsApp(student)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Share Receipt via WhatsApp"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={handlePrint}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Print Receipt"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredDues.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                  No records found matching the filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

  const filteredPapers = papers.filter(paper => {
    const matchesSearch = (paper.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (paper.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBranch = !filters.branch || paper.course === masterData.courses.find((c: any) => c.id === filters.branch)?.name || paper.course === filters.branch;
    
    return matchesSearch && matchesBranch;
  });

  const renderExamination = () => {
    const totalExams = papers.length;
    const totalResults = filteredExamResults.length;
    const passedResults = filteredExamResults.filter(r => (r.marks_obtained / (exams.find(e => e.id === r.exam_id)?.total_marks || 100)) >= 0.4).length;
    const passRate = totalResults > 0 ? Math.round((passedResults / totalResults) * 100) : 0;
    const avgScore = totalResults > 0 ? Math.round(filteredExamResults.reduce((sum, r) => sum + (r.marks_obtained / (exams.find(e => e.id === r.exam_id)?.total_marks || 100) * 100), 0) / totalResults) : 0;

    return (
      <div className="space-y-6">
        <ReportFilters filters={filters} setFilters={setFilters} masterData={masterData} />

        <div className="flex items-center justify-end gap-3 mb-4">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Printer className="w-4 h-4" /> Print Results
          </button>
          <button 
            onClick={() => {
              const data = filteredExamResults.map(r => ({
                'Student Name': r.students?.name,
                'Roll No': r.students?.roll_no,
                'Exam': exams.find(e => e.id === r.exam_id)?.title,
                'Marks': r.marks_obtained,
                'Total': exams.find(e => e.id === r.exam_id)?.total_marks,
                'Percentage': ((r.marks_obtained / (exams.find(e => e.id === r.exam_id)?.total_marks || 100)) * 100).toFixed(2),
                'Grade': r.grade || ( (r.marks_obtained / (exams.find(e => e.id === r.exam_id)?.total_marks || 100)) >= 0.4 ? 'PASS' : 'FAIL')
              }));
              handleExportCSV(data, 'Exam_Results');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> CSV
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { title: 'Total Exams', value: totalExams.toString(), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
            { title: 'Avg. Score', value: `${avgScore}%`, icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { title: 'Pass Rate', value: `${passRate}%`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { title: 'Total Results', value: totalResults.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((stat) => (
            <div key={stat.title} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{stat.title}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800">Question Papers</h3>
          <div className="relative max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search papers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {filteredPapers.map((paper) => (
              <div key={paper.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="font-bold text-slate-800">{paper.title}</p>
                  <p className="text-xs text-slate-500">{paper.course} • {paper.subject}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => downloadPaperWord(paper)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Word
                  </button>
                  <button 
                    onClick={() => downloadPaperPDF(paper)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-50 transition-all"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    PDF
                  </button>
                </div>
              </div>
            ))}
            {filteredPapers.length === 0 && (
              <p className="text-center py-8 text-slate-400 italic">No question papers found matching the filters.</p>
            )}
          </div>
        </div>
      </div>
    </div>
    );
  };

  const renderLedger = () => {
    const allTransactions = [
      ...filteredFinancialData.income.map(i => ({ ...i, type: 'CREDIT', desc: i.description || i.title })),
      ...filteredFinancialData.expenses.map(e => ({ ...e, type: 'DEBIT', desc: e.title || e.description }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const ledgerEntries = allTransactions.map(t => {
      if (t.type === 'CREDIT') runningBalance += Number(t.amount);
      else runningBalance -= Number(t.amount);
      return { ...t, balance: runningBalance };
    }).reverse();

    return (
      <div className="space-y-6">
        <ReportFilters 
          filters={filters} 
          setFilters={setFilters} 
          masterData={masterData} 
          includeDate={true} 
          dateRange={dateRange} 
          setDateRange={setDateRange} 
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="relative max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search ledger..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button 
               onClick={() => {
                const data = ledgerEntries.map(e => ({
                  Date: formatDate(e.date),
                  Description: e.desc,
                  Type: e.type,
                  Amount: formatCurrency(e.amount),
                  Balance: formatCurrency(e.balance)
                }));
                handleExportCSV(data, 'Institutional_Ledger');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" /> CSV
            </button>
            <button 
              onClick={() => {
                const headers = ['Date', 'Description', 'Type', 'Amount', 'Balance'];
                const data = ledgerEntries.map(e => [formatDate(e.date), e.desc, e.type, formatCurrency(e.amount), formatCurrency(e.balance)]);
                exportToPDF('Institutional Ledger', headers, data, 'Institutional_Ledger');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              <Download className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Debit (Dr)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Credit (Cr)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
              {ledgerEntries.map((entry, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDate(entry.date)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-700">{entry.desc}</td>
                  <td className="px-6 py-4 text-sm font-bold text-rose-600 text-right">{entry.type === 'DEBIT' ? formatCurrency(entry.amount) : '-'}</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">{entry.type === 'CREDIT' ? formatCurrency(entry.amount) : '-'}</td>
                  <td className="px-6 py-4 text-sm font-black text-slate-800 text-right">{formatCurrency(entry.balance)}</td>
                </tr>
              ))}
              {ledgerEntries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

  const renderPassingReport = () => {
    const totalStudentsCount = filteredExamResults.length;
    const passedStudentsCount = filteredExamResults.filter(r => {
      const exam = exams.find(e => e.id === r.exam_id);
      return (Number(r.marks_obtained) / (exam?.total_marks || 100)) >= 0.4;
    }).length;
    const passPercentageValue = totalStudentsCount > 0 ? (passedStudentsCount / totalStudentsCount) * 100 : 0;
    const topperStudentsCount = filteredExamResults.filter(r => {
      const exam = exams.find(e => e.id === r.exam_id);
      return (Number(r.marks_obtained) / (exam?.total_marks || 100)) >= 0.9;
    }).length;
    const failuresCount = totalStudentsCount - passedStudentsCount;

    return (
      <div className="space-y-6">
        <ReportFilters 
          filters={filters} 
          setFilters={setFilters} 
          masterData={masterData} 
          includeDate={true} 
          dateRange={dateRange} 
          setDateRange={setDateRange} 
        />
        
        <div className="flex items-center justify-end gap-3 mb-4">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Printer className="w-4 h-4" /> Print
          </button>
          {/* ... existing export buttons ... */}
          <button 
             onClick={() => {
              const data = filteredExamResults.map(r => {
                const exam = exams.find(e => e.id === r.exam_id);
                const perc = (r.marks_obtained / (exam?.total_marks || 100)) * 100;
                return {
                  'Student Name': r.students?.name,
                  'Roll No': r.students?.roll_no,
                  'Exam': exam?.title,
                  'Percentage': perc.toFixed(1) + '%',
                  'Grade': r.grade || (perc >= 40 ? 'PASS' : 'FAIL'),
                  'Date': formatDate(r.created_at)
                };
              });
              handleExportCSV(data, 'Passing_Report');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> CSV
          </button>
          <button 
            onClick={() => {
              const headers = ['Student', 'Exam', 'Percentage', 'Status', 'Date'];
              const data = filteredExamResults.map(r => {
                const exam = exams.find(e => e.id === r.exam_id);
                const perc = (r.marks_obtained / (exam?.total_marks || 100)) * 100;
                return [r.students?.name, exam?.title, perc.toFixed(1) + '%', perc >= 40 ? 'PASS' : 'FAIL', formatDate(r.created_at)];
              });
              exportToPDF('Passing Performance Report', headers, data, 'Passing_Report');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">Overall Pass Percentage</h3>
            <div className="flex items-end gap-4">
              <p className="text-4xl font-black text-emerald-600">{passPercentageValue.toFixed(1)}%</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">Toppers Count (90%+)</h3>
            <div className="flex items-end gap-4">
              <p className="text-4xl font-black text-indigo-600">{topperStudentsCount}</p>
              <span className="text-indigo-500 text-sm font-bold mb-1 flex items-center gap-1">
                <Users className="w-4 h-4" />
                Students
              </span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">Failures Count</h3>
            <div className="flex items-end gap-4">
              <p className="text-4xl font-black text-rose-600">{failuresCount}</p>
              <span className="text-rose-500 text-sm font-bold mb-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Requires Attention
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-black text-slate-800">Recent Exam Results</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {examResults.slice(0, 10).map((result, i) => {
                const exam = exams.find(e => e.id === result.exam_id);
                const percentage = (result.marks_obtained / (exam?.total_marks || 100)) * 100;
                return (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-800">{result.students?.name}</p>
                      <p className="text-xs text-slate-500">{exam?.title} • Marks: {result.marks_obtained}/{exam?.total_marks}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-black text-lg", percentage >= 40 ? "text-emerald-600" : "text-rose-600")}>
                        {percentage.toFixed(1)}%
                      </p>
                      <p className="text-[10px] font-bold uppercase text-slate-400">{result.grade || (percentage >= 40 ? 'PASS' : 'FAIL')}</p>
                    </div>
                  </div>
                );
              })}
              {examResults.length === 0 && (
                <p className="text-center py-8 text-slate-400 italic">No exam results found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFineReport = () => {
    const fineFees = duesData.filter(f => {
      const matchesType = f.type?.toLowerCase().includes('fine');
      const matchesBranch = !filters.branch || f.branch === filters.branch;
      const matchesCourse = !filters.course || f.course_id === filters.course;
      const matchesYear = !filters.year || f.year === filters.year;
      return matchesType && matchesBranch && matchesCourse && matchesYear;
    });
    const totalFines = fineFees.reduce((sum, f) => sum + f.total, 0);
    const collectedFines = fineFees.reduce((sum, f) => sum + f.paid, 0);
    const pendingFines = fineFees.reduce((sum, f) => sum + f.dues, 0);

    return (
      <div className="space-y-6">
        <ReportFilters 
          filters={filters} 
          setFilters={setFilters} 
          masterData={masterData} 
          includeDate={true} 
          dateRange={dateRange} 
          setDateRange={setDateRange} 
        />
        
        <div className="flex items-center justify-end gap-3 mb-4">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button 
             onClick={() => {
              const data = fineFees.map(f => ({
                'Student Name': f.name,
                'Roll No': f.roll,
                'Reason': f.type,
                'Amount': f.total,
                'Paid': f.paid,
                'Pending': f.dues,
                'Status': f.dues === 0 ? 'PAID' : 'PENDING'
              }));
              handleExportCSV(data, 'Fine_Report');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> CSV
          </button>
          <button 
            onClick={() => {
              const headers = ['Student', 'Reason', 'Amount', 'Status'];
              const data = fineFees.map(f => [f.name, f.type, formatCurrency(f.total), f.dues === 0 ? 'PAID' : 'PENDING']);
              exportToPDF('Fines & Penalties Report', headers, data, 'Fine_Report');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-rose-50">
              <AlertCircle className="w-5 h-5 text-rose-600" />
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Fines</p>
            <p className="text-2xl font-black text-slate-900">{formatCurrency(totalFines)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-emerald-50">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Collected</p>
            <p className="text-2xl font-black text-slate-900">{formatCurrency(collectedFines)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-amber-50">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Pending</p>
            <p className="text-2xl font-black text-slate-900">{formatCurrency(pendingFines)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
              {fineFees.map((fine, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700">{fine.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{fine.type}</td>
                  <td className="px-6 py-4 text-sm font-black text-rose-600 text-right">{formatCurrency(fine.total)}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      fine.dues === 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {fine.dues === 0 ? 'PAID' : 'PENDING'}
                    </span>
                  </td>
                </tr>
              ))}
              {fineFees.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No fine records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

  const renderIncomeExpense = () => {
    const incomeByCat = masterData.incomeCategories.map((cat: any) => {
      const amount = filteredFinancialData.income
        .filter(i => i.category_id === cat.id)
        .reduce((sum, i) => sum + i.amount, 0);
      return { label: cat.name, amount, color: 'bg-emerald-500' };
    });

    const expenseByCat = masterData.expenseCategories.map((cat: any) => {
      const amount = filteredFinancialData.expenses
        .filter(e => e.category_id === cat.id)
        .reduce((sum, e) => sum + e.amount, 0);
      return { label: cat.name, amount, color: 'bg-rose-500' };
    });

    const totalIncome = incomeByCat.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenseByCat.reduce((sum, e) => sum + e.amount, 0);

    return (
      <div className="space-y-6">
        <ReportFilters 
          filters={filters} 
          setFilters={setFilters} 
          masterData={masterData} 
          includeDate={true} 
          dateRange={dateRange} 
          setDateRange={setDateRange} 
        />
        
        <div className="flex items-center justify-end gap-3 mb-4">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button 
             onClick={() => {
              const data = [
                ...incomeByCat.map(i => ({ Category: i.label, Type: 'Income', Amount: i.amount })),
                ...expenseByCat.map(e => ({ Category: e.label, Type: 'Expense', Amount: e.amount }))
              ];
              handleExportCSV(data, 'Income_Expense_Summary');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> CSV
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Income Sources
            </h3>
            <div className="space-y-4">
              {incomeByCat.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-bold">{item.label}</span>
                    <span className="text-slate-900 font-black">₹{item.amount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn("h-full", item.color)} style={{ width: `${totalIncome > 0 ? (item.amount / totalIncome) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
              {incomeByCat.length === 0 && <p className="text-center text-slate-400 py-4">No income records found.</p>}
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-rose-500" />
              Expense Categories
            </h3>
            <div className="space-y-4">
              {expenseByCat.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-bold">{item.label}</span>
                    <span className="text-slate-900 font-black">₹{item.amount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn("h-full", item.color)} style={{ width: `${totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
              {expenseByCat.length === 0 && <p className="text-center text-slate-400 py-4">No expense records found.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStudentLedger = () => {
    const selectedStudent = masterData.students.find((s: any) => s.id === filters.student);
    
    // Filter fees for this student
    const studentFees = duesData.filter(f => f.student_id === filters.student || (f.roll === selectedStudent?.roll_no && selectedStudent?.roll_no));
    
    const totalFees = studentFees.reduce((sum, f) => sum + Number(f.total), 0);
    const totalPaid = studentFees.reduce((sum, f) => sum + Number(f.paid), 0);
    const outstanding = totalFees - totalPaid;

    const allTxns = studentFees.flatMap(f => {
      const entries = [];
      // The Charge
      entries.push({
        date: f.created_at,
        desc: `${f.type} (Charge)`,
        type: 'DEBIT',
        amount: f.total
      });
      // The Payment (if any)
      if (f.paid > 0) {
        entries.push({
          date: f.date || f.created_at,
          desc: `${f.type} (Payment)`,
          type: 'CREDIT',
          amount: f.paid
        });
      }
      return entries;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = 0;
    const transactions = allTxns.map(t => {
      if (t.type === 'DEBIT') balance += Number(t.amount);
      else balance -= Number(t.amount);
      return { ...t, balance };
    }).reverse();

    return (
      <div className="space-y-6">
        <ReportFilters 
          filters={filters} 
          setFilters={setFilters} 
          masterData={masterData} 
          includeDate={false}
        />
        
        {!filters.student ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800">Select a student to view ledger</h3>
            <p className="text-slate-500">Use the filters above to choose a student.</p>
          </div>
        ) : (
          <>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 text-3xl font-black">
                  {selectedStudent?.name?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{selectedStudent?.name}</h2>
                  <p className="text-slate-500 font-bold">Roll No: {selectedStudent?.roll_no} • {selectedStudent?.branch}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Active Student</span>
                    <span className="text-xs font-bold text-slate-500">Batch: {selectedStudent?.batch}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button 
                  onClick={() => {
                    const data = transactions.map(t => ({
                      Date: formatDate(t.date),
                      Description: t.desc,
                      Type: t.type,
                      Amount: t.amount,
                      Balance: t.balance
                    }));
                    handleExportCSV(data, `Ledger_${selectedStudent?.name}`);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" /> CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Fees</p>
                <p className="text-2xl font-black text-slate-900">{formatCurrency(totalFees)}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Paid</p>
                <p className="text-2xl font-black text-emerald-600">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Outstanding</p>
                <p className="text-2xl font-black text-rose-600">{formatCurrency(outstanding)}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-slate-800">Transaction History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                  {transactions.map((entry, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-500">{formatDate(entry.date)}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">{entry.desc}</td>
                      <td className="px-6 py-4 text-xs font-bold">
                        <span className={cn(
                          "px-2 py-1 rounded-full",
                          entry.type === 'DEBIT' ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          {entry.type}
                        </span>
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-sm font-bold text-right",
                        entry.type === 'DEBIT' ? "text-rose-600" : "text-emerald-600"
                      )}>
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-slate-800 text-right">
                        {formatCurrency(entry.balance)}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                        No transactions found for this student.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}
      </div>
    );
  };

  const renderAdmissionReport = () => {
    const filteredApps = admissionData.filter(app => {
      const matchesSearch = (app.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (app.id || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBranch = !filters.branch || app.branch === filters.branch;
      const matchesCourse = !filters.course || app.course_id === filters.course;
      const matchesStatus = filters.status === 'All' || app.status === filters.status;
      
      const appDate = new Date(app.created_at).getTime();
      const matchesDate = (!dateRange.start || appDate >= new Date(dateRange.start).getTime()) && 
                         (!dateRange.end || appDate <= new Date(dateRange.end).getTime());

      return matchesSearch && matchesBranch && matchesCourse && matchesStatus && matchesDate;
    });

    return (
      <div className="space-y-6">
        <ReportFilters 
          filters={filters} 
          setFilters={setFilters} 
          masterData={masterData} 
          includeDate={true} 
          dateRange={dateRange} 
          setDateRange={setDateRange} 
        />
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search applicants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                const data = filteredApps.map(a => ({
                  ID: a.id,
                  Name: a.full_name,
                  Branch: a.branch,
                  Course: a.courses?.name,
                  Score: a.score,
                  Status: a.status,
                  Date: formatDate(a.created_at)
                }));
                handleExportCSV(data, 'Admission_Report');
              }}
              className="px-4 py-2 bg-white border border-slate-200 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                const headers = ['ID', 'Name', 'Branch', 'Score', 'Status', 'Date'];
                const data = filteredApps.map(a => [a.id, a.full_name, a.branch, a.score, a.status, formatDate(a.created_at)]);
                exportToPDF('Admission Report', headers, data, 'Admission_Report');
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Applicant</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
              {filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold text-xs">
                        {(app.full_name || '').charAt(0)}
                      </div>
                      <span className="font-bold text-slate-700">{app.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-500 text-[10px]">{app.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{app.courses?.name || app.branch}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-700">{app.score}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      app.status === 'Approved' ? "bg-green-50 text-green-600" : 
                      app.status === 'Pending' ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-600"
                    )}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDate(app.created_at)}</td>
                </tr>
              ))}
              {filteredApps.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No admission records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

  const renderContent = () => {
    switch (activeReport) {
      case 'PROFIT_LOSS': return renderProfitLoss();
      case 'DUES_FEES': return renderDuesFees();
      case 'EXAMINATION': return renderExamination();
      case 'LEDGER': return renderLedger();
      case 'PASSING_REPORT': return renderPassingReport();
      case 'INCOME_EXPENSE': return renderIncomeExpense();
      case 'STUDENT_LEDGER': return renderStudentLedger();
      case 'FINE': return renderFineReport();
      case 'ADMISSION_REPORT': return renderAdmissionReport();
      default: return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {REPORT_CATEGORIES.map((category, index) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setActiveReport(category.id)}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all text-left group"
            >
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform", (category.color || '').replace('text-', 'bg-').replace('600', '50'))}>
                <category.icon className={cn("w-7 h-7", category.color)} />
              </div>
              <h3 className="font-black text-slate-800 text-lg mb-2">{category.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{category.description}</p>
              <div className="mt-6 flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Generate Report
                <ChevronRight className="w-4 h-4" />
              </div>
            </motion.button>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {activeReport && (
            <button 
              onClick={() => setActiveReport(null)}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ChevronRight className="w-6 h-6 rotate-180" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {activeReport ? REPORT_CATEGORIES.find(c => c.id === activeReport)?.title : 'Reports & Analytics'}
            </h1>
            <p className="text-slate-500">
              {activeReport ? REPORT_CATEGORIES.find(c => c.id === activeReport)?.description : 'Access comprehensive institutional reports and financial summaries.'}
            </p>
          </div>
        </div>
        {!activeReport && (
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
              <History className="w-4 h-4" />
              Recent Reports
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              <PieChart className="w-4 h-4" />
              Custom Analytics
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeReport || 'dashboard'}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
