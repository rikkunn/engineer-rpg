// Locally synthesized short arrangements of Beethoven themes; no recording samples.
// Score references and arrangement scope are documented in MUSIC.md.
const melody=(notes,step=1)=>notes.map(n=>[n,step]);
export const TRACKS={
  field:{title:'歓喜の歌',bpm:92,timbre:'piano',notes:[
    ...melody([64,64,65,67,67,65,64,62,60,60,62,64]),[64,1.5],[62,.5],[62,2],
    ...melody([64,64,65,67,67,65,64,62,60,60,62,64]),[62,1.5],[60,.5],[60,2],
    ...melody([62,62,64,60]),[62,1],[64,.5],[65,.5],[64,1],[60,1],[62,1],[64,.5],[65,.5],[64,1],[62,1],[60,1],[62,1],[55,2],
    ...melody([64,64,65,67,67,65,64,62,60,60,62,64]),[62,1.5],[60,.5],[60,2],
  ],bass:[48,55,48,55,48,55,48,48,55,48,55,55,48,55,48,48]},
  dungeon:{title:'月光・第1楽章のモチーフ',bpm:52,timbre:'piano',notes:[
    ...melody(Array.from({length:4},()=>[56,61,64]).flat(),1/3),
    ...melody(Array.from({length:4},()=>[56,61,64]).flat(),1/3),
    ...melody([57,61,64,57,61,64,57,62,66,57,62,66],1/3),
    ...melody([56,60,66,56,60,66,56,61,64,56,60,63],1/3),
  ],bass:[37,35,33,32]},
  battle:{title:'運命・第1楽章のモチーフ',bpm:132,timbre:'strings',notes:[
    [null,.5],[67,.5],[67,.5],[67,.5],[63,4],[null,1],
    [null,.5],[65,.5],[65,.5],[65,.5],[62,4],[null,1],
    ...melody([67,67,67,63,68,68,68,67,72,72,72,68,67,67,67,63],.5),
    ...melody([65,65,65,62,67,67,67,63],.5),[62,2],[60,2],[null,2],
  ],bass:[48,48,43,43,48,44,43,48]},
};
let context,master,timer,enabled=false,mode='field',index=0,beat=0,nextAt=0,voices=new Set();
function stopVoices(){for(const osc of voices){try{osc.stop();}catch{}}voices.clear();}
function note(midi,at,duration,volume,timbre){
  if(midi===null)return;
  const harmonics=timbre==='strings'?[[1,1],[2,.22],[3,.10]]:[[1,1],[2,.32],[3,.13],[4,.05]];
  for(const [multiple,strength] of harmonics){
    const osc=context.createOscillator(),gain=context.createGain();osc.type='sine';osc.frequency.value=440*2**((midi-69)/12)*multiple;
    gain.gain.setValueAtTime(.00001,at);gain.gain.linearRampToValueAtTime(volume*strength,at+(timbre==='strings'?.045:.012));
    gain.gain.exponentialRampToValueAtTime(Math.max(.00002,volume*strength*.28),at+Math.max(.09,duration*.6));
    gain.gain.exponentialRampToValueAtTime(.00001,at+duration+.14);
    osc.connect(gain).connect(master);osc.onended=()=>{voices.delete(osc);osc.disconnect();gain.disconnect();};voices.add(osc);osc.start(at);osc.stop(at+duration+.16);
  }
}
function tick(){
  if(!enabled||document.hidden||context.state!=='running')return;
  if(nextAt<context.currentTime-.2)nextAt=context.currentTime+.02;
  const track=TRACKS[mode],seconds=60/track.bpm;
  while(nextAt<context.currentTime+.15){
    const [pitch,length]=track.notes[index];
    note(pitch,nextAt,length*seconds*.88,.055,track.timbre);
    if(Math.abs(beat/4-Math.round(beat/4))<.001){const bass=track.bass[Math.round(beat/4)%track.bass.length];note(bass,nextAt,seconds*3.5,.045,'piano');note(bass+12,nextAt,seconds*2,.017,'strings');}
    nextAt+=length*seconds;beat+=length;index++;
    if(index===track.notes.length){index=0;beat=0;}
  }
}
export function setMusic(on,nextMode='field'){
  const selected=Object.hasOwn(TRACKS,nextMode)?nextMode:'field';
  if(!on){enabled=false;clearInterval(timer);timer=null;stopVoices();return;}
  try{
    context ||= new(window.AudioContext||window.webkitAudioContext)();
    if(!master){master=context.createGain();master.gain.value=.65;master.connect(context.destination);}
    if(!enabled||mode!==selected){stopVoices();mode=selected;index=0;beat=0;nextAt=context.currentTime+.04;}
    enabled=true;context.resume().then(tick).catch(()=>{});
    if(!timer)timer=setInterval(tick,60);
  }catch{enabled=false;}
}
document.addEventListener('visibilitychange',()=>{
  if(!context)return;
  if(document.hidden){stopVoices();context.suspend().catch(()=>{});}
  else if(enabled){nextAt=context.currentTime+.04;context.resume().then(tick).catch(()=>{});}
});
