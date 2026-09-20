import { validateDeck } from './model.js';
let servicePromise;
export function isConfigured() {
  const c = window.PRESENTATIONS_FIREBASE_CONFIG;
  return !!(c?.apiKey && c?.authDomain && c?.projectId && c?.appId);
}
async function service() {
  if (!isConfigured()) throw new Error('Google sign-in is not set up yet. Follow the presentation setup guide.');
  if (!servicePromise) servicePromise = (async () => {
    const [{ initializeApp }, authAPI, dbAPI] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
    const app = initializeApp(window.PRESENTATIONS_FIREBASE_CONFIG);
    const auth = authAPI.getAuth(app), db = dbAPI.getFirestore(app);
    await auth.authStateReady();
    return { auth, db, authAPI, dbAPI };
  })().catch(error => { servicePromise = null; throw error; });
  return servicePromise;
}
export async function watchAuth(callback) {
  if (!isConfigured()) { callback(null); return () => {}; }
  const s = await service(); return s.authAPI.onAuthStateChanged(s.auth, callback);
}
export async function signIn() {
  const s = await service();
  return s.authAPI.signInWithPopup(s.auth, new s.authAPI.GoogleAuthProvider());
}
export async function signOut() { const s = await service(); return s.authAPI.signOut(s.auth); }
export async function listPublished() {
  if (!isConfigured()) return [];
  const { db, dbAPI: f } = await service();
  const result = await f.getDocs(f.query(f.collection(db, 'presentations'), f.where('published', '==', true)));
  return result.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
export async function listMine() {
  const { db, auth, dbAPI: f } = await service();
  if (!auth.currentUser) return [];
  const result = await f.getDocs(f.query(f.collection(db, 'presentations'), f.where('ownerId', '==', auth.currentUser.uid)));
  return result.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
export async function loadDeck(id) {
  const { db, dbAPI: f } = await service();
  const snapshot = await f.getDoc(f.doc(db, 'presentations', id));
  if (!snapshot.exists()) throw new Error('Presentation not found. It may have been removed.');
  const record = { id: snapshot.id, ...snapshot.data() };
  record.deck = validateDeck(JSON.parse(record.content)); return record;
}
export async function saveDeck(id, raw, published, expectedVersion = null) {
  const deck = validateDeck(raw), { db, auth, dbAPI: f } = await service();
  const user = auth.currentUser;
  if (!user || user.providerData.every(p => p.providerId !== 'google.com')) throw new Error('Sign in with Google to save.');
  const ref = id ? f.doc(db, 'presentations', id) : f.doc(f.collection(db, 'presentations'));
  const version = await f.runTransaction(db, async transaction => {
    const old = await transaction.get(ref);
    if (id && !old.exists()) throw new Error('This presentation was removed. Reload before continuing.');
    if (old.exists() && old.data().ownerId !== user.uid) throw new Error('Only the creator can edit this presentation.');
    if (old.exists() && old.data().version !== expectedVersion) throw new Error('This presentation changed in another tab. Download a backup, then reload before saving.');
    const nextVersion = old.exists() ? old.data().version + 1 : 1;
    transaction.set(ref, { ownerId: user.uid, title: deck.title, description: deck.description, year_group: deck.year_group, subject: deck.subject,
      published: !!published, content: JSON.stringify(deck), version: nextVersion, createdAt: old.exists() ? old.data().createdAt : f.serverTimestamp(), updatedAt: f.serverTimestamp() });
    return nextVersion;
  });
  return { id: ref.id, version, ownerId: user.uid, published: !!published };
}
export async function deleteDeck(id) {
  const { db, dbAPI: f } = await service(); await f.deleteDoc(f.doc(db, 'presentations', id));
}
