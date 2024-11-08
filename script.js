const audioElement = document.getElementById('gameAudio');
let isPlaying = false;

const zombieImage = document.getElementById('zombieImage');
const helmetZombieImage = document.getElementById('helmetZombieImage');
const bucketZombieImage = document.getElementById('bucketZombieImage');

function toggleMusic() {
  if (!isPlaying) {
    audioElement.volume = 0.3; // Set initial volume
    audioElement.play()
      .then(() => {
        isPlaying = true;
        document.querySelector('.audio-controls button').textContent = 'Mute Music';
      })
      .catch(err => {
        console.log('Playback failed:', err);
      });
  } else {
    audioElement.pause();
    isPlaying = false;
    document.querySelector('.audio-controls button').textContent = 'Play Music';
  }
}

function tryPlayAudio() {
  if (!isPlaying) {
    toggleMusic();
  }
}

function updateVolume(value) {
  audioElement.volume = value;
}

// Game state variables
const TOTAL_WAVES = 5;
let currentWave = 1;
let zombiesInWave = 10;
let zombiesSpawned = 0;
let zombiesKilled = 0;

// Canvas and grid setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const ROWS = 5;
const COLS = 9;
let GRID_SIZE; // Will be calculated in resizeCanvas

let sunCount = 50;
let selectedPlant = null;
let plants = [];
let zombies = [];
let projectiles = [];
let gameLoop;
let spawnInterval;
let gameSpeed = 1;

// Add at the beginning with your other variables
const peashooterImage = new Image();
peashooterImage.src = 'peashooter.svg';

//ice-peashooter.svg
const icePeashooterImage = new Image();
icePeashooterImage.src = 'ice-peashooter.svg';

//sunflowerImage
const sunflowerImage = new Image();
sunflowerImage.src = 'sunflower.svg';

//repeater.svg
const repeaterImage = new Image();
repeaterImage.src = 'repeater.svg';

const plantTypes = {
  Peashooter: {
    cost: 100,
    color: 'green',
    health: 100,
    damage: 20,
    fireRate: 1500,
    range: Infinity
  },
  Sunflower: {
    cost: 50,
    color: 'yellow',
    health: 80,
    produces: 25,
    productionRate: 5000
  },
  WallNut: {
    cost: 50,
    color: 'brown',
    health: 400
  },
  SnowPea: {
    cost: 175,
    color: 'lightblue',
    health: 100,
    damage: 15,
    fireRate: 1500,
    range: Infinity,
    slow: true
  },
  Chomper: {
    cost: 150,
    color: 'purple',
    health: 150,
    damage: 200,
    range: 1,
    eatTime: 3000
  },
  Repeater: {
    cost: 200,
    color: 'darkgreen',
    health: 100,
    damage: 20,
    fireRate: 1500,
    shots: 2,
    range: Infinity
  },
  Cactus: {
    cost: 125,
    color: 'green',
    health: 120,
    damage: 30,
    fireRate: 2000,
    range: Infinity
  },
  TallNut: {
    cost: 125,
    color: 'darkbrown',
    health: 800
  },
  Spikeweed: {
    cost: 100,
    color: 'gray',
    health: 100,
    damage: 10,
    fireRate: 1000,
    range: 1
  },
  Starfruit: {
    cost: 150,
    color: 'yellow',
    health: 100,
    damage: 15,
    fireRate: 2000,
    range: Infinity,
    multiDirection: true
  }
};

// NEW: Resize handling
function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  GRID_SIZE = Math.min(canvas.width / COLS, canvas.height / ROWS);

  // Update existing elements positions if any exist
  if (plants) {
    plants.forEach(plant => {
      plant.screenX = plant.x * GRID_SIZE;
      plant.screenY = plant.y * GRID_SIZE;
    });
  }

  if (zombies) {
    zombies.forEach(zombie => {
      zombie.screenY = zombie.y * GRID_SIZE;
    });
  }
}

// NEW: Add resize listener
window.addEventListener('resize', resizeCanvas);
// NEW: Initial resize
resizeCanvas();

// Keep your existing plant buttons initialization
const plantButtonsDiv = document.getElementById('plantButtons');
Object.entries(plantTypes).forEach(([name, data]) => {
  const button = document.createElement('button');
  button.textContent = `${name} (${data.cost})`;
  button.className = 'plant-button';
  button.onclick = () => selectPlant(name, button);
  plantButtonsDiv.appendChild(button);
});

function updateProgress() {
  const progress = (zombiesKilled / (zombiesInWave * TOTAL_WAVES)) * 100;
  document.getElementById('progressBar').style.width = `${progress}%`;
  document.getElementById('waveCounter').textContent = currentWave;
}

