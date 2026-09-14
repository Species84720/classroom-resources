const form = document.querySelector('#setup-form');
const minInput = document.querySelector('#min-number');
const maxInput = document.querySelector('#max-number');
const pairCountInput = document.querySelector('#pair-count');
const errorBox = document.querySelector('#setup-error');
const board = document.querySelector('#board');
const rangeLabel = document.querySelector('#range-label');
const matchesLabel = document.querySelector('#matches');
const turnsLabel = document.querySelector('#turns');
const message = document.querySelector('#message');
const celebration = document.querySelector('#celebration');
const winSummary = document.querySelector('#win-summary');

let settings = { min: 1, max: 10, pairs: 6 };
let firstCard = null;
let secondCard = null;
let locked = false;
let matches = 0;
let turns = 0;

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function chooseNumbers(min, max, count) {
  const available = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  return shuffle(available).slice(0, count);
}

function makeCard(number, index) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'card';
  card.dataset.number = String(number);
  card.setAttribute('aria-label', `Hidden card ${index + 1}`);
  card.innerHTML = `<span class="card-inner"><span class="card-face card-back" aria-hidden="true">?</span><span class="card-face card-front">${number}</span></span>`;
  card.addEventListener('click', () => turnCard(card));
  return card;
}

function startRound() {
  firstCard = null;
  secondCard = null;
  locked = false;
  matches = 0;
  turns = 0;
  matchesLabel.textContent = '0';
  turnsLabel.textContent = '0';
  message.textContent = 'Choose two cards.';
  celebration.hidden = true;
  rangeLabel.textContent = `${settings.min}–${settings.max}`;
  const selected = chooseNumbers(settings.min, settings.max, settings.pairs);
  const deck = shuffle([...selected, ...selected]);
  board.replaceChildren(...deck.map(makeCard));
  board.querySelector('.card')?.focus();
}

function turnCard(card) {
  if (locked || card === firstCard || card.classList.contains('is-matched')) return;
  card.classList.add('is-flipped');
  card.setAttribute('aria-label', `Number ${card.dataset.number}`);

  if (!firstCard) {
    firstCard = card;
    message.textContent = `You found ${card.dataset.number}. Find its pair.`;
    return;
  }

  secondCard = card;
  turns += 1;
  turnsLabel.textContent = String(turns);
  locked = true;

  if (firstCard.dataset.number === secondCard.dataset.number) {
    window.setTimeout(completeMatch, 350);
  } else {
    message.textContent = 'Not a pair. Remember where they are!';
    window.setTimeout(hideCards, 850);
  }
}

function completeMatch() {
  [firstCard, secondCard].forEach((card) => {
    card.classList.add('is-matched');
    card.disabled = true;
    card.setAttribute('aria-label', `Matched number ${card.dataset.number}`);
  });
  matches += 1;
  matchesLabel.textContent = String(matches);
  message.textContent = `Yes! You matched ${firstCard.dataset.number}.`;
  resetTurn();
  if (matches === settings.pairs) {
    winSummary.textContent = `You found all ${matches} pairs in ${turns} turns.`;
    window.setTimeout(() => {
      celebration.hidden = false;
      document.querySelector('#play-again').focus();
    }, 450);
  }
}

function hideCards() {
  [firstCard, secondCard].forEach((card) => {
    card.classList.remove('is-flipped');
    const position = [...board.children].indexOf(card) + 1;
    card.setAttribute('aria-label', `Hidden card ${position}`);
  });
  resetTurn();
  message.textContent = 'Choose two more cards.';
}

function resetTurn() {
  firstCard = null;
  secondCard = null;
  locked = false;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const min = Number(minInput.value);
  const max = Number(maxInput.value);
  const requestedPairs = Number(pairCountInput.value);
  const rangeSize = max - min + 1;
  errorBox.textContent = '';

  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    errorBox.textContent = 'Please use whole numbers.';
    return;
  }
  if (min > max) {
    errorBox.textContent = 'The “From” number must be smaller than the “To” number.';
    return;
  }
  if (rangeSize < 2) {
    errorBox.textContent = 'Please choose a range containing at least two numbers.';
    return;
  }

  settings = { min, max, pairs: Math.min(requestedPairs, rangeSize) };
  if (settings.pairs < requestedPairs) {
    errorBox.textContent = `This range has ${rangeSize} numbers, so the game will use ${rangeSize} pairs.`;
  }
  startRound();
  document.querySelector('.game-shell').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.querySelector('#new-round').addEventListener('click', startRound);
document.querySelector('#play-again').addEventListener('click', startRound);
startRound();
