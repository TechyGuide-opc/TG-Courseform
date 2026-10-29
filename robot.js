/* Techy - clean, realistic hero robot (three.js).
   Smooth glossy ceramic shells, graphite joints, glass display face, TechyGuide logo on the chest.
   Follows the cursor and reacts to the booking form via 'techy' events. */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const canvas=document.getElementById('bot');
if(!canvas)throw new Error('no #bot canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
scene.environment=new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(),.025).texture;
const camera=new THREE.PerspectiveCamera(26,1,.1,100);

/* ---------- studio lighting ---------- */
scene.add(new THREE.HemisphereLight(0xf6f9ff,0xc4d2ec,.5));
const key=new THREE.DirectionalLight(0xfff7ee,2.4);key.position.set(-3.5,7,5.5);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);key.shadow.radius=8;key.shadow.bias=-.0003;key.shadow.normalBias=.02;
Object.assign(key.shadow.camera,{left:-4,right:4,top:6,bottom:-2,near:1,far:24});scene.add(key);
const fill=new THREE.DirectionalLight(0xd5e5ff,.8);fill.position.set(5,2.5,4);scene.add(fill);
const rimO=new THREE.DirectionalLight(0xffc194,1.7);rimO.position.set(4.5,4,-4);scene.add(rimO);
const rimI=new THREE.DirectionalLight(0x9fe0d2,1.3);rimI.position.set(-4.5,3,-4);scene.add(rimI);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.ShadowMaterial({opacity:.24}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
{ const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  const g=x.createRadialGradient(64,64,4,64,64,64);g.addColorStop(0,'rgba(20,16,50,.5)');g.addColorStop(.6,'rgba(20,16,50,.2)');g.addColorStop(1,'rgba(20,16,50,0)');x.fillStyle=g;x.fillRect(0,0,128,128);
  const ao=new THREE.Mesh(new THREE.PlaneGeometry(3.2,2.4),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));
  ao.rotation.x=-Math.PI/2;ao.position.set(0,.004,.05);scene.add(ao); }

/* ---------- materials (logo teal + orange) ---------- */
const TEAL=0x00826f,ORANGE=0xe28717;
const ceramic=new THREE.MeshPhysicalMaterial({color:0xf5f6fa,roughness:.17,metalness:0,clearcoat:1,clearcoatRoughness:.035,sheen:.25,sheenColor:new THREE.Color(0xe2e9ff),envMapIntensity:1.05});
const graphite=new THREE.MeshStandardMaterial({color:0x2a2d3b,roughness:.42,metalness:.75,envMapIntensity:1.25});
const accent=new THREE.MeshPhysicalMaterial({color:TEAL,roughness:.28,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.1});
const led=c=>new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:2.2,roughness:.4});

