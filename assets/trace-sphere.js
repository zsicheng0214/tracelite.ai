/* ===== HERO — Trace Sphere (slow rotate + flowing trajectories + gentle mouse) ===== */
(function(){
  'use strict';
  const cv = document.getElementById('sphere');
  if (!cv || cv.dataset.traceSphereReady === 'true' || typeof cv.getContext !== 'function') return;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  cv.dataset.traceSphereReady = 'true';
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let REDUCED = motionQuery.matches;
  const TAU = Math.PI * 2;
  const lerp = (a,b,t) => a + (b-a)*t;
  const rand = (a,b) => a + Math.random()*(b-a);
  let frameRequest = null;
  let W,H,DPR,cx,cy,R,points=[],rimPoints=[],orbits=[],birth=null,flow=0;
  const mouse={x:0,y:0,tx:0,ty:0,prox:0,tprox:0};
  function resize(){
    const r=cv.getBoundingClientRect(); DPR=Math.min(window.devicePixelRatio||1,2);
    W=r.width;H=r.height;
    if (W <= 0 || H <= 0) return;
    cv.width=Math.round(W*DPR); cv.height=Math.round(H*DPR); ctx.setTransform(DPR,0,0,DPR,0,0);
    cx=W/2;cy=H/2;R=Math.min(W,H)*0.36; build();
    if (REDUCED) frame(0);
    else if (frameRequest === null) frameRequest = requestAnimationFrame(frame);
  }
  function build(){
    points=[];rimPoints=[];orbits=[];
    const N = window.innerWidth<768 ? 110 : 240;
    for(let i=0;i<N;i++){
      const phi=Math.acos(1-2*(i+0.5)/N); const theta=Math.PI*(1+Math.sqrt(5))*i;
      const x=Math.sin(phi)*Math.cos(theta), y=Math.sin(phi)*Math.sin(theta), z=Math.cos(phi);
      const k=Math.random();
      const isBright = k<0.16;
      let color;
      if(isBright){
        color = Math.random()<0.65 ? '#8A8A8A' : '#2B2B2B';
      } else {
        const r = Math.random();
        color = r<0.45 ? '#8A8A8A' : (r<0.88 ? '#2B2B2B' : '#9A9A9A');
      }
      points.push({x,y,z,type:isBright?'bright':'p',
        color:color,
        size:isBright?rand(1.6,2.6):rand(0.5,1.3), phase:Math.random()*TAU, sp:rand(0.2,0.7)});
    }
    // subtle rim dots — sparse small points that lightly trace the silhouette
    const M = window.innerWidth<768 ? 8 : 12;
    for(let i=0;i<M;i++){
      const a = (i/M)*TAU + rand(-0.05,0.05);
      const rr = rand(0.96,0.99);            // sit just inside the outer edge
      rimPoints.push({x:Math.cos(a)*rr, y:Math.sin(a)*rr, z:Math.sqrt(Math.max(0,1-rr*rr))*(Math.random()<0.5?-1:1),
        color:'#2B2B2B', size:rand(0.9,1.4), phase:Math.random()*TAU, sp:rand(0.3,0.8)});
    }
    const rings = window.innerWidth<768 ? 3 : 5;
    for(let i=0;i<rings;i++) orbits.push({axis:(i/rings)*Math.PI,tilt:-0.55+1.1*(i/Math.max(1,rings-1)),rad:0.72+0.055*i,sp:rand(0.35,0.6),off:(i/rings)*TAU,color:i%2?'#8A8A8A':'#2B2B2B',alpha:0.11});
  }
  function rot(p,ax,ay){
    let x=p.x*Math.cos(ax)-p.z*Math.sin(ax), z=p.x*Math.sin(ax)+p.z*Math.cos(ax);
    let y=p.y*Math.cos(ay)-z*Math.sin(ay), z2=p.y*Math.sin(ay)+z*Math.cos(ay);
    return {x:x,y:y,z:z2};
  }
  function project(p){ const persp=1.8, s=persp/(persp-p.z); return {sx:cx+p.x*R*s, sy:cy+p.y*R*s}; }
  let angX=0.18, angY=0, loopT=0;
  // word loop: EVALUATE -> SYNTHESIZE -> TRAIN -> EVOLVE -> (loop)
  const wordLoop=[
    {word:'EVALUATE', a:0},
    {word:'SYNTHESIZE', a:TAU*0.25},
    {word:'TRAIN', a:TAU*0.5},
    {word:'EVOLVE', a:TAU*0.75}
  ];

  function drawStar(cx0,cy0,Rx,Ry,rot){
    // slender four-point star (concave sparkle), sharper notch for a daintier look
    const rix=Rx*0.18, riy=Ry*0.18;
    const c=Math.cos(rot||0), s=Math.sin(rot||0);
    const pts=[[0,-Ry],[rix,-riy],[Rx,0],[rix,riy],[0,Ry],[-rix,riy],[-Rx,0],[-rix,-riy]];
    ctx.beginPath();
    pts.forEach((p,i)=>{
      const x=cx0 + p[0]*c - p[1]*s;
      const y=cy0 + p[0]*s + p[1]*c;
      i? ctx.lineTo(x,y) : ctx.moveTo(x,y);
    });
    ctx.closePath();
  }

  function drawWordLoop(rotFn, glow, ts){
    const rad=0.86; // word ring sits well outside the core sphere
    // slightly thicker orbit track so words clearly belong to a ring
    ctx.beginPath();
    for(let i=0;i<=260;i++){ const a=(i/260)*TAU - Math.PI/2;
      let rp=rotFn({x:Math.cos(a)*rad,y:Math.sin(a)*rad,z:0.03*Math.sin(a*2)});
      const pr=project(rp); if(i===0)ctx.moveTo(pr.sx,pr.sy); else ctx.lineTo(pr.sx,pr.sy);
    }
    ctx.strokeStyle='rgba(43,43,43,0.38)'; ctx.lineWidth=1.4; ctx.stroke();

    // words + node dots — each word hangs from its node on the orbit via a short stem
    wordLoop.forEach((w,idx)=>{
      const a=w.a - Math.PI/2;
      const rp=rotFn({x:Math.cos(a)*rad,y:Math.sin(a)*rad,z:0.02});
      const pr=project(rp); const depth=(rp.z+1)/2;
      const b=glow[idx];

      // compute outward normal of the orbit at this point (in screen space)
      const da=0.025;
      const p1=project(rotFn({x:Math.cos(a-da)*rad,y:Math.sin(a-da)*rad,z:0.02}));
      const p2=project(rotFn({x:Math.cos(a+da)*rad,y:Math.sin(a+da)*rad,z:0.02}));
      let nx=-(p2.sy-p1.sy), ny=(p2.sx-p1.sx);
      const nl=Math.sqrt(nx*nx+ny*ny)||1; nx/=nl; ny/=nl;
      // ensure label stays on the outer side of the ring
      const outward = (nx*(pr.sx-cx)+ny*(pr.sy-cy)) < 0 ? -1 : 1;
      nx*=outward; ny*=outward;
      // when a node sits on the left/right extreme, push the label vertically
      // (not radially) so long words like SYNTHESIZE never run off-canvas
      if(Math.abs(nx) > Math.abs(ny)){
        ny = (pr.sy < cy) ? -1 : 1;
        nx = 0;
      }

      const stem=18 + b*3;
      const lx=pr.sx+nx*stem, ly=pr.sy+ny*stem;

      // stem from orbit to label
      ctx.globalAlpha=0.35+depth*0.45; ctx.strokeStyle='#2B2B2B'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(pr.sx,pr.sy); ctx.lineTo(lx,ly); ctx.stroke();

      // node dot on the orbit (skip for EVALUATE node — the four-point star anchors it)
      const dotR=2.8+b*2.6;
      if(idx!==0){
        ctx.globalAlpha=0.45+depth*0.45;
        ctx.beginPath(); ctx.arc(pr.sx,pr.sy,dotR,0,TAU); ctx.fillStyle='#2B2B2B'; ctx.fill();
        if(b>0.02){
          ctx.globalAlpha=0.18*b; ctx.beginPath(); ctx.arc(pr.sx,pr.sy,dotR*3.2,0,TAU); ctx.fillStyle='#2B2B2B'; ctx.fill();
        }
      }

      // four-pointed star at the EVALUATE node (idx 0) — slender sparkle, twinkling glow
      if(idx===0){
        // rotate 90° so the long axis is horizontal and clears the EVALUATE word,
        // nudge down a touch so the word never overlaps a star arm.
        const sy = pr.sy + 3;
        // pulse-star: 2.2s loop. The GLOW flares (brightens + swells) like a star;
        // the solid core only subtly scales so movement stays natural, no hard "square" jump.
        const t = ((ts||0) % 2200) / 2200;            // 0..1 over 2.2s
        const f = 0.5 - 0.5*Math.cos(t*Math.PI*2);     // 0 at 0%, 1 at 50%, 0 at 100%
        const coreScale = 0.95 + 0.12*f;              // 0.95 -> 1.07 -> 0.95 (gentle)
        const glowScale = 0.85 + 0.4*f;               // 0.85 -> 1.25 -> 0.85 (glow swells = twinkle)
        const glowAlpha = 0.16 + 0.34*f;              // 0.16 -> 0.5 -> 0.16 (tighter, softer)
        const coreAlpha = 0.74 + 0.26*f;              // 0.74 -> 1 -> 0.74 (core also flickers)
        const baseR = (9 + depth*2) * 1.3;             // 1.3x larger than normal dots (visual anchor)
        const Rx = baseR * 1.5 * coreScale;            // long horizontal half-axis (after 90° rotation)
        const Ry = baseR * 0.82 * coreScale;           // short vertical half-axis
        const rot = Math.PI/2;                         // rotate 90°: vertical sparkle -> horizontal
        // soft outer glow halo — this is what "twinkles" (kept compact)
        ctx.save();
        ctx.globalCompositeOperation='lighter';
        const haloR = baseR*1.3*glowScale + baseR*0.7;
        const g0=ctx.createRadialGradient(pr.sx,sy,0,pr.sx,sy,haloR);
        g0.addColorStop(0,`rgba(63,63,63,${0.5*glowAlpha})`);
        g0.addColorStop(0.45,`rgba(63,63,63,${0.28*glowAlpha})`);
        g0.addColorStop(1,'rgba(63,63,63,0)');
        ctx.globalAlpha=1; ctx.fillStyle=g0;
        ctx.beginPath(); ctx.arc(pr.sx,sy,haloR,0,TAU); ctx.fill();
        ctx.restore();
        // star body — slender four-point star, solid teal (no white center), soft falloff
        const sg=ctx.createRadialGradient(pr.sx,sy,0,pr.sx,sy,Ry);
        sg.addColorStop(0,'#3F3F3F');
        sg.addColorStop(0.45,'#3F3F3F');
        sg.addColorStop(1,'rgba(63,63,63,0.82)');
        ctx.globalAlpha=coreAlpha;
        ctx.fillStyle=sg;
        drawStar(pr.sx,sy,Rx,Ry,rot); ctx.fill();
        ctx.globalAlpha=1;
      }

      // word label (always horizontal for readability)
      ctx.font='600 15px "IBM Plex Mono", monospace';
      const tw=ctx.measureText(w.word).width;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      let fx=lx;
      const margin=10;
      if(fx - tw/2 < margin) fx = margin + tw/2;
      if(fx + tw/2 > W - margin) fx = W - margin - tw/2;
      ctx.fillStyle = idx===0 ? '#111111' : '#4A4A4A';
      ctx.globalAlpha=0.65 + depth*0.35 + b*0.35;
      ctx.fillText(w.word, fx, ly);
    });
    ctx.globalAlpha=1;

    // traveling light dot — enlarged 1.3x, teal (#9A9A9A) with bright white core for visibility
    const t=loopT;
    const a = t - Math.PI/2;
    let rp=rotFn({x:Math.cos(a)*rad,y:Math.sin(a)*rad,z:0.04*Math.sin(a*2)});
    const pr=project(rp); const depth=(rp.z+1)/2;
    const R0=3.4; // ~2.6 * 1.3
    ctx.globalAlpha=0.18 + depth*0.32; ctx.beginPath(); ctx.arc(pr.sx,pr.sy,R0*2.6,0,TAU); ctx.fillStyle='#9A9A9A'; ctx.fill();
    ctx.globalAlpha=0.9 + depth*0.1; ctx.beginPath(); ctx.arc(pr.sx,pr.sy,R0,0,TAU); ctx.fillStyle='#9A9A9A'; ctx.fill();
    ctx.globalAlpha=1; ctx.beginPath(); ctx.arc(pr.sx,pr.sy,R0*0.45,0,TAU); ctx.fillStyle='#FFFFFF'; ctx.fill();
    ctx.globalAlpha=1;
  }

  function frame(ts){
    frameRequest = null;
    if (!cv.isConnected || W <= 0 || H <= 0) return;
    if (birth === null) birth=ts;
    const grow = REDUCED ? 1 : Math.min((ts-birth)/2600/1,1);
    if (!REDUCED) {
      flow += 0.0010; // trajectory flow speed
      mouse.x=lerp(mouse.x,mouse.tx,0.06); mouse.y=lerp(mouse.y,mouse.ty,0.06);
      mouse.prox=lerp(mouse.prox,mouse.tprox,0.06);
      // far = faster free spin, near = slower (held) + gentle mouse pull
      const baseSpin = lerp(0.0011, 0.00018, mouse.prox);
      angY += baseSpin;
      angX = 0.18 + mouse.y*(0.03*mouse.prox);
      angY += mouse.x*(0.03*mouse.prox);
      loopT = (loopT + 0.0032) % TAU;
    }

    // traveling light dot + restrained node glow as it passes
    const glow = wordLoop.map((w,idx)=>{
      const wa = w.a; // 0, .25, .5, .75 TAU
      let d = Math.abs(loopT - wa); d = Math.min(d, TAU-d);
      return Math.max(0, 1 - d/0.22); // sharp but soft falloff
    });
    ctx.clearRect(0,0,W,H);

    const worldRot = p=>rot(rot(p,angY,angX),0,0);

    // orbits (flowing trajectories) — use flow offset to animate dashed motion
    orbits.forEach(o=>{
      if (!REDUCED) o.off += 0.004*o.sp;
      ctx.beginPath(); const seg=160;
      for(let i=0;i<=seg;i++){ const a=(i/seg)*TAU;
        let rp=rot({x:Math.cos(a)*o.rad,y:Math.sin(a)*o.rad*o.tilt,z:Math.sin(a)*o.rad*0.15}, o.off,o.axis);
        rp=rot(rp,angY,angX); const pr=project(rp);
        if(i===0) ctx.moveTo(pr.sx,pr.sy); else ctx.lineTo(pr.sx,pr.sy);
      }
      ctx.strokeStyle=o.color; ctx.globalAlpha=o.alpha*grow; ctx.lineWidth=0.6; ctx.stroke(); ctx.globalAlpha=1;
    });

    // word loop on sphere surface
    drawWordLoop(worldRot, glow, ts);

    // points
    const sorted=points.map(p=>({p,rp:rot(p,angY,angX)})).sort((a,b)=>a.rp.z-b.rp.z);
    sorted.forEach(({p,rp})=>{
      const pr=project(rp); const depth=(rp.z+1)/2;
      const appear=Math.min(Math.max((grow-depth*0.4)/0.6,0),1); if(appear<=0) return;
      const pulse=p.type==='bright'?1+Math.sin(ts*0.002*p.sp*6+p.phase)*0.16:1;
      const sz=p.size*pulse*appear*(0.5+depth*0.7);
      ctx.globalAlpha=(0.22+depth*0.7)*appear; ctx.fillStyle=p.color;
      ctx.beginPath(); ctx.arc(pr.sx,pr.sy,sz,0,TAU); ctx.fill();
      if(p.type==='bright'){ ctx.globalAlpha=0.16*appear; ctx.beginPath(); ctx.arc(pr.sx,pr.sy,sz*3,0,TAU); ctx.fill(); }
    });

    // rim dots — small, plain points tracing the silhouette (no glow)
    const rimSorted = rimPoints.map(p=>({p,rp:rot(p,angY,angX)})).sort((a,b)=>a.rp.z-b.rp.z);
    rimSorted.forEach(({p,rp})=>{
      const pr=project(rp); const depth=(rp.z+1)/2;
      const appear=Math.min(Math.max((grow-depth*0.4)/0.6,0),1); if(appear<=0) return;
      const sz=p.size*appear;
      ctx.globalAlpha=(0.35+depth*0.5)*appear; ctx.fillStyle=p.color;
      ctx.beginPath(); ctx.arc(pr.sx,pr.sy,sz,0,TAU); ctx.fill();
    });
    ctx.globalAlpha=1;
    if (!REDUCED) frameRequest = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize, {passive:true});
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(cv);
  window.addEventListener('mousemove', e=>{
    if (REDUCED) return;
    const r=cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const nx=((e.clientX-r.left)/r.width-0.5)*2;
    const ny=((e.clientY-r.top)/r.height-0.5)*2;
    const dist=Math.hypot(nx,ny);
    const RANGE=1.15;
    mouse.tprox = Math.max(0, 1 - dist/RANGE);
    mouse.tx=nx*4; mouse.ty=ny*4;
  }, {passive:true});
  window.addEventListener('mouseleave', ()=>{ mouse.tprox=0; });
  motionQuery.addEventListener('change', event=>{
    REDUCED = event.matches;
    if (frameRequest !== null) {
      cancelAnimationFrame(frameRequest);
      frameRequest = null;
    }
    if (REDUCED) frame(0);
    else {
      birth = null;
      frameRequest = requestAnimationFrame(frame);
    }
  });
  // Repaint the still frame once its label font becomes available.
  document.fonts?.ready.then(()=>{ if (REDUCED) frame(0); });
})();
