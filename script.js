const HOLD_MAX_MS = 900;
const MIN_POWER = 0.08;
const MAX_POWER = 1;
const BOOST_START_RATIO = 0.45;
const EARLY_SLOW_MULTIPLIER = 0.72;
const BOOST_MULTIPLIER = 1.95;
const OVERPOWER_THRESHOLD = 0.86;
const TEST_AUTO_CATCH_MAX_POWER = 0.2;
const BOUQUET_START_RATIO_X = 0.13;
const BOUQUET_TRAVEL_BASE_RATIO = 0.2;
const BOUQUET_TRAVEL_POWER_RATIO = 0.62;
const CATCH_CENTER_RATIO_IN_FRIEND = 0.4;
const CATCH_TOLERANCE_RATIO_IN_FRIEND = 0.06;

const stage = document.getElementById("stage");
const bouquet = document.getElementById("bouquet");
const friend = document.querySelector(".friend");
const confettiLayer = document.getElementById("confettiLayer");
const meterFill = document.getElementById("meterFill");
const meterSuccessZone = document.getElementById("meterSuccessZone");
const statusEl = document.getElementById("status");
const enterBtn = document.getElementById("enterBtn");
const pageFade = document.getElementById("pageFade");
const pinGate = document.getElementById("pinGate");
const pinForm = document.getElementById("pinForm");
const pinSlots = Array.from(document.querySelectorAll(".pin-slot"));
const pinError = document.getElementById("pinError");
const bgmPlayer = document.getElementById("bgmPlayer");

const REQUIRED_PIN = "2010";
const YOUTUBE_VIDEO_ID = "-YBTYrIzlYc";

let pressStart = 0;
let pressed = false;
let meterRaf = 0;
let animating = false;
let caught = false;
let isUnlocked = false;

function lockGameByPin() {
  document.body.classList.add("pin-locked");
  stage.classList.add("locked");
  enterBtn.disabled = true;
  enterBtn.classList.remove("enabled");
  statusEl.textContent = "PIN을 먼저 입력해줘!";
}

