/* Math Run - Techy runs down the road; steer into the door with the right answer.
   Runs itself (demo) until the player jumps in. */
(()=>{
'use strict';
const $=s=>document.querySelector(s);
const cv=$('#game');if(!cv)return;
const g=cv.getContext('2d'),W=960,H=600;g.scale(1.5,1.5);
const wrap=$('.gwrap');
const FH='"Fredoka","Nunito",system-ui,sans-serif',FB='"Nunito",system-ui,sans-serif',INK='#1b1840';
const LANE_COL=[['#ffe27a','#ffb300'],['#ffb38a','#ff6a3d'],['#a6e6d8','#1fa58f']];
const DIFF={easy:{speed:.78,lives:4,range:.75,name:'Easy'},normal:{speed:1,lives:3,range:1,name:'Normal'},hard:{speed:1.25,lives:3,range:1.3,name:'Hard'}};
const HY=185,PY=478,CX=W/2,LW=215;
const persp=d=>1/(1+d*5.5),yAt=sc=>HY+(PY-HY)*sc;
let camX=0;
const cxAt=sc=>CX+camX*(1-sc),xAt=(l,sc)=>cxAt(sc)+l*LW*sc;

/* ---------- storage ---------- */
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v;}catch{return d;}},set(k,v){try{localStorage.setItem(k,v);}catch{}}};
let topic=store.get('mr_topic','mix'),diff=store.get('mr_diff','normal');
if(!DIFF[diff])diff='normal';
let muted=store.get('mr_mute','0')==='1';
const bestKey=()=>`mr_best_${topic}_${diff}`;

/* ---------- audio ---------- */
let ac=null;
function tone(f,d,type='sine',v=.08,t0=0,slide=0){
  if(muted||!ac)return;const t=ac.currentTime+t0,o=ac.createOscillator(),gn=ac.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,f+slide),t+d);
  gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(gn);gn.connect(ac.destination);o.start(t);o.stop(t+d+.02);}
const sfx={
  ok:c=>[659,880,1175].forEach((f,i)=>tone(f*(1+Math.min(c,8)*.02),.14,'triangle',.1,i*.06)),
  bad:()=>tone(180,.35,'sawtooth',.07,0,-90),
  move:()=>tone(420,.05,'sine',.03),
  coin:()=>{tone(988,.07,'square',.05);tone(1319,.12,'square',.05,.06);},
  lvl:()=>[523,659,784,1047].forEach((f,i)=>tone(f,.2,'triangle',.1,i*.09)),
  over:()=>[392,330,262,196].forEach((f,i)=>tone(f,.3,'triangle',.1,i*.16))};

