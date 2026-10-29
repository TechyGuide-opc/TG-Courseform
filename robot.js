/* Techy - realistic humanoid hero robot (three.js). Lazy-loaded after the page is interactive.
   Detailed jointed skeleton: layered armour, pistons, jointed fingers; navy actuated limbs, light chest shell, glossy visor display, orange joint rings,
   TechyGuide logo on the chest. Actions: wave (hi), backflip, spin, bow, cheer - on its own and on click.
   Follows the cursor and reacts to the booking form via 'techy' events. */
import * as THREE from 'three';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry-0.160.0.js';

const canvas=document.getElementById('bot');
if(!canvas)throw new Error('no #bot canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(26,1,.1,100);

/* ---------- photo-studio environment ---------- */
function studioEnv(){
  const s=new THREE.Scene();s.background=new THREE.Color(0x8696b8);
  const box=(w,h,d,x,y,z,col,k)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color:new THREE.Color(col).multiplyScalar(k)}));m.position.set(x,y,z);s.add(m);};
  box(9,5,.3,-6,6,9,0xffffff,7);box(2.2,10,.3,10,3,5,0xeaf2ff,4);box(2.2,10,.3,-11,3,2,0xffffff,3);
  box(12,.3,7,0,13,0,0xffffff,2.4);box(7,3.5,.3,8,2,-10,0xffb27a,6);box(7,3.5,.3,-8,2,-10,0x6fe0cc,5);box(44,.3,44,0,-5,0,0xdfe6f5,.8);
  return s;
}
{const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(studioEnv(),.04).texture;pm.dispose();}

/* ---------- lights ---------- */
scene.add(new THREE.HemisphereLight(0xf6f9ff,0xc4d2ec,.5));
const key=new THREE.DirectionalLight(0xfff7ee,2.2);key.position.set(-3.5,8,6);key.castShadow=true;
key.shadow.mapSize.set(1024,1024);key.shadow.radius=6;key.shadow.bias=-.0004;key.shadow.normalBias=.03;
Object.assign(key.shadow.camera,{left:-4.5,right:4.5,top:7,bottom:-2,near:1,far:26});scene.add(key);
const fill=new THREE.DirectionalLight(0xd5e5ff,.7);fill.position.set(5,2.5,4);scene.add(fill);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(14,14),new THREE.ShadowMaterial({opacity:.25}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const aoMat=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');
  const g=x.createRadialGradient(32,32,2,32,32,32);g.addColorStop(0,'rgba(20,16,50,.55)');g.addColorStop(.6,'rgba(20,16,50,.22)');g.addColorStop(1,'rgba(20,16,50,0)');x.fillStyle=g;x.fillRect(0,0,64,64);
  return new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false});})();
const ao=new THREE.Mesh(new THREE.PlaneGeometry(2.8,2.2),aoMat);ao.rotation.x=-Math.PI/2;ao.position.set(0,.004,.05);scene.add(ao);

/* ---------- materials ---------- */
const navy=new THREE.MeshPhysicalMaterial({color:0x1d2338,roughness:.32,metalness:.55,clearcoat:.7,clearcoatRoughness:.2,envMapIntensity:1.3});
const navy2=new THREE.MeshPhysicalMaterial({color:0x2b3453,roughness:.3,metalness:.5,clearcoat:.8,clearcoatRoughness:.15,envMapIntensity:1.3});
const shell=new THREE.MeshPhysicalMaterial({color:0xe6e9f0,roughness:.26,clearcoat:1,clearcoatRoughness:.07,sheen:.2,sheenColor:new THREE.Color(0xffffff),envMapIntensity:1.15});
const orange=new THREE.MeshStandardMaterial({color:0xff8a1f,emissive:0xff6a00,emissiveIntensity:.35,roughness:.35,metalness:.2});
const visorMat=new THREE.MeshPhysicalMaterial({color:0x04050c,roughness:.06,metalness:.3,clearcoat:1,envMapIntensity:2.2});