function startBgm() {
  if (!bgmPlayer) return;
  const embedUrl = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&loop=1&playlist=${YOUTUBE_VIDEO_ID}&controls=0`;
  bgmPlayer.src = embedUrl;
}

function unlockGame() {
  isUnlocked = true;
  pinGate.classList.add("is-hidden");
  document.body.classList.remove("pin-locked");
  stage.classList.remove("locked");
  statusEl.textContent = "화면을 길게 눌렀다 떼어봐!";
}

function animateFriendFetch() {
  const goDuration = 1400;
  const backDuration = 1200;
  const pauseMs = 220;
  const moveX = 120;

  friend.style.transition = `transform ${goDuration}ms ease-in-out`;
  friend.style.transform = `translateX(${moveX}px)`;

  window.setTimeout(() => {
    friend.style.transition = `transform ${backDuration}ms ease-in-out`;
    friend.style.transform = "translateX(0px)";
  }, goDuration + pauseMs);
}

function enableEnterButton() {
  enterBtn.disabled = false;
  enterBtn.classList.add("enabled");
}

function setMeter(progress) {
  const ratio = Math.max(0, Math.min(1, progress));
  meterFill.style.width = `${(ratio * 100).toFixed(0)}%`;
}

function resetBouquet() {
  bouquet.style.transition = "none";
  bouquet.style.transform = "translate(0px, 0px) rotate(0deg)";
  bouquet.style.left = "13%";
  bouquet.style.bottom = "34%";
}

function powerFromHeld(ms) {
  const charged = chargedRatioFromHeld(ms);
  return Math.max(MIN_POWER, charged * MAX_POWER);
}

function chargedRatioFromHeld(ms) {
  const base = Math.min(ms, HOLD_MAX_MS) / HOLD_MAX_MS;

  if (base <= BOOST_START_RATIO) {
    return base * EARLY_SLOW_MULTIPLIER;
  }

  const slowPart = BOOST_START_RATIO * EARLY_SLOW_MULTIPLIER;
  const boosted = slowPart + (base - BOOST_START_RATIO) * BOOST_MULTIPLIER;
  return Math.min(boosted, 1);
}

function getCatchPowerRange() {
  const stageRect = stage.getBoundingClientRect();
  const friendRect = friend.getBoundingClientRect();

  const catchCenterX = friendRect.left - stageRect.left + friendRect.width * CATCH_CENTER_RATIO_IN_FRIEND;
  const catchTolerance = friendRect.width * CATCH_TOLERANCE_RATIO_IN_FRIEND;
  const catchMinX = catchCenterX - catchTolerance;
  const catchMaxX = catchCenterX + catchTolerance;

  const toPower = (xInStage) =>
    (xInStage / stageRect.width - (BOUQUET_START_RATIO_X + BOUQUET_TRAVEL_BASE_RATIO)) / BOUQUET_TRAVEL_POWER_RATIO;

  const minPower = Math.max(0, toPower(catchMinX));
  const maxPower = Math.min(1, toPower(catchMaxX));
  return { minPower, maxPower };
}

function updateMeterSuccessZone() {
  const { minPower, maxPower } = getCatchPowerRange();
  const safeMaxPower = Math.min(maxPower, OVERPOWER_THRESHOLD - 0.001);

  if (safeMaxPower <= minPower) {
    meterSuccessZone.style.width = "0%";
    return;
  }

  meterSuccessZone.style.left = `${(minPower * 100).toFixed(2)}%`;
  meterSuccessZone.style.width = `${((safeMaxPower - minPower) * 100).toFixed(2)}%`;
}

function startMeterLoop() {
  cancelAnimationFrame(meterRaf);
  const update = () => {
    if (!pressed) return;
    const held = performance.now() - pressStart;
    const ratio = chargedRatioFromHeld(held);
    setMeter(ratio);
    meterRaf = requestAnimationFrame(update);
  };
  meterRaf = requestAnimationFrame(update);
}

function launchBouquet(power) {
  if (animating) return;
  animating = true;

  const stageRect = stage.getBoundingClientRect();
  const distanceX = stageRect.width * (BOUQUET_TRAVEL_BASE_RATIO + BOUQUET_TRAVEL_POWER_RATIO * power);
  const peakY = stageRect.height * (0.12 + 0.42 * power);
  const duration = 500 + 800 * power;
  const spin = 240 + 900 * power;

  bouquet.style.transition = `transform ${duration}ms cubic-bezier(.18,.62,.3,1)`;
  bouquet.style.transform = `translate(${distanceX}px, ${-peakY}px) rotate(${spin}deg)`;
  statusEl.textContent = `${(power * 100).toFixed(0)}% 파워로 은비에게 부케를 던졌어요!`;

  const isOverPower = power >= OVERPOWER_THRESHOLD;
  if (isOverPower) {
    const outX = stageRect.width * 1.25;
    const outY = -stageRect.height * 0.85;
    const outDuration = 1100;
    bouquet.style.transition = `transform ${outDuration}ms cubic-bezier(.12,.72,.2,1)`;
    bouquet.style.transform = `translate(${outX}px, ${outY}px) rotate(1440deg)`;
    statusEl.textContent = "아니 어디서 이런 힘이..?!";

    window.setTimeout(() => {
      bouquet.style.transition = "opacity 220ms ease";
      bouquet.style.opacity = "0";
    }, outDuration - 160);

    animateFriendFetch();

    window.setTimeout(() => {
      bouquet.style.opacity = "1";
      resetBouquet();
      setMeter(0);
      statusEl.textContent = "은비가 부케를 다시 주워왔어요 (ㅂㄷㅂㄷ)";
      animating = false;
    }, 3000);
    return;
  }

  const friendRect = friend.getBoundingClientRect();
  const catchCenterX = friendRect.left - stageRect.left + friendRect.width * CATCH_CENTER_RATIO_IN_FRIEND;
  const catchTolerance = friendRect.width * CATCH_TOLERANCE_RATIO_IN_FRIEND;
  const catchMinX = catchCenterX - catchTolerance;
  const catchMaxX = catchCenterX + catchTolerance;
  const bouquetStartX = stageRect.width * BOUQUET_START_RATIO_X;
  const travelX = bouquetStartX + distanceX;
  const isCaughtByRange = travelX >= catchMinX && travelX <= catchMaxX;
  const isCaught = power <= TEST_AUTO_CATCH_MAX_POWER || isCaughtByRange;

  if (isCaught) {
    const catchTranslateX = Math.max(8, catchCenterX - bouquetStartX);
    const catchTranslateY = -Math.max(8, peakY * 0.32);
    const catchDuration = Math.max(340, duration * 0.78);
    bouquet.style.transition = `transform ${catchDuration}ms cubic-bezier(.18,.62,.3,1)`;
    bouquet.style.transform = `translate(${catchTranslateX}px, ${catchTranslateY}px) rotate(${spin * 0.62}deg)`;

    window.setTimeout(() => {
      bouquet.style.transition = "none";
      bouquet.style.transform = `translate(${catchTranslateX + 6}px, -10px) rotate(18deg)`;
      friend.classList.add("caught");
      burstConfettiSeries(stageRect.width * 0.5, stageRect.height * 0.42);
      if (!caught) {
        caught = true;
        enableEnterButton();
      }
      statusEl.textContent = "고마워 예주야 >_<";
    }, catchDuration + 20);

    window.setTimeout(() => {
      friend.classList.remove("caught");
      animating = false;
      setMeter(0);
    }, catchDuration + 800);
  } else {
    window.setTimeout(() => {
      bouquet.style.transition = `transform ${Math.max(220, duration * 0.55)}ms ease-in`;
      bouquet.style.transform = `translate(${distanceX}px, 42px) rotate(${spin + 90}deg)`;
    }, duration * 0.55);

    window.setTimeout(() => {
      resetBouquet();
      setMeter(0);
      statusEl.textContent = "까비~ 한 번 더!";
      animating = false;
    }, duration + Math.max(220, duration * 0.55) + 120);
  }
}

function burstConfetti(originX, originY) {
  const colors = ["#ff5fa7", "#ff9bc8", "#ffd166", "#8ec5ff", "#b39dff", "#ffd9eb"];
  const waves = [
    { count: 34, radiusMin: 80, radiusMax: 160, delayRange: 80, core: true },
    { count: 46, radiusMin: 130, radiusMax: 260, delayRange: 180, core: false },
  ];

  const ring = document.createElement("span");
  ring.className = "burst-ring";
  ring.style.left = `${originX}px`;
  ring.style.top = `${originY}px`;
  confettiLayer.appendChild(ring);
  window.setTimeout(() => ring.remove(), 760);

  waves.forEach((wave) => {
    for (let i = 0; i < wave.count; i += 1) {
      const piece = document.createElement("span");
      piece.className = wave.core ? "confetti core" : "confetti";
      piece.style.left = `${originX}px`;
      piece.style.top = `${originY}px`;
      piece.style.background = colors[(i + (wave.core ? 1 : 0)) % colors.length];

      const angle = Math.random() * Math.PI * 2;
      const radius = wave.radiusMin + Math.random() * (wave.radiusMax - wave.radiusMin);
      const tx = Math.cos(angle) * radius;
      const ty = Math.sin(angle) * radius;
      piece.style.setProperty("--tx", `${tx.toFixed(1)}px`);
      piece.style.setProperty("--ty", `${ty.toFixed(1)}px`);
      piece.style.animationDelay = `${Math.random() * wave.delayRange}ms`;
      confettiLayer.appendChild(piece);
      window.setTimeout(() => piece.remove(), 1500);
    }
  });
}

function burstConfettiSeries(originX, originY) {
  const bursts = 3;
  for (let i = 0; i < bursts; i += 1) {
    window.setTimeout(() => {
      const offsetX = (Math.random() - 0.5) * 70;
      const offsetY = (Math.random() - 0.5) * 40;
      burstConfetti(originX + offsetX, originY + offsetY);
    }, i * 260);
  }
}

function onPressStart(event) {
  if (!isUnlocked) return;
  if (animating || pressed) return;
  if (event.cancelable) event.preventDefault();
  pressed = true;
  pressStart = performance.now();
  statusEl.textContent = "없던 근육까지 싹 끌어 모으는 중...";
  startMeterLoop();
}

function onPressEnd(event) {
  if (!isUnlocked) return;
  if (!pressed) return;
  if (event && event.cancelable) event.preventDefault();
  pressed = false;
  cancelAnimationFrame(meterRaf);
  const heldMs = performance.now() - pressStart;
  const power = powerFromHeld(heldMs);
  setMeter(chargedRatioFromHeld(heldMs));
  launchBouquet(power);
}

stage.addEventListener("pointerdown", onPressStart, { passive: false });
stage.addEventListener("pointerup", onPressEnd, { passive: false });
stage.addEventListener("pointerleave", onPressEnd, { passive: false });
stage.addEventListener("pointercancel", onPressEnd, { passive: false });

pinInput.addEventListener("input", (event) => {
  const onlyDigits = event.target.value.replace(/\D/g, "").slice(0, 6);
  event.target.value = onlyDigits;
  if (pinError.textContent) pinError.textContent = "";
});

pinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = pinSlots.map((input) => input.value).join("");

  if (value.length !== 4) {
    pinError.textContent = "연도 4자리를 입력해줘!";
    pinSlots[0]?.focus();
    return;
  }

  if (value !== REQUIRED_PIN) {
    pinError.textContent = "아쉽지만 정답이 아니야. 다시 입력해줘!";
    pinSlots.forEach((input) => {
      input.value = "";
    });
    pinSlots[0]?.focus();
    return;
  }

  startBgm();
  unlockGame();
});

enterBtn.addEventListener("click", () => {
  if (!caught) return;
  enterBtn.disabled = true;
  document.body.classList.add("fading-out");
  if (pageFade) pageFade.setAttribute("aria-hidden", "false");
  window.setTimeout(() => {
    window.location.href = "next.html";
  }, 620);
});

window.addEventListener("resize", updateMeterSuccessZone);

resetBouquet();
setMeter(0);
updateMeterSuccessZone();
lockGameByPin();
if (pinSlots[0]) pinSlots[0].focus();

pinSlots.forEach((input, index) => {
  input.addEventListener("input", (event) => {
    const onlyDigits = event.target.value.replace(/\D/g, "");
    event.target.value = onlyDigits.slice(-1);
    if (pinError.textContent) pinError.textContent = "";
    if (event.target.value && pinSlots[index + 1]) {
      pinSlots[index + 1].focus();
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && !input.value && pinSlots[index - 1]) {
      pinSlots[index - 1].focus();
    }
  });

  input.addEventListener("paste", (event) => {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, 4);
    pasted.split("").forEach((digit, idx) => {
      if (pinSlots[idx]) pinSlots[idx].value = digit;
    });
    const focusIndex = Math.min(pasted.length, pinSlots.length - 1);
    pinSlots[focusIndex]?.focus();
  });
});
