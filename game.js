const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 适配画布
function resizeCanvas(){
    canvas.width=innerWidth;
    canvas.height=innerHeight;
}
resizeCanvas();
addEventListener("resize",resizeCanvas);

//===== 基础配置 =====
const TILE=32;
const GRAV=0.5;
const JUMP=12;
const SPD=5;

// 方块类型：0空 1泥土 2草 3石头 4木头
const BLOCK_COLOR={
    1:"#8B4513",
    2:"#32CD32",
    3:"#808080",
    4:"#a0522d"
};

//===== 玩家 =====
let player={
    x:200,y:200,w:28,h:32,
    vx:0,vy:0,onGround:false,
    hp:100,maxHp:100
};

// 背包&选中
let inv=[
    {id:1,count:99},
    {id:2,count:99},
    {id:3,count:99},
    {id:4,count:99}
];
let selectSlot=0;

//===== 世界 & 相机 =====
let world={};
let camera={x:0,y:0};

//===== 怪物系统 =====
let monsters=[];
function spawnMonster(){
    monsters.push({
        x:Math.random()*2000-500,
        y:300,w:28,h:28,
        hp:30,vx:0,speed:1.2
    });
}
for(let i=0;i<12;i++)spawnMonster();

//===== 按键 =====
const keys={left:false,right:false,up:false,dig:false,place:false};

//===== 生成地形 =====
function genWorld(){
    let base=Math.floor(canvas.height/TILE/2)+6;
    for(let x=-80;x<220;x++){
        let h=base+Math.floor(Math.random()*4)-2;
        for(let y=h;y<h+20;y++){
            let t=1;
            if(y===h)t=2;
            if(y>h+4)t=3;
            if(Math.random()<0.02)t=4;
            world[`${x},${y}`]=t;
        }
    }
}

//===== 碰撞工具 =====
function getTile(px,py){
    let tx=Math.floor(px/TILE);
    let ty=Math.floor(py/TILE);
    return world[tx+","+ty]||0;
}
function isSolid(x,y){return getTile(x,y)!==0;}

//===== 挖掘放置 =====
function dig(){
    let cx=player.x+player.w/2;
    let cy=player.y+player.h/2;
    let tx=Math.floor(cx/TILE);
    let ty=Math.floor(cy/TILE);
    let key=`${tx},${ty}`;
    if(world[key]){
        delete world[key];
    }
}
function place(){
    let it=inv[selectSlot];
    if(!it||it.count<=0)return;
    let cx=player.x+player.w/2;
    let cy=player.y+player.h/2;
    let tx=Math.floor(cx/TILE);
    let ty=Math.floor(cy/TILE);
    world[`${tx},${ty}`]=it.id;
}

//===== 键盘监听 =====
addEventListener("keydown",e=>{
    if(e.key=="a"||e.key=="ArrowLeft")keys.left=true;
    if(e.key=="d"||e.key=="ArrowRight")keys.right=true;
    if(e.key=="w"||e.key=="ArrowUp")keys.up=true;
    if(e.key=="j")keys.dig=true;
    if(e.key=="k")keys.place=true;
    // 数字切换物品
    if(e.key>="1"&&e.key<="4")selectSlot=Number(e.key)-1;
});
addEventListener("keyup",e=>{
    if(e.key=="a"||e.key=="ArrowLeft")keys.left=false;
    if(e.key=="d"||e.key=="ArrowRight")keys.right=false;
    if(e.key=="w"||e.key=="ArrowUp")keys.up=false;
    if(e.key=="j")keys.dig=false;
    if(e.key=="k")keys.place=false;
});

//===== 手机按钮绑定 =====
function bindBtn(id,k){
    let b=document.getElementById(id);
    b.addEventListener("touchstart",e=>{e.preventDefault();keys[k]=true;});
    b.addEventListener("touchend",()=>keys[k]=false);
}
bindBtn("leftBtn","left");
bindBtn("rightBtn","right");
bindBtn("jumpBtn","up");
bindBtn("digBtn","dig");
bindBtn("placeBtn","place");

//===== 渲染物品栏UI =====
function renderInvUI(){
    let box=document.getElementById("inv");
    box.innerHTML="";
    inv.forEach((item,i)=>{
        let s=document.createElement("div");
        s.className="inv-slot"+(i===selectSlot?" selected":"");
        s.innerText=item.count;
        s.style.background=BLOCK_COLOR[item.id];
        s.onclick=()=>selectSlot=i;
        box.appendChild(s);
    });
    // 更新血条
    document.getElementById("hp-fill").style.width=(player.hp/player.maxHp*100)+"%";
}

//===== 怪物逻辑更新 =====
function updateMonsters(){
    monsters.forEach(m=>{
        // 向玩家移动
        if(m.x<player.x)m.vx=m.speed;
        else m.vx=-m.speed;
        m.x+=m.vx;

        // 怪物重力落地
        if(!isSolid(m.x,m.y+m.h+2)) m.y+=3;

        // 碰玩家扣血
        if(
            m.x<player.x+player.w&&
            m.x+m.w>player.x&&
            m.y<player.y+player.h&&
            m.y+m.h>player.y
        ){
            player.hp-=0.3;
        }
    })
}

//===== 游戏主更新 =====
function update(){
    // 水平移动
    player.vx=0;
    if(keys.left)player.vx=-SPD;
    if(keys.right)player.vx=SPD;

    // 跳跃
    if(keys.up&&player.onGround) {
        player.vy=-JUMP;
        player.onGround=false;
    }

    // 重力
    player.vy+=GRAV;

    // 挖放
    if(keys.dig)dig();
    if(keys.place)place();

    // X碰撞
    player.x+=player.vx;
    if(isSolid(player.x,player.y)||isSolid(player.x+player.w,player.y)){
        player.x-=player.vx;
    }

    // Y碰撞
    player.onGround=false;
    player.y+=player.vy;
    if(isSolid(player.x,player.y+player.h)||isSolid(player.x+player.w,player.y+player.h)){
        player.y=Math.floor(player.y/TILE)*TILE;
        player.vy=0;
        player.onGround=true;
    }

    // 血量保护
    if(player.hp<=0)player.hp=player.maxHp;

    // 相机跟随
    camera.x=player.x-canvas.width/2;
    camera.y=player.y-canvas.height/2;

    updateMonsters();
    renderInvUI();
}

//===== 绘制 =====
function draw(){
    ctx.fillStyle="#87CEEB";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // 绘制方块
    for(let k in world){
        let [x,y]=k.split(",").map(Number);
        let t=world[k];
        let sx=x*TILE-camera.x;
        let sy=y*TILE-camera.y;
        if(sx<-TILE||sx>canvas.width)continue;
        if(sy<-TILE||sy>canvas.height)continue;
        ctx.fillStyle=BLOCK_COLOR[t];
        ctx.fillRect(sx,sy,TILE-1,TILE-1);
    }

    // 绘制怪物
    ctx.fillStyle="#9b59b6";
    monsters.forEach(m=>{
        let mx=m.x-camera.x;
        let my=m.y-camera.y;
        ctx.fillRect(mx,my,m.w,m.h);
    })

    // 绘制玩家
    ctx.fillStyle="#ff6b6b";
    ctx.fillRect(player.x-camera.x,player.y-camera.y,player.w,player.h);
}

// 循环
function loop(){
    update();draw();requestAnimationFrame(loop);
}

genWorld();
loop();