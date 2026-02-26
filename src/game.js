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
let keys = {};
let player = new Player();
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

function updateUI() {
    scoreEl.innerText = player.score;
    healthBar.style.width = `${player.hp}%`;
    if (player.hp <= 0 && gameActive) endGame();
}

function endGame() {
    gameActive = false;
    deathOverlay.classList.remove('hidden');
    document.getElementById('final-score').innerText = `Pontos: ${player.score}`;
}

// Input Listeners
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

window.addEventListener('click', (e) => {
    if (gameActive && !paused && player.mode === 'Pistol') {
        const angle = Math.atan2(e.clientY - player.y, e.clientX - player.x);
        pools.bullet.get(player.x, player.y, angle, true);
    }
});

// Upgrade Choices
upgradePistolBtn.onclick = () => { player.mode = 'Pistol'; player.vulnerable = true; paused = false; menuOverlay.classList.add('hidden'); };
upgradeSwordBtn.onclick = () => { player.mode = 'Sword'; player.vulnerable = true; paused = false; menuOverlay.classList.add('hidden'); };
startBtn.onclick = resetGame;
restartBtn.onclick = resetGame;

function spawnEnemy() {
    spawnTimer += 0.016;
    if (spawnTimer >= 1.2) {
        spawnTimer = 0;
        const side = Math.floor(Math.random() * 4);
        let x, y;
        if (side === 0) { x = Math.random() * canvas.width; y = -50; }
        else if (side === 1) { x = canvas.width + 50; y = Math.random() * canvas.height; }
        else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 50; }
        else { x = -50; y = Math.random() * canvas.height; }

        const types = player.score < 20 ? ['Swordsman'] :
            player.score < 50 ? ['Swordsman', 'Archer'] :
                ['Swordsman', 'Archer', 'Mage', 'Grenadier'];
        const type = types[Math.floor(Math.random() * types.length)];
        pools.enemy.get(type, x, y);
    }
}

function update() {
    if (!gameActive || paused) return;

    player.update(keys, mouse);
    spawnEnemy();

    // Inimigos
    pools.enemy.getAllActive().forEach(e => {
        e.update(player, pools);
        const d = Utils.dist(e.x, e.y, player.x, player.y);

        if (player.mode === 'PreUpgrade') {
            if (d < e.radius + player.radius) {
                e.active = false;
                player.score += e.points;
                Utils.burst(e.x, e.y, e.color, pools.particle);
                updateUI();
                if (player.score >= 100) { paused = true; menuOverlay.classList.remove('hidden'); }
            }
        } else {
            // Player vs Enemy (Vulneravel)
            if (d < e.radius + player.radius) {
                player.hp -= 15;
                e.active = false;
                updateUI();
            }
            // Espada Check
            if (player.mode === 'Sword') {
                const sMidX = player.x + Math.cos(player.swordAngle) * (player.swordLength / 2);
                const sMidY = player.y + Math.sin(player.swordAngle) * (player.swordLength / 2);
                const sTipX = player.x + Math.cos(player.swordAngle) * player.swordLength;
                const sTipY = player.y + Math.sin(player.swordAngle) * player.swordLength;

                if (Utils.dist(e.x, e.y, sMidX, sMidY) < e.radius + 15 || Utils.dist(e.x, e.y, sTipX, sTipY) < e.radius + 15) {
                    e.active = false;
                    player.score += e.points;
                    Utils.burst(e.x, e.y, e.color, pools.particle);
                    updateUI();
                }
            }
        }

        // Bullets vs Enemy
        pools.bullet.getAllActive().forEach(b => {
            if (b.isFriendly && b.active && e.active) {
                if (Utils.dist(b.x, b.y, e.x, e.y) < e.radius + b.size) {
                    e.active = false; b.active = false;
                    player.score += e.points;
                    Utils.burst(e.x, e.y, e.color, pools.particle);
                    updateUI();
                }
            }
        });
    });

    // Bullets vs Player / Physics
    pools.bullet.getAllActive().forEach(b => {
        b.update();
        if (!b.isFriendly && b.active) {
            if (player.vulnerable && Utils.dist(b.x, b.y, player.x, player.y) < player.radius + b.size) {
                player.hp -= 10; b.active = false; updateUI();
            }
            // Pistola collision physics
            if (player.mode === 'Pistol') {
                pools.bullet.getAllActive().forEach(fb => {
                    if (fb.isFriendly && fb.active && b.active) {
                        if (Utils.dist(b.x, b.y, fb.x, fb.y) < 15) { b.active = false; fb.active = false; }
                    }
                });
            }
        }
    });

    pools.magicCircle.getAllActive().forEach(mc => {
        mc.update();
        if (mc.isActivated && Utils.dist(mc.x, mc.y, player.x, player.y) < mc.radius) {
            if (player.vulnerable) { player.hp -= 0.6; updateUI(); }
        }
    });

    pools.particle.getAllActive().forEach(p => p.update());
}

function draw() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

    pools.magicCircle.getAllActive().forEach(mc => mc.draw(ctx));
    pools.bullet.getAllActive().forEach(b => b.draw(ctx));
    pools.enemy.getAllActive().forEach(e => e.draw(ctx));
    player.draw(ctx);
    pools.particle.getAllActive().forEach(p => p.draw(ctx));

    update();
    requestAnimationFrame(draw);
}

draw();
