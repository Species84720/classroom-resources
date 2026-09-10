const cardsEl=document.querySelector("#cards");
const caterpillarsEl=document.querySelector("#caterpillars");
const progressEl=document.querySelector("#progress");
const messageEl=document.querySelector("#message");
let clues=new Set();
let selected=null;
let audioContext=null;

const teacherSettingsEl=document.querySelector("#teacherSettings");
const teacherPanelEl=document.querySelector("#teacherPanel");
const hintCountEl=document.querySelector("#hintCount");
const hintValueEl=document.querySelector("#hintValue");
const musicEl=document.querySelector("#music");
const requestedHintCount=Number.parseInt(new URLSearchParams(window.location.search).get("hint")||"2",10);
let hintCount=Number.isFinite(requestedHintCount)?Math.min(5,Math.max(0,requestedHintCount)):2;
let musicTimer=null;
let musicStep=0;

const numberRewards=[
  {text:"Great spotting!",emoji:"⭐",effect:"sparkle"},
  {text:"Super counting!",emoji:"🌟",effect:"bounce"},
  {text:"Clever caterpillar!",emoji:"🐛",effect:"wiggle"},
  {text:"Brilliant!",emoji:"🎉",effect:"confetti"},
  {text:"You found it!",emoji:"✨",effect:"sparkle"},
  {text:"Nice work!",emoji:"👍",effect:"bounce"},
  {text:"Fantastic!",emoji:"🤩",effect:"confetti"},
  {text:"Keep going!",emoji:"😀",effect:"wiggle"}
];

const emojiThemes=[
  ["👍","👍","👍","👍","👏","⭐"],
  ["😀","😄","😁","😊","😀","😄"],
  ["🤩","🤩","⭐","✨","🌟","🤩"],
  ["🎉","🎊","🎉","🥳","🎊","✨"],
  ["🐛","🐛","🌿","🐛","🍃","🐛"],
  ["🚀","🚀","⭐","✨","🚀","🌟"],
  ["🌈","✨","🌈","⭐","🌈","✨"],
  ["👏","👏","👏","🙌","👏","👍"]
];

