const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 画布自适应
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ==================== 游戏配置 ====================
const TILE_SIZE = 32;       // 方块大小
const PLAYER_SPEED = 5;     // 移动速度
const JUMP_POWER = 12;      // 跳跃力度
const GRAVITY = 0.5;        // 重力

// 玩家对象
let player = {
    x: 200,
    y: 200,
    width: 28,
    height: 32,
    velX: 0,
    velY: 0,
    onGround: false,
    color: '#ff6b6b'
};

// 按键状态
const keys = {
    left: false, right: false, up: false,
    dig: false, place: false
};

// 世界方块 (type: 0空 1泥土 2草地 3石头)
let world = {};
let camera = { x: 0, y: 0 };

// ==================== 地形生成 ====================
function generateWorld() {
    let groundY = Math.floor(canvas.height / TILE_SIZE / 2) + 5;
    
    for (let x = -50; x < 150; x++) {
        // 随机高度
        let h = groundY + Math.floor(Math.random() * 3) - 1;
        
        for (let y = h; y < h + 15; y++) {
            let type = 1;
            if (y === h) type = 2;       // 顶层草地
            if (y > h + 3) type = 3;     // 深处石头
            world[`${x},${y}`] = type;
        }
    }
}

// ==================== 输入控制 ====================
// 电脑键盘
document.addEventListener('keydown', e => {
    if(e.key === 'a' || e.key === 'ArrowLeft') keys.left = true;
    if(e.key === 'd' || e.key === 'ArrowRight') keys.right = true;
    if(e.key === 'w' || e.key === 'ArrowUp') keys.up = true;
    if(e.key === 'j') keys.dig = true;
    if(e.key === 'k') keys.place = true;
});
document.addEventListener('keyup', e => {
    if(e.key === 'a' || e.key === 'ArrowLeft') keys.left = false;
    if(e.key === 'd' || e.key === 'ArrowRight') keys.right = false;
    if(e.key === 'w' || e.key === 'ArrowUp') keys.up = false;
    if(e.key === 'j') keys.dig = false;
    if(e.key === 'k') keys.place = false;
});

// 手机触屏按钮
function bindBtn(id, key) {
    const btn = document.getElementById(id);
    btn.addEventListener('touchstart', () => keys[key] = true);
    btn.addEventListener('touchend', () => keys[key] = false);
}
bindBtn('leftBtn', 'left');
bindBtn('rightBtn', 'right');
bindBtn('jumpBtn', 'up');
bindBtn('digBtn', 'dig');
bindBtn('placeBtn', 'place');

// ==================== 碰撞检测 ====================
function getTile(x, y) {
    return world[`${Math.floor(x/TILE_SIZE)},${Math.floor(y/TILE_SIZE)}`] || 0;
}

function collide(x, y) {
    return getTile(x, y) !== 0;
}

// ==================== 挖掘 & 放置 ====================
function digBlock() {
    let tx = Math.floor((player.x + player.width/2) / TILE_SIZE);
    let ty = Math.floor((player.y + player.height/2) / TILE_SIZE);
    delete world[`${tx},${ty}`];
}

function placeBlock() {
    let tx = Math.floor((player.x + player.width/2) / TILE_SIZE);
    let ty = Math.floor((player.y + player.height/2) / TILE_SIZE);
    world[`${tx},${ty}`] = 1;
}

// ==================== 游戏更新 ====================
function update() {
    // 移动
    player.velX = 0;
    if(keys.left) player.velX = -PLAYER_SPEED;
    if(keys.right) player.velX = PLAYER_SPEED;
    
    // 跳跃
    if(keys.up && player.onGround) {
        player.velY = -JUMP_POWER;
        player.onGround = false;
    }
    
    // 重力
    player.velY += GRAVITY;
    
    // 挖掘放置
    if(keys.dig) digBlock();
    if(keys.place) placeBlock();
    
    // X轴碰撞
    player.x += player.velX;
    if(collide(player.x, player.y) || collide(player.x+player.width, player.y)) {
        player.x -= player.velX;
    }
    
    // Y轴碰撞
    player.onGround = false;
    player.y += player.velY;
    if(collide(player.x, player.y+player.height) || collide(player.x+player.width, player.y+player.height)) {
        player.y = Math.floor(player.y/TILE_SIZE) * TILE_SIZE;
        player.velY = 0;
        player.onGround = true;
    }
    
    // 摄像机跟随
    camera.x = player.x - canvas.width/2;
    camera.y = player.y - canvas.height/2;
}

// ==================== 渲染 ====================
function draw() {
    // 清空屏幕
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    
    // 绘制方块
    for(let key in world) {
        let [x, y] = key.split(',').map(Number);
        let type = world[key];
        
        let rx = x * TILE_SIZE - camera.x;
        let ry = y * TILE_SIZE - camera.y;
        
        if(rx < -TILE_SIZE || rx > canvas.width) continue;
        if(ry < -TILE_SIZE || ry > canvas.height) continue;
        
        // 方块颜色
        if(type === 1) ctx.fillStyle = '#8B4513';    // 泥土
        if(type === 2) ctx.fillStyle = '#32CD32';    // 草地
        if(type === 3) ctx.fillStyle = '#808080';    // 石头
        
        ctx.fillRect(rx, ry, TILE_SIZE-1, TILE_SIZE-1);
    }
    
    // 绘制玩家
    ctx.fillStyle = player.color;
    ctx.fillRect(
        player.x - camera.x,
        player.y - camera.y,
        player.width,
        player.height
    );
}

// ==================== 主循环 ====================
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// 启动游戏
generateWorld();
loop();