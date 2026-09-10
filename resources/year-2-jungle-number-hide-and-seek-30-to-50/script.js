const MIN=30,MAX=50;
const positions=[
[7,15],[21,9],[38,18],[57,10],[76,19],[88,8],[13,36],[29,31],[47,39],[65,30],[83,40],
[5,59],[20,54],[36,62],[54,52],[72,62],[89,56],[15,80],[34,76],[62,79],[82,76]
];
const targetEl=document.querySelector("#target");
const progressEl=document.querySelector("#progress");
const messageEl=document.querySelector("#message");
const numbersEl=document.querySelector("#numbers");
const hintBtn=document.querySelector("#hint");
const restartBtn=document.querySelector("#restart");
let order=[],found=new Set(),target=null,buttons=new Map();

function shuffle(items){
  const copy=[...items];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}
function speak(text){
  if("speechSynthesis" in window){speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang="en-GB";utterance.rate=.88;speechSynthesis.speak(utterance);}
}
function build(){
  found=new Set();
  order=shuffle(Array.from({length:MAX-MIN+1},(_,i)=>MIN+i));
  numbersEl.replaceChildren();
  buttons=new Map();
  const spots=shuffle(positions);
  order.forEach((number,index)=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="number";
    button.textContent=number;
    button.setAttribute("aria-label","Number "+number);
    button.style.left=spots[index][0]+"%";
    button.style.top=spots[index][1]+"%";
    button.style.transform="rotate("+(-10+Math.random()*20)+"deg)";
    button.addEventListener("click",()=>choose(number,button));
    numbersEl.append(button);
    buttons.set(number,button);
  });
  setTarget();
  updateProgress();
  messageEl.textContent="Look carefully—the numbers are hiding in the picture!";
}
function setTarget(){
  target=order.find(number=>!found.has(number))??null;
  if(target===null){
    targetEl.textContent="★";
    messageEl.textContent="Brilliant exploring! You found every number from 30 to 50!";
    hintBtn.disabled=true;
    speak("Brilliant! You found every number.");
    return;
  }
  targetEl.textContent=target;
  hintBtn.disabled=false;
}
function choose(number,button){
  if(number===target){
    found.add(number);
    button.classList.add("found");
    button.disabled=true;
    messageEl.textContent="Yes! You found "+number+".";
    speak("Yes! "+number);
    updateProgress();
    window.setTimeout(setTarget,450);
  }else{
    button.classList.remove("wrong");
    void button.offsetWidth;
    button.classList.add("wrong");
    messageEl.textContent="That is "+number+". Keep looking for "+target+".";
    speak("That is "+number+". Find "+target+".");
  }
}
function updateProgress(){progressEl.textContent="Found "+found.size+" of 21";}
hintBtn.addEventListener("click",()=>{
  const button=buttons.get(target);
  if(!button)return;
  button.classList.add("hinted");
  button.focus({preventScroll:true});
  messageEl.textContent="Milo sees it glowing!";
  window.setTimeout(()=>button.classList.remove("hinted"),2300);
});
restartBtn.addEventListener("click",()=>{
  if("speechSynthesis" in window)speechSynthesis.cancel();
  build();
});
build();
