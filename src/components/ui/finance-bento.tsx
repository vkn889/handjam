// @ts-nocheck
"use client";
/* The charts are drawn with plain DOM + SVG inside an effect, so this file
   is checked as JavaScript. No dependencies. */

import * as React from "react";

/* ------------------------------------------------------------------ */
/*  Session Bento: the finance bento, re-tuned for HandJam sessions.  */
/*  Cognus stream, control-mix gauge, KPI tiles, hand-activity waves, */
/*  songs with sparklines and moves per control. Responsive, dark.    */
/* ------------------------------------------------------------------ */

export interface SessionBentoSession {
  startedAt: number;
  seconds: number;
  cognus: number;
  breakdown: { [k: string]: number } | object;
  moves: Partial<Record<string, number>> | object;
  songs: { title: string; seconds: number; curve: number[] }[];
  /** samples of [speed, pitch, volume, filter, reverb, echo, bass], 0..1 */
  timeline: number[][];
  handFlow: { left: number[]; right: number[] };
}

export interface FinanceBentoData {
  /** The session just played. */
  current: SessionBentoSession;
  /** Earlier sessions, oldest first (used for "All time" and the faded comparison lines). */
  history: SessionBentoSession[];
}

export interface FinanceBentoProps {
  data: FinanceBentoData;
  title?: string;
  subtitle?: string;
  className?: string;
  style?: React.CSSProperties;
}

const CSS = `.fpb{font-family:var(--font-outfit),Geist,ui-sans-serif,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;color:#fff;width:100%}
.fpb *{box-sizing:border-box}
.fpb .fpb-c{border-radius:28px}
.fpb{--acc:#E8FF1F;--t1:#fff;--t2:rgba(255,255,255,.56);--t3:rgba(255,255,255,.38);--hair:rgba(255,255,255,.14);--ease:cubic-bezier(.32,.72,0,1)}
.fpb .fpb-c{position:relative;padding:20px 22px 22px;background:#000;color:#fff}
.fpb .top{display:flex;align-items:center;gap:14px;height:44px;margin-bottom:16px}
.fpb .top h1{margin:0;font-size:28px;font-weight:700;letter-spacing:-.03em;flex:1}
.fpb .top h1 span{font-weight:500;color:var(--t3);font-size:15px;letter-spacing:-.01em;margin-left:12px}
.fpb .seg{display:flex;padding:3px;gap:2px;border-radius:14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}
.fpb .seg button{border:0;height:28px;min-width:44px;padding:0 12px;border-radius:11px;background:transparent;color:var(--t2);font:600 12.5px inherit;font-family:inherit;cursor:pointer;transition:background .25s,color .25s}
.fpb .seg button[aria-pressed="true"]{background:#fff;color:#0b0b0c}
.fpb .seg button:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.fpb .grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px}
.fpb .h1{height:376px}
.fpb .h2{height:168px}
.fpb .h3{height:330px}
.fpb #nw{grid-column:span 8}
.fpb #alloc{grid-column:span 4}
.fpb .kpi{grid-column:span 3}
.fpb #flow{grid-column:span 5}
.fpb #crypto{grid-column:span 4}
.fpb #stocks{grid-column:span 3}
@media (max-width:1199px){.fpb #nw{grid-column:span 12}
.fpb #alloc{grid-column:span 6;grid-row:span 2;height:auto}
.fpb .kpi{grid-column:span 6}
.fpb #flow{grid-column:span 12}
.fpb #crypto,.fpb #stocks{grid-column:span 6}}
@media (max-width:767px){.fpb .fpb-c{padding:16px 14px}
.fpb .top{flex-wrap:wrap;height:auto;gap:12px}
.fpb .top h1{flex:1;font-size:24px}
.fpb .top h1 span{display:block;margin:4px 0 0}
.fpb #nw{height:420px}
.fpb #nw .legend{flex:1 0 100%;order:3;margin-top:8px}
.fpb #nw .hrow{flex-wrap:wrap}
.fpb #alloc{grid-column:span 12;grid-row:auto;height:376px}
.fpb .kpi{grid-column:span 6}
.fpb #crypto,.fpb #stocks{grid-column:span 12}
.fpb .grid{gap:12px}}
@media (max-width:520px){.fpb .kpi{grid-column:span 12}}
.fpb .card{position:relative;border-radius:28px;overflow:hidden;opacity:0;transform:translateY(14px) scale(.985);transition:opacity .7s ease,transform .9s var(--ease)}
.fpb .in .card{opacity:1;transform:none}
.fpb .card .rim{position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),inset 0 0 0 1px rgba(255,255,255,.06);pointer-events:none;z-index:9}
.fpb .g{position:absolute;inset:0}
.fpb .core{position:absolute;left:10%;right:10%;top:16%;bottom:-6%;border-radius:90px;filter:blur(60px)}
.fpb .glass{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(20px)}
.fpb .glass .rim{display:none}
.fpb .in-c{position:absolute;inset:0;padding:22px 24px;z-index:2}
.fpb .ttl{font-size:18px;font-weight:600;letter-spacing:-.02em;display:flex;align-items:center;gap:8px}
.fpb .cap{font-size:11.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--t2)}
.fpb .big{font-size:40px;font-weight:200;letter-spacing:-.04em;line-height:1;font-variant-numeric:tabular-nums}
.fpb .delta{font:600 12.5px ui-monospace,monospace;color:var(--acc);letter-spacing:-.02em}
.fpb .muted{font-size:12.5px;color:var(--t3);font-weight:500;letter-spacing:-.01em}
.fpb .chip{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:11px;background:rgba(0,0,0,.85);color:#fff;font:600 11px ui-monospace,monospace;letter-spacing:-.02em}
.fpb .legend{display:flex;gap:16px;font-size:12px;font-weight:500;color:var(--t2)}
.fpb .legend span{display:inline-flex;align-items:center;gap:6px}
.fpb .legend i{width:8px;height:8px;border-radius:50%}
.fpb .row{display:flex;align-items:center;gap:12px}
.fpb .mono{font-family:ui-monospace,monospace;font-variant-numeric:tabular-nums}
.fpb .dots circle{transition:opacity .26s,transform .26s;transform-box:fill-box;transform-origin:center}
.fpb .tip{position:fixed;z-index:50;pointer-events:none;background:rgba(14,14,16,.92);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:9px 11px;font-size:12px;
    backdrop-filter:blur(16px);box-shadow:0 12px 30px -10px rgba(0,0,0,.6);opacity:0;transform:translateY(4px);transition:opacity .15s,transform .15s;white-space:nowrap;min-width:150px}
.fpb .tip.on{opacity:1;transform:none}
.fpb .tip .t{color:var(--t2);margin-bottom:5px;font-weight:500}
.fpb .tip .r{display:flex;justify-content:space-between;gap:14px;align-items:center;line-height:19px}
.fpb .tip .r span{display:inline-flex;align-items:center;gap:6px;color:var(--t2)}
.fpb .tip i{width:7px;height:7px;border-radius:50%}
.fpb .tip b{font:500 12px ui-monospace,monospace}
@media (prefers-reduced-motion: reduce){.fpb .card{transition:none}}`;

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const markup = (o) => `<div class="fpb-c canvas">
      <div class="top">
        <h1>${esc(o.title)}<span>${esc(o.subtitle)}</span></h1>
        <div class="seg" id="period" role="group" aria-label="Range"></div>
      </div>
      <div class="grid" id="grid">
        <section class="card h1" id="nw" aria-label="Session flow"></section>
        <section class="card h1" id="alloc" aria-label="Control mix"></section>
        <section class="card h2 kpi" id="ret" aria-label="Cognus earned"></section>
        <section class="card glass h2 kpi" id="cash" aria-label="Time played"></section>
        <section class="card glass h2 kpi" id="pay" aria-label="Songs played"></section>
        <section class="card glass h2 kpi" id="goals" aria-label="Goals"></section>
        <section class="card h3" id="flow" aria-label="Hand activity"></section>
        <section class="card h3" id="crypto" aria-label="Songs"></section>
        <section class="card h3" id="stocks" aria-label="Moves per control"></section>
      </div>
    </div>
<div class="tip" id="tip"></div>`;

