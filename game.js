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
    1: "#8B4513", 2: "#32CD32", 3: "#808080", 4: "#a0522d"
};

let player = {
    x: 200, y: 200, w: 28, h: 32,
    vx: 0, vy: 0, onGround: false,
    hp: 100, maxHp: 100,
    invincible: false, invTime: 0
};

let animTimer = 0;
let walkFrame = 0;

const HOTBAR_SIZE = 10;
const BACKPACK_SIZE = 40;
let hotbar = Array(HOTBAR_SIZE).fill(null).map(() => ({ id: 0, count: 0 }));
let backpack = Array(BACKPACK_SIZE).fill(null).map(() => ({ id: 0, count: 0 }));
let selectSlot = 0;

function initInventory() {
    hotbar[0] = { id: 1, count: 99 };
    hotbar[1] = { id: 2, count: 99 };
    hotbar[2] = { id: 3, count: 99 };
    hotbar[3] = { id: 4, count: 99 };
    for (let i = 0; i < 10; i++) {
        const randomId = Math.floor(Math.random() * 4) + 1;
        backpack[i] = { id: randomId, count: Math.floor(Math.random() * 99) + 1 };
    }
}
initInventory();

let world = {};
let camera = { x: 0, y: 0 };
let monsters = [];
const MONSTER_MAX = 6;

function spawnMonster() {
    if (monsters.length >= MONSTER_MAX) return;
    monsters.push({
        x: Math.random() * 1800 - 400, y: 200, w: 28, h: 28, hp: 30, speed: 1.1
    });
}
for (let i = 0; i < 6; i++) spawnMonster();

const keys = {
    left: false, right: false, up: false, dig: false, place: false, digCD: 0, placeCD: 0
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
    const blockId = world[key];
    if (blockId) {
        delete world[key];
        addItemToBackpack(blockId, 1);
    }
}

function place() {
    const selectedItem = hotbar[selectSlot];
    if (!selectedItem || selectedItem.id === 0 || selectedItem.count <= 0) return;
    
    let cx = player.x + player.w / 2;
    let cy = player.y + player.h / 2;
    let tx = Math.floor(cx / TILE);
    let ty = Math.floor(cy / TILE);
    world[`${tx},${ty}`] = selectedItem.id;
    
    selectedItem.count--;
    if (selectedItem.count <= 0) {
        selectedItem.id = 0;
        selectedItem.count = 0;
    }
    renderHotbarUI();
    renderBackpackUI();
}

function addItemToBackpack(itemId, count) {
    for (let slot of [...hotbar, ...backpack]) {
        if (slot.id === itemId && slot.count < 99) {
            const addCount = Math.min(count, 99 - slot.count);
            slot.count += addCount;
            count -= addCount;
            if (count <= 0) break;
        }
    }
    if (count > 0) {
        for (let slot of hotbar) {
            if (slot.id === 0) {
                slot.id = itemId;
                slot.count = Math.min(count, 99);
                count -= slot.count;
                if (count <= 0) break;
            }
        }
    }
    if (count > 0) {
        for (let slot of backpack) {
            if (slot.id === 0) {
                slot.id = itemId;
                slot.count = Math.min(count, 99);
                count -= slot.count;
                if (count <= 0) break;
            }
        }
    }
    renderHotbarUI();
    renderBackpackUI();
}

