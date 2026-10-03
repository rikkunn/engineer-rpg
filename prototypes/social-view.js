// The conversation arena keeps the same scene/message/command rhythm as combat.
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function conversationHTML(b,data,commands,feedback){
  const progress=(name,value,max)=>`<div class="social-meter"><span>${name} <b>${value} / ${max}</b></span><div><i style="width:${Math.min(100,value/max*100)}%"></i></div></div>`;
  const result=b.result==='success';
  const text=feedback||b.completed?b.log.join('\n'):data.rounds[b.round].prompt;
  return `<header class="game-hud"><div class="location"><small>◆ CONVERSATION</small><strong>${esc(data.title)}</strong></div><button data-act="social-exit">また話す</button></header>
  <div class="quest-ribbon">◇ ${esc(data.goal)}</div>
  <div class="social-stage"><canvas id="social-scene" aria-hidden="true"></canvas><span class="social-partner">${esc(data.partner)} <small>${esc(data.role)}</small></span></div>
  <div class="social-gauges">${progress('理解',b.understanding,12)}${progress('信頼',b.trust,10)}<span>対話 ${Math.min(b.round+1,data.rounds.length)} / ${data.rounds.length}</span></div>
  <section class="social-message"><div class="message-name">${feedback?'言葉を交わした':b.completed?'会話を終えて':esc(data.partner)}</div><div class="social-lines" aria-live="polite">${esc(text).replaceAll('\n','<br>')}</div></section>
  <section class="social-commands">${feedback?'<button data-act="social-next" class="social-next">つづける ▸</button>':b.completed?`<div class="social-result"><b>${result?'次の一歩が決まった！':'まだ、話せることがある。'}</b><p>${result?'手帳に会話を記録。初回は準備の経費30G。':'相手の話に合わせ、違う手段も組み合わせてみよう。'}</p></div><button data-act="${result?'social-finish':'social-retry'}">${result?'冒険に戻る':'もう一度、話してみる'}</button>`:commands.map(c=>`<button data-social-command="${esc(c.id)}"><b>${esc(c.label)}</b><small>${esc(c.help)}</small></button>`).join('')}</section>`;
}
export function drawConversation(canvas,id){
  const c=canvas.getContext('2d'),w=400,h=160;canvas.width=w;canvas.height=h;
  const rect=(color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const lunch=id==='lunch';rect(lunch?'#36515a':'#293441',0,0,w,h);
  rect('#192935',0,108,w,52);
  for(let x=0;x<w;x+=40){rect('#344652',x,111,1,49);rect('#263641',x,136,40,1);}
  for(const x of [28,305]){rect('#987e55',x,13,67,72);rect(lunch?'#dba972':'#6b8592',x+5,18,57,62);rect('#816d51',x+30,18,4,62);rect('#816d51',x+5,47,57,3);}
  rect('#51605e',164,19,70,48);rect('#dac798',171,25,56,35);
  for(let y=30;y<55;y+=7)rect('#879082',179,y,37-(y%3)*6,2);
  const person=(x,color)=>{rect('#172531',x-6,121,40,6);rect('#5a463d',x+5,44,20,9);rect('#e1ba94',x+4,53,21,17);rect('#273139',x+18,58,3,3);rect(color,x,73,28,35);rect('#d8ae8a',x-5,80,6,17);rect('#d8ae8a',x+28,80,6,17);rect('#263a4b',x+2,108,8,16);rect('#263a4b',x+18,108,8,16);};
  person(100,'#b89a59');person(275,lunch?'#83ae9c':id==='appraisal'?'#8498b2':'#b297b5');
  rect('#7c5e45',137,98,125,12);rect('#554335',146,110,9,30);rect('#554335',244,110,9,30);
  if(lunch){for(const x of [151,224]){rect('#d8c49b',x,90,22,7);rect('#99ae70',x+5,86,12,5);}}
  else{rect('#e7d6ad',157,91,29,6);rect('#e7d6ad',212,91,27,6);rect('#8f7960',163,92,14,1);}
}