const KEYS = ["speed", "pitch", "volume", "filter", "reverb", "echo", "bass"];
const LABEL = { speed: "Speed", pitch: "Pitch", volume: "Volume", filter: "Filter", reverb: "Reverb", echo: "Echo", bass: "Bass" };
const KCOL = { speed: "#FFFFFF", pitch: "#A9B2FF", volume: "#E8FF1F", filter: "#FFB37A", reverb: "#7FE3C4", echo: "#FF8FC8", bass: "#B794FF" };
const fmtTime = (s) => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0");

function mount(root, data) {
  let alive = true;
  const frames = new Set();
  const RAF = (cb) => { if (!alive) return 0; const id = requestAnimationFrame((t) => { frames.delete(id); if (alive) cb(t); }); frames.add(id); return id; };
  const $id = (id) => root.querySelector("#" + id);

const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ACC='#E8FF1F',T2='rgba(255,255,255,.56)',T3='rgba(255,255,255,.38)',HAIR='rgba(255,255,255,.14)';
const COL={left:'#FFFFFF',right:'#A9B2FF',volume:'#FFB37A'};
const ease=t=>1-Math.pow(1-t,3);
const NS='http://www.w3.org/2000/svg';
const el=(t,a={},p)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);p&&p.appendChild(e);return e};

/* ---------- state: this session, or everything ---------- */
const S={range:'Session'};
const all=[...data.history,data.current];
function view(){
  if(S.range==='Session')return data.current;
  const moves={};KEYS.forEach(k=>moves[k]=all.reduce((a,s)=>a+(s.moves[k]||0),0));
  const songs={};all.forEach(s=>s.songs.forEach(x=>{songs[x.title]=songs[x.title]||{title:x.title,seconds:0,curve:x.curve};songs[x.title].seconds+=x.seconds}));
  const timeline=all.map(s=>{const t=s.timeline;if(!t.length)return [0,0,0,0,0,0,0];return t[0].map((_,k)=>t.reduce((a,v)=>a+v[k],0)/t.length)});
  return {seconds:all.reduce((a,s)=>a+s.seconds,0),cognus:all.reduce((a,s)=>a+s.cognus,0),moves,songs:Object.values(songs).sort((a,b)=>b.seconds-a.seconds),timeline,handFlow:data.current.handFlow,startedAt:all[0].startedAt};
}

