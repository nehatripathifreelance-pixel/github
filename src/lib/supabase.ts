import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Using local storage as fallback.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const testSupabaseConnection = async () => {
  try {
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      return { 
        connected: false, 
        message: 'Supabase credentials missing.',
        details: 'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the app settings.' 
      };
    }
    
    // First try a simple query to see if the connection works at all
    // We try to fetch from any common table or just do a basic server check
    // Selecting from a non-existent table will still prove connectivity if we get a DB error code
    const { error } = await supabase.from('app_settings').select('id').limit(1);
    
    if (error) {
      // If it's a "Failed to fetch" error, it's a network/URL issue
      if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
        return { 
          connected: false, 
          message: 'Network error.',
          details: 'Failed to connect to Supabase. Check your internet or Supabase URL.' 
        };
      }
      // If code is 42P01 (relation does not exist), it means we ARE connected but that specific table is missing
      if (error.code === '42P01') {
        // This is actually GOOD news for connectivity, but BAD for the app's specific tables
        // Let's try one more check to be absolutely sure - any DB response proves connectivity
        return { 
          connected: true, 
          message: 'Connected to Supabase',
          details: 'DB is reachable, but some tables (like app_settings) might be missing. Please run the SQL setup script.' 
        };
      }
      
      // Other DB errors might still mean we are connected (e.g., permission denied)
      if (error.code) {
        return { 
          connected: true, 
          message: 'Connected to Supabase', 
          details: `Connected with notice: ${error.message}` 
        };
      }

      return { connected: false, message: 'Database error.', details: error.message };
    }
    
    return { connected: true, message: 'Connected to Supabase', details: 'All systems operational.' };
  } catch (error: any) {
    console.error('Supabase connection test exception:', error);
    return { 
      connected: false, 
      message: 'Connection failed.',
      details: error.message || 'Unknown error occurred during connection test.' 
    };
  }
};
