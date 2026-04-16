"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from './lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, LineController, PointElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Loader2, LogOut, RefreshCw } from 'lucide-react';
import React from 'react';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, LineController, PointElement, ArcElement, Tooltip, Legend, Filler);

// ─── Design System ──────────────────────────────────────────
const T={bg:"#F5F0E8",bg2:"#EDE8DF",card:"#FFF",gold:"#B8963E",gd:"#8B6914",goldLight:"#C9A95A",brn:"#3D2B1F",ch:"#2C2C2C",mu:"#8C7E6F",dv:"#D4C9B8",gr:"#2E7D32",rd:"#B71C1C",mo:"'Courier New',monospace",se:"Georgia,serif",sa:"system-ui,-apple-system,sans-serif"};
const PARTNER_MAP={'soukiwisam@gmail.com':'WISI','ramzi@futuros.app':'RAMZI','fvfc@futuros.app':'FVFC','donaldo@futuros.app':'DONALDO','gian@futuros.app':'GIAN','yuyo@futuros.app':'YUYO','david@futuros.app':'DAVID'};
const MO=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const ease='cubic-bezier(0.25, 0.46, 0.45, 0.94)';

// ─── Helpers ────────────────────────────────────────────────
const fmt=(n,d=0)=>n==null||isNaN(n)?'$0':'$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtPct=n=>n==null||isNaN(n)?'0%':Number(n).toFixed(1)+'%';
const gm=s=>{if(!s)return null;if(s.includes('-'))return parseInt(s.substring(5,7));if(s.includes('/'))return parseInt(s.split('/')[1]);return null};
const gd=s=>{if(!s)return null;if(s.includes('-'))return parseInt(s.substring(8,10));return null};
const pctOf=(a,b)=>b>0?((a-b)/b*100):null;
const cmpStr=p=>{if(p==null)return null;return `${p>=0?'+':''}${p.toFixed(1)}%`};
const pAmt=(d,key)=>d.partners?.[key]||0;

// ─── Styles ─────────────────────────────────────────────────
const S={
  card:{background:T.card,borderRadius:16,padding:'1.25rem',boxShadow:'0 1px 4px rgba(0,0,0,0.03)',border:'0.5px solid rgba(212,201,184,0.4)'},
  kpiCard:{background:T.card,borderRadius:16,padding:'1rem 1.1rem',boxShadow:'0 1px 4px rgba(0,0,0,0.03)',border:'0.5px solid rgba(212,201,184,0.4)'},
  mini:{background:T.bg,borderRadius:12,padding:10,textAlign:'center'},
  div:{margin:'32px 0'},
  lbl:{color:T.mu,fontSize:9,textTransform:'uppercase',letterSpacing:'2px',marginBottom:6,fontFamily:T.sa,fontWeight:500},
  bigNum:{fontFamily:T.se,fontWeight:400,letterSpacing:'-0.3px',lineHeight:1},
  mono:{fontFamily:T.mo,fontSize:12,color:T.mu},
  moB:{fontFamily:T.mo,fontWeight:700,fontSize:12},
  row:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:`0.5px solid rgba(212,201,184,0.3)`},
};

const CO={responsive:true,maintainAspectRatio:false,animation:{duration:1000,easing:'easeOutQuart'},
  plugins:{legend:{display:false},tooltip:{backgroundColor:'#FFF',titleColor:T.ch,bodyColor:T.mu,borderColor:T.dv,borderWidth:1,displayColors:false,cornerRadius:8,padding:10,titleFont:{family:'system-ui',size:11},bodyFont:{family:"'Courier New', monospace",size:11},callbacks:{label:c=>`$${c.raw?.toLocaleString()}`}}},
  scales:{x:{grid:{color:'rgba(212,201,184,0.2)',drawBorder:false},ticks:{font:{family:'system-ui',size:10},color:T.mu}},y:{grid:{color:'rgba(212,201,184,0.2)',drawBorder:false},ticks:{font:{family:'system-ui',size:10},color:T.mu,callback:v=>`$${(v/1000).toFixed(0)}K`}}},
};

// ─── Badge component ────────────────────────────────────────
function Badge({value,label}){
  if(!value)return label?<span style={{...S.mono,fontSize:10}}>{label}</span>:null;
  const isPos=value.startsWith('+');const isNeg=value.startsWith('-');
  const bg=isPos?'rgba(46,125,50,0.08)':isNeg?'rgba(183,28,28,0.08)':'rgba(140,126,111,0.08)';
  const color=isPos?T.gr:isNeg?T.rd:T.mu;
  return <span style={{fontFamily:T.mo,fontSize:11,color,background:bg,padding:'2px 8px',borderRadius:6,whiteSpace:'nowrap'}}>{value}{label?<span style={{color:T.mu,fontSize:9}}> {label}</span>:null}</span>;
}

function Leg({items}){return <div style={{display:'flex',justifyContent:'center',gap:16,marginTop:12,flexWrap:'wrap'}}>{items.map((it,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:it.dashed?12:10,height:3,borderRadius:2,background:it.dashed?'transparent':it.color,...(it.dashed?{borderTop:`2px dashed ${it.color}`}:{})}}/><span style={{fontSize:10,color:T.mu,fontFamily:T.sa}}>{it.label}</span></div>)}</div>}

// ─── Error Boundary ─────────────────────────────────────────
class ErrorBoundary extends React.Component{
  constructor(p){super(p);this.state={error:null}}
  static getDerivedStateFromError(e){return{error:e}}
  render(){if(this.state.error)return <div style={{...S.card,borderColor:T.rd,margin:16}}><div style={{...S.lbl,color:T.rd}}>ERROR</div><pre style={{fontSize:11,color:T.rd,fontFamily:T.mo,whiteSpace:'pre-wrap',margin:'8px 0'}}>{this.state.error?.message}</pre></div>;return this.props.children}
}

// ─── Login ──────────────────────────────────────────────────
function LoginScreen({onLogin}){
  const [user,setUser]=useState('');const [pw,setPw]=useState('');const [ld,setLd]=useState(false);const [err,setErr]=useState('');
  async function go(e){e.preventDefault();setLd(true);setErr('');const email=user.includes('@')?user:`${user.toLowerCase()}@futuros.app`;const{data,error}=await supabase.auth.signInWithPassword({email,password:pw});if(error){setErr('Credenciales incorrectas');setLd(false);return}onLogin(data.session)}
  const inp={width:'100%',padding:'12px 16px',borderRadius:12,border:'0.5px solid rgba(212,201,184,0.4)',background:T.card,color:T.ch,fontSize:13,fontFamily:T.sa,boxSizing:'border-box'};
  return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:T.bg}}>
    <div className="fade-up" style={{width:'100%',maxWidth:360}}>
      <div style={{textAlign:'center',marginBottom:48}}>
        <div style={{width:52,height:52,background:T.gold,borderRadius:16,display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:16}}><span style={{color:'#FFF',fontSize:22,fontWeight:400,fontFamily:T.se}}>F</span></div>
        <h1 style={{fontSize:18,fontWeight:400,color:T.ch,fontFamily:T.se,margin:0,letterSpacing:'-0.3px'}}>Futuros Socios</h1>
        <p style={{color:T.mu,fontSize:11,marginTop:6,fontFamily:T.sa,letterSpacing:'1px'}}>DASHBOARD DE INVERSION</p>
      </div>
      <form onSubmit={go} style={{display:'flex',flexDirection:'column',gap:12}}>
        <input type="text" placeholder="Usuario" value={user} onChange={e=>setUser(e.target.value)} style={inp} required autoCapitalize="none" autoCorrect="off"/>
        <input type="password" placeholder="Contrasena" value={pw} onChange={e=>setPw(e.target.value)} style={inp} required/>
        {err&&<p style={{color:T.rd,fontSize:12,textAlign:'center',margin:0}}>{err}</p>}
        <button type="submit" disabled={ld} style={{width:'100%',padding:13,borderRadius:12,border:'none',background:T.gold,color:'#FFF',fontSize:11,fontWeight:600,fontFamily:T.sa,cursor:'pointer',letterSpacing:'1.5px',textTransform:'uppercase',opacity:ld?.5:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:`all 0.3s ${ease}`}}>{ld?<Loader2 size={14} className="animate-spin"/>:'ENTRAR'}</button>
      </form>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// TAB 1 — EL COMPLEJO