/* ---------- helpers ---------- */
function bg({top,base,bottom,core}){return `<div class="g" style="background:linear-gradient(180deg,${top} 0%,${base} 36%,${base} 74%,${bottom} 100%)"></div><div class="core" style="background:${core}"></div>`}
const GR={
  blue:{top:'#b9a6ff',base:'#2e43ff',bottom:'#6d7dff',core:'#05082a'},
  graph:{top:'#9a9aa8',base:'#3a3a44',bottom:'#55555f',core:'#060608'},
  pink:{top:'#ffb3d6',base:'#ff2a85',bottom:'#ff6aa8',core:'#3a031c'},
  copper:{top:'#f6bf96',base:'#c2683a',bottom:'#dc8a5c',core:'#1d0b05'},
  green:{top:'#a6e8c8',base:'#36956f',bottom:'#58b58c',core:'#061d15'},
  lime:{top:'#f4ffb8',base:'#a3c400',bottom:'#c9e03a',core:'#121700'},
};
function smoothPath(P,move=true){let d=(move?'M':'L')+`${P[0][0]},${P[0][1]}`;for(let i=0;i<P.length-1;i++){const p0=P[i-1]||P[i],p1=P[i],p2=P[i+1],p3=P[i+2]||p2,k=.17;
  d+=`C${p1[0]+(p2[0]-p0[0])*k},${p1[1]+(p2[1]-p0[1])*k} ${p2[0]-(p3[0]-p1[0])*k},${p2[1]-(p3[1]-p1[1])*k} ${p2[0]},${p2[1]}`}return d}
const P2=(r,a)=>[r*Math.cos(a*Math.PI/180),r*Math.sin(a*Math.PI/180)];
const F={'0':['01110','10001','10011','10101','11001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11111','00010','00100','00010','00001','10001','01110'],'4':['00010','00110','01010','10010','11111','00010','00010'],'5':['11111','10000','11110','00001','00001','10001','01110'],'6':['00110','01000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00010','01100'],'C':['01110','10001','10000','10000','10000','10001','01110'],',':['0','0','0','0','0','1','1'],' ':['00','00','00','00','00','00','00']};
function DotNumber(host,pitch){
  const cols=48,svg=el('svg',{class:'dots','aria-hidden':'true'},host),cells=[];
  for(let c=0;c<cols;c++)for(let r=0;r<7;r++){const ci=el('circle',{cx:c*pitch+pitch/2,cy:r*pitch+pitch/2,r:pitch*.36,fill:'#fff',opacity:0},svg);ci.style.transitionDelay=(c*7)+'ms';cells.push([c,r,ci])}
  const set=t=>{const on=new Set();let x=0;for(const ch of t){const g=F[ch]||F[' '];const w=g[0].length;for(let r=0;r<7;r++)for(let k=0;k<w;k++)if(g[r][k]==='1')on.add((x+k)*8+r);x+=w+1}
    const used=Math.max(1,x-1);for(const [c,r,ci] of cells){const v=on.has(c*8+r);ci.setAttribute('opacity',v?1:(c<used?.08:0));ci.style.transform=v?'none':'scale(.55)'}
    svg.setAttribute('width',used*pitch);svg.setAttribute('height',7*pitch);svg.setAttribute('viewBox',`0 0 ${used*pitch} ${7*pitch}`)};
  let raf=0,cur=0;
  return {count(to,dur=900){cancelAnimationFrame(raf);const from=cur,t0=performance.now();let last='';
    const f=now=>{const t=reduce?1:Math.min(1,(now-t0)/dur);cur=from+(to-from)*ease(t);const s=Math.round(cur).toLocaleString('en-US')+' C';if(s!==last){set(s);last=s}if(t<1)raf=RAF(f)};raf=RAF(f)}};
}
function tween(node,to,fmt,dur=900){const from=+node.dataset.v||0,t0=performance.now();node.dataset.v=to;
  (function f(now){const t=reduce?1:Math.min(1,(now-t0)/dur);node.textContent=fmt(from+(to-from)*ease(t));if(t<1)RAF(f)})(t0)}
