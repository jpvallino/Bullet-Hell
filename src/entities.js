class Bullet {
    constructor() {
        this.active = false;
        this.isFriendly = false;
        this.size = 6;
        this.speed = 5;
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
        if (this.x < 0 || this.x > window.innerWidth || this.y < 0 || this.y > window.innerHeight) {
            this.active = false;
        }
    }
    draw(ctx) {
        ctx.fillStyle = this.isFriendly ? '#00f2ff' : '#ff00ea';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class Player {
    constructor() {
        this.x = window.innerWidth / 2;
        this.y = window.innerHeight / 2;
        this.radius = 15;
        this.mode = 'PreUpgrade'; // PreUpgrade, Pistol, Sword
        this.vulnerable = false;
        this.hp = 100;
        this.score = 0;
        this.swordAngle = 0;
        this.swordLength = 80;
    }
    update(mouseX, mouseY) {
        this.x = mouseX;
        this.y = mouseY;
        if (this.mode === 'Sword') {
            this.swordAngle += 0.1;
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.mode === 'Sword') {
            // Draw Sword
            ctx.rotate(this.swordAngle);
            ctx.fillStyle = '#00f2ff';
            ctx.fillRect(0, -5, this.swordLength, 10);
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00f2ff';
            ctx.strokeRect(0, -5, this.swordLength, 10);
        } else {
            // Draw Core
            ctx.fillStyle = this.mode === 'PreUpgrade' ? '#fff' : '#00f2ff';
            ctx.shadowBlur = 15;
            ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

class Enemy {
    constructor(type, x, y) {
        this.active = true;
        this.type = type;
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.hp = 1;
        this.timer = 0;
        this.setup();
    }
    setup() {
        switch (this.type) {
            case 'Swordsman': this.speed = 2; this.points = 1; this.color = '#ff4444'; break;
            case 'Archer': this.speed = 1.5; this.points = 2; this.color = '#cc44ff'; break;
            case 'Mage': this.speed = 0.5; this.points = 3; this.color = '#44ffff'; break;
            case 'Grenadier': this.speed = 4; this.points = 2; this.color = '#ffaa44'; break;
        }
    }
    update(player, pool) {
        this.timer += 0.016; // Approx 1s per 60 frames
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const d = Math.sqrt(dx * dx + dy * dy);

        switch (this.type) {
            case 'Swordsman':
                this.x += (dx / d) * this.speed;
                this.y += (dy / d) * this.speed;
                break;
            case 'Archer':
                if (d > 300) {
                    this.x += (dx / d) * this.speed;
                    this.y += (dy / d) * this.speed;
                } else if (d < 250) {
                    this.x -= (dx / d) * this.speed;
                    this.y -= (dy / d) * this.speed;
                }
                if (Math.round(this.timer * 60) % 300 === 0) { // Approx 5s
                    pool.bullet.get(this.x, this.y, Math.atan2(dy, dx), false);
                }
                break;
            case 'Mage':
                // Move very slowly
                this.x += (dx / d) * this.speed;
                this.y += (dy / d) * this.speed;
                if (Math.round(this.timer * 60) % 720 === 0) { // 12s cooldown
                    pool.magicCircle.get(player.x, player.y);
                }
                break;
            case 'Grenadier':
                this.x += (dx / d) * this.speed;
                this.y += (dy / d) * this.speed;
                if (this.timer >= 10 || d < this.radius + player.radius) {
                    this.explode(pool);
                }
                break;
        }
    }
    explode(pool) {
        this.active = false;
        Utils.burst(this.x, this.y, this.color, pool.particle);
        // Simple radial burst
        for (let a = 0; a < Math.PI * 2; a += 0.8) {
            pool.bullet.get(this.x, this.y, a, false);
        }
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        // Distinct shapes for types
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
    }
}

class MagicCircle {
    constructor() { this.active = false; }
    init(x, y) {
        this.x = x; this.y = y; this.active = true;
        this.delay = 0;
        this.isActivated = false;
        this.life = 1.0;
        this.radius = 80;
    }
    update(player) {
        this.delay += 0.016;
        if (this.delay >= 4 && !this.isActivated) {
            this.isActivated = true;
            // Immediate check or damage
        }
        if (this.isActivated) {
            this.life -= 0.05;
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
            ctx.fillStyle = 'rgba(68, 255, 255, 0.3)';
            ctx.fill();
        } else {
            // Fill progress
            ctx.fillStyle = `rgba(68, 255, 255, ${(this.delay / 4) * 0.2})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
