// Policy-Maker: an office *interface* for the existing pure simulation engine.
// The gameplay rules are imported unchanged from the user's project.
import { METERS, CONTENT_VERSION, RULES_VERSION } from './content.js';
import {
  createInitialState, getEvent, getPolicies, policyDetails,
  selectResponse, beginPolicyPhase, selectPolicy, calculateTurn,
  resolveTurn, advanceTurn, forecastBudget
} from './engine.js';

const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => (n > 0 ? '+' : '') + n;
const SAVE_KEY = 'policy-maker-office-prototype-v1';
const dialog = $('#office-dialog');
const content = $('#modal-content');
let state = null;
let office = null;

// We intentionally do NOT use the original game's save key. The prototype
// therefore cannot overwrite saves made by the existing menu-based game.
try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (saved?.rulesVersion === RULES_VERSION && saved?.contentVersion === CONTENT_VERSION &&
      ['quick', 'term'].includes(saved.mode) && ['event','policy','report','result'].includes(saved.phase) &&
      saved.meters && Array.isArray(saved.history)) state = saved;
} catch { /* Browser storage may be unavailable. Gameplay still works. */ }
function save() {
  try { if (state) localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  catch { setHint('Office save unavailable in this browser; the game can still be played.'); }
}
function seed() {
  const numbers = new Uint32Array(1);
  crypto.getRandomValues(numbers);
  return numbers[0].toString(16).padStart(8,'0');
}
function setHint(message) { $('#hint').textContent = message; }
function refreshHUD() {
  $('#turn').textContent = !state ? 'NEW PRESIDENT' : state.mode === 'quick' ? `QUICK PLAY · DAY ${state.turn*30}` : `FIRST TERM · TURN ${state.turn}/12`;
  $('#phase').textContent = !state ? 'Start at the briefing desk' : ({event:'Awaiting crisis response',policy:'Choose your policy',report:'Turn report ready',result:'Term complete'})[state.phase];
  $('#meterline').textContent = !state ? 'Six national meters · Every choice has consequences' : `Approval ${state.meters.approval} · Treasury ${state.meters.treasury} · Debt ${state.debt}`;
  if (office) office.refreshStationColors();
}
function show(title, body) {
  $('#modal-title').textContent = title;
  content.innerHTML = body;
  if (!dialog.open) dialog.showModal();
}
function close() { if (dialog.open) dialog.close(); office?.input.keyboard.resetKeys(); }
$('#close-dialog').addEventListener('click', close);
dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
function chips(effects) {
  const list = Object.entries(effects || {}).filter(([,n]) => n).map(([id,n]) => {
    const meter = METERS.find(m => m.id === id);
    return `${escapeHTML(meter?.short || id)} ${fmt(n)}`;
  });
  return list.length ? list.join(' · ') : 'No immediate meter effect';
}
function stationState() {
  if (!state) return 'Start a term at the briefing desk.';
  if (state.phase === 'event') return 'Read your briefing at the document desk.';
  if (state.phase === 'policy') return 'Choose a policy at the cabinet.';
  if (state.phase === 'report') return 'Review the turn report, then approach the office door.';
  return 'Review your final result, or start a new term.';
}
function chooseMode() {
  show('Choose your briefing', `<p class="lead">The Republic of Arden needs a new government. Start with a short crisis or commit to a full first term.</p>
    <div class="choice-grid">
      <button class="choice" data-command="start" data-mode="term"><strong>Your First Term</strong><small>12 turns, a four-card policy hand, long-term conditions, elections and saved progress.</small></button>
      <button class="choice" data-command="start" data-mode="quick"><strong>The First 90 Days</strong><small>Three turns, all six introductory policies, and a fixed set of crises.</small></button>
    </div>${state ? '<p class="warning">Starting another game replaces only this office prototype’s saved run.</p>' : ''}`);
}
function briefing() {
  if (!state || state.phase === 'result') return chooseMode();
  if (state.phase !== 'event') return show('No new briefing', `<p class="lead">${stationState()}</p>`);
  const event = getEvent(state);
  show(event.title, `<p class="lead">${escapeHTML(event.description)}</p><p class="muted">${escapeHTML(event.category)} · Choose the government's response:</p>
    <div class="choice-grid">${event.responses.map(r => `<button class="choice" data-command="response" data-id="${escapeHTML(r.id)}"><strong>${escapeHTML(r.title)}</strong><small>${escapeHTML(r.description)}</small><span class="effects">${chips(r.effects)}</span></button>`).join('')}</div>
    <p class="help">Once chosen, walk to the Policy Cabinet to select a policy. The original game's turn rules remain unchanged.</p>`);
}
function policies() {
  if (!state) return show('Policy cabinet', '<p class="lead">Begin your term at the briefing desk first.</p>');
  if (state.phase !== 'policy') return show('Policy cabinet', `<p class="lead">${stationState()}</p>`);
  const choices = getPolicies(state).filter(p => state.mode === 'quick' || state.hand.includes(p.id)).map(p => policyDetails(state,p));
  show('Choose a policy', `<p class="lead">You responded to the crisis. Enact one available policy to complete the turn.</p>
    <div class="choice-grid">${choices.map(p => `<button class="choice" data-command="policy" data-id="${escapeHTML(p.id)}" ${p.disabledReason?'disabled':''}>
      <strong>${escapeHTML(p.title)}</strong><small>${escapeHTML(p.description)}</small><span class="effects">${chips(p.effects)}${p.debtChange ? ' · Debt '+fmt(p.debtChange) : ''}</span>
      <small>${escapeHTML(p.disabledReason || p.consequence)}</small></button>`).join('')}</div>`);
}
function previewPolicy(id) {
  state = selectPolicy(state,id);
  save(); refreshHUD();
  const report = calculateTurn(state);
  const table = METERS.map(m => `<tr><td>${escapeHTML(m.label)}</td><td>${report.startMeters[m.id]} → <strong>${report.meters[m.id]}</strong></td><td class="${report.meters[m.id] < report.startMeters[m.id] ? 'flag':'success'}">${fmt(report.meters[m.id]-report.startMeters[m.id])}</td></tr>`).join('');
  show('Projected outcome', `<p class="lead"><strong>${escapeHTML(report.policyTitle)}</strong> combined with your crisis response.</p>
    <table class="stat-table"><thead><tr><th>National meter</th><th>Before → After</th><th>Change</th></tr></thead><tbody>${table}</tbody></table>
    <p class="muted">Treasury includes the current budget and any scheduled payments. Debt after resolution: ${report.debt}.</p>
    ${report.failures.length?'<p class="warning">Warning: this combination collapses your government.</p>':''}
    <div class="barrow"><button class="action" data-command="resolve">Enact policy and resolve turn</button><button class="action secondary" data-command="policies">Choose another policy</button></div>`);
}
function reports() {
  if (!state) return show('Reports', '<p class="lead">No government report yet. Start a term at the briefing desk.</p>');
  if (state.phase === 'result') return show('End of term', `<p class="lead">${state.outcome === 'reelected' ? 'You won re-election.' : state.outcome === 'election-lost' ? 'You lost the election.' : state.outcome === 'collapsed' ? 'Your government collapsed.' : 'You survived the opening crisis.'}</p>
    <p>Approval ${state.meters.approval} · Treasury ${state.meters.treasury} · Debt ${state.debt}</p><p class="muted">${state.history.length} turn reports on record. Return to the briefing desk to start a new run.</p>`);
  if (!state.history.length) return show('Reports', '<p class="lead">No turn has been resolved yet. Your reports will appear here.</p>');
  const report = state.history.at(-1);
  show('Turn '+report.turn+' — Report', `<p class="lead">${escapeHTML(report.eventTitle)} · ${escapeHTML(report.responseTitle)} + ${escapeHTML(report.policyTitle)}</p>
  <table class="stat-table"><thead><tr><th>Meter</th><th>Change</th></tr></thead><tbody>${METERS.map(m => `<tr><td>${escapeHTML(m.label)}</td><td>${report.startMeters[m.id]} → ${report.meters[m.id]}</td></tr>`).join('')}</tbody></table>
  <p>Budget ${fmt(report.budget.total)} · Debt ${report.startDebt} → ${report.debt}</p><p class="help">${state.phase === 'report' ? 'Go to the top office door and press E to advance the next turn.' : 'This is the most recent resolved turn.'}</p>`);
}
function ledger() {
  if (!state) return show('Treasury ledger', '<p class="lead">The ledger opens after you begin a term.</p>');
  const preview = forecastBudget(state);
  show('Treasury ledger', `<p class="lead">National finances and upcoming commitments.</p>
    <div class="tags">${METERS.map(m => `<span class="tag">${escapeHTML(m.short)}: <strong>${state.meters[m.id]}</strong></span>`).join('')}</div>
    <table class="stat-table"><tbody><tr><td>Outstanding debt</td><td>${state.debt}</td></tr><tr><td>Estimated next budget change</td><td>${fmt(preview.budget.total)}</td></tr><tr><td>Expected debt interest</td><td>${preview.budget.interest}</td></tr><tr><td>Known scheduled obligations</td><td>${state.scheduledEffects.length}</td></tr><tr><td>Active or upcoming nation conditions</td><td>${state.nationConditions.length}</td></tr></tbody></table>
    <p class="muted">The forecast does not include choices you have not made. See your policy preview for the complete current-turn result.</p>`);
}
function door() {
  if (!state) return show('Office doorway', '<p class="lead">Begin your term at the briefing desk.</p>');
  if (state.phase === 'result') return reports();
  if (state.phase !== 'report') return show('The next turn', `<p class="lead">${stationState()}</p>`);
  show('Advance the term?', `<p class="lead">You have completed turn ${state.turn}. Your previous choices and their future consequences will carry into the next turn.</p>
    <div class="barrow"><button class="action" data-command="next">Proceed to next turn</button><button class="action secondary" data-command="reports">Read the report first</button></div>`);
}
function aide() {
  show('Chief of Staff', `<p class="lead">${stationState()}</p><div class="help"><strong>How the office works</strong>
  Walk with WASD or arrows. Press E when near furniture. Crisis decisions happen at the briefing desk; policies at the cabinet; reports at the board; the door advances time.</div>`);
}
const actions = { briefing, policies, reports, ledger, door, aide, executive: () => {
  if (!state || state.phase === 'event' || state.phase === 'result') briefing();
  else if (state.phase === 'policy') policies(); else reports();
} };
function interact(id) { (actions[id] || aide)(); }

// DOM buttons affect simulation state; Phaser only manages exploration and proximity.
content.addEventListener('click', e => {
  const button = e.target.closest('button[data-command]');
  if (!button || button.disabled) return;
  const {command,id,mode} = button.dataset;
  try {
    if (command === 'start') { state = createInitialState({mode,seed:seed()}); close(); }
    else if (command === 'response') { state = beginPolicyPhase(selectResponse(state,id)); close(); }
    else if (command === 'policy') { previewPolicy(id); return; }
    else if (command === 'resolve') { state = resolveTurn(state); close(); }
    else if (command === 'next') { state = advanceTurn(state); close(); }
    else if (command === 'policies') { policies(); return; }
    else if (command === 'reports') { reports(); return; }
    save(); refreshHUD();
    setHint(stationState());
  } catch (err) { console.error(err); setHint('Action failed: '+err.message); }
});

const W=960, H=600;
const COLORS={wall:0x263d31, trim:0xc8ab70, wood:0x634a35, woodLight:0x966d4b, carpet:0x3d6956, metal:0x596b62, cream:0xf0dfb8};
// Stand near these points, not on top of the furniture itself.
const STATIONS=[
  {id:'briefing',name:'Briefing Desk',x:188,y:346,px:190,py:414,w:188,h:72},
  {id:'policies',name:'Policy Cabinet',x:774,y:196,px:777,py:284,w:179,h:85},
  {id:'ledger',name:'Treasury Ledger',x:113,y:463,px:218,py:510,w:139,h:78},
  {id:'reports',name:'Reports Board',x:769,y:397,px:774,py:492,w:178,h:90},
  {id:'door',name:'Next Turn Door',x:480,y:80,px:480,py:207,w:110,h:75},
  {id:'executive',name:'Executive Desk',x:480,y:293,px:480,py:398,w:177,h:91},
  {id:'aide',name:'Chief of Staff',x:594,y:455,px:594,py:502,w:35,h:47},
];

class OfficeScene extends Phaser.Scene {
  constructor(){super('OfficeScene');this.nearby=null;}
  create(){
    office=this;
    this.drawOffice();
    this.createCharacterTextures();
    this.player=this.physics.add.sprite(480,520,'president');
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(18,16);
    this.player.body.setOffset(7,26);
    this.physics.world.setBounds(15,110,930,480);
    this.cursors=this.input.keyboard.createCursorKeys();
    this.wasd=this.input.keyboard.addKeys('W,A,S,D');
    this.keyE=this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.input.keyboard.addCapture([Phaser.Input.Keyboard.KeyCodes.UP,Phaser.Input.Keyboard.KeyCodes.DOWN,Phaser.Input.Keyboard.KeyCodes.LEFT,Phaser.Input.Keyboard.KeyCodes.RIGHT,Phaser.Input.Keyboard.KeyCodes.SPACE]);
    for(const station of STATIONS.filter(s=>!['door','aide'].includes(s.id))){
      const solid=this.add.zone(station.x,station.y,station.w,station.h);
      this.physics.add.existing(solid,true);
      this.physics.add.collider(this.player, solid);
    }
    this.labels=[];
    for(const station of STATIONS){
      const glow=this.add.circle(station.px,station.py,13,0xe7ce86,.12).setStrokeStyle(2,0xf1d590,.5).setDepth(3);
      const label=this.add.text(station.px,station.py-29,station.name,{fontFamily:'monospace',fontSize:'12px',color:'#f6e0ab',backgroundColor:'#17271ddc',padding:{x:5,y:3}}).setOrigin(.5).setDepth(12);
      this.labels.push({station,glow,label});
      const hit=this.add.zone(station.x,station.y,station.w,station.h).setInteractive({useHandCursor:true});
      hit.on('pointerdown',()=>{
        if(dialog.open)return;
        const d=Phaser.Math.Distance.Between(this.player.x,this.player.y,station.px,station.py);
        if(d<100) interact(station.id); else setHint(`Walk closer to the ${station.name}, then press E.`);
      });
    }
    $('#interact-button').addEventListener('click',()=>{if(this.nearby&&!dialog.open)interact(this.nearby.id);});
    refreshHUD();
  }
  refreshStationColors(){
    for(const {station,glow} of this.labels||[]){
      const active=station.id === 'briefing' && (!state || state.phase==='event') ||
        station.id === 'policies' && state?.phase==='policy' ||
        station.id === 'reports' && ['report','result'].includes(state?.phase) ||
        station.id === 'door' && state?.phase === 'report';
      glow.setFillStyle(active?0x6bcb95:0xe7ce86,active?.36:.12);
      glow.setStrokeStyle(2,active?0xb3ffc8:0xf1d590,active?1:.5);
    }
  }
  update(){
    if(dialog.open){this.player.setVelocity(0);return;}
    const dx=(this.cursors.right.isDown||this.wasd.D.isDown?1:0)-(this.cursors.left.isDown||this.wasd.A.isDown?1:0);
    const dy=(this.cursors.down.isDown||this.wasd.S.isDown?1:0)-(this.cursors.up.isDown||this.wasd.W.isDown?1:0);
    const v=new Phaser.Math.Vector2(dx,dy).normalize().scale(170);
    this.player.setVelocity(v.x,v.y);
    const desiredTexture = dx || dy ? 'president-walk' : 'president';
    if (this.player.texture.key !== desiredTexture) this.player.setTexture(desiredTexture);
    if(dx)this.player.setFlipX(dx<0);
    const near=STATIONS.map(s=>({...s,d:Phaser.Math.Distance.Between(this.player.x,this.player.y,s.px,s.py)})).sort((a,b)=>a.d-b.d)[0];
    const current=near && near.d<96 ? near : null;
    if(this.nearby?.id!==current?.id){
      this.nearby=current;
      $('#interact-button').disabled=!current;
      $('#interact-button').textContent=current?'E · '+current.name:'Interact (E)';
      setHint(current?`Press E to use ${current.name}.`:'WASD / arrows to move · Approach a station and press E');
    }
    if(Phaser.Input.Keyboard.JustDown(this.keyE)&&this.nearby){interact(this.nearby.id);}
  }
  drawOffice(){
    const g=this.add.graphics();
    // Floor: parquet tiles, a tiled rug, perimeter skirting and top wall.
    g.fillStyle(0x816850).fillRect(0,0,W,H);
    for(let y=110;y<H;y+=30){for(let x=0;x<W;x+=60){g.fillStyle((x/60+y/30)%2===0?0x876b52:0x8c7357).fillRect(x,y,59,29);g.lineStyle(1,0x6e5540,.6).strokeRect(x,y,59,29);}}
    g.fillStyle(0x253e33).fillRect(0,0,W,125);
    g.fillStyle(0x1b3029).fillRect(0,0,W,19);
    g.fillStyle(0xc8ab70).fillRect(0,120,W,6);
    g.fillStyle(0x172b23).fillRect(0,105,W,15);
    // Decorative window and hallway door.
    g.fillStyle(0xb79c63).fillRect(48,31,178,77);
    g.fillStyle(0x87b8ac).fillRect(57,39,160,59);
    g.fillStyle(0x3e7773).fillRect(58,61,158,4);
    g.fillStyle(0xb79c63).fillRect(134,39,7,59);
    g.fillStyle(0xe5cca0).fillRect(48,29,178,5);
    g.fillStyle(0xc8ab70).fillRect(413,14,134,100);
    g.fillStyle(0x172b26).fillRect(421,20,118,93);
    g.fillStyle(0x4c6757).fillRect(434,25,92,84);
    g.fillStyle(0xc8ab70).fillRect(478,25,5,84);
    g.fillStyle(0xe9d18a).fillCircle(490,74,5);
    // Carpeting in center, decorative inner border.
    g.fillStyle(0xbda268).fillRoundedRect(314,204,328,331,14);
    g.fillStyle(0x3b6452).fillRoundedRect(321,211,314,317,10);
    g.lineStyle(3,0x92a27a).strokeRoundedRect(336,224,284,290,8);
    g.lineStyle(1,0x89a083,.7).strokeRoundedRect(350,239,256,262,4);
    // Two potted plants.
    for(const x of [275,682]){g.fillStyle(0x4c3425).fillRect(x-20,139,40,32);g.fillStyle(0xc9a56b).fillRect(x-23,137,46,6);g.fillStyle(0x305d3e).fillCircle(x,130,24);g.fillStyle(0x6c8f5a).fillCircle(x-12,119,11);g.fillStyle(0x45734b).fillCircle(x+13,117,13);}
    // Briefing desk, papers and pen.
    this.furniture(g,92,303,190,74);
    g.fillStyle(0xe2d3b4).fillRect(130,320,52,26);
    g.fillStyle(0xc5b991).fillRect(192,319,42,29);
    g.lineStyle(2,0x8b795a).lineBetween(141,327,172,327).lineBetween(141,333,167,333).lineBetween(201,326,223,326);
    // Bookcases and files along left top.
    this.furniture(g,40,157,186,71);
    for(let i=0;i<13;i++){g.fillStyle([0xc7a66b,0x496f5b,0x923d31,0xe0c692][i%4]).fillRect(53+i*12,169,10,43);}
    // Policy cabinet on right.
    this.furniture(g,687,159,181,86);
    for(let j=0;j<3;j++){g.fillStyle(0x677765).fillRect(699+j*54,172,48,61);g.fillStyle(0xd5b475).fillRect(718+j*54,187,10,6);g.fillStyle(0xb9b0a1).fillRect(707+j*54,177,33,4);}
    // Treasury ledger / finance desk.
    this.furniture(g,43,430,141,78);
    g.fillStyle(0xe4d3a7).fillRect(79,444,51,37);
    g.fillStyle(0x536b5b).fillRect(86,452,35,20);
    g.fillStyle(0xc9a05a).fillRect(138,444,22,26);
    // Report station.
    this.furniture(g,682,357,177,88);
    g.fillStyle(0xe3d3a8).fillRect(704,370,133,59);
    for(let j=0;j<3;j++){g.fillStyle([0x47735b,0xb78d58,0xa34e40][j]).fillRect(714,380+j*14,103-j*16,7);}
    // Executive's center desk.
    this.furniture(g,391,258,178,89);
    g.fillStyle(0x213b33).fillRect(447,275,70,43);
    g.fillStyle(0xaab9af).fillRect(454,282,56,30);
    g.fillStyle(0xe0cb9b).fillRect(401,267,38,23);
    g.fillStyle(0xc3a16a).fillCircle(540,275,8);
    // Flags.
    for(const [x,y] of [[746,48],[792,48]]){g.fillStyle(0xd0b875).fillRect(x,y,4,87);g.fillStyle(x===746?0x336e5b:0x9a4938).fillTriangle(x+4,y+3,x+52,y+19,x+4,y+35);}
    // Aide.
    g.fillStyle(0x243e40).fillRoundedRect(582,443,24,30,3);
    g.fillStyle(0xdaad89).fillCircle(594,436,13);
    g.fillStyle(0x2a2724).fillEllipse(594,427,22,10);
    g.fillStyle(0xc8ab70).fillRect(589,454,9,7);
    // Small plaque above top wall.
    this.add.text(700,36,'REPUBLIC OF ARDEN',{fontFamily:'Georgia,serif',fontStyle:'bold',fontSize:'15px',color:'#f6dfb0'});
    this.add.text(698,60,'OFFICE OF THE EXECUTIVE',{fontFamily:'monospace',fontSize:'11px',color:'#d8d2a4'});
    this.add.text(15,575,'Executive Office · Prototype',{fontFamily:'monospace',fontSize:'12px',color:'#efe1c5',backgroundColor:'#20372de0',padding:{x:6,y:4}}).setDepth(20);
  }
  furniture(g,x,y,w,h){
    g.fillStyle(0x3a2921).fillRoundedRect(x+5,y+8,w,h,6);
    g.fillStyle(COLORS.trim).fillRoundedRect(x-3,y-3,w+6,h+4,6);
    g.fillStyle(COLORS.wood).fillRoundedRect(x,y,w,h,5);
    g.fillStyle(COLORS.woodLight).fillRoundedRect(x+9,y+8,w-18,h-16,4);
    g.lineStyle(2,0xb9935c).strokeRoundedRect(x+4,y+4,w-8,h-8,5);
  }
  createCharacterTextures(){
    for(const [name,walking] of [['president',false],['president-walk',true]]){
      const g=this.add.graphics();
      g.fillStyle(0x1a2323).fillEllipse(16,34,22,8);
      g.fillStyle(0x1b2630).fillRect(walking?11:10,26,10,11);
      g.fillStyle(0x1b2630).fillRect(walking?21:20,26,7,11);
      g.fillStyle(0x151820).fillRect(10,34,8,5);
      g.fillStyle(0x151820).fillRect(walking?23:19,34,8,5);
      g.fillStyle(0x233950).fillRoundedRect(6,14,21,18,3);
      g.fillStyle(0xf6f3e6).fillRect(13,16,8,13);
      g.fillStyle(0x98472f).fillRect(15,18,4,11);
      g.fillStyle(0x253c51).fillRect(4,18,5,walking?12:14);
      g.fillStyle(0x253c51).fillRect(25,18,5,walking?14:12);
      g.fillStyle(0xd09b77).fillRect(4,30,5,4);
      g.fillStyle(0xd09b77).fillRect(25,30,5,4);
      g.fillStyle(0xbb896b).fillEllipse(16,12,20,18);
      g.fillStyle(0x302923).fillEllipse(16,7,21,11);
      g.fillStyle(0x302923).fillRect(6,8,4,8);
      g.fillStyle(0x242020).fillRect(10,13,4,2);
      g.fillStyle(0x242020).fillRect(20,13,4,2);
      g.generateTexture(name,34,42);
      g.destroy();
    }
  }
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#20342b',pixelArt:true,roundPixels:true,
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_HORIZONTALLY},
  physics:{default:'arcade',arcade:{debug:false}},scene:[OfficeScene]});
refreshHUD();
