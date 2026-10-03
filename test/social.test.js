import test from 'node:test';
import assert from 'node:assert/strict';
import { SOCIAL_EVENTS, createSocial, getSocialPrompt, getSocialCommands, resolveSocial } from '../prototypes/social.js';

for(const [id,event] of Object.entries(SOCIAL_EVENTS)){
  test(`${id}: distinct conversations, multiple viable approaches, no single-command shortcut`,()=>{
    assert.equal(event.rounds.length,4);assert.equal(event.commands.length,4);
    for(const r of event.rounds){assert.ok(r.text);assert.equal(r.options.length,4);assert.ok(r.options.filter(o=>o.understanding>=4&&o.trust>=3).length>=2);}
    const successful=[];
    for(let code=0;code<256;code++){
      let b=createSocial(id),n=code;const path=[];
      for(let r=0;r<4;r++){const i=n%4;n=Math.floor(n/4);path.push(i);b=resolveSocial(b,event.commands[i].id);}
      assert.equal(b.completed,true);
      if(b.result==='success')successful.push(path);
    }
    assert.ok(successful.length>=32,'many combinations should work, not one correct sequence');
    for(const c of event.commands){let b=createSocial(id);for(let r=0;r<4;r++)b=resolveSocial(b,c.id);assert.equal(b.result,'retry','repeating one approach should not solve every stage');}
  });
  test(`${id}: transitions preserve input and retain choices`,()=>{
    const b=createSocial(id),snapshot=structuredClone(b);assert.ok(getSocialPrompt(b));assert.equal(getSocialCommands(b).length,4);
    const next=resolveSocial(b,event.commands[0].id);assert.deepEqual(b,snapshot);assert.equal(next.round,1);assert.equal(next.history[0].commandId,event.commands[0].id);assert.ok(next.log.some(l=>l.includes(event.rounds[0].options[0].response)));
    assert.throws(()=>resolveSocial(b,'missing'));assert.deepEqual(b,snapshot);
  });
}
test('completed encounters stay complete; restarting is explicit and clean',()=>{
  let b=createSocial('requirements');for(const id of ['ask','reflect','prototype','park'])b=resolveSocial(b,id);
  assert.equal(b.result,'success');assert.deepEqual(getSocialCommands(b),[]);assert.deepEqual(resolveSocial(b,'ask'),b);
  const replay=createSocial('requirements');assert.equal(replay.round,0);assert.equal(replay.trust,0);assert.deepEqual(replay.history,[]);
});
test('memory distinguishes repeated and complementary approaches',()=>{
  const first=resolveSocial(createSocial('requirements'),'ask');const repeated=resolveSocial(first,'ask'),complementary=resolveSocial(first,'reflect');
  assert.ok(complementary.trust>repeated.trust);assert.ok(complementary.understanding>repeated.understanding);assert.notDeepEqual(complementary.log,repeated.log);
});