/* ---------- helpers ---------- */
const rnd=n=>1+Math.floor(Math.random()*n),rnd2=n=>2+Math.floor(Math.random()*Math.max(1,n-1));
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rr(x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function panel(x,y,w,h,r,fill,sh=4){g.fillStyle=INK;rr(x+sh,y+sh,w,h,r);g.fill();g.fillStyle=fill;g.strokeStyle=INK;g.lineWidth=3;rr(x,y,w,h,r);g.fill();g.stroke();}

/* ---------- state ---------- */
const S={mode:'demo'};
let coins,coinCount,gates,parts,texts,rings,q,shake,flash,flashC,time,banner,hurtT,track,clouds,scenery,streaks,mount,dustT;
let score,best,lives,maxLives,level,solved,combo,maxCombo,right,wrong,review,newBest;
let lane=0,px=CX,run=0,drag=false;

function setMode(m){S.mode=m;wrap.dataset.mode=m;cv.style.cursor=m==='demo'?'pointer':'default';cv.style.touchAction=m==='play'?'none':'pan-y';}

/* ---------- questions ---------- */
function genQ(){
  const D=DIFF[diff],L=level;let kinds;
  if(topic==='addsub')kinds=['+','-'];else if(topic==='times')kinds=['×'];else if(topic==='div')kinds=['÷'];
  else kinds=L<2?['+']:L<3?['+','-']:L<5?['+','-','×']:['+','-','×','÷'];
  const k=kinds[Math.floor(Math.random()*kinds.length)];let a,b,ans,alts=[];
  if(k==='+'){const m=Math.max(9,Math.round((8+L*5)*D.range));a=rnd(m);b=rnd(m);ans=a+b;alts=[ans+10,ans-10,ans+1,ans-1,ans+2];}
  else if(k==='-'){const m=Math.max(10,Math.round((10+L*5)*D.range));a=rnd(m)+2;b=rnd(a);ans=a-b;alts=[ans+10,ans-10,ans+1,ans-1,ans+2];}
  else if(k==='×'){const m=clamp(Math.round((3+L+(topic==='times'?3:0))*D.range),4,12);a=rnd2(m);b=rnd2(m);ans=a*b;alts=[ans+a,ans-a,ans+b,ans-b,ans+10];}
  else{const m=clamp(Math.round((3+L+(topic==='div'?3:0))*D.range),4,12);b=rnd2(m);ans=rnd2(m);a=b*ans;alts=[ans+1,ans-1,ans+2,b+ans,ans*2];}
  const set=new Set([ans]);
  shuffle(alts).forEach(v=>{if(set.size<3&&v>=0&&Number.isInteger(v)&&v!==ans)set.add(v);});
  let sp=Math.max(3,Math.round(ans*.25));while(set.size<3){const v=ans+(Math.random()<.5?-1:1)*rnd(sp);if(v>=0)set.add(v);sp++;}
  return{t:`${a} ${k} ${b}`,ans,opts:shuffle([...set])};
}
function spawnGate(){
  q=genQ();
  gates.push({d:1.15,q,opts:q.opts,okIdx:q.opts.indexOf(q.ans),resolved:false,choice:-1,react:.5+Math.random()*.25,t:0});
  const cl=Math.floor(Math.random()*3)-1;for(let i=0;i<6;i++)coins.push({d:1.78+i*.075,lane:cl,done:false});
}
const speed=()=>(0.2+Math.min(level,12)*.016)*DIFF[diff].speed;

/* ---------- world setup ---------- */
function mkWorld(){
  scenery=Array.from({length:18},(_,i)=>({side:i%2?1:-1,o:i/18,type:['tree','pine','bush','lamp','tree','pine'][i%6],v:Math.random()}));
  streaks=Array.from({length:12},()=>({a:.25+Math.random()*(Math.PI-.5),r:Math.random()}));
  const mk=(n,min,max)=>Array.from({length:n},(_,i)=>({x:-120+i*(W+240)/(n-1),h:min+Math.random()*(max-min)}));
  mount={far:mk(10,40,110),mid:mk(8,26,70)};
  clouds=Array.from({length:7},(_,i)=>({x:Math.random()*W,y:24+Math.random()*120,s:.55+Math.random()*.8,sp:4+Math.random()*9,z:i%2}));
}

/* ---------- flow ---------- */
function reset(){
  const D=DIFF[diff];
  coins=[];coinCount=0;gates=[];parts=[];texts=[];rings=[];q=null;shake=0;flash=0;flashC='';time=0;hurtT=0;track=0;dustT=0;banner={t:0,max:1,txt:''};
  score=0;lives=maxLives=D.lives;level=1;solved=0;combo=0;maxCombo=0;right=0;wrong=0;review=[];newBest=false;
  lane=0;px=CX;camX=0;best=+store.get(bestKey(),0)||0;
  if(!scenery)mkWorld();
}
function startGame(){
  if(!ac){try{ac=new (window.AudioContext||window.webkitAudioContext)();}catch{}}
  if(ac&&ac.state==='suspended')ac.resume();
  reset();setMode('play');showOver(false);spawnGate();say('RUN!',.8);
}
function startDemo(){reset();setMode('demo');showOver(false);spawnGate();refreshUI();}
function showOver(on){$('#ovOver').classList.toggle('on',on);}
function gameOver(){
  setMode('over');sfx.over();
  if(score>best){best=score;newBest=score>0;store.set(bestKey(),best);}
  const tries=right+wrong;
  $('#oScore').textContent=score;$('#oBest').textContent=best;$('#oAcc').textContent=tries?Math.round(right/tries*100)+'%':'–';$('#oCombo').textContent='x'+maxCombo;$('#oLevel').textContent=level;
  $('#newBest').style.display=newBest?'inline-block':'none';
  $('#missList').innerHTML=review.length?'<b>Practise these:</b>'+review.slice(0,4).map(r=>`<span>${r.t} = ${r.ans}</span>`).join(''):'<b>Perfect run – nothing to review!</b>';
  showOver(true);
}
const say=(txt,t=1.2)=>{banner={t,max:t,txt};};

/* ---------- effects ---------- */
function burst(x,y,c,n=22){for(let i=0;i<n;i++){const a=Math.random()*6.283,s=80+Math.random()*280;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-120,l:.6+Math.random()*.5,m:1,c,s:3+Math.random()*4});}}
function stars(x,y,c,n=10){for(let i=0;i<n;i++){const a=Math.random()*6.283,s=60+Math.random()*200;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-200,l:.9+Math.random()*.5,m:1.3,c,s:5+Math.random()*4,star:true});}}
const ring=(x,y,c,r=10,gr=300)=>rings.push({x,y,c,r,gr,l:.45,m:.45});
const floatText=(x,y,txt,c='#fff',sz=32)=>texts.push({x,y,txt,c,sz,l:1.1,m:1.1});
function loseLife(){
  lives--;combo=0;shake=.4;flash=.3;flashC='#ff4d6d';hurtT=.6;
  if(lives<=0){if(S.mode==='demo')lives=maxLives;else gameOver();}
}

/* ---------- gate resolution ---------- */
function resolve(gt){
  gt.resolved=true;gt.choice=lane+1;
  const ok=gt.choice===gt.okIdx;gt.right=ok;
  if(ok){
    combo++;maxCombo=Math.max(maxCombo,combo);right++;solved++;
    const pts=10+Math.min(combo,10)*2;score+=pts;sfx.ok(combo);
    burst(px,PY-70,'#ffd23f');stars(px,PY-90,'#fff3b0',9);ring(px,PY-70,'#ffd23f');
    floatText(px,PY-165,'+'+pts,'#fff',38);if(combo>=3)floatText(px,PY-205,`Streak x${combo}!`,'#ffd23f',24);
    if(solved%5===0){level++;say(`LEVEL ${level}`,1.3);sfx.lvl();if(S.mode==='demo'&&level>3){level=1;solved=0;}}
  }else{
    wrong++;if(!review.some(r=>r.t===gt.q.t))review.push({t:gt.q.t,ans:gt.q.ans});
    sfx.bad();burst(px,PY-70,'#ff4d6d',18);floatText(px,PY-165,`It was ${gt.q.ans}`,'#ffd23f',30);loseLife();
  }
  if(S.mode!=='over')spawnGate();
}

