const MIN=30, MAX=50;
const params=new URLSearchParams(window.location.search);

function clampAmount(value){
  const n=Number.parseInt(value,10);
  return Number.isFinite(n)?Math.max(1,Math.min(21,n)):8;
}

function parseRequestedNumbers(){
  const raw=params.get("numbers");
  if(!raw)return null;
  const parsed=raw.split(/[;,\s]+/)
    .map(v=>Number.parseInt(v,10))
    .filter(n=>Number.isFinite(n)&&n>=MIN&&n<=MAX);
  return [...new Set(parsed)];
}

function shuffle(items){
  const copy=[...items];
  for(let i=copy.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]]=[copy[j],copy[i]];
  }
  return copy;
}

const requested=parseRequestedNumbers();
const amount=clampAmount(params.get("amount"));
const allNumbers=Array.from({length:MAX-MIN+1},(_,i)=>MIN+i);
const activeNumbers=requested?.length
  ? requested.slice(0,amount)
  : shuffle(allNumbers).slice(0,amount);

const spots=[
  [8,18],[18,12],[31,20],[43,13],[58,19],[72,11],[87,20],
  [11,38],[24,33],[39,41],[54,34],[68,39],[83,35],[91,48],
  [8,59],[20,55],[34,64],[49,56],[63,63],[78,57],[90,67],
  [14,80],[29,75],[45,83],[61,77],[76,84],[88,78]
];

const targetListEl=document.querySelector("#targets");
const progressEl=document.querySelector("#progress");
const messageEl=document.querySelector("#message");
const numbersEl=document.querySelector("#numbers");
const hintBtn=document.querySelector("#hint");
const restartBtn=document.querySelector("#restart");

let found=new Set();
let buttons=new Map();

function speak(text){
  if("speechSynthesis" in window){
    speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(text);
    utterance.lang="en-GB";
    utterance.rate=.9;
    speechSynthesis.speak(utterance);
  }
}

function renderTargets(){
  targetListEl.replaceChildren();
  activeNumbers.forEach(number=>{
    const badge=document.createElement("span");
    badge.className="target-chip"+(found.has(number)?" found":"");
    badge.textContent=number;
    badge.setAttribute("aria-label",found.has(number)?`Number ${number} found`:`Find number ${number}`);
    targetListEl.append(badge);
  });
}

function updateProgress(){
  progressEl.textContent=`Found ${found.size} of ${activeNumbers.length}`;
  renderTargets();
}

function celebrate(button,number){
  button.classList.add("found");
  button.disabled=true;
  const burst=document.createElement("span");
  burst.className="burst";
  burst.textContent=["⭐","🎉","👏","🌟","😊"][Math.floor(Math.random()*5)];
  button.append(burst);
  window.setTimeout(()=>burst.remove(),900);
  messageEl.textContent=`Great spotting! You found ${number}.`;
  speak(`Great! You found ${number}.`);
}

function choose(number,button){
  if(found.has(number))return;
  found.add(number);
  celebrate(button,number);
  updateProgress();
  if(found.size===activeNumbers.length){
    messageEl.textContent="Amazing! You found every hidden jungle number!";
    hintBtn.disabled=true;
    speak("Amazing! You found every hidden jungle number!");
    document.querySelector("#jungle").classList.add("complete");
  }
}

function build(){
  found=new Set();
  buttons=new Map();
  numbersEl.replaceChildren();
  document.querySelector("#jungle").classList.remove("complete");
  const chosenSpots=shuffle(spots).slice(0,activeNumbers.length);
  shuffle(activeNumbers).forEach((number,index)=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="number";
    button.textContent=number;
    button.setAttribute("aria-label",`Hidden number ${number}`);
    button.style.left=chosenSpots[index][0]+"%";
    button.style.top=chosenSpots[index][1]+"%";
    button.style.transform=`translate(-50%,-50%) rotate(${Math.round(-12+Math.random()*24)}deg)`;
    button.addEventListener("click",()=>choose(number,button));
    numbersEl.append(button);
    buttons.set(number,button);
  });
  hintBtn.disabled=false;
  messageEl.textContent="Look on the leaves, rocks, trees and other jungle objects!";
  updateProgress();
}

hintBtn.addEventListener("click",()=>{
  const remaining=activeNumbers.filter(number=>!found.has(number));
  if(!remaining.length)return;
  const number=remaining[Math.floor(Math.random()*remaining.length)];
  const button=buttons.get(number);
  if(!button)return;
  button.classList.remove("hinted");
  void button.offsetWidth;
  button.classList.add("hinted");
  messageEl.textContent=`A jungle sparkle is showing where ${number} is hiding!`;
  window.setTimeout(()=>button.classList.remove("hinted"),2200);
});

restartBtn.addEventListener("click",()=>{
  if("speechSynthesis" in window)speechSynthesis.cancel();
  const next=new URL(window.location.href);
  if(!requested?.length){
    next.searchParams.set("amount",amount);
    window.location.href=next.toString();
  }else{
    build();
  }
});

build();