/* ---------- face (shown on the visor) ---------- */
const FW=512,FH=312;
const fc=document.createElement('canvas');fc.width=FW;fc.height=FH;const fx=fc.getContext('2d');
const faceTex=new THREE.CanvasTexture(fc);faceTex.colorSpace=THREE.SRGBColorSpace;faceTex.anisotropy=4;
const S={look:{x:0,y:0},blink:0,mood:'idle',mouth:0,_m:''};
function eye(c,x,y,rx,ry){
  const g=c.createRadialGradient(x-6,y-12,3,x,y,Math.max(rx,ry)+8);g.addColorStop(0,'#f2ffff');g.addColorStop(.35,'#7fe9ff');g.addColorStop(1,'#2a9fe0');
  c.fillStyle=g;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();
}
function drawFace(){
  const c=fx;c.clearRect(0,0,FW,FH);
  c.fillStyle='#04050c';c.fillRect(0,0,FW,FH);
  const gr=c.createRadialGradient(150,30,10,256,156,300);gr.addColorStop(0,'rgba(100,120,255,.16)');gr.addColorStop(1,'rgba(100,120,255,0)');c.fillStyle=gr;c.fillRect(0,0,FW,FH);
  const ox=S.look.x*18,oy=S.look.y*9,col='#8cf0ff',op=1-.92*S.blink,happy=S.mood==='happy'||S.mood==='cheer';
  c.lineCap='round';c.shadowColor=col;c.shadowBlur=20;
  [[176,112],[336,112]].forEach(([x,y])=>{
    x+=ox;y+=oy;
    if(happy){c.strokeStyle=col;c.lineWidth=14;c.beginPath();c.arc(x,y+16,32,Math.PI*1.12,Math.PI*1.88);c.stroke();}
    else{eye(c,x,y,30,40*op);
      if(op>.5){c.shadowBlur=0;c.fillStyle='#fff';c.beginPath();c.arc(x-9+ox*.25,y-12,8,0,7);c.fill();c.beginPath();c.arc(x+11,y+12,3.5,0,7);c.fill();c.shadowBlur=20;}}
  });
  c.strokeStyle=col;
  if(!happy){c.lineWidth=9;const lift=S.mood==='oops'?-1:(S.mouth>.2?-8:0);
    [[176,48,S.mood==='oops'?.3:-.1],[336,48,S.mood==='oops'?-.3:.1]].forEach(([x,y,a])=>{c.save();c.translate(x+ox*.6,y+lift+oy*.4);c.rotate(a);c.beginPath();c.moveTo(-24,0);c.lineTo(24,0);c.stroke();c.restore();});}
  c.shadowBlur=0;
  c.fillStyle='rgba(255,140,165,.4)';[[92,186],[420,186]].forEach(([x,y])=>{c.beginPath();c.ellipse(x,y,24,12,0,0,7);c.fill();});
  c.shadowBlur=12;c.shadowColor=col;
  const mx=256+ox*.5,my=206+oy*.5;
  if(happy){c.fillStyle='#ff9a2f';c.shadowColor='#ff9a2f';c.beginPath();c.moveTo(mx-44,my-10);c.quadraticCurveTo(mx,my-16,mx+44,my-10);c.quadraticCurveTo(mx+38,my+42,mx,my+42);c.quadraticCurveTo(mx-38,my+42,mx-44,my-10);c.fill();}
  else if(S.mouth>.05||S.mood==='oops'){c.fillStyle=col;c.beginPath();c.ellipse(mx,my+6,S.mood==='oops'?15:22,8+S.mouth*20,0,0,7);c.fill();}
  else{c.lineWidth=10;c.beginPath();c.arc(mx,my-14,34,.18*Math.PI,.82*Math.PI);c.stroke();}
  c.shadowBlur=0;faceTex.needsUpdate=true;
}

