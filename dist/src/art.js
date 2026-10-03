// Original pixel artwork. World coordinates stay independent of display density.
const views = new WeakMap();
const box = (c, color, x, y, w, h) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
function surface(canvas) {
  const r = canvas.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 3);
  const w = Math.max(1, r.width), h = Math.max(1, r.height);
  canvas.width = Math.round(w * d); canvas.height = Math.round(h * d);
  const c = canvas.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.imageSmoothingEnabled = false;
  return { c, w, h };
}
function pine(c, x, y, n = 0) {
  box(c, '#172d25', x+3,y+25,27,6); box(c,'#775d3a',x+14,y+18,5,13);
  box(c,n%2?'#234c37':'#294f38',x+2,y+12,28,13);box(c,'#326441',x+6,y+4,20,19);
  box(c,'#407b4c',x+10,y,12,20);box(c,'#669458',x+12,y+3,4,9);
  box(c,'#1e4933',x+20,y+13,5,10);box(c,'#8b9c61',x+9,y+15,3,2);
}
function tile(c,x,y,theme,wall,n){
  if(theme==='village'){
    box(c,n%2?'#466b47':'#4a704a',x,y,32,32);
    box(c,'#759057',x+5,y+8,2,4);box(c,'#759057',x+7,y+10,2,2);
    if(n%3===0){box(c,'#c7bb73',x+22,y+23,2,2);box(c,'#6e995d',x+21,y+25,4,2);}
    if(wall)pine(c,x,y,n);
  }else{
    const core=theme==='core';
    box(c,wall?'#20343d':core?'#334247':'#465253',x,y,32,32);
    box(c,wall?'#52616a':'#5a6560',x+1,y+1,30,wall?13:29);
    box(c,'#283c43',x+2,y+29,29,3);box(c,'#798179',x+4,y+3,20,1);
    if(wall){box(c,'#1e303b',x,y+15,32,2);box(c,'#394c57',x+3,y+18,26,11);}
    else if(core){box(c,'#365f62',x+15,y,2,32);box(c,'#79ae99',x+15,y+12,2,5);}
    if(n%5===0)box(c,'#7d8a74',x+5,y+21,5,2);
  }
}
function house(c,x,y,inn=false){
  box(c,'#26392c',x-3,y+8,62,44);box(c,'#c1b487',x,y+12,55,35);
  box(c,'#9e956d',x+47,y+12,8,35);box(c,'#593f32',x-5,y+8,65,8);
  box(c,inn?'#547777':'#ad7451',x-3,y,61,13);box(c,inn?'#79938a':'#d09a6a',x+2,y-3,51,6);
  for(let i=0;i<4;i++)box(c,inn?'#658785':'#b88259',x+i*14,y+6,12,2);
  box(c,'#5b6151',x+8,y+20,13,13);box(c,'#c6d0a1',x+9,y+21,10,10);
  box(c,'#605d47',x+14,y+21,2,11);box(c,'#605d47',x+9,y+26,11,2);
  box(c,'#4e4939',x+35,y+23,13,24);box(c,'#8b7855',x+37,y+25,8,20);box(c,'#edca7a',x+42,y+35,2,2);
  box(c,'#a5a083',x+31,y+46,20,4);box(c,'#85735a',x+41,y-8,6,11);
}
function person(c,x,y,color,id,step=0){
  const n=[...id].reduce((a,v)=>a+v.charCodeAt(0),0), player=id==='player';
  box(c,'#19362b90',x+7,y+26,19,5);
  box(c,'#29353c',x+10,y+23,5,7-(step%2));box(c,'#29353c',x+19,y+23,5,6+(step%2));
  box(c,'#1f282d',x+8,y+29-(step%2),7,2);box(c,'#1f282d',x+19,y+29+(step%2),7,2);
  box(c,color||'#91b8ba',x+8,y+14,17,11);box(c,'#d6b38b',x+6,y+15,3,9);box(c,'#d6b38b',x+25,y+15,3,9);
  box(c,n%3===0?'#929b92':n%3===1?'#543f35':'#b78a59',x+10,y+3,13,7);
  box(c,'#ebc9a0',x+11,y+8,11,8);box(c,'#33353a',x+13,y+10,2,2);box(c,'#33353a',x+19,y+10,2,2);
  box(c,'#6b5140',x+8,y+22,17,2);box(c,'#f2d99a',x+15,y+22,3,2);
  if(player){box(c,'#ead381',x+8,y+3,18,3);box(c,'#e9c067',x+9,y+15,4,11);box(c,'#4b6775',x+24,y+18,3,11);box(c,'#d3dfc1',x+25,y+18,1,8);}
  else if(id.includes('mayor')||id.includes('king')){box(c,'#d4c291',x+8,y+2,18,4);box(c,'#f2dc95',x+9,y-1,3,5);box(c,'#f2dc95',x+21,y-1,3,5);box(c,'#d5d9c1',x+12,y+13,10,5);}
  else if(id.includes('shop')){box(c,'#eee0bb',x+12,y+16,10,9);box(c,'#775c3f',x+26,y+21,5,6);}
  else if(id.includes('inn')||id.includes('rest')){box(c,'#e5e6c9',x+9,y+3,15,4);box(c,'#dce0c6',x+12,y+17,10,8);}
  else if(n%2){box(c,'#543c3c',x+21,y+5,4,14);box(c,'#b6c8ba',x+4,y+21,7,5);}
  else{box(c,'#dee0b7',x+8,y+12,18,3);box(c,'#a2936b',x+27,y+12,2,20);}
}
function object(c,e,s){
  const x=e.x*32,y=e.y*32;
  if(e.type==='npc'||e.type==='inn')return person(c,x,y,e.color,e.id);
  if(e.type==='chest'){box(c,'#263b35',x+4,y+23,25,7);box(c,s.flags[e.id]?'#6f6350':'#a9804c',x+4,y+11,25,16);box(c,'#d8b66d',x+4,y+12,25,3);box(c,'#6c5034',x+4,y+19,25,2);box(c,'#f0d28b',x+15,y+17,5,7);}
  else if(e.type==='terminal'){box(c,'#26353e',x+4,y+4,24,26);box(c,'#a1af9a',x+5,y+3,22,2);box(c,'#518b7d',x+7,y+7,18,14);box(c,'#a5d6a3',x+10,y+10,11,2);box(c,'#81bd98',x+10,y+14,7,2);box(c,'#829381',x+8,y+25,16,2);box(c,'#edd58d',x+23,y+24,2,2);}
  else if(e.type==='sign'){box(c,'#725e42',x+14,y+10,4,21);box(c,'#c3ad7c',x+4,y+5,25,16);box(c,'#796944',x+8,y+9,17,2);box(c,'#796944',x+8,y+14,13,2);}
  else if(e.type==='exit'){box(c,'#263735',x+3,y+3,27,27);for(let i=0;i<5;i++)box(c,'#82918a',x+5+i,y+6+i*5,23-i*2,2);box(c,'#bec7a3',x+2,y+1,29,3);}
  else if(e.type==='boss'){box(c,e.color||'#c89472',x+2,y+5,10,20);box(c,e.color||'#c89472',x+21,y+3,10,22);box(c,'#937955',x+7,y+22,22,9);box(c,'#ffe5a1',x+4,y+8,4,3);box(c,'#ffe5a1',x+23,y+6,4,3);}
  else{box(c,'#20352e80',x+4,y+26,25,5);box(c,e.color||'#a6c388',x+5,y+17,24,12);box(c,e.color||'#a6c388',x+9,y+10,16,12);box(c,'#d9e6bd',x+12,y+12,5,3);box(c,'#263b39',x+10,y+21,3,3);box(c,'#263b39',x+21,y+21,3,3);}
}
function goal(s){const f=s.flags;if(!f.complete)return !f.quest?'shop':!f.clerk?'clerk':!f.mayor?'mayor':!f.seal?'seal':!f.boss?'boss':'shop';if(!f.knights){if(s.map==='village')return 'border_gate';if(s.map==='border')return !f.evidence_a?'to_application':!f.evidence_b?'to_network':'to_gate';return s.map==='application'&&!f.evidence_a?'evidence_a':s.map==='network'&&!f.evidence_b?'evidence_b':!f.evidence_c?'evidence_c':'knights';}if(s.map==='gate')return 'to_capital';if(s.map==='capital')return ['king_deadline','order_owner','stock_owner','invoice_owner'].find(k=>!f[k])||'to_tower';if(s.map==='tower')return 'to_release';if(s.map==='release')return !f.release_scope?'release_scope':!f.legacy_voice?'legacy_voice':'legacy';return null;}
export function drawWorld(canvas,s,map,entities){
  if(!canvas)return;const {c,w,h}=surface(canvas),size=Math.min(w,h),scale=size/288,ox=(w-size)/2,oy=(h-size)/2;
  views.set(canvas,{ox,oy,size,w,h});
  c.save();c.translate(ox,oy);c.scale(scale,scale);
  const minX=Math.floor(-ox/scale/32),maxX=Math.ceil((w-ox)/scale/32),minY=Math.floor(-oy/scale/32),maxY=Math.ceil((h-oy)/scale/32);
  for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++){
    const outside=x<0||x>8||y<0||y>8,n=Math.abs(x*19+y*31);
    tile(c,x*32,y*32,map.theme,outside?map.theme==='village'||n%3!==0:map.grid[y][x]==='#',n);
    if(outside&&map.theme!=='village'&&n%4===0){box(c,'#23303c',x*32+10,y*32+3,13,26);box(c,'#7ba58c',x*32+13,y*32+7,7,2);box(c,'#53675f',x*32+13,y*32+13,7,2);}
  }
  if(map.theme==='village'){
    for(let y=1;y<8;y++)for(let x=1;x<8;x++)if(map.grid[y][x]==='.'&&(x===4||y===3||y===6)){
      box(c,'#aaa071',x*32,y*32,32,32);box(c,'#b9ae7c',x*32+3,y*32+8,11,2);box(c,'#8e895f',x*32+21,y*32+25,5,2);
    }
    if(s.map==='village')for(const [x,y]of[[1,1],[5,1],[1,4],[5,4]])house(c,x*32,y*32-4,x===1&&y===4);
  }
  for(const e of [...entities].sort((a,b)=>a.y-b.y))object(c,e,s);
  box(c,'#f1d47d',s.x*32+13,s.y*32-3,7,2);person(c,s.x*32,s.y*32,'#e5bd70','player',s.steps||0);
  c.restore();
  const target=goal(s);
  for(const e of entities){
    const near=Math.abs(e.x-s.x)+Math.abs(e.y-s.y)<=2,px=ox+(e.x*32+16)*scale,py=oy+e.y*32*scale;
    if(e.id===target){c.font='bold 17px sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#26352d';c.strokeText('!',px,py-7);c.fillStyle='#ffe59b';c.fillText('!',px,py-7);}
    if(!near)continue;
    c.font='600 12px "Yu Gothic UI",sans-serif';c.textAlign='center';const tw=c.measureText(e.label).width+14,lx=Math.max(5,Math.min(w-tw-5,px-tw/2)),ly=Math.min(h-24,py+32*scale);
    box(c,'#12291feF',lx,ly,tw,21);c.strokeStyle='#c5ba86';c.lineWidth=1;c.strokeRect(lx+.5,ly+.5,tw-1,20);c.fillStyle='#fff0c9';c.fillText(e.label,lx+tw/2,ly+15);
  }
}
export function mapPoint(canvas,clientX,clientY){
  const v=views.get(canvas);if(!v)return null;const r=canvas.getBoundingClientRect(),x=(clientX-r.left)*v.w/r.width-v.ox,y=(clientY-r.top)*v.h/r.height-v.oy;
  if(x<0||y<0||x>=v.size||y>=v.size)return null;return{x:Math.floor(x/v.size*9),y:Math.floor(y/v.size*9)};
}
export function drawTitle(canvas){
  if(!canvas)return;const {c,w,h}=surface(canvas);const scale=Math.max(w/320,h/620);c.save();c.translate((w-320*scale)/2,(h-620*scale)/2);c.scale(scale,scale);
  const sky=c.createLinearGradient(0,0,0,620);sky.addColorStop(0,'#182e48');sky.addColorStop(.32,'#805852');sky.addColorStop(.55,'#bb825c');sky.addColorStop(.68,'#35454a');sky.addColorStop(1,'#101e2f');c.fillStyle=sky;c.fillRect(0,0,320,620);
  box(c,'#e9bc7b',229,112,48,48);box(c,'#f2ce8b',237,104,32,64);
  for(let i=0;i<12;i++){const x=(i*71)%320,y=38+(i*37)%128;box(c,'#dfbd9a88',x,y,24+i%3*12,3);}
  for(let i=0;i<12;i++){const x=i*29;box(c,'#384149',x,230-i%3*16,24,125);box(c,'#384149',x-2,224-i%3*16,28,7);}
  // The old castle is also a server rack: its windows remain lit after sunset.
  for(const [x,y,ww,hh]of[[27,177,43,236],[245,155,45,260],[97,218,119,185]]){
    box(c,'#233742',x,y,ww,hh);box(c,'#6f7871',x,y,ww,5);box(c,'#162b37',x+ww-8,y+5,8,hh-5);
    for(let row=0;row<5;row++){box(c,'#102631',x+7,y+17+row*27,ww-18,18);box(c,row%2?'#8baf9a':'#c3c799',x+10,y+22+row*27,3,3);box(c,'#4b7774',x+17,y+22+row*27,ww-31,2);}
    for(let k=0;k<ww;k+=13)box(c,'#2c424a',x+k,y-9,8,10);
  }
  box(c,'#21333a',0,399,320,221);
  for(let i=0;i<12;i++){const x=i*29;box(c,'#3b5555',x,405,2,210);box(c,'#587368',x,440+i%4*13,18,2);box(c,'#8bbd9b',x+17,440+i%4*13,3,3);}
  box(c,'#152530',112,433,99,88);box(c,'#536c69',114,428,95,8);box(c,'#7a9180',120,435,82,3);
  box(c,'#2e4348',126,456,69,39);box(c,'#92c0a3',133,464,53,4);box(c,'#608e83',133,474,37,3);
  // A sword left beside the terminal, awaiting tomorrow's incident.
  box(c,'#d4d9c2',224,374,5,112);box(c,'#8ba6a2',229,374,3,112);box(c,'#ddc58e',212,478,29,5);box(c,'#765645',223,483,8,24);box(c,'#d5bb7e',221,506,12,6);
  for(let i=0;i<20;i++)box(c,'#d9ba7577',(i*67)%320,350+(i*41)%205,2,2);
  const shade=c.createLinearGradient(0,310,0,620);shade.addColorStop(0,'#08182400');shade.addColorStop(1,'#081421d9');c.fillStyle=shade;c.fillRect(0,310,320,310);c.restore();
}
