// Authored dialogue uses explicit speakers. Legacy short notices remain supported.
const names=['ユウ','リナ','テオ','ガン','サラ','ノノ','村長','司書','店員','道具屋','宿屋','王','宰相','術師','守衛','渡し守','老僧','会計官','倉庫番','見習い'];
const quotes=new RegExp(`(${names.join('|')})「([^」]*)」`,'g');
const notices=new Set(['村の案内板','承認済み議事録','古い宝箱','次の冒険へ','運用端末','休憩所','当番表','付箋の山','監視盤','保管庫の棚','二重送信の双頭蛇']);
export function dialoguePages(defaultSpeaker,lines){
  const beats=lines.flatMap(line=>{
    if(typeof line==='object')return [{speaker:line.speaker??'',text:line.text,emotion:line.emotion||'neutral'}];
    const matches=[...line.matchAll(quotes)];
    if(!matches.length)return [{speaker:notices.has(defaultSpeaker)?'':defaultSpeaker,text:line,emotion:'neutral'}];
    const result=[];let cursor=0;
    for(const m of matches){const before=line.slice(cursor,m.index).trim();if(before)result.push({speaker:'',text:before});result.push({speaker:m[1],text:m[2]});cursor=m.index+m[0].length;}
    if(line.slice(cursor).trim())result.push({speaker:'',text:line.slice(cursor).trim()});
    return result;
  });
  return beats.flatMap(beat=>{
    const sentences=String(beat.text).match(/[^。！？\n]+[。！？]?|\n/g)||[];
    const pages=[];let text='';
    for(const sentence of sentences){
      if(sentence==='\n'){if(text&&!text.endsWith('\n'))text+='\n';continue;}
      let rest=sentence;
      while(rest.length){const room=66-text.length;if(room<12&&text){pages.push({...beat,text:text.trim()});text='';continue;}
        const take=rest.slice(0,66-text.length);text+=take;rest=rest.slice(take.length);
        if(rest){pages.push({...beat,text:text.trim()});text='';}
      }
      if(text.length>=56){pages.push({...beat,text:text.trim()});text='';}
      else if(text&&!text.endsWith('\n'))text+='\n';
    }
    if(text.trim())pages.push({...beat,text:text.trim()});return pages;
  });
}
export const PORTRAITS={
  ユウ:{coat:'#d5b15d',hair:'#5b413a',style:'short'},
  リナ:{coat:'#9b91cf',hair:'#493d59',style:'long'},
  テオ:{coat:'#85bba6',hair:'#756048',style:'tuft'},
  ガン:{coat:'#7bafc8',hair:'#9b9b94',style:'beard'},
  サラ:{coat:'#db9985',hair:'#79523e',style:'ponytail'},
  ノノ:{coat:'#b19abd',hair:'#544836',style:'bob'},
  道具屋:{coat:'#b88756',hair:'#664431',style:'cap'},
  店員:{coat:'#ab97d7',hair:'#946245',style:'bob'},
  村長:{coat:'#c5c497',hair:'#c7c2ab',style:'beard'},
  宿屋:{coat:'#88c1bb',hair:'#62423c',style:'kerchief'},
  アプリ社の術師:{coat:'#ba96d6',hair:'#503b64',style:'glasses'},
  回線社の渡し守:{coat:'#83b7cd',hair:'#4f544a',style:'bandana'},
  基盤社の守衛:{coat:'#7ea8b9',hair:'#665447',style:'helmet'},
  国境の門番:{coat:'#ab9a75',hair:'#725a43',style:'helmet'},
  監査の老僧:{coat:'#bfb998',hair:'#dfd8c6',style:'bald'},
  橋の管理官:{coat:'#bbadce',hair:'#635660',style:'mustache'},
  見習い検証士:{coat:'#90c6a1',hair:'#8a623e',style:'tuft'},
  王:{coat:'#bd735e',hair:'#c9a363',style:'crown'},
  王都の宰相:{coat:'#8396aa',hair:'#aaa7a1',style:'glasses'},
  受発注係:{coat:'#cc9a79',hair:'#624d36',style:'cap'},
  倉庫番:{coat:'#a4b576',hair:'#483f33',style:'bandana'},
  会計官:{coat:'#a1a8c4',hair:'#444451',style:'glasses'},
  保管庫の司書:{coat:'#b5a2c2',hair:'#b9aba0',style:'bob'},
  運用当番:{coat:'#a0b899',hair:'#504840',style:'short'},
  レガシア:{coat:'#889b85',hair:'#536760',style:'machine'},
};
export function drawPortrait(canvas,speaker,emotion='neutral'){
  if(!canvas)return;const c=canvas.getContext('2d');canvas.width=40;canvas.height=48;
  const r=(color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const aliases={司書:'保管庫の司書',術師:'アプリ社の術師',守衛:'基盤社の守衛',渡し守:'回線社の渡し守',老僧:'監査の老僧',宰相:'王都の宰相',見習い:'見習い検証士','アプリ社の騎士':'アプリ社の術師','回線社の騎士':'回線社の渡し守','基盤社の騎士':'基盤社の守衛'};
  const {coat,hair,style}=PORTRAITS[aliases[speaker]||speaker]||{coat:'#c4ad80',hair:'#65534b',style:'short'};
  if(style==='machine'){r('#152535',0,0,40,48);r(coat,5,4,30,40);r('#c5b681',7,6,26,3);r('#29404a',10,13,21,19);r('#94e4c2',13,17,5,6);r('#94e4c2',24,17,5,6);r('#bce8cf',17,27,8,2);r('#4d6764',10,35,21,6);return;}
  r('#152535',0,0,40,48);r(coat,4,32,32,16);r('#e4bb91',15,28,10,10);r(hair,8,4,25,28);r('#e4bb91',10,13,20,20);r(hair,9,8,23,8);r(hair,8,13,6,7);
  r('#3b3535',16,21,2,3);r('#3b3535',26,21,2,3);
  if(['happy','relieved','warm','smile'].includes(emotion)){r('#aa6756',19,28,6,1);r('#aa6756',20,29,4,1);}
  else if(['worried','sad','nervous','uneasy','tired'].includes(emotion)){r('#aa6756',20,28,5,1);r(hair,15,19,4,1);r(hair,25,18,4,1);}
  else if(emotion==='surprised'){r('#935b50',21,27,3,4);r(hair,15,17,4,1);r(hair,25,17,4,1);}
  else r('#ac7059',20,28,4,1);
  r('#efdfb7',17,37,7,2);
  if(style==='beard'){r(hair,10,27,6,7);r(hair,26,27,5,7);r(hair,15,32,12,4);}
  if(style==='long'){r(hair,6,15,4,24);r(hair,30,12,5,28);r('#cec4ec',6,25,4,3);}
  if(style==='bob'){r(hair,7,15,4,17);r(hair,30,15,4,17);r(coat,28,13,5,3);}
  if(style==='ponytail'){r(hair,31,10,6,23);r(coat,30,12,6,3);}
  if(style==='tuft'){r(hair,13,1,5,8);r(hair,18,3,5,7);}
  if(style==='glasses'){r('#d1be86',13,19,8,1);r('#d1be86',24,19,8,1);r('#d1be86',13,24,8,1);r('#d1be86',24,24,8,1);for(const x of [13,20,24,31])r('#d1be86',x,20,1,4);r('#d1be86',21,21,3,1);}
  if(style==='cap'){r(coat,7,6,27,9);r('#e2c58d',5,14,29,3);}
  if(style==='kerchief'){r('#e3ddbf',7,5,27,10);r('#e3ddbf',5,12,6,17);}
  if(style==='bandana'){r(coat,8,10,26,7);r('#d7d1a4',12,12,18,2);}
  if(style==='helmet'){r('#849aa0',7,4,28,11);r('#b9c9c1',10,5,21,3);r('#849aa0',7,15,4,16);r('#849aa0',31,15,4,16);r('#d8c68e',19,5,3,9);}
  if(style==='crown'){r('#e2c16b',7,9,28,6);for(const x of [8,19,30])r('#f4d486',x,4,4,7);r('#bc7269',19,10,4,3);}
  if(style==='bald'){r('#e4bb91',10,6,20,12);r(hair,7,17,4,13);r(hair,30,17,4,13);r(hair,13,30,17,9);}
  if(style==='mustache'){r(hair,16,26,13,2);r(hair,14,27,4,2);r(hair,27,27,4,2);}
  if(emotion==='embarrassed'){r('#cb8b79',11,25,4,2);r('#cb8b79',28,25,3,2);}
}