/* ---------- update ---------- */
function update(dt){
  time+=dt;run+=dt;
  const v=speed();track+=v*dt;
  clouds.forEach(c=>{c.x+=c.sp*dt*(c.z?1.4:1);if(c.x>W+160)c.x=-160;});
  if(S.mode==='demo'){const gt=gates.find(o=>!o.resolved),cn=coins.filter(c=>!c.done&&c.d>.05&&c.d<1.0).sort((a,b)=>a.d-b.d)[0];
    lane=gt&&gt.d<gt.react?gt.okIdx-1:(cn?cn.lane:0);}
  px+=(CX+lane*LW-px)*Math.min(1,dt*13);
  camX+=((CX-px)*.16-camX)*Math.min(1,dt*5);
  streaks.forEach(s=>{s.r+=dt*(.5+v*3);if(s.r>1){s.r=0;s.a=.25+Math.random()*(Math.PI-.5);}});
  dustT-=dt;if(dustT<=0){dustT=.07;parts.push({x:px+(Math.random()-.5)*30,y:PY+34,vx:(Math.random()-.5)*30,vy:-20-Math.random()*20,l:.45,m:.45,c:'rgba(255,255,255,.7)',s:4+Math.random()*4,dust:true});}
  for(const gt of [...gates]){gt.t+=dt;gt.d-=v*dt;if(!gt.resolved&&gt.d<=0){resolve(gt);if(S.mode==='over')return;}}
  gates=gates.filter(gt=>gt.d>-.13);
  coins.forEach(c=>{c.d-=v*dt;if(!c.done&&c.d<=0.02){c.done=true;if(c.lane===lane){coinCount++;score+=2;sfx.coin();stars(px+(Math.random()-.5)*20,PY-60,'#ffd23f',4);floatText(px,PY-120,'+2','#ffd23f',24);}}});
  coins=coins.filter(c=>c.d>-.13);
  parts.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.dust?-10:600)*dt;p.l-=dt;});parts=parts.filter(p=>p.l>0);
  rings.forEach(r=>{r.r+=r.gr*dt;r.l-=dt;});rings=rings.filter(r=>r.l>0);
  texts.forEach(t=>{t.y-=40*dt;t.l-=dt;});texts=texts.filter(t=>t.l>0);
  shake=Math.max(0,shake-dt);flash=Math.max(0,flash-dt);hurtT=Math.max(0,hurtT-dt);banner.t=Math.max(0,banner.t-dt);
}

/* ---------- drawing: scene ---------- */
function cloud(x,y,s,a){g.save();g.translate(x,y);g.scale(s,s);
  g.fillStyle=`rgba(140,170,215,${a*.35})`;g.beginPath();g.arc(2,8,26,0,7);g.arc(34,0,34,0,7);g.arc(70,8,26,0,7);g.rect(2,6,68,28);g.fill();
  g.fillStyle=`rgba(255,255,255,${a})`;g.beginPath();g.arc(0,0,26,0,7);g.arc(32,-10,34,0,7);g.arc(68,0,26,0,7);g.rect(0,-4,68,28);g.fill();g.restore();}