// ═══════════════════════════════════════════════════════════════
function TabComplejo({data}){
  const {bookings,courts,historicalSales,payments,exchangeRate}=data;
  const now=new Date(),cy=now.getFullYear(),cm=now.getMonth()+1,today=now.toISOString().slice(0,10),dom=now.getDate();
  const yb=useMemo(()=>bookings.filter(b=>b.date?.startsWith(String(cy))&&b.date<=today&&b.activity_type!=='blocked'),[bookings,cy,today]);

  // Monthly revenue: HS where available, bookings otherwise
  const mr=useMemo(()=>{const m=Array(12).fill(0);const hs=new Set();(historicalSales||[]).filter(s=>s.sale_date?.startsWith(String(cy))).forEach(s=>{const mo=gm(s.sale_date);if(mo){m[mo-1]+=(s.total_ref||0);hs.add(mo)}});yb.forEach(b=>{const mo=gm(b.date);if(mo&&!hs.has(mo))m[mo-1]+=(b.price_eur||0)});return m},[yb,historicalSales,cy]);
  const pmr=useMemo(()=>{const m=Array(12).fill(0);(historicalSales||[]).filter(s=>s.sale_date?.startsWith(String(cy-1))).forEach(s=>{const mo=gm(s.sale_date);if(mo)m[mo-1]+=(s.total_ref||0)});return m},[historicalSales,cy]);
  const tmr=mr[cm-1]||0;const tr=useMemo(()=>mr.reduce((s,v)=>s+v,0),[mr]);

  // Fair comparisons
  const prevMonthSameDay=useMemo(()=>{const pm=cm>1?cm-1:12,pmY=cm>1?cy:cy-1;let t=0;(historicalSales||[]).filter(s=>{if(!s.sale_date)return false;const y=parseInt(s.sale_date.substring(0,4)),m=gm(s.sale_date),d=gd(s.sale_date);return y===pmY&&m===pm&&d<=dom}).forEach(s=>t+=(s.total_ref||0));const pmStr=`${pmY}-${String(pm).padStart(2,'0')}`;bookings.filter(b=>b.date?.startsWith(pmStr)&&gd(b.date)<=dom&&b.activity_type!=='blocked').forEach(b=>t+=(b.price_eur||0));return t},[historicalSales,bookings,cy,cm,dom]);
  const sameMonthLY=useMemo(()=>{let t=0;(historicalSales||[]).filter(s=>{if(!s.sale_date)return false;const y=parseInt(s.sale_date.substring(0,4)),m=gm(s.sale_date),d=gd(s.sale_date);return y===cy-1&&m===cm&&d<=dom}).forEach(s=>t+=(s.total_ref||0));return t},[historicalSales,cy,cm,dom]);
  const momG=pctOf(tmr,prevMonthSameDay);const yoyMG=pctOf(tmr,sameMonthLY);
  const daysInMonth=new Date(cy,cm,0).getDate();const projMonth=dom>0?Math.round(tmr/dom*daysInMonth):0;
  const pySameYTD=useMemo(()=>(historicalSales||[]).filter(s=>s.sale_date?.startsWith(String(cy-1))&&s.sale_date<=`${cy-1}${today.substring(4)}`).reduce((s,r)=>s+(r.total_ref||0),0),[historicalSales,cy,today]);
  const yoyG=pctOf(tr,pySameYTD);

  // Occupancy
  const tmH=useMemo(()=>yb.filter(b=>gm(b.date)===cm).reduce((s,b)=>s+(b.duration||0),0),[yb,cm]);
  const pmHSD=useMemo(()=>{const pm=cm>1?cm-1:12;return yb.filter(b=>{const m=gm(b.date),d=gd(b.date);return m===pm&&d<=dom}).reduce((s,b)=>s+(b.duration||0),0)},[yb,cm,dom]);
  const occG=pctOf(tmH,pmHSD);
  const daysElapsed=Math.floor((now.getTime()-new Date(cy,0,1).getTime())/86400000)+1;const availPerCourt=daysElapsed*14;

  // Week
  const dow=now.getDay()||7;const ws=new Date(now);ws.setDate(now.getDate()-dow+1);const lws=new Date(ws);lws.setDate(lws.getDate()-7);
  const twb=yb.filter(b=>b.date>=ws.toISOString().slice(0,10)&&b.date<=today).length;
  const lwEnd=new Date(lws);lwEnd.setDate(lws.getDate()+dow-1);
  const lwb=yb.filter(b=>b.date>=lws.toISOString().slice(0,10)&&b.date<=lwEnd.toISOString().slice(0,10)).length;
  const wG=pctOf(twb,lwb);

  // Birthdays
  const bdm=useMemo(()=>{const m=Array(12).fill(0);yb.filter(b=>b.activity_type==='cumpleanos').forEach(b=>{const mo=gm(b.date);if(mo)m[mo-1]++});(historicalSales||[]).filter(s=>s.sale_date?.startsWith(String(cy))&&s.activity_type==='cumpleanos').forEach(s=>{const mo=gm(s.sale_date);if(mo)m[mo-1]++});return m},[yb,historicalSales,cy]);
  const tbd=bdm.reduce((a,b)=>a+b,0);const tmBd=bdm[cm-1]||0;const lmBd=cm>1?(bdm[cm-2]||0):0;

  // Court occupancy + types
  const ch=useMemo(()=>{const map={};(courts||[]).forEach(c=>{map[c.id]={name:c.name,type:c.type,hours:0}});yb.forEach(b=>(b.court_ids||[]).forEach(cid=>{if(map[cid])map[cid].hours+=(b.duration||0)}));return Object.values(map).sort((a,b)=>b.hours-a.hours)},[yb,courts]);
  const typeBreakdown=useMemo(()=>{const map={};yb.forEach(b=>{const t=b.type||'otro';map[t]=(map[t]||0)+(b.price_eur||0)});return Object.entries(map).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])},[yb]);
  const typeColors={F7:T.gold,F11:T.gd,F5:T.dv,F5T:'#A89A8A'};
  const pyRev=useMemo(()=>(historicalSales||[]).filter(s=>s.sale_date?.startsWith(String(cy-1))).reduce((s,r)=>s+(r.total_ref||0),0),[historicalSales,cy]);
  const pyTypeMap=useMemo(()=>{const map={};(historicalSales||[]).filter(s=>s.sale_date?.startsWith(String(cy-1))).forEach(s=>{const t=s.court_type||'otro';map[t]=(map[t]||0)+(s.total_ref||0)});return map},[historicalSales,cy]);

  // Activity
  const ab=useMemo(()=>{const m={};yb.forEach(b=>{const t=b.activity_type||'otro';m[t]=(m[t]||0)+(b.price_eur||0)});return m},[yb]);
  const abT=Object.values(ab).reduce((s,v)=>s+v,0);
  const aLbl={alquiler:'Alquiler',cumpleanos:'Cumpleanos',academia:'Academia',torneo:'Torneo',evento:'Evento',otro:'Otro'};
  const aClr=['#B8963E','#3D2B1F','#D4C9B8','#8B6914','#8C7E6F','#A89A8A'];

  // Historical
  const rev24=useMemo(()=>(historicalSales||[]).filter(s=>s.sale_date?.startsWith('2024')).reduce((s,r)=>s+(r.total_ref||0),0),[historicalSales]);
  const rev25=pyRev,rev26=tr;const proj26=cm>0?Math.round(rev26/cm*12):0;

  // Payments
  const py26=useMemo(()=>{const ids=new Set(yb.map(b=>b.id));return(payments||[]).filter(p=>ids.has(p.booking_id))},[payments,yb]);
  const payByMethod=useMemo(()=>{const eur={amt:0,cnt:0},usd={amt:0,cnt:0},bs={amt:0,cnt:0};py26.forEach(p=>{const m=p.method||'';if(m==='pago_movil'||m==='cash_bs'){bs.amt+=(p.amount_eur||0);bs.cnt++}else if(m==='cash_usd'||m==='zelle'){usd.amt+=(p.amount_eur||0);usd.cnt++}else{eur.amt+=(p.amount_eur||0);eur.cnt++}});return{eur,usd,bs,tot:eur.amt+usd.amt+bs.amt}},[py26]);

  // Top clients
  const topClients=useMemo(()=>{const map={};yb.forEach(b=>{const n=b.client_name||'Sin nombre';if(!map[n])map[n]={name:n,rev:0,cnt:0};map[n].rev+=(b.price_eur||0);map[n].cnt++});const sorted=Object.values(map).sort((a,b)=>b.rev-a.rev);const top6=sorted.slice(0,6);const otros=sorted.slice(6);const os=otros.reduce((s,c)=>s+c.rev,0),oc=otros.reduce((s,c)=>s+c.cnt,0);if(os>0)top6.push({name:'Otros',rev:os,cnt:oc});return top6},[yb]);
  const tcTotal=topClients.reduce((s,c)=>s+c.rev,0);
  const tcClr=['#8B6914','#B8963E','#C4A95A','#D4C9B8','#DDD5C6','#E5DED2','#EDE8DF'];
  const uniqueClients=useMemo(()=>new Set(yb.map(b=>b.client_name).filter(Boolean)).size,[yb]);
  const allCS=useMemo(()=>{const map={};yb.forEach(b=>{const n=b.client_name||'X';if(!map[n])map[n]={rev:0};map[n].rev+=(b.price_eur||0)});return Object.values(map).sort((a,b)=>b.rev-a.rev)},[yb]);
  const top3p=tcTotal>0?allCS.slice(0,3).reduce((s,c)=>s+c.rev,0)/tcTotal*100:0;
  const top5p=tcTotal>0?allCS.slice(0,5).reduce((s,c)=>s+c.rev,0)/tcTotal*100:0;
  const top10p=tcTotal>0?allCS.slice(0,10).reduce((s,c)=>s+c.rev,0)/tcTotal*100:0;

  const momLabel=MO[cm>1?cm-2:11].toLowerCase();

  return <div>
    {/* KPIs Row 1 */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
      {[
        {label:`INGRESOS ${MO[cm-1].toUpperCase()}`,value:fmt(tmr),badges:[momG!=null?{v:cmpStr(momG),l:`vs ${momLabel} (d${dom})`}:null,yoyMG!=null?{v:cmpStr(yoyMG),l:`vs ${MO[cm-1].toLowerCase()} ${cy-1}`}:null].filter(Boolean),sub:`${dom} dias · ~${fmt(projMonth)} proy.`},
        {label:'INGRESOS YTD',value:fmt(tr),badges:[yoyG!=null?{v:cmpStr(yoyG),l:`vs ${cy-1}`}:null].filter(Boolean),sub:`ene — ${MO[cm-1].toLowerCase()} ${dom}`},
        {label:'TASA BCV',value:exchangeRate?`Bs ${Number(exchangeRate.eurRate).toLocaleString('es-VE',{maximumFractionDigits:0})}`:'—',badges:[],sub:'Bs por REF',color:T.ch},
        {label:`OCUPACION ${MO[cm-1].toUpperCase()}`,value:`${tmH}h`,badges:[occG!=null?{v:cmpStr(occG),l:`vs ${momLabel} (d${dom})`}:null].filter(Boolean),sub:`${dom} dias`,color:T.ch},
      ].map((k,i)=><div key={i} className="kpi-card card-hover" style={S.kpiCard}>
        <div style={S.lbl}>{k.label}</div>
        <div style={{...S.bigNum,fontSize:24,color:k.color||T.ch,marginTop:4}}>{k.value}</div>
        <div style={{marginTop:8,display:'flex',flexWrap:'wrap',gap:4}}>{k.badges.map((b,j)=><Badge key={j} value={b.v} label={b.l}/>)}</div>
        <div style={{...S.mono,fontSize:10,marginTop:4}}>{k.sub}</div>
      </div>)}
    </div>

    {/* KPIs Row 2 */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginTop:12}}>
      {[
        {label:'RESERVAS SEMANA',value:twb.toString(),badges:[wG!=null?{v:cmpStr(wG),l:`vs sem. ant. (${dow}d)`}:null].filter(Boolean)},
        {label:'CUMPLEANOS YTD',value:tbd.toString(),badges:[],sub:`${(cm>0?tbd/cm:0).toFixed(1)}/mes`},
        {label:`CUMPLEANOS ${MO[cm-1].toUpperCase()}`,value:tmBd.toString(),badges:[{v:`${tmBd-lmBd>=0?'+':''}${tmBd-lmBd}`,l:`vs ${momLabel}`}],sub:null},
      ].map((k,i)=><div key={i} className="kpi-card card-hover" style={S.kpiCard}>
        <div style={S.lbl}>{k.label}</div>
        <div style={{...S.bigNum,fontSize:24,color:T.ch,marginTop:4}}>{k.value}</div>
        {k.badges.length>0&&<div style={{marginTop:8,display:'flex',flexWrap:'wrap',gap:4}}>{k.badges.map((b,j)=><Badge key={j} value={b?.v} label={b?.l}/>)}</div>}
        {k.sub&&<div style={{...S.mono,fontSize:10,marginTop:4}}>{k.sub}</div>}
      </div>)}
    </div>

    {/* F7 vs F5 */}
    <div style={S.div}/>
    <div className="section-enter card-hover" style={S.card}>
      <div style={S.lbl}>DISTRIBUCION POR TIPO — {cy}</div>
      {typeBreakdown.map(([type,rev],i)=>{const pct=tr>0?rev/tr*100:0;const py=pyRev>0&&pyTypeMap[type]?(pyTypeMap[type]/pyRev*100):null;
        return <div key={type} style={{marginTop:i>0?14:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
            <span style={{fontSize:12,fontFamily:T.sa,fontWeight:600,color:T.ch}}>{type}</span>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={S.moB}>{fmt(rev)}</span>
              <span style={{...S.mono,fontSize:10}}>({fmtPct(pct)})</span>
              {py!=null&&<span style={{...S.mono,fontSize:9}}>vs {fmtPct(py)} en {cy-1}</span>}
            </div>
          </div>
          <div style={{background:'rgba(212,201,184,0.35)',borderRadius:6,height:6,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:typeColors[type]||T.mu,borderRadius:6}}/></div>
        </div>
      })}
    </div>

    {/* Tendencia Mensual */}
    <div style={S.div}/>
    <div className="section-enter card-hover" style={S.card}>
      <div style={S.lbl}>TENDENCIA MENSUAL — {cy-1} VS {cy}</div>
      <div style={{height:200,marginTop:16}}>
        <Bar data={{labels:MO,datasets:[{label:String(cy-1),data:pmr,backgroundColor:T.dv,borderRadius:10,borderSkipped:false,barPercentage:0.8,categoryPercentage:0.7},{label:String(cy),data:mr.map((v,i)=>i<cm?v:null),backgroundColor:T.gold,borderRadius:10,borderSkipped:false,barPercentage:0.8,categoryPercentage:0.7}]}} options={CO}/>
      </div>
      <Leg items={[{label:String(cy-1),color:T.dv},{label:String(cy),color:T.gold}]}/>
    </div>

    {/* Rendimiento Historico */}
    <div style={S.div}/>
    <div className="section-enter card-hover" style={S.card}>
      <div style={S.lbl}>RENDIMIENTO HISTORICO</div>
      <div style={{height:180,marginTop:16}}>
        <Bar data={{labels:['2024','2025',`2026 YTD`],datasets:[{data:[rev24,rev25,rev26],backgroundColor:[T.dv,T.gold,T.gd],borderRadius:10,borderSkipped:false,barThickness:60}]}} options={CO}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',marginTop:16}}>
        {[{y:'2024',v:rev24},{y:'2025',v:rev25},{y:'2026 YTD',v:rev26}].map((r,i)=><div key={i} style={{textAlign:'center'}}><div style={S.moB}>{fmt(r.v)}</div><div style={{fontSize:10,color:T.mu,marginTop:2,fontFamily:T.sa}}>{r.y}</div></div>)}
      </div>
      <div style={{...S.mono,textAlign:'center',marginTop:10,fontSize:10}}>Proyeccion {cy}: ~{fmt(proj26)}</div>
    </div>

    {/* Revenue Mix */}
    <div style={S.div}/>
    <div className="section-enter card-hover" style={S.card}>
      <div style={S.lbl}>TIPO DE ACTIVIDAD</div>
      <div style={{display:'flex',alignItems:'center',gap:24,marginTop:16}}>
        <div style={{width:120,height:120}}>
          <Doughnut data={{labels:Object.keys(ab).map(k=>aLbl[k]||k),datasets:[{data:Object.values(ab),backgroundColor:aClr.slice(0,Object.keys(ab).length),borderWidth:0}]}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:false}},cutout:'72%'}}/>
        </div>
        <div style={{flex:1}}>{Object.entries(ab).sort((a,b)=>b[1]-a[1]).map(([k,v],i)=><div key={k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><div style={{width:8,height:8,borderRadius:4,background:aClr[i],flexShrink:0}}/><span style={{flex:1,fontSize:11,color:T.ch,fontFamily:T.sa}}>{aLbl[k]||k}</span><span style={S.moB}>{fmt(v)}</span><span style={{...S.mono,fontSize:10,minWidth:36,textAlign:'right'}}>{abT>0?fmtPct(v/abT*100):'0%'}</span></div>)}</div>
      </div>
    </div>

    <div style={S.div}/>
    <div className="section-enter card-hover" style={S.card}>
      <div style={S.lbl}>DISTRIBUCION POR TIPO DE PAGO — {cy}</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginTop:16}}>
        {[{label:'REF',amt:payByMethod.eur.amt,cnt:payByMethod.eur.cnt,color:T.gold},{label:'USD',amt:payByMethod.usd.amt,cnt:payByMethod.usd.cnt,color:T.gd},{label:'Bolivares',amt:payByMethod.bs.amt,cnt:payByMethod.bs.cnt,color:T.dv}].map((p,i)=><div key={i} style={S.mini}><div style={{...S.lbl,fontSize:8,marginBottom:8}}>{p.label}</div><div style={{...S.bigNum,fontSize:18,color:p.color}}>{fmt(p.amt)}</div><div style={{...S.mono,fontSize:9,marginTop:4}}>{p.cnt} pagos · {payByMethod.tot>0?fmtPct(p.amt/payByMethod.tot*100):'0%'}</div></div>)}
      </div>
    </div>

    {/* Top Clientes */}
    <div style={S.div}/>
    <div className="section-enter card-hover" style={S.card}>
      <div style={S.lbl}>TOP CLIENTES — {cy}</div>
      <div style={{display:'flex',alignItems:'center',gap:24,marginTop:16}}>
        <div style={{width:130,height:130,position:'relative',flexShrink:0}}>
          <Doughnut data={{labels:topClients.map(c=>c.name),datasets:[{data:topClients.map(c=>c.rev),backgroundColor:tcClr.slice(0,topClients.length),borderWidth:0}]}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:false}},cutout:'72%'}}/>
          <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center'}}><div style={{...S.bigNum,fontSize:14,color:T.ch}}>{fmt(tcTotal)}</div><div style={{fontSize:8,color:T.mu,fontFamily:T.sa}}>YTD</div></div>
        </div>
        <div style={{flex:1}}>{topClients.map((c,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}><div style={{width:7,height:7,borderRadius:4,background:tcClr[i],flexShrink:0}}/><span style={{flex:1,fontSize:10,color:T.ch,fontFamily:T.sa,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</span><span style={{...S.moB,fontSize:10}}>{fmt(c.rev)}</span><span style={{...S.mono,fontSize:9,minWidth:28,textAlign:'right'}}>{tcTotal>0?fmtPct(c.rev/tcTotal*100):'0%'}</span></div>)}</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginTop:16}}>
        {[{l:'Top 3',v:fmtPct(top3p)},{l:'Top 5',v:fmtPct(top5p)},{l:'Top 10',v:fmtPct(top10p)},{l:'Unicos',v:uniqueClients}].map((c,i)=><div key={i} style={S.mini}><div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'1px',color:T.mu,fontFamily:T.sa}}>{c.l}</div><div style={{...S.bigNum,fontSize:14,color:T.ch,marginTop:4}}>{c.v}</div></div>)}
      </div>
    </div>

    {/* Diagnostico */}
    <div style={S.div}/>
    <div className="section-enter card-hover" style={S.card}>
      <div style={S.lbl}>OCUPACION POR CANCHA — {cy}</div>
      <div style={{marginTop:16}}>{ch.map((c,i)=>{const mx=ch[0]?.hours||1;const occ=availPerCourt>0?(c.hours/availPerCourt*100):0;return <div key={i} style={{marginBottom:14}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:12,fontFamily:T.sa,color:T.ch}}>{c.name} <span style={{color:T.mu}}>({c.type})</span></span><div><span style={S.moB}>{c.hours}h</span><span style={{...S.mono,fontSize:10,marginLeft:6}}>({fmtPct(occ)})</span></div></div><div style={{background:'rgba(212,201,184,0.35)',borderRadius:6,height:8,overflow:'hidden'}}><div style={{width:`${(c.hours/mx)*100}%`,height:'100%',borderRadius:6,background:c.type==='F7'?T.gold:T.dv,transition:`width 0.8s ${ease}`}}/></div></div>})}</div>
    </div>

    <div style={S.div}/>
    <div className="section-enter card-hover" style={S.card}>
      <div style={S.lbl}>CUMPLEANOS POR MES — {cy}</div>
      <div style={{height:160,marginTop:16}}>
        <Bar data={{labels:MO,datasets:[{type:'line',label:'Prom 2025',data:Array(12).fill(10),borderColor:'#B71C1C55',borderDash:[4,4],borderWidth:1.5,pointRadius:0,fill:false,order:0},{label:String(cy),data:bdm,backgroundColor:T.brn,borderRadius:10,borderSkipped:false,barThickness:14,order:1}]}} options={{...CO,scales:{...CO.scales,y:{...CO.scales.y,ticks:{...CO.scales.y.ticks,stepSize:2,callback:v=>v}}}}}/>
      </div>
      <Leg items={[{label:String(cy),color:T.brn},{label:'Prom. 2025',color:T.rd,dashed:true}]}/>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// TAB 2 — MI PARTICIPACION
