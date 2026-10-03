import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, createBattle, resolveTurn, flee } from '../src/engine.js';

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
