const start=30,end=50;
const params=new URLSearchParams(location.search);
const requested=parseInt(params.get('birds')||params.get('amount')||'8',10);
const hideCount=Math.max(1,Math.min(end-start-1,Number.isFinite(requested)?requested:8));
const path=document.querySelector('#path');
const counter=document.querySelector('#counter');
const message=document.querySelector('#message');
const reset=document.querySelector('#reset');
const colours=['#ff7b7b','#ffd166','#67d5b5','#68b8f7','#b99cff','#f49ac2','#ffad66','#62d6df'];
const wings=['#e85757','#d7a11f','#25a982','#398aca','#865cd1','#cc6295','#e17b31','#2ca5ad'];
let hiddenNumbers=[];
let revealed=new Set();

function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function birdHTML(){return `<button class="bird eating" type="button" aria-label="Reveal hidden number"><span class="tail"></span><span class="body"></span><span class="wing"></span><span class="head"><span class="eye"></span><span class="beak"></span></span><span class="feet"></span></button>`}
function addSpark(cell){['✨','⭐','🐦'].forEach((s,i)=>{const el=document.createElement('span');el.className='spark';el.textContent=s;el.style.left='50%';el.style.top='45%';el.style.setProperty('--dx',`${(i-1)*36}px`);cell.append(el);setTimeout(()=>el.remove(),850)})}
function reveal(num,cell,wrap){if(revealed.has(num))return;revealed.add(num);wrap.classList.add('flying');cell.classList.add('revealed');setTimeout(()=>wrap.remove(),1120);addSpark(cell);counter.textContent=`${revealed.size} / ${hideCount} birds revealed`;message.textContent=revealed.size===hideCount?'All the hidden numbers are back! Brilliant counting! 🎉':`The bird was hiding ${num}. Which bird shall we try next?`;}
function chooseHidden(){const choices=[];for(let n=start+1;n<end;n++)choices.push(n);hiddenNumbers=shuffle(choices).slice(0,hideCount)}
function build(){path.replaceChildren();revealed=new Set();chooseHidden();counter.textContent=`0 / ${hideCount} birds revealed`;message.textContent='Tap a bird after the class has guessed.';for(let n=start;n<=end;n++){const cell=document.createElement('div');cell.className='crumb-cell';cell.style.setProperty('--crumb-tilt',`${(n%2?1:-1)*(2+(n%4))}deg`);const crumb=document.createElement('span');crumb.className='crumb';const number=document.createElement('span');number.className='number';number.textContent=n;cell.append(crumb,number);if(hiddenNumbers.includes(n)){cell.classList.add('hidden');const wrap=document.createElement('div');wrap.className='bird-wrap';const i=hiddenNumbers.indexOf(n);wrap.style.setProperty('--bird-c',colours[i%colours.length]);wrap.style.setProperty('--wing-c',wings[i%wings.length]);wrap.innerHTML=birdHTML();wrap.querySelector('button').addEventListener('click',()=>reveal(n,cell,wrap));cell.append(wrap)}path.append(cell)}}
reset.addEventListener('click',build);
build();