function selectPlant(plantName, buttonElement) {
  document.querySelectorAll('.plant-button').forEach(btn => btn.classList.remove('selected'));
  if (selectedPlant === plantName) {
    selectedPlant = null;
  } else {
    selectedPlant = plantName;
    buttonElement.classList.add('selected');
  }
}

function updateSunCount() {
  document.getElementById('sunCount').textContent = sunCount;
}

function drawGrid() {
  ctx.strokeStyle = '#ccc';
  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * GRID_SIZE, 0);
    ctx.lineTo(i * GRID_SIZE, ROWS * GRID_SIZE);
    ctx.stroke();
  }
  for (let i = 0; i <= ROWS; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * GRID_SIZE);
    ctx.lineTo(COLS * GRID_SIZE, i * GRID_SIZE);
    ctx.stroke();
  }
}

function drawPlants() {
  plants.forEach(plant => {
    if (plant.type === 'Peashooter') {
      // Save the current context state
      ctx.save();

      // Move to the center of the grid cell
      ctx.translate(
        plant.x * GRID_SIZE + GRID_SIZE / 2,
        plant.y * GRID_SIZE + GRID_SIZE / 2
      );

      // Draw the peashooter
      const size = GRID_SIZE * 0.8;
      ctx.drawImage(
        peashooterImage,
        -size / 2, // Center the image
        -size / 2,
        size,
        size
      );

      // Restore the context state
      ctx.restore();
    }
    else if (plant.type === 'Sunflower') {
      // Save the current context state
      ctx.save();

      // Move to the center of the grid cell
      ctx.translate(
        plant.x * GRID_SIZE + GRID_SIZE / 2,
        plant.y * GRID_SIZE + GRID_SIZE / 2
      );

      // Draw the sunflower
      const size = GRID_SIZE * 0.8;
      ctx.drawImage(
        sunflowerImage,
        -size / 2, // Center the image
        -size / 2,
        size,
        size
      );

      // Restore the context state
      ctx.restore();
    }
    else if (plant.type === 'SnowPea') {
      // Save the current context state
      ctx.save();

      // Move to the center of the grid cell
      ctx.translate(
        plant.x * GRID_SIZE + GRID_SIZE / 2,
        plant.y * GRID_SIZE + GRID_SIZE / 2
      );

      // Draw the ice peashooter
      const size = GRID_SIZE * 0.8;
      ctx.drawImage(
        icePeashooterImage,
        -size / 2, // Center the image
        -size / 2,
        size,
        size
      );

      // Restore the context state
      ctx.restore();
    }
    else if (plant.type === 'Repeater') {
      // Save the current context state
      ctx.save();

      // Move to the center of the grid cell
      ctx.translate(
        plant.x * GRID_SIZE + GRID_SIZE / 2,
        plant.y * GRID_SIZE + GRID_SIZE / 2
      );

      // Draw the repeater
      const size = GRID_SIZE * 0.8;
      ctx.drawImage(
        repeaterImage,
        -size / 2, // Center the image
        -size / 2,
        size,
        size
      );

      // Restore the context state
      ctx.restore();
    }
    else {
      // Draw other plants as before
      ctx.fillStyle = plantTypes[plant.type].color;
      ctx.fillRect(
        plant.x * GRID_SIZE + GRID_SIZE * 0.1,
        plant.y * GRID_SIZE + GRID_SIZE * 0.1,
        GRID_SIZE * 0.8,
        GRID_SIZE * 0.8
      );
    }

    // Health bar
    const healthPercent = plant.health / plantTypes[plant.type].health;
    ctx.fillStyle = `rgb(${255 * (1 - healthPercent)}, ${255 * healthPercent}, 0)`;
    ctx.fillRect(
      plant.x * GRID_SIZE + GRID_SIZE * 0.1,
      plant.y * GRID_SIZE + GRID_SIZE * 0.05,
      GRID_SIZE * 0.8 * healthPercent,
      GRID_SIZE * 0.05
    );
  });
}

function drawZombies() {
  zombies.forEach(zombie => {
    let image;
    switch (zombie.type) {
      case 'helmet':
        image = helmetZombieImage;
        break;
      case 'bucket':
        image = bucketZombieImage;
        break;
      default:
        image = zombieImage;
    }

    ctx.drawImage(
      image,
      zombie.x,
      zombie.y * GRID_SIZE + GRID_SIZE * 0.1,
      GRID_SIZE * 0.8,
      GRID_SIZE * 0.8
    );

    // Health bar
    const healthPercent = zombie.health / zombie.maxHealth;
    ctx.fillStyle = `rgb(${255 * (1 - healthPercent)}, ${255 * healthPercent}, 0)`;
    ctx.fillRect(
      zombie.x,
      zombie.y * GRID_SIZE + GRID_SIZE * 0.05,
      GRID_SIZE * 0.8 * healthPercent,
      GRID_SIZE * 0.05
    );
  });
}

