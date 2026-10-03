import { pathToFileURL } from 'node:url';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { initialState, levelUp, SKILLS } from '../src/engine.js';
import { INVESTIGATIONS } from '../src/investigations.js';
const { chromium }=await import(process.env.PLAYWRIGHT_PATH?pathToFileURL(process.env.PLAYWRIGHT_PATH).href:'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
const page=await context.newPage(),errors=[],events=[],battles=[],investigationChecks=[],resumeChecks=new Set();
page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
await mkdir('artifacts',{recursive:true});
const tap=async s=>page.locator(s).tap();
async function dialogue(){let n=0;while(await page.locator('[data-act=next]').count()){assert.ok(n++<100);events.push(await page.locator('.message-body').innerText());await page.waitForTimeout(245);await tap('[data-act=next]');}}
async function go(id){console.log('go',id);await tap('[data-act=destinations]');await tap(`[data-destination="${id}"]`);await page.waitForTimeout(70);await dialogue();if(await page.locator('[data-investigation-choice]').count())await investigate(id);}
async function investigate(entity){
 const id={knights:'trace',handover_trial:'rehearsal',legacy:'release'}[entity],data=INVESTIGATIONS[id];assert.ok(data,entity);
 while(await page.locator('[data-investigation-choice]').count()){
  const step=Number((await page.locator('.investigation-progress').getAttribute('aria-label')).match(/\d+/)[0])-1;
  if(step===0&&!resumeChecks.has(id+'layout')){
   for(const [width,height] of [[320,568],[390,844],[844,390]]){await page.setViewportSize({width,height});const bounds=await page.locator('dialog').evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,buttons:[...el.querySelectorAll('[data-investigation-choice]')].map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height}))}));assert.ok(bounds.scroll<=bounds.client+1,`${id} ${width} horizontal overflow`);assert.ok(bounds.buttons.every(b=>b.h>=44&&b.w>=44));await page.screenshot({path:`artifacts/investigation-${id}-${width}.png`});investigationChecks.push({id,width,height,...bounds});}
   await page.setViewportSize({width:390,height:844});resumeChecks.add(id+'layout');
   const wrong=data.steps[step].choices.findIndex(c=>!c.correct);await tap(`[data-investigation-choice="${wrong}"]`);await tap('[data-investigation-next=retry]');assert.equal(Number((await page.locator('.investigation-progress').getAttribute('aria-label')).match(/\d+/)[0]),1);
  }
  await tap(`[data-investigation-choice="${data.steps[step].choices.findIndex(c=>c.correct)}"]`);
  if([0,5].includes(step)&&!resumeChecks.has(id+step)){resumeChecks.add(id+step);await tap('[data-act=close]');await go(entity);return;}
  await tap('[data-investigation-next=advance]');await dialogue();
 }
}
async function importSave(s){await tap('[data-act=settings]');await page.locator('#import').setInputFiles({name:'campaign-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});await page.locator('dialog[open]').waitFor({state:'hidden'});}
async function exportSave(){await tap('[data-act=settings]');const wait=page.waitForEvent('download');await tap('[data-act=export]');const d=await wait;const s=JSON.parse(await readFile(await d.path(),'utf8'));await tap('[data-act=close]');return s;}
async function select(type,target=0){if(!['attack','guard'].includes(type))await tap(`[data-command="${SKILLS[type].category==='item'?'items':'skills'}"]`);await tap(`[data-skill="${type}"]`);if(['enemy','ally'].includes(SKILLS[type].target))await tap(`[data-target="${target}"]`);}
async function fight(id){
 let loops=0;
 while(!(await page.locator('.battle-result').count())){
  assert.ok(loops++<40,`${id} exceeded 40 turns`);
  const stats=await page.locator('.party-unit').evaluateAll(es=>es.map(e=>({hp:Number(e.querySelector('.hp-readout strong').textContent),max:Number(e.querySelector('.hp-readout small').textContent.replace('/','')),mp:Number(e.querySelector('.mp-readout').childNodes[0].textContent.replace('MP','')),alive:!e.classList.contains('fallen'),away:e.classList.contains('away')})));
  const enemy=await page.locator('.enemy-caption').evaluateAll(es=>es.map(e=>{const hp=[...e.querySelectorAll('small')].map(s=>s.textContent.match(/(\d+)\s*\/\s*(\d+)/)).find(Boolean);return{hp:Number(hp[1]),max:Number(hp[2])};}));
  const target=enemy.findIndex(e=>e.hp>0),living=stats.map((h,i)=>i).filter(i=>stats[i].alive&&!stats[i].away),weak=living.reduce((a,b)=>stats[a].hp/stats[a].max<stats[b].hp/stats[b].max?a:b),fallen=stats.findIndex(h=>!h.alive),scanned=(await page.locator('.battle-status').innerText()).includes('原因特定');
  for(const i of living){
   let type=i===1&&stats[i].mp>=4?'patch':'attack',to=target;
   if(i===2&&stats[weak].hp<stats[weak].max-25&&stats[i].mp>=4){type='heal';to=weak;}
   if(i===3&&fallen>=0&&stats[i].mp>=5){type='restart';to=fallen;}
   if(!scanned&&i===0)type='log';if(!scanned&&i===3)type='monitor';
   if(id==='knights'&&loops===1){type=['evidence_a','evidence_b','reproduce','evidence_c'][i];to=i===3?2:i;}
   if(id==='legacy'&&i===0&&scanned&&enemy[1]?.hp>0)type='scope';
   if(id==='legacy'&&i===0&&enemy[0].hp<=enemy[0].max*.4){await tap('[data-command=items]');const enabled=page.locator('[data-skill^="migrate_"]:not(:disabled)');assert.ok(await enabled.count(),'migration not exposed');await enabled.first().tap();continue;}
   await select(type,to);
  }
  await tap('[data-act=turn]');await tap('[data-act=battle-skip]');
 }
 assert.equal(await page.locator('[data-act=victory]').count(),1,`${id}: party defeated`);
 battles.push({id,turns:loops});console.log('won',id,loops);
 await tap('[data-act=victory]');await dialogue();
}
async function combat(id){await go(id);await fight(id);}
async function rest(){await go('camp_rest');}
try{
 await page.goto('http://127.0.0.1:4173');
 const start=initialState();levelUp(start);start.flags={quest:true,clerk:true,mayor:true,seal:true,boss:true,complete:true,minutes:true};start.defeated=['boss'];start.gold=120;
 await importSave(start);await tap('[data-act=settings]');await page.locator('[data-pref=reduced]').check();await page.locator('[data-pref=sound]').uncheck();await tap('[data-act=close]');
 await go('border_gate');await go('sales_meeting');await go('clock_audit');await go('scope_request');
 await go('to_application');await go('application_keeper');await combat('meeting1');await combat('golem1');await go('evidence_a');await go('back_border');await rest();
 await go('to_network');await go('network_keeper');await combat('spec1');await combat('ghost2');await go('evidence_b');await go('back_border');await rest();
 await go('to_training');await go('test_request');await combat('meeting2');await go('normal_trial');await tap('[data-trial=test_normal]');await dialogue();await go('rejected_trial');await tap('[data-trial=test_rejected]');await dialogue();await go('test_request');await go('back_border');await rest();
 await go('to_gate');await go('infrastructure_keeper');await combat('slime3');await go('evidence_c');await combat('knights');
 await go('to_capital');for(const id of ['king_deadline','order_owner','stock_owner','invoice_owner'])await go(id);
 await go('to_vault');await go('restore_request');await go('restore_archive');await combat('ghost3');await go('restore_trial');await tap('[data-trial=restore_trial]');await dialogue();await go('restore_request');await go('back_capital');await rest();
 await go('to_operations');await go('handover_request');await combat('golem2');await go('handover_trial');await dialogue();await go('handover_request');await go('back_capital');await rest();
 await go('to_tower');await go('predecessor_record');await go('predecessor_comment');await combat('scope1');await combat('spec2');await go('to_release');await go('release_scope');await go('legacy_voice');await combat('scope2');await rest();
 const prepared=await exportSave();assert.ok(['auto_test','restore_test','handover'].every(k=>prepared.flags[k]));
 for(const [count,ending] of [[3,'定時退社'],[1,'無事納品'],[0,'伝説の担当者']]){
  if(count!==3){const s=structuredClone(prepared);for(const [i,k] of ['auto_test','restore_test','handover'].entries())s.flags[k]=i<count;await importSave(s);}
  await go('legacy');await page.screenshot({path:`artifacts/campaign-ready-${count}.png`});await tap('[data-act=start-final]');
  await page.screenshot({path:`artifacts/campaign-legacy-${count}.png`});await fight('legacy');
  assert.equal(await page.locator('#modal-title').innerText(),ending);await page.screenshot({path:`artifacts/campaign-ending-${count}.png`});
  await page.reload();await tap('[data-act=continue]');assert.equal(await page.locator('#modal-title').innerText(),ending);
  await tap('[data-act=close]');await tap('[data-act=journal]');assert.equal(await page.locator('[data-act=postgame]').count(),1);
  await tap('[data-act=postgame]');assert.match(await page.locator('.location strong').innerText(),/切替の門/);
 }
 console.log('completed all endings');
}catch(e){errors.push(e.stack);console.log(e.stack);await page.screenshot({path:'artifacts/campaign-failure.png'});console.log(await page.locator('body').innerText());}
finally{await writeFile('artifacts/campaign-results.json',JSON.stringify({battles,events,investigationChecks,resumeChecks:[...resumeChecks],errors},null,2));await browser.close();}
console.log(JSON.stringify({battles,dialogueLines:events.length,errors}));if(errors.length)process.exitCode=1;