/* ---------- chest badge: TechyGuide logo + wordmark ---------- */
const bc=document.createElement('canvas');bc.width=512;bc.height=170;
const badgeTex=new THREE.CanvasTexture(bc);badgeTex.colorSpace=THREE.SRGBColorSpace;badgeTex.anisotropy=8;
let logoImg=null;
function drawBadge(){
  const c=bc.getContext('2d');c.clearRect(0,0,512,170);
  let x0=34;
  if(logoImg){const hh=140,ww=hh*logoImg.width/logoImg.height;c.drawImage(logoImg,30,15,ww,hh);x0=30+ww+18;}
  c.textBaseline='middle';
  const avail=512-x0-22;let size=74;                       // shrink the wordmark until all of "TechyGuide" fits
  c.font='700 '+size+'px Fredoka, Nunito, system-ui, sans-serif';
  const full=c.measureText('TechyGuide').width;
  if(full>avail){size=Math.floor(size*avail/full);c.font='700 '+size+'px Fredoka, Nunito, system-ui, sans-serif';}
  c.fillStyle='#1b1840';c.fillText('Techy',x0,88);const w=c.measureText('Techy').width;
  c.fillStyle='#00826f';c.fillText('Guide',x0+w,88);
  badgeTex.needsUpdate=true;
}
drawBadge();
{const im=new Image();im.onload=()=>{logoImg=im;drawBadge();};im.src='logo.png';}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(drawBadge);

/* ---------- geometry helpers ---------- */
const rb=(w,h,d,r,s=5)=>new RoundedBoxGeometry(w,h,d,s,r);
const ball=r=>new THREE.SphereGeometry(r,28,18);
const tube=(rt,rb_,l)=>new THREE.CylinderGeometry(rt,rb_,l,28,1);
const add=(geo,mat,x,y,z,p,sh=true)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=sh;m.receiveShadow=true;p.add(m);return m;};
const grp=(x,y,z,p)=>{const g=new THREE.Group();g.position.set(x,y,z);p.add(g);return g;};
const ring=(p,r,t,x,y,z,ry=0)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(r,t,10,40),orange);m.position.set(x,y,z);m.rotation.y=ry;p.add(m);return m;};

/* ---------- extra materials & helpers for the detailed build ---------- */
const noise=(()=>{const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d'),id=x.createImageData(96,96);
  for(let i=0;i<96*96;i++){const v=128+(Math.random()-.5)*60;id.data[i*4]=id.data[i*4+1]=id.data[i*4+2]=v;id.data[i*4+3]=255;}
  x.putImageData(id,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);return t;})();
const armor=new THREE.MeshPhysicalMaterial({color:0x2d3656,roughness:.3,metalness:.55,clearcoat:.9,clearcoatRoughness:.12,envMapIntensity:1.35,bumpMap:noise,bumpScale:.015,side:THREE.DoubleSide});
const rubber=new THREE.MeshStandardMaterial({color:0x14161f,roughness:.85,metalness:0});
const metal=new THREE.MeshStandardMaterial({color:0xcfd5e0,roughness:.28,metalness:1,envMapIntensity:1.5});
const ledM=new THREE.MeshStandardMaterial({color:0xff8a1f,emissive:0xff7a00,emissiveIntensity:1.6,roughness:.4});
const shellPart=(rt,rb_,l,len=2.1,start=null)=>new THREE.CylinderGeometry(rt,rb_,l,32,1,true,start==null?-len/2:start,len);   // curved armour plate (front-facing)
function seamLoop(w,d,r,tubeR,mat){const pts=[],seg=10,hw=w/2,hd=d/2;
  [[hw-r,hd-r,0],[-(hw-r),hd-r,Math.PI/2],[-(hw-r),-(hd-r),Math.PI],[hw-r,-(hd-r),1.5*Math.PI]].forEach(([cx,cz,a0])=>{for(let i=0;i<=seg;i++){const a=a0+i/seg*Math.PI/2;pts.push(new THREE.Vector3(cx+Math.sin(a)*r,0,cz+Math.cos(a)*r));}});
  const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true,'catmullrom',0),160,tubeR,6,true),mat);m.castShadow=false;return m;}
const bellows=(p,y0,y1,r,n)=>{for(let i=0;i<n;i++){const t=new THREE.Mesh(new THREE.TorusGeometry(r,r*.32,10,32),rubber);t.rotation.x=Math.PI/2;t.position.y=y0+(y1-y0)*i/(n-1);p.add(t);}};

