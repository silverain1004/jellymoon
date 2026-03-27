const BOARD_ROWS = 5;
const BOARD_COLS = 4;
const TOTAL_PAIRS = (BOARD_ROWS * BOARD_COLS) / 2;

const PHOTO_IMAGES = [
  "img/1765506290795.jpeg",
  "img/1769514925728.jpeg",
  "img/1769515023054.jpeg",
  "img/1769515180345.jpeg",
  "img/1771733708992.jpeg",
  "img/1774062322049.jpeg",
  "img/1774062444591.jpeg",
  "img/20260126_125930 (1).jpeg",
  "img/260320908078370009.jpeg",
  "img/260320908078370015.jpeg",
];

const memoryBoard = document.getElementById("memoryBoard");
const triesEl = document.getElementById("tries");
const matchedPairsEl = document.getElementById("matchedPairs");
const totalPairsEl = document.getElementById("totalPairs");
const nextMissionBtn = document.getElementById("nextMissionBtn");

let firstCard = null;
let secondCard = null;
let lockBoard = false;
let tries = 0;
let matchedPairs = 0;

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function updateHud() {
  if (triesEl) triesEl.textContent = String(tries);
  if (matchedPairsEl) matchedPairsEl.textContent = String(matchedPairs);
  if (totalPairsEl) totalPairsEl.textContent = String(TOTAL_PAIRS);
}

function setNextMissionEnabled(enabled) {
  nextMissionBtn.disabled = !enabled;
  nextMissionBtn.classList.toggle("enabled", enabled);
}

function resetTurn() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

function onCardClick(event) {
  const card = event.currentTarget;

  if (lockBoard) return;
  if (card === firstCard) return;
  if (card.classList.contains("is-matched")) return;
  if (card.classList.contains("is-flipped")) return;

  card.classList.add("is-flipped");

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  lockBoard = true;
  tries += 1;
  updateHud();

  const firstId = firstCard.dataset.pairId;
  const secondId = secondCard.dataset.pairId;

  if (firstId === secondId) {
    firstCard.classList.add("is-matched");
    secondCard.classList.add("is-matched");
    matchedPairs += 1;
    updateHud();
    resetTurn();

    if (matchedPairs === TOTAL_PAIRS) setNextMissionEnabled(true);
    return;
  }

  window.setTimeout(() => {
    firstCard.classList.remove("is-flipped");
    secondCard.classList.remove("is-flipped");
    resetTurn();
  }, 620);
}

function createCard(imagePath, pairId) {
  const button = document.createElement("button");
  button.className = "card";
  button.type = "button";
  button.dataset.pairId = String(pairId);
  button.setAttribute("aria-label", "사진 카드");

  const inner = document.createElement("div");
  inner.className = "card-inner";

  const front = document.createElement("div");
  front.className = "card-face card-front";
  front.textContent = "💕";

  const back = document.createElement("div");
  back.className = "card-face card-back";

  const img = document.createElement("img");
  img.src = encodeURI(imagePath);
  img.alt = "우리 사진 카드";
  img.loading = "lazy";
  img.onerror = () => {
    console.error("이미지 로드 실패:", imagePath);
  };
  back.appendChild(img);

  inner.appendChild(front);
  inner.appendChild(back);
  button.appendChild(inner);
  button.addEventListener("click", onCardClick);

  return button;
}

function startGame() {
  if (PHOTO_IMAGES.length < TOTAL_PAIRS) {
    setNextMissionEnabled(false);
    return;
  }

  const sourceImages = PHOTO_IMAGES.slice(0, TOTAL_PAIRS);
  const pairData = sourceImages.flatMap((path, idx) => [
    { path, pairId: idx + 1 },
    { path, pairId: idx + 1 },
  ]);

  const deck = shuffle(pairData);

  memoryBoard.innerHTML = "";
  deck.forEach((item) => {
    const cardEl = createCard(item.path, item.pairId);
    memoryBoard.appendChild(cardEl);
  });

  tries = 0;
  matchedPairs = 0;
  updateHud();
  resetTurn();
  setNextMissionEnabled(false);
}

nextMissionBtn.addEventListener("click", () => {
  if (nextMissionBtn.disabled) return;
  window.location.href = "mission3.html";
});
startGame();
