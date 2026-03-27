const BOARD_ROWS = 5;
const BOARD_COLS = 4;
const TOTAL_PAIRS = (BOARD_ROWS * BOARD_COLS) / 2;
const YOUTUBE_VIDEO_ID = "-YBTYrIzlYc";

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
const countdownEl = document.getElementById("countdown");
const startModal = document.getElementById("startModal");
const failModal = document.getElementById("failModal");
const startGameBtn = document.getElementById("startGameBtn");
const retryBtn = document.getElementById("retryBtn");
const whiteFade = document.getElementById("whiteFade");
const letterCard = document.getElementById("letterCard");
const letterCloseBtn = document.getElementById("letterCloseBtn");
const debugPassBtn = document.getElementById("debugPassBtn");
const bgmPlayer = document.getElementById("bgmPlayer");
const LETTER_BUTTON_LABELS = ["🤙약속", "🏷️ 도장", "✒️싸인", "🖨️복사", "🧾 코팅"];
const IS_TEST_MODE = new URLSearchParams(window.location.search).get("test") === "1";
const IS_BGM_MODE = new URLSearchParams(window.location.search).get("bgm") === "1";

let firstCard = null;
let secondCard = null;
let lockBoard = false;
let tries = 0;
let matchedPairs = 0;
let completionPlayed = false;
let gameStarted = false;
let timeLeft = 30;
let timerId = 0;
const CLEAR_FINALE_MS = 5000;
let letterButtonLabelIndex = 0;

function startBgm() {
  if (!bgmPlayer) return;
  const embedUrl = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&loop=1&playlist=${YOUTUBE_VIDEO_ID}&controls=0`;
  bgmPlayer.src = embedUrl;
}

function withCurrentQuery(path) {
  const params = new URLSearchParams(window.location.search);
  if (IS_BGM_MODE) params.set("bgm", "1");
  if (IS_TEST_MODE) params.set("test", "1");
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

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
  // End screen now finishes with letter only.
  if (!enabled) return;
}

function resetTurn() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

function formatTime(sec) {
  const safe = Math.max(0, sec);
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function updateTimerUi() {
  if (!countdownEl) return;
  countdownEl.textContent = formatTime(timeLeft);
  countdownEl.classList.toggle("timer-warning", timeLeft > 0 && timeLeft <= 10);
}

function stopTimer() {
  if (!timerId) return;
  window.clearInterval(timerId);
  timerId = 0;
}

function lockBoardUi(isLocked) {
  memoryBoard.classList.toggle("is-locked", isLocked);
  lockBoard = isLocked;
}

function handleTimeUp() {
  gameStarted = false;
  stopTimer();
  lockBoardUi(true);
  failModal.classList.add("is-visible");
}

function startTimer() {
  stopTimer();
  timeLeft = 30;
  updateTimerUi();
  timerId = window.setInterval(() => {
    timeLeft -= 1;
    updateTimerUi();
    if (timeLeft <= 0) {
      handleTimeUp();
    }
  }, 1000);
}

function playClearSequence(letterDelayMs = CLEAR_FINALE_MS) {
  if (completionPlayed) return;
  completionPlayed = true;
  gameStarted = false;
  stopTimer();
  lockBoard = true;
  memoryBoard.classList.add("is-clearing");
  memoryBoard.classList.add("is-fading-out");
  whiteFade.classList.add("is-active");
  document.body.classList.add("is-clearing-page");

  window.setTimeout(() => {
    startModal.classList.remove("is-visible");
    failModal.classList.remove("is-visible");
    letterCard.classList.add("is-visible");
    letterCard.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-letter-visible");
    letterCard.style.opacity = "1";
    letterCard.style.visibility = "visible";
    letterCard.style.pointerEvents = "auto";
  }, letterDelayMs);
}

function onCardClick(event) {
  const card = event.currentTarget;

  if (!gameStarted) return;
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

    if (matchedPairs === TOTAL_PAIRS) {
      setNextMissionEnabled(true);
      playClearSequence();
    }
    return;
  }

  window.setTimeout(() => {
    if (!gameStarted) return;
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
  completionPlayed = false;
  updateHud();
  resetTurn();
  setNextMissionEnabled(false);
  memoryBoard.classList.remove("is-clearing");
  memoryBoard.classList.remove("is-fading-out");
  lockBoardUi(false);
  whiteFade.classList.remove("is-active");
  document.body.classList.remove("is-clearing-page");
  document.body.classList.remove("is-letter-visible");
  letterCard.classList.remove("is-visible");
  letterCard.setAttribute("aria-hidden", "true");
  letterCard.style.opacity = "";
  letterCard.style.visibility = "";
  letterCard.style.pointerEvents = "";
  letterButtonLabelIndex = 0;
  letterCloseBtn.textContent = LETTER_BUTTON_LABELS[0];
  letterCloseBtn.disabled = false;
}

letterCloseBtn.addEventListener("click", () => {
  if (letterButtonLabelIndex >= LETTER_BUTTON_LABELS.length - 1) {
    letterCloseBtn.disabled = true;
    document.body.classList.add("is-exiting");
    window.setTimeout(() => {
      window.location.href = withCurrentQuery("certificate.html");
    }, 900);
    return;
  }
  letterButtonLabelIndex = Math.min(letterButtonLabelIndex + 1, LETTER_BUTTON_LABELS.length - 1);
  letterCloseBtn.textContent = LETTER_BUTTON_LABELS[letterButtonLabelIndex];
});

startGameBtn.addEventListener("click", () => {
  startModal.classList.remove("is-visible");
  gameStarted = true;
  startGame();
  startTimer();
});

retryBtn.addEventListener("click", () => {
  failModal.classList.remove("is-visible");
  gameStarted = true;
  startGame();
  startTimer();
});

if (IS_TEST_MODE) {
  debugPassBtn.hidden = false;
  debugPassBtn.addEventListener("click", () => {
    stopTimer();
    startModal.classList.remove("is-visible");
    failModal.classList.remove("is-visible");
    gameStarted = false;
    completionPlayed = false;
    memoryBoard.classList.remove("is-clearing", "is-fading-out");
    whiteFade.classList.remove("is-active");
    document.body.classList.remove("is-clearing-page");
    document.body.classList.remove("is-letter-visible");
    letterCard.classList.remove("is-visible");
    letterCard.setAttribute("aria-hidden", "true");
    letterCard.style.opacity = "";
    letterCard.style.visibility = "";
    letterCard.style.pointerEvents = "";
    matchedPairs = TOTAL_PAIRS;
    updateHud();
    memoryBoard.querySelectorAll(".card").forEach((cardEl) => {
      cardEl.classList.add("is-flipped", "is-matched");
    });
    setNextMissionEnabled(true);
    playClearSequence();
  });
} else {
  debugPassBtn.hidden = true;
}

updateTimerUi();
lockBoardUi(true);

if (IS_BGM_MODE) {
  startBgm();
}
