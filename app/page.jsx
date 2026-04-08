"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './lib/supabase';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, LineController,
  PointElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Loader2, LogOut } from 'lucide-react';
import React from 'react';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, LineController, PointElement, ArcElement, Tooltip, Legend, Filler);

// ─── Theme ──────────────────────────────────────────────────
const T={bg:"#F5F0E8",bg2:"#EDE8DF",card:"#FFF",gold:"#B8963E",gd:"#8B6914",brn:"#3D2B1F",ch:"#2C2C2C",mu:"#8C7E6F",dv:"#D4C9B8",gr:"#2E7D32",rd:"#B71C1C",mo:"'Courier New',monospace",se:"'Georgia','Times New Roman',serif",sa:"system-ui,-apple-system,sans-serif"};
const PARTNER_MAP={'soukiwisam@gmail.com':'WISI','ramzi@futuros.app':'RAMZI','fvfc@futuros.app':'FVFC','donaldo@futuros.app':'DONALDO','gian@futuros.app':'GIAN','yuyo@futuros.app':'YUYO','david@futuros.app':'DAVID'};
const MO=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

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
  card:{background:T.card,border:'0.5px solid rgba(212,201,184,0.5)',borderRadius:16,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',transition:'all 0.3s ease'},
  div:{borderTop:`1px solid ${T.dv}`,margin:'32px 0'},
  lbl:{color:T.mu,fontSize:9,textTransform:'uppercase',letterSpacing:3,marginBottom:6,fontFamily:T.sa},
  big:{color:T.gold,fontSize:24,fontWeight:400,fontFamily:T.se,letterSpacing:-1,lineHeight:1},
  sub:{color:T.mu,fontSize:11,marginTop:6,fontFamily:T.sa},
  mo:{fontFamily:T.mo,fontWeight:700,fontSize:12},
  row:{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${T.bg2}`},
};
const CO={responsive:true,maintainAspectRatio:false,animation:{duration:800,easing:'easeOutQuart'},
  plugins:{legend:{display:false},tooltip:{backgroundColor:T.card,titleColor:T.gd,bodyColor:T.ch,borderColor:'rgba(212,201,184,0.5)',borderWidth:1,cornerRadius:10,padding:12,boxPadding:4,titleFont:{family:'system-ui',size:11,weight:'700'},bodyFont:{family:'Courier New',size:12},callbacks:{label:c=>`$${c.raw?.toLocaleString()}`}}},
  scales:{x:{grid:{display:false},ticks:{font:{family:'system-ui',size:10},color:T.mu}},y:{grid:{color:'rgba(212,201,184,0.2)'},ticks:{font:{family:'system-ui',size:10},color:T.mu,callback:v=>`$${(v/1000).toFixed(0)}K`}}},
};

// ─── Components ─────────────────────────────────────────────
function KPI({label,value,comp,color}){
  const vc=color||T.gold;
  return <div style={{textAlign:'center',flex:1,minWidth:90,padding:'12px 4px'}}>
    <div style={S.lbl}>{label}</div>
    <div style={{...S.big,color:vc}}>{value}</div>
    {comp&&<div style={{...S.sub,fontSize:10,lineHeight:1.4,whiteSpace:'pre-line'}}>{comp}</div>}
  </div>;
}
function Leg({items}){return <div style={{display:'flex',justifyContent:'center',gap:16,marginTop:12,flexWrap:'wrap'}}>{items.map((it,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:it.dashed?12:10,height:3,borderRadius:2,background:it.dashed?'transparent':it.color,...(it.dashed?{borderTop:`2px dashed ${it.color}`}:{})}}/><span style={{fontSize:10,color:T.mu,fontFamily:T.sa}}>{it.label}</span></div>)}</div>}
function Vdiv(){return <div style={{width:1,background:T.dv,alignSelf:'stretch',margin:'8px 0'}}/>}

class ErrorBoundary extends React.Component{
  constructor(p){super(p);this.state={error:null}}
  static getDerivedStateFromError(e){return{error:e}}
  render(){if(this.state.error)return <div style={{...S.card,borderColor:T.rd,margin:16}}><div style={{...S.lbl,color:T.rd}}>ERROR</div><pre style={{fontSize:11,color:T.rd,fontFamily:T.mo,whiteSpace:'pre-wrap',margin:'8px 0'}}>{this.state.error?.message}</pre></div>;return this.props.children}
}

// ─── Login ──────────────────────────────────────────────────
function LoginScreen({onLogin}){
  const [user,setUser]=useState('');const [pw,setPw]=useState('');const [ld,setLd]=useState(false);const [err,setErr]=useState('');
  async function go(e){e.preventDefault();setLd(true);setErr('');const email=user.includes('@')?user:`${user.toLowerCase()}@futuros.app`;const{data,error}=await supabase.auth.signInWithPassword({email,password:pw});if(error){setErr('Credenciales incorrectas');setLd(false);return}onLogin(data.session)}
  const inp={width:'100%',padding:'12px 16px',borderRadius:12,border:'0.5px solid rgba(212,201,184,0.5)',background:T.card,color:T.ch,fontSize:13,fontFamily:T.sa,boxSizing:'border-box'};
  return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:T.bg}}>
    <div className="fade-in" style={{width:'100%',maxWidth:340}}>
      <div style={{textAlign:'center',marginBottom:40}}>
        <div style={{width:48,height:48,background:T.gold,borderRadius:14,display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:16}}><span style={{color:'#FFF',fontSize:20,fontWeight:700,fontFamily:T.se}}>F</span></div>
        <h1 style={{fontSize:20,fontWeight:700,color:T.ch,fontFamily:T.se,margin:0}}>Futuros Socios</h1>
        <p style={{color:T.mu,fontSize:11,marginTop:4,fontFamily:T.sa}}>Dashboard de Inversion</p>
      </div>
      <form onSubmit={go} style={{display:'flex',flexDirection:'column',gap:12}}>
        <input type="text" placeholder="Usuario" value={user} onChange={e=>setUser(e.target.value)} style={inp} required autoCapitalize="none" autoCorrect="off"/>
        <input type="password" placeholder="Contrasena" value={pw} onChange={e=>setPw(e.target.value)} style={inp} required/>
        {err&&<p style={{color:T.rd,fontSize:12,textAlign:'center',margin:0}}>{err}</p>}
        <button type="submit" disabled={ld} style={{width:'100%',padding:12,borderRadius:12,border:'none',background:T.gold,color:'#FFF',fontSize:12,fontWeight:600,fontFamily:T.sa,cursor:'pointer',letterSpacing:1,textTransform:'uppercase',opacity:ld?.5:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{ld?<Loader2 size={14} className="animate-spin"/>:'ENTRAR'}</button>
      </form>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// TAB 1 — EL COMPLEJO
// ═══════════════════════════════════════════════════════════════
function TabComplejo({data}){
  const {bookings,courts,historicalSales,payments,exchangeRate}=data;
  const now=new Date(),cy=now.getFullYear(),cm=now.getMonth()+1;
  const today=now.toISOString().slice(0,10);
  const dom=now.getDate(); // day of month

  const yb=useMemo(()=>bookings.filter(b=>b.date?.startsWith(String(cy))&&b.date<=today&&b.activity_type!=='blocked'),[bookings,cy,today]);

  // Monthly revenue: historical_sales where available, bookings otherwise
  const mr=useMemo(()=>{
    const m=Array(12).fill(0);const hs=new Set();
    (historicalSales||[]).filter(s=>s.sale_date?.startsWith(String(cy))).forEach(s=>{const mo=gm(s.sale_date);if(mo){m[mo-1]+=(s.total_ref||0);hs.add(mo)}});
    yb.forEach(b=>{const mo=gm(b.date);if(mo&&!hs.has(mo))m[mo-1]+=(b.price_eur||0)});
    return m;
  },[yb,historicalSales,cy]);
  const pmr=useMemo(()=>{
    const m=Array(12).fill(0);
    (historicalSales||[]).filter(s=>s.sale_date?.startsWith(String(cy-1))).forEach(s=>{const mo=gm(s.sale_date);if(mo)m[mo-1]+=(s.total_ref||0)});
    return m;
  },[historicalSales,cy]);

  const tmr=mr[cm-1]||0;
  const tr=useMemo(()=>mr.reduce((s,v)=>s+v,0),[mr]);

  // Fair comparison: same day range of previous month
  // Get prev month revenue up to same day
  const prevMonthSameDay=useMemo(()=>{
    const pm=cm>1?cm-1:12; const pmYear=cm>1?cy:cy-1;
    // From historical_sales for that month, filter day<=dom
    let total=0;
    (historicalSales||[]).filter(s=>{
      if(!s.sale_date)return false;
      const y=parseInt(s.sale_date.substring(0,4)),m=gm(s.sale_date),d=gd(s.sale_date);
      return y===pmYear&&m===pm&&d<=dom;
    }).forEach(s=>total+=(s.total_ref||0));
    // Also check bookings for that range
    const pmStr=`${pmYear}-${String(pm).padStart(2,'0')}`;
    bookings.filter(b=>b.date?.startsWith(pmStr)&&gd(b.date)<=dom&&b.activity_type!=='blocked').forEach(b=>total+=(b.price_eur||0));
    return total;
  },[historicalSales,bookings,cy,cm,dom]);

  // Same month last year, same day range
  const sameMonthLastYearSameDay=useMemo(()=>{
    let total=0;
    (historicalSales||[]).filter(s=>{
      if(!s.sale_date)return false;
      const y=parseInt(s.sale_date.substring(0,4)),m=gm(s.sale_date),d=gd(s.sale_date);
      return y===cy-1&&m===cm&&d<=dom;
    }).forEach(s=>total+=(s.total_ref||0));
    return total;
  },[historicalSales,cy,cm,dom]);

  const momG=pctOf(tmr,prevMonthSameDay);
  const yoyMG=pctOf(tmr,sameMonthLastYearSameDay);
  const daysInMonth=new Date(cy,cm,0).getDate();
  const projMonth=dom>0?Math.round(tmr/dom*daysInMonth):0;

  // YTD comparison
  const pySameYTD=useMemo(()=>(historicalSales||[]).filter(s=>s.sale_date?.startsWith(String(cy-1))&&s.sale_date<=`${cy-1}${today.substring(4)}`).reduce((s,r)=>s+(r.total_ref||0),0),[historicalSales,cy,today]);
  const yoyG=pctOf(tr,pySameYTD);

  // Occupancy this month — fair: same day range
  const tmH=useMemo(()=>yb.filter(b=>gm(b.date)===cm).reduce((s,b)=>s+(b.duration||0),0),[yb,cm]);
  const pmHSameDay=useMemo(()=>{
    const pm=cm>1?cm-1:12;
    return yb.filter(b=>{const m=gm(b.date),d=gd(b.date);return m===pm&&d<=dom}).reduce((s,b)=>s+(b.duration||0),0);
  },[yb,cm,dom]);
  const occG=pctOf(tmH,pmHSameDay);

  // Week comparison
  const dow=now.getDay()||7;
  const ws=new Date(now);ws.setDate(now.getDate()-dow+1);
  const lws=new Date(ws);lws.setDate(lws.getDate()-7);
  const daysThisWeek=dow; // Mon=1 ... Sun=7
  const twb=yb.filter(b=>b.date>=ws.toISOString().slice(0,10)&&b.date<=today).length;
  // Same number of days from last week
  const lwEnd=new Date(lws);lwEnd.setDate(lws.getDate()+daysThisWeek-1);
  const lwb=yb.filter(b=>b.date>=lws.toISOString().slice(0,10)&&b.date<=lwEnd.toISOString().slice(0,10)).length;
  const wG=pctOf(twb,lwb);

  // Birthdays
  const bdm=useMemo(()=>{
    const m=Array(12).fill(0);
    yb.filter(b=>b.activity_type==='cumpleanos').forEach(b=>{const mo=gm(b.date);if(mo)m[mo-1]++});
    (historicalSales||[]).filter(s=>s.sale_date?.startsWith(String(cy))&&s.activity_type==='cumpleanos').forEach(s=>{const mo=gm(s.sale_date);if(mo)m[mo-1]++});
    return m;
  },[yb,historicalSales,cy]);
  const tbd=bdm.reduce((a,b)=>a+b,0);
  const tmBd=bdm[cm-1]||0;
  const lmBd=cm>1?(bdm[cm-2]||0):0;

  // Court occupancy
  const daysElapsed=Math.floor((now.getTime()-new Date(cy,0,1).getTime())/86400000)+1;
  const availPerCourt=daysElapsed*14;
  const ch=useMemo(()=>{
    const map={};(courts||[]).forEach(c=>{map[c.id]={name:c.name,type:c.type,hours:0}});
    yb.forEach(b=>(b.court_ids||[]).forEach(cid=>{if(map[cid])map[cid].hours+=(b.duration||0)}));
    return Object.values(map).sort((a,b)=>b.hours-a.hours);
  },[yb,courts]);

  // Court type breakdown
  const typeBreakdown=useMemo(()=>{const map={};yb.forEach(b=>{const t=b.type||'otro';map[t]=(map[t]||0)+(b.price_eur||0)});return Object.entries(map).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])},[yb]);
  const typeColors={F7:T.gold,F11:T.gd,F5:T.dv,F5T:'#A89A8A'};
  const pyRev=useMemo(()=>(historicalSales||[]).filter(s=>s.sale_date?.startsWith(String(cy-1))).reduce((s,r)=>s+(r.total_ref||0),0),[historicalSales,cy]);
  const pyTypeMap=useMemo(()=>{const map={};(historicalSales||[]).filter(s=>s.sale_date?.startsWith(String(cy-1))).forEach(s=>{const t=s.court_type||'otro';map[t]=(map[t]||0)+(s.total_ref||0)});return map},[historicalSales,cy]);

  // Activity breakdown
  const ab=useMemo(()=>{const m={};yb.forEach(b=>{const t=b.activity_type||'otro';m[t]=(m[t]||0)+(b.price_eur||0)});return m},[yb]);
  const abT=Object.values(ab).reduce((s,v)=>s+v,0);
  const aLbl={alquiler:'Alquiler',cumpleanos:'Cumpleanos',academia:'Academia',torneo:'Torneo',evento:'Evento',otro:'Otro'};
  const aClr=['#B8963E','#3D2B1F','#D4C9B8','#8B6914','#8C7E6F','#A89A8A'];

  // Historical revenue
  const rev24=useMemo(()=>(historicalSales||[]).filter(s=>s.sale_date?.startsWith('2024')).reduce((s,r)=>s+(r.total_ref||0),0),[historicalSales]);
  const rev25=pyRev,rev26=tr;
  const proj26=cm>0?Math.round(rev26/cm*12):0;

  // Payments breakdown
  const py26=useMemo(()=>{const ids=new Set(yb.map(b=>b.id));return(payments||[]).filter(p=>ids.has(p.booking_id))},[payments,yb]);
  const payByMethod=useMemo(()=>{
    const eur={amt:0,cnt:0},usd={amt:0,cnt:0},bs={amt:0,cnt:0};
    py26.forEach(p=>{const m=p.method||'';if(m==='pago_movil'||m==='cash_bs'){bs.amt+=(p.amount_eur||0);bs.cnt++}else if(m==='cash_usd'||m==='zelle'){usd.amt+=(p.amount_eur||0);usd.cnt++}else{eur.amt+=(p.amount_eur||0);eur.cnt++}});
    return{eur,usd,bs,tot:eur.amt+usd.amt+bs.amt};
  },[py26]);

  // Top clients
  const topClients=useMemo(()=>{
    const map={};
    yb.forEach(b=>{const n=b.client_name||'Sin nombre';if(!map[n])map[n]={name:n,rev:0,cnt:0};map[n].rev+=(b.price_eur||0);map[n].cnt++});
    const sorted=Object.values(map).sort((a,b)=>b.rev-a.rev);
    const top6=sorted.slice(0,6);
    const otros=sorted.slice(6);
    const otrosSum=otros.reduce((s,c)=>s+c.rev,0);
    const otrosCnt=otros.reduce((s,c)=>s+c.cnt,0);
    if(otrosSum>0)top6.push({name:'Otros',rev:otrosSum,cnt:otrosCnt});
    return top6;
  },[yb]);
  const tcTotal=topClients.reduce((s,c)=>s+c.rev,0);
  const tcColors=['#8B6914','#B8963E','#C4A95A','#D4C9B8','#DDD5C6','#E5DED2','#EDE8DF'];
  const uniqueClients=useMemo(()=>new Set(yb.map(b=>b.client_name).filter(Boolean)).size,[yb]);
  const allClientsSorted=useMemo(()=>{
    const map={};yb.forEach(b=>{const n=b.client_name||'Sin nombre';if(!map[n])map[n]={rev:0};map[n].rev+=(b.price_eur||0)});
    return Object.values(map).sort((a,b)=>b.rev-a.rev);
  },[yb]);
  const top3pct=tcTotal>0?allClientsSorted.slice(0,3).reduce((s,c)=>s+c.rev,0)/tcTotal*100:0;
  const top5pct=tcTotal>0?allClientsSorted.slice(0,5).reduce((s,c)=>s+c.rev,0)/tcTotal*100:0;
  const top10pct=tcTotal>0?allClientsSorted.slice(0,10).reduce((s,c)=>s+c.rev,0)/tcTotal*100:0;

  const momLabel=MO[cm>1?cm-2:11].toLowerCase();
  const momComp=momG!=null?`${cmpStr(momG)} vs ${momLabel} (al dia ${dom})`:`Primer mes`;
  const yoyComp=yoyMG!=null?`${cmpStr(yoyMG)} vs ${MO[cm-1].toLowerCase()} ${cy-1} (al dia ${dom})`:`Sin datos ${cy-1}`;

  return <div className="fade-in">
    {/* Grupo 1: Este mes */}
    <div style={{...S.card,display:'flex',flexWrap:'wrap',justifyContent:'center'}}>
      <KPI label={`INGRESOS ${MO[cm-1].toUpperCase()}`} value={fmt(tmr)} comp={`${dom} dias → ~${fmt(projMonth)} proy.\n${momComp}\n${yoyComp}`}/>
      <Vdiv/>
      <KPI label={`OCUPACION ${MO[cm-1].toUpperCase()}`} value={`${tmH}h`} comp={occG!=null?`${cmpStr(occG)} vs ${momLabel} (al dia ${dom})`:'Primer mes'} color={T.ch}/>
      <Vdiv/>
      <KPI label="RESERVAS SEMANA" value={twb.toString()} comp={wG!=null?`${cmpStr(wG)} vs sem. ant. (${daysThisWeek}d)`:'Primera semana'} color={T.ch}/>
      <Vdiv/>
      <KPI label="TASA BCV" value={exchangeRate?`Bs ${Number(exchangeRate.eurRate).toLocaleString('es-VE',{maximumFractionDigits:0})}`:'—'} comp="Bs por REF" color={T.ch}/>
    </div>
    <div style={{...S.card,marginTop:12,display:'flex',flexWrap:'wrap',justifyContent:'center'}}>
      <KPI label={`CUMPLEANOS ${MO[cm-1].toUpperCase()}`} value={tmBd.toString()} comp={`${tmBd-lmBd>=0?'+':''}${tmBd-lmBd} vs ${momLabel}`} color={T.ch}/>
      <Vdiv/>
      <KPI label="CUMPLEANOS YTD" value={tbd.toString()} comp={`${(cm>0?tbd/cm:0).toFixed(1)}/mes`} color={T.ch}/>
      <Vdiv/>
      <KPI label="INGRESOS YTD" value={fmt(tr)} comp={yoyG!=null?`${cmpStr(yoyG)} vs ${cy-1} (al ${today.substring(5)})`:`${cm} meses`}/>
    </div>

    {/* Grupo 2: Este ano vs ano pasado */}
    <div style={S.div}/>
    <div style={S.card}>
      <div style={S.lbl}>TENDENCIA MENSUAL — {cy-1} VS {cy}</div>
      <div style={{height:200,marginTop:16}}>
        <Bar data={{labels:MO,datasets:[
          {label:String(cy-1),data:pmr,backgroundColor:T.dv,borderRadius:10,barPercentage:0.8,categoryPercentage:0.7},
          {label:String(cy),data:mr.map((v,i)=>i<cm?v:null),backgroundColor:T.gold,borderRadius:10,barPercentage:0.8,categoryPercentage:0.7},
        ]}} options={CO}/>
      </div>
      <Leg items={[{label:String(cy-1),color:T.dv},{label:String(cy),color:T.gold}]}/>
    </div>

    <div style={S.div}/>
    <div style={S.card}>
      <div style={S.lbl}>RENDIMIENTO HISTORICO</div>
      <div style={{height:180,marginTop:16}}>
        <Bar data={{labels:['2024','2025',`2026 YTD`],datasets:[{data:[rev24,rev25,rev26],backgroundColor:[T.dv,T.gold,T.gd],borderRadius:10,barThickness:40}]}} options={CO}/>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:16}}>
        {[{y:'2024',v:rev24},{y:'2025',v:rev25},{y:'2026 YTD',v:rev26}].map((r,i)=><div key={i} style={{textAlign:'center'}}><div style={S.mo}>{fmt(r.v)}</div><div style={{fontSize:10,color:T.mu,marginTop:2,fontFamily:T.sa}}>{r.y}</div></div>)}
      </div>
      <div style={{...S.sub,textAlign:'center',marginTop:8}}>Proyeccion {cy}: ~{fmt(proj26)}</div>
    </div>

    {/* Grupo 3: De donde viene la plata */}
    <div style={S.div}/>
    <div style={S.card}>
      <div style={S.lbl}>DISTRIBUCION POR TIPO — {cy}</div>
      {typeBreakdown.map(([type,rev],i)=>{
        const pct=tr>0?rev/tr*100:0;
        const py25pct=pyRev>0&&pyTypeMap[type]?(pyTypeMap[type]/pyRev*100):null;
        return <div key={type} style={{marginTop:i>0?12:16}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
            <span style={{fontSize:12,fontFamily:T.sa,fontWeight:600,color:T.ch}}>{type}</span>
            <span style={{fontSize:12,fontFamily:T.mo,color:T.ch}}>{fmt(rev)} ({fmtPct(pct)}){py25pct!=null&&<span style={{fontSize:10,color:T.mu}}> vs {fmtPct(py25pct)} en {cy-1}</span>}</span>
          </div>
          <div style={{background:T.bg2,borderRadius:20,height:5}}><div style={{width:`${pct}%`,height:'100%',background:typeColors[type]||T.mu,borderRadius:20}}/></div>
        </div>;
      })}
    </div>

    <div style={S.div}/>
    <div style={S.card}>
      <div style={S.lbl}>TIPO DE ACTIVIDAD</div>
      <div style={{display:'flex',alignItems:'center',gap:24,marginTop:16}}>
        <div style={{width:120,height:120}}>
          <Doughnut data={{labels:Object.keys(ab).map(k=>aLbl[k]||k),datasets:[{data:Object.values(ab),backgroundColor:aClr.slice(0,Object.keys(ab).length),borderWidth:0}]}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:false}},cutout:'70%'}}/>
        </div>
        <div style={{flex:1}}>
          {Object.entries(ab).sort((a,b)=>b[1]-a[1]).map(([k,v],i)=>
            <div key={k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <div style={{width:8,height:8,borderRadius:4,background:aClr[i],flexShrink:0}}/>
              <span style={{flex:1,fontSize:11,color:T.ch,fontFamily:T.sa}}>{aLbl[k]||k}</span>
              <span style={S.mo}>{fmt(v)}</span>
              <span style={{fontSize:10,color:T.mu,fontFamily:T.sa,minWidth:36,textAlign:'right'}}>{abT>0?fmtPct(v/abT*100):'0%'}</span>
            </div>
          )}
        </div>
      </div>
    </div>

    <div style={S.div}/>
    <div style={S.card}>
      <div style={S.lbl}>DISTRIBUCION POR TIPO DE PAGO — {cy}</div>
      <div style={{display:'flex',gap:12,marginTop:16,flexWrap:'wrap'}}>
        {[{label:'REF (EUR)',amt:payByMethod.eur.amt,cnt:payByMethod.eur.cnt,color:T.gold},{label:'USD',amt:payByMethod.usd.amt,cnt:payByMethod.usd.cnt,color:T.gd},{label:'Bolivares',amt:payByMethod.bs.amt,cnt:payByMethod.bs.cnt,color:T.dv}].map((p,i)=>
          <div key={i} style={{flex:1,minWidth:100,background:T.bg2,borderRadius:12,padding:16,textAlign:'center'}}>
            <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:2,color:T.mu,fontFamily:T.sa,marginBottom:6}}>{p.label}</div>
            <div style={{fontSize:18,fontWeight:400,fontFamily:T.se,color:p.color,letterSpacing:-1}}>{fmt(p.amt)}</div>
            <div style={{fontSize:10,color:T.mu,fontFamily:T.sa,marginTop:4}}>{p.cnt} pagos · {payByMethod.tot>0?fmtPct(p.amt/payByMethod.tot*100):'0%'}</div>
          </div>
        )}
      </div>
    </div>

    {/* Top Clientes */}
    <div style={S.div}/>
    <div style={S.card}>
      <div style={S.lbl}>TOP CLIENTES — {cy}</div>
      <div style={{display:'flex',alignItems:'center',gap:24,marginTop:16}}>
        <div style={{width:130,height:130,position:'relative'}}>
          <Doughnut data={{labels:topClients.map(c=>c.name),datasets:[{data:topClients.map(c=>c.rev),backgroundColor:tcColors.slice(0,topClients.length),borderWidth:0}]}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:false}},cutout:'70%'}}/>
          <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center'}}>
            <div style={{fontSize:14,fontWeight:400,fontFamily:T.se,color:T.ch}}>{fmt(tcTotal)}</div>
            <div style={{fontSize:8,color:T.mu,fontFamily:T.sa}}>YTD</div>
          </div>
        </div>
        <div style={{flex:1}}>
          {topClients.map((c,i)=>
            <div key={i} style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
              <div style={{width:7,height:7,borderRadius:4,background:tcColors[i],flexShrink:0}}/>
              <span style={{flex:1,fontSize:10,color:T.ch,fontFamily:T.sa,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</span>
              <span style={{fontSize:10,fontFamily:T.mo,fontWeight:700,color:T.ch}}>{fmt(c.rev)}</span>
              <span style={{fontSize:9,color:T.mu,fontFamily:T.sa,minWidth:28,textAlign:'right'}}>{tcTotal>0?fmtPct(c.rev/tcTotal*100):'0%'}</span>
            </div>
          )}
        </div>
      </div>
      {/* Concentration cards */}
      <div style={{display:'flex',gap:8,marginTop:16,flexWrap:'wrap'}}>
        {[{l:'Top 3',v:top3pct},{l:'Top 5',v:top5pct},{l:'Top 10',v:top10pct},{l:'Unicos',v:uniqueClients,isNum:true}].map((c,i)=>
          <div key={i} style={{flex:1,minWidth:70,background:T.bg2,borderRadius:10,padding:'10px 8px',textAlign:'center'}}>
            <div style={{fontSize:8,textTransform:'uppercase',letterSpacing:1,color:T.mu,fontFamily:T.sa}}>{c.l}</div>
            <div style={{fontSize:14,fontWeight:400,fontFamily:T.se,color:T.ch,marginTop:4}}>{c.isNum?c.v:fmtPct(c.v)}</div>
          </div>
        )}
      </div>
    </div>

    {/* Grupo 4: Donde hay oportunidad */}
    <div style={S.div}/>
    <div style={S.card}>
      <div style={S.lbl}>OCUPACION POR CANCHA — {cy}</div>
      <div style={{marginTop:16}}>
        {ch.map((c,i)=>{const mx=ch[0]?.hours||1;const occ=availPerCourt>0?(c.hours/availPerCourt*100):0;
          return <div key={i} style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
              <span style={{fontSize:12,fontFamily:T.sa,color:T.ch}}>{c.name} <span style={{color:T.mu}}>({c.type})</span></span>
              <span style={S.mo}>{c.hours}h <span style={{fontWeight:400,color:T.mu,fontSize:10}}>({fmtPct(occ)})</span></span>
            </div>
            <div style={{background:T.bg2,borderRadius:20,height:5}}><div style={{width:`${(c.hours/mx)*100}%`,height:'100%',borderRadius:20,background:c.type==='F7'?T.gold:T.dv}}/></div>
          </div>;
        })}
      </div>
    </div>

    <div style={S.div}/>
    <div style={S.card}>
      <div style={S.lbl}>CUMPLEANOS POR MES — {cy}</div>
      <div style={{height:160,marginTop:16}}>
        <Bar data={{labels:MO,datasets:[
          {type:'line',label:'Prom 2025',data:Array(12).fill(10),borderColor:'#B71C1C55',borderDash:[4,4],borderWidth:1.5,pointRadius:0,fill:false,order:0},
          {label:String(cy),data:bdm,backgroundColor:T.brn,borderRadius:10,barThickness:14,order:1},
        ]}} options={{...CO,scales:{...CO.scales,y:{...CO.scales.y,ticks:{...CO.scales.y.ticks,stepSize:2,callback:v=>v}}}}}/>
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
  const now=new Date(),cy=now.getFullYear(),cm=now.getMonth()+1;
  const pk=partnerKey;
  const myRoi=roi?.[pk]||{};const myTotales=totales?.[pk]||{};
  const inv=myRoi.montoInvertido||0;const pct=myRoi.participacion||0;

  const allDivs=[...(dividends[2024]||[]),...(dividends[2025]||[]),...(dividends[2026]||[])];
  const totalDiv=myRoi.dividendosRecibidos||allDivs.reduce((s,d)=>s+pAmt(d,pk),0);
  const roiPct=myRoi.roiPct||(inv>0?(totalDiv/inv*100):0);
  const pbPct=inv>0?Math.min(100,(totalDiv/inv)*100):0;

  const ytdDiv=(dividends[cy]||[]).reduce((s,d)=>s+pAmt(d,pk),0);
  const pySame=(dividends[cy-1]||[]).filter(d=>{const m=gm(d.fecha);return m&&m<=cm}).reduce((s,d)=>s+pAmt(d,pk),0);
  const ytdG=pctOf(ytdDiv,pySame);
  const monthsWithDivs=new Set((dividends[cy]||[]).filter(d=>pAmt(d,pk)>0).map(d=>gm(d.fecha)).filter(Boolean)).size;
  const avgM=monthsWithDivs>0?ytdDiv/monthsWithDivs:0;
  const rem=inv-totalDiv;
  const mtpb=myRoi.mesesRestantes||(avgM>0?Math.ceil(Math.max(0,rem)/avgM):null);

  const mDiv=useMemo(()=>{const m=Array(12).fill(0);(dividends[cy]||[]).forEach(d=>{const mo=gm(d.fecha);if(mo)m[mo-1]+=pAmt(d,pk)});return m},[dividends,cy,pk]);
  const mDiv25=useMemo(()=>{const m=Array(12).fill(0);(dividends[cy-1]||[]).forEach(d=>{const mo=gm(d.fecha);if(mo)m[mo-1]+=pAmt(d,pk)});return m},[dividends,cy,pk]);
  const yTot=[myTotales.total2024||(dividends[2024]||[]).reduce((s,d)=>s+pAmt(d,pk),0),myTotales.total2025||(dividends[2025]||[]).reduce((s,d)=>s+pAmt(d,pk),0),myTotales.total2026||(dividends[2026]||[]).reduce((s,d)=>s+pAmt(d,pk),0)];

  const mBreak=useMemo(()=>{const map={};(dividends[cy]||[]).forEach(d=>{const m=gm(d.fecha);const a=pAmt(d,pk);if(m&&a>0){if(!map[m])map[m]={month:m,amt:0,cnt:0};map[m].amt+=a;map[m].cnt++}});return Object.values(map).sort((a,b)=>a.month-b.month)},[dividends,cy,pk]);
  const bestMonth=mBreak.length>0?mBreak.reduce((a,b)=>b.amt>a.amt?b:a):null;
  const divUsd=allDivs.filter(d=>d.divisa==='SI').reduce((s,d)=>s+pAmt(d,pk),0);
  const divBs=allDivs.filter(d=>d.divisa!=='SI').reduce((s,d)=>s+pAmt(d,pk),0);
  const divTot=divUsd+divBs;

  return <div className="fade-in">
    {/* Hero */}
    <div style={{...S.card,borderLeft:`4px solid ${T.gold}`}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <span style={{...S.lbl,marginBottom:0}}>{pk} — {fmtPct(pct)}</span>
        <span style={{fontSize:10,background:T.bg2,padding:'2px 8px',borderRadius:10,fontFamily:T.sa,color:T.mu}}>{cy}</span>
      </div>
      <div style={{fontSize:32,fontWeight:400,fontFamily:T.se,color:T.gold,letterSpacing:-1,lineHeight:1}}>{fmt(totalDiv)}</div>
      <div style={{fontSize:11,color:T.mu,fontFamily:T.sa,marginTop:6}}>Total dividendos recibidos</div>
      {inv>0&&<div style={{display:'flex',gap:24,marginTop:20,borderTop:`1px solid ${T.dv}`,paddingTop:16}}>
        <div><div style={{...S.lbl,marginBottom:2}}>INVERTIDO</div><div style={S.mo}>{fmt(inv)}</div></div>
        <div><div style={{...S.lbl,marginBottom:2}}>ROI</div><div style={{fontFamily:T.se,fontWeight:400,fontSize:14,color:T.gold}}>{fmtPct(roiPct)}</div></div>
        <div><div style={{...S.lbl,marginBottom:2}}>NETO</div><div style={{...S.mo,color:rem>0?T.rd:T.gr}}>{rem>0?`-${fmt(rem)}`:`+${fmt(Math.abs(rem))}`}</div></div>
      </div>}
    </div>

    {inv>0&&<><div style={S.div}/><div style={S.card}>
      <div style={S.lbl}>PAYBACK</div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,marginTop:8}}>
        <span style={{fontSize:11,color:T.mu,fontFamily:T.sa}}>{fmt(totalDiv)} de {fmt(inv)}</span>
        <span style={{fontSize:11,fontFamily:T.mo,fontWeight:700,color:T.gold}}>{fmtPct(pbPct)}</span>
      </div>
      <div style={{background:T.bg2,borderRadius:20,height:5}}><div style={{width:`${pbPct}%`,height:'100%',background:T.gold,borderRadius:20,transition:'width 1s ease'}}/></div>
      {mtpb!=null&&rem>0&&<div style={{...S.sub,marginTop:8}}>~{mtpb} meses restantes ({fmt(avgM)}/mes)</div>}
    </div></>}

    <div style={{...S.card,marginTop:12,display:'flex',justifyContent:'center'}}>
      <KPI label={`DIVIDENDOS ${cy}`} value={fmt(ytdDiv)} comp={ytdG!=null?`${cmpStr(ytdG)} vs ${cy-1}`:`${monthsWithDivs} meses`}/>
      <Vdiv/><KPI label="PROMEDIO/MES" value={fmt(avgM)} comp={`${monthsWithDivs} meses con pagos`}/>
    </div>

    <div style={S.div}/>
    <div style={S.card}>
      <div style={S.lbl}>DESGLOSE MENSUAL {cy}</div>
      <div style={{marginTop:12}}>
        {mBreak.map((mb,i)=><div key={i} style={{...S.row,borderBottom:i<mBreak.length-1?`1px solid ${T.bg2}`:'none'}}>
          <span style={{fontSize:12,fontFamily:T.sa,color:T.ch}}>{MO[mb.month-1]} <span style={{color:T.mu}}>({mb.cnt} pagos)</span></span>
          <span style={{...S.mo,color:bestMonth&&mb.month===bestMonth.month?T.gr:T.ch}}>{fmt(mb.amt)}</span>
        </div>)}
        <div style={{borderTop:`1px solid ${T.dv}`,marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between'}}>
          <span style={{fontSize:12,fontWeight:700,fontFamily:T.sa,color:T.ch}}>Total {cy} YTD</span>
          <span style={{...S.mo,fontSize:14}}>{fmt(ytdDiv)}</span>
        </div>
      </div>
    </div>

    <div style={S.div}/>
    <div style={S.card}>
      <div style={S.lbl}>MIS DIVIDENDOS — {cy-1} VS {cy}</div>
      <div style={{height:200,marginTop:16}}>
        <Bar data={{labels:MO,datasets:[
          {label:String(cy-1),data:mDiv25,backgroundColor:T.dv,borderRadius:10,barPercentage:0.8,categoryPercentage:0.7},
          {label:String(cy),data:mDiv.map((v,i)=>i<cm?v:null),backgroundColor:T.gold,borderRadius:10,barPercentage:0.8,categoryPercentage:0.7},
        ]}} options={{...CO,scales:{...CO.scales,y:{...CO.scales.y,ticks:{...CO.scales.y.ticks,callback:v=>`$${v.toLocaleString()}`}}}}}/>
      </div>
      <Leg items={[{label:String(cy-1),color:T.dv},{label:String(cy),color:T.gold}]}/>
    </div>

    <div style={S.div}/>
    <div style={S.card}>
      <div style={S.lbl}>COMPARACION ANUAL</div>
      <div style={{height:180,marginTop:16}}>
        <Bar data={{labels:['2024','2025','2026 YTD'],datasets:[{data:yTot,backgroundColor:[T.dv,T.gold,T.gd],borderRadius:10,barThickness:40}]}} options={CO}/>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:16}}>
        {['2024','2025','2026 YTD'].map((y,i)=><div key={y} style={{textAlign:'center'}}><div style={S.mo}>{fmt(yTot[i])}</div><div style={{fontSize:10,color:T.mu,marginTop:2,fontFamily:T.sa}}>{y}</div></div>)}
      </div>
    </div>

    <div style={S.div}/>
    <div style={S.card}>
      <div style={S.lbl}>COMPOSICION DE DIVIDENDOS</div>
      <div style={{display:'flex',gap:12,marginTop:16}}>
        <div style={{flex:1,background:T.bg2,borderRadius:12,padding:16,textAlign:'center'}}>
          <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:2,color:T.mu,fontFamily:T.sa,marginBottom:6}}>BOLIVARES</div>
          <div style={{fontSize:20,fontWeight:400,fontFamily:T.se,color:T.ch,letterSpacing:-1}}>{fmt(divBs)}</div>
          <div style={{fontSize:10,color:T.mu,fontFamily:T.sa,marginTop:4}}>{divTot>0?fmtPct(divBs/divTot*100):'0%'}</div>
        </div>
        <div style={{flex:1,background:T.bg2,borderRadius:12,padding:16,textAlign:'center'}}>
          <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:2,color:T.mu,fontFamily:T.sa,marginBottom:6}}>USD CASH</div>
          <div style={{fontSize:20,fontWeight:400,fontFamily:T.se,color:T.gd,letterSpacing:-1}}>{fmt(divUsd)}</div>
          <div style={{fontSize:10,color:T.mu,fontFamily:T.sa,marginTop:4}}>{divTot>0?fmtPct(divUsd/divTot*100):'0%'}</div>
        </div>
      </div>
    </div>

    <div style={S.div}/>
    <div style={S.card}>
      <div style={S.lbl}>ULTIMOS PAGOS</div>
      <div style={{display:'flex',padding:'8px 0',borderBottom:`1px solid ${T.dv}`,marginTop:8}}>
        <span style={{fontSize:9,color:T.mu,fontFamily:T.sa,flex:1}}>FECHA</span>
        <span style={{fontSize:9,color:T.mu,fontFamily:T.sa,width:120,textAlign:'right'}}>TOTAL</span>
        <span style={{fontSize:9,color:T.mu,fontFamily:T.sa,width:40,textAlign:'center'}}>DIV</span>
        <span style={{fontSize:9,color:T.mu,fontFamily:T.sa,width:70,textAlign:'right'}}>MI PARTE</span>
      </div>
      {[...(dividends[cy]||[])].reverse().slice(0,10).map((d,i)=>{
        const myAmt=pAmt(d,pk);const isUsd=d.divisa==='SI';const totalEst=pct>0?Math.round(myAmt/(pct/100)):0;
        return <div key={i} style={{display:'flex',padding:'6px 0',borderBottom:`1px solid ${T.bg2}`,alignItems:'center'}}>
          <span style={{fontSize:11,color:T.mu,fontFamily:T.sa,flex:1}}>{d.fecha}</span>
          <span style={{fontSize:10,fontFamily:T.mo,color:T.ch,width:120,textAlign:'right'}}>
            {isUsd?fmt(d.montoTotal>0?d.montoTotal:totalEst):d.bolivares>0?<>{`Bs ${Number(d.bolivares).toLocaleString('es-VE',{maximumFractionDigits:0})}`}<span style={{fontSize:9,color:T.mu}}> ({fmt(totalEst)})</span></>:fmt(totalEst)}
          </span>
          <span style={{fontSize:10,fontFamily:T.sa,color:isUsd?T.gd:T.mu,width:40,textAlign:'center',fontWeight:600}}>{isUsd?'USD':'Bs'}</span>
          <span style={{fontSize:11,fontFamily:T.mo,fontWeight:700,color:T.ch,width:70,textAlign:'right'}}>{fmt(myAmt,2)}</span>
        </div>;
      })}
    </div>

    <div style={S.div}/>
    <div style={S.card}>
      <div style={S.lbl}>RESUMEN</div>
      <p style={{fontSize:12,lineHeight:1.7,color:T.ch,fontFamily:T.sa,margin:'12px 0 0'}}>
        En {monthsWithDivs} meses de {cy}, {pk} ha recibido <b style={{fontFamily:T.mo}}>{fmt(ytdDiv)}</b> en dividendos, a un promedio de <b style={{fontFamily:T.mo}}>{fmt(avgM)}</b>/mes.
        {bestMonth&&<> El mejor mes fue <b>{MO[bestMonth.month-1]}</b> con <b style={{fontFamily:T.mo}}>{fmt(bestMonth.amt)}</b>.</>}
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
  const now=new Date(),cy=now.getFullYear(),cm=now.getMonth()+1;
  const pk=partnerKey;const myRoi=roi?.[pk]||{};const pct=myRoi.participacion||0;
  const inv=myRoi.montoInvertido||0;
  const tDiv=myRoi.dividendosRecibidos||[...(dividends[2024]||[]),...(dividends[2025]||[]),...(dividends[2026]||[])].reduce((s,d)=>s+pAmt(d,pk),0);
  const ytdDiv=(dividends[cy]||[]).reduce((s,d)=>s+pAmt(d,pk),0);
  const divMonths=new Set((dividends[cy]||[]).filter(d=>pAmt(d,pk)>0).map(d=>gm(d.fecha)).filter(Boolean)).size;
  const curM=divMonths>0?ytdDiv/divMonths:0;
  const rem=Math.max(0,inv-tDiv);

  const sc=[{name:'Conservador',monthly:Math.round(curM*0.7)||800,color:T.dv,desc:'Ritmo reducido'},{name:'Base',monthly:Math.round(curM)||1000,color:T.gold,desc:'Ritmo actual'},{name:'Optimista',monthly:Math.round(curM*1.4)||1500,color:T.gd,desc:'Con mejoras'}];
  const proj=sc.map(s=>({...s,roi1y:inv>0?((tDiv+s.monthly*12)/inv*100):0,roi2y:inv>0?((tDiv+s.monthly*24)/inv*100):0,roi3y:inv>0?((tDiv+s.monthly*36)/inv*100):0,pbM:rem>0&&s.monthly>0?Math.ceil(rem/s.monthly):0}));

  const r2y=rem>0?Math.ceil(rem/24):0,r3y=rem>0?Math.ceil(rem/36):0,r4y=rem>0?Math.ceil(rem/48):0;
  const mToEoy=12-cm;
  const roiEoy=inv>0?(tDiv+curM*mToEoy)/inv*100:0;
  const roiEoy1=inv>0?(tDiv+curM*(mToEoy+12))/inv*100:0;
  const roiEoy2=inv>0?(tDiv+curM*(mToEoy+24))/inv*100:0;

  const today=now.toISOString().slice(0,10);
  const yb=bookings.filter(b=>b.date?.startsWith(String(cy))&&b.date<=today&&b.activity_type!=='blocked');
  const annRev=cm>0?yb.reduce((s,b)=>s+(b.price_eur||0),0)/cm*12:0;
  const complexVal=annRev*10;const myVal=complexVal*pct/100;const unrealized=myVal-inv;

  const chMap={};(courts||[]).forEach(c=>{chMap[c.id]={name:c.name,type:c.type,hours:0}});
  yb.forEach(b=>(b.court_ids||[]).forEach(cid=>{if(chMap[cid])chMap[cid].hours+=(b.duration||0)}));
  const under=Object.values(chMap).sort((a,b)=>a.hours-b.hours).filter(c=>c.hours<60);
  const curBdays=yb.filter(b=>b.activity_type==='cumpleanos').length+(historicalSales||[]).filter(s=>s.sale_date?.startsWith(String(cy))&&s.activity_type==='cumpleanos').length;
  const bdAvg=cm>0?curBdays/cm:0;

  return <div className="fade-in">
    {/* Palancas first */}
    <div style={S.card}>
      <div style={S.lbl}>PALANCAS DE CRECIMIENTO</div>
      <div style={{marginTop:16}}>
        <div style={S.row}><div><div style={{fontSize:12,fontWeight:700,color:T.ch,fontFamily:T.sa}}>Mas Cumpleanos</div><div style={{fontSize:11,color:T.mu,fontFamily:T.sa,marginTop:2}}>Actual: {bdAvg.toFixed(1)}/mes. 2025: ~10/mes. Cada uno = ~REF 300-500.</div></div></div>
        {under.length>0&&<div style={S.row}><div><div style={{fontSize:12,fontWeight:700,color:T.ch,fontFamily:T.sa}}>Activar Canchas Subutilizadas</div><div style={{fontSize:11,color:T.mu,fontFamily:T.sa,marginTop:2}}>{under.map(c=>c.name).join(', ')} con &lt;60h YTD.</div></div></div>}
        <div style={S.row}><div><div style={{fontSize:12,fontWeight:700,color:T.ch,fontFamily:T.sa}}>Cobrar Pendientes</div><div style={{fontSize:11,color:T.mu,fontFamily:T.sa,marginTop:2}}>Reducir morosidad mejora dividendos.</div></div></div>
        <div style={{...S.row,borderBottom:'none'}}><div><div style={{fontSize:12,fontWeight:700,color:T.ch,fontFamily:T.sa}}>Cantina + Eventos</div><div style={{fontSize:11,color:T.mu,fontFamily:T.sa,marginTop:2}}>Ingresos adicionales al fondo distribuible.</div></div></div>
      </div>
    </div>

    {inv>0&&<><div style={S.div}/>
    {proj.map((s,i)=><div key={i} style={{...S.card,borderLeft:`4px solid ${s.color}`,marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div><div style={{fontSize:13,fontWeight:700,color:T.ch,fontFamily:T.sa}}>{s.name}</div><div style={{fontSize:11,color:T.mu,fontFamily:T.sa,marginTop:2}}>{s.desc}</div></div>
        <div style={{textAlign:'right'}}><span style={{fontSize:20,fontWeight:400,fontFamily:T.se,color:s.color,letterSpacing:-1}}>{fmt(s.monthly)}</span><span style={{fontSize:10,color:T.mu,fontFamily:T.sa}}>/mes</span></div>
      </div>
      <div style={{display:'flex',marginTop:16,borderTop:`1px solid ${T.bg2}`,paddingTop:12}}>
        {[{l:'PAYBACK',v:s.pbM>0?`${s.pbM}m`:'Listo'},{l:'ROI 1A',v:fmtPct(s.roi1y)},{l:'ROI 2A',v:fmtPct(s.roi2y)},{l:'ROI 3A',v:fmtPct(s.roi3y)}].map((it,j)=><div key={j} style={{flex:1,textAlign:'center'}}><div style={{fontSize:8,textTransform:'uppercase',letterSpacing:2,color:T.mu,fontFamily:T.sa}}>{it.l}</div><div style={{fontSize:13,fontWeight:700,color:T.ch,fontFamily:T.se,marginTop:4}}>{it.v}</div></div>)}
      </div>
    </div>)}

    <div style={S.div}/>
    <div style={S.card}>
      <div style={S.lbl}>RITMO NECESARIO PARA PAYBACK</div>
      <div style={{marginTop:12}}>
        {[{y:'2 anos',v:r2y},{y:'3 anos',v:r3y},{y:'4 anos',v:r4y}].map((r,i)=><div key={i} style={{...S.row,borderBottom:i<2?`1px solid ${T.bg2}`:'none'}}><span style={{fontSize:12,fontFamily:T.sa,color:T.ch}}>Payback en {r.y}</span><span style={S.mo}>{fmt(r.v)}/mes</span></div>)}
      </div>
    </div>

    <div style={S.div}/>
    <div style={S.card}>
      <div style={S.lbl}>ROI PROYECTADO (AL RITMO ACTUAL)</div>
      <div style={{display:'flex',gap:12,marginTop:16}}>
        {[{y:`Dic ${cy}`,v:roiEoy},{y:`Dic ${cy+1}`,v:roiEoy1},{y:`Dic ${cy+2}`,v:roiEoy2}].map((r,i)=><div key={i} style={{flex:1,background:T.bg2,borderRadius:12,padding:16,textAlign:'center'}}><div style={{fontSize:9,textTransform:'uppercase',letterSpacing:2,color:T.mu,fontFamily:T.sa,marginBottom:6}}>{r.y}</div><div style={{fontSize:20,fontWeight:400,fontFamily:T.se,color:T.gold,letterSpacing:-1}}>{fmtPct(r.v)}</div></div>)}
      </div>
    </div>

    <div style={S.div}/>
    <div style={S.card}>
      <div style={S.lbl}>VALOR DE PARTICIPACION HOY</div>
      <div style={{marginTop:12}}>
        {[{l:'Inversion original',v:fmt(inv)},{l:'Dividendos recibidos',v:`+${fmt(tDiv)}`,c:T.gr},{l:'Valor estimado complejo (10x rev.)',v:fmt(complexVal)},{l:`Tu ${fmtPct(pct)}`,v:fmt(myVal),bold:true},{l:'Ganancia no realizada',v:unrealized>=0?`+${fmt(unrealized)}`:`-${fmt(Math.abs(unrealized))}`,c:unrealized>=0?T.gr:T.rd,bold:true}].map((r,i)=><div key={i} style={{...S.row,borderBottom:i<4?`1px solid ${T.bg2}`:'none'}}><span style={{fontSize:12,fontFamily:T.sa,color:T.ch}}>{r.l}</span><span style={{...S.mo,...(r.bold?{fontSize:14}:{}),color:r.c||T.ch}}>{r.v}</span></div>)}
      </div>
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

  useEffect(()=>{supabase.auth.getSession().then(({data:{session:s}})=>{setSession(s);setLoading(false)});const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s));return()=>subscription.unsubscribe()},[]);
  const fetchData=useCallback(async(tk)=>{setDl(true);setErr('');try{const r=await fetch('/api/dashboard',{headers:{Authorization:`Bearer ${tk}`}});if(!r.ok)throw new Error('Error cargando datos');setData(await r.json())}catch(e){setErr(e.message)}finally{setDl(false)}},[]);
  useEffect(()=>{if(session?.access_token)fetchData(session.access_token)},[session,fetchData]);

  if(loading)return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:T.bg}}><Loader2 size={20} className="animate-spin" style={{color:T.gold}}/></div>;
  if(!session)return <LoginScreen onLogin={s=>setSession(s)}/>;

  const userEmail=data?.userEmail||session?.user?.email||'';
  const partnerKey=PARTNER_MAP[userEmail]||'WISI';
  const partnerPct=data?.roi?.[partnerKey]?.participacion||0;
  const tabs=['EL COMPLEJO','MI PARTE','PROYECCIONES'];

  return <div style={{minHeight:'100vh',background:T.bg}}>
    <header style={{position:'sticky',top:0,zIndex:50,background:T.bg,borderBottom:`1px solid ${T.dv}`}}>
      <div style={{maxWidth:520,margin:'0 auto',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,background:T.gold,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#FFF',fontSize:14,fontWeight:700,fontFamily:T.se}}>F</span></div>
          <div><div style={{fontSize:13,fontWeight:700,color:T.ch,fontFamily:T.sa,lineHeight:1.2}}>Futuros Socios</div><div style={{fontSize:9,color:T.mu,letterSpacing:2,textTransform:'uppercase',fontFamily:T.sa}}>{partnerKey} — {fmtPct(partnerPct)}</div></div>
        </div>
        <button onClick={async()=>{await supabase.auth.signOut();setSession(null);setData(null)}} style={{background:'none',border:'none',cursor:'pointer',padding:8}}><LogOut size={16} color={T.mu}/></button>
      </div>
      <div style={{maxWidth:520,margin:'0 auto',display:'flex',padding:'0 16px'}}>
        {tabs.map((t,i)=><button key={i} onClick={()=>setTab(i)} style={{background:'none',border:'none',color:tab===i?T.gold:T.mu,padding:'10px 14px',fontSize:10,fontWeight:600,cursor:'pointer',borderBottom:tab===i?`2px solid ${T.gold}`:'2px solid transparent',letterSpacing:1.5,textTransform:'uppercase',fontFamily:T.sa,whiteSpace:'nowrap',flex:1,textAlign:'center'}}>{t}</button>)}
      </div>
    </header>
    <main style={{maxWidth:520,margin:'0 auto',padding:'20px 16px 80px'}}>
      {dl&&!data&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 0'}}><Loader2 size={20} className="animate-spin" style={{color:T.gold,marginBottom:12}}/><span style={{fontSize:12,color:T.mu,fontFamily:T.sa}}>Cargando datos...</span></div>}
      {err&&<div style={{...S.card,borderColor:T.rd,textAlign:'center'}}><p style={{fontSize:12,color:T.rd,margin:0}}>{err}</p><button onClick={()=>fetchData(session.access_token)} style={{fontSize:11,color:T.rd,background:'none',border:'none',textDecoration:'underline',cursor:'pointer',marginTop:8,fontFamily:T.sa}}>Reintentar</button></div>}
      {data&&!dl&&<ErrorBoundary>
        {tab===0&&<TabComplejo data={data}/>}
        {tab===1&&<TabParticipacion data={data} partnerKey={partnerKey}/>}
        {tab===2&&<TabProyecciones data={data} partnerKey={partnerKey}/>}
      </ErrorBoundary>}
    </main>
  </div>;
}
