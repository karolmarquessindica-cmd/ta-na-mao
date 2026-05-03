import React from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid
} from "recharts";

const green = "#08783f";
const softGreen = "#e7f7ea";
const border = "#e5ebe3";
const text = "#111827";
const muted = "#667085";

function IconBubble({ children, bg = softGreen, color = green }) {
  return (
    <div style={{
      width: 52,
      height: 52,
      borderRadius: 18,
      background: bg,
      color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 24,
      flexShrink: 0
    }}>
      {children}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div className="card" style={{
      background: "#fff",
      border: `1px solid ${border}`,
      borderRadius: 18,
      boxShadow: "0 8px 24px rgba(16,24,40,.045)",
      ...style
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ title, subtitle, action }) {
  return (
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:16}}>
      <div>
        <h3 style={{fontSize:18,fontWeight:800,color:text,margin:0,letterSpacing:"-.02em"}}>{title}</h3>
        {subtitle && <p style={{fontSize:13,color:muted,margin:"5px 0 0"}}>{subtitle}</p>}
      </div>
      {action && <button style={{border:0,background:"transparent",color:green,fontWeight:800,fontSize:13,cursor:"pointer"}}>{action}</button>}
    </div>
  );
}

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("tnm_user") || "{}");

  const chartData = [
    { name: "Dez/23", prev: 64, corr: 12 },
    { name: "Jan/24", prev: 47, corr: 27 },
    { name: "Fev/24", prev: 86, corr: 9 },
    { name: "Mar/24", prev: 66, corr: 35 },
    { name: "Abr/24", prev: 101, corr: 16 },
    { name: "Mai/24", prev: 84, corr: 44 },
  ];

  const pieData = [
    { name: "Abertos", value: 6, color: "#ef4444", percent: "17%" },
    { name: "Em andamento", value: 12, color: "#f59e0b", percent: "33%" },
    { name: "Aguardando retorno", value: 10, color: "#3b82f6", percent: "28%" },
    { name: "Concluídos", value: 8, color: "#16a34a", percent: "22%" },
  ];

  const kpis = [
    { label: "Manutenções", value: "48", note: "15% vs mês anterior", icon: "🔧", bg: "#e8f7ea", color: green },
    { label: "Chamados", value: "36", note: "6 abertos", icon: "💬", bg: "#efe7ff", color: "#6d28d9", red: true },
    { label: "Avisos", value: "8", note: "2 urgentes", icon: "⚠", bg: "#fff3dc", color: "#f59e0b", red: true },
    { label: "Moradores", value: "1.257", note: "8% vs mês anterior", icon: "👥", bg: "#e8f7ea", color: green },
    { label: "Arrecadado", value: "R$ 125.430,00", note: "12% vs mês anterior", icon: "$", bg: "#e8f7ea", color: green },
    { label: "Comunicados", value: "12", note: "Enviados este mês", icon: "📄", bg: "#efe7ff", color: "#6d28d9" },
  ];

  const activities = [
    ["🔧", "Manutenção preventiva realizada", "Elevador Social - Torre A", "Hoje, 08:30", "#e8f7ea"],
    ["💬", "Novo chamado aberto", "Vazamento no salão de festas", "Hoje, 08:15", "#efe7ff"],
    ["⚠", "Aviso publicado", "Interdição da piscina", "Ontem, 17:45", "#fff3dc"],
    ["$", "Despesa registrada", "Compra de bomba d’água", "Ontem, 14:20", "#e8f7ea"],
  ];

  const maintenance = [
    ["Elevador Social - Torre A", "24/05/2024 • 08:00 às 12:00"],
    ["Bombas d’água - Subsolo", "27/05/2024 • 09:00 às 11:00"],
    ["Gerador - Área comum", "03/06/2024 • 08:00 às 10:00"],
  ];

  const comunicados = [
    ["Assembleia Geral Ordinária", "30/04/2024 às 18:00", "2h atrás"],
    ["Interdição da piscina", "29/04/2024 às 16:30", "1 dia atrás"],
    ["Manutenção do elevador", "28/04/2024 às 10:00", "2 dias atrás"],
  ];

  return (
    <div className="page" style={{padding: "28px 30px 34px", maxWidth: 1480, margin: "0 auto"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:20,marginBottom:28}}>
        <div>
          <h1 style={{fontSize:29,fontWeight:900,color:text,letterSpacing:"-.04em",margin:0}}>
            Olá, {user?.nome || "Roberto"} <span style={{fontSize:24}}>👋</span>
          </h1>
          <p style={{color:muted,fontSize:15,margin:"7px 0 0"}}>Aqui está o resumo geral do seu condomínio.</p>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12,alignItems:"flex-end"}}>
          <select style={{width:310,height:45,borderRadius:10,border:`1px solid ${border}`,padding:"0 14px",fontWeight:700,color:text,background:"#fff"}}>
            <option>🏢 Residencial Parque das Flores</option>
            <option>Residencial Horizonte</option>
          </select>
          <div style={{display:"flex",gap:12}}>
            <select style={{width:250,height:42,borderRadius:10,border:`1px solid ${border}`,padding:"0 14px",fontWeight:700,color:text,background:"#fff"}}>
              <option>📅 01/05/2024 - 31/05/2024</option>
            </select>
            <button style={{height:42,border:0,borderRadius:10,background:green,color:"#fff",fontWeight:800,padding:"0 26px",boxShadow:"0 8px 18px rgba(8,120,63,.18)"}}>Filtros</button>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(6, minmax(160px, 1fr))",gap:15,marginBottom:20}}>
        {kpis.map((k, i) => (
          <Card key={i} style={{padding:18,minHeight:122,display:"flex",alignItems:"center",gap:16}}>
            <IconBubble bg={k.bg} color={k.color}>{k.icon}</IconBubble>
            <div>
              <div style={{fontSize:25,fontWeight:900,color:text,letterSpacing:"-.04em",lineHeight:1.05}}>{k.value}</div>
              <div style={{fontSize:13,color:"#344054",fontWeight:700,marginTop:7}}>{k.label}</div>
              <div style={{fontSize:11,color:k.red ? "#ef4444" : green,fontWeight:800,marginTop:8}}>{k.red ? "●" : "↑"} {k.note}</div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.42fr 1.05fr 1.1fr",gap:16,marginBottom:16}}>
        <Card style={{padding:22,minHeight:330}}>
          <SectionTitle title="Resumo de manutenções" subtitle="Comparativo dos últimos 6 meses" action="6 meses" />
          <div style={{display:"flex",gap:22,alignItems:"center",fontSize:13,fontWeight:800,color:"#344054",marginBottom:10}}>
            <span><span style={{display:"inline-block",width:9,height:9,borderRadius:999,background:green,marginRight:8}}/>Preventivas</span>
            <span><span style={{display:"inline-block",width:9,height:9,borderRadius:999,background:"#98a2b3",marginRight:8}}/>Corretivas</span>
          </div>
          <ResponsiveContainer width="100%" height={225}>
            <LineChart data={chartData} margin={{top: 8, right: 12, left: -18, bottom: 0}}>
              <CartesianGrid stroke="#eef2ec" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{fontSize:12, fill: "#667085"}} />
              <YAxis tickLine={false} axisLine={false} tick={{fontSize:12, fill: "#667085"}} />
              <Tooltip contentStyle={{borderRadius:12,border:`1px solid ${border}`,boxShadow:"0 8px 24px rgba(16,24,40,.08)"}} />
              <Line type="monotone" dataKey="prev" stroke={green} strokeWidth={3} dot={{r:4,fill:green}} activeDot={{r:6}} />
              <Line type="monotone" dataKey="corr" stroke="#98a2b3" strokeWidth={2.2} strokeDasharray="6 5" dot={{r:4,fill:"#98a2b3"}} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{padding:22,minHeight:330}}>
          <SectionTitle title="Chamados por status" />
          <div style={{display:"grid",gridTemplateColumns:"160px 1fr",alignItems:"center",gap:18}}>
            <div style={{position:"relative",height:205}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={55} outerRadius={82} paddingAngle={0}>
                    {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",pointerEvents:"none"}}>
                <strong style={{fontSize:31,color:text}}>36</strong>
                <span style={{fontSize:12,color:muted,fontWeight:700}}>Total</span>
              </div>
            </div>
            <div style={{display:"grid",gap:14}}>
              {pieData.map((p)=> (
                <div key={p.name} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:10,alignItems:"center",fontSize:12,color:"#344054"}}>
                  <span><i style={{display:"inline-block",width:10,height:10,borderRadius:999,background:p.color,marginRight:8}} />{p.name}</span>
                  <b>{p.value}</b>
                  <span>({p.percent})</span>
                </div>
              ))}
            </div>
          </div>
          <button style={{width:"70%",margin:"8px auto 0",display:"flex",alignItems:"center",justifyContent:"center",height:42,borderRadius:10,border:`1px solid #bfe3c8`,background:"#fff",color:green,fontWeight:850}}>Ver todos os chamados</button>
        </Card>

        <Card style={{padding:22,minHeight:330}}>
          <SectionTitle title="Atividades recentes" action="Ver todas" />
          <div style={{display:"grid",gap:20}}>
            {activities.map((a, i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:14}}>
                <IconBubble bg={a[4]}>{a[0]}</IconBubble>
                <div style={{flex:1,minWidth:0}}>
                  <strong style={{display:"block",fontSize:13,color:text}}>{a[1]}</strong>
                  <span style={{display:"block",fontSize:12,color:muted,marginTop:3}}>{a[2]}</span>
                </div>
                <time style={{fontSize:11,color:muted,whiteSpace:"nowrap"}}>{a[3]}</time>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.05fr .95fr 1fr",gap:16,marginBottom:16}}>
        <Card style={{padding:22,minHeight:235}}>
          <SectionTitle title="Financeiro do mês" />
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:22}}>
            <div><span style={{fontSize:12,color:green,fontWeight:800}}>Arrecadado</span><strong style={{display:"block",fontSize:20,color:green,marginTop:7}}>R$ 125.430,00</strong></div>
            <div><span style={{fontSize:12,color:"#f97316",fontWeight:800}}>A receber</span><strong style={{display:"block",fontSize:20,color:"#ea580c",marginTop:7}}>R$ 18.250,00</strong></div>
            <div><span style={{fontSize:12,color:"#ef4444",fontWeight:800}}>Inadimplência</span><strong style={{display:"block",fontSize:20,color:"#ef4444",marginTop:7}}>R$ 7.890,00</strong></div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#344054",marginBottom:8}}><span>Taxa de inadimplência</span><span>Meta mensal: 5%</span></div>
          <strong style={{fontSize:19,color:text}}>5,3%</strong>
          <div style={{height:8,background:"#e5e7eb",borderRadius:999,overflow:"hidden",marginTop:10}}><div style={{width:"68%",height:"100%",background:green,borderRadius:999}} /></div>
        </Card>

        <Card style={{padding:22,minHeight:235}}>
          <SectionTitle title="Próximas manutenções" action="Ver todas" />
          <div style={{display:"grid",gap:15}}>
            {maintenance.map((m,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12}}>
                <IconBubble bg="#e8f7ea" color={green}>🔧</IconBubble>
                <div style={{flex:1}}><strong style={{fontSize:13,color:text}}>{m[0]}</strong><span style={{display:"block",fontSize:12,color:muted,marginTop:3}}>{m[1]}</span></div>
                <span style={{background:"#dcfce7",color:green,borderRadius:999,padding:"7px 11px",fontSize:11,fontWeight:850}}>Preventiva</span>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{padding:22,minHeight:235}}>
          <SectionTitle title="Comunicados recentes" action="Ver todas" />
          <div style={{display:"grid",gap:16}}>
            {comunicados.map((c,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12}}>
                <IconBubble bg="#e8f7ea" color={green}>📄</IconBubble>
                <div style={{flex:1}}><strong style={{fontSize:13,color:text}}>{c[0]}</strong><span style={{display:"block",fontSize:12,color:muted,marginTop:3}}>{c[1]}</span></div>
                <span style={{background:"#dcfce7",color:green,borderRadius:999,padding:"7px 11px",fontSize:11,fontWeight:850}}>{c[2]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.55fr 1fr",gap:16}}>
        <Card style={{padding:22}}>
          <SectionTitle title="Visão geral do condomínio" subtitle="Acompanhe os principais indicadores do seu condomínio." />
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:0}}>
            {[
              ["4", "Torres", "3 ativas"], ["12", "Andares", "96 unidades"], ["1.257", "Moradores", "+18 este mês"], ["24", "Funcionários", "8 áreas"], ["98%", "Taxa de ocupação", "Unidades ocupadas"], ["4,8", "Satisfação geral", "★★★★★"]
            ].map((v,i)=>(
              <div key={i} style={{padding:"8px 14px",borderRight:i<5?`1px solid ${border}`:0}}>
                <strong style={{display:"block",fontSize:21,color:green}}>{v[0]}</strong>
                <span style={{display:"block",fontSize:12,color:"#344054",fontWeight:800,marginTop:5}}>{v[1]}</span>
                <small style={{display:"block",fontSize:11,color:muted,marginTop:4}}>{v[2]}</small>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{padding:22,background:"linear-gradient(135deg,#eef9ee,#fff)",display:"flex",alignItems:"center",gap:18}}>
          <div style={{width:76,height:118,border:"7px solid #111827",borderRadius:22,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:green,textAlign:"center"}}>Tá na<br/>Mão</div>
          <div>
            <h3 style={{fontSize:18,fontWeight:900,color:text,margin:0}}>Baixe o app do morador</h3>
            <p style={{fontSize:14,color:muted,lineHeight:1.45,margin:"8px 0 16px"}}>Mais praticidade para você e seus moradores.</p>
            <div style={{display:"flex",gap:10}}>
              <button style={{height:42,border:0,borderRadius:10,background:green,color:"#fff",fontWeight:850,padding:"0 20px"}}>Baixar agora</button>
              <button style={{height:42,border:`1px solid #bfe3c8`,borderRadius:10,background:"#fff",color:green,fontWeight:850,padding:"0 18px"}}>Compartilhar</button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