/* ---------- skeleton ---------- */
const bot=new THREE.Group();scene.add(bot);
const pivot=grp(0,1.9,0,bot);                // flip pivot = centre of mass
const rig=grp(0,-1.9,0,pivot);

/* legs: hip > knee > ankle */
const legs=[];
[-1,1].forEach(s=>{
  const hip=grp(s*.31,1.44,0,rig);
  add(ball(.185),navy,0,0,0,hip);
  add(tube(.15,.12,.62),navy,0,-.31,0,hip);                                    // thigh core
  add(shellPart(.172,.14,.5),armor,0,-.3,0,hip);                                // thigh armour
  add(new THREE.CylinderGeometry(.052,.052,.3,18),armor,0,-.27,-.15,hip);       // rear actuator sleeve
  add(new THREE.CylinderGeometry(.026,.026,.4,12),metal,0,-.36,-.15,hip);       // piston rod
  const knee=grp(0,-.62,0,hip);
  add(ball(.15),navy,0,0,0,knee);
  add(rb(.2,.22,.07,.07,3),armor,0,0,.16,knee);                                 // kneecap
  ring(knee,.085,.026,0,0,.2);
  add(tube(.12,.09,.6),navy,0,-.31,-.01,knee);                                  // shin core
  add(shellPart(.145,.105,.5),armor,0,-.32,-.005,knee);                         // shin armour
  add(new THREE.BoxGeometry(.022,.32,.012),ledM,0,-.33,.152,knee,false);        // LED strip
  add(new THREE.CylinderGeometry(.075,.075,.2,20),armor,0,-.2,-.15,knee);       // calf motor
  add(new THREE.CylinderGeometry(.04,.04,.22,16),metal,0,-.2,-.15,knee).rotation.z=Math.PI/2;
  const ankle=grp(0,-.62,0,knee);
  add(ball(.108),navy,0,0,0,ankle);
  const rr_=new THREE.Mesh(new THREE.TorusGeometry(.1,.03,10,28),rubber);rr_.rotation.x=Math.PI/2;rr_.position.y=-.03;ankle.add(rr_);
  add(rb(.3,.15,.74,.07,4),navy,0,-.12,.14,ankle);                              // foot
  add(rb(.28,.1,.24,.05,3),armor,0,-.09,.36,ankle);                             // toe cap
  add(rb(.22,.12,.2,.05,3),armor,0,-.1,-.16,ankle);                             // heel
  add(rb(.33,.045,.78,.02,3),rubber,0,-.19,.14,ankle);                          // sole
  legs.push({hip,knee,ankle});
});

/* pelvis + waist */
add(rb(.9,.32,.54,.14,5),shell,0,1.5,0,rig);
add(new THREE.CylinderGeometry(.3,.3,.2,32),navy,0,1.7,0,rig);
{const t=new THREE.Mesh(new THREE.TorusGeometry(.31,.02,8,36),metal);t.rotation.x=Math.PI/2;t.position.set(0,1.62,0);rig.add(t);}

/* torso (bends at the waist) */
const torso=grp(0,1.72,0,rig);
add(rb(1.2,.98,.66,.2,6),shell,0,.56,0,torso);
{const sm=seamLoop(1.205,.665,.2,.009,navy);sm.position.set(0,.25,0);torso.add(sm);}   // panel seam
add(rb(.98,.14,.6,.06,3),armor,0,1.02,0,torso);                                 // upper collar plate
[-1,1].forEach(s=>{for(let i=0;i<4;i++)add(new THREE.BoxGeometry(.012,.2,.05),navy,s*.603,.6,-.12+i*.085,torso,false);});   // side vents
add(rb(.96,.62,.16,.08,4),armor,0,.62,-.4,torso);                              // back module
[-1,1].forEach(s=>{add(new THREE.CylinderGeometry(.07,.07,.1,20),navy,s*.26,.62,-.5,torso).rotation.x=Math.PI/2;add(new THREE.BoxGeometry(.3,.02,.012),ledM,s*.26,.84,-.485,torso,false);});
const badge=new THREE.Mesh(new THREE.PlaneGeometry(.78,.26),new THREE.MeshBasicMaterial({map:badgeTex,transparent:true,toneMapped:false}));badge.position.set(0,.72,.335);torso.add(badge);
add(new THREE.BoxGeometry(.5,.016,.012),ledM,0,.48,.332,torso,false);
bellows(torso,1.04,1.16,.12,3);
add(new THREE.CylinderGeometry(.095,.095,.34,20),navy,0,1.1,0,torso);           // neck core
{const nr=new THREE.Mesh(new THREE.TorusGeometry(.15,.022,8,28),metal);nr.rotation.x=Math.PI/2;nr.position.y=.99;torso.add(nr);}

