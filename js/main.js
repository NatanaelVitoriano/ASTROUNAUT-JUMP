const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const astronautImg = new Image();

// Variável para controlar carregamento
let astronautLoaded = false;
let gameReady = false;

astronautImg.onload = () => {
  astronautLoaded = true;
  gameReady = true;
  console.log("✅ Astronauta carregado!");
};

astronautImg.onerror = () => {
  console.error("❌ Erro ao carregar astronauta. Usando fallback.");
  astronautLoaded = false;
  gameReady = true; // Continua o jogo mesmo sem imagem
};

// Detecta se está em produção (Vercel) ou local
const isProduction = window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1' &&
                     window.location.protocol !== 'file:';

// Usa caminho apropriado
astronautImg.src = isProduction ? "/img/astronauta.png" : "./img/astronauta.png";

const GAME_WIDTH = 500;
const GAME_HEIGHT = window.innerHeight;

// NOVO: Sistema de escala responsiva
let scale = 1;
let responsiveConfig = {
  platformWidth: 80,
  platformHeight: 15,
  playerWidth: 50,
  playerHeight: 50,
  removalMargin: 100,
  drawMargin: 50
};

function calculateResponsiveValues() {
  // Escala baseada na largura do canvas
  scale = Math.min(canvas.width / 500, 1);
  
  // Ajusta valores proporcionalmente
  responsiveConfig.platformWidth = Math.floor(80 * scale);
  responsiveConfig.platformHeight = Math.floor(15 * scale);
  responsiveConfig.playerWidth = Math.floor(50 * scale);
  responsiveConfig.playerHeight = Math.floor(50 * scale);
  
  // Margens proporcionais à altura da tela
  responsiveConfig.removalMargin = Math.max(canvas.height * 0.2, 100);
  responsiveConfig.drawMargin = Math.max(canvas.height * 0.1, 50);
  
  // Garante valores mínimos
  responsiveConfig.platformWidth = Math.max(responsiveConfig.platformWidth, 60);
  responsiveConfig.platformHeight = Math.max(responsiveConfig.platformHeight, 12);
}

// DECLARAR gameState ANTES de usar
let gameState = "start";

// Inicializa canvas com tamanho padrão
canvas.width = Math.min(window.innerWidth, 500);
canvas.height = window.innerHeight;

const player = {
  x: canvas.width / 2 - 25,
  y: canvas.height - 150,
  width: 50,
  height: 50,
  dy: 0,
  gravity: 0.33,
  jumpForce: -16,
  color: "white",
  score: 0,
  jetpack: false,
  level: 1
};

let playerName = null;

/* =======================================================
   SISTEMA GLOBAL DE PONTUAÇÕES VIA JSONBIN.IO
   ======================================================= */

