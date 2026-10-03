export const MAPS = {
  village: {
    name: 'ハジマリ村', subtitle: '平穏な村にも、運用はある。', theme: 'village',
    grid: ['#########','#.......#','#.......#','#.......#','#.......#','#.......#','#.......#','#.......#','#########'],
    entities: [
      { id: 'shop', x: 2, y: 2, type: 'npc', label: '道具屋', color: '#e7b56b' },
      { id: 'clerk', x: 6, y: 2, type: 'npc', label: '店員', color: '#ab97d7' },
      { id: 'mayor', x: 6, y: 5, type: 'npc', label: '村長', color: '#cdd5b1' },
      { id: 'inn', x: 2, y: 5, type: 'inn', label: '宿屋', color: '#88c1bb' },
      { id: 'ruins', x: 4, y: 1, type: 'exit', label: '地下へ' },
      { id: 'sign', x: 4, y: 4, type: 'sign', label: '案内板' },
      { id: 'border_gate', x: 7, y: 7, type: 'exit', label: '国境へ' },
      { id: 'supplies', x: 7, y: 6, type: 'npc', label: '装備屋', color: '#bb9c74' },
    ],
  },
  ruins: {
    name: '夜間バッチの遺跡', subtitle: '動いている理由は、誰も知らない。', theme: 'ruins',
    grid: ['#########','#.......#','#.##.##.#','#.......#','###.#.###','#.......#','#.##.##.#','#.......#','#########'],
    entities: [
      { id: 'village', x: 4, y: 7, type: 'exit', label: '村へ' },
      { id: 'slime1', x: 3, y: 5, type: 'enemy', label: '誰かのTODO', color: '#b0c98c' },
      { id: 'terminal', x: 1, y: 3, type: 'terminal', label: '端末' },
      { id: 'minutes', x: 7, y: 3, type: 'chest', label: '議事録' },
      { id: 'slime2', x: 4, y: 3, type: 'enemy', label: '差し戻し', color: '#d9b375' },
      { id: 'core', x: 4, y: 1, type: 'exit', label: '最深部' },
    ],
  },
  core: {
    name: '再送処理の祭壇', subtitle: '善意のリトライが、止まらない。', theme: 'core',
    grid: ['#########','#.......#','#.#...#.#','#.......#','#.##.##.#','#.......#','#.#...#.#','#.......#','#########'],
    entities: [
      { id: 'ruinsBack', x: 4, y: 7, type: 'exit', label: '遺跡へ' },
      { id: 'seal', x: 2, y: 5, type: 'chest', label: '刻印' },
      { id: 'ghost', x: 6, y: 5, type: 'enemy', label: '本番限定', color: '#afa5d8' },
      { id: 'archive', x: 1, y: 3, type: 'terminal', label: '運用記録' },
      { id: 'boss', x: 4, y: 2, type: 'boss', label: '双頭蛇', color: '#ce826c' },
    ],
  },
};
const room = (name, subtitle, theme, entities, grid) => ({ name, subtitle, theme, entities, grid: grid || ['#########','#.......#','#..#.#..#','#.......#','#.#...#.#','#.......#','#.......#','#.......#','#########'] });
const ent = (id,x,y,type,label,color='#c5b990') => ({id,x,y,type,label,color});
Object.assign(MAPS,{
  border:room('三社の国境砦','線はつながる。話はつながらない。','fort',[
    ent('sales_meeting',2,2,'npc','営業サラ','#df9b83'),ent('clock_audit',6,2,'npc','監査僧','#c2c8a9'),ent('scope_request',6,5,'npc','管理官','#bbadce'),
    ent('to_application',1,4,'exit','アプリ塔'),ent('to_network',7,4,'exit','中継塔'),ent('to_gate',4,1,'exit','基盤塔'),ent('to_training',2,6,'exit','試験場'),
    ent('camp_rest',4,5,'inn','休憩所','#88c1bb'),ent('back_village',4,7,'exit','村へ'),ent('bridge_memorial',1,1,'sign','石碑'),ent('supplies',7,7,'npc','装備屋','#bb9c74'),
  ]),
  application:room('アプリ塔・受付の書庫','「成功」の意味を、確認しよう。','fort',[
    ent('application_keeper',2,2,'npc','術師','#ba96d6'),ent('meeting1',4,5,'enemy','定例の亡霊','#abafce'),ent('golem1',6,3,'enemy','属人ゴーレム','#b89d79'),
    ent('evidence_a',4,1,'terminal','受付台帳'),ent('back_border',4,7,'exit','砦へ'),ent('application_memo',1,5,'sign','付箋'),
  ]),
  network:room('中継塔・七分ずれた時計','正常です。ただし、測っていません。','fort',[
    ent('network_keeper',2,2,'npc','渡し守','#83b7cd'),ent('spec1',4,5,'enemy','仕様キメラ','#b9ae87'),ent('ghost2',6,3,'enemy','設定の影','#a69abd'),
    ent('evidence_b',4,1,'terminal','中継碑'),ent('back_border',4,7,'exit','砦へ'),ent('network_memo',1,5,'sign','監視盤'),
  ]),
  gate:room('基盤塔・承認待ちの門','申請するための申請が必要です。','fort',[
    ent('infrastructure_keeper',2,2,'npc','守衛','#7ea8b9'),ent('slime3',4,5,'enemy','承認待ち','#b2bd80'),ent('evidence_c',6,3,'terminal','変更台帳'),
    ent('knights',4,1,'boss','三騎士','#bcc3c6'),ent('back_border',4,7,'exit','砦へ'),ent('to_capital',7,1,'exit','王都へ'),
  ]),
  training:room('回帰試験の庭','失敗するべき時に、失敗できるか。','village',[
    ent('test_request',4,2,'npc','検証士','#90c6a1'),ent('normal_trial',1,4,'terminal','白い試験碑'),ent('rejected_trial',7,4,'terminal','黒い試験碑'),
    ent('meeting2',4,5,'enemy','確認会議','#a3bdd4'),ent('back_border',4,7,'exit','砦へ'),
  ]),
  capital:room('王都・切替前夜','明日のパンを、止めないために。','village',[
    ent('king_deadline',4,1,'npc','王','#e2be76'),ent('order_owner',1,3,'npc','受発注係','#cc9a79'),ent('stock_owner',4,3,'npc','倉庫番','#a4b576'),ent('invoice_owner',7,3,'npc','会計官','#a1a8c4'),
    ent('to_vault',1,5,'exit','保管庫'),ent('to_operations',7,5,'exit','運用室'),ent('to_tower',6,1,'exit','古代機へ'),ent('camp_rest',4,5,'inn','宿屋','#90c4b1'),ent('back_gate',4,7,'exit','国境へ'),ent('supplies',7,7,'npc','装備屋','#bb9c74'),
  ]),
  vault:room('復元確認の保管庫','バックアップは、戻せてからが本番。','ruins',[
    ent('restore_request',2,2,'npc','司書','#b5a2c2'),ent('restore_archive',1,4,'chest','最新の写本'),ent('ghost3',4,5,'enemy','復元の影','#b4a0d0'),
    ent('restore_trial',6,3,'terminal','復元台座'),ent('back_capital',4,7,'exit','王都へ'),ent('vault_memo',6,1,'sign','棚の札'),
  ]),
  operations:room('新しい運用室','「いつものように」を、卒業しよう。','fort',[
    ent('handover_request',2,2,'npc','ノノ','#e8b693'),ent('golem2',4,5,'enemy','属人化の壁','#ba9a72'),ent('handover_trial',6,3,'terminal','運用卓'),
    ent('back_capital',4,7,'exit','王都へ'),ent('ops_memo',1,5,'sign','当番表'),
  ]),
  tower:room('古代機・継ぎ足しの回廊','この一行が、誰かの暮らしを守る。','core',[
    ent('predecessor_record',2,2,'terminal','賢者の記録'),ent('predecessor_comment',6,3,'sign','欄外の文字'),ent('scope1',4,5,'enemy','ついで竜','#bc876d'),
    ent('spec2',4,3,'enemy','変更キメラ','#b8ab85'),ent('to_release',4,1,'exit','切替の門'),ent('back_capital',4,7,'exit','王都へ'),
  ]),
  release:room('切替の門','金曜、日没。最後の打ち合わせ。','core',[
    ent('release_scope',2,2,'npc','サラ','#df9b83'),ent('legacy_voice',6,2,'terminal','古代の声'),ent('scope2',4,4,'enemy','あと一点竜','#c9947a'),
    ent('final_optional_notice',2,5,'npc','準備の確認','#9ac4a9'),ent('legacy',4,1,'boss','レガシア','#d7b776'),ent('back_tower',4,7,'exit','回廊へ'),ent('camp_rest',6,5,'inn','休憩装置','#8cbeb5'),
  ]),
});
export function entities(s) { return MAPS[s.map].entities.filter(e => !s.defeated.includes(e.id) && !(e.id === 'boss' && s.flags.boss) && !(e.id==='border_gate'&&!s.flags.complete)); }
export function pathTo(s, tx, ty) {
  const grid = MAPS[s.map].grid;
  if (!grid[ty] || grid[ty][tx] !== '.') return null;
  const objects = entities(s), target = objects.find(e => e.x === tx && e.y === ty);
  const done = (x,y) => target ? Math.abs(tx-x) + Math.abs(ty-y) === 1 : x === tx && y === ty;
  const queue = [{x:s.x,y:s.y,path:[]}], seen = new Set([`${s.x},${s.y}`]);
  for (let at = 0; at < queue.length; at++) {
    const p = queue[at]; if (done(p.x,p.y)) return { path:p.path, target };
    for (const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
      const x=p.x+dx,y=p.y+dy,key=`${x},${y}`;
      if (seen.has(key) || grid[y]?.[x] !== '.' || objects.some(e=>e.x===x&&e.y===y)) continue;
      seen.add(key); queue.push({x,y,path:[...p.path,{x,y}]});
    }
  }
  return null;
}