/* ---------- face display texture ---------- */
const FW=512,FH=358;
const fc=document.createElement('canvas');fc.width=FW;fc.height=FH;const fx=fc.getContext('2d');
const faceTex=new THREE.CanvasTexture(fc);faceTex.colorSpace=THREE.SRGBColorSpace;faceTex.anisotropy=8;
const S={look:{x:0,y:0},blink:0,mood:'idle',mouth:0,_m:''};
function rrect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function eye(c,x,y,rx,ry){
  const g=c.createRadialGradient(x-6,y-14,4,x,y,Math.max(rx,ry)+8);g.addColorStop(0,'#eaffff');g.addColorStop(.35,'#7fe9ff');g.addColorStop(1,'#2a9fe0');
  c.fillStyle=g;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();
}
function drawFace(){
  const c=fx;c.clearRect(0,0,FW,FH);
  rrect(c,0,0,FW,FH,76);c.fillStyle='#07091c';c.fill();
  const gr=c.createRadialGradient(150,40,10,256,179,330);gr.addColorStop(0,'rgba(100,110,255,.22)');gr.addColorStop(1,'rgba(100,110,255,0)');
  rrect(c,0,0,FW,FH,76);c.fillStyle=gr;c.fill();
  const ox=S.look.x*20,oy=S.look.y*11,col='#8cf0ff',op=1-.92*S.blink,happy=S.mood==='happy'||S.mood==='cheer';
  c.lineCap='round';c.shadowColor=col;c.shadowBlur=18;
  [[170,132],[342,132]].forEach(([x,y])=>{
    x+=ox;y+=oy;
    if(happy){c.strokeStyle=col;c.lineWidth=15;c.beginPath();c.arc(x,y+20,36,Math.PI*1.12,Math.PI*1.88);c.stroke();}
    else{eye(c,x,y,34,46*op);
      if(op>.5){c.shadowBlur=0;c.fillStyle='#fff';c.beginPath();c.arc(x-10+ox*.25,y-15,9,0,7);c.fill();c.beginPath();c.arc(x+13,y+15,4,0,7);c.fill();c.shadowBlur=18;}}
  });
  c.strokeStyle=col;
  if(!happy){c.lineWidth=10;const lift=S.mood==='oops'?-1:(S.mouth>.2?-9:0);
    [[170,58,S.mood==='oops'?.3:-.12],[342,58,S.mood==='oops'?-.3:.12]].forEach(([x,y,a])=>{c.save();c.translate(x+ox*.6,y+lift+oy*.4);c.rotate(a);c.beginPath();c.moveTo(-28,0);c.lineTo(28,0);c.stroke();c.restore();});}
  c.shadowBlur=0;
  c.fillStyle='rgba(255,140,165,.5)';[[82,222],[430,222]].forEach(([x,y])=>{c.beginPath();c.ellipse(x,y,28,15,0,0,7);c.fill();});
  c.shadowBlur=12;c.shadowColor=col;
  const mx=256+ox*.5,my=246+oy*.5;
  if(happy){c.fillStyle='#e28717';c.shadowColor='#e28717';c.beginPath();c.moveTo(mx-52,my-12);c.quadraticCurveTo(mx,my-20,mx+52,my-12);c.quadraticCurveTo(mx+46,my+52,mx,my+52);c.quadraticCurveTo(mx-46,my+52,mx-52,my-12);c.fill();
    c.fillStyle='#ff6b8b';c.beginPath();c.ellipse(mx,my+40,22,11,0,0,7);c.fill();}
  else if(S.mouth>.05||S.mood==='oops'){c.fillStyle=col;c.beginPath();c.ellipse(mx,my+8,S.mood==='oops'?18:26,9+S.mouth*24,0,0,7);c.fill();}
  else{c.lineWidth=12;c.beginPath();c.arc(mx,my-16,40,.18*Math.PI,.82*Math.PI);c.stroke();}
  c.shadowBlur=0;
  c.save();rrect(c,0,0,FW,FH,76);c.clip();c.fillStyle='rgba(0,0,12,.12)';for(let y=0;y<FH;y+=3)c.fillRect(0,y,FW,1);c.restore();
  faceTex.needsUpdate=true;
}

/* chest plate: the real TechyGuide TG logo on a light panel */
const logo=document.createElement('canvas');logo.width=256;logo.height=340;
const logoTex=new THREE.CanvasTexture(logo);logoTex.colorSpace=THREE.SRGBColorSpace;logoTex.anisotropy=8;
function drawLogo(img){
  const c=logo.getContext('2d');c.clearRect(0,0,256,340);
  rrect(c,0,0,256,340,60);c.fillStyle='#eef1f7';c.fill();
  if(img){const hh=250,ww=hh*img.width/img.height;c.drawImage(img,128-ww/2,170-hh/2,ww,hh);}
  else{c.fillStyle='#1b1840';c.font='700 96px Fredoka, Nunito, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('TG',128,172);}
  logoTex.needsUpdate=true;
}
drawLogo(null);
{const im=new Image();im.onload=()=>drawLogo(im);im.src='logo.png';}

/* ---------- helpers ---------- */
const rb=(w,h,d,r,s=8)=>new RoundedBoxGeometry(w,h,d,s,r);
const cap=(r,l)=>new THREE.CapsuleGeometry(r,l,10,40);
const ball=r=>new THREE.SphereGeometry(r,40,28);
const add=(geo,mat,x,y,z,p,sh=true)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=sh;m.receiveShadow=true;p.add(m);return m;};

/* ---------- the robot ---------- */
const bot=new THREE.Group();scene.add(bot);
const body=new THREE.Group();bot.add(body);

