const cardsEl=document.querySelector("#cards");
const caterpillarsEl=document.querySelector("#caterpillars");
const progressEl=document.querySelector("#progress");
const messageEl=document.querySelector("#message");
let clues=new Set();
let selected=null;
let audioContext=null;

const numberRewards=[
  {text:"Great spotting!",emoji:"⭐",effect:"sparkle"},
  {text:"Super counting!",emoji:"🌟",effect:"bounce"},
  {text:"Clever caterpillar!",emoji:"🐛",effect:"wiggle"},
  {text:"Brilliant!",emoji:"🎉",effect:"confetti"},
  {text:"You found it!",emoji:"✨",effect:"sparkle"},
  {text:"Nice work!",emoji:"🍎",effect:"bounce"},
  {text:"Fantastic!",emoji:"🌈",effect:"confetti"},
  {text:"Keep going!",emoji:"🚀",effect:"wiggle"}
];

const rowRewards=[
  {text:"Caterpillar disco!",emoji:"🪩",effect:"disco"},
  {text:"Ten-number treasure!",emoji:"💎",effect:"treasure"},
  {text:"Rainbow celebration!",emoji:"🌈",effect:"rainbow"},
  {text:"Star shower!",emoji:"🌟",effect:"stars"},
  {text:"Party time!",emoji:"🎊",effect:"party"}
];

function shuffle(values){
  const a=[...values];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}

function randomItem(values){return values[Math.floor(Math.random()*values.length)]}

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

function playStarSound(){tone(659,0,.14);tone(784,.08,.16);tone(1047,.16,.28,"sine",.09)}
function playRowSound(){tone(523,0,.16);tone(659,.12,.18);tone(784,.24,.2);tone(1047,.38,.42,"sine",.1)}

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

function clearSelection(card){card.classList.remove("selected");selected=null}

function makeRewardBurst(row,reward,large=false){
  const burst=document.createElement("div");
  burst.className=`reward-burst ${large?"big":"small"} ${reward.effect}`;
  burst.setAttribute("aria-hidden","true");
  const count=large?18:7;
  for(let i=0;i<count;i++){
    const piece=document.createElement("span");
    piece.textContent=i===0?reward.emoji:randomItem([reward.emoji,"★","✦","●"]);
    piece.style.setProperty("--i",i);
    piece.style.setProperty("--x",`${Math.round((Math.random()-.5)*(large?330:150))}px`);
    piece.style.setProperty("--y",`${Math.round(-35-Math.random()*(large?130:70))}px`);
    piece.style.setProperty("--r",`${Math.round((Math.random()-.5)*100)}deg`);
    burst.append(piece);
  }
  row.append(burst);
  setTimeout(()=>burst.remove(),large?1900:900);
}

function showRewardBubble(row,reward,large=false){
  const bubble=document.createElement("span");
  bubble.className=`reward-bubble ${large?"big":"small"}`;
  bubble.textContent=`${reward.emoji} ${reward.text}`;
  bubble.setAttribute("aria-hidden","true");
  row.append(bubble);
  setTimeout(()=>bubble.remove(),large?1800:950);
}

function rewardCorrect(slot,number){
  const row=slot.closest(".caterpillar-row");
  const reward=randomItem(numberRewards);
  row.classList.remove("correct-wiggle",`effect-${reward.effect}`);
  void row.offsetWidth;
  row.classList.add("correct-wiggle",`effect-${reward.effect}`);
  showRewardBubble(row,reward,false);
  makeRewardBurst(row,reward,false);
  setTimeout(()=>row.classList.remove("correct-wiggle",`effect-${reward.effect}`),760);
  messageEl.className="message success";
  messageEl.textContent=`${reward.emoji} ${reward.text} Number ${number} is correct.`;
}

function celebrateRow(row){
  const reward=randomItem(rowRewards);
  row.classList.remove("celebrate");
  [...rowRewards].forEach(item=>row.classList.remove(`row-${item.effect}`));
  void row.offsetWidth;
  row.classList.add("celebrate",`row-${reward.effect}`);
  showRewardBubble(row,reward,true);
  makeRewardBurst(row,reward,true);
  playRowSound();
  setTimeout(()=>row.classList.remove("celebrate",`row-${reward.effect}`),1900);
  return reward;
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
  card.classList.add("placed");playStarSound();rewardCorrect(slot,number);updateProgress();
  const row=slot.closest(".caterpillar-row");
  const finished=[...row.querySelectorAll(".slot")].every(item=>item.dataset.number);
  if(document.querySelectorAll(".card.placed").length===24){
    row.classList.add("complete");
    const reward=celebrateRow(row);
    messageEl.className="message success grand";messageEl.textContent=`${reward.emoji} ${reward.text} All three caterpillars are complete!`;
  }else if(finished){
    row.classList.add("complete");
    const reward=celebrateRow(row);
    const range=row.querySelector(".range").textContent;
    messageEl.className="message success";messageEl.textContent=`${reward.emoji} ${reward.text} The ${range} caterpillar is complete!`;
  }
}

function updateProgress(){
  const count=document.querySelectorAll(".card.placed").length;
  progressEl.textContent=`${count} of 24 placed`;
}

function resetGame(){
  selected=null;chooseClues();makeCaterpillars();makeCards();updateProgress();messageEl.className="message";messageEl.textContent="New number clues! Every correct answer wakes up the caterpillar — see what happens!";
}

document.querySelector("#reset").addEventListener("click",resetGame);
resetGame();
