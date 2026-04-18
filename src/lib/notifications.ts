import { supabase } from './supabase';

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export async function sendNotification(userId: string, title: string, message: string, type: NotificationType = 'INFO') {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      is_read: false
    });
    if (error) throw error;
  } catch (err) {
    console.error('Error sending notification:', err);
  }
}

export async function sendGlobalNotification(title: string, message: string, type: NotificationType = 'INFO') {
  return sendNotification('ALL', title, message, type);
}
