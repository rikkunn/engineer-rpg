import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, pathTo, entities } from '../src/world.js';
import { initialState, parseSave } from '../src/engine.js';
import { EVENTS } from '../src/campaign.js';
import { INVESTIGATIONS } from '../src/investigations.js';

test('every map entity is on a floor tile, uniquely positioned, and approachable',()=>{
  for(const [id,map] of Object.entries(MAPS)){
    const s=initialState();s.map=id;s.x=4;s.y=id==='ruins'?5:id==='village'?7:6;s.flags.complete=true;
    // Fight approachable symbols first; they deliberately gate narrow passages.
    let progress=true;
    while(progress){progress=false;for(const e of entities(s).filter(e=>e.type==='enemy'))if(pathTo(s,e.x,e.y)){s.defeated.push(e.id);progress=true;}}
    const occupied=new Set();
    for(const entity of map.entities){
      assert.equal(map.grid[entity.y][entity.x],'.',`${id}/${entity.id}: floor`);
      const key=`${entity.x},${entity.y}`;assert(!occupied.has(key),`${id}/${entity.id}: duplicate`);occupied.add(key);
      assert(pathTo(s,entity.x,entity.y),`${id}/${entity.id}: inaccessible`);
    }
  }
});
test('cleared encounters disappear and destinations remain navigable',()=>{
  const s=initialState();s.map='ruins';s.x=4;s.y=5;s.defeated=['slime1','slime2'];
  assert(!entities(s).some(e=>s.defeated.includes(e.id)));
  assert(pathTo(s,4,1));
});
test('all campaign maps survive save validation',()=>{
  for(const id of Object.keys(MAPS)){const s=initialState();s.map=id;assert.equal(parseSave(JSON.stringify(s)).map,id);}
});
test('preparation rewards and three endings have their own events',()=>{
  for(const id of ['auto_test','restore_test','handover','epilogue_best','epilogue_good','epilogue_hero'])assert(EVENTS[id]?.lines.length>=2,id);
  assert(Object.keys(EVENTS).length>=40);
});
test('save validation rejects malformed state and hostile combat stats',()=>{
  const s=initialState();s.party[0].attack=999999;
  assert.equal(parseSave(JSON.stringify(s)).party[0].attack,15);
  for(const input of ['null','{}','[]','{"version":2}'])assert.throws(()=>parseSave(input));
  s.party[0].hp=-1;assert.throws(()=>parseSave(JSON.stringify(s)));
});
test('investigations have one verifiable route at every step and recoverable progress',()=>{
  for(const [id,puzzle] of Object.entries(INVESTIGATIONS)){
    assert.equal(puzzle.steps.length,6,id);
    for(const step of puzzle.steps){assert.equal(step.choices.filter(c=>c.correct).length,1);assert(step.choices.every(c=>c.feedback&&c.label));}
    const s=initialState();for(let i=0;i<6;i++)s.flags[`${id}_step_${i}`]=true;
    assert.equal(parseSave(JSON.stringify(s)).flags[`${id}_step_5`],true);
  }
});
