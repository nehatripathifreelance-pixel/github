import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Plus, 
  Search, 
  Trash2, 
  Bell, 
  Target, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  X,
  MessageSquare,
  Send,
  Volume2,
  FileText,
  Copy
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

export const Communication: React.FC = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBroadcastLoading, setIsBroadcastLoading] = useState(false);
  const [activeView, setActiveView] = useState<'history' | 'templates'>('history');
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'Notice',
    audience: 'All',
    is_template: false
  });

  useEffect(() => {
    fetchNotices();
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('notices')
      .select('*')
      .eq('is_template', true)
      .order('created_at', { ascending: false });
    if (data) setTemplates(data);
  };

  const fetchNotices = async () => {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else setNotices(data || []);
  };

  const handleCreateNotice = async () => {
    if (!form.title || !form.content) {
      alert('Please fill in title and content');
      return;
    }

    setIsBroadcastLoading(true);
    try {
      const { error } = await supabase.from('notices').insert([{
        ...form,
        created_by: user?.id
      }]);

      if (error) throw error;

      setIsModalOpen(false);
      setForm({ title: '', content: '', type: 'Notice', audience: 'All', is_template: false });
      await Promise.all([fetchNotices(), fetchTemplates()]);
      alert(form.is_template ? 'Template saved!' : 'Notice broadcasted successfully!');
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsBroadcastLoading(false);
    }
  };

  const useTemplate = (template: any) => {
    setForm({
      title: template.title,
      content: template.content,
      type: template.type,
      audience: template.audience,
      is_template: false
    });
    setIsModalOpen(true);
  };

  const deleteNotice = async (id: string) => {
    if (window.confirm('Delete this notice?')) {
      await supabase.from('notices').delete().eq('id', id);
      fetchNotices();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Communication Center</h1>
          <p className="text-slate-500">Broadcast messages and share notices with parents and students.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          New Broadcast
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-4 p-1 bg-primary/5 w-fit rounded-2xl mb-2">
            <button 
              onClick={() => setActiveView('history')}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black transition-all",
                activeView === 'history' ? "bg-white text-primary shadow-sm" : "text-slate-400"
              )}
            >
              History
            </button>
            <button 
              onClick={() => setActiveView('templates')}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black transition-all",
                activeView === 'templates' ? "bg-white text-primary shadow-sm" : "text-slate-400"
              )}
            >
              Templates
            </button>
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              {activeView === 'history' ? (
                <><History className="w-6 h-6 text-primary" /> Broadcasting History</>
              ) : (
                <><FileText className="w-6 h-6 text-primary" /> Notice Templates</>
              )}
            </h2>
            
            <div className="space-y-4">
              {activeView === 'history' ? (
                notices.filter(n => !n.is_template).map((notice) => (
                  <div key={notice.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group relative">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center",
                          notice.type === 'Notice' ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                        )}>
                          <Bell className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">{notice.title}</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{formatDate(notice.created_at)} • To: {notice.audience}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => setForm({...notice, is_template: true, id: undefined})}
                          className="p-2 text-slate-300 hover:text-primary"
                          title="Save as Template"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteNotice(notice.id)}
                          className="p-2 text-slate-300 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-slate-600 leading-relaxed font-medium">{notice.content}</p>
                  </div>
                ))
              ) : (
                templates.map((template) => (
                  <div key={template.id} className="p-6 border-2 border-dashed border-primary/10 rounded-3xl group hover:border-primary/30 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">{template.title}</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type: {template.type} • Target: {template.audience}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => useTemplate(template)}
                          className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/10"
                        >
                          Use Template
                        </button>
                        <button 
                          onClick={() => deleteNotice(template.id)}
                          className="p-2 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-slate-500 line-clamp-2">{template.content}</p>
                  </div>
                ))
              )}

              {((activeView === 'history' && notices.length === 0) || (activeView === 'templates' && templates.length === 0)) && (
                <div className="py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                    <MessageSquare className="w-10 h-10 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-bold italic">No {activeView} found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
            <Megaphone className="w-32 h-32 absolute -right-8 -bottom-8 opacity-10" />
            <h3 className="text-xl font-black mb-4">Quick Broadcast</h3>
            <p className="text-indigo-100 text-sm mb-8 leading-relaxed">
              Send immediate notifications to parents. Targeted audience will receive instantaneous updates and notification sounds.
            </p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black shadow-lg hover:bg-indigo-50 transition-all"
            >
              Compose Message
            </button>
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
            <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Audience Groups
            </h3>
            <div className="space-y-3">
              {['All', 'Parents', 'Students', 'Staff'].map(group => (
                <div key={group} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm font-bold text-slate-700">{group}</span>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 bg-primary/5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-primary">Compose Broadcast</h2>
                  <p className="text-slate-500 text-sm font-bold">Blast notifications to your audience.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white rounded-2xl transition-all">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Type</label>
                    <select 
                      value={form.type}
                      onChange={(e) => setForm({...form, type: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      <option value="Notice">Official Notice</option>
                      <option value="Announcement">General Announcement</option>
                      <option value="Broadcast">Urgent Broadcast</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Audience</label>
                    <select 
                      value={form.audience}
                      onChange={(e) => setForm({...form, audience: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      <option value="All">Everyone</option>
                      <option value="Parents">Parents Only</option>
                      <option value="Students">Students Only</option>
                      <option value="Staff">Faculty Only</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Subject</label>
                  <input 
                    type="text" 
                    placeholder="Briefly describe the topic..."
                    value={form.title}
                    onChange={(e) => setForm({...form, title: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Message Body</label>
                  <textarea 
                    rows={5}
                    placeholder="Write your message here..."
                    value={form.content}
                    onChange={(e) => setForm({...form, content: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                  />
                </div>
                <div className="flex items-center gap-2 p-2 px-4 bg-slate-50 rounded-2xl">
                  <input 
                    type="checkbox" 
                    id="is_template"
                    checked={form.is_template}
                    onChange={(e) => setForm({...form, is_template: e.target.checked})}
                    className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                  />
                  <label htmlFor="is_template" className="text-xs font-bold text-slate-600 cursor-pointer">Save this broadcast as a reusable template</label>
                </div>
                <button 
                  onClick={handleCreateNotice}
                  disabled={isBroadcastLoading}
                  className="w-full py-4 bg-primary text-white rounded-[24px] font-black shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isBroadcastLoading ? (
                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Blast Broadcast Now
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

const History: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
);

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
