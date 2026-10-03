// Original, locally synthesized chiptune score. Starts only after a user gesture.
const MELODIES = {
  field: [64,67,71,74,72,71,67,64,62,66,69,72,71,69,66,62,60,64,67,71,69,67,64,60,59,62,66,69,67,66,62,59],
  dungeon: [57,64,60,67,57,64,60,69,55,62,59,65,55,62,59,67,53,60,57,64,53,60,57,65,52,59,56,62,52,59,56,64],
  battle: [64,64,71,67,74,71,67,66,64,67,71,76,74,71,69,67,62,62,69,65,72,69,65,64,62,65,69,74,72,69,67,66],
};
let context,timer,beat=0,mode='field',enabled=false;
function note(midi,at,duration,volume,type='triangle'){
  const osc=context.createOscillator(),gain=context.createGain();osc.type=type;osc.frequency.value=440*2**((midi-69)/12);
  gain.gain.setValueAtTime(volume,at);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  osc.connect(gain).connect(context.destination);osc.start(at);osc.stop(at+duration+.01);
}
function tick(){
  if(!enabled||document.hidden)return;
  const melody=MELODIES[mode],at=context.currentTime;
  note(melody[beat%32],at,.34,.016);
  if(beat%4===0)note(melody[Math.floor(beat%32/8)*8]-24,at,.8,.025);
  beat++;
}
export function setMusic(on,nextMode='field'){
  mode=nextMode;enabled=on;
  clearInterval(timer);
  if(!on)return;
  try{context ||= new(window.AudioContext||window.webkitAudioContext)();context.resume();timer=setInterval(tick,mode==='battle'?180:270);}catch{enabled=false;}
}
document.addEventListener('visibilitychange',()=>{if(context){if(document.hidden)context.suspend();else if(enabled)context.resume();}});
