const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const healthBar = document.getElementById('health-bar');
const menuOverlay = document.getElementById('menu-overlay');
const upgradeOptionsEl = document.getElementById('upgrade-options');
const deathOverlay = document.getElementById('death-overlay');
const startScreen = document.getElementById('start-screen');
const customCursor = document.getElementById('custom-cursor');

let gameActive = false, paused = false, mouse = { x: 0, y: 0, isDown: false }, keys = {}, player = new Player();
let spawnTimer = 0, nextThreshold = 100;

const pools = {
    bullet: Utils.createPool(() => new Bullet()),
    particle: Utils.createPool(() => new Particle()),
    enemy: Utils.createPool(() => new Enemy()),
    magicCircle: Utils.createPool(() => new MagicCircle())
};

function resetGame() {
    player.reset(); pools.bullet.clear(); pools.particle.clear(); pools.enemy.clear(); pools.magicCircle.clear();
    gameActive = true; paused = false; nextThreshold = 100;
    deathOverlay.classList.add('hidden'); menuOverlay.classList.add('hidden'); startScreen.classList.add('hidden');
    customCursor.classList.add('hidden'); updateUI();
}

function updateUI() {
    scoreEl.innerText = player.score;
    let hpPercent = (player.hp / player.maxHp) * 100;
    healthBar.style.width = `${hpPercent}%`;
    if (player.hp <= 0 && gameActive) endGame();
}

function endGame() {
    gameActive = false; deathOverlay.classList.remove('hidden');
    document.getElementById('final-score').innerText = `Pontos: ${player.score}`;
}

window.addEventListener('mousedown', () => {
    mouse.isDown = true;
    const now = Date.now();
    if (gameActive && !paused) {
        if (player.mode === 'PreUpgrade' && now - player.lastPunch > player.punchCooldown) {
            player.isPunching = true;
            player.punchStartTime = now;
            player.lastPunch = now;
        }
    }
});
window.addEventListener('mouseup', () => mouse.isDown = false);

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    customCursor.style.left = mouse.x + 'px'; customCursor.style.top = mouse.y + 'px';
});

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.code === 'Space' && gameActive && !paused) {
        const now = Date.now();
        if (now - player.lastDash > player.dashCooldown) {
            player.isDashing = true;
            player.dashStartTime = now;
            player.lastDash = now;
        }
    }
});
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

function showUpgradeMenu() {
    paused = true; menuOverlay.classList.remove('hidden');
    upgradeOptionsEl.innerHTML = '';
    let options = [];

    if (player.mode === 'PreUpgrade') {
        options = [
            { id: 'pistol', icon: '🔫', title: 'PISTOLA', desc: 'Atire no mouse para destruir inimigos e balas.', cb: () => { player.mode = 'Pistol'; player.vulnerable = true; customCursor.classList.remove('hidden'); } },
            { id: 'sword', icon: '⚔️', title: 'ESPADA', desc: 'Lâmina rotativa letal. O corpo se torna vulnerável.', cb: () => { player.mode = 'Sword'; player.vulnerable = true; customCursor.classList.remove('hidden'); } }
        ];
    } else if (player.mode === 'Sword') {
        options = [
            { id: 's1', icon: '📏', title: 'LÂMINA LONGA', desc: 'Aumenta o alcance da sua espada.', cb: () => player.swordLength += 25 },
            { id: 's2', icon: '➕', title: 'MAIS LÂMINAS', desc: 'Adiciona uma lâmina extra ao redor do corpo. (Máx 3)', cb: () => player.swordCount = Math.min(3, player.swordCount + 1) },
            { id: 's3', icon: '❤️', title: 'REPARO', desc: 'Recupera 50% da vida total.', cb: () => player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.5) }
        ];
    } else if (player.mode === 'Pistol') {
        options = [
            { id: 'p1', icon: '⚡', title: 'DISPARO RÁPIDO', desc: 'Reduz o tempo entre tiros drasticamente.', cb: () => player.pistolCooldown *= 0.7 },
            { id: 'p2', icon: '🔥', title: 'BALAS GRANDES', desc: 'Balas maiores e mais fáceis de atingir inimigos.', cb: () => player.bulletSize += 4 },
            { id: 'p3', icon: '❤️', title: 'REPARO', desc: 'Recupera 50% da vida total.', cb: () => player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.5) }
        ];
    }

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'upgrade-btn';
        btn.innerHTML = `<span class="icon">${opt.icon}</span><div class="details"><h3>${opt.title}</h3><p>${opt.desc}</p></div>`;
        btn.onclick = () => { opt.cb(); paused = false; menuOverlay.classList.add('hidden'); nextThreshold += 100; };
        upgradeOptionsEl.appendChild(btn);
    });
}

