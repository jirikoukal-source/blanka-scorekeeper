// ------------------------------------------------------------
// STAV HRY
// ------------------------------------------------------------
let state = null;
let gameType = "dice";
let activePlayerId = null;
let roundScores = {}; // {playerId: number}

// ------------------------------------------------------------
// DOM PRVKY
// ------------------------------------------------------------
const setupCard = document.getElementById("setup-card");
const gameCard = document.getElementById("game-card");

const playerCountSelect = document.getElementById("player-count");
const playersInputsContainer = document.getElementById("players-inputs");

const toggleButtons = document.querySelectorAll(".toggle-btn");
const startBtn = document.getElementById("start-btn");

const badgeGame = document.getElementById("badge-game");
const roundLabel = document.getElementById("round-label");
const targetLabel = document.getElementById("target-label");

const scoreRows = document.getElementById("score-rows");

const activePlayerNameEl = document.getElementById("active-player-name");
const activePlayerValueEl = document.getElementById("active-player-value");

const confirmRoundBtn = document.getElementById("confirm-round-btn");
const endGameBtn = document.getElementById("end-game-btn");
const restartBtn = document.getElementById("restart-btn");

const historyList = document.getElementById("history-list");
const historyInfo = document.getElementById("history-info");

const resultsBox = document.getElementById("results");
const resultsTitle = document.getElementById("results-title");
const resultsSubtitle = document.getElementById("results-subtitle");
const resultsBody = document.getElementById("results-body");
const exportText = document.getElementById("export-text");
const copyExportBtn = document.getElementById("copy-export-btn");

const winnerAnimation = document.getElementById("winner-animation");
const confettiCanvas = document.getElementById("confetti-canvas");


