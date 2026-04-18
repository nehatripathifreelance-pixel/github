import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Image as ImageIcon, 
  PenTool, 
  MapPin, 
  Shield, 
  Save, 
  CheckCircle2,
  Upload,
  UserCheck,
  Lock,
  Mail,
  Globe,
  Plus,
  Edit2,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, safeLocalStorageSet } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useEffect } from 'react';

export const Settings: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'panels' | 'academic' | 'fees'>('general');
  const [addingItem, setAddingItem] = useState<{ section: 'academic' | 'fees', key: string } | null>(null);
  const [newItemValue, setNewItemValue] = useState('');
  const [editingItemInfo, setEditingItemInfo] = useState<{ section: 'academic' | 'fees', key: string, index: number } | null>(null);
  const [editItemValue, setEditItemValue] = useState('');

  const [generalSettings, setGeneralSettings] = useState(() => {
    const saved = localStorage.getItem('edu_nexus_general_settings');
    return saved ? JSON.parse(saved) : {
      collegeName: 'Sun Group of Institutions',
      address: 'B-10, Industrial Market, Below Sakinaka Metro Station Near Gate Number 5, Sakinaka, Andheri East, Mumbai 400072\nLandmark - Aster Hotel/ Airtel Gallery\n( Near Gate Number 5 of Sakinaka Metro Station)',
      website: 'https://sungroupofinstitution.com',
      email: 'admin@sungroupofinstitution.com',
      phone: '+91 22 1234 5678',
      logo: '',
      signature: ''
    };
  });

  const [academicSettings, setAcademicSettings] = useState(() => {
    const saved = localStorage.getItem('edu_nexus_academic_settings');
    return saved ? JSON.parse(saved) : {
      castes: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      branches: ['Computer Science', 'Information Technology', 'Mechanical', 'Civil', 'Electronics', 'Physiotherapy', 'Biology', 'Medicine', 'Science'],
      courses: ['B.Tech Computer Science', 'B.Tech IT', 'B.Tech Mechanical', 'B.Tech Civil', 'Bachelor of Physiotherapy'],
      sessions: ['2023-24', '2024-25', '2025-26'],
      batches: ['Morning', 'Evening', 'Weekend'],
      semesters: ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester', '1st Year', '2nd Year', '3rd Year', '4th Years'],
      religions: ['Hinduism', 'Islam', 'Christianity', 'Sikhism', 'Buddhism', 'Jainism'],
      categories: ['Regular', 'Lateral Entry', 'Transfer']
    };
  });

  const [feeSettings, setFeeSettings] = useState(() => {
    const saved = localStorage.getItem('edu_nexus_fee_settings');
    return saved ? JSON.parse(saved) : {
      annualStructure: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year'],
      semesterStructure: ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester'],
      paymentSchemes: ['Cash', 'Online (NetBanking, UPI etc)', 'Cheque', 'DD'],
      installmentSystems: ['Monthly', 'Quarterly', 'Annual', 'One Time'],
      upiId: 'mauryaarun033@ybl',
      qrCode: ''
    };
  });

  const [panelCredentials, setPanelCredentials] = useState(() => {
    const saved = localStorage.getItem('edu_nexus_panel_credentials');
    return saved ? JSON.parse(saved) : [
      { role: 'Super Admin', id: 'Dc@18', password: '••••••••', email: 'superadmin@edunexus.edu.in' },
      { role: 'Admin', id: 'admin', password: '••••••••', email: 'admin@edunexus.edu.in' },
      { role: 'Faculty', id: 'faculty', password: '••••••••', email: 'faculty@edunexus.edu.in' },
      { role: 'Principal', id: 'Principal', password: '••••••••', email: 'principal@edunexus.edu.in' },
      { role: 'Accountant', id: 'accountant', password: '••••••••', email: 'accounts@edunexus.edu.in' },
      { role: 'Librarian', id: 'library', password: '••••••••', email: 'library@edunexus.edu.in' },
      { role: 'Staff', id: 'staff', password: '••••••••', email: 'staff@edunexus.edu.in' },
      { role: 'Student', id: 'student', password: '••••••••', email: 'student@edunexus.edu.in' },
      { role: 'Parent', id: 'parent', password: '••••••••', email: 'parent@edunexus.edu.in' },
    ];
  });

  const [isCredModalOpen, setIsCredModalOpen] = useState(false);
  const [editingCred, setEditingCred] = useState<{ role: string, id: string, password: string, email: string, name?: string } | null>(null);
  const [credForm, setCredForm] = useState({
    role: '',
    id: '',
    password: '',
    email: '',
    name: ''
  });

  const handleOpenCredModal = (cred?: any, index?: number) => {
    if (cred) {
      setEditingCred({ ...cred, index });
      setCredForm({
        role: cred.role,
        id: cred.id,
        password: cred.password,
        email: cred.email || '',
        name: cred.name || ''
      });
    } else {
      setEditingCred(null);
      setCredForm({
        role: '',
        id: '',
        password: '',
        email: '',
        name: ''
      });
    }
    setIsCredModalOpen(true);
  };

  const handleSaveCred = async () => {
    if (!credForm.id || !credForm.role) {
      alert('Role and ID are required');
      return;
    }

    try {
      const credData = {
        id: credForm.id,
        password: credForm.password,
        role: credForm.role,
        name: credForm.name || credForm.id,
        email: credForm.email || ''
      };

      const { error } = await supabase
        .from('user_credentials')
        .upsert(credData);

      if (error) {
        alert(`Failed to save credential: ${error.message}`);
        return;
      }

      await fetchSettings(); // Refresh list
      setIsCredModalOpen(false);
    } catch (err: any) {
      alert(`An unexpected error occurred: ${err.message || 'Unknown error'}`);
    }
  };

  const deletePanel = async (index: number) => {
    const panel = panelCredentials[index];
    if (window.confirm(`Are you sure you want to delete the ${panel.role} credential?`)) {
      const { error } = await supabase
        .from('user_credentials')
        .delete()
        .eq('id', panel.id);
      
      if (error) {
        alert(`Failed to delete credential: ${error.message}`);
      } else {
        await fetchSettings();
      }
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('app_settings').select('*');
    if (error) {
      console.error('Error fetching settings:', error);
    } else if (data) {
      data.forEach(item => {
        if (item.key === 'general') setGeneralSettings(item.value);
        if (item.key === 'academic') setAcademicSettings(item.value);
        if (item.key === 'fees') setFeeSettings(item.value);
      });
    }

    // Fetch credentials from user_credentials table
    const { data: creds, error: credError } = await supabase
      .from('user_credentials')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (credError) {
      console.error('Error fetching credentials:', credError);
    } else if (creds) {
      setPanelCredentials(creds);
    }
  };

  const saveToSupabase = async (key: string, value: any) => {
    const { error } = await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) console.error(`Error saving ${key} settings:`, error);
  };

  const handleFileUpload = (type: 'logo' | 'signature' | 'qrCode') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (type === 'qrCode') {
            setFeeSettings(prev => ({ ...prev, qrCode: event.target?.result as string }));
          } else {
            setGeneralSettings(prev => ({
              ...prev,
              [type]: event.target?.result as string
            }));
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Save to local storage
    safeLocalStorageSet('edu_nexus_general_settings', generalSettings);
    safeLocalStorageSet('edu_nexus_academic_settings', academicSettings);
    safeLocalStorageSet('edu_nexus_fee_settings', feeSettings);
    safeLocalStorageSet('edu_nexus_panel_credentials', panelCredentials);

    // Save to Supabase
    await Promise.all([
      saveToSupabase('general', generalSettings),
      saveToSupabase('academic', academicSettings),
      saveToSupabase('fees', feeSettings)
    ]);

    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const addItem = (section: 'academic' | 'fees', key: string) => {
    setAddingItem({ section, key });
    setNewItemValue('');
  };

  const confirmAddItem = () => {
    if (newItemValue && addingItem) {
      const { section, key } = addingItem;
      if (section === 'academic') {
        setAcademicSettings(prev => ({ ...prev, [key]: [...(prev[key as keyof typeof academicSettings] as string[]), newItemValue] }));
      } else {
        setFeeSettings(prev => ({ ...prev, [key]: [...(prev[key as keyof typeof feeSettings] as string[]), newItemValue] }));
      }
      setAddingItem(null);
      setNewItemValue('');
    }
  };

  const deleteItem = (section: 'academic' | 'fees', key: string, index: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      if (section === 'academic') {
        const newList = [...(academicSettings[key as keyof typeof academicSettings] as string[])];
        newList.splice(index, 1);
        setAcademicSettings(prev => ({ ...prev, [key]: newList }));
      } else {
        const newList = [...(feeSettings[key as keyof typeof feeSettings] as string[])];
        newList.splice(index, 1);
        setFeeSettings(prev => ({ ...prev, [key]: newList }));
      }
    }
  };

  const editItem = (section: 'academic' | 'fees', key: string, index: number) => {
    const currentValue = section === 'academic' 
      ? (academicSettings[key as keyof typeof academicSettings] as string[])[index]
      : (feeSettings[key as keyof typeof feeSettings] as string[])[index];
    
    setEditingItemInfo({ section, key, index });
    setEditItemValue(currentValue);
  };

  const confirmEditItem = () => {
    if (editItemValue && editingItemInfo) {
      const { section, key, index } = editingItemInfo;
      if (section === 'academic') {
        const newList = [...(academicSettings[key as keyof typeof academicSettings] as string[])];
        newList[index] = editItemValue;
        setAcademicSettings(prev => ({ ...prev, [key]: newList }));
      } else {
        const newList = [...(feeSettings[key as keyof typeof feeSettings] as string[])];
        newList[index] = editItemValue;
        setFeeSettings(prev => ({ ...prev, [key]: newList }));
      }
      setEditingItemInfo(null);
      setEditItemValue('');
    }
  };

  const handleFeeChange = (key: keyof typeof feeSettings, value: string) => {
    if (key === 'upiId') {
      setFeeSettings(prev => ({ ...prev, [key]: value }));
    }
  };

  const ListManager = ({ section, title, items, settingsKey }: { section: 'academic' | 'fees', title: string, items: string[], settingsKey: string }) => (
    <div className="space-y-4 bg-primary/5 p-6 rounded-2xl border border-primary/10">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-primary uppercase tracking-wider">{title}</h4>
        <button 
          onClick={() => addItem(section, settingsKey)}
          className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {addingItem?.section === section && addingItem?.key === settingsKey && (
        <div className="flex items-center gap-2">
          <input 
            type="text"
            autoFocus
            value={newItemValue}
            onChange={(e) => setNewItemValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmAddItem()}
            placeholder="Enter value..."
            className="flex-1 px-3 py-1.5 bg-white border border-primary/20 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button onClick={confirmAddItem} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => setAddingItem(null)} className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <div key={index} className="flex flex-col gap-2">
            {editingItemInfo?.section === section && editingItemInfo?.key === settingsKey && editingItemInfo?.index === index ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  autoFocus
                  value={editItemValue}
                  onChange={(e) => setEditItemValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmEditItem()}
                  className="px-3 py-1.5 bg-white border border-primary/20 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button onClick={confirmEditItem} className="p-1 text-green-500 hover:bg-green-50 rounded-lg">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setEditingItemInfo(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-primary/10 group shadow-sm">
                <span className="text-sm font-medium text-slate-700">{item}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => editItem(section, settingsKey, index)}
                    className="p-1 text-slate-400 hover:text-primary transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => deleteItem(section, settingsKey, index)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">System Settings</h1>
          <p className="text-slate-500">Configure application-wide settings and panel credentials.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20",
            isSaving && "opacity-80 cursor-not-allowed"
          )}
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Save Changes
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-primary/5 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('general')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'general' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-primary"
          )}
        >
          <SettingsIcon className="w-4 h-4" />
          General Settings
        </button>
        <button 
          onClick={() => setActiveTab('academic')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'academic' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-primary"
          )}
        >
          <UserCheck className="w-4 h-4" />
          Academic Setup
        </button>
        <button 
          onClick={() => setActiveTab('fees')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'fees' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-primary"
          )}
        >
          <PenTool className="w-4 h-4" />
          Fee Configuration
        </button>
        <button 
          onClick={() => setActiveTab('panels')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'panels' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-primary"
          )}
        >
          <Shield className="w-4 h-4" />
          Panel Credentials
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'general' ? (
          <motion.div 
            key="general"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Logo & Signature Section */}
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-3xl border border-primary/10 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Institution Logo
                </h3>
                <div className="flex flex-col items-center gap-4">
                  <div 
                    onClick={() => handleFileUpload('logo')}
                    className="w-32 h-32 bg-primary/5 border-2 border-dashed border-primary/20 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-primary/40 hover:text-primary transition-all cursor-pointer group overflow-hidden"
                  >
                    {generalSettings.logo ? (
                      <img src={generalSettings.logo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold">Upload Logo</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">Recommended: 512x512px (PNG/SVG)</p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-primary/10 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <PenTool className="w-5 h-5" />
                  Official Signature
                </h3>
                <div className="flex flex-col items-center gap-4">
                  <div 
                    onClick={() => handleFileUpload('signature')}
                    className="w-full h-32 bg-primary/5 border-2 border-dashed border-primary/20 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-primary/40 hover:text-primary transition-all cursor-pointer group overflow-hidden"
                  >
                    {generalSettings.signature ? (
                      <img src={generalSettings.signature} alt="Signature" className="w-full h-full object-contain" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold">Upload Signature</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">Clear image of Principal's signature</p>
                </div>
              </div>
            </div>

            {/* Address & Contact Section */}
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-primary/10 shadow-sm space-y-8">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Institution Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Institution Name</label>
                  <input 
                    type="text" 
                    value={generalSettings.collegeName}
                    onChange={(e) => setGeneralSettings({...generalSettings, collegeName: e.target.value})}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Official Address</label>
                  <textarea 
                    rows={3}
                    value={generalSettings.address}
                    onChange={(e) => setGeneralSettings({...generalSettings, address: e.target.value})}
                    className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Website URL</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="url" 
                      value={generalSettings.website}
                      onChange={(e) => setGeneralSettings({...generalSettings, website: e.target.value})}
                      className="w-full pl-11 pr-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Official Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="email" 
                      value={generalSettings.email}
                      onChange={(e) => setGeneralSettings({...generalSettings, email: e.target.value})}
                      className="w-full pl-11 pr-4 py-3 bg-background border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'academic' ? (
          <motion.div 
            key="academic"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-3xl border border-primary/10 shadow-sm space-y-8"
          >
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Academic Master Data
            </h3>
            <p className="text-sm text-slate-500">Manage master lists for academic records. Click + to add, hover to edit/delete.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { label: 'Caste List', key: 'castes' },
                { label: 'Branches', key: 'branches' },
                { label: 'Courses', key: 'courses' },
                { label: 'Sessions', key: 'sessions' },
                { label: 'Batches', key: 'batches' },
                { label: 'Semesters', key: 'semesters' },
                { label: 'Religions', key: 'religions' },
                { label: 'Categories', key: 'categories' }
              ].map((item) => (
                <ListManager 
                  section="academic"
                  title={item.label}
                  items={academicSettings[item.key as keyof typeof academicSettings] as string[]}
                  settingsKey={item.key}
                />
              ))}
            </div>
          </motion.div>
        ) : activeTab === 'fees' ? (
          <motion.div 
            key="fees"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="bg-white p-8 rounded-3xl border border-primary/10 shadow-sm space-y-8">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <PenTool className="w-5 h-5" />
                Fee Structure Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ListManager 
                  section="fees"
                  title="Annual Exam Course Structure"
                  items={feeSettings.annualStructure}
                  settingsKey="annualStructure"
                />
                <ListManager 
                  section="fees"
                  title="Semester Exam Pattern Structure"
                  items={feeSettings.semesterStructure}
                  settingsKey="semesterStructure"
                />
                <ListManager 
                  section="fees"
                  title="Payment Schemes"
                  items={feeSettings.paymentSchemes}
                  settingsKey="paymentSchemes"
                />
                <ListManager 
                  section="fees"
                  title="Installment Systems"
                  items={feeSettings.installmentSystems}
                  settingsKey="installmentSystems"
                />
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-primary/10 shadow-sm space-y-8">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Payment Gateway (UPI)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">UPI ID for Collection</label>
                    <input 
                      type="text" 
                      value={feeSettings.upiId}
                      onChange={(e) => handleFeeChange('upiId', e.target.value)}
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <p className="text-xs text-slate-500 italic">
                    Note: This UPI ID will be used for all online payment collections. 
                    The QR code will be generated based on this ID.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <div 
                    onClick={() => handleFileUpload('qrCode')}
                    className="w-32 h-32 bg-primary/5 border-2 border-dashed border-primary/20 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-primary/40 hover:text-primary transition-all cursor-pointer group overflow-hidden"
                  >
                    {feeSettings.qrCode ? (
                      <img src={feeSettings.qrCode} alt="QR Code" className="w-full h-full object-contain" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold text-center px-2">Upload QR Code</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 text-center uppercase font-bold">Payment QR Code</p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="panels"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-3xl border border-primary/10 shadow-sm overflow-hidden"
          >
            <div className="p-8 border-b border-primary/10 bg-primary/5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Panel Access Configuration
                </h3>
                <p className="text-sm text-slate-500 mt-1">Manage login credentials for all user roles.</p>
              </div>
              <button 
                onClick={() => handleOpenCredModal()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Role
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-primary/10">
                    <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User Role</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Login ID</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Password</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {panelCredentials.map((panel, index) => (
                    <tr key={index} className="hover:bg-primary/5 transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-sm text-primary">{panel.role}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-sm font-medium text-slate-700">{panel.name || '-'}</td>
                      <td className="px-8 py-4 text-sm font-mono font-bold text-slate-600">{panel.id}</td>
                      <td className="px-8 py-4 text-sm text-slate-500">••••••••</td>
                      <td className="px-8 py-4 text-sm text-slate-500">{panel.email || '-'}</td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenCredModal(panel, index)}
                            className="p-2 text-slate-400 hover:text-primary transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {panel.role !== 'Super Admin' && panel.role !== 'Admin' ? (
                            <button 
                              onClick={() => deletePanel(index)}
                              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <div className="p-2 text-slate-200 cursor-not-allowed">
                              <Lock className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credential Modal */}
      <AnimatePresence>
        {isCredModalOpen && (
          <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-primary/5">
                <h2 className="text-2xl font-black text-primary">{editingCred ? 'Edit Credential' : 'New Credential'}</h2>
                <button onClick={() => setIsCredModalOpen(false)} className="p-2 hover:bg-white rounded-xl"><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">User Role</label>
                    <input 
                      type="text" 
                      value={credForm.role}
                      disabled={editingCred && (editingCred.role === 'Super Admin' || editingCred.role === 'Admin')}
                      onChange={(e) => setCredForm({...credForm, role: e.target.value})}
                      placeholder="e.g. Faculty, Accountant"
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                    <input 
                      type="text" 
                      value={credForm.name}
                      onChange={(e) => setCredForm({...credForm, name: e.target.value})}
                      placeholder="Enter full name"
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Login ID</label>
                    <input 
                      type="text" 
                      value={credForm.id}
                      onChange={(e) => setCredForm({...credForm, id: e.target.value})}
                      placeholder="Enter login ID"
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                    <input 
                      type="text" 
                      value={credForm.password}
                      onChange={(e) => setCredForm({...credForm, password: e.target.value})}
                      placeholder="Enter password"
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                    <input 
                      type="email" 
                      value={credForm.email}
                      onChange={(e) => setCredForm({...credForm, email: e.target.value})}
                      placeholder="Enter email"
                      className="w-full px-4 py-3 bg-background border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="p-8 bg-slate-50 flex items-center justify-end gap-3">
                <button onClick={() => setIsCredModalOpen(false)} className="px-6 py-3 text-slate-500 font-bold">Cancel</button>
                <button onClick={handleSaveCred} className="px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20">Save</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 z-50 bg-primary text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold">Settings Saved!</p>
              <p className="text-xs text-white/80">System configuration has been updated.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