const tip=$id('tip');
function showTip(x,y,title,rows){tip.innerHTML=`<div class="t">${esc(title)}</div>`+rows.map(([k,v,c])=>`<div class="r"><span>${c?`<i style="background:${c}"></i>`:''}${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  tip.classList.add('on');const r=tip.getBoundingClientRect();let L=x+16,T=y-r.height-14;if(L+r.width>innerWidth-8)L=x-r.width-16;if(T<8)T=y+16;tip.style.left=L+'px';tip.style.top=T+'px'}
const hideTip=()=>tip.classList.remove('on');

/* ================= cards ================= */
let V=null;

/* ---- Session flow: a stream of left hand, right hand and volume ---- */
const nw=$id('nw');
nw.innerHTML=`${bg(GR.blue)}<div class="in-c">
  <div class="row hrow" style="justify-content:space-between"><div class="ttl">Cognus</div>
    <div class="legend"><span><i style="background:${COL.left}"></i>Left hand</span><span><i style="background:${COL.right}"></i>Right hand</span><span><i style="background:${COL.volume}"></i>Volume</span></div></div>
  <div class="row" style="margin-top:16px;align-items:flex-end;gap:16px"><div class="nwn"></div>
    <div style="padding-bottom:6px"><div class="delta nwd"></div><div class="muted nwc" style="margin-top:3px"></div></div></div>
  <svg class="nws" style="position:absolute;left:0;right:0;bottom:0;display:block" aria-hidden="true"></svg></div><div class="rim"></div>`;
const nwNum=DotNumber(nw.querySelector('.nwn'),innerWidth<520?5.4:7);
let nwGrow=0,nwRaf=0;
function drawNW(){
  const svg=nw.querySelector('.nws'),W=nw.clientWidth,Hh=226,top=26,bot=26,mid=top+(Hh-top-bot)/2,half=(Hh-top-bot)/2;
  svg.setAttribute('width',W);svg.setAttribute('height',Hh);svg.setAttribute('viewBox',`0 0 ${W} ${Hh}`);
  const T=V.timeline.length>1?V.timeline:[[.5,.5,.5,1,0,0,0],[.5,.5,.5,1,0,0,0]];
  const D=T.map(v=>({l:(v[0]+(1-v[3])+v[6])/3,r:(Math.abs(v[1]-.5)*2+v[4]+v[5])/3,v:v[2]}));
  const n=D.length,X=i=>-20+i/(n-1)*(W+40),g=ease(nwGrow);
  const lay=D.map(p=>{const q=half*g*.95,a=(.15+p.l)*q/2.4,b=(.15+p.r)*q/2.4,c=(.15+p.v)*q/2.4;return {a,ab:a+b,abc:a+b+c}});
  const band=k=>{const Tp=D.map((p,i)=>[X(i),mid-lay[i][k]]),B=D.map((p,i)=>[X(i),mid+lay[i][k]]).reverse();return smoothPath(Tp)+smoothPath(B,false)+'Z'};
  const label=i=>S.range==='Session'?fmtTime(i/(n-1)*V.seconds):'#'+(i+1);
  const marks=[Math.round((n-1)*.18),Math.round((n-1)*.55),n-1];
  svg.innerHTML=`
    <defs><linearGradient id="nwf" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".25" stop-color="#fff" stop-opacity="1"/></linearGradient>
      <mask id="nwm"><rect width="${W}" height="${Hh}" fill="url(#nwf)"/></mask></defs>
    <g mask="url(#nwm)"><path d="${band('abc')}" fill="${COL.volume}" opacity=".95"/><path d="${band('ab')}" fill="${COL.right}"/><path d="${band('a')}" fill="${COL.left}" opacity=".95"/></g>
    ${marks.map((i,k)=>{const x=Math.min(W-36,Math.max(36,X(i)));return `<g style="opacity:${g>.6?1:0};transition:opacity .4s ${k*.08}s">
      <line x1="${x}" x2="${x}" y1="${top-4}" y2="${Hh-bot+4}" stroke="rgba(0,0,0,.55)" stroke-width="1.5"/>
      <rect x="${x-30}" y="${Hh-bot-8}" width="60" height="22" rx="11" fill="#000"/><text x="${x}" y="${Hh-bot+7}" text-anchor="middle" font-size="10.5" font-weight="500" fill="rgba(255,255,255,.7)" font-family="ui-monospace,monospace">${label(i)}</text></g>`}).join('')}
    <line class="hl" y1="${top}" y2="${Hh-bot}" stroke="#fff" stroke-width="1.5" opacity="0"/>
    <rect width="${W}" height="${Hh}" fill="transparent" class="hit"/>`;
  const hit=svg.querySelector('.hit'),hl=svg.querySelector('.hl');
  hit.onpointermove=e=>{const r=svg.getBoundingClientRect(),z=r.width/W,x=(e.clientX-r.left)/z;const i=Math.max(0,Math.min(n-1,Math.round((x+20)/(W+40)*(n-1))));const p=D[i];
    hl.setAttribute('x1',X(i));hl.setAttribute('x2',X(i));hl.setAttribute('opacity',1);
    showTip(r.left+X(i)*z,r.top+(mid-lay[i].abc)*z,label(i),[['Left hand',Math.round(p.l*100)+'%',COL.left],['Right hand',Math.round(p.r*100)+'%',COL.right],['Volume',(p.v*10).toFixed(1),COL.volume]])};
  hit.onpointerleave=()=>{hl.setAttribute('opacity',0);hideTip()};
}
function updateNW(){
  nwNum.count(V.cognus);
  const prev=data.history[data.history.length-1];
  if(S.range==='Session'){
    const d=prev?V.cognus-prev.cognus:V.cognus;
    nw.querySelector('.nwd').textContent=(d>=0?'↑ ':'↓ ')+Math.abs(d)+' C';
    nw.querySelector('.nwc').textContent=prev?'vs your last session':'your first session';
  }else{
    nw.querySelector('.nwd').textContent=all.length+' sessions';
    nw.querySelector('.nwc').textContent='Cognus earned all time';
  }
  cancelAnimationFrame(nwRaf);const t0=performance.now();nwGrow=0;
  const f=now=>{nwGrow=reduce?1:Math.min(1,(now-t0)/1100);drawNW();if(nwGrow<1)nwRaf=RAF(f)};nwRaf=RAF(f);
}

/* ---- Control mix: a half gauge of tick marks ---- */
const al=$id('alloc');
al.innerHTML=`${bg(GR.graph)}<div class="in-c">
  <div class="row" style="justify-content:space-between"><div class="ttl">Control mix</div><span class="chip alc" style="background:rgba(255,255,255,.12)"></span></div>
  <svg class="alg" width="300" height="168" viewBox="-150 -150 300 168" style="position:absolute;left:50%;margin-left:-150px;top:70px" aria-hidden="true"></svg>
  <div class="all" style="position:absolute;left:24px;right:24px;bottom:20px"></div></div><div class="rim"></div>`;
function updateAlloc(){
  const real=KEYS.reduce((a,k)=>a+(V.moves[k]||0),0),tot=real||1,fr=KEYS.map(k=>[k,(V.moves[k]||0)/tot]);
  const n=56,svg=al.querySelector('.alg');let s='',acc=0;const bounds=fr.map(([k,f])=>{acc+=f;return [k,acc]});
  for(let i=0;i<=n;i++){const f=i/n,a=180+f*180,k=(bounds.find(b=>f<=b[1]+1e-9)||bounds[bounds.length-1])[0];const [x1,y1]=P2(136,a),[x2,y2]=P2(i%7===0?112:118,a);
    s+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${real?KCOL[k]:'rgba(255,255,255,.22)'}" stroke-width="3.2" stroke-linecap="round" style="opacity:0;animation:tk .4s ${i*12}ms forwards"/>`}
  const used=fr.filter(([,f])=>f>0.04).length;
  s+=`<text y="-22" text-anchor="middle" font-weight="200" font-size="52" fill="#fff" letter-spacing="-2">${used}<tspan font-size="17" dy="-24" fill="${T2}">/7</tspan></text><text y="0" text-anchor="middle" font-size="12" font-weight="500" fill="${T3}">controls used</text>`;
  svg.innerHTML=`<style>@keyframes tk{to{opacity:1}}</style>`+s;
  al.querySelector('.alc').textContent=real+(real===1?' move':' moves');
  al.querySelector('.all').innerHTML=fr.slice().sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,f],i)=>
    `<div class="row" style="height:30px;${i?'border-top:1px solid rgba(255,255,255,.1)':''}"><i style="width:8px;height:8px;border-radius:50%;background:${KCOL[k]}"></i><span style="flex:1;font-size:13px;font-weight:600">${LABEL[k]}</span><span class="mono muted" style="width:44px;text-align:right">${Math.round(f*100)}%</span><span class="mono" style="width:76px;text-align:right;font-size:13px">${V.moves[k]||0} moves</span></div>`).join('');
}

