import { HEROES, SKILLS, MIGRATIONS, activeMembers, levelUp, heroAtLevel, validAction, copy, initialState, rest, objective, createBattle, resolveTurn, flee, parseSave } from './engine.js';
import { MAPS, entities, pathTo } from './world.js';
import { EVENTS } from './campaign.js';
import { drawWorld, drawTitle, mapPoint } from './art.js';
import { setMusic } from './audio.js';
import { drawMonster } from './monsters.js';
import { INVESTIGATIONS } from './investigations.js';

const app = document.querySelector('#app'), modal = document.querySelector('#modal');
const KEY = 'engineer-rpg-v1';
let state = initialState(), screen = 'title', battle = null, beforeBattle = null, dialogue = null, moving = false, movementToken = 0, noticeTimer;
let choices = [], targets = [], prefs = { large: false, dpad: false, reduced: false, sound: true, music: false };
let commander = 0, commandMode = 'root', selectedSkill = null, playback = null, playbackTimer, lastAdvance = 0, soundContext;
let investigation = null;
let editingPlan = false;
const canCommand = i => !!state.party[i] && state.party[i].hp > 0 && !battle?.absences?.[i];
const firstCommander = () => activeMembers(state,battle)[0] ?? 4;
const rewardGold = () => (battle.boss?120:25)+(battle.overtimePay||0);
const absenceSummary = () => Object.entries(battle?.absences||{}).map(([i,reason])=>`${state.party[i].name}：${reason}（1ターン休み）`).join(' / ');
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = selector => document.querySelector(selector);
function notice(text, persistent = false) { const el = $('#notice'); el.textContent = text; el.classList.add('show'); if(modal.open){let status=modal.querySelector('[role=status]');if(!status){status=document.createElement('p');status.setAttribute('role','status');status.className='gold';modal.prepend(status);}status.textContent=text;}clearTimeout(noticeTimer); if (!persistent) noticeTimer = setTimeout(() => el.classList.remove('show'), 4500); }
function save(slot = 'auto') { try { localStorage.setItem(`${KEY}-${slot}`, JSON.stringify(state)); return true; } catch { notice('保存できません。設定からデータを書き出してください。', true); return false; } }
function available(slot) { try { return !!localStorage.getItem(`${KEY}-${slot}`); } catch { return false; } }
function load(slot) { try { const raw = localStorage.getItem(`${KEY}-${slot}`); if (!raw) throw new Error('保存データがありません。'); const next = parseSave(raw); if (MAPS[next.map].grid[next.y][next.x] !== '.') throw new Error('保存位置が不正です。'); state = next; movementToken++; moving=false; battle=null; dialogue=null; screen='world'; modal.close(); render(); if(state.flags.finished)showCredits();else notice('冒険を再開しました。'); } catch (e) { notice(e.message || '読み込めませんでした。'); } }
function note(text) { if (!state.notes.includes(text)) state.notes.push(text); }
function talk(speaker, lines, after) { dialogue = { speaker, lines, index: 0, after }; render(); }
function nextDialogue() { if (!dialogue) return; state.history.push(`${dialogue.speaker}：${dialogue.lines[dialogue.index]}`); state.history = state.history.slice(-120); dialogue.index++; if (dialogue.index >= dialogue.lines.length) { const fn=dialogue.after; dialogue=null; fn?.(); save(); } render(); }