const JSONBIN_ID = "693ae9d6d0ea881f40224250";
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_ID}`;
const JSONBIN_KEY = "$2a$10$EW0tMrOEJWnc5qUwAzOQie7fkFGUTQ.DSxIsXtfNNa4i/bhKj4LJK";

// -------- Carregar pontuações do JSONBin --------
async function carregarPontuacoes() {
  try {
    const resp = await fetch(`${JSONBIN_URL}/latest`, {
      headers: {
        "X-Master-Key": JSONBIN_KEY
      }
    });

    const data = await resp.json();
    return data.record.scores || [];
  } catch (err) {
    console.error("Erro ao carregar ranking:", err);
    return [];
  }
}

// -------- Salvar pontuações no JSONBin --------
async function salvarPontuacoes(scores) {
  try {
    const resp = await fetch(JSONBIN_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": JSONBIN_KEY
      },
      body: JSON.stringify({ scores })
    });

    if (!resp.ok) {
      console.error("Erro ao salvar:", await resp.text());
    }
  } catch (err) {
    console.error("Erro ao salvar pontuação:", err);
  }
}

// -------- Registrar pontuação ao morrer --------
async function registrarPontuacaoGlobal() {
  if (!playerName) return;

  // Verifica se atingiu 100k pontos
  if (player.score >= 100000) {
    mostrarModalPix();
  } else {
    await salvarPontuacao(null);
  }
}

async function salvarPontuacao(pix) {
  // Tenta carregar pontuações existentes
  let scores = [];
  try {
    const resp = await fetch(`${JSONBIN_URL}/latest`, {
      headers: {
        "X-Master-Key": JSONBIN_KEY
      }
    });

    if (resp.ok) {
      const data = await resp.json();
      scores = data.record.scores || [];
    }
  } catch (err) {
    console.warn("Não foi possível carregar pontuações anteriores:", err);
    scores = [];
  }

  // Adiciona a nova pontuação ao array existente
  scores.push({
    name: playerName,
    score: player.score,
    pix: pix,
    date: new Date().toISOString()
  });

  await salvarPontuacoes(scores);

  mostrarNotificacao("🎉 Pontuação registrada com sucesso!");
}

// -------- Sistema de Modais Customizados --------
function mostrarModalNome() {
  const modal = document.getElementById("modalNome");
  const input = document.getElementById("inputNome");
  modal.style.display = "flex";
  setTimeout(() => input.focus(), 100);
}

function fecharModalNome() {
  document.getElementById("modalNome").style.display = "none";
}

function confirmarNome() {
  const input = document.getElementById("inputNome");
  const nome = input.value.trim();
  
  if (nome) {
    playerName = nome;
    fecharModalNome();
    createInitialPlatforms();
    gameState = "playing";
  } else {
    input.style.borderColor = "#ff4444";
    setTimeout(() => input.style.borderColor = "#4a9eff", 500);
  }
}

function mostrarModalPix() {
  const modal = document.getElementById("modalPix");
  const input = document.getElementById("inputPix");
  modal.style.display = "flex";
  setTimeout(() => input.focus(), 100);
}

function fecharModalPix() {
  document.getElementById("modalPix").style.display = "none";
  salvarPontuacao(null);
}

function confirmarPix() {
  const input = document.getElementById("inputPix");
  const pix = input.value.trim();
  
  document.getElementById("modalPix").style.display = "none";
  salvarPontuacao(pix || null);
}

function mostrarNotificacao(mensagem) {
  const notif = document.getElementById("notificacao");
  notif.textContent = mensagem;
  notif.style.display = "block";
  notif.style.opacity = "1";
  
  setTimeout(() => {
    notif.style.opacity = "0";
    setTimeout(() => notif.style.display = "none", 300);
  }, 3000);
}


// -------- Verificar quem foi o primeiro a bater 100k --------
async function checarPrimeiroVencedor() {
  let scores = await carregarPontuacoes();

  const vencedor = scores
    .filter(s => s.score >= 100000)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  if (!vencedor) {
    alert("Ainda não existe um vencedor que atingiu 100.000 pontos!");
    return;
  }

  alert(
    `🏆 PRIMEIRO VENCEDOR DO DESAFIO!\n\n` +
    `Nome: ${vencedor.name}\n` +
    `Pontuação: ${vencedor.score}\n` +
    `PIX: ${vencedor.pix}\n` +
    `Data: ${new Date(vencedor.date).toLocaleString()}\n`
  );
}

let platforms = [];
const platformWidth = 80;
const platformHeight = 15;

let screenShake = 0;
let items = [];

// Estrelas animadas para intro
let introStars = [];
for (let i = 0; i < 60; i++) {
  introStars.push({
    x: Math.random() * GAME_WIDTH,
    y: Math.random() * GAME_HEIGHT,
    size: Math.random() * 2 + 1,
    opacity: Math.random(),
    speed: Math.random() * 0.02 + 0.01
  });
}

// Planetas passando
let introPlanets = [
  { x: -80, y: 120, size: 90, speed: 0.2 },
  { x: GAME_WIDTH + 100, y: 350, size: 120, speed: -0.15 },
];

// Astronauta flutuante
let introAstronautFloat = 0;
let introAstronautDirection = 1;

let introTextAlpha = 0;
let introWordIndex = 0;
let introWordTimer = 0;
let rocketPulse = 0;

// Configuração responsiva do canvas
function resizeCanvas() {
  const maxWidth = 500;
  const width = Math.min(window.innerWidth, maxWidth);
  const height = window.innerHeight;
  
  canvas.width = width;
  canvas.height = height;
  
  // Recalcula valores responsivos
  calculateResponsiveValues();
  
  // Reposiciona o jogador se necessário
  if (gameState === "start") {
    player.x = canvas.width / 2 - responsiveConfig.playerWidth / 2;
  }
  
  // Atualiza tamanho do jogador
  player.width = responsiveConfig.playerWidth;
  player.height = responsiveConfig.playerHeight;
}

// Desabilita scroll bounce no iOS
document.addEventListener('touchmove', function(e) {
  if (e.target === canvas) {
    e.preventDefault();
  }
}, { passive: false });

// ========================================
// SISTEMA DE NÍVEIS - 10 NÍVEIS
// ========================================
function getCurrentLevel() {
  if (player.score < 10000) return 1;
  if (player.score < 20000) return 2;
  if (player.score < 30000) return 3;
  if (player.score < 40000) return 4;
  if (player.score < 50000) return 5;
  if (player.score < 60000) return 6;
  if (player.score < 70000) return 7;
  if (player.score < 80000) return 8;
  if (player.score < 90000) return 9;
  return 10; // Nível máximo
}

function getLevelConfig() {
  const level = getCurrentLevel();
  const bg = levelBackgrounds[level] || levelBackgrounds[1];
  
  // Espaçamento vertical ajustado para a tela
  const baseSpacing = canvas.height < 700 ? 100 : 115;
  
  const configs = {
    1: {
      name: bg.name,
      platforms: ["normal", "moving"],
      chanceMoving: 0.15,
      maxSpacing: baseSpacing,
      playerSpeed: 6 * scale,
      platformSpeed: 1.5,
      gravity: 0.33,
      color: "#7CFC00"
    },
    2: {
      name: bg.name,
      platforms: ["normal", "moving", "fragile"],
      chanceMoving: 0.2,
      chanceFragile: 0.1,
      maxSpacing: baseSpacing + 5,
      playerSpeed: 6.2 * scale,
      platformSpeed: 1.6,
      gravity: 0.34,
      color: "#90EE90"
    },
    3: {
      name: bg.name,
      platforms: ["normal", "moving", "fragile", "boost"],
      chanceMoving: 0.22,
      chanceFragile: 0.15,
      chanceBoost: 0.08,
      maxSpacing: baseSpacing + 10,
      playerSpeed: 6.5 * scale,
      platformSpeed: 1.7,
      gravity: 0.35,
      color: "#87CEEB"
    },
    4: {
      name: bg.name,
      platforms: ["normal", "moving", "fragile", "boost", "spring_side"],
      chanceMoving: 0.25,
      chanceFragile: 0.18,
      chanceBoost: 0.08,
      chanceSpringSide: 0.1,
      maxSpacing: baseSpacing + 15,
      playerSpeed: 6.8 * scale,
      platformSpeed: 1.8,
      gravity: 0.36,
      color: "#FFDAB9"
    },
    5: {
      name: bg.name,
      platforms: ["normal", "moving", "fragile", "boost", "spring_side", "ghost"],
      chanceMoving: 0.28,
      chanceFragile: 0.2,
      chanceBoost: 0.08,
      chanceSpringSide: 0.1,
      chanceGhost: 0.12,
      maxSpacing: baseSpacing + 20,
      playerSpeed: 7.1 * scale,
      platformSpeed: 1.9,
      gravity: 0.37,
      color: "#FFA07A"
    },
    6: {
      name: bg.name,
      platforms: ["normal", "moving", "fragile", "boost", "spring_side", "ghost", "cloud"],
      chanceMoving: 0.3,
      chanceFragile: 0.22,
      chanceBoost: 0.07,
      chanceSpringSide: 0.1,
      chanceGhost: 0.13,
      chanceCloud: 0.12,
      maxSpacing: baseSpacing + 25,
      playerSpeed: 7.5 * scale,
      platformSpeed: 2.0,
      gravity: 0.38,
      color: "#DDA0DD"
    },
    7: {
      name: bg.name,
      platforms: ["normal", "moving", "fragile", "boost", "spring_side", "ghost", "cloud", "cracked"],
      chanceMoving: 0.32,
      chanceFragile: 0.24,
      chanceBoost: 0.07,
      chanceSpringSide: 0.1,
      chanceGhost: 0.14,
      chanceCloud: 0.12,
      chanceCracked: 0.1,
      maxSpacing: baseSpacing + 30,
      playerSpeed: 7.8 * scale,
      platformSpeed: 2.1,
      gravity: 0.39,
      color: "#F0E68C"
    },
    8: {
      name: bg.name,
      platforms: ["moving", "fragile", "boost", "spring_side", "ghost", "cloud", "cracked"],
      chanceMoving: 0.33,
      chanceFragile: 0.26,
      chanceBoost: 0.04,
      chanceSpringSide: 0.1,
      chanceGhost: 0.15,
      chanceCloud: 0.13,
      chanceCracked: 0.12,
      maxSpacing: baseSpacing + 40,
      playerSpeed: 8.5 * scale,
      platformSpeed: 2.2,
      gravity: 0.45,
      color: "#D8BFD8"
    },
    9: {
      name: bg.name,
      platforms: ["moving", "fragile", "boost", "spring_side", "ghost", "cloud", "cracked"],
      chanceMoving: 0.35,
      chanceFragile: 0.28,
      chanceBoost: 0.03,
      chanceSpringSide: 0.08,
      chanceGhost: 0.17,
      chanceCloud: 0.14,
      chanceCracked: 0.14,
      maxSpacing: baseSpacing + 45,
      playerSpeed: 9.0 * scale,
      platformSpeed: 2.4,
      gravity: 0.54,
      color: "#FFB6C1"
    },
    10: {
      name: bg.name,
      platforms: ["moving", "fragile", "spring_side", "ghost", "cloud", "cracked"],
      chanceMoving: 0.38,
      chanceFragile: 0.3,
      chanceBoost: 0.02,
      chanceSpringSide: 0.07,
      chanceGhost: 0.2,
      chanceCloud: 0.15,
      chanceCracked: 0.15,
      maxSpacing: baseSpacing + 50,
      playerSpeed: 10.0 * scale,
      platformSpeed: 2.6,
      gravity: 0.55,
      color: "#FF6B6B"
    }
  };
  
  return configs[level] || configs[1];
}

// ========================================
// CRIAÇÃO DE PLATAFORMAS COM NÍVEIS
// ========================================
function createInitialPlatforms() {
  platforms = [];
  items = [];
  
  // Recalcula valores responsivos
  calculateResponsiveValues();
  
  player.x = canvas.width / 2 - responsiveConfig.playerWidth / 2;
  player.y = canvas.height - 150;
  player.width = responsiveConfig.playerWidth;
  player.height = responsiveConfig.playerHeight;
  player.dy = 0;
  player.score = 0;
  player.jetpack = false;
  player.level = 1;
  
  introTextAlpha = 0;
  introWordIndex = 0;
  introWordTimer = 0;
  rocketPulse = 0;
  
  // Cria estrelas para o nível inicial
  createStars();

  platforms.push({
    x: player.x - 15,
    y: player.y + player.height,
    width: responsiveConfig.platformWidth,
    height: responsiveConfig.platformHeight,
    type: "normal",
    dx: 0,
    disappear: false
  });

  for (let i = 1; i < 8; i++) {
    addPlatform();
  }
}

function startAtLevel(targetLevel) {
  createInitialPlatforms();
  // Calcula pontuação necessária para o nível
  player.score = (targetLevel - 1) * 10000;
  player.level = targetLevel;
  gameState = "playing";
}

function addPlatform() {
  if (platforms.length === 0) {
    platforms.push({
      x: canvas.width / 2 - responsiveConfig.platformWidth / 2,
      y: canvas.height / 2,
      width: responsiveConfig.platformWidth,
      height: responsiveConfig.platformHeight,
      type: "normal",
      dx: 0,
      disappear: false
    });
    return;
  }

  const lastPlatform = platforms[platforms.length - 1];
  const config = getLevelConfig();
  
  const verticalGap = config.maxSpacing;
  // Ajusta alcance horizontal baseado na largura da tela
  const horizontalRange = (canvas.width * 0.15) + Math.random() * (canvas.width * 0.4);
  const direction = Math.random() > 0.5 ? 1 : -1;
  const targetX = lastPlatform.x + (direction * horizontalRange);
  const finalX = Math.max(10, Math.min(canvas.width - responsiveConfig.platformWidth - 10, targetX));

  let type = "normal";
  let dx = 0;
  let disappear = false;
  let ghostVisible = true;
  let ghostTimer = 0;
  let springDirection = null;

  const rand = Math.random();
  let cumulative = 0;

  if (config.chanceFragile && rand < (cumulative += config.chanceFragile)) {
    type = "fragile";
    disappear = true;
  }
  else if (config.chanceMoving && rand < (cumulative += config.chanceMoving)) {
    type = "moving";
    dx = (Math.random() < 0.5 ? 1 : -1) * config.platformSpeed;
  }
  else if (config.chanceBoost && rand < (cumulative += config.chanceBoost)) {
    type = "boost";
  }
  else if (config.chanceSpringSide && rand < (cumulative += config.chanceSpringSide)) {
    type = "spring_side";
    springDirection = Math.random() < 0.5 ? "left" : "right";
  }
  else if (config.chanceGhost && rand < (cumulative += config.chanceGhost)) {
    type = "ghost";
    ghostVisible = true;
    ghostTimer = 0;
  }
  else if (config.chanceCloud && rand < (cumulative += config.chanceCloud)) {
    type = "cloud";
  }
  else if (config.chanceCracked && rand < (cumulative += config.chanceCracked)) {
    type = "cracked";
  }
  else {
    type = "normal";
  }

  const plat = {
    x: finalX,
    y: lastPlatform.y - verticalGap,
    width: responsiveConfig.platformWidth,
    height: responsiveConfig.platformHeight,
    type,
    dx,
    disappear,
    hits: 0,
    ghostVisible,
    ghostTimer,
    springDirection
  };

  platforms.push(plat);

  // Itens
  let itemChance = 0.12 - (getCurrentLevel() * 0.01);
  if (Math.random() < itemChance) {
    items.push({
      x: plat.x + plat.width / 2 - 10,
      y: plat.y - 20,
      width: 20,
      height: 20,
      type: Math.random() < 0.7 ? "star" : "jetpack"
    });
  }
}

function updatePlatforms() {
  for (let i = platforms.length - 1; i >= 0; i--) {
    let plat = platforms[i];

    // Tremor visual para plataformas rachadas
    if (plat.shake) {
      plat.y += Math.sin(Date.now() * 0.05) * 1.5;
      plat.shake--;
    }

    // Plataforma fantasma (aparece/desaparece)
    if (plat.type === "ghost") {
      plat.ghostTimer++;
      if (plat.ghostTimer > 60) {
        plat.ghostVisible = !plat.ghostVisible;
        plat.ghostTimer = 0;
      }
    }

    // Movimento
    if (plat.dx !== 0) {
      plat.x += plat.dx;
      if (plat.x <= 0 || plat.x + plat.width >= canvas.width) {
        plat.dx *= -1;
      }
    }

    // Remove plataformas bem abaixo da tela
    if (plat.y > canvas.height + responsiveConfig.removalMargin) {
      platforms.splice(i, 1);
    }
  }

  // Adiciona novas plataformas mantendo sempre uma boa quantidade visível
  if (platforms.length > 0) {
    const highestPlatform = Math.min(...platforms.map(p => p.y));
    const minPlatforms = Math.ceil(canvas.height / 100); // Mais plataformas em telas maiores
    
    while (highestPlatform > -canvas.height * 0.5 && platforms.length < minPlatforms) {
      addPlatform();
    }
  } else {
    for (let i = 0; i < 10; i++) {
      addPlatform();
    }
  }

  // Atualiza itens
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].y > canvas.height + responsiveConfig.removalMargin) {
      items.splice(i, 1);
    }
  }
}

function movePlayer() {
  const config = getLevelConfig();
  const oldLevel = player.level;
  
  if (keys["ArrowLeft"]) player.x -= config.playerSpeed;
  if (keys["ArrowRight"]) player.x += config.playerSpeed;

  if (player.x + player.width < 0) player.x = canvas.width;
  if (player.x > canvas.width) player.x = -player.width;

  player.dy += config.gravity;
  player.y += player.dy;

  // Colisão com plataformas
  for (let plat of platforms) {
    // Plataforma fantasma invisível não colide
    if (plat.type === "ghost" && !plat.ghostVisible) continue;

    // Plataforma nuvem: só colide se estiver subindo (dy > 0)
    const isCloudPlatform = plat.type === "cloud";
    const canCollideWithCloud = player.dy > 0;

    if (
      player.x < plat.x + plat.width &&
      player.x + player.width > plat.x &&
      player.y + player.height > plat.y &&
      player.y + player.height < plat.y + player.height &&
      player.dy > 0 &&
      (!isCloudPlatform || canCollideWithCloud)
    ) {
      if (plat.type === "boost") {
        screenShake = 12;
        player.dy = player.jumpForce * (player.level === 10 ? 2.0 : 2.5);
        platforms = platforms.filter(p => p !== plat);

      } else if (plat.type === "spring_side") {
        // Mola lateral: impulso horizontal forte
        screenShake = 10;
        const direction = plat.springDirection === "left" ? -1 : 1;
        player.dy = player.jumpForce * 1.2;
        
        // Adiciona velocidade horizontal (simulada com múltiplos movimentos)
        const pushFrames = 15;
        let pushCounter = 0;
        const pushInterval = setInterval(() => {
          player.x += direction * 8;
          pushCounter++;
          if (pushCounter >= pushFrames) clearInterval(pushInterval);
        }, 16);
        
        platforms = platforms.filter(p => p !== plat);

      } else if (plat.type === "cracked") {
        if (plat.hits === 0) {
          plat.hits = 1;
          plat.shake = 10;
          screenShake = 4;
          player.dy = player.jumpForce;
        } else {
          screenShake = 10;
          player.dy = player.jumpForce;
          platforms = platforms.filter(p => p !== plat);
        }

      } else if (plat.type === "fragile") {
        screenShake = 10;
        player.dy = player.jumpForce;
        platforms = platforms.filter(p => p !== plat);

      } else {
        // Normal, moving, ghost, cloud
        player.dy = player.jetpack ? player.jumpForce * 2 : player.jumpForce;
      }

      player.jetpack = false;

      if (plat.disappear) {
        platforms = platforms.filter(p => p !== plat);
      }
    }
  }

  // Colisão com itens
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (
      player.x < item.x + item.width &&
      player.x + player.width > item.x &&
      player.y < item.y + item.height &&
      player.y + player.height > item.y
    ) {
      if (item.type === "star") {
        player.score += 100;
      } else if (item.type === "jetpack") {
        player.jetpack = true;
      }
      items.splice(i, 1);
    }
  }

  // Scroll da câmera
  const scrollThreshold = Math.max(canvas.height / 3, 250);
  
  if (player.y < scrollThreshold) {
    let offset = (scrollThreshold - player.y);
    player.y = scrollThreshold;
    for (let plat of platforms) {
      plat.y += offset;
    }
    for (let item of items) {
      item.y += offset;
    }
    player.score += Math.floor(offset);
  }

  // Atualiza nível
  player.level = getCurrentLevel();
  
  // Recria estrelas quando muda de nível
  if (oldLevel !== player.level) {
    createStars();
  }

  // Game over
  if (player.y > canvas.height) {
    gameState = "gameover";
    registrarPontuacaoGlobal();
  }
}

function drawStartScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawStars();
  drawIntroPlanets();
  drawFloatingAstronaut();
  drawAnimatedIntroText();

  // Texto "clique para começar" - só aparece depois da animação completa
  if (introWordIndex >= 10) {
    ctx.font = "20px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";

    if (Date.now() % 1000 < 600) {
      ctx.fillText("Toque para começar", canvas.width / 2, canvas.height / 2 + 180);
    }
  }
}

function drawGameOverScreen() {
  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Fim de jogo!", canvas.width / 2, canvas.height / 2 - 60);
  ctx.font = "20px Arial";
  ctx.fillText("Pontuação: " + player.score, canvas.width / 2, canvas.height / 2 - 20);
  
  const config = getLevelConfig();
  ctx.fillStyle = config.color;
  ctx.fillText("Nível: " + player.level + " - " + config.name, canvas.width / 2, canvas.height / 2 + 20);
  
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText("Clique ou toque para jogar de novo", canvas.width / 2, canvas.height / 2 + 60);
}

// ========================================
// SISTEMA DE BACKGROUNDS TEMÁTICOS
// ========================================
const levelBackgrounds = {
  1: {
    name: "Terra 🌎",
    colors: ["#001d3d", "#003566"],
    stars: { count: 30, brightness: 0.3 }
  },
  2: {
    name: "Atmosfera Alta ☁️",
    colors: ["#240046", "#5a189a"],
    stars: { count: 50, brightness: 0.5 }
  },
  3: {
    name: "Órbita da Terra 🛰️",
    colors: ["#03071e", "#370617"],
    stars: { count: 80, brightness: 0.7 }
  },
  4: {
    name: "Lua 🌕",
    colors: ["#4a4e69", "#22223b"],
    stars: { count: 100, brightness: 0.8 }
  },
  5: {
    name: "Marte 🔴",
    colors: ["#66101f", "#b11d1d"],
    stars: { count: 120, brightness: 0.6 }
  },
  6: {
    name: "Cinturão de Asteroides ☄️",
    colors: ["#2d2a32", "#1b1b1e"],
    stars: { count: 150, brightness: 0.9 }
  },
  7: {
    name: "Júpiter 🟠",
    colors: ["#ff8c42", "#d00000"],
    stars: { count: 100, brightness: 0.7 }
  },
  8: {
    name: "Anéis de Saturno 🪐",
    colors: ["#efd672ff", "#f8dc6cff"], // Softer, muted yellow tones for a gentler appearance
    stars: { count: 80, brightness: 0.8 }
  },
  9: {
    name: "Espaço Profundo 🌌",
    colors: ["#2a0a4a", "#4c1b7b"],
    stars: { count: 200, brightness: 1.0 }
  },
  10: {
    name: "Horizonte de Eventos 💀🌀",
    colors: ["#000000", "#0a0a0a"],
    stars: { count: 250, brightness: 1.0 },
    blackHole: true
  }
};

// Sistema de estrelas
let stars = [];

function createStars() {
  const bg = levelBackgrounds[player.level] || levelBackgrounds[1];
  stars = [];
  
  for (let i = 0; i < bg.stars.count; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2,
      brightness: Math.random() * bg.stars.brightness,
      twinkle: Math.random() * 100
    });
  }
}

function updateStars() {
  for (let star of stars) {
    star.twinkle += 0.05;
    star.brightness = Math.abs(Math.sin(star.twinkle)) * levelBackgrounds[player.level].stars.brightness;
  }
}

function drawBackground() {
  const bg = levelBackgrounds[player.level] || levelBackgrounds[1];
  
  // Gradiente do fundo
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, bg.colors[0]);
  gradient.addColorStop(1, bg.colors[1]);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Estrelas
  for (let star of stars) {
    ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Efeito especial do Buraco Negro (nível 10)
  if (bg.blackHole) {
    drawBlackHoleEffect();
  }
}

function drawBlackHoleEffect() {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 4;
  const time = Date.now() * 0.001;
  
  // Espiral do buraco negro
  ctx.save();
  ctx.globalAlpha = 0.15;
  
  for (let i = 0; i < 3; i++) {
    const radius = 150 + i * 50;
    const rotation = time + i * 0.5;
    
    ctx.strokeStyle = `rgba(138, 43, 226, ${0.3 - i * 0.1})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
      const x = centerX + Math.cos(angle + rotation) * radius;
      const y = centerY + Math.sin(angle + rotation) * radius * 0.3;
      
      if (angle === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    
    ctx.stroke();
  }
  
  ctx.restore();
}

