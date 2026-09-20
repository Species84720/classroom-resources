// Test-only adapter. Never included in production build.mjs entry points.
import { demoDeck } from '../presentations/src/model.js';
let listener,user=null;
const sample=demoDeck();
const decks=new Map([['other',{id:'other',ownerId:'bob',published:true,version:1,deck:sample,title:'Another teacher’s lesson',year_group:'Year 2',subject:'General',description:'View only'}]]);
export const isConfigured=()=>true;
export async function watchAuth(fn){listener=fn;fn(user);return()=>{};}
export async function signIn(){user={uid:'alice',displayName:'Test Teacher'};listener(user);}
export async function signOut(){user=null;listener(user);}
export async function listPublished(){return [...decks.values()].filter(d=>d.published);}
export async function listMine(){return [...decks.values()].filter(d=>d.ownerId===user?.uid);}
export async function loadDeck(id){return structuredClone(decks.get(id));}
export async function saveDeck(id,deck,published,version){
  if(!user)throw new Error('Not signed in');id||='created';const old=decks.get(id);
  if(old&&old.ownerId!==user.uid)throw new Error('Not the creator');
  if(old&&old.version!==version)throw new Error('Conflict');
  const record={id,ownerId:user.uid,version:(version||0)+1,published,deck:structuredClone(deck),title:deck.title,description:deck.description,year_group:deck.year_group,subject:deck.subject};decks.set(id,record);return record;
}
export async function deleteDeck(id){if(decks.get(id)?.ownerId!==user?.uid)throw new Error('Not the creator');decks.delete(id);}