function optionsFor(i) { return Object.entries(SKILLS).filter(([key,s]) => (s.owner===undefined || s.owner===i) && (!s.requiredFlag||state.flags[s.requiredFlag]) && (key!=='seal'||battle.id==='boss') && (!key.startsWith('evidence_')||battle.id==='knights') && (!MIGRATIONS.includes(key)||battle.id==='legacy'&&MIGRATIONS[battle.phase]===key)); }
function forecast() {
  if(battle.id==='legacy')return `移行 ${battle.phase+1}/3：${['受発注','在庫','請求'][battle.phase]||'完了'} · 暴走40%以下で移行可。${battle.turn%3===0?'次：全体負荷＋炎上':'次：単体障害'}`;
  if(battle.id==='knights')return '未合意の騎士は攻撃を反射。対応する記録を「どうぐ」から提示。';
  if(battle.id==='boss')return `${battle.enemies[0].hp>0?(battle.turn%2===0?'送信：一斉再送＋炎上':'送信：単体攻撃'):''} ${battle.enemies[1].hp>0?(battle.turn%3===0?'再送：「そんな話は聞いていない」':'再送：単体攻撃'):''}`;
  if(battle.kind==='meeting'&&battle.turn%2===0)return '予兆：会議延長。全員のMPを3消費。';
  if(battle.kind==='scope'&&battle.turn%2===0)return '予兆：「あと一点だけ」で攻撃力上昇。';
  if(battle.kind==='spec'&&!battle.scanned)return `予兆：${battle.turn%2===0?'パッチ':'通常攻撃'}に耐性。ログで仕様を確定しよう。`;
  return battle.turn%2===0?'予兆：障害通知＋炎上':'予兆：単体への障害通知';
}
async function travel(x,y) {
  if (moving || dialogue || battle || screen!=='world') return;
  const route=pathTo(state,x,y); if(!route){notice('そこへは移動できません。通路を選んでください。');return;}
  moving=true; const token=++movementToken; render();
  for(const step of route.path){if(token!==movementToken)return;state.x=step.x;state.y=step.y;state.steps++;drawMap($('#map'),state);if(!prefs.reduced)await new Promise(r=>setTimeout(r,75));}
  if(token!==movementToken)return;moving=false;render();
  if(route.target)interact(route.target.id);else{save();render();}
}
function changeMap(map,x,y){state.map=map;state.x=x;state.y=y;save();render();setMusic(prefs.music,MAPS[map].theme==='village'?'field':'dungeon');}
function interact(id){
  if(interactCampaign(id))return;
  switch(id){
    case 'shop':
      if(state.flags.boss&&!state.flags.complete){talk('道具屋 → 村長',['注文が一回ずつ届く！ ありがとう。これで薬草の山に埋もれずに済む。','村長「見事じゃ。この仕組みは、王国の全店舗で使っておる」','ユウ「ちなみに、何店舗ですか？」','村長「128店舗じゃ。今回と同じ修正でよいから、簡単じゃろう？」','対象店舗：1 → 128。あなたは、見積もりを持ち帰ることにした。'],()=>{state.flags.complete=true;note('第一章完了。二重送信を解消。残り127店舗は別途お見積もり。');showEnding();});}
      else if(state.flags.complete)talk('道具屋',['今日はもう休んでいってくれ。追加の依頼は明日の営業時間に頼むよ。']);
      else if(state.flags.quest)talk('道具屋',['店員にも話を聞いてくれ。村長なら、古い仕組みを知っているかもしれない。','地下へ行く前に宿で休んでいきな。宿代はこの案件の経費にしておいた。']);
      else talk('道具屋',['薬草を十個注文したら、二十個届いたんだ。私は一回しか頼んでいない。','営業からは「簡単な修正」と聞いている。原因？ それを調べてもらいたくてね。','ユウ「現場の操作から確認します。今回から参加のリナ、後輩のテオ、古参のガン。四人で行こう」','テオ「注文が二倍。売上も二倍……？」 リナ「その要件、誰も頼んでないよ」 ガン「全員で聞いて、直して、確かめよう」','薬草6個を持ってきた。HPが減ったら「再テスト」。担当以外でも助け合える。村の宿では無料で全回復できる。'],()=>{state.flags.quest=true;note('依頼：薬草の注文が二重に届く。店員の操作と村長の運用を調べる。');});
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
    case 'terminal':talk('運用端末',['WARNING: ログ出力は負荷対策のため無効化されています。','ガン「調査のためのログを出すための作業、か。『監視強化』は誰でも使える。今回は俺が先に入れる」','ユウ「その後に『ログを見ろ』。原因が分かれば攻撃の威力が上がる」','ガンはユウより速い。同じターンに監視とログを選んでも順番通りに使える。'],()=>{state.flags.terminal=true;note('攻略：ガンの監視強化 → ユウのログを見ろ。原因特定後は攻撃が1.5倍。');});break;
    case 'minutes':talk('承認済み議事録',state.flags.minutes?['議事録はすでに手帳に保管した。証拠は何枚あってもよい。']:['「同じ注文は一回だけ処理すること。全関係者了承済み」','ユウは「議事録の盾」を使えるようになった！','3ターン以内の「そんな話は聞いていない」を一度防ぐ。ボスの予告に合わせて使おう。'],()=>{state.flags.minutes=true;note('議事録：二重処理は禁止。議事録の盾でボスの合意巻き戻しを一度無効化できる。');});break;
    case 'seal':talk('古い宝箱',state.flags.seal?['処理済みの刻印は持っている。押印回数に制限はない。']:['「処理済みの刻印」を手に入れた！','テオ「同じ注文番号に二度、処理をしない。これで再送されても大丈夫」','双頭蛇との戦闘で、誰か一人の行動を「処理済みの刻印」にしよう。復活を止められる。','古い回復装置も動いた。全員のHP・MPが回復した。'],()=>{if(!state.flags.seal)rest(state);state.flags.seal=true;note('刻印を入手。戦闘コマンドで使うと双頭蛇の復活が止まる。消費しない。');});break;
    case 'archive':talk('前任者の記録',['「再送そのものは悪ではない。届かなかった注文を助けるための仕組みだ」','「同じ依頼かどうかを確認せず、二度実行することが問題なのだ」','リナ「全部消せばよい、というわけではないのね」','ガン「こいつも、誰かを助けようとして動いていたんだな」'],()=>{state.flags.archive=true;note('前任者の記録：再送を全廃せず、同じ注文を重複処理しない仕組みを入れる。');});break;
    case 'boss':if(!state.flags.seal){talk('テオ',['二つの首が互いを復活させている。先に宝箱の「処理済みの刻印」を探そう。']);break;}talk('二重送信の双頭蛇',['「受付完了……受付完了……」 同じ注文が繰り返されている。','ユウ「止めよう。今度こそ、一回だけ届くように」'],()=>startBattle('boss'));break;
    default:if(['slime1','slime2','ghost'].includes(id))startBattle(id);
  }
}
function startBattle(id){editingPlan=false;save();beforeBattle=copy(state);battle=createBattle(id,state);choices=state.party.map(()=> 'attack');targets=[0,0,0,0];commander=firstCommander();commandMode='root';playback=null;render();setMusic(prefs.music,'battle');tone('battle');}
function finishBattle(){
  setMusic(prefs.music,state.map==='village'?'field':'dungeon');
  const id=battle.id,boss=battle.boss;
  if(!state.defeated.includes(id))state.defeated.push(id);
  state.gold+=rewardGold();state.potions+=boss?3:1;
  if(battle.scanned)note(`${battle.enemies[0].name}をログで調査済み。原因が分かれば対策できる。`);
  battle=null;beforeBattle=null;
  if(id==='boss'){
    state.flags.boss=true;levelUp(state);note('双頭蛇を攻略。二重送信を停止した。道具屋への報告が残っている。');save();
    talk('ユウ',['二重送信は止まった。二重チェックの会議は残った。','緊張がほどけた。全員のHP・MPが回復した！','リナ「終わった！」 テオ「報告までが仕事です」','村へ戻って、道具屋に伝えよう。'],()=>changeMap('village',4,2));
  }else if(id==='knights'){
    state.flags.knights=true;levelUp(state);save();event('border_resolved',()=>changeMap('gate',4,2));
  }else if(id==='legacy'){
    state.flags.finished=true;rest(state);save();event('legacy_handoff',()=>{const count=['auto_test','restore_test','handover'].filter(k=>state.flags[k]).length;event(count===3?'epilogue_best':count?'epilogue_good':'epilogue_hero',showCredits);});
  }else{save();render();notice('障害を解消。敵は復活しません。');}
}
function showEnding(){talk('次の冒険へ',['第一章「ボタンは二度押された」 完了。','国境の橋でも、申請が届かなくなっているらしい。村の右下の道から向かおう。','サラという営業が待っている。「今回は契約書も持っていく」とのことだ。']);}
function showCredits(){const count=['auto_test','restore_test','handover'].filter(k=>state.flags[k]).length;openModal(count===3?'定時退社':count?'無事納品':'伝説の担当者',`<div class="credits"><div class="eyebrow">THE END</div><h3>その件、持ち帰ります。</h3><p>勇者一行、要件未定。</p><p style="margin:22px 0">調べた出来事 ${state.notes.length}件<br>解消した障害 ${state.defeated.length}件<br>運用の準備 ${count} / 3</p><p>今日の仕事には、終わりがあった。</p><p class="muted">閉じた後も、手帳から切替前の世界へ戻れます。任意依頼を整えて別の結末へ挑めます。</p><button data-act="postgame" style="margin-top:20px">切替前の世界へ</button></div>`);}
function event(id,after){const data=EVENTS[id];talk(data.speaker,data.lines,()=>{state.flags[data.flag]=true;note(`${data.speaker}：${data.lines.at(-1)}`);after?.();});}
function startInvestigation(id,after){
  if(state.flags[`${id}_complete`]){after?.();return;}
  const data=INVESTIGATIONS[id];let step=0;while(state.flags[`${id}_step_${step}`]&&step<data.steps.length)step++;
  if(step>=data.steps.length){state.flags[`${id}_complete`]=true;save();after?.();return;}
  investigation={id,step,after};drawInvestigation();
}
function drawInvestigation(feedback=null,correct=false){
  const {id,step}=investigation,data=INVESTIGATIONS[id],part=data.steps[step];
  openModal(data.title,`<div class="investigation-progress" aria-label="手順${step+1}/${data.steps.length}">${data.steps.map((_,i)=>`<span class="${i<=step?'lit':''}">${i<step?'◆':'◇'}</span>`).join('<i>─</i>')}</div><div class="investigation-speaker">${part.speaker}</div><p class="investigation-text">${part.text}</p>${feedback?`<div class="investigation-feedback"><p>${escape(feedback)}</p><button data-investigation-next="${correct?'advance':'retry'}">${correct?'次の記録へ ▸':'もう一度考える ↶'}</button></div>`:`<div class="investigation-choices">${part.choices.map((c,i)=>`<button data-investigation-choice="${i}"><span>▸</span>${c.label}</button>`).join('')}</div>`}<p class="investigation-footnote">模擬環境 / 閉じても確認済みの手順は残ります</p>`);
}
function battleName(){return battle.id==='boss'?'二重送信の双頭蛇':battle.id==='knights'?'責任分界の三騎士':battle.id==='legacy'?'古代機 レガシア':'不具合との遭遇';}
function equipment(){openModal('旅の装備屋',`<p class="gold">所持金 ${state.gold} G</p><p>必要な装備は、気合いより経費。</p><div class="stack">${state.party.map((h,i)=>`<h3>${h.name} · Lv.${state.level||1}</h3>${[['weapon','承認印の武器','攻撃+4'],['armor','耐火の外套','防御+3'],['charm','休憩の護符','最大MP+6']].map(([key,name,effect])=>`<button data-buy="${i},${key}" ${state.gear?.[i]?.[key]||state.gold<45?'disabled':''}>${state.gear?.[i]?.[key]?'装備済み':name+' / 45 G'} <small>${effect}</small></button>`).join('')}`).join('')}<button data-act="buy-potion" ${state.gold<10?'disabled':''}>薬草 / 10 G（所持 ${state.potions}個）</button></div>`);}
function blocked(speaker,text){talk(speaker,[text]);return true;}
function interactCampaign(id){
  if(id==='supplies'){equipment();return true;}
  const paths={to_application:['application',4,6],to_network:['network',4,6],to_gate:['gate',4,6],to_training:['training',4,6],back_border:['border',4,6],back_village:['village',6,7],back_gate:['gate',6,1],to_vault:['vault',4,6],to_operations:['operations',4,6],back_capital:['capital',4,6],back_tower:['tower',4,2]};
  if(paths[id]){changeMap(...paths[id]);return true;}
  if(id==='border_gate'){if(!state.flags.complete)return blocked('ユウ','先に道具屋へ報告してから、次の案件に向かおう。');changeMap('border',4,6);if(!state.flags.border_arrival)event('border_arrival');return true;}
  if(id==='to_capital'){if(!state.flags.knights)return blocked('門番','三社の認識が揃うまで、門を開けられない。');changeMap('capital',4,6);if(!state.flags.capital_arrival)event('capital_arrival');return true;}
  if(id==='camp_rest'){rest(state);save();talk('休憩所',['全員のHP・MPが回復した。','テオ「休憩を取らないと、レビューする目も曇りますから」']);return true;}
  if(id==='to_tower'){
    if(!['king_deadline','order_owner','stock_owner','invoice_owner'].every(k=>state.flags[k]))return blocked('ユウ','王と、受発注・在庫・請求の担当者に切替条件を聞こう。誰かの業務を知らずに移行はできない。');
    changeMap('tower',4,6);return true;
  }
  if(id==='to_release'){if(!state.defeated.includes('scope1')||!state.defeated.includes('spec2'))return blocked('ガン','回廊の追加要求と仕様変更を整理しよう。切替作業に持ち込むと危険だ。');changeMap('release',4,6);return true;}
  if(id==='knights'){
    if(!['evidence_a','evidence_b','evidence_c'].every(k=>state.flags[k]))return blocked('ユウ','受付台帳、中継碑、変更台帳。三つの記録が揃えば、同じ出来事を追いかけられる。');
    if(!state.flags.trace_complete){startInvestigation('trace',()=>interactCampaign('knights'));return true;}
    event('boundary_minutes',()=>event('knights_warning',()=>startBattle('knights')));return true;
  }
  if(id==='legacy'){
    if(!state.flags.release_scope||!state.flags.legacy_voice)return blocked('ユウ','サラと古代の声を確認して、今回の切替範囲を確定しよう。');
    if(!state.defeated.includes('scope2'))return blocked('サラ','「あと一点」の追加要求を片付けてから切替へ進みましょう。');
    if(!state.flags.release_complete){startInvestigation('release',()=>interactCampaign('legacy'));return true;}
    event('release_ready',()=>openModal('切替を開始する？',`<p>開始すると戦闘中は帰還できません。敗北時は直前から再挑戦できます。</p><p>自動テスト：${state.flags.auto_test?'完了':'未完了'}<br>復元確認：${state.flags.restore_test?'完了':'未完了'}<br>引き継ぎ：${state.flags.handover?'完了':'未完了'}</p><div class="stack"><button data-act="start-final">切替を開始する</button><button data-act="close">まだ準備する</button></div>`));return true;
  }
  const barriers={evidence_a:['meeting1','golem1'],evidence_b:['spec1','ghost2'],evidence_c:['slime3']};
  if(barriers[id]&&!barriers[id].every(k=>state.defeated.includes(k)))return blocked('ガン','端末が不具合に占拠されている。近くの敵を片付けてから、記録を取り出そう。');
  if(id==='test_request'){if(state.flags.test_normal&&state.flags.test_rejected)event('auto_test');else event('test_request');return true;}
  if(id==='normal_trial'||id==='rejected_trial'){
    if(!state.flags.test_request)return blocked('テオ','検証士に困っていることを聞いてから、試験条件を決めよう。');
    if(!state.defeated.includes('meeting2'))return blocked('検証士','確認会議の亡霊が、試験開始前の確認を要求しています。まず片付けましょう。');
    const normal=id==='normal_trial';openModal(normal?'正常系を確かめる':'異常系を確かめる',`<p>${normal?'登録済みの印章を一回送信した。正しい結果は？':'未登録の印章を送信した。試験が合格になる結果は？'}</p><div class="stack"><button data-trial="${normal?'test_normal':'test_rejected'}">${normal?'門が一度だけ開く':'拒否され、理由が表示される'}</button><button data-trial="wrong">${normal?'成功表示だけ確認すればよい':'通らないので、試験は失敗'}</button></div>`);return true;
  }
  if(id==='restore_request'){if(state.flags.restore_trial)event('restore_test');else event('restore_request');return true;}
  if(id==='restore_trial'){
    if(!state.flags.restore_request||!state.flags.restore_archive)return blocked('ガン','司書の依頼と「最新」の写本を先に確認しよう。');
    if(!state.defeated.includes('ghost3'))return blocked('司書','復元の影が試験台座を塞いでいます。先に調査してください。');
    openModal('どの記録を戻す？','<p>本番の最新記録は注文42。正しい写本を選ぼう。</p><div class="stack"><button data-trial="wrong">表紙に「最新」と書かれた写本</button><button data-trial="restore_trial">保管台帳で封印番号を照合した写本</button></div>');return true;
  }
  if(id==='handover_request'){if(state.flags.handover_trial)event('handover');else event('handover_request');return true;}
  if(id==='handover_trial'){
    if(!state.flags.handover_request)return blocked('ユウ','ノノが手順書のどこで困るか、先に聞こう。');
    if(!state.defeated.includes('golem2'))return blocked('ノノ','属人化の壁が立ちはだかっています。「あの人がいないと分からない」と。');
    startInvestigation('rehearsal',()=>event('handover_trial'));return true;
  }
  const jokes={application_memo:['付箋の山','「要確認」の付箋に「確認済み」の付箋が貼られ、その上に「再確認」が貼られている。','テオ「状態管理を別の手段にしましょう」'],network_memo:['監視盤','緑、緑、緑。大きく「正常」。隅に小さく「最終更新：三日前」。','ガン「監視を監視する仕組みが必要だな」'],vault_memo:['保管庫の棚','「最終」「最終2」「本当の最終」「提出用」「提出用_修正」','司書「最後は表紙の色で覚えています」 ガン「それ、引き継げますか」'],ops_memo:['当番表','月：ユウ　火：ユウ　水：ユウ　木：ユウ　金：ユウ','ユウ「僕が五人いるなら、有給を取れそうですね」']};
  if(jokes[id]){const [speaker,...lines]=jokes[id];talk(speaker,lines,()=>{state.flags[id]=true;note(`${speaker}：${lines[0]}`);});return true;}
  if(EVENTS[id]){event(id);return true;}
  if(/^(meeting|spec|golem|scope|ghost|slime)\d+$/.test(id)){startBattle(id);return true;}
  return false;
}
function openModal(title,body){modal.innerHTML=`<button class="close quiet" data-act="close" aria-label="閉じる">×</button><h2 id="modal-title">${title}</h2>${body}`;if(!modal.open)modal.showModal();}
function journal(){openModal('冒険の手帳',`<p class="gold">${objective(state)}</p>${state.flags.finished?'<button data-act="postgame">切替前の世界へ戻る</button>':''}<h3>パーティー Lv.${state.level||1}</h3><p>${state.party.map(h=>`${h.name}（${h.job}）　攻撃${h.attack} / 防御${h.defense}`).join('<br>')}</p><h3>調査メモ</h3>${state.notes.length?`<ul>${state.notes.map(n=>`<li>${escape(n)}</li>`).join('')}</ul>`:'<p>道具屋で依頼を受けると、調査メモが増えます。</p>'}<h3>最近の会話</h3>${state.history.slice(-12).map(t=>`<p>${escape(t)}</p>`).join('')}`);}
function settings(){openModal('設定と冒険の記録',`<label class="setting"><input type="checkbox" data-pref="large" ${prefs.large?'checked':''}>会話の文字を大きくする</label><label class="setting"><input type="checkbox" data-pref="dpad" ${prefs.dpad?'checked':''}>方向ボタンを表示する</label><label class="setting"><input type="checkbox" data-pref="reduced" ${prefs.reduced?'checked':''}>移動・戦闘の演出を省略する</label><label class="setting"><input type="checkbox" data-pref="sound" ${prefs.sound?'checked':''}>効果音</label><label class="setting"><input type="checkbox" data-pref="music" ${prefs.music?'checked':''}>BGM（控えめな音量）</label><h3>冒険の記録</h3><p>この端末・ブラウザに保存します。戦闘中に閉じた場合は戦闘直前から再開します。</p><div class="stack"><button data-act="manual-save" ${screen==='title'||battle||dialogue||moving?'disabled':''}>冒険を記録する</button><button data-act="manual-load" ${!available('manual')||!!battle||moving?'disabled':''}>記録から再開する</button><button data-act="export" ${screen==='title'||dialogue||moving?'disabled':''}>記録を書き出す</button><label>記録を読み込む<input type="file" id="import" accept="application/json,.json" ${battle||moving?'disabled':''}></label><button data-act="title" ${battle||dialogue||moving?'disabled':''}>タイトルへ戻る</button></div>`);}
function skills(){openModal('特技の説明',Object.entries(SKILLS).filter(([k])=>k!=='seal'||state.flags.seal).map(([k,v])=>`<h3>${v.label}${v.cost?` · MP${v.cost}`:''}</h3><p>${v.help}</p>`).join(''));}
function newGame(){state=initialState();screen='world';battle=null;dialogue=null;movementToken++;moving=false;save();talk('案件ギルドの紹介状',['ここはハジマリ村。あなたたちは、小さな不具合を直しにやってきた。','依頼書には「薬草の注文がおかしい。簡単な修正のはず」とだけ書かれている。','まずは村の左上にいる道具屋へ。マップの人物、または下の目的地ボタンをタップしよう。']);}
document.addEventListener('click',e=>{
  const btn=e.target.closest('button');if(!btn||btn.disabled)return;
  tone('select');
  if(btn.dataset.revise!==undefined){commander=Number(btn.dataset.revise);editingPlan=true;commandMode='root';render();return;}
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
    case 'help':openModal('冒険のすすめ方','<p>マップの人物や宝箱をタップすると、そこまで移動して調べます。目的地ボタンでも同じ操作ができます。</p><h3>戦闘</h3><p>4人の行動と対象を選び、「戦闘開始」を押します。実行前なら何度でも変更できます。ガンの「監視強化」とユウの「ログを見ろ」を組み合わせると有利です。</p><h3>休みと残業代</h3><p>予定された研修・健診・離席は1ターン休み。次のターンに復帰します。有給休暇は一人ずつHP・MPを回復し、そのターン休みます。戦闘が4ターン以上かかると残業代が加算されます（上限60G）。休み中の仲間は攻撃されません。</p><h3>回復と中断</h3><p>村の宿屋で無料の全回復。自動保存は移動・イベント・戦闘終了時。いつでも閉じて大丈夫です。敗北後は消耗品も戻して再試行できます。</p><h3>PCでの操作</h3><p>マウス操作、または矢印キーで移動。会話は「つづける」で進めます。</p>');break;
    case 'turn':turn();break;
    case 'battle-next':advanceFrame();break;
    case 'battle-skip':finishPlayback();break;
    case 'command-back':if(commandMode==='root'){if(editingPlan){commander=4;editingPlan=false;}else{const previous=state.party.map((h,i)=>i).filter(i=>i<commander&&canCommand(i)).at(-1);if(previous!==undefined)commander=previous;}}commandMode='root';render();break;
    case 'destinations':openModal('どこへ向かう？',`<div class="destination-grid">${entities(state).map(e=>`<button data-destination="${e.id}">${e.type==='enemy'||e.type==='boss'?'⚔ ':e.type==='exit'?'↗ ':''}${e.label}</button>`).join('')}</div>`);break;
    case 'inspect':{const list=entities(state).filter(e=>Math.abs(e.x-state.x)+Math.abs(e.y-state.y)===1);if(list.length===1)interact(list[0].id);else if(list.length>1)openModal('何を調べる？',`<div class="stack">${list.map(e=>`<button data-destination="${e.id}">${e.label}</button>`).join('')}</div>`);else notice('人や宝箱に近づいてみよう。');break;}
    case 'victory':finishBattle();break;
    case 'retry':{const id=battle.id;state=copy(beforeBattle);startBattle(id);break;}
    case 'retreat':state=copy(beforeBattle);battle=null;beforeBattle=null;changeMap('village',4,7);break;
    case 'flee':if(!flee(state,battle)){notice('切替中は帰還できません。復旧か移行を進めよう。');break;}battle=null;beforeBattle=null;save();render();notice('持ち帰りました。宿で回復して再挑戦できます。');break;
    case 'start-final':modal.close();startBattle('legacy');break;
    case 'postgame':modal.close();state.flags.finished=false;state.defeated=state.defeated.filter(id=>id!=='legacy');rest(state);changeMap('release',4,2);break;
    case 'buy-potion':if(state.gold>=10){state.gold-=10;state.potions++;save();equipment();}break;
    case 'manual-save':if(save('manual'))notice('手動セーブしました。');break;
    case 'manual-load':load('manual');break;
    case 'export':{const data=battle?beforeBattle:state;const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='engineer-rpg-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);break;}
    case 'title':modal.close();if(screen!=='title')save();screen='title';render();break;
  }
});
document.addEventListener('click',e=>{const b=e.target.closest('[data-destination]');if(!b)return;const entity=entities(state).find(x=>x.id===b.dataset.destination);modal.close();if(entity)travel(entity.x,entity.y);});
document.addEventListener('click',e=>{
  const choice=e.target.closest('[data-investigation-choice]');
  if(choice&&investigation){const part=INVESTIGATIONS[investigation.id].steps[investigation.step],result=part.choices[Number(choice.dataset.investigationChoice)];if(result.correct){state.flags[`${investigation.id}_step_${investigation.step}`]=true;save();}drawInvestigation(result.feedback,result.correct);return;}
  const advance=e.target.closest('[data-investigation-next]');
  if(advance&&investigation){if(advance.dataset.investigationNext==='retry'){drawInvestigation();return;}investigation.step++;if(investigation.step>=INVESTIGATIONS[investigation.id].steps.length){const {id,after}=investigation;state.flags[`${id}_complete`]=true;note(`${INVESTIGATIONS[id].title}：記録・試行・結果を照合し、全手順を確認した。`);investigation=null;save();modal.close();after?.();render();}else drawInvestigation();return;}
  const trial=e.target.closest('[data-trial]');if(trial){const id=trial.dataset.trial;modal.close();if(id==='wrong')talk('テオ',['今なら失敗しても大丈夫。大事なのは「何が正しい結果か」を確かめることです。もう一度試しましょう。']);else event(id);return;}
  const gear=e.target.closest('[data-buy]');if(gear&&!gear.disabled){const[i,key]=gear.dataset.buy.split(',');if(state.gold<45||state.gear[i][key])return;const h=state.party[i],newGear={...state.gear[i],[key]:true},stats=heroAtLevel(Number(i),state.level||1,newGear);state.party[i]={...stats,hp:h.hp,mp:h.mp+stats.maxMp-h.maxMp,burn:h.burn};state.gear[i]=newGear;state.gold-=45;save();equipment();}
});
document.addEventListener('change',async e=>{
  if(e.target.dataset.actionIndex!==undefined){const i=Number(e.target.dataset.actionIndex);choices[i]=e.target.value;const list=SKILLS[choices[i]].target==='ally'?state.party:battle.enemies;targets[i]=Math.max(0,list.findIndex(h=>h.hp>0));render();}
  if(e.target.dataset.targetIndex!==undefined)targets[Number(e.target.dataset.targetIndex)]=Number(e.target.value);
  if(e.target.dataset.pref){prefs[e.target.dataset.pref]=e.target.checked;setMusic(prefs.music,battle?'battle':state.map==='village'?'field':'dungeon');try{localStorage.setItem(`${KEY}-prefs`,JSON.stringify(prefs));}catch{}if(prefs.reduced&&playback)finishPlayback();else render();}
  if(e.target.id==='import'&&e.target.files[0]){try{const file=e.target.files[0];if(file.size>250000)throw new Error('データが大きすぎます。');const next=parseSave(await file.text());if(MAPS[next.map].grid[next.y][next.x]!=='.')throw new Error('保存位置が不正です。');state=next;battle=null;dialogue=null;screen='world';modal.close();save();render();notice('セーブデータを読み込みました。');}catch(err){notice(err.message);}}
});
app.addEventListener('click',e=>{if(e.target.id!=='map')return;const point=mapPoint(e.target,e.clientX,e.clientY);if(point)travel(point.x,point.y);});
document.addEventListener('keydown',e=>{if(modal.open||e.target.matches('select,input,button')||screen!=='world'||battle||dialogue)return;const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];if(d){e.preventDefault();travel(state.x+d[0],state.y+d[1]);}});

