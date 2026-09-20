const numbers = Array.from({ length: 10 }, (_, index) => 41 + index);
const path = document.querySelector('#numberPath');
const bank = document.querySelector('#duckBank');
const template = document.querySelector('#duckTemplate');
const message = document.querySelector('#message');
const progress = document.querySelector('#progress');
const progressBar = document.querySelector('#progressBar');
const celebration = document.querySelector('#celebration');
let nextNumber = 41;
let selected = null;

function shuffle(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeSlots() {
  path.replaceChildren();
  numbers.forEach((number) => {
    const slot = document.createElement('li');
    slot.className = 'slot';
    slot.dataset.number = number;
    slot.textContent = '?';
    slot.setAttribute('aria-label', `Place for number ${number}`);
    slot.addEventListener('dragover', (event) => { event.preventDefault(); slot.classList.add('over'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('over'));
    slot.addEventListener('drop', (event) => {
      event.preventDefault();
      slot.classList.remove('over');
      const number = Number(event.dataTransfer.getData('text/plain'));
      tryPlace(number);
    });
    path.append(slot);
  });
}

function makeDuck(number) {
  const card = template.content.firstElementChild.cloneNode(true);
  card.dataset.number = number;
  card.querySelector('.number').textContent = number;
  card.setAttribute('aria-label', `Duckling ${number}. Select to place it next.`);
  card.addEventListener('click', () => tryPlace(number));
  card.addEventListener('dragstart', (event) => {
    selected = card;
    card.classList.add('dragging');
    event.dataTransfer.setData('text/plain', String(number));
    event.dataTransfer.effectAllowed = 'move';
  });
  card.addEventListener('dragend', () => { card.classList.remove('dragging'); selected = null; });
  return card;
}

function updateReadySlot() {
  document.querySelectorAll('.slot').forEach((slot) => slot.classList.toggle('ready', Number(slot.dataset.number) === nextNumber));
}

function tryPlace(number) {
  const card = bank.querySelector(`[data-number="${number}"]`);
  if (!card) return;
  if (number !== nextNumber) {
    message.textContent = number < nextNumber ? `${number} is already in the parade.` : `Not yet — find ${nextNumber} first.`;
    message.classList.remove('wobble');
    void message.offsetWidth;
    message.classList.add('wobble');
    card.focus();
    return;
  }
  const slot = path.querySelector(`[data-number="${number}"]`);
  slot.textContent = number;
  slot.classList.add('filled');
  slot.classList.remove('ready');
  card.remove();
  nextNumber += 1;
  const placed = nextNumber - 41;
  progress.textContent = `${placed} of 10`;
  progressBar.style.width = `${placed * 10}%`;
  if (nextNumber === 51) {
    message.textContent = 'Brilliant counting! The whole parade is in order.';
    window.setTimeout(() => { celebration.hidden = false; document.querySelector('#playAgain').focus(); }, 350);
  } else {
    message.textContent = `Great! Now find ${nextNumber}.`;
    updateReadySlot();
    bank.querySelector(`[data-number="${nextNumber}"]`)?.focus();
  }
}

function startRound() {
  nextNumber = 41;
  selected = null;
  celebration.hidden = true;
  progress.textContent = '0 of 10';
  progressBar.style.width = '0%';
  message.textContent = 'Find 41 to begin the parade.';
  makeSlots();
  bank.replaceChildren(...shuffle(numbers).map(makeDuck));
  updateReadySlot();
}

document.querySelector('#hintButton').addEventListener('click', () => {
  const card = bank.querySelector(`[data-number="${nextNumber}"]`);
  if (!card) return;
  card.classList.add('hint');
  card.focus();
  message.textContent = `Look for the duckling wearing ${nextNumber}.`;
  window.setTimeout(() => card.classList.remove('hint'), 1600);
});
document.querySelector('#newRound').addEventListener('click', startRound);
document.querySelector('#playAgain').addEventListener('click', startRound);
celebration.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { celebration.hidden = true; document.querySelector('#newRound').focus(); }
});
startRound();
