import { pathToFileURL } from 'node:url';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { initialState,levelUp,SKILLS } from '../src/engine.js';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH?pathToFileURL(process.env.PLAYWRIGHT_PATH).href:'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});await mkdir('artifacts',{recursive:true});
const results=[],errors=[];
try{for(const [width,height] of [[320,568],[390,844],[844,390]]){
 const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,acceptDownloads:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 const tap=async s=>page.locator(s).tap();
 const snapshot=async name=>{await page.screenshot({path:`artifacts/leave-${width}-${name}.png`});const dimensions=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,w:innerWidth,panel:[...document.querySelectorAll('.command-window,.party-dock')].map(e=>({client:e.clientWidth,scroll:e.scrollWidth}))}));assert.ok(dimensions.sw<=dimensions.w);assert.ok(dimensions.panel.every(p=>p.scroll<=p.client+1));};
 const actors=async()=>page.locator('.party-unit').evaluateAll(es=>es.map((e,i)=>({i,hp:Number(e.querySelector('.hp-readout strong').textContent),max:Number(e.querySelector('.hp-readout small').textContent.replace('/','')),mp:Number(e.querySelector('.mp-readout').childNodes[0].textContent.replace('MP','')),maxMp:Number(e.querySelector('.mp-readout small').textContent.replace('/','')),burning:!!e.querySelector('.burning'),away:e.classList.contains('away'),dead:e.classList.contains('fallen')})));
 const choose=async(type,target=0)=>{if(!['attack','guard'].includes(type))await tap(`[data-command=${SKILLS[type].category==='item'?'items':'skills'}]`);await tap(`[data-skill=${type}]`);if(['enemy','ally'].includes(SKILLS[type].target))await tap(`[data-target="${target}"]`);};
 await page.goto('http://127.0.0.1:4173');const fixture=initialState();levelUp(fixture);levelUp(fixture);fixture.map='application';fixture.x=4;fixture.y=6;fixture.flags={quest:true,complete:true};fixture.party.forEach(h=>{h.hp-=20;h.mp-=5;h.burn=2;});
 await tap('[data-act=settings]');await page.locator('#import').setInputFiles({name:'leave-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await page.locator('dialog[open]').waitFor({state:'hidden'});
 await tap('[data-act=settings]');await page.locator('[data-pref=sound]').uncheck();await tap('[data-act=close]');await tap('[data-act=destinations]');await tap('[data-destination=meeting1]');await page.locator('.battle-mode').waitFor();
 for(let i=0;i<4;i++)await choose('paid_leave');await tap('[data-act=turn]');await page.locator('.playback').waitFor();
 assert.equal(await page.locator('.party-unit.away').count(),3);const leaveText=await page.locator('.playback-lines').innerText();assert.match(leaveText,/有給は今回は未使用/);const healing=await actors();assert.ok(healing.slice(0,3).every(h=>h.hp===h.max&&h.mp===h.maxMp&&!h.burning&&h.away));assert.ok(!healing[3].away);await snapshot('all-leave');
 await tap('[data-act=battle-skip]');assert.equal(await page.locator('.party-unit.away').count(),0);await tap('[data-command=skills]');assert.equal(await page.locator('[data-skill=paid_leave]').isDisabled(),true);await tap('[data-act=command-back]');
 await tap('[data-act=settings]');await page.locator('[data-pref=reduced]').check();await tap('[data-act=close]');
 for(let turn=2;turn<=4;turn++){for(const h of (await actors()).filter(h=>!h.away&&!h.dead))await choose('guard');await tap('[data-act=turn]');}
 assert.match(await page.locator('.battle-status').innerText(),/残業代 5 G/);assert.equal(await page.locator('.party-unit.away').count(),1);assert.match(await page.locator('.party-unit.away').innerText(),/テオ/);await snapshot('scheduled-absence');
 let loops=0;while(!(await page.locator('.battle-result').count())){assert.ok(loops++<10);const hs=await actors(),living=hs.filter(h=>!h.away&&!h.dead),scanned=(await page.locator('.battle-status').innerText()).includes('原因特定');
  for(const h of living){let type=h.i===1?'patch':'attack',target=0;if(!scanned&&h.i===0)type='log';if(!scanned&&h.i===3)type='monitor';await choose(type,target);}await tap('[data-act=turn]');
 }
 assert.equal(await page.locator('[data-act=victory]').count(),1);await snapshot('reward');const resultText=await page.locator('.battle-result p').innerText(),reward=Number(resultText.match(/(\d+) G/)[1]),overtime=Number(resultText.match(/残業代(\d+)/)[1]);assert.ok(overtime>0&&overtime<=60);assert.equal(reward,25+overtime);await tap('[data-act=victory]');
 await tap('[data-act=settings]');const dl=page.waitForEvent('download');await tap('[data-act=export]');const downloaded=await dl,saved=JSON.parse(await readFile(await downloaded.path(),'utf8'));assert.equal(saved.gold,reward);results.push({width,height,reward,overtime,fullPartyLeave:'three rested, last deferred',scheduledAbsence:'Theos one-turn absence passed'});await context.close();
}}
catch(e){errors.push(e.stack);}finally{await browser.close();}
await writeFile('artifacts/leave-results.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));if(errors.length)process.exitCode=1;