function ridge(pts,color,shift,base){g.fillStyle=color;g.beginPath();g.moveTo(-130+shift,base);pts.forEach((p,i)=>{g.lineTo(p.x+shift,base-p.h);if(i<pts.length-1){const n=pts[i+1];g.lineTo((p.x+n.x)/2+shift,base-Math.min(p.h,n.h)*.55);}});g.lineTo(W+130+shift,base);g.closePath();g.fill();}
function drawBG(){
  /* sky */
  let gr=g.createLinearGradient(0,0,0,HY+10);gr.addColorStop(0,'#58bff7');gr.addColorStop(.6,'#bfe9ff');gr.addColorStop(1,'#fff0cf');g.fillStyle=gr;g.fillRect(-10,-10,W+20,HY+30);
  /* sun + glow */
  const sx=770+camX*.3,sy=88;gr=g.createRadialGradient(sx,sy,10,sx,sy,170);gr.addColorStop(0,'rgba(255,240,170,.95)');gr.addColorStop(1,'rgba(255,240,170,0)');g.fillStyle=gr;g.fillRect(sx-180,sy-180,360,360);
  g.fillStyle='#ffe27a';g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.arc(sx,sy,38,0,7);g.fill();g.stroke();
  clouds.forEach(c=>cloud(c.x+camX*(c.z?.5:.25),c.y,c.s,c.z?.95:.7));
  ridge(mount.far,'#a9d3f4',camX*.35,HY+6);ridge(mount.mid,'#b9b4f2',camX*.55,HY+8);
  /* hills */
  g.fillStyle='#b9ecc9';g.beginPath();g.moveTo(-10,HY+3);g.quadraticCurveTo(150+camX*.8,HY-46,330+camX*.8,HY+3);g.quadraticCurveTo(520+camX*.8,HY-34,700+camX*.8,HY+3);g.quadraticCurveTo(840+camX*.8,HY-42,990,HY+3);g.fill();
  /* ground */
  gr=g.createLinearGradient(0,HY,0,H);gr.addColorStop(0,'#c9f2d3');gr.addColorStop(.35,'#8fdcaa');gr.addColorStop(1,'#62c78b');g.fillStyle=gr;g.fillRect(-10,HY,W+20,H-HY+10);
  const N=16,span=1.6,bw=span/N;
  g.fillStyle='rgba(255,255,255,.16)';
  for(let i=0;i<N;i+=2){const d0=((((i*bw-track)%span)+span)%span),d1=d0+bw,s0=persp(d0),s1=persp(d1);g.beginPath();g.moveTo(-20,yAt(s0));g.lineTo(W+20,yAt(s0));g.lineTo(W+20,yAt(s1));g.lineTo(-20,yAt(s1));g.closePath();g.fill();}
  /* road */
  const sc1=(H-HY)/(PY-HY),hw=sc=>(1.5*LW+.2*LW)*sc;
  gr=g.createLinearGradient(0,HY,0,H);gr.addColorStop(0,'#7a73c4');gr.addColorStop(.5,'#514b92');gr.addColorStop(1,'#37326b');g.fillStyle=gr;
  g.beginPath();g.moveTo(cxAt(0)-hw(.001),HY);g.lineTo(cxAt(0)+hw(.001),HY);g.lineTo(cxAt(sc1)+hw(sc1),H);g.lineTo(cxAt(sc1)-hw(sc1),H);g.closePath();g.fill();
  /* rumble strips + edge lines + dashes */
  for(let i=0;i<N;i++){
    const d0=((((i*bw-track)%span)+span)%span),d1=d0+bw*.98,s0=persp(d0),s1=persp(d1);
    const col=(i%2)?'#ff5d6c':'#fff';
    [-1,1].forEach(sd=>{
      g.fillStyle=col;g.beginPath();g.moveTo(xAt(sd*1.5,s0),yAt(s0));g.lineTo(xAt(sd*1.68,s0),yAt(s0));g.lineTo(xAt(sd*1.68,s1),yAt(s1));g.lineTo(xAt(sd*1.5,s1),yAt(s1));g.closePath();g.fill();});
    g.fillStyle='rgba(255,255,255,.9)';
    [-.5,.5].forEach(l=>{const dd0=((((i*bw-track)%span)+span)%span),a0=persp(dd0),a1=persp(dd0+bw*.45),w0=.025*LW*a0,w1=.025*LW*a1;
      g.beginPath();g.moveTo(xAt(l,a0)-w0,yAt(a0));g.lineTo(xAt(l,a0)+w0,yAt(a0));g.lineTo(xAt(l,a1)+w1,yAt(a1));g.lineTo(xAt(l,a1)-w1,yAt(a1));g.closePath();g.fill();});
  }
  g.strokeStyle='rgba(255,255,255,.95)';[-1,1].forEach(sd=>{g.lineWidth=3;g.beginPath();g.moveTo(xAt(sd*1.5,.001),HY);g.lineTo(xAt(sd*1.5,sc1),H);g.stroke();});
  /* horizon haze */
  gr=g.createLinearGradient(0,HY-6,0,HY+80);gr.addColorStop(0,'rgba(255,244,214,.75)');gr.addColorStop(1,'rgba(255,244,214,0)');g.fillStyle=gr;g.fillRect(-10,HY-6,W+20,90);
}
function drawScenery(){
  const arr=scenery.map(t=>({...t,d:((((t.o-track*.55/1.6)%1)+1)%1)*1.6})).sort((a,b)=>b.d-a.d);
  g.lineJoin='round';
  arr.forEach(t=>{
    const sc=persp(t.d),x=xAt(t.side*(t.type==='lamp'?1.82:2.15+t.v*.5),sc),y=yAt(sc),lw=Math.max(1,2.6*sc);
    g.strokeStyle=INK;g.lineWidth=lw;
    g.fillStyle='rgba(27,24,64,.18)';g.beginPath();g.ellipse(x,y,34*sc,8*sc,0,0,7);g.fill();
    if(t.type==='tree'){const h=120*sc;g.fillStyle='#8a5a3c';g.fillRect(x-7*sc,y-h,14*sc,h);g.strokeRect(x-7*sc,y-h,14*sc,h);
      g.fillStyle=t.v>.5?'#46c27d':'#ffb347';g.beginPath();g.arc(x,y-h-16*sc,42*sc,0,7);g.fill();g.stroke();
      g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.arc(x-14*sc,y-h-28*sc,12*sc,0,7);g.fill();}
    else if(t.type==='pine'){const h=150*sc;g.fillStyle='#8a5a3c';g.fillRect(x-6*sc,y-26*sc,12*sc,26*sc);
      [0,1,2].forEach(k=>{const w=(56-k*13)*sc,by=y-26*sc-k*40*sc;g.fillStyle=k%2?'#35b36f':'#2da062';g.beginPath();g.moveTo(x-w,by);g.lineTo(x,by-62*sc);g.lineTo(x+w,by);g.closePath();g.fill();g.stroke();});}
    else if(t.type==='bush'){g.fillStyle='#4fd08a';[[-22,0,22],[0,-8,28],[24,0,20]].forEach(([dx,dy,r])=>{g.beginPath();g.arc(x+dx*sc,y-18*sc+dy*sc,r*sc,0,7);g.fill();g.stroke();});
      g.fillStyle='#ff6b8b';[[-10,-16],[12,-22],[24,-8]].forEach(([dx,dy])=>{g.beginPath();g.arc(x+dx*sc,y+dy*sc,4*sc,0,7);g.fill();});}
    else{const h=150*sc;g.fillStyle='#43406f';g.fillRect(x-4*sc,y-h,8*sc,h);g.strokeRect(x-4*sc,y-h,8*sc,h);
      const gl=g.createRadialGradient(x,y-h,2,x,y-h,50*sc);gl.addColorStop(0,'rgba(255,230,120,.8)');gl.addColorStop(1,'rgba(255,230,120,0)');g.fillStyle=gl;g.fillRect(x-60*sc,y-h-60*sc,120*sc,120*sc);
      g.fillStyle='#ffe27a';g.beginPath();g.arc(x,y-h,11*sc,0,7);g.fill();g.stroke();}
  });
}
function drawSpeed(){
  const v=speed();g.strokeStyle='rgba(255,255,255,.28)';g.lineWidth=2;g.lineCap='round';
  streaks.forEach(s=>{const r0=s.r*s.r,r1=Math.min(1,r0+.05+v*.1),vx=cxAt(0),ca=Math.cos(s.a),sa=Math.sin(s.a);
    g.beginPath();g.moveTo(vx+ca*r0*820,HY+sa*r0*520);g.lineTo(vx+ca*r1*820,HY+sa*r1*520);g.stroke();});
}
function drawGate(gt){
  const sc=persp(Math.max(gt.d,-.12)),y=yAt(sc),hgt=222*sc,fade=gt.d<0?clamp(1+gt.d/.12,0,1):1;
  const lx=xAt(-1.5,sc),rx=xAt(1.5,sc),pw=20*sc;
  g.save();g.globalAlpha=fade;g.lineJoin='round';
  /* road glow */
  const gg=g.createLinearGradient(0,y-8*sc,0,y+60*sc);gg.addColorStop(0,'rgba(255,255,255,.35)');gg.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gg;g.fillRect(lx,y-8*sc,rx-lx,70*sc);
  /* pillars */
  [[lx-pw,pw],[rx,pw]].forEach(([x,w])=>{const pg=g.createLinearGradient(x,0,x+w,0);pg.addColorStop(0,'#1fa58f');pg.addColorStop(1,'#00685a');g.fillStyle=pg;g.strokeStyle=INK;g.lineWidth=Math.max(1.5,3.4*sc);g.fillRect(x,y-hgt-34*sc,w,hgt+34*sc);g.strokeRect(x,y-hgt-34*sc,w,hgt+34*sc);});
  /* doors */
  for(let i=0;i<3;i++){
    const cx=xAt(i-1,sc),w=LW*.84*sc;let c0=LANE_COL[i][0],c1=LANE_COL[i][1],glass0='rgba(255,255,255,.75)',glass1='rgba(255,255,255,.25)';
    if(gt.resolved){
      if(i===gt.okIdx){c0='#bff5d0';c1='#2fbf71';glass0='rgba(120,255,170,.85)';glass1='rgba(60,210,120,.45)';
        const rg=g.createRadialGradient(cx,y-hgt/2,10*sc,cx,y-hgt/2,w*1.1);rg.addColorStop(0,'rgba(80,240,150,.6)');rg.addColorStop(1,'rgba(80,240,150,0)');g.fillStyle=rg;g.fillRect(cx-w*1.2,y-hgt-20*sc,w*2.4,hgt+40*sc);}
      else if(i===gt.choice){c0='#ffc2cc';c1='#ff4d6d';glass0='rgba(255,140,160,.85)';glass1='rgba(255,77,109,.45)';}
      else{c0='#ecebf5';c1='#b8b5cf';glass0='rgba(255,255,255,.4)';glass1='rgba(255,255,255,.15)';}
    }
    g.lineWidth=Math.max(1.5,3.6*sc);g.strokeStyle=INK;
    const fg=g.createLinearGradient(0,y-hgt,0,y);fg.addColorStop(0,c0);fg.addColorStop(1,c1);
    g.fillStyle=fg;rr(cx-w/2,y-hgt,w,hgt,w*.3);g.fill();g.stroke();
    /* glass */
    const iw=w-22*sc,ih=hgt-22*sc;g.save();rr(cx-iw/2,y-hgt+11*sc,iw,ih,iw*.24);g.clip();
    const sg=g.createLinearGradient(0,y-hgt,0,y);sg.addColorStop(0,glass0);sg.addColorStop(1,glass1);g.fillStyle=sg;g.fillRect(cx-iw/2,y-hgt,iw,hgt);
    g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.moveTo(cx-iw*.5,y-hgt);g.lineTo(cx-iw*.1,y-hgt);g.lineTo(cx-iw*.5-hgt*.2,y);g.lineTo(cx-iw*.9,y);g.closePath();g.fill();g.restore();
    g.lineWidth=Math.max(1,2.4*sc);rr(cx-iw/2,y-hgt+11*sc,iw,ih,iw*.24);g.stroke();
    /* number plate */
    const py=y-hgt*.56;g.fillStyle=INK;g.beginPath();g.arc(cx+3*sc,py+4*sc,50*sc,0,7);g.fill();
    g.fillStyle='#fff';g.strokeStyle=INK;g.lineWidth=Math.max(1.5,3.4*sc);g.beginPath();g.arc(cx,py,50*sc,0,7);g.fill();g.stroke();
    g.fillStyle=INK;g.font=`600 ${Math.max(10,(String(gt.opts[i]).length>2?46:60)*sc)}px ${FH}`;g.textAlign='center';g.textBaseline='middle';g.fillText(gt.opts[i],cx,py+3*sc);
    if(gt.resolved&&(i===gt.okIdx||i===gt.choice)){const ok=i===gt.okIdx;g.fillStyle=ok?'#17a35e':'#d4204c';g.beginPath();g.arc(cx,y-hgt*.16,18*sc,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=Math.max(1.5,4*sc);g.lineCap='round';g.beginPath();
      if(ok){g.moveTo(cx-8*sc,y-hgt*.16);g.lineTo(cx-2*sc,y-hgt*.16+6*sc);g.lineTo(cx+9*sc,y-hgt*.16-7*sc);}else{g.moveTo(cx-7*sc,y-hgt*.16-7*sc);g.lineTo(cx+7*sc,y-hgt*.16+7*sc);g.moveTo(cx+7*sc,y-hgt*.16-7*sc);g.lineTo(cx-7*sc,y-hgt*.16+7*sc);}g.stroke();}
  }
  /* beam */
  const bx=lx-pw-8*sc,bw=rx-lx+2*pw+16*sc,by=y-hgt-58*sc,bh=48*sc;
  g.fillStyle=INK;rr(bx+4*sc,by+4*sc,bw,bh,12*sc);g.fill();
  const bgd=g.createLinearGradient(0,by,0,by+bh);bgd.addColorStop(0,'#1fa58f');bgd.addColorStop(1,'#00685a');g.fillStyle=bgd;g.lineWidth=Math.max(1.5,3.4*sc);g.strokeStyle=INK;rr(bx,by,bw,bh,12*sc);g.fill();g.stroke();
  g.fillStyle='#ffd23f';g.font=`600 ${Math.max(8,26*sc)}px ${FH}`;g.textAlign='center';g.textBaseline='middle';g.fillText('TECHYGUIDE  GATE',bx+bw/2,by+bh/2+1*sc);
  [0,1,2,3,4,5,6].forEach(k=>{const on=(Math.floor(gt.t*5)+k)%2===0;g.fillStyle=on?'#ffd23f':'#e28717';g.beginPath();g.arc(bx+bw*(.06+k*.147),by+bh+6*sc,4*sc,0,7);g.fill();});
  g.restore();
}
function drawCoins(){
  [...coins].sort((a,b)=>b.d-a.d).forEach(c=>{
    if(c.done&&c.d<.3)return;
    const sc=persp(Math.max(c.d,-.12)),x=xAt(c.lane,sc),y=yAt(sc)-34*sc,r=26*sc,spin=Math.abs(Math.cos(time*5+c.d*9))*.8+.2;
    g.save();g.translate(x,y);g.globalAlpha=c.d<0?clamp(1+c.d/.12,0,1):1;
    g.fillStyle='rgba(27,24,64,.2)';g.beginPath();g.ellipse(0,34*sc,r*.9,r*.25,0,0,7);g.fill();
    g.lineWidth=Math.max(1.2,3*sc);g.strokeStyle=INK;
    const cg=g.createLinearGradient(-r,-r,r,r);cg.addColorStop(0,'#fff3a8');cg.addColorStop(.5,'#ffd23f');cg.addColorStop(1,'#ff9f1a');g.fillStyle=cg;
    g.beginPath();g.ellipse(0,0,r*spin,r,0,0,7);g.fill();g.stroke();
    g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.ellipse(-r*.25*spin,-r*.4,r*.18*spin,r*.28,.4,0,7);g.fill();
    if(spin>.5){g.fillStyle=INK;g.font=`600 ${Math.max(8,r*1.1)}px ${FH}`;g.textAlign='center';g.textBaseline='middle';g.fillText('T',0,r*.06);}
    g.restore();});
}
function drawRunner(){
  const x=px,y=PY+34,ph=Math.sin(run*14),bob=Math.abs(ph)*5,tilt=clamp((CX+lane*LW-px)*.0016,-.25,.25);
  g.save();g.translate(x,y);
  const sg=g.createRadialGradient(0,2,2,0,2,44);sg.addColorStop(0,'rgba(27,24,64,.4)');sg.addColorStop(1,'rgba(27,24,64,0)');g.fillStyle=sg;g.beginPath();g.ellipse(0,2,44,12,0,0,7);g.fill();
  if(hurtT>0&&Math.floor(hurtT*20)%2)g.globalAlpha=.4;
  g.rotate(tilt);g.translate(0,-bob);
  g.lineWidth=3;g.strokeStyle=INK;g.lineJoin='round';g.lineCap='round';
  [[-14,ph],[14,-ph]].forEach(([lx,p])=>{g.fillStyle='#2b2766';rr(lx-6,-36-p*6,12,30,5);g.fill();g.stroke();
    const sg2=g.createLinearGradient(0,-16-p*6,0,0);sg2.addColorStop(0,'#1fa58f');sg2.addColorStop(1,'#00685a');g.fillStyle=sg2;g.beginPath();g.ellipse(lx+(p>0?4:-2),-8-p*6,15,9,0,0,7);g.fill();g.stroke();
    g.fillStyle='#fff';g.fillRect(lx+(p>0?-8:-14),-3-p*6,22,3);});
  [[-1,ph],[1,-ph]].forEach(([s,p])=>{g.save();g.translate(s*30,-76);g.rotate(s*.25+p*.7*s*-1);
    const ag=g.createLinearGradient(-7,0,7,0);ag.addColorStop(0,'#fff');ag.addColorStop(1,'#d6dcff');g.fillStyle=ag;rr(-7,0,14,32,7);g.fill();g.stroke();
    g.fillStyle='#00826f';g.beginPath();g.arc(0,35,9,0,7);g.fill();g.stroke();g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.arc(-2,32,3,0,7);g.fill();g.restore();});
  /* body */
  const bg=g.createLinearGradient(-27,0,27,0);bg.addColorStop(0,'#fff');bg.addColorStop(.6,'#f3f5ff');bg.addColorStop(1,'#cfd6fa');g.fillStyle=bg;rr(-27,-86,54,54,18);g.fill();g.stroke();
  g.fillStyle='#00826f';rr(-27,-48,54,10,3);g.fill();g.stroke();
  const og=g.createRadialGradient(-3,-64,1,0,-62,12);og.addColorStop(0,'#ffc27a');og.addColorStop(1,'#ff7a2d');g.fillStyle=og;g.beginPath();g.arc(0,-62,11,0,7);g.fill();g.stroke();
  g.fillStyle=INK;g.font=`600 10px ${FH}`;g.textAlign='center';g.textBaseline='middle';g.fillText('TG',0,-61);
  /* head */
  g.fillStyle='#00826f';[-1,1].forEach(s=>{g.beginPath();g.arc(s*43,-112,12,0,7);g.fill();g.stroke();g.fillStyle='#ffd23f';g.beginPath();g.arc(s*47,-112,5,0,7);g.fill();g.fillStyle='#00826f';});
  const hg=g.createLinearGradient(-39,-144,39,-80);hg.addColorStop(0,'#fff');hg.addColorStop(1,'#d9deff');g.fillStyle=hg;rr(-40,-144,80,64,25);g.fill();g.stroke();
  g.fillStyle='#16133a';rr(-32,-136,64,46,16);g.fill();
  const vg=g.createLinearGradient(-32,-136,32,-90);vg.addColorStop(0,'rgba(140,160,255,.35)');vg.addColorStop(.5,'rgba(140,160,255,0)');g.fillStyle=vg;rr(-32,-136,64,46,16);g.fill();
  const blink=(Math.sin(time*1.7)>.97)?.15:1;g.shadowColor='#8cf0ff';g.shadowBlur=8;
  g.fillStyle='#8cf0ff';[-14,14].forEach(ex=>{g.beginPath();g.ellipse(ex,-118,5.8,8.5*blink,0,0,7);g.fill();});
  g.strokeStyle='#8cf0ff';g.lineWidth=2.8;g.beginPath();g.arc(0,-111,8,.2*Math.PI,.8*Math.PI);g.stroke();g.shadowBlur=0;
  g.fillStyle='#fff';[-14,14].forEach(ex=>{g.beginPath();g.arc(ex-2,-121,2,0,7);g.fill();});
  g.fillStyle='rgba(255,138,160,.75)';[-25,25].forEach(ex=>{g.beginPath();g.ellipse(ex,-108,5,3,0,0,7);g.fill();});
  /* antenna */
  const ax=Math.sin(time*9)*3;g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.moveTo(0,-144);g.lineTo(ax,-158);g.stroke();
  const ag2=g.createRadialGradient(ax-1,-162,1,ax,-160,8);ag2.addColorStop(0,'#ffd7a8');ag2.addColorStop(1,'#ff7a2d');g.fillStyle=ag2;g.beginPath();g.arc(ax,-160,7,0,7);g.fill();g.stroke();
  g.restore();
}

/* ---------- drawing: HUD ---------- */
function heart(x,y,s,fill){g.save();g.translate(x,y);g.scale(s,s);g.beginPath();g.moveTo(0,5);g.bezierCurveTo(-12,-4,-6,-13,0,-6);g.bezierCurveTo(6,-13,12,-4,0,5);g.closePath();
  g.fillStyle=fill?'#ff4d6d':'rgba(27,24,64,.12)';g.fill();g.lineWidth=1.8;g.strokeStyle=INK;g.stroke();if(fill){g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(-4,-5,2.2,1.6,-.6,0,7);g.fill();}g.restore();}
function flame(x,y,s){g.save();g.translate(x,y);g.scale(s,s);g.fillStyle='#e28717';g.strokeStyle=INK;g.lineWidth=1.6;g.beginPath();g.moveTo(0,-11);g.bezierCurveTo(10,-4,10,8,0,11);g.bezierCurveTo(-10,8,-10,-2,-3,-5);g.bezierCurveTo(-2,-8,-1,-9,0,-11);g.closePath();g.fill();g.stroke();
  g.fillStyle='#ffd23f';g.beginPath();g.moveTo(0,0);g.bezierCurveTo(5,3,5,8,0,9);g.bezierCurveTo(-5,8,-4,3,0,0);g.fill();g.restore();}
function drawHUD(){
  /* score card */
  panel(14,12,176,62,16,'#fff');
  g.textBaseline='top';g.textAlign='left';g.fillStyle='#1fa58f';g.font=`800 11px ${FB}`;g.fillText('SCORE',30,20);
  g.fillStyle=INK;g.font=`600 34px ${FH}`;g.fillText(String(score).padStart(3,'0'),30,32);
  g.textAlign='right';g.fillStyle='rgba(27,24,64,.6)';g.font=`800 10px ${FB}`;g.fillText(S.mode==='demo'?'DEMO':'BEST '+best,178,22);
  g.fillStyle='#ffd23f';g.strokeStyle=INK;g.lineWidth=2;g.beginPath();g.arc(140,54,8,0,7);g.fill();g.stroke();g.fillStyle=INK;g.textAlign='left';g.textBaseline='middle';g.font=`600 15px ${FH}`;g.fillText(coinCount,152,55);g.textBaseline='top';
  /* level */
  panel(14,86,176,30,15,'#fff',3);
  const prog=(solved%5)/5;g.fillStyle='rgba(27,24,64,.12)';rr(70,96,106,10,5);g.fill();
  if(prog>0){const lg=g.createLinearGradient(70,0,176,0);lg.addColorStop(0,'#ffd23f');lg.addColorStop(1,'#e28717');g.fillStyle=lg;rr(70,96,Math.max(10,106*prog),10,5);g.fill();}
  g.fillStyle=INK;g.textAlign='left';g.textBaseline='middle';g.font=`800 12px ${FB}`;g.fillText(`LEVEL ${level}`,26,102);
  /* hearts */
  const hw=maxLives*30+22;panel(W-14-hw,12,hw,46,23,'#fff');
  for(let i=0;i<maxLives;i++)heart(W-14-hw+26+i*30,36,1.15,i<lives);
  /* streak */
  if(combo>1){panel(W-14-112,68,112,32,16,'#fff3d6',3);flame(W-14-112+20,84,.95);g.fillStyle=INK;g.textAlign='left';g.textBaseline='middle';g.font=`600 18px ${FH}`;g.fillText(`Streak x${combo}`,W-14-112+36,85);}
  /* question */
  const gt=[...gates].reverse().find(o=>!o.resolved);
  if(gt){
    g.font=`600 46px ${FH}`;const txt=`${gt.q.t} = ?`,w=Math.max(260,g.measureText(txt).width+70);
    g.fillStyle=INK;rr(W/2-w/2+5,15,w,68,34);g.fill();
    const qg=g.createLinearGradient(0,10,0,78);qg.addColorStop(0,'#ffe680');qg.addColorStop(1,'#ffc21a');g.fillStyle=qg;g.strokeStyle=INK;g.lineWidth=3.5;rr(W/2-w/2,10,w,68,34);g.fill();g.stroke();
    g.fillStyle='rgba(255,255,255,.45)';rr(W/2-w/2+16,16,w-32,12,6);g.fill();
    g.fillStyle=INK;g.textAlign='center';g.textBaseline='middle';g.fillText(txt,W/2,47);
  }
  if(S.mode==='demo'){
    const p=.5+.5*Math.sin(time*4);panel(W/2-150,94+p*3,300,42,21,'#e28717',4);
    g.fillStyle=INK;g.beginPath();g.moveTo(W/2-96,106+p*3);g.lineTo(W/2-96,124+p*3);g.lineTo(W/2-82,115+p*3);g.closePath();g.fill();
    g.font=`600 20px ${FH}`;g.textAlign='left';g.textBaseline='middle';g.fillText('Click or tap to play',W/2-70,116+p*3);
  }else if(S.mode==='play'&&time<5){
    g.globalAlpha=clamp(1-(time-3.5)/1.5,0,1);panel(W/2-260,96,520,34,17,'#fff',3);
    g.fillStyle=INK;g.font=`800 14px ${FB}`;g.textAlign='center';g.textBaseline='middle';g.fillText('Arrow keys, swipe, or tap left / middle / right to switch lane',W/2,113);g.globalAlpha=1;
  }
  if(banner.t>0){const k=banner.t/banner.max,a=clamp(Math.min(k*3,(1-k)*6+.2),0,1);g.globalAlpha=a;g.textAlign='center';g.textBaseline='middle';g.font=`600 ${74+(1-k)*14}px ${FH}`;
    g.lineWidth=10;g.strokeStyle=INK;g.lineJoin='round';g.strokeText(banner.txt,W/2,H/2-40);g.fillStyle='#fff';g.fillText(banner.txt,W/2,H/2-40);g.globalAlpha=1;}
}
function star(x,y,r){g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rad=i%2?r*.45:r;g.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad);}g.closePath();g.fill();}
function draw(){
  g.save();
  if(shake>0)g.translate((Math.random()-.5)*14*shake*2.5,(Math.random()-.5)*14*shake*2.5);
  drawBG();drawSpeed();drawScenery();
  drawCoins();
  [...gates].sort((a,b)=>b.d-a.d).forEach(drawGate);
  drawRunner();
  rings.forEach(r=>{g.globalAlpha=clamp(r.l/r.m,0,1);g.strokeStyle=r.c;g.lineWidth=5;g.beginPath();g.arc(r.x,r.y,r.r,0,7);g.stroke();});g.globalAlpha=1;
  parts.forEach(p=>{g.globalAlpha=clamp(p.l/p.m,0,1);g.fillStyle=p.c;if(p.star)star(p.x,p.y,p.s*1.6);else{g.beginPath();g.arc(p.x,p.y,p.dust?p.s*(1+(1-p.l/p.m)):p.s,0,7);g.fill();}});g.globalAlpha=1;
  texts.forEach(t=>{g.globalAlpha=clamp(t.l*1.5,0,1);g.font=`600 ${t.sz}px ${FH}`;g.textAlign='center';g.textBaseline='middle';g.lineWidth=7;g.strokeStyle=INK;g.lineJoin='round';g.strokeText(t.txt,t.x,t.y);g.fillStyle=t.c;g.fillText(t.txt,t.x,t.y);});g.globalAlpha=1;
  if(flash>0){g.fillStyle=flashC;g.globalAlpha=flash*.45;g.fillRect(-20,-20,W+40,H+40);g.globalAlpha=1;}
  /* soft vignette */
  const vg=g.createRadialGradient(W/2,H/2,H*.55,W/2,H/2,H*1.05);vg.addColorStop(0,'rgba(27,24,64,0)');vg.addColorStop(1,'rgba(27,24,64,.22)');g.fillStyle=vg;g.fillRect(-20,-20,W+40,H+40);
  drawHUD();
  g.restore();
}

