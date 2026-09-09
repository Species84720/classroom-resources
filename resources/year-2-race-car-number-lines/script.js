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

function parseRanges(){
  const raw=params.get('ranges');
  if(!raw)return null;
  const ranges=raw.split(',').map(part=>part.trim()).filter(Boolean).map(part=>{
    const m=part.match(/^(-?\d+)\s*[-:]\s*(-?\d+)$/);
    if(!m)return null;
    const a=parseInt(m[1],10),b=parseInt(m[2],10);
    if(!Number.isFinite(a)||!Number.isFinite(b))return null;
    return {start:a,end:b};
  }).filter(Boolean);
  return ranges.length?ranges:null;
}

const customRanges=parseRanges();

function valuesForLine(lineIndex){
  if(customRanges&&customRanges[lineIndex]){
    const {start:a,end:b}=customRanges[lineIndex];
    const dir=b>=a?1:-1;
    const values=[];
    for(let n=a;dir>0?n<=b:n>=b;n+=dir)values.push(n);
    return values;
  }
  const base=sequential?start+lineIndex*perLine*step:start+lineIndex*step;
  return Array.from({length:perLine},(_,i)=>base+i*step);
}

function buildLine(lineIndex){
  const values=valuesForLine(lineIndex);
  const count=values.length;
  const blanksToUse=Math.min(missing,Math.max(1,count-1));
  const candidates=[];
  for(let i=1;i<count-1;i++)candidates.push(i);
  if(candidates.length<blanksToUse){for(let i=0;i<count;i++)if(!candidates.includes(i))candidates.push(i)}
  const blanks=new Set(shuffle(candidates).slice(0,blanksToUse));
  const q=document.createElement('section');q.className='question';
  q.innerHTML=`<div class="question-head"><span class="question-title">Race ${lineIndex+1}</span><span class="race-mini">🏎️💨</span></div>`;
  const line=document.createElement('div');line.className='line';line.style.setProperty('--count',count);
  values.forEach((value,i)=>{
    const tick=document.createElement('div');
    tick.className=`tick ${blanks.has(i)?'blank':''} ${i===0?'start':''} ${i===count-1?'end':''}`;
    const num=document.createElement('span');num.className='num';num.textContent=blanks.has(i)?'':value;
    tick.append(num);line.append(tick);
  });
  q.append(line);return q;
}

function render(){
  linesEl.replaceChildren();
  const count=customRanges?Math.min(linesCount,customRanges.length):linesCount;
  for(let i=0;i<count;i++)linesEl.append(buildLine(i));
}
newSheet.addEventListener('click',render);
printSheet.addEventListener('click',()=>window.print());
render();
