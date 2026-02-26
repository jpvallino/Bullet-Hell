const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const healthBar = document.getElementById('health-bar');
const menuOverlay = document.getElementById('menu-overlay');
const deathOverlay = document.getElementById('death-overlay');
const startScreen = document.getElementById('start-screen');
const upgradePistolBtn = document.getElementById('upgrade-pistol');
const upgradeSwordBtn = document.getElementById('upgrade-sword');
const restartBtn = document.getElementById('restart-btn');
const startBtn = document.getElementById('start-btn');

let gameActive = false;
let paused = false;
let mouse = { x: 0, y: 0 };
let player = new Player();
let enemies = [];
let spawnTimer = 0;

// Pools
const pools = {
    bullet: Utils.createPool(() => new Bullet()),
    particle: Utils.createPool(() => new Particle()),
    enemy: Utils.createPool(() => new Enemy()),
    magicCircle: Utils.createPool(() => new MagicCircle())
};
function resetGame() {
    player = new Player();
    pools.bullet.clear();
    pools.particle.clear();
    pools.enemy.clear();
    pools.magicCircle.clear();
    gameActive = true;
    paused = false;
    deathOverlay.classList.add('hidden');
    menuOverlay.classList.add('hidden');
    startScreen.classList.add('hidden');
    updateUI();
}

// UI Handling
function updateUI() {
    scoreEl.innerText = player.score;
    healthBar.style.width = `${player.hp}%`;
    if (player.hp <= 0 && gameActive) {
        endGame();
    }
}

function endGame() {
    gameActive = false;
    deathOverlay.classList.remove('hidden');
    document.getElementById('final-score').innerText = `Pontos: ${player.score}`;
}

// Input
let keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('click', (e) => {
    if (gameActive && !paused && player.mode === 'Pistol') {
        const angle = Math.atan2(e.clientY - player.y, e.clientX - player.x);
        pools.bullet.get(player.x, player.y, angle, true);
    }
});

// Upgrade Handling
function checkUpgrade() {
    if (player.score >= 100 && player.mode === 'PreUpgrade') {
        paused = true;
        menuOverlay.classList.remove('hidden');
    }
}

upgradePistolBtn.onclick = () => {
    player.mode = 'Pistol';
    player.vulnerable = true;
    paused = false;
    menuOverlay.classList.add('hidden');
};

upgradeSwordBtn.onclick = () => {
    player.mode = 'Sword';
    player.vulnerable = true;
    paused = false;
    menuOverlay.classList.add('hidden');
};

startBtn.onclick = resetGame;
restartBtn.onclick = resetGame;

// Main Loop
function initCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.onresize = initCanvas;
initCanvas();

function spawnEnemy() {
    spawnTimer += 0.016;
    if (spawnTimer >= 1.5) { // Spawn every 1.5s
        spawnTimer = 0;
        const side = Math.floor(Math.random() * 4);
        let x, y;
        if (side === 0) { x = Math.random() * canvas.width; y = -50; }
        else if (side === 1) { x = canvas.width + 50; y = Math.random() * canvas.height; }
        else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 50; }
        else { x = -50; y = Math.random() * canvas.height; }

        const types = ['Swordsman', 'Archer', 'Mage', 'Grenadier'];
        // Increase difficulty based on score
        const availableTypes = player.score < 20 ? ['Swordsman'] :
            player.score < 50 ? ['Swordsman', 'Archer'] :
                ['Swordsman', 'Archer', 'Mage', 'Grenadier'];
        const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        pools.enemy.get(type, x, y);
    }
}

function update() {
    if (!gameActive || paused) return;

    player.update(keys);
    spawnEnemy();

    const activeEnemies = pools.enemy.getAllActive();
    pools.bullet.getAllActive().forEach(b => {
        b.update();
        if (!b.isFriendly) {
            // Bullet vs Player
            if (Utils.dist(b.x, b.y, player.x, player.y) < player.radius + b.size) {
                if (player.vulnerable) {
                    player.hp -= 10;
                    b.active = false;
                    updateUI();
                }
            }
        }
    });

    // Update Particles
    pools.particle.getAllActive().forEach(p => p.update());

    // Update Magic Circles
    pools.magicCircle.getAllActive().forEach(mc => {
        mc.update(player);
        if (mc.isActivated && Utils.dist(mc.x, mc.y, player.x, player.y) < mc.radius) {
            if (player.vulnerable) {
                player.hp -= 0.5; // Do damage while inside
                updateUI();
            }
        }
    });

    // Update Enemies
    pools.enemy.getAllActive().forEach(e => {
        e.update(player, pools);

        // Player vs Enemy Collision
        const d = Utils.dist(e.x, e.y, player.x, player.y);

        if (player.mode === 'PreUpgrade') {
            if (d < e.radius + player.radius) {
                e.active = false;
                player.score += e.points;
                Utils.burst(e.x, e.y, e.color, pools.particle);
                updateUI();
                checkUpgrade();
            }
        } else if (player.mode === 'Sword') {
            // Update Sword Angle to follow mouse
            player.swordAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

            // Sword check
            const swordTipX = player.x + Math.cos(player.swordAngle) * player.swordLength;
            const swordTipY = player.y + Math.sin(player.swordAngle) * player.swordLength;

            // Check distance to sword line (simplified: distance to mid-sword point)
            const midSwordX = player.x + Math.cos(player.swordAngle) * (player.swordLength / 2);
            const midSwordY = player.y + Math.sin(player.swordAngle) * (player.swordLength / 2);

            const distToSwordTip = Utils.dist(e.x, e.y, swordTipX, swordTipY);
            const distToSwordMid = Utils.dist(e.x, e.y, midSwordX, midSwordY);

            if (distToSwordTip < e.radius + 10 || distToSwordMid < e.radius + 10) {
                e.active = false;
                player.score += e.points;
                Utils.burst(e.x, e.y, e.color, pools.particle);
                updateUI();
            } else if (d < e.radius + player.radius) {
                player.hp -= 20;
                e.active = false;
                updateUI();
            }
        } else if (player.mode === 'Pistol') {
            if (d < e.radius + player.radius) {
                player.hp -= 20;
                e.active = false;
                updateUI();
            }
        }

        // Friendly Bullets vs Enemy
        pools.bullet.getAllActive().forEach(b => {
            if (b.isFriendly && b.active && e.active) {
                if (Utils.dist(b.x, b.y, e.x, e.y) < e.radius + b.size) {
                    e.active = false;
                    b.active = false;
                    player.score += e.points;
                    Utils.burst(e.x, e.y, e.color, pools.particle);
                    updateUI();
                }
            } else if (!b.isFriendly && b.active && player.mode === 'Pistol' && e.active) {
                // Pistol mode bullet collision physics
                pools.bullet.getAllActive().forEach(fb => {
                    if (fb.isFriendly && fb.active) {
                        if (Utils.dist(b.x, b.y, fb.x, fb.y) < (b.size + fb.size)) {
                            b.active = false;
                            fb.active = false;
                            Utils.burst(b.x, b.y, '#fff', pools.particle);
                        }
                    }
                });
            }
        });
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background Grid Efect
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.05)';
    ctx.lineWidth = 1;
    const step = 50;
    for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    pools.magicCircle.getAllActive().forEach(mc => mc.draw(ctx));
    pools.bullet.getAllActive().forEach(b => b.draw(ctx));
    pools.enemy.getAllActive().forEach(e => e.draw(ctx));
    player.draw(ctx);
    pools.particle.getAllActive().forEach(p => p.draw(ctx));

    update();
    requestAnimationFrame(draw);
}

draw();
