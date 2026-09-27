(function(){
const $ = s=>document.querySelector(s);
const game=$('#game'), scene=$('#scene'), art=$('#art'), hotspotsEl=$('#hotspots'),
      sayEl=$('#say'), choicesEl=$('#choices'), invEl=$('#inv'), battEl=$('#battpct'),
      locEl=$('#clock'), tcEl=$('#tc');

// mouse-follow flashlight (touch fallback centers it)
game.addEventListener('pointermove', e=>{
  const r=game.getBoundingClientRect();
  scene.style.setProperty('--mx',(e.clientX-r.left)+'px');
  scene.style.setProperty('--my',(e.clientY-r.top)+'px');
});
game.addEventListener('touchmove', e=>{
  const t=e.touches[0]; if(!t)return;
  const r=game.getBoundingClientRect();
  scene.style.setProperty('--mx',(t.clientX-r.left)+'px');
  scene.style.setProperty('--my',(t.clientY-r.top)+'px');
},{passive:true});

// battery + timecode drain
let battery=62, seconds=14;
setInterval(()=>{
  seconds++; if(battery>3) battery -= (Math.random()<0.4?1:0);
  battEl.textContent=battery+'%';
  const h=String(Math.floor(seconds/3600)).padStart(2,'0'),
        m=String(Math.floor(seconds/60)%60).padStart(2,'0'),
        s=String(seconds%60).padStart(2,'0');
  tcEl.textContent=`${h}:${m}:${s}`;
  if(battery<=15) scene.style.filter='brightness(0.7) contrast(1.15)';
},1000);

// simple audio stinger, no assets
let actx;
function stinger(low){
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    const o=actx.createOscillator(), g=actx.createGain();
    o.type='sawtooth'; o.frequency.setValueAtTime(low?70:180,actx.currentTime);
    o.frequency.exponentialRampToValueAtTime(low?40:40, actx.currentTime+0.8);
    g.gain.setValueAtTime(0.22,actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime+0.9);
    o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime+0.9);
  }catch(e){}
}

const inventory=new Set();
function addItem(name){ inventory.add(name); renderInv(); }
function hasItem(name){ return inventory.has(name); }
function renderInv(){
  invEl.innerHTML='';
  [...inventory].forEach(i=>{ const d=document.createElement('div'); d.className='item'; d.textContent=i; invEl.appendChild(d); });
}

function jumpscare(cb){
  stinger(false);
  const js=$('#jumpscare'); js.style.display='flex'; game.classList.add('shake');
  setTimeout(()=>{ js.style.display='none'; game.classList.remove('shake'); if(cb)cb(); }, 260);
}

// ---- Chase / hide sequence ----
let chaseTimeoutId=null, chaseCorrect=null;
function clearChaseTimer(){ if(chaseTimeoutId){clearTimeout(chaseTimeoutId); chaseTimeoutId=null;} const b=document.getElementById('chaseTimer'); if(b)b.remove(); }
function startTimer(seconds,onExpire){
  clearChaseTimer();
  const bar=document.createElement('div'); bar.id='chaseTimer';
  bar.style.transition=`width ${seconds}s linear`; bar.style.width='100%';
  choicesEl.appendChild(bar);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ bar.style.width='0%'; }));
  chaseTimeoutId=setTimeout(onExpire, seconds*1000);
}
function startChase(){
  hotspotsEl.innerHTML='';
  scene.classList.add('tension');
  const spots=['closet','bed','wardrobe'];
  chaseCorrect = spots[Math.floor(Math.random()*spots.length)];
  say(`He starts walking toward you, unhurried, certain, like he already knows how this ends. There isn't time to think, only to move.`, {
    choices:[
      {label:'Hide in the closet', action:()=>resolveChase('closet')},
      {label:'Hide under the bed', action:()=>resolveChase('bed')},
      {label:'Hide in the wardrobe', action:()=>resolveChase('wardrobe')}
    ]
  });
  startTimer(3.5, ()=>resolveChase('timeout'));
}
function resolveChase(pick){
  clearChaseTimer();
  if(pick===chaseCorrect){
    scene.classList.remove('tension');
    stinger(true);
    say(`You fold yourself into the dark and go still. His footsteps stop inches away. A long, long pause. Then he moves on, unhurried, toward the stairs — hunting somewhere else in the house. You breathe again.`, {
      onDone:()=>setTimeout(()=>goto('attic'), 1400)
    });
  } else {
    caughtScreen();
  }
}
function caughtScreen(){
  jumpscare(()=>{
    const o=$('#caught');
    o.style.display='flex';
    o.innerHTML=`<h1>HE FOUND YOU</h1><p>${pickText()}</p><button class="btn" id="retryChase">▶ TRY AGAIN</button>`;
    o.querySelector('#retryChase').onclick=()=>{ o.style.display='none'; o.innerHTML=''; startChase(); };
  });
}
function pickText(){
  const lines=[`His hand closes around your ankle before you've even stopped moving. The recording, whatever it is now, keeps rolling.`,
    `Six seconds isn't long enough, not in a house this quiet. He was already closer than you thought.`,
    `The wardrobe door creaks the second you pull it shut. He heard it before you did.`];
  return lines[Math.floor(Math.random()*lines.length)];
}