// ═══════════════════════════════════════════════════════════════
function TabParticipacion({data,partnerKey}){
  const {dividends,roi,totales}=data;
  const now=new Date(),cy=now.getFullYear(),cm=now.getMonth()+1;const pk=partnerKey;
  const myRoi=roi?.[pk]||{};const myTot=totales?.[pk]||{};
  const inv=myRoi.montoInvertido||0;const pct=myRoi.participacion||0;
  const allDivs=[...(dividends[2024]||[]),...(dividends[2025]||[]),...(dividends[2026]||[])];
  const totalDiv=myRoi.dividendosRecibidos||allDivs.reduce((s,d)=>s+pAmt(d,pk),0);
  const roiPct=myRoi.roiPct||(inv>0?(totalDiv/inv*100):0);
  const pbPct=inv>0?Math.min(100,(totalDiv/inv)*100):0;
  const ytdDiv=(dividends[cy]||[]).reduce((s,d)=>s+pAmt(d,pk),0);
  const pySame=(dividends[cy-1]||[]).filter(d=>{const m=gm(d.fecha);return m&&m<=cm}).reduce((s,d)=>s+pAmt(d,pk),0);
  const ytdG=pctOf(ytdDiv,pySame);
  const mwD=new Set((dividends[cy]||[]).filter(d=>pAmt(d,pk)>0).map(d=>gm(d.fecha)).filter(Boolean)).size;
  const avgM=mwD>0?ytdDiv/mwD:0;const rem=inv-totalDiv;
  const mtpb=myRoi.mesesRestantes||(avgM>0?Math.ceil(Math.max(0,rem)/avgM):null);
  const mDiv=useMemo(()=>{const m=Array(12).fill(0);(dividends[cy]||[]).forEach(d=>{const mo=gm(d.fecha);if(mo)m[mo-1]+=pAmt(d,pk)});return m},[dividends,cy,pk]);
  const mDiv25=useMemo(()=>{const m=Array(12).fill(0);(dividends[cy-1]||[]).forEach(d=>{const mo=gm(d.fecha);if(mo)m[mo-1]+=pAmt(d,pk)});return m},[dividends,cy,pk]);
  const yTot=[myTot.total2024||(dividends[2024]||[]).reduce((s,d)=>s+pAmt(d,pk),0),myTot.total2025||(dividends[2025]||[]).reduce((s,d)=>s+pAmt(d,pk),0),myTot.total2026||(dividends[2026]||[]).reduce((s,d)=>s+pAmt(d,pk),0)];
  const mBreak=useMemo(()=>{const map={};(dividends[cy]||[]).forEach(d=>{const m=gm(d.fecha);const a=pAmt(d,pk);if(m&&a>0){if(!map[m])map[m]={month:m,amt:0,cnt:0};map[m].amt+=a;map[m].cnt++}});return Object.values(map).sort((a,b)=>a.month-b.month)},[dividends,cy,pk]);
  const bestMo=mBreak.length>0?mBreak.reduce((a,b)=>b.amt>a.amt?b:a):null;
  const divUsd=allDivs.filter(d=>d.divisa==='SI').reduce((s,d)=>s+pAmt(d,pk),0);
  const divBs=allDivs.filter(d=>d.divisa!=='SI').reduce((s,d)=>s+pAmt(d,pk),0);const divT=divUsd+divBs;

  return <div>
    {/* Hero ROI */}
    <div className="fade-up card-hover" style={{...S.card,borderLeft:`4px solid ${T.gold}`}}>
      <div style={S.lbl}>ROI — MI PARTICIPACION</div>
      <div style={{...S.bigNum,fontSize:36,color:T.gold,marginTop:8}}>{fmtPct(roiPct)}</div>
      <div style={{...S.mono,marginTop:8}}>{fmt(totalDiv)} de {fmt(inv)}</div>
      {/* Progress bar */}
      {inv>0&&<div style={{marginTop:16}}>
        <div style={{height:6,background:'rgba(212,201,184,0.35)',borderRadius:6,overflow:'hidden'}}>
          <div className="bar-grow" style={{width:`${pbPct}%`,height:6,background:`linear-gradient(90deg, ${T.gd}, ${T.gold}, ${T.goldLight})`,borderRadius:6}}/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><span style={{...S.mono,fontSize:10}}>$0</span><span style={{...S.mono,fontSize:10}}>{fmt(inv)}</span></div>
      </div>}
    </div>

    {/* KPIs */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginTop:12}}>
      {[{l:fmtPct(pct),s:'Participacion'},{l:fmt(inv),s:'Invertido'},{l:fmt(totalDiv),s:'Recibido'},{l:rem>0?`-${fmt(rem)}`:`+${fmt(Math.abs(rem))}`,s:'Neto',c:rem>0?T.rd:T.gr}].map((k,i)=><div key={i} className="kpi-card card-hover" style={S.kpiCard}><div style={S.lbl}>{k.s}</div><div style={{...S.bigNum,fontSize:20,color:k.c||T.ch,marginTop:4}}>{k.l}</div></div>)}
    </div>

    {inv>0&&<div style={{...S.mono,marginTop:12,textAlign:'center'}}>~{mtpb||'—'} meses restantes al ritmo actual ({fmt(avgM)}/mes)</div>}

    {/* Dividendos YTD + Promedio */}
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:20}}>
      <div className="card-hover" style={S.kpiCard}><div style={S.lbl}>DIVIDENDOS {cy}</div><div style={{...S.bigNum,fontSize:22,color:T.ch,marginTop:4}}>{fmt(ytdDiv)}</div>{ytdG!=null&&<div style={{marginTop:6}}><Badge value={cmpStr(ytdG)} label={`vs ${cy-1}`}/></div>}</div>
      <div className="card-hover" style={S.kpiCard}><div style={S.lbl}>PROMEDIO/MES</div><div style={{...S.bigNum,fontSize:22,color:T.ch,marginTop:4}}>{fmt(avgM)}</div><div style={{...S.mono,fontSize:10,marginTop:6}}>{mwD} meses con pagos</div></div>
    </div>

    {/* Desglose Mensual */}
    <div style={S.div}/>
    <div className="section-enter card-hover" style={S.card}>
      <div style={S.lbl}>DESGLOSE MENSUAL {cy}</div>
      <div style={{marginTop:12}}>{mBreak.map((mb,i)=><div key={i} style={{...S.row,borderBottom:i<mBreak.length-1?`0.5px solid rgba(212,201,184,0.3)`:'none'}}><span style={{fontSize:12,fontFamily:T.sa,color:T.ch}}>{MO[mb.month-1]} <span style={{color:T.mu}}>({mb.cnt} pagos)</span></span><span style={{...S.moB,color:bestMo&&mb.month===bestMo.month?T.gr:T.ch}}>{fmt(mb.amt)}</span></div>)}
        <div style={{borderTop:`1px solid ${T.dv}`,marginTop:10,paddingTop:10,display:'flex',justifyContent:'space-between'}}><span style={{fontSize:12,fontWeight:700,fontFamily:T.sa,color:T.ch}}>Total {cy} YTD</span><span style={{...S.moB,fontSize:14}}>{fmt(ytdDiv)}</span></div>
      </div>
    </div>

    {/* Dividends YoY Chart */}
    <div style={S.div}/>
    <div className="section-enter card-hover" style={S.card}>
      <div style={S.lbl}>MIS DIVIDENDOS — {cy-1} VS {cy}</div>
      <div style={{height:200,marginTop:16}}>
        <Bar data={{labels:MO,datasets:[{label:String(cy-1),data:mDiv25,backgroundColor:T.dv,borderRadius:10,borderSkipped:false,barPercentage:0.8,categoryPercentage:0.7},{label:String(cy),data:mDiv.map((v,i)=>i<cm?v:null),backgroundColor:T.gold,borderRadius:10,borderSkipped:false,barPercentage:0.8,categoryPercentage:0.7}]}} options={{...CO,scales:{...CO.scales,y:{...CO.scales.y,ticks:{...CO.scales.y.ticks,callback:v=>`$${v.toLocaleString()}`}}}}}/>
      </div>
      <Leg items={[{label:String(cy-1),color:T.dv},{label:String(cy),color:T.gold}]}/>
    </div>

    {/* Comparacion Anual */}
    <div style={S.div}/>
    <div className="section-enter card-hover" style={S.card}>
      <div style={S.lbl}>COMPARACION ANUAL</div>
      <div style={{height:180,marginTop:16}}>
        <Bar data={{labels:['2024','2025','2026 YTD'],datasets:[{data:yTot,backgroundColor:[T.dv,T.gold,T.gd],borderRadius:10,borderSkipped:false,barThickness:60}]}} options={CO}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',marginTop:16}}>{['2024','2025','2026 YTD'].map((y,i)=><div key={y} style={{textAlign:'center'}}><div style={S.moB}>{fmt(yTot[i])}</div><div style={{fontSize:10,color:T.mu,marginTop:2,fontFamily:T.sa}}>{y}</div></div>)}</div>
    </div>

    {/* Composicion Bs/USD */}
    <div style={S.div}/>
    <div className="section-enter card-hover" style={S.card}>
      <div style={S.lbl}>COMPOSICION DE DIVIDENDOS — {pk}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:16}}>
        <div style={S.mini}><div style={{...S.lbl,fontSize:8,marginBottom:8}}>BOLIVARES</div><div style={{...S.bigNum,fontSize:20,color:T.ch}}>{fmt(divBs)}</div><div style={{...S.mono,fontSize:10,marginTop:4}}>{divT>0?fmtPct(divBs/divT*100):'0%'}</div></div>
        <div style={S.mini}><div style={{...S.lbl,fontSize:8,marginBottom:8}}>USD CASH</div><div style={{...S.bigNum,fontSize:20,color:T.gd}}>{fmt(divUsd)}</div><div style={{...S.mono,fontSize:10,marginTop:4}}>{divT>0?fmtPct(divUsd/divT*100):'0%'}</div></div>
      </div>
      <div style={{...S.mono,fontSize:9,marginTop:8,textAlign:'center'}}>Clasificado por metodo de pago (2024-25: comentarios, 2026: columna DIVISA)</div>
    </div>

    {/* Ultimos Pagos */}
    <div style={S.div}/>
    <div className="section-enter card-hover" style={S.card}>
      <div style={S.lbl}>ULTIMOS PAGOS</div>
      <div style={{display:'flex',padding:'8px 0',borderBottom:`1px solid ${T.dv}`,marginTop:8}}><span style={{...S.lbl,flex:1,marginBottom:0}}>FECHA</span><span style={{...S.lbl,width:120,textAlign:'right',marginBottom:0}}>TOTAL</span><span style={{...S.lbl,width:36,textAlign:'center',marginBottom:0}}>DIV</span><span style={{...S.lbl,width:70,textAlign:'right',marginBottom:0}}>MI PARTE</span></div>
      {[...(dividends[cy]||[])].reverse().slice(0,10).map((d,i)=>{const myAmt=pAmt(d,pk);const isUsd=d.divisa==='SI';const totalEst=pct>0?Math.round(myAmt/(pct/100)):0;
        return <div key={i} style={{display:'flex',padding:'7px 0',borderBottom:`0.5px solid rgba(212,201,184,0.3)`,alignItems:'center'}}>
          <span style={{...S.mono,fontSize:11,flex:1}}>{d.fecha}</span>
          <span style={{...S.mono,fontSize:10,width:120,textAlign:'right'}}>{isUsd?fmt(d.montoTotal>0?d.montoTotal:totalEst):d.bolivares>0?`Bs ${Number(d.bolivares).toLocaleString('es-VE',{maximumFractionDigits:0})}`:fmt(totalEst)}</span>
          <span style={{fontSize:9,fontFamily:T.sa,color:isUsd?T.gd:T.mu,width:36,textAlign:'center',fontWeight:600}}>{isUsd?'USD':'Bs'}</span>
          <span style={{...S.moB,width:70,textAlign:'right'}}>{fmt(myAmt,2)}</span>
        </div>
      })}
    </div>

    {/* Resumen */}
    <div style={S.div}/>
    <div className="section-enter" style={S.card}>
      <div style={S.lbl}>RESUMEN</div>
      <p style={{fontSize:12,lineHeight:1.8,color:T.ch,fontFamily:T.sa,margin:'12px 0 0'}}>
        En {mwD} meses de {cy}, {pk} ha recibido <b style={{fontFamily:T.mo}}>{fmt(ytdDiv)}</b> en dividendos, a un promedio de <b style={{fontFamily:T.mo}}>{fmt(avgM)}</b>/mes.
        {bestMo&&<> El mejor mes fue <b>{MO[bestMo.month-1]}</b> con <b style={{fontFamily:T.mo}}>{fmt(bestMo.amt)}</b>.</>}
        {inv>0&&<> ROI acumulado: <b>{fmtPct(roiPct)}</b> sobre <b style={{fontFamily:T.mo}}>{fmt(inv)}</b>.</>}
        {mtpb!=null&&rem>0&&<> Payback estimado en ~<b>{mtpb} meses</b>.</>}
      </p>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// TAB 3 — PROYECCIONES
