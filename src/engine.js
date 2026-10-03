export const copy = value => structuredClone(value);
export const HEROES = [
  { name: 'ユウ', job: 'SE', maxHp: 92, maxMp: 26, attack: 15, defense: 9, speed: 14, color: '#e8bf68' },
  { name: 'リナ', job: '実装', maxHp: 76, maxMp: 28, attack: 19, defense: 6, speed: 12, color: '#a79be0' },
  { name: 'テオ', job: '品質', maxHp: 84, maxMp: 32, attack: 12, defense: 9, speed: 10, color: '#89cbb3' },
  { name: 'ガン', job: '基盤', maxHp: 116, maxMp: 22, attack: 15, defense: 15, speed: 16, color: '#80b9d5' },
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
};
export function initialState() {
  return { version: 1, map: 'village', x: 4, y: 7, flags: {}, defeated: [], grown: [], notes: [], history: [], potions: 6, gold: 0, party: HEROES.map(h => ({ ...h, hp: h.maxHp, mp: h.maxMp, burn: 0 })), steps: 0 };
}
export function rest(state) {
  state.party.forEach(h => { h.hp = h.maxHp; h.mp = h.maxMp; h.burn = 0; });
}
export function objective(s) {
  if (s.flags.complete) return '第一章クリア。手帳で調査記録を振り返ろう。';
  if (s.flags.boss) return '道具屋に戻り、二重送信の解決を報告する。';
  if (!s.flags.quest) return '村の道具屋に話を聞く。';
  if (!s.flags.clerk) return '店員に、注文時の操作を確認する。';
  if (!s.flags.mayor) return '村長に、古い仕組みのことを聞く。';
  if (!s.flags.seal) return '地下遺跡で「処理済みの刻印」を探す。';
  return '最深部の双頭蛇に刻印を使い、二重送信を止める。';
}
export function createBattle(id, s) {
  const boss = id === 'boss';
  const multiplier = s.grown.includes(id) ? 1.1 : 1;
  const enemies = boss
    ? [{ name: '双頭蛇・送信', maxHp: 240, attack: 24, defense: 9, speed: 8, type: 'snake' }, { name: '双頭蛇・再送', maxHp: 240, attack: 22, defense: 9, speed: 7, type: 'snake' }]
    : [{ name: id === 'ghost' ? '本番限定ゴースト' : id === 'slime2' ? '差し戻しスライム' : 'バグスライム', maxHp: Math.round((id === 'ghost' ? 150 : 128) * multiplier), attack: 17, defense: 5, speed: 8, type: id === 'ghost' ? 'ghost' : 'slime' }];
  return { id, boss, turn: 1, enemies: enemies.map(e => ({ ...e, hp: e.maxHp })), logging: false, scanned: false, sealed: false, shield: 0, stop: false, result: null, log: [boss ? '二重送信の双頭蛇が あらわれた！' : `${enemies[0].name}が あらわれた！`, s.grown.includes(id) ? '「進捗どうですか？」敵は少し成長している。' : '敵のログ出力は OFF のようだ。'] };
}
export function validAction(s, b, index, action) {
  const h = s.party[index], skill = SKILLS[action?.type];
  if (!h || !skill || h.hp <= 0) return false;
  if (skill.owner !== undefined && skill.owner !== index) return false;
  if (h.mp < skill.cost) return false;
  if (action.type === 'shield' && !s.flags.minutes) return false;
  if (action.type === 'seal' && (!s.flags.seal || !b.boss)) return false;
  if (action.type === 'potion' && s.potions < 1) return false;
  if (skill.target === 'ally') return Number.isInteger(action.target) && !!s.party[action.target] && (action.type === 'restart' || s.party[action.target].hp > 0);
  if (skill.target === 'enemy') return Number.isInteger(action.target) && !!b.enemies[action.target];
  return true;
}
export function resolveTurn(s, b, actions) {
  if (b.result) return b;
  const logs = [], guards = new Set(), rebooting = new Set();
  b.frames = []; let cursor = 0;
  const frame = () => { if (logs.length > cursor) { b.frames.push({ lines: logs.slice(cursor), party: copy(s.party), enemies: copy(b.enemies), logging: b.logging, scanned: b.scanned, sealed: b.sealed }); cursor = logs.length; } };
  s.party.forEach((h, i) => { if (actions[i]?.type === 'guard' && h.hp > 0) guards.add(i); });
  const queue = [...s.party.map((h, i) => ({ hero: true, i, speed: h.speed })), ...b.enemies.map((e, i) => ({ hero: false, i, speed: e.speed }))].sort((a, z) => z.speed - a.speed);
  for (const actor of queue) {
    if (s.party.every(h => h.hp <= 0) || b.enemies.every(e => e.hp <= 0)) break;
    if (actor.hero) {
      const i = actor.i, h = s.party[i], action = actions[i];
      if (h.hp <= 0 || rebooting.has(i)) continue;
      if (!validAction(s, b, i, action)) { logs.push(`${h.name}は 様子を見ている。`); continue; }
      h.mp -= SKILLS[action.type].cost;
      const ally = s.party[action.target];
      switch (action.type) {
        case 'attack': case 'patch': {
          const enemy = b.enemies[action.target]?.hp > 0 ? b.enemies[action.target] : b.enemies.find(e => e.hp > 0);
          const damage = Math.round(Math.max(1, h.attack * (action.type === 'patch' ? 2.5 : 1.5) - enemy.defense * .75) * (b.scanned ? 1.5 : 1) * (b.id === 'ghost' && !b.scanned ? .3 : 1));
          enemy.hp = Math.max(0, enemy.hp - damage);
          logs.push(`${h.name}の${action.type === 'patch' ? 'パッチ' : '攻撃'}！ ${enemy.name}に ${damage}ダメージ。`); break;
        }
        case 'guard': logs.push(`${h.name}は 締切に備えて身を守った。`); break;
        case 'monitor': b.logging = true; logs.push('ガンは監視を入れた。ログが残るようになった！'); break;
        case 'log':
          if (!b.logging) logs.push('ログ出力：OFF。「調査のため、ログを出す修正が必要です」監視強化を使おう。');
          else { b.scanned = true; logs.push(b.boss ? '原因判明：同じ注文を再送中！ 刻印で復活を止められる。全攻撃の威力が1.5倍！' : b.id === 'ghost' ? '本番だけ設定ファイルが手書きだった！ ゴーストが実体化。攻撃の威力が1.5倍！' : b.id === 'slime2' ? '承認者が旧版を見ていた！ 原因特定。攻撃の威力が1.5倍！' : 'TODO: あとで直す。記入日：古代暦102年。攻撃の威力が1.5倍！'); }
          break;
        case 'shield': b.shield = 3; logs.push('承認済みの議事録をかざした。「証跡は、あります」'); break;
        case 'local': h.burn = 0; logs.push('リナの環境だけ正常になった。他の環境はそのままだ。'); break;
        case 'heal': case 'potion': {
          if (action.type === 'potion') s.potions--;
          const amount = Math.min(ally.maxHp - ally.hp, action.type === 'heal' ? 45 : 40); ally.hp += amount;
          logs.push(`${ally.name}のHPが ${amount}回復した。${action.type === 'heal' ? '「再テスト、OKです」' : ''}`); break;
        }
        case 'reproduce': if (b.reproduced) logs.push('「手順は先ほど送りました」同じ依頼は二度通らない！'); else { b.stop = true; b.reproduced = true; logs.push('テオは再現手順を求めた。敵は説明を考えている。'); } break;
        case 'restart': if (ally.hp <= 0) ally.hp = Math.ceil(ally.maxHp * .3); ally.burn = 0; rebooting.add(action.target); logs.push(`${ally.name}を再起動。今ターンは起動中。`); break;
        case 'seal': b.sealed = true; logs.push('処理済みの刻印を押した。「その注文は受付済みです」復活を停止！'); break;
      }
    } else {
      const e = b.enemies[actor.i]; if (e.hp <= 0) continue;
      if (b.stop) { b.stop = false; logs.push(`${e.name}は「たまに起きます」と言って黙った。攻撃を一回阻止！`); frame(); continue; }
      if (b.id === 'slime2' && !b.rolledBack) { b.rolledBack = true; e.hp = Math.min(e.maxHp,e.hp+32); logs.push('「修正箇所は直っています。それ以外も直してください」差し戻しでHP32回復！'); }
      if (b.boss && b.turn % 3 === 0 && actor.i === 1) {
        if (b.shield > 0) { b.shield = 0; logs.push('「そんな話は聞いていない！」議事録の盾で無効化した！'); }
        else { const restored = Math.min(35, e.maxHp - e.hp); e.hp += restored; logs.push(`「そんな話は聞いていない！」再送側のHPが${restored}回復した。`); }
        frame(); continue;
      }
      const living = s.party.map((h, i) => i).filter(i => s.party[i].hp > 0);
      const targets = b.boss && b.turn % 2 === 0 && actor.i === 0 ? living : [living[(b.turn + actor.i) % living.length]];
      for (const i of targets) {
        const h = s.party[i];
        const damage = Math.max(1, Math.round((e.attack * 1.5 - h.defense * .75) * (guards.has(i) ? .5 : 1)));
        h.hp = Math.max(0, h.hp - damage);
        if (b.turn % 2 === 0 && h.hp > 0) h.burn = 3;
        logs.push(`${e.name}の${targets.length > 1 ? '一斉再送' : '障害通知'}！ ${h.name}に ${damage}ダメージ${b.turn % 2 === 0 ? '、炎上！' : '。'}`);
      }
    }
    frame();
  }
  if (b.enemies.every(e => e.hp <= 0)) b.result = 'win';
  if (!b.result) {
    if (b.boss && !b.sealed && b.enemies.some(e => e.hp > 0)) b.enemies.forEach(e => { if (e.hp <= 0) { e.hp = 80; logs.push(`${e.name}が再送され復活！ 処理済みの刻印で止めよう。`); } });
    s.party.forEach(h => { if (h.hp > 0 && h.burn > 0) { const d = Math.min(h.hp - 1, Math.ceil(h.maxHp * .1)); h.hp -= d; h.burn--; logs.push(`${h.name}は炎上で ${d}ダメージ。`); } });
    if (s.party.every(h => h.hp <= 0)) b.result = 'lose';
  }
  if (b.shield > 0) b.shield--;
  b.stop = false;
  b.turn++;
  b.log = logs;
  frame();
  return b;
}
export function flee(s, b) {
  if (!b.boss && !s.grown.includes(b.id)) s.grown.push(b.id);
  s.x = 4; s.y = 7; s.map = 'village';
}
export function parseSave(text) {
  const s = JSON.parse(text);
  if (s?.version !== 1 || !['village','ruins','core'].includes(s.map) || !Number.isInteger(s.x) || s.x < 0 || s.x > 8 || !Number.isInteger(s.y) || s.y < 0 || s.y > 8 || !Array.isArray(s.party) || s.party.length !== 4 || !s.flags || typeof s.flags !== 'object' || Array.isArray(s.flags)) throw new Error('この試作のセーブデータではありません。');
  for (const key of ['defeated','grown','notes','history']) if (!Array.isArray(s[key]) || s[key].some(v => typeof v !== 'string') || s[key].length > 1000) throw new Error('セーブデータの形式が不正です。');
  for (const key of ['potions','gold','steps']) if (!Number.isInteger(s[key]) || s[key] < 0 || s[key] > 1000000) throw new Error('数値データが不正です。');
  s.party = s.party.map((h, i) => {
    const base = HEROES[i];
    for (const [key, max] of [['hp',base.maxHp],['mp',base.maxMp],['burn',3]]) if (!Number.isInteger(h[key]) || h[key] < 0 || h[key] > max) throw new Error('仲間のデータが不正です。');
    return { ...base, hp: h.hp, mp: h.mp, burn: h.burn };
  });
  if (Object.values(s.flags).some(v => typeof v !== 'boolean')) throw new Error('進行データが不正です。');
  return s;
}