// procedural "scene photography" — layered CSS gradients standing in for a photo
const backdrops = {
  porch: `radial-gradient(1200px 700px at 50% 120%, #1a1610 0%, #0a0908 60%), linear-gradient(180deg,#141210 0%,#0a0908 55%),
          repeating-linear-gradient(90deg, rgba(60,50,40,.25) 0 2px, transparent 2px 40px)`,
  living: `linear-gradient(180deg,#12100d 0%,#0a0908 70%),
          radial-gradient(600px 300px at 30% 30%, rgba(61,74,58,.15), transparent 60%)`,
  kitchen: `linear-gradient(200deg,#100e0b 0%,#0a0908 65%),
          repeating-linear-gradient(0deg, rgba(90,75,58,.08) 0 3px, transparent 3px 60px)`,
  basement_stairs: `linear-gradient(180deg,#08070600 0%, #05040300 100%), radial-gradient(400px 900px at 50% 0%, #16110c 0%, #030202 80%)`,
  basement: `radial-gradient(700px 500px at 50% 60%, #0e0808 0%, #020101 70%),
          radial-gradient(200px 200px at 60% 40%, rgba(122,43,31,.18), transparent 70%)`,
  attic: `linear-gradient(160deg,#14120d 0%,#070605 80%), radial-gradient(500px 300px at 70% 20%, rgba(217,165,102,.05), transparent 60%)`,
  hall: `linear-gradient(90deg,#0a0908 0%,#100d0a 50%,#0a0908 100%), radial-gradient(250px 900px at 85% 50%, rgba(60,10,10,.15), transparent 70%)`,
  yard: `linear-gradient(180deg,#0d1210 0%,#050705 75%), radial-gradient(900px 500px at 50% 100%, rgba(61,74,58,.12), transparent 70%)`
};

