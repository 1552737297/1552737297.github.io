const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 适配画布
function resizeCanvas(){
    canvas.width = innerWidth;
    canvas.height = innerHeight;
}
resizeCanvas();
addEventListener("resize", resizeCanvas);

//===== 基础配置 =====
const TILE = 32;
const GRAV = 0.5;
const JUMP = 12;
const SPD = 5;
const MONSTER_MAX = 6;  // 限制怪物数量防卡顿

// 方块类型：0空 1泥土 2草 3石头 4木头
const BLOCK_COLOR = {
    1:"#8B4513",
    2:"#32CD32",
    3:"#808080",
    4:"#a0522d"
};

//===== 玩家 =====
let player = {
    x:200, y:200, w:28, h:32,
    vx:0, vy:0, onGround:false,
    hp:100, maxHp:100,
    invincible: false, invTime:0 // 无敌保护
};

// 背包&选中
let inv = [
    {id:1,count:99},
    {id:2,count:99},
    {id:3,count:99},
    {id:4,count:99}
];
let selectSlot = 0;

//===== 世界 & 相机 =====
let world = {};
let camera = {x:0, y:0};

//===== 怪物系统 =====
let monsters = [];
function spawnMonster(){
    if(monsters.length >= MONSTER_MAX) return;
    monsters.push({
        x: Math.random() * 1800 - 400,
        y: 200, w:28, h:28,
        hp:30, vx:0, speed:1.1
    });
}
// 初始少量怪物
for(let i = 0; i < 6; i++) spawnMonster();

//===== 按键 + 防连点防抖 =====
const keys = {
    left:false, right:false, up:false,
    dig:false, place:false,
    digCD:0, placeCD:0 // 冷却防刷屏
};

//===== 生成平坦稳定地形 =====
function genWorld(){
    let baseY = Math.floor(canvas.height / TILE / 2) + 6;
    for(let x = -60; x < 180; x++){
        let groundH = baseY + Math.floor(Math.random() * 3) -1;
        for(let y = groundH; y < groundH + 16; y++){
            let type = 1;
            if(y === groundH) type = 2;
            if(y > groundH + 4) type = 3;
            if(Math.random() < 0.015) type = 4;
            world[`${x},${y}`] = type;
        }
    }
}

//===== 碰撞工具 =====
function getTile(px, py){
    let tx = Math.floor(px / TILE);
    let ty = Math.floor(py / TILE);
    return world[tx + "," + ty] || 0;
}
function isSolid(x, y){ return getTile(x, y) !== 0; }

//===== 挖掘放置（加冷却+扣物品数量） =====
function dig(){
    let cx = player.x + player.w / 2;
    let cy = player.y + player.h / 2;
    let tx = Math.floor(cx / TILE);
    let ty = Math.floor(cy / TILE);
    let key = `${tx},${ty}`;
    if(world[key]) delete world[key];
}
function place(){
    let item = inv[selectSlot];
    if(!item || item.count <= 0) return;

    let cx = player.x + player.w / 2;
    let cy = player.y + player.h / 2;
    let tx = Math.floor(cx / TILE);
    let ty = Math.floor(cy / TILE);
    world[`${tx},${ty}`] = item.id;
    item.count --;
}

//===== 键盘监听 =====
addEventListener("keydown", e=>{
    if(e.key === "a" || e.key === "ArrowLeft") keys.left = true;
    if(e.key === "d" || e.key === "ArrowRight") keys.right = true;
    if(e.key === "w" || e.key === "ArrowUp") keys.up = true;
    if(e.key === "j") keys.dig = true;
    if(e.key === "k") keys.place = true;
    // 数字切换物品
    if(e.key >= "1" && e.key <= "4") selectSlot = Number(e.key)-1;
});
addEventListener("keyup", e=>{
    if(e.key === "a" || e.key === "ArrowLeft") keys.left = false;
    if(e.key === "d" || e.key === "ArrowRight") keys.right = false;
    if(e.key === "w" || e.key === "ArrowUp") keys.up = false;
    if(e.key === "j") keys.dig = false;
    if(e.key === "k") keys.place = false;
});

//===== 手机按钮防抖绑定 =====
function bindBtn(id, k){
    const btn = document.getElementById(id);
    btn.addEventListener("touchstart", e=>{
        e.preventDefault();
        keys[k] = true;
    });
    btn.addEventListener("touchend", ()=> keys[k] = false);
    btn.addEventListener("touchcancel", ()=> keys[k] = false);
}
bindBtn("leftBtn","left");
bindBtn("rightBtn","right");
bindBtn("jumpBtn","up");
bindBtn("digBtn","dig");
bindBtn("placeBtn","place");