function drawStars() {
  for (let s of introStars) {
    s.opacity += s.speed * (Math.random() > 0.5 ? 1 : -1);
    s.opacity = Math.min(Math.max(s.opacity, 0.1), 1);

    ctx.globalAlpha = s.opacity;
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawIntroPlanets() {
  ctx.fillStyle = "#ffcc88"; 
  introPlanets[0].x += introPlanets[0].speed;
  ctx.beginPath();
  ctx.arc(introPlanets[0].x, introPlanets[0].y, introPlanets[0].size, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#99ccff"; 
  introPlanets[1].x += introPlanets[1].speed;
  ctx.beginPath();
  ctx.arc(introPlanets[1].x, introPlanets[1].y, introPlanets[1].size, 0, Math.PI * 2);
  ctx.fill();
}

function drawFloatingAstronaut() {
  introAstronautFloat += 0.4 * introAstronautDirection;
  if (introAstronautFloat > 10 || introAstronautFloat < -10) {
    introAstronautDirection *= -1;
  }

  ctx.drawImage(
    astronautImg,
    canvas.width / 2 - 50,
    canvas.height / 2 - 180 + introAstronautFloat,
    100,
    100
  );
}

function drawAnimatedIntroText() {
  // Ajusta tamanho da fonte baseado na largura da tela
  const fontSize = canvas.width < 400 ? 18 : (canvas.width < 500 ? 22 : 26);
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = "center";
  ctx.fillStyle = "white";

  // Animação palavra por palavra
  const words = [
    "Você", "consegue", "ajudar", "o",
    "astronauta", "Mateus", "a",
    "desbravar", "o", "espaço?!"
  ];
  
  // Incrementa contador de palavras
  introWordTimer++;
  if (introWordTimer > 15 && introWordIndex < words.length) {
    introWordIndex++;
    introWordTimer = 0;
  }

  // Fade in do texto
  introTextAlpha = Math.min(introTextAlpha + 0.015, 1);
  ctx.globalAlpha = introTextAlpha;

  // Efeito de brilho no texto
  ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
  ctx.shadowBlur = 10;

  // Monta o texto até a palavra atual
  const displayWords = words.slice(0, introWordIndex);
  const line1Words = displayWords.slice(0, 4).join(" ");
  const line2Words = displayWords.slice(4, 7).join(" ");
  const line3Words = displayWords.slice(7, 10).join(" ");
  
  const centerX = canvas.width / 2;
  const startY = canvas.height / 2 + 40;
  const lineHeight = fontSize + 8;

  if (line1Words) ctx.fillText(line1Words, centerX, startY);
  if (line2Words) ctx.fillText(line2Words, centerX, startY + lineHeight);
  if (line3Words) ctx.fillText(line3Words, centerX, startY + lineHeight * 2);

  // Emoji 🚀 pulsando (centralizado abaixo do texto)
  if (introWordIndex >= words.length) {
    rocketPulse += 0.08;
    const scale = 1 + Math.sin(rocketPulse) * 0.2;
    
    ctx.save();
    ctx.translate(centerX, startY + lineHeight * 3 + 10);
    ctx.scale(scale, scale);
    ctx.font = `${fontSize * 1.5}px Arial`;
    ctx.fillText("🚀", 0, 0);
    ctx.restore();
  }

  // Reseta sombra
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawGame() {
  if (screenShake > 0) {
    ctx.save();
    ctx.translate(
      Math.random() * screenShake - screenShake / 2,
      Math.random() * screenShake - screenShake / 2
    );
    screenShake *= 0.9;
  }

  drawBackground();
  updateStars();

  // Jogador - tamanho responsivo
  const playerDrawWidth = player.width + 30 * scale;
  const playerDrawHeight = player.height + 30 * scale;
  const playerOffsetX = 15 * scale;
  const playerOffsetY = 10 * scale;

  if (astronautLoaded && astronautImg.complete) {
    ctx.drawImage(
      astronautImg,
      player.x - playerOffsetX,
      player.y - playerOffsetY,
      playerDrawWidth,
      playerDrawHeight
    );
  } else {
    // Fallback escalado
    ctx.fillStyle = "white";
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    const headRadius = 18 * scale;
    ctx.beginPath();
    ctx.arc(player.x + player.width/2, player.y + 15 * scale, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = "lightgray";
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(player.x + player.width/2, player.y + 15 * scale, 12 * scale, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();
    
    ctx.fillStyle = "white";
    ctx.fillRect(player.x - 8 * scale, player.y + 25 * scale, 8 * scale, 15 * scale);
    ctx.fillRect(player.x + player.width, player.y + 25 * scale, 8 * scale, 15 * scale);
    ctx.fillRect(player.x + 10 * scale, player.y + player.height, 12 * scale, 10 * scale);
    ctx.fillRect(player.x + 28 * scale, player.y + player.height, 12 * scale, 10 * scale);
  }

  // Plataformas - só desenha as visíveis
  for (let plat of platforms) {
    if (plat.y < -responsiveConfig.drawMargin || plat.y > canvas.height + responsiveConfig.drawMargin) {
      continue;
    }

    if (plat.type === "ghost" && !plat.ghostVisible) {
      ctx.globalAlpha = 0.3;
    }

    let gradient = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.height);
    let baseColor, accentColor;

    if (plat.type === "fragile") {
      baseColor = "#FF6B6B";
      accentColor = "#CC5555";
    } else if (plat.type === "moving") {
      baseColor = "#FFDAB9";
      accentColor = "#E6C3A3";
    } else if (plat.type === "boost") {
      baseColor = "#87CEEB";
      accentColor = "#6BB6D6";
    } else if (plat.type === "cracked") {
      baseColor = "#D2B48C";
      accentColor = "#B8A076";
    } else if (plat.type === "spring_side") {
      baseColor = "#FFB6C1";
      accentColor = "#E69FB0";
    } else if (plat.type === "ghost") {
      baseColor = "#DDA0DD";
      accentColor = "#C78BC7";
    } else if (plat.type === "cloud") {
      baseColor = "#E6E6FA";
      accentColor = "#D1D1E0";
    } else {
      baseColor = "#90EE90";
      accentColor = "#7BCF7B";
    }

    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(1, accentColor);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = 5 * scale;
    ctx.shadowOffsetX = 2 * scale;
    ctx.shadowOffsetY = 2 * scale;
    ctx.beginPath();
    const radius = 5 * scale;
    ctx.roundRect(plat.x, plat.y, plat.width, plat.height, radius);
    ctx.fill();

    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Ícones escalados
    const fontSize = Math.floor(16 * scale);
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = "center";
    
    if (plat.type === "boost") {
      ctx.fillStyle = "white";
      ctx.fillText("↑", plat.x + plat.width / 2, plat.y + plat.height / 2 + 5);
    } else if (plat.type === "fragile") {
      ctx.fillStyle = "white";
      ctx.font = `${Math.floor(12 * scale)}px Arial`;
      ctx.fillText("!", plat.x + plat.width / 2, plat.y + plat.height / 2 + 4);
    } else if (plat.type === "cracked") {
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(plat.x + 5, plat.y + 5);
      ctx.lineTo(plat.x + plat.width - 5, plat.y + plat.height - 5);
      ctx.stroke();
    } else if (plat.type === "cloud") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.beginPath();
      ctx.arc(plat.x + plat.width * 0.25, plat.y + plat.height * 0.5, 8 * scale, 0, Math.PI * 2);
      ctx.arc(plat.x + plat.width * 0.5, plat.y + plat.height * 0.5, 10 * scale, 0, Math.PI * 2);
      ctx.arc(plat.x + plat.width * 0.75, plat.y + plat.height * 0.5, 8 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (plat.type === "spring_side") {
      ctx.fillStyle = "white";
      ctx.font = `${Math.floor(20 * scale)}px Arial`;
      ctx.fillText(plat.springDirection === "left" ? "◄" : "►", plat.x + plat.width / 2, plat.y + 12);
    }

    ctx.globalAlpha = 1.0;
  }

  // Itens
  for (let item of items) {
    if (item.y < -responsiveConfig.drawMargin || item.y > canvas.height + responsiveConfig.drawMargin) {
      continue;
    }
    
    if (item.type === "star") {
      ctx.fillStyle = "yellow";
      ctx.beginPath();
      ctx.arc(item.x + item.width / 2, item.y + item.height / 2, 10 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === "jetpack") {
      ctx.fillStyle = "cyan";
      ctx.fillRect(item.x, item.y, item.width, item.height);
    }
  }

  // HUD responsivo
  const hudFontSize = Math.floor(20 * Math.min(scale, 1));
  ctx.fillStyle = "white";
  ctx.font = `${hudFontSize}px Arial`;
  ctx.textAlign = "left";
  ctx.fillText("Pontuação: " + player.score, 10, 30);
  
  const config = getLevelConfig();
  ctx.fillStyle = config.color;
  ctx.font = `${Math.floor(18 * Math.min(scale, 1))}px Arial`;
  ctx.fillText("Nível " + player.level + ": " + config.name, 10, 55);
  
  if (player.level < 10) {
    const nextLevel = (player.level * 10000);
    const remaining = nextLevel - player.score;
    ctx.fillStyle = "#888";
    ctx.font = `${Math.floor(14 * Math.min(scale, 1))}px Arial`;
    ctx.fillText("Próximo: " + remaining + " pts", 10, 75);
  } else {
    ctx.fillStyle = "#ff0000";
    ctx.font = `${Math.floor(14 * Math.min(scale, 1))}px Arial`;
    ctx.fillText("NÍVEL MÁXIMO! 💀", 10, 75);
  }

  if (screenShake > 0) ctx.restore();
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === "start") {
    drawStartScreen();
  } else if (gameState === "playing") {
    movePlayer();
    updatePlatforms();
    drawGame();
  } else if (gameState === "gameover") {
    drawGameOverScreen();
  }

  requestAnimationFrame(gameLoop);
}

let keys = {};

window.addEventListener("keydown", e => {
  keys[e.key] = true;
  
  // Enter no modal de nome
  if (e.key === "Enter" && document.getElementById("modalNome").style.display === "flex") {
    confirmarNome();
    return;
  }
  
  // Enter no modal de PIX
  if (e.key === "Enter" && document.getElementById("modalPix").style.display === "flex") {
    confirmarPix();
    return;
  }
  
  if ((gameState === "start" || gameState === "gameover") && (e.key === "Enter" || e.key === " ")) {
    if (gameReady) {
      if (!playerName) {
        mostrarModalNome();
      } else {
        createInitialPlatforms();
        gameState = "playing";
      }
    }
  }
  
  // ATALHOS PARA TESTAR NÍVEIS (pressione 0-9 na tela inicial)
  if ((gameState === "start" || gameState === "gameover") && gameReady) {
    const levelKeys = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const keyIndex = levelKeys.indexOf(e.key);
    
    if (keyIndex >= 0) {
      if (!playerName) {
        mostrarModalNome();
        return;
      }
      const targetLevel = keyIndex === 0 ? 10 : keyIndex;
      createInitialPlatforms();
      player.score = (targetLevel - 1) * 10000;
      player.level = targetLevel;
      gameState = "playing";
    }
  }
});
window.addEventListener("keyup", e => keys[e.key] = false);

// Touch no canvas (iniciar jogo)
canvas.addEventListener("touchstart", function(e) {
  e.preventDefault();
  
  if (gameState === "start" || gameState === "gameover") {
    if (gameReady) {
      if (!playerName) {
        mostrarModalNome();
      } else {
        createInitialPlatforms();
        gameState = "playing";
      }
    }
    return;
  }
}, { passive: false });

// Click no canvas (desktop)
canvas.addEventListener("click", function() {
  if ((gameState === "start" || gameState === "gameover") && gameReady) {
    if (!playerName) {
      mostrarModalNome();
    } else {
      createInitialPlatforms();
      gameState = "playing";
    }
  }
});

// Botões de controle mobile
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

// Previne comportamento padrão dos botões
[leftBtn, rightBtn].forEach(btn => {
  btn.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  btn.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
  btn.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
});

// Touch events para os botões
leftBtn.addEventListener("touchstart", (e) => {
  e.preventDefault();
  keys["ArrowLeft"] = true;
}, { passive: false });

leftBtn.addEventListener("touchend", (e) => {
  e.preventDefault();
  keys["ArrowLeft"] = false;
}, { passive: false });

rightBtn.addEventListener("touchstart", (e) => {
  e.preventDefault();
  keys["ArrowRight"] = true;
}, { passive: false });

rightBtn.addEventListener("touchend", (e) => {
  e.preventDefault();
  keys["ArrowRight"] = false;
}, { passive: false });

// Mouse events para desktop
leftBtn.addEventListener("mousedown", () => keys["ArrowLeft"] = true);
leftBtn.addEventListener("mouseup", () => keys["ArrowLeft"] = false);
leftBtn.addEventListener("mouseleave", () => keys["ArrowLeft"] = false);

rightBtn.addEventListener("mousedown", () => keys["ArrowRight"] = true);
rightBtn.addEventListener("mouseup", () => keys["ArrowRight"] = false);
rightBtn.addEventListener("mouseleave", () => keys["ArrowRight"] = false);

// Atualiza canvas ao redimensionar
window.addEventListener("resize", () => {
  resizeCanvas();
});

createInitialPlatforms();
gameLoop();