// ---- Story graph ----
const scenesData = {
  porch: {
    loc:'PORCH — ASHGROVE FARMHOUSE', bg:'porch',
    text:`The porch boards sag under your weight, soft with rot. Elias's tripod is still here, knocked over, lens cracked. Duct-taped to the railing: a note in his handwriting. "Don't let them see the light move twice."`,
    hotspots:[
      {x:'40%',y:'55%',w:'20%',h:'20%',label:'Note', once:'note_porch', action:()=>{ say(`The note is smudged, water-warped. Beneath it, scratched into the wood with a key: SHE COUNTS THE STEPS.`); }},
      {x:'70%',y:'30%',w:'25%',h:'40%',label:'Front Door', action:()=>goto('living')}
    ]
  },
  living:{
    loc:'LIVING ROOM', bg:'living',
    text:`Dust sheets over furniture, shaped almost like people if you don't look straight at them. A grandfather clock, stopped at 3:17. Elias's stream chat is burned into your memory — someone typed "she's behind him" 4 minutes before the feed cut.`,
    hotspots:[
      {x:'10%',y:'40%',w:'22%',h:'40%',label:'Clock', once:'clock', action:()=>{ say(`3:17. Always 3:17, in every account of this house going back to 1962. Something bad happens at 3:17. You check your own watch. It's 3:14.`); }},
      {x:'55%',y:'55%',w:'20%',h:'20%',label:'Dust Sheet', once:'sheet', action:()=>{ jumpscare(()=>say(`Just a chair. Your heart doesn't believe you yet.`)); }},
      {x:'40%',y:'62%',w:'12%',h:'22%',label:'Fireplace Poker', once:'poker', action:()=>{ addItem('Fire Poker'); say(`Cast iron, heavier than it looks. You take it. If it comes to it, you'd rather have something in your hands than nothing.`); }},
      {x:'80%',y:'25%',w:'18%',h:'45%',label:'Kitchen Doorway', action:()=>goto('kitchen')},
      {x:'2%',y:'10%',w:'12%',h:'25%',label:'Back to Porch', action:()=>goto('porch')}
    ]
  },
  kitchen:{
    loc:'KITCHEN', bg:'kitchen',
    text:`The fridge hums though there's no power out here. Inside a drawer: a battery pack, still sealed. On the counter, a Polaroid — Elias, grinning, and behind him in the doorway, a shape too tall to be a person standing straight.`,
    hotspots:[
      {x:'15%',y:'45%',w:'20%',h:'25%',label:'Drawer', once:'battery', action:()=>{ addItem('Batteries'); battery=Math.min(100,battery+30); say(`Batteries. Your flashlight will last a little longer now. Small mercy.`); }},
      {x:'50%',y:'50%',w:'18%',h:'18%',label:'Polaroid', once:'polaroid', action:()=>{ addItem('Polaroid'); say(`You pocket it. You wish you hadn't looked closely.`); }},
      {x:'75%',y:'20%',w:'22%',h:'50%',label:'Cellar Door', action:()=>{ if(hasItem('Batteries')) goto('basement_stairs'); else say(`The cellar door is warped shut. You'll need both hands free and a working light to force it — find fresh batteries first.`); }},
      {x:'2%',y:'10%',w:'12%',h:'25%',label:'Back', action:()=>goto('living')}
    ]
  },
  basement_stairs:{
    loc:'CELLAR STAIRS', bg:'basement_stairs',
    text:`The door gives with a shriek of old hinges. Stairs descend further than the house should allow. Something down there is breathing in a rhythm that isn't yours.`,
    hotspots:[
      {x:'35%',y:'20%',w:'30%',h:'70%',label:'Descend', action:()=>goto('basement')},
      {x:'2%',y:'10%',w:'12%',h:'25%',label:'Back Up', action:()=>goto('kitchen')}
    ]
  },
  basement:{
    loc:'CELLAR', bg:'basement',
    text:`Elias's camera bag, abandoned mid-frame. And carved into every wall, floor to ceiling, the same three words over and over: SHE COUNTS THE STEPS. On the floor, chalk marks a circle. In the circle: his phone, still recording, battery at 1%.`,
    hotspots:[
      {x:'40%',y:'55%',w:'20%',h:'20%',label:'Phone', once:'phone', action:()=>{ jumpscare(()=>{ addItem('Elias\'s Phone'); say(`The last frame on his phone isn't a shadow, isn't a shape. It's a man. Mid-fifties, work boots, holding the camera steady like he's done this before. A name tag on his coveralls: HOLT — CARETAKER.`); }); }},
      {x:'15%',y:'20%',w:'20%',h:'25%',label:'Ledger', once:'ledger', action:()=>{ say(`A logbook, decades of entries in the same cramped hand. Names. Dates. Route 9 plate numbers. Elias's name is the newest one, added last week — in ink that's still faintly wet.`); }},
      {x:'2%',y:'10%',w:'12%',h:'25%',label:'Back Up', action:()=>goto('basement_stairs')},
      {x:'70%',y:'15%',w:'22%',h:'55%',label:'Narrow Passage', action:()=>{ if(hasItem('Elias\'s Phone')) goto('upstairs_hall'); else say(`A gap in the wall, just wide enough. You don't want to go in without knowing what you're looking for. Check the phone first.`); }}
    ]
  },
  upstairs_hall:{
    loc:'UPSTAIRS HALLWAY', bg:'hall',
    text:`You come up through the wall cavity into a hallway lined with closed doors. At the far end, backlit by a bare bulb, a man is standing completely still, facing away from you. Work boots. Coveralls. He hasn't moved in the ten seconds you've been staring. Then, without turning around, he says: "I heard the wall, Elias's brother. You should've stayed on the porch."`,
    hotspots:[
      {x:'35%',y:'25%',w:'30%',h:'65%',label:'Bedroom Door', action:()=>startChase()}
    ]
  },
  attic:{
    loc:'ATTIC', bg:'attic',
    text:`You climb, and the stairs behind you don't feel like they're where you left them. The attic is lined with photographs — every missing person from Route 9 since 1962, including, near the top, one of you, taken tonight, taken from behind. Elias is tied to a support beam, awake, terrified. Holt is between you and him, and he's already turning around.`,
    hotspots:[
      {x:'40%',y:'35%',w:'25%',h:'45%',label:'Elias', action:()=>ending()}
    ]
  },
  yard:{
    loc:'YARD — ROUTE 9', bg:'yard',
    text:`Gravel under your feet, cold air, the farmhouse behind you finally just a house again. Your car is thirty feet away, keys still in your pocket. You don't look back to see if the porch light is on.`,
    hotspots:[
      {x:'55%',y:'55%',w:'25%',h:'25%',label:'Your Car', action:()=>finalScreen('YOU RAN', `You made the stairs, the hallway, the wall, the porch, the yard. You did not make yourself go back for him. Route 9 gets a new name added to a ledger you'll never see, in your own hand this time — the one that writes his story instead of finishing yours.`)}
    ]
  }
};