//===== 渲染物品栏UI =====
function renderInvUI(){
    let box = document.getElementById("inv");
    box.innerHTML = "";
    inv.forEach((item,i)=>{
        let s = document.createElement("div");
        s.className = "inv-slot" + (i === selectSlot ? " selected" : "");
        s.innerText = item.count;
        s.style.background = BLOCK_COLOR[item.id];
        s.onclick = ()=> selectSlot = i;
        box.appendChild(s);
    });
    // 更新血条
    let hpPercent = Math.max(0, player.hp / player.maxHp * 100);
    document.getElementById("hp-fill").style.width = hpPercent + "%";
}

//===== 怪物逻辑修复（防浮空、防卡死） =====
function updateMonsters(){
    monsters.forEach(m=>{
        // AI追踪玩家
        if(m.x < player.x - 10) m.x += m.speed;
        else if(m.x > player.x + 10) m.x -= m.speed;

        // 怪物重力+落地判定修复
        if(!isSolid(m.x + 4, m.y + m.h + 2)){
            m.y += 2.2;
        }

        // 受伤判定 + 无敌保护
        if(
            !player.invincible &&
            m.x < player.x + player.w &&
            m.x + m.w > player.x &&
            m.y < player.y + player.h &&
            m.y + m.h > player.y
        ){
            player.hp -= 8;
            player.invincible = true;
            player.invTime = 60;
        }
    })
}

//===== 游戏主更新 =====
function update(){
    // 冷却计时器
    if(keys.digCD > 0) keys.digCD --;
    if(keys.placeCD > 0) keys.placeCD --;
    if(player.invTime > 0){
        player.invTime --;
        if(player.invTime <=0) player.invincible = false;
    }

    // 水平移动
    player.vx = 0;
    if(keys.left) player.vx = -SPD;
    if(keys.right) player.vx = SPD;

    // 跳跃
    if(keys.up && player.onGround) {
        player.vy = -JUMP;
        player.onGround = false;
    }

    // 重力
    player.vy += GRAV;

    // 挖掘放置 加冷却防狂点
    if(keys.dig && keys.digCD <=0){
        dig();
        keys.digCD = 12;
    }
    if(keys.place && keys.placeCD <=0){
        place();
        keys.placeCD = 12;
    }

    // X轴碰撞修正
    player.x += player.vx;
    if(isSolid(player.x+2, player.y+4) || isSolid(player.x+player.w-2, player.y+4)){
        player.x -= player.vx;
    }

    // Y轴碰撞修正 防卡地
    player.onGround = false;
    player.y += player.vy;
    if(isSolid(player.x+4, player.y+player.h) || isSolid(player.x+player.w-4, player.y+player.h)){
        player.vy = 0;
        player.onGround = true;
        // 对齐网格防止悬浮
        player.y = Math.floor(player.y / TILE) * TILE;
    }

    // 死亡重生保护
    if(player.hp <= 0){
        player.hp = player.maxHp;
        player.x = 200;
        player.y = 200;
    }

    // 相机平滑跟随
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    updateMonsters();
    renderInvUI();
}

//===== 绘制 =====
function draw(){
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // 绘制方块
    for(let k in world){
        let [x,y] = k.split(",").map(Number);
        let t = world[k];
        let sx = x * TILE - camera.x;
        let sy = y * TILE - camera.y;
        if(sx < -TILE || sx > canvas.width) continue;
        if(sy < -TILE || sy > canvas.height) continue;
        ctx.fillStyle = BLOCK_COLOR[t];
        ctx.fillRect(sx, sy, TILE-1, TILE-1);
    }

    // 绘制怪物
    ctx.fillStyle = "#9b59b6";
    monsters.forEach(m=>{
        let mx = m.x - camera.x;
        let my = m.y - camera.y;
        ctx.fillRect(mx, my, m.w, m.h);
    })

    // 玩家闪烁无敌效果
    if(player.invincible && Math.floor(Date.now()/80) %2 ===0){
        ctx.globalAlpha = 0.5;
    }else{
        ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#ff6b6b";
    ctx.fillRect(player.x - camera.x, player.y - camera.y, player.w, player.h);
    ctx.globalAlpha = 1;
}

// 主循环
function loop(){
    update();
    draw();
    requestAnimationFrame(loop);
}

// 启动游戏
genWorld();
loop();