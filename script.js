// Stav hry
let state = null;
let gameType = "dice";
let activePlayerId = null;
let roundScores = {}; // {playerId: number}
let audioCtx = null;

// DOM prvky
const playerCountSelect = document.getElementById("player-count");
const playersInputsContainer = document.getElementById("players-inputs");
const setupCard = document.getElementById("setup-card");
const gameCard = document.getElementById("game-card");

const toggleButtons = document.querySelectorAll(".toggle-btn");
const startBtn = document.getElementById("start-btn");
const confirmRoundBtn = document.getElementById("confirm-round-btn");
const endGameBtn = document.getElementById("end-game-btn");
const restartBtn = document.getElementById("restart-btn");

const badgeGame = document.getElementById("badge-game");
const roundLabel = document.getElementById("round-label");
const targetLabel = document.getElementById("target-label");
const scoreRows = document.getElementById("score-rows");

const activePlayerNameEl = document.getElementById("active-player-name");
const activePlayerValueEl = document.getElementById("active-player-value");

const historyList = document.getElementById("history-list");
const historyInfo = document.getElementById("history-info");

const resultsBox = document.getElementById("results");
const resultsTitle = document.getElementById("results-title");
const resultsSubtitle = document.getElementById("results-subtitle");
const resultsBody = document.getElementById("results-body");
const exportText = document.getElementById("export-text");
const copyExportBtn = document.getElementById("copy-export-btn");
const downloadExportBtn = document.getElementById("download-export-btn");

// Helpers – audio

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
}

function beep({ frequency = 880, duration = 120, type = "sine", volume = 0.15 } = {}) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  setTimeout(() => osc.stop(), duration);
}

// Inicializace polí pro jména hráčů

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

// Typ hry

toggleButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    toggleButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    gameType = btn.dataset.game;
  });
});

playerCountSelect.addEventListener("change", renderPlayerInputs);
renderPlayerInputs();

// Start hry

startBtn.addEventListener("click", () => {
  initAudio();

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

// UI – výběr hráče, zobrazení řádků

function renderScoreRows() {
  scoreRows.innerHTML = "";
  state.players.forEach((p) => {
    const row = document.createElement("div");
    row.className = "scorecard-row";
    if (p.id === activePlayerId) row.classList.add("active");

    const roundVal = roundScores[p.id] ?? 0;

    row.innerHTML = `
      <div>
        <button class="row-select" data-id="${p.id}">${p.name}</button>
      </div>
      <div class="center">${p.total}</div>
      <div class="center round-val">${roundVal}</div>
    `;

    scoreRows.appendChild(row);
  });

  // Handlery pro výběr hráče
  scoreRows.querySelectorAll(".row-select").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id, 10);
      activePlayerId = id;
      playTap();
      renderScoreRows();
      updateActivePlayerInfo();
    });
  });
}

function updateActivePlayerInfo() {
  if (!state || activePlayerId == null) {
    activePlayerNameEl.textContent = "–";
    activePlayerValueEl.textContent = "0";
    return;
  }

  const player = state.players.find((p) => p.id === activePlayerId);
  activePlayerNameEl.textContent = player ? player.name : "–";
  activePlayerValueEl.textContent = (roundScores[activePlayerId] ?? 0).toString();
}

function setRoundScoreForActivePlayer(value) {
  if (activePlayerId == null) return;
  const safeVal = Math.max(0, Math.min(999, value)); // rozumný limit
  roundScores[activePlayerId] = safeVal;
  renderScoreRows();
  updateActivePlayerInfo();
}

// Keypad

function playTap() {
  beep({ frequency: 1400, duration: 60, volume: 0.08 });
}

document.querySelectorAll(".key-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (state?.finished) return;
    if (activePlayerId == null) return;

    const key = btn.dataset.key;
    playTap();
    const current = roundScores[activePlayerId] ?? 0;
    let nextVal = current;

    if (/^\d$/.test(key)) {
      const asString = current === 0 ? key : current.toString() + key;
      nextVal = parseInt(asString, 10);
    } else if (key === "C") {
      nextVal = 0;
    } else if (key === "⌫") {
      const s = current.toString();
      nextVal = s.length <= 1 ? 0 : parseInt(s.slice(0, -1), 10);
    }

    setRoundScoreForActivePlayer(nextVal);
  });
});

document.querySelectorAll(".chip-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (state?.finished) return;
    if (activePlayerId == null) return;
    const add = parseInt(btn.dataset.add, 10);
    playTap();
    const current = roundScores[activePlayerId] ?? 0;
    setRoundScoreForActivePlayer(current + add);
  });
});

// Potvrzení kola

