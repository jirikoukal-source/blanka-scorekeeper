
let gameType = "dice";
let state = null;

const playerCountSelect = document.getElementById("player-count");
const playersInputsContainer = document.getElementById("players-inputs");

function renderPlayerInputs() {
  const count = parseInt(playerCountSelect.value);
  playersInputsContainer.innerHTML = "";
  for (let i = 0; i < count; i++) {
    playersInputsContainer.innerHTML += `<input type="text" placeholder="Hráč ${i+1}" data-index="${i}" style="margin-bottom:6px;">`;
  }
}

renderPlayerInputs();
playerCountSelect.addEventListener("change", renderPlayerInputs);

document.querySelectorAll(".toggle-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".toggle-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    gameType = btn.dataset.game;
  });
});

document.getElementById("start-btn").addEventListener("click", () => {
  const count = parseInt(playerCountSelect.value);
  const target = parseInt(document.getElementById("target-score").value);
  if (!target) { alert("Zadej hranici"); return; }

  const names = playersInputsContainer.querySelectorAll("input");
  const players = [...names].map((n,i)=>({ id:i, name:n.value||`Hráč ${i+1}`, total:0 }));

  state = { players, gameType, target, round:1, finished:false };

  document.getElementById("setup-card").style.display="none";
  document.getElementById("game-card").style.display="block";

  document.getElementById("badge-game").textContent = gameType==="dice"?"🎲 Kostky":"🃏 Karty";
  document.getElementById("round-label").textContent = "Kolo: 1";

  renderScoreRows();
});

function renderScoreRows() {
  const container = document.getElementById("score-rows");
  container.innerHTML = "";
  state.players.forEach(p=>{
    container.innerHTML += `
      <div class="scorecard-row">
        <div>${p.name}</div>
        <div class="center">${p.total}</div>
        <div><input data-id="${p.id}" type="number" min="0" placeholder="0" style="width:100%;"></div>
      </div>`;
  });
}

document.getElementById("confirm-round-btn").addEventListener("click", ()=>{
  if (state.finished) return;

  const inputs = document.querySelectorAll("#score-rows input");

  inputs.forEach(input=>{
    const id = parseInt(input.dataset.id);
    const gain = parseInt(input.value)||0;
    const p = state.players.find(x=>x.id===id);

    const newTotal = p.total + gain;

    if (state.gameType==="cards") {
      if (newTotal <= state.target) p.total = newTotal;
    } else {
      p.total = newTotal;
    }

    input.value="";
  });

  if (state.gameType==="dice") {
    const winners = state.players.filter(p=>p.total===state.target);
    if (winners.length>0) return finishGame(winners,[]);
  }

  if (state.gameType==="cards") {
    const exceeded = state.players.filter(p=>p.total>state.target);
    if (exceeded.length>0) {
      const valid = state.players.filter(p=>p.total<=state.target);
      const min = Math.min(...valid.map(x=>x.total));
      const winners = valid.filter(x=>x.total===min);
      return finishGame(winners,exceeded);
    }
  }

  state.round++;
  document.getElementById("round-label").textContent = "Kolo: " + state.round;
  renderScoreRows();
});

function finishGame(winners, losers) {
  state.finished=true;
  document.getElementById("confirm-round-btn").style.display="none";
  document.getElementById("restart-btn").style.display="block";

  const box = document.getElementById("results");
  box.style.display="block";

  document.getElementById("results-title").textContent =
    winners.length===1 ? "Máme vítěze! 🎉" : "Více vítězů! 🤝";

  document.getElementById("results-subtitle").textContent =
    "Hranice: " + state.target;

  const body = document.getElementById("results-body");
  body.innerHTML="";

  state.players.forEach(p=>{
    let status="-";
    if (winners.some(w=>w.id===p.id)) status='<span class="pill-winner">Vítěz</span>';
    if (losers.some(l=>l.id===p.id)) status='<span class="pill-loser">Prohrál</span>';

    body.innerHTML += `<tr><td>${p.name}</td><td>${p.total}</td><td>${status}</td></tr>`;
  });
}

document.getElementById("restart-btn").addEventListener("click", ()=>location.reload());
