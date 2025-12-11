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

let platforms = [];
const platformWidth = 80;
const platformHeight = 15;

let screenShake = 0;
let items = [];

// Configuração responsiva do canvas
function resizeCanvas() {
  const maxWidth = 500;
  const width = Math.min(window.innerWidth, maxWidth);
  const height = window.innerHeight;
  
  canvas.width = width;
  canvas.height = height;
  
  // Reposiciona o jogador se necessário
  if (gameState === "start") {
    player.x = canvas.width / 2 - 25;
  }
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
  
  const configs = {
    1: {
      name: "Iniciante 🌱",
      platforms: ["normal", "moving"],
      chanceMoving: 0.15,
      maxSpacing: 115,
      playerSpeed: 6,
      platformSpeed: 1.5,
      gravity: 0.33,
      color: "#00ff00"
    },
    2: {
      name: "Aprendiz 📚",
      platforms: ["normal", "moving", "fragile"],
      chanceMoving: 0.2,
      chanceFragile: 0.1,
      maxSpacing: 120,
      playerSpeed: 6.2,
      platformSpeed: 1.6,
      gravity: 0.34,
      color: "#33ff33"
    },
    3: {
      name: "Aventureiro ⚔️",
      platforms: ["normal", "moving", "fragile", "boost"],
      chanceMoving: 0.22,
      chanceFragile: 0.15,
      chanceBoost: 0.08,
      maxSpacing: 125,
      playerSpeed: 6.5,
      platformSpeed: 1.7,
      gravity: 0.35,
      color: "#00ffff"
    },
    4: {
      name: "Explorador 🗺️",
      platforms: ["normal", "moving", "fragile", "boost", "spring_side"],
      chanceMoving: 0.25,
      chanceFragile: 0.18,
      chanceBoost: 0.08,
      chanceSpringSide: 0.1,
      maxSpacing: 130,
      playerSpeed: 6.8,
      platformSpeed: 1.8,
      gravity: 0.36,
      color: "#ffff00"
    },
    5: {
      name: "Desafiador 🔥",
      platforms: ["normal", "moving", "fragile", "boost", "spring_side", "ghost"],
      chanceMoving: 0.28,
      chanceFragile: 0.2,
      chanceBoost: 0.08,
      chanceSpringSide: 0.1,
      chanceGhost: 0.12,
      maxSpacing: 135,
      playerSpeed: 7.1,
      platformSpeed: 1.9,
      gravity: 0.37,
      color: "#ff9900"
    },
    6: {
      name: "Veterano 💪",
      platforms: ["normal", "moving", "fragile", "boost", "spring_side", "ghost", "cloud"],
      chanceMoving: 0.3,
      chanceFragile: 0.22,
      chanceBoost: 0.07,
      chanceSpringSide: 0.1,
      chanceGhost: 0.13,
      chanceCloud: 0.12,
      maxSpacing: 140,
      playerSpeed: 7.5,
      platformSpeed: 2.0,
      gravity: 0.38,
      color: "#ff00ff"
    },
    7: {
      name: "Mestre 🎯",
      platforms: ["normal", "moving", "fragile", "boost", "spring_side", "ghost", "cloud", "cracked"],
      chanceMoving: 0.32,
      chanceFragile: 0.24,
      chanceBoost: 0.07,
      chanceSpringSide: 0.1,
      chanceGhost: 0.14,
      chanceCloud: 0.12,
      chanceCracked: 0.1,
      maxSpacing: 145,
      playerSpeed: 7.8,
      platformSpeed: 2.1,
      gravity: 0.39,
      color: "#ff6600"
    },
    8: {
      name: "Lendário ⭐",
      platforms: ["moving", "fragile", "boost", "spring_side", "ghost", "cloud", "cracked"],
      chanceMoving: 0.33,
      chanceFragile: 0.26,
      chanceBoost: 0.04,
      chanceSpringSide: 0.1,
      chanceGhost: 0.15,
      chanceCloud: 0.13,
      chanceCracked: 0.12,
      maxSpacing: 155,
      playerSpeed: 8.5,
      platformSpeed: 2.2,
      gravity: 0.45,
      color: "#9933ff"
    },
    9: {
      name: "Épico 💎",
      platforms: ["moving", "fragile", "boost", "spring_side", "ghost", "cloud", "cracked"],
      chanceMoving: 0.35,
      chanceFragile: 0.28,
      chanceBoost: 0.03,
      chanceSpringSide: 0.08,
      chanceGhost: 0.17,
      chanceCloud: 0.14,
      chanceCracked: 0.14,
      maxSpacing: 160,
      playerSpeed: 9.0,
      platformSpeed: 2.4,
      gravity: 0.54,
      color: "#ff0099"
    },
    10: {
      name: "IMPOSSÍVEL 💀",
      platforms: ["moving", "fragile", "spring_side", "ghost", "cloud", "cracked"],
      chanceMoving: 0.38,
      chanceFragile: 0.3,
      chanceBoost: 0.02,
      chanceSpringSide: 0.07,
      chanceGhost: 0.2,
      chanceCloud: 0.15,
      chanceCracked: 0.15,
      maxSpacing: 165,
      playerSpeed: 10.0,
      platformSpeed: 2.6,
      gravity: 0.55,
      color: "#ff0000"
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
  player.x = canvas.width / 2 - 25;
  player.y = canvas.height - 150;
  player.dy = 0;
  player.score = 0;
  player.jetpack = false;
  player.level = 1;

  platforms.push({
    x: player.x - 15,
    y: player.y + player.height,
    width: platformWidth,
    height: platformHeight,
    type: "normal",
    dx: 0,
    disappear: false
  });

  for (let i = 1; i < 6; i++) {
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
      x: canvas.width / 2 - platformWidth / 2,
      y: canvas.height / 2,
      width: platformWidth,
      height: platformHeight,
      type: "normal",
      dx: 0,
      disappear: false
    });
    return;
  }

  const lastPlatform = platforms[platforms.length - 1];
  const config = getLevelConfig();
  
  const verticalGap = config.maxSpacing;
  const horizontalRange = 60 + Math.random() * 200;
  const direction = Math.random() > 0.5 ? 1 : -1;
  const targetX = lastPlatform.x + (direction * horizontalRange);
  const finalX = Math.max(10, Math.min(canvas.width - platformWidth - 10, targetX));

  // Determinar tipo de plataforma baseado no nível
  let type = "normal";
  let dx = 0;
  let disappear = false;
  let ghostVisible = true;
  let ghostTimer = 0;
  let springDirection = null;

  const rand = Math.random();
  let cumulative = 0;

  // Fragile
  if (config.chanceFragile && rand < (cumulative += config.chanceFragile)) {
    type = "fragile";
    disappear = true;
  }
  // Moving
  else if (config.chanceMoving && rand < (cumulative += config.chanceMoving)) {
    type = "moving";
    dx = (Math.random() < 0.5 ? 1 : -1) * config.platformSpeed;
  }
  // Boost (Super Jump)
  else if (config.chanceBoost && rand < (cumulative += config.chanceBoost)) {
    type = "boost";
  }
  // Spring Side (Mola Lateral) - NOVO
  else if (config.chanceSpringSide && rand < (cumulative += config.chanceSpringSide)) {
    type = "spring_side";
    springDirection = Math.random() < 0.5 ? "left" : "right";
  }
  // Ghost (Fantasma) - NOVO
  else if (config.chanceGhost && rand < (cumulative += config.chanceGhost)) {
    type = "ghost";
    ghostVisible = true;
    ghostTimer = 0;
  }
  // Cloud (Nuvem) - NOVO
  else if (config.chanceCloud && rand < (cumulative += config.chanceCloud)) {
    type = "cloud";
  }
  // Cracked (Rachada)
  else if (config.chanceCracked && rand < (cumulative += config.chanceCracked)) {
    type = "cracked";
  }
  // Normal
  else {
    type = "normal";
  }

  const plat = {
    x: finalX,
    y: lastPlatform.y - verticalGap,
    width: platformWidth,
    height: platformHeight,
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

    // Remove plataformas fora da tela
    if (plat.y > canvas.height + 100) {
      platforms.splice(i, 1);
    }
  }

  // Adiciona novas plataformas
  if (platforms.length > 0) {
    const highestPlatform = Math.min(...platforms.map(p => p.y));
    while (highestPlatform > -300 && platforms.length < 8) {
      addPlatform();
    }
  } else {
    for (let i = 0; i < 10; i++) {
      addPlatform();
    }
  }

  // Atualiza itens
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].y > canvas.height) {
      items.splice(i, 1);
    }
  }
}

