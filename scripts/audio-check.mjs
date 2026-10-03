import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {initialState} from '../src/engine.js';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH?pathToFileURL(process.env.PLAYWRIGHT_PATH).href:'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[],errors=[];await mkdir('artifacts',{recursive:true});
try{for(const [width,height] of [[320,568],[390,844],[844,390]]){
 const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const cdp=await context.newCDPSession(page);const nodes=new Map(),states=[];let created=0;
 cdp.on('WebAudio.audioNodeCreated',({node})=>{if(node.nodeType==='Oscillator'){nodes.set(node.nodeId,node);created++;}});cdp.on('WebAudio.audioNodeWillBeDestroyed',({nodeId})=>nodes.delete(nodeId));cdp.on('WebAudio.contextChanged',({context})=>states.push(context.contextState));await cdp.send('WebAudio.enable');
 const tap=async s=>page.locator(s).tap();await page.goto('http://127.0.0.1:4173');await tap('[data-act=settings]');assert.equal(await page.locator('[data-pref=music]').isChecked(),false);await page.locator('[data-pref=sound]').uncheck();await page.locator('[data-pref=music]').check();await page.waitForTimeout(1200);assert.ok(created>0,'no real Web Audio oscillators');
 await page.locator('[data-pref=music]').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/audio-settings-${width}.png`});const bounds=await page.locator('[data-pref=music]').evaluate(e=>{const r=e.parentElement.getBoundingClientRect(),d=e.closest('dialog');return {w:r.width,h:r.height,x:r.x,y:r.y,scroll:d.scrollWidth,client:d.clientWidth};});assert.ok(bounds.h>=44&&bounds.x>=0&&bounds.y>=0&&bounds.y+bounds.h<=height+1&&bounds.scroll<=bounds.client+1);
 await page.locator('[data-pref=music]').uncheck();await page.waitForTimeout(300);const stopped=created;await page.waitForTimeout(1000);assert.equal(created,stopped,'music OFF still schedules notes');
 await page.locator('[data-pref=music]').check();await tap('[data-act=close]');await page.reload();await tap('[data-act=settings]');assert.equal(await page.locator('[data-pref=music]').isChecked(),true);
 const fixture=initialState();fixture.flags={quest:true,clerk:true,mayor:true};await page.locator('#import').setInputFiles({name:'audio-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await page.locator('dialog[open]').waitFor({state:'hidden'});await page.waitForTimeout(500);const restored=created;await page.waitForTimeout(1000);assert.ok(created>restored,'saved ON failed to resume on import');
 await tap('[data-guide=ruins]');await page.locator('.location strong').filter({hasText:'夜間バッチ'}).waitFor();await page.waitForTimeout(600);const dungeon=created;await tap('[data-guide=slime1]');await page.locator('.battle-mode').waitFor();await page.waitForTimeout(1500);assert.ok(created>dungeon,'battle music did not schedule');
 const visibility='synthetic document.hidden and visibilitychange; real AudioContext';
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(300);assert.equal(states.at(-1),'suspended');const paused=created;await page.waitForTimeout(1000);assert.equal(created,paused,'hidden music scheduled notes');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(1200);assert.equal(states.at(-1),'running');assert.ok(created>paused,'visible music did not resume');
 await tap('[data-act=settings]');await page.locator('[data-pref=music]').uncheck();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(100);const off=created;await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(700);assert.equal(created,off,'visibility return ignored OFF setting');
 results.push({width,height,created,states,bounds,visibility,realListening:false});await context.close();
}}
catch(e){errors.push(e.stack);}finally{await browser.close();}
await writeFile('artifacts/audio-results.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));if(errors.length)process.exitCode=1;