function say(text, {choices,onDone}={}){
  sayEl.textContent='';
  choicesEl.innerHTML='';
  let i=0;
  const tick=()=>{ sayEl.textContent += text[i++]; if(i<text.length) requestAnimationFrame(()=>setTimeout(tick,14)); else { if(choices) renderChoices(choices); if(onDone) onDone(); } };
  tick();
}
function renderChoices(list){
  choicesEl.innerHTML='';
  list.forEach(c=>{ const b=document.createElement('button'); b.className='choice'; b.textContent=c.label;
    b.onclick=c.action; choicesEl.appendChild(b); });
}

const seen=new Set();
function goto(key){
  const s=scenesData[key];
  art.style.background=backdrops[s.bg];
  art.style.backgroundSize='cover';
  locEl.textContent=s.loc;
  say(s.text);
  buildHotspots(s.hotspots, key);
}
function buildHotspots(list,sceneKey){
  hotspotsEl.innerHTML='';
  list.forEach(h=>{
    const key=sceneKey+'_'+(h.once||h.label);
    if(h.once && seen.has(key)) return;
    const el=document.createElement('div'); el.className='hotspot';
    el.style.left=h.x; el.style.top=h.y; el.style.width=h.w; el.style.height=h.h;
    const lab=document.createElement('div'); lab.className='hs-label'; lab.textContent=h.label; el.appendChild(lab);
    el.onclick=()=>{ if(h.once) seen.add(key); h.action(); };
    hotspotsEl.appendChild(el);
  });
}

function ending(){
  jumpscare(()=>{
    hotspotsEl.innerHTML='';
    const opts=[
      {label:'Run for the stairs', action:()=>goto('yard')},
      {label:'Reach for Elias', action:()=>finalScreen('YOU STAYED', `You grab his hand. Holt is already closing the distance. For one second you are both just brothers again, and then the light goes out, and the recording — the one you're in now — finally, mercifully, ends.`)}
    ];
    if(hasItem('Fire Poker')) opts.push({label:'Swing the poker at Holt', action:()=>finalScreen('YOU FOUGHT', `The poker connects harder than you meant it to. Holt goes down and doesn't get up right away. You cut Elias loose with hands that won't stop shaking, and together you run for the yard, for the car, for anywhere that isn't Route 9. Some stories end because someone decided they would.`)});
    say(`Holt turns to face you fully now, and up close he looks less like a monster and more like a man who's simply done this so many times it no longer costs him anything. Elias mouths one word: "Run."`, {choices:opts});
  });
}
function finalScreen(tag, text){
  scene.classList.remove('tension');
  const o=document.createElement('div'); o.className='overlay';
  o.innerHTML=`<h1>${tag}</h1><p>${text}</p><button class="btn" id="again">▶ WATCH AGAIN</button>`;
  game.appendChild(o);
  o.querySelector('#again').onclick=()=>location.reload();
}

$('#startBtn').onclick=()=>{
  $('#titleScreen').remove();
  goto('porch');
};
})();