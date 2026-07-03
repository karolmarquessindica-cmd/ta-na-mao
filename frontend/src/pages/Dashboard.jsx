import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const green = "#08783f";
const border = "#e5ebe3";
const text = "#111827";
const muted = "#667085";

const BASE = (import.meta.env.VITE_API_URL || "https://ta-na-mao-9bii.onrender.com").replace(/\/$/, "");
const API = `${BASE}/api`;

async function request(path) {
  const token = localStorage.getItem("tnm_token");
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

function Card({ children, style }) {
  return <div style={{ background: "#fff", border: `1px solid ${border}`, borderRadius: 18, boxShadow: "0 8px 24px rgba(16,24,40,.045)", ...style }}>{children}</div>;
}

function SectionTitle({ title, subtitle }) {
  return <div style={{ marginBottom: 16 }}><h3 style={{ fontSize: 18, fontWeight: 800, color: text, margin: 0 }}>{title}</h3>{subtitle && <p style={{ fontSize: 13, color: muted, margin: "5px 0 0" }}>{subtitle}</p>}</div>;
}

function IconBubble({ children }) {
  return <div style={{ width: 46, height: 46, borderRadius: 16, background: "#e8f7ea", color: green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{children}</div>;
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value) {
  if (!value) return "Sem data";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Sem data" : d.toLocaleDateString("pt-BR");
}

function inputDate(date) {
  return date.toISOString().slice(0, 10);
}

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("tnm_user") || "{}");
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [condominios, setCondominios] = useState([]);
  const [selected, setSelected] = useState("all");
  const [de, setDe] = useState(inputDate(first));
  const [ate, setAte] = useState(inputDate(last));
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(filters = {}) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("condominioId", filters.selected ?? selected);
      params.set("de", filters.de ?? de);
      params.set("ate", filters.ate ?? ate);
      const data = await request(`/dashboard?${params.toString()}`);
      setDashboard(data);
      const list = data?.filters?.condominios || data?.scope?.condominios || [];
      setCondominios(list);
      setSelected(data?.filters?.selectedCondominioId || filters.selected || selected || "all");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const stats = dashboard?.stats || {};
  const graph = dashboard?.graficos || {};
  const alerts = dashboard?.alertas || [];
  const chartData = (graph.timelineManutencoes || []).map(item => ({
    name: item.label,
    prev: item.preventivas || 0,
    corr: item.avulsas || 0,
  }));

  const selectedName = useMemo(() => {
    if (selected === "all") return "Todas as edificações";
    return condominios.find(c => c.id === selected)?.nome || "Edificação selecionada";
  }, [selected, condominios]);

  const kpis = [
    { label: "Manutenções", value: stats.totalManutencoes || 0, note: `${stats.manutencoesPreventivas || 0} preventivas`, icon: "🔧" },
    { label: "Chamados", value: stats.totalChamados || 0, note: `${stats.chamadosAbertos || 0} abertos`, icon: "💬" },
    { label: "Moradores", value: stats.totalMoradores || 0, note: "ativos no cadastro", icon: "👥" },
    { label: "Documentos", value: stats.totalDocumentos || 0, note: "no período", icon: "📄" },
    { label: "Pendentes", value: stats.manutencoesPendentes || 0, note: "manutenções", icon: "⚠️" },
    { label: "Investido", value: money(stats.valoresInvestidos), note: "manutenção e contas", icon: "$" },
  ];

  return (
    <div className="page" style={{ padding: "28px 30px 34px", maxWidth: 1480, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 28, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 29, fontWeight: 900, color: text, letterSpacing: "-.04em", margin: 0 }}>
            Olá, {user?.nome || "Administrador Tá na Mão"} <span style={{ fontSize: 24 }}>👋</span>
          </h1>
          <p style={{ color: muted, fontSize: 15, margin: "7px 0 0" }}>Resumo filtrado por edificação cadastrada.</p>
          <p style={{ color: green, fontSize: 13, fontWeight: 800, margin: "8px 0 0" }}>Visualizando: {selectedName}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end" }}>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ width: 330, height: 45, borderRadius: 10, border: `1px solid ${border}`, padding: "0 14px", fontWeight: 700, color: text, background: "#fff" }}>
            <option value="all">🏢 Todas as edificações</option>
            {condominios.map(c => <option key={c.id} value={c.id}>🏢 {c.nome}</option>)}
          </select>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} style={{ width: 155, height: 42, borderRadius: 10, border: `1px solid ${border}`, padding: "0 12px", fontWeight: 700, color: text, background: "#fff" }} />
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} style={{ width: 155, height: 42, borderRadius: 10, border: `1px solid ${border}`, padding: "0 12px", fontWeight: 700, color: text, background: "#fff" }} />
            <button onClick={() => load({ selected, de, ate })} style={{ height: 42, border: 0, borderRadius: 10, background: green, color: "#fff", fontWeight: 800, padding: "0 26px", boxShadow: "0 8px 18px rgba(8,120,63,.18)" }}>Filtrar</button>
          </div>
        </div>
      </div>

      {error && <Card style={{ padding: 16, marginBottom: 16, background: "#fee2e2", color: "#991b1b", fontWeight: 800 }}>{error}</Card>}
      {loading && <Card style={{ padding: 16, marginBottom: 16, color: muted }}>Carregando dados do dashboard...</Card>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(160px, 1fr))", gap: 15, marginBottom: 20 }}>
        {kpis.map((k, i) => (
          <Card key={i} style={{ padding: 18, minHeight: 122, display: "flex", alignItems: "center", gap: 16 }}>
            <IconBubble>{k.icon}</IconBubble>
            <div>
              <div style={{ fontSize: 25, fontWeight: 900, color: text, letterSpacing: "-.04em", lineHeight: 1.05 }}>{k.value}</div>
              <div style={{ fontSize: 13, color: "#344054", fontWeight: 700, marginTop: 7 }}>{k.label}</div>
              <div style={{ fontSize: 11, color: green, fontWeight: 800, marginTop: 8 }}>● {k.note}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 22, marginBottom: 16, borderLeft: `5px solid ${green}`, background: "linear-gradient(135deg,#ffffff,#f7fcf7)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 21, fontWeight: 900, color: text, margin: 0 }}>Centro de Manutenções</h2>
            <p style={{ fontSize: 13, color: muted, margin: "6px 0 0" }}>Dados do condomínio selecionado no filtro acima.</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            [stats.manutencoesPreventivas || 0, "Preventivas", `${stats.scorePreventivas || 0}% concluídas`, green],
            [stats.manutencoesAvulsas || 0, "Avulsas", `${stats.scoreAvulsas || 0}% concluídas`, "#f59e0b"],
            [stats.manutencoesPendentes || 0, "Pendentes", "exigem atenção", "#ef4444"],
            [stats.manutencoesEmAndamento || 0, "Em andamento", "em execução", green],
          ].map((m, i) => (
            <div key={i} style={{ background: "#fff", border: `1px solid ${border}`, borderRadius: 14, padding: 15 }}>
              <strong style={{ display: "block", fontSize: 24, color: m[3] }}>{m[0]}</strong>
              <span style={{ display: "block", fontSize: 13, fontWeight: 850, color: text, marginTop: 3 }}>{m[1]}</span>
              <small style={{ display: "block", fontSize: 11, color: muted, marginTop: 5 }}>{m[2]}</small>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card style={{ padding: 22, minHeight: 340 }}>
          <SectionTitle title="Evolução das manutenções" subtitle="Preventivas x avulsas conforme o filtro" />
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData.length ? chartData : [{ name: "Sem dados", prev: 0, corr: 0 }]} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#eef2ec" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#667085" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#667085" }} />
              <Tooltip />
              <Line type="monotone" dataKey="prev" stroke={green} strokeWidth={3.4} dot={{ r: 4, fill: green }} />
              <Line type="monotone" dataKey="corr" stroke="#98a2b3" strokeWidth={2.4} strokeDasharray="6 5" dot={{ r: 4, fill: "#98a2b3" }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: 22, minHeight: 340 }}>
          <SectionTitle title="Riscos e vencimentos" subtitle="Manutenções do condomínio selecionado" />
          <div style={{ display: "grid", gap: 13 }}>
            {alerts.length ? alerts.map((r) => (
              <div key={r.id} style={{ border: `1px solid ${border}`, borderRadius: 14, padding: 13, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <strong style={{ fontSize: 13, color: text }}>{r.titulo}</strong>
                  <span style={{ background: "#fff7ed", color: "#c2410c", borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 900 }}>{r.prioridade || "MEDIA"}</span>
                </div>
                <small style={{ display: "block", fontSize: 11, color: muted, marginTop: 8 }}>Vencimento: {formatDate(r.dataVencimento)}</small>
              </div>
            )) : <p style={{ color: muted, margin: 0 }}>Nenhum vencimento crítico no período.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
