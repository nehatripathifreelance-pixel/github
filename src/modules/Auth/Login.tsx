import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({ collegeName: 'College Management System', logo: '' });
  const [authRole, setAuthRole] = useState<'ADMIN' | 'STUDENT' | 'PARENT' | 'STAFF' | 'ACCOUNTANT'>('ADMIN');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    // Try localStorage first for instant load
    const saved = localStorage.getItem('edu_nexus_general_settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }

    const { data } = await supabase.from('app_settings').select('*').eq('key', 'general').single();
    if (data && data.value) {
      setSettings(data.value);
      localStorage.setItem('edu_nexus_general_settings', JSON.stringify(data.value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/');
      } else {
        setError('Invalid email or password. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 md:p-6 overflow-hidden bg-background">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=2076&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px]" />
      </div>

      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-[440px] bg-white rounded-[24px] shadow-2xl shadow-primary/10 p-8 md:p-10 border border-primary/5"
      >
        <div className="text-center mb-6 md:mb-8">
          <div className="flex flex-col items-center justify-center gap-3 mb-6 md:mb-8">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center overflow-hidden">
              {settings.logo ? (
                <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                <GraduationCap className="text-primary w-8 h-8" />
              )}
            </div>
            <h2 className="text-primary font-bold text-lg tracking-tight">{settings.collegeName}</h2>
          </div>
          
          <h1 className="text-3xl font-bold text-primary mb-2">Welcome Back!</h1>
          <p className="text-slate-500 font-medium text-sm">Please sign in to your account.</p>
        </div>

        {/* Role Selection Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
          {[
            { id: 'ADMIN', label: 'Admin/Staff' },
            { id: 'ACCOUNTANT', label: 'Accountant' },
            { id: 'STUDENT', label: 'Student' },
            { id: 'PARENT', label: 'Parent' }
          ].map((role) => (
            <button
              key={role.id}
              onClick={() => setAuthRole(role.id as any)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all",
                authRole === role.id ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {role.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <div className="space-y-1">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary group-focus-within:text-secondary transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                placeholder={authRole === 'STUDENT' ? "Student ID" : authRole === 'PARENT' ? "Parent Login ID" : authRole === 'ACCOUNTANT' ? "Accountant ID" : "Email Address"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary group-focus-within:text-secondary transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-16 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors text-xs font-bold"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <div className="text-right">
              <button type="button" className="text-xs font-bold text-slate-500 hover:text-primary transition-colors">
                Forgot Password?
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full py-3.5 bg-primary text-white rounded-xl font-bold text-base shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2",
              isLoading && "opacity-80 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-6 md:mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-slate-500 font-medium text-sm">
            Don't have an account? <button className="text-accent font-bold hover:underline">Register Here</button>
          </p>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="relative z-10 mt-6 md:mt-8 text-slate-500 font-medium text-xs tracking-wide">
        © <span className="text-primary font-bold">Digital Communique Private Limited</span>
      </div>
    </div>
  );
};
