const cardsEl=document.querySelector("#cards");
const caterpillarsEl=document.querySelector("#caterpillars");
const progressEl=document.querySelector("#progress");
const messageEl=document.querySelector("#message");
let selected=null;

function shuffle(values){
  const a=[...values];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}

function makeCaterpillars(){
  caterpillarsEl.innerHTML="";
  for(let row=0;row<3;row++){
    const wrap=document.createElement("section");
    wrap.className="caterpillar-row";
    wrap.setAttribute("aria-label",`Caterpillar for numbers ${row*10+1} to ${row*10+10}`);
    const label=document.createElement("div");
    label.className="range"; label.textContent=`${row*10+1}–${row*10+10}`; wrap.append(label);
    for(let col=0;col<10;col++){
      const answer=row*10+col+1;
      const segment=document.createElement("div");
      segment.className="segment"+(col===0?" head":"");
      if(col===0) segment.innerHTML='<span class="antenna" aria-hidden="true"></span><span class="face" aria-hidden="true"><i class="eye"></i><i class="eye"></i></span><span class="smile" aria-hidden="true"></span>';
      const slot=document.createElement("button");
      slot.type="button"; slot.className="slot"; slot.dataset.answer=answer; slot.setAttribute("aria-label",`Empty position ${answer}`);
      slot.addEventListener("click",()=>selected&&placeCard(selected,slot));
      slot.addEventListener("dragover",e=>{e.preventDefault();slot.classList.add("over")});
      slot.addEventListener("dragleave",()=>slot.classList.remove("over"));
      slot.addEventListener("drop",e=>{e.preventDefault();slot.classList.remove("over");const n=e.dataTransfer.getData("text/plain");placeCard(document.querySelector(`.card[data-number="${n}"]`),slot)});
      segment.append(slot); wrap.append(segment);
    }
    caterpillarsEl.append(wrap);
  }
}

function makeCards(){
  cardsEl.innerHTML="";
  shuffle(Array.from({length:30},(_,i)=>i+1)).forEach(number=>{
    const card=document.createElement("button");
    card.type="button"; card.className="card"; card.draggable=true; card.dataset.number=number; card.textContent=number;
    card.setAttribute("aria-label",`Number ${number}. Tap, then choose an empty circle.`);
    card.addEventListener("click",()=>selectCard(card));
    card.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/plain",number);card.classList.add("dragging")});
    card.addEventListener("dragend",()=>card.classList.remove("dragging"));
    cardsEl.append(card);
  });
}

function selectCard(card){
  if(selected===card){card.classList.remove("selected");selected=null;messageEl.textContent="Choose another number card.";return}
  document.querySelectorAll(".card.selected").forEach(c=>c.classList.remove("selected"));
  selected=card;card.classList.add("selected");messageEl.textContent=`Number ${card.dataset.number} selected. Now choose an empty circle.`;
}

function placeCard(card,slot){
  if(!card||card.classList.contains("placed"))return;
  const oldNumber=slot.dataset.number;
  if(oldNumber){const oldCard=document.querySelector(`.card[data-number="${oldNumber}"]`);oldCard.classList.remove("placed")}
  slot.textContent=card.dataset.number;slot.dataset.number=card.dataset.number;
  slot.setAttribute("aria-label",`Position ${slot.dataset.answer}, containing number ${card.dataset.number}`);
  card.classList.add("placed");card.classList.remove("selected");selected=null;
  slot.classList.remove("correct","wrong");messageEl.className="message";messageEl.textContent="Good placing! Keep counting forwards.";
  updateProgress();
}

function updateProgress(){
  const count=document.querySelectorAll(".card.placed").length;
  progressEl.textContent=`${count} of 30 placed`;
}

function checkWork(){
  const slots=[...document.querySelectorAll(".slot")];
  const filled=slots.filter(s=>s.dataset.number).length;
  slots.forEach(s=>{s.classList.remove("correct","wrong");if(s.dataset.number)s.classList.add(Number(s.dataset.number)===Number(s.dataset.answer)?"correct":"wrong")});
  messageEl.className="message";
  if(filled<30){messageEl.classList.add("try");messageEl.textContent=`${30-filled} spaces still need a number. Keep going!`;return}
  const right=slots.filter(s=>s.classList.contains("correct")).length;
  if(right===30){messageEl.classList.add("success");messageEl.textContent="Fantastic! Every number from 1 to 30 is in order!";return}
  messageEl.classList.add("try");messageEl.textContent=`${right} are in the right place. Look for the pink circles and try again.`;
}

function resetGame(){
  selected=null;makeCaterpillars();makeCards();updateProgress();messageEl.className="message";messageEl.textContent="Start with 1 and count forwards.";
}

document.querySelector("#check").addEventListener("click",checkWork);
document.querySelector("#reset").addEventListener("click",resetGame);
resetGame();
