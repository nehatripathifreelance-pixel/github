import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

export function formatDate(date: string | Date) {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    console.error('Error formatting date', e);
    return 'Invalid Date';
  }
}

export function safeLocalStorageSet(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn(`LocalStorage quota exceeded for key: ${key}. Attempting to save slimmed version.`);
      
      // If it's an array, try to remove large base64 strings
      if (Array.isArray(value)) {
        const largeFields = [
          'photoUrl', 'photo_url', 
          'staffDocsUrl', 'staff_docs_url', 
          'nomineeDocsUrl', 'nominee_docs_url', 
          'signatureUrl', 'signature_url',
          'studentDocsUrl', 'student_docs_url',
          'parentDocsUrl', 'parent_docs_url'
        ];

        const slimmed = value.map(item => {
          const newItem = { ...item };
          largeFields.forEach(field => {
            if (newItem[field] && typeof newItem[field] === 'string' && newItem[field].length > 500) {
              newItem[field] = '(data too large for cache)';
            }
          });
          return newItem;
        });

        try {
          localStorage.setItem(key, JSON.stringify(slimmed));
          console.log(`Saved slimmed version of ${key} to LocalStorage.`);
        } catch (retryError) {
          console.error(`Failed to save even slimmed version of ${key}.`, retryError);
        }
      }
    } else {
      console.error(`Error saving to LocalStorage for key: ${key}`, e);
    }
  }
}
