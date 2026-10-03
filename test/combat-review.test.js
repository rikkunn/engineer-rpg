import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, createBattle, resolveTurn, flee, levelUp, parseSave, MIGRATIONS, SKILLS, validAction, activeMembers, ABSENCE_REASONS, ENCOUNTER_NAMES } from '../src/engine.js';

const guard = () => ({ type: 'guard' });

test('a repeated reproduction request cannot permanently lock an enemy', () => {
  const s = initialState(), b = createBattle('ghost', s);
  const actions = [guard(), guard(), { type: 'reproduce' }, guard()];
  resolveTurn(s, b, actions);
  assert.ok(s.party.every(h => h.hp === h.maxHp));
  resolveTurn(s, b, actions);
  assert.ok(s.party.some(h => h.hp < h.maxHp));
});

test('monitoring and diagnosis materially overcome the production ghost', () => {
  function attack(diagnose) {
    const s = initialState(), b = createBattle('ghost', s);
    resolveTurn(s, b, [diagnose ? { type: 'log' } : guard(), { type: 'patch', target: 0 }, guard(), diagnose ? { type: 'monitor' } : guard()]);
    return b.enemies[0].maxHp - b.enemies[0].hp;
  }
  assert.ok(attack(true) >= attack(false) * 3);
});

test('the first boss is winnable without optional minutes or consumables', () => {
  const s = initialState(); s.flags.seal = true; s.potions = 0;
  const b = createBattle('boss', s);
  while (!b.result && b.turn <= 12) {
    const target = b.enemies.findIndex(e => e.hp > 0);
    const weakest = s.party.reduce((best, h, i) => h.hp / h.maxHp < s.party[best].hp / s.party[best].maxHp ? i : best, 0);
    const heal = s.party[weakest].hp < s.party[weakest].maxHp - 25 && s.party[2].mp >= 4;
    const actions = [{ type: 'attack', target }, { type: s.party[1].mp >= 4 ? 'patch' : 'attack', target }, { type: heal ? 'heal' : 'attack', target: heal ? weakest : target }, { type: 'attack', target }];
    if (b.turn === 1) { actions[0] = { type: 'log' }; actions[3] = { type: 'monitor' }; }
    if (b.turn === 2) actions[0] = { type: 'seal' };
    resolveTurn(s, b, actions);
  }
  assert.equal(b.result, 'win');
  assert.ok(b.turn - 1 <= 10);
  assert.ok(s.party.every(h => h.hp > 0));
});

test('minutes prevent the boss rollback rather than merely changing its text', () => {
  function scenario(shield) {
    const s = initialState(); s.flags.minutes = true;
    const b = createBattle('boss', s); b.turn = 3; b.enemies[1].hp = 100;
    resolveTurn(s, b, [shield ? { type: 'shield' } : guard(), guard(), guard(), guard()]);
    return b.enemies[1].hp;
  }
  assert.equal(scenario(false) - scenario(true), 35);
});

test('retreat escalation is bounded and does not escalate bosses', () => {
  const s = initialState(), original = createBattle('ghost', s).enemies[0].maxHp;
  for (let i = 0; i < 10; i++) flee(s, createBattle('ghost', s));
  assert.equal(createBattle('ghost', s).enemies[0].maxHp, Math.round(original * 1.1));
  assert.equal(s.grown.filter(id => id === 'ghost').length, 1);
  flee(s, createBattle('boss', s));
  assert.ok(!s.grown.includes('boss'));
});

test('shared item contention never duplicates the last potion or makes stock negative', () => {
  const s = initialState(); s.potions = 1; s.party.forEach(h => { h.hp = 1; });
  const b = createBattle('slime1', s);
  resolveTurn(s, b, s.party.map((_, target) => ({ type: 'potion', target })));
  assert.equal(s.potions, 0);
  assert.equal(b.log.filter(line => line.includes('HPが 40回復')).length, 1);
});

