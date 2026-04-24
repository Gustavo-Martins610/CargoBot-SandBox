const initialState = {
  clawPos: 0,
  holding: null,
  piles: [["blue", "red", "green", "yellow"], [], [], [], [], [], []],
  levelName: "Playground",
  levelHint:
    "Bem-vindo! Mova a garra com código e organize as caixas como desejar.",
};

let state = cloneState(initialState);
let running = false;
let stopRequested = false;

const simulatorEl = document.getElementById("simulator");
const statusEl = document.getElementById("status");
const codeEl = document.getElementById("code");
const levelNameEl = document.getElementById("level-name");
const levelHintEl = document.getElementById("level-hint");

const btnRun = document.getElementById("btn-run");
const btnStop = document.getElementById("btn-stop");
const btnLoad = document.getElementById("btn-load");
const btnReset = document.getElementById("btn-reset");
const btnStepRight = document.getElementById("btn-step-right");
const btnStepLeft = document.getElementById("btn-step-left");
const btnStepDown = document.getElementById("btn-step-down");

function cloneState(src) {
  return {
    clawPos: src.clawPos,
    holding: src.holding,
    piles: src.piles.map((pile) => [...pile]),
    levelName: src.levelName,
    levelHint: src.levelHint,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setStatus(message) {
  statusEl.textContent = message;
}

function moveRight() {
  if (state.clawPos >= state.piles.length - 1) {
    throw new Error("Bateu na parede da direita.");
  }
  state.clawPos += 1;
}

function moveLeft() {
  if (state.clawPos <= 0) {
    throw new Error("Bateu na parede da esquerda.");
  }
  state.clawPos -= 1;
}

function toggleDown() {
  const pile = state.piles[state.clawPos];
  if (state.holding === null) {
    if (pile.length === 0) {
      throw new Error("Nao ha caixa para pegar nesta pilha.");
    }
    state.holding = pile.pop();
  } else {
    pile.push(state.holding);
    state.holding = null;
  }
}

function render() {
  simulatorEl.innerHTML = "";

  const track = document.createElement("div");
  track.className = "track";
  simulatorEl.appendChild(track);

  const claw = document.createElement("div");
  claw.className = "claw";
  const cellW = (simulatorEl.clientWidth - 28) / state.piles.length;
  claw.style.left = `${14 + state.clawPos * cellW + cellW / 2 - 30}px`;

  // SVG garra
  claw.innerHTML = `
    <svg width="60" height="120" viewBox="0 0 60 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Cabeça da garra (motor) -->
      <rect x="10" y="0" width="40" height="20" rx="5" fill="#0f5947" stroke="#0a3d33" stroke-width="2"/>
      <circle cx="30" cy="10" r="4" fill="#1a8070"/>
      
      <!-- Braço principal -->
      <rect x="24" y="20" width="12" height="50" rx="6" fill="#136f63" stroke="#0a3d33" stroke-width="2"/>
      
      <!-- Base das garras -->
      <ellipse cx="30" cy="70" rx="10" ry="8" fill="#0f5947" stroke="#0a3d33" stroke-width="2"/>
      
      <!-- Garra esquerda -->
      <path d="M 22 70 Q 10 75 8 95" stroke="#136f63" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M 10 95 Q 8 100 10 105" stroke="#136f63" stroke-width="4" fill="none" stroke-linecap="round"/>
      
      <!-- Garra direita -->
      <path d="M 38 70 Q 50 75 52 95" stroke="#136f63" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M 50 95 Q 52 100 50 105" stroke="#136f63" stroke-width="4" fill="none" stroke-linecap="round"/>
      
      <!-- Pontas das garras -->
      <circle cx="10" cy="105" r="2.5" fill="#08453a"/>
      <circle cx="50" cy="105" r="2.5" fill="#08453a"/>
    </svg>
  `;

  if (state.holding) {
    const hold = document.createElement("div");
    hold.className = `holding box ${state.holding}`;
    claw.appendChild(hold);
  }

  simulatorEl.appendChild(claw);

  const pilesWrap = document.createElement("div");
  pilesWrap.className = "piles";

  state.piles.forEach((pile, idx) => {
    const pileEl = document.createElement("div");
    pileEl.className = "pile";

    const label = document.createElement("div");
    label.className = "pile-label";
    label.textContent = `P${idx + 1}`;
    pileEl.appendChild(label);

    pile.forEach((color) => {
      const box = document.createElement("div");
      box.className = `box ${color}`;
      pileEl.appendChild(box);
    });

    pilesWrap.appendChild(pileEl);
  });

  simulatorEl.appendChild(pilesWrap);
}

function parseProgram(source) {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter((line) => line.length > 0);

  const [commands, nextIndex] = parseBlock(lines, 0, false);
  if (nextIndex !== lines.length) {
    throw new Error("Existe um bloco fechado fora de lugar.");
  }
  return commands;
}

function parseBlock(lines, startIndex, mustClose) {
  const commands = [];
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];

    if (line === "}") {
      if (!mustClose) {
        throw new Error(`Linha ${i + 1}: chave de fechamento inesperada.`);
      }
      return [commands, i + 1];
    }

    const repitaMatch = line.match(/^repita\s+(\d+)\s*\{$/i);
    if (repitaMatch) {
      const times = Number(repitaMatch[1]);
      const [innerCommands, newIndex] = parseBlock(lines, i + 1, true);
      for (let n = 0; n < times; n += 1) {
        commands.push(...innerCommands);
      }
      i = newIndex;
      continue;
    }

    const esperarMatch = line.match(/^esperar\s+(\d+)$/i);
    if (esperarMatch) {
      commands.push({ op: "esperar", value: Number(esperarMatch[1]) });
      i += 1;
      continue;
    }

    if (/^direita$/i.test(line)) {
      commands.push({ op: "direita" });
      i += 1;
      continue;
    }

    if (/^esquerda$/i.test(line)) {
      commands.push({ op: "esquerda" });
      i += 1;
      continue;
    }

    if (/^descer$/i.test(line)) {
      commands.push({ op: "descer" });
      i += 1;
      continue;
    }

    throw new Error(`Linha ${i + 1}: comando invalido -> ${line}`);
  }

  if (mustClose) {
    throw new Error("Bloco repita sem chave de fechamento.");
  }

  return [commands, i];
}

async function execute(commands) {
  if (running) return;
  running = true;
  stopRequested = false;

  try {
    setStatus("Executando...");
    for (let i = 0; i < commands.length; i += 1) {
      if (stopRequested) {
        setStatus("Execucao interrompida.");
        break;
      }

      const cmd = commands[i];
      if (cmd.op === "direita") {
        moveRight();
        setStatus(`Passo ${i + 1}: direita`);
        render();
        await sleep(380);
      } else if (cmd.op === "esquerda") {
        moveLeft();
        setStatus(`Passo ${i + 1}: esquerda`);
        render();
        await sleep(380);
      } else if (cmd.op === "descer") {
        toggleDown();
        setStatus(`Passo ${i + 1}: descer (pegar/soltar)`);
        render();
        await sleep(430);
      } else if (cmd.op === "esperar") {
        setStatus(`Passo ${i + 1}: esperar ${cmd.value}ms`);
        await sleep(cmd.value);
      }
    }

    if (!stopRequested) {
      setStatus("Programa concluido com sucesso.");
    }
  } catch (err) {
    setStatus(`Erro: ${err.message}`);
  } finally {
    running = false;
    stopRequested = false;
  }
}

function reset() {
  state = cloneState(initialState);
  render();
  setStatus("Estado resetado.");
}

btnRun.addEventListener("click", () => {
  try {
    const commands = parseProgram(codeEl.value);
    execute(commands);
  } catch (err) {
    setStatus(`Erro de codigo: ${err.message}`);
  }
});

btnStop.addEventListener("click", () => {
  stopRequested = true;
});

btnLoad.addEventListener("click", () => {
  codeEl.value = `# Distribuir os 4 blocos em pilhas diferentes!
# Bloco 1 para P2
descer
direita
descer
esquerda

# Bloco 2 para P3
descer
direita
direita
descer
esquerda
esquerda

# Bloco 3 para P4
descer
direita
direita
direita
descer
esquerda
esquerda
esquerda

# Bloco 4 para P5
descer
direita
direita
direita
direita
descer`;
  setStatus("Exemplo carregado.");
});

btnReset.addEventListener("click", reset);

btnStepRight.addEventListener("click", () => {
  try {
    moveRight();
    render();
    setStatus("Movimento manual: direita");
  } catch (err) {
    setStatus(`Erro: ${err.message}`);
  }
});

btnStepLeft.addEventListener("click", () => {
  try {
    moveLeft();
    render();
    setStatus("Movimento manual: esquerda");
  } catch (err) {
    setStatus(`Erro: ${err.message}`);
  }
});

btnStepDown.addEventListener("click", () => {
  try {
    toggleDown();
    render();
    setStatus("Movimento manual: descer (pegar/soltar)");
  } catch (err) {
    setStatus(`Erro: ${err.message}`);
  }
});

window.addEventListener("resize", render);

render();
levelNameEl.textContent = state.levelName;
levelHintEl.textContent = state.levelHint;
setStatus("Pronto. Escreva comandos e clique em Executar Codigo.");
