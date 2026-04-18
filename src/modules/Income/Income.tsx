import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Filter, 
  Download, 
  FileText,
  Calendar,
  Wallet,
  ArrowUpRight,
  Tag,
  MoreVertical,
  X,
  Save,
  AlertTriangle
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import { supabase, testSupabaseConnection } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { exportToPDF, exportToExcel } from '../../lib/exportUtils';

interface IncomeCategory {
  id: string;
  name: string;
  description: string;
}

interface IncomeTransaction {
  id: string;
  category_id: string;
  category_name?: string;
  amount: number;
  date: string;
  description: string;
  reference_id?: string;
  payment_method: string;
}

export const Income: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'categories'>('transactions');
  const [transactions, setTransactions] = useState<IncomeTransaction[]>([]);
  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<IncomeTransaction | null>(null);
  const [editingCategory, setEditingCategory] = useState<IncomeCategory | null>(null);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message?: string; details?: string }>({ connected: true });
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState<Partial<IncomeTransaction>>({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    payment_method: 'Cash'
  });

  const [categoryForm, setCategoryForm] = useState<Partial<IncomeCategory>>({
    name: '',
    description: ''
  });

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const result = await testSupabaseConnection();
      setDbStatus(result);
      if (result.connected) {
        await Promise.all([
          fetchCategories(),
          fetchTransactions()
        ]);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from('income_categories').select('*').order('name');
    if (data) setCategories(data);
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('income')
      .select('*, income_categories(name)')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching income transactions:', error);
      // Try fallback fetch without join if join fails
      const { data: simpleData } = await supabase
        .from('income')
        .select('*')
        .order('date', { ascending: false });
      
      if (simpleData) {
        setTransactions(simpleData.map(t => ({
          ...t,
          category_name: categories.find(c => c.id === t.category_id)?.name || 'Uncategorized'
        })));
      }
      return;
    }

    if (data) {
      setTransactions(data.map(t => ({
        ...t,
        category_name: t.income_categories?.name || 'Uncategorized'
      })));
    }
  };

  const handleSave = async () => {
    if (!form.amount || !form.category_id) {
      alert('Please fill in all required fields (Amount and Category)');
      return;
    }

    const data = {
      category_id: form.category_id,
      amount: Number(form.amount),
      date: form.date || new Date().toISOString().split('T')[0],
      description: form.description || '',
      payment_method: form.payment_method || 'Cash'
    };

    let error;
    if (editingTxn) {
      const { error: err } = await supabase.from('income').update(data).eq('id', editingTxn.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('income').insert(data);
      error = err;
    }

    if (error) {
      console.error('Error saving income:', error);
      alert('Failed to save income record. ' + error.message);
    } else {
      await fetchTransactions();
      setIsModalOpen(false);
      setEditingTxn(null);
      setForm({ amount: 0, date: new Date().toISOString().split('T')[0], description: '', payment_method: 'Cash' });
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name) return;

    if (editingCategory) {
      await supabase.from('income_categories').update(categoryForm).eq('id', editingCategory.id);
    } else {
      await supabase.from('income_categories').insert(categoryForm);
    }

    await fetchCategories();
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      await supabase.from('income').delete().eq('id', id);
      await fetchTransactions();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      await supabase.from('income_categories').delete().eq('id', id);
      await fetchCategories();
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.category_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || t.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      {/* Database Connection Warning */}
      {!dbStatus.connected && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex flex-col gap-1 text-rose-700 font-medium"
        >
          <div className="flex items-center gap-3 font-medium">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              {dbStatus.message || 'Database connection failed.'}
            </p>
          </div>
          {dbStatus.details && (
            <p className="text-xs text-rose-600 ml-8 opacity-80 font-normal">
              {dbStatus.details}
            </p>
          )}
          <div className="flex items-center gap-4 ml-8 mt-2">
            <button 
              onClick={() => window.location.reload()}
              className="text-xs bg-rose-100 hover:bg-rose-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              Retry Connection
            </button>
            <a 
              href="/settings" 
              className="text-xs bg-white hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors"
            >
              Check DB Settings
            </a>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Income Management</h1>
          <p className="text-slate-500">Track all sources of income and manage categories.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'transactions' ? (
            <button 
              onClick={() => {
                setEditingTxn(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
            >
              <Plus className="w-4 h-4" />
              Add Income
            </button>
          ) : (
            <button 
              onClick={() => {
                setEditingCategory(null);
                setIsCategoryModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              <Plus className="w-4 h-4" />
              New Category
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('transactions')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeTab === 'transactions' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <TrendingUp className="w-4 h-4" />
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeTab === 'categories' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Tag className="w-4 h-4" />
          Categories
        </button>
      </div>

      {activeTab === 'transactions' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full text-green-600 bg-green-50">
                  <ArrowUpRight className="w-3 h-3" />
                  +15%
                </div>
              </div>
              <h3 className="text-slate-500 text-sm font-medium mb-1">Total Income (MTD)</h3>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(transactions.reduce((acc, t) => acc + t.amount, 0))}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
              <div className="relative w-full sm:max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="All">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(t.date)}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase">
                        {t.category_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-800 font-medium">{t.description}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{t.payment_method}</td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">{formatCurrency(t.amount)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingTxn(t);
                            setForm(t);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div key={category.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Tag className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingCategory(category);
                      setCategoryForm(category);
                      setIsCategoryModalOpen(true);
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteCategory(category.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{category.name}</h3>
              <p className="text-sm text-slate-500 line-clamp-2">{category.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Income Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
                <h3 className="text-lg font-bold text-emerald-900">{editingTxn ? 'Edit Income' : 'Add New Income'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-emerald-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-emerald-600" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Amount</label>
                    <input 
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                    <input 
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                  <select 
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Payment Method</label>
                  <select 
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                  <textarea 
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                    placeholder="Enter details..."
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 text-sm font-bold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                >
                  <Save className="w-4 h-4" />
                  {editingTxn ? 'Update Income' : 'Save Income'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
                <h3 className="text-lg font-bold text-indigo-900">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
                <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-indigo-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-indigo-600" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Category Name</label>
                  <input 
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    placeholder="e.g. Tuition Fees, Grants, etc."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                  <textarea 
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                    placeholder="Enter category details..."
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button 
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-slate-600 text-sm font-bold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveCategory}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                  <Save className="w-4 h-4" />
                  {editingCategory ? 'Update Category' : 'Save Category'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