function campaignBattle(id, prepared = false) {
  const s = initialState(); levelUp(s); if (id === 'legacy') levelUp(s);
  s.flags = { evidence_a: true, evidence_b: true, evidence_c: true, release_scope: true, auto_test: prepared, restore_test: prepared, handover: prepared };
  s.potions = 0;
  const b = createBattle(id, s);
  let migrationActions = 0;
  while (!b.result && b.turn < 40) {
    const target = b.enemies.findIndex(e => e.hp > 0);
    const living = s.party.map((h,i) => i).filter(i => s.party[i].hp > 0);
    const weak = living.reduce((best,i) => s.party[i].hp / s.party[i].maxHp < s.party[best].hp / s.party[best].maxHp ? i : best, living[0]);
    const fallen = s.party.findIndex(h => h.hp <= 0);
    const acts = s.party.map(() => ({ type: 'attack', target }));
    if (s.party[1].mp >= 4) acts[1] = { type: 'patch', target };
    if (weak !== undefined && s.party[weak].hp < s.party[weak].maxHp - 25 && s.party[2].mp >= 4) acts[2] = { type: 'heal', target: weak };
    if (fallen >= 0 && s.party[3].mp >= 5) acts[3] = { type: 'restart', target: fallen };
    if (!b.scanned) { acts[0] = { type: 'log' }; acts[3] = { type: 'monitor' }; }
    if (id === 'knights' && b.turn === 1) { acts[0] = { type: 'evidence_a', target: 0 }; acts[1] = { type: 'evidence_b', target: 1 }; acts[3] = { type: 'evidence_c', target: 2 }; acts[2] = { type: 'reproduce' }; }
    if (id === 'legacy' && b.enemies.some(e => e.optional && e.hp > 0) && b.scanned) acts[0] = { type: 'scope' };
    if (id === 'legacy' && b.enemies[0].hp <= b.enemies[0].maxHp * .4) { acts[0] = { type: MIGRATIONS[b.phase] }; migrationActions++; }
    resolveTurn(s,b,acts);
  }
  return {s,b,migrationActions};
}

test('the three knights can be defeated after correct evidence with no consumables', () => {
  const { b } = campaignBattle('knights');
  assert.equal(b.result,'win');
  assert.ok(b.enemies.every(e => e.proven));
});

test('legacy can be migrated with zero optional preparations and no consumables', () => {
  const {b,migrationActions} = campaignBattle('legacy');
  assert.equal(b.result,'win');
  assert.deepEqual(b.migrated,MIGRATIONS);
  assert.equal(migrationActions,6);
  assert.equal(b.restored,false);
});

test('all three preparations reduce migration work and block the first incident', () => {
  const plain = campaignBattle('legacy'), prepared = campaignBattle('legacy',true);
  assert.equal(prepared.b.result,'win');
  assert.equal(prepared.migrationActions,3);
  assert.ok(prepared.b.turn < plain.b.turn);
  assert.equal(prepared.b.autoTestUsed,true);
});

test('unproven knight reflects attacks; wrong evidence neither unlocks nor consumes resources', () => {
  const s=initialState(); s.flags.evidence_a=true;
  const b=createBattle('knights',s), mp=s.party[0].mp;
  resolveTurn(s,b,[{type:'evidence_a',target:1},guard(),guard(),guard()]);
  assert.equal(b.enemies[1].proven,false);
  assert.equal(s.party[0].mp,mp);
  assert.equal(s.flags.evidence_a,true);
  resolveTurn(s,b,[{type:'attack',target:0},guard(),guard(),guard()]);
  assert.ok(b.log.some(l=>l.includes('攻撃が転送')));
});

test('legacy cannot be killed by attacks, migrated out of order, or fled', () => {
  const s=initialState(), b=createBattle('legacy',s); b.enemies[0].hp=1;
  resolveTurn(s,b,[{type:'attack',target:0},{type:'migrate_invoice'},guard(),guard()]);
  assert.equal(b.enemies[0].hp,1);
  assert.equal(b.phase,0); assert.equal(b.result,null);
  const before=structuredClone(s);
  assert.equal(flee(s,b),false); assert.deepEqual(s,before);
});

test('restoration rescues an actual full-party wipe exactly once', () => {
  const s=initialState(); s.flags.restore_test=true;
  const b=createBattle('legacy',s); b.enemies[1].hp=0; b.enemies[0].attack=1000; b.turn=3;
  resolveTurn(s,b,s.party.map(guard));
  assert.equal(b.restored,true); assert.equal(b.result,null);
  assert.ok(s.party.every(h=>h.hp===Math.ceil(h.maxHp*.5)));
  b.turn=6; resolveTurn(s,b,s.party.map(guard)); assert.equal(b.result,'lose');
});

test('level and equipment survive save loading without trusting injected combat stats', () => {
  const s=initialState(); s.gear[0]={weapon:true,armor:true,charm:true}; levelUp(s); levelUp(s);
  const attack=s.party[0].attack; s.party[0].attack=99999;
  const loaded=parseSave(JSON.stringify(s));
  assert.equal(loaded.level,3); assert.equal(loaded.party[0].attack,attack);
  assert.equal(loaded.party[0].maxMp,52);
});

test('every later normal encounter is solvable at level two without equipment or items', () => {
  for (const id of ['meeting1','meeting2','spec1','spec2','golem1','golem2','scope1','scope2','ghost2','ghost3','slime3']) {
    const {b}=campaignBattle(id);
    assert.equal(b.result,'win',id);
    assert.ok(b.turn<=10,`${id} took too many turns`);
  }
});

