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
    ],
  },
  ruins: {
    name: '夜間バッチの遺跡', subtitle: '動いている理由は、誰も知らない。', theme: 'ruins',
    grid: ['#########','#.......#','#.##.##.#','#.......#','###.#.###','#.......#','#.##.##.#','#.......#','#########'],
    entities: [
      { id: 'village', x: 4, y: 7, type: 'exit', label: '村へ' },
      { id: 'slime1', x: 3, y: 5, type: 'enemy', label: 'バグ', color: '#b0c98c' },
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
export function entities(s) { return MAPS[s.map].entities.filter(e => !s.defeated.includes(e.id) && !(e.id === 'boss' && s.flags.boss)); }
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
