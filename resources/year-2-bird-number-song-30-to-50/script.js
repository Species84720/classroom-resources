const startNumber=30;
const endNumber=50;
const amount=endNumber-startNumber+1;
const garden=document.querySelector('#garden');
const counter=document.querySelector('#counter');
const message=document.querySelector('#message');
const reset=document.querySelector('#reset');
const colours=['#ff7b7b','#ffd166','#67d5b5','#68b8f7','#b99cff','#f49ac2','#ffad66','#62d6df','#a9d65c'];
const wings=['#e85757','#e3ad25','#25a982','#398aca','#865cd1','#cc6295','#e17b31','#2ca5ad','#75a12f'];
const notes=['♪','♫','♩','♬'];
let heard=new Set();
let audioCtx;

function rand(min,max){return Math.random()*(max-min)+min}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

function playBirdSong(index){
  audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended') audioCtx.resume();
  const now=audioCtx.currentTime;
  const pattern=[
    [0,.07,1450],[.095,.07,1850],[.19,.11,1580],
    [0,.06,1120],[.08,.09,1490],[.19,.08,1970]
  ];
  const offset=(index%5)*35;
  pattern.slice(index%2?3:0,index%2?6:3).forEach(([delay,duration,freq])=>{
    const osc=audioCtx.createOscillator();
    const gain=audioCtx.createGain();
    osc.type='sine';
    osc.frequency.setValueAtTime(freq+offset,now+delay);
    osc.frequency.exponentialRampToValueAtTime(freq*1.22+offset,now+delay+duration*.45);
    osc.frequency.exponentialRampToValueAtTime(freq*.94+offset,now+delay+duration);
    gain.gain.setValueAtTime(.0001,now+delay);
    gain.gain.exponentialRampToValueAtTime(.12,now+delay+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,now+delay+duration);
    osc.connect(gain);gain.connect(audioCtx.destination);
    osc.start(now+delay);osc.stop(now+delay+duration+.02);
  });
}

function addNotes(x,y){
  for(let i=0;i<4;i++){
    const note=document.createElement('span');
    note.className='note';
    note.textContent=notes[Math.floor(Math.random()*notes.length)];
    note.style.left=x+'px';note.style.top=y+'px';
    note.style.setProperty('--dx',rand(-65,65)+'px');
    note.style.color=colours[Math.floor(Math.random()*colours.length)];
    garden.append(note);
    setTimeout(()=>note.remove(),950);
  }
}

function safePosition(w,h,placed,sw,sh){
  const pad=7,maxX=Math.max(pad,sw-w-pad),maxY=Math.max(pad,sh-h-75-pad);
  let best={x:pad,y:pad},bestGap=-1;
  for(let t=0;t<700;t++){
    const x=rand(pad,maxX),y=rand(pad,maxY);
    const overlaps=placed.some(p=>x<p.x+p.w+pad&&x+w+pad>p.x&&y<p.y+p.h+pad&&y+h+pad>p.y);
    const gap=placed.length?Math.min(...placed.map(p=>Math.hypot(x+w/2-p.x-p.w/2,y+h/2-p.y-p.h/2))):999;
    if(!overlaps&&gap>bestGap){best={x,y};bestGap=gap}
  }
  return best;
}

function buildBird(num,index,x,y,w,h){
  const wrap=document.createElement('div');
  wrap.className='bird-wrap';
  wrap.style.left=x+'px';wrap.style.top=y+'px';
  wrap.style.setProperty('--w',w+'px');wrap.style.setProperty('--h',h+'px');
  wrap.style.setProperty('--font',Math.max(23,Math.round(w*.27))+'px');
  wrap.style.setProperty('--c',colours[index%colours.length]);
  wrap.style.setProperty('--wing',wings[index%wings.length]);
  const button=document.createElement('button');
  button.className='bird';button.type='button';
  button.setAttribute('aria-label','Hear bird '+num+' sing');
  button.innerHTML='<span class="tail"></span><span class="body"></span><span class="wing"></span><span class="head"><span class="eye"></span><span class="beak"></span></span><span class="feet"></span><span class="number">'+num+'</span>';
  wrap.append(button);garden.append(wrap);
  button.addEventListener('click',()=>{
    if(heard.has(num)) return;
    heard.add(num);
    button.disabled=true;
    const r=button.getBoundingClientRect(),gr=garden.getBoundingClientRect();
    playBirdSong(index);
    addNotes(r.left-gr.left+r.width*.75,r.top-gr.top+r.height*.25);
    wrap.style.setProperty('--fly-x',rand(-130,130)+'px');
    wrap.classList.add('flying');
    counter.textContent=heard.size+' / '+amount+' birds flew';
    message.textContent=heard.size===amount?'Wonderful! Every bird sang and flew into the sky! 🎉':'Bird '+num+' says: tweet-tweet — away it flies! ♪';
    setTimeout(()=>wrap.remove(),1300);
  });
}

function layoutBirds(){
  garden.replaceChildren();heard=new Set();
  counter.textContent='0 / '+amount+' birds flew';
  message.textContent='Ready? Tap any bird to hear it sing!';
  const cottage=document.createElement('div');
  cottage.className='candy-house';
  cottage.setAttribute('aria-hidden','true');
  cottage.innerHTML='<span class="candy-window left"></span><span class="candy-window right"></span><span class="lollipop one"></span><span class="lollipop two"></span>';
  garden.append(cottage);
  const numbers=shuffle(Array.from({length:amount},(_,i)=>startNumber+i));
  const placed=[],sw=Math.max(320,garden.clientWidth),sh=Math.max(430,garden.clientHeight);
  numbers.forEach((num,index)=>{
    const scale=rand(.78,1.04),w=Math.round(92*scale),h=Math.round(72*scale);
    const pos=safePosition(w,h,placed,sw,sh);placed.push({...pos,w,h});
    buildBird(num,index,pos.x,pos.y,w,h);
  });
  for(let i=0;i<6;i++){
    const branch=document.createElement('span');branch.className='branch';
    branch.style.width=rand(90,190)+'px';branch.style.left=rand(0,Math.max(20,sw-160))+'px';
    branch.style.top=rand(35,Math.max(60,sh-95))+'px';branch.style.setProperty('--tilt',rand(-8,8)+'deg');
    garden.prepend(branch);
  }
}
reset.addEventListener('click',layoutBirds);
window.addEventListener('resize',()=>{clearTimeout(window.__birdResize);window.__birdResize=setTimeout(layoutBirds,180)});
layoutBirds();
