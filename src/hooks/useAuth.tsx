import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { safeLocalStorageSet } from '../lib/utils';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_USERS: Record<string, { user: User; pass: string }> = {
  'Dc@18': { 
    user: { id: '1', name: 'Super Admin', email: 'Dc@18', role: 'SUPER_ADMIN' }, 
    pass: 'DC12345' 
  },
  'admin': { 
    user: { id: '2', name: 'ARun', email: 'admin', role: 'COLLEGE_ADMIN', collegeId: 'c1' }, 
    pass: '12345' 
  },
  'faculty': { 
    user: { id: '3', name: 'Dr. Anjali Verma', email: 'faculty', role: 'FACULTY', collegeId: 'c1' }, 
    pass: '12345' 
  },
  'student': { 
    user: { id: '4', name: 'Siddharth Singh', email: 'student', role: 'STUDENT', collegeId: 'c1' }, 
    pass: '12345' 
  },
  'Principal': { 
    user: { id: '6', name: 'Dr. Vikram Malhotra', email: 'Principal', role: 'PRINCIPAL', collegeId: 'c1' }, 
    pass: '12345' 
  },
  'accountant': { 
    user: { id: '7', name: 'Mr. Sanjay Gupta', email: 'accountant', role: 'ACCOUNTANT', collegeId: 'c1' }, 
    pass: '12345' 
  },
  'library': { 
    user: { id: '8', name: 'Ms. Meera Iyer', email: 'library', role: 'LIBRARIAN', collegeId: 'c1' }, 
    pass: '12345' 
  },
  'staff': { 
    user: { id: '9', name: 'Mr. Ramesh Pawar', email: 'staff', role: 'STAFF', collegeId: 'c1' }, 
    pass: '12345' 
  },
  'parent': { 
    user: { id: '10', name: 'Parent', email: 'parent', role: 'PARENT', collegeId: 'c1' }, 
    pass: '12345' 
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('edunexus_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('Error parsing user from localStorage', e);
      localStorage.removeItem('edunexus_user');
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // 1. Check Supabase user_credentials table
    const { data: supabaseUser, error } = await supabase
      .from('user_credentials')
      .select('*')
      .eq('id', email)
      .eq('password', password)
      .maybeSingle();

    if (supabaseUser) {
      const userObj: User = {
        id: supabaseUser.id,
        name: supabaseUser.name || supabaseUser.id,
        email: supabaseUser.id,
        role: supabaseUser.role as UserRole,
        collegeId: 'c1'
      };
      setUser(userObj);
      safeLocalStorageSet('edunexus_user', userObj);
      return true;
    }

    // 2. Check for custom credentials from settings (Legacy/Fallback)
    const savedSettings = localStorage.getItem('edu_nexus_panel_credentials');
    if (savedSettings) {
      const customCreds = JSON.parse(savedSettings);
      const customUser = customCreds.find((c: any) => c.id === email && c.password === password);
      if (customUser) {
        const roleMap: Record<string, UserRole> = {
          'Super Admin': 'SUPER_ADMIN',
          'Admin': 'COLLEGE_ADMIN',
          'Faculty': 'FACULTY',
          'Principal': 'PRINCIPAL',
          'Accountant': 'ACCOUNTANT',
          'Librarian': 'LIBRARIAN',
          'Staff': 'STAFF',
          'Parent': 'PARENT'
        };
        const userObj: User = {
          id: Math.random().toString(36).substr(2, 9),
          name: customUser.role,
          email: customUser.id,
          role: roleMap[customUser.role] || 'STAFF',
          collegeId: 'c1'
        };
        setUser(userObj);
        safeLocalStorageSet('edunexus_user', userObj);
        return true;
      }
    }

    // 3. Mock Users (Fallback)
    const mockData = MOCK_USERS[email];
    if (mockData && mockData.pass === password) {
      setUser(mockData.user);
      safeLocalStorageSet('edunexus_user', mockData.user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('edunexus_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
