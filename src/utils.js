const Utils = {
    // Math Helpers
    dist: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
    angle: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
    randomRange: (min, max) => Math.random() * (max - min) + min,
    clamp: (val, min, max) => Math.max(min, Math.min(max, val)),

    // Simple Object Pooling
    createPool: (initializer) => {
        const pool = [];
        return {
            get: (...args) => {
                let obj = pool.find(item => !item.active);
                if (!obj) {
                    obj = initializer(...args);
                    pool.push(obj);
                }
                obj.init(...args);
                return obj;
            },
            getAllActive: () => pool.filter(item => item.active),
            clear: () => pool.forEach(item => item.active = false)
        };
    },

    // Particle Burst
    burst: (x, y, color, particlesPool) => {
        for (let i = 0; i < 8; i++) {
            particlesPool.get(x, y, color);
        }
    }
};

class Particle {
    constructor() {
        this.active = false;
    }
    init(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.active = true;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.02;
        if (this.life <= 0) this.active = false;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 2, this.y - 2, 4, 4);
        ctx.restore();
    }
}
