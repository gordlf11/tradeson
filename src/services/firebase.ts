import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getAnalytics } from 'firebase/analytics';

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

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// FCM — only initialize if supported (requires HTTPS + service worker)
export const initMessaging = async () => {
  const supported = await isSupported();
  if (supported) {
    return getMessaging(app);
  }
  return null;
};

export default app;