/* legs */
[-1,1].forEach(s=>{
  const lx=s*.3;
  add(rb(.5,.2,.82,.1),ceramic,lx,.15,.09,body);                    // foot
  add(rb(.53,.055,.85,.025,4),graphite,lx,.03,.09,body);            // sole
  add(ball(.1),graphite,lx,.3,0,body);                               // ankle
  add(cap(.105,.3),ceramic,lx,.55,0,body);                           // shin
  add(ball(.125),graphite,lx,.82,0,body);                            // knee
  add(cap(.125,.2),ceramic,lx,1.03,0,body);                          // thigh
  add(ball(.15),graphite,lx,1.25,0,body);                            // hip
});
add(rb(.98,.24,.64,.11),graphite,0,1.32,0,body);                     // pelvis

/* torso */
add(rb(1.2,1.5,.9,.4,10),ceramic,0,2.05,0,body);
add(rb(.5,.64,.05,.12,5),ceramic,0,2.12,.455,body,false);            // chest plate
const logoM=new THREE.Mesh(new THREE.PlaneGeometry(.44,.58),new THREE.MeshBasicMaterial({map:logoTex,transparent:true,toneMapped:false}));logoM.position.set(0,2.12,.484);body.add(logoM);
const statusLed=add(new THREE.SphereGeometry(.03,16,16),led(ORANGE),0,1.7,.462,body,false);
add(new THREE.CylinderGeometry(.19,.22,.18,40),graphite,0,2.84,0,body);   // neck
{const t=new THREE.Mesh(new THREE.TorusGeometry(.27,.02,12,64),accent);t.rotation.x=Math.PI/2;t.position.set(0,2.77,0);body.add(t);}

/* head */
const head=new THREE.Group();head.position.set(0,2.9,0);body.add(head);
add(rb(1.7,1.4,1.25,.32,10),ceramic,0,.7,0,head);
add(rb(1.34,.98,.06,.24,6),graphite,0,.72,.608,head,false);          // display bezel
const face=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.84),new THREE.MeshBasicMaterial({map:faceTex,transparent:true,toneMapped:false}));face.position.set(0,.72,.642);head.add(face);
const glass=new THREE.Mesh(new THREE.PlaneGeometry(1.22,.86),new THREE.MeshPhysicalMaterial({color:0xffffff,transparent:true,opacity:.1,roughness:.02,metalness:0,clearcoat:1,clearcoatRoughness:0,envMapIntensity:2.4}));glass.position.set(0,.72,.648);head.add(glass);
[-1,1].forEach(s=>{ // ear discs
  const d=add(new THREE.CylinderGeometry(.3,.3,.13,64),ceramic,s*.92,.7,0,head);d.rotation.z=Math.PI/2;
  const c=add(new THREE.CylinderGeometry(.19,.19,.03,48),graphite,s*.99,.7,0,head);c.rotation.z=Math.PI/2;
  const r=add(new THREE.TorusGeometry(.3,.018,12,64),accent,s*.93,.7,0,head,false);r.rotation.y=Math.PI/2;
});

/* arms */
const sh=[],lower=[];
[-1,1].forEach(s=>{
  const g=new THREE.Group();g.position.set(s*.78,2.55,0);body.add(g);sh.push(g);
  add(ball(.17),graphite,0,0,0,g);
  add(cap(.105,.4),ceramic,0,-.38,0,g);
  const el=new THREE.Group();el.position.set(0,-.7,0);g.add(el);
  add(ball(.115),graphite,0,0,0,el);
  const fa=new THREE.Group();el.add(fa);lower.push(fa);
  add(cap(.095,.34),ceramic,0,-.3,0,fa);
  add(new THREE.CylinderGeometry(.105,.105,.04,32),graphite,0,-.56,0,fa);
  const hand=add(ball(1),ceramic,0,-.72,0,fa);hand.scale.set(.14,.17,.11);
  const th=add(ball(1),ceramic,s*.12,-.68,.05,fa);th.scale.set(.05,.09,.05);th.rotation.z=s*-.5;
  g.rotation.z=s*.12;
});

