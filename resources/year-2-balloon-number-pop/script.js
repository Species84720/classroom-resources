const params = new URLSearchParams(location.search);
const requested = Number.parseInt(params.get('amount') || '30', 10);
const amount = Number.isFinite(requested) ? Math.min(60, Math.max(1, requested)) : 30;

const sky = document.querySelector('#sky');
const counter = document.querySelector('#counter');
const message = document.querySelector('#message');
const reset = document.querySelector('#reset');

const colours = ['#ff6b6b','#ffd166','#06d6a0','#4dabf7','#b197fc','#f783ac','#ffa94d','#66d9e8','#94d82d','#ff8787'];
const shapes = ['shape-round','shape-tall','shape-pear'];
const cheer = ['🎉','⭐','👏','😊','✨','👍'];
let popped = 0;
let audioCtx;

function rand(min,max){return Math.random()*(max-min)+min}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

function playPop(sizeRatio,index){
  audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const base = 180 + (1-sizeRatio)*520 + (index%5)*28;
  osc.type = ['sine','triangle','square'][index%3];
  osc.frequency.setValueAtTime(base,now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(70,base*.36),now+.09);
  gain.gain.setValueAtTime(.0001,now);
  gain.gain.exponentialRampToValueAtTime(.22,now+.008);
  gain.gain.exponentialRampToValueAtTime(.0001,now+.12);
  osc.connect(gain);gain.connect(audioCtx.destination);osc.start(now);osc.stop(now+.13);

  const noise = audioCtx.createBufferSource();
  const buffer = audioCtx.createBuffer(1,audioCtx.sampleRate*.05,audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*(1-i/data.length);
  noise.buffer=buffer;
  const ng=audioCtx.createGain();ng.gain.setValueAtTime(.13,now);ng.gain.exponentialRampToValueAtTime(.0001,now+.05);
  noise.connect(ng);ng.connect(audioCtx.destination);noise.start(now);
}

function burstAt(x,y){
  for(let i=0;i<7;i++){
    const s=document.createElement('span');
    s.className='burst';
    s.textContent=cheer[Math.floor(Math.random()*cheer.length)];
    s.style.left=`${x}px`;s.style.top=`${y}px`;
    s.style.setProperty('--dx',`${rand(-90,90)}px`);
    s.style.setProperty('--dy',`${rand(-100,70)}px`);
    sky.append(s);
    setTimeout(()=>s.remove(),750);
  }
}

function layoutBalloons(){
  sky.replaceChildren();
  popped=0;
  counter.textContent=`0 / ${amount} popped`;
  message.textContent='Ready? Pop any balloon!';

  const numbers=shuffle(Array.from({length:amount},(_,i)=>i+1));
  const placed=[];
  const sw=Math.max(360,sky.clientWidth);
  const sh=Math.max(500,sky.clientHeight);

  numbers.forEach((num,index)=>{
    const scale=rand(.72,1.28);
    const w=Math.round(72*scale);
    const h=Math.round((88+rand(-8,12))*scale);
    let x=rand(8,Math.max(9,sw-w-8));
    let y=rand(10,Math.max(11,sh-h-100));

    for(let tries=0;tries<80;tries++){
      const overlap=placed.some(p=>Math.abs((x+w/2)-(p.x+p.w/2))<(w+p.w)*.38 && Math.abs((y+h/2)-(p.y+p.h/2))<(h+p.h)*.42);
      if(!overlap) break;
      x=rand(8,Math.max(9,sw-w-8));y=rand(10,Math.max(11,sh-h-100));
    }
    placed.push({x,y,w,h});

    const wrap=document.createElement('div');
    wrap.className=`balloon-wrap ${shapes[Math.floor(Math.random()*shapes.length)]}`;
    wrap.style.left=`${x}px`;wrap.style.top=`${y}px`;
    wrap.style.setProperty('--w',`${w}px`);wrap.style.setProperty('--h',`${h}px`);
    wrap.style.setProperty('--font',`${Math.max(24,Math.round(w*.4))}px`);
    wrap.style.setProperty('--string',`${Math.round(rand(40,100))}px`);
    wrap.style.setProperty('--float-speed',`${rand(1.5,3.7).toFixed(2)}s`);
    wrap.style.animationDelay=`-${rand(0,3).toFixed(2)}s`;

    const b=document.createElement('button');
    b.className='balloon';b.type='button';b.textContent=num;b.setAttribute('aria-label',`Pop balloon ${num}`);
    b.style.setProperty('--c',colours[Math.floor(Math.random()*colours.length)]);
    const string=document.createElement('span');string.className='string';
    wrap.append(b,string);sky.append(wrap);

    b.addEventListener('click',()=>{
      if(wrap.classList.contains('popped')) return;
      const r=b.getBoundingClientRect(), sr=sky.getBoundingClientRect();
      burstAt(r.left-sr.left+r.width/2,r.top-sr.top+r.height/2);
      playPop(scale,index);
      wrap.classList.add('popped');
      popped++;
      counter.textContent=`${popped} / ${amount} popped`;
      message.textContent=popped===amount?'Brilliant! You popped every balloon! 🎉':`You popped ${num}!`;
      setTimeout(()=>wrap.remove(),260);
    });
  });
}

reset.addEventListener('click',layoutBalloons);
window.addEventListener('resize',()=>{clearTimeout(window.__balloonResize);window.__balloonResize=setTimeout(layoutBalloons,250)});
layoutBalloons();
