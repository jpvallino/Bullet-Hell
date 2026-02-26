class Bullet {
    constructor() {
        this.active = false;
        this.isFriendly = false;
        this.size = 6;
        this.speed = 7;
    }
    init(x, y, angle, isFriendly = false) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.isFriendly = isFriendly;
        this.active = true;
    }
    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        if (this.x < -50 || this.x > window.innerWidth + 50 || this.y < -50 || this.y > window.innerHeight + 50) {
            this.active = false;
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.isFriendly ? '#00f2ff' : '#ff00ea';
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Player {
    constructor() {
        this.x = window.innerWidth / 2;
        this.y = window.innerHeight / 2;
        this.radius = 18;
        this.mode = 'PreUpgrade';
        this.vulnerable = false;
        this.hp = 100;
        this.score = 0;
        this.swordAngle = 0;
        this.swordLength = 85;
        this.speed = 6;
    }
    update(keys, mouse) {
        // Movimentação WASD
        if (keys['w']) this.y -= this.speed;
        if (keys['s']) this.y += this.speed;
        if (keys['a']) this.x -= this.speed;
        if (keys['d']) this.x += this.speed;

        // Limites da tela
        this.x = Utils.clamp(this.x, this.radius, window.innerWidth - this.radius);
        this.y = Utils.clamp(this.y, this.radius, window.innerHeight - this.radius);

        if (this.mode === 'Sword') {
            // A espada aponta para o mouse
            this.swordAngle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.mode === 'Sword') {
            ctx.rotate(this.swordAngle);
            ctx.fillStyle = '#00f2ff';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00f2ff';
            ctx.fillRect(0, -4, this.swordLength, 8);
        }

        // Core do Player
        ctx.fillStyle = (this.mode === 'PreUpgrade') ? '#fff' : '#00f2ff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Enemy {
    constructor() {
        this.active = false;
    }
    init(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.radius = 22;
        this.hp = 1;
        this.timer = 0;
        this.active = true;
        this.setup();
    }
    setup() {
        switch (this.type) {
            case 'Swordsman': this.speed = 2.2; this.points = 1; this.color = '#ff4444'; break;
            case 'Archer': this.speed = 1.3; this.points = 2; this.color = '#cc44ff'; break;
            case 'Mage': this.speed = 0.6; this.points = 3; this.color = '#44ffff'; break;
            case 'Grenadier': this.speed = 3.5; this.points = 2; this.color = '#ffaa44'; break;
        }
    }
    update(player, pool) {
        this.timer += 0.016;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        switch (this.type) {
            case 'Swordsman':
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
                break;
            case 'Archer':
                if (dist > 320) {
                    this.x += (dx / dist) * this.speed;
                    this.y += (dy / dist) * this.speed;
                } else if (dist < 280) {
                    this.x -= (dx / dist) * this.speed;
                    this.y -= (dy / dist) * this.speed;
                }
                if (Math.round(this.timer * 60) % 300 === 0) { // 5s
                    pool.bullet.get(this.x, this.y, Math.atan2(dy, dx), false);
                }
                break;
            case 'Mage':
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
                if (Math.round(this.timer * 60) % 720 === 0) { // 12s
                    pool.magicCircle.get(player.x, player.y);
                }
                break;
            case 'Grenadier':
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
                if (this.timer >= 10 || dist < this.radius + player.radius) {
                    this.explode(pool);
                }
                break;
        }
    }
    explode(pool) {
        this.active = false;
        Utils.burst(this.x, this.y, this.color, pool.particle);
        for (let a = 0; a < Math.PI * 2; a += 0.8) {
            pool.bullet.get(this.x, this.y, a, false);
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        if (this.type === 'Swordsman') ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        else if (this.type === 'Archer') {
            ctx.moveTo(this.x, this.y - this.radius);
            ctx.lineTo(this.x + this.radius, this.y + this.radius);
            ctx.lineTo(this.x - this.radius, this.y + this.radius);
            ctx.closePath();
        } else if (this.type === 'Mage') {
            ctx.rect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        } else {
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
    }
}

class MagicCircle {
    constructor() { this.active = false; }
    init(x, y) {
        this.x = x; this.y = y; this.active = true;
        this.delay = 0;
        this.isActivated = false;
        this.life = 1.0;
        this.radius = 90;
    }
    update() {
        this.delay += 0.016;
        if (this.delay >= 4 && !this.isActivated) {
            this.isActivated = true;
        }
        if (this.isActivated) {
            this.life -= 0.04;
            if (this.life <= 0) this.active = false;
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.strokeStyle = '#44ffff';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        if (this.isActivated) {
            ctx.fillStyle = `rgba(68, 255, 255, ${this.life * 0.4})`;
            ctx.fill();
        } else {
            ctx.fillStyle = `rgba(68, 255, 255, ${(this.delay / 4) * 0.2})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