/* ---- KPI: Cognus earned (solid accent tile) ---- */
const ret=$id('ret');
ret.innerHTML=`${bg(GR.lime)}<div class="in-c"><div class="row" style="justify-content:space-between"><div class="cap" style="color:rgba(0,0,0,.6)">Cognus earned</div><span class="chip rtc"></span></div>
  <div style="position:absolute;left:22px;bottom:32px;display:flex;align-items:center;gap:8px"><svg width="30" height="36" viewBox="0 0 34 40" aria-hidden="true"><path d="M17 37V5M5 17L17 5l12 12" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <span class="big rtv" style="font-size:52px">0</span></div>
  <div class="muted rtp" style="position:absolute;left:24px;bottom:14px;font-size:11.5px;color:rgba(0,0,0,.55)"></div></div><div class="rim"></div>`;
function updateRet(){
  tween(ret.querySelector('.rtv'),V.cognus,v=>Math.round(v).toLocaleString('en-US'));
  const b=data.current.breakdown||{};const best=Object.entries(b).sort((x,y)=>y[1]-x[1])[0];
  ret.querySelector('.rtc').textContent=S.range==='Session'?'total '+all.reduce((a,s)=>a+s.cognus,0).toLocaleString('en-US'):all.length+' sessions';
  ret.querySelector('.rtp').textContent=best&&S.range==='Session'?'Most from '+best[0]+' (+'+best[1]+')':'Keep surprising the music'}

/* ---- KPI: time played with ticks ---- */
const cash=$id('cash');
cash.innerHTML=`<div class="in-c"><div class="row" style="justify-content:space-between"><div class="cap">Time played</div><span class="muted">Cognus / min</span></div>
  <div class="row" style="margin-top:14px;align-items:baseline;justify-content:space-between"><span class="big csv" style="font-size:38px">0:00</span><span class="mono" style="font-size:20px;font-weight:500"><span class="crw">0</span></span></div>
  <svg class="cst" width="100%" height="22" style="position:absolute;left:24px;right:24px;bottom:22px;width:calc(100% - 48px)" aria-hidden="true"></svg></div>`;
