import React from 'react';
import { 
  Clock, 
  Settings, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface AttendanceSettingsProps {
  settings: {
    startTime: string;
    lateThreshold: string;
    absentThreshold: string;
  };
  onSave: (newSettings: any) => void;
}

export const AttendanceSettings: React.FC<AttendanceSettingsProps> = ({ settings, onSave }) => {
  const [localSettings, setLocalSettings] = React.useState(settings);

  const handleSave = () => {
    onSave(localSettings);
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900">Attendance Rules</h3>
          <p className="text-slate-500 text-sm">Configure timing thresholds for marking status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            Class Start Time
          </label>
          <div className="relative">
            <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="time" 
              value={localSettings.startTime}
              onChange={(e) => setLocalSettings({ ...localSettings, startTime: e.target.value })}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
            />
          </div>
          <p className="text-[10px] text-slate-400">Attendance marked before this time is "Present"</p>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <AlertCircle className="w-3 h-3 text-amber-500" />
            Late Threshold
          </label>
          <div className="relative">
            <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="time" 
              value={localSettings.lateThreshold}
              onChange={(e) => setLocalSettings({ ...localSettings, lateThreshold: e.target.value })}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
            />
          </div>
          <p className="text-[10px] text-slate-400">Attendance marked after this time is "Late"</p>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <XCircle className="w-3 h-3 text-red-500" />
            Absent Threshold
          </label>
          <div className="relative">
            <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="time" 
              value={localSettings.absentThreshold}
              onChange={(e) => setLocalSettings({ ...localSettings, absentThreshold: e.target.value })}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
            />
          </div>
          <p className="text-[10px] text-slate-400">Attendance marked after this time is "Absent"</p>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
        >
          <Save className="w-4 h-4" />
          Save Rules
        </button>
      </div>
    </div>
  );
};