function drawProjectiles() {
  projectiles.forEach(proj => {
    //color the projectile as per the plant color
    ctx.fillStyle = plantTypes[proj.type].color;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y * GRID_SIZE + GRID_SIZE / 2, GRID_SIZE * 0.05, 0, Math.PI * 2);
    ctx.fill();
  });
}

// MODIFIED: Update click handler
canvas.onclick = (e) => {
  if (!selectedPlant) return;

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / GRID_SIZE);
  const y = Math.floor((e.clientY - rect.top) / GRID_SIZE);

  if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
    const cost = plantTypes[selectedPlant].cost;
    if (sunCount >= cost && !plants.some(p => p.x === x && p.y === y)) {
      sunCount -= cost;
      const plant = {
        type: selectedPlant,
        x: x,
        y: y,
        health: plantTypes[selectedPlant].health,
        lastShot: 0,
        lastProduce: 0,
        eating: false,
        id: Date.now() + Math.random() // Unique ID for animation tracking
      };
      plants.push(plant);
      // plantAnimations.set(plant.id, { isShooting: false });
      updateSunCount();
    }
  }
};

// MODIFIED: Update zombie spawning
function spawnZombie() {
  if (zombiesSpawned >= zombiesInWave) {
    return;
  }
  const row = Math.floor(Math.random() * ROWS);
  const health = 100 + (currentWave - 1) * 25;
  const speed = (0.5 + (currentWave - 1) * 0.1) * (GRID_SIZE / 80); // Scale speed based on grid size

  let type;
  if (currentWave === 1) {
    type = Math.random() < 0.5 ? 'plain' : 'helmet';
  } else {
    const rand = Math.random();
    if (rand < 0.33) {
      type = 'plain';
    } else if (rand < 0.66) {
      type = 'helmet';
    } else {
      type = 'bucket';
    }
  }

  let maxHealth = health;
  if (type === 'helmet') {
    maxHealth += 50;
  } else if (type === 'bucket') {
    maxHealth += 100;
  }

  zombies.push({
    x: canvas.width,
    y: row,
    health: maxHealth,
    maxHealth: maxHealth,
    speed: speed,
    slowed: false,
    type: type
  });

  zombiesSpawned++;
}

function checkWaveProgress() {
  if (zombiesKilled >= zombiesInWave && zombies.length === 0) {
    if (currentWave < TOTAL_WAVES) {
      currentWave++;
      zombiesInWave += 5; // More zombies each wave
      zombiesSpawned = 0;
      clearInterval(spawnInterval);
      spawnInterval = setInterval(spawnZombie, Math.max(5000 - (currentWave - 1) * 500, 2000) / gameSpeed); // Faster spawning each wave
    } else if (currentWave === TOTAL_WAVES && zombiesKilled >= zombiesInWave * TOTAL_WAVES) {
      // Victory!
      clearInterval(gameLoop);
      clearInterval(spawnInterval);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '48px Arial';
      ctx.fillText('VICTORY!', canvas.width / 2 - 100, canvas.height / 2);
      isPlaying = false; // Stop the music
    }
  }
}

function updateProjectiles() {
  projectiles.forEach(proj => {
    proj.x += 5 * gameSpeed;

    // Check collision with zombies
    zombies.forEach(zombie => {
      if (Math.abs(proj.y - zombie.y) < 0.5 &&
        Math.abs(proj.x - (zombie.x + GRID_SIZE / 2)) < GRID_SIZE / 2) {
        zombie.health -= proj.damage;
        if (proj.slow) zombie.slowed = true;
        proj.remove = true;
      }
    });
  });

  projectiles = projectiles.filter(proj => !proj.remove && proj.x < canvas.width);
}

