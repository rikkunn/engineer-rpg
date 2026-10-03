import test from 'node:test';
import assert from 'node:assert/strict';
import {nextGuidance} from '../src/guidance.js';
import {initialState} from '../src/engine.js';
import {MAPS,entities,pathTo} from '../src/world.js';
test('opening guidance advances to the person mentioned at the end of the conversation',()=>{
  const s=initialState();assert.equal(nextGuidance(s).targetId,'shop');
  s.flags.quest=true;assert.equal(nextGuidance(s).targetId,'clerk');
  s.flags.clerk=true;assert.equal(nextGuidance(s).targetId,'mayor');
  s.flags.mayor=true;assert.equal(nextGuidance(s).targetId,'ruins');
  s.flags.boss=true;assert.equal(nextGuidance(s).targetId,'shop');
  s.flags.complete=true;assert.equal(nextGuidance(s).targetId,'border_gate');
});
test('guidance returns an approachable entity without mutating the saved game',()=>{
  for(const [map,data] of Object.entries(MAPS))for(const flags of [{},{quest:true,clerk:true,mayor:true},{complete:true},{complete:true,knights:true},{finished:true}]){
    const s={...initialState(),map,flags,x:4,y:6};if(data.grid[s.y][s.x]!=='.')s.y=7;
    const before=JSON.stringify(s),guide=nextGuidance(s);assert.ok(guide,map);
    const target=entities(s).find(e=>e.id===guide.targetId);assert.ok(target,map);assert.ok(pathTo(s,target.x,target.y),map);
    assert.equal(JSON.stringify(s),before);
  }
});
test('completed optional work directs the player to its owner before leaving',()=>{
  const s=initialState();s.map='operations';s.x=4;s.y=6;s.flags={complete:true,knights:true,handover_request:true,handover_trial:true};s.defeated=['golem2'];
  assert.equal(nextGuidance(s).targetId,'handover_request');s.flags.handover=true;assert.equal(nextGuidance(s).targetId,'back_capital');
});