function movePlayer() {
  const config = getLevelConfig();
  
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
  if (player.y < canvas.height / 2) {
    let offset = (canvas.height / 2 - player.y);
    player.y = canvas.height / 2;
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

  // Game over
  if (player.y > canvas.height) {
    gameState = "gameover";
  }
}

function drawStartScreen() {
  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  
  if (!gameReady) {
    // Tela de carregamento
    ctx.fillText("⏳ Carregando...", canvas.width / 2, canvas.height / 2);
    return;
  }
  
  ctx.fillText("🚀 Astronauta Jump 🚀", canvas.width / 2, canvas.height / 2 - 40);
  ctx.font = "20px Arial";
  ctx.fillText("Clique ou toque para começar", canvas.width / 2, canvas.height / 2);
  ctx.font = "16px Arial";
  ctx.fillStyle = "#888";
  ctx.fillText("10 níveis • Suba a cada 10.000 pontos!", canvas.width / 2, canvas.height / 2 + 40);
  
  // Dica de teste
  ctx.font = "14px Arial";
  ctx.fillStyle = "#666";
  ctx.fillText("Pressione 1-9 para testar níveis | 0 = nível 10", canvas.width / 2, canvas.height / 2 + 70);
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

function drawGame() {
  // Aplicar screen shake
  if (screenShake > 0) {
    ctx.save();
    ctx.translate(
      Math.random() * screenShake - screenShake / 2,
      Math.random() * screenShake - screenShake / 2
    );
    screenShake *= 0.9;
  }

  ctx.clearRect(-50, -50, canvas.width + 100, canvas.height + 100);

  // Jogador - com fallback se imagem não carregar
  if (astronautLoaded && astronautImg.complete) {
    ctx.drawImage(
      astronautImg,
      player.x - 15,
      player.y - 10,
      player.width + 30,
      player.height + 30
    );
  } else {
    // FALLBACK: Desenho simples
    // Corpo
    ctx.fillStyle = "white";
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Capacete
    ctx.beginPath();
    ctx.arc(player.x + player.width/2, player.y + 15, 18, 0, Math.PI * 2);
    ctx.fillStyle = "lightgray";
    ctx.fill();
    
    // Visor
    ctx.beginPath();
    ctx.arc(player.x + player.width/2, player.y + 15, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();
    
    // Braços
    ctx.fillStyle = "white";
    ctx.fillRect(player.x - 8, player.y + 25, 8, 15);
    ctx.fillRect(player.x + player.width, player.y + 25, 8, 15);
    
    // Pernas
    ctx.fillRect(player.x + 10, player.y + player.height, 12, 10);
    ctx.fillRect(player.x + 28, player.y + player.height, 12, 10);
  }

  // Plataformas
  for (let plat of platforms) {
    // Plataforma fantasma pisca
    if (plat.type === "ghost" && !plat.ghostVisible) {
      ctx.globalAlpha = 0.3;
    }

    if (plat.type === "fragile") ctx.fillStyle = "red";
    else if (plat.type === "moving") ctx.fillStyle = "orange";
    else if (plat.type === "boost") ctx.fillStyle = "cyan";
    else if (plat.type === "cracked") ctx.fillStyle = "#A0522D";
    else if (plat.type === "spring_side") {
      ctx.fillStyle = "#FF1493"; // Pink
    }
    else if (plat.type === "ghost") ctx.fillStyle = "#9370DB"; // Roxo
    else if (plat.type === "cloud") ctx.fillStyle = "#F0F8FF"; // Nuvem branca
    else ctx.fillStyle = "lime";

    ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

    // Indicador de direção para mola lateral
    if (plat.type === "spring_side") {
      ctx.fillStyle = "white";
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillText(plat.springDirection === "left" ? "◄" : "►", plat.x + plat.width / 2, plat.y + 12);
    }

    ctx.globalAlpha = 1.0;
  }

  // Itens
  for (let item of items) {
    if (item.type === "star") {
      ctx.fillStyle = "yellow";
      ctx.beginPath();
      ctx.arc(item.x + item.width / 2, item.y + item.height / 2, 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === "jetpack") {
      ctx.fillStyle = "cyan";
      ctx.fillRect(item.x, item.y, item.width, item.height);
    }
  }

  // HUD
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Pontuação: " + player.score, 10, 30);
  
  // Nível com cor
  const config = getLevelConfig();
  ctx.fillStyle = config.color;
  ctx.font = "18px Arial";
  ctx.fillText("Nível " + player.level + ": " + config.name, 10, 55);
  
  // Próximo nível
  if (player.level < 10) {
    const nextLevel = (player.level * 10000);
    const remaining = nextLevel - player.score;
    ctx.fillStyle = "#888";
    ctx.font = "14px Arial";
    ctx.fillText("Próximo: " + remaining + " pts", 10, 75);
  } else {
    ctx.fillStyle = "#ff0000";
    ctx.font = "14px Arial";
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
  if ((gameState === "start" || gameState === "gameover") && (e.key === "Enter" || e.key === " ")) {
    if (gameReady) {
      createInitialPlatforms();
      gameState = "playing";
    }
  }
  
  // ATALHOS PARA TESTAR NÍVEIS (pressione 0-9 na tela inicial)
  if ((gameState === "start" || gameState === "gameover") && gameReady) {
    const levelKeys = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const keyIndex = levelKeys.indexOf(e.key);
    
    if (keyIndex >= 0) {
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
  e.preventDefault(); // Previne scroll
  
  if (gameState === "start" || gameState === "gameover") {
    if (gameReady) {
      createInitialPlatforms();
      gameState = "playing";
    }
    return;
  }
}, { passive: false });

// Click no canvas (desktop)
canvas.addEventListener("click", function() {
  if ((gameState === "start" || gameState === "gameover") && gameReady) {
    createInitialPlatforms();
    gameState = "playing";
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