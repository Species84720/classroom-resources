const MIN=30,MAX=50;
const params=new URLSearchParams(window.location.search);

function clampAmount(value){const n=Number.parseInt(value,10);return Number.isFinite(n)?Math.max(1,Math.min(16,n)):8;}
function parseRequestedNumbers(){const raw=params.get("numbers");if(!raw)return null;return [...new Set(raw.split(/[;,\s]+/).map(v=>Number.parseInt(v,10)).filter(n=>Number.isFinite(n)&&n>=MIN&&n<=MAX))];}
function shuffle(items){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
function pick(items){return items[Math.floor(Math.random()*items.length)];}
function between(min,max){return min+Math.random()*(max-min);}

const requested=parseRequestedNumbers();
const amount=clampAmount(params.get("amount"));
const allNumbers=Array.from({length:MAX-MIN+1},(_,i)=>MIN+i);
let activeNumbers=[];

const sceneObjectEl=document.querySelector("#sceneObjects");
const targetListEl=document.querySelector("#targets");
const progressEl=document.querySelector("#progress");
const messageEl=document.querySelector("#message");
const numbersEl=document.querySelector("#numbers");
const hintBtn=document.querySelector("#hint");
const restartBtn=document.querySelector("#restart");
const jungleEl=document.querySelector("#jungle");

const objectTypes=[
  {name:"palm",emoji:"🌴",size:[82,132],zones:[[3,47,18,38],[80,47,17,38]]},
  {name:"bush",emoji:"🌿",size:[54,92],zones:[[3,48,92,42]]},
  {name:"leaf",emoji:"🍃",size:[42,70],zones:[[5,34,90,45]]},
  {name:"parrot",emoji:"🦜",size:[45,68],zones:[[8,25,84,42]]},
  {name:"frog",emoji:"🐸",size:[42,64],zones:[[5,55,90,30]]},
  {name:"monkey",emoji:"🐒",size:[48,72],zones:[[6,28,88,48]]},
  {name:"tiger",emoji:"🐯",size:[50,76],zones:[[8,52,84,30]]},
  {name:"snake",emoji:"🐍",size:[48,82],zones:[[5,30,90,45]]},
  {name:"toucan",emoji:"🐦",size:[45,67],zones:[[7,26,86,43]]},
  {name:"butterfly",emoji:"🦋",size:[36,55],zones:[[7,18,86,48]]},
  {name:"banana",emoji:"🍌",size:[40,58],zones:[[8,28,84,44]]},
  {name:"flower",emoji:"🌺",size:[38,58],zones:[[4,55,92,30]]},
  {name:"flower",emoji:"🌸",size:[38,58],zones:[[4,55,92,30]]},
  {name:"mushroom",emoji:"🍄",size:[36,54],zones:[[5,57,90,27]]}
];

const builtObjects=[
  {name:"rock",html:"",className:"prop rock-prop",size:[70,120],zones:[[4,55,92,27]]},
  {name:"log",html:"",className:"prop log-prop",size:[95,160],zones:[[4,56,92,25]]},
  {name:"sign",html:"",className:"prop sign-prop",size:[78,110],zones:[[5,48,90,30]]},
  {name:"stump",html:"",className:"prop stump-prop",size:[62,92],zones:[[5,57,90,25]]},
  {name:"lily",html:"",className:"prop lily-prop",size:[56,90],zones:[[18,66,64,22]]}
];

let found=new Set();
let buttons=new Map();
let placed=[];

function overlaps(x,y,w,h){return placed.some(p=>Math.abs(p.x-x)<(p.w+w)*0.42&&Math.abs(p.y-y)<(p.h+h)*0.42);}
function findPlacement(zones,w,h){for(let tries=0;tries<80;tries++){const z=pick(zones);const x=between(z[0],z[0]+z[2]);const y=between(z[1],z[1]+z[3]);if(!overlaps(x,y,w/10,h/10))return{x,y};}return{x:between(8,92),y:between(25,82)};}

function makeObject(def,isTarget=false){const size=Math.round(between(def.size[0],def.size[1]));const pos=findPlacement(def.zones,size,size);const wrap=document.createElement("div");wrap.className=`scene-item ${def.className||"emoji-prop"} ${def.name}`;wrap.style.left=pos.x+"%";wrap.style.top=pos.y+"%";wrap.style.fontSize=size+"px";wrap.style.transform=`translate(-50%,-50%) rotate(${Math.round(between(-11,11))}deg) scaleX(${Math.random()>.5?1:-1})`;
  if(def.emoji)wrap.textContent=def.emoji;else wrap.innerHTML=def.html||"";
  if(isTarget)wrap.classList.add("number-host");
  sceneObjectEl.append(wrap);placed.push({x:pos.x,y:pos.y,w:size/10,h:size/10});return wrap;
}

function randomDefinition(){return Math.random()<.72?pick(objectTypes):pick(builtObjects);}

function speak(text){if("speechSynthesis" in window){speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang="en-GB";utterance.rate=.9;speechSynthesis.speak(utterance);}}

function renderTargets(){targetListEl.replaceChildren();activeNumbers.forEach(number=>{const badge=document.createElement("span");badge.className="target-chip"+(found.has(number)?" found":"");badge.textContent=number;badge.setAttribute("aria-label",found.has(number)?`Number ${number} found`:`Find number ${number}`);targetListEl.append(badge);});}
function updateProgress(){progressEl.textContent=`Found ${found.size} of ${activeNumbers.length}`;renderTargets();}

function choose(number,button){
  if(found.has(number))return;
  found.add(number);
  const host=button.closest(".scene-item");
  const hostRect=host.getBoundingClientRect();
  const jungleRect=jungleEl.getBoundingClientRect();
  button.classList.add("found");
  button.disabled=true;
  button.style.left=(hostRect.left-jungleRect.left+hostRect.width/2)+"px";
  button.style.top=(hostRect.top-jungleRect.top+hostRect.height/2)+"px";
  button.style.transform="translate(-50%,-50%) rotate(0deg) scaleX(1)";
  jungleEl.append(button);
  const burst=document.createElement("span");
  burst.className="burst";
  burst.textContent=pick(["⭐","🎉","👏","🌟","😊","🦜","🐒"]);
  button.append(burst);
  setTimeout(()=>burst.remove(),900);
  messageEl.textContent=`Great spotting! You found ${number}.`;
  speak(`Great! You found ${number}.`);
  updateProgress();
  if(found.size===activeNumbers.length){messageEl.textContent="Amazing! You found every hidden jungle number!";hintBtn.disabled=true;speak("Amazing! You found every hidden jungle number!");jungleEl.classList.add("complete");}
}

function attachNumber(number,host){const button=document.createElement("button");button.type="button";button.className="number";button.textContent=number;button.setAttribute("aria-label",`Hidden number ${number}`);button.style.left=between(28,72)+"%";button.style.top=between(28,72)+"%";button.style.transform=`translate(-50%,-50%) rotate(${Math.round(between(-14,14))}deg)`;button.addEventListener("click",()=>choose(number,button));host.append(button);buttons.set(number,button);}

function build(){found=new Set();buttons=new Map();placed=[];sceneObjectEl.replaceChildren();numbersEl.replaceChildren();jungleEl.querySelectorAll(":scope > .number.found").forEach(el=>el.remove());jungleEl.classList.remove("complete");activeNumbers=requested?.length?requested.slice(0,amount):shuffle(allNumbers).slice(0,amount);
  const targetDefs=shuffle([...objectTypes,...builtObjects,...objectTypes]).slice(0,activeNumbers.length);
  shuffle(activeNumbers).forEach((number,index)=>{const host=makeObject(targetDefs[index]||randomDefinition(),true);attachNumber(number,host);});
  const clutterCount=Math.max(12,Math.min(26,activeNumbers.length+10+Math.floor(Math.random()*7)));
  for(let i=0;i<clutterCount;i++)makeObject(randomDefinition(),false);
  hintBtn.disabled=false;messageEl.textContent="Look closely — numbers can be on animals, plants, rocks, logs and signs!";updateProgress();}

hintBtn.addEventListener("click",()=>{const remaining=activeNumbers.filter(number=>!found.has(number));if(!remaining.length)return;const number=pick(remaining);const button=buttons.get(number);if(!button)return;button.classList.remove("hinted");void button.offsetWidth;button.classList.add("hinted");messageEl.textContent=`Something is sparkling near ${number}!`;setTimeout(()=>button.classList.remove("hinted"),2200);});
restartBtn.addEventListener("click",()=>{if("speechSynthesis" in window)speechSynthesis.cancel();build();});
build();