confirmRoundBtn.addEventListener("click", () => {
  if (!state || state.finished) return;

  // Pokud někdo nemá hodnotu v kole, bereme 0
  const entries = state.players.map((p) => {
    const gain = roundScores[p.id] ?? 0;
    return { id: p.id, gain };
  });

  const historyEntry = {
    round: state.round,
    rows: [],
  };

  let diceHitExact = false;
  let diceWinners = [];
  let anyDiceOvershoot = false;

  // Aplikace skóre
  entries.forEach(({ id, gain }) => {
    const p = state.players.find((pl) => pl.id === id);
    const before = p.total;
    let appliedGain = gain;
    let after = before;

    if (state.gameType === "dice") {
      const newTotal = before + gain;
      if (newTotal > state.target) {
        // překročení – kolo se nepočítá
        appliedGain = 0;
        after = before;
        anyDiceOvershoot = true;
      } else {
        after = newTotal;
        p.total = newTotal;
        if (newTotal === state.target) {
          diceHitExact = true;
        }
      }
    } else {
      // KARTY – tah přes hranici se nepočítá
      const newTotal = before + gain;
      if (newTotal > state.target) {
        appliedGain = 0;
        after = before;
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

  // Vyčištění kolového vstupu
  roundScores = {};
  renderScoreRows();
  updateActivePlayerInfo();

  // Zvuk za overshoot
  if (state.gameType === "dice" && anyDiceOvershoot) {
    beep({ frequency: 320, duration: 150, type: "square", volume: 0.15 });
  }

  // Vyhodnocení – KOSTKY
  if (state.gameType === "dice") {
    if (diceHitExact) {
      diceWinners = state.players.filter((p) => p.total === state.target);
      finishGame(diceWinners, []);
      return;
    }
  }

  // Vyhodnocení – KARTY: automaticky NIKDY nekončí,
  // hráč musí použít tlačítko "Ukončit hru".
  state.round += 1;
  roundLabel.textContent = "Kolo: " + state.round;
});

// Ukončení hry – hlavně pro KARTY, ale lze použít vždy

endGameBtn.addEventListener("click", () => {
  if (!state || state.finished) return;

  const minScore = Math.min(...state.players.map((p) => p.total));
  const winners = state.players.filter((p) => p.total === minScore);
  const losers = []; // necháme prázdné – jde spíš o vítěze

  finishGame(winners, losers);
});

// Dokončení hry, export, zvuky

function finishGame(winners, losers) {
  state.finished = true;
  confirmRoundBtn.style.display = "none";
  endGameBtn.style.display = "none";
  restartBtn.style.display = "block";
  resultsBox.style.display = "block";

  if (winners.length === 1) {
    resultsTitle.textContent = "Máme vítěze! 🎉";
    beep({ frequency: 1040, duration: 200, type: "triangle", volume: 0.2 });
  } else {
    resultsTitle.textContent = "Více vítězů! 🤝";
    beep({ frequency: 900, duration: 200, type: "triangle", volume: 0.2 });
  }

  resultsSubtitle.textContent =
    "Hra ukončena v " +
    state.round +
    ". kole • Hranice: " +
    state.target +
    " • Typ hry: " +
    (state.gameType === "dice" ? "Kostky" : "Karty");

  resultsBody.innerHTML = "";
  state.players.forEach((p) => {
    const row = document.createElement("tr");

    const isWinner = winners.some((w) => w.id === p.id);
    const isLoser = losers.some((l) => l.id === p.id);

    let status = "-";
    if (isWinner) status = '<span class="pill-winner">Vítěz</span>';
    else if (isLoser) status = '<span class="pill-loser">Prohrál</span>';

    row.innerHTML = `
      <td>${p.name}</td>
      <td>${p.total}</td>
      <td>${status}</td>
    `;

    resultsBody.appendChild(row);
  });

  generateExportText();
}

// Historie kol

function renderHistory() {
  if (!state || state.history.length === 0) {
    historyList.innerHTML = "";
    historyInfo.textContent = "Zatím žádná odehraná kola.";
    return;
  }

  historyInfo.textContent = "Počet kol: " + state.history.length;

  historyList.innerHTML = "";
  state.history.forEach((round) => {
    const roundHeader = document.createElement("div");
    roundHeader.className = "history-item";
    roundHeader.style.fontWeight = "600";
    roundHeader.textContent = "Kolo " + round.round + ":";
    historyList.appendChild(roundHeader);

    round.rows.forEach((r) => {
      const item = document.createElement("div");
      item.className = "history-item";
      item.textContent = `${r.name}: ${r.before} + ${r.gain} → ${r.after}`;
      historyList.appendChild(item);
    });
  });
}

// Export výsledků

function generateExportText() {
  if (!state) return;

  let lines = [];
  lines.push("Blanka's Scorekeeper – výsledky");
  lines.push(
    "Typ hry: " +
      (state.gameType === "dice" ? "Kostky" : "Karty") +
      ", hranice: " +
      state.target +
      ", počet kol: " +
      state.history.length
  );
  lines.push("");

  lines.push("Konečné skóre:");
  state.players.forEach((p) => {
    lines.push(`${p.name}: ${p.total}`);
  });

  lines.push("");
  lines.push("Historie kol:");
  state.history.forEach((round) => {
    lines.push(`Kolo ${round.round}:`);
    round.rows.forEach((r) => {
      lines.push(`  ${r.name}: ${r.before} + ${r.gain} → ${r.after}`);
    });
  });

  exportText.value = lines.join("\n");
}

copyExportBtn.addEventListener("click", async () => {
  if (!navigator.clipboard) {
    alert("Prohlížeč nepodporuje kopírování do schránky.");
    return;
  }
  try {
    await navigator.clipboard.writeText(exportText.value);
    alert("Výsledky zkopírovány do schránky 👍");
  } catch (e) {
    alert("Nepodařilo se zkopírovat do schránky.");
  }
});

downloadExportBtn.addEventListener("click", () => {
  if (!state) return;

  let csv = "Jmeno,Body\n";
  state.players.forEach((p) => {
    csv += `"${p.name}",${p.total}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "blanka-scorekeeper-vysledky.csv";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
});

// Restart

restartBtn.addEventListener("click", () => {
  location.reload();
});
