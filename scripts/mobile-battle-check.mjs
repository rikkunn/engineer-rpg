import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ? pathToFileURL(process.env.PLAYWRIGHT_PATH).href : 'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
await mkdir('artifacts',{recursive:true});
const errors=[], measurements=[];
try {
 for(const [width,height] of [[320,568],[390,844],[844,390]]) {
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(`${width}: ${e.message}`));
  page.setDefaultTimeout(10000);
  const tap=async selector=>page.locator(selector).tap();
  const dialogue=async()=>{while(await page.locator('[data-act=next]').count()){await page.waitForTimeout(270);await tap('[data-act=next]');}};
  const destination=async id=>{await tap('[data-act=destinations]');await tap(`[data-destination=${id}]`);await page.waitForTimeout(1600);};
  const snapshot=async label=>{
   await page.screenshot({path:`artifacts/battle-${width}x${height}-${label}.png`});
   const bounds=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,panel:document.querySelector('.command-window')&&{client:document.querySelector('.command-window').clientWidth,scroll:document.querySelector('.command-window').scrollWidth},buttons:[...document.querySelectorAll('.command-window button')].map(el=>{const r=el.getBoundingClientRect();return{text:el.textContent.trim(),x:r.x,y:r.y,w:r.width,h:r.height};})}));
   measurements.push({label,...bounds});
   if(bounds.scrollWidth>width||bounds.scrollHeight>height)errors.push(`${width} ${label}: page overflow`);
   if(bounds.panel&&bounds.panel.scroll>bounds.panel.client+1)errors.push(`${width} ${label}: horizontal command overflow`);
   if(bounds.buttons.some(b=>b.h<44||b.w<44))errors.push(`${width} ${label}: target below 44px`);
   for(const button of await page.locator('.command-window button').all()){await button.scrollIntoViewIfNeeded();const box=await button.boundingBox();if(box.x<0||box.y<0||box.x+box.width>width+1||box.y+box.height>height+1)errors.push(`${width} ${label}: button inaccessible by panel scrolling`);}
  };
  await page.goto('http://127.0.0.1:4173');await tap('[data-act=new]');await dialogue();
  await destination('shop');await dialogue();await destination('clerk');await dialogue();await destination('mayor');await dialogue();await destination('ruins');await destination('slime1');
  await page.locator('.battle-mode').waitFor();await snapshot('root');
  await tap('[data-skill=attack]');assert.match(await page.locator('.target-help').innerText(),/こうげき/);await snapshot('target');
  await tap('[data-act=command-back]');await tap('[data-command=skills]');await snapshot('skills');await tap('[data-skill=log]');
  assert.match(await page.locator('.command-name').innerText(),/リナ/);
  await tap('[data-act=command-back]');assert.match(await page.locator('.command-name').innerText(),/ユウ/);
  await tap('[data-command=skills]');await tap('[data-skill=log]');
  await tap('[data-command=skills]');await tap('[data-skill=patch]');await tap('[data-target="0"]');
  await tap('[data-command=skills]');await tap('[data-skill=reproduce]');
  await tap('[data-command=skills]');await tap('[data-skill=monitor]');await snapshot('confirm');
  await tap('[data-act=turn]');await page.locator('.playback').waitFor();await snapshot('playback');
  await tap('[data-act=battle-skip]');assert.match(await page.locator('.battle-status').innerText(),/TURN 2/);assert.match(await page.locator('.battle-status').innerText(),/原因特定/);
  await tap('[data-act=settings]');await page.locator('[data-pref=reduced]').check();await tap('[data-act=close]');
  for(let i=0;i<4;i++)await tap('[data-skill=guard]');await tap('[data-act=turn]');
  assert.equal(await page.locator('.playback').count(),0);assert.match(await page.locator('.battle-status').innerText(),/TURN 3/);
  await page.reload();await tap('[data-act=continue]');assert.equal(await page.locator('.world-mode').count(),1);assert.match(await page.locator('.location strong').innerText(),/夜間バッチ/);
  await context.close();
 }
} catch(e) {errors.push(e.stack);} finally {await browser.close();}
await writeFile('artifacts/mobile-battle-results.json',JSON.stringify({measurements,errors},null,2));
console.log(JSON.stringify({checked:measurements.length,errors},null,2));
if(errors.length)process.exitCode=1;