test('scope reduction removes only optional enemies and never skips legacy migration', () => {
  const s=initialState(); s.flags.release_scope=true;
  const b=createBattle('legacy',s);
  resolveTurn(s,b,[{type:'scope'},guard(),guard(),guard()]);
  assert.equal(b.enemies[1].hp,0);
  assert.equal(b.enemies[0].hp,b.enemies[0].maxHp);
  assert.equal(b.phase,0); assert.equal(b.result,null);
});

test('all members can diagnose, monitor, heal and restart without professional class locks', () => {
  const s=initialState(),b=createBattle('ghost',s);
  for(let i=0;i<4;i++)for(const type of ['log','monitor','heal','restart']) {
    assert.equal(SKILLS[type].category,'skill');
    assert.equal(validAction(s,b,i,{type,target:0}),true,`${i}/${type}`);
  }
  assert.deepEqual(s.party.map(h=>h.job),['調整役','中途参加','後輩','古参']);
});

test('paid leave restores HP and MP before any attack and lasts for the entire turn', () => {
  const s=initialState(),b=createBattle('boss',s);
  s.party[2].hp=1;s.party[2].mp=0;s.party[2].burn=3;
  resolveTurn(s,b,[guard(),guard(),{type:'paid_leave'},guard()]);
  assert.equal(s.party[2].hp,s.party[2].maxHp);
  assert.equal(s.party[2].mp,s.party[2].maxMp);
  assert.equal(s.party[2].burn,0);
  assert.ok(b.frames.some(frame=>frame.absences[2]==='有給休暇'));
  assert.ok(b.log.some(line=>line.includes('テオが復帰')));
  assert.equal(b.absences[2],undefined);
  assert.equal(validAction(s,b,2,{type:'paid_leave'}),false);
});

test('four simultaneous leave requests preserve one active worker and unused entitlement', () => {
  const s=initialState(),b=createBattle('ghost',s);
  resolveTurn(s,b,s.party.map(()=>({type:'paid_leave'})));
  assert.equal(b.leaveUsed.length,3);
  assert.ok(b.frames.every(frame=>frame.party.some((h,i)=>h.hp>0&&!frame.absences[i])));
  assert.equal(b.leaveUsed.includes(3),false);
});

test('the junior absence is announced, lasts one turn, returns and cannot chain', () => {
  for(let reason=0;reason<4;reason++) {
    const s=initialState(),b=createBattle('ghost',s);b.turn=4;b.enemies[0].attack=0;
    let calls=0;const rng=()=>calls++===0?0:(reason+.1)/4;
    resolveTurn(s,b,s.party.map(guard),rng);
    assert.equal(b.absences[2],ABSENCE_REASONS[reason]);
    assert.ok(b.log.some(line=>line.startsWith('次ターン予告')));
    const hp=s.party[2].hp;
    resolveTurn(s,b,[guard(),guard(),{type:'attack',target:0},guard()],()=>0);
    assert.equal(s.party[2].hp,hp);
    assert.deepEqual(b.absences,{});
    assert.equal(b.absenceCount,1);
    assert.equal(b.enemies[0].hp,b.enemies[0].maxHp);
    assert.ok(b.log.some(line=>line.includes('テオが復帰')));
  }
});

test('automatic absence never removes the last active worker and ends if help is required', () => {
  const s=initialState(),b=createBattle('ghost',s);
  s.party.forEach((h,i)=>{if(i!==2)h.hp=0;});b.turn=4;
  resolveTurn(s,b,s.party.map(guard),()=>0);
  assert.deepEqual(b.absences,{});
  b.absences={2:'健康診断'};
  resolveTurn(s,b,s.party.map(guard),()=>0);
  assert.ok(activeMembers(s,b).length>=1);
});

test('overtime grows with resolved turns, caps, and is never awarded directly by combat', () => {
  const s=initialState(),b=createBattle('ghost',s);b.enemies[0].attack=0;
  for(let i=0;i<3;i++)resolveTurn(s,b,s.party.map(guard),()=>1);
  assert.equal(b.overtimePay,0);
  resolveTurn(s,b,s.party.map(guard),()=>1);assert.equal(b.overtimePay,5);
  b.turn=100;resolveTurn(s,b,s.party.map(guard),()=>1);assert.equal(b.overtimePay,60);
  assert.equal(s.gold,0);
});

test('every encounter keeps its old ID but has the requested industry-based name', () => {
  for(const [id,name] of Object.entries(ENCOUNTER_NAMES)) {
    const b=createBattle(id,initialState());assert.equal(b.id,id);
    assert.ok(b.log[0].includes(name));
  }
  assert.equal(createBattle('golem1',initialState()).enemies[0].type,'document');
});
