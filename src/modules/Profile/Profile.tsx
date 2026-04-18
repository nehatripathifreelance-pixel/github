import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  MapPin, 
  Phone, 
  Camera,
  Save,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    bio: ''
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name,
        email: user.email || ''
      }));
    }
  }, [user]);

  const handleSave = async () => {
    // In a real app, we would update the user profile in Supabase
    setIsEditing(false);
    alert('Profile updated successfully!');
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-primary tracking-tight">My Profile</h1>
        <p className="text-slate-500">Manage your personal information and account settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm text-center">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="w-full h-full bg-primary/10 rounded-[32px] flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} 
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <button className="absolute -bottom-2 -right-2 p-3 bg-primary text-white rounded-2xl shadow-lg hover:scale-110 transition-transform">
                <Camera className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-2xl font-black text-slate-800">{user.name}</h2>
            <p className="text-sm font-bold text-primary uppercase tracking-widest mt-1">{user.role?.replace('_', ' ')}</p>
            
            <div className="mt-8 pt-8 border-t border-slate-50 space-y-4">
              <div className="flex items-center gap-3 text-slate-600">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">ID: {user.id}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Joined Oct 2023</span>
              </div>
            </div>
          </div>

          <div className="bg-primary p-8 rounded-[32px] text-white shadow-xl shadow-primary/20">
            <h3 className="text-lg font-bold mb-2">Account Security</h3>
            <p className="text-primary-foreground/80 text-sm mb-6">Keep your account secure by regularly updating your password.</p>
            <button className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-2xl font-bold transition-all flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" />
              Change Password
            </button>
          </div>
        </div>

        {/* Details Form */}
        <div className="lg:col-span-2">
          <div className="bg-white p-8 rounded-[32px] border border-primary/10 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800">Personal Details</h3>
              <button 
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all",
                  isEditing ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-primary/5 text-primary hover:bg-primary/10"
                )}
              >
                {isEditing ? (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    Edit Profile
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    value={formData.name}
                    disabled={!isEditing}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="email" 
                    value={formData.email}
                    disabled={!isEditing}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="tel" 
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    disabled={!isEditing}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Location</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="City, Country"
                    value={formData.address}
                    disabled={!isEditing}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Bio</label>
                <textarea 
                  rows={4}
                  placeholder="Tell us about yourself..."
                  value={formData.bio}
                  disabled={!isEditing}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-60 resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