function updateCash(){const sec=V.seconds,rate=V.cognus/Math.max(1,sec/60);
  tween(cash.querySelector('.csv'),sec,x=>fmtTime(x));tween(cash.querySelector('.crw'),rate,x=>Math.round(x));
  const svg=cash.querySelector('.cst'),W=svg.getBoundingClientRect().width||220,n=36,goal=S.range==='Session'?180:1800;let s='';
  for(let i=0;i<n;i++){const x=1+i*(W-2)/(n-1),on=i/(n-1)<=sec/goal;s+=`<line x1="${x}" x2="${x}" y1="${i%6===0?2:8}" y2="20" stroke="${on?ACC:'rgba(255,255,255,.28)'}" stroke-width="1.6" stroke-linecap="round" style="transition:stroke .2s ${i*14}ms"/>`}
  svg.innerHTML=s+`<text x="${W}" y="0" dy="-4" text-anchor="end" font-size="10" fill="${T3}" font-family="ui-monospace,monospace">${S.range==='Session'?'3 min':'30 min'}</text>`}

/* ---- KPI: songs played ---- */
const pay=$id('pay');
function updatePay(){const songs=V.songs.slice(0,3);pay.innerHTML=`<div class="in-c" style="padding-bottom:14px"><div class="row" style="justify-content:space-between"><div class="cap">Songs played</div><span class="mono muted">${V.songs.length}</span></div>
  <div style="margin-top:10px">${songs.map((x,i)=>`<div class="row" style="height:34px;${i?'border-top:1px solid rgba(255,255,255,.08)':''}"><i style="width:24px;height:24px;border-radius:8px;background:rgba(255,255,255,.1);display:grid;place-items:center;font:600 11px inherit;font-style:normal">${esc((x.title||'?').charAt(0))}</i><span style="flex:1;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.title||'Untitled')}</span><span class="mono" style="width:52px;text-align:right;font-size:13px">${fmtTime(x.seconds)}</span></div>`).join('')}</div></div>`}

/* ---- KPI: goals ---- */
const goals=$id('goals');
function updateGoals(){const used=KEYS.filter(k=>(V.moves[k]||0)>0).length,total=all.reduce((a,s)=>a+s.cognus,0);
  const GO=[['Use all 7 controls',used/7,'7'],['1,000 Cognus total',Math.min(1,total/1000),'1K']];
  goals.innerHTML=`<div class="in-c"><div class="row" style="justify-content:space-between"><div class="cap">Goals</div><span class="muted">${GO.filter(g=>g[1]>=1).length} done</span></div>
  ${GO.map(([n,f,v],k)=>`<div style="margin-top:${k?14:16}px"><div class="row" style="justify-content:space-between;font-size:13px;font-weight:600"><span>${n}</span><span class="mono" style="font-weight:500">${Math.round(f*100)}%<span class="muted"> of ${v}</span></span></div>
    <svg width="100%" height="12" style="margin-top:8px;display:block" class="gl" data-f="${f}" aria-hidden="true"></svg></div>`).join('')}</div>`;
  RAF(()=>goals.querySelectorAll('.gl').forEach((svg,k)=>{const W=svg.getBoundingClientRect().width,n=40,f=+svg.dataset.f;let s='';
    for(let i=0;i<n;i++){const x=1+i*(W-2)/(n-1),on=i/(n-1)<=f;s+=`<line x1="${x}" x2="${x}" y1="${i%8===0?0:4}" y2="12" stroke="${on?ACC:'rgba(255,255,255,.28)'}" stroke-width="1.6" stroke-linecap="round" style="opacity:0;animation:tk2 .3s ${300+k*150+i*12}ms forwards"/>`}
    svg.innerHTML='<style>@keyframes tk2{to{opacity:1}}</style>'+s}))}

/* ---- Hand activity: mirrored waves, left hand above, right below ---- */
const flow=$id('flow');
flow.innerHTML=`${bg(GR.pink)}<div class="in-c">
  <div class="row" style="justify-content:space-between"><div><div class="ttl">Hand activity</div><div class="muted" style="margin-top:4px">This session vs the two before</div></div>
    <div class="legend" style="flex-direction:column;gap:4px;align-items:flex-end"><span><i style="background:#fff"></i>Left hand</span><span><i style="background:#FFD0E6"></i>Right hand</span></div></div>
  <svg class="fls" style="position:absolute;left:0;bottom:12px" aria-hidden="true"></svg></div><div class="rim"></div>`;
let flowRaf=0;
function updateFlow(instant){
  const svg=flow.querySelector('.fls'),W=flow.clientWidth,Hh=246,L=44,R=W-36,mid=Hh/2,lab=16,amp=mid-lab-8;
  svg.setAttribute('width',W);svg.setAttribute('height',Hh);svg.setAttribute('viewBox',`0 0 ${W} ${Hh}`);
  const runs=[data.current,...data.history.slice(-2).reverse()];
  const LEFT=runs.map(s=>s.handFlow.left),RIGHT=runs.map(s=>s.handFlow.right);
  const max=Math.max(0.5,...LEFT.flat(),...RIGHT.flat());
  const N=LEFT[0].length,X=i=>L+i/(N-1)*(R-L),labels=Array.from({length:N},(_,i)=>Math.round((i+.5)/N*100)+'%');
  cancelAnimationFrame(flowRaf);const t0=instant?-1e6:performance.now();
  const frame=now=>{const g=ease(reduce?1:Math.min(1,(now-t0)/1200));
    const path=(arr,dir)=>smoothPath(arr.map((v,i)=>[X(i),mid+dir*(lab+v/max*amp*g)]));
    let s='';
    [0,.5,1].forEach(f=>{const yT=mid-lab-f*amp,yB=mid+lab+f*amp;
      s+=`<line x1="${L}" x2="${R}" y1="${yT}" y2="${yT}" stroke="${HAIR}"/><line x1="${L}" x2="${R}" y1="${yB}" y2="${yB}" stroke="${HAIR}"/>`});
    labels.forEach((m,i)=>s+=`<text x="${X(i)}" y="${mid+4}" text-anchor="middle" font-size="10.5" font-weight="500" fill="rgba(255,255,255,.75)" font-family="ui-monospace,monospace">${m}</text>`);
    LEFT.slice().reverse().forEach((a,k)=>{const j=LEFT.length-1-k;s+=`<path d="${path(a,-1)}" fill="none" stroke="#fff" stroke-opacity="${[1,.55,.3][j]}" stroke-width="${j?1.6:2.4}" stroke-linecap="round"/>`});
    RIGHT.slice().reverse().forEach((a,k)=>{const j=RIGHT.length-1-k;s+=`<path d="${path(a,1)}" fill="none" stroke="#FFD0E6" stroke-opacity="${[1,.55,.3][j]}" stroke-width="${j?1.6:2.4}" stroke-linecap="round"/>`});
    s+=`<line class="hl" y1="10" y2="${Hh-10}" stroke="#fff" stroke-opacity=".5" opacity="0"/><rect class="hit" x="${L-10}" width="${R-L+20}" height="${Hh}" fill="transparent"/>`;
    svg.innerHTML=s;
    const hit=svg.querySelector('.hit'),hl=svg.querySelector('.hl');
    hit.onpointermove=e=>{const r=svg.getBoundingClientRect(),z=r.width/W,x=(e.clientX-r.left)/z,i=Math.max(0,Math.min(N-1,Math.round((x-L)/(R-L)*(N-1))));
      hl.setAttribute('x1',X(i));hl.setAttribute('x2',X(i));hl.setAttribute('opacity',1);
      showTip(r.left+X(i)*z,r.top+(mid-lab-LEFT[0][i]/max*amp)*z,'Around '+labels[i]+' of the session',[['Left hand',LEFT[0][i].toFixed(2),'#fff'],['Right hand',RIGHT[0][i].toFixed(2),'#FFD0E6']])};
    hit.onpointerleave=()=>{hl.setAttribute('opacity',0);hideTip()};
    if(g<1)flowRaf=RAF(frame)};
  flowRaf=RAF(frame);
}

/* ---- Songs: share of time and a sparkline of how hard you pushed each one ---- */
const cr=$id('crypto');
cr.innerHTML=`${bg(GR.copper)}<div class="in-c"><div class="row" style="justify-content:space-between"><div class="ttl">Songs</div><span class="muted">by time</span></div>
  <div class="row" style="margin-top:14px;align-items:flex-end;justify-content:space-between"><span class="big crv">0</span><span style="padding-bottom:4px"><span class="delta crd"></span><span class="muted"> switches</span></span></div>
  <div class="crb" style="margin-top:16px"></div>
  <div class="crl" style="position:absolute;left:24px;right:24px;bottom:14px"></div></div><div class="rim"></div>`;
function spark(d,key){const W=96,H=30,lo=Math.min(...d),hi=Math.max(...d),pad=(hi-lo)*.15||.1,Y=v=>H-3-(v-lo+pad)/(hi-lo+2*pad)*(H-6);
  const P=d.map((v,i)=>[2+i/(d.length-1)*(W-6),Y(v)]),e=P[P.length-1],up=d[d.length-1]>=d[0],gid='sg'+key;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <path d="${smoothPath(P)}L${e[0]},${H}L${P[0][0]},${H}Z" fill="url(#${gid})"/><path d="${smoothPath(P)}" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${e[0]}" cy="${e[1]}" r="3" fill="${up?ACC:'#fff'}" stroke="rgba(0,0,0,.35)" stroke-width="1"/></svg>`}
function updateCrypto(){const songs=V.songs.slice(0,3),tot=songs.reduce((a,x)=>a+x.seconds,0)||1;
  tween(cr.querySelector('.crv'),V.songs.length,x=>Math.round(x)+(Math.round(x)===1?' song':' songs'));cr.querySelector('.crd').textContent=Math.max(0,V.songs.length-1);
  cr.querySelector('.crb').innerHTML=`<div style="display:flex;gap:3px;height:6px">${songs.map((x,i)=>`<div style="flex:0 0 calc(${x.seconds/tot*100}% - 2px);border-radius:3px;background:rgba(255,255,255,${[.95,.6,.32][i]});transform-origin:left;transform:scaleX(0);transition:transform .8s var(--ease) ${.1+i*.1}s" class="crs"></div>`).join('')}</div>`;
  RAF(()=>RAF(()=>cr.querySelectorAll('.crs').forEach(b=>b.style.transform='scaleX(1)')));
  cr.querySelector('.crl').innerHTML=songs.map((x,i)=>`<div class="row" style="height:50px;${i?'border-top:1px solid rgba(255,255,255,.1)':''}">
    <div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.title||'Untitled')}</div><div class="mono muted" style="font-size:11px">${Math.round(x.seconds/tot*100)}% of time</div></div>${spark(x.curve.length>1?x.curve:[.5,.5],i)}
    <div style="width:56px;text-align:right"><div class="mono" style="font-size:13px">${fmtTime(x.seconds)}</div></div></div>`).join('')}

/* ---- Moves per control: capsule columns ---- */
const st=$id('stocks');
st.innerHTML=`${bg(GR.green)}<div class="in-c"><div class="ttl">Moves</div>
  <div style="margin-top:14px"><span class="big stv" style="font-size:34px">0</span></div><div class="row" style="margin-top:6px;gap:8px"><span class="delta std"></span><span class="muted">most moved</span></div>
  <svg class="sts" style="position:absolute;left:18px;bottom:14px" aria-hidden="true"></svg></div><div class="rim"></div>`;
function updateStocks(instant){const vals=KEYS.map(k=>V.moves[k]||0),tot=vals.reduce((a,b)=>a+b,0),top=KEYS[vals.indexOf(Math.max(...vals))];
  if(!instant)tween(st.querySelector('.stv'),tot,x=>Math.round(x)+' moves');st.querySelector('.std').textContent=tot?LABEL[top]:'—';
  const svg=st.querySelector('.sts'),W=st.clientWidth-36,Hh=160,pb=18,n=KEYS.length,bw=Math.max(10,Math.min(22,(W-24)/n-6)),max=Math.max(4,...vals),gap=(W-24-bw*n)/(n-1);svg.setAttribute('width',W);svg.setAttribute('height',Hh);
  const Y=x=>(Hh-pb)*(1-x/max);let s='';
  vals.forEach((x,i)=>{const X=12+i*(bw+gap);const best=KEYS[i]===top&&tot>0;
    s+=`<rect x="${X}" y="${Y(max)}" width="${bw}" height="${Hh-pb-Y(max)}" rx="${bw/2}" fill="rgba(0,0,0,.28)"/>
      <rect class="sb" x="${X}" y="${Hh-pb}" width="${bw}" height="0" rx="${bw/2}" fill="${best?ACC:'#fff'}" data-y="${Y(x)}" data-h="${Hh-pb-Y(x)}" style="transition:y .8s var(--ease) ${i*70}ms,height .8s var(--ease) ${i*70}ms"/>
      <text x="${X+bw/2}" y="${Hh-3}" text-anchor="middle" font-size="9" fill="${best?'#fff':T3}" font-family="ui-monospace,monospace">${LABEL[KEYS[i]].slice(0,3)}</text>
      <rect class="hit" x="${X-3}" y="0" width="${bw+6}" height="${Hh}" fill="transparent" data-i="${i}"/>`});
  svg.innerHTML=s;
  RAF(()=>RAF(()=>svg.querySelectorAll('.sb').forEach(b=>{b.setAttribute('y',b.dataset.y);b.setAttribute('height',b.dataset.h)})));
  svg.querySelectorAll('.hit').forEach(h=>{h.onpointermove=e=>{const i=+h.dataset.i;showTip(e.clientX,e.clientY,LABEL[KEYS[i]],[['Moves',String(vals[i]),KCOL[KEYS[i]]]])};h.onpointerleave=hideTip});
}

/* ---------- controls ---------- */
function seg(host,items,key){host.innerHTML=items.map(k=>`<button type="button" aria-pressed="${S[key]===k}">${k}</button>`).join('');
  host.querySelectorAll('button').forEach(b=>b.onclick=()=>{S[key]=b.textContent;host.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));updateAll()})}
