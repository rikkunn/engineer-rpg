import { HEROES, SKILLS, copy, initialState, rest, objective, createBattle, resolveTurn, flee, parseSave } from './engine.js';
import { MAPS, entities, pathTo } from './world.js';

const app = document.querySelector('#app'), modal = document.querySelector('#modal');
const KEY = 'engineer-rpg-v1';
let state = initialState(), screen = 'title', battle = null, beforeBattle = null, dialogue = null, moving = false, movementToken = 0, noticeTimer;
let choices = [], targets = [], prefs = { large: false, dpad: false, reduced: false, sound: true };
let commander = 0, commandMode = 'root', selectedSkill = null, playback = null, playbackTimer, lastAdvance = 0, soundContext;
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = selector => document.querySelector(selector);
function notice(text, persistent = false) { const el = $('#notice'); el.textContent = text; el.classList.add('show'); if(modal.open){let status=modal.querySelector('[role=status]');if(!status){status=document.createElement('p');status.setAttribute('role','status');status.className='gold';modal.prepend(status);}status.textContent=text;}clearTimeout(noticeTimer); if (!persistent) noticeTimer = setTimeout(() => el.classList.remove('show'), 4500); }
function save(slot = 'auto') { try { localStorage.setItem(`${KEY}-${slot}`, JSON.stringify(state)); return true; } catch { notice('保存できません。設定からデータを書き出してください。', true); return false; } }
function available(slot) { try { return !!localStorage.getItem(`${KEY}-${slot}`); } catch { return false; } }
function load(slot) { try { const raw = localStorage.getItem(`${KEY}-${slot}`); if (!raw) throw new Error('保存データがありません。'); const next = parseSave(raw); if (MAPS[next.map].grid[next.y][next.x] !== '.') throw new Error('保存位置が不正です。'); state = next; movementToken++; moving=false; battle=null; dialogue=null; screen='world'; modal.close(); render(); notice('冒険を再開しました。'); } catch (e) { notice(e.message || '読み込めませんでした。'); } }
function note(text) { if (!state.notes.includes(text)) state.notes.push(text); }
function talk(speaker, lines, after) { dialogue = { speaker, lines, index: 0, after }; render(); }
function nextDialogue() { if (!dialogue) return; state.history.push(`${dialogue.speaker}：${dialogue.lines[dialogue.index]}`); state.history = state.history.slice(-120); dialogue.index++; if (dialogue.index >= dialogue.lines.length) { const fn=dialogue.after; dialogue=null; fn?.(); save(); } render(); }

