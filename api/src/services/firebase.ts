import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'tradeson-491518',
  });
}

export const auth = admin.auth();
export const messaging = admin.messaging();
export const firestore = admin.firestore();
export default admin;
