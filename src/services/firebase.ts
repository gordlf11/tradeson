import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getAnalytics } from 'firebase/analytics';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBcsGiKIVsjSSYRJZOWG8c5NG0oTZQedco",
  authDomain: "tradeson-491518.firebaseapp.com",
  projectId: "tradeson-491518",
  storageBucket: "tradeson-491518.firebasestorage.app",
  messagingSenderId: "63629008205",
  appId: "1:63629008205:web:78644fd6b0b905a4342b04",
  measurementId: "G-BYYK1VMCYY"
};

const app = initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// FCM — register service worker + initialize messaging (requires HTTPS)
export const initMessaging = async () => {
  const supported = await isSupported();
  if (!supported) return null;

  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    } catch (err) {
      console.warn('FCM service worker registration failed:', err);
    }
  }

  return getMessaging(app);
};

/**
 * Upload a File to Firebase Storage and return its public download URL.
 * @param path  Storage path, e.g. `compliance/uid123/insurance/cert.pdf`
 * @param file  The File object to upload
 * @param onProgress  Optional callback receiving upload % (0–100)
 */
export function uploadFile(
  path: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, path), file);
    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)),
    );
  });
}

export default app;