function update() {
    if (!gameActive || paused) return;
    player.update(keys, mouse);
    spawnEnemy();

    // Shooting logic
    if (gameActive && !paused && mouse.isDown && player.mode === 'Pistol') {
        const now = Date.now();
        if (now - player.lastShoot > player.pistolCooldown) {
            pools.bullet.get(player.x, player.y, Math.atan2(mouse.y - player.y, mouse.x - player.x), true);
            player.lastShoot = now;
        }
    }

    pools.enemy.getAllActive().forEach(e => {
        e.update(player, pools); let d = Utils.dist(e.x, e.y, player.x, player.y);

        // Colisão com a Espada do Inimigo Swordsman
        if (e.type === 'Swordsman') {
            let swordX = e.x + Math.cos(e.swordRot) * (e.radius + e.swordLen / 2);
            let swordY = e.y + Math.sin(e.swordRot) * (e.radius + e.swordLen / 2);
            if (Utils.dist(player.x, player.y, swordX, swordY) < player.radius + 10) {
                player.hp -= 1.5; // Dano contínuo da espada
                updateUI();
            }
        }

        if (player.mode === 'PreUpgrade') {
            // Only kill if punching
            if (player.isPunching) {
                let punchX = player.x + Math.cos(player.swordAngle) * (player.radius + 15);
                let punchY = player.y + Math.sin(player.swordAngle) * (player.radius + 15);
                if (Utils.dist(e.x, e.y, punchX, punchY) < e.radius + 20) {
                    e.active = false; player.score += e.points; Utils.burst(e.x, e.y, e.color, pools.particle);
                    updateUI(); if (player.score >= nextThreshold) showUpgradeMenu();
                }
            }
            // Touching enemy now deals damage in PreUpgrade too (since we have a weapon)
            if (d < e.radius + player.radius) {
                player.hp -= 10; e.active = false; updateUI();
            }
        } else {
            if (d < e.radius + player.radius) { player.hp -= 20; e.active = false; updateUI(); }
            if (player.mode === 'Sword') {
                for (let i = 0; i < player.swordCount; i++) {
                    let ang = player.swordAngle + (i * Math.PI * 2 / player.swordCount);
                    let tipX = player.x + Math.cos(ang) * player.swordLength, tipY = player.y + Math.sin(ang) * player.swordLength;
                    let midX = player.x + Math.cos(ang) * (player.swordLength / 2), midY = player.y + Math.sin(ang) * (player.swordLength / 2);
                    if (Utils.dist(e.x, e.y, tipX, tipY) < e.radius + 15 || Utils.dist(e.x, e.y, midX, midY) < e.radius + 15) {
                        e.active = false; player.score += e.points; Utils.burst(e.x, e.y, e.color, pools.particle);
                        updateUI(); if (player.score >= nextThreshold) showUpgradeMenu();
                    }
                }
            }
        }
        pools.bullet.getAllActive().forEach(b => {
            if (b.isFriendly && b.active && e.active) {
                if (Utils.dist(b.x, b.y, e.x, e.y) < e.radius + b.size) {
                    e.active = false; b.active = false; player.score += e.points;
                    Utils.burst(e.x, e.y, e.color, pools.particle); updateUI();
                    if (player.score >= nextThreshold) showUpgradeMenu();
                }
            }
        });
    });

    pools.bullet.getAllActive().forEach(b => {
        b.update();
        if (!b.isFriendly && b.active) {
            if (Utils.dist(b.x, b.y, player.x, player.y) < player.radius + b.size) {
                player.hp -= 15; b.active = false; updateUI();
            }
            if (player.mode === 'Pistol') {
                pools.bullet.getAllActive().forEach(fb => {
                    if (fb.isFriendly && fb.active && b.active && Utils.dist(b.x, b.y, fb.x, fb.y) < (player.bulletSize + 10)) { b.active = false; fb.active = false; }
                });
            }
        }
    });

    pools.magicCircle.getAllActive().forEach(mc => {
        mc.update();
        if (mc.isActivated && Utils.dist(mc.x, mc.y, player.x, player.y) < mc.radius) { player.hp -= 1.0; updateUI(); }
    });
    pools.particle.getAllActive().forEach(p => p.update());
}

function spawnEnemy() {
    spawnTimer += 0.016;
    if (spawnTimer >= 1.2) {
        spawnTimer = 0; let side = Math.floor(Math.random() * 4), x, y;
        if (side === 0) { x = Math.random() * canvas.width; y = -50; } else if (side === 1) { x = canvas.width + 50; y = Math.random() * canvas.height; }
        else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 50; } else { x = -50; y = Math.random() * canvas.height; }
        const types = player.score < 50 ? ['Swordsman'] : player.score < 150 ? ['Swordsman', 'Archer'] : ['Swordsman', 'Archer', 'Mage', 'Grenadier'];
        pools.enemy.get(types[Math.floor(Math.random() * types.length)], x, y);
    }
}

function draw() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight; ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.05)'; ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
    pools.magicCircle.getAllActive().forEach(mc => mc.draw(ctx));
    pools.bullet.getAllActive().forEach(b => b.draw(ctx));
    pools.enemy.getAllActive().forEach(e => e.draw(ctx));
    player.draw(ctx); pools.particle.getAllActive().forEach(p => p.draw(ctx));
    update(); requestAnimationFrame(draw);
}

document.getElementById('start-btn').onclick = resetGame;
document.getElementById('restart-btn').onclick = resetGame;
draw();
