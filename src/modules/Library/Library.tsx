import React from 'react';
import { 
  Book, 
  Search, 
  Filter, 
  Plus, 
  ArrowRightLeft, 
  History, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  BookOpen,
  User,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { cn, formatDate } from '../../lib/utils';
import { motion } from 'motion/react';
import { exportToPDF, exportToExcel } from '../../lib/exportUtils';
import { Download, FileText } from 'lucide-react';

const BOOKS = [
  { id: 'BK001', title: 'Introduction to Algorithms', author: 'Cormen et al.', category: 'Computer Science', status: 'AVAILABLE', isbn: '978-0262033848' },
  { id: 'BK002', title: 'Clean Code', author: 'Robert C. Martin', category: 'Software Engineering', status: 'ISSUED', isbn: '978-0132350884', dueDate: '2026-10-20', borrower: 'Rahul Sharma' },
  { id: 'BK003', title: 'The Pragmatic Programmer', author: 'Andrew Hunt', category: 'Software Engineering', status: 'AVAILABLE', isbn: '978-0135957059' },
  { id: 'BK004', title: 'Database System Concepts', author: 'Silberschatz', category: 'Database', status: 'OVERDUE', isbn: '978-0073523323', dueDate: '2026-10-05', borrower: 'Priya Patel' },
  { id: 'BK005', title: 'Artificial Intelligence', author: 'Russell & Norvig', category: 'AI', status: 'AVAILABLE', isbn: '978-0136042594' },
];

export const Library: React.FC = () => {
  const handleExportPDF = () => {
    const headers = ['ID', 'Title', 'Author', 'Category', 'Status', 'ISBN', 'Borrower'];
    const data = BOOKS.map(b => [b.id, b.title, b.author, b.category, b.status, b.isbn, b.borrower || '-']);
    exportToPDF('Library Inventory Report', headers, data, 'Library_Report');
  };

  const handleExportExcel = () => {
    exportToExcel(BOOKS, 'Library_Report');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Library Management</h1>
          <p className="text-slate-500">Manage book inventory, issue/return tracking, and overdue alerts.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
            <History className="w-4 h-4" />
            Issue History
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            <Plus className="w-4 h-4" />
            Add New Book
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Books', value: '15,240', icon: Book, color: 'text-blue-600', bg: 'bg-blue-50' },
          { title: 'Books Issued', value: '1,450', icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { title: 'Overdue Books', value: '45', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { title: 'New Arrivals', value: '120', icon: Plus, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <h3 className="text-slate-500 text-sm font-medium mb-1">{stat.title}</h3>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by title, author, category or ISBN..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors">
            <ArrowRightLeft className="w-4 h-4" />
            Issue / Return Book
          </button>
        </div>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {BOOKS.map((book, i) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-16 bg-slate-100 rounded flex items-center justify-center border border-slate-200">
                <Book className="w-6 h-6 text-slate-400" />
              </div>
              <span className={cn(
                "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                book.status === 'AVAILABLE' ? "bg-green-50 text-green-600" : 
                book.status === 'ISSUED' ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
              )}>
                {book.status}
              </span>
            </div>
            <h3 className="font-bold text-slate-800 mb-1 truncate">{book.title}</h3>
            <p className="text-sm text-slate-500 mb-4">{book.author}</p>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-bold uppercase tracking-wider">ISBN:</span>
                <span>{book.isbn}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-bold uppercase tracking-wider">Category:</span>
                <span>{book.category}</span>
              </div>
            </div>

            {book.status !== 'AVAILABLE' && (
              <div className="p-3 bg-slate-50 rounded-xl mb-4 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <User className="w-3 h-3" />
                    <span>{book.borrower}</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-bold",
                    book.status === 'OVERDUE' ? "text-red-600" : "text-blue-600"
                  )}>
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(book.dueDate!)}</span>
                  </div>
                </div>
              </div>
            )}

            <button className="w-full py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 group">
              View Details
              <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
