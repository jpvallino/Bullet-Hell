class Bullet {
    constructor() { this.active = false; }
    init(x, y, angle, isFriendly = false, type = 'bullet') {
        this.x = x; this.y = y; this.angle = angle;
        this.isFriendly = isFriendly; this.type = type;
        this.active = true;
        this.size = type === 'spear' ? 10 : (type === 'whip' ? 12 : 6);
        this.speed = type === 'spear' ? 5.5 : (type === 'whip' ? 12 : 7);
    }
    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        if (this.x < -100 || this.x > window.innerWidth + 100 || this.y < -100 || this.y > window.innerHeight + 100) this.active = false;
    }
    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.isFriendly ? '#00f2ff' : (this.type === 'spear' ? '#00ffff' : '#ff00ea');
        ctx.shadowBlur = this.type === 'spear' ? 20 : 10;
        ctx.shadowColor = ctx.fillStyle;
        if (this.type === 'spear') {
            ctx.translate(this.x, this.y); ctx.rotate(this.angle);
            ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-12, -6); ctx.lineTo(-12, 6); ctx.closePath();
        } else if (this.type === 'whip') {
            ctx.translate(this.x, this.y); ctx.rotate(this.angle);
            ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff';
            ctx.fillRect(-15, -2, 30, 4);
        } else {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        }
        ctx.fill(); ctx.restore();
    }
}

class Whip {
    constructor() { this.active = false; this.isReturning = false; }
    init(x, y, angle) {
        this.x = x; this.y = y; this.angle = angle; this.active = true;
        this.startX = x; this.startY = y; this.timer = 0; this.isReturning = false;
        this.speed = 10; this.maxDist = 500;
    }
    update(player) {
        if (!this.active) return;
        if (!this.isReturning) {
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            if (Utils.dist(this.x, this.y, this.startX, this.startY) >= this.maxDist) {
                this.isReturning = true;
                this.timer = Date.now();
            }
        } else {
            if (Date.now() - this.timer > 3000) {
                let dx = player.x - this.x, dy = player.y - this.y;
                let d = Math.sqrt(dx * dx + dy * dy);
                if (d < 20) { this.active = false; player.lastWhipReturn = Date.now(); }
                else { this.x += (dx / d) * 15; this.y += (dy / d) * 15; }
            }
        }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.shadowBlur = 15; ctx.shadowColor = '#fff';
        ctx.beginPath(); ctx.moveTo(-30, 0); ctx.bezierCurveTo(-10, 10, 10, -10, 30, 0); ctx.stroke();
        ctx.restore();
    }
}

