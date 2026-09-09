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
let balloons = [];
let resizeTimer;
let lastFrame = performance.now();

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

function getSafePosition(w,h,placed,sw,sh){
  const padding = 10;
  for(let tries=0;tries<500;tries++){
    const x=rand(padding,Math.max(padding+1,sw-w-padding));
    const y=rand(padding,Math.max(padding+1,sh-h-100));
    const overlap=placed.some(p=>
      x < p.x+p.w+padding && x+w+padding > p.x &&
      y < p.y+p.h+padding && y+h+padding > p.y
    );
    if(!overlap) return {x,y};
  }
  return {x:padding,y:padding};
}

function positionExistingBalloons(){
  const active = balloons.filter(item=>!item.popped && item.wrap.isConnected);
  const sw=Math.max(360,sky.clientWidth);
  const sh=Math.max(500,sky.clientHeight);
  const placed=[];
  active.forEach(item=>{
    const pos=getSafePosition(item.w,item.h,placed,sw,sh);
    item.x=pos.x;item.y=pos.y;
    item.wrap.style.left=`${item.x}px`;
    item.wrap.style.top=`${item.y}px`;
    placed.push({x:item.x,y:item.y,w:item.w,h:item.h});
  });
}

function resolveCollisions(active){
  for(let i=0;i<active.length;i++){
    for(let j=i+1;j<active.length;j++){
      const a=active[i], b=active[j];
      const ax=a.x+a.w/2, ay=a.y+a.h/2;
      const bx=b.x+b.w/2, by=b.y+b.h/2;
      const dx=bx-ax, dy=by-ay;
      const minX=(a.w+b.w)*0.48;
      const minY=(a.h+b.h)*0.48;
      if(Math.abs(dx)<minX && Math.abs(dy)<minY){
        if(Math.abs(dx/minX) > Math.abs(dy/minY)){
          const push=(minX-Math.abs(dx))/2+0.5;
          const dir=dx>=0?1:-1;
          a.x-=push*dir; b.x+=push*dir;
          const av=a.vx; a.vx=-Math.abs(b.vx||0.18)*dir; b.vx=Math.abs(av||0.18)*dir;
        }else{
          const push=(minY-Math.abs(dy))/2+0.5;
          const dir=dy>=0?1:-1;
          a.y-=push*dir; b.y+=push*dir;
          const av=a.vy; a.vy=-Math.abs(b.vy||0.12)*dir; b.vy=Math.abs(av||0.12)*dir;
        }
      }
    }
  }
}

function animate(now){
  const dt=Math.min(2,(now-lastFrame)/16.67);
  lastFrame=now;
  const sw=Math.max(360,sky.clientWidth);
  const sh=Math.max(500,sky.clientHeight);
  const active=balloons.filter(item=>!item.popped && item.wrap.isConnected);

  for(const item of active){
    item.x += item.vx*dt;
    item.y += item.vy*dt;

    if(item.x<=4){item.x=4;item.vx=Math.abs(item.vx)}
    if(item.x+item.w>=sw-4){item.x=sw-item.w-4;item.vx=-Math.abs(item.vx)}
    if(item.y<=4){item.y=4;item.vy=Math.abs(item.vy)}
    if(item.y+item.h>=sh-90){item.y=sh-item.h-90;item.vy=-Math.abs(item.vy)}
  }

  resolveCollisions(active);

  for(const item of active){
    item.wrap.style.left=`${item.x}px`;
    item.wrap.style.top=`${item.y}px`;
  }
  requestAnimationFrame(animate);
}

function layoutBalloons(){
  sky.replaceChildren();
  balloons=[];
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
    const pos=getSafePosition(w,h,placed,sw,sh);
    const {x,y}=pos;
    placed.push({x,y,w,h});

    const wrap=document.createElement('div');
    wrap.className=`balloon-wrap ${shapes[Math.floor(Math.random()*shapes.length)]}`;
    wrap.style.left=`${x}px`;wrap.style.top=`${y}px`;
    wrap.style.setProperty('--w',`${w}px`);wrap.style.setProperty('--h',`${h}px`);
    wrap.style.setProperty('--font',`${Math.max(24,Math.round(w*.4))}px`);
    wrap.style.setProperty('--string',`${Math.round(rand(40,100))}px`);

    const b=document.createElement('button');
    b.className='balloon';b.type='button';b.textContent=num;b.setAttribute('aria-label',`Pop balloon ${num}`);
    b.style.setProperty('--c',colours[Math.floor(Math.random()*colours.length)]);
    const string=document.createElement('span');string.className='string';
    wrap.append(b,string);sky.append(wrap);

    const angle=rand(0,Math.PI*2);
    const speed=rand(.08,.22);
    const item={wrap,b,num,index,scale,w,h,x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,popped:false};
    balloons.push(item);

    b.addEventListener('click',()=>{
      if(item.popped) return;
      const r=b.getBoundingClientRect(), sr=sky.getBoundingClientRect();
      burstAt(r.left-sr.left+r.width/2,r.top-sr.top+r.height/2);
      playPop(scale,index);
      item.popped=true;
      wrap.classList.add('popped');
      popped++;
      counter.textContent=`${popped} / ${amount} popped`;
      message.textContent=popped===amount?'Brilliant! You popped every balloon! 🎉':`You popped ${num}!`;
      setTimeout(()=>wrap.remove(),260);
    });
  });
}

reset.addEventListener('click',layoutBalloons);
window.addEventListener('resize',()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(positionExistingBalloons,180);
});
layoutBalloons();
requestAnimationFrame(animate);