// Tiny original pixel sprites, painted locally: no downloaded art or external fonts.
function rect(ctx,color,x,y,w,h){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function person(ctx,x,y,color,player=false){rect(ctx,'#0b191b66',x+7,y+25,19,5);rect(ctx,'#302b29',x+11,y+3,11,5);rect(ctx,'#e6bf8e',x+12,y+8,9,7);rect(ctx,color,x+9,y+15,15,10);rect(ctx,'#22343b',x+10,y+25,5,5);rect(ctx,'#22343b',x+18,y+25,5,5);rect(ctx,'#edcea4',x+6,y+16,3,8);rect(ctx,'#edcea4',x+24,y+16,3,8);rect(ctx,'#263c39',x+18,y+10,2,2);if(player){rect(ctx,'#e8d998',x+9,y+3,15,3);rect(ctx,'#e8d998',x+14,y-3,5,3);}}
function tree(ctx,x,y){rect(ctx,'#71553b',x+14,y+16,5,16);rect(ctx,'#163f30',x+2,y+4,29,20);rect(ctx,'#2e6845',x+7,y,19,25);rect(ctx,'#407b50',x+10,y+2,10,13);rect(ctx,'#548857',x+8,y+8,4,5);}
function drawMap(canvas,s,titleArt=false){if(!canvas)return;if(titleArt)drawTitle(canvas);else drawWorld(canvas,s,MAPS[s.map],entities(s));}
function tone(kind){
  if(!prefs.sound)return;
  try{soundContext ||= new(window.AudioContext||window.webkitAudioContext)();if(soundContext.state==='suspended')soundContext.resume();const start=soundContext.currentTime;const notes=kind==='win'?[392,523,659,784]:kind==='battle'?[196,233,294]:kind==='hit'?[110,65]:kind==='heal'?[523,659]:[660];notes.forEach((f,i)=>{const osc=soundContext.createOscillator(),gain=soundContext.createGain();osc.type=kind==='hit'?'sawtooth':'triangle';osc.frequency.value=f;gain.gain.setValueAtTime(.035,start+i*.08);gain.gain.exponentialRampToValueAtTime(.001,start+i*.08+.12);osc.connect(gain).connect(soundContext.destination);osc.start(start+i*.08);osc.stop(start+i*.08+.13);});}catch{}
}
function title(){
  app.innerHTML=`<div class="game-root title-screen"><canvas id="title-map" width="288" height="288" aria-hidden="true"></canvas><div class="title-vignette"></div><div class="title-emblem"><span class="title-overline">剣と魔法と、承認済みの議事録。</span><div class="crest">✦</div><h1>その件、<span>持ち帰ります。</span></h1><p>― 勇者一行、要件未定。 ―</p></div><nav class="title-menu" aria-label="タイトルメニュー">${available('auto')?'<button data-act="continue">つづきから</button>':''}<button data-act="new">はじめから</button><button data-act="settings">設定・冒険の記録</button></nav><div class="title-bottom"><span>三つの案件。一つの帰り道。</span><small>ENGINEER RPG</small></div></div>`;
  drawMap($('#title-map'),initialState(),true);
}
function hud(){return `<header class="game-hud"><div class="location"><small>${battle?'⚔ BATTLE':state.map==='village'?'◆ SAFE AREA':'◆ DUNGEON'}</small><strong>${battle?battleName():MAPS[state.map].name}</strong></div><div class="hud-actions"><button data-act="journal" aria-label="冒険の手帳">手帳</button><button data-act="settings" aria-label="設定とセーブ">☰</button></div></header>`;}
function dialogueHTML(){return `<section class="message-window"><div class="message-name">${escape(dialogue.speaker)}</div><div class="message-body" aria-live="polite">${escape(dialogue.lines[dialogue.index])}</div><button data-act="next" class="next-message">${dialogue.index===dialogue.lines.length-1?'閉じる':'つづける'} <span>▼</span></button><small class="page-count">${dialogue.index+1} / ${dialogue.lines.length}</small></section>`;}
function partyDock(){
  const shown=playback?.current?.party||state.party;
  return `<div class="party-dock">${shown.map((h,i)=>{const delta=playback?.previous?.party[i]?playback.previous.party[i].hp-h.hp:0;return `<div class="party-unit ${battle&&!playback&&commander===i?'active':''} ${h.hp<=0?'fallen':''} ${(playback?.current?.absences||battle?.absences)?.[i]?'away':''} ${delta>0?'hit-unit':delta<0?'healed-unit':''}" style="--hero:${h.color}">
  <canvas class="hero-sprite" id="hero-${i}" width="32" height="34" aria-hidden="true"></canvas>${delta?`<span class="unit-delta ${delta<0?'healing':''}">${delta>0?'-'+delta:'+'+-delta}</span>`:''}
  <div class="unit-info"><b>${h.name}<span class="${h.burn?'burning':''}">${h.hp<=0?'不能':(playback?.current?.absences||battle?.absences)?.[i]?'休み':h.burn?'炎上':h.job}</span></b><div class="hp-readout">HP <strong>${h.hp}</strong><small>/${h.maxHp}</small></div><div class="life-track"><i style="width:${h.hp/h.maxHp*100}%"></i></div><div class="mp-readout">MP ${h.mp}<small>/${h.maxMp}</small></div></div></div>`;}).join('')}</div>`;
}
function worldHTML(){return `<div class="quest-ribbon">◇ ${objective(state)}</div><div class="world-stage"><div class="map-wrap"><canvas id="map" width="288" height="288" tabindex="0" role="img" aria-label="${MAPS[state.map].name}。タップで移動。目的地ボタンからも移動できます。"></canvas></div><span class="area-caption">${MAPS[state.map].subtitle}</span></div>${state.flags.quest?partyDock():''}<div class="world-bottom">${dialogue?dialogueHTML():`<div class="explore-dock"><div class="travel-hint"><span>${moving?'移動中…':'行きたい場所をタップ'}</span><small>${state.gold} G　薬草 ${state.potions}</small></div><div class="explore-commands"><button data-act="destinations" ${moving?'disabled':''}>↗ 目的地</button><button data-act="inspect" ${moving?'disabled':''}>◇ しらべる</button><button data-act="help">？ 操作</button></div>${prefs.dpad?'<div class="dpad"><button data-dir="0,-1" aria-label="上へ">↑</button><button data-dir="-1,0" aria-label="左へ">←</button><button data-dir="0,1" aria-label="下へ">↓</button><button data-dir="1,0" aria-label="右へ">→</button></div>':''}</div>`}</div>`;}
function commandPanel(){
  if(playback){const lines=playback.current?.lines||['戦闘開始！'];return `<div class="command-window playback"><div class="command-name">${playback.position+1} / ${playback.frames.length}　戦闘中</div><div class="playback-lines" aria-live="polite">${lines.map(l=>`<p>${escape(l)}</p>`).join('')}</div><div class="playback-actions"><button data-act="battle-next">次へ ▸</button><button data-act="battle-skip">結果まで進む »</button></div></div>`;}
  if(battle.result)return `<div class="command-window battle-result"><span class="result-star">${battle.result==='win'?'✦':'◇'}</span><h2>${battle.result==='win'?'障害を解消した！':'全員が倒れてしまった…'}</h2><p>${battle.result==='win'?`${rewardGold()} G（基本${battle.boss?120:25}＋残業代${battle.overtimePay||0}）と 薬草${battle.boss?3:1}個を獲得。`:'再試行で消耗品も元通り。監視と回復を忘れずに。'}</p><div class="result-actions"><button data-act="${battle.result==='win'?'victory':'retry'}">${battle.result==='win'?'探索に戻る':'もう一度挑む'}</button>${battle.result==='lose'?'<button data-act="retreat">村へ戻る</button>':''}</div></div>`;
  if(commander===4)return `<div class="command-window"><div class="command-name">この作戦で、いこう。</div><div class="plan-summary">${state.party.map((h,i)=>`<button data-revise="${i}" ${!canCommand(i)?'disabled':''}><b>${h.name}</b> ${h.hp<=0?'戦闘不能':battle.absences?.[i]||SKILLS[choices[i]].label}${canCommand(i)?`<small>→ ${SKILLS[choices[i]].target==='enemy'?battle.enemies[targets[i]]?.name:SKILLS[choices[i]].target==='ally'?state.party[targets[i]]?.name:SKILLS[choices[i]].target==='self'?h.name:'全体'}</small>`:''}</button>`).join('')}</div><div class="command-grid"><button data-act="turn" class="commit-command">▶ 戦闘開始</button><button data-act="command-back">‹ 選び直す</button></div></div>`;
  const hero=state.party[commander];
  let body='';
  if(commandMode==='root')body=`<div class="command-grid"><button data-skill="attack">⚔ こうげき</button><button data-command="skills">✦ とくぎ</button><button data-command="items">◇ どうぐ</button><button data-skill="guard">▣ ぼうぎょ</button></div><div class="command-secondary"><button data-act="command-back" ${commander===firstCommander()?'disabled':''}>‹ 前の仲間</button><button data-act="flee">一旦持ち帰る ↗</button></div>`;
  else if(commandMode==='skills'||commandMode==='items'){
    const list=optionsFor(commander).filter(([k,v])=>commandMode==='skills'?v.category==='skill'&&!['attack','guard'].includes(k):v.category==='item');
    body=`<div class="skill-grid">${list.map(([k,v])=>`<button data-skill="${k}" ${hero.mp<v.cost||k==='potion'&&state.potions<1||(MIGRATIONS.includes(k)||k==='paid_leave')&&!validAction(state,battle,commander,{type:k,target:0})?'disabled':''}><b>${v.label}</b><small>${k==='potion'?`残り${state.potions}個`:v.cost?`MP ${v.cost}`:'消費なし'} · ${v.help}</small></button>`).join('')}</div><button class="back-command" data-act="command-back">‹ 戻る</button>`;
  }else if(commandMode==='target'){
    const skill=SKILLS[selectedSkill],list=skill.target==='enemy'?battle.enemies:state.party;
    body=`<p class="target-help">${skill.label} → 対象を選ぶ</p><div class="target-grid">${list.map((h,i)=>`<button data-target="${i}" ${(h.hp<=0&&selectedSkill!=='restart'||skill.target==='ally'&&battle.absences?.[i])?'disabled':''}>${h.name}<small>HP ${h.hp}/${h.maxHp}</small></button>`).join('')}</div><button class="back-command" data-act="command-back">‹ 戻る</button>`;
  }
  return `<div class="command-window"><div class="command-name"><span style="color:${hero.color}">${hero.name}</span> は どうする？ <small>MP ${hero.mp} / ${hero.maxMp}</small></div>${body}</div>`;
}
function bossStatus(view){
  if(battle.id==='boss')return view.sealed?'刻印済み':'再送中';
  if(battle.id==='knights')return `合意 ${view.enemies.filter(e=>e.proven).length} / 3`;
  if(battle.id==='legacy')return view.phase===3?'全系統移管済み':`${['受発注','在庫','請求'][view.phase]} ${view.migrationProgress}/${state.flags.handover?1:2}`;
  return '';
}
function battleHTML(){
  const view=playback?.current||battle,enemies=view.enemies;
  return `<div class="battle-status"><span>TURN ${battle.turn} · 残業代 ${battle.overtimePay||0} G</span><span>${view.scanned?'原因特定':'原因不明'} · ログ ${view.logging?'ON':'OFF'} ${bossStatus(view)}</span></div>
  <div class="battle-stage ${MAPS[state.map].theme} ${playback?'resolving':''}"><div class="ruin-column left"></div><div class="ruin-column right"></div><div class="battle-moon"></div><div class="battle-ground"></div>
  <div class="enemy-line">${enemies.map((e,i)=>{const delta=playback?.previous?.enemies[i]?playback.previous.enemies[i].hp-e.hp:0;return `<div class="enemy-figure ${e.hp<=0?'defeated':''} ${delta>0?'struck':''}">
  <canvas id="enemy-${i}" width="48" height="48" aria-label="${e.name}"></canvas>${delta?`<span class="floating-damage ${delta<0?'healing':''}">${delta>0?delta:'+'+-delta}</span>`:''}
  <div class="enemy-caption"><b>${e.name}</b>${battle.id==='knights'?`<small class="agreement">${e.proven?'✓ 合意済み':'転送中'}</small>`:''}<div class="enemy-life"><i style="width:${e.hp/e.maxHp*100}%"></i></div><small>${battle.id==='legacy'&&i===0?'暴走 ':''}${e.hp} / ${e.maxHp}</small></div></div>`;}).join('')}</div></div>
  <div class="battle-warning">${playback?'⚔ 行動中…':battle.result?'戦闘終了':[absenceSummary(),forecast()].filter(Boolean).join(' ／ ')}</div>${partyDock()}${commandPanel()}`;
}
function render(){
  document.body.classList.toggle('large-text',prefs.large);document.body.classList.toggle('reduced',prefs.reduced);
  if(screen==='title'){title();return;}
  app.innerHTML=`<div class="game-root ${battle?'battle-mode':'world-mode'}">${hud()}${battle?battleHTML():worldHTML()}</div>`;
  if(battle)(playback?.current?.enemies||battle.enemies).forEach((e,i)=>drawMonster($(`#enemy-${i}`),e.type,i));else drawMap($('#map'),state);
  state.party.forEach((h,i)=>{const c=$(`#hero-${i}`);if(c)person(c.getContext('2d'),0,2,h.color);});
}
function chooseCommand(mode){if(playback||battle?.result)return;commandMode=mode;render();}
function commitChoice(skill,target){if(playback||!battle||battle.result)return;choices[commander]=skill;targets[commander]=target;if(editingPlan){commander=4;editingPlan=false;}else do{commander++;}while(commander<4&&!canCommand(commander));commandMode='root';render();}
function turn(){
  if(state.party.some((h,i)=>canCommand(i)&&SKILLS[choices[i]]?.target==='ally'&&choices[targets[i]]==='paid_leave')){notice('有給予定の仲間への回復・復旧を選んでいます。作戦の対象を変更してください。');return;}
  if(playback||!battle||battle.result||commander!==4)return;
  const needed=choices.filter((c,i)=>c==='potion'&&canCommand(i)).length;if(needed>state.potions){notice('薬草が足りません。作戦を選び直してください。');return;}
  const nextState=copy(state),nextBattle=copy(battle);resolveTurn(nextState,nextBattle,choices.map((type,i)=>({type,target:targets[i]})));
  playback={frames:nextBattle.frames,position:0,current:nextBattle.frames[0],previous:{party:copy(state.party),enemies:copy(battle.enemies)},nextState,nextBattle};
  if(prefs.reduced){finishPlayback();return;}render();playFrameSound();scheduleFrame();
}
function scheduleFrame(){clearTimeout(playbackTimer);if(playback&&!document.hidden&&!modal.open&&!prefs.reduced)playbackTimer=setTimeout(advanceFrame,Math.max(1800,(playback.current?.lines.join('').length||0)*50));}
function playFrameSound(){if(!playback)return;tone(playback.current?.lines.some(l=>l.includes('回復'))?'heal':'hit');}
function advanceFrame(){if(!playback)return;clearTimeout(playbackTimer);if(playback.position+1>=playback.frames.length){finishPlayback();return;}playback.previous=playback.current;playback.position++;playback.current=playback.frames[playback.position];render();playFrameSound();scheduleFrame();}
function finishPlayback(){if(!playback)return;editingPlan=false;clearTimeout(playbackTimer);state=playback.nextState;battle=playback.nextBattle;delete battle.frames;playback=null;commander=firstCommander();commandMode='root';choices=state.party.map(()=> 'attack');targets=[0,0,0,0];if(battle.result==='win')tone('win');render();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(playbackTimer);else scheduleFrame();});
modal.addEventListener('close',scheduleFrame);
modal.addEventListener('toggle',()=>{if(modal.open)clearTimeout(playbackTimer);});
window.addEventListener('resize',()=>{if(screen==='title')drawTitle($('#title-map'));else if(!battle)drawMap($('#map'),state);});
try{const saved=JSON.parse(localStorage.getItem(`${KEY}-prefs`));if(saved&&typeof saved==='object')for(const k of Object.keys(prefs))if(k in saved)prefs[k]=saved[k]===true;}catch{}
render();
