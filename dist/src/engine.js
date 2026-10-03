import { MAPS } from './world.js';
export const copy = value => structuredClone(value);
export const HEROES = [
  { name: 'ユウ', job: '調整役', maxHp: 92, maxMp: 26, attack: 15, defense: 9, speed: 14, color: '#e8bf68' },
  { name: 'リナ', job: '中途参加', maxHp: 76, maxMp: 28, attack: 19, defense: 6, speed: 12, color: '#a79be0' },
  { name: 'テオ', job: '後輩', maxHp: 84, maxMp: 32, attack: 12, defense: 9, speed: 10, color: '#89cbb3' },
  { name: 'ガン', job: '古参', maxHp: 116, maxMp: 22, attack: 15, defense: 15, speed: 16, color: '#80b9d5' },
];
export const SKILLS = {
  attack: { label: 'こうげき', cost: 0, target: 'enemy', help: 'MPを使わず攻撃。調査済みの敵にはダメージ1.5倍。' },
  guard: { label: 'ぼうぎょ', cost: 0, target: 'self', help: 'このターンの被ダメージを半分にする。' },
  log: { label: 'ログを見ろ', cost: 3, target: 'all', owner: 0, help: '敵全体を調査して弱点を開示。ログがないと不発。先に「監視強化」を。' },
  shield: { label: '議事録の盾', cost: 4, target: 'all', owner: 0, help: '3ターン以内の「そんな話は聞いていない」を一度防ぐ。' },
  patch: { label: 'パッチ', cost: 4, target: 'enemy', owner: 1, help: '敵一体に強い攻撃。調査済みならさらに強い。' },
  local: { label: '俺の環境では動く', cost: 2, target: 'self', owner: 1, help: '自分の炎上だけを解除。他の仲間には影響しない。' },
  heal: { label: '再テスト', cost: 4, target: 'ally', owner: 2, help: '生存している味方一人のHPを45回復する。' },
  reproduce: { label: '再現手順をください', cost: 4, target: 'all', owner: 2, help: '次の敵の攻撃を一回止める。同じ戦闘で二度目は手順提出済みのため無効。' },
  monitor: { label: '監視強化', cost: 3, target: 'all', owner: 3, help: 'この戦闘でログ出力を有効にする。ユウより先に行動できる。' },
  restart: { label: '再起動', cost: 5, target: 'ally', owner: 3, help: '味方一人の炎上解除。戦闘不能ならHP30%で復帰。このターンは行動不可。' },
  potion: { label: '薬草', cost: 0, target: 'ally', help: '共有の薬草を1個使い、味方一人のHPを40回復する。戦闘不能には無効。' },
  seal: { label: '処理済みの刻印', cost: 0, target: 'all', help: '双頭蛇の復活を止める。何度使ってもなくならない。' },
  evidence_a: { label: '受付記録を提示', cost: 0, target: 'enemy', help: 'アプリ社の騎士に提示し、攻撃転送を止める。証拠は消費しない。' },
  evidence_b: { label: '通信記録を提示', cost: 0, target: 'enemy', help: '回線社の騎士に提示し、攻撃転送を止める。証拠は消費しない。' },
  evidence_c: { label: '変更記録を提示', cost: 0, target: 'enemy', help: '基盤社の騎士に提示し、攻撃転送を止める。証拠は消費しない。' },
  migrate_orders: { label: '受発注を移行', cost: 0, target: 'all', help: '本体の暴走HPが40%以下で実行可。2行動、引き継ぎ済みなら1行動で移行する。' },
  migrate_stock: { label: '在庫を移行', cost: 0, target: 'all', help: '受発注の次に実行。本体の暴走HP40%以下で2行動、引き継ぎ済みなら1行動。' },
  migrate_invoice: { label: '請求を移行', cost: 0, target: 'all', help: '最後の系統。本体の暴走HP40%以下で2行動、引き継ぎ済みなら1行動で勝利。' },
  scope: { label: 'スコープ削減', cost: 3, target: 'all', owner: 0, help: '追加要求の援軍だけを退場させる。本体・必須3系統は対象外。主要報酬は減らない。' },
  paid_leave: { label: '有給休暇', cost: 0, target: 'self', help: '本人のHP・MP全回復、炎上解除。このターン不在で次ターン復帰。各人1戦1回、最後の稼働者は次に交代。' },
};
for (const key of ['log','heal','monitor','restart']) delete SKILLS[key].owner;
for (const [key, skill] of Object.entries(SKILLS)) skill.category = ['potion','seal','evidence_a','evidence_b','evidence_c','migrate_orders','migrate_stock','migrate_invoice'].includes(key) ? 'item' : 'skill';
SKILLS.heal.help = '生存している味方一人のHPを回復。Lv1で45、以後1レベルごとに15増える。全員が使える。';
SKILLS.monitor.help = 'この戦闘でログを有効にする。全員使用可。速い仲間が監視、遅い仲間がログを使うと同じターンで調査できる。';
export const ENCOUNTER_NAMES = {
  slime1:'誰かが残したTODO', slime2:'修正済みのはずの差し戻し', slime3:'承認待ちの申請',
  ghost:'本番だけの不具合', ghost2:'環境ごとに違う設定', ghost3:'戻したことのないバックアップ',
  meeting1:'進捗確認のための会議', meeting2:'会議のための事前会議',
  spec1:'一旦確定した仕様', spec2:'昨日と違う仕様',
  golem1:'過去の自分が書いた仕様書', golem2:'あの人しか知らない手順',
  scope1:'簡単な追加修正', scope2:'最後にあと一点だけ',
  boss:'二重送信された注文', knights:'責任分界の押し付け合い', legacy:'つぎはぎの基幹システム',
};
export const ABSENCE_REASONS = ['トイレが長い','定時で帰宅','自社研修','健康診断'];
export function activeMembers(s,b) { return s.party.map((_,i)=>i).filter(i=>s.party[i].hp>0&&!b.absences?.[i]); }
function nextRandom(b) { b.rngState = (Math.imul(b.rngState,1664525)+1013904223)>>>0; return b.rngState/4294967296; }
export const MIGRATIONS = ['migrate_orders', 'migrate_stock', 'migrate_invoice'];
for (const key of ['evidence_a','evidence_b','evidence_c','seal']) SKILLS[key].requiredFlag = key;
SKILLS.shield.requiredFlag = 'minutes';
SKILLS.scope.requiredFlag = 'release_scope';
export function heroAtLevel(index, level, gear = {}) {
  const base = HEROES[index], growth = level - 1;
  return { ...base, maxHp: base.maxHp + growth * 24, maxMp: base.maxMp + growth * 10 + (gear.charm ? 6 : 0), attack: base.attack + growth * 5 + (gear.weapon ? 4 : 0), defense: base.defense + growth * 3 + (gear.armor ? 3 : 0) };
}
export function levelUp(s) {
  s.level = Math.min(5, (s.level || 1) + 1);
  s.party = HEROES.map((_, i) => ({ ...heroAtLevel(i, s.level, s.gear?.[i]), burn: 0 }));
  rest(s);
  return s.level;
}
export function initialState() {
  return { version: 1, level: 1, gear: HEROES.map(() => ({ weapon: false, armor: false, charm: false })), map: 'village', x: 4, y: 7, flags: {}, defeated: [], grown: [], notes: [], history: [], potions: 6, gold: 0, party: HEROES.map(h => ({ ...h, hp: h.maxHp, mp: h.maxMp, burn: 0 })), steps: 0 };
}
export function rest(state) {
  state.party.forEach(h => { h.hp = h.maxHp; h.mp = h.maxMp; h.burn = 0; });
}
export function objective(s) {
  if (s.flags.finished) return '冒険完了。切替前へ戻れば、準備と結末を見直せる。';
  if (s.flags.knights) return s.flags.release_scope ? '準備を整え、切替の門からレガシアを引き継ぐ。' : '王都で担当者に話を聞き、移行の準備を整える。';
  if (s.flags.complete) return ['evidence_a','evidence_b','evidence_c'].every(flag => s.flags[flag]) ? '三つの証拠を携え、責任分界の三騎士に向かう。' : '国境砦で三社を訪ね、受付・通信・変更の記録を集める。';
  if (s.flags.boss) return '道具屋に戻り、二重送信の解決を報告する。';
  if (!s.flags.quest) return '村の道具屋に話を聞く。';
  if (!s.flags.clerk) return '店員に、注文時の操作を確認する。';
  if (!s.flags.mayor) return '村長に、古い仕組みのことを聞く。';
  if (!s.flags.seal) return '地下遺跡で「処理済みの刻印」を探す。';
  return '最深部の双頭蛇に刻印を使い、二重送信を止める。';
}
export function createBattle(id, s) {
  const boss = ['boss', 'knights', 'legacy'].includes(id);
  const multiplier = s.grown.includes(id) ? 1.1 : 1;
  let enemies = id === 'boss'
    ? [{ name: '双頭蛇・送信', maxHp: 240, attack: 24, defense: 9, speed: 8, type: 'snake' }, { name: '双頭蛇・再送', maxHp: 240, attack: 22, defense: 9, speed: 7, type: 'snake' }]
    : [{ name: id === 'ghost' ? '本番限定ゴースト' : id === 'slime2' ? '差し戻しスライム' : 'バグスライム', maxHp: Math.round((id === 'ghost' ? 150 : 128) * multiplier), attack: 17, defense: 5, speed: 8, type: id === 'ghost' ? 'ghost' : 'slime' }];
  if (id === 'knights') enemies = ['アプリ社の騎士', '回線社の騎士', '基盤社の騎士'].map((name, i) => ({ name, maxHp: 175, attack: 17, defense: 10, speed: 8 - i, type: 'knight', proven: false, evidence: ['evidence_a','evidence_b','evidence_c'][i] }));
  if (id === 'legacy') enemies = [
    { name: 'レガシア', maxHp: 280, attack: 24, defense: 10, speed: 8, type: 'legacy' },
    { name: 'ついでに花火機能', maxHp: 90, attack: 11, defense: 4, speed: 6, type: 'scope', optional: true },
  ];
  let kind = id === 'slime2' ? 'rollback' : id === 'slime3' ? 'dependency' : ['ghost','meeting','spec','golem','scope'].find(prefix => id.startsWith(prefix)) || 'bug';
  if (!boss && !['slime1','slime2','ghost'].includes(id)) {
    const profiles = {
      ghost: ['本番限定ゴースト', 200, 20, 7, 'ghost'],
      meeting: ['定例会議のミミック', 180, 18, 8, 'mimic'],
      spec: ['仕様変更キメラ', 195, 20, 8, 'chimera'],
      golem: ['口伝のゴーレム', 225, 21, 17, 'golem'],
      scope: ['あと一点だけドラゴン', 210, 19, 8, 'dragon'],
      dependency: ['依存関係スライム', 190, 20, 8, 'slime'],
      bug: ['バグスライム', 128, 17, 5, 'slime'],
    };
    const [name, hp, attack, defense, type] = profiles[kind];
    enemies = [{ name, maxHp: Math.round(hp * multiplier), attack, defense, speed: 8, type, optional: kind === 'scope' }];
  }
  if (!boss) enemies[0].name = ENCOUNTER_NAMES[id] || enemies[0].name;
  if (id === 'boss') enemies.forEach((e,i)=>{e.name=i?'止まらない自動再送':'二度押された注文';});
  if (id === 'knights') enemies.forEach((e,i)=>{e.name=['アプリ社の担当','回線社の担当','基盤社の担当'][i];});
  if (id === 'legacy') enemies[0].name=ENCOUNTER_NAMES.legacy;
  if (kind==='spec'||id==='golem1') enemies[0].type='document';
  const rngState = Array.from(id).reduce((seed,ch)=>(Math.imul(seed,31)+ch.charCodeAt(0))>>>0,12345);
  return { id, boss, kind, rngState, absences: {}, leaveUsed: [], absenceCount: 0, overtimePay: 0, turn: 1, phase: 0, migrationProgress: 0, migrated: [], autoTestUsed: false, restored: false, enemies: enemies.map(e => ({ ...e, hp: e.maxHp })), logging: false, scanned: false, sealed: false, shield: 0, stop: false, result: null, log: [`${ENCOUNTER_NAMES[id] || enemies[0].name}が あらわれた！`, id==='knights'?'対応する証拠で転送を止めよう。':id==='legacy'?'暴走を抑え、3系統を順に引き継ごう。':s.grown.includes(id) ? '「進捗どうですか？」敵は少し成長している。' : '敵のログ出力は OFF のようだ。'] };
}
export function validAction(s, b, index, action) {
  const h = s.party[index], skill = SKILLS[action?.type];
  if (!h || !skill || h.hp <= 0 || b.absences?.[index]) return false;
  if (skill.owner !== undefined && skill.owner !== index) return false;
  if (h.mp < skill.cost) return false;
  if (action.type === 'shield' && !s.flags.minutes) return false;
  if (action.type === 'seal' && (!s.flags.seal || b.id !== 'boss')) return false;
  if (action.type.startsWith('evidence_') && (b.id !== 'knights' || !s.flags[action.type])) return false;
  if (MIGRATIONS.includes(action.type) && (b.id !== 'legacy' || MIGRATIONS[b.phase] !== action.type || b.enemies[0].hp > b.enemies[0].maxHp * .4)) return false;
  if (action.type === 'scope' && (!s.flags.release_scope || !b.enemies.some(e => e.optional && e.hp > 0))) return false;
  if (action.type === 'potion' && s.potions < 1) return false;
  if (action.type === 'paid_leave' && (b.leaveUsed.includes(index) || activeMembers(s,b).length<=1)) return false;
  if (skill.target === 'ally') return Number.isInteger(action.target) && !!s.party[action.target] && !b.absences?.[action.target] && (action.type === 'restart' || s.party[action.target].hp > 0);
  if (skill.target === 'enemy') return Number.isInteger(action.target) && !!b.enemies[action.target];
  return true;
}
export function resolveTurn(s, b, actions, rng) {
  if (b.result) return b;
  const logs = [], guards = new Set(), rebooting = new Set();
  b.frames = []; let cursor = 0;
  const frame = () => { if (logs.length > cursor) { b.frames.push({ lines: logs.slice(cursor), party: copy(s.party), enemies: copy(b.enemies), absences: {...b.absences}, overtimePay:b.overtimePay, logging: b.logging, scanned: b.scanned, sealed: b.sealed, phase: b.phase, migrationProgress: b.migrationProgress, migrated: [...b.migrated] }); cursor = logs.length; } };
  const restoreIfNeeded = () => {
    if (b.id === 'legacy' && s.flags.restore_test && !b.restored && s.party.every(h => h.hp <= 0)) {
      b.restored = true;
      s.party.forEach(h => { h.hp = Math.ceil(h.maxHp * .5); h.burn = 0; });
      logs.push('復元確認済みバックアップが起動！ 全員がHP50%で復帰した。「戻せることまで、確認済みです」');
    }
  };
  if (!activeMembers(s,b).length && s.party.some(h=>h.hp>0)) { b.absences={}; logs.push('応援が必要になった。休み予定の仲間が先に合流した。'); }
  const hadAbsence=Object.keys(b.absences).length>0;
  for(const [key,reason] of Object.entries(b.absences)) logs.push(`${s.party[key].name}は${reason}で1ターン不在。次のターンに復帰する。`);
  // Leave is a full-turn action: pre-resolve it before any speed-based attacks.
  for(let i=0;i<s.party.length;i++) if(actions[i]?.type==='paid_leave') {
    if(validAction(s,b,i,actions[i])) { const h=s.party[i];h.hp=h.maxHp;h.mp=h.maxMp;h.burn=0;b.leaveUsed.push(i);b.absences[i]='有給休暇';logs.push(`${h.name}は有給休暇。HP・MP全回復！ このターンは引き継いだ仲間に任せた。`); }
    else if(!b.absences[i]) { guards.add(i); logs.push(`${s.party[i].name}の有給は今回は未使用。交代を待って防御した。`); }
  }
  frame();
  s.party.forEach((h, i) => { if (actions[i]?.type === 'guard' && h.hp > 0 && !b.absences[i]) guards.add(i); });
  const queue = [...s.party.map((h, i) => ({ hero: true, i, speed: h.speed })), ...b.enemies.map((e, i) => ({ hero: false, i, speed: e.speed }))].sort((a, z) => z.speed - a.speed);
  for (const actor of queue) {
    if (b.result || s.party.every(h => h.hp <= 0) || (b.id !== 'legacy' && b.enemies.every(e => e.hp <= 0))) break;
    if (actor.hero) {
      const i = actor.i, h = s.party[i], action = actions[i];
      if (h.hp <= 0 || rebooting.has(i) || b.absences[i] || action?.type==='paid_leave') continue;
      if (!validAction(s, b, i, action)) { logs.push(`${h.name}は 様子を見ている。`); continue; }
      h.mp -= SKILLS[action.type].cost;
      const ally = s.party[action.target];
      switch (action.type) {
        case 'attack': case 'patch': {
          const enemy = b.enemies[action.target]?.hp > 0 ? b.enemies[action.target] : b.enemies.find(e => e.hp > 0);
          let modifier = b.scanned ? 1.5 : 1;
          if (b.kind === 'ghost' && !b.scanned) modifier *= .3;
          if (b.kind === 'golem' && !b.scanned) modifier *= .45;
          if (b.kind === 'spec' && !b.scanned && (b.turn % 2 === 0 ? action.type === 'patch' : action.type === 'attack')) modifier *= .4;
          if (b.kind === 'dependency' && action.type === 'patch' && !b.scanned) modifier *= .5;
          if (b.id === 'knights' && !enemy.proven) modifier *= .15;
          const damage = Math.round(Math.max(1, h.attack * (action.type === 'patch' ? 2.5 : 1.5) - enemy.defense * .75) * modifier);
          const floor = b.id === 'legacy' && enemy === b.enemies[0] || b.id === 'knights' && !enemy.proven ? 1 : 0;
          enemy.hp = Math.max(floor, enemy.hp - damage);
          logs.push(`${h.name}の${action.type === 'patch' ? 'パッチ' : '攻撃'}！ ${enemy.name}に ${damage}ダメージ。`);
          if (b.id === 'knights' && !enemy.proven) {
            const reflected = Math.max(1, Math.round(h.attack * .4));
            h.hp = Math.max(0, h.hp - reflected);
            logs.push(`「弊社の範囲外です」攻撃が転送され、${h.name}に${reflected}ダメージ！ 対応する証拠を提示しよう。`);
          }
          break;
        }
        case 'guard': logs.push(`${h.name}は 締切に備えて身を守った。`); break;
        case 'monitor': b.logging = true; logs.push(`${h.name}は監視を入れた。ログが残るようになった！`); break;
        case 'log':
          if (!b.logging) logs.push('ログ出力：OFF。「調査のため、ログを出す修正が必要です」監視強化を使おう。');
          else {
            b.scanned = true;
            const findings = {
              knights: '受付記録→アプリ社、通信記録→回線社、変更記録→基盤社。証拠で転送を解除しよう。',
              legacy: '暴走HPを40%以下に抑えて移行。受発注→在庫→請求の順。削り切っても破壊しない。',
              boss: '同じ注文を再送中！ 刻印で復活を止められる。',
              ghost: '本番だけ設定ファイルが手書きだった！ ゴーストが実体化。',
              rollback: '承認者が旧版を見ていた！', meeting: '議題なし、終了時刻なし。MPを奪う長話は偶数ターン！',
              spec: '口頭変更が毎ターン反転。合意した仕様を固定し、耐性を解除！',
              golem: '担当者の記憶にしかない合言葉を復元。硬い装甲が外れた！',
              scope: '「あと一点だけ」は三点まで増える。次の偶数ターンに追加要求！',
              dependency: '修正対象は共有部品だった。影響範囲を特定、パッチの効きが戻った！',
              bug: 'TODO: あとで直す。記入日：古代暦102年。',
            };
            logs.push(`原因判明：${findings[b.id] || findings[b.kind]} 攻撃の威力が1.5倍！`);
          }
          break;
        case 'shield': b.shield = 3; logs.push('承認済みの議事録をかざした。「証跡は、あります」'); break;
        case 'local': h.burn = 0; logs.push('リナの環境だけ正常になった。他の環境はそのままだ。'); break;
        case 'heal': case 'potion': {
          if (action.type === 'potion') s.potions--;
          const amount = Math.min(ally.maxHp - ally.hp, action.type === 'heal' ? 45 + ((s.level || 1) - 1) * 15 : 40); ally.hp += amount;
          logs.push(`${ally.name}のHPが ${amount}回復した。${action.type === 'heal' ? '「再テスト、OKです」' : ''}`); break;
        }
        case 'reproduce': if (b.reproduced) logs.push('「手順は先ほど送りました」同じ依頼は二度通らない！'); else { b.stop = true; b.reproduced = true; logs.push('テオは再現手順を求めた。敵は説明を考えている。'); } break;
        case 'restart': if (ally.hp <= 0) ally.hp = Math.ceil(ally.maxHp * .3); ally.burn = 0; rebooting.add(action.target); logs.push(`${ally.name}を再起動。今ターンは起動中。`); break;
        case 'seal': b.sealed = true; logs.push('処理済みの刻印を押した。「その注文は受付済みです」復活を停止！'); break;
        case 'evidence_a': case 'evidence_b': case 'evidence_c': {
          const enemy = b.enemies[action.target];
          if (enemy.evidence === action.type) { enemy.proven = true; logs.push(`${enemy.name}は記録を確認した。「ここから先は、私が引き受けます」転送を停止！`); }
          else logs.push('「その記録は別の担当です」受付はアプリ社、通信は回線社、変更は基盤社へ。証拠は失われない。');
          break;
        }
        case 'migrate_orders': case 'migrate_stock': case 'migrate_invoice': {
          b.migrationProgress++;
          const label = ['受発注','在庫','請求'][b.phase], required = s.flags.handover ? 1 : 2;
          logs.push(`${label}を引き継いだ。${b.migrationProgress}/${required}${s.flags.handover ? '。後任の手順確認済み！' : '。記録を照合中。'}`);
          if (b.migrationProgress >= required) {
            b.migrated.push(action.type); b.phase++; b.migrationProgress = 0;
            if (b.phase === 3) { b.result = 'win'; logs.push('三系統の移行が完了した。レガシアの灯りは消えた。王都の灯りは、消えなかった。'); }
            else { b.enemies[0].hp = b.enemies[0].maxHp; logs.push(`${label}の移行完了！ 次は${['受発注','在庫','請求'][b.phase]}。次の暴走を抑えよう。`); }
          }
          break;
        }
        case 'scope': b.enemies.forEach(e => { if (e.optional && e.hp > 0) { e.hp = 0; logs.push(`${e.name}は次回のお見積もりへ。「今日は通行の復旧が優先です」`); } }); break;
      }
    } else {
      const e = b.enemies[actor.i]; if (e.hp <= 0) continue;
      if (b.id === 'legacy' && s.flags.auto_test && !b.autoTestUsed) { b.autoTestUsed = true; logs.push('自動テストが最初の障害を検出し、防いだ！ 「失敗を先に見つけるための成功です」'); frame(); continue; }
      if (b.stop) { b.stop = false; logs.push(`${e.name}は「たまに起きます」と言って黙った。攻撃を一回阻止！`); frame(); continue; }
      if (b.id === 'slime2' && !b.rolledBack) { b.rolledBack = true; e.hp = Math.min(e.maxHp,e.hp+32); logs.push('「修正箇所は直っています。それ以外も直してください」差し戻しでHP32回復！'); }
      if (b.id === 'boss' && b.turn % 3 === 0 && actor.i === 1) {
        if (b.shield > 0) { b.shield = 0; logs.push('「そんな話は聞いていない！」議事録の盾で無効化した！'); }
        else { const restored = Math.min(35, e.maxHp - e.hp); e.hp += restored; logs.push(`「そんな話は聞いていない！」再送側のHPが${restored}回復した。`); }
        frame(); continue;
      }
      const living = activeMembers(s,b);
      if(!living.length){logs.push('担当者が戻るまで処理は保留。次のターンに復帰する。');frame();continue;}
      if (b.kind === 'meeting' && b.turn % 2 === 0) { living.forEach(i => { s.party[i].mp = Math.max(0,s.party[i].mp - 3); }); logs.push('「最後にもう一点」会議が延長！ 出席者のMPが3減った。'); }
      if (b.kind === 'scope' && b.turn % 2 === 0 && (b.additions || 0) < 3) { b.additions = (b.additions || 0) + 1; e.attack += 3; logs.push('「あと一点だけ」要求が積み上がる！ 攻撃力が3上がった。'); }
      const allAttack = b.id === 'boss' && b.turn % 2 === 0 && actor.i === 0 || b.id === 'legacy' && b.turn % 3 === 0 && actor.i === 0;
      const targets = allAttack ? living : [living[(b.turn + actor.i) % living.length]];
      for (const i of targets) {
        const h = s.party[i];
        const damage = Math.max(1, Math.round((e.attack * 1.5 - h.defense * .75) * (guards.has(i) ? .5 : 1)));
        h.hp = Math.max(0, h.hp - damage);
        const burns = (b.id === 'boss' || !b.boss) && b.turn % 2 === 0 || b.id === 'legacy' && allAttack;
        if (burns && h.hp > 0) h.burn = 3;
        logs.push(`${e.name}の${targets.length > 1 ? b.id === 'legacy' ? '切替負荷' : '一斉再送' : '障害通知'}！ ${h.name}に ${damage}ダメージ${burns ? '、炎上！' : '。'}`);
      }
    }
    restoreIfNeeded(); frame();
  }
  if (b.id !== 'legacy' && b.enemies.every(e => e.hp <= 0)) b.result = 'win';
  if (!b.result) {
    if (b.id === 'boss' && !b.sealed && b.enemies.some(e => e.hp > 0)) b.enemies.forEach(e => { if (e.hp <= 0) { e.hp = 80; logs.push(`${e.name}が再送され復活！ 処理済みの刻印で止めよう。`); } });
    s.party.forEach((h,i) => { if (h.hp > 0 && h.burn > 0 && !b.absences[i]) { const d = Math.min(h.hp - 1, Math.ceil(h.maxHp * .1)); h.hp -= d; h.burn--; logs.push(`${h.name}は炎上で ${d}ダメージ。`); } });
    if (s.party.every(h => h.hp <= 0)) b.result = 'lose';
  }
  if (b.shield > 0) b.shield--;
  b.stop = false;
  for(const key of Object.keys(b.absences)) logs.push(`${s.party[key].name}が復帰した。「次の対応、引き継ぎます」`);
  const hadLeave=Object.keys(b.absences).length>0;
  b.absences={};
  b.overtimePay=Math.min(60,Math.max(0,b.turn-3)*5);
  if(!b.result && !hadAbsence && !hadLeave && b.turn%4===0 && b.absenceCount<2 && s.party[2].hp>s.party[2].maxHp*.4 && s.party.filter(h=>h.hp>0).length>=3) {
    const random=rng||(()=>nextRandom(b));
    if(random()<.35) { const reason=ABSENCE_REASONS[Math.min(3,Math.floor(random()*4))];b.absences[2]=reason;b.absenceCount++;logs.push(`次ターン予告：テオは${reason}で1ターン不在。共有の回復・調査を仲間へ引き継ごう。`); }
  }
  if(b.result==='win'&&b.overtimePay)logs.push(`残業代 ${b.overtimePay} G。「長引いたぶんは、勤怠に付けます」`);
  b.turn++;
  b.log = logs;
  frame();
  return b;
}
export function flee(s, b) {
  if (b.id === 'legacy') return false;
  if (!b.boss && !s.grown.includes(b.id)) s.grown.push(b.id);
  s.x = 4; s.y = s.flags.complete ? 6 : 7; s.map = s.flags.knights ? 'capital' : s.flags.complete ? 'border' : 'village';
  return true;
}
export function parseSave(text) {
  const s = JSON.parse(text);
  if (s?.version !== 1 || !Object.hasOwn(MAPS, s.map) || !Number.isInteger(s.x) || s.x < 0 || s.x >= MAPS[s.map].grid[0].length || !Number.isInteger(s.y) || s.y < 0 || s.y >= MAPS[s.map].grid.length || !Array.isArray(s.party) || s.party.length !== 4 || !s.flags || typeof s.flags !== 'object' || Array.isArray(s.flags)) throw new Error('このゲームのセーブデータではありません。');
  if (s.level === undefined) s.level = 1;
  if (!Number.isInteger(s.level) || s.level < 1 || s.level > 5) throw new Error('レベルが不正です。');
  if (s.gear === undefined) s.gear = HEROES.map(() => ({ weapon: false, armor: false, charm: false }));
  if (!Array.isArray(s.gear) || s.gear.length !== 4 || s.gear.some(g => !g || ['weapon','armor','charm'].some(key => typeof g[key] !== 'boolean'))) throw new Error('装備データが不正です。');
  for (const key of ['defeated','grown','notes','history']) if (!Array.isArray(s[key]) || s[key].some(v => typeof v !== 'string') || s[key].length > 1000) throw new Error('セーブデータの形式が不正です。');
  for (const key of ['potions','gold','steps']) if (!Number.isInteger(s[key]) || s[key] < 0 || s[key] > 1000000) throw new Error('数値データが不正です。');
  s.party = s.party.map((h, i) => {
    const base = heroAtLevel(i, s.level, s.gear[i]);
    for (const [key, max] of [['hp',base.maxHp],['mp',base.maxMp],['burn',3]]) if (!Number.isInteger(h[key]) || h[key] < 0 || h[key] > max) throw new Error('仲間のデータが不正です。');
    return { ...base, hp: h.hp, mp: h.mp, burn: h.burn };
  });
  if (Object.values(s.flags).some(v => typeof v !== 'boolean')) throw new Error('進行データが不正です。');
  return s;
}
