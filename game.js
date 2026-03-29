const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const TILE = 32;
const GRAV = 0.5;
const JUMP = 12;
const SPD = 5;

const BLOCK_COLOR = {
    1: "#8B4513",
    2: "#32CD32",
    3: "#808080",
    4: "#a0522d"
};

let player = {
    x: 200, y: 200, w: 28, h: 32,
    vx: 0, vy: 0, onGround: false,
    hp: 100, maxHp: 100,
    invincible: false, invTime: 0
};

let inv = [
    { id: 1, count: 99 },
    { id: 2, count: 99 },
    { id: 3, count: 99 },
    { id: 4, count: 99 }
];
let selectSlot = 0;

let world = {};
let camera = { x: 0, y: 0 };

let monsters = [];
const MONSTER_MAX = 6;

function spawnMonster() {
    if (monsters.length >= MONSTER_MAX) return;
    monsters.push({
        x: Math.random() * 1800 - 400,
        y: 200, w: 28, h: 28,
        hp: 30, speed: 1.1
    });
}

for (let i = 0; i < 6; i++) spawnMonster();

const keys = {
    left: false, right: false, up: false,
    dig: false, place: false,
    digCD: 0, placeCD: 0
};

function genWorld() {
    let baseY = Math.floor(canvas.height / TILE / 2) + 6;
    for (let x = -60; x < 180; x++) {
        let h = baseY + Math.floor(Math.random() * 3) - 1;
        for (let y = h; y < h + 16; y++) {
            let t = 1;
            if (y === h) t = 2;
            if (y > h + 4) t = 3;
            if (Math.random() < 0.015) t = 4;
            world[`${x},${y}`] = t;
        }
    }
}

function getTile(px, py) {
    let tx = Math.floor(px / TILE);
    let ty = Math.floor(py / TILE);
    return world[`${tx},${ty}`] || 0;
}

function isSolid(x, y) {
    return getTile(x, y) !== 0;
}

function dig() {
    let cx = player.x + player.w / 2;
    let cy = player.y + player.h / 2;
    let tx = Math.floor(cx / TILE);
    let ty = Math.floor(cy / TILE);
    let key = `${tx},${ty}`;
    if (world[key]) delete world[key];
}

function place() {
    let item = inv[selectSlot];
    if (!item || item.count <= 0) return;
    let cx = player.x + player.w / 2;
    let cy = player.y + player.h / 2;
    let tx = Math.floor(cx / TILE);
    let ty = Math.floor(cy / TILE);
    world[`${tx},${ty}`] = item.id;
    item.count--;
}

document.addEventListener('keydown', e => {
    if (e.key === 'a' || e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'd' || e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'w' || e.key === 'ArrowUp') keys.up = true;
    if (e.key === 'j') keys.dig = true;
    if (e.key === 'k') keys.place = true;
    if (e.key >= '1' && e.key <= '4') selectSlot = parseInt(e.key) - 1;
});

document.addEventListener('keyup', e => {
    if (e.key === 'a' || e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'd' || e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'w' || e.key === 'ArrowUp') keys.up = false;
    if (e.key === 'j') keys.dig = false;
    if (e.key === 'k') keys.place = false;
});

function bindBtn(id, k) {
    const btn = document.getElementById(id);
    btn.addEventListener('touchstart', e => { e.preventDefault(); keys[k] = true; });
    btn.addEventListener('touchend', () => { keys[k] = false; });
    btn.addEventListener('touchcancel', () => { keys[k] = false; });
}

bindBtn('leftBtn', 'left');
bindBtn('rightBtn', 'right');
bindBtn('jumpBtn', 'up');
bindBtn('digBtn', 'dig');
bindBtn('placeBtn', 'place');

function renderInvUI() {
    const box = document.getElementById('inv');
    box.innerHTML = '';
    inv.forEach((item, i) => {
        let slot = document.createElement('div');
        slot.className = 'inv-slot' + (i === selectSlot ? ' selected' : '');
        slot.innerText = item.count;
        slot.style.backgroundColor = BLOCK_COLOR[item.id];
        slot.onclick = () => { selectSlot = i; };
        box.appendChild(slot);
    });
    const hpPer = Math.max(0, player.hp / player.maxHp * 100);
    document.getElementById('hp-fill').style.width = hpPer + '%';
}

function updateMonsters() {
    monsters.forEach(m => {
        if (m.x < player.x - 10) m.x += m.speed;
        else if (m.x > player.x + 10) m.x -= m.speed;

        if (!isSolid(m.x + 4, m.y + m.h + 2)) m.y += 2.2;

        if (!player.invincible &&
            m.x < player.x + player.w &&
            m.x + m.w > player.x &&
            m.y < player.y + player.h &&
            m.y + m.h > player.y) {
            player.hp -= 8;
            player.invincible = true;
            player.invTime = 60;
        }
    });
}

function update() {
    if (keys.digCD > 0) keys.digCD--;
    if (keys.placeCD > 0) keys.placeCD--;
    if (player.invTime > 0) {
        player.invTime--;
        if (player.invTime <= 0) player.invincible = false;
    }

    player.vx = 0;
    if (keys.left) player.vx = -SPD;
    if (keys.right) player.vx = SPD;

    if (keys.up && player.onGround) {
        player.vy = -JUMP;
        player.onGround = false;
    }

    player.vy += GRAV;

    if (keys.dig && keys.digCD <= 0) {
        dig();
        keys.digCD = 12;
    }
    if (keys.place && keys.placeCD <= 0) {
        place();
        keys.placeCD = 12;
    }

    player.x += player.vx;
    if (isSolid(player.x + 2, player.y + 4) || isSolid(player.x + player.w - 2, player.y + 4)) {
        player.x -= player.vx;
    }

    player.onGround = false;
    player.y += player.vy;
    if (isSolid(player.x + 4, player.y + player.h) || isSolid(player.x + player.w - 4, player.y + player.h)) {
        player.vy = 0;
        player.onGround = true;
        player.y = Math.floor(player.y / TILE) * TILE;
    }

    if (player.hp <= 0) {
        player.hp = player.maxHp;
        player.x = 200;
        player.y = 200;
    }

    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    updateMonsters();
    renderInvUI();
}

function draw() {
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let key in world) {
        let [x, y] = key.split(',').map(Number);
        let t = world[key];
        let rx = x * TILE - camera.x;
        let ry = y * TILE - camera.y;
        if (rx < -TILE || rx > canvas.width) continue;
        if (ry < -TILE || ry > canvas.height) continue;
        ctx.fillStyle = BLOCK_COLOR[t];
        ctx.fillRect(rx, ry, TILE - 1, TILE - 1);
    }

    ctx.fillStyle = '#9b59b6';
    monsters.forEach(m => {
        let mx = m.x - camera.x;
        let my = m.y - camera.y;
        ctx.fillRect(mx, my, m.w, m.h);
    });

    if (player.invincible && Math.floor(Date.now() / 80) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    } else {
        ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(player.x - camera.x, player.y - camera.y, player.w, player.h);
    ctx.globalAlpha = 1;
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

genWorld();
loop();