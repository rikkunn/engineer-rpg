import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH?pathToFileURL(process.env.PLAYWRIGHT_PATH).href:'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});await mkdir('artifacts',{recursive:true});
const pages=[],errors=[];let lastPage;
try{for(const [width,height] of [[320,568],[390,844],[844,390]]){
 const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});const page=await context.newPage();lastPage=page;page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 async function dialogue(scene){let index=0;while(await page.locator('[data-act=next]').count()){
  const record=await page.evaluate(()=>{const body=document.querySelector('.message-body'),button=document.querySelector('[data-act=next]'),speaker=document.querySelector('.message-name');const b=body.getBoundingClientRect(),a=button.getBoundingClientRect(),s=speaker.getBoundingClientRect();return{speaker:speaker.textContent,body:body.textContent,whiteSpace:getComputedStyle(body).whiteSpace,textClient:body.clientHeight,textScroll:body.scrollHeight,textRect:{x:b.x,y:b.y,w:b.width,h:b.height},speakerRect:{x:s.x,y:s.y,w:s.width,h:s.height},button:{x:a.x,y:a.y,w:a.width,h:a.height},sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight};});
  pages.push({width,height,scene,index,...record});if(index===0||/[ユウリナテオガン]+「/.test(record.body))await page.screenshot({path:`artifacts/intro-${width}-${scene}-${index}.png`});
  if(record.button.y+record.button.h>height+1||record.button.x+record.button.w>width+1||record.button.h<44)errors.push(`${width} ${scene} ${index}: next button inaccessible`);
  if(record.sw>width||record.sh>height)errors.push(`${width} ${scene} ${index}: page overflow`);
  if((record.body.match(/(?:ユウ|リナ|テオ|ガン|村長|道具屋)「/g)||[]).length>0)errors.push(`${width} ${scene} ${index}: inline speaker labels`);
  await page.waitForTimeout(250);await page.locator('[data-act=next]').tap();index++;if(index>50)throw Error('dialogue loop');
 }}
 await page.goto('http://127.0.0.1:4173');if(width===320){await page.locator('[data-act=settings]').tap();await page.locator('[data-pref=large]').check();await page.locator('[data-act=close]').tap();}await page.locator('[data-act=new]').tap();await dialogue('arrival');
 for(const id of ['shop','clerk','mayor']){const guide=page.locator(`[data-guide=${id}]`);await guide.waitFor();const r=await guide.boundingBox();if(r.y+r.height>height+1||r.x+r.width>width+1||r.height<44)errors.push(`${width} ${id}: next objective inaccessible`);await page.screenshot({path:`artifacts/intro-${width}-guide-${id}.png`});await guide.tap();await page.locator('.message-body').waitFor();await dialogue(id);}
 await page.locator('[data-guide=ruins]').tap();await page.getByText('夜間バッチの遺跡',{exact:true}).waitFor();await page.locator('[data-guide]').waitFor();await page.screenshot({path:`artifacts/intro-${width}-ruins.png`});
 const enemyGuide=page.locator('[data-guide=slime1]');if(!/戦闘/.test(await enemyGuide.innerText()))errors.push(`${width}: enemy guidance omits battle warning`);await enemyGuide.tap();await page.locator('.battle-mode').waitFor();
 await context.close();
}}
catch(e){errors.push(e.stack);if(lastPage&&!lastPage.isClosed())await lastPage.screenshot({path:'artifacts/intro-review-failure.png'});}finally{await browser.close();}
await writeFile('artifacts/intro-review-results.json',JSON.stringify({pages,errors},null,2));console.log(JSON.stringify({pages:pages.length,errors},null,2));if(errors.length)process.exitCode=1;
