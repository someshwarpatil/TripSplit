import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth(), googleProvider);
  await createUserDocument(result.user.uid, {
    displayName: result.user.displayName || 'User',
    email: result.user.email || '',
    photoURL: result.user.photoURL,
  });
  return result.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
) {
  const result = await createUserWithEmailAndPassword(auth(), email, password);
  await updateProfile(result.user, { displayName });
  await createUserDocument(result.user.uid, {
    displayName,
    email,
    photoURL: null,
  });
  return result.user;
}

export async function signInWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth(), email, password);
  return result.user;
}

export async function signOut() {
  await firebaseSignOut(auth());
}

async function createUserDocument(
  uid: string,
  data: { displayName: string; email: string; photoURL: string | null }
) {
  const userRef = doc(db(), 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      ...data,
      createdAt: serverTimestamp(),
    });
  }
}
