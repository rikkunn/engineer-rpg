import { pathToFileURL } from 'node:url';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { initialState,levelUp } from '../src/engine.js';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH?pathToFileURL(process.env.PLAYWRIGHT_PATH).href:'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
await mkdir('artifacts',{recursive:true});const results=[],errors=[];
try{for(const [width,height] of [[320,568],[390,844],[844,390]]){
 const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 const tap=async s=>page.locator(s).tap();
 const frame=async()=>({label:await page.locator('.playback .command-name').innerText(),text:await page.locator('.playback-lines').innerText(),party:await page.locator('.party-dock').innerText(),enemies:await page.locator('.enemy-line').innerText()});
 const hold=async()=>{const before=await frame();await page.waitForTimeout(7000);assert.deepEqual(await frame(),before,'message or frame advanced without a tap');return before;};
 const guardTurn=async()=>{for(let i=0;i<4;i++)await tap('[data-skill=guard]');await tap('[data-act=turn]');await page.locator('.playback').waitFor();};
 await page.goto('http://127.0.0.1:4173');const fixture=initialState();levelUp(fixture);levelUp(fixture);fixture.map='application';fixture.x=4;fixture.y=6;fixture.flags={quest:true,complete:true};
 await tap('[data-act=settings]');await page.locator('#import').setInputFiles({name:'playback-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await page.locator('dialog[open]').waitFor({state:'hidden'});
 await tap('[data-act=settings]');await page.locator('[data-pref=sound]').uncheck();await tap('[data-act=close]');await tap('[data-act=destinations]');await tap('[data-destination=meeting1]');await page.locator('.battle-mode').waitFor();
 await guardTurn();const first=await hold();assert.match(first.label,/^1 \/ /);
 await tap('[data-act=battle-next]');assert.match((await frame()).label,/^2 \/ /);
 for(const reduced of [true,false]){const before=await frame();await tap('[data-act=settings]');await page.locator('[data-pref=reduced]').setChecked(reduced);await page.waitForTimeout(1000);await tap('[data-act=close]');assert.deepEqual(await frame(),before);await hold();}
 const buttons=await page.locator('.playback-actions button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{text:e.textContent,w:r.width,h:r.height,x:r.x,y:r.y,client:e.clientWidth,scroll:e.scrollWidth};}));
 assert.ok(buttons.every(b=>b.w>=44&&b.h>=44&&b.x>=0&&b.y>=0&&b.x+b.w<=width+1&&b.y+b.h<=height+1&&b.scroll<=b.client+1),'playback button clipped or too small');
 await page.screenshot({path:`artifacts/manual-playback-${width}.png`});
 await tap('[data-act=battle-skip]');assert.equal(await page.locator('.playback').count(),0);assert.match(await page.locator('.battle-status').innerText(),/TURN 2/);assert.equal(await page.locator('[data-skill=guard]').count(),1);
 await tap('[data-act=settings]');await page.locator('[data-pref=reduced]').check();await tap('[data-act=close]');await guardTurn();await hold();
 let pages=0;while(await page.locator('.playback').count()){assert.ok(pages++<30);const current=await frame(),[position,total]=current.label.match(/\d+/g).map(Number);await tap('[data-act=battle-next]');if(position<total)assert.match((await frame()).label,new RegExp(`^${position+1} / `));else assert.equal(await page.locator('.playback').count(),0);}
 assert.match(await page.locator('.battle-status').innerText(),/TURN 3/);assert.equal(await page.locator('[data-skill=guard]').count(),1);results.push({width,height,holdSeconds:7,settingsBothStates:true,skip:true,manualPages:pages,buttons});await context.close();
}}
catch(e){errors.push(e.stack);}finally{await browser.close();}
await writeFile('artifacts/manual-playback-results.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));if(errors.length)process.exitCode=1;