function updatePlants() {
  const now = Date.now();
  plants.forEach(plant => {
    const type = plantTypes[plant.type];

    if (type.produces && now - plant.lastProduce >= type.productionRate / gameSpeed) {
      sunCount += type.produces;
      plant.lastProduce = now;
      updateSunCount();
    }

    if (type.damage && !plant.eating) {
      // Check for zombies in range
      const zombie = zombies.find(z =>
        Math.abs(z.y - plant.y) < 0.5 &&
        z.x > plant.x * GRID_SIZE &&
        z.x < plant.x * GRID_SIZE + type.range * GRID_SIZE
      );

      if (zombie && now - plant.lastShot >= type.fireRate / gameSpeed) {
        if (type.range > 1) {
          // Ranged plant
          const shots = type.shots || 1;
          for (let i = 0; i < shots; i++) {
            projectiles.push({
              x: (plant.x + 1) * GRID_SIZE,
              y: plant.y,
              damage: type.damage,
              slow: type.slow,
              type: plant.type
            });
          }

          // Add animation trigger for Peashooter
          // if (plant.type === 'Peashooter') {
          //   const animation = plantAnimations.get(plant.id);
          //   animation.isShooting = true;
          //   setTimeout(() => {
          //     animation.isShooting = false;
          //   }, 100); // Reset animation after 100ms
          // }
        }

        if (type.range === 1) {
          // Melee plant
          zombie.health -= type.damage;
          if (type.eatTime) {
            plant.eating = true;
            setTimeout(() => {
              plant.eating = false;
            }, type.eatTime / gameSpeed);
          }
        } else {
          // Ranged plant
          const shots = type.shots || 1;
          for (let i = 0; i < shots; i++) {
            projectiles.push({
              x: (plant.x + 1) * GRID_SIZE,
              y: plant.y,
              damage: type.damage,
              slow: type.slow,
              type: plant.type
            });
          }
        }
        plant.lastShot = now;
      }
    }
  });
}

function updateZombies() {
  zombies.forEach(zombie => {
    zombie.x -= (zombie.slowed ? zombie.speed / 2 : zombie.speed) * gameSpeed;

    plants.forEach(plant => {
      if (Math.abs(zombie.y - plant.y) < 0.5 &&
        Math.abs(zombie.x - (plant.x * GRID_SIZE)) < GRID_SIZE / 2) {
        plant.health -= 0.5 * (1 + (currentWave - 1) * 0.2); // Zombies do more damage each wave
      }
    });
  });

  // Count killed zombies
  const previousLength = zombies.length;
  zombies = zombies.filter(zombie => zombie.health > 0 && zombie.x > -GRID_SIZE);
  zombiesKilled += previousLength - zombies.length;

  plants = plants.filter(plant => plant.health > 0);

  updateProgress();
  checkWaveProgress();

  if (zombies.some(zombie => zombie.x <= 0)) {
    clearInterval(gameLoop);
    clearInterval(spawnInterval);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.fillText('GAME OVER', canvas.width / 2 - 100, canvas.height / 2);
    showRestartButton();
    isPlaying = false;
  }
}

function gameUpdate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  updatePlants();
  updateZombies();
  updateProjectiles();
  drawPlants();
  drawZombies();
  drawProjectiles();
}

function toggleSpeed() {
  gameSpeed = gameSpeed === 1 ? 2 : 1;
  clearInterval(gameLoop);
  clearInterval(spawnInterval);
  gameLoop = setInterval(gameUpdate, 1000 / 30 / gameSpeed);
  spawnInterval = setInterval(spawnZombie, 5000 / gameSpeed);
}

function restartGame() {
  currentWave = 1;
  zombiesInWave = 10;
  zombiesSpawned = 0;
  zombiesKilled = 0;
  sunCount = 50;
  selectedPlant = null;
  plants = [];
  zombies = [];
  projectiles = [];
  gameSpeed = 1;

  document.getElementById('sunCount').textContent = sunCount;
  document.getElementById('waveCounter').textContent = currentWave;
  document.getElementById('progressBar').style.width = '0%';

  clearInterval(gameLoop);
  clearInterval(spawnInterval);
  gameLoop = setInterval(gameUpdate, 1000 / 30);
  spawnInterval = setInterval(spawnZombie, 5000);

  // plantAnimations.clear(); // Clear animation states

  const restartButton = document.getElementById('restartButton');
  if (restartButton) {
    restartButton.remove();
  }
}

function showRestartButton() {
  const restartButton = document.createElement('button');
  restartButton.id = 'restartButton';
  restartButton.textContent = 'Restart';
  restartButton.style.position = 'absolute';
  restartButton.style.left = '50%';
  restartButton.style.top = '50%';
  restartButton.style.transform = 'translate(-50%, -50%)';
  restartButton.style.padding = '10px 20px';
  restartButton.style.fontSize = '24px';
  restartButton.onclick = restartGame;
  document.body.appendChild(restartButton);
}

// Start game
gameLoop = setInterval(gameUpdate, 1000 / 30);
spawnInterval = setInterval(spawnZombie, 5000);

document.addEventListener('click', tryPlayAudio, { once: true });
document.addEventListener('keypress', tryPlayAudio, { once: true });