// Local rendering check. Set PLAYWRIGHT_PATH to a bundled playwright index.mjs when not installed.
import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ? pathToFileURL(process.env.PLAYWRIGHT_PATH).href : 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
await mkdir('artifacts', { recursive: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173');
await page.waitForTimeout(500);
console.log(JSON.stringify({startupErrors:errors,body:await page.locator('body').innerText()}));
await page.screenshot({path:'artifacts/startup.png'});
await page.getByRole('button',{name:/はじめから/}).click();
while(await page.locator('[data-act=next]').count()){await page.waitForTimeout(260);await page.locator('[data-act=next]').click();}
await page.getByRole('button',{name:'↗ 目的地',exact:true}).click();
await page.getByRole('button',{name:'道具屋',exact:true}).click();
await page.locator('.message-body').waitFor();
await page.screenshot({path:'artifacts/mobile-dialogue.png'});
while(await page.locator('[data-act=next]').count()){await page.waitForTimeout(260);await page.locator('[data-act=next]').click();}
await page.screenshot({path:'artifacts/mobile-world.png'});
for(const [width,height] of [[320,568],[375,667],[390,844],[844,390]]){
  await page.setViewportSize({width,height});
  const bounds=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,buttons:[...document.querySelectorAll('.explore-commands button')].map(el=>{const r=el.getBoundingClientRect();return {text:el.textContent,x:r.x,y:r.y,w:r.width,h:r.height};})}));
  if(bounds.scrollWidth>width||bounds.scrollHeight>height)errors.push(`overflow ${width}x${height}`);
  if(bounds.buttons.some(b=>b.y+b.h>height+1||b.x+b.w>width+1||b.h<44))errors.push(`controls outside viewport ${width}x${height}`);
  console.log(JSON.stringify(bounds));
}
console.log(JSON.stringify({errors}));
await browser.close();
if(errors.length)process.exitCode=1;
