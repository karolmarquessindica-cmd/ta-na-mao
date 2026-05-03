import React from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

export default function Dashboard() {

  const user = JSON.parse(localStorage.getItem("tnm_user") || "{}");

  const chartData = [
    { name: "Jan", prev: 30, corr: 20 },
    { name: "Fev", prev: 45, corr: 25 },
    { name: "Mar", prev: 60, corr: 30 },
    { name: "Abr", prev: 50, corr: 20 },
    { name: "Mai", prev: 70, corr: 35 },
  ];

  const pieData = [
    { name: "Abertos", value: 6, color: "#EF4444" },
    { name: "Andamento", value: 12, color: "#F59E0B" },
    { name: "Concluídos", value: 18, color: "#22C55E" },
  ];

  return (
    <div className="page">

      {/* HEADER */}
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:26,fontWeight:800}}>
          Olá, {user?.nome || "Usuário"} 👋
        </h1>
        <p style={{color:"#6B7280"}}>
          Aqui está o resumo do seu condomínio
        </p>
      </div>

      {/* KPI */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(6,1fr)",
        gap:14,
        marginBottom:20
      }}>
        {[
          ["Manutenções", 48],
          ["Chamados", 36],
          ["Avisos", 8],
          ["Moradores", 1257],
          ["Arrecadado", "R$ 125k"],
          ["Comunicados", 12]
        ].map((c,i)=>(
          <div key={i} className="card" style={{padding:16}}>
            <div style={{fontSize:22,fontWeight:800}}>
              {c[1]}
            </div>
            <div style={{fontSize:13,color:"#6B7280"}}>
              {c[0]}
            </div>
          </div>
        ))}
      </div>

      {/* GRID PRINCIPAL */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"2fr 1fr 1fr",
        gap:16
      }}>

        {/* LINHA */}
        <div className="card" style={{padding:20}}>
          <h3>Manutenções</h3>

          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="prev" stroke="#22C55E" strokeWidth={3}/>
              <Line type="monotone" dataKey="corr" stroke="#9CA3AF" strokeWidth={2}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* DONUT */}
        <div className="card" style={{padding:20}}>
          <h3>Chamados</h3>

          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" innerRadius={50}>
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* ATIVIDADES */}
        <div className="card" style={{padding:20}}>
          <h3>Atividades</h3>

          <div style={{fontSize:13,marginTop:10}}>
            <p>✔ Manutenção preventiva</p>
            <p>📩 Novo chamado</p>
            <p>⚠️ Aviso publicado</p>
          </div>
        </div>
      </div>

      {/* FINANCEIRO */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"2fr 1fr",
        gap:16,
        marginTop:20
      }}>
        <div className="card" style={{padding:20}}>
          <h3>Financeiro</h3>

          <div style={{display:"flex",gap:20,marginTop:10}}>
            <div>
              <b>R$125.430</b>
              <p style={{fontSize:12}}>Arrecadado</p>
            </div>
            <div>
              <b>R$18.250</b>
              <p style={{fontSize:12}}>A receber</p>
            </div>
            <div>
              <b>R$7.890</b>
              <p style={{fontSize:12}}>Inadimplência</p>
            </div>
          </div>
        </div>

        <div className="card" style={{padding:20}}>
          <h3>Próximas manutenções</h3>

          <ul style={{fontSize:13,marginTop:10}}>
            <li>Elevador</li>
            <li>Bomba</li>
            <li>Gerador</li>
          </ul>
        </div>
      </div>

    </div>
  );
}