// ------------------------------------------------------------
// START – GENEROVÁNÍ INPUTŮ
// ------------------------------------------------------------
function renderPlayerInputs() {
  const count = parseInt(playerCountSelect.value, 10);
  playersInputsContainer.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Hráč ${i + 1}`;
    input.dataset.index = i.toString();
    playersInputsContainer.appendChild(input);
  }
}
renderPlayerInputs();

playerCountSelect.addEventListener("change", renderPlayerInputs);


// ------------------------------------------------------------
// TYP HRY (KOSTKY/KARTY)
// ------------------------------------------------------------
toggleButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    toggleButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    gameType = btn.dataset.game;
  });
});


// ------------------------------------------------------------
// START HRY – VALIDACE + NASTAVENÍ
// ------------------------------------------------------------
startBtn.addEventListener("click", () => {
  const count = parseInt(playerCountSelect.value, 10);
  const target = parseInt(document.getElementById("target-score").value, 10);

  if (!target || target <= 0) {
    alert("Zadej hrací hranici (kladné číslo).");
    return;
  }

  const nameInputs = playersInputsContainer.querySelectorAll("input");
  const players = [...nameInputs].map((input, i) => ({
    id: i,
    name: (input.value || "").trim() || `Hráč ${i + 1}`,
    total: 0,
  }));

  state = {
    players,
    gameType,
    target,
    round: 1,
    finished: false,
    history: [],
  };

  roundScores = {};
  activePlayerId = players[0]?.id ?? null;

  setupCard.style.display = "none";
  gameCard.style.display = "block";

  badgeGame.textContent = gameType === "dice" ? "🎲 Kostky" : "🃏 Karty";
  roundLabel.textContent = "Kolo: 1";
  targetLabel.textContent = "Hranice: " + target;

  renderScoreRows();
  updateActivePlayerInfo();
  historyInfo.textContent = "Zatím žádná odehraná kola.";
});


// ------------------------------------------------------------
// RENDER SCORECARD
// ------------------------------------------------------------
function renderScoreRows() {
  scoreRows.innerHTML = "";
  state.players.forEach((p) => {
    const row = document.createElement("div");
    row.className = "scorecard-row";
    if (p.id === activePlayerId) row.classList.add("active");

    const roundVal = roundScores[p.id] ?? 0;

    row.innerHTML = `
      <div><button class="row-select" data-id="${p.id}">${p.name}</button></div>
      <div class="center">${p.total}</div>
      <div class="center">${roundVal}</div>
    `;

    scoreRows.appendChild(row);
  });

  scoreRows.querySelectorAll(".row-select").forEach((btn) => {
    btn.addEventListener("click", () => {
      activePlayerId = parseInt(btn.dataset.id, 10);
      renderScoreRows();
      updateActivePlayerInfo();
    });
  });
}

function updateActivePlayerInfo() {
  if (!state || activePlayerId == null) return;
  const player = state.players.find((p) => p.id === activePlayerId);
  activePlayerNameEl.textContent = player ? player.name : "–";
  activePlayerValueEl.textContent = (roundScores[activePlayerId] ?? 0).toString();
}

function setRoundScoreForActivePlayer(value) {
  if (activePlayerId == null) return;
  const safeVal = Math.max(0, Math.min(999, value));
  roundScores[activePlayerId] = safeVal;
  renderScoreRows();
  updateActivePlayerInfo();
}


// ------------------------------------------------------------
// NUMERICKÁ KLÁVESNICE
// ------------------------------------------------------------
document.querySelectorAll(".key-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!state || state.finished) return;

    const key = btn.dataset.key;
    const current = roundScores[activePlayerId] ?? 0;
    let nextVal = current;

    if (/^\d$/.test(key)) {
      nextVal = parseInt(current === 0 ? key : current.toString() + key, 10);
    } else if (key === "C") {
      nextVal = 0;
    } else if (key === "⌫") {
      const s = current.toString();
      nextVal = s.length <= 1 ? 0 : parseInt(s.slice(0, -1), 10);
    }

    setRoundScoreForActivePlayer(nextVal);
  });
});


// ------------------------------------------------------------
// POTVRZENÍ KOLA
// ------------------------------------------------------------
confirmRoundBtn.addEventListener("click", () => {
  if (!state || state.finished) return;

  const entries = state.players.map((p) => ({
    id: p.id,
    gain: roundScores[p.id] ?? 0,
  }));

  const historyEntry = {
    round: state.round,
    rows: [],
  };

  let diceHitExact = false;

  entries.forEach(({ id, gain }) => {
    const p = state.players.find((pl) => pl.id === id);
    const before = p.total;
    let appliedGain = gain;
    let after = before;

    if (state.gameType === "dice") {
      const newTotal = before + gain;

      if (newTotal > state.target) {
        appliedGain = 0;
      } else {
        after = newTotal;
        p.total = newTotal;
        if (newTotal === state.target) diceHitExact = true;
      }

    } else {
      const newTotal = before + gain;
      if (newTotal > state.target) {
        appliedGain = 0;
      } else {
        after = newTotal;
        p.total = newTotal;
      }
    }

    historyEntry.rows.push({
      name: p.name,
      before,
      gain: appliedGain,
      after,
    });
  });

  state.history.push(historyEntry);
  renderHistory();

  roundScores = {};
  activePlayerId = state.players[0].id;
  renderScoreRows();
  updateActivePlayerInfo();

  if (state.gameType === "dice" && diceHitExact) {
    const winners = state.players.filter((p) => p.total === state.target);
    finishGame(winners);
    return;
  }

  state.round += 1;
  roundLabel.textContent = "Kolo: " + state.round;
});


// ------------------------------------------------------------
// HISTORIE
// ------------------------------------------------------------
function renderHistory() {
  if (state.history.length === 0) {
    historyInfo.textContent = "Zatím žádná odehraná kola.";
    historyList.innerHTML = "";
    return;
  }

  historyInfo.textContent = "Počet kol: " + state.history.length;
  historyList.innerHTML = "";

  state.history.forEach((round) => {
    const head = document.createElement("div");
    head.className = "history-item";
    head.style.fontWeight = "600";
    head.textContent = "Kolo " + round.round + ":";
    historyList.appendChild(head);

    round.rows.forEach((r) => {
      const item = document.createElement("div");
      item.className = "history-item";
      item.textContent = `${r.name}: ${r.before} + ${r.gain} → ${r.after}`;
      historyList.appendChild(item);
    });
  });
}


// ------------------------------------------------------------
// MANUÁLNÍ UKONČENÍ HRY (KARTY)
// ------------------------------------------------------------
endGameBtn.addEventListener("click", () => {
  if (!state || state.finished) return;

  const minScore = Math.min(...state.players.map((p) => p.total));
  const winners = state.players.filter((p) => p.total === minScore);

  finishGame(winners);
});


// ------------------------------------------------------------
// FINISH GAME + ANIMACE
// ------------------------------------------------------------
function finishGame(winners) {
  state.finished = true;

  confirmRoundBtn.style.display = "none";
  endGameBtn.style.display = "none";
  restartBtn.style.display = "block";

  resultsBox.style.display = "block";

  resultsTitle.textContent =
    winners.length === 1 ? "Máme vítěze! 🎉" : "Více vítězů! 🤝";

  resultsSubtitle.textContent =
    `Hra ukončena v ${state.round}. kole • Hranice: ${state.target} • Typ hry: ` +
    (state.gameType === "dice" ? "Kostky" : "Karty");

  resultsBody.innerHTML = "";
  state.players.forEach((p) => {
    const isWinner = winners.some((w) => w.id === p.id);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.total}</td>
      <td>${isWinner ? '<span class="pill-winner">Vítěz</span>' : '-'}</td>
    `;
    resultsBody.appendChild(tr);
  });

  generateExportText();
  runWinnerAnimation();
}


// ------------------------------------------------------------
// EXPORT TEXTOVĚ
// ------------------------------------------------------------
function generateExportText() {
  let text = "Výsledky hry:\n\n";

  state.players.forEach((p) => {
    text += `${p.name}: ${p.total}\n`;
  });

  text += "\nHistorie:\n";
  state.history.forEach((r) => {
    text += `Kolo ${r.round}:\n`;
    r.rows.forEach((x) => {
      text += `  ${x.name}: ${x.before} + ${x.gain} → ${x.after}\n`;
    });
  });

  exportText.value = text;
}

copyExportBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(exportText.value);
    alert("Zkopírováno 👍");
  } catch (e) {
    alert("Nepodařilo se zkopírovat.");
  }
});


// ------------------------------------------------------------
// ANIMACE VÍTĚZE – KONFETY 5 sekund + BANANAAAA overlay
// ------------------------------------------------------------
function runWinnerAnimation() {
  winnerAnimation.style.display = "block";
  confettiCanvas.style.display = "block";

  const ctx = confettiCanvas.getContext("2d");
  const w = (confettiCanvas.width = window.innerWidth);
  const h = (confettiCanvas.height = window.innerHeight);

  const confetti = Array.from({ length: 150 }).map(() => ({
    x: Math.random() * w,
    y: Math.random() * -h,
    r: Math.random() * 5 + 3,
    c: ["#f7d33f", "#3e65cf", "#ffeb3b", "#2b6cb0"][Math.floor(Math.random() * 4)],
    s: Math.random() * 2 + 1,
  }));

  let animFrame;

  function draw() {
    ctx.clearRect(0, 0, w, h);

    confetti.forEach((f) => {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = f.c;
      ctx.fill();

      f.y += f.s;
      if (f.y > h) {
        f.y = -10;
        f.x = Math.random() * w;
      }
    });

    animFrame = requestAnimationFrame(draw);
  }

  draw();

  // Velký BANANAAAA text
  const bananaDiv = document.createElement("div");
  bananaDiv.className = "banana-overlay";
  bananaDiv.textContent = "BANANAAAAA!";
  document.body.appendChild(bananaDiv);

  // Stop after 5 sec
  setTimeout(() => {
    cancelAnimationFrame(animFrame);
    ctx.clearRect(0, 0, w, h);
    confettiCanvas.style.display = "none";
    bananaDiv.remove();
  }, 5000);
}


// ------------------------------------------------------------
// RESTART HRY
// ------------------------------------------------------------
restartBtn.addEventListener("click", () => {
  location.reload();
});
