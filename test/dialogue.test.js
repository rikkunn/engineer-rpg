import test from 'node:test';
import assert from 'node:assert/strict';
import {dialoguePages} from '../src/dialogue.js';
import {CHAPTER_ONE} from '../src/chapter-one.js';
test('dialogue keeps every speaker separate and does not assign narration to an NPC',()=>{
  const pages=dialoguePages('道具屋',['テオ「僕も迷いました」 リナ「じゃあ、一緒に見よう」',{speaker:'',text:'二人は台帳を開いた。'}]);
  assert.deepEqual(pages.map(p=>p.speaker),['テオ','リナ','']);
  assert.equal(pages[0].text,'僕も迷いました');
});
test('long speech is paginated without losing content or changing its speaker',()=>{
  const text='これは以前、説明のないまま使い始めてしまった道具です。'.repeat(7);
  const pages=dialoguePages('ユウ',[{speaker:'リナ',text}]);
  assert.ok(pages.length>2);assert.ok(pages.every(p=>p.text.length<=66&&p.speaker==='リナ'));
  assert.equal(pages.map(p=>p.text.replaceAll('\n','')).join(''),text);
});
test('authored opening conversations separate spoken lines from system rewards',()=>{
  for(const lines of Object.values(CHAPTER_ONE))for(const line of lines){assert.equal(typeof line.speaker,'string');assert.equal(typeof line.text,'string');assert.doesNotMatch(line.text,/(ユウ|リナ|テオ|ガン)「/);}
  assert.ok(CHAPTER_ONE.shop.find(l=>l.speaker===''&&l.text.includes('6個')));
});