// ═══════════════════════════════════════════════════════════════
function TabProyecciones({data,partnerKey}){
  const {dividends,roi,bookings,courts,historicalSales}=data;
  const now=new Date(),cy=now.getFullYear(),cm=now.getMonth()+1;const pk=partnerKey;const myRoi=roi?.[pk]||{};const pct=myRoi.participacion||0;
  const inv=myRoi.montoInvertido||0;
  const tDiv=myRoi.dividendosRecibidos||[...(dividends[2024]||[]),...(dividends[2025]||[]),...(dividends[2026]||[])].reduce((s,d)=>s+pAmt(d,pk),0);
  const ytdDiv=(dividends[cy]||[]).reduce((s,d)=>s+pAmt(d,pk),0);
  const dM=new Set((dividends[cy]||[]).filter(d=>pAmt(d,pk)>0).map(d=>gm(d.fecha)).filter(Boolean)).size;
  const curM=dM>0?ytdDiv/dM:0;const rem=Math.max(0,inv-tDiv);
  const sc=[{name:'Conservador',monthly:Math.round(curM*0.7)||800,color:T.dv,desc:'Ritmo reducido'},{name:'Base',monthly:Math.round(curM)||1000,color:T.gold,desc:'Ritmo actual'},{name:'Optimista',monthly:Math.round(curM*1.4)||1500,color:T.gd,desc:'Con mejoras'}];
  const proj=sc.map(s=>({...s,roi1y:inv>0?((tDiv+s.monthly*12)/inv*100):0,roi2y:inv>0?((tDiv+s.monthly*24)/inv*100):0,roi3y:inv>0?((tDiv+s.monthly*36)/inv*100):0,pbM:rem>0&&s.monthly>0?Math.ceil(rem/s.monthly):0}));
  const r2y=rem>0?Math.ceil(rem/24):0,r3y=rem>0?Math.ceil(rem/36):0,r4y=rem>0?Math.ceil(rem/48):0;
  const mToEoy=12-cm;const roiE=inv>0?(tDiv+curM*mToEoy)/inv*100:0;const roiE1=inv>0?(tDiv+curM*(mToEoy+12))/inv*100:0;const roiE2=inv>0?(tDiv+curM*(mToEoy+24))/inv*100:0;
  const today=now.toISOString().slice(0,10);const yb=bookings.filter(b=>b.date?.startsWith(String(cy))&&b.date<=today&&b.activity_type!=='blocked');
  const annRev=cm>0?yb.reduce((s,b)=>s+(b.price_eur||0),0)/cm*12:0;const cVal=annRev*10;const myVal=cVal*pct/100;const unr=myVal-inv;
  const chMap={};(courts||[]).forEach(c=>{chMap[c.id]={name:c.name,type:c.type,hours:0}});yb.forEach(b=>(b.court_ids||[]).forEach(cid=>{if(chMap[cid])chMap[cid].hours+=(b.duration||0)}));
  const under=Object.values(chMap).sort((a,b)=>a.hours-b.hours).filter(c=>c.hours<60);
  const cBd=yb.filter(b=>b.activity_type==='cumpleanos').length+(historicalSales||[]).filter(s=>s.sale_date?.startsWith(String(cy))&&s.activity_type==='cumpleanos').length;const bdAvg=cm>0?cBd/cm:0;

  return <div>
    {/* Palancas */}
    <div className="fade-up card-hover" style={S.card}>
      <div style={S.lbl}>PALANCAS DE CRECIMIENTO</div>
      <div style={{marginTop:12}}>
        {[{t:'Mas Cumpleanos',d:`Actual: ${bdAvg.toFixed(1)}/mes. 2025: ~10/mes. Cada uno = ~REF 300-500.`},
          ...(under.length>0?[{t:'Activar Canchas Subutilizadas',d:`${under.map(c=>c.name).join(', ')} con <60h YTD.`}]:[]),
          {t:'Cobrar Pendientes',d:'Reducir morosidad mejora dividendos.'},
          {t:'Cantina + Eventos',d:'Ingresos adicionales al fondo distribuible.'}
        ].map((l,i,a)=><div key={i} style={{...S.row,borderBottom:i<a.length-1?'0.5px solid rgba(212,201,184,0.3)':'none'}}><div><div style={{fontSize:12,fontWeight:600,color:T.ch,fontFamily:T.sa}}>{l.t}</div><div style={{...S.mono,fontSize:10,marginTop:2}}>{l.d}</div></div></div>)}
      </div>
    </div>

    {inv>0&&<>
    {/* Scenarios — 3 column grid */}
    <div style={S.div}/>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
    {proj.map((s,i)=><div key={i} className="card-hover" style={{...S.card,padding:'1rem',borderLeft:`3px solid ${s.color}`,...(i===1?{border:`1.5px solid ${T.gold}`,borderLeft:`3px solid ${T.gold}`}:{})}}>
      <div style={{...S.lbl,fontSize:8,marginBottom:4}}>{s.name}</div>
      <div style={{...S.bigNum,fontSize:22,color:s.color}}>{fmt(s.monthly)}<span style={{...S.mono,fontSize:10,fontWeight:400}}>/mes</span></div>
      <div style={{...S.mono,fontSize:9,marginTop:2,marginBottom:12}}>{s.desc}</div>
      {[{l:'PAYBACK',v:s.pbM>0?`${s.pbM}m`:'Listo'},{l:'ROI 1A',v:fmtPct(s.roi1y)},{l:'ROI 2A',v:fmtPct(s.roi2y)},{l:'ROI 3A',v:fmtPct(s.roi3y)}].map((it,j)=><div key={j} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderTop:j===0?`0.5px solid rgba(212,201,184,0.3)`:'none'}}><span style={{fontSize:9,color:T.mu,fontFamily:T.sa,textTransform:'uppercase',letterSpacing:'1px'}}>{it.l}</span><span style={{...S.moB,fontSize:12}}>{it.v}</span></div>)}
    </div>)}
    </div>

    {/* Ritmos */}
    <div style={S.div}/>
    <div className="section-enter card-hover" style={S.card}>
      <div style={S.lbl}>RITMO NECESARIO PARA PAYBACK</div>
      <div style={{marginTop:12}}>{[{y:'2 anos',v:r2y},{y:'3 anos',v:r3y},{y:'4 anos',v:r4y}].map((r,i)=><div key={i} style={{...S.row,borderBottom:i<2?'0.5px solid rgba(212,201,184,0.3)':'none'}}><span style={{fontSize:12,fontFamily:T.sa,color:T.ch}}>Payback en {r.y}</span><span style={S.moB}>{fmt(r.v)}/mes</span></div>)}</div>
    </div>

    {/* ROI Proyectado */}
    <div style={S.div}/>
    <div className="section-enter card-hover" style={S.card}>
      <div style={S.lbl}>ROI PROYECTADO (AL RITMO ACTUAL)</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginTop:16}}>
        {[{y:`Dic ${cy}`,v:roiE},{y:`Dic ${cy+1}`,v:roiE1},{y:`Dic ${cy+2}`,v:roiE2}].map((r,i)=><div key={i} style={S.mini}><div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'1.5px',color:T.mu,fontFamily:T.sa,marginBottom:6}}>{r.y}</div><div style={{...S.bigNum,fontSize:20,color:T.gold}}>{fmtPct(r.v)}</div></div>)}
      </div>
    </div>

    {/* Valor */}
    <div style={S.div}/>
    <div className="section-enter card-hover" style={S.card}>
      <div style={S.lbl}>VALOR DE PARTICIPACION HOY</div>
      <div style={{marginTop:12}}>{[{l:'Inversion original',v:fmt(inv)},{l:'Dividendos recibidos',v:`+${fmt(tDiv)}`,c:T.gr},{l:'Valor estimado complejo (10x rev.)',v:fmt(cVal)},{l:`Tu ${fmtPct(pct)}`,v:fmt(myVal),b:true},{l:'Ganancia no realizada',v:unr>=0?`+${fmt(unr)}`:`-${fmt(Math.abs(unr))}`,c:unr>=0?T.gr:T.rd,b:true}].map((r,i)=><div key={i} style={{...S.row,borderBottom:i<4?'0.5px solid rgba(212,201,184,0.3)':'none'}}><span style={{fontSize:12,fontFamily:T.sa,color:T.ch}}>{r.l}</span><span style={{...S.moB,...(r.b?{fontSize:14}:{}),color:r.c||T.ch}}>{r.v}</span></div>)}</div>
    </div>
    </>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