/* head (round, dark, glossy visor display) */
const head=grp(0,1.22,0,torso);head.rotation.order='YXZ';
const hc=grp(0,.42,0,head);hc.scale.set(1,.96,.96);
add(ball(.52),navy,0,0,0,hc);
const visor=new THREE.Mesh(new THREE.SphereGeometry(.527,40,24,Math.PI/2-.95,1.9,Math.PI/2-.52,1.04),visorMat);hc.add(visor);
const face=new THREE.Mesh(new THREE.SphereGeometry(.531,40,24,Math.PI/2-.95,1.9,Math.PI/2-.52,1.04),new THREE.MeshBasicMaterial({map:faceTex,toneMapped:false}));hc.add(face);
const glass=new THREE.Mesh(new THREE.SphereGeometry(.536,40,24,Math.PI/2-.95,1.9,Math.PI/2-.52,1.04),new THREE.MeshPhysicalMaterial({color:0xffffff,transparent:true,opacity:.1,roughness:.02,clearcoat:1,clearcoatRoughness:0,envMapIntensity:3,depthWrite:false}));hc.add(glass);
add(new THREE.CylinderGeometry(.034,.034,.03,16),metal,0,.3,.505,hc,false).rotation.x=Math.PI/2.4;   // forehead sensor
add(new THREE.SphereGeometry(.018,10,10),ledM,0,.31,.52,hc,false);
[-1,1].forEach(s=>{ // ears: orange ring + speaker disc
  ring(hc,.15,.03,s*.505,-.02,-.04,Math.PI/2);
  const d=add(new THREE.CylinderGeometry(.12,.12,.03,24),armor,s*.52,-.02,-.04,hc,false);d.rotation.z=Math.PI/2;
  const m=add(new THREE.CylinderGeometry(.05,.05,.034,16),metal,s*.526,-.02,-.04,hc,false);m.rotation.z=Math.PI/2;
});

/* arms: shoulder > elbow > hand with fingers */
const arms=[];
[-1,1].forEach(s=>{
  const sh=grp(s*.74,.83,0,torso);
  add(ball(.2),navy,0,0,0,sh);
  ring(sh,.125,.028,s*.19,0,0,Math.PI/2);
  add(new THREE.CylinderGeometry(.05,.05,.06,16),metal,s*.2,0,0,sh,false).rotation.z=Math.PI/2;
  {const t=new THREE.Mesh(new THREE.TorusGeometry(.2,.03,10,32),armor);t.rotation.y=Math.PI/2;t.position.x=s*.08;sh.add(t);}
  add(tube(.1,.085,.55),navy,0,-.29,0,sh);
  add(shellPart(.122,.1,.42),armor,0,-.3,0,sh);
  add(new THREE.CylinderGeometry(.03,.03,.4,12),metal,0,-.3,-.115,sh);
  const el=grp(0,-.58,0,sh);
  add(ball(.108),navy,0,0,0,el);
  {const t=new THREE.Mesh(new THREE.TorusGeometry(.1,.02,8,24),metal);t.rotation.y=Math.PI/2;el.add(t);}
  add(tube(.088,.074,.52),navy,0,-.28,0,el);
  add(shellPart(.112,.092,.4),armor,0,-.27,0,el);
  add(new THREE.CylinderGeometry(.1,.1,.06,24),metal,0,-.56,0,el);               // wrist cuff
  const hand=grp(0,-.6,0,el);
  add(rb(.17,.2,.1,.05,3),navy,0,-.08,0,hand);                                    // palm
  const fingers=[];
  [-.06,-.02,.02,.06].forEach((fx_,i)=>{
    const g1=grp(fx_,-.17,0,hand);add(new THREE.CapsuleGeometry(.02,.05,4,10),navy,0,-.04,0,g1);
    const g2=grp(0,-.085,0,g1);add(new THREE.CapsuleGeometry(.018,.045,4,10),navy,0,-.035,0,g2);
    fingers.push({g1,g2});
  });
  const th=grp(s*.095,-.05,.03,hand);th.rotation.z=s*-.6;th.rotation.x=.25;
  add(new THREE.CapsuleGeometry(.024,.05,4,10),navy,0,-.04,0,th);
  arms.push({sh,el,hand,s,fingers,curl:.35});
});