document.addEventListener('keydown', e => {
    if (e.key === 'a' || e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'd' || e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'w' || e.key === 'ArrowUp') keys.up = true;
    if (e.key === 'j') keys.dig = true;
    if (e.key === 'k') keys.place = true;
    if (e.key >= '1' && e.key <= '9') selectSlot = parseInt(e.key) - 1;
    if (e.key === '0') selectSlot = 9;
});
document.addEventListener('keyup', e => {
    if (e.key === 'a' || e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'd' || e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'w' || e.key === 'ArrowUp') keys.up = false;
    if (e.key === 'j') dig = false;
    if (e.key === 'k') place = false;
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

function renderHotbarUI() {
    const hotbarEl = document.getElementById('hotbar');
    hotbarEl.innerHTML = '';
    hotbar.forEach((item, i) => {
        let slot = document.createElement('div');
        slot.className = `inv-slot ${i === selectSlot ? 'selected' : ''} ${item.id === 0 ? 'empty' : ''}`;
        slot.style.backgroundColor = item.id !== 0 ? BLOCK_COLOR[item.id] : '';
        const countSpan = document.createElement('span');
        countSpan.innerText = item.count > 0 ? item.count : '';
        slot.appendChild(countSpan);
        slot.onclick = () => {
            selectSlot = i;
            renderHotbarUI();
        };
        hotbarEl.appendChild(slot);
    });
    const hpPer = Math.max(0, player.hp / player.maxHp * 100);
    document.getElementById('hp-fill').style.width = hpPer + '%';
}

function renderBackpackUI() {
    const backpackGrid = document.getElementById('backpackGrid');
    backpackGrid.innerHTML = '';
    hotbar.forEach((item, i) => {
        let slot = document.createElement('div');
        slot.className = `inv-slot ${item.id === 0 ? 'empty' : ''}`;
        slot.style.backgroundColor = item.id !== 0 ? BLOCK_COLOR[item.id] : '';
        const countSpan = document.createElement('span');
        countSpan.innerText = item.count > 0 ? item.count : '';
        slot.appendChild(countSpan);
        slot.onclick = () => {
            selectSlot = i;
            renderHotbarUI();
        };
        backpackGrid.appendChild(slot);
    });
    backpack.forEach((item, i) => {
        let slot = document.createElement('div');
        slot.className = `inv-slot ${item.id === 0 ? 'empty' : ''}`;
        slot.style.backgroundColor = item.id !== 0 ? BLOCK_COLOR[item.id] : '';
        const countSpan = document.createElement('span');
        countSpan.innerText = item.count > 0 ? item.count : '';
        slot.appendChild(countSpan);
        slot.onclick = () => {
            if (item.id === 0) return;
            const emptySlotIndex = hotbar.findIndex(s => s.id === 0);
            if (emptySlotIndex !== -1) {
                hotbar[emptySlotIndex] = { ...item };
                backpack[i] = { id: 0, count: 0 };
                renderHotbarUI();
                renderBackpackUI();
            }
        };
        backpackGrid.appendChild(slot);
    });
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
    renderHotbarUI();

    animTimer++;
    if(animTimer >= 8){
        animTimer = 0;
        walkFrame = (walkFrame + 1) % 2;
    }
}

function draw() {
    ctx.fillStyle = '#87CEB8';
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
    let px = player.x - camera.x;
    let py = player.y - camera.y;
    if (player.invincible && Math.floor(Date.now() / 80) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    } else {
        ctx.globalAlpha = 1;
    }
    let isMoving = Math.abs(player.vx) > 0;
    ctx.fillStyle = "#ffd6b9";
    ctx.fillRect(px + 4, py, 20, 12);
    ctx.fillStyle = "#603813";
    ctx.fillRect(px + 4, py, 20, 4);
    ctx.fillStyle = "#000000";
    ctx.fillRect(px + 8, py + 4, 3, 3);
    ctx.fillRect(px + 14, py + 4, 3, 3);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(px + 3, py + 12, 22, 10);
    ctx.fillStyle = "#ffd6b9";
    if(isMoving && player.onGround){
        if(walkFrame === 0){
            ctx.fillRect(px, py + 12, 4, 8);
            ctx.fillRect(px + 24, py + 14, 4, 8);
        }else{
            ctx.fillRect(px, py + 14, 4, 8);
            ctx.fillRect(px + 24, py + 12, 4, 8);
        }
    }else{
        ctx.fillRect(px, py + 12, 4, 10);
        ctx.fillRect(px + 24, py + 12, 4, 10);
    }
    ctx.fillStyle = "#34495e";
    if(!player.onGround){
        ctx.fillRect(px + 4, py + 22, 7, 9);
        ctx.fillRect(px + 17, py + 22, 7, 9);
    }else if(isMoving){
        if(walkFrame === 0){
            ctx.fillRect(px + 4, py + 22, 8, 10);
            ctx.fillRect(px + 16, py + 24, 8, 8);
        }else{
            ctx.fillRect(px + 4, py + 24, 8, 8);
            ctx.fillRect(px + 16, py + 22, 8, 10);
        }
    }else{
        ctx.fillRect(px + 4, py + 22, 8, 10);
        ctx.fillRect(px + 16, py + 22, 8, 10);
    }
    ctx.globalAlpha = 1;
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

renderBackpackUI();
genWorld();
loop();