/* ---------- UI wiring ---------- */
function refreshUI(){
  document.querySelectorAll('#topics button').forEach(b=>b.classList.toggle('on',b.dataset.v===topic));
  document.querySelectorAll('#diffs button').forEach(b=>b.classList.toggle('on',b.dataset.v===diff));
  $('#bestline').textContent='Best here: '+(+store.get(bestKey(),0)||0);
  $('#gSound').classList.toggle('off',muted);
}
document.querySelectorAll('#topics button').forEach(b=>b.onclick=()=>{topic=b.dataset.v;store.set('mr_topic',topic);startDemo();});
document.querySelectorAll('#diffs button').forEach(b=>b.onclick=()=>{diff=b.dataset.v;store.set('mr_diff',diff);startDemo();});
$('#gPlay').onclick=startGame;$('#gAgain').onclick=startGame;$('#gMenu').onclick=startDemo;
$('#gSound').onclick=()=>{muted=!muted;store.set('mr_mute',muted?'1':'0');refreshUI();if(!muted&&ac)sfx.move();};

const laneFrom=e=>{const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)/r.width;return x<.34?-1:x>.66?1:0;};
const setLane=l=>{if(l!==lane){lane=l;sfx.move();}};
cv.addEventListener('pointerdown',e=>{
  if(S.mode==='demo'){startGame();return;}
  if(S.mode==='play'){drag=true;setLane(laneFrom(e));}
});
cv.addEventListener('pointermove',e=>{if(S.mode==='play'&&(e.pointerType==='mouse'||drag))setLane(laneFrom(e));});
addEventListener('pointerup',()=>{drag=false;});
addEventListener('keydown',e=>{
  const k=e.key;
  if(k==='m'||k==='M'){$('#gSound').click();return;}
  const L=k==='ArrowLeft'||k==='a'||k==='A',R=k==='ArrowRight'||k==='d'||k==='D';
  if(!vis||!(L||R))return;
  e.preventDefault();
  if(S.mode==='demo'){startGame();return;}
  if(S.mode==='play')setLane(clamp(lane+(L?-1:1),-1,1));
});

let last=performance.now(),vis=false;
new IntersectionObserver(es=>{vis=es[0].isIntersecting;},{threshold:.15}).observe(cv);
reset();spawnGate();setMode('demo');refreshUI();
(function loop(n){const dt=Math.min(.05,(n-last)/1000);last=n;
  if(vis){try{if(S.mode==='play'||S.mode==='demo')update(dt);draw();}catch(err){g.setTransform(1.5,0,0,1.5,0,0);g.globalAlpha=1;g.shadowBlur=0;console.error(err);}}
  requestAnimationFrame(loop);})(last);
})();