function header() { return `<header class="topbar"><div class="brand"><span class="brand-icon" aria-hidden="true">⚔</span><div><strong>炎上クエスト</strong><small>納期だけは決まっている</small></div></div><nav class="top-actions" aria-label="メニュー">${screen !== 'title' ? '<button class="quiet" data-act="journal">手帳</button>' : ''}<button class="quiet" data-act="settings">設定</button><button class="quiet" data-act="help">？<span class="sr-only"></span></button></nav></header>`; }
function footer() { return '<footer><span>ENGINEER RPG / CHAPTER 01</span><span>第一章 試作版 · v0.1.0</span></footer>'; }
function partyHTML() { return `<div class="party" aria-label="パーティーの状態">${state.party.map((h,i) => `<div class="hero" style="--hero:${h.color}"><div class="hero-top"><span class="portrait"></span><b>${h.name}</b><small>Lv.${state.flags.boss?2:1}</small></div><span class="job">${h.job}${h.hp<=0?'・戦闘不能':h.burn?'・炎上':''}</span><div class="stats"><span>HP</span><span>${h.hp}/${h.maxHp}</span></div><div class="bar"><span style="width:${h.hp/h.maxHp*100}%"></span></div><div class="stats"><span>MP</span><span>${h.mp}/${h.maxMp}</span></div><div class="bar mp"><span style="width:${h.mp/h.maxMp*100}%"></span></div></div>`).join('')}</div>`; }
function optionsFor(i) { return Object.entries(SKILLS).filter(([key,s]) => (s.owner===undefined || s.owner===i) && (key!=='seal'||state.flags.seal&&battle.boss) && (key!=='shield'||state.flags.minutes)); }
function forecast() { if(battle.boss) return `${battle.enemies[0].hp>0?(battle.turn%2===0?'送信：一斉再送＋炎上':'送信：単体攻撃'):''} ${battle.enemies[1].hp>0?(battle.turn%3===0?'再送：「そんな話は聞いていない」':'再送：単体攻撃'):''}`; return battle.turn%2===0?'予兆：障害通知＋炎上':'予兆：単体への障害通知'; }
async function travel(x,y) {
  if (moving || dialogue || battle || screen!=='world') return;
  const route=pathTo(state,x,y); if(!route){notice('そこへは移動できません。通路を選んでください。');return;}
  moving=true; const token=++movementToken; render();
  for(const step of route.path){if(token!==movementToken)return;state.x=step.x;state.y=step.y;state.steps++;drawMap($('#map'),state);if(!prefs.reduced)await new Promise(r=>setTimeout(r,75));}
  if(token!==movementToken)return;moving=false;
  if(route.target)interact(route.target.id);else{save();render();}
}
function changeMap(map,x,y){state.map=map;state.x=x;state.y=y;save();render();}
function interact(id){
  switch(id){
    case 'shop':
      if(state.flags.boss&&!state.flags.complete){talk('道具屋 → 村長',['注文が一回ずつ届く！ ありがとう。これで薬草の山に埋もれずに済む。','村長「見事じゃ。この仕組みは、王国の全店舗で使っておる」','ユウ「ちなみに、何店舗ですか？」','村長「128店舗じゃ。今回と同じ修正でよいから、簡単じゃろう？」','対象店舗：1 → 128。あなたは、見積もりを持ち帰ることにした。'],()=>{state.flags.complete=true;note('第一章完了。二重送信を解消。残り127店舗は別途お見積もり。');showEnding();});}
      else if(state.flags.complete)talk('道具屋',['今日はもう休んでいってくれ。追加の依頼は明日の営業時間に頼むよ。']);
      else if(state.flags.quest)talk('道具屋',['店員にも話を聞いてくれ。村長なら、古い仕組みを知っているかもしれない。','地下へ行く前に宿で休んでいきな。宿代はこの案件の経費にしておいた。']);
      else talk('道具屋',['薬草を十個注文したら、二十個届いたんだ。私は一回しか頼んでいない。','営業からは「簡単な修正」と聞いている。原因？ それを調べてもらいたくてね。','ユウ「現場の操作から確認します。リナ、テオ、ガン。いつもの四人で行こう」','リナ「全部書き直したほうが……」 テオ「まず再現です」 ガン「その前にログだ」','薬草6個を持ってきた。HPが減ったらテオの「再テスト」。村の宿では無料で全回復できる。'],()=>{state.flags.quest=true;note('依頼：薬草の注文が二重に届く。店員の操作と村長の運用を調べる。');});
      break;
    case 'clerk': if(!state.flags.quest){talk('店員',['店主がお困りです。まずは道具屋に話を聞いてください。']);break;}
      talk('店員',['注文ボタンを押しても何も出なくて。不安なので、もう一回押しました。','テオ「操作は二回、注文は一回のつもり。なるほど」','ガン「連打を止めるだけでは、通信の再送は防げないな」'],()=>{state.flags.clerk=true;note('店員の証言：反応がなくボタンを二度押した。再送時も同じ注文として扱う必要がある。');});break;
    case 'mayor': if(!state.flags.clerk){talk('村長',['何が起きたか、まずは店員から聞いてきておくれ。推測で仕様を増やすのは危険じゃ。']);break;}
      talk('村長',['夜中に古い注文を送り直す仕組みもあるぞ。地下の遺跡で、今も動いておる。','ユウ「初耳ですが」 村長「聞かれなかったからのう」','前任の賢者は「処理済みの刻印で、同じ注文を弾く」と言っておった。最深部にあるはずじゃ。','地下の端末には運用記録がある。議事録も残っていれば持っていくとよい。'],()=>{state.flags.mayor=true;note('村長の証言：夜間バッチが古い注文を再送。最深部の刻印で二重処理を防ぐ。');});break;
    case 'inn':rest(state);save();talk('宿屋',['一晩、ゆっくりお休みください。宿代は経費です。','社用水晶が光った。ガン「定期通知だ。対応は明日でいい」','全員のHP・MPが回復した。休んでも締切は進まない。']);break;
    case 'sign':talk('村の案内板',['上：地下遺跡。左：道具屋と宿屋。右：店員と村長。','町の標語「小さな修正、大きな影響」','人物をタップすると近くまで移動して話します。下の目的地ボタンからも操作できます。']);break;
    case 'ruins':if(!state.flags.mayor){talk('ユウ',['現場の話を揃えてから地下へ行こう。道具屋、店員、村長の順に確認だ。']);break;}changeMap('ruins',4,5);break;
    case 'village':changeMap('village',4,2);break;
    case 'core':changeMap('core',4,6);break;
    case 'ruinsBack':changeMap('ruins',4,2);break;
    case 'terminal':talk('運用端末',['WARNING: ログ出力は負荷対策のため無効化されています。','ガン「調査のためのログを出すための作業が必要、か。俺の『監視強化』で有効にできる」','ユウ「その後に『ログを見ろ』。原因が分かれば攻撃の威力が上がる」','ガンはユウより速い。同じターンに監視とログを選んでも順番通りに使える。'],()=>{state.flags.terminal=true;note('攻略：ガンの監視強化 → ユウのログを見ろ。原因特定後は攻撃が1.5倍。');});break;
    case 'minutes':talk('承認済み議事録',state.flags.minutes?['議事録はすでに手帳に保管した。証拠は何枚あってもよい。']:['「同じ注文は一回だけ処理すること。全関係者了承済み」','ユウは「議事録の盾」を使えるようになった！','3ターン以内の「そんな話は聞いていない」を一度防ぐ。ボスの予告に合わせて使おう。'],()=>{state.flags.minutes=true;note('議事録：二重処理は禁止。議事録の盾でボスの合意巻き戻しを一度無効化できる。');});break;
    case 'seal':talk('古い宝箱',state.flags.seal?['処理済みの刻印は持っている。押印回数に制限はない。']:['「処理済みの刻印」を手に入れた！','テオ「同じ注文番号に二度、処理をしない。これで再送されても大丈夫」','双頭蛇との戦闘で、誰か一人の行動を「処理済みの刻印」にしよう。復活を止められる。','古い回復装置も動いた。全員のHP・MPが回復した。'],()=>{if(!state.flags.seal)rest(state);state.flags.seal=true;note('刻印を入手。戦闘コマンドで使うと双頭蛇の復活が止まる。消費しない。');});break;
    case 'archive':talk('前任者の記録',['「再送そのものは悪ではない。届かなかった注文を助けるための仕組みだ」','「同じ依頼かどうかを確認せず、二度実行することが問題なのだ」','リナ「全部消せばよい、というわけではないのね」','ガン「こいつも、誰かを助けようとして動いていたんだな」'],()=>{state.flags.archive=true;note('前任者の記録：再送を全廃せず、同じ注文を重複処理しない仕組みを入れる。');});break;
    case 'boss':if(!state.flags.seal){talk('テオ',['二つの首が互いを復活させている。先に宝箱の「処理済みの刻印」を探そう。']);break;}talk('二重送信の双頭蛇',['「受付完了……受付完了……」 同じ注文が繰り返されている。','ユウ「止めよう。今度こそ、一回だけ届くように」'],()=>startBattle('boss'));break;
    default:if(['slime1','slime2','ghost'].includes(id))startBattle(id);
  }
}
function startBattle(id){save();beforeBattle=copy(state);battle=createBattle(id,state);choices=state.party.map(()=> 'attack');targets=[0,0,0,0];commander=state.party.findIndex(h=>h.hp>0);commandMode='root';playback=null;render();tone('battle');}
function finishBattle(){const id=battle.id;state.defeated.push(id);state.gold+=battle.boss?120:25;state.potions+=battle.boss?3:1;if(battle.scanned)note(`${battle.boss?'双頭蛇':'不具合'}をログで調査済み。準備してからの攻撃は1.5倍。`);const boss=battle.boss;battle=null;beforeBattle=null;if(boss){state.flags.boss=true;rest(state);note('双頭蛇を攻略。二重送信を停止した。道具屋への報告が残っている。');save();talk('ユウ',['二重送信は止まった。二重チェックの会議は残った。','緊張がほどけた。全員のHP・MPが回復した！','リナ「終わった！」 テオ「報告までが仕事です」','村へ戻って、道具屋に伝えよう。'],()=>changeMap('village',4,2));}else{save();render();notice('障害を解消。敵は復活しません。');}}
function showEnding(){openModal('第一章クリア',`<div class="eyebrow">Delivery complete / Scope increased</div><p class="gold" style="font-size:23px;margin:18px 0">おつかれさまでした。</p><p>注文は一回ずつ届くようになった。<br>残り127店舗の話は、明日の自分に任せよう。</p><h3>今回の調査記録</h3><p>議事録：${state.flags.minutes?'回収済み':'未回収'}<br>前任者の運用記録：${state.flags.archive?'確認済み':'未確認'}<br>解消した障害：${state.defeated.length}件</p><p class="muted" style="margin-top:18px">第一章の試作はここまでです。第二章以降は未実装。閉じると村の探索を続けられます。</p>`);}
function openModal(title,body){modal.innerHTML=`<button class="close quiet" data-act="close" aria-label="閉じる">×</button><h2 id="modal-title">${title}</h2>${body}`;if(!modal.open)modal.showModal();}
function journal(){openModal('冒険の手帳',`<div class="eyebrow">Current objective</div><p class="gold">${objective(state)}</p><h3>調査メモ</h3>${state.notes.length?`<ul>${state.notes.map(n=>`<li>${escape(n)}</li>`).join('')}</ul>`:'<p>道具屋で依頼を受けると、調査メモが増えます。</p>'}<h3>最近の会話</h3>${state.history.slice(-12).map(t=>`<p>${escape(t)}</p>`).join('')}`);}
function settings(){openModal('設定と冒険の記録',`<label class="setting"><input type="checkbox" data-pref="large" ${prefs.large?'checked':''}>会話の文字を大きくする</label><label class="setting"><input type="checkbox" data-pref="dpad" ${prefs.dpad?'checked':''}>方向ボタンを表示する</label><label class="setting"><input type="checkbox" data-pref="reduced" ${prefs.reduced?'checked':''}>移動・戦闘の演出を省略する</label><label class="setting"><input type="checkbox" data-pref="sound" ${prefs.sound?'checked':''}>効果音</label><h3>冒険の記録</h3><p>この端末・ブラウザに保存します。戦闘中に閉じた場合は戦闘直前から再開します。</p><div class="stack"><button data-act="manual-save" ${screen==='title'||battle||dialogue||moving?'disabled':''}>冒険を記録する</button><button data-act="manual-load" ${!available('manual')||!!battle||moving?'disabled':''}>記録から再開する</button><button data-act="export" ${screen==='title'||dialogue||moving?'disabled':''}>記録を書き出す</button><label>記録を読み込む<input type="file" id="import" accept="application/json,.json" ${battle||moving?'disabled':''}></label><button data-act="title" ${battle||dialogue||moving?'disabled':''}>タイトルへ戻る</button></div>`);}
function skills(){openModal('特技の説明',Object.entries(SKILLS).filter(([k])=>k!=='seal'||state.flags.seal).map(([k,v])=>`<h3>${v.label}${v.cost?` · MP${v.cost}`:''}</h3><p>${v.help}</p>`).join(''));}
function newGame(){state=initialState();screen='world';battle=null;dialogue=null;movementToken++;moving=false;save();talk('派遣ギルドの紹介状',['ここはハジマリ村。あなたたちは、小さな不具合を直しにやってきた。','依頼書には「薬草の注文がおかしい。簡単な修正のはず」とだけ書かれている。','まずは村の左上にいる道具屋へ。マップの人物、または下の目的地ボタンをタップしよう。']);}
document.addEventListener('click',e=>{
  const btn=e.target.closest('button');if(!btn||btn.disabled)return;
  tone('select');
  if(btn.dataset.command){chooseCommand(btn.dataset.command);return;}
  if(btn.dataset.skill){selectedSkill=btn.dataset.skill;const type=SKILLS[selectedSkill].target;if(type==='enemy'||type==='ally'){commandMode='target';render();}else commitChoice(selectedSkill,0);return;}
  if(btn.dataset.target!==undefined){commitChoice(selectedSkill,Number(btn.dataset.target));return;}
  if(btn.dataset.place){const entity=entities(state).find(x=>x.id===btn.dataset.place);if(entity)travel(entity.x,entity.y);return;}
  if(btn.dataset.dir){const[dx,dy]=btn.dataset.dir.split(',').map(Number);travel(state.x+dx,state.y+dy);return;}
  switch(btn.dataset.act){
    case 'new':if(available('auto'))openModal('新しい冒険', '<p>自動セーブが新しい冒険で上書きされます。手動セーブは残ります。</p><div class="stack"><button class="primary" data-act="confirm-new">新しい冒険を始める</button><button data-act="close">戻る</button></div>');else newGame();break;
    case 'confirm-new':modal.close();newGame();break;
    case 'continue':load('auto');break;
    case 'next':if(performance.now()-lastAdvance>230){lastAdvance=performance.now();nextDialogue();}break;
    case 'journal':journal();break;
    case 'settings':settings();break;
    case 'skills':skills();break;
    case 'close':modal.close();break;
    case 'help':openModal('冒険のすすめ方','<p>マップの人物や宝箱をタップすると、そこまで移動して調べます。目的地ボタンでも同じ操作ができます。</p><h3>戦闘</h3><p>4人の行動と対象を選び、「戦闘開始」を押します。実行前なら何度でも変更できます。ガンの「監視強化」とユウの「ログを見ろ」を組み合わせると有利です。</p><h3>回復と中断</h3><p>村の宿屋で無料の全回復。自動保存は移動・イベント・戦闘終了時。いつでも閉じて大丈夫です。敗北後は消耗品も戻して再試行できます。</p><h3>PCでの操作</h3><p>マウス操作、または矢印キーで移動。会話は「つづける」で進めます。</p>');break;
    case 'turn':turn();break;
    case 'battle-next':advanceFrame();break;
    case 'battle-skip':finishPlayback();break;
    case 'command-back':if(commandMode==='root'){const previous=state.party.map((h,i)=>i).filter(i=>i<commander&&state.party[i].hp>0).at(-1);if(previous!==undefined)commander=previous;}commandMode='root';render();break;
    case 'destinations':openModal('どこへ向かう？',`<div class="destination-grid">${entities(state).map(e=>`<button data-destination="${e.id}">${e.type==='enemy'||e.type==='boss'?'⚔ ':e.type==='exit'?'↗ ':''}${e.label}</button>`).join('')}</div>`);break;
    case 'inspect':{const list=entities(state).filter(e=>Math.abs(e.x-state.x)+Math.abs(e.y-state.y)===1);if(list.length===1)interact(list[0].id);else if(list.length>1)openModal('何を調べる？',`<div class="stack">${list.map(e=>`<button data-destination="${e.id}">${e.label}</button>`).join('')}</div>`);else notice('人や宝箱に近づいてみよう。');break;}
    case 'victory':finishBattle();break;
    case 'retry':{const id=battle.id;state=copy(beforeBattle);startBattle(id);break;}
    case 'retreat':state=copy(beforeBattle);battle=null;beforeBattle=null;changeMap('village',4,7);break;
    case 'flee':flee(state,battle);battle=null;beforeBattle=null;save();render();notice('持ち帰りました。宿で回復して再挑戦できます。');break;
    case 'manual-save':if(save('manual'))notice('手動セーブしました。');break;
    case 'manual-load':load('manual');break;
    case 'export':{const data=battle?beforeBattle:state;const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='engineer-rpg-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);break;}
    case 'title':modal.close();if(screen!=='title')save();screen='title';render();break;
  }
});
document.addEventListener('click',e=>{const b=e.target.closest('[data-destination]');if(!b)return;const entity=entities(state).find(x=>x.id===b.dataset.destination);modal.close();if(entity)travel(entity.x,entity.y);});
document.addEventListener('change',async e=>{
  if(e.target.dataset.actionIndex!==undefined){const i=Number(e.target.dataset.actionIndex);choices[i]=e.target.value;const list=SKILLS[choices[i]].target==='ally'?state.party:battle.enemies;targets[i]=Math.max(0,list.findIndex(h=>h.hp>0));render();}
  if(e.target.dataset.targetIndex!==undefined)targets[Number(e.target.dataset.targetIndex)]=Number(e.target.value);
  if(e.target.dataset.pref){prefs[e.target.dataset.pref]=e.target.checked;try{localStorage.setItem(`${KEY}-prefs`,JSON.stringify(prefs));}catch{}render();}
  if(e.target.id==='import'&&e.target.files[0]){try{const file=e.target.files[0];if(file.size>250000)throw new Error('データが大きすぎます。');const next=parseSave(await file.text());if(MAPS[next.map].grid[next.y][next.x]!=='.')throw new Error('保存位置が不正です。');state=next;battle=null;dialogue=null;screen='world';modal.close();save();render();notice('セーブデータを読み込みました。');}catch(err){notice(err.message);}}
});
app.addEventListener('click',e=>{if(e.target.id!=='map')return;const r=e.target.getBoundingClientRect(),size=Math.min(r.width,r.height),left=r.left+(r.width-size)/2,top=r.top+(r.height-size)/2;const x=e.clientX-left,y=e.clientY-top;if(x<0||y<0||x>=size||y>=size)return;travel(Math.floor(x/size*9),Math.floor(y/size*9));});
document.addEventListener('keydown',e=>{if(modal.open||e.target.matches('select,input,button')||screen!=='world'||battle||dialogue)return;const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];if(d){e.preventDefault();travel(state.x+d[0],state.y+d[1]);}});