/* ---------- animation state ---------- */
const clock=new THREE.Clock();
const P={cx:innerWidth/2,cy:innerHeight/2,eye:{x:0,y:0},head:{x:0,y:0},body:{x:0,y:0},formFocus:false,formAt:-99,jx:0,jy:0,jAt:0};
let jy=0,jv=0,blinkT=-1,nextBlink=2.2,talkUntil=0,oopsUntil=0,stickyCheer=false,readySent=false;
let act=null,queue=[],nextAuto=-1,cycle=0;
const ACT={wave:2.6,flip:1.8,spin:1.3,bow:1.8,cheer:2.4};
const AUTO=['wave','spin','bow','flip','wave','cheer'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=(c,t,dt,k)=>c+(t-c)*Math.min(1,dt*k);
const sm=x=>x*x*(3-2*x);
const tri=(u,a=.3,b=.7)=>u<a?sm(u/a):u<b?1:sm(clamp((1-u)/(1-b),0,1));
const startAct=n=>{act={n,t0:clock.elapsedTime};};
const enqueue=(...n)=>{queue.push(...n);};

addEventListener('pointermove',e=>{P.cx=e.clientX;P.cy=e.clientY;},{passive:true});
canvas.addEventListener('pointerdown',()=>{if(act)return;startAct(AUTO[cycle++%AUTO.length]);});
addEventListener('techy',e=>{const d=e.detail,t=clock.elapsedTime;
  if(d.type==='focus'){P.formFocus=!!d.on;P.formAt=t;}
  if(d.type==='talk'){talkUntil=t+1.3;P.formAt=t;}
  if(d.type==='step'){if(jy<.001)jv=5;S.mood='happy';setTimeout(()=>{if(!stickyCheer)S.mood='idle';},1300);}
  if(d.type==='oops'){oopsUntil=t+1.2;S.mood='oops';setTimeout(()=>{if(!stickyCheer)S.mood='idle';},1200);}
  if(d.type==='booked'){stickyCheer=true;S.mood='cheer';queue=['flip','cheer'];if(!act)startAct(queue.shift());}
});
function resize(){const r=canvas.getBoundingClientRect();if(!r.width)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
addEventListener('resize',resize);new ResizeObserver(resize).observe(canvas);resize();
let vis=true;new IntersectionObserver(es=>vis=es[0].isIntersecting).observe(canvas);

/* current pose (smoothed) */
const C={yaw:0,torsoX:0,headX:0,headY:0,headZ:0,crouch:.06,tuck:0,flipX:0,bodyY:0,
  aLx:0,aLz:-.1,aLe:-.15,aLez:0,aRx:0,aRz:.1,aRe:-.15,aRez:0};
let lastLook={x:9,y:9},lastMouth=0;

function targets(t){
  const breath=Math.sin(t*1.9),T={
    yaw:-.14+P.body.x*.2,torsoX:.02+breath*.01,headX:P.head.y*.25+Math.sin(t*.9)*.014+(talkUntil>t?Math.sin(t*14)*.03:0),
    headY:P.head.x*.5-P.body.x*.2+(oopsUntil>t?Math.sin(t*22)*.28:0),headZ:Math.sin(t*.7)*.02,
    crouch:.1+Math.sin(t*1.2)*.02,tuck:0,flipX:0,bodyY:null,
    aLx:Math.sin(t*1.4)*.04,aLz:-.1,aLe:-.26,aLez:0,aRx:Math.sin(t*1.4+1)*.04,aRz:.1,aRe:-.26,aRez:0,k:12};
  if(!act)return T;
  const d=ACT[act.n],u=clamp((t-act.t0)/d,0,1);
  if(u>=1){act=null;nextAuto=t+7+Math.random()*6;if(queue.length)startAct(queue.shift());return T;}
  switch(act.n){
    case 'wave':{const r=tri(u,.18,.82);
      T.aRz=.1+(2.3-.1)*r;T.aRx=-.15*r;T.aRe=-.2-.3*r;T.aRez=Math.sin(t*11)*.55*r;
      T.headZ+=.12*r;T.headY+=.12*r;T.torsoX+=.03*r;T.yaw+=.1*r;break;}
    case 'spin':{T.yaw+=Math.PI*2*sm(u);const h=Math.sin(Math.PI*u);T.bodyY=.28*h;T.crouch=.06*(1-h);T.tuck=.25*h;
      T.aLz=-1.1*h-.1;T.aRz=1.1*h+.1;break;}
    case 'bow':{const r=tri(u,.35,.65);T.torsoX=.05+.75*r;T.headX+=.25*r;T.crouch=.07+.12*r;T.aLx=-.35*r;T.aRx=-.35*r;break;}
    case 'cheer':{const r=tri(u,.15,.85),b=Math.abs(Math.sin(t*9));T.aLz=-.1-2.35*r;T.aRz=.1+2.35*r;T.aLe=-.15-.2*r;T.aRe=-.15-.2*r;
      T.crouch=.07+.22*b*r;T.headX-=.12*r;T.k=16;break;}
    case 'flip':{
      const t1=.3/d*1,t2=1.24/d;T.k=40;
      if(u<t1){const k=sm(u/t1);T.crouch=.07+.85*k;T.aLx=T.aRx=.9*k;T.aLz=-.2;T.aRz=.2;T.torsoX=.15*k;}
      else if(u<t2){const k=(u-t1)/(t2-t1),tk=Math.sin(Math.PI*clamp(k*1.05,0,1));
        T.flipX=-Math.PI*2*sm(k);T.bodyY=1.2*4*k*(1-k);T.tuck=tk;T.crouch=.9*(1-clamp(k*5,0,1));
        T.aLx=T.aRx=.9-2.4*clamp(k*1.6,0,1);T.aLe=T.aRe=-.4-1.5*tk;T.aLz=-.25;T.aRz=.25;T.torsoX=.1+.3*tk;T.headX=-.15;}
      else{const k=(u-t2)/(1-t2);T.crouch=.85*(1-sm(k))+.07*sm(k);T.aLx=T.aRx=-1.2*(1-k);T.aLz=-.1-.5*(1-k);T.aRz=.1+.5*(1-k);T.torsoX=.2*(1-k);}
      break;}
  }
  return T;
}

function frame(){
  requestAnimationFrame(frame);
  if(!vis||document.hidden)return;
  const dt=Math.min(.05,clock.getDelta()),t=clock.elapsedTime;
  const r=canvas.getBoundingClientRect();
  let tx=clamp((P.cx-(r.left+r.width*.5))/(innerWidth*.45),-1,1),ty=clamp((P.cy-(r.top+r.height*.55))/(innerHeight*.5),-1,1);
  if(P.formFocus){tx=1;ty=-.1;}
  if(t>P.jAt){P.jx=(Math.random()-.5)*.1;P.jy=(Math.random()-.5)*.08;P.jAt=t+.7+Math.random()*1.6;}
  P.eye.x=ease(P.eye.x,tx+P.jx,dt,14);P.eye.y=ease(P.eye.y,ty+P.jy,dt,14);
  P.head.x=ease(P.head.x,tx,dt,5);P.head.y=ease(P.head.y,ty,dt,5);
  P.body.x=ease(P.body.x,tx,dt,2.6);

  /* autonomous behaviour: say hi first, then something fun every few seconds (never while the form is being used) */
  if(nextAuto<0)nextAuto=t+1.4;
  if(!act&&t>nextAuto){
    if(t-P.formAt<6){nextAuto=t+3;}
    else{startAct(nextAuto<3&&cycle===0?'wave':AUTO[cycle++%AUTO.length]);}
  }

  const T=targets(t),k=T.k||12;
  for(const key_ in C){if(key_==='bodyY'||key_==='flipX')continue;C[key_]=ease(C[key_],T[key_],dt,key_==='crouch'||key_==='tuck'?Math.max(k,12):k);}
  C.flipX=T.flipX;                                        // exact during the flip
  if(jv||jy){jv-=22*dt;jy+=jv*dt;if(jy<0){jy=0;jv=0;}}
  const a=C.crouch,drop=-1.24*(1-Math.cos(a))*(1-C.tuck);
  const by=T.bodyY==null?drop:T.bodyY;
  C.bodyY=T.bodyY==null?ease(C.bodyY,drop,dt,18):by;

  bot.position.y=C.bodyY+jy;bot.rotation.y=C.yaw;pivot.rotation.x=C.flipX;rig.position.x=Math.sin(t*.8)*.03;
  const sc=1-clamp(C.bodyY,-.5,0)*.0;void sc;
  torso.rotation.x=C.torsoX;torso.rotation.y=P.body.x*.12;
  head.rotation.x=C.headX;head.rotation.y=C.headY;head.rotation.z=C.headZ;
  const hipA=-(a+1.25*C.tuck),kneeA=2*a*(1-C.tuck)+2.4*C.tuck,ankA=-(hipA+kneeA);
  legs.forEach((l,i)=>{const sway=Math.sin(t*1.2)*.02*(i?1:-1);l.hip.rotation.x=hipA;l.hip.rotation.z=sway;l.knee.rotation.x=kneeA;l.ankle.rotation.x=ankA;});
  arms.forEach(A=>{const L=A.s<0;
    A.sh.rotation.x=L?C.aLx:C.aRx;A.sh.rotation.z=L?C.aLz:C.aRz;
    A.el.rotation.x=L?C.aLe:C.aRe;A.el.rotation.z=L?C.aLez:C.aRez;
    const open=((act&&act.n==='wave'&&!L)||(act&&act.n==='cheer'))?1:0;A.curl+=((.35-.3*open)-A.curl)*Math.min(1,dt*10);
    A.fingers.forEach((f,i)=>{f.g1.rotation.x=A.curl+i*.02;f.g2.rotation.x=A.curl*1.3;});});
  ao.scale.setScalar(1-clamp(C.bodyY+jy,0,2)*.28);aoMat.opacity=1-clamp(C.bodyY+jy,0,2)*.4;

  /* face */
  if(t>nextBlink&&blinkT<0)blinkT=t;
  let blink=0;if(blinkT>=0){const u=(t-blinkT)/.16;blink=u<.5?u*2:Math.max(0,2-u*2);if(u>=1){blinkT=-1;nextBlink=t+2.2+Math.random()*3.2;}}
  const happyAct=act&&(act.n==='wave'||act.n==='flip'||act.n==='cheer'||act.n==='spin');
  const mood=stickyCheer?'cheer':happyAct?'happy':S.mood==='happy'||S.mood==='oops'?S.mood:'idle';
  const mouth=talkUntil>t?(.3+.7*Math.abs(Math.sin(t*16)))*.8:0;
  const nl={x:P.eye.x,y:P.eye.y};
  if(Math.abs(blink-S.blink)>.01||Math.abs(nl.x-lastLook.x)>.01||Math.abs(nl.y-lastLook.y)>.01||Math.abs(mouth-lastMouth)>.02||S._m!==mood){
    S.blink=blink;S.look=nl;S.mouth=mouth;lastLook={...nl};lastMouth=mouth;S._m=mood;const keep=S.mood;S.mood=mood;drawFace();S.mood=keep;}

  /* camera: tall frame so the flip has headroom */
  camera.position.set(0,2.6,11.5);camera.lookAt(0,2.6,0);
  renderer.render(scene,camera);
  if(!readySent){readySent=true;requestAnimationFrame(()=>window.dispatchEvent(new Event('robot-ready')));}
}
drawFace();frame();
