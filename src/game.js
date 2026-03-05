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
    magicCircle: Utils.createPool(() => new MagicCircle()),
    whip: Utils.createPool(() => new Whip())
};

function resetGame() {
    player.reset(); pools.bullet.clear(); pools.particle.clear(); pools.enemy.clear(); pools.magicCircle.clear();
    gameActive = true; paused = false; nextThreshold = 100;
    deathOverlay.classList.add('hidden'); menuOverlay.classList.add('hidden'); startScreen.classList.add('hidden');
    customCursor.classList.remove('hidden'); updateUI();
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

    let selected = [];
    if (nextThreshold === 100) {
        // Primeira escolha: Armas
        selected = [
            { id: 'pistol', icon: '🔫', title: 'PISTOLA', desc: 'Atire no mouse para destruir inimigos e balas.', cb: () => { player.mode = 'Pistol'; player.vulnerable = true; customCursor.classList.remove('hidden'); } },
            { id: 'sword', icon: '⚔️', title: 'ESPADA', desc: 'Lâmina rotativa letal. O corpo se torna vulnerável.', cb: () => { player.mode = 'Sword'; player.vulnerable = true; customCursor.classList.remove('hidden'); } },
            { id: 'whip', icon: '➰', title: 'CHICOTE', desc: 'Lança um chicote que volta após 1s.', cb: () => { player.mode = 'Whip'; player.vulnerable = true; } },
            { id: 'punch', icon: '🥊', title: 'SOCO', desc: 'Continue com o soco e ganhe bônus de soco/agilidade.', cb: () => { player.mode = 'Punch'; player.vulnerable = true; } }
        ];
        // Selecionar 3 das 4 armas disponíveis no início
        let weapons = [...selected];
        selected = [];
        for (let i = 0; i < 3; i++) selected.push(weapons.splice(Math.floor(Math.random() * weapons.length), 1)[0]);
    } else {
        // Upgrades específicos por arma
        const weaponPools = {
            Punch: [
                { id: 'pu1', icon: '🥊', title: 'MEGA SOCO', desc: 'Aumenta consideravelmente o alcance do soco.', cb: () => player.punchRange += 25 },
                { id: 'pu2', icon: '⚡', title: 'REFLEXOS', desc: 'Reduz o cooldown do soco e do dash.', cb: () => { player.punchCooldown *= 0.8; player.dashCooldown -= 1000; } },
                { id: 'pu3', icon: '🛡️', title: 'ARMADURA', desc: 'Reduz todo dano recebido em 20%.', cb: () => player.damageReduc = (player.damageReduc || 1) * 0.8 },
                { id: 'pu4', icon: '🧪', title: 'VIGOR', desc: 'Mais HP e regeneração ao matar.', cb: () => { player.maxHp += 50; player.hp = player.maxHp; player.lifesteal = (player.lifesteal || 0) + 2; } }
            ],
            Pistol: [
                { id: 'p1', icon: '⚡', title: 'DISPARO RÁPIDO', desc: 'Reduz o tempo entre tiros drasticamente.', cb: () => player.pistolCooldown *= 0.75 },
                { id: 'p2', icon: '🔥', title: 'BALAS GRANDES', desc: 'Balas maiores e mais fáceis de atingir inimigos.', cb: () => player.bulletSize += 5 },
                { id: 'p3', icon: '🛡️', title: 'ARMADURA', desc: 'Reduz todo dano recebido em 20%.', cb: () => player.damageReduc = (player.damageReduc || 1) * 0.8 },
                { id: 'p4', icon: '🧪', title: 'SINERGIA', desc: 'Recupera vida ao destruir balas/inimigos.', cb: () => player.lifesteal = (player.lifesteal || 0) + 3 }
            ],
            Sword: [
                { id: 's1', icon: '📏', title: 'LÂMINA LONGA', desc: 'Aumenta consideravelmente o alcance da espada.', cb: () => player.swordLength += 30 },
                { id: 's2', icon: '➕', title: 'MAIS LÂMINAS', desc: 'Adiciona uma lâmina extra. (Máx 3)', cb: () => player.swordCount = Math.min(3, player.swordCount + 1) },
                { id: 's3', icon: '❤️', title: 'REFORÇO', desc: 'Aumenta HP máximo em 50 e cura.', cb: () => { player.maxHp += 50; player.hp = player.maxHp; } },
                { id: 's4', icon: '👟', title: 'AGILIDADE', desc: 'Aumenta a velocidade de movimento.', cb: () => player.speed += 1.5 }
            ],
            Whip: [
                { id: 'w1', icon: '⏱️', title: 'RECARGA RÁPIDA', desc: 'Diminui o cooldown do chicote.', cb: () => player.whipCooldown *= 0.7 },
                { id: 'w2', icon: '🍀', title: 'SORTE', desc: 'Ganhe 50% a mais de pontos.', cb: () => player.scoreMult = (player.scoreMult || 1) + 0.5 },
                { id: 'w3', icon: '💨', title: 'IMPULSO', desc: 'Reduz drasticamente o cooldown do Dash.', cb: () => player.dashCooldown -= 1500 },
                { id: 'w4', icon: '🔋', title: 'BATERIA', desc: 'Aumenta HP máximo e cura.', cb: () => { player.maxHp += 40; player.hp = player.maxHp; } }
            ]
        };
        let pool = weaponPools[player.mode] || [];
        let tempPool = [...pool];
        while (selected.length < 3 && tempPool.length > 0) {
            let idx = Math.floor(Math.random() * tempPool.length);
            selected.push(tempPool.splice(idx, 1)[0]);
        }
    }

    selected.forEach(opt => {
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
    if (gameActive && !paused && mouse.isDown) {
        const now = Date.now();
        if (player.mode === 'Pistol' && now - player.lastShoot > player.pistolCooldown) {
            pools.bullet.get(player.x, player.y, Math.atan2(mouse.y - player.y, mouse.x - player.x), true);
            player.lastShoot = now;
        }
        if (player.mode === 'Whip' && now - player.lastWhipShoot > 1000 && now - player.lastWhipReturn > 1000) {
            if (pools.whip.getAllActive().length === 0) {
                pools.whip.get(player.x, player.y, Math.atan2(mouse.y - player.y, mouse.x - player.x));
                player.lastWhipShoot = now;
            }
        }
    }

    pools.whip.getAllActive().forEach(w => w.update(player));

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

        if (player.mode === 'PreUpgrade' || player.mode === 'Punch') {
            // Only kill if punching
            if (player.isPunching && !e.isDead) { // Check !isDead so we don't double hit Grenadier
                let punchX = player.x + Math.cos(player.swordAngle) * (player.radius + 15);
                let punchY = player.y + Math.sin(player.swordAngle) * (player.radius + 15);
                if (Utils.dist(e.x, e.y, punchX, punchY) < e.radius + 20 + (player.punchRange - 45)) {
                    if (e.type === 'Grenadier') {
                        e.isDead = true; e.deathTime = Date.now();
                    } else {
                        e.active = false;
                    }
                    player.score += e.points * (player.scoreMult || 1);
                    Utils.burst(e.x, e.y, e.color, pools.particle);
                    updateUI(); if (player.score >= nextThreshold) showUpgradeMenu();
                }
            }
            // Touching enemy now deals damage in PreUpgrade too (since we have a weapon)
            if (d < e.radius + player.radius && !e.isDead) {
                player.hp -= 10 * (player.damageReduc || 1);
                if (e.type === 'Grenadier') {
                    e.isDead = true; e.deathTime = Date.now();
                } else {
                    e.active = false;
                }
                updateUI();
            }
        } else {
            if (d < e.radius + player.radius && !e.isDead) { player.hp -= 20 * (player.damageReduc || 1); e.active = false; updateUI(); }
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
        pools.whip.getAllActive().forEach(w => {
            if (Utils.dist(e.x, e.y, w.x, w.y) < e.radius + 45) {
                e.active = false; player.score += e.points * (player.scoreMult || 1);
                Utils.burst(e.x, e.y, e.color, pools.particle); updateUI();
                if (player.lifesteal) player.hp = Math.min(player.maxHp, player.hp + player.lifesteal);
                if (player.score >= nextThreshold) showUpgradeMenu();
            }
        });

        pools.bullet.getAllActive().forEach(b => {
            if (b.isFriendly && b.active && e.active) {
                if (Utils.dist(b.x, b.y, e.x, e.y) < e.radius + b.size) {
                    if (e.type === 'Grenadier') {
                        e.isDead = true; e.deathTime = Date.now();
                    } else {
                        e.active = false;
                    }
                    b.active = false; player.score += e.points * (player.scoreMult || 1);
                    Utils.burst(e.x, e.y, e.color, pools.particle); updateUI();
                    if (player.lifesteal) player.hp = Math.min(player.maxHp, player.hp + player.lifesteal);
                    if (player.score >= nextThreshold) showUpgradeMenu();
                }
            }
        });
    });

    pools.bullet.getAllActive().forEach(b => {
        b.update();
        if (!b.isFriendly && b.active) {
            if (Utils.dist(b.x, b.y, player.x, player.y) < player.radius + b.size) {
                player.hp -= 15 * (player.damageReduc || 1); b.active = false; updateUI();
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
        let types = ['Swordsman'];
        if (player.score >= 50) types.push('T-Rex', 'Archer');
        if (player.score >= 150) types.push('Mage', 'Grenadier', 'Ghost');
        pools.enemy.get(types[Math.floor(Math.random() * types.length)], x, y);
    }
}

function draw() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight; ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.05)'; ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
    pools.magicCircle.getAllActive().forEach(mc => mc.draw(ctx));
    pools.whip.getAllActive().forEach(w => w.draw(ctx));
    pools.bullet.getAllActive().forEach(b => b.draw(ctx));
    pools.enemy.getAllActive().forEach(e => e.draw(ctx));
    player.draw(ctx); pools.particle.getAllActive().forEach(p => p.draw(ctx));
    update(); requestAnimationFrame(draw);
}

document.getElementById('start-btn').onclick = resetGame;
document.getElementById('restart-btn').onclick = resetGame;
draw();
