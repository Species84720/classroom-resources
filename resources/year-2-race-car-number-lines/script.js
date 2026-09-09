const params=new URLSearchParams(location.search);
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const linesCount=clamp(parseInt(params.get('lines')||'6',10)||6,1,10);
const perLine=clamp(parseInt(params.get('perLine')||params.get('length')||'5',10)||5,3,10);
const start=clamp(parseInt(params.get('start')||'1',10)||1,-100,999);
const step=clamp(parseInt(params.get('step')||'1',10)||1,1,20);
const missing=clamp(parseInt(params.get('missing')||'2',10)||2,1,Math.max(1,perLine-1));
const sequential=(params.get('sequential')||'1')!=='0';
const linesEl=document.querySelector('#lines');
const newSheet=document.querySelector('#new-sheet');
const printSheet=document.querySelector('#print-sheet');

function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

function buildLine(lineIndex){
  const base=sequential?start+lineIndex*perLine*step:start+lineIndex*step;
  const values=Array.from({length:perLine},(_,i)=>base+i*step);
  const candidates=[];
  for(let i=1;i<perLine-1;i++)candidates.push(i);
  if(candidates.length<missing){for(let i=0;i<perLine;i++)if(!candidates.includes(i))candidates.push(i)}
  const blanks=new Set(shuffle(candidates).slice(0,missing));
  const q=document.createElement('section');q.className='question';
  q.innerHTML=`<div class="question-head"><span class="question-title">Race ${lineIndex+1}</span><span class="race-mini">🏎️💨</span></div>`;
  const line=document.createElement('div');line.className='line';line.style.setProperty('--count',perLine);
  values.forEach((value,i)=>{
    const tick=document.createElement('div');
    tick.className=`tick ${blanks.has(i)?'blank':''} ${i===0?'start':''} ${i===perLine-1?'end':''}`;
    const num=document.createElement('span');num.className='num';num.textContent=blanks.has(i)?'':value;
    tick.append(num);line.append(tick);
  });
  q.append(line);return q;
}

function render(){linesEl.replaceChildren();for(let i=0;i<linesCount;i++)linesEl.append(buildLine(i))}
newSheet.addEventListener('click',render);
printSheet.addEventListener('click',()=>window.print());
render();