export default function Home(){
  const [session,setSession]=useState(null);const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState(0);const [data,setData]=useState(null);
  const [dl,setDl]=useState(false);const [err,setErr]=useState('');
  const lastFetchRef=useRef(0);

  useEffect(()=>{supabase.auth.getSession().then(({data:{session:s}})=>{setSession(s);setLoading(false)});const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s));return()=>subscription.unsubscribe()},[]);
  const fetchData=useCallback(async(tk)=>{setDl(true);setErr('');try{const r=await fetch('/api/dashboard',{headers:{Authorization:`Bearer ${tk}`}});if(!r.ok)throw new Error('Error cargando datos');setData(await r.json());lastFetchRef.current=Date.now()}catch(e){setErr(e.message)}finally{setDl(false)}},[]);
  useEffect(()=>{if(session?.access_token)fetchData(session.access_token)},[session,fetchData]);

  // Auto-refresh on tab visibility: if >5min since last fetch, refetch
  useEffect(()=>{
    const onVisible=()=>{
      if(document.visibilityState==='visible' && session?.access_token){
        const elapsed=Date.now()-lastFetchRef.current;
        if(elapsed>5*60*1000) fetchData(session.access_token);
      }
    };
    document.addEventListener('visibilitychange',onVisible);
    return()=>document.removeEventListener('visibilitychange',onVisible);
  },[session,fetchData]);

  if(loading)return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:T.bg}}><Loader2 size={20} className="animate-spin" style={{color:T.gold}}/></div>;
  if(!session)return <LoginScreen onLogin={s=>setSession(s)}/>;

  const ue=data?.userEmail||session?.user?.email||'';const pk=PARTNER_MAP[ue]||'WISI';const pp=data?.roi?.[pk]?.participacion||0;
  const tabs=['EL COMPLEJO','MI PARTE','PROYECCIONES'];

  return <div style={{minHeight:'100vh',background:T.bg}}>
    <header style={{position:'sticky',top:0,zIndex:50,background:T.bg,borderBottom:'0.5px solid rgba(212,201,184,0.5)'}}>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:34,height:34,background:T.gold,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#FFF',fontSize:15,fontWeight:400,fontFamily:T.se}}>F</span></div>
          <div><div style={{fontSize:14,fontWeight:400,color:T.ch,fontFamily:T.se,letterSpacing:'-0.3px'}}>Futuros Socios</div><div style={{fontSize:9,color:T.mu,letterSpacing:'2px',textTransform:'uppercase',fontFamily:T.sa}}>{pk} — {fmtPct(pp)}</div></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:4}}>
          <button onClick={()=>session?.access_token&&fetchData(session.access_token)} disabled={dl} title="Actualizar datos" style={{background:'none',border:'none',cursor:dl?'wait':'pointer',padding:8,opacity:dl?0.3:0.5,transition:`opacity 0.3s ${ease}`}} onMouseEnter={e=>!dl&&(e.currentTarget.style.opacity=1)} onMouseLeave={e=>!dl&&(e.currentTarget.style.opacity=0.5)}><RefreshCw size={16} color={T.mu} className={dl?'animate-spin':''}/></button>
          <button onClick={async()=>{await supabase.auth.signOut();setSession(null);setData(null)}} style={{background:'none',border:'none',cursor:'pointer',padding:8,opacity:0.5,transition:`opacity 0.3s ${ease}`}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0.5}><LogOut size={16} color={T.mu}/></button>
        </div>
      </div>
      <div style={{maxWidth:1100,margin:'0 auto',display:'flex',gap:24,padding:'0 24px',borderTop:'0.5px solid rgba(212,201,184,0.3)'}}>
        {tabs.map((t,i)=><button key={i} onClick={()=>setTab(i)} style={{background:'none',border:'none',padding:'10px 0',fontSize:12,fontWeight:500,cursor:'pointer',letterSpacing:'1.5px',textTransform:'uppercase',fontFamily:T.sa,color:tab===i?T.gold:T.mu,position:'relative',transition:`color 0.3s ${ease}`}}>
          {t}
          <div style={{position:'absolute',bottom:0,left:0,height:2,background:T.gold,borderRadius:1,width:tab===i?'100%':'0%',transition:`width 0.4s ${ease}`}}/>
        </button>)}
      </div>
    </header>
    <main style={{maxWidth:1100,margin:'0 auto',padding:'24px 24px 80px'}}>
      {dl&&!data&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'80px 0'}}><Loader2 size={20} className="animate-spin" style={{color:T.gold,marginBottom:12}}/><span style={{fontSize:12,color:T.mu,fontFamily:T.sa}}>Cargando datos...</span></div>}
      {err&&<div style={{...S.card,borderColor:T.rd,textAlign:'center'}}><p style={{fontSize:12,color:T.rd,margin:0}}>{err}</p><button onClick={()=>fetchData(session.access_token)} style={{...S.mono,color:T.rd,background:'none',border:'none',textDecoration:'underline',cursor:'pointer',marginTop:8}}>Reintentar</button></div>}
      {data&&!dl&&<ErrorBoundary>
        {tab===0&&<TabComplejo data={data}/>}
        {tab===1&&<TabParticipacion data={data} partnerKey={pk}/>}
        {tab===2&&<TabProyecciones data={data} partnerKey={pk}/>}
      </ErrorBoundary>}
    </main>
  </div>;
}