// Tiny original pixel sprites, painted locally: no downloaded art or external fonts.
function rect(ctx,color,x,y,w,h){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function person(ctx,x,y,color,player=false){rect(ctx,'#0b191b66',x+7,y+25,19,5);rect(ctx,'#302b29',x+11,y+3,11,5);rect(ctx,'#e6bf8e',x+12,y+8,9,7);rect(ctx,color,x+9,y+15,15,10);rect(ctx,'#22343b',x+10,y+25,5,5);rect(ctx,'#22343b',x+18,y+25,5,5);rect(ctx,'#edcea4',x+6,y+16,3,8);rect(ctx,'#edcea4',x+24,y+16,3,8);rect(ctx,'#263c39',x+18,y+10,2,2);if(player){rect(ctx,'#e8d998',x+9,y+3,15,3);rect(ctx,'#e8d998',x+14,y-3,5,3);}}
function tree(ctx,x,y){rect(ctx,'#71553b',x+14,y+16,5,16);rect(ctx,'#163f30',x+2,y+4,29,20);rect(ctx,'#2e6845',x+7,y,19,25);rect(ctx,'#407b50',x+10,y+2,10,13);rect(ctx,'#548857',x+8,y+8,4,5);}
function drawMap(canvas,s,titleArt=false){
  if(!canvas)return;const ctx=canvas.getContext('2d'),m=MAPS[s.map];ctx.imageSmoothingEnabled=false;
  for(let y=0;y<9;y++)for(let x=0;x<9;x++){
    const px=x*32,py=y*32,wall=m.grid[y][x]==='#';
    if(m.theme==='village'){
      const road=x===4||y===3||y===6;rect(ctx,road?'#9b9362':(x+y)%2?'#426945':'#466e49',px,py,32,32);
      if(road){rect(ctx,'#b0a779',px+3,py+7,8,2);rect(ctx,'#89845a',px+18,py+24,5,2);}else{rect(ctx,'#648351',px+4,py+10,2,4);rect(ctx,'#739059',px+6,py+12,2,2);if((x+y)%3===0)rect(ctx,'#d9c979',px+24,py+23,2,2);}
      if(wall)tree(ctx,px,py);
    }else{
      rect(ctx,wall?'#233d3d':'#3b4b44',px,py,32,32);rect(ctx,wall?'#4c6460':'#4c5a4f',px+1,py+1,30,wall?12:29);if(wall){rect(ctx,'#1b3032',px,py+15,32,2);rect(ctx,'#344c49',px+3,py+18,26,12);}else{rect(ctx,'#293d37',px+2,py+30,30,2);rect(ctx,'#64715b',px+6,py+8,3,2);}
    }
  }
  if(m.theme==='village'){
    for(const [x,y] of [[1,1],[5,1],[1,4],[5,4]]){rect(ctx,'#393b2a',x*32-6,y*32+7,68,30);rect(ctx,'#b8ab79',x*32,y*32+10,54,30);rect(ctx,'#965d49',x*32-5,y*32,65,13);rect(ctx,'#c07e5a',x*32,y*32-5,54,9);rect(ctx,'#536651',x*32+6,y*32+16,10,10);rect(ctx,'#4a4834',x*32+34,y*32+17,12,22);}
  }
  for(const e of entities(s)){
    const x=e.x*32,y=e.y*32;
    if(e.type==='npc'||e.type==='inn')person(ctx,x,y,e.color);
    if(e.type==='chest'){rect(ctx,'#161f20',x+5,y+14,24,14);rect(ctx,s.flags[e.id]?'#68583d':'#ae7e44',x+5,y+9,24,15);rect(ctx,'#e0bf72',x+5,y+16,24,3);rect(ctx,'#f6d487',x+16,y+15,4,7);}
    if(e.type==='exit'){rect(ctx,'#152b27',x+3,y+5,26,22);for(let i=0;i<4;i++)rect(ctx,'#78907b',x+5+i*2,y+8+i*5,22-i*4,2);}
    if(e.type==='terminal'){rect(ctx,'#1c2b2d',x+5,y+4,23,25);rect(ctx,'#71b69a',x+8,y+7,17,13);rect(ctx,'#224f45',x+11,y+10,10,2);rect(ctx,'#e0c471',x+10,y+24,3,2);}
    if(e.type==='sign'){rect(ctx,'#604d35',x+14,y+15,5,15);rect(ctx,'#bcab78',x+3,y+4,27,16);rect(ctx,'#685b3d',x+8,y+9,16,2);}
    if(e.type==='enemy'){rect(ctx,e.color,x+6,y+13,21,13);rect(ctx,e.color,x+11,y+8,11,7);rect(ctx,'#243733',x+11,y+17,3,3);rect(ctx,'#243733',x+20,y+17,3,3);}
    if(e.type==='boss'){rect(ctx,'#b57e61',x+2,y+5,10,18);rect(ctx,'#cf9471',x+20,y+3,10,20);rect(ctx,'#866b50',x+8,y+20,18,10);rect(ctx,'#f5d58f',x+4,y+7,3,3);rect(ctx,'#f5d58f',x+23,y+5,3,3);}
    if(!titleArt){ctx.font='7px sans-serif';ctx.textAlign='center';const width=ctx.measureText(e.label).width;rect(ctx,'#10251ee8',x+16-width/2-3,y+29,width+6,10);ctx.fillStyle='#f0e7c7';ctx.fillText(e.label,x+16,y+36);}
  }
  person(ctx,s.x*32,s.y*32,'#e0ba65',true);
}
function drawMonster(canvas,type,index){const c=canvas.getContext('2d');c.clearRect(0,0,48,48);rect(c,'#071c2166',7,40,35,5);if(type==='snake'){const a=index?'#b89c74':'#c28467';rect(c,a,13,8,21,13);rect(c,a,24,18,10,19);rect(c,a,11,33,25,9);rect(c,a,5,27,10,12);rect(c,'#e4bb88',16,9,18,4);rect(c,'#f8e3a1',14,13,5,3);rect(c,'#213633',15,13,2,3);rect(c,'#753f43',11,20,12,3);rect(c,'#ecac8b',28,24,5,10);rect(c,'#dcca99',9,36,23,3);}else if(type==='ghost'){rect(c,'#a99bc9',12,10,24,28);rect(c,'#bbb0db',16,5,16,30);rect(c,'#a99bc9',6,20,7,11);rect(c,'#a99bc9',36,20,7,11);rect(c,'#e3cee9',15,13,5,6);rect(c,'#e3cee9',28,13,5,6);rect(c,'#36384f',16,14,3,4);rect(c,'#36384f',29,14,3,4);rect(c,'#152e2e',20,33,6,8);}else{rect(c,'#84ac79',8,25,33,15);rect(c,'#99bf84',12,17,25,18);rect(c,'#a9cd90',19,11,13,15);rect(c,'#d5e7a8',20,14,6,7);rect(c,'#263c32',16,27,4,4);rect(c,'#263c32',30,27,4,4);rect(c,'#e3d8aa',21,34,8,2);}}
function tone(kind){
  if(!prefs.sound)return;
  try{soundContext ||= new(window.AudioContext||window.webkitAudioContext)();if(soundContext.state==='suspended')soundContext.resume();const start=soundContext.currentTime;const notes=kind==='win'?[392,523,659,784]:kind==='battle'?[196,233,294]:kind==='hit'?[110,65]:kind==='heal'?[523,659]:[660];notes.forEach((f,i)=>{const osc=soundContext.createOscillator(),gain=soundContext.createGain();osc.type=kind==='hit'?'sawtooth':'triangle';osc.frequency.value=f;gain.gain.setValueAtTime(.035,start+i*.08);gain.gain.exponentialRampToValueAtTime(.001,start+i*.08+.12);osc.connect(gain).connect(soundContext.destination);osc.start(start+i*.08);osc.stop(start+i*.08+.13);});}catch{}
}
function title(){
  app.innerHTML=`<div class="game-root title-screen"><canvas id="title-map" width="288" height="288" aria-hidden="true"></canvas><div class="title-vignette"></div><div class="title-emblem"><span class="title-overline">剣と魔法と、承認済みの議事録。</span><div class="crest">✦</div><h1>炎上<span>クエスト</span></h1><p>― 納期だけは決まっている ―</p></div><nav class="title-menu" aria-label="タイトルメニュー">${available('auto')?'<button data-act="continue">つづきから</button>':''}<button data-act="new">はじめから</button><button data-act="settings">設定・冒険の記録</button></nav><div class="title-bottom"><span>第一章　ボタンは二度押された</span><small>CHAPTER 01 · PROTOTYPE</small></div></div>`;
  drawMap($('#title-map'),initialState(),true);
}
function hud(){return `<header class="game-hud"><div class="location"><small>${battle?'⚔ BATTLE':state.map==='village'?'◆ SAFE AREA':'◆ DUNGEON'}</small><strong>${battle?battle.boss?'二重送信の双頭蛇':'不具合との遭遇':MAPS[state.map].name}</strong></div><div class="hud-actions"><button data-act="journal" aria-label="冒険の手帳">手帳</button><button data-act="settings" aria-label="設定とセーブ">☰</button></div></header>`;}
function dialogueHTML(){return `<section class="message-window"><div class="message-name">${escape(dialogue.speaker)}</div><div class="message-body" aria-live="polite">${escape(dialogue.lines[dialogue.index])}</div><button data-act="next" class="next-message">${dialogue.index===dialogue.lines.length-1?'閉じる':'つづける'} <span>▼</span></button><small class="page-count">${dialogue.index+1} / ${dialogue.lines.length}</small></section>`;}
function partyDock(){const shown=playback?.current?.party||state.party;return `<div class="party-dock">${shown.map((h,i)=>`<div class="party-unit ${battle&&!playback&&commander===i?'active':''} ${h.hp<=0?'fallen':''}" style="--hero:${h.color}"><canvas class="hero-sprite" id="hero-${i}" width="32" height="34" aria-hidden="true"></canvas><div class="unit-info"><b>${h.name}<span>${h.hp<=0?'不能':h.burn?'炎上':h.job}</span></b><div class="hp-readout">HP <strong>${h.hp}</strong><small>/${h.maxHp}</small></div><div class="life-track"><i style="width:${h.hp/h.maxHp*100}%"></i></div><div class="mp-readout">MP ${h.mp}<small>/${h.maxMp}</small></div></div></div>`).join('')}</div>`;}
function worldHTML(){return `<div class="quest-ribbon">◇ ${objective(state)}</div><div class="world-stage"><div class="map-wrap"><canvas id="map" width="288" height="288" tabindex="0" role="img" aria-label="${MAPS[state.map].name}。タップで移動。目的地ボタンからも移動できます。"></canvas></div><span class="area-caption">${MAPS[state.map].subtitle}</span></div>${state.flags.quest?partyDock():''}<div class="world-bottom">${dialogue?dialogueHTML():`<div class="explore-dock"><div class="travel-hint"><span>${moving?'移動中…':'行きたい場所をタップ'}</span><small>${state.gold} G　薬草 ${state.potions}</small></div><div class="explore-commands"><button data-act="destinations" ${moving?'disabled':''}>↗ 目的地</button><button data-act="inspect" ${moving?'disabled':''}>◇ しらべる</button><button data-act="help">？ 操作</button></div>${prefs.dpad?'<div class="dpad"><button data-dir="0,-1" aria-label="上へ">↑</button><button data-dir="-1,0" aria-label="左へ">←</button><button data-dir="0,1" aria-label="下へ">↓</button><button data-dir="1,0" aria-label="右へ">→</button></div>':''}</div>`}</div>`;}
function commandPanel(){
  if(playback){const lines=playback.current?.lines||['戦闘開始！'];return `<div class="command-window playback"><div class="command-name">${playback.position+1} / ${playback.frames.length}　戦闘中</div><div class="playback-lines" aria-live="polite">${lines.map(l=>`<p>${escape(l)}</p>`).join('')}</div><div class="playback-actions"><button data-act="battle-next">次へ ▸</button><button data-act="battle-skip">結果まで進む »</button></div></div>`;}
  if(battle.result)return `<div class="command-window battle-result"><span class="result-star">${battle.result==='win'?'✦':'◇'}</span><h2>${battle.result==='win'?'障害を解消した！':'全員が倒れてしまった…'}</h2><p>${battle.result==='win'?`${battle.boss?120:25} G と 薬草${battle.boss?3:1}個を獲得。`:'再試行で消耗品も元通り。監視と回復を忘れずに。'}</p><div class="result-actions"><button data-act="${battle.result==='win'?'victory':'retry'}">${battle.result==='win'?'探索に戻る':'もう一度挑む'}</button>${battle.result==='lose'?'<button data-act="retreat">村へ戻る</button>':''}</div></div>`;
  if(commander===4)return `<div class="command-window"><div class="command-name">この作戦で、いこう。</div><div class="plan-summary">${state.party.map((h,i)=>`<span><b>${h.name}</b> ${h.hp>0?SKILLS[choices[i]].label:'戦闘不能'}</span>`).join('')}</div><div class="command-grid"><button data-act="turn" class="commit-command">▶ 戦闘開始</button><button data-act="command-back">‹ 選び直す</button></div></div>`;
  const hero=state.party[commander];
  let body='';
  if(commandMode==='root')body=`<div class="command-grid"><button data-skill="attack">⚔ こうげき</button><button data-command="skills">✦ とくぎ</button><button data-command="items">◇ どうぐ</button><button data-skill="guard">▣ ぼうぎょ</button></div><div class="command-secondary"><button data-act="command-back" ${commander===state.party.findIndex(h=>h.hp>0)?'disabled':''}>‹ 前の仲間</button><button data-act="flee">一旦持ち帰る ↗</button></div>`;
  else if(commandMode==='skills'||commandMode==='items'){
    const list=optionsFor(commander).filter(([k,v])=>commandMode==='skills'?v.owner===commander:['potion','seal'].includes(k));
    body=`<div class="skill-grid">${list.map(([k,v])=>`<button data-skill="${k}" ${hero.mp<v.cost||k==='potion'&&state.potions<1?'disabled':''}><b>${v.label}</b><small>${k==='potion'?`残り${state.potions}個`:v.cost?`MP ${v.cost}`:'消費なし'} · ${v.help}</small></button>`).join('')}</div><button class="back-command" data-act="command-back">‹ 戻る</button>`;
  }else if(commandMode==='target'){
    const skill=SKILLS[selectedSkill],list=skill.target==='enemy'?battle.enemies:state.party;
    body=`<p class="target-help">${skill.label} → 対象を選ぶ</p><div class="target-grid">${list.map((h,i)=>`<button data-target="${i}" ${h.hp<=0&&selectedSkill!=='restart'?'disabled':''}>${h.name}<small>HP ${h.hp}/${h.maxHp}</small></button>`).join('')}</div><button class="back-command" data-act="command-back">‹ 戻る</button>`;
  }
  return `<div class="command-window"><div class="command-name"><span style="color:${hero.color}">${hero.name}</span> は どうする？ <small>MP ${hero.mp} / ${hero.maxMp}</small></div>${body}</div>`;
}
function battleHTML(){const view=playback?.current||battle;const enemies=playback?.current?.enemies||battle.enemies;return `<div class="battle-status"><span>TURN ${battle.turn}</span><span>${view.scanned?'原因特定':'原因不明'} · ログ ${view.logging?'ON':'OFF'}${battle.boss?` · ${view.sealed?'刻印済み':'再送中'}`:''}</span></div><div class="battle-stage ${playback?'resolving':''}"><div class="ruin-column left"></div><div class="ruin-column right"></div><div class="battle-moon"></div><div class="battle-ground"></div><div class="enemy-line">${enemies.map((e,i)=>`<div class="enemy-figure ${e.hp<=0?'defeated':''} ${playback?.current?.lines.some(l=>l.includes(e.name)&&l.includes('ダメージ'))?'struck':''}"><canvas id="enemy-${i}" width="48" height="48" aria-label="${e.name}"></canvas><div class="enemy-caption"><b>${e.name}</b><div class="enemy-life"><i style="width:${e.hp/e.maxHp*100}%"></i></div><small>${e.hp} / ${e.maxHp}</small></div></div>`).join('')}</div></div><div class="battle-warning">${playback?'⚔ 行動中…':battle.result?'戦闘終了':forecast()}</div>${partyDock()}${commandPanel()}`;}
function render(){
  document.body.classList.toggle('large-text',prefs.large);document.body.classList.toggle('reduced',prefs.reduced);
  if(screen==='title'){title();return;}
  app.innerHTML=`<div class="game-root ${battle?'battle-mode':'world-mode'}">${hud()}${battle?battleHTML():worldHTML()}</div>`;
  if(battle)(playback?.current?.enemies||battle.enemies).forEach((e,i)=>drawMonster($(`#enemy-${i}`),e.type,i));else drawMap($('#map'),state);
  state.party.forEach((h,i)=>{const c=$(`#hero-${i}`);if(c)person(c.getContext('2d'),0,2,h.color);});
}
function chooseCommand(mode){if(playback||battle?.result)return;commandMode=mode;render();}
function commitChoice(skill,target){if(playback||!battle||battle.result)return;choices[commander]=skill;targets[commander]=target;do{commander++;}while(commander<4&&state.party[commander].hp<=0);commandMode='root';render();}
function turn(){
  if(playback||!battle||battle.result||commander!==4)return;
  const needed=choices.filter((c,i)=>c==='potion'&&state.party[i].hp>0).length;if(needed>state.potions){notice('薬草が足りません。作戦を選び直してください。');return;}
  const nextState=copy(state),nextBattle=copy(battle);resolveTurn(nextState,nextBattle,choices.map((type,i)=>({type,target:targets[i]})));
  playback={frames:nextBattle.frames,position:0,current:nextBattle.frames[0],nextState,nextBattle};
  if(prefs.reduced){finishPlayback();return;}render();playFrameSound();scheduleFrame();
}
function scheduleFrame(){clearTimeout(playbackTimer);if(playback&&!document.hidden&&!modal.open&&!prefs.reduced)playbackTimer=setTimeout(advanceFrame,Math.max(1800,(playback.current?.lines.join('').length||0)*50));}
function playFrameSound(){if(!playback)return;tone(playback.current?.lines.some(l=>l.includes('回復'))?'heal':'hit');}
function advanceFrame(){if(!playback)return;clearTimeout(playbackTimer);if(playback.position+1>=playback.frames.length){finishPlayback();return;}playback.position++;playback.current=playback.frames[playback.position];render();playFrameSound();scheduleFrame();}
function finishPlayback(){if(!playback)return;clearTimeout(playbackTimer);state=playback.nextState;battle=playback.nextBattle;delete battle.frames;playback=null;commander=Math.max(0,state.party.findIndex(h=>h.hp>0));commandMode='root';choices=state.party.map(()=> 'attack');targets=[0,0,0,0];if(battle.result==='win')tone('win');render();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(playbackTimer);else scheduleFrame();});
modal.addEventListener('close',scheduleFrame);
modal.addEventListener('toggle',()=>{if(modal.open)clearTimeout(playbackTimer);});
try{const saved=JSON.parse(localStorage.getItem(`${KEY}-prefs`));if(saved&&typeof saved==='object')for(const k of Object.keys(prefs))if(k in saved)prefs[k]=saved[k]===true;}catch{}
render();