const wigglePatterns=[
  {
    name:"side-to-side",
    row:[
      {transform:"translateX(0) rotate(0deg)"},
      {transform:"translateX(-10px) rotate(-1.5deg)"},
      {transform:"translateX(10px) rotate(1.5deg)"},
      {transform:"translateX(-7px) rotate(-1deg)"},
      {transform:"translateX(7px) rotate(1deg)"},
      {transform:"translateX(0) rotate(0deg)"}
    ],
    segment:[
      {transform:"translateY(0) rotate(0deg)"},
      {transform:"translateY(-6px) rotate(-3deg)"},
      {transform:"translateY(4px) rotate(3deg)"},
      {transform:"translateY(0) rotate(0deg)"}
    ],
    duration:620,
    segmentDuration:430,
    delay:28
  },
  {
    name:"bouncy-wave",
    row:[
      {transform:"translateY(0) scale(1)"},
      {transform:"translateY(-7px) scale(1.015)"},
      {transform:"translateY(3px) scale(.995)"},
      {transform:"translateY(-4px) scale(1.01)"},
      {transform:"translateY(0) scale(1)"}
    ],
    segment:[
      {transform:"translateY(0) scale(1)"},
      {transform:"translateY(-13px) scale(1.06)"},
      {transform:"translateY(3px) scale(.98)"},
      {transform:"translateY(0) scale(1)"}
    ],
    duration:680,
    segmentDuration:500,
    delay:42
  },
  {
    name:"twisty",
    row:[
      {transform:"rotate(0deg)"},
      {transform:"rotate(-2deg)"},
      {transform:"rotate(2deg)"},
      {transform:"rotate(-1.5deg)"},
      {transform:"rotate(1deg)"},
      {transform:"rotate(0deg)"}
    ],
    segment:[
      {transform:"rotate(0deg) translateY(0)"},
      {transform:"rotate(-8deg) translateY(-5px)"},
      {transform:"rotate(8deg) translateY(2px)"},
      {transform:"rotate(0deg) translateY(0)"}
    ],
    duration:700,
    segmentDuration:470,
    delay:32
  },
  {
    name:"squirm",
    row:[
      {transform:"translateX(0) skewX(0deg)"},
      {transform:"translateX(-6px) skewX(-2deg)"},
      {transform:"translateX(7px) skewX(2deg)"},
      {transform:"translateX(-4px) skewX(-1deg)"},
      {transform:"translateX(4px) skewX(1deg)"},
      {transform:"translateX(0) skewX(0deg)"}
    ],
    segment:[
      {transform:"translate(0,0) rotate(0deg)"},
      {transform:"translate(-3px,-8px) rotate(-5deg)"},
      {transform:"translate(3px,5px) rotate(5deg)"},
      {transform:"translate(0,0) rotate(0deg)"}
    ],
    duration:760,
    segmentDuration:520,
    delay:24
  },
  {
    name:"happy-hop",
    row:[
      {transform:"translateY(0)"},
      {transform:"translateY(-12px)"},
      {transform:"translateY(2px)"},
      {transform:"translateY(-7px)"},
      {transform:"translateY(0)"}
    ],
    segment:[
      {transform:"translateY(0) rotate(0deg)"},
      {transform:"translateY(-16px) rotate(-3deg)"},
      {transform:"translateY(1px) rotate(2deg)"},
      {transform:"translateY(0) rotate(0deg)"}
    ],
    duration:720,
    segmentDuration:460,
    delay:55
  }
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
function targetCount(){return 30-clues.size}

function chooseSpacedHints(numbers,count){
  const results=[];
  const search=(start,chosen)=>{
    if(chosen.length===count){results.push([...chosen]);return}
    for(let i=start;i<numbers.length;i++){
      const n=numbers[i];
      if(chosen.length&&n-chosen[chosen.length-1]===1)continue;
      chosen.push(n);
      search(i+1,chosen);
      chosen.pop();
    }
  };
  search(0,[]);
  if(results.length)return randomItem(results);
  return shuffle(numbers).slice(0,count);
}

function chooseClues(){
  clues=new Set();
  for(let row=0;row<3;row++){
    const first=row*10+1;
    const rowNumbers=Array.from({length:10},(_,i)=>first+i);
    chooseSpacedHints(rowNumbers,hintCount).forEach(number=>clues.add(number));
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

const musicMelody=[
  523.25,659.25,783.99,1046.5,783.99,659.25,587.33,698.46,
  880,1174.66,880,698.46,659.25,783.99,987.77,1318.51,
  1046.5,783.99,659.25,783.99,587.33,698.46,880,698.46,
  659.25,783.99,1046.5,1318.51,1174.66,987.77,783.99,1046.5
];
const musicBass=[130.81,146.83,174.61,196];
function playMusicNote(){
  const note=musicMelody[musicStep%musicMelody.length];
  tone(note,0,.24,musicStep%8===7?"sine":"triangle",.028);
  if(musicStep%2===0)tone(note/2,.03,.2,"square",.009);
  if(musicStep%4===0){
    tone(musicBass[Math.floor(musicStep/4)%musicBass.length],0,.34,"triangle",.02);
    tone(95,0,.1,"sine",.024);
  }
  if(musicStep%4===2)tone(140,0,.05,"square",.008);
  musicStep++;
}
function startMusic(){
  audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
  audioContext.resume?.();
  musicStep=0;playMusicNote();musicTimer=setInterval(playMusicNote,330);
  musicEl.textContent="Music: on";musicEl.setAttribute("aria-pressed","true");
}
function stopMusic(){
  clearInterval(musicTimer);musicTimer=null;
  musicEl.textContent="Music: off";musicEl.setAttribute("aria-pressed","false");
}
function toggleMusic(){musicTimer?stopMusic():startMusic()}
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

function wiggleCaterpillar(row){
  const pattern=randomItem(wigglePatterns);
  if(!row||typeof row.animate!=="function"){
    row?.classList.remove("correct-wiggle");
    void row?.offsetWidth;
    row?.classList.add("correct-wiggle");
    setTimeout(()=>row?.classList.remove("correct-wiggle"),800);
    return pattern.name;
  }
  row.getAnimations().filter(animation=>animation.id==="correct-wiggle").forEach(animation=>animation.cancel());
  const animation=row.animate(pattern.row,{duration:pattern.duration,easing:"ease-in-out",iterations:1});
  animation.id="correct-wiggle";
  [...row.querySelectorAll(".segment")].forEach((segment,index)=>{
    segment.getAnimations().forEach(animation=>animation.cancel());
    segment.animate(pattern.segment,{duration:pattern.segmentDuration,delay:index*pattern.delay,easing:"ease-in-out"});
  });
  return pattern.name;
}

function makeRewardBurst(row,reward,large=false,theme=null){
  const burst=document.createElement("div");
  burst.className=`reward-burst ${large?"big":"small"} ${reward.effect}`;
  burst.setAttribute("aria-hidden","true");
  const emojis=theme||randomItem(emojiThemes);
  const count=large?28:18;
  for(let i=0;i<count;i++){
    const piece=document.createElement("span");
    piece.textContent=randomItem(emojis);
    piece.style.setProperty("--i",i);
    piece.style.setProperty("--x",`${Math.round((Math.random()-.5)*(large?430:260))}px`);
    piece.style.setProperty("--y",`${Math.round(-35-Math.random()*(large?180:120))}px`);
    piece.style.setProperty("--r",`${Math.round((Math.random()-.5)*180)}deg`);
    piece.style.fontSize=`${(large?1.3:.95)+Math.random()*(large?.8:.55)}rem`;
    burst.append(piece);
  }
  row.append(burst);
  setTimeout(()=>burst.remove(),large?2100:1150);
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
  const emojiTheme=randomItem(emojiThemes);
  wiggleCaterpillar(row);
  row.classList.remove(`effect-${reward.effect}`);
  void row.offsetWidth;
  row.classList.add(`effect-${reward.effect}`);
  showRewardBubble(row,reward,false);
  makeRewardBurst(row,reward,false,emojiTheme);
  setTimeout(()=>row.classList.remove(`effect-${reward.effect}`),900);
  messageEl.className="message success";
  messageEl.textContent=`${reward.emoji} ${reward.text} Number ${number} is correct.`;
}

function celebrateRow(row){
  const reward=randomItem(rowRewards);
  row.classList.remove("celebrate");
  rowRewards.forEach(item=>row.classList.remove(`row-${item.effect}`));
  void row.offsetWidth;
  row.classList.add("celebrate",`row-${reward.effect}`);
  showRewardBubble(row,reward,true);
  makeRewardBurst(row,reward,true,randomItem(emojiThemes));
  playRowSound();
  setTimeout(()=>row.classList.remove("celebrate",`row-${reward.effect}`),2100);
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
  if(document.querySelectorAll(".card.placed").length===targetCount()){
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
  progressEl.textContent=`${count} of ${targetCount()} placed`;
}

function resetGame(){
  selected=null;chooseClues();makeCaterpillars();makeCards();updateProgress();messageEl.className="message";
  messageEl.textContent=`New number clues! ${hintCount} hint${hintCount===1?"":"s"} on each caterpillar. Every correct answer brings a surprise!`;
}

teacherSettingsEl.addEventListener("click",()=>{
  const opening=teacherPanelEl.hidden;
  teacherPanelEl.hidden=!opening;
  teacherSettingsEl.setAttribute("aria-expanded",String(opening));
  if(opening)hintCountEl.focus();
});
hintCountEl.value=String(hintCount);hintValueEl.value=String(hintCount);
hintCountEl.addEventListener("input",()=>{hintValueEl.value=hintCountEl.value});
document.querySelector("#applyHints").addEventListener("click",()=>{
  hintCount=Number(hintCountEl.value);
  teacherPanelEl.hidden=true;teacherSettingsEl.setAttribute("aria-expanded","false");
  resetGame();
});
musicEl.addEventListener("click",toggleMusic);
document.querySelector("#reset").addEventListener("click",resetGame);
resetGame();