seg($id('period'),['Session','All time'],'range');
function updateAll(){V=view();updateNW();updateAlloc();updateRet();updateCash();updatePay();updateGoals();updateFlow();updateCrypto();updateStocks()}

let rz;const ro=new ResizeObserver(()=>{clearTimeout(rz);rz=setTimeout(()=>{if(!V)return;cancelAnimationFrame(nwRaf);nwGrow=1;drawNW();updateFlow(true);updateStocks(true);updateCash();updateGoals()},120)});
['nw','flow','stocks','cash'].forEach(id=>ro.observe($id(id)));
(document.fonts?document.fonts.ready:Promise.resolve()).then(()=>{if(!alive)return;$id('grid').classList.add('in');
  root.querySelectorAll('.card').forEach((c,i)=>c.style.transitionDelay=(i*60)+'ms');updateAll()});

  return () => { alive = false; frames.forEach((f) => cancelAnimationFrame(f)); ro.disconnect(); clearTimeout(rz); };
}

export function FinanceBento({ data, title = "Session", subtitle = "", className = "", style = undefined }: FinanceBentoProps) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = markup({ title, subtitle });
    const stop = mount(el, data);
    return () => { stop(); el.innerHTML = ""; };
  }, [data, title, subtitle]);
  return (
    <>
      <style>{CSS}</style>
      <div ref={ref} className={`fpb ${className}`} style={style} />
    </>
  );
}

export const SessionBento = FinanceBento;
export default FinanceBento;
