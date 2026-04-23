import React, { useState, useEffect } from 'react';
import { Megaphone, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface NoticeTickerProps {
  audience: 'All' | 'Students' | 'Parents' | 'Staff' | 'Admin';
}

export const NoticeTicker: React.FC<NoticeTickerProps> = ({ audience }) => {
  const [notices, setNotices] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    fetchLatestNotices();

    const channel = supabase
      .channel(`notices_ticker_${audience}_${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notices' 
      }, (payload) => {
        if (audience === 'Admin' || payload.new.audience === 'All' || payload.new.audience === audience) {
          setNotices(prev => [payload.new, ...prev]);
          setIsVisible(true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [audience]);

  const fetchLatestNotices = async () => {
    let query = supabase
      .from('notices')
      .select('*')
      .eq('is_template', false);
    
    if (audience !== 'Admin') {
      query = query.or(`audience.eq.All,audience.eq.${audience}`);
    }

    const { data } = await query
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) setNotices(data);
  };

  if (!notices.length || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="mb-8 pointer-events-none"
      >
        <div className="pointer-events-auto">
          <div className="bg-primary/95 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 overflow-hidden relative group border border-white/20">
            <div className="flex items-center gap-2 shrink-0 bg-white/10 px-3 py-1 rounded-lg">
              <Megaphone className="w-4 h-4 animate-bounce" />
              <span className="text-[10px] font-black uppercase tracking-widest">Broadcast</span>
            </div>
            
            <div className="flex-1 overflow-hidden relative h-6">
              <div className="flex gap-12 animate-scroll whitespace-nowrap">
                {notices.map((notice, i) => (
                  <div key={notice.id} className="flex items-center gap-2">
                    <span className="font-bold text-sm">【{notice.title}】</span>
                    <span className="text-sm opacity-90">{notice.content}</span>
                    {i < notices.length - 1 && <span className="text-white/30">|</span>}
                  </div>
                ))}
                {/* Duplicate for seamless scrolling */}
                {notices.map((notice, i) => (
                  <div key={`${notice.id}-dup`} className="flex items-center gap-2">
                    <span className="font-bold text-sm">【{notice.title}】</span>
                    <span className="text-sm opacity-90">{notice.content}</span>
                    {i < notices.length - 1 && <span className="text-white/30">|</span>}
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>

            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes scroll {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              .animate-scroll {
                animation: scroll 30s linear infinite;
              }
              .animate-scroll:hover {
                animation-play-state: paused;
              }
            `}} />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