class Player {
    constructor() { this.reset(); }
    reset() {
        this.x = window.innerWidth / 2; this.y = window.innerHeight / 2;
        this.radius = 18; this.mode = 'PreUpgrade';
        this.hp = 200; this.maxHp = 200;
        this.score = 0;
        this.speed = 6; this.swordAngle = 0;
        this.swordLength = 85; this.swordCount = 1;
        this.pistolCooldown = 150; this.lastShoot = 0;
        this.bulletSize = 6;
        this.vulnerable = false;

        // Dash and Punch
        this.isDashing = false;
        this.dashStartTime = 0;
        this.dashDuration = 200; // ms
        this.dashCooldown = 5000; // ms
        this.lastDash = -5000;
        this.dashSpeedMult = 3.5;

        this.isPunching = false;
        this.punchStartTime = 0;
        this.punchDuration = 150; // ms
        this.punchRange = 45;
        this.lastPunch = 0;
        this.punchCooldown = 400; // ms

        this.whipOwned = false;
        this.lastWhipShoot = 0;
        this.lastWhipReturn = 0;
        this.whipCooldown = 3000;
    }
    update(keys, mouse) {
        let currentSpeed = this.speed;
        const now = Date.now();

        // Dash Logic
        if (this.isDashing) {
            if (now - this.dashStartTime > this.dashDuration) {
                this.isDashing = false;
            } else {
                currentSpeed *= this.dashSpeedMult;
            }
        }

        if (keys['w']) this.y -= currentSpeed; if (keys['s']) this.y += currentSpeed;
        if (keys['a']) this.x -= currentSpeed; if (keys['d']) this.x += currentSpeed;

        this.x = Utils.clamp(this.x, this.radius, window.innerWidth - this.radius);
        this.y = Utils.clamp(this.y, this.radius, window.innerHeight - this.radius);
        this.swordAngle = Math.atan2(mouse.y - this.y, mouse.x - this.x);

        if (this.isPunching && now - this.punchStartTime > this.punchDuration) {
            this.isPunching = false;
        }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        const now = Date.now();

        // Dash Ready Visual
        if (now - this.lastDash > this.dashCooldown) {
            ctx.beginPath(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.lineWidth = 2;
            ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2); ctx.stroke();
        }

        if (this.mode === 'Sword') {
            ctx.shadowBlur = 15; ctx.shadowColor = '#00f2ff'; ctx.fillStyle = '#00f2ff';
            for (let i = 0; i < this.swordCount; i++) {
                ctx.save(); ctx.rotate(this.swordAngle + (i * Math.PI * 2 / this.swordCount));
                ctx.fillRect(0, -4, this.swordLength, 8); ctx.restore();
            }
        }

        // Punch Aim Indicator (Pre-Upgrade)
        if (this.mode === 'PreUpgrade' && !this.isPunching) {
            ctx.save(); ctx.rotate(this.swordAngle);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
            ctx.strokeRect(this.radius + 5, -8, 20, 16);
            ctx.restore();
        }

        // Punch Visual
        if (this.isPunching) {
            ctx.save(); ctx.rotate(this.swordAngle);
            ctx.fillStyle = '#fff'; ctx.shadowBlur = 10; ctx.shadowColor = '#fff';
            let pProgress = (now - this.punchStartTime) / this.punchDuration;
            let pOffset = Math.sin(pProgress * Math.PI) * 20;
            ctx.fillRect(this.radius - 5 + pOffset, -6, 15, 12);
            ctx.restore();
        }

        ctx.fillStyle = (this.mode === 'PreUpgrade') ? '#fff' : '#00f2ff';
        ctx.shadowBlur = this.isDashing ? 30 : 15;
        ctx.shadowColor = ctx.fillStyle;

        if (this.isDashing) {
            ctx.globalAlpha = 0.5;
            ctx.beginPath(); ctx.arc(-10, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        }

        ctx.globalAlpha = 1.0;
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

class Enemy {
    constructor() { this.active = false; }
    init(type, x, y) {
        this.type = type; this.x = x; this.y = y;
        this.radius = 22; this.active = true; this.timer = 0; this.swordRot = 0;
        this.swordLen = 25; // Espada do inimigo maior
        this.setup();
    }
    setup() {
        switch (this.type) {
            case 'Swordsman': this.speed = 2.4; this.points = 2; this.color = '#ff4444'; break; // Pontos 1 -> 2
            case 'Archer': this.speed = 1.4; this.points = 3; this.color = '#cc44ff'; break;    // Pontos 2 -> 3
            case 'Mage': this.speed = 3.5; this.points = 4; this.color = '#44ffff'; this.isStatic = false; break; // Pontos 3 -> 4
            case 'Grenadier': this.speed = 3.8; this.points = 3; this.color = '#ffaa44'; this.isDead = false; this.deathTime = 0; break;
            case 'Ghost': this.speed = 2.0; this.points = 4; this.color = 'rgba(255,255,255,0)'; break;
        }
    }
    update(player, pool) {
        if (this.type === 'Grenadier' && this.isDead) {
            if (Date.now() - this.deathTime >= 3000) {
                this.active = false; this.explode(pool);
            }
            return;
        }
        this.timer += 0.016; let dx = player.x - this.x, dy = player.y - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        switch (this.type) {
            case 'Swordsman':
                this.x += (dx / dist) * this.speed; this.y += (dy / dist) * this.speed;
                this.swordRot += 0.04;
                break;
            case 'Archer':
                if (dist > 300) { this.x += (dx / dist) * this.speed; this.y += (dy / dist) * this.speed; }
                else if (dist < 250) { this.x -= (dx / dist) * this.speed; this.y -= (dy / dist) * this.speed; }
                if (Math.round(this.timer * 60) % 180 === 0) pool.bullet.get(this.x, this.y, Math.atan2(dy, dx), false);
                break;
            case 'Mage':
                if (!this.isStatic) {
                    this.x += (dx / dist) * this.speed; this.y += (dy / dist) * this.speed;
                    if (this.x > 150 && this.x < window.innerWidth - 150 && this.y > 150 && this.y < window.innerHeight - 150) this.isStatic = true;
                }
                if (Math.round(this.timer * 60) % 150 === 0) pool.bullet.get(this.x, this.y, Math.atan2(dy, dx), false, 'spear');
                break;
            case 'Grenadier':
                this.x += (dx / dist) * this.speed; this.y += (dy / dist) * this.speed;
                if (dist < this.radius + player.radius) { this.isDead = true; this.deathTime = Date.now(); player.hp -= 20; updateUI(); }
                break;
            case 'Ghost':
                this.x += (dx / dist) * this.speed; this.y += (dy / dist) * this.speed;
                let opacity = Utils.clamp(1 - (dist / 600), 0, 0.75);
                this.color = `rgba(255,255,255,${opacity})`;
                break;
        }
    }
    explode(pool) {
        Utils.burst(this.x, this.y, this.color, pool.particle);
        for (let a = 0; a < Math.PI * 2; a += 0.8) pool.bullet.get(this.x, this.y, a, false);
    }
    draw(ctx) {
        ctx.save(); ctx.fillStyle = this.color; ctx.shadowBlur = 10; ctx.shadowColor = this.color;
        if (this.type === 'Swordsman') {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
            ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.swordRot);
            ctx.fillStyle = '#fff'; ctx.fillRect(this.radius + 5, -3, this.swordLen, 6); ctx.restore();
        } else if (this.type === 'Archer') {
            ctx.beginPath(); ctx.moveTo(this.x, this.y - this.radius); ctx.lineTo(this.x + this.radius, this.y + this.radius); ctx.lineTo(this.x - this.radius, this.y + this.radius); ctx.closePath(); ctx.fill();
        } else if (this.type === 'Mage') {
            ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        } else {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}
