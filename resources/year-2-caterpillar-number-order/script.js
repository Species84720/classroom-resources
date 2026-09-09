const cardsEl=document.querySelector("#cards");
const caterpillarsEl=document.querySelector("#caterpillars");
const progressEl=document.querySelector("#progress");
const messageEl=document.querySelector("#message");
let clues=new Set();
let selected=null;
let audioContext=null;

function shuffle(values){
  const a=[...values];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}

function chooseClues(){
  clues=new Set();
  for(let row=0;row<3;row++){
    const first=row*10+2;
    const middleNumbers=Array.from({length:8},(_,i)=>first+i);
    const firstClue=shuffle(middleNumbers)[0];
    const separated=middleNumbers.filter(number=>Math.abs(number-firstClue)>1);
    const secondClue=shuffle(separated)[0];
    clues.add(firstClue);clues.add(secondClue);
  }
}

function tone(frequency,start,duration,type="sine",volume=.08){
  audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
  const oscillator=audioContext.createOscillator();
  const gain=audioContext.createGain();
  oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,audioContext.currentTime+start);
  gain.gain.setValueAtTime(volume,audioContext.currentTime+start);
  gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+start+duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(audioContext.currentTime+start);oscillator.stop(audioContext.currentTime+start+duration);
}

function playStarSound(){
  tone(659,0,.18);tone(784,.1,.2);tone(1047,.2,.34,"sine",.1);
}

function playWrongSound(){
  audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
  const oscillator=audioContext.createOscillator();
  const gain=audioContext.createGain();
  oscillator.type="triangle";
  oscillator.frequency.setValueAtTime(180,audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(105,audioContext.currentTime+.28);
  gain.gain.setValueAtTime(.07,audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.3);
  oscillator.connect(gain).connect(audioContext.destination);oscillator.start();oscillator.stop(audioContext.currentTime+.3);
}

function makeCaterpillars(){
  caterpillarsEl.innerHTML="";
  for(let row=0;row<3;row++){
    const wrap=document.createElement("section");
    wrap.className="caterpillar-row";wrap.dataset.row=row;
    wrap.setAttribute("aria-label",`Caterpillar for numbers ${row*10+1} to ${row*10+10}`);
    const label=document.createElement("div");
    label.className="range";label.textContent=`${row*10+1}–${row*10+10}`;wrap.append(label);
    for(let col=0;col<10;col++){
      const answer=row*10+col+1;
      const segment=document.createElement("div");
      segment.className="segment"+(col===0?" head":"");
      if(col===0)segment.innerHTML='<span class="antenna" aria-hidden="true"></span><span class="face" aria-hidden="true"><i class="eye"></i><i class="eye"></i></span><span class="smile" aria-hidden="true"></span>';
      const slot=document.createElement("button");
      slot.type="button";slot.className="slot";slot.dataset.answer=answer;
      if(clues.has(answer)){
        slot.textContent=answer;slot.dataset.number=answer;slot.classList.add("fixed","correct");slot.disabled=true;
        slot.setAttribute("aria-label",`Number clue ${answer}`);
      }else{
        slot.setAttribute("aria-label","Empty number position");
        slot.addEventListener("click",()=>selected&&placeCard(selected,slot));
        slot.addEventListener("dragover",e=>{e.preventDefault();slot.classList.add("over")});
        slot.addEventListener("dragleave",()=>slot.classList.remove("over"));
        slot.addEventListener("drop",e=>{e.preventDefault();slot.classList.remove("over");const n=e.dataTransfer.getData("text/plain");placeCard(document.querySelector(`.card[data-number="${n}"]`),slot)});
      }
      segment.append(slot);wrap.append(segment);
    }
    caterpillarsEl.append(wrap);
  }
}

function makeCards(){
  cardsEl.innerHTML="";
  const numbers=Array.from({length:30},(_,i)=>i+1).filter(number=>!clues.has(number));
  shuffle(numbers).forEach(number=>{
    const card=document.createElement("button");
    card.type="button";card.className="card";card.draggable=true;card.dataset.number=number;card.textContent=number;
    card.setAttribute("aria-label",`Number ${number}. Tap, then choose its empty circle.`);
    card.addEventListener("click",()=>selectCard(card));
    card.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/plain",number);card.classList.add("dragging")});
    card.addEventListener("dragend",()=>card.classList.remove("dragging"));
    cardsEl.append(card);
  });
}

function selectCard(card){
  if(selected===card){card.classList.remove("selected");selected=null;messageEl.textContent="Choose another number card.";return}
  document.querySelectorAll(".card.selected").forEach(c=>c.classList.remove("selected"));
  selected=card;card.classList.add("selected");messageEl.textContent=`Number ${card.dataset.number} selected. Now choose its circle.`;
}

function clearSelection(card){
  card.classList.remove("selected");selected=null;
}

function rewardCorrect(slot){
  const row=slot.closest(".caterpillar-row");
  row.classList.remove("good-hop");void row.offsetWidth;row.classList.add("good-hop");
  setTimeout(()=>row.classList.remove("good-hop"),600);
}

function celebrateRow(row){
  row.classList.remove("celebrate");void row.offsetWidth;row.classList.add("celebrate");
  const bubble=document.createElement("span");
  bubble.className="reward-bubble";bubble.textContent="Good job! ★";
  bubble.setAttribute("aria-hidden","true");row.append(bubble);
  setTimeout(()=>{row.classList.remove("celebrate");bubble.remove()},1400);
}

function placeCard(card,slot){
  if(!card||card.classList.contains("placed")||slot.disabled)return;
  const number=Number(card.dataset.number);
  const answer=Number(slot.dataset.answer);
  clearSelection(card);
  if(number!==answer){
    card.classList.remove("returning");void card.offsetWidth;card.classList.add("returning");
    setTimeout(()=>card.classList.remove("returning"),320);
    playWrongSound();messageEl.className="message try";
    messageEl.textContent=`Not there. Number ${number} has gone back. Try another circle.`;
    return;
  }
  slot.textContent=number;slot.dataset.number=number;slot.disabled=true;slot.classList.add("correct");
  slot.setAttribute("aria-label",`Correct number ${number}`);
  card.classList.add("placed");playStarSound();rewardCorrect(slot);updateProgress();
  const row=slot.closest(".caterpillar-row");
  const finished=[...row.querySelectorAll(".slot")].every(item=>item.dataset.number);
  if(document.querySelectorAll(".card.placed").length===24){
    row.classList.add("complete");
    celebrateRow(row);
    messageEl.className="message success";messageEl.textContent="Fantastic! All three caterpillars are happy!";
  }else if(finished){
    row.classList.add("complete");
    celebrateRow(row);
    const range=row.querySelector(".range").textContent;
    messageEl.className="message success";messageEl.textContent=`Brilliant! The ${range} caterpillar is complete and happy!`;
  }else{
    messageEl.className="message success";messageEl.textContent=`Great! Number ${number} is in the right place.`;
  }
}

function updateProgress(){
  const count=document.querySelectorAll(".card.placed").length;
  progressEl.textContent=`${count} of 24 placed`;
}

function resetGame(){
  selected=null;chooseClues();makeCaterpillars();makeCards();updateProgress();messageEl.className="message";messageEl.textContent="New number clues! Use them to find each card's place.";
}

document.querySelector("#reset").addEventListener("click",resetGame);
resetGame();
