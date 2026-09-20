import { before, after, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, deleteDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, runTransaction } from 'firebase/firestore';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-classroom',firestore:{host:'127.0.0.1',port:8080,rules:await readFile('firestore.rules','utf8')}});});
after(async()=>{await env?.cleanup();});beforeEach(async()=>{await env.clearFirestore();});
const db=(uid,provider='google.com')=>uid?env.authenticatedContext(uid,{firebase:{sign_in_provider:provider}}).firestore():env.unauthenticatedContext().firestore();
const payload=(published=false)=>({ownerId:'alice',title:'Lesson',description:'Count together',year_group:'Year 2',subject:'Mathematics',published,content:'{}',version:1,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
const ref=(database,id='one')=>doc(database,'presentations',id);
test('Google creator can create, update and delete; other and anonymous writers are rejected',async()=>{
  const alice=db('alice');await assertSucceeds(setDoc(ref(alice),payload()));
  await assertFails(setDoc(ref(db()),payload()));await assertFails(setDoc(ref(db('bob')),payload()));
  await assertFails(updateDoc(ref(db('bob')),{title:'Stolen',version:2,updatedAt:serverTimestamp()}));
  await assertFails(deleteDoc(ref(db('bob'))));await assertFails(deleteDoc(ref(db())));
  await assertSucceeds(updateDoc(ref(alice),{title:'Updated',version:2,updatedAt:serverTimestamp()}));await assertSucceeds(deleteDoc(ref(alice)));
});
test('ownership is immutable and anonymous/non-Google identities cannot create',async()=>{
  await assertFails(setDoc(ref(db('alice','password')),payload()));await assertFails(setDoc(ref(db()),payload()));
  const alice=db('alice');await setDoc(ref(alice),payload());
  await assertFails(updateDoc(ref(alice),{ownerId:'bob',version:2,updatedAt:serverTimestamp()}));
});
test('public decks are readable without login; private decks are creator-only and queries work',async()=>{
  const alice=db('alice');await setDoc(ref(alice),payload(true));await setDoc(ref(alice,'draft'),payload());
  await assertSucceeds(getDoc(ref(db())));await assertFails(getDoc(ref(db(),'draft')));await assertFails(getDoc(ref(db('bob'),'draft')));await assertSucceeds(getDoc(ref(alice,'draft')));
  await assertSucceeds(getDocs(query(collection(db(),'presentations'),where('published','==',true))));
  await assertSucceeds(getDocs(query(collection(alice,'presentations'),where('ownerId','==','alice'))));
  await assertFails(getDocs(collection(db(),'presentations')));
  await updateDoc(ref(alice),{published:false,version:2,updatedAt:serverTimestamp()});await assertFails(getDoc(ref(db())));
});
test('transaction can create new ID; versions, metadata and content limits are enforced',async()=>{
  const alice=db('alice');await assertSucceeds(runTransaction(alice,async tx=>{await tx.get(ref(alice));tx.set(ref(alice),payload());}));
  await assertFails(updateDoc(ref(alice),{version:1,updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(ref(alice),{version:2,updatedAt:serverTimestamp(),extra:'field'}));
  await assertFails(updateDoc(ref(alice),{version:2,updatedAt:serverTimestamp(),content:'x'.repeat(700001)}));
  await assertFails(updateDoc(ref(alice),{version:2,updatedAt:serverTimestamp(),title:''}));
});
