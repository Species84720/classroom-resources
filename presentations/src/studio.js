import { newDeck, newSlide, validateDeck, moveSlide, canEdit, demoDeck, MAX_SLIDES } from './model.js';
import * as cloud from './cloud.js';
import { Player, renderPreview } from './player.js';
import { downloadJSON, exportPPTX, importPresentation, compressImage } from './powerpoint.js';
const $ = id => document.getElementById(id);
let user=null, record=null, deck=null, selected=0, editing=false, dirty=false, saving=false, libraryRequest=0, opening=0;
const message = text => { $('status').textContent=text; };
function report(error){ console.error(error); const code=error.code||''; message(code.includes('popup-closed')?'Sign-in was cancelled.':code.includes('popup-blocked')?'Allow the Google sign-in popup, then try again.':code.includes('permission-denied')?'This presentation is private, or you do not have permission to edit it.':code.includes('unauthorized-domain')?'This site must be added to Firebase Authentication’s authorised domains.':error.message||'Something went wrong. Please try again.'); }
function action(id, fn){$(id).addEventListener('click',()=>Promise.resolve().then(fn).catch(report));}
function editable(){return !!user && (!record || canEdit(record,user));}
function guard(){if(!editable()||!editing||saving)throw new Error('Sign in as the creator to edit this presentation.');}
function leave(){if(saving){message('Please wait for saving to finish.');return false;}return !dirty||confirm('You have unsaved changes. Discard them?');}
function changed(){dirty=true; $('save').textContent='Save changes';renderPreview($('preview'),deck,selected);}
const player=new Player($('stage'), state=>{
  $('slide-status').textContent=state.overview?`Overview · ${state.count} slides`:`${state.index+1} / ${state.count}${state.reveal?` · ${state.reveal}`:''}`;
  $('prev').disabled=state.atStart&&!state.overview;$('next').disabled=state.atEnd&&!state.overview;
  $('overview').hidden=player.mode!=='zoom';$('overview').textContent=state.overview?'Back to slide':'Overview';
});
function syncAccess(){
  $('create').disabled=!user;$('import').disabled=!user;$('login').hidden=!!user;$('login').disabled=!cloud.isConfigured();$('logout').hidden=!user;
  $('account-name').textContent=user?user.displayName||'Signed in':'';
  if(deck){
    if(editing&&!editable()){editing=false;dirty=false;showViewer();message('Editing ended because the creator is no longer signed in.');}
    $('edit').hidden=editing||!editable();$('save').hidden=!editing||!editable();$('editor-fields').disabled=!editable()||saving;
    $('permission').textContent=record?.id?(canEdit(record,user)?'YOUR PRESENTATION':'VIEW ONLY'):(editable()?'NEW PRESENTATION':'EXAMPLE · VIEW ONLY');
    $('delete-deck').hidden=!record?.id||!canEdit(record,user);
  }
}
async function refreshLibrary(){
  const ticket=++libraryRequest; const mine=$('scope').value==='mine';
  $('decks').replaceChildren();
  try{
    if(mine&&!user){empty('Sign in with Google to see your presentations.');return;}
    const rows=mine?await cloud.listMine():await cloud.listPublished();if(ticket!==libraryRequest)return;
    if(!rows.length){empty(mine?'Your next lesson starts here. Create a presentation above.':'No shared presentations yet. Explore the example or create your first lesson.');return;}
    for(const r of rows.sort((a,b)=>(b.updatedAt?.seconds||0)-(a.updatedAt?.seconds||0))){
      const card=document.createElement('article');card.className='deck-card';
      const title=document.createElement('h3');title.textContent=r.title;
      const meta=document.createElement('p');meta.className='hint';meta.textContent=`${r.year_group} · ${r.subject} · ${r.published?'Shared':'Private draft'}`;
      const desc=document.createElement('p');desc.textContent=r.description;
      const buttons=document.createElement('div');buttons.className='toolbar';
      const view=document.createElement('button');view.textContent='Open presentation';view.onclick=()=>openId(r.id,false).catch(report);buttons.append(view);
      if(canEdit(r,user)){const edit=document.createElement('button');edit.textContent='Edit';edit.onclick=()=>openId(r.id,true).catch(report);buttons.append(edit);}
      card.append(title,meta,desc,buttons);$('decks').append(card);
    }
  }catch(error){if(ticket!==libraryRequest)return;empty('Presentations could not be loaded. Please try again.');report(error);}
}
function empty(text){const p=document.createElement('p');p.className='empty';p.textContent=text;$('decks').append(p);}
async function openId(id,edit=false){
  if(!leave())return;const ticket=++opening;message('Opening presentation…');
  const loaded=await cloud.loadDeck(id);if(ticket!==opening)return;
  open(loaded.deck,loaded,edit&&canEdit(loaded,user));message('');
}
function open(value, metadata=null, edit=false){
  opening++;deck=validateDeck(value);record=metadata;selected=0;dirty=false;editing=edit;
  $('intro').hidden=true;$('library').hidden=true;$('workspace').hidden=false;$('deck-heading').textContent=deck.title;
  const url=new URL(location.href);url.search='';if(record?.id)url.searchParams.set('id',record.id);else url.searchParams.set('demo','1');history.replaceState(null,'',url);
  if(editing)showEditor();else showViewer();syncAccess();
}
function showEditor(){
  editing=true;player.stop();document.body.classList.remove('is-presenting');$('editor').hidden=false;$('viewer').hidden=true;
  for(const [id,key]of Object.entries({title:'title',year:'year_group',subject:'subject',mode:'mode',theme:'theme',description:'description'}))$(id).value=deck[key];
  $('published').checked=!!record?.published;$('save').textContent=dirty?'Save changes':'Save';fillSlide();syncAccess();
}
function fillSlide(){
  const slide=deck.slides[selected];
  for(const [id,key]of Object.entries({'slide-title':'title','slide-body':'body',layout:'layout',animation:'animation','image-alt':'imageAlt',notes:'notes'}))$(id).value=slide[key];
  $('slide-list').replaceChildren();
  deck.slides.forEach((s,i)=>{const li=document.createElement('li'),button=document.createElement('button');button.textContent=`${i+1}. ${s.title||'Untitled slide'}`;button.setAttribute('aria-current',String(selected===i));button.onclick=()=>{selected=i;fillSlide();};li.append(button);$('slide-list').append(li);});
  $('up').disabled=selected===0;$('down').disabled=selected===deck.slides.length-1;$('remove').disabled=deck.slides.length===1;
  $('add').disabled=deck.slides.length>=MAX_SLIDES;$('duplicate').disabled=deck.slides.length>=MAX_SLIDES;$('clear-image').disabled=!slide.image;
  renderPreview($('preview'),deck,selected);
}
function showViewer(presenting=false){
  $('editor').hidden=true;$('viewer').hidden=false;$('exit-show').hidden=!editing;document.body.classList.toggle('is-presenting',presenting);
  $('view-mode').value=deck.mode;player.load(deck,deck.mode,selected);$('stage').focus();syncAccess();
}
for(const [id,key]of Object.entries({title:'title',year:'year_group',subject:'subject',mode:'mode',theme:'theme',description:'description'})){
  $(id).addEventListener('input',()=>{if(!editable()||saving)return;deck[key]=$(id).value;$('deck-heading').textContent=deck.title;changed();});
}
for(const [id,key]of Object.entries({'slide-title':'title','slide-body':'body',layout:'layout',animation:'animation','image-alt':'imageAlt',notes:'notes'})){
  $(id).addEventListener('input',()=>{if(!editable()||saving)return;deck.slides[selected][key]=$(id).value;changed();if(id==='slide-title')$('slide-list').children[selected].firstChild.textContent=`${selected+1}. ${$(id).value||'Untitled slide'}`;});
}
$('published').addEventListener('change',()=>{if(editable())changed();});
action('login',()=>cloud.signIn());action('logout',async()=>{if(!leave())return;await cloud.signOut();});
action('create',()=>{if(!user)throw new Error('Sign in with Google first.');if(leave())open(newDeck(),null,true);});
action('demo',()=>{if(leave())open(demoDeck(),{ownerId:'example'},false);});
action('edit',()=>{if(!editable())throw new Error('Only the creator can edit.');showEditor();});
action('close',()=>{if(!leave())return;opening++;deck=null;record=null;editing=false;dirty=false;player.stop();document.body.classList.remove('is-presenting');$('workspace').hidden=true;$('intro').hidden=false;$('library').hidden=false;history.replaceState(null,'',location.pathname);message('');refreshLibrary();});
action('add',()=>{guard();if(deck.slides.length>=MAX_SLIDES)return;deck.slides.splice(selected+1,0,newSlide());selected++;changed();fillSlide();});
action('duplicate',()=>{guard();if(deck.slides.length>=MAX_SLIDES)return;deck.slides.splice(selected+1,0,structuredClone(deck.slides[selected]));selected++;changed();fillSlide();});
action('remove',()=>{guard();if(deck.slides.length<=1)return;if(!confirm('Delete this slide?'))return;deck.slides.splice(selected,1);selected=Math.min(selected,deck.slides.length-1);changed();fillSlide();});
for(const [id,delta]of [['up',-1],['down',1]])action(id,()=>{guard();selected=moveSlide(deck.slides,selected,selected+delta);changed();fillSlide();});
$('template').addEventListener('change',()=>{try{guard();if(!$('template').value)return;if(confirm('Replace all slides with this template?')){deck.slides=newDeck($('template').value).slides;selected=0;changed();fillSlide();}}catch(e){report(e);}finally{$('template').value='';}});
$('image').addEventListener('change',async()=>{const file=$('image').files[0];$('image').value='';if(!file)return;try{guard();const target=deck.slides[selected],activeDeck=deck;const data=await compressImage(file);guard();if(activeDeck!==deck||!deck.slides.includes(target))return;target.image=data;changed();fillSlide();}catch(e){report(e);}});
action('clear-image',()=>{guard();deck.slides[selected].image='';changed();fillSlide();});
$('import').addEventListener('change',async()=>{const file=$('import').files[0];$('import').value='';if(!file)return;try{if(!user||!leave())return;const ticket=++opening, importingUser=user.uid;message('Importing presentation…');const result=await importPresentation(file);if(ticket!==opening||user?.uid!==importingUser)return;open(result.deck,null,true);dirty=true;$('save').textContent='Save changes';message(result.warning||'Backup imported. Save to create your own copy.');}catch(e){report(e);}});
action('save',async()=>{
  guard();validateDeck(deck);saving=true;$('save').disabled=true;syncAccess();message('Saving…');
  try{const saved=await cloud.saveDeck(record?.id,deck,$('published').checked,record?.version);record={...record,...saved};dirty=false;$('save').textContent='Saved';history.replaceState(null,'',`?id=${encodeURIComponent(saved.id)}`);message(saved.published?'Saved and shared in the classroom library.':'Saved as a private draft.');}
  finally{saving=false;$('save').disabled=false;syncAccess();}
});
action('delete-deck',async()=>{guard();if(!record?.id||!confirm('Permanently delete this presentation?'))return;await cloud.deleteDeck(record.id);dirty=false;$('close').click();message('Presentation deleted.');});
action('backup',()=>downloadJSON(deck));
action('export',async()=>{validateDeck(deck);message('Preparing PowerPoint…');await exportPPTX(deck);message('PowerPoint downloaded. Web animations and zoom journeys play in this studio; the .pptx contains editable static slides.');});
action('present',()=>{validateDeck(deck);showViewer(true);});
action('exit-show',()=>{if(editing&&editable())showEditor();});
action('fullscreen',async()=>{if(document.fullscreenElement)await document.exitFullscreen();else if($('viewer').requestFullscreen)await $('viewer').requestFullscreen();else message('Use your browser’s full-screen option on this device.');});
action('next',()=>player.next());action('prev',()=>player.prev());action('overview',()=>player.toggleOverview());
$('view-mode').addEventListener('change',()=>player.load(deck,$('view-mode').value,player.index));
$('scope').addEventListener('change',refreshLibrary);
document.addEventListener('keydown',event=>{
  if(!deck||$('viewer').hidden||event.ctrlKey||event.metaKey||event.altKey||['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(event.target.tagName))return;
  if(['ArrowRight',' ','PageDown','ArrowLeft','PageUp','Home','End','o','O','Escape'].includes(event.key))event.preventDefault();
  if(['ArrowRight',' ','PageDown'].includes(event.key))player.next();
  if(['ArrowLeft','PageUp'].includes(event.key))player.prev();
  if(event.key==='Home')player.go(0);if(event.key==='End')player.go(deck.slides.length-1);
  if(event.key.toLowerCase()==='o')player.toggleOverview();
  if(event.key==='Escape'){document.body.classList.remove('is-presenting');if(editing&&editable())showEditor();}
});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
new ResizeObserver(()=>{if(deck&&editing&&!$('editor').hidden)renderPreview($('preview'),deck,selected);}).observe($('preview'));
async function init(){
  $('setup').hidden=cloud.isConfigured();syncAccess();
  await cloud.watchAuth(next=>{user=next;syncAccess();refreshLibrary();});
  const params=new URLSearchParams(location.search);
  if(params.has('id'))await openId(params.get('id'));else if(params.has('demo'))open(demoDeck(),{ownerId:'example'},false);
}
init().catch(report);