/* ---------- interaction state ---------- */
const clock=new THREE.Clock();
const P={cx:innerWidth/2,cy:innerHeight/2,x:0,y:0,formFocus:false};
let waveAt=-10,jy=0,jv=0,blinkT=-1,nextBlink=2.2,talkUntil=0,moodUntil=0,oopsUntil=0,hops=0,hopT=0;
addEventListener('pointermove',e=>{P.cx=e.clientX;P.cy=e.clientY;});
const jump=v=>{if(jy<.001)jv=v;};
canvas.addEventListener('pointerdown',()=>{waveAt=clock.elapsedTime;jump(5.5);});
addEventListener('techy',e=>{const d=e.detail,t=clock.elapsedTime;
  if(d.type==='focus')P.formFocus=!!d.on;
  if(d.type==='talk')talkUntil=t+1.3;
  if(d.type==='step'){jump(6.5);S.mood='happy';moodUntil=t+1.4;}
  if(d.type==='oops'){S.mood='oops';oopsUntil=t+1.4;}
  if(d.type==='booked'){S.mood='cheer';moodUntil=1e9;hops=4;hopT=t;waveAt=t;}
});
function resize(){const r=canvas.getBoundingClientRect();if(!r.width)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
addEventListener('resize',resize);new ResizeObserver(resize).observe(canvas);resize();
let vis=true;new IntersectionObserver(es=>vis=es[0].isIntersecting).observe(canvas);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

let lastLook={x:9,y:9},lastMouth=0;
function frame(){
  requestAnimationFrame(frame);
  if(!vis)return;
  const dt=Math.min(.05,clock.getDelta()),t=clock.elapsedTime;
  const r=canvas.getBoundingClientRect();
  let tx=clamp((P.cx-(r.left+r.width*.5))/(innerWidth*.45),-1,1),ty=clamp((P.cy-(r.top+r.height*.3))/(innerHeight*.5),-1,1);
  if(P.formFocus){tx=1;ty=-.1;}
  P.x+=(tx-P.x)*Math.min(1,dt*7);P.y+=(ty-P.y)*Math.min(1,dt*7);
  if(hops>0&&t-hopT>.55){jump(6);hops--;hopT=t;}
  jv-=22*dt;jy+=jv*dt;if(jy<0){jy=0;jv=0;}
  bot.position.y=jy;
  const stretch=clamp(jv*.012,-.06,.08);
  body.scale.set(1-stretch*.5,1+stretch+Math.sin(t*2)*.006,1-stretch*.5);
  body.rotation.y=-.16+P.x*.18;
  body.rotation.z=Math.sin(t*1.1)*.012;
  head.rotation.order='YXZ';
  head.rotation.y=P.x*.5-P.x*.18;
  head.rotation.x=P.y*.25+Math.sin(t*.9)*.015+(talkUntil>t?Math.sin(t*14)*.025:0);
  head.rotation.z=Math.sin(t*.7)*.02-P.x*.05;
  statusLed.material.emissiveIntensity=1.4+(.5+.5*Math.sin(t*3))*1.2;
  const wv=t-waveAt,waving=wv>=0&&wv<(S.mood==='cheer'?4:1.6);
  sh.forEach((g,i)=>{const side=i?1:-1;
    g.rotation.x=Math.sin(t*1.4+side)*.04;
    let goal=side*.12;
    if(waving&&side===1)goal=2.5+Math.sin(wv*12)*.25;
    if(S.mood==='cheer'&&side===-1)goal=-2.4+Math.sin(t*10)*.2;
    g.rotation.z+=(goal-g.rotation.z)*Math.min(1,dt*12);
    lower[i].rotation.x=-.08+Math.sin(t*1.4+side)*.04;});
  if(t>nextBlink&&blinkT<0)blinkT=t;
  let blink=0;if(blinkT>=0){const u=(t-blinkT)/.16;blink=u<.5?u*2:Math.max(0,2-u*2);if(u>=1){blinkT=-1;nextBlink=t+2.2+Math.random()*3.2;}}
  if(S.mood==='happy'&&t>moodUntil)S.mood='idle';
  if(S.mood==='oops'&&t>oopsUntil)S.mood='idle';
  const mouth=talkUntil>t?(.3+.7*Math.abs(Math.sin(t*16)))*.8:0;
  const nl={x:P.x,y:P.y};
  if(Math.abs(blink-S.blink)>.01||Math.abs(nl.x-lastLook.x)>.01||Math.abs(nl.y-lastLook.y)>.01||Math.abs(mouth-lastMouth)>.02||S._m!==S.mood){
    S.blink=blink;S.look=nl;S.mouth=mouth;lastLook={...nl};lastMouth=mouth;S._m=S.mood;drawFace();}
  const vh=2*10.6*Math.tan(THREE.MathUtils.degToRad(13)),vw=vh*camera.aspect,sx=camera.aspect>1.4?-.14*vw:0;
  camera.position.set(sx,2.45,10.6);camera.lookAt(sx,2.2,0);
  renderer.render(scene,camera);
}
drawFace();frame();
