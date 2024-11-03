const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

const plants = [];
const zombies = [];
const bullets = [];
let gameOver = false;
let progress = 0;
let difficulty = 1;

const plantImages = [];
for (let i = 1; i <= 10; i++) {
    const img = new Image();
    img.src = `assets/plant${i}.png`;
    plantImages.push(img);
}

function gameLoop() {
    if (gameOver) {
        showGameOverScreen();
        return;
    }

    update();
    render();

    requestAnimationFrame(gameLoop);
}

function update() {
    handlePlayerInput();
    handleGameLogic();
    handleGameProgress();
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    plants.forEach(plant => {
        ctx.drawImage(plantImages[plant.type], plant.x, plant.y);
    });

    zombies.forEach(zombie => {
        ctx.fillRect(zombie.x, zombie.y, zombie.width, zombie.height);
    });

    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });

    updateProgressBar();
}

function handlePlayerInput() {
    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Plant a new plant at the clicked position
        const plant = {
            x: x,
            y: y,
            type: Math.floor(Math.random() * plantImages.length)
        };
        plants.push(plant);

        // Shoot a bullet from the plant
        const bullet = {
            x: plant.x + 20,
            y: plant.y,
            width: 5,
            height: 5,
            speed: 5
        };
        bullets.push(bullet);
    });
}

function handleGameLogic() {
    // Move zombies
    zombies.forEach(zombie => {
        zombie.x -= zombie.speed;
    });

    // Move bullets
    bullets.forEach(bullet => {
        bullet.x += bullet.speed;
    });

    // Check for collisions between bullets and zombies
    bullets.forEach((bullet, bulletIndex) => {
        zombies.forEach((zombie, zombieIndex) => {
            if (bullet.x < zombie.x + zombie.width &&
                bullet.x + bullet.width > zombie.x &&
                bullet.y < zombie.y + zombie.height &&
                bullet.y + bullet.height > zombie.y) {
                // Remove the bullet and the zombie
                bullets.splice(bulletIndex, 1);
                zombies.splice(zombieIndex, 1);
            }
        });
    });

    // Check for game over condition
    zombies.forEach(zombie => {
        if (zombie.x <= 0) {
            gameOver = true;
        }
    });
}

function handleGameProgress() {
    progress += 0.01 * difficulty;
    if (progress >= 100) {
        gameOver = true;
    }
}

function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = `${progress}%`;
}

function showGameOverScreen() {
    const gameOverScreen = document.getElementById('game-over');
    gameOverScreen.style.display = 'block';
}

function restartGame() {
    gameOver = false;
    progress = 0;
    difficulty = 1;
    plants.length = 0;
    zombies.length = 0;
    bullets.length = 0;
    gameLoop();
}

gameLoop();
