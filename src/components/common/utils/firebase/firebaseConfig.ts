import { initializeApp, getApps } from 'firebase/app';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDngZOq0_jc0JGDXC-8dhI4Kf0QymJC_NI',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'medin-dev-50217.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'medin-dev-50217',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'medin-dev-50217.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '21479268225',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:21479268225:web:1d06a7e74a40b2022e5280',
};

const firebase = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const storage = getStorage(firebase);
export default firebase;

