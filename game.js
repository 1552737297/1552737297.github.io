const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 画布自适应（原有保留）
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 游戏常量（原有保留）
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

// 玩家对象（原有保留）
let player = {
    x: 200, y: 200, w: 28, h: 32,
    vx: 0, vy: 0, onGround: false,
    hp: 100, maxHp: 100,
    invincible: false, invTime: 0
};

// 人物动画变量（原有保留）
let animTimer = 0;
let walkFrame = 0;

// 物品系统：10格快捷栏 + 40格背包（原有保留）
const HOTBAR_SIZE = 10;
const BACKPACK_SIZE = 40;
let hotbar = Array(HOTBAR_SIZE).fill(null).map(() => ({ id: 0, count: 0 }));
let backpack = Array(BACKPACK_SIZE).fill(null).map(() => ({ id: 0, count: 0 }));
let selectSlot = 0;

// 初始化物品（原有保留）
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

// 游戏世界/相机/怪物（原有保留）
let world = {};
let camera = { x: 0, y: 0 };
let monsters = [];
const MONSTER_MAX = 6;

// 生成怪物（原有保留）
function spawnMonster() {
    if (monsters.length >= MONSTER_MAX) return;
    monsters.push({
        x: Math.random() * 1800 - 400,
        y: 200, w: 28, h: 28,
        hp: 30, speed: 1.1
    });
}
for (let i = 0; i < 6; i++) spawnMonster();

// 按键状态（原有保留）
const keys = {
    left: false, right: false, up: false,
    dig: false, place: false,
    digCD: 0, placeCD: 0
};

// 生成世界（原有保留）
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

// 地图相关方法（原有保留）
function getTile(px, py) {
    let tx = Math.floor(px / TILE);
    let ty = Math.floor(py / TILE);
    return world[`${tx},${ty}`] || 0;
}
function isSolid(x, y) {
    return getTile(x, y) !== 0;
}

// 挖掘方块（原有保留）
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

// 放置方块（原有保留）
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

// 物品添加到背包（原有保留）
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

// 键盘事件（原有保留）
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
    if (e.key === 'j') keys.dig = false;
    if (e.key === 'k') keys.place = false;
});

// 移动端按键绑定（原有保留）
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

// 渲染10格快捷栏UI（微调：数量文字用span包裹，适配CSS定位）
function renderHotbarUI() {
    const hotbarEl = document.getElementById('hotbar');
    hotbarEl.innerHTML = '';
    hotbar.forEach((item, i) => {
        let slot = document.createElement('div');
        slot.className = `inv-slot ${i === selectSlot ? 'selected' : ''} ${item.id === 0 ? 'empty' : ''}`;
        slot.style.backgroundColor = item.id !== 0 ? BLOCK_COLOR[item.id] : '';
        // 数量文字用span包裹，方便CSS定位到右下角
        const countSpan = document.createElement('span');
        countSpan.innerText = item.count > 0 ? item.count : '';
        slot.appendChild(countSpan);
        // 点击切换选中格
        slot.onclick = () => {
            selectSlot = i;
            renderHotbarUI();
        };
        hotbarEl.appendChild(slot);
    });
    // 血条更新
    const hpPer = Math.max(0, player.hp / player.maxHp * 100);
    document.getElementById('hp-fill').style.width = hpPer + '%';
}

// 渲染背包UI（微调：数量文字用span包裹）
function renderBackpackUI() {
    const backpackGrid = document.getElementById('backpackGrid');
    backpackGrid.innerHTML = '';
    // 背包顶部显示10格快捷栏
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
    // 背包主体40格
    backpack.forEach((item, i) => {
        let slot = document.createElement('div');
        slot.className = `inv-slot ${item.id === 0 ? 'empty' : ''}`;
        slot.style.backgroundColor = item.id !== 0 ? BLOCK_COLOR[item.id] : '';
        const countSpan = document.createElement('span');
        countSpan.innerText = item.count > 0 ? item.count : '';
        slot.appendChild(countSpan);
        // 点击背包物品：移动到快捷栏空位置
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

// 怪物更新（原有保留）
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

// 游戏主更新逻辑（原有保留）
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

    // 人物动画
    animTimer++;
    if(animTimer >= 8){
        animTimer = 0;
        walkFrame = (walkFrame + 1) % 2;
    }
}

// 游戏绘制逻辑（原有完全保留）
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
    // 玩家绘制
    let px = player.x - camera.x;
    let py = player.y - camera.y;
    if (player.invincible && Math.floor(Date.now() / 80) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    } else {
        ctx.globalAlpha = 1;
    }
    let isMoving = Math.abs(player.vx) > 0;
    // 头皮肤
    ctx.fillStyle = "#ffd6b9";
    ctx.fillRect(px + 4, py, 20, 12);
    // 头发
    ctx.fillStyle = "#603813";
    ctx.fillRect(px + 4, py, 20, 4);
    // 眼睛
    ctx.fillStyle = "#000000";
    ctx.fillRect(px + 8, py + 4, 3, 3);
    ctx.fillRect(px + 14, py + 4, 3, 3);
    // 上衣
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(px + 3, py + 12, 22, 10);
    // 手臂动画
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
    // 腿部动画
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

// 游戏主循环（原有保留）
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// 初始化执行
renderBackpackUI();
genWorld();
loop();