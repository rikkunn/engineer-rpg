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
export function drawPortrait(canvas,speaker,emotion='neutral'){
  if(!canvas)return;const c=canvas.getContext('2d');canvas.width=40;canvas.height=48;
  const r=(color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const palettes={ユウ:['#d5b15d','#5b413a'],リナ:['#9b91cf','#493d59'],テオ:['#85bba6','#756048'],ガン:['#7bafc8','#9b9b94'],サラ:['#db9985','#79523e'],ノノ:['#b19abd','#544836']};
  const [coat,hair]=palettes[speaker]||['#c4ad80','#65534b'];
  r('#152535',0,0,40,48);r(coat,4,32,32,16);r('#e4bb91',15,28,10,10);r(hair,8,4,25,28);r('#e4bb91',10,13,20,20);r(hair,9,8,23,8);r(hair,8,13,6,7);
  r('#3b3535',16,21,2,3);r('#3b3535',26,21,2,3);
  if(['happy','relieved','warm','smile'].includes(emotion)){r('#aa6756',19,28,6,1);r('#aa6756',20,29,4,1);}
  else if(['worried','sad','nervous'].includes(emotion)){r('#aa6756',20,28,5,1);r(hair,15,19,4,1);r(hair,25,18,4,1);}
  else r('#ac7059',20,28,4,1);
  r('#efdfb7',17,37,7,2);if(speaker==='ガン'){r('#b3b4a5',11,28,6,4);r('#b3b4a5',26,28,4,4);}
}
