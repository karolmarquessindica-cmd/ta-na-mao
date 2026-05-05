// ████████████████████████████████████████████████████████████
//  Tá na Mão v2.0 — App.jsx completo
//  Módulos: Dashboard, Manutenção, Chamados, Documentos, Voz,
//  Denúncia, Banners, WhatsApp, Inventário, Usuários,
//  Financeiro, Agenda do Sindico, Relatórios, Portal do Morador
// ████████████████████████████████████████████████████████████

import { useState, useEffect, useCallback, useRef } from "react";
import Dashboard from "./pages/Dashboard";
import GerenciadorFuncionarios from "./pages/GerenciadorFuncionarios";
import FolhaDePonto from "./pages/FolhaDePonto";
import ModoPortariaFuncionario from "./pages/ModoPortariaFuncionario";
import OcorrenciasPortaria from "./pages/OcorrenciasPortaria";
import PortalFuncionario from "./pages/PortalFuncionario";

// ─── CONFIG ──────────────────────────────────────────────────
const BASE = (import.meta.env.VITE_API_URL || "https://ta-na-mao-1.onrender.com").replace(/\/$/, "");
const API_BASE = `${BASE}/api`;

// ─── API CLIENT ──────────────────────────────────────────────
async function req(method, path, body) {
  const token = localStorage.getItem("tnm_token");
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let cfg = { method, headers };
  if (body instanceof FormData) {
    cfg.body = body;
  } else if (body) {
    headers["Content-Type"] = "application/json";
    cfg.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}${path}`, cfg);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}
const api = {
  get:   p      => req("GET",    p),
  post:  (p, b) => req("POST",   p, b),
  put:   (p, b) => req("PUT",    p, b),
  patch: (p, b) => req("PATCH",  p, b),
  del:   p      => req("DELETE", p),
};

// ─── HOOK useFetch ───────────────────────────────────────────
function useFetch(path, deps = []) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(!!path);
  const load = useCallback(async () => {
    if (!path) { setLoading(false); return; }
    setLoading(true);
    try { setData(await api.get(path)); } catch {}
    finally { setLoading(false); }
  }, [path]);
  useEffect(() => { load(); }, [load, ...deps]);
  return { data, loading, reload: load };
}

// ─── TOKENS ──────────────────────────────────────────────────
const C = {
  primary:"#003B24", accent:"#22C55E", neon:"#8DFF2A", success:"#16A34A",
  warning:"#F59E0B", danger:"#EF4444", dark:"#00150B", deep:"#000B05",
  surface:"#F5F8F3", border:"#DDE7DE", text:"#0F1A12", muted:"#68766D",
};

// ─── GLOBAL CSS ───────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:
  radial-gradient(circle at 12% 8%,rgba(141,255,42,.10),transparent 28%),
  radial-gradient(circle at 88% 0%,rgba(0,59,36,.10),transparent 24%),
  ${C.surface};color:${C.text}}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#eef4ee}::-webkit-scrollbar-thumb{background:#b8c8bd;border-radius:999px}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
.fadeIn{animation:fadeIn .35s ease}
.btn{display:inline-flex;align-items:center;gap:7px;padding:10px 18px;border-radius:14px;border:none;font-family:'DM Sans',sans-serif;font-weight:800;font-size:14px;cursor:pointer;transition:all .18s;letter-spacing:.01em}
.btn-primary{background:linear-gradient(135deg,${C.primary},#006B3B);color:#fff;box-shadow:0 12px 28px rgba(0,59,36,.22),0 0 0 1px rgba(141,255,42,.10) inset}.btn-primary:hover{background:linear-gradient(135deg,#004F2E,#078948);transform:translateY(-1px);box-shadow:0 14px 32px rgba(0,92,56,.28),0 0 22px rgba(141,255,42,.18)}
.btn-accent{background:linear-gradient(135deg,#20C65A,#7BFF20);color:#002513;box-shadow:0 10px 24px rgba(34,197,94,.24)}.btn-accent:hover{background:linear-gradient(135deg,#16A34A,#8DFF2A);transform:translateY(-1px)}
.btn-success{background:${C.success};color:#fff}
.btn-danger{background:${C.danger};color:#fff}
.btn-ghost{background:#fff;color:${C.primary};border:1.5px solid ${C.border}}.btn-ghost:hover{background:#F0F8F1;border-color:#B9D8C0}
.btn-sm{padding:7px 14px;font-size:13px;border-radius:10px}
.btn-xs{padding:5px 10px;font-size:12px;border-radius:9px}
.btn:disabled{opacity:.55;cursor:not-allowed;transform:none!important}
.card{background:linear-gradient(180deg,#fff 0%,#FEFFFD 100%);color:${C.text};border-radius:20px;border:1px solid rgba(0,59,36,.11);box-shadow:0 10px 34px rgba(0,35,18,.07);transition:box-shadow .2s,border-color .2s,transform .2s}
.card:hover{box-shadow:0 14px 40px rgba(0,35,18,.11);border-color:#BFE8C6}
input,select,textarea{width:100%;padding:11px 14px;border:1.5px solid ${C.border};border-radius:12px;font-family:'DM Sans',sans-serif;font-size:14px;color:${C.text};outline:none;transition:border-color .2s,box-shadow .2s;background:#fff}
input:focus,select:focus,textarea:focus{border-color:${C.accent};box-shadow:0 0 0 3px rgba(34,197,94,.12)}
label{font-size:13px;font-weight:500;color:${C.muted};display:block;margin-bottom:5px}
.fg{margin-bottom:14px}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.sidebar{width:248px;min-height:100vh;background:
  radial-gradient(circle at 50% 18%,rgba(141,255,42,.14),transparent 26%),
  radial-gradient(circle at 80% 78%,rgba(34,197,94,.10),transparent 30%),
  linear-gradient(180deg,${C.deep} 0%,#002916 48%,#001108 100%);display:flex;flex-direction:column;position:fixed;left:0;top:0;z-index:100;box-shadow:18px 0 50px rgba(0,21,11,.22)}
.nav-item{display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:12px;color:rgba(255,255,255,.72);font-size:14px;font-weight:700;cursor:pointer;transition:all .18s;margin-bottom:4px;border:none;background:transparent;width:100%;text-align:left}
.nav-item:hover{background:rgba(255,255,255,.08);color:#fff}
.nav-item.active{background:linear-gradient(135deg,#0F6B3A,#075229);color:#fff;box-shadow:0 10px 24px rgba(34,197,94,.18),0 0 0 1px rgba(141,255,42,.18) inset}
.nav-section{font-size:10px;font-weight:800;letter-spacing:1.3px;color:rgba(255,255,255,.36);padding:15px 12px 7px;text-transform:uppercase}
.topbar{height:74px;background:rgba(255,255,255,.90);backdrop-filter:blur(16px);border-bottom:1px solid rgba(0,59,36,.10);display:flex;align-items:center;padding:0 26px 0 calc(248px + 26px);position:sticky;top:0;z-index:50;gap:14px;box-shadow:0 10px 30px rgba(0,35,18,.05)}
.main{margin-left:248px;min-height:100vh;background:
  radial-gradient(circle at 85% 6%,rgba(141,255,42,.08),transparent 22%),
  radial-gradient(circle at 16% 30%,rgba(0,59,36,.06),transparent 24%),
  ${C.surface}}
.page{padding:28px 30px 34px;animation:fadeIn .3s ease}
.table{width:100%;border-collapse:collapse}
.table th{font-size:12px;font-weight:800;color:${C.muted};padding:10px 14px;text-align:left;border-bottom:1px solid ${C.border};background:#F4F8F3}
.table td{padding:14px 14px;font-size:14px;border-bottom:1px solid #EEF3EE;vertical-align:middle}
.table tr:last-child td{border-bottom:none}
.table tr:hover td{background:#F7FBF6}
.modal-overlay{position:fixed;inset:0;background:rgba(13,27,42,.58);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .18s;backdrop-filter:blur(4px)}
.modal{background:#fff;border-radius:24px;width:100%;max-width:500px;max-height:88vh;overflow-y:auto;box-shadow:0 26px 86px rgba(0,21,11,.26);border:1px solid rgba(141,255,42,.10)}
.modal-hd{padding:22px 24px 0;display:flex;align-items:center;justify-content:space-between}
.modal-bd{padding:18px 24px 24px}
.modal-title{font-family:'Sora',sans-serif;font-size:17px;font-weight:700}
.mclose{width:30px;height:30px;border-radius:8px;border:none;background:#EEF6EF;cursor:pointer;font-size:16px;color:${C.muted};display:flex;align-items:center;justify-content:center}
.spin{width:34px;height:34px;border:3px solid rgba(0,59,36,.12);border-top-color:${C.neon};border-right-color:${C.accent};border-radius:50%;animation:spin .65s linear infinite;margin:48px auto;display:block;filter:drop-shadow(0 0 12px rgba(141,255,42,.34))}
.tabs{display:flex;gap:4px;background:#EEF6EF;border-radius:10px;padding:4px}
.tab{padding:7px 16px;border-radius:7px;border:none;background:transparent;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;color:${C.muted};cursor:pointer;transition:all .18s}
.tab.active{background:#fff;color:${C.primary};box-shadow:0 1px 4px rgba(0,0,0,.08)}
.badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600}
.bd-pend{background:#FFF3CD;color:#856404}
.bd-prog{background:#E9F8DC;color:#0F6B3A}
.bd-done{background:#D4EDDA;color:#155724}
.bd-dang{background:#F8D7DA;color:#721c24}
.bd-info{background:#DCFCE7;color:#166534}
.bd-gray{background:#DDE7DE;color:#475569}
.toast{position:fixed;bottom:22px;right:22px;padding:13px 20px;border-radius:12px;font-size:14px;z-index:999;animation:fadeIn .25s;box-shadow:0 8px 30px rgba(0,0,0,.28);font-family:'DM Sans',sans-serif}
.toast.ok{background:#064e3b;color:#fff}.toast.err{background:#7f1d1d;color:#fff}.toast.info{background:${C.primary};color:#fff}
.login-wrap{min-height:100vh;background:
  radial-gradient(circle at 12% 12%,rgba(141,255,42,.09),transparent 24%),
  radial-gradient(circle at 88% 86%,rgba(0,59,36,.08),transparent 26%),
  #F5F7F4;display:flex;align-items:center;justify-content:center;padding:18px;position:relative;overflow:hidden}
.login-shell{width:min(1440px,100%);min-height:calc(100vh - 36px);display:grid;grid-template-columns:minmax(520px,1.18fr) minmax(420px,.82fr);border-radius:28px;overflow:hidden;background:#fff;box-shadow:0 26px 86px rgba(0,21,11,.14);border:1px solid rgba(0,59,36,.08)}
.login-brand{position:relative;overflow:hidden;padding:54px 56px;background:
  radial-gradient(circle at 28% 10%,rgba(141,255,42,.18),transparent 28%),
  linear-gradient(135deg,#000B05 0%,#002916 55%,#001108 100%);color:#fff;display:flex;flex-direction:column;justify-content:space-between;min-height:720px}
.login-brand::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(135deg,rgba(255,255,255,.06) 0,rgba(255,255,255,.06) 1px,transparent 1px,transparent 24px);opacity:.10}
.login-brand::after{content:'';position:absolute;right:-110px;top:-130px;width:430px;height:430px;border:1px solid rgba(141,255,42,.42);border-radius:48% 52% 44% 56%;transform:rotate(25deg);opacity:.55}
.login-brand-inner{position:relative;z-index:2;display:flex;flex-direction:column;min-height:100%}
.login-logo-row{display:flex;align-items:center;gap:16px}
.login-brand-title{font-family:'Sora',sans-serif;font-size:42px;line-height:1.12;font-weight:900;letter-spacing:-.02em;margin-top:70px;max-width:430px}
.login-brand-title span{color:${C.neon};text-shadow:0 0 22px rgba(141,255,42,.32)}
.login-brand-line{width:58px;height:4px;border-radius:999px;background:${C.neon};box-shadow:0 0 20px rgba(141,255,42,.42);margin:24px 0}
.login-brand-copy{font-size:18px;line-height:1.65;color:rgba(255,255,255,.86);max-width:440px}
.login-building{position:absolute;right:0;bottom:132px;width:48%;height:360px;opacity:.74;z-index:1;pointer-events:none}
.login-building .tower{position:absolute;bottom:0;border-radius:14px 14px 4px 4px;background:linear-gradient(180deg,#194D34,#061D10);box-shadow:0 0 42px rgba(141,255,42,.14)}
.login-building .tower::before{content:'';position:absolute;inset:18px 14px;background:repeating-linear-gradient(0deg,transparent 0 18px,rgba(141,255,42,.78) 18px 28px,transparent 28px 48px),repeating-linear-gradient(90deg,transparent 0 16px,rgba(141,255,42,.75) 16px 26px,transparent 26px 42px);opacity:.9;border-radius:8px}
.login-benefits{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:54px;background:rgba(0,21,11,.34);border:1px solid rgba(141,255,42,.18);border-radius:20px;padding:22px 18px;backdrop-filter:blur(12px)}
.login-benefit{text-align:center;padding:0 14px;border-right:1px solid rgba(255,255,255,.12)}
.login-benefit:last-child{border-right:none}
.login-benefit-icon{width:42px;height:42px;border-radius:14px;background:rgba(141,255,42,.14);color:${C.neon};display:flex;align-items:center;justify-content:center;margin:0 auto 10px;box-shadow:inset 0 0 0 1px rgba(141,255,42,.20)}
.login-benefit strong{display:block;font-size:13px;margin-bottom:6px}
.login-benefit span{display:block;font-size:11px;line-height:1.35;color:rgba(255,255,255,.72)}
.login-security-card{display:flex;align-items:center;gap:15px;width:min(460px,100%);padding:18px 20px;border-radius:18px;background:rgba(0,21,11,.42);border:1px solid rgba(141,255,42,.22);box-shadow:0 18px 45px rgba(0,0,0,.18);margin-top:48px}
.login-security-card p{font-size:13px;line-height:1.45;color:rgba(255,255,255,.78);margin-top:4px}
.login-panel{position:relative;padding:54px 72px;background:#fff;display:flex;align-items:center;justify-content:center}
.login-card{width:100%;max-width:500px;background:#fff;border-radius:0;padding:0;box-shadow:none;position:relative;z-index:1}
.login-support{position:absolute;top:42px;right:52px;display:flex;align-items:center;gap:10px;color:${C.primary};font-size:13px}
.login-support span{display:block;color:${C.muted};font-weight:600}
.login-support strong{font-size:13px;color:${C.success}}
.login-heading{font-family:'Sora',sans-serif;font-size:31px;line-height:1.15;font-weight:900;color:#111827;margin-bottom:8px}
.login-subtitle{font-size:16px;color:#5B6670;margin-bottom:38px}
.login-field{margin-bottom:22px}
.login-field label{font-size:14px;font-weight:900;color:#111827;margin-bottom:9px}
.login-input-wrap{position:relative}
.login-input-wrap input{height:56px;border-radius:12px;padding-left:52px;padding-right:48px;border:1.5px solid #DDE5DE;font-size:15px;background:#fff}
.login-input-icon{position:absolute;left:18px;top:50%;transform:translateY(-50%);color:#68766D;display:flex}
.login-password-action{position:absolute;right:16px;top:50%;transform:translateY(-50%);border:none;background:transparent;color:#68766D;display:flex;cursor:pointer;padding:4px}
.login-forgot{display:flex;justify-content:flex-end;margin-top:-6px;margin-bottom:28px}
.login-forgot button{border:none;background:transparent;color:${C.success};font-weight:900;cursor:pointer;font-size:14px}
.login-divider{display:flex;align-items:center;gap:14px;color:#8A9490;font-weight:800;font-size:13px;margin:28px 0}
.login-divider::before,.login-divider::after{content:'';height:1px;background:#DDE7DE;flex:1}
.login-safe{display:flex;align-items:center;gap:12px;margin-top:44px;color:${C.muted};font-size:13px}
@media (max-width:920px){
  .login-wrap{padding:0;background:linear-gradient(135deg,#00150B,#003B24)}
  .login-shell{display:block;min-height:100vh;border-radius:0;border:none;box-shadow:none;background:#fff}
  .login-brand{display:none}
  .login-panel{min-height:100vh;padding:34px 22px;background:radial-gradient(circle at 50% -10%,rgba(141,255,42,.12),transparent 28%),#fff}
  .login-support{display:none}
  .login-card{max-width:430px}
  .login-card::before{content:'';display:block;width:84px;height:84px;margin:0 auto 22px;border-radius:26px;background:url('/brand/logo-tanamao.svg?v=2') center/contain no-repeat}
  .login-heading{text-align:center;font-size:27px}
  .login-subtitle{text-align:center;font-size:14px;margin-bottom:30px}
}
.stat{background:#fff;border-radius:20px;padding:18px 20px;border:1px solid rgba(0,59,36,.10);box-shadow:0 10px 34px rgba(0,35,18,.07)}
.stat-n{font-family:'Sora',sans-serif;font-size:34px;font-weight:800;line-height:1.05}
.stat-l{font-size:13px;color:${C.muted};margin-top:4px;font-weight:600}
.portal-hd{background:
  radial-gradient(circle at 78% 20%,rgba(141,255,42,.18),transparent 24%),
  linear-gradient(145deg,#001006 0%,#053018 54%,#0B3B1B 100%);color:#fff;padding:36px 28px;position:relative;overflow:hidden;box-shadow:0 18px 44px rgba(0,21,11,.22)}
.portal-hd::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(135deg,rgba(255,255,255,.08) 0,rgba(255,255,255,.08) 1px,transparent 1px,transparent 18px);opacity:.14}
.portal-hd::after{content:'';position:absolute;right:-44px;bottom:-56px;width:150px;height:150px;border-radius:50%;background:rgba(141,255,42,.12);filter:blur(18px)}
.pnav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:420px;background:#fff;border-top:1px solid ${C.border};display:flex;padding:8px 0 10px;z-index:100;box-shadow:0 -4px 18px rgba(0,0,0,.07)}
.pnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;border:none;background:transparent;cursor:pointer;padding:3px 0}
.portal-action{background:linear-gradient(135deg,#22c55e,#7BFF20)!important;color:#002513!important;border:none!important;box-shadow:0 8px 20px rgba(34,197,94,.30);transition:all .18s}
.portal-action:hover{background:#16a34a!important;transform:translateY(-1px)}
.portal-action:disabled,.portal-pill:disabled{opacity:.55;cursor:not-allowed;transform:none;box-shadow:none}
.portal-pill{background:linear-gradient(135deg,#22c55e,#7BFF20)!important;color:#002513!important;border:none!important;border-radius:999px!important;padding:7px 12px!important;box-shadow:0 8px 18px rgba(34,197,94,.24);transition:all .18s}
.portal-pill:hover{background:#16a34a!important;transform:translateY(-1px)}
.portal-nav-icon{width:34px;height:34px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:#dcfce7;color:#166534;transition:all .18s}
.pnav-btn:hover .portal-nav-icon{background:#bbf7d0;color:#14532d}
.portal-nav-icon.active{background:linear-gradient(135deg,#22c55e,#7BFF20);color:#002513;box-shadow:0 8px 20px rgba(34,197,94,.30)}
.toggle-wrap{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid ${C.border}}
.toggle{width:40px;height:22px;border-radius:11px;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0}
.toggle-dot{width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:2px;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
@keyframes carou{from{opacity:0;transform:translateX(36px)}to{opacity:1;transform:translateX(0)}}
.cslide{display:none}.cslide.on{display:block;animation:carou .4s ease}
.cdot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.38);border:none;cursor:pointer;padding:0;transition:all .2s}
.cdot.on{background:#fff;width:20px;border-radius:4px}
.progress-bar{height:7px;background:#E8F0E8;border-radius:999px;overflow:hidden}
.progress-fill{height:100%;border-radius:999px;transition:width .55s ease}
.anon-card{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;border-radius:16px;padding:22px;position:relative;overflow:hidden}
.anon-card::before{content:'🔒';position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:56px;opacity:.12}
.dashboard-print{display:none}
.brand-mark{display:inline-flex;align-items:center;justify-content:center;position:relative;overflow:hidden;background:
  radial-gradient(circle at 52% 18%,rgba(141,255,42,.18),transparent 28%),
  linear-gradient(145deg,#002415,#000B05 78%);box-shadow:0 14px 34px rgba(0,21,11,.30),inset 0 0 0 1px rgba(141,255,42,.18)}
.brand-mark::before{content:'';position:absolute;inset:9%;border-radius:24%;border:2px solid rgba(141,255,42,.68);filter:drop-shadow(0 0 8px rgba(141,255,42,.40))}
.brand-mark svg{position:relative;z-index:1;width:78%;height:78%;filter:drop-shadow(0 7px 14px rgba(0,0,0,.24))}
.brand-word{font-family:'Sora',sans-serif;font-weight:900;letter-spacing:-.02em;color:#fff}
.brand-word .brand-neon{color:${C.neon};text-shadow:0 0 18px rgba(141,255,42,.42)}
.brand-sub{font-size:10px;text-transform:uppercase;letter-spacing:.9px;color:rgba(255,255,255,.62);font-weight:800}
.icon-soft{background:#DCFCE7;color:${C.primary};box-shadow:inset 0 0 0 1px rgba(34,197,94,.12)}
.glow-panel{background:linear-gradient(145deg,#00150B,#003B24 65%,#001108);color:#fff;border-color:rgba(141,255,42,.22)!important;box-shadow:0 18px 44px rgba(0,21,11,.24),0 0 28px rgba(141,255,42,.10)!important}
@media print{.no-print,.sidebar,.topbar{display:none!important}.main{margin-left:0!important}.report-page{padding:0!important;background:#fff!important}.card{box-shadow:none!important}.dashboard-print{display:block!important;padding:18px!important;background:#fff!important;color:#0F1A12!important;font-family:Arial,sans-serif!important}.dashboard-print h1{font-size:24px;color:#003B24;margin:0 0 4px}.dashboard-print h2{font-size:15px;margin:20px 0 8px}.dashboard-print .dp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.dashboard-print .dp-card{border:1px solid #DDE7DE;border-radius:10px;padding:12px}.dashboard-print .dp-num{font-size:22px;font-weight:700;color:#003B24}.dashboard-print table{width:100%;border-collapse:collapse}.dashboard-print td{border-bottom:1px solid #DDE7DE;padding:7px 8px;font-size:12px}.dashboard-print .dp-meta{color:#68766D;font-size:12px;margin-bottom:18px}@page{size:A4;margin:12mm}}
`;

// ─── SVG ICONS ────────────────────────────────────────────────
const Ic = ({ n, s = 18, c = "currentColor" }) => {
  const d = {
    dash:   "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
    wrench: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
    chat:   "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    doc:    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
    users:  "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7.73-1.87a4 4 0 0 1 0 7.75M23 21v-2a4 4 0 0 0-3-3.87",
    box:    "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
    chart:  "M18 20V10M12 20V4M6 20v-6",
    mic:    "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    mon:    "M2 3h20v14H2zM8 21h8M12 17v4",
    wa:     null,
    bell:   "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
    plus:   "M12 5v14M5 12h14",
    x:      "M18 6 6 18M6 6l12 12",
    check:  "M20 6 9 17l-5-5",
    eye:    "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    send:   "M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z",
    up:     "M16 16 12 12 8 16M12 12v9M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3",
    dl:     "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
    home:   "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
    thumb:  "M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3",
    chev:   "M9 18l6-6-6-6",
    alert:  "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
    logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
    cal:    "M3 4h18v18H3zM16 2v4M8 2v4M3 10h18",
    money:  "M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6",
    key:    "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4",
    ai:     "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z",
    water:  "M12 2s6 6.37 6 11a6 6 0 1 1-12 0c0-4.63 6-11 6-11z",
    building: "M3 21h18M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M9 7h1M13 7h1M9 11h1M13 11h1M9 15h1M13 15h1M17 9h2a1 1 0 0 1 1 1v11",
  };
  if (n === "wa") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  );
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d[n] || ""} />
    </svg>
  );
};

// ─── HELPERS ─────────────────────────────────────────────────
const fmt = {
  date:  d => d ? new Date(d).toLocaleDateString("pt-BR") : "—",
  money: v => new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format(v||0),
  ago:   d => { const m = Math.floor((Date.now()-new Date(d))/60000); return m<1?"agora":m<60?`${m}min`:m<1440?`${Math.floor(m/60)}h`:`${Math.floor(m/1440)}d`; },
};
const assetUrl = url => url?.startsWith("/uploads/") ? `${BASE.replace(/\/api$/, "")}${url}` : url;
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const logoSource = item => assetUrl(item?.logoUrl || item?.logo);

// ─── COMPONENTS ──────────────────────────────────────────────

const asList = value => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];
const toChatHistory = msgs => msgs.slice(-6).map(m => ({
  role: m.r === "u" ? "user" : "assistant",
  content: m.t,
}));

function Spinner() { return <div className="spin" />; }

function BrandMark({ size = 52, radius = 16 }) {
  const [failed, setFailed] = useState(false);
  if (!failed) {
    return (
      <span
        style={{width:size,height:size,borderRadius:radius,display:"inline-flex",alignItems:"center",justifyContent:"center",background:"transparent",padding:0,overflow:"hidden",flexShrink:0}}
      >
        <img
          src="/brand/logo-tanamao.svg?v=2"
          alt="Tá na Mão"
          onError={()=>setFailed(true)}
          style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}}
        />
      </span>
    );
  }
  return (
    <div className="brand-mark" style={{width:size,height:size,borderRadius:radius}} aria-hidden="true">
      <svg viewBox="0 0 64 64" fill="none">
        <path d="M12 42c4 12 16 18 31 13 6-2 10-6 12-12" stroke="#fff" strokeWidth="7" strokeLinecap="round"/>
        <path d="M15 40c-2-8-1-17 2-23" stroke="#fff" strokeWidth="7" strokeLinecap="round"/>
        <path d="M51 40c2-7 2-14-1-19" stroke="#fff" strokeWidth="7" strokeLinecap="round"/>
        <path d="M22 31 32 22l10 9v15a3 3 0 0 1-3 3H25a3 3 0 0 1-3-3V31z" fill="#fff"/>
        <path d="M29 36h6v6h-6zM37 36h6v6h-6z" fill={C.accent}/>
        <path d="M18 16c0-5 4-9 9-9h19" stroke={C.neon} strokeWidth="4.5" strokeLinecap="round"/>
        <path d="M48 9c5 1 8 5 8 10v14" stroke={C.neon} strokeWidth="4.5" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3600); return () => clearTimeout(t); }, []);
  return <div className={`toast ${type}`}>{type==="ok"?"✅":type==="err"?"❌":"ℹ️"} {msg}</div>;
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal fadeIn" style={wide?{maxWidth:900}:{}}>
        <div className="modal-hd">
          <span className="modal-title">{title}</span>
          <button className="mclose" onClick={onClose}>✕</button>
        </div>
        <div className="modal-bd">{children}</div>
      </div>
    </div>
  );
}

async function copyTextToClipboard(text) {
  if (!text) return { ok:false, error:"EMPTY" };

  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok:true, method:"clipboard" };
    } catch (error) {
      // Fall through to the legacy path below. Some browsers block clipboard after async work.
    }
  }

  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.top = "0";
    field.style.left = "-9999px";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.focus();
    field.select();
    field.setSelectionRange(0, field.value.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(field);
    if (copied) return { ok:true, method:"execCommand" };
  } catch (error) {
    return { ok:false, error:error?.message || "COPY_FAILED" };
  }

  return { ok:false, error:"COPY_BLOCKED" };
}

function ManualCopyModal({ value, onClose, toast }) {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [value]);

  async function tryCopyAgain() {
    const result = await copyTextToClipboard(value);
    if (result.ok) {
      toast("Link copiado!", "ok");
      onClose();
      return;
    }
    inputRef.current?.focus();
    inputRef.current?.select();
    toast("Copie manualmente pelo campo de texto.", "info");
  }

  function selectText() {
    inputRef.current?.focus();
    inputRef.current?.select();
    toast("Campo selecionado. Use Ctrl+C para copiar.", "info");
  }

  return (
    <Modal title="Copiar link manualmente" onClose={onClose}>
      <p style={{fontSize:13,color:C.muted,marginBottom:12}}>
        O navegador bloqueou a copia automatica. Selecione o link abaixo e copie manualmente.
      </p>
      <div className="fg">
        <label>Link</label>
        <input ref={inputRef} readOnly value={value || ""} onFocus={e=>e.target.select()} />
      </div>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",flexWrap:"wrap"}}>
        <button className="btn btn-ghost btn-sm" onClick={selectText}>Selecionar texto</button>
        <button className="btn btn-primary btn-sm" onClick={tryCopyAgain}>Tentar copiar</button>
      </div>
    </Modal>
  );
}

function useSafeCopy(toast) {
  const [manualValue, setManualValue] = useState("");

  const copyNow = useCallback(async (value, successMessage = "Link copiado!") => {
    if (!value) {
      toast("Link indisponivel para copia.", "err");
      return false;
    }
    const result = await copyTextToClipboard(value);
    if (result.ok) {
      toast(successMessage, "ok");
      return true;
    }
    setManualValue(value);
    toast("Nao foi possivel copiar automaticamente.", "err");
    return false;
  }, [toast]);

  const manualCopyModal = manualValue
    ? <ManualCopyModal value={manualValue} onClose={()=>setManualValue("")} toast={toast} />
    : null;

  return { copyNow, manualCopyModal };
}

function Bdg({ s }) {
  const m = {
    PENDENTE:"bd-pend", RECEBIDO:"bd-pend", EM_ANALISE:"bd-prog", EM_ANDAMENTO:"bd-prog", CONCLUIDO:"bd-done",
    EM_DIA:"bd-done", PROXIMA:"bd-pend", CONCLUIDA:"bd-done",
    ABERTO:"bd-info", PAGO:"bd-done", ATRASADO:"bd-dang", ISENTO:"bd-gray",
    AGUARDANDO:"bd-pend", CONFIRMADA:"bd-done", CANCELADA:"bd-dang",
    ENVIADO:"bd-done", FALHOU:"bd-dang",
    ATIVO:"bd-done", PROXIMO_DO_VENCIMENTO:"bd-pend", ENCERRADO:"bd-dang", REGULAR:"bd-done", VENCIDO:"bd-dang", SEM_SEGURO:"bd-gray",
    Ativo:"bd-done", Inativo:"bd-dang", Operacional:"bd-done", Manutenção:"bd-pend",
  };
  const labels = {
    RECEBIDO:"Recebido", EM_ANDAMENTO:"Em andamento", EM_ANALISE:"Em análise",
    AGUARDANDO:"Aguardando", CONFIRMADA:"Confirmada", CANCELADA:"Cancelada",
    PROXIMO_DO_VENCIMENTO:"Próximo do vencimento", SEM_SEGURO:"Sem seguro",
  };
  const autoLabels = { EM_DIA:"Em dia", PROXIMA:"Proxima", ATRASADA:"Atrasada", CONCLUIDA:"Concluida" };
  return <span className={`badge ${m[s]||"bd-gray"}`}>{autoLabels[s]||labels[s]||s}</span>;
}

function Toggle({ on, onChange, label }) {
  return (
    <div className="toggle-wrap">
      <span style={{fontSize:14}}>{label}</span>
      <div className="toggle" style={{background:on?C.success:"#DDE7DE"}} onClick={onChange}>
        <div className="toggle-dot" style={{left:on?20:2}} />
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ email:"admin@horizonte.com", senha:"senha123" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e) {
    e.preventDefault(); setLoading(true); setErr("");
    try {
      const d = await api.post("/auth/login", form);
      localStorage.setItem("tnm_token", d.token);
      localStorage.setItem("tnm_user", JSON.stringify(d.user));
      onLogin(d.user);
    } catch(e){ setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="login-wrap">
      <div className="login-shell">
        <section className="login-brand">
          <div className="login-building" aria-hidden="true">
            <div className="tower" style={{right:36,width:88,height:240}} />
            <div className="tower" style={{right:128,width:112,height:310}} />
            <div className="tower" style={{right:250,width:78,height:190}} />
          </div>
          <div className="login-brand-inner">
            <div>
              <div className="login-logo-row">
                <BrandMark size={116} radius={30} />
                <div>
                  <div className="brand-word" style={{fontSize:38,lineHeight:.95}}>Tá na<br/><span className="brand-neon">Mão</span></div>
                  <div className="brand-sub" style={{marginTop:12}}>Gestão condominial<br/>na palma da mão</div>
                </div>
              </div>
              <h1 className="login-brand-title">Gestão inteligente <span>começa aqui.</span></h1>
              <div className="login-brand-line" />
              <p className="login-brand-copy">Mais controle, mais transparência e mais tranquilidade para você e para o seu condomínio.</p>
            </div>

            <div>
              <div className="login-benefits">
                {[
                  ["shield","Seguro","Seus dados protegidos com tecnologia de ponta."],
                  ["users","Conectado","Comunicação fácil com moradores e equipe."],
                  ["chart","Eficiente","Processos automatizados e mais agilidade."],
                  ["doc","Transparente","Informações claras para melhores decisões."],
                ].map(([icon,title,text])=>(
                  <div className="login-benefit" key={title}>
                    <div className="login-benefit-icon"><Ic n={icon} s={22} /></div>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <div className="login-security-card">
                <div className="login-benefit-icon" style={{margin:0,flexShrink:0}}><Ic n="shield" s={24} /></div>
                <div>
                  <strong>Plataforma exclusiva para síndicos e administradores</strong>
                  <p>Ambiente seguro e desenvolvido especialmente para a gestão do seu condomínio.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-support">
            <Ic n="bell" s={25} c={C.success} />
            <div><span>Precisa de ajuda?</span><strong>Falar com suporte</strong></div>
          </div>

          <div className="login-card">
            <h2 className="login-heading">Bem-vindo de volta!</h2>
            <p className="login-subtitle">Faça login para acessar o painel do síndico.</p>

            {err && <div style={{background:"#FEE2E2",color:"#B91C1C",padding:"11px 14px",borderRadius:12,fontSize:13,marginBottom:18,fontWeight:700}}>{err}</div>}

            <form onSubmit={submit}>
              <div className="login-field">
                <label>E-mail</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><Ic n="doc" s={20} /></span>
                  <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Digite seu e-mail" />
                </div>
              </div>

              <div className="login-field">
                <label>Senha</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><Ic n="key" s={20} /></span>
                  <input type={showPassword ? "text" : "password"} value={form.senha} onChange={e=>setForm({...form,senha:e.target.value})} placeholder="Digite sua senha" />
                  <button type="button" className="login-password-action" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}><Ic n="eye" s={20} /></button>
                </div>
              </div>

              <div className="login-forgot">
                <button type="button" onClick={()=>setNotice("A recuperação de senha será conectada ao fluxo de convite, WhatsApp ou redefinição segura.")}>Esqueci minha senha</button>
              </div>

              <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",height:56,fontSize:17}} disabled={loading}>
                <Ic n="key" s={20} /> {loading ? "Acessando..." : "Acessar painel"}
              </button>
            </form>

            <div className="login-divider">ou</div>

            <button type="button" className="btn btn-ghost" style={{width:"100%",justifyContent:"center",height:56,fontSize:16,borderColor:C.success,color:C.success}} onClick={()=>setNotice("O acesso com código será liberado em uma próxima etapa. Por enquanto, use e-mail e senha.")}>
              <Ic n="shield" s={20} /> Acessar com código de acesso
            </button>

            <div className="login-safe">
              <div className="login-benefit-icon" style={{margin:0,width:38,height:38,flexShrink:0}}><Ic n="shield" s={19} /></div>
              <div><strong style={{display:"block",color:C.text}}>Acesso seguro e criptografado.</strong><span>Seus dados estão protegidos conosco.</span></div>
            </div>
          </div>
        </section>
      </div>

      {notice && (
        <Modal title="Recurso em preparação" onClose={()=>setNotice("")}>
          <p style={{fontSize:14,color:C.muted,lineHeight:1.55}}>{notice}</p>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:18}}>
            <button className="btn btn-primary btn-sm" onClick={()=>setNotice("")}>Entendi</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── NOTIFICATIONS BELL ───────────────────────────────────────
function NotifBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try { const d = await api.get("/notificacoes"); setItems(d.items||asList(d)); setUnread(d.naoLidas||0); } catch {}
  };
  useEffect(() => { load(); const t = setInterval(load, 30000); return ()=>clearInterval(t); }, []);

  async function markAll() {
    await api.patch("/notificacoes/marcar-todas-lidas").catch(()=>{});
    setUnread(0); setItems(p=>p.map(n=>({...n,lida:true})));
  }

  const icons = { CHAMADO_ABERTO:"🔔", CHAMADO_ATUALIZADO:"🔍", CHAMADO_CONCLUIDO:"✅", MANUTENCAO_VENCENDO:"⚠️", COMUNICADO:"📢", FINANCEIRO:"💰", RESERVA:"🏛️" };

  return (
    <div style={{position:"relative"}}>
      <div onClick={()=>setOpen(!open)} style={{width:36,height:36,borderRadius:"50%",background:C.surface,border:`1.5px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative"}}>
        <Ic n="bell" s={17} c={C.muted} />
        {unread>0 && <div style={{position:"absolute",top:-3,right:-3,width:17,height:17,borderRadius:"50%",background:C.danger,fontSize:10,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{unread>9?"9+":unread}</div>}
      </div>
      {open && <>
        <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:98}} />
        <div style={{position:"absolute",right:0,top:44,width:330,background:"#fff",borderRadius:16,border:`1px solid ${C.border}`,boxShadow:"0 8px 40px rgba(0,0,0,.14)",zIndex:99,overflow:"hidden"}}>
          <div style={{padding:"13px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:15}}>Notificações</span>
            {unread>0&&<button onClick={markAll} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.accent,fontWeight:600}}>Marcar lidas</button>}
          </div>
          <div style={{maxHeight:340,overflowY:"auto"}}>
            {items.length===0 && <p style={{padding:24,textAlign:"center",color:C.muted,fontSize:13}}>Sem notificações</p>}
            {items.map(n=>(
              <div key={n.id} style={{padding:"12px 18px",display:"flex",gap:10,borderBottom:`1px solid #EEF6EF`,background:n.lida?"#fff":"#f0f9ff",cursor:"pointer"}} onClick={async()=>{ await api.patch(`/notificacoes/${n.id}/lida`).catch(()=>{}); setItems(p=>p.map(x=>x.id===n.id?{...x,lida:true}:x)); if(!n.lida)setUnread(p=>Math.max(0,p-1)); }}>
                <div style={{width:34,height:34,borderRadius:9,background:"#EEF6EF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{icons[n.tipo]||"🔔"}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:n.lida?400:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{n.titulo}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{n.mensagem}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>{fmt.ago(n.createdAt)}</div>
                </div>
                {!n.lida&&<div style={{width:7,height:7,borderRadius:"50%",background:C.accent,flexShrink:0,marginTop:5}} />}
              </div>
            ))}
          </div>
        </div>
      </>}
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────
function Sidebar({ cur, go, user, onLogout }) {
  const nav = [
    {g:"Principal", items:[
      {id:"dashboard", i:"dash",   l:"Dashboard"},
      {id:"edificacoes", i:"building", l:"Condomínios"},
      {id:"manut",     i:"wrench", l:"Manutenções"},
      {id:"checklists", i:"check", l:"Checklists Operacionais"},
      {id:"agenda",    i:"cal",    l:"Agenda do Síndico"},
      {id:"chamados",  i:"chat",   l:"Chamados"},
      {id:"voz",       i:"mic",    l:"Voz do Morador"},
      {id:"denuncia",  i:"shield", l:"Não Se Cale"},
    ]},
    {g:"Administrativo", items:[
      {id:"financeiro",i:"money",  l:"Financeiro"},
      {id:"cotacoes",  i:"clipboard", l:"Cotações"},
      {id:"inventario",i:"box",    l:"Inventário"},
      {id:"whatsapp",  i:"wa",     l:"WhatsApp"},
      {id:"funcionarios", i:"users", l:"Funcionários"},
      {id:"folhaPonto", i:"chart", l:"Folha de Ponto"},
      {id:"modoPortariaFuncionario", i:"shield", l:"Modo Portaria"},
      {id:"portal", i:"user", l:"Portal Funcionário"},
      {id:"ocorrenciasPortaria", i:"alert", l:"Ocorrências"},
      {id:"usuarios",  i:"users",  l:"Usuários"},
      {id:"relatorios",i:"chart",  l:"Relatórios"},
    ]},
  ];
  return (
    <div className="sidebar">
      <div style={{padding:"22px 18px 18px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <BrandMark size={38} radius={12} />
          <div>
            <div className="brand-word" style={{fontSize:16}}>Tá na <span className="brand-neon">Mão</span></div>
            <div className="brand-sub">Gestão condominial</div>
          </div>
        </div>
      </div>
      <nav style={{flex:1,padding:"14px 10px",overflowY:"auto"}}>
        {nav.map(g=>(
          <div key={g.g}>
            <div className="nav-section">{g.g}</div>
            {g.items.map(n=>(
              <button key={n.id} className={`nav-item ${cur===n.id?"active":""}`} onClick={()=>go(n.id)}>
                <Ic n={n.i} s={16} />{n.l}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div style={{padding:"13px 14px",borderTop:"1px solid rgba(255,255,255,.08)"}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.neon})`,display:"flex",alignItems:"center",justifyContent:"center",color:C.dark,fontSize:13,fontWeight:900,flexShrink:0,boxShadow:"0 0 18px rgba(141,255,42,.28)"}}>{user?.nome?.[0]||"A"}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:"#fff",fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.nome}</div>
            <div style={{color:"rgba(255,255,255,.38)",fontSize:10}}>{user?.role}</div>
          </div>
          <button style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.38)",padding:4}} onClick={onLogout}><Ic n="logout" s={15} /></button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────
function DashboardLegacy() {
  const { data, loading } = useFetch("/dashboard");
  if (loading) return <Spinner />;
  if (!data) return null;
  const { stats, alertas } = data;
  const cards = [
    { l:"Manutenções ativas",  v: stats.manutencoesEmAndamento + stats.manutencoesPendentes, c:C.accent  },
    { l:"Chamados abertos",    v: stats.chamadosAbertos,    c:C.warning },
    { l:"Moradores ativos",    v: stats.totalMoradores,     c:C.success },
    { l:"Documentos",          v: stats.totalDocumentos,    c:C.primary },
    { l:"Denúncias novas",     v: stats.denunciasNaoLidas,  c:C.danger  },
    { l:"Total de chamados",   v: stats.totalChamados,      c:C.primary },
  ];
  return (
    <div className="page">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:26}}>
        <div><h1 style={{fontFamily:"'Sora',sans-serif",fontSize:23,fontWeight:700}}>Dashboard</h1><p style={{color:C.muted,fontSize:13,marginTop:2}}>Dados em tempo real</p></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:22}}>
        {cards.map((c,i)=>(
          <div key={i} className="stat fadeIn" style={{animationDelay:`${i*.06}s`}}>
            <div className="stat-n" style={{color:c.c}}>{c.v}</div>
            <div className="stat-l">{c.l}</div>
          </div>
        ))}
      </div>
      {alertas?.length>0 && (
        <div className="card" style={{padding:18,borderLeft:`4px solid ${C.warning}`,marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12}}>
            <Ic n="alert" s={17} c={C.warning} />
            <span style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:14}}>Alertas de Vencimento</span>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {alertas.map(a=>(
              <div key={a.id} style={{background:"#FFF3CD",border:"1px solid #FFE69C",borderRadius:8,padding:"7px 13px",fontSize:13,color:"#856404"}}>
                ⚠️ {a.titulo} — {fmt.date(a.dataVencimento)}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card" style={{padding:22}}>
        <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:700,marginBottom:14}}>Visão Geral</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          {[
            {l:"Total manutenções", v:stats.totalManutencoes,  i:"wrench", c:C.accent},
            {l:"Total chamados",    v:stats.totalChamados,     i:"chat",   c:C.warning},
            {l:"Moradores",         v:stats.totalMoradores,    i:"users",  c:C.success},
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:13,background:"#F2FAF1",borderRadius:12,padding:15}}>
              <div style={{width:40,height:40,borderRadius:11,background:s.c+"20",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Ic n={s.i} s={20} c={s.c} />
              </div>
              <div><div style={{fontFamily:"'Sora',sans-serif",fontSize:24,fontWeight:700,color:s.c}}>{s.v}</div><div style={{fontSize:12,color:C.muted}}>{s.l}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MANUTENÇÃO ───────────────────────────────────────────────
const dashboardDefaults = { edificacaoId:"all", categoria:"all", de:"", ate:"" };

function dashboardQuery(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  return params.toString();
}

function htmlSafe(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}

function printDashboardData(data) {
  if (!data) return;
  const { stats, graficos, alertas, scope, filters } = data;
  const logoUrl = assetUrl(scope?.logoUrl || scope?.logo);
  const brand = logoUrl
    ? `<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px"><img src="${htmlSafe(logoUrl)}" alt="${htmlSafe(scope?.label || "Logo")}" style="width:64px;height:64px;object-fit:contain;border:1px solid #E2EBF6;border-radius:12px;padding:6px;background:#fff"><div><h1>${htmlSafe(scope?.label || "Dashboard")}</h1><div style="font-size:10px;color:#6B7FA3;font-weight:800;letter-spacing:1.4px">TA NA MAO</div></div></div>`
    : `<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px"><div><h1>${htmlSafe(scope?.label || "Dashboard TA NA MAO")}</h1><div style="font-size:10px;color:#6B7FA3;font-weight:800;letter-spacing:1.4px">TA NA MAO</div></div></div>`;
  const cards = [
    ["Total de manutenções", stats.totalManutencoes],
    ["Preventivas", stats.manutencoesPreventivas],
    ["Avulsas", stats.manutencoesAvulsas],
    ["Chamados", stats.totalChamados],
    ["Valores investidos", fmt.money(stats.valoresInvestidos)],
    ["Score preventivas", `${stats.scorePreventivas}%`],
    ["Score avulsas", `${stats.scoreAvulsas}%`],
    ["Chamados abertos", stats.chamadosAbertos],
  ];
  const list = (title, items) => `
    <h2>${htmlSafe(title)}</h2>
    <table><tbody>${(items || []).map(i => `<tr><td>${htmlSafe(i.label || i.nome)}</td><td>${htmlSafe(i.total ?? i.chamados ?? 0)}</td></tr>`).join("") || "<tr><td colspan='2'>Sem dados</td></tr>"}</tbody></table>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Dashboard - TÁ NA MÃO</title>
    <style>body{font-family:Arial,sans-serif;color:#0F1A12;padding:28px}h1{color:#003B24;margin:0 0 4px}h2{font-size:15px;margin:22px 0 8px}.meta{color:#68766D;font-size:12px;margin-bottom:18px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.card{border:1px solid #DDE7DE;border-radius:10px;padding:12px}.num{font-size:22px;font-weight:700;color:#003B24}table{width:100%;border-collapse:collapse}td{border-bottom:1px solid #DDE7DE;padding:7px 8px;font-size:12px}@media print{body{padding:16px}.grid{grid-template-columns:repeat(2,1fr)}}</style>
    </head><body><h1>Dashboard TÁ NA MÃO</h1>
    <div class="meta">Edificação: ${htmlSafe(scope?.label)} | Categoria: ${htmlSafe(filters?.categoria || "all")} | Período: ${htmlSafe(filters?.de || "início")} até ${htmlSafe(filters?.ate || "hoje")}</div>
    <div class="grid">${cards.map(([l,v]) => `<div class="card"><div class="num">${htmlSafe(v)}</div><div>${htmlSafe(l)}</div></div>`).join("")}</div>
    ${list("Linha do tempo de manutenções", graficos?.timelineManutencoes)}
    ${list("Tipos de chamados", graficos?.tiposChamados)}
    ${list("Categorias de manutenção", graficos?.categoriasManutencao)}
    ${list("Atividades por usuário", graficos?.atividadesPorUsuario)}
    ${list("Relatórios", graficos?.relatorios)}
    <h2>Alertas</h2><table><tbody>${(alertas || []).map(a => `<tr><td>${htmlSafe(a.condominio?.nome || "")}</td><td>${htmlSafe(a.titulo)}</td><td>${htmlSafe(fmt.date(a.dataVencimento))}</td></tr>`).join("") || "<tr><td>Sem alertas</td></tr>"}</tbody></table>
    </body></html>`;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html.replace("<body>", `<body>${brand}`));
  win.document.close();
  setTimeout(() => win.print(), 400);
}

function DashboardBars({ title, items, color = C.accent, valueKey = "total" }) {
  const max = Math.max(1, ...(items || []).map(item => Number(item[valueKey] || item.total || 0)));
  const darkCard = /linha|tempo|manuten/i.test(title);
  return (
    <div className="card" style={{padding:18,minHeight:220,background:darkCard?"linear-gradient(145deg,#00150B,#003B24 64%,#001108)":"#fff",color:darkCard?"#fff":C.text,borderColor:darkCard?"rgba(119,221,58,.24)":C.border,boxShadow:darkCard?"0 18px 42px rgba(0,21,11,.22)":"0 8px 28px rgba(0,35,18,.06)"}}>
      <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:800,marginBottom:14,color:darkCard?"#fff":C.text}}>{title}</h3>
      <div style={{display:"grid",gap:10}}>
        {(items || []).length ? items.map((item, idx) => {
          const total = Number(item[valueKey] ?? item.total ?? 0);
          return (
            <div key={`${title}-${idx}`}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12,fontSize:12,marginBottom:5}}>
                <span style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.label || item.nome}</span>
                <span style={{color:darkCard?"rgba(255,255,255,.68)":C.muted,flexShrink:0}}>{total}</span>
              </div>
              <div className="progress-bar" style={{background:darkCard?"rgba(255,255,255,.12)":undefined}}><div className="progress-fill" style={{width:`${Math.max(5, Math.round((total / max) * 100))}%`,background:darkCard?"#77DD3A":color,boxShadow:darkCard?"0 0 18px rgba(119,221,58,.45)":"none"}} /></div>
            </div>
          );
        }) : <p style={{fontSize:13,color:darkCard?"rgba(255,255,255,.68)":C.muted}}>Sem dados para os filtros aplicados.</p>}
      </div>
    </div>
  );
}

function DashboardActivities({ items }) {
  return (
    <div className="card" style={{padding:18,minHeight:220}}>
      <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:700,marginBottom:14}}>Atividades por usuário</h3>
      {(items || []).length ? (
        <table className="table">
          <thead><tr><th>Usuário</th><th>Chamados</th><th>Manutenções</th><th>Total</th></tr></thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={`${item.nome}-${idx}`}>
                <td>{item.nome}</td>
                <td>{item.chamados}</td>
                <td>{item.manutencoes}</td>
                <td><strong>{item.total}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p style={{fontSize:13,color:C.muted}}>Sem atividades no período.</p>}
    </div>
  );
}

function DashboardPrintView({ data }) {
  if (!data) return null;
  const stats = data.stats || {};
  const graficos = data.graficos || {};
  const alertas = data.alertas || [];
  const scope = data.scope || {};
  const filters = data.filters || {};
  const logo = assetUrl(scope.logoUrl || scope.logo);
  const cards = [
    ["Total de manutencoes", stats.totalManutencoes || 0],
    ["Preventivas", stats.manutencoesPreventivas || 0],
    ["Avulsas", stats.manutencoesAvulsas || 0],
    ["Chamados", stats.totalChamados || 0],
    ["Valores investidos", fmt.money(stats.valoresInvestidos || 0)],
    ["Score preventivas", `${stats.scorePreventivas || 0}%`],
    ["Score avulsas", `${stats.scoreAvulsas || 0}%`],
    ["Chamados abertos", stats.chamadosAbertos || 0],
  ];
  const rows = items => (items || []).length ? items : [{ label:"Sem dados", total:"-" }];
  const Section = ({ title, items }) => (
    <>
      <h2>{title}</h2>
      <table><tbody>{rows(items).map((item, idx) => <tr key={`${title}-${idx}`}><td>{item.label || item.nome}</td><td>{item.total ?? item.chamados ?? "-"}</td></tr>)}</tbody></table>
    </>
  );

  return (
    <div className="dashboard-print">
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
        {logo && <img src={logo} alt={scope.label || "Logo"} style={{width:64,height:64,objectFit:"contain",border:"1px solid #E2EBF6",borderRadius:12,padding:6,background:"#fff"}} />}
        <div>
          <h1>{scope.label || "Dashboard TA NA MAO"}</h1>
          <div style={{fontSize:10,color:"#6B7FA3",fontWeight:800,letterSpacing:1.4}}>TA NA MAO</div>
        </div>
      </div>
      <div className="dp-meta">Edificacao: {scope.label || "Todas"} | Categoria: {filters.categoria || "all"} | Periodo: {filters.de || "inicio"} ate {filters.ate || "hoje"}</div>
      <div className="dp-grid">{cards.map(([label, value]) => <div key={label} className="dp-card"><div className="dp-num">{value}</div><div>{label}</div></div>)}</div>
      <Section title="Linha do tempo de manutencoes" items={graficos.timelineManutencoes} />
      <Section title="Tipos de chamados" items={graficos.tiposChamados} />
      <Section title="Categorias de manutencao" items={graficos.categoriasManutencao} />
      <Section title="Atividades por usuario" items={(graficos.atividadesPorUsuario || []).map(item => ({ label:item.nome, total:item.total }))} />
      <Section title="Relatorios" items={graficos.relatorios} />
      <h2>Alertas</h2>
      <table><tbody>{alertas.length ? alertas.map(a => <tr key={a.id}><td>{a.condominio?.nome || ""}</td><td>{a.titulo}</td><td>{fmt.date(a.dataVencimento)}</td></tr>) : <tr><td>Sem alertas</td></tr>}</tbody></table>
    </div>
  );
}

const tipoEdificacaoLabels = {
  RESIDENCIAL_VERTICAL: "Residencial vertical",
  RESIDENCIAL_HORIZONTAL: "Residencial horizontal",
  COMERCIAL: "Comercial",
  MISTO: "Misto",
  ASSOCIACAO_LOTEAMENTO: "Associação / loteamento",
};

const portalConfigDefault = {
  ativo: true,
  banners: true,
  comunicados: true,
  documentos: true,
  abrirChamado: true,
  planoManutencao: true,
  vozMorador: true,
  denuncias: true,
  reservas: true,
  iaChat: true,
  contatosResponsaveis: true,
  portalMorador: {
    ativo: true,
    permitirLink: true,
    permitirQrCode: true,
    token: null,
    bannerIds: [],
    bannerMeta: {},
    comunicadoIds: [],
    comunicadoMeta: {},
    documentoIds: [],
    documentoMeta: {},
    contatos: [],
    funcionalidades: {
      abrirChamado: true,
      planoManutencao: true,
      documentos: true,
      comunicados: true,
      vozMorador: true,
      denuncias: true,
      reservas: true,
      iaChat: true,
      contatosResponsaveis: true,
      relatoriosManutencao: true,
      valoresNotasFiscais: false,
    },
    informacoes: {
      nome: true,
      endereco: true,
      responsaveis: true,
      telefones: true,
      email: true,
      manutencoesPrevistas: true,
      comunicadosRecentes: true,
    },
  },
};

const portalConfigLabels = [
  ["abrirChamado", "Abrir chamado"],
  ["planoManutencao", "Plano de manutencao"],
  ["banners", "Banners"],
  ["comunicados", "Comunicados"],
  ["documentos", "Documentos"],
  ["vozMorador", "Voz do Morador"],
  ["denuncias", "Não Se Cale"],
  ["reservas", "Reservas"],
  ["iaChat", "Chat com IA"],
  ["contatosResponsaveis", "Contatos dos responsaveis"],
  ["relatoriosManutencao", "Exibir relatórios de manutenção"],
  ["valoresNotasFiscais", "Exibir valores e notas fiscais"],
];

const portalInfoLabels = [
  ["nome", "Nome do condominio"],
  ["endereco", "Endereco"],
  ["responsaveis", "Responsaveis"],
  ["telefones", "Telefones"],
  ["email", "E-mail"],
  ["manutencoesPrevistas", "Manutencoes previstas"],
  ["comunicadosRecentes", "Comunicados recentes"],
];

function normalizePortalDraft(config = {}) {
  const portal = config.portalMorador || {};
  return {
    ...portalConfigDefault,
    ...config,
    portalMorador: {
      ...portalConfigDefault.portalMorador,
      ...portal,
      bannerIds: Array.isArray(portal.bannerIds) ? portal.bannerIds : [],
      bannerMeta: portal.bannerMeta || {},
      comunicadoIds: Array.isArray(portal.comunicadoIds) ? portal.comunicadoIds : [],
      comunicadoMeta: portal.comunicadoMeta || {},
      documentoIds: Array.isArray(portal.documentoIds) ? portal.documentoIds : [],
      documentoMeta: portal.documentoMeta || {},
      contatos: Array.isArray(portal.contatos) ? portal.contatos : [],
      funcionalidades: { ...portalConfigDefault.portalMorador.funcionalidades, ...(portal.funcionalidades || {}) },
      informacoes: { ...portalConfigDefault.portalMorador.informacoes, ...(portal.informacoes || {}) },
    },
  };
}

const toDateInput = value => value ? new Date(value).toISOString().slice(0, 10) : "";

function condoFormFrom(item = {}) {
  return {
    nome: item.nome || "",
    cnpj: item.cnpj || "",
    endereco: item.endereco || "",
    cidade: item.cidade || "",
    estado: item.estado || "",
    cep: item.cep || "",
    telefone: item.telefone || "",
    email: item.email || "",
    tipoEdificacao: item.tipoEdificacao || "RESIDENCIAL_VERTICAL",
    blocos: item.blocos ?? "",
    unidades: item.unidades ?? "",
    pavimentos: item.pavimentos ?? "",
    mandatoInicio: toDateInput(item.mandatoInicio),
    mandatoFim: toDateInput(item.mandatoFim),
    seguroPossui: Boolean(item.seguroPossui),
    seguroSeguradora: item.seguroSeguradora || "",
    seguroApolice: item.seguroApolice || "",
    seguroInicio: toDateInput(item.seguroInicio),
    seguroVencimento: toDateInput(item.seguroVencimento),
  };
}

function CondominioForm({ value, setValue, onSubmit, onCancel, saving, submitLabel }) {
  const f = key => e => setValue(p => ({ ...p, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  return (
    <>
      <div className="row2">
        <div className="fg"><label>Nome</label><input value={value.nome} onChange={f("nome")} /></div>
        <div className="fg"><label>CNPJ</label><input value={value.cnpj} onChange={f("cnpj")} /></div>
      </div>
      <div className="fg"><label>Endereço completo</label><input value={value.endereco} onChange={f("endereco")} /></div>
      <div className="row3">
        <div className="fg"><label>Cidade</label><input value={value.cidade} onChange={f("cidade")} /></div>
        <div className="fg"><label>Estado</label><input value={value.estado} maxLength={2} onChange={f("estado")} /></div>
        <div className="fg"><label>CEP</label><input value={value.cep} onChange={f("cep")} /></div>
      </div>
      <div className="row2">
        <div className="fg"><label>Telefone</label><input value={value.telefone} onChange={f("telefone")} /></div>
        <div className="fg"><label>Email</label><input type="email" value={value.email} onChange={f("email")} /></div>
      </div>
      <div className="fg">
        <label>Tipo de edificação</label>
        <select value={value.tipoEdificacao} onChange={f("tipoEdificacao")}>
          {Object.entries(tipoEdificacaoLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="row3">
        <div className="fg"><label>Blocos</label><input type="number" min="0" value={value.blocos} onChange={f("blocos")} /></div>
        <div className="fg"><label>Unidades</label><input type="number" min="0" value={value.unidades} onChange={f("unidades")} /></div>
        <div className="fg"><label>Pavimentos</label><input type="number" min="0" value={value.pavimentos} onChange={f("pavimentos")} /></div>
      </div>
      <div style={{fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:700,margin:"8px 0 12px"}}>Mandato</div>
      <div className="row2">
        <div className="fg"><label>Data início mandato</label><input type="date" value={value.mandatoInicio} onChange={f("mandatoInicio")} /></div>
        <div className="fg"><label>Data fim mandato</label><input type="date" value={value.mandatoFim} onChange={f("mandatoFim")} /></div>
      </div>
      <div style={{fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:700,margin:"8px 0 12px"}}>Seguro obrigatório</div>
      <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:13,color:C.text}}>
        <input type="checkbox" checked={value.seguroPossui} onChange={f("seguroPossui")} style={{width:"auto"}} />
        Possui seguro
      </label>
      <div className="row2">
        <div className="fg"><label>Seguradora</label><input value={value.seguroSeguradora} onChange={f("seguroSeguradora")} /></div>
        <div className="fg"><label>Apólice</label><input value={value.seguroApolice} onChange={f("seguroApolice")} /></div>
      </div>
      <div className="row2">
        <div className="fg"><label>Data início</label><input type="date" value={value.seguroInicio} onChange={f("seguroInicio")} /></div>
        <div className="fg"><label>Data vencimento</label><input type="date" value={value.seguroVencimento} onChange={f("seguroVencimento")} /></div>
      </div>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",marginTop:6}}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-primary btn-sm" onClick={onSubmit} disabled={saving || !value.nome || !value.endereco}>{saving ? "Salvando..." : submitLabel}</button>
      </div>
    </>
  );
}

function PlanoManutencaoModal({ condominioId, onClose, onSaved, toast }) {
  const [items, setItems] = useState([]);
  const [checked, setChecked] = useState({});
  const [openCats, setOpenCats] = useState({});
  const [view, setView] = useState("simples");
  const [condominios, setCondominios] = useState([]);
  const [copyFrom, setCopyFrom] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [data, condos] = await Promise.all([
          api.get(`/condominios/${condominioId}/plano-manutencao`),
          api.get("/condominios"),
        ]);
        if (!alive) return;
        setItems(data);
        setCondominios(asList(condos).filter(c => c.id !== condominioId));
        setChecked(Object.fromEntries(data.map(item => [item.codigo, Boolean(item.selecionado)])));
        const cats = [...new Set(data.map(item => item.categoria))];
        setOpenCats(Object.fromEntries(cats.map((cat, idx) => [cat, idx < 3])));
      } catch (e) {
        toast(e.message, "err");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [condominioId]);

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.categoria]) acc[item.categoria] = [];
    acc[item.categoria].push(item);
    return acc;
  }, {});
  const categorias = Object.entries(grouped);
  const totalSelecionadas = Object.values(checked).filter(Boolean).length;
  const allSelected = items.length > 0 && totalSelecionadas === items.length;

  function setAll(value) {
    setChecked(Object.fromEntries(items.map(item => [item.codigo, value])));
  }

  function setCategory(categoria, value) {
    setChecked(prev => ({
      ...prev,
      ...Object.fromEntries((grouped[categoria] || []).map(item => [item.codigo, value])),
    }));
  }

  async function copyPlano() {
    if (!copyFrom) return;
    try {
      const data = await api.get(`/condominios/${copyFrom}/plano-manutencao`);
      const selecionados = new Set(data.filter(item => item.selecionado).map(item => item.codigo));
      setChecked(Object.fromEntries(items.map(item => [item.codigo, selecionados.has(item.codigo)])));
      toast("Plano copiado para revisão. Salve para aplicar nesta edificação.", "ok");
    } catch (e) {
      toast(e.message, "err");
    }
  }

  async function save() {
    setSaving(true);
    try {
      const codigos = Object.entries(checked).filter(([, on]) => on).map(([codigo]) => codigo);
      await api.put(`/condominios/${condominioId}/plano-manutencao`, { codigos });
      toast("Plano salvo e integrado às Manutenções!", "ok");
      onSaved();
      onClose();
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Configurar Plano de Manutenção" onClose={onClose} wide>
      {loading ? <Spinner /> : (
        <>
          <p style={{fontSize:13,color:C.muted,marginBottom:14}}>Selecione as manutenções preventivas que se aplicam à edificação ativa. Ao salvar, apenas os itens marcados criam registros preventivos vinculados a este condomínio.</p>

          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"end",marginBottom:12}}>
            <div className="fg" style={{marginBottom:0}}>
              <label>Copiar plano de outro condomínio</label>
              <div style={{display:"flex",gap:8}}>
                <select value={copyFrom} onChange={e=>setCopyFrom(e.target.value)}>
                  <option value="">Selecionar origem</option>
                  {condominios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={copyPlano} disabled={!copyFrom}>Copiar</button>
              </div>
            </div>
            <div className="tabs">
              <button className={`tab ${view==="simples"?"active":""}`} onClick={()=>setView("simples")}>Simples</button>
              <button className={`tab ${view==="completa"?"active":""}`} onClick={()=>setView("completa")}>Completa</button>
            </div>
          </div>

          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:12,flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>setAll(true)}>Selecionar todas</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setAll(false)} disabled={!totalSelecionadas}>Limpar seleção</button>
            </div>
            <span className="badge bd-info">{totalSelecionadas} / {items.length} selecionadas</span>
          </div>

          <div style={{display:"grid",gap:10,maxHeight:520,overflowY:"auto",paddingRight:4}}>
            {categorias.map(([categoria, catItems]) => {
              const selected = catItems.filter(item => checked[item.codigo]).length;
              const isOpen = openCats[categoria];
              return (
                <section key={categoria} style={{border:`1px solid ${C.border}`,borderRadius:14,background:"#fff",overflow:"hidden"}}>
                  <div style={{width:"100%",background:"#F2FAF1",padding:13,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,textAlign:"left"}}>
                    <button type="button" style={{border:"none",background:"transparent",cursor:"pointer",textAlign:"left",padding:0,flex:1}} onClick={()=>setOpenCats(p=>({...p,[categoria]:!p[categoria]}))}>
                      <strong style={{fontSize:14}}>{categoria}</strong>
                      <div style={{fontSize:12,color:C.muted,marginTop:2}}>{selected} / {catItems.length} selecionadas</div>
                    </button>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
                      <button type="button" className="btn btn-ghost btn-xs" onClick={()=>setCategory(categoria, selected !== catItems.length)}>{selected === catItems.length ? "Limpar" : "Selecionar"}</button>
                      <button type="button" style={{border:"none",background:"transparent",cursor:"pointer",padding:4,transform:`rotate(${isOpen?90:0}deg)`,transition:"transform .18s",display:"inline-flex"}} onClick={()=>setOpenCats(p=>({...p,[categoria]:!p[categoria]}))}><Ic n="chev" s={15} c={C.muted} /></button>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{display:"grid",gap:9,padding:12}}>
                      {catItems.map(item => {
                        const selectedItem = Boolean(checked[item.codigo]);
                        return (
                          <label key={item.codigo} style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:12,padding:13,border:`1px solid ${selectedItem ? C.accent : C.border}`,borderRadius:12,background:selectedItem ? "#f0fbff" : "#fff",cursor:"pointer"}}>
                            <input type="checkbox" checked={selectedItem} onChange={e=>setChecked(p=>({...p,[item.codigo]:e.target.checked}))} style={{width:"auto",marginTop:3}} />
                            <div>
                              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:7}}>
                                <strong style={{fontSize:14}}>{item.elemento || item.nome}</strong>
                                <span className={`badge ${item.prioridade==="ALTA"?"bd-dang":item.prioridade==="MEDIA"?"bd-pend":"bd-done"}`}>{item.prioridade}</span>
                              </div>

                              {view === "simples" ? (
                                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,fontSize:12,color:C.muted}}>
                                  <span>Elemento: {item.elemento || item.nome}</span>
                                  <span>Periodicidade: {item.periodicidade}</span>
                                  <span>Prioridade: {item.prioridade}</span>
                                </div>
                              ) : (
                                <div style={{display:"grid",gap:8,fontSize:12,color:C.muted}}>
                                  <span><strong style={{color:C.text}}>Atividade:</strong> {item.atividade}</span>
                                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}>
                                    <span><strong style={{color:C.text}}>Responsável:</strong> {item.responsavelSugerido || "A definir"}</span>
                                    <span><strong style={{color:C.text}}>Aviso:</strong> {item.avisoAntecipado || 15} dias antes</span>
                                    <span><strong style={{color:C.text}}>Última conclusão:</strong> {fmt.date(item.dataUltimaConclusao)}</span>
                                    <span><strong style={{color:C.text}}>Próxima notificação:</strong> {fmt.date(item.dataProximaNotificacao)}</span>
                                  </div>
                                  <span><strong style={{color:C.text}}>Fonte:</strong> {item.referenciaLegal}</span>
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginTop:16}}>
            <span style={{fontSize:13,color:C.muted}}>{totalSelecionadas} itens selecionados em {categorias.length} categorias</span>
            <div style={{display:"flex",gap:9}}>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? "Integrando..." : "Salvar e integrar"}</button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

const organizacaoOptions = [
  ["BLOCOS_APARTAMENTOS", "Por blocos e apartamentos"],
  ["TORRES_APARTAMENTOS", "Por torres e apartamentos"],
  ["CASAS", "Por casas"],
  ["LIVRE", "Numeração livre"],
];

const tipoOrganizacaoOptions = [
  ["BLOCO", "Bloco"],
  ["TORRE", "Torre"],
  ["CASA", "Casa"],
  ["LIVRE", "Livre"],
];

const tipoMoradorOptions = [
  ["PROPRIETARIO", "Proprietário"],
  ["INQUILINO", "Inquilino"],
  ["RESPONSAVEL_FINANCEIRO", "Responsável financeiro"],
  ["MORADOR", "Morador"],
];

function UnidadesManagerModal({ condominioId, data, onClose, onSaved, toast }) {
  const [organizacao, setOrganizacao] = useState(data?.organizacao || "BLOCOS_APARTAMENTOS");
  const [unit, setUnit] = useState({ tipo:"BLOCO", grupo:"", codigo:"", numero:"", prefixo:"" });
  const [batch, setBatch] = useState({
    tipo:"BLOCO",
    grupos:"A, B, C",
    quantidadeGrupos:3,
    quantidadeAndares:3,
    apartamentosPorAndar:4,
    numeracaoInicial:101,
    quantidade:72,
    prefixo:"",
  });
  const unidades = data?.unidades || [];

  async function saveOrganizacao() {
    try {
      await api.put(`/condominios/${condominioId}/unidades-gestao`, { organizacao });
      toast("Tipo de organização salvo!", "ok");
      onSaved();
    } catch(e){ toast(e.message, "err"); }
  }

  async function addUnit() {
    try {
      await api.post(`/condominios/${condominioId}/unidades-gestao/unidades`, unit);
      toast("Unidade cadastrada!", "ok");
      setUnit({ tipo:"BLOCO", grupo:"", codigo:"", numero:"", prefixo:"" });
      onSaved();
    } catch(e){ toast(e.message, "err"); }
  }

  async function generateBatch() {
    try {
      await api.post(`/condominios/${condominioId}/unidades-gestao/gerar`, {
        ...batch,
        organizacao: batch.tipo==="TORRE" ? "TORRES_APARTAMENTOS" : batch.tipo==="CASA" ? "CASAS" : batch.tipo==="LIVRE" ? "LIVRE" : "BLOCOS_APARTAMENTOS",
      });
      toast("Unidades geradas automaticamente!", "ok");
      onSaved();
    } catch(e){ toast(e.message, "err"); }
  }

  return (
    <Modal title="Gerenciar unidades" onClose={onClose} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"end",marginBottom:16}}>
        <div className="fg" style={{marginBottom:0}}>
          <label>Tipo de organização do condomínio</label>
          <select value={organizacao} onChange={e=>setOrganizacao(e.target.value)}>
            {organizacaoOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <button className="btn btn-primary btn-sm" onClick={saveOrganizacao}>Salvar tipo</button>
      </div>

      <div className="card" style={{padding:16,marginBottom:14}}>
        <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,marginBottom:12}}>Cadastrar unidade individualmente</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,alignItems:"end"}}>
          <div><label>Tipo</label><select value={unit.tipo} onChange={e=>setUnit(p=>({...p,tipo:e.target.value}))}>{tipoOrganizacaoOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
          <div><label>Bloco/Torre/Casa</label><input value={unit.grupo} onChange={e=>setUnit(p=>({...p,grupo:e.target.value}))} placeholder="A, Torre 1..." /></div>
          <div><label>Unidade</label><input value={unit.codigo} onChange={e=>setUnit(p=>({...p,codigo:e.target.value}))} placeholder="A-101, Casa 01..." /></div>
          <button className="btn btn-primary btn-sm" onClick={addUnit} disabled={!unit.codigo}>Adicionar</button>
        </div>
      </div>

      <div className="card" style={{padding:16,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:12}}>
          <div>
            <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14}}>Gerar unidades automaticamente</h3>
            <p style={{fontSize:12,color:C.muted,marginTop:2}}>Importação por planilha ficará para uma próxima etapa.</p>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,alignItems:"end"}}>
          <div><label>Tipo</label><select value={batch.tipo} onChange={e=>setBatch(p=>({...p,tipo:e.target.value}))}>{tipoOrganizacaoOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
          {["BLOCO","TORRE"].includes(batch.tipo) ? (
            <>
              <div><label>Nomes dos blocos/torres</label><input value={batch.grupos} onChange={e=>setBatch(p=>({...p,grupos:e.target.value}))} placeholder="A, B, C" /></div>
              <div><label>Qtd. andares</label><input type="number" min="1" value={batch.quantidadeAndares} onChange={e=>setBatch(p=>({...p,quantidadeAndares:e.target.value}))} /></div>
              <div><label>Aptos por andar</label><input type="number" min="1" value={batch.apartamentosPorAndar} onChange={e=>setBatch(p=>({...p,apartamentosPorAndar:e.target.value}))} /></div>
              <div><label>Numeração inicial</label><input type="number" value={batch.numeracaoInicial} onChange={e=>setBatch(p=>({...p,numeracaoInicial:e.target.value}))} /></div>
              <div><label>Prefixo opcional</label><input value={batch.prefixo} onChange={e=>setBatch(p=>({...p,prefixo:e.target.value}))} /></div>
            </>
          ) : (
            <>
              <div><label>Quantidade</label><input type="number" min="1" value={batch.quantidade} onChange={e=>setBatch(p=>({...p,quantidade:e.target.value}))} /></div>
              <div><label>Numeração inicial</label><input type="number" min="1" value={batch.numeracaoInicial} onChange={e=>setBatch(p=>({...p,numeracaoInicial:e.target.value}))} /></div>
              <div><label>Prefixo opcional</label><input value={batch.prefixo} onChange={e=>setBatch(p=>({...p,prefixo:e.target.value}))} placeholder={batch.tipo==="CASA" ? "Casa" : "Unidade"} /></div>
            </>
          )}
          <button className="btn btn-accent btn-sm" onClick={generateBatch}>Gerar</button>
        </div>
      </div>

      <div className="card" style={{overflow:"hidden"}}>
        <table className="table">
          <thead><tr><th>Unidade</th><th>Bloco/Torre/Casa</th><th>Morador principal</th><th>Status</th></tr></thead>
          <tbody>{unidades.slice(0, 12).map(u=>(
            <tr key={u.id}>
              <td style={{fontWeight:600}}>{u.codigo}</td>
              <td>{u.grupo || u.prefixo || "Livre"}</td>
              <td>{u.moradorPrincipal?.nome || "Sem morador"}</td>
              <td><Bdg s={u.ocupada ? "Ativo" : "Inativo"} /></td>
            </tr>
          ))}</tbody>
        </table>
        {!unidades.length && <p style={{padding:24,textAlign:"center",fontSize:13,color:C.muted}}>Nenhuma unidade cadastrada.</p>}
      </div>
    </Modal>
  );
}

function UnidadesManagerModalV2({ condominioId, data, onClose, onSaved, toast }) {
  const [organizacao, setOrganizacao] = useState(data?.organizacao || "BLOCOS_APARTAMENTOS");
  const [unit, setUnit] = useState({ tipo:"BLOCO", grupo:"", codigo:"", numero:"", prefixo:"" });
  const [batch, setBatch] = useState({
    tipo:"BLOCO",
    grupos:"A, B, C",
    quantidadeGrupos:3,
    quantidadeAndares:3,
    apartamentosPorAndar:4,
    numeracaoInicial:101,
    quantidade:72,
    prefixo:"",
  });
  const [editUnit, setEditUnit] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const unidades = data?.unidades || [];
  const resumo = data?.resumo || {};

  const batchOrganizacao = () => batch.tipo==="TORRE"
    ? "TORRES_APARTAMENTOS"
    : batch.tipo==="CASA"
      ? "CASAS"
      : batch.tipo==="LIVRE"
        ? "LIVRE"
        : "BLOCOS_APARTAMENTOS";

  const impactStats = impacto => [
    ["Unidades", impacto?.unidadesAfetadas || 0],
    ["Moradores", impacto?.moradoresVinculados || 0],
    ["Chamados", impacto?.chamados || 0],
    ["Manutencoes", impacto?.manutencoes || 0],
  ];

  async function saveOrganizacao() {
    try {
      await api.put(`/condominios/${condominioId}/unidades-gestao`, { organizacao });
      toast("Tipo de organizacao salvo!", "ok");
      onSaved();
    } catch(e){ toast(e.message, "err"); }
  }

  async function addUnit() {
    try {
      await api.post(`/condominios/${condominioId}/unidades-gestao/unidades`, unit);
      toast("Unidade cadastrada!", "ok");
      setUnit({ tipo:"BLOCO", grupo:"", codigo:"", numero:"", prefixo:"" });
      onSaved();
    } catch(e){ toast(e.message, "err"); }
  }

  async function saveEditUnit() {
    if (!editUnit?.id) return;
    setBusy(true);
    try {
      await api.patch(`/condominios/${condominioId}/unidades-gestao/unidades/${editUnit.id}`, editUnit);
      toast("Unidade atualizada!", "ok");
      setEditUnit(null);
      onSaved();
    } catch(e){ toast(e.message, "err"); }
    finally { setBusy(false); }
  }

  async function generateBatch() {
    try {
      await api.post(`/condominios/${condominioId}/unidades-gestao/gerar`, {
        ...batch,
        organizacao: batchOrganizacao(),
      });
      toast("Unidades geradas automaticamente!", "ok");
      onSaved();
    } catch(e){ toast(e.message, "err"); }
  }

  async function executeAction(type, impactoPayload, modo) {
    setBusy(true);
    try {
      if (type === "reconfigure") {
        await api.post(`/condominios/${condominioId}/unidades-gestao/reconfigurar`, {
          ...batch,
          organizacao: batchOrganizacao(),
          modo,
        });
        toast("Estrutura reconfigurada!", "ok");
      } else {
        await api.post(`/condominios/${condominioId}/unidades-gestao/limpar`, {
          ...impactoPayload,
          modo,
        });
        toast(type === "clear-empty" ? "Unidades sem moradores removidas!" : "Estrutura limpa!", "ok");
      }
      setConfirmAction(null);
      onSaved();
    } catch(e){ toast(e.message, "err"); }
    finally { setBusy(false); }
  }

  async function loadImpact(type, impactoPayload = {}) {
    setBusy(true);
    try {
      const impacto = await api.post(`/condominios/${condominioId}/unidades-gestao/impacto`, impactoPayload);
      if (type === "clear-empty") {
        if (!impacto.unidadesAfetadas) {
          toast("Nao ha unidades sem moradores para limpar.", "info");
          return;
        }
        if (window.confirm(`Remover ${impacto.unidadesAfetadas} unidade(s) sem moradores?`)) {
          await executeAction(type, impactoPayload, "MANTER_MORADORES_SEM_UNIDADE");
        }
        return;
      }
      if (impacto.temDependencias) {
        setConfirmAction({ type, impacto, impactoPayload });
        return;
      }
      const label = type === "reconfigure" ? "reconfigurar a estrutura" : "limpar toda a estrutura";
      if (window.confirm(`Confirmar ${label} deste condominio?`)) {
        await executeAction(type, impactoPayload, "MANTER_MORADORES_SEM_UNIDADE");
      }
    } catch(e){ toast(e.message, "err"); }
    finally { setBusy(false); }
  }

  function startEditUnit(u) {
    setEditUnit({
      id: u.id,
      tipo: u.tipo || "LIVRE",
      grupo: u.grupo || "",
      codigo: u.codigo || "",
      numero: u.numero || u.codigo || "",
      prefixo: u.prefixo || "",
    });
  }

  return (
    <Modal title="Gerenciar unidades" onClose={onClose} wide>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
        <div className="card" style={{padding:14}}><div className="stat-l">Total de unidades</div><div className="stat-n" style={{fontSize:25}}>{resumo.totalUnidades || unidades.length}</div></div>
        <div className="card" style={{padding:14}}><div className="stat-l">Ocupadas</div><div className="stat-n" style={{fontSize:25,color:C.success}}>{resumo.ocupadas || 0}</div></div>
        <div className="card" style={{padding:14}}><div className="stat-l">Sem morador</div><div className="stat-n" style={{fontSize:25,color:C.warning}}>{resumo.semMorador || 0}</div></div>
        <div className="card" style={{padding:14}}><div className="stat-l">Responsaveis</div><div className="stat-n" style={{fontSize:25,color:C.primary}}>{resumo.responsaveisCadastrados || 0}</div></div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"end",marginBottom:16}}>
        <div className="fg" style={{marginBottom:0}}>
          <label>Tipo de organizacao do condominio</label>
          <select value={organizacao} onChange={e=>setOrganizacao(e.target.value)}>
            {organizacaoOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <button className="btn btn-primary btn-sm" onClick={saveOrganizacao} disabled={busy}>Salvar tipo</button>
      </div>

      <div className="card" style={{padding:16,marginBottom:14,borderColor:"#ffd7d7",background:"#fffafa"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div>
            <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14}}>Acoes da estrutura</h3>
            <p style={{fontSize:12,color:C.muted,marginTop:2}}>Todas as operacoes atuam somente no condominio ativo.</p>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>loadImpact("clear-empty", { apenasVazias:true })} disabled={busy}>Limpar unidades sem moradores</button>
            <button className="btn btn-danger btn-sm" onClick={()=>loadImpact("clear-all")} disabled={busy || !unidades.length}>Limpar estrutura</button>
          </div>
        </div>
      </div>

      <div className="card" style={{padding:16,marginBottom:14}}>
        <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,marginBottom:12}}>Cadastrar unidade individualmente</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,alignItems:"end"}}>
          <div><label>Tipo</label><select value={unit.tipo} onChange={e=>setUnit(p=>({...p,tipo:e.target.value}))}>{tipoOrganizacaoOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
          <div><label>Bloco/Torre/Casa</label><input value={unit.grupo} onChange={e=>setUnit(p=>({...p,grupo:e.target.value}))} placeholder="A, Torre 1..." /></div>
          <div><label>Unidade</label><input value={unit.codigo} onChange={e=>setUnit(p=>({...p,codigo:e.target.value}))} placeholder="A-101, Casa 01..." /></div>
          <button className="btn btn-primary btn-sm" onClick={addUnit} disabled={!unit.codigo || busy}>Adicionar</button>
        </div>
      </div>

      <div className="card" style={{padding:16,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:12}}>
          <div>
            <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14}}>Gerar unidades automaticamente</h3>
            <p style={{fontSize:12,color:C.muted,marginTop:2}}>Gerar acrescenta unidades. Reconfigurar recria a estrutura.</p>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,alignItems:"end"}}>
          <div><label>Tipo</label><select value={batch.tipo} onChange={e=>setBatch(p=>({...p,tipo:e.target.value}))}>{tipoOrganizacaoOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
          {["BLOCO","TORRE"].includes(batch.tipo) ? (
            <>
              <div><label>Nomes dos blocos/torres</label><input value={batch.grupos} onChange={e=>setBatch(p=>({...p,grupos:e.target.value}))} placeholder="A, B, C" /></div>
              <div><label>Qtd. andares</label><input type="number" min="1" value={batch.quantidadeAndares} onChange={e=>setBatch(p=>({...p,quantidadeAndares:e.target.value}))} /></div>
              <div><label>Aptos por andar</label><input type="number" min="1" value={batch.apartamentosPorAndar} onChange={e=>setBatch(p=>({...p,apartamentosPorAndar:e.target.value}))} /></div>
              <div><label>Numeracao inicial</label><input type="number" value={batch.numeracaoInicial} onChange={e=>setBatch(p=>({...p,numeracaoInicial:e.target.value}))} /></div>
              <div><label>Prefixo opcional</label><input value={batch.prefixo} onChange={e=>setBatch(p=>({...p,prefixo:e.target.value}))} /></div>
            </>
          ) : (
            <>
              <div><label>Quantidade</label><input type="number" min="1" value={batch.quantidade} onChange={e=>setBatch(p=>({...p,quantidade:e.target.value}))} /></div>
              <div><label>Numeracao inicial</label><input type="number" min="1" value={batch.numeracaoInicial} onChange={e=>setBatch(p=>({...p,numeracaoInicial:e.target.value}))} /></div>
              <div><label>Prefixo opcional</label><input value={batch.prefixo} onChange={e=>setBatch(p=>({...p,prefixo:e.target.value}))} placeholder={batch.tipo==="CASA" ? "Casa" : "Unidade"} /></div>
            </>
          )}
          <button className="btn btn-accent btn-sm" onClick={generateBatch} disabled={busy}>Gerar</button>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}>
          <button className="btn btn-primary btn-sm" onClick={()=>loadImpact("reconfigure")} disabled={busy}>Reconfigurar estrutura</button>
        </div>
      </div>

      {confirmAction && (
        <div className="card" style={{padding:16,marginBottom:14,borderColor:"#ffb4b4",background:"#fff8f8"}}>
          <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,marginBottom:6}}>Confirmar alteracao da estrutura</h3>
          <p style={{fontSize:13,color:C.muted,marginBottom:12}}>Existem vinculos no condominio ativo. Escolha como o sistema deve tratar esses dados antes de continuar.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8,marginBottom:12}}>
            {impactStats(confirmAction.impacto).map(([label,value])=>(
              <div key={label} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:10}}>
                <div style={{fontSize:11,color:C.muted}}>{label}</div>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700}}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Apagar tudo remove chamados afetados, limpa manutencoes do condominio e arquiva moradores vinculados. Manter moradores sem unidade preserva pessoas e historicos.</div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",flexWrap:"wrap"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setConfirmAction(null)} disabled={busy}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={()=>executeAction(confirmAction.type, confirmAction.impactoPayload, "MANTER_MORADORES_SEM_UNIDADE")} disabled={busy}>Manter moradores sem unidade</button>
            <button className="btn btn-danger btn-sm" onClick={()=>executeAction(confirmAction.type, confirmAction.impactoPayload, "APAGAR_TUDO")} disabled={busy}>Apagar tudo</button>
          </div>
        </div>
      )}

      {editUnit && (
        <div className="card" style={{padding:16,marginBottom:14,borderColor:C.accent}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:12}}>
            <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14}}>Editar unidade</h3>
            <button className="btn btn-ghost btn-xs" onClick={()=>setEditUnit(null)}>Cancelar</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,alignItems:"end"}}>
            <div><label>Tipo</label><select value={editUnit.tipo} onChange={e=>setEditUnit(p=>({...p,tipo:e.target.value}))}>{tipoOrganizacaoOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
            <div><label>Bloco/Torre/Casa</label><input value={editUnit.grupo} onChange={e=>setEditUnit(p=>({...p,grupo:e.target.value}))} /></div>
            <div><label>Unidade</label><input value={editUnit.codigo} onChange={e=>setEditUnit(p=>({...p,codigo:e.target.value}))} /></div>
            <div><label>Numero</label><input value={editUnit.numero} onChange={e=>setEditUnit(p=>({...p,numero:e.target.value}))} /></div>
            <button className="btn btn-primary btn-sm" onClick={saveEditUnit} disabled={busy || !editUnit.codigo}>Salvar edicao</button>
          </div>
        </div>
      )}

      <div className="card" style={{overflow:"hidden"}}>
        <table className="table">
          <thead><tr><th>Unidade</th><th>Bloco/Torre/Casa</th><th>Morador principal</th><th>Status</th><th>Acoes</th></tr></thead>
          <tbody>{unidades.map(u=>(
            <tr key={u.id}>
              <td style={{fontWeight:600}}>{u.codigo}</td>
              <td>{u.grupo || u.prefixo || "Livre"}</td>
              <td>{u.moradorPrincipal?.nome || "Sem morador"}</td>
              <td><Bdg s={u.ocupada ? "Ativo" : "Inativo"} /></td>
              <td><button className="btn btn-ghost btn-xs" onClick={()=>startEditUnit(u)}>Editar</button></td>
            </tr>
          ))}</tbody>
        </table>
        {!unidades.length && <p style={{padding:24,textAlign:"center",fontSize:13,color:C.muted}}>Nenhuma unidade cadastrada.</p>}
      </div>
    </Modal>
  );
}

function MoradorUnidadeModal({ condominioId, unidades, onClose, onSaved, toast }) {
  const [form, setForm] = useState({
    nome:"",
    email:"",
    telefone:"",
    whatsapp:"",
    unidadeId: unidades[0]?.id || "",
    tipoMorador:"MORADOR",
    principal:true,
    ativo:true,
  });
  const f = k => e => setForm(p=>({...p,[k]:e.target.type==="checkbox"?e.target.checked:e.target.value}));

  async function save() {
    try {
      const unidade = unidades.find(u => u.id === form.unidadeId);
      await api.post(`/condominios/${condominioId}/unidades-gestao/moradores`, {
        ...form,
        unidadeCodigo: unidade?.codigo,
        grupo: unidade?.grupo || "",
      });
      toast("Morador vinculado à unidade!", "ok");
      onSaved();
      onClose();
    } catch(e){ toast(e.message, "err"); }
  }

  return (
    <Modal title="Adicionar morador" onClose={onClose}>
      <div className="fg"><label>Unidade</label><select value={form.unidadeId} onChange={f("unidadeId")}><option value="">Selecionar unidade</option>{unidades.map(u=><option key={u.id} value={u.id}>{u.codigo} {u.grupo ? `· ${u.grupo}` : ""}</option>)}</select></div>
      <div className="row2">
        <div className="fg"><label>Nome</label><input value={form.nome} onChange={f("nome")} /></div>
        <div className="fg"><label>E-mail</label><input type="email" value={form.email} onChange={f("email")} /></div>
      </div>
      <div className="row2">
        <div className="fg"><label>Telefone</label><input value={form.telefone} onChange={f("telefone")} /></div>
        <div className="fg"><label>WhatsApp</label><input value={form.whatsapp} onChange={f("whatsapp")} /></div>
      </div>
      <div className="fg"><label>Tipo de morador</label><select value={form.tipoMorador} onChange={f("tipoMorador")}>{tipoMoradorOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
      <label style={{display:"flex",gap:8,alignItems:"center",color:C.text,marginBottom:10}}><input type="checkbox" checked={form.principal} onChange={f("principal")} style={{width:"auto"}} /> Morador principal da unidade</label>
      <label style={{display:"flex",gap:8,alignItems:"center",color:C.text,marginBottom:14}}><input type="checkbox" checked={form.ativo} onChange={f("ativo")} style={{width:"auto"}} /> Morador ativo</label>
      <div style={{fontSize:12,color:C.muted,background:"#F2FAF1",border:`1px solid ${C.border}`,borderRadius:10,padding:10,marginBottom:14}}>A senha não é definida aqui. O acesso será tratado depois por convite, link, WhatsApp ou redefinição.</div>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={!form.nome || !form.email || !form.unidadeId}>Adicionar</button>
      </div>
    </Modal>
  );
}

function PortalMoradorConfigModal({ condominioId, data, onClose, onSaved, toast }) {
  const [draft, setDraft] = useState(normalizePortalDraft(data?.config || {}));
  const [bannerForm, setBannerForm] = useState({ titulo:"", descricao:"", link:"", ordem:1, ativo:true });
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [replaceFiles, setReplaceFiles] = useState({});
  const [comunicadoForm, setComunicadoForm] = useState({ titulo:"", conteudo:"", emoji:"", fixado:false, agendadoPara:"" });
  const [contatoForm, setContatoForm] = useState({ nome:"", funcao:"", telefone:"", whatsapp:"", email:"", ativo:true });
  const [docForm, setDocForm] = useState({ titulo:"", categoria:"Geral", tipoDocumento:"Documento", tipoAcesso:"MORADOR", visivelPortal:true, usarIa:false, publicadoEm:toDateInput(new Date()) });
  const [docFile, setDocFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const { copyNow, manualCopyModal } = useSafeCopy(toast);

  useEffect(() => {
    if (data?.config) setDraft(normalizePortalDraft(data.config));
  }, [data?.config]);

  if (!data) return <Modal title="Portal do Morador" onClose={onClose} wide><Spinner /></Modal>;

  const portal = draft.portalMorador;
  const banners = data.banners || [];
  const comunicados = data.comunicados || [];
  const documentos = data.documentos || [];

  function setPortal(patch) {
    setDraft(prev => ({ ...prev, portalMorador: { ...prev.portalMorador, ...patch } }));
  }
  function setFunc(key) {
    setDraft(prev => ({
      ...prev,
      portalMorador: {
        ...prev.portalMorador,
        funcionalidades: { ...prev.portalMorador.funcionalidades, [key]: !prev.portalMorador.funcionalidades[key] },
      },
    }));
  }
  function setInfo(key) {
    setDraft(prev => ({
      ...prev,
      portalMorador: {
        ...prev.portalMorador,
        informacoes: { ...prev.portalMorador.informacoes, [key]: !prev.portalMorador.informacoes[key] },
      },
    }));
  }
  function toggleId(field, id) {
    setPortal({
      [field]: portal[field].includes(id)
        ? portal[field].filter(item => item !== id)
        : [...portal[field], id],
    });
  }
  function updateComunicadoMeta(id, patch) {
    setPortal({ comunicadoMeta: { ...portal.comunicadoMeta, [id]: { ...(portal.comunicadoMeta[id] || {}), ...patch } } });
  }
  function addContato() {
    if (!contatoForm.nome || !contatoForm.funcao) return;
    setPortal({
      contatos: [
        ...(portal.contatos || []),
        { ...contatoForm, id:`contato-${Date.now()}` },
      ],
    });
    setContatoForm({ nome:"", funcao:"", telefone:"", whatsapp:"", email:"", ativo:true });
  }
  function removeContato(id) {
    setPortal({ contatos: (portal.contatos || []).filter(item => item.id !== id) });
  }
  function toggleContato(id) {
    setPortal({ contatos: (portal.contatos || []).map(item => item.id === id ? { ...item, ativo: item.ativo === false } : item) });
  }

  async function saveConfig() {
    setBusy(true);
    try {
      const result = await api.put(`/condominios/${condominioId}/portal-config`, { config: draft });
      setDraft(normalizePortalDraft(result.config));
      toast("Portal do morador salvo!", "ok");
      onSaved();
    } catch(e){ toast(e.message, "err"); }
    finally { setBusy(false); }
  }

  async function uploadBannerImage(file) {
    const fd = new FormData();
    fd.append("imagem", file);
    const result = await api.post(`/condominios/${condominioId}/portal-banners/imagem`, fd);
    return result.url;
  }

  async function createBanner() {
    if (!bannerFile || !bannerForm.titulo) return;
    setBusy(true);
    try {
      const imagem = await uploadBannerImage(bannerFile);
      await api.post(`/condominios/${condominioId}/portal-banners`, { ...bannerForm, imagem });
      toast("Banner do portal criado!", "ok");
      setBannerForm({ titulo:"", descricao:"", link:"", ordem:1, ativo:true });
      setBannerFile(null);
      setBannerPreview("");
      onSaved();
    } catch(e){ toast(e.message, "err"); }
    finally { setBusy(false); }
  }

  async function patchBanner(id, payload) {
    setBusy(true);
    try {
      await api.patch(`/condominios/${condominioId}/portal-banners/${id}`, payload);
      toast("Banner atualizado!", "ok");
      onSaved();
    } catch(e){ toast(e.message, "err"); }
    finally { setBusy(false); }
  }

  async function replaceBannerImage(id) {
    const file = replaceFiles[id];
    if (!file) return;
    setBusy(true);
    try {
      const imagem = await uploadBannerImage(file);
      await api.patch(`/condominios/${condominioId}/portal-banners/${id}`, { imagem });
      toast("Imagem do banner trocada!", "ok");
      setReplaceFiles(prev => ({ ...prev, [id]: null }));
      onSaved();
    } catch(e){ toast(e.message, "err"); }
    finally { setBusy(false); }
  }

  async function removeBanner(id) {
    if (!window.confirm("Remover este banner do portal?")) return;
    setBusy(true);
    try {
      await api.del(`/condominios/${condominioId}/portal-banners/${id}`);
      toast("Banner removido!", "ok");
      onSaved();
    } catch(e){ toast(e.message, "err"); }
    finally { setBusy(false); }
  }

  async function createComunicado() {
    if (!comunicadoForm.titulo || !comunicadoForm.conteudo) return;
    setBusy(true);
    try {
      await api.post(`/condominios/${condominioId}/portal-comunicados`, comunicadoForm);
      toast("Comunicado criado para o portal!", "ok");
      setComunicadoForm({ titulo:"", conteudo:"", emoji:"", fixado:false, agendadoPara:"" });
      onSaved();
    } catch(e){ toast(e.message, "err"); }
    finally { setBusy(false); }
  }

  async function createPortalDocument() {
    if (!docFile || !docForm.titulo) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("arquivo", docFile);
      Object.entries(docForm).forEach(([key,value]) => fd.append(key, value));
      const result = await api.post(`/condominios/${condominioId}/portal-documentos`, fd);
      setDraft(normalizePortalDraft(result.config));
      setDocForm({ titulo:"", categoria:"Geral", tipoDocumento:"Documento", tipoAcesso:"MORADOR", visivelPortal:true, usarIa:false, publicadoEm:toDateInput(new Date()) });
      setDocFile(null);
      toast("Documento adicionado ao portal!", "ok");
      onSaved();
    } catch(e){ toast(e.message, "err"); }
    finally { setBusy(false); }
  }

  async function patchPortalDocument(id, payload) {
    setBusy(true);
    try {
      const result = await api.patch(`/condominios/${condominioId}/portal-documentos/${id}`, payload);
      setDraft(normalizePortalDraft(result.config));
      toast("Documento atualizado!", "ok");
      onSaved();
    } catch(e){ toast(e.message, "err"); }
    finally { setBusy(false); }
  }

  async function removePortalDocument(id) {
    if (!window.confirm("Remover este documento da edificação?")) return;
    setBusy(true);
    try {
      const result = await api.del(`/condominios/${condominioId}/portal-documentos/${id}`);
      setDraft(normalizePortalDraft(result.config));
      toast("Documento removido!", "ok");
      onSaved();
    } catch(e){ toast(e.message, "err"); }
    finally { setBusy(false); }
  }

  async function copyLink() {
    if (!data.link) return toast("Salve a configuracao para gerar o link.", "info");
    await copyNow(data.link, "Link do portal copiado!");
  }

  function downloadQr() {
    if (!data.qrCodeUrl) return toast("Salve a configuracao para gerar o QR Code.", "info");
    const a = document.createElement("a");
    a.href = data.qrCodeUrl;
    a.download = "portal-morador-qr.png";
    a.click();
  }

  function chooseBannerFile(file) {
    setBannerFile(file || null);
    setBannerPreview(file ? URL.createObjectURL(file) : "");
  }

  return (
    <>
    <Modal title="Configurar Portal do Morador" onClose={onClose} wide>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10,marginBottom:14}}>
        <div className="card" style={{padding:14}}><div className="stat-l">Status</div><div className="stat-n" style={{fontSize:22,color:portal.ativo?C.success:C.danger}}>{portal.ativo ? "Ativo" : "Inativo"}</div></div>
        <div className="card" style={{padding:14}}><div className="stat-l">Banners</div><div className="stat-n" style={{fontSize:22}}>{data.resumo?.bannersConfigurados || 0}</div></div>
        <div className="card" style={{padding:14}}><div className="stat-l">Documentos</div><div className="stat-n" style={{fontSize:22}}>{data.resumo?.documentosVisiveis || 0}</div></div>
        <div className="card" style={{padding:14}}><div className="stat-l">Comunicados</div><div className="stat-n" style={{fontSize:22}}>{data.resumo?.comunicadosAtivos || 0}</div></div>
      </div>

      <div className="card" style={{padding:16,marginBottom:14}}>
        <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,marginBottom:10}}>Status e acesso</h3>
        <Toggle label="Portal ativo" on={Boolean(portal.ativo)} onChange={()=>setPortal({ ativo: !portal.ativo })} />
        <Toggle label="Permitir acesso por link" on={Boolean(portal.permitirLink)} onChange={()=>setPortal({ permitirLink: !portal.permitirLink })} />
        <Toggle label="Permitir acesso por QR Code" on={Boolean(portal.permitirQrCode)} onChange={()=>setPortal({ permitirQrCode: !portal.permitirQrCode })} />
        <div style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",gap:8,alignItems:"center",marginTop:12}}>
          <input readOnly value={data.link || "Salve para gerar o link publico do portal"} />
          <button className="btn btn-ghost btn-sm" onClick={copyLink}>Copiar link</button>
          <button className="btn btn-ghost btn-sm" onClick={downloadQr}>Baixar QR Code</button>
          <button className="btn btn-primary btn-sm" onClick={()=>data.link && window.open(data.link, "_blank")}>Visualizar portal</button>
        </div>
        {data.qrCodeUrl && portal.permitirQrCode && <img src={data.qrCodeUrl} alt="QR Code do portal" style={{width:112,height:112,marginTop:12,border:`1px solid ${C.border}`,borderRadius:10,padding:6,background:"#fff"}} />}
      </div>

      <div className="card" style={{padding:16,marginBottom:14}}>
        <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,marginBottom:12}}>Banners</h3>
        <div style={{display:"grid",gridTemplateColumns:"160px 1fr",gap:12,alignItems:"start",marginBottom:14}}>
          <div style={{height:104,borderRadius:12,overflow:"hidden",background:"#eef3fb",border:`1px solid ${C.border}`}}>
            {bannerPreview ? <img src={bannerPreview} alt="Preview" style={{width:"100%",height:"100%",objectFit:"cover"}} /> : <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:C.muted}}>Preview</div>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,alignItems:"end"}}>
            <div><label>Titulo</label><input value={bannerForm.titulo} onChange={e=>setBannerForm(p=>({...p,titulo:e.target.value}))} /></div>
            <div><label>Descricao opcional</label><input value={bannerForm.descricao} onChange={e=>setBannerForm(p=>({...p,descricao:e.target.value}))} /></div>
            <div><label>Link opcional</label><input value={bannerForm.link} onChange={e=>setBannerForm(p=>({...p,link:e.target.value}))} /></div>
            <div><label>Ordem</label><input type="number" value={bannerForm.ordem} onChange={e=>setBannerForm(p=>({...p,ordem:e.target.value}))} /></div>
            <div><label>Imagem</label><input type="file" accept="image/*" onChange={e=>chooseBannerFile(e.target.files?.[0])} /></div>
            <label style={{display:"flex",gap:8,alignItems:"center",color:C.text,marginBottom:8}}><input type="checkbox" checked={bannerForm.ativo} onChange={e=>setBannerForm(p=>({...p,ativo:e.target.checked}))} style={{width:"auto"}} /> Ativo</label>
            <button className="btn btn-primary btn-sm" onClick={createBanner} disabled={busy || !bannerForm.titulo || !bannerFile}>Adicionar banner</button>
          </div>
        </div>
        <div style={{display:"grid",gap:10}}>
          {banners.map(b => (
            <div key={b.id} style={{display:"grid",gridTemplateColumns:"110px 1fr auto",gap:12,alignItems:"center",padding:10,border:`1px solid ${C.border}`,borderRadius:12}}>
              <img src={assetUrl(b.imagem)} alt={b.titulo} style={{width:110,height:62,objectFit:"cover",borderRadius:8,background:"#eef3fb"}} />
              <div>
                <div style={{fontWeight:700,fontSize:13}}>{b.titulo}</div>
                <div style={{fontSize:12,color:C.muted}}>{b.descricao || "Sem descricao"} · ordem {b.ordem}</div>
                <div style={{display:"flex",gap:8,alignItems:"center",marginTop:8,flexWrap:"wrap"}}>
                  <label style={{display:"flex",gap:6,alignItems:"center",fontSize:12,color:C.text,margin:0}}><input type="checkbox" checked={portal.bannerIds.includes(b.id)} onChange={()=>toggleId("bannerIds", b.id)} style={{width:"auto"}} /> Visivel</label>
                  <button className="btn btn-ghost btn-xs" onClick={()=>patchBanner(b.id, { ativo: !b.ativo })}>{b.ativo ? "Inativar" : "Ativar"}</button>
                  <input type="file" accept="image/*" onChange={e=>setReplaceFiles(p=>({...p,[b.id]:e.target.files?.[0]}))} style={{maxWidth:180,padding:6,fontSize:12}} />
                  <button className="btn btn-ghost btn-xs" onClick={()=>replaceBannerImage(b.id)} disabled={!replaceFiles[b.id]}>Trocar</button>
                </div>
              </div>
              <button className="btn btn-danger btn-xs" onClick={()=>removeBanner(b.id)}>Remover</button>
            </div>
          ))}
          {!banners.length && <p style={{fontSize:13,color:C.muted}}>Nenhum banner configurado para esta edificacao.</p>}
        </div>
      </div>

      <div className="card" style={{padding:16,marginBottom:14}}>
        <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,marginBottom:12}}>Comunicados</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,alignItems:"end",marginBottom:14}}>
          <div><label>Titulo</label><input value={comunicadoForm.titulo} onChange={e=>setComunicadoForm(p=>({...p,titulo:e.target.value}))} /></div>
          <div><label>Emoji</label><input value={comunicadoForm.emoji} onChange={e=>setComunicadoForm(p=>({...p,emoji:e.target.value}))} /></div>
          <div><label>Agendar envio</label><input type="datetime-local" value={comunicadoForm.agendadoPara} onChange={e=>setComunicadoForm(p=>({...p,agendadoPara:e.target.value}))} /></div>
          <label style={{display:"flex",gap:8,alignItems:"center",color:C.text,marginBottom:8}}><input type="checkbox" checked={comunicadoForm.fixado} onChange={e=>setComunicadoForm(p=>({...p,fixado:e.target.checked}))} style={{width:"auto"}} /> Fixar</label>
        </div>
        <div className="fg"><label>Conteudo</label><textarea rows={3} value={comunicadoForm.conteudo} onChange={e=>setComunicadoForm(p=>({...p,conteudo:e.target.value}))} /></div>
        <button className="btn btn-primary btn-sm" onClick={createComunicado} disabled={busy || !comunicadoForm.titulo || !comunicadoForm.conteudo}>Criar comunicado</button>
        <div style={{display:"grid",gap:8,marginTop:14}}>
          {comunicados.map(c => {
            const meta = portal.comunicadoMeta[c.id] || {};
            return (
              <div key={c.id} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"center",padding:10,border:`1px solid ${C.border}`,borderRadius:12}}>
                <label style={{display:"flex",gap:9,alignItems:"center",margin:0,color:C.text}}>
                  <input type="checkbox" checked={portal.comunicadoIds.includes(c.id)} onChange={()=>toggleId("comunicadoIds", c.id)} style={{width:"auto"}} />
                  <span><strong>{c.emoji || "Aviso"} {c.titulo}</strong><br/><small style={{color:C.muted}}>{c.conteudo.slice(0, 90)}</small></span>
                </label>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                  <label style={{display:"flex",gap:6,alignItems:"center",fontSize:12,color:C.text,margin:0}}><input type="checkbox" checked={Boolean(meta.fixado ?? c.fixado)} onChange={e=>updateComunicadoMeta(c.id, { fixado:e.target.checked })} style={{width:"auto"}} /> Fixado</label>
                  <input type="datetime-local" value={meta.agendadoPara || ""} onChange={e=>updateComunicadoMeta(c.id, { agendadoPara:e.target.value })} style={{width:185,padding:6,fontSize:12}} />
                </div>
              </div>
            );
          })}
          {!comunicados.length && <p style={{fontSize:13,color:C.muted}}>Nenhum comunicado cadastrado.</p>}
        </div>
      </div>

      <div className="card" style={{padding:16,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",marginBottom:12}}>
          <div>
            <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,marginBottom:4}}>Documentos e IA</h3>
            <p style={{fontSize:12,color:C.muted,lineHeight:1.4}}>Documentos publicos aparecem no portal. Documentos para IA alimentam o assistente mesmo quando nao sao exibidos ao morador.</p>
          </div>
          <span className="badge" style={{background:"#eef6e8",color:"#587447"}}>{documentos.filter(d=>d.usarIa).length} na IA</span>
        </div>
        <div style={{border:`1px solid ${C.border}`,borderRadius:14,padding:12,marginBottom:14,background:"#fbfdf9"}}>
          <h4 style={{fontSize:13,fontWeight:800,marginBottom:10}}>Enviar documento</h4>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,alignItems:"end"}}>
            <div><label>Titulo</label><input value={docForm.titulo} onChange={e=>setDocForm(p=>({...p,titulo:e.target.value}))} placeholder="Ex: Convencao, Balancete" /></div>
            <div><label>Categoria</label><input value={docForm.categoria} onChange={e=>setDocForm(p=>({...p,categoria:e.target.value}))} placeholder="Ex: Regras, Financeiro" /></div>
            <div><label>Tipo de documento</label><select value={docForm.tipoDocumento} onChange={e=>setDocForm(p=>({...p,tipoDocumento:e.target.value}))}>{["Documento","Convencao","Regimento interno","Ata","Balancete","Relatorio financeiro","Prestacao de contas","Contrato","Orcamento","Documento tecnico"].map(item=><option key={item} value={item}>{item}</option>)}</select></div>
            <div><label>Tipo de acesso</label><select value={docForm.tipoAcesso} onChange={e=>setDocForm(p=>({...p,tipoAcesso:e.target.value}))}><option value="APENAS_SINDICO">Apenas sindico</option><option value="MORADOR">Morador</option><option value="IA_INTERNA">IA interna</option><option value="IA_DO_PORTAL">IA do portal</option></select></div>
            <div><label>Data de publicacao</label><input type="date" value={docForm.publicadoEm} onChange={e=>setDocForm(p=>({...p,publicadoEm:e.target.value}))} /></div>
            <div><label>Arquivo</label><input type="file" onChange={e=>setDocFile(e.target.files?.[0] || null)} /></div>
            <label style={{display:"flex",gap:8,alignItems:"center",color:C.text,marginBottom:8}}><input type="checkbox" checked={docForm.visivelPortal} onChange={e=>setDocForm(p=>({...p,visivelPortal:e.target.checked,tipoAcesso:e.target.checked && p.tipoAcesso==="APENAS_SINDICO" ? "MORADOR" : p.tipoAcesso}))} style={{width:"auto"}} /> Visivel no portal</label>
            <label style={{display:"flex",gap:8,alignItems:"center",color:C.text,marginBottom:8}}><input type="checkbox" checked={docForm.usarIa} onChange={e=>setDocForm(p=>({...p,usarIa:e.target.checked}))} style={{width:"auto"}} /> Usar na IA</label>
            <button className="btn btn-primary btn-sm" onClick={createPortalDocument} disabled={busy || !docForm.titulo || !docFile}>Enviar documento</button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:10,marginBottom:14}}>
          <div style={{border:`1px solid ${C.border}`,borderRadius:12,padding:10,background:"#fff"}}>
            <h4 style={{fontSize:13,fontWeight:800,marginBottom:8}}>Documentos publicos do morador</h4>
            {documentos.filter(d=>d.visivelPortal).slice(0,4).map(d=><div key={d.id} style={{fontSize:12,color:C.muted,marginBottom:5}}>{d.titulo || d.nome}</div>)}
            {!documentos.filter(d=>d.visivelPortal).length && <p style={{fontSize:12,color:C.muted}}>Nenhum documento visivel no portal.</p>}
          </div>
          <div style={{border:`1px solid ${C.border}`,borderRadius:12,padding:10,background:"#f4faef"}}>
            <h4 style={{fontSize:13,fontWeight:800,marginBottom:8}}>Documentos para IA</h4>
            {documentos.filter(d=>d.usarIa).slice(0,4).map(d=><div key={d.id} style={{fontSize:12,color:C.muted,marginBottom:5}}>{d.titulo || d.nome} · {d.tipoAcesso || "APENAS_SINDICO"}</div>)}
            {!documentos.filter(d=>d.usarIa).length && <p style={{fontSize:12,color:C.muted}}>Nenhum documento alimentando a IA.</p>}
          </div>
        </div>
        <h4 style={{fontSize:13,fontWeight:800,marginBottom:9}}>Configuracao dos documentos da edificacao</h4>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:8}}>
          {documentos.map(d => (
            <div key={d.id} style={{display:"grid",gap:9,padding:10,border:`1px solid ${C.border}`,borderRadius:12,color:C.text,background:d.usarIa?"#f4faef":"#fff"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"flex-start"}}>
                <div style={{minWidth:0}}>
                  <strong style={{fontSize:13}}>{d.titulo || d.nome}</strong>
                  <div style={{fontSize:11,color:C.muted}}>{d.categoria || d.pasta} · {d.tipoDocumento || d.tipo} · {fmt.date(d.publicadoEm || d.createdAt)}</div>
                </div>
                <a href={assetUrl(d.url)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs">Preview</a>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <label style={{display:"flex",gap:6,alignItems:"center",fontSize:12,color:C.text,margin:0}}><input type="checkbox" checked={Boolean(d.visivelPortal)} onChange={e=>patchPortalDocument(d.id, { visivelPortal:e.target.checked })} style={{width:"auto"}} /> Visivel no portal</label>
                <label style={{display:"flex",gap:6,alignItems:"center",fontSize:12,color:C.text,margin:0}}><input type="checkbox" checked={Boolean(d.usarIa)} onChange={e=>patchPortalDocument(d.id, { usarIa:e.target.checked })} style={{width:"auto"}} /> Usar na IA</label>
                <select value={d.tipoAcesso || "APENAS_SINDICO"} onChange={e=>patchPortalDocument(d.id, { tipoAcesso:e.target.value })} style={{gridColumn:"1 / -1",padding:8,fontSize:12}}>
                  <option value="APENAS_SINDICO">Apenas sindico</option>
                  <option value="MORADOR">Morador</option>
                  <option value="IA_INTERNA">IA interna</option>
                  <option value="IA_DO_PORTAL">IA do portal</option>
                </select>
                <button className="btn btn-danger btn-xs" onClick={()=>removePortalDocument(d.id)} style={{gridColumn:"1 / -1",justifyContent:"center"}}>Remover documento</button>
              </div>
            </div>
          ))}
          {!documentos.length && <p style={{fontSize:13,color:C.muted}}>Envie documentos para liberar conteudo ao morador ou ao assistente IA desta edificacao.</p>}
        </div>
      </div>

      <div className="card" style={{padding:16,marginBottom:14}}>
        <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,marginBottom:12}}>Contatos / colaboradores exibidos</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:10,alignItems:"end",marginBottom:12}}>
          <div><label>Nome</label><input value={contatoForm.nome} onChange={e=>setContatoForm(p=>({...p,nome:e.target.value}))} /></div>
          <div><label>Funcao</label><input value={contatoForm.funcao} onChange={e=>setContatoForm(p=>({...p,funcao:e.target.value}))} placeholder="Sindico, zelador..." /></div>
          <div><label>Telefone</label><input value={contatoForm.telefone} onChange={e=>setContatoForm(p=>({...p,telefone:e.target.value}))} /></div>
          <div><label>WhatsApp</label><input value={contatoForm.whatsapp} onChange={e=>setContatoForm(p=>({...p,whatsapp:e.target.value}))} /></div>
          <div><label>E-mail</label><input value={contatoForm.email} onChange={e=>setContatoForm(p=>({...p,email:e.target.value}))} /></div>
          <button className="btn btn-primary btn-sm" onClick={addContato} disabled={!contatoForm.nome || !contatoForm.funcao}>Adicionar contato</button>
        </div>
        <div style={{display:"grid",gap:8}}>
          {(portal.contatos || []).map(contato => (
            <div key={contato.id} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:8,alignItems:"center",border:`1px solid ${C.border}`,borderRadius:10,padding:10}}>
              <div><strong style={{fontSize:13}}>{contato.nome}</strong><div style={{fontSize:12,color:C.muted}}>{contato.funcao} · {contato.whatsapp || contato.telefone || contato.email || "sem contato"}</div></div>
              <button className="btn btn-ghost btn-xs" onClick={()=>toggleContato(contato.id)}>{contato.ativo === false ? "Ativar" : "Inativar"}</button>
              <button className="btn btn-danger btn-xs" onClick={()=>removeContato(contato.id)}>Remover</button>
            </div>
          ))}
          {!(portal.contatos || []).length && <p style={{fontSize:13,color:C.muted}}>Adicione sindico, zelador, administradora ou emergencia para aparecer no portal.</p>}
        </div>
      </div>

      <div className="card" style={{padding:16,marginBottom:14}}>
        <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,marginBottom:12}}>Funcionalidades visiveis</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:6}}>
          {portalConfigLabels.map(([key,label]) => <Toggle key={key} label={label} on={Boolean(portal.funcionalidades[key])} onChange={()=>setFunc(key)} />)}
        </div>
      </div>

      <div className="card" style={{padding:16,marginBottom:14}}>
        <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,marginBottom:12}}>Informacoes da edificacao</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:6}}>
          {portalInfoLabels.map(([key,label]) => <Toggle key={key} label={label} on={Boolean(portal.informacoes[key])} onChange={()=>setInfo(key)} />)}
        </div>
      </div>

      <div style={{display:"flex",gap:9,justifyContent:"flex-end",position:"sticky",bottom:0,background:"#fff",paddingTop:12}}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Fechar</button>
        <button className="btn btn-primary btn-sm" onClick={saveConfig} disabled={busy}>Salvar e gerar link/QR Code</button>
      </div>
    </Modal>
    {manualCopyModal}
    </>
  );
}

function EdificacoesPage({ user, onUserChange, go, toast }) {
  const { data, loading, reload } = useFetch("/condominios");
  const condominios = asList(data);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPlano, setShowPlano] = useState(false);
  const [showUnidades, setShowUnidades] = useState(false);
  const [showMorador, setShowMorador] = useState(false);
  const [showPortalConfig, setShowPortalConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(condoFormFrom());
  const [portalDraft, setPortalDraft] = useState(portalConfigDefault);
  const [seguroFile, setSeguroFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [userForm, setUserForm] = useState({ nome:"", email:"", role:"MORADOR", unidade:"", bloco:"", telefone:"", whatsapp:"" });
  const { data: controlData, loading: loadingControl } = useFetch(selectedId ? `/dashboard?edificacaoId=${selectedId}` : null, [selectedId]);
  const { data: unidadesData, loading: loadingUnidades, reload: reloadUnidades } = useFetch(selectedId ? `/condominios/${selectedId}/unidades-gestao` : null, [selectedId]);
  const { data: portalData, loading: loadingPortal, reload: reloadPortal } = useFetch(selectedId ? `/condominios/${selectedId}/portal-config` : null, [selectedId]);
  const { copyNow, manualCopyModal } = useSafeCopy(toast);

  async function loadDetail(id) {
    setLoadingDetail(true);
    try {
      const item = await api.get(`/condominios/${id}`);
      setDetail(item);
      setPortalDraft(normalizePortalDraft(item.portalConfig || {}));
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    setLogoFile(null);
    setLogoPreview("");
    if (selectedId) loadDetail(selectedId);
  }, [selectedId]);

  useEffect(() => {
    return () => {
      if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  async function saveCreate() {
    setSaving(true);
    try {
      const item = await api.post("/condominios", form);
      toast("Edificação cadastrada!", "ok");
      setShowCreate(false);
      setSelectedId(item.id);
      reload();
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const item = await api.patch(`/condominios/${detail.id}`, form);
      toast("Edificação atualizada!", "ok");
      setShowEdit(false);
      setDetail(item);
      reload();
      loadDetail(item.id);
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setSaving(false);
    }
  }

  async function activate(id, silent = false) {
    try {
      const result = await api.post(`/condominios/${id}/selecionar`, {});
      localStorage.setItem("tnm_token", result.token);
      localStorage.setItem("tnm_user", JSON.stringify(result.user));
      onUserChange(result.user);
      if (!silent) toast("Condomínio ativo selecionado!", "ok");
      reload();
      if (selectedId === id) loadDetail(id);
      return true;
    } catch (e) {
      toast(e.message, "err");
      return false;
    }
  }

  async function activateAndGo(page) {
    if (!detail) return;
    const ok = detail.id === user.condominioId || await activate(detail.id, true);
    if (ok) go(page);
  }

  async function savePortal() {
    if (!detail) return;
    try {
      const item = await api.patch(`/condominios/${detail.id}`, { portalConfig: portalDraft });
      setDetail(item);
      toast("Portal do morador configurado!", "ok");
    } catch (e) {
      toast(e.message, "err");
    }
  }

  async function createUser() {
    if (!detail) return;
    try {
      await api.post(`/condominios/${detail.id}/usuarios`, userForm);
      toast("Usuário/unidade cadastrado!", "ok");
      setUserForm({ nome:"", email:"", role:"MORADOR", unidade:"", bloco:"", telefone:"", whatsapp:"" });
      loadDetail(detail.id);
    } catch (e) {
      toast(e.message, "err");
    }
  }

  async function toggleMorador(userId, ativo) {
    if (!detail) return;
    try {
      await api.patch(`/condominios/${detail.id}/unidades-gestao/moradores/${userId}`, { ativo: !ativo });
      toast(!ativo ? "Morador ativado!" : "Morador inativado!", "ok");
      reloadUnidades();
      loadDetail(detail.id);
    } catch (e) {
      toast(e.message, "err");
    }
  }

  async function uploadSeguro() {
    if (!detail || !seguroFile) return;
    const body = new FormData();
    body.append("documento", seguroFile);
    try {
      const item = await api.post(`/condominios/${detail.id}/seguro-documento`, body);
      setDetail(item);
      setSeguroFile(null);
      toast("Documento do seguro anexado!", "ok");
    } catch (e) {
      toast(e.message, "err");
    }
  }

  function chooseLogoFile(file) {
    setLogoFile(file || null);
    setLogoPreview(file ? URL.createObjectURL(file) : "");
    if (file?.size > LOGO_MAX_BYTES) toast("Imagem acima de 2MB. O backend vai bloquear este envio.", "info");
  }

  async function uploadLogo() {
    if (!detail || !logoFile) return;
    if (logoFile.size > LOGO_MAX_BYTES) return toast("A logomarca deve ter ate 2MB.", "err");
    const body = new FormData();
    body.append("logo", logoFile);
    try {
      const item = await api.post(`/condominios/${detail.id}/logo`, body);
      setDetail(item);
      setLogoFile(null);
      setLogoPreview("");
      reload();
      reloadPortal();
      toast("Logomarca atualizada!", "ok");
    } catch (e) {
      toast(e.message, "err");
    }
  }

  async function removeLogo() {
    if (!detail) return;
    if (!window.confirm("Remover a logomarca desta edificacao?")) return;
    try {
      const item = await api.del(`/condominios/${detail.id}/logo`);
      setDetail(item);
      setLogoFile(null);
      setLogoPreview("");
      reload();
      reloadPortal();
      toast("Logomarca removida!", "ok");
    } catch (e) {
      toast(e.message, "err");
    }
  }

  const alertas = condominios.filter(c => ["PROXIMO_DO_VENCIMENTO", "ENCERRADO"].includes(c.mandatoStatus) || ["PROXIMO_DO_VENCIMENTO", "VENCIDO"].includes(c.seguroStatus));

  if (selectedId) {
    if (loadingDetail || !detail) return <div className="page"><Spinner /></div>;
    const moradores = detail.users?.filter(u => u.role === "MORADOR") || [];
    const responsaveis = detail.users?.filter(u => u.role !== "MORADOR") || [];
    const active = detail.id === user.condominioId;
    const stats = controlData?.stats || {};
    const proximas = controlData?.alertas || [];
    const plano = detail.planoManutencao || [];
    const unidadesResumo = unidadesData?.resumo || { totalUnidades:0, ocupadas:0, semMorador:0, responsaveisCadastrados:0 };
    const unidadesRows = unidadesData?.unidades || [];
    const planoCriticas = plano.filter(item => item.prioridade === "ALTA").length;
    const pendenciasCriticas = detail.seguroStatus === "VENCIDO" || detail.mandatoStatus === "ENCERRADO" || proximas.some(item => item.prioridade === "ALTA");
    const manutencoesProximas = !pendenciasCriticas && (proximas.length > 0 || detail.seguroStatus === "PROXIMO_DO_VENCIMENTO" || detail.mandatoStatus === "PROXIMO_DO_VENCIMENTO");
    const statusControl = pendenciasCriticas
      ? { label:"Pendências críticas", tone:C.danger, bg:"#fff1f2" }
      : manutencoesProximas
        ? { label:"Manutenções próximas", tone:C.warning, bg:"#fffbeb" }
        : { label:"Regular", tone:C.success, bg:"#ecfdf5" };
    const riscoPontos = (stats.chamadosAbertos || 0) + (stats.manutencoesPendentes || 0) + planoCriticas + (detail.seguroStatus === "VENCIDO" ? 4 : detail.seguroStatus === "PROXIMO_DO_VENCIMENTO" ? 2 : 0);
    const risco = riscoPontos >= 8
      ? { label:"Crítico", tone:C.danger }
      : riscoPontos >= 4
        ? { label:"Atenção", tone:C.warning }
        : { label:"Baixo", tone:C.success };
    const kpis = [
      { label:"Manutenções em dia", value:`${stats.scorePreventivas || 0}%`, icon:"check", tone:C.success, hint:`${stats.manutencoesPreventivas || 0} preventivas` },
      { label:"Chamados abertos", value:stats.chamadosAbertos || 0, icon:"chat", tone:C.warning, hint:`${stats.totalChamados || 0} chamados no total` },
      { label:"Risco atual", value:risco.label, icon:"alert", tone:risco.tone, hint:`${riscoPontos} pontos de atenção` },
      { label:"Valor investido", value:fmt.money(stats.valoresInvestidos || 0), icon:"money", tone:C.primary, hint:"manutenção e contas" },
    ];
    return (
      <div className="page">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,marginBottom:18,flexWrap:"wrap"}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>{ setSelectedId(null); setDetail(null); }}>Voltar</button>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
            {!active && <button className="btn btn-accent btn-sm" onClick={()=>activate(detail.id)}>Selecionar ativo</button>}
            <button className="btn btn-primary btn-sm" onClick={()=>{ setForm(condoFormFrom(detail)); setShowEdit(true); }}>Editar dados</button>
          </div>
        </div>

        <div style={{background:C.dark,borderRadius:18,padding:24,marginBottom:16,color:"#fff",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",right:-60,top:-80,width:260,height:260,borderRadius:"50%",background:"rgba(34,197,94,.16)"}} />
          <div style={{position:"relative",display:"flex",justifyContent:"space-between",gap:18,alignItems:"flex-start",flexWrap:"wrap"}}>
            <div style={{width:82,height:82,borderRadius:18,background:"rgba(255,255,255,.10)",border:"1px solid rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
              {(logoPreview || logoSource(detail))
                ? <img src={logoPreview || logoSource(detail)} alt={`Logo ${detail.nome}`} style={{width:"100%",height:"100%",objectFit:"contain",background:"#fff",padding:8}} />
                : <span style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:800,color:"#fff",textAlign:"center",lineHeight:1.1,padding:8}}>{(detail.nome || "Condominio").slice(0, 2).toUpperCase()}</span>}
            </div>
            <div style={{flex:1,minWidth:240}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                <span style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:"rgba(255,255,255,.62)"}}>Centro de Controle do Condomínio</span>
                {active && <span className="badge bd-done">Condomínio ativo</span>}
              </div>
              <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:28,fontWeight:800,marginBottom:6}}>{detail.nome}</h1>
              <p style={{fontSize:14,color:"rgba(255,255,255,.72)"}}>{detail.cidade || "Cidade não informada"} / {detail.estado || "UF"} · {tipoEdificacaoLabels[detail.tipoEdificacao]}</p>
              <div style={{display:"flex",gap:12,marginTop:16,flexWrap:"wrap",fontSize:12,color:"rgba(255,255,255,.7)"}}>
                <span>{detail.unidades || 0} unidades</span>
                <span>{detail.blocos || 0} blocos</span>
                <span>{detail.pavimentos || 0} pavimentos</span>
              </div>
            </div>
            <div style={{minWidth:220,background:statusControl.bg,color:statusControl.tone,borderRadius:14,padding:14,border:`1px solid ${statusControl.tone}33`}}>
              <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,opacity:.8}}>Status do condomínio</div>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:800,marginTop:4}}>{statusControl.label}</div>
              <div style={{fontSize:12,marginTop:6,color:C.text}}>Seguro {detail.seguroDiasRestantes ?? "sem data"} dias · mandato {detail.mandatoDiasRestantes ?? "sem data"} dias</div>
            </div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:13,marginBottom:16}}>
          {kpis.map(k => (
            <div key={k.label} className="stat" style={{display:"flex",alignItems:"center",gap:13}}>
              <div style={{width:42,height:42,borderRadius:12,background:k.tone+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Ic n={k.icon} s={20} c={k.tone} />
              </div>
              <div style={{minWidth:0}}>
                <div className="stat-n" style={{fontSize:22,color:k.tone,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{loadingControl ? "..." : k.value}</div>
                <div className="stat-l">{k.label}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{k.hint}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{padding:22,marginBottom:16,border:`1.5px solid ${C.primary}`,boxShadow:"0 10px 34px rgba(15,76,129,.10)"}}>
          <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(260px,.72fr)",gap:20,alignItems:"start"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:14,flexWrap:"wrap"}}>
                <div>
                  <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:800}}>Plano de Manutenção</h2>
                  <p style={{fontSize:13,color:C.muted,marginTop:3}}>Bloco prioritário da edificação selecionada.</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={()=>setShowPlano(true)}>Gerenciar plano</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
                <div style={{background:"#F2FAF1",borderRadius:12,padding:13}}><strong style={{fontSize:22,color:C.primary}}>{plano.length}</strong><div style={{fontSize:12,color:C.muted}}>Manutenções no plano</div></div>
                <div style={{background:"#fff1f2",borderRadius:12,padding:13}}><strong style={{fontSize:22,color:C.danger}}>{planoCriticas}</strong><div style={{fontSize:12,color:C.muted}}>Críticas</div></div>
                <div style={{background:"#f0fdf4",borderRadius:12,padding:13}}><strong style={{fontSize:22,color:C.success}}>{stats.scorePreventivas || 0}%</strong><div style={{fontSize:12,color:C.muted}}>Score preventivas</div></div>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {plano.slice(0, 10).map(item => <span key={item.id} className={`badge ${item.prioridade==="ALTA"?"bd-dang":item.prioridade==="MEDIA"?"bd-pend":"bd-info"}`}>{item.nome}</span>)}
                {!plano.length && <span style={{fontSize:13,color:C.muted}}>Nenhum item configurado ainda.</span>}
              </div>
            </div>
            <div style={{borderLeft:`1px solid ${C.border}`,paddingLeft:18}}>
              <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:700,marginBottom:10}}>Próximas execuções</h3>
              <div style={{display:"grid",gap:9}}>
                {proximas.slice(0, 5).map(item => (
                  <div key={item.id} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700}}>{item.titulo}</div>
                      <div style={{fontSize:12,color:C.muted}}>{fmt.date(item.dataVencimento)}</div>
                    </div>
                    <span className={`badge ${item.prioridade==="ALTA"?"bd-dang":item.prioridade==="MEDIA"?"bd-pend":"bd-info"}`}>{item.prioridade}</span>
                  </div>
                ))}
                {!proximas.length && <p style={{fontSize:13,color:C.muted}}>Nenhuma execução crítica nos próximos dias.</p>}
              </div>
            </div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:16,alignItems:"start"}}>
          <div className="card" style={{padding:18}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:14}}>
              <div>
                <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:800}}>Gestão de unidades e moradores</h3>
                <p style={{fontSize:12,color:C.muted,marginTop:2}}>{organizacaoOptions.find(([v])=>v===unidadesData?.organizacao)?.[1] || "Organize a estrutura da edificação"}</p>
              </div>
              <button className="btn btn-primary btn-xs" onClick={()=>setShowUnidades(true)}>Gerenciar unidades</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
              <div style={{background:"#F2FAF1",borderRadius:12,padding:10}}><strong style={{fontSize:18}}>{loadingUnidades ? "..." : unidadesResumo.totalUnidades}</strong><div style={{fontSize:11,color:C.muted}}>Unidades</div></div>
              <div style={{background:"#f0fdf4",borderRadius:12,padding:10}}><strong style={{fontSize:18,color:C.success}}>{loadingUnidades ? "..." : unidadesResumo.ocupadas}</strong><div style={{fontSize:11,color:C.muted}}>Ocupadas</div></div>
              <div style={{background:"#fff7ed",borderRadius:12,padding:10}}><strong style={{fontSize:18,color:C.warning}}>{loadingUnidades ? "..." : unidadesResumo.semMorador}</strong><div style={{fontSize:11,color:C.muted}}>Sem morador</div></div>
              <div style={{background:"#eef6ff",borderRadius:12,padding:10}}><strong style={{fontSize:18,color:C.primary}}>{loadingUnidades ? "..." : unidadesResumo.responsaveisCadastrados}</strong><div style={{fontSize:11,color:C.muted}}>Responsáveis</div></div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowMorador(true)} disabled={!unidadesRows.length}>Adicionar morador</button>
              <button className="btn btn-ghost btn-sm" disabled>Importar planilha</button>
            </div>
            <div className="card" style={{overflow:"hidden",boxShadow:"none"}}>
              <table className="table">
                <thead><tr><th>Unidade</th><th>Bloco/Torre/Casa</th><th>Morador principal</th><th>Telefone</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>{unidadesRows.slice(0, 8).map(u => {
                  const principal = u.moradorPrincipal;
                  return (
                    <tr key={u.id}>
                      <td style={{fontWeight:600}}>{u.codigo}</td>
                      <td style={{fontSize:13}}>{u.grupo || u.prefixo || "Livre"}</td>
                      <td style={{fontSize:13}}>{principal?.nome || "Sem morador"}</td>
                      <td style={{fontSize:13,color:C.muted}}>{principal?.telefone || principal?.whatsapp || "—"}</td>
                      <td><Bdg s={principal?.ativo ? "Ativo" : "Inativo"} /></td>
                      <td>{principal ? <button className="btn btn-ghost btn-xs" onClick={()=>toggleMorador(principal.id, principal.ativo)}>{principal.ativo ? "Inativar" : "Ativar"}</button> : <button className="btn btn-ghost btn-xs" onClick={()=>setShowMorador(true)}>Vincular</button>}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
              {!unidadesRows.length && <p style={{textAlign:"center",padding:24,color:C.muted,fontSize:13}}>Nenhuma unidade cadastrada. Gere unidades automaticamente para começar.</p>}
            </div>
          </div>

          <div className="card" style={{padding:18}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:14}}>
              <div>
                <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:800}}>Identidade visual do condominio</h3>
                <p style={{fontSize:12,color:C.muted,marginTop:2}}>A logomarca aparece no portal, relatorios e impressoes desta edificacao.</p>
              </div>
              <Bdg s={(logoPreview || logoSource(detail)) ? "Configurada" : "Sem logo"} />
            </div>
            <div style={{display:"grid",gridTemplateColumns:"96px minmax(0,1fr)",gap:14,alignItems:"center",marginBottom:14}}>
              <div style={{width:96,height:96,borderRadius:16,border:`1.5px dashed ${C.border}`,background:"#F2FAF1",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                {(logoPreview || logoSource(detail))
                  ? <img src={logoPreview || logoSource(detail)} alt={`Logo ${detail.nome}`} style={{width:"100%",height:"100%",objectFit:"contain",padding:8,background:"#fff"}} />
                  : <span style={{fontSize:11,fontWeight:800,color:C.primary,textAlign:"center",padding:8}}>{detail.nome}</span>}
              </div>
              <div style={{minWidth:0}}>
                <label>Upload da logomarca</label>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>chooseLogoFile(e.target.files?.[0] || null)} />
                <div style={{fontSize:11,color:(logoFile?.size || 0) > LOGO_MAX_BYTES ? C.danger : C.muted,marginTop:6}}>
                  PNG, JPG, JPEG ou WEBP. Recomendado ate 2MB{logoFile ? ` · selecionado: ${logoFile.name}` : ""}.
                </div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button className="btn btn-primary btn-sm" onClick={uploadLogo} disabled={!logoFile || (logoFile?.size || 0) > LOGO_MAX_BYTES}>{logoSource(detail) ? "Trocar imagem" : "Salvar logomarca"}</button>
              <button className="btn btn-ghost btn-sm" onClick={removeLogo} disabled={!logoSource(detail) && !logoPreview}>Remover imagem</button>
            </div>
          </div>

          <div className="card" style={{padding:18}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:14}}>
              <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:800}}>Documentação</h3>
              <button className="btn btn-ghost btn-xs" onClick={()=>setShowPortalConfig(true)}>Configurar documentos</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div style={{background:"#F2FAF1",borderRadius:12,padding:12}}><strong style={{fontSize:20}}>{detail._count?.documentos || 0}</strong><div style={{fontSize:12,color:C.muted}}>Documentos</div></div>
              <div style={{background:detail.seguroStatus==="VENCIDO"?"#fff1f2":"#f0fdf4",borderRadius:12,padding:12}}><Bdg s={detail.seguroStatus} /><div style={{fontSize:12,color:C.muted,marginTop:6}}>Seguro obrigatório</div></div>
            </div>
            <div style={{fontSize:13,color:C.muted,display:"grid",gap:6,marginBottom:12}}>
              <span>Seguradora: <strong style={{color:C.text}}>{detail.seguroSeguradora || "Não informada"}</strong></span>
              <span>Apólice: <strong style={{color:C.text}}>{detail.seguroApolice || "Não informada"}</strong></span>
              <span>Vencimento: <strong style={{color:C.text}}>{fmt.date(detail.seguroVencimento)}</strong></span>
              {detail.seguroDocumento && <a href={detail.seguroDocumento} target="_blank" rel="noreferrer" style={{color:C.accent,fontWeight:700}}>Abrir documento anexado</a>}
            </div>
            <input type="file" onChange={e=>setSeguroFile(e.target.files?.[0] || null)} />
            <button className="btn btn-ghost btn-sm" style={{marginTop:8,width:"100%",justifyContent:"center"}} onClick={uploadSeguro} disabled={!seguroFile}>Enviar seguro</button>
          </div>

          <div className="card" style={{padding:18,border:`1.5px solid ${portalData?.resumo?.ativo ? C.success : C.border}`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:14}}>
              <div>
                <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:800}}>Portal do Morador</h3>
                <p style={{fontSize:12,color:C.muted,marginTop:2}}>Configuracao individual desta edificacao.</p>
              </div>
              <Bdg s={loadingPortal ? "Carregando" : portalData?.resumo?.ativo ? "Ativo" : "Inativo"} />
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:12}}>
              <div style={{background:"#F2FAF1",borderRadius:12,padding:12}}><strong style={{fontSize:20}}>{loadingPortal ? "..." : portalData?.resumo?.bannersConfigurados || 0}</strong><div style={{fontSize:12,color:C.muted}}>Banners configurados</div></div>
              <div style={{background:"#F2FAF1",borderRadius:12,padding:12}}><strong style={{fontSize:20}}>{loadingPortal ? "..." : portalData?.resumo?.documentosVisiveis || 0}</strong><div style={{fontSize:12,color:C.muted}}>Documentos visiveis</div></div>
              <div style={{background:"#F2FAF1",borderRadius:12,padding:12}}><strong style={{fontSize:20}}>{loadingPortal ? "..." : portalData?.resumo?.comunicadosAtivos || 0}</strong><div style={{fontSize:12,color:C.muted}}>Comunicados ativos</div></div>
              <div style={{background:"#F2FAF1",borderRadius:12,padding:12}}><strong style={{fontSize:20}}>{loadingPortal ? "..." : portalData?.resumo?.funcionalidadesAtivas || 0}</strong><div style={{fontSize:12,color:C.muted}}>Funcionalidades</div></div>
            </div>
            <div style={{fontSize:12,color:C.muted,background:"#F2FAF1",border:`1px solid ${C.border}`,borderRadius:10,padding:10,marginBottom:12,wordBreak:"break-all"}}>
              {portalData?.link || "Salve a configuracao para gerar link publico e QR Code."}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button className="btn btn-primary btn-sm" onClick={()=>setShowPortalConfig(true)}>Configurar portal</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>portalData?.link && window.open(portalData.link, "_blank")} disabled={!portalData?.link}>Visualizar portal</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>{ if(!portalData?.link) return toast("Salve o portal para gerar o link.", "info"); copyNow(portalData.link, "Link do portal copiado!"); }}>Copiar link</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>{ if(!portalData?.qrCodeUrl) return toast("Salve o portal para gerar o QR Code.", "info"); const a=document.createElement("a"); a.href=portalData.qrCodeUrl; a.download="portal-morador-qr.png"; a.click(); }}>Gerar QR Code</button>
            </div>
          </div>

          <div className="card" style={{padding:18,display:"none"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:14}}>
              <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:800}}>Comunicação</h3>
              <button className="btn btn-ghost btn-xs" onClick={()=>activateAndGo("banners")}>Abrir banners</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div style={{background:"#F2FAF1",borderRadius:12,padding:12}}><strong style={{fontSize:20}}>{detail._count?.banners || 0}</strong><div style={{fontSize:12,color:C.muted}}>Banners</div></div>
              <div style={{background:"#F2FAF1",borderRadius:12,padding:12}}><strong style={{fontSize:20}}>{portalConfigLabels.filter(([key])=>portalDraft[key]).length}</strong><div style={{fontSize:12,color:C.muted}}>Recursos ativos</div></div>
            </div>
            {portalConfigLabels.map(([key, label]) => (
              <Toggle key={key} label={label} on={Boolean(portalDraft[key])} onChange={()=>setPortalDraft(p=>({...p,[key]:!p[key]}))} />
            ))}
            <button className="btn btn-primary btn-sm" style={{marginTop:12,width:"100%",justifyContent:"center"}} onClick={savePortal}>Salvar portal</button>
          </div>
        </div>

        {showEdit && <Modal title="Editar Edificação" onClose={()=>setShowEdit(false)} wide><CondominioForm value={form} setValue={setForm} saving={saving} submitLabel="Salvar alterações" onCancel={()=>setShowEdit(false)} onSubmit={saveEdit} /></Modal>}
        {showPlano && <PlanoManutencaoModal condominioId={detail.id} onClose={()=>setShowPlano(false)} toast={toast} onSaved={()=>loadDetail(detail.id)} />}
        {showUnidades && <UnidadesManagerModalV2 condominioId={detail.id} data={unidadesData} onClose={()=>setShowUnidades(false)} toast={toast} onSaved={()=>{ reloadUnidades(); loadDetail(detail.id); }} />}
        {showMorador && <MoradorUnidadeModal condominioId={detail.id} unidades={unidadesRows} onClose={()=>setShowMorador(false)} toast={toast} onSaved={()=>{ reloadUnidades(); loadDetail(detail.id); }} />}
        {showPortalConfig && <PortalMoradorConfigModal condominioId={detail.id} data={portalData} onClose={()=>setShowPortalConfig(false)} toast={toast} onSaved={()=>{ reloadPortal(); loadDetail(detail.id); }} />}
      </div>
    );
    /*
    return (
      <div className="page">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>{ setSelectedId(null); setDetail(null); }}>Voltar</button>
            <div>
              <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:700}}>{detail.nome}</h1>
              <p style={{color:C.muted,fontSize:13,marginTop:2}}>{tipoEdificacaoLabels[detail.tipoEdificacao]} · {detail.cidade || "Cidade não informada"} / {detail.estado || "UF"}</p>
            </div>
            {active && <span className="badge bd-done">Ativo</span>}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
            {!active && <button className="btn btn-accent btn-sm" onClick={()=>activate(detail.id)}>Selecionar ativo</button>}
            <button className="btn btn-primary btn-sm" onClick={()=>{ setForm(condoFormFrom(detail)); setShowEdit(true); }}>Editar</button>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:13,marginBottom:18}}>
          <div className="stat"><div className="stat-n" style={{fontSize:26,color:C.primary}}>{detail.unidades || 0}</div><div className="stat-l">Unidades · {detail.blocos || 0} blocos · {detail.pavimentos || 0} pav.</div></div>
          <div className="stat"><div className="stat-n" style={{fontSize:18,color:detail.mandatoStatus==="ENCERRADO"?C.danger:detail.mandatoStatus==="PROXIMO_DO_VENCIMENTO"?C.warning:C.success}}>{detail.mandatoDiasRestantes ?? "—"} dias</div><div className="stat-l">Mandato · <Bdg s={detail.mandatoStatus} /></div></div>
          <div className="stat"><div className="stat-n" style={{fontSize:18,color:detail.seguroStatus==="VENCIDO"?C.danger:detail.seguroStatus==="PROXIMO_DO_VENCIMENTO"?C.warning:C.success}}>{detail.seguroDiasRestantes ?? "—"} dias</div><div className="stat-l">Seguro · <Bdg s={detail.seguroStatus} /></div></div>
          <div className="stat"><div className="stat-n" style={{fontSize:26,color:C.accent}}>{detail._count?.manutencoes || 0}</div><div className="stat-l">Manutenções integradas</div></div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.1fr) minmax(320px,.9fr)",gap:16,alignItems:"start"}}>
          <div style={{display:"grid",gap:16}}>
            <div className="card" style={{padding:18}}>
              <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,marginBottom:12}}>Dados da edificação</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,fontSize:13}}>
                <div><strong>CNPJ</strong><br/><span style={{color:C.muted}}>{detail.cnpj || "Não informado"}</span></div>
                <div><strong>Telefone</strong><br/><span style={{color:C.muted}}>{detail.telefone || "Não informado"}</span></div>
                <div><strong>Email</strong><br/><span style={{color:C.muted}}>{detail.email || "Não informado"}</span></div>
                <div><strong>Endereço</strong><br/><span style={{color:C.muted}}>{detail.endereco}</span></div>
              </div>
            </div>

            <div className="card" style={{padding:18}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:12}}>
                <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15}}>Plano de Manutenção</h3>
                <button className="btn btn-primary btn-sm" onClick={()=>setShowPlano(true)}>Configurar Plano</button>
              </div>
              <p style={{fontSize:13,color:C.muted,marginBottom:12}}>Cada condomínio possui seu próprio plano. A seleção é manual e, ao salvar, cria manutenções preventivas apenas nesta edificação.</p>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {(detail.planoManutencao || []).slice(0, 8).map(item => <span key={item.id} className="badge bd-info">{item.nome}</span>)}
                {!detail.planoManutencao?.length && <span style={{fontSize:13,color:C.muted}}>Nenhum item configurado ainda.</span>}
              </div>
            </div>

            <div className="card" style={{padding:18}}>
              <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,marginBottom:12}}>Unidades e responsáveis</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:16}}>
                <div style={{background:"#F2FAF1",borderRadius:12,padding:12}}><strong>{moradores.length}</strong><div style={{fontSize:12,color:C.muted}}>Moradores/unidades</div></div>
                <div style={{background:"#F2FAF1",borderRadius:12,padding:12}}><strong>{responsaveis.length}</strong><div style={{fontSize:12,color:C.muted}}>Responsáveis</div></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
                <input placeholder="Nome" value={userForm.nome} onChange={e=>setUserForm(p=>({...p,nome:e.target.value}))} />
                <input placeholder="Email" value={userForm.email} onChange={e=>setUserForm(p=>({...p,email:e.target.value}))} />
                <select value={userForm.role} onChange={e=>setUserForm(p=>({...p,role:e.target.value}))}>
                  <option value="MORADOR">Morador</option>
                  <option value="SINDICO">Síndico</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <input placeholder="Unidade/apto" value={userForm.unidade} onChange={e=>setUserForm(p=>({...p,unidade:e.target.value}))} />
                <input placeholder="Bloco" value={userForm.bloco} onChange={e=>setUserForm(p=>({...p,bloco:e.target.value}))} />
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}>
                <button className="btn btn-primary btn-sm" onClick={createUser} disabled={!userForm.nome || !userForm.email}>Cadastrar usuário/unidade</button>
              </div>
            </div>
          </div>

          <div style={{display:"grid",gap:16}}>
            <div className="card" style={{padding:18}}>
              <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,marginBottom:12}}>Seguro obrigatório</h3>
              <div style={{fontSize:13,color:C.muted,display:"grid",gap:6,marginBottom:12}}>
                <span>Seguradora: <strong style={{color:C.text}}>{detail.seguroSeguradora || "Não informada"}</strong></span>
                <span>Apólice: <strong style={{color:C.text}}>{detail.seguroApolice || "Não informada"}</strong></span>
                <span>Vencimento: <strong style={{color:C.text}}>{fmt.date(detail.seguroVencimento)}</strong></span>
                {detail.seguroDocumento && <a href={detail.seguroDocumento} target="_blank" rel="noreferrer" style={{color:C.accent,fontWeight:600}}>Abrir documento anexado</a>}
              </div>
              <input type="file" onChange={e=>setSeguroFile(e.target.files?.[0] || null)} />
              <button className="btn btn-ghost btn-sm" style={{marginTop:8}} onClick={uploadSeguro} disabled={!seguroFile}>Enviar documento</button>
            </div>

            <div className="card" style={{padding:18}}>
              <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,marginBottom:12}}>Portal do Morador</h3>
              {portalConfigLabels.map(([key, label]) => (
                <Toggle key={key} label={label} on={Boolean(portalDraft[key])} onChange={()=>setPortalDraft(p=>({...p,[key]:!p[key]}))} />
              ))}
              <button className="btn btn-primary btn-sm" style={{marginTop:12,width:"100%",justifyContent:"center"}} onClick={savePortal}>Salvar configuração</button>
            </div>

            <div className="card" style={{padding:18}}>
              <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,marginBottom:12}}>Configurações do condomínio</h3>
              <div style={{display:"grid",gap:9}}>
                <button className="btn btn-ghost btn-sm" onClick={()=>activateAndGo("docs")}>Documentos e pastas</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>activateAndGo("banners")}>Banners</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>activateAndGo("manut")}>Abrir Manutenções</button>
              </div>
            </div>
          </div>
        </div>

        {showEdit && <Modal title="Editar Edificação" onClose={()=>setShowEdit(false)} wide><CondominioForm value={form} setValue={setForm} saving={saving} submitLabel="Salvar alterações" onCancel={()=>setShowEdit(false)} onSubmit={saveEdit} /></Modal>}
        {showPlano && <PlanoManutencaoModal condominioId={detail.id} onClose={()=>setShowPlano(false)} toast={toast} onSaved={()=>loadDetail(detail.id)} />}
      </div>
    );
    */
  }

  return (
    <div className="page">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,marginBottom:22}}>
        <div>
          <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:700}}>Edificações</h1>
          <p style={{color:C.muted,fontSize:13,marginTop:2}}>Base do sistema: cadastre, selecione e configure cada condomínio administrado.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>{ setForm(condoFormFrom()); setShowCreate(true); }}><Ic n="plus" s={14} /> Nova Edificação</button>
      </div>

      {alertas.length > 0 && (
        <div className="card" style={{padding:16,borderLeft:`4px solid ${C.warning}`,marginBottom:18}}>
          <div style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:700,marginBottom:8}}>Alertas automáticos de vencimento</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {alertas.map(c => <span key={c.id} className="badge bd-pend">{c.nome}: mandato {c.mandatoDiasRestantes ?? "—"} dias · seguro {c.seguroDiasRestantes ?? "—"} dias</span>)}
          </div>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
          {condominios.map(c => {
            const active = c.id === user.condominioId;
            return (
              <div key={c.id} className="card" onClick={()=>setSelectedId(c.id)} style={{padding:18,cursor:"pointer",borderColor:active?C.accent:C.border}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700}}>{c.nome}</h3>
                    <p style={{fontSize:12,color:C.muted,marginTop:3}}>{tipoEdificacaoLabels[c.tipoEdificacao]} · {c.cidade || "Cidade"} / {c.estado || "UF"}</p>
                  </div>
                  {active ? <span className="badge bd-done">Ativo</span> : <span className="badge bd-gray">Inativo</span>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,margin:"14px 0"}}>
                  <div style={{background:"#F2FAF1",borderRadius:10,padding:10}}><strong>{c.unidades || 0}</strong><div style={{fontSize:11,color:C.muted}}>unidades</div></div>
                  <div style={{background:"#F2FAF1",borderRadius:10,padding:10}}><strong>{c.blocos || 0}</strong><div style={{fontSize:11,color:C.muted}}>blocos</div></div>
                  <div style={{background:"#F2FAF1",borderRadius:10,padding:10}}><strong>{c._count?.manutencoes || 0}</strong><div style={{fontSize:11,color:C.muted}}>manut.</div></div>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
                  <Bdg s={c.mandatoStatus} />
                  <Bdg s={c.seguroStatus} />
                </div>
                <div style={{display:"flex",gap:8}}>
                  {!active && <button className="btn btn-accent btn-xs" onClick={e=>{ e.stopPropagation(); activate(c.id); }}>Ativar</button>}
                  <button className="btn btn-ghost btn-xs" onClick={e=>{ e.stopPropagation(); setSelectedId(c.id); }}>Detalhes</button>
                </div>
              </div>
            );
          })}
          {!condominios.length && <div className="card" style={{padding:32,textAlign:"center",color:C.muted}}>Nenhuma edificação cadastrada.</div>}
        </div>
      )}

      {manualCopyModal}
      {showCreate && <Modal title="Cadastrar Edificação" onClose={()=>setShowCreate(false)} wide><CondominioForm value={form} setValue={setForm} saving={saving} submitLabel="Cadastrar" onCancel={()=>setShowCreate(false)} onSubmit={saveCreate} /></Modal>}
    </div>
  );
}

function ManutPage({ toast }) {
  const [filter, setFilter] = useState("all");
  const path = filter==="all" ? "/manutencoes" : `/manutencoes?status=${filter}`;
  const { data, loading, reload } = useFetch(path, [filter]);
  const { data: planoData, loading: loadingPlano, reload: reloadPlano } = useFetch("/manutencoes/plano-organizado");
  const [show, setShow] = useState(false);
  const [openCats, setOpenCats] = useState({});
  const [form, setForm] = useState({ titulo:"", tipo:"PREVENTIVA", prioridade:"MEDIA", responsavel:"", dataVencimento:"", descricao:"" });
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const manutencoes = asList(data);
  const categorias = planoData?.categorias || [];
  const resumo = planoData?.dashboard || { total:0, emDia:0, proximas:0, atrasadas:0, criticas:0, valorInvestido:0 };

  useEffect(() => {
    if (!categorias.length) return;
    setOpenCats(prev => {
      if (Object.keys(prev).length) return prev;
      const next = {};
      categorias.forEach((cat, idx) => { next[cat.nome] = idx < 2 || cat.atrasadas > 0 || cat.proximas > 0; });
      return next;
    });
  }, [categorias.map(c=>c.nome).join("|")]);

  const tone = item => {
    if (item.statusAutomatico === "Atrasada") return { color:C.danger, bg:"#fff1f2", badge:"bd-dang", label:"Atrasada" };
    if (item.statusAutomatico === "Proxima") return { color:C.warning, bg:"#fffbeb", badge:"bd-pend", label:"Próxima" };
    return { color:C.success, bg:"#ecfdf5", badge:"bd-done", label:"Em dia" };
  };

  async function save() {
    try { await api.post("/manutencoes", form); toast("Manutenção criada!","ok"); setShow(false); reload(); reloadPlano(); }
    catch(e){ toast(e.message,"err"); }
  }
  async function updStatus(id, status) {
    try { await api.patch(`/manutencoes/${id}`, { status }); toast("Atualizado!","ok"); reload(); reloadPlano(); }
    catch(e){ toast(e.message,"err"); }
  }

  return (
    <div className="page">
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14,marginBottom:22}}>
        <div>
          <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:700}}>Plano de Manutenção</h1>
          <p style={{fontSize:13,color:C.muted,marginTop:3}}>Controle preventivo por categoria, status automático e alertas do condomínio ativo.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>setShow(true)}><Ic n="plus" s={14} /> Nova avulsa</button>
      </div>

      {loadingPlano ? <Spinner /> : (
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:13,marginBottom:18}}>
            {[
              {l:"Total",v:resumo.total,c:C.primary,n:"wrench"},
              {l:"Em dia",v:resumo.emDia,c:C.success,n:"check"},
              {l:"Próximas",v:resumo.proximas,c:C.warning,n:"cal"},
              {l:"Atrasadas",v:resumo.atrasadas,c:C.danger,n:"alert"},
            ].map(card=>(
              <div key={card.l} className="stat" style={{borderTop:`3px solid ${card.c}`,display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}>
                <div>
                  <div className="stat-n" style={{color:card.c}}>{card.v}</div>
                  <div className="stat-l">{card.l}</div>
                </div>
                <div style={{width:38,height:38,borderRadius:11,background:`${card.c}18`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Ic n={card.n} s={18} c={card.c} />
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{padding:18,marginBottom:18,display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.primary,textTransform:"uppercase",letterSpacing:.5}}>Alertas automáticos</div>
              <p style={{fontSize:13,color:C.muted,marginTop:4}}>
                {planoData?.alertas?.length
                  ? `${planoData.alertas.length} item(ns) precisam de atenção. Notificações geradas: ${planoData.notificacoes?.geradas || 0}.`
                  : "Nenhum item crítico vencendo no momento."}
              </p>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <span className="badge bd-dang">{resumo.criticas || 0} críticas</span>
              <span className="badge bd-info">{fmt.money(resumo.valorInvestido)} investidos</span>
            </div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:24}}>
            {categorias.map(cat => {
              const isOpen = openCats[cat.nome];
              return (
                <section key={cat.nome} style={{border:`1px solid ${C.border}`,borderRadius:16,background:"#fff",overflow:"hidden"}}>
                  <button onClick={()=>setOpenCats(p=>({...p,[cat.nome]:!p[cat.nome]}))} style={{width:"100%",border:"none",background:"#fff",cursor:"pointer",padding:"16px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,textAlign:"left"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
                      <div style={{width:34,height:34,borderRadius:10,background:"#eef6ff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <Ic n="wrench" s={16} c={C.primary} />
                      </div>
                      <div style={{minWidth:0}}>
                        <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{cat.nome}</h3>
                        <div style={{fontSize:12,color:C.muted,marginTop:3}}>{cat.total} item(ns) no plano</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",justifyContent:"flex-end"}}>
                      {cat.atrasadas > 0 && <span className="badge bd-dang">{cat.atrasadas} atrasada(s)</span>}
                      {cat.proximas > 0 && <span className="badge bd-pend">{cat.proximas} próxima(s)</span>}
                      {cat.criticas > 0 && <span className="badge bd-info">{cat.criticas} crítica(s)</span>}
                      <span style={{transform:`rotate(${isOpen?90:0}deg)`,transition:"transform .18s",display:"inline-flex"}}><Ic n="chev" s={16} c={C.muted} /></span>
                    </div>
                  </button>

                  {isOpen && (
                    <div style={{padding:"0 18px 18px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12}}>
                      {cat.itens.map(item => {
                        const t = tone(item);
                        return (
                          <article key={item.id} className="card" style={{padding:15,borderLeft:`4px solid ${t.color}`,background:t.bg}}>
                            <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start",marginBottom:10}}>
                              <div style={{minWidth:0}}>
                                <h4 style={{fontSize:14,fontWeight:700,lineHeight:1.3}}>{item.nome}</h4>
                                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
                                  <span className={`badge ${t.badge}`}>{t.label}</span>
                                  <span className={`badge ${item.classificacao==="Critica"?"bd-dang":item.classificacao==="Importante"?"bd-pend":"bd-done"}`}>{item.classificacao==="Critica"?"Crítica":item.classificacao}</span>
                                  <span className="badge bd-gray">{item.origem==="PLANO"?"Plano":"Avulsa"}</span>
                                </div>
                              </div>
                              <div style={{fontSize:18,fontWeight:800,color:t.color,flexShrink:0}}>{item.diasRestantes ?? "-"}</div>
                            </div>

                            <p style={{fontSize:12,color:C.text,lineHeight:1.45,marginBottom:12}}>{item.atividade}</p>

                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                              <div><div style={{fontSize:11,color:C.muted}}>Periodicidade</div><strong style={{fontSize:12}}>{item.periodicidade}</strong></div>
                              <div><div style={{fontSize:11,color:C.muted}}>Responsável</div><strong style={{fontSize:12}}>{item.responsavel}</strong></div>
                              <div><div style={{fontSize:11,color:C.muted}}>Última execução</div><strong style={{fontSize:12}}>{fmt.date(item.dataUltimaExecucao)}</strong></div>
                              <div><div style={{fontSize:11,color:C.muted}}>Próxima execução</div><strong style={{fontSize:12,color:t.color}}>{fmt.date(item.dataProximaExecucao)}</strong></div>
                            </div>

                            <div style={{borderTop:"1px solid rgba(15,76,129,.1)",paddingTop:10,display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}>
                              <span style={{fontSize:11,color:C.muted,lineHeight:1.35}}>Fonte: {item.fonteNormativa}</span>
                              <span className="badge bd-info">{item.avisoAntecipado} dias</span>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
            {!categorias.length && (
              <div className="card" style={{padding:32,textAlign:"center",color:C.muted}}>
                Nenhum item encontrado no plano do condomínio ativo. Configure o plano no Centro de Controle da Edificação.
              </div>
            )}
          </div>
        </>
      )}

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700}}>Registros de manutenção</h2>
          <p style={{fontSize:12,color:C.muted,marginTop:2}}>Lista operacional para atualizar status e registrar execuções.</p>
        </div>
      </div>
      <div className="tabs" style={{marginBottom:18}}>
        {[["all","Todas"],["PENDENTE","Pendente"],["EM_ANDAMENTO","Em andamento"],["CONCLUIDO","Concluído"]].map(([v,l])=>(
          <button key={v} className={`tab ${filter===v?"active":""}`} onClick={()=>setFilter(v)}>{l}</button>
        ))}
      </div>
      {loading ? <Spinner /> : (
        <div className="card" style={{overflow:"hidden"}}>
          <table className="table">
            <thead><tr><th>Título</th><th>Tipo</th><th>Status</th><th>Prioridade</th><th>Vencimento</th><th>Ação</th></tr></thead>
            <tbody>{manutencoes.map(m=>(
              <tr key={m.id}>
                <td style={{fontWeight:500}}>{m.titulo}<div style={{fontSize:12,color:C.muted}}>{m.responsavel||""}</div></td>
                <td style={{fontSize:13}}>{m.tipo==="PREVENTIVA"?"Preventiva":"Corretiva"}</td>
                <td><Bdg s={m.status} /></td>
                <td><span style={{fontSize:12,fontWeight:600,color:m.prioridade==="ALTA"?C.danger:m.prioridade==="MEDIA"?C.warning:C.success}}>● {m.prioridade}</span></td>
                <td style={{fontSize:13,color:m.status!=="CONCLUIDO"&&m.dataVencimento&&new Date(m.dataVencimento)<new Date()?C.danger:C.muted}}>{fmt.date(m.dataVencimento)}</td>
                <td>
                  <select style={{width:"auto",fontSize:12,padding:"5px 8px",borderRadius:7}} value={m.status} onChange={e=>updStatus(m.id,e.target.value)}>
                    <option value="PENDENTE">Pendente</option>
                    <option value="EM_ANDAMENTO">Em andamento</option>
                    <option value="CONCLUIDO">Concluído</option>
                  </select>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {!manutencoes.length && <p style={{textAlign:"center",padding:40,color:C.muted}}>Nenhuma manutenção</p>}
        </div>
      )}
      {show && (
        <Modal title="Nova manutenção avulsa" onClose={()=>setShow(false)}>
          <div className="fg"><label>Título</label><input value={form.titulo} onChange={f("titulo")} /></div>
          <div className="row2">
            <div className="fg"><label>Tipo</label><select value={form.tipo} onChange={f("tipo")}><option value="PREVENTIVA">Preventiva</option><option value="CORRETIVA">Corretiva</option></select></div>
            <div className="fg"><label>Prioridade</label><select value={form.prioridade} onChange={f("prioridade")}><option value="ALTA">Alta</option><option value="MEDIA">Média</option><option value="BAIXA">Baixa</option></select></div>
          </div>
          <div className="row2">
            <div className="fg"><label>Responsável</label><input value={form.responsavel} onChange={f("responsavel")} /></div>
            <div className="fg"><label>Vencimento</label><input type="date" value={form.dataVencimento} onChange={f("dataVencimento")} /></div>
          </div>
          <div className="fg"><label>Descrição</label><textarea rows={3} value={form.descricao} onChange={f("descricao")} /></div>
          <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShow(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={!form.titulo}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── CHAMADOS ─────────────────────────────────────────────────
function ManutPageV2({ user, toast }) {
  const activeUser = user || JSON.parse(localStorage.getItem("tnm_user") || "{}");
  const { data: condosData } = useFetch("/condominios");
  const condominios = asList(condosData);
  const defaultCondo = activeUser?.condominioId || condominios[0]?.id || "";
  const [filters, setFilters] = useState({ condominioId: defaultCondo, tipo:"", status:"", dataInicial:"", dataFinal:"" });
  const [query, setQuery] = useState(null);
  const [show, setShow] = useState(false);
  const [links, setLinks] = useState({});
  const [openingReportId, setOpeningReportId] = useState("");
  const [form, setForm] = useState({ titulo:"Elevador", local:"Bloco A", descricao:"Revisao mensal", tipo:"PREVENTIVA", prioridade:"MEDIA", responsavel:"Empresa X", dataVencimento:"2026-04-27", custo:"" });
  const { copyNow, manualCopyModal } = useSafeCopy(toast);
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  useEffect(() => {
    if (!filters.condominioId && defaultCondo) setFilters(p=>({...p,condominioId:defaultCondo}));
  }, [defaultCondo]);

  const path = query || `/manutencoes?condominioId=${encodeURIComponent(filters.condominioId || defaultCondo || "")}`;
  const { data, loading, reload } = useFetch(path, [path]);
  const manutencoes = asList(data);
  const selectedCondominioId = filters.condominioId || defaultCondo || "";

  function buildQuery(next = filters) {
    const qs = new URLSearchParams();
    if (next.condominioId) qs.set("condominioId", next.condominioId);
    if (next.tipo) qs.set("tipo", next.tipo);
    if (next.status) qs.set("status", next.status);
    if (next.dataInicial) qs.set("dataInicial", next.dataInicial);
    if (next.dataFinal) qs.set("dataFinal", next.dataFinal);
    return `/manutencoes?${qs.toString()}`;
  }

  function buscar() { setQuery(buildQuery()); }
  function limpar() {
    const clean = { condominioId: defaultCondo || "", tipo:"", status:"", dataInicial:"", dataFinal:"" };
    setFilters(clean);
    setQuery(buildQuery(clean));
  }

  async function save() {
    try { await api.post("/manutencoes", { ...form, condominioId: selectedCondominioId }); toast("Manutencao criada!","ok"); setShow(false); reload(); }
    catch(e){ toast(e.message,"err"); }
  }

  async function updStatus(id, status) {
    try { await api.patch(`/manutencoes/${id}?condominioId=${encodeURIComponent(selectedCondominioId)}`, { status }); toast("Atualizado!","ok"); reload(); }
    catch(e){ toast(e.message,"err"); }
  }

  async function ensureExecLink(m) {
    if (links[m.id]) return links[m.id];
    if (m.execucaoLink) {
      const value = { link:m.execucaoLink, qrCodeUrl:`https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(m.execucaoLink)}` };
      setLinks(p=>({...p,[m.id]:value}));
      return value;
    }
    const result = await api.post(`/manutencoes/${m.id}/execution-link?condominioId=${encodeURIComponent(selectedCondominioId)}`, {});
    setLinks(p=>({...p,[m.id]:result}));
    return result;
  }

  async function copyExecLink(m) {
    try { const result = await ensureExecLink(m); await copyNow(result.link, "Link de execucao copiado!"); }
    catch(e){ toast(e.message,"err"); }
  }

  async function openQr(m) {
    try { const result = await ensureExecLink(m); window.open(result.qrCodeUrl, "_blank"); }
    catch(e){ toast(e.message,"err"); }
  }

  async function sendExec(m) {
    try { const result = await ensureExecLink(m); await copyNow(result.link, "Link pronto para enviar. Copiado para a area de transferencia."); }
    catch(e){ toast(e.message,"err"); }
  }

  async function handleOpenReport(m) {
    setOpeningReportId(m.id);
    try {
      const report = await api.get(`/maintenance/${m.id}/report?condominioId=${encodeURIComponent(selectedCondominioId)}`);
      const target = report.reportUrl || report.fileUrl;
      if (!target) {
        toast("Nenhum relatorio foi enviado para esta manutencao.", "info");
        return;
      }
      const opened = window.open(target, "_blank", "noopener,noreferrer");
      if (!opened) toast("O navegador bloqueou a nova aba. Permita pop-ups para abrir o relatorio.", "err");
    } catch(e) {
      toast(e.message || "Nenhum relatorio foi enviado para esta manutencao.", e.message?.includes("relatorio") ? "info" : "err");
    } finally {
      setOpeningReportId("");
    }
  }

  const statusLabel = value => ({ EM_DIA:"Em dia", PROXIMA:"Proxima", ATRASADA:"Atrasada", CONCLUIDA:"Concluida" }[value] || value);

  return (
    <div className="page">
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14,marginBottom:20}}>
        <div>
          <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:700}}>Manutencoes</h1>
          <p style={{fontSize:13,color:C.muted,marginTop:3}}>Filtros por edificacao e execucao por link publico seguro.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>setShow(true)}><Ic n="plus" s={14} /> Nova avulsa</button>
      </div>

      <div className="card" style={{padding:16,marginBottom:18}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,alignItems:"end"}}>
          <div><label>Condominio</label><select value={filters.condominioId} onChange={e=>setFilters(p=>({...p,condominioId:e.target.value}))}>{condominios.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          <div><label>Tipo</label><select value={filters.tipo} onChange={e=>setFilters(p=>({...p,tipo:e.target.value}))}><option value="">Todos</option><option value="PREVENTIVA">Preventiva</option><option value="AVULSA">Avulsa</option></select></div>
          <div><label>Status</label><select value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))}><option value="">Todos</option><option value="EM_DIA">Em dia</option><option value="PROXIMA">Proxima</option><option value="ATRASADA">Atrasada</option><option value="CONCLUIDA">Concluida</option></select></div>
          <div><label>Data inicial</label><input type="date" value={filters.dataInicial} onChange={e=>setFilters(p=>({...p,dataInicial:e.target.value}))} /></div>
          <div><label>Data final</label><input type="date" value={filters.dataFinal} onChange={e=>setFilters(p=>({...p,dataFinal:e.target.value}))} /></div>
          <button className="btn btn-primary btn-sm" onClick={buscar}>Buscar</button>
          <button className="btn btn-ghost btn-sm" onClick={limpar}>Limpar filtros</button>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="card" style={{overflow:"hidden"}}>
          <table className="table">
            <thead><tr><th>Manutencao</th><th>Local</th><th>Tipo</th><th>Status</th><th>Data prevista</th><th>Responsavel</th><th>Acoes</th></tr></thead>
            <tbody>{manutencoes.map(m => {
              const local = m.inventario?.nome || m.checklist?.local || m.empresa || "-";
              return (
                <tr key={m.id}>
                  <td style={{fontWeight:600}}>{m.titulo}<div style={{fontSize:12,color:C.muted}}>{m.descricao || ""}</div></td>
                  <td style={{fontSize:13}}>{local}</td>
                  <td><span className="badge bd-info">{m.tipo === "PREVENTIVA" ? "Preventiva" : "Avulsa"}</span></td>
                  <td><Bdg s={m.status === "CONCLUIDO" ? "CONCLUIDO" : m.statusExecucao} /></td>
                  <td style={{fontSize:13,color:m.statusExecucao==="ATRASADA"?C.danger:C.muted}}>{fmt.date(m.dataVencimento)}</td>
                  <td style={{fontSize:13}}>{m.responsavel || m.empresa || "-"}</td>
                  <td><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <button className="btn btn-success btn-xs" onClick={()=>updStatus(m.id,"CONCLUIDO")}>Concluir</button>
                    <button className="btn btn-ghost btn-xs" onClick={()=>sendExec(m)}>Enviar para execucao</button>
                    <button className="btn btn-ghost btn-xs" onClick={()=>copyExecLink(m)}>Copiar link</button>
                    <button className="btn btn-ghost btn-xs" onClick={()=>openQr(m)}>QR Code</button>
                    <button className="btn btn-ghost btn-xs" onClick={()=>handleOpenReport(m)} disabled={openingReportId===m.id}>{openingReportId===m.id ? "Abrindo..." : "Abrir"}</button>
                  </div></td>
                </tr>
              );
            })}</tbody>
          </table>
          {!manutencoes.length && <p style={{textAlign:"center",padding:40,color:C.muted}}>Nenhuma manutencao encontrada para os filtros.</p>}
        </div>
      )}

      {show && (
        <Modal title="Nova manutencao" onClose={()=>setShow(false)}>
          <div className="fg"><label>Manutencao</label><input value={form.titulo} onChange={f("titulo")} /></div>
          <div className="fg"><label>Local</label><input value={form.local} onChange={f("local")} placeholder="Bloco A" /></div>
          <div className="fg"><label>Descricao</label><textarea rows={3} value={form.descricao} onChange={f("descricao")} /></div>
          <div className="row2">
            <div className="fg"><label>Tipo</label><select value={form.tipo} onChange={f("tipo")}><option value="PREVENTIVA">Preventiva</option><option value="CORRETIVA">Avulsa</option></select></div>
            <div className="fg"><label>Prioridade</label><select value={form.prioridade} onChange={f("prioridade")}><option value="ALTA">Alta</option><option value="MEDIA">Media</option><option value="BAIXA">Baixa</option></select></div>
          </div>
          <div className="row2">
            <div className="fg"><label>Responsavel</label><input value={form.responsavel} onChange={f("responsavel")} /></div>
            <div className="fg"><label>Data prevista</label><input type="date" value={form.dataVencimento} onChange={f("dataVencimento")} /></div>
          </div>
          <div className="fg"><label>Valor previsto</label><input type="number" value={form.custo} onChange={f("custo")} /></div>
          <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShow(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={!form.titulo}>Salvar</button>
          </div>
        </Modal>
      )}
      {manualCopyModal}
    </div>
  );
}

function ExecucaoManutencaoPublica({ token }) {
  const { data, loading } = useFetch(token ? `/manutencoes/execucao/${token}` : null, [token]);
  const [form, setForm] = useState({ status:"CONCLUIDO", dataExecucao:new Date().toISOString().slice(0,10), valor:"", comentarios:"", problemasEncontrados:"" });
  const [fotos, setFotos] = useState([]);
  const [notaFiscal, setNotaFiscal] = useState(null);
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  async function submit() {
    setSending(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v])=>fd.append(k, v));
      fotos.forEach(file => fd.append("fotos", file));
      if (notaFiscal) fd.append("notaFiscal", notaFiscal);
      await api.post(`/manutencoes/execucao/${token}`, fd);
      setDone(true);
    } catch(e){ alert(e.message); }
    finally { setSending(false); }
  }

  if (loading) return <div style={{maxWidth:520,margin:"0 auto",minHeight:"100vh",paddingTop:80}}><Spinner /></div>;
  if (!data) return <div style={{maxWidth:520,margin:"0 auto",minHeight:"100vh",padding:22}}><div className="card" style={{padding:22,textAlign:"center"}}>Link de execucao indisponivel.</div></div>;
  if (done) return <div style={{maxWidth:520,margin:"0 auto",minHeight:"100vh",padding:22,background:C.surface}}><div className="card" style={{padding:24,textAlign:"center"}}><h1 style={{fontFamily:"'Sora',sans-serif",fontSize:20,marginBottom:8}}>Execucao registrada</h1><p style={{fontSize:13,color:C.muted}}>A manutencao foi atualizada e o sindico foi notificado.</p></div></div>;

  return (
    <div style={{maxWidth:560,margin:"0 auto",minHeight:"100vh",background:C.surface,padding:18}}>
      <div className="card" style={{padding:20,marginBottom:14,borderTop:`4px solid ${C.primary}`}}>
        <div style={{fontSize:12,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:.8}}>Execucao de manutencao</div>
        <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:22,marginTop:6}}>{data.titulo}</h1>
        <p style={{fontSize:13,color:C.muted,marginTop:6}}>{data.descricao || "Sem descricao"}</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:14,fontSize:13}}>
          <div><strong>Local</strong><br/><span style={{color:C.muted}}>{data.local || "-"}</span></div>
          <div><strong>Responsavel</strong><br/><span style={{color:C.muted}}>{data.responsavel || "-"}</span></div>
          <div><strong>Data prevista</strong><br/><span style={{color:C.muted}}>{fmt.date(data.dataPrevista)}</span></div>
          <div><strong>Condominio</strong><br/><span style={{color:C.muted}}>{data.condominio?.nome || "-"}</span></div>
        </div>
      </div>
      <div className="card" style={{padding:20}}>
        <div className="fg"><label>Status</label><select value={form.status} onChange={f("status")}><option value="CONCLUIDO">Concluido</option><option value="NAO_REALIZADO">Nao realizado</option></select></div>
        <div className="row2">
          <div className="fg"><label>Data da execucao</label><input type="date" value={form.dataExecucao} onChange={f("dataExecucao")} /></div>
          <div className="fg"><label>Valor do servico</label><input type="number" value={form.valor} onChange={f("valor")} /></div>
        </div>
        <div className="fg"><label>Comentarios</label><textarea rows={3} value={form.comentarios} onChange={f("comentarios")} /></div>
        <div className="fg"><label>Problemas encontrados?</label><textarea rows={3} value={form.problemasEncontrados} onChange={f("problemasEncontrados")} /></div>
        <div className="fg"><label>Upload de fotos</label><input type="file" accept="image/*" multiple onChange={e=>setFotos([...e.target.files])} /></div>
        <div className="fg"><label>Nota fiscal (PDF ou imagem)</label><input type="file" accept="application/pdf,image/*" onChange={e=>setNotaFiscal(e.target.files?.[0] || null)} /></div>
        <button className="btn btn-primary" style={{width:"100%",justifyContent:"center"}} onClick={submit} disabled={sending}>{sending ? "Enviando..." : "Atualizar manutencao"}</button>
      </div>
    </div>
  );
}

function MaintenanceReportPage({ reportId, condominioId, toast }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const qs = condominioId ? `?condominioId=${encodeURIComponent(condominioId)}` : "";
        const data = await api.get(`/maintenance/${reportId}/report${qs}`);
        if (alive) setReport(data);
      } catch(e) {
        if (alive) setError(e.message || "Nenhum relatorio foi enviado para esta manutencao.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [reportId, condominioId]);

  function voltar() {
    if (window.history.length > 1) window.history.back();
    else window.location.href = "/";
  }

  function imprimir() {
    window.print();
  }

  function baixarPdf() {
    toast("Na janela de impressao, escolha salvar como PDF.", "info");
    setTimeout(() => window.print(), 80);
  }

  function abrirNotaFiscal() {
    const url = report?.notaFiscal?.fileUrl || report?.notaFiscal?.url;
    if (!url) return toast("Nenhuma nota fiscal foi anexada a esta manutencao.", "info");
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const fotoCard = (file, idx) => (
    <a key={`${file.fileUrl || file.url}-${idx}`} href={file.fileUrl || file.url} target="_blank" rel="noreferrer" style={{display:"block",border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",background:"#F2FAF1"}}>
      <img src={file.fileUrl || file.url} alt={file.fileName || "Foto da manutencao"} style={{width:"100%",height:130,objectFit:"cover",display:"block"}} />
      <div style={{fontSize:11,color:C.muted,padding:8,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{file.fileName || "foto"}</div>
    </a>
  );

  if (loading) return <div className="report-page" style={{minHeight:"100vh",padding:24,background:C.surface}}><Spinner /></div>;
  if (error) return (
    <div className="report-page" style={{minHeight:"100vh",padding:24,background:C.surface}}>
      <div className="card" style={{maxWidth:720,margin:"40px auto",padding:24,textAlign:"center"}}>
        <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:20,marginBottom:8}}>Relatorio da Manutencao</h1>
        <p style={{fontSize:14,color:C.muted,marginBottom:18}}>{error}</p>
        <button className="btn btn-primary no-print" onClick={voltar}>Voltar</button>
      </div>
    </div>
  );

  const historico = report?.historicoExecucao || [];
  const fotosAntes = report?.fotosAntes || [];
  const fotosDepois = report?.fotosDepois || [];
  const reportLogo = assetUrl(report?.logoUrl || report?.condominio?.logoUrl || report?.condominio?.logo);

  return (
    <div className="report-page" style={{minHeight:"100vh",background:C.surface,padding:24}}>
      <div style={{maxWidth:980,margin:"0 auto"}}>
        <div className="no-print" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
          <button className="btn btn-ghost btn-sm" onClick={voltar}>Voltar</button>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button className="btn btn-ghost btn-sm" onClick={imprimir}>Imprimir</button>
            <button className="btn btn-ghost btn-sm" onClick={baixarPdf}>Baixar PDF</button>
            <button className="btn btn-primary btn-sm" onClick={abrirNotaFiscal}>Abrir nota fiscal</button>
          </div>
        </div>

        <div className="card" style={{padding:24,borderTop:`4px solid ${C.primary}`}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",marginBottom:20,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:14,minWidth:0}}>
              <div style={{width:72,height:72,borderRadius:14,border:`1px solid ${C.border}`,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                {reportLogo
                  ? <img src={reportLogo} alt={`Logo ${report.condominio?.nome || "Condominio"}`} style={{width:"100%",height:"100%",objectFit:"contain",padding:7}} />
                  : <span style={{fontSize:11,fontWeight:800,color:C.primary,textAlign:"center",padding:6}}>{report.condominio?.nome || "Condominio"}</span>}
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:12,color:C.muted,fontWeight:800,textTransform:"uppercase",letterSpacing:.8}}>Relatorio da Manutencao</div>
                <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:26,marginTop:6}}>{report.titulo}</h1>
                <p style={{fontSize:13,color:C.muted,marginTop:5}}>{report.descricao || "Sem descricao cadastrada."}</p>
              </div>
            </div>
            <Bdg s={report.status} />
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,marginBottom:22}}>
            {[
              ["Condominio", report.condominio?.nome || "-"],
              ["Local", report.local || "-"],
              ["Data prevista", fmt.date(report.dataPrevista)],
              ["Data executada", fmt.date(report.dataExecutada)],
              ["Prestador/responsavel", report.prestador || "-"],
              ["Valor informado", fmt.money(report.valorInformado || 0)],
            ].map(([label, value]) => (
              <div key={label} style={{background:"#F2FAF1",border:`1px solid ${C.border}`,borderRadius:12,padding:12}}>
                <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>{label}</div>
                <div style={{fontSize:14,fontWeight:700}}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:14,marginBottom:22}}>
            <div>
              <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:15,marginBottom:8}}>Comentarios do prestador</h2>
              <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:14,minHeight:90,fontSize:13,lineHeight:1.6,color:C.text}}>
                {report.comentariosPrestador || "Nenhum comentario informado."}
              </div>
            </div>
            <div>
              <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:15,marginBottom:8}}>Problemas encontrados</h2>
              <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:14,minHeight:90,fontSize:13,lineHeight:1.6,color:C.text}}>
                {report.problemasEncontrados || "Nenhum problema informado."}
              </div>
            </div>
          </div>

          <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:15,marginBottom:10}}>Fotos antes</h2>
          {fotosAntes.length ? <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,marginBottom:20}}>{fotosAntes.map(fotoCard)}</div> : <p style={{fontSize:13,color:C.muted,marginBottom:20}}>Nenhuma foto anterior vinculada.</p>}

          <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:15,marginBottom:10}}>Fotos depois</h2>
          {fotosDepois.length ? <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,marginBottom:20}}>{fotosDepois.map(fotoCard)}</div> : <p style={{fontSize:13,color:C.muted,marginBottom:20}}>Nenhuma foto enviada pelo prestador.</p>}

          <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:15,marginBottom:10}}>Nota fiscal anexada</h2>
          <div style={{border:`1px solid ${C.border}`,borderRadius:12,padding:14,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:22}}>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>{report.notaFiscal?.fileName || "Nenhuma nota fiscal anexada"}</div>
              <div style={{fontSize:12,color:C.muted}}>{report.notaFiscal?.mimeType || report.notaFiscal?.fileType || "Documento nao enviado"}</div>
            </div>
            <button className="btn btn-ghost btn-sm no-print" onClick={abrirNotaFiscal} disabled={!report.notaFiscal}>Abrir nota fiscal</button>
          </div>

          <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:15,marginBottom:10}}>Historico da execucao</h2>
          <div style={{display:"grid",gap:10}}>
            {historico.map((h, idx) => (
              <div key={h.id || idx} style={{border:`1px solid ${C.border}`,borderRadius:12,padding:12,background:"#fff"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:5}}>
                  <strong style={{fontSize:13}}>{h.status || "Execucao registrada"}</strong>
                  <span style={{fontSize:12,color:C.muted}}>{fmt.date(h.dataExecucao || h.createdAt)}</span>
                </div>
                <div style={{fontSize:13,color:C.muted,lineHeight:1.5}}>
                  {h.comentarios || "Sem comentario"}{h.valor ? ` · ${fmt.money(h.valor)}` : ""}
                </div>
              </div>
            ))}
            {!historico.length && <p style={{fontSize:13,color:C.muted}}>Historico indisponivel.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChamadosPage({ toast }) {
  const chamadosFilterDefault = { condominioId:"all", categoria:"all", status:"all", de:"", ate:"" };
  const [draft, setDraft] = useState(chamadosFilterDefault);
  const [applied, setApplied] = useState(chamadosFilterDefault);
  const query = dashboardQuery(applied);
  const { data, loading, reload } = useFetch(`/chamados?${query}`, [query]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ titulo:"", descricao:"", categoria:"MANUTENCAO", prioridade:"MEDIA" });
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const filterData = data?.filters || {};
  const condominios = filterData.condominios || [];
  const categoriaOptions = [
    { value:"all", label:"Todas as categorias" },
    { value:"MANUTENCAO", label:"Manutenção" },
    { value:"RECLAMACAO", label:"Reclamações" },
    { value:"SUGESTAO", label:"Sugestões" },
  ];
  const statusOptions = [
    { value:"all", label:"Todos os status" },
    { value:"ABERTO", label:"Aberto" },
    { value:"EM_ANALISE", label:"Em análise" },
    { value:"CONCLUIDO", label:"Concluído" },
  ];
  const changeFilter = (key, value) => setDraft(prev => ({ ...prev, [key]: value }));

  async function save() {
    try { await api.post("/chamados", form); toast("Chamado criado!", "ok"); setShow(false); reload(); }
    catch(e){ toast(e.message, "err"); }
  }

  async function upd(id, status) {
    try { await api.patch(`/chamados/${id}`, { status }); toast("Chamado atualizado!", "ok"); reload(); }
    catch(e){ toast(e.message, "err"); }
  }

  function buscar(e) {
    e.preventDefault();
    setApplied(draft);
  }

  function limparFiltros() {
    setDraft(chamadosFilterDefault);
    setApplied(chamadosFilterDefault);
  }

  const chamados = asList(data);
  const cnt = s => chamados.filter(c=>c.status===s).length;
  const filterLabel = applied.condominioId === "all"
    ? "Todas as edificações"
    : condominios.find(c=>c.id===applied.condominioId)?.nome || "Edificação selecionada";

  return (
    <div className="page">
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14,marginBottom:22,flexWrap:"wrap"}}>
        <div>
          <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:24,fontWeight:900,color:C.primary}}>Central de Chamados</h1>
          <p style={{fontSize:13,color:C.muted,marginTop:4}}>Filtre por edificação, reclamações, manutenções, status e período. Visão atual: {filterLabel}.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>setShow(true)}><Ic n="plus" s={14} /> Novo</button>
      </div>

      <form onSubmit={buscar} className="card" style={{padding:16,marginBottom:18}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,alignItems:"end"}}>
          <div>
            <label>Edificação</label>
            <select value={draft.condominioId} onChange={e=>changeFilter("condominioId", e.target.value)}>
              <option value="all">Todas as edificações</option>
              {condominios.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label>Categoria</label>
            <select value={draft.categoria} onChange={e=>changeFilter("categoria", e.target.value)}>
              {categoriaOptions.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label>Status</label>
            <select value={draft.status} onChange={e=>changeFilter("status", e.target.value)}>
              {statusOptions.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label>Data inicial</label>
            <input type="date" value={draft.de} onChange={e=>changeFilter("de", e.target.value)} />
          </div>
          <div>
            <label>Data final</label>
            <input type="date" value={draft.ate} onChange={e=>changeFilter("ate", e.target.value)} />
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-primary" type="submit" style={{flex:1,justifyContent:"center"}} disabled={loading}>Buscar</button>
            <button className="btn btn-ghost" type="button" onClick={limparFiltros}>Limpar</button>
          </div>
        </div>
      </form>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:13,marginBottom:20}}>
        {[{l:"Abertos",c:C.accent,s:"ABERTO"},{l:"Em análise",c:C.warning,s:"EM_ANALISE"},{l:"Concluídos",c:C.success,s:"CONCLUIDO"}].map(x=>(
          <div key={x.s} className="stat" style={{borderTop:`3px solid ${x.c}`}}>
            <div className="stat-n" style={{color:x.c}}>{cnt(x.s)}</div>
            <div className="stat-l">{x.l}</div>
          </div>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <div className="card" style={{overflow:"hidden"}}>
          <table className="table">
            <thead><tr><th>Título</th><th>Edificação</th><th>Categoria</th><th>Morador</th><th>Status</th><th>Data</th><th>Ação</th></tr></thead>
            <tbody>{chamados.map(c=>(
              <tr key={c.id}>
                <td style={{fontWeight:500}}>{c.titulo}</td>
                <td style={{fontSize:13,color:C.muted}}>{c.condominio?.nome || "-"}</td>
                <td><span className="badge bd-info">{c.categoria}</span></td>
                <td style={{fontSize:13}}>{c.morador?.nome} {c.morador?.unidade ? ` - ${c.morador.unidade}` : ""}</td>
                <td><Bdg s={c.status} /></td>
                <td style={{fontSize:13,color:C.muted}}>{fmt.date(c.createdAt)}</td>
                <td>
                  <select style={{width:"auto",fontSize:12,padding:"5px 8px",borderRadius:7}} value={c.status} onChange={e=>upd(c.id,e.target.value)}>
                    <option value="ABERTO">Aberto</option>
                    <option value="EM_ANALISE">Em análise</option>
                    <option value="CONCLUIDO">Concluído</option>
                  </select>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {!chamados.length && <p style={{textAlign:"center",padding:40,color:C.muted}}>Nenhum chamado para os filtros aplicados.</p>}
        </div>
      )}

      {show && (
        <Modal title="Novo Chamado" onClose={()=>setShow(false)}>
          <div className="fg"><label>Título</label><input value={form.titulo} onChange={f("titulo")} /></div>
          <div className="row2">
            <div className="fg"><label>Categoria</label><select value={form.categoria} onChange={f("categoria")}><option value="MANUTENCAO">Manutenção</option><option value="RECLAMACAO">Reclamação</option><option value="SUGESTAO">Sugestão</option></select></div>
            <div className="fg"><label>Prioridade</label><select value={form.prioridade} onChange={f("prioridade")}><option value="ALTA">Alta</option><option value="MEDIA">Média</option><option value="BAIXA">Baixa</option></select></div>
          </div>
          <div className="fg"><label>Descrição</label><textarea rows={4} value={form.descricao} onChange={f("descricao")} /></div>
          <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShow(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={!form.titulo}>Enviar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DocsPage({ toast }) {
  const [q, setQ] = useState("");
  const { data, loading, reload } = useFetch("/documentos");
  const [showUp, setShowUp] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [upForm, setUpForm] = useState({ nome:"", pasta:"Geral", acesso:"PUBLICO" });
  const [file, setFile] = useState(null);
  const [aiMsgs, setAiMsgs] = useState([{ r:"ai", t:"Olá! Posso responder perguntas sobre os documentos. O que deseja saber?" }]);
  const [aiIn, setAiIn] = useState("");
  const [aiLoad, setAiLoad] = useState(false);

  const documentos = asList(data);
  const filtered = documentos.filter(d=>!q||d.nome.toLowerCase().includes(q.toLowerCase()));

  async function upload() {
    if (!file) return;
    const fd = new FormData();
    fd.append("arquivo", file);
    fd.append("nome", upForm.nome||file.name);
    fd.append("pasta", upForm.pasta);
    fd.append("acesso", upForm.acesso);
    try { await api.post("/documentos", fd); toast("Enviado!","ok"); setShowUp(false); reload(); }
    catch(e){ toast(e.message,"err"); }
  }

  async function sendAI() {
    if (!aiIn.trim()) return;
    const q2 = aiIn; setAiIn("");
    setAiMsgs(p=>[...p,{r:"u",t:q2}]);
    setAiLoad(true);
    try {
      const d = await api.post("/ia/chat", { message:q2, canal:"docs", history:toChatHistory(aiMsgs) });
      setAiMsgs(p=>[...p,{r:"ai",t:d.answer||"Nao consegui processar."}]);
    } catch { setAiMsgs(p=>[...p,{r:"ai",t:"Erro ao conectar com IA."}]); }
    setAiLoad(false);
  }

  const fmtSize = b => b>1e6?(b/1e6).toFixed(1)+" MB":Math.round(b/1000)+" KB";

  return (
    <div className="page">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
        <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:700}}>Central de Documentos</h1>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowAI(true)} style={{borderColor:"#7c3aed",color:"#7c3aed"}}><Ic n="ai" s={14} c="#7c3aed" /> IA</button>
          <button className="btn btn-primary btn-sm" onClick={()=>setShowUp(true)}><Ic n="up" s={14} /> Upload</button>
        </div>
      </div>
      <div style={{position:"relative",marginBottom:15}}>
        <div style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}><Ic n="eye" s={15} c={C.muted} /></div>
        <input placeholder="Buscar documentos..." value={q} onChange={e=>setQ(e.target.value)} style={{paddingLeft:36}} />
      </div>
      {loading ? <Spinner /> : (
        <div className="card" style={{overflow:"hidden"}}>
          <table className="table">
            <thead><tr><th>Nome</th><th>Pasta</th><th>Acesso</th><th>Tamanho</th><th>Data</th><th>Ação</th></tr></thead>
            <tbody>{filtered.map(d=>(
              <tr key={d.id}>
                <td><div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:30,height:30,borderRadius:7,background:d.tipo==="PDF"?"#fee2e2":"#dcfce7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:d.tipo==="PDF"?"#dc2626":"#16a34a"}}>{d.tipo}</div>
                  <span style={{fontWeight:500,fontSize:14}}>{d.nome}</span>
                </div></td>
                <td><span className="badge bd-info">{d.pasta}</span></td>
                <td><Bdg s={d.acesso==="PUBLICO"?"Ativo":"Inativo"} /></td>
                <td style={{fontSize:13,color:C.muted}}>{fmtSize(d.tamanho||0)}</td>
                <td style={{fontSize:13,color:C.muted}}>{fmt.date(d.createdAt)}</td>
                <td><a href={`https://ta-na-mao-1.onrender.com${d.url}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs"><Ic n="dl" s={13} /></a></td>
              </tr>
            ))}</tbody>
          </table>
          {!filtered.length && <p style={{textAlign:"center",padding:36,color:C.muted}}>Nenhum documento</p>}
        </div>
      )}
      {showUp && (
        <Modal title="Upload de Documento" onClose={()=>setShowUp(false)}>
          <div className="fg">
            <label>Arquivo</label>
            <div style={{border:`2px dashed ${C.border}`,borderRadius:10,padding:20,textAlign:"center",cursor:"pointer"}} onClick={()=>document.getElementById("fi").click()}>
              <Ic n="up" s={22} c={C.muted} />
              <p style={{marginTop:7,fontSize:13,color:C.muted}}>{file?file.name:"Clique para selecionar"}</p>
              <input id="fi" type="file" style={{display:"none"}} onChange={e=>setFile(e.target.files[0])} />
            </div>
          </div>
          <div className="row2">
            <div className="fg"><label>Pasta</label><input value={upForm.pasta} onChange={e=>setUpForm(p=>({...p,pasta:e.target.value}))} /></div>
            <div className="fg"><label>Acesso</label><select value={upForm.acesso} onChange={e=>setUpForm(p=>({...p,acesso:e.target.value}))}><option value="PUBLICO">Público</option><option value="PRIVADO">Privado</option></select></div>
          </div>
          <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShowUp(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={upload} disabled={!file}>Enviar</button>
          </div>
        </Modal>
      )}
      {showAI && (
        <Modal title="🤖 Assistente de Documentos" onClose={()=>setShowAI(false)}>
          <div style={{height:280,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,marginBottom:14,padding:"4px 0"}}>
            {aiMsgs.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.r==="u"?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"84%",padding:"12px 16px",borderRadius:m.r==="ai"?"14px 14px 14px 4px":"14px 14px 4px 14px",background:m.r==="ai"?"linear-gradient(135deg,#003B24,#0F6B3A)":"#22C55E",color:"#fff",fontSize:13,lineHeight:1.55}}>{m.t}</div>
              </div>
            ))}
            {aiLoad && <div style={{maxWidth:60,padding:"10px 14px",borderRadius:14,background:"#DDE7DE",display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#94a3b8",animation:`spin ${.8+i*.2}s linear infinite`}} />)}</div>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <input value={aiIn} onChange={e=>setAiIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendAI()} placeholder="Ex: Qual é o horário de silêncio?" />
            <button className="btn btn-primary" onClick={sendAI}><Ic n="send" s={15} /></button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── VOZ DO MORADOR ───────────────────────────────────────────
function VozPage({ toast }) {
  const defaultFilters = { condominioId:"all", tipo:"all", status:"all", de:"", ate:"", sort:"em_alta", destaque:"all", visivelPortal:"all", q:"" };
  const [draft, setDraft] = useState(defaultFilters);
  const [applied, setApplied] = useState(defaultFilters);
  const [tab, setTab] = useState("sugestoes");
  const [show, setShow] = useState(false);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(null);
  const [aiQuestion, setAiQuestion] = useState("Resumo das principais sugestoes da semana");
  const [aiResult, setAiResult] = useState(null);
  const [form, setForm] = useState({ titulo:"", descricao:"", tipo:"SUGESTAO_MELHORIA", categoria:"Areas comuns", condominioId:"", visivelPortal:true, destaqueSemana:false, fixado:false });
  const query = dashboardQuery(applied);
  const { data, loading, reload } = useFetch(`/voz?${query}`, [query]);

  const vozes = asList(data);
  const filters = data?.filters || {};
  const resumo = data?.resumo || {};
  const rankings = data?.rankings || {};
  const condominios = filters.condominios || [];
  const tipoOptions = filters.tipos || [];
  const statusOptions = filters.status || [];
  const selectedLabel = applied.condominioId === "all" ? "Todas as edificacoes" : condominios.find(c=>c.id===applied.condominioId)?.nome || "Edificacao selecionada";

  const tabMeta = {
    sugestoes: { label:"Sugestoes", tipo:"SUGESTAO_MELHORIA" },
    assembleia: { label:"Assembleia", tipo:"PAUTA_ASSEMBLEIA" },
    avaliacoes: { label:"Avaliacoes da gestao", tipo:"AVALIACAO_GESTAO" },
    parceiros: { label:"Parceiros", tipo:"PARCEIRO" },
    destaques: { label:"Destaques da semana", destaque:true },
    config: { label:"Configuracoes" },
  };

  const tipoLabel = {
    SUGESTAO_MELHORIA:"Sugestao de melhoria",
    PAUTA_ASSEMBLEIA:"Pauta para assembleia",
    PARCEIRO:"Parceiro",
    AVALIACAO_GESTAO:"Avaliacao da gestao",
  };
  const statusLabel = {
    ABERTA:"Aberta",
    EM_ANALISE:"Em analise",
    APROVADA:"Aprovada",
    REJEITADA:"Rejeitada",
    TRANSFORMADA_PAUTA:"Transformada em pauta",
    TRANSFORMADA_CHAMADO:"Transformada em chamado",
    ENCERRADA:"Encerrada",
  };
  const statusColor = {
    ABERTA:C.accent,
    EM_ANALISE:C.warning,
    APROVADA:C.success,
    REJEITADA:C.danger,
    TRANSFORMADA_PAUTA:"#2563eb",
    TRANSFORMADA_CHAMADO:"#7c3aed",
    ENCERRADA:C.muted,
  };

  function setF(key, value) { setDraft(prev => ({ ...prev, [key]: value })); }
  function apply(e) { e?.preventDefault(); setApplied(draft); }
  function clear() { setDraft(defaultFilters); setApplied(defaultFilters); }

  function openCreate(tipo = "SUGESTAO_MELHORIA") {
    setForm({ titulo:"", descricao:"", tipo, categoria:"Areas comuns", condominioId:applied.condominioId === "all" ? "" : applied.condominioId, visivelPortal:tipo !== "AVALIACAO_GESTAO", destaqueSemana:false, fixado:false });
    setFile(null);
    setShow(true);
  }

  async function save() {
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k, v));
      if (file) fd.append("anexos", file);
      await api.post("/voz", fd);
      toast("Publicacao criada na Voz do Morador!", "ok");
      setShow(false);
      reload();
    } catch(e) { toast(e.message, "err"); }
  }

  async function updateVoz(id, patch, ok = "Atualizado") {
    try {
      setBusy(id);
      await api.patch(`/voz/${id}`, patch);
      toast(ok, "ok");
      reload();
    } catch(e) { toast(e.message, "err"); }
    finally { setBusy(null); }
  }

  async function votar(id) {
    try { await api.post(`/voz/${id}/votar`); reload(); }
    catch(e){ toast(e.message, "err"); }
  }

  async function comentar(id) {
    const texto = window.prompt("Comentario do sindico ou retorno ao morador:");
    if (!texto) return;
    try { await api.post(`/voz/${id}/comentar`, { texto }); toast("Comentario registrado", "ok"); reload(); }
    catch(e){ toast(e.message, "err"); }
  }

  async function transformarPauta(id) {
    try { setBusy(id); await api.post(`/voz/${id}/transformar-pauta`); toast("Sugestao transformada em pauta", "ok"); reload(); }
    catch(e){ toast(e.message, "err"); }
    finally { setBusy(null); }
  }

  async function transformarChamado(id) {
    try { setBusy(id); await api.post(`/voz/${id}/transformar-chamado`); toast("Sugestao transformada em chamado", "ok"); reload(); }
    catch(e){ toast(e.message, "err"); }
    finally { setBusy(null); }
  }

  async function askAi(question = aiQuestion) {
    try {
      setBusy("ia");
      const result = await api.post("/voz/ia", { message: question, condominioId: applied.condominioId, tipo: applied.tipo });
      setAiResult(result);
    } catch(e) { toast(e.message, "err"); }
    finally { setBusy(null); }
  }

  const scopedByTab = vozes.filter(item => {
    const meta = tabMeta[tab];
    if (!meta || tab === "config") return true;
    if (meta.destaque) return item.destaqueSemana;
    return item.tipo === meta.tipo;
  });

  const portalItems = vozes.filter(v => v.visivelPortal && v.tipo !== "AVALIACAO_GESTAO").length;
  const internalItems = vozes.filter(v => v.tipo === "AVALIACAO_GESTAO" || !v.visivelPortal).length;

  const Stat = ({ label, value, color, icon }) => (
    <div className="stat" style={{borderTop:`3px solid ${color}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{width:36,height:36,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",background:`${color}18`,color}}><Ic n={icon} s={18} c={color} /></span>
        <div><div className="stat-n" style={{color}}>{value || 0}</div><div className="stat-l">{label}</div></div>
      </div>
    </div>
  );

  const VozBadge = ({ value }) => <span className="badge" style={{background:`${statusColor[value] || C.muted}18`,color:statusColor[value] || C.muted,border:`1px solid ${statusColor[value] || C.muted}33`}}>{statusLabel[value] || value}</span>;

  const RankingList = ({ title, items = [] }) => (
    <div className="card" style={{padding:16}}>
      <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:800,marginBottom:12}}>{title}</h3>
      <div style={{display:"grid",gap:9}}>
        {items.slice(0,5).map((item, idx)=>(
          <div key={`${title}-${item.id}`} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:idx<Math.min(items.length,5)-1?`1px solid ${C.border}`:"none"}}>
            <span style={{width:26,height:26,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",background:idx<3?"#E8FBEA":"#F2F6F1",color:C.primary,fontWeight:900,fontSize:12}}>{idx+1}</span>
            <div style={{flex:1,minWidth:0}}><strong style={{fontSize:12,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"block"}}>{item.titulo}</strong><span style={{fontSize:11,color:C.muted}}>{item.totalVotos} votos · {item.totalComentarios} comentarios</span></div>
          </div>
        ))}
        {!items.length && <p style={{fontSize:12,color:C.muted}}>Sem dados para este ranking.</p>}
      </div>
    </div>
  );

  const VozCard = ({ item }) => (
    <div className="card fadeIn" style={{padding:18,borderLeft:item.destaqueSemana?`4px solid ${C.neon}`:`1px solid ${C.border}`}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
        <div style={{display:"flex",gap:12,minWidth:0}}>
          <div style={{width:46,height:46,borderRadius:15,background:item.fixado ? `linear-gradient(135deg,${C.primary},${C.accent})` : "#E8FBEA",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Ic n={item.tipo === "PAUTA_ASSEMBLEIA" ? "doc" : item.tipo === "PARCEIRO" ? "users" : item.tipo === "AVALIACAO_GESTAO" ? "shield" : "thumb"} s={22} c={item.fixado?"#fff":C.primary} />
          </div>
          <div style={{minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:5}}>
              <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:850,margin:0}}>{item.titulo}</h3>
              {item.destaqueSemana && <span className="badge bd-pend">Destaque</span>}
              {item.fixado && <span className="badge bd-info">Fixado</span>}
              {!item.visivelPortal && <span className="badge bd-gray">Interno</span>}
            </div>
            <p style={{fontSize:12,color:C.muted,lineHeight:1.45,marginBottom:9}}>{item.descricao || "Sem descricao"}</p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <span className="badge bd-info">{tipoLabel[item.tipo] || item.tipo}</span>
              <VozBadge value={item.status} />
              <span style={{fontSize:12,color:C.muted}}>{item.condominio?.nome || "Condominio"}</span>
              <span style={{fontSize:12,color:C.muted}}>{fmt.date(item.createdAt)}</span>
            </div>
          </div>
        </div>
        <button onClick={()=>votar(item.id)} className="btn btn-ghost btn-xs" style={{whiteSpace:"nowrap"}} disabled={busy===item.id}><Ic n="thumb" s={13} /> {item.totalVotos || 0}</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginTop:14}}>
        <div style={{fontSize:12,color:C.muted}}>Autor<br/><strong style={{color:C.text}}>{item.autor?.nome || "Morador"}</strong></div>
        <div style={{fontSize:12,color:C.muted}}>Categoria<br/><strong style={{color:C.text}}>{item.categoria || "Geral"}</strong></div>
        <div style={{fontSize:12,color:C.muted}}>Comentarios<br/><strong style={{color:C.text}}>{item.totalComentarios || 0}</strong></div>
        <div style={{fontSize:12,color:C.muted}}>Portal<br/><strong style={{color:item.visivelPortal?C.success:C.muted}}>{item.visivelPortal ? "Visivel" : "Oculto"}</strong></div>
      </div>

      {item.comentarios?.length > 0 && (
        <div style={{marginTop:13,background:"#F7FAF6",borderRadius:12,padding:10,display:"grid",gap:6}}>
          {item.comentarios.slice(0,2).map(c=><div key={c.id} style={{fontSize:12,color:C.muted}}><strong style={{color:C.text}}>{c.autor?.nome || "Usuario"}:</strong> {c.texto}</div>)}
        </div>
      )}

      <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end",marginTop:14}}>
        <button className="btn btn-ghost btn-xs" onClick={()=>comentar(item.id)}>Comentar</button>
        <button className="btn btn-ghost btn-xs" onClick={()=>updateVoz(item.id,{visivelPortal:!item.visivelPortal}, item.visivelPortal?"Oculto do portal":"Visivel no portal")}>{item.visivelPortal?"Ocultar portal":"Mostrar portal"}</button>
        <button className="btn btn-ghost btn-xs" onClick={()=>updateVoz(item.id,{destaqueSemana:!item.destaqueSemana}, item.destaqueSemana?"Removido dos destaques":"Marcado como destaque")}>{item.destaqueSemana?"Remover destaque":"Destacar"}</button>
        <button className="btn btn-ghost btn-xs" onClick={()=>updateVoz(item.id,{fixado:!item.fixado})}>{item.fixado?"Desfixar":"Fixar"}</button>
        <button className="btn btn-ghost btn-xs" onClick={()=>updateVoz(item.id,{status:"EM_ANALISE"})}>Em analise</button>
        <button className="btn btn-ghost btn-xs" onClick={()=>updateVoz(item.id,{status:"APROVADA"})}>Aprovar</button>
        <button className="btn btn-ghost btn-xs" onClick={()=>updateVoz(item.id,{status:"REJEITADA"})}>Rejeitar</button>
        <button className="btn btn-primary btn-xs" onClick={()=>transformarPauta(item.id)} disabled={busy===item.id}>Virar pauta</button>
        <button className="btn btn-ghost btn-xs" onClick={()=>transformarChamado(item.id)} disabled={busy===item.id}>Virar chamado</button>
        <button className="btn btn-ghost btn-xs" onClick={()=>updateVoz(item.id,{status:"ENCERRADA"})}>Encerrar</button>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap",marginBottom:22}}>
        <div>
          <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:26,fontWeight:900,color:C.primary}}>Voz do Morador</h1>
          <p style={{fontSize:13,color:C.muted,marginTop:5}}>Central de participacao inteligente por edificacao. Reclamações continuam em Chamados.</p>
        </div>
        <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>askAi("Resumo das principais sugestoes da semana")} disabled={busy==="ia"}><Ic n="ai" s={14} /> IA</button>
          <button className="btn btn-primary btn-sm" onClick={()=>openCreate(tabMeta[tab]?.tipo || "SUGESTAO_MELHORIA")}><Ic n="plus" s={14} /> Nova publicacao</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:12,marginBottom:16}}>
        <Stat label="Publicacoes" value={resumo.total} color={C.primary} icon="doc" />
        <Stat label="Abertas" value={resumo.abertas} color={C.accent} icon="thumb" />
        <Stat label="Em analise" value={resumo.emAnalise} color={C.warning} icon="bell" />
        <Stat label="No portal" value={portalItems || resumo.visiveisPortal} color={C.success} icon="eye" />
        <Stat label="Internas" value={internalItems} color={C.muted} icon="shield" />
      </div>

      <form onSubmit={apply} className="card" style={{padding:16,marginBottom:16}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,alignItems:"end"}}>
          <div><label>Edificacao</label><select value={draft.condominioId} onChange={e=>setF("condominioId",e.target.value)}><option value="all">Todas as edificacoes</option>{condominios.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          <div><label>Tipo</label><select value={draft.tipo} onChange={e=>setF("tipo",e.target.value)}>{tipoOptions.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div><label>Status</label><select value={draft.status} onChange={e=>setF("status",e.target.value)}>{statusOptions.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
          <div><label>Periodo inicial</label><input type="date" value={draft.de} onChange={e=>setF("de",e.target.value)} /></div>
          <div><label>Periodo final</label><input type="date" value={draft.ate} onChange={e=>setF("ate",e.target.value)} /></div>
          <div><label>Ranking</label><select value={draft.sort} onChange={e=>setF("sort",e.target.value)}><option value="em_alta">Em alta</option><option value="mais_votadas">Mais votadas</option><option value="mais_comentadas">Mais comentadas</option><option value="mais_recentes">Mais recentes</option></select></div>
          <div><label>Destaques</label><select value={draft.destaque} onChange={e=>setF("destaque",e.target.value)}><option value="all">Todos</option><option value="true">Somente destaques</option><option value="false">Sem destaque</option></select></div>
          <div><label>Visivel no portal</label><select value={draft.visivelPortal} onChange={e=>setF("visivelPortal",e.target.value)}><option value="all">Todos</option><option value="true">Visiveis</option><option value="false">Ocultos</option></select></div>
          <div><label>Busca</label><input value={draft.q} onChange={e=>setF("q",e.target.value)} placeholder="Titulo, tema ou categoria" /></div>
          <div style={{display:"flex",gap:8}}><button className="btn btn-primary" style={{flex:1,justifyContent:"center"}} type="submit">Filtrar</button><button className="btn btn-ghost" type="button" onClick={clear}>Limpar</button></div>
        </div>
        <p style={{fontSize:12,color:C.muted,marginTop:10}}>Filtro ativo: {selectedLabel}. Avaliacoes da gestao sao internas e nao aparecem no portal por padrao.</p>
      </form>

      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
        {Object.entries(tabMeta).map(([key, meta]) => <button key={key} className={`btn ${tab===key?"btn-primary":"btn-ghost"} btn-sm`} onClick={()=>setTab(key)}>{meta.label}</button>)}
      </div>

      {tab === "config" ? (
        <div style={{display:"grid",gridTemplateColumns:"1.2fr .8fr",gap:16}}>
          <div className="card" style={{padding:18}}>
            <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:850,marginBottom:10}}>IA da Voz do Morador</h3>
            <p style={{fontSize:13,color:C.muted,lineHeight:1.5,marginBottom:12}}>Use a IA para resumir sugestoes, agrupar temas recorrentes, gerar pautas de assembleia, respostas profissionais e relatorios mensais.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10}}><input value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)} placeholder="Pergunte sobre participacao dos moradores" /><button className="btn btn-primary" onClick={()=>askAi()} disabled={busy==="ia"}>Gerar analise</button></div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
              {["Quais temas os moradores mais pediram?","Gerar pauta de assembleia com base nas sugestoes aprovadas","Criar resposta para essa sugestao","Gerar relatorio mensal da participacao"].map(q=><button key={q} className="btn btn-ghost btn-xs" onClick={()=>{setAiQuestion(q);askAi(q);}}>{q}</button>)}
            </div>
            {aiResult && <div style={{marginTop:14,padding:14,borderRadius:14,background:"#F2FAF1",fontSize:13,lineHeight:1.55}}><strong>Analise:</strong><br/>{aiResult.answer}</div>}
          </div>
          <div className="card" style={{padding:18}}>
            <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:850,marginBottom:10}}>Regras de exibicao</h3>
            <div style={{display:"grid",gap:10,fontSize:13,color:C.muted,lineHeight:1.45}}>
              <p>O portal mostra somente itens visiveis, pautas liberadas, parceiros visiveis e destaques escolhidos pelo sindico.</p>
              <p>Avaliacao da gestao fica interna por padrao.</p>
              <p>Reclamacoes devem ser registradas em Chamados, mantendo a Voz focada em participacao e melhoria.</p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 340px",gap:16,alignItems:"start"}}>
          <div style={{display:"grid",gap:13}}>
            {loading ? <Spinner /> : scopedByTab.map(item => <VozCard key={item.id} item={item} />)}
            {!loading && !scopedByTab.length && <div className="card" style={{padding:36,textAlign:"center",color:C.muted}}>Nenhuma publicacao encontrada para esta aba e filtros.</div>}
          </div>
          <div style={{display:"grid",gap:13}}>
            <RankingList title="Mais votadas da semana" items={rankings.semana} />
            <RankingList title="Mais votadas do mes" items={rankings.mes} />
            <RankingList title="Mais comentadas" items={rankings.comentadas} />
            <RankingList title="Em alta" items={rankings.emAlta} />
          </div>
        </div>
      )}

      {show && (
        <Modal title="Nova publicacao" onClose={()=>setShow(false)} wide>
          <div className="row2">
            <div className="fg"><label>Titulo</label><input value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} placeholder="Ex: Melhorar iluminacao da garagem" /></div>
            <div className="fg"><label>Edificacao</label><select value={form.condominioId} onChange={e=>setForm(p=>({...p,condominioId:e.target.value}))}><option value="">Usar edificacao ativa</option>{condominios.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          </div>
          <div className="row2">
            <div className="fg"><label>Tipo</label><select value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value,visivelPortal:e.target.value!=="AVALIACAO_GESTAO"}))}><option value="SUGESTAO_MELHORIA">Sugestao de melhoria</option><option value="PAUTA_ASSEMBLEIA">Pauta para assembleia</option><option value="PARCEIRO">Parceiro</option><option value="AVALIACAO_GESTAO">Avaliacao da gestao</option></select></div>
            <div className="fg"><label>Categoria</label><input value={form.categoria} onChange={e=>setForm(p=>({...p,categoria:e.target.value}))} placeholder="Seguranca, lazer, parceiro..." /></div>
          </div>
          <div className="fg"><label>Descricao</label><textarea rows={5} value={form.descricao} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} placeholder="Detalhe a ideia, pauta ou parceiro sugerido." /></div>
          <div className="fg"><label>Anexo imagem/documento</label><input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={e=>setFile(e.target.files?.[0] || null)} /></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
            <Toggle label="Visivel no portal" on={form.visivelPortal} onChange={v=>setForm(p=>({...p,visivelPortal:v}))} />
            <Toggle label="Destaque da semana" on={form.destaqueSemana} onChange={v=>setForm(p=>({...p,destaqueSemana:v}))} />
            <Toggle label="Fixar" on={form.fixado} onChange={v=>setForm(p=>({...p,fixado:v}))} />
          </div>
          <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}><button className="btn btn-ghost btn-sm" onClick={()=>setShow(false)}>Cancelar</button><button className="btn btn-primary btn-sm" onClick={save} disabled={!form.titulo}>Publicar</button></div>
        </Modal>
      )}
    </div>
  );
}
function DenunciaPage({ toast, user }) {
  const [form, setForm] = useState({
    categoria:"PROBLEMA_INTERNO",
    descricao:"",
    local:"",
    dataOcorrido:"",
    anonimo:true,
    contato:"",
  });
  const [attachments, setAttachments] = useState([]);
  const [sent, setSent] = useState(false);
  const [sentCode, setSentCode] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [filters, setFilters] = useState({ categoria:"", status:"", from:"", to:"" });
  const [detail, setDetail] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const query = new URLSearchParams();
  if (filters.categoria) query.set('categoria', filters.categoria);
  if (filters.status) query.set('status', filters.status);
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  const path = user?.role!=="MORADOR" ? `/denuncias${query.toString() ? `?${query.toString()}` : ''}` : null;
  const { data: list, loading, reload } = useFetch(path, [query.toString()]);

  async function enviar() {
    try {
      const body = new FormData();
      body.append('categoria', form.categoria);
      body.append('descricao', form.descricao);
      body.append('local', form.local);
      if (form.dataOcorrido) body.append('dataOcorrido', form.dataOcorrido);
      body.append('anonimo', form.anonimo ? 'true' : 'false');
      if (!form.anonimo && form.contato) body.append('contato', form.contato);
      attachments.forEach(file => body.append('anexos', file));
      body.append('condominioId', user.condominioId);
      const result = await api.post('/denuncias', body);
      setSentCode(result.codigo || '');
      setSent(true);
    } catch(e){ toast(e.message,"err"); }
  }

  async function consultar() {
    try {
      if (!searchCode.trim()) return toast('Informe o código da denúncia', 'err');
      const result = await api.get(`/denuncias/consulta?codigo=${encodeURIComponent(searchCode.trim())}`);
      setSearchResult(result);
    } catch(e){ toast(e.message,"err"); }
  }

  async function openDetail(id) {
    try {
      const result = await api.get(`/denuncias/${id}`);
      setDetail(result);
      setShowDetail(true);
    } catch(e){ toast(e.message,"err"); }
  }

  async function updateDetailStatus(status) {
    try {
      if (!detail) return;
      const result = await api.patch(`/denuncias/${detail.id}`, { status });
      setDetail(result);
      reload();
      toast('Status atualizado', 'ok');
    } catch(e){ toast(e.message, 'err'); }
  }

  if (user?.role!=="MORADOR") return (
    <div className="page">
      <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:700,marginBottom:22}}>🔒 Denúncias — Restrito</h1>
      <div className="card" style={{padding:18,marginBottom:18}}>
        <div className="row3">
          <div className="fg"><label>Tipo</label><select value={filters.categoria} onChange={e=>setFilters(p=>({...p,categoria:e.target.value}))}>
            <option value="">Todas</option>
            <option value="VIOLENCIA_DOMESTICA">Violência Doméstica</option>
            <option value="PROBLEMA_INTERNO">Problema Interno</option>
            <option value="CONDUTA_INADEQUADA">Conduta Inadequada</option>
            <option value="OUTRO">Outro</option>
          </select></div>
          <div className="fg"><label>Status</label><select value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value}))}>
            <option value="">Todos</option>
            <option value="RECEBIDO">Recebido</option>
            <option value="EM_ANALISE">Em análise</option>
            <option value="EM_ANDAMENTO">Em andamento</option>
            <option value="CONCLUIDO">Concluído</option>
          </select></div>
          <div className="fg"><label>Data início</label><input type="date" value={filters.from} onChange={e=>setFilters(p=>({...p,from:e.target.value}))} /></div>
          <div className="fg"><label>Data fim</label><input type="date" value={filters.to} onChange={e=>setFilters(p=>({...p,to:e.target.value}))} /></div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>setFilters({ categoria:'', status:'', from:'', to:'' })}>Limpar</button>
          <button className="btn btn-primary btn-sm" onClick={reload}>Aplicar</button>
        </div>
      </div>
      {loading ? <Spinner /> : (
        <div className="card" style={{overflow:"hidden"}}>
          <table className="table">
            <thead><tr><th>Código</th><th>Categoria</th><th>Descrição</th><th>Local</th><th>Data</th><th>Status</th><th>Ação</th></tr></thead>
            <tbody>{asList(list).map(d=>(
              <tr key={d.id}>
                <td style={{fontSize:13,fontWeight:600}}>{d.codigo}</td>
                <td><span className="badge bd-dang">{d.categoria.replace(/_/g," ")}</span></td>
                <td style={{fontSize:13,maxWidth:240}}>{d.descricao.slice(0,70)}…</td>
                <td style={{fontSize:13}}>{d.local||"—"}</td>
                <td style={{fontSize:13,color:C.muted}}>{fmt.date(d.createdAt)}</td>
                <td><Bdg s={d.status || 'RECEBIDO'} /></td>
                <td><button className="btn btn-ghost btn-xs" onClick={()=>openDetail(d.id)}>Ver</button></td>
              </tr>
            ))}</tbody>
          </table>
          {!asList(list).length && <p style={{textAlign:"center",padding:36,color:C.muted}}>Nenhuma denúncia</p>}
        </div>
      )}
      {showDetail && detail && (
        <Modal title={`Denúncia ${detail.codigo}`} onClose={()=>setShowDetail(false)} wide>
          <div className="row2">
            <div className="fg"><label>Categoria</label><input value={detail.categoria.replace(/_/g,' ')} readOnly /></div>
            <div className="fg"><label>Status</label><select value={detail.status} onChange={e=>setDetail(p=>({...p,status:e.target.value}))}>
              <option value="RECEBIDO">Recebido</option>
              <option value="EM_ANALISE">Em análise</option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="CONCLUIDO">Concluído</option>
            </select></div>
          </div>
          <div className="fg"><label>Descrição</label><textarea rows={5} value={detail.descricao} readOnly /></div>
          <div className="row3">
            <div className="fg"><label>Local</label><input value={detail.local||"—"} readOnly /></div>
            <div className="fg"><label>Data do ocorrido</label><input value={detail.dataOcorrido ? fmt.date(detail.dataOcorrido) : '—'} readOnly /></div>
            <div className="fg"><label>Prioridade</label><input value={detail.prioridade||'MEDIA'} readOnly /></div>
          </div>
          <div className="fg"><label>Risco avaliado</label><input value={detail.risco||'Não informado'} readOnly /></div>
          <div className="fg"><label>Ações sugeridas</label><textarea rows={3} value={detail.acoesSugeridas||'Nenhuma'} readOnly /></div>
          <div className="fg"><label>Anexos</label>{detail.anexos?.length ? detail.anexos.map((url,i)=>(<div key={i}><a href={url} target="_blank" rel="noreferrer">Anexo {i+1}</a></div>)) : <p style={{color:C.muted,fontSize:13}}>Nenhum anexo</p>}</div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShowDetail(false)}>Fechar</button>
            <button className="btn btn-primary btn-sm" onClick={()=>updateDetailStatus(detail.status)}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );

  return (
    <div className="page">
      <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:700,marginBottom:8}}>🔒 Não Se Cale</h1>
      <p style={{color:C.muted,fontSize:13,marginBottom:20}}>Canal anônimo e seguro para denúncias.</p>
      <div className="anon-card" style={{marginBottom:22}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:5}}>Totalmente Anônimo</h3>
        <p style={{fontSize:13,opacity:.8}}>Nenhum dado pessoal é armazenado quando o anonimato é escolhido.</p>
      </div>
      {sent ? (
        <div className="card" style={{padding:48,textAlign:"center"}}>
          <div style={{fontSize:52,marginBottom:14}}>✅</div>
          <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:19,fontWeight:700}}>Denúncia enviada com segurança</h3>
          {sentCode && <p style={{marginTop:12,color:C.muted}}>Protocolo: <strong>{sentCode}</strong></p>}
          <button className="btn btn-primary" style={{marginTop:22}} onClick={()=>{setSent(false);setSentCode("");setForm({categoria:"PROBLEMA_INTERNO",descricao:"",local:"",dataOcorrido:"",anonimo:true,contato:""});setAttachments([]);}}>
            Enviar outra
          </button>
        </div>
      ) : (
        <div className="card" style={{padding:26,maxWidth:620}}>
          <div className="row2">
            <div className="fg"><label>Categoria</label><select value={form.categoria} onChange={e=>setForm(p=>({...p,categoria:e.target.value}))}>
              <option value="VIOLENCIA_DOMESTICA">Violência Doméstica</option>
              <option value="PROBLEMA_INTERNO">Problema Interno</option>
              <option value="CONDUTA_INADEQUADA">Conduta Inadequada</option>
              <option value="OUTRO">Outro</option>
            </select></div>
            <div className="fg"><label>Data do ocorrido</label><input type="date" value={form.dataOcorrido} onChange={e=>setForm(p=>({...p,dataOcorrido:e.target.value}))} /></div>
          </div>
          <div className="fg"><label>Descrição</label><textarea rows={6} value={form.descricao} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} placeholder="Descreva o ocorrido com detalhes..." /></div>
          <div className="row2">
            <div className="fg"><label>Local (opcional)</label><input value={form.local} onChange={e=>setForm(p=>({...p,local:e.target.value}))} placeholder="Ex: Bloco B, 3º andar" /></div>
            <div className="fg"><label>Anexos</label><input type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={e=>setAttachments(Array.from(e.target.files||[]))} /></div>
          </div>
          <div className="row2" style={{alignItems:'flex-end'}}>
            <div className="fg" style={{display:'flex',flexDirection:'column',gap:6}}>
              <label>Anonimato</label>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <button className={`btn ${form.anonimo? 'btn-primary' : 'btn-ghost'}`} onClick={()=>setForm(p=>({...p,anonimo:true}))} type="button">Manter anônimo</button>
                <button className={`btn ${!form.anonimo? 'btn-primary' : 'btn-ghost'}`} onClick={()=>setForm(p=>({...p,anonimo:false}))} type="button">Assumir contato</button>
              </div>
            </div>
            {!form.anonimo && <div className="fg"><label>Contato (opcional)</label><input value={form.contato} onChange={e=>setForm(p=>({...p,contato:e.target.value}))} placeholder="Email ou telefone" /></div>}
          </div>
          <button className="btn btn-primary" style={{width:"100%",justifyContent:"center"}} onClick={enviar} disabled={!form.descricao}>
            <Ic n="shield" s={15} /> Enviar denúncia
          </button>
        </div>
      )}
      <div className="card" style={{padding:24,marginTop:22,maxWidth:620}}>
        <h3 style={{fontSize:16,fontWeight:700,marginBottom:10}}>Acompanhe por código</h3>
        <div className="row2" style={{alignItems:'flex-end'}}>
          <div className="fg" style={{flex:1}}><label>Código da denúncia</label><input value={searchCode} onChange={e=>setSearchCode(e.target.value)} placeholder="Ex: NSC-1A2B3C4D" /></div>
          <button className="btn btn-accent btn-sm" onClick={consultar}>Consultar</button>
        </div>
        {searchResult && (
          <div style={{marginTop:18,border:'1px solid rgba(0,59,36,.12)',borderRadius:14,padding:18,background:'#F8FFFA'}}>
            <p style={{fontSize:13,color:C.muted}}>Resultado para <strong>{searchResult.codigo}</strong></p>
            <p><strong>Status:</strong> <Bdg s={searchResult.status} /></p>
            <p><strong>Categoria:</strong> {searchResult.categoria.replace(/_/g,' ')}</p>
            <p><strong>Local:</strong> {searchResult.local||'—'}</p>
            <p><strong>Descrição:</strong> {searchResult.descricao}</p>
            <p><strong>Prioridade:</strong> {searchResult.prioridade}</p>
            <p><strong>Risco:</strong> {searchResult.risco || 'Não informado'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CHECKLISTS OPERACIONAIS ───────────────────────────────────
function ChecklistsPage({ toast }) {
  const [tab, setTab] = useState('templates')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [templateForm, setTemplateForm] = useState({ nome:'', descricao:'', categoria:'', recorrencia:'MANUAL', responsavelPadrao:'', ativo:true, campos:[] })
  const [showExecutionModal, setShowExecutionModal] = useState(false)
  const [executionForm, setExecutionForm] = useState({ templateId:'', nome:'', responsavel:'', responsavelTipo:'', dataPrevista:'', prazoConclusao:'', observacoes:'' })
  const [publicLink, setPublicLink] = useState('')
  const { data: templatesData, loading: loadingTemplates, reload: reloadTemplates } = useFetch('/checklists/templates')
  const { data: executionsData, loading: loadingExecutions, reload: reloadExecutions } = useFetch('/checklists/executions')

  const templates = asList(templatesData)
  const executions = asList(executionsData)

  function resetTemplateForm() {
    setEditingTemplate(null)
    setTemplateForm({ nome:'', descricao:'', categoria:'', recorrencia:'MANUAL', responsavelPadrao:'', ativo:true, campos:[] })
  }

  function openTemplate(template) {
    setEditingTemplate(template)
    setTemplateForm({
      nome: template.nome || '',
      descricao: template.descricao || '',
      categoria: template.categoria || '',
      recorrencia: template.recorrencia || 'MANUAL',
      responsavelPadrao: template.responsavelPadrao || '',
      ativo: template.ativo ?? true,
      campos: Array.isArray(template.campos) ? template.campos : [],
    })
    setShowTemplateModal(true)
  }

  function addField() {
    setTemplateForm(p => ({
      ...p,
      campos: [...p.campos, { label:'', type:'TEXTO', required:false, options:[] }],
    }))
  }

  function updateField(index, key, value) {
    setTemplateForm(p => ({
      ...p,
      campos: p.campos.map((field, idx) => idx === index ? { ...field, [key]: value } : field),
    }))
  }

  function removeField(index) {
    setTemplateForm(p => ({
      ...p,
      campos: p.campos.filter((_, idx) => idx !== index),
    }))
  }

  async function saveTemplate() {
    try {
      const payload = {
        nome: templateForm.nome,
        descricao: templateForm.descricao,
        categoria: templateForm.categoria,
        recorrencia: templateForm.recorrencia,
        responsavelPadrao: templateForm.responsavelPadrao,
        ativo: templateForm.ativo,
        campos: templateForm.campos.map(field => ({
          ...field,
          options: Array.isArray(field.options) ? field.options : String(field.options || '').split(',').map(o => o.trim()).filter(Boolean),
        })),
      }
      if (!payload.nome) return toast('Nome do template é obrigatório', 'err')
      if (editingTemplate) {
        await api.patch(`/checklists/templates/${editingTemplate.id}`, payload)
        toast('Template atualizado', 'ok')
      } else {
        await api.post('/checklists/templates', payload)
        toast('Template criado', 'ok')
      }
      setShowTemplateModal(false)
      resetTemplateForm()
      reloadTemplates()
    } catch (e) { toast(e.message, 'err') }
  }

  function openNewExecution(template) {
    setExecutionForm({
      templateId: template.id,
      nome: template.nome || '',
      responsavel: template.responsavelPadrao || '',
      responsavelTipo: '',
      dataPrevista: '',
      prazoConclusao: '',
      observacoes: '',
    })
    setShowExecutionModal(true)
  }

  async function createExecution() {
    try {
      if (!executionForm.templateId) return toast('Selecione um template válido', 'err')
      await api.post('/checklists/executions', {
        templateId: executionForm.templateId,
        nome: executionForm.nome,
        responsavel: executionForm.responsavel,
        responsavelTipo: executionForm.responsavelTipo,
        dataPrevista: executionForm.dataPrevista || null,
        prazoConclusao: executionForm.prazoConclusao || null,
        observacoes: executionForm.observacoes || null,
      })
      toast('Execução criada', 'ok')
      setShowExecutionModal(false)
      setPublicLink('')
      reloadExecutions()
    } catch (e) { toast(e.message, 'err') }
  }

  async function generatePublicLink(execution) {
    try {
      const result = await api.post(`/checklists/executions/${execution.id}/public-link`)
      setPublicLink(result.link)
      toast('Link de execução gerado', 'ok')
    } catch (e) { toast(e.message, 'err') }
  }

  async function completeExecution(execution) {
    try {
      await api.patch(`/checklists/executions/${execution.id}`, { status:'CONCLUIDO' })
      toast('Execução marcada como concluída', 'ok')
      reloadExecutions()
    } catch (e) { toast(e.message, 'err') }
  }

  async function copyLink() {
    if (!publicLink) return
    await navigator.clipboard.writeText(publicLink)
    toast('Link copiado', 'ok')
  }

  return (
    <div className="page">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22}}>
        <div>
          <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:700}}>Checklists Operacionais</h1>
          <p style={{color:C.muted,fontSize:13,marginTop:4}}>Modelos de checklists, execuções e histórico de inspeções para o condomínio.</p>
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>{ setTab('templates'); setPublicLink('') }}>Templates</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>{ setTab('executions'); setPublicLink('') }}>Execuções</button>
        </div>
      </div>

      <div className="card" style={{marginBottom:18,padding:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <span className="badge bd-done">{tab === 'templates' ? 'Templates' : 'Execuções'}</span>
          <span style={{color:C.muted,fontSize:13}}>{tab === 'templates' ? 'Gerencie os modelos de checklist disponíveis.' : 'Acompanhe execuções em progresso e gere links públicos.'}</span>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:10,flexWrap:'wrap'}}>
          <button className="btn btn-primary btn-sm" onClick={()=>{ resetTemplateForm(); setShowTemplateModal(true) }}><Ic n="plus" s={14} /> Novo template</button>
          {tab === 'templates' && <button className="btn btn-accent btn-sm" onClick={()=>setShowExecutionModal(true)}><Ic n="check" s={14} /> Nova execução</button>}
        </div>
      </div>

      {tab === 'templates' ? (
        loadingTemplates ? <Spinner /> : (
          <div className="card" style={{overflow:'hidden'}}>
            <table className="table">
              <thead><tr><th>Nome</th><th>Categoria</th><th>Recorrência</th><th>Campos</th><th>Ações</th></tr></thead>
              <tbody>{templates.map(t => (
                <tr key={t.id}>
                  <td style={{fontWeight:500}}>{t.nome}</td>
                  <td style={{fontSize:13}}>{t.categoria || 'Geral'}</td>
                  <td style={{fontSize:13}}>{t.recorrencia.replace(/_/g,' ')}</td>
                  <td style={{fontSize:13}}>{Array.isArray(t.campos) ? t.campos.length : 0}</td>
                  <td style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <button className="btn btn-ghost btn-xs" onClick={()=>openTemplate(t)}>Editar</button>
                    <button className="btn btn-primary btn-xs" onClick={()=>openNewExecution(t)}>Criar execução</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {!templates.length && <p style={{textAlign:'center',padding:28,color:C.muted}}>Nenhum template cadastrado.</p>}
          </div>
        )
      ) : (
        loadingExecutions ? <Spinner /> : (
          <div className="card" style={{overflow:'hidden'}}>
            <table className="table">
              <thead><tr><th>Nome</th><th>Template</th><th>Responsável</th><th>Prevista</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>{executions.map(exec => (
                <tr key={exec.id}>
                  <td style={{fontWeight:500}}>{exec.nome}</td>
                  <td style={{fontSize:13}}>{exec.templateName || 'Manual'}</td>
                  <td style={{fontSize:13}}>{exec.responsavel || '—'}</td>
                  <td style={{fontSize:13}}>{exec.dataPrevista ? fmt.date(exec.dataPrevista) : '—'}</td>
                  <td><Bdg s={exec.status} /></td>
                  <td style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <button className="btn btn-ghost btn-xs" onClick={()=>generatePublicLink(exec)}>Link público</button>
                    <button className="btn btn-success btn-xs" onClick={()=>completeExecution(exec)} disabled={exec.status==='CONCLUIDO'}>Concluir</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {!executions.length && <p style={{textAlign:'center',padding:28,color:C.muted}}>Nenhuma execução encontrada.</p>}
          </div>
        )
      )}

      {publicLink && (
        <div className="card" style={{padding:18,marginTop:18,background:'#F8FFFA'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>Link público para execução</div>
              <div style={{fontSize:13,color:C.muted,wordBreak:'break-all'}}>{publicLink}</div>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button className="btn btn-accent btn-sm" onClick={copyLink}>Copiar</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setPublicLink('')}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {showTemplateModal && (
        <Modal title={editingTemplate ? 'Editar template' : 'Novo template'} onClose={()=>setShowTemplateModal(false)} wide>
          <div className="row2">
            <div className="fg"><label>Nome</label><input value={templateForm.nome} onChange={e=>setTemplateForm(p=>({...p,nome:e.target.value}))} /></div>
            <div className="fg"><label>Categoria</label><input value={templateForm.categoria} onChange={e=>setTemplateForm(p=>({...p,categoria:e.target.value}))} placeholder="Ex: Inspeção diária" /></div>
          </div>
          <div className="row2">
            <div className="fg"><label>Recorrência</label><select value={templateForm.recorrencia} onChange={e=>setTemplateForm(p=>({...p,recorrencia:e.target.value}))}>
              <option value="MANUAL">Manual</option>
              <option value="DIARIO">Diário</option>
              <option value="SEMANAL">Semanal</option>
              <option value="MENSAL">Mensal</option>
              <option value="TRIMESTRAL">Trimestral</option>
              <option value="ANUAL">Anual</option>
            </select></div>
            <div className="fg"><label>Responsável padrão</label><input value={templateForm.responsavelPadrao} onChange={e=>setTemplateForm(p=>({...p,responsavelPadrao:e.target.value}))} placeholder="Ex: Zelador" /></div>
          </div>
          <div className="fg"><label>Descrição</label><textarea rows={3} value={templateForm.descricao} onChange={e=>setTemplateForm(p=>({...p,descricao:e.target.value}))} /></div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:600}}>Campos do checklist</div>
            <button className="btn btn-ghost btn-xs" onClick={addField}>Adicionar campo</button>
          </div>
          {templateForm.campos.map((field, index) => (
            <div key={index} className="card" style={{padding:14,marginBottom:10,background:'#F7FFF5'}}>
              <div className="row3">
                <div className="fg"><label>Etiqueta</label><input value={field.label} onChange={e=>updateField(index,'label',e.target.value)} /></div>
                <div className="fg"><label>Tipo</label><select value={field.type} onChange={e=>updateField(index,'type',e.target.value)}>
                  <option value="TEXTO">Texto</option>
                  <option value="AREA">Área de texto</option>
                  <option value="NUMERO">Número</option>
                  <option value="CHECKBOX">Checkbox</option>
                  <option value="DATA">Data</option>
                  <option value="HORA">Hora</option>
                  <option value="SELECAO_UNICA">Seleção única</option>
                  <option value="SELECAO_MULTIPLA">Seleção múltipla</option>
                </select></div>
                <div className="fg" style={{display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
                  <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><input type="checkbox" checked={field.required} onChange={e=>updateField(index,'required',e.target.checked)} style={{width:'auto'}} /> Obrigatório</label>
                  <button className="btn btn-danger btn-xs" onClick={()=>removeField(index)}>Remover campo</button>
                </div>
              </div>
              {(field.type === 'SELECAO_UNICA' || field.type === 'SELECAO_MULTIPLA') && (
                <div className="fg"><label>Opções (separadas por vírgula)</label><input value={(field.options||[]).join(', ')} onChange={e=>updateField(index,'options',e.target.value)} placeholder="Sim,Não,Não se aplica" /></div>
              )}
            </div>
          ))}
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShowTemplateModal(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={saveTemplate}>Salvar template</button>
          </div>
        </Modal>
      )}

      {showExecutionModal && (
        <Modal title="Nova execução" onClose={()=>setShowExecutionModal(false)} wide>
          <div className="row2">
            <div className="fg"><label>Nome</label><input value={executionForm.nome} onChange={e=>setExecutionForm(p=>({...p,nome:e.target.value}))} /></div>
            <div className="fg"><label>Responsável</label><input value={executionForm.responsavel} onChange={e=>setExecutionForm(p=>({...p,responsavel:e.target.value}))} /></div>
          </div>
          <div className="row2">
            <div className="fg"><label>Tipo responsável</label><input value={executionForm.responsavelTipo} onChange={e=>setExecutionForm(p=>({...p,responsavelTipo:e.target.value}))} /></div>
            <div className="fg"><label>Data prevista</label><input type="date" value={executionForm.dataPrevista} onChange={e=>setExecutionForm(p=>({...p,dataPrevista:e.target.value}))} /></div>
          </div>
          <div className="row2">
            <div className="fg"><label>Prazo</label><input value={executionForm.prazoConclusao} onChange={e=>setExecutionForm(p=>({...p,prazoConclusao:e.target.value}))} placeholder="Ex: 2 dias" /></div>
            <div className="fg"><label>Observações</label><input value={executionForm.observacoes} onChange={e=>setExecutionForm(p=>({...p,observacoes:e.target.value}))} /></div>
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShowExecutionModal(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={createExecution}>Criar execução</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── BANNERS ──────────────────────────────────────────────────
function BannersPage({ toast }) {
  const { data, loading, reload } = useFetch("/banners");
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const fileInputRef = useRef(null);
  const emptyForm = { titulo:"", imagem:"", link:"", ordem:1, ativo:true };
  const [form, setForm] = useState(emptyForm);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setPreview("");
    setShow(true);
  }

  function openEdit(banner) {
    setEditing(banner);
    setForm({ titulo:banner.titulo || "", imagem:banner.imagem || "", link:banner.link || "", ordem:banner.ordem || 1, ativo:banner.ativo ?? true });
    setFile(null);
    setPreview("");
    setShow(true);
  }

  function pickImage(e) {
    const next = e.target.files?.[0];
    if (!next) return;
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  function removeImage() {
    setFile(null);
    setPreview("");
    setForm(p=>({...p,imagem:""}));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadSelectedImage() {
    if (!file) return form.imagem;
    const fd = new FormData();
    fd.append("imagem", file);
    const result = await api.post("/banners/imagem", fd);
    return result.url;
  }

  async function save() {
    try {
      const imagem = await uploadSelectedImage();
      if (!imagem) return toast("Envie uma imagem para o banner.", "err");
      const payload = { ...form, imagem, ordem: parseInt(form.ordem || 1, 10), ativo: Boolean(form.ativo) };
      if (editing) await api.patch(`/banners/${editing.id}`, payload);
      else await api.post("/banners", payload);
      toast(editing ? "Banner atualizado!" : "Banner criado!","ok");
      setShow(false);
      setEditing(null);
      setFile(null);
      setPreview("");
      reload();
    }
    catch(e){ toast(e.message,"err"); }
  }
  async function toggle(id, ativo) {
    try { await api.patch(`/banners/${id}`, { ativo: !ativo }); reload(); }
    catch(e){ toast(e.message,"err"); }
  }
  async function removeBanner(id) {
    try { await api.del(`/banners/${id}`); toast("Banner removido!","ok"); reload(); }
    catch(e){ toast(e.message,"err"); }
  }
  const currentImage = preview || assetUrl(form.imagem);

  return (
    <div className="page">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
        <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:700}}>Gerenciar Banners</h1>
        <button className="btn btn-primary btn-sm" onClick={openNew}><Ic n="plus" s={14} /> Novo</button>
      </div>
      {loading ? <Spinner /> : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:15}}>
          {asList(data).map(b=>(
            <div key={b.id} className="card" style={{overflow:"hidden",opacity:b.ativo?1:.65}}>
              <div style={{height:130,background:"#DDE7DE",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                {b.imagem?.startsWith("/uploads/") || b.imagem?.startsWith("http")
                  ? <img src={assetUrl(b.imagem)} alt={b.titulo} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                  : <div style={{fontSize:36,color:C.muted}}><Ic n="mon" s={34} c={C.muted} /></div>}
              </div>
              <div style={{padding:15}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontWeight:600,fontSize:13,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.titulo}</span>
                  <Bdg s={b.ativo?"Ativo":"Inativo"} />
                </div>
                <div style={{fontSize:12,color:C.muted,marginBottom:11}}>Ordem: {b.ordem} {b.link ? "· link configurado" : ""}</div>
                <div style={{display:"flex",gap:7}}>
                  <button className="btn btn-ghost btn-xs" style={{flex:1}} onClick={()=>openEdit(b)}>Editar</button>
                  <button className={`btn btn-xs ${b.ativo?"btn-danger":"btn-success"}`} onClick={()=>toggle(b.id,b.ativo)}>{b.ativo?"Desativar":"Ativar"}</button>
                  <button className="btn btn-ghost btn-xs" onClick={()=>removeBanner(b.id)}><Ic n="x" s={12} /></button>
                </div>
              </div>
            </div>
          ))}
          {!asList(data).length && <div className="card" style={{padding:32,textAlign:"center",color:C.muted}}>Nenhum banner cadastrado.</div>}
        </div>
      )}
      {show && (
        <Modal title={editing ? "Editar Banner" : "Novo Banner"} onClose={()=>setShow(false)}>
          <div className="fg"><label>Título</label><input value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} /></div>
          <div className="row2">
            <div className="fg"><label>Ordem</label><input type="number" value={form.ordem} onChange={e=>setForm(p=>({...p,ordem:parseInt(e.target.value)}))} /></div>
            <div className="fg"><label>Status</label><select value={form.ativo ? "ativo" : "inativo"} onChange={e=>setForm(p=>({...p,ativo:e.target.value==="ativo"}))}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div>
          </div>
          <div className="fg"><label>Link (opcional)</label><input value={form.link} onChange={e=>setForm(p=>({...p,link:e.target.value}))} placeholder="https://..." /></div>
          <div className="fg">
            <label>Imagem do banner</label>
            <div style={{border:`1.5px dashed ${C.border}`,borderRadius:14,overflow:"hidden",background:"#F2FAF1"}}>
              <div style={{height:170,display:"flex",alignItems:"center",justifyContent:"center",background:"#eef2f7"}}>
                {currentImage
                  ? <img src={currentImage} alt="Pré-visualização do banner" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                  : <div style={{textAlign:"center",color:C.muted,fontSize:13}}><Ic n="up" s={24} c={C.muted} /><div style={{marginTop:6}}>Envie uma imagem para pré-visualizar</div></div>}
              </div>
              <div style={{display:"flex",gap:8,padding:10,flexWrap:"wrap"}}>
                <button className="btn btn-ghost btn-sm" onClick={()=>fileInputRef.current?.click()}>{currentImage ? "Trocar imagem" : "Enviar imagem"}</button>
                {currentImage && <button className="btn btn-ghost btn-sm" onClick={removeImage}>Remover imagem</button>}
                <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={pickImage} />
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShow(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={!form.titulo || (!form.imagem && !file)}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── FINANCEIRO ───────────────────────────────────────────────
function FinanceiroPage({ toast }) {
  const { data: resumo, reload: reloadResumo } = useFetch("/financeiro/contas/resumo");
  const { data: contas, loading, reload } = useFetch("/financeiro/contas");
  const [show, setShow] = useState(false);
  const now = new Date();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todos");
  const [form, setForm] = useState({
    descricao:"",
    categoria:"IMPOSTO",
    fornecedor:"",
    documento:"",
    valor:"",
    vencimento:"",
    competenciaMes: now.getMonth()+1,
    competenciaAno: now.getFullYear(),
    status:"A_PAGAR",
    recorrente:false,
    observacoes:"",
  });
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const contasLista = asList(contas);
  const statusMap = {
    A_PAGAR:["A pagar","bd-pend"],
    AGENDADO:["Agendado","bd-info"],
    PAGO:["Pago","bd-done"],
    VENCIDO:["Vencido","bd-dang"],
    CANCELADO:["Cancelado","bd-gray"],
  };
  const catMap = {
    IMPOSTO:"Imposto",
    MAO_DE_OBRA:"Mão de obra",
    FORNECEDOR:"Fornecedor",
    MANUTENCAO:"Manutenção",
    SERVICO:"Serviço",
    UTILIDADE:"Água/Luz/Internet",
    SEGURO:"Seguro",
    OUTRO:"Outro",
  };
  const filtered = contasLista.filter(c => {
    const text = `${c.descricao} ${c.fornecedor||""} ${c.documento||""}`.toLowerCase();
    return (status==="todos" || c.status===status) && (!q || text.includes(q.toLowerCase()));
  });
  const badge = s => <span className={`badge ${statusMap[s]?.[1]||"bd-gray"}`}>{statusMap[s]?.[0]||s}</span>;

  async function salvarConta() {
    try {
      await api.post("/financeiro/contas", {
        ...form,
        valor: parseFloat(form.valor),
        competenciaMes: parseInt(form.competenciaMes),
        competenciaAno: parseInt(form.competenciaAno),
      });
      toast("Conta cadastrada!","ok");
      setShow(false);
      setForm({ descricao:"", categoria:"IMPOSTO", fornecedor:"", documento:"", valor:"", vencimento:"", competenciaMes: now.getMonth()+1, competenciaAno: now.getFullYear(), status:"A_PAGAR", recorrente:false, observacoes:"" });
      reload(); reloadResumo();
    } catch(e){ toast(e.message,"err"); }
  }
  async function atualizar(id, data, msg="Atualizado!") {
    try { await api.patch(`/financeiro/contas/${id}`, data); toast(msg,"ok"); reload(); reloadResumo(); }
    catch(e){ toast(e.message,"err"); }
  }
  async function remover(id) {
    try { await api.del(`/financeiro/contas/${id}`); toast("Conta removida","ok"); reload(); reloadResumo(); }
    catch(e){ toast(e.message,"err"); }
  }

  return (
    <div className="page">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
        <div>
          <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:700}}>Controle de Contas</h1>
          <p style={{fontSize:13,color:C.muted,marginTop:3}}>Pagamentos internos do síndico: impostos, mão de obra, fornecedores e serviços.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>setShow(true)}><Ic n="plus" s={14} /> Nova Conta</button>
      </div>
      {resumo && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:14,marginBottom:18}}>
          {[{l:`Pago (${resumo.pago.count})`,v:fmt.money(resumo.pago.total),c:C.success},{l:`Em aberto (${resumo.aberto.count})`,v:fmt.money(resumo.aberto.total),c:C.warning},{l:`Vencido (${resumo.vencido.count})`,v:fmt.money(resumo.vencido.total),c:C.danger}].map((s,i)=>(
            <div key={i} className="stat" style={{borderTop:`4px solid ${s.c}`}}>
              <div className="stat-n" style={{color:s.c,fontSize:22}}>{s.v}</div>
              <div className="stat-l">{s.l}</div>
            </div>
          ))}
        </div>
      )}
      {resumo?.proximas?.length>0 && (
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:18}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:9}}>Próximos pagamentos</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {resumo.proximas.map(c=><span key={c.id} style={{background:c.status==="VENCIDO"?"#fee2e2":"#F2FAF1",color:c.status==="VENCIDO"?C.danger:C.primary,padding:"5px 11px",borderRadius:20,fontSize:12,fontWeight:600}}>{c.descricao} · {fmt.date(c.vencimento)}</span>)}
          </div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:10,marginBottom:14}}>
        <input placeholder="Buscar por conta, fornecedor ou documento..." value={q} onChange={e=>setQ(e.target.value)} />
        <select value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="todos">Todos status</option>
          <option value="A_PAGAR">A pagar</option>
          <option value="AGENDADO">Agendado</option>
          <option value="PAGO">Pago</option>
          <option value="VENCIDO">Vencido</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>
      {loading ? <Spinner /> : (
        <div style={{display:"grid",gap:12}}>
          {filtered.map(c=>(
            <div key={c.id} className="card" style={{padding:16}}>
              <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:12,alignItems:"start",marginBottom:12}}>
                <div style={{minWidth:0}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:5}}>
                    <span className="badge bd-info">{catMap[c.categoria]||c.categoria}</span>
                    {badge(c.status)}
                    {c.recorrente && <span className="badge bd-gray">Recorrente</span>}
                  </div>
                  <div style={{fontWeight:700,fontSize:15,lineHeight:1.35,wordBreak:"break-word"}}>{c.descricao}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:3,wordBreak:"break-word"}}>{c.fornecedor||"Sem fornecedor"} · {c.documento||"Sem documento"}</div>
                </div>
                <div style={{textAlign:"right",minWidth:112}}>
                  <div style={{fontFamily:"'Sora',sans-serif",fontWeight:800,fontSize:17,color:C.primary}}>{fmt.money(c.valor)}</div>
                  <div style={{fontSize:12,color:c.status==="VENCIDO"?C.danger:C.muted,marginTop:3}}>Vence {fmt.date(c.vencimento)}</div>
                </div>
              </div>
              {c.observacoes && <div style={{background:"#F2FAF1",borderRadius:10,padding:"9px 11px",fontSize:12,color:C.muted,marginBottom:12}}>{c.observacoes}</div>}
              <div style={{display:"flex",gap:7,flexWrap:"wrap",justifyContent:"flex-end"}}>
                {c.status!=="PAGO"&&c.status!=="CANCELADO"&&<button className="btn btn-success btn-xs" onClick={()=>atualizar(c.id,{status:"PAGO"},"Pagamento registrado!")}>✓ Pago</button>}
                {c.status!=="CANCELADO"&&<button className="btn btn-ghost btn-xs" onClick={()=>atualizar(c.id,{status:"CANCELADO"},"Conta cancelada")}>Cancelar</button>}
                <button className="btn btn-danger btn-xs" onClick={()=>remover(c.id)}>Excluir</button>
              </div>
            </div>
          ))}
          {!filtered.length && <div className="card" style={{padding:36,textAlign:"center",color:C.muted}}>Nenhuma conta encontrada</div>}
        </div>
      )}
      {show && (
        <Modal title="Nova Conta do Síndico" onClose={()=>setShow(false)} wide>
          <div className="fg"><label>Descrição</label><input value={form.descricao} onChange={f("descricao")} placeholder="Ex: INSS, folha limpeza, fornecedor de bombas" /></div>
          <div className="row2">
            <div className="fg"><label>Categoria</label><select value={form.categoria} onChange={f("categoria")}>{Object.entries(catMap).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></div>
            <div className="fg"><label>Status</label><select value={form.status} onChange={f("status")}><option value="A_PAGAR">A pagar</option><option value="AGENDADO">Agendado</option><option value="PAGO">Pago</option><option value="VENCIDO">Vencido</option></select></div>
          </div>
          <div className="row2">
            <div className="fg"><label>Fornecedor / responsável</label><input value={form.fornecedor} onChange={f("fornecedor")} placeholder="Ex: Receita Federal, João eletricista" /></div>
            <div className="fg"><label>Documento</label><input value={form.documento} onChange={f("documento")} placeholder="NF, DARF, recibo, contrato" /></div>
          </div>
          <div className="row3">
            <div className="fg"><label>Valor (R$)</label><input type="number" value={form.valor} onChange={f("valor")} /></div>
            <div className="fg"><label>Vencimento</label><input type="date" value={form.vencimento} onChange={f("vencimento")} /></div>
            <div className="fg"><label>Mês</label><select value={form.competenciaMes} onChange={f("competenciaMes")}>{["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map((m,i)=><option key={i} value={i+1}>{m}</option>)}</select></div>
          </div>
          <div className="row2">
            <div className="fg"><label>Ano</label><input type="number" value={form.competenciaAno} onChange={f("competenciaAno")} /></div>
            <label style={{display:"flex",alignItems:"center",gap:8,marginTop:21,color:C.text,fontSize:14}}><input type="checkbox" checked={form.recorrente} onChange={e=>setForm(p=>({...p,recorrente:e.target.checked}))} style={{width:"auto"}} /> Conta recorrente</label>
          </div>
          <div className="fg"><label>Observações</label><textarea rows={3} value={form.observacoes} onChange={f("observacoes")} /></div>
          <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShow(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={salvarConta} disabled={!form.descricao||!form.valor||!form.vencimento}>Salvar Conta</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── RESERVAS ─────────────────────────────────────────────────
function ReservasPage({ toast }) {
  const { data: espacos } = useFetch("/reservas/espacos");
  const { data: reservas, loading, reload } = useFetch("/reservas");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ espacoId:"", data:"", horaInicio:"14:00", horaFim:"22:00", observacao:"" });
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const espacosLista = asList(espacos);
  const reservasLista = asList(reservas);

  async function save() {
    try { await api.post("/reservas", form); toast("Reserva solicitada!","ok"); setShow(false); reload(); }
    catch(e){ toast(e.message,"err"); }
  }
  async function upd(id, status) {
    try { await api.patch(`/reservas/${id}`, { status }); toast(`${status}!`,"ok"); reload(); }
    catch(e){ toast(e.message,"err"); }
  }

  return (
    <div className="page">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
        <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:700}}>Reserva de Espaços</h1>
        <button className="btn btn-primary btn-sm" onClick={()=>setShow(true)}><Ic n="plus" s={14} /> Nova Reserva</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:13,marginBottom:22}}>
        {espacosLista.map(e=>(
          <div key={e.id} className="card" style={{padding:16,cursor:"pointer"}}>
            <div style={{fontSize:28,marginBottom:8}}>🏛️</div>
            <div style={{fontWeight:600,fontSize:14}}>{e.nome}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:3}}>{e.capacidade ? `Cap.: ${e.capacidade}` : ""}</div>
            <div style={{fontSize:12,color:C.muted}}>{e._count?.reservas||0} reservas</div>
          </div>
        ))}
      </div>
      {loading ? <Spinner /> : (
        <div className="card" style={{overflow:"hidden"}}>
          <table className="table">
            <thead><tr><th>Espaço</th><th>Morador</th><th>Data</th><th>Horário</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>{reservasLista.map(r=>(
              <tr key={r.id}>
                <td style={{fontWeight:500}}>{r.espaco?.nome}</td>
                <td style={{fontSize:13}}>{r.morador?.nome} — {r.morador?.unidade}</td>
                <td style={{fontSize:13}}>{fmt.date(r.data)}</td>
                <td style={{fontSize:13}}>{r.horaInicio} – {r.horaFim}</td>
                <td><Bdg s={r.status} /></td>
                <td>{r.status==="AGUARDANDO"&&<div style={{display:"flex",gap:6}}>
                  <button className="btn btn-success btn-xs" onClick={()=>upd(r.id,"CONFIRMADA")}>Confirmar</button>
                  <button className="btn btn-danger btn-xs" onClick={()=>upd(r.id,"CANCELADA")}>Cancelar</button>
                </div>}</td>
              </tr>
            ))}</tbody>
          </table>
          {!reservasLista.length && <p style={{textAlign:"center",padding:36,color:C.muted}}>Nenhuma reserva</p>}
        </div>
      )}
      {show && (
        <Modal title="Nova Reserva" onClose={()=>setShow(false)}>
          <div className="fg"><label>Espaço</label><select value={form.espacoId} onChange={f("espacoId")}><option value="">Selecione…</option>{espacosLista.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}</select></div>
          <div className="row3">
            <div className="fg"><label>Data</label><input type="date" value={form.data} onChange={f("data")} /></div>
            <div className="fg"><label>Início</label><input type="time" value={form.horaInicio} onChange={f("horaInicio")} /></div>
            <div className="fg"><label>Fim</label><input type="time" value={form.horaFim} onChange={f("horaFim")} /></div>
          </div>
          <div className="fg"><label>Observação</label><textarea rows={3} value={form.observacao} onChange={f("observacao")} /></div>
          <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShow(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={!form.espacoId||!form.data}>Solicitar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── WHATSAPP ─────────────────────────────────────────────────
function AgendaSindicoPage({ toast }) {
  const storageKey = "tnm_agenda_sindico";
  const { data: condominios } = useFetch("/condominios");
  const condoLista = asList(condominios);
  const tipos = [
    { id:"VISITA", label:"Visita em condomínio", icon:"building", color:C.accent },
    { id:"REUNIAO", label:"Reunião", icon:"users", color:C.primary },
    { id:"VISTORIA", label:"Vistoria", icon:"eye", color:C.warning },
    { id:"EVENTO", label:"Evento", icon:"cal", color:"#0B6B3A" },
    { id:"ESTUDO", label:"Estudo", icon:"doc", color:C.primary },
    { id:"TAREFA", label:"Tarefa", icon:"check", color:C.success },
  ];
  const prioridade = {
    BAIXA: { label:"Baixa", bg:"#E8F5EA", color:C.success },
    MEDIA: { label:"Média", bg:"#FEF3C7", color:"#92400E" },
    ALTA: { label:"Alta", bg:"#FFEDD5", color:"#C2410C" },
    CRITICA: { label:"Crítica", bg:"#FEE2E2", color:C.danger },
  };
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); }
    catch { return []; }
  });
  const [show, setShow] = useState(false);
  const [filter, setFilter] = useState("TODOS");
  const today = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({
    titulo:"",
    tipo:"VISITA",
    data:today,
    hora:"09:00",
    condominioId:"",
    condominio:"",
    local:"",
    prioridade:"MEDIA",
    descricao:"",
    status:"PENDENTE",
  });
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const meta = tipo => tipos.find(t=>t.id===tipo) || tipos[0];
  const dateBr = d => d ? d.split("-").reverse().join("/") : "-";
  const sorted = [...items].sort((a,b)=>`${a.data || ""} ${a.hora || ""}`.localeCompare(`${b.data || ""} ${b.hora || ""}`));
  const visible = sorted.filter(i=>filter==="TODOS" || i.tipo===filter);
  const pending = items.filter(i=>i.status!=="CONCLUIDO");
  const todayItems = pending.filter(i=>i.data===today);
  const nextItem = sorted.find(i=>i.status!=="CONCLUIDO" && i.data>=today) || pending[0];

  function persist(next) {
    setItems(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }
  function resetForm() {
    setForm({ titulo:"", tipo:"VISITA", data:today, hora:"09:00", condominioId:"", condominio:"", local:"", prioridade:"MEDIA", descricao:"", status:"PENDENTE" });
  }
  function save() {
    if (!form.titulo.trim()) return toast("Informe o título do compromisso.","err");
    const condominioNome = condoLista.find(c=>c.id===form.condominioId)?.nome || form.condominio;
    const next = [{
      ...form,
      id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()),
      titulo: form.titulo.trim(),
      condominio: condominioNome,
      createdAt: new Date().toISOString(),
    }, ...items];
    persist(next);
    toast("Compromisso adicionado à agenda.","ok");
    resetForm();
    setShow(false);
  }
  function toggleDone(id) {
    persist(items.map(i=>i.id===id ? { ...i, status:i.status==="CONCLUIDO" ? "PENDENTE" : "CONCLUIDO" } : i));
    toast("Agenda atualizada.","ok");
  }
  function remove(id) {
    if (!confirm("Remover este compromisso da agenda do síndico?")) return;
    persist(items.filter(i=>i.id!==id));
    toast("Compromisso removido.","ok");
  }

  return (
    <div className="page">
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,marginBottom:22,flexWrap:"wrap"}}>
        <div>
          <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:24,fontWeight:800,color:C.primary}}>Agenda do Síndico</h1>
          <p style={{fontSize:14,color:C.muted,marginTop:5}}>Organize visitas em condomínios, reuniões, vistorias, estudos, eventos e tarefas da rotina administrativa.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>setShow(true)}><Ic n="plus" s={14} /> Novo compromisso</button>
      </div>

      <div className="card" style={{padding:18,marginBottom:20,background:"linear-gradient(135deg,#00150B,#003B24 68%,#0A5C33)",color:"#fff",overflow:"hidden",position:"relative"}}>
        <div style={{position:"absolute",right:24,top:14,fontSize:64,opacity:.12}}>Agenda</div>
        <div style={{display:"grid",gridTemplateColumns:"1.4fr repeat(4, minmax(120px,1fr))",gap:14,alignItems:"stretch"}}>
          <div style={{position:"relative",zIndex:1}}>
            <div style={{fontSize:12,fontWeight:800,letterSpacing:1,textTransform:"uppercase",color:"#A7F3D0"}}>Próximo compromisso</div>
            <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:20,marginTop:8,marginBottom:6}}>{nextItem?.titulo || "Agenda livre"}</h2>
            <div style={{fontSize:13,color:"rgba(255,255,255,.78)"}}>
              {nextItem ? `${dateBr(nextItem.data)} às ${nextItem.hora || "--:--"}${nextItem.condominio ? ` · ${nextItem.condominio}` : ""}` : "Cadastre visitas, eventos e estudos para acompanhar sua rotina."}
            </div>
          </div>
          {[
            ["Hoje", todayItems.length, "cal", C.accent],
            ["Pendentes", pending.length, "alert", C.warning],
            ["Visitas", items.filter(i=>i.tipo==="VISITA").length, "building", C.primary],
            ["Concluídos", items.filter(i=>i.status==="CONCLUIDO").length, "check", C.success],
          ].map(s=>(
            <div key={s[0]} style={{background:"rgba(255,255,255,.10)",border:"1px solid rgba(255,255,255,.14)",borderRadius:16,padding:14,position:"relative",zIndex:1}}>
              <div style={{width:34,height:34,borderRadius:12,background:"rgba(255,255,255,.14)",display:"flex",alignItems:"center",justifyContent:"center",color:s[3],marginBottom:12}}><Ic n={s[2]} s={17} /></div>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:26,fontWeight:800,lineHeight:1}}>{s[1]}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.70)",marginTop:4}}>{s[0]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{padding:16,marginBottom:18,display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:38,height:38,borderRadius:13,background:"#DCFCE7",display:"flex",alignItems:"center",justifyContent:"center",color:C.primary}}><Ic n="cal" s={18} /></div>
          <div>
            <div style={{fontWeight:800}}>Rotina do síndico</div>
            <div style={{fontSize:12,color:C.muted}}>Filtre por tipo de compromisso e acompanhe o que precisa de ação.</div>
          </div>
        </div>
        <div style={{minWidth:220}}>
          <select value={filter} onChange={e=>setFilter(e.target.value)}>
            <option value="TODOS">Todos os compromissos</option>
            {tipos.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
        {visible.map(item=>{
          const t = meta(item.tipo);
          const p = prioridade[item.prioridade] || prioridade.MEDIA;
          const done = item.status === "CONCLUIDO";
          return (
            <div key={item.id} className="card" style={{padding:16,borderLeft:`4px solid ${done ? C.success : t.color}`,opacity:done ? .78 : 1}}>
              <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{width:42,height:42,borderRadius:14,background:"#DCFCE7",display:"flex",alignItems:"center",justifyContent:"center",color:C.primary,flexShrink:0}}><Ic n={t.icon} s={19} /></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                    <div>
                      <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:800,lineHeight:1.25,textDecoration:done?"line-through":"none"}}>{item.titulo}</h3>
                      <div style={{fontSize:12,color:C.muted,marginTop:4}}>{t.label}</div>
                    </div>
                    <span className={`badge ${done ? "bd-done" : "bd-pend"}`}>{done ? "Concluído" : "Pendente"}</span>
                  </div>
                  <div style={{display:"grid",gap:5,marginTop:12,fontSize:13,color:C.muted}}>
                    <span><strong style={{color:C.text}}>Data:</strong> {dateBr(item.data)} às {item.hora || "--:--"}</span>
                    {(item.condominio || item.local) && <span><strong style={{color:C.text}}>Local:</strong> {[item.condominio, item.local].filter(Boolean).join(" · ")}</span>}
                    {item.descricao && <span style={{lineHeight:1.4}}>{item.descricao}</span>}
                  </div>
                  <div style={{display:"flex",gap:7,alignItems:"center",justifyContent:"space-between",marginTop:14,flexWrap:"wrap"}}>
                    <span style={{background:p.bg,color:p.color,borderRadius:999,padding:"5px 10px",fontSize:12,fontWeight:800}}>{p.label}</span>
                    <div style={{display:"flex",gap:7}}>
                      <button className="btn btn-ghost btn-xs" onClick={()=>toggleDone(item.id)}>{done ? "Reabrir" : "Concluir"}</button>
                      <button className="btn btn-danger btn-xs" onClick={()=>remove(item.id)}>Remover</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!visible.length && (
        <div className="card" style={{padding:36,textAlign:"center",color:C.muted}}>
          <div style={{fontSize:34,marginBottom:10}}>Calendário</div>
          <strong style={{display:"block",color:C.text,marginBottom:4}}>Nenhum compromisso encontrado</strong>
          Cadastre visitas, estudos, eventos ou tarefas para organizar sua rotina.
        </div>
      )}

      {show && (
        <Modal title="Novo compromisso na agenda" onClose={()=>setShow(false)}>
          <div className="fg"><label>Título</label><input value={form.titulo} onChange={f("titulo")} placeholder="Ex.: Visita técnica no Alpha Residence" /></div>
          <div className="row2">
            <div className="fg"><label>Tipo</label><select value={form.tipo} onChange={f("tipo")}>{tipos.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
            <div className="fg"><label>Prioridade</label><select value={form.prioridade} onChange={f("prioridade")}>{Object.entries(prioridade).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
          </div>
          <div className="row2">
            <div className="fg"><label>Data</label><input type="date" value={form.data} onChange={f("data")} /></div>
            <div className="fg"><label>Horário</label><input type="time" value={form.hora} onChange={f("hora")} /></div>
          </div>
          <div className="fg"><label>Condomínio/edificação</label><select value={form.condominioId} onChange={f("condominioId")}><option value="">Sem condomínio específico</option>{condoLista.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          <div className="fg"><label>Local</label><input value={form.local} onChange={f("local")} placeholder="Ex.: Torre A, sala de reuniões, visita externa" /></div>
          <div className="fg"><label>Descrição</label><textarea rows={3} value={form.descricao} onChange={f("descricao")} placeholder="Notas, objetivo, pauta ou materiais de estudo" /></div>
          <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShow(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={save}>Salvar compromisso</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function WhatsAppPage({ toast }) {
  const { data: stats } = useFetch("/whatsapp/stats");
  const { data: logs,  reload: reloadLogs } = useFetch("/whatsapp/logs");
  const { data: cfg, reload: reloadCfg } = useFetch("/whatsapp/config");
  const [form, setForm] = useState({ apiUrl:"https://api.z-api.io", apiKey:"", instanceId:"", ativo:false, notifChamadoAberto:true, notifChamadoAtualizado:true, notifChamadoConcluido:true, notifManutencaoVencendo:true, notifComunicados:false });
  const [testNum, setTestNum] = useState("");
  const [msg, setMsg] = useState(""); const [dest, setDest] = useState("todos");
  const logsLista = asList(logs);

  useEffect(() => { if (cfg) setForm(p=>({...p,...cfg,apiKey:""})); }, [cfg]);
  const tog = k => () => setForm(p=>({...p,[k]:!p[k]}));

  async function salvar() {
    try { await api.post("/whatsapp/config", form); toast("Config salva!","ok"); reloadCfg(); }
    catch(e){ toast(e.message,"err"); }
  }
  async function testar() {
    if (!testNum) return;
    try { const r = await api.post("/whatsapp/testar",{numero:testNum}); toast(r.ok?"Teste enviado!":"Falhou: "+r.motivo, r.ok?"ok":"err"); }
    catch(e){ toast(e.message,"err"); }
  }
  async function enviar() {
    if (!msg) return;
    try { const r = await api.post("/whatsapp/enviar",{mensagem:msg,destinatario:dest}); toast(`Enviado ${r.enviados}/${r.total}`,"ok"); setMsg(""); reloadLogs(); }
    catch(e){ toast(e.message,"err"); }
  }

  return (
    <div className="page">
      <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:700,marginBottom:20}}>Integração WhatsApp</h1>
      {stats && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:13,marginBottom:20}}>
          {[{l:"Enviados",v:stats.enviados,c:C.success},{l:"Falhas",v:stats.falhas,c:C.danger},{l:"Hoje",v:stats.hoje,c:C.accent},{l:"Pendentes",v:stats.pendentes,c:C.warning}].map((s,i)=>(
            <div key={i} className="stat"><div className="stat-n" style={{color:s.c,fontSize:26}}>{s.v}</div><div className="stat-l">{s.l}</div></div>
          ))}
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18}}>
        <div className="card" style={{padding:22}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700}}>Configuração Z-API</h3>
            <div className="toggle" style={{background:form.ativo?C.success:"#DDE7DE"}} onClick={tog("ativo")}><div className="toggle-dot" style={{left:form.ativo?20:2}} /></div>
          </div>
          {[{l:"URL da API",k:"apiUrl",ph:"https://api.z-api.io"},{l:"API Key",k:"apiKey",ph:"••••••••"},{l:"Instance ID",k:"instanceId",ph:"Sua instância"}].map(f2=>(
            <div key={f2.k} className="fg"><label>{f2.l}</label><input value={form[f2.k]} onChange={e=>setForm(p=>({...p,[f2.k]:e.target.value}))} placeholder={f2.ph} /></div>
          ))}
          <button className="btn btn-primary btn-sm" style={{width:"100%",justifyContent:"center",marginBottom:12}} onClick={salvar}>Salvar Configuração</button>
          <hr style={{border:"none",borderTop:`1px solid ${C.border}`,margin:"10px 0"}} />
          <div style={{display:"flex",gap:8}}>
            <input value={testNum} onChange={e=>setTestNum(e.target.value)} placeholder="5585999990001" style={{fontSize:13}} />
            <button className="btn btn-sm" style={{background:"#25d366",color:"#fff",borderRadius:8,flexShrink:0}} onClick={testar}>Testar</button>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="card" style={{padding:22}}>
            <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,marginBottom:10}}>Disparos Automáticos</h3>
            {[["notifChamadoAberto","Chamado aberto"],["notifChamadoAtualizado","Chamado em análise"],["notifChamadoConcluido","Chamado concluído"],["notifManutencaoVencendo","Manutenção vencendo"],["notifComunicados","Comunicados gerais"]].map(([k,l])=>(
              <Toggle key={k} on={form[k]} onChange={tog(k)} label={l} />
            ))}
          </div>
          <div className="card" style={{padding:22}}>
            <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,marginBottom:10}}>Envio Manual</h3>
            <div className="fg"><select value={dest} onChange={e=>setDest(e.target.value)}><option value="todos">Todos os moradores</option><option value="bloco:A">Bloco A</option><option value="bloco:B">Bloco B</option><option value="bloco:C">Bloco C</option></select></div>
            <div className="fg"><textarea rows={3} value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Digite a mensagem…" /></div>
            <button className="btn btn-sm" style={{width:"100%",justifyContent:"center",background:"#25d366",color:"#fff",borderRadius:9}} onClick={enviar} disabled={!msg}><Ic n="wa" s={15} c="#fff" /> Enviar</button>
          </div>
        </div>
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`}}><h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:700}}>Histórico de Envios</h3></div>
        {logsLista.slice(0,8).map((l,i)=>(
          <div key={l.id} style={{padding:"12px 18px",display:"flex",alignItems:"center",gap:12,borderBottom:i<7?`1px solid #EEF6EF`:"none"}}>
            <div style={{width:32,height:32,borderRadius:8,background:l.status==="ENVIADO"?"#dcfce7":"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center"}}>{l.status==="ENVIADO"?"✅":"❌"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{l.mensagem.slice(0,55)}…</div>
              <div style={{fontSize:12,color:C.muted}}>{l.destinatario}</div>
            </div>
            <div style={{fontSize:12,color:C.muted,whiteSpace:"nowrap"}}>{fmt.ago(l.createdAt)}</div>
            <Bdg s={l.status} />
          </div>
        ))}
        {!logsLista.length && <p style={{textAlign:"center",padding:28,color:C.muted,fontSize:13}}>Sem histórico</p>}
      </div>
    </div>
  );
}

// ─── INVENTÁRIO ───────────────────────────────────────────────
function InventarioPage({ toast }) {
  const { data, loading, reload } = useFetch("/inventario");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ nome:"", codigo:"", categoria:"", status:"Operacional" });
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const inventario = asList(data);

  async function save() {
    try { await api.post("/inventario", form); toast("Item criado!","ok"); setShow(false); reload(); }
    catch(e){ toast(e.message,"err"); }
  }

  return (
    <div className="page">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
        <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:700}}>Inventário</h1>
        <button className="btn btn-primary btn-sm" onClick={()=>setShow(true)}><Ic n="plus" s={14} /> Novo Item</button>
      </div>
      {loading ? <Spinner /> : (
        <div className="card" style={{overflow:"hidden"}}>
          <table className="table">
            <thead><tr><th>Nome</th><th>Código</th><th>Categoria</th><th>Status</th><th>Aquisição</th><th>Manutenções</th></tr></thead>
            <tbody>{inventario.map(i=>(
              <tr key={i.id}>
                <td style={{fontWeight:500}}>{i.nome}</td>
                <td><code style={{background:"#EEF6EF",padding:"2px 7px",borderRadius:5,fontSize:11}}>{i.codigo}</code></td>
                <td><span className="badge bd-info">{i.categoria}</span></td>
                <td><Bdg s={i.status} /></td>
                <td style={{fontSize:13,color:C.muted}}>{fmt.date(i.dataAquisicao)}</td>
                <td style={{fontSize:13,color:C.muted}}>{i._count?.manutencoes||0} reg.</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {show && (
        <Modal title="Novo Item" onClose={()=>setShow(false)}>
          <div className="row2">
            <div className="fg"><label>Nome</label><input value={form.nome} onChange={f("nome")} /></div>
            <div className="fg"><label>Código</label><input value={form.codigo} onChange={f("codigo")} placeholder="EQ-006" /></div>
          </div>
          <div className="row2">
            <div className="fg"><label>Categoria</label><input value={form.categoria} onChange={f("categoria")} placeholder="Hidráulico" /></div>
            <div className="fg"><label>Status</label><select value={form.status} onChange={f("status")}><option>Operacional</option><option>Manutenção</option><option>Inativo</option></select></div>
          </div>
          <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShow(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={!form.nome}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── USUÁRIOS ─────────────────────────────────────────────────
function UsuariosPage({ toast }) {
  const { data, loading, reload } = useFetch("/auth/users");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ nome:"", email:"", role:"MORADOR", unidade:"", bloco:"" });
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const usuarios = asList(data);

  async function save() {
    try { await api.post("/auth/users", form); toast("Usuário criado!","ok"); setShow(false); reload(); }
    catch(e){ toast(e.message,"err"); }
  }

  return (
    <div className="page">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
        <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:700}}>Controle de Usuários</h1>
        <button className="btn btn-primary btn-sm" onClick={()=>setShow(true)}><Ic n="plus" s={14} /> Novo Usuário</button>
      </div>
      {loading ? <Spinner /> : (
        <div className="card" style={{overflow:"hidden"}}>
          <table className="table">
            <thead><tr><th>Nome</th><th>Perfil</th><th>Unidade</th><th>Email</th><th>Status</th></tr></thead>
            <tbody>{usuarios.map(u=>(
              <tr key={u.id}>
                <td><div style={{display:"flex",alignItems:"center",gap:9}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:`hsl(${u.id.charCodeAt(0)*4%360},55%,60%)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:700}}>{u.nome[0]}</div>
                  <span style={{fontWeight:500}}>{u.nome}</span>
                </div></td>
                <td><span className={`badge ${u.role==="ADMIN"?"bd-dang":u.role==="SINDICO"?"bd-pend":"bd-info"}`}>{u.role}</span></td>
                <td style={{fontSize:13}}>{u.unidade||"—"} {u.bloco}</td>
                <td style={{fontSize:13,color:C.muted}}>{u.email}</td>
                <td><Bdg s={u.ativo?"Ativo":"Inativo"} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {show && (
        <Modal title="Novo Usuário" onClose={()=>setShow(false)}>
          <div className="row2">
            <div className="fg"><label>Nome</label><input value={form.nome} onChange={f("nome")} /></div>
            <div className="fg"><label>Perfil</label><select value={form.role} onChange={f("role")}><option value="MORADOR">Morador</option><option value="SINDICO">Síndico</option><option value="ADMIN">Admin</option></select></div>
          </div>
          <div className="fg"><label>Email</label><input type="email" value={form.email} onChange={f("email")} /></div>
          <div className="row2">
            <div className="fg"><label>Unidade</label><input value={form.unidade} onChange={f("unidade")} placeholder="Ap. 204" /></div>
            <div className="fg"><label>Bloco</label><input value={form.bloco} onChange={f("bloco")} placeholder="Bloco A" /></div>
          </div>
          <div style={{fontSize:12,color:C.muted,background:"#F2FAF1",border:`1px solid ${C.border}`,borderRadius:10,padding:10,marginBottom:14}}>A senha será definida posteriormente por convite, link, WhatsApp ou redefinição.</div>
          <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShow(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={!form.nome||!form.email}>Criar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── RELATÓRIOS ───────────────────────────────────────────────
function RelatoriosPage({ toast }) {
  const [de, setDe] = useState(""); const [ate, setAte] = useState("");
  const [edificacaoId, setEdificacaoId] = useState("all");
  const [categoria, setCategoria] = useState("all");
  const [busy, setBusy] = useState(null);
  const { data: filterData } = useFetch("/dashboard");
  const condominios = filterData?.filters?.condominios || [];
  const categorias = filterData?.filters?.categorias || [{ value:"all", label:"Todas as categorias" }];

  async function abrir(ep, extra={}) {
    setBusy(ep);
    try {
      const qs = new URLSearchParams({...extra,edificacaoId,categoria,...(de?{de}:{}),...(ate?{ate}:{})}).toString();
      const token = localStorage.getItem("tnm_token");
      const res = await fetch(`${BASE}/relatorios/${ep}?${qs}`,{headers:{Authorization:`Bearer ${token}`}});
      if (!res.ok) throw new Error("Erro ao gerar relatório");
      const html = await res.text();
      const w = window.open("","_blank");
      w.document.write(html); w.document.close();
      setTimeout(()=>w.print(),600);
    } catch(e){ toast(e.message,"err"); }
    finally { setBusy(null); }
  }

  const rels = [
    {id:"manutencoes",ic:"🔧",t:"Manutenções",d:"Histórico com status, responsáveis e vencimentos"},
    {id:"chamados",   ic:"💬",t:"Chamados",   d:"Atendimentos por categoria e tempo de resposta"},
    {id:"financeiro", ic:"💰",t:"Financeiro", d:"Arrecadação, inadimplência e pagamentos do mês"},
    {id:"inventario", ic:"📦",t:"Inventário", d:"Equipamentos e histórico de manutenções"},
    {id:"moradores",  ic:"👥",t:"Moradores",  d:"Lista completa com unidades e status"},
  ];

  return (
    <div className="page">
      <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:700,marginBottom:6}}>Relatórios</h1>
      <p style={{color:C.muted,fontSize:13,marginBottom:20}}>Gera HTML para impressão ou exportação PDF pelo navegador.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10,alignItems:"end",background:"#fff",borderRadius:11,padding:14,border:`1px solid ${C.border}`,marginBottom:22}}>
        <div>
          <label>Edificação</label>
          <select value={edificacaoId} onChange={e=>setEdificacaoId(e.target.value)} style={{padding:"7px 11px",borderRadius:8,fontSize:13}}>
            <option value="all">Todas as edificações</option>
            {condominios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label>Categoria</label>
          <select value={categoria} onChange={e=>setCategoria(e.target.value)} style={{padding:"7px 11px",borderRadius:8,fontSize:13}}>
            {categorias.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label>Data inicial</label>
          <input type="date" value={de} onChange={e=>setDe(e.target.value)} style={{padding:"7px 11px",borderRadius:8,fontSize:13}} />
        </div>
        <div>
          <label>Data final</label>
          <input type="date" value={ate} onChange={e=>setAte(e.target.value)} style={{padding:"7px 11px",borderRadius:8,fontSize:13}} />
        </div>
        <button onClick={()=>{setDe("");setAte("");setEdificacaoId("all");setCategoria("all");}} style={{padding:"9px 13px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"transparent",fontSize:13,cursor:"pointer",color:C.muted}}>Limpar</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:15}}>
        {rels.map(r=>(
          <div key={r.id} className="card" style={{padding:22}}>
            <div style={{fontSize:34,marginBottom:10}}>{r.ic}</div>
            <h3 style={{fontSize:14,fontWeight:700,marginBottom:5}}>{r.t}</h3>
            <p style={{fontSize:13,color:C.muted,lineHeight:1.5,marginBottom:16}}>{r.d}</p>
            <button className="btn btn-primary btn-sm" style={{width:"100%",justifyContent:"center"}} onClick={()=>abrir(r.id)} disabled={busy===r.id}>
              {busy===r.id?"Gerando…":"📄 Gerar PDF"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PORTAL DO MORADOR ────────────────────────────────────────
function PublicPortalMoradorLegacy({ token }) {
  const [tab, setTab] = useState("home");
  const { data, loading } = useFetch(token ? `/portal/${token}` : null, [token]);
  const [slide, setSlide] = useState(0);
  const fmtSize = b => b>1e6?(b/1e6).toFixed(1)+" MB":Math.round((b || 0)/1000)+" KB";
  const cfg = data?.config || {};
  const feat = cfg.funcionalidades || {};
  const info = cfg.informacoes || {};
  const banners = data?.banners || [];
  const comunicados = data?.comunicados || [];
  const documentos = data?.documentos || [];
  const responsaveis = data?.responsaveis || [];
  const manutencoes = data?.manutencoesPrevistas || [];
  const portalLogo = logoSource(data?.condominio);
  useEffect(()=>{ if(!banners.length)return; const t=setInterval(()=>setSlide(s=>(s+1)%banners.length),4000); return()=>clearInterval(t); },[banners.length]);

  if (loading) return <div style={{maxWidth:420,margin:"0 auto",minHeight:"100vh",background:C.surface,paddingTop:80}}><Spinner /></div>;
  if (!data) return <div style={{maxWidth:420,margin:"0 auto",minHeight:"100vh",background:C.surface,padding:24}}><div className="card" style={{padding:20,textAlign:"center"}}><h2 style={{fontFamily:"'Sora',sans-serif",fontSize:18}}>Portal indisponivel</h2><p style={{fontSize:13,color:C.muted,marginTop:8}}>O link pode estar inativo ou a configuracao ainda nao foi salva.</p></div></div>;

  const nav = [
    ["home","home","Inicio",true],
    ["docs","doc","Docs",feat.documentos],
    ["comunicados","bell","Avisos",feat.comunicados],
    ["manut","wrench","Plano",feat.planoManutencao],
    ["contatos","users","Contatos",feat.contatosResponsaveis],
  ].filter(item => item[3]);

  return (
    <div style={{maxWidth:420,margin:"0 auto",minHeight:"100vh",background:C.surface}}>
      <div className="portal-hd">
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:18}}>
            <div style={{width:38,height:38,borderRadius:10,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,overflow:"hidden",border:"1px solid rgba(255,255,255,.18)"}}>
              {portalLogo ? <img src={portalLogo} alt={`Logo ${data.condominio?.nome || "Condominio"}`} style={{width:"100%",height:"100%",objectFit:"contain",background:"#fff",padding:4}} /> : <BrandMark size={38} radius={10} />}
            </div>
            <div><div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:13}}>{info.nome ? data.condominio?.nome : "Portal do Morador"}</div><div style={{fontSize:10,opacity:.75}}>Portal do Morador</div></div>
          </div>
          {info.nome && <div style={{fontFamily:"'Sora',sans-serif",fontSize:19,fontWeight:700}}>{data.condominio?.nome}</div>}
          {info.endereco && <div style={{fontSize:12,opacity:.8,marginTop:4}}>{data.condominio?.endereco} {data.condominio?.cidade ? `- ${data.condominio.cidade}/${data.condominio.estado || ""}` : ""}</div>}
        </div>
      </div>

      <div style={{padding:"18px 14px 76px"}}>
        {tab==="home" && (
          <div className="fadeIn">
            {banners.length>0 && (
              <div style={{marginBottom:18}}>
                {banners.map((b,i)=>(
                  <div key={b.id} className={`cslide ${i===slide?"on":""}`}>
                    <a href={b.link || undefined} target={b.link ? "_blank" : undefined} rel="noopener noreferrer" style={{height:138,borderRadius:14,display:"block",position:"relative",overflow:"hidden",textDecoration:"none",background:C.dark}}>
                      <img src={assetUrl(b.imagem)} alt={b.titulo} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />
                      <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,rgba(13,27,42,.78),rgba(13,27,42,.16))"}} />
                      <div style={{position:"absolute",left:16,right:16,bottom:14,color:"#fff"}}>
                        <div style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,lineHeight:1.25}}>{b.titulo}</div>
                        {b.descricao && <div style={{fontSize:12,opacity:.84,marginTop:3}}>{b.descricao}</div>}
                      </div>
                    </a>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"center",gap:5,marginTop:7}}>{banners.map((_,i)=><button key={i} className={`cdot ${i===slide?"on":""}`} onClick={()=>setSlide(i)} />)}</div>
              </div>
            )}
            {info.comunicadosRecentes && feat.comunicados && (
              <div className="card" style={{padding:18,marginBottom:12}}>
                <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:700,marginBottom:13}}>Comunicados recentes</h3>
                {comunicados.slice(0,3).map((c,i)=><div key={c.id} style={{display:"flex",gap:11,paddingBottom:11,marginBottom:11,borderBottom:i<2?`1px solid ${C.border}`:"none"}}><span style={{fontSize:18}}>{c.emoji || "Aviso"}</span><div><div style={{fontSize:13,fontWeight:600}}>{c.titulo}</div><div style={{fontSize:12,color:C.muted}}>{c.conteudo.slice(0,70)}</div></div></div>)}
                {!comunicados.length && <p style={{fontSize:13,color:C.muted}}>Nenhum comunicado publicado.</p>}
              </div>
            )}
            {info.manutencoesPrevistas && feat.planoManutencao && (
              <div className="card" style={{padding:18}}>
                <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:700,marginBottom:13}}>Manutencoes previstas</h3>
                {manutencoes.slice(0,3).map(m=><div key={m.id} style={{display:"flex",justifyContent:"space-between",gap:8,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:13,fontWeight:600}}>{m.titulo}</span><span style={{fontSize:12,color:C.muted}}>{fmt.date(m.dataVencimento)}</span></div>)}
                {!manutencoes.length && <p style={{fontSize:13,color:C.muted}}>Sem manutencoes proximas.</p>}
              </div>
            )}
          </div>
        )}
        {tab==="docs" && <div className="fadeIn"><h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,marginBottom:14}}>Documentos</h3>{documentos.map(d=><div key={d.id} className="card" style={{padding:13,marginBottom:9,display:"flex",alignItems:"center",gap:11}}><div style={{width:34,height:34,background:"#fee2e2",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#dc2626"}}>{d.tipoDocumento || d.tipo}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{d.titulo || d.nome}</div><div style={{fontSize:11,color:C.muted}}>{d.categoria || d.pasta} · {fmtSize(d.tamanho)}</div></div><a href={assetUrl(d.url)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs"><Ic n="dl" s={13} /></a></div>)}{!documentos.length && <p style={{fontSize:13,color:C.muted}}>Nenhum documento visivel no portal.</p>}</div>}
        {tab==="comunicados" && <div className="fadeIn"><h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,marginBottom:14}}>Comunicados</h3>{comunicados.map(c=><div key={c.id} className="card" style={{padding:15,marginBottom:10}}><div style={{display:"flex",gap:9,alignItems:"center",fontWeight:700,fontSize:13}}><span>{c.emoji || "Aviso"}</span>{c.titulo}</div><p style={{fontSize:12,color:C.muted,marginTop:8,lineHeight:1.45}}>{c.conteudo}</p></div>)}</div>}
        {tab==="manut" && <div className="fadeIn"><h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,marginBottom:14}}>Plano de manutencao</h3>{manutencoes.map(m=><div key={m.id} className="card" style={{padding:14,marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><strong style={{fontSize:13}}>{m.titulo}</strong><Bdg s={m.prioridade} /></div><div style={{fontSize:12,color:C.muted,marginTop:5}}>{fmt.date(m.dataVencimento)} · {m.responsavel || "Responsavel a definir"}</div></div>)}</div>}
        {tab==="contatos" && <div className="fadeIn"><h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,marginBottom:14}}>Contatos</h3>{responsaveis.map(r=><div key={r.id} className="card" style={{padding:14,marginBottom:9}}><strong style={{fontSize:13}}>{r.nome}</strong><div style={{fontSize:12,color:C.muted,marginTop:4}}>{info.email ? r.email : ""}</div>{info.telefones && <div style={{fontSize:12,color:C.muted}}>{r.telefone || r.whatsapp || "Telefone nao informado"}</div>}</div>)}</div>}
      </div>
      <nav className="pnav">{nav.map(([k,ic,lb])=><button key={k} className="pnav-btn" onClick={()=>setTab(k)}><Ic n={ic} s={20} c={tab===k?C.accent:C.muted} /><span style={{fontSize:10,color:tab===k?C.accent:C.muted,fontWeight:tab===k?600:400}}>{lb}</span></button>)}</nav>
    </div>
  );
}

function PublicPortalMorador({ token }) {
  const olive = "#556B2F";
  const soft = "#F4F6EF";
  const [tab, setTab] = useState("home");
  const { data, loading, reload } = useFetch(token ? `/portal/${token}` : null, [token]);
  const [slide, setSlide] = useState(0);
  const [ticket, setTicket] = useState({ categoria:"MANUTENCAO", local:"", descricao:"" });
  const [ticketFiles, setTicketFiles] = useState([]);
  const [ticketResult, setTicketResult] = useState(null);
  const [sendingTicket, setSendingTicket] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsgs, setAiMsgs] = useState([{ r:"ai", t:"Sou o assistente do portal. Posso ajudar com documentos, comunicados, manutenções públicas, chamados e contatos do condomínio." }]);
  const [notice, setNotice] = useState("");
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(null);
  const [visitorId] = useState(() => {
    const key = "tnm_portal_visitor";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const next = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, next);
    return next;
  });
  const [myVoiceIds, setMyVoiceIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tnm_portal_voice_ids") || "[]"); }
    catch { return []; }
  });
  const fmtSize = b => b>1e6?(b/1e6).toFixed(1)+" MB":Math.round((b || 0)/1000)+" KB";
  const cfg = data?.config || {};
  const feat = cfg.funcionalidades || {};
  const info = cfg.informacoes || {};
  const banners = data?.banners || [];
  const comunicados = data?.comunicados || [];
  const documentos = data?.documentos || [];
  const responsaveis = data?.responsaveis || [];
  const manutencoes = (data?.manutencoesPrevistas || []).slice().sort((a,b)=>new Date(a.data || 0)-new Date(b.data || 0));
  const vozes = data?.vozes || [];
  const portalLogo = logoSource(data?.condominio);
  const [logoFailed, setLogoFailed] = useState(false);
  useEffect(()=>{ if(!banners.length)return; const t=setInterval(()=>setSlide(s=>(s+1)%banners.length),4500); return()=>clearInterval(t); },[banners.length]);
  useEffect(()=>setLogoFailed(false), [portalLogo]);

  if (loading) return <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:soft,paddingTop:80}}><Spinner /></div>;
  if (!data) return <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:soft,padding:24}}><div className="card" style={{padding:20,textAlign:"center"}}><h2 style={{fontFamily:"'Sora',sans-serif",fontSize:18}}>Portal indisponível</h2><p style={{fontSize:13,color:C.muted,marginTop:8}}>O link pode estar inativo ou a configuração ainda não foi salva.</p></div></div>;

  const dark = "#02170C";
  const deep = "#053018";
  const neon = "#77DD3A";
  const aqua = "#4EC9F5";
  const gold = "#FFC53D";
  const paper = "#FFFFFF";
  const actionGreen = "#22c55e";
  const iconBg = "#dcfce7";
  const iconColor = "#166534";
  const safePortalLogo = portalLogo && !logoFailed;
  const clamp2 = { display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" };
  const clamp3 = { display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden" };
  const nav = [["home","home","Início",true],["comunicados","bell","Comunicados",feat.comunicados],["chamados","chat","Chamados",feat.abrirChamado],["docs","doc","Documentos",feat.documentos],["perfil","users","Perfil",true]].filter(i=>i[3]);
  const monthKey = item => new Date(item.data || item.dataPrevista || Date.now()).toLocaleDateString("pt-BR", { month:"long", year:"numeric" });
  const groupedManut = manutencoes.reduce((acc,item)=>{ const key = monthKey(item); acc[key] = [...(acc[key] || []), item]; return acc; }, {});
  const statusTone = status => status === "CONCLUIDA" ? C.success : status === "EM_ANDAMENTO" ? C.warning : status === "ATRASADA" ? C.danger : olive;
  const featuredMaintenance = manutencoes.find(m => m.status !== "CONCLUIDA") || manutencoes[0];
  const upcomingMaintenances = manutencoes.filter(m => m.status !== "CONCLUIDA").slice(0, 4);
  const latestComunicado = comunicados[0];
  const financeDocs = documentos.filter(d => /balanc|finance|prestacao|contas|receita|despesa|orcament/i.test(`${d.titulo || d.nome} ${d.categoria || d.pasta} ${d.tipoDocumento || d.tipo}`));
  const voiceHighlights = vozes.filter(v => v.destaqueSemana);
  const voiceSuggestions = vozes.filter(v => v.tipo === "SUGESTAO_MELHORIA");
  const voicePautas = vozes.filter(v => v.tipo === "PAUTA_ASSEMBLEIA");
  const voiceParceiros = vozes.filter(v => v.tipo === "PARCEIRO");
  const myVoiceItems = vozes.filter(v => myVoiceIds.includes(v.id));
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
  const monthOffset = firstDay.getDay();
  const calendarCells = [...Array(monthOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const wa = value => String(value || "").replace(/\D/g, "");
  const openWhats = value => { const number = wa(value); if (number) window.open(`https://wa.me/${number}`, "_blank", "noopener,noreferrer"); };
  const shortDate = value => value ? new Date(value).toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit" }) : "Data a definir";
  const scheduleText = item => {
    const date = item?.data || item?.dataPrevista;
    if (!date) return "Data e horário a definir";
    const parsed = new Date(date);
    const time = parsed.getHours() || parsed.getMinutes() ? ` às ${parsed.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" })}` : "";
    return `${shortDate(date)}${time}`;
  };
  const statusLabel = status => status === "EM_ANDAMENTO" ? "Em andamento" : status === "CONCLUIDA" ? "Concluída" : status === "ATRASADA" ? "Atrasada" : "Agendada";
  const maintenanceIcon = item => /hidraul|agua|bomba|reserv/i.test(`${item?.nome} ${item?.descricao}`) ? "water" : /eletric|energia|spda|gerador/i.test(`${item?.nome} ${item?.descricao}`) ? "alert" : "wrench";
  const maintenanceTone = () => ({ color:iconColor, bg:iconBg });
  const hasMaintenanceOnDay = day => manutencoes.some(item => {
    const value = item.data || item.dataPrevista;
    if (!value) return false;
    const d = new Date(value);
    return d.getMonth() === firstDay.getMonth() && d.getFullYear() === firstDay.getFullYear() && d.getDate() === day;
  });
  const appCard = (label, description, icon, target, enabled = true, tone = olive) => enabled && (
    <button key={label} onClick={()=>setTab(target)} style={{width:"100%",minWidth:0,border:"1px solid rgba(12,55,20,.08)",background:paper,borderRadius:22,padding:16,textAlign:"left",boxShadow:"0 14px 34px rgba(1,23,12,.18), inset 0 1px 0 rgba(255,255,255,.9)",cursor:"pointer",minHeight:176,display:"flex",flexDirection:"column",justifyContent:"space-between",overflow:"hidden"}}>
      <div style={{width:52,height:52,borderRadius:20,background:iconBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ic n={icon} s={26} c={iconColor} /></div>
      <div style={{minWidth:0,marginTop:10}}>
        <div style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:900,lineHeight:1.14,color:"#0C140D",wordBreak:"normal",overflowWrap:"normal"}}>{label}</div>
        <div style={{fontSize:11,color:"#303A2E",lineHeight:1.32,marginTop:7,...clamp2}}>{description}</div>
      </div>
      <span className="portal-action" style={{width:30,height:30,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",marginTop:10,alignSelf:"center",flexShrink:0}}><Ic n="chev" s={14} c="#fff" /></span>
    </button>
  );
  function openBanner(b) {
    if (!b.link) return;
    if (b.link.startsWith("#")) return setTab(b.link.slice(1));
    window.open(b.link, "_blank", "noopener,noreferrer");
  }
  async function sendTicket() {
    if (!ticket.descricao.trim()) return setNotice("Descreva o chamado antes de enviar.");
    setSendingTicket(true);
    setNotice("");
    const fd = new FormData();
    Object.entries(ticket).forEach(([k,v])=>fd.append(k,v));
    ticketFiles.forEach(file => fd.append("fotos", file));
    try {
      const result = await api.post(`/portal/${token}/chamados`, fd);
      setTicketResult(result);
      setTicket({ categoria:"MANUTENCAO", local:"", descricao:"" });
      setTicketFiles([]);
      reload();
    } catch(e) { setNotice(e.message); }
    finally { setSendingTicket(false); }
  }
  async function refreshTicketStatus() {
    if (!ticketResult?.id) return;
    try {
      const current = await api.get(`/portal/${token}/chamados/${ticketResult.id}`);
      setTicketResult(prev => ({ ...prev, status: current.status, resposta: current.resposta }));
    } catch(e) {
      setNotice(e.message);
    }
  }
  async function sendAI() {
    const text = aiInput.trim();
    if (!text) return;
    setAiInput("");
    setAiMsgs(p=>[...p,{r:"u",t:text}]);
    setAiLoading(true);
    try {
      const result = await api.post(`/portal/${token}/ia`, { message:text });
      setAiMsgs(p=>[...p,{r:"ai",t:result.answer || "Não consegui responder agora."}]);
    } catch(e) {
      setAiMsgs(p=>[...p,{r:"ai",t:e.message || "Assistente indisponível no momento."}]);
    } finally { setAiLoading(false); }
  }
  async function openReport(item) {
    if (!item.relatorioDisponivel) return setNotice("Relatório não liberado para esta manutenção.");
    setReportLoading(true);
    setNotice("");
    try { setReport(await api.get(`/portal/${token}/manutencoes/${item.id}/report`)); }
    catch(e) { setNotice(e.message); }
    finally { setReportLoading(false); }
  }

  function markVoiceParticipation(id) {
    setMyVoiceIds(prev => {
      const next = prev.includes(id) ? prev : [...prev, id];
      localStorage.setItem("tnm_portal_voice_ids", JSON.stringify(next));
      return next;
    });
  }

  async function votePortalVoice(id) {
    setVoiceBusy(id);
    setNotice("");
    try {
      await api.post(`/portal/${token}/voz/${id}/votar`, { visitorId });
      markVoiceParticipation(id);
      reload();
    } catch(e) { setNotice(e.message); }
    finally { setVoiceBusy(null); }
  }

  async function commentPortalVoice(id) {
    const texto = window.prompt("Escreva seu comentario:");
    if (!texto) return;
    setVoiceBusy(id);
    setNotice("");
    try {
      await api.post(`/portal/${token}/voz/${id}/comentar`, { visitorId, texto });
      markVoiceParticipation(id);
      reload();
    } catch(e) { setNotice(e.message); }
    finally { setVoiceBusy(null); }
  }

  const voiceTypeLabel = value => value === "PAUTA_ASSEMBLEIA" ? "Pauta" : value === "PARCEIRO" ? "Parceiro" : "Sugestao";
  const voiceStatusLabel = value => ({
    ABERTA:"Aberta",
    EM_ANALISE:"Em analise",
    APROVADA:"Aprovada",
    REJEITADA:"Rejeitada",
    TRANSFORMADA_PAUTA:"Virou pauta",
    TRANSFORMADA_CHAMADO:"Encaminhada",
    ENCERRADA:"Encerrada",
  }[value] || value || "Aberta");
  const VoiceCard = ({ item }) => (
    <div className="card" style={{padding:15,marginBottom:10,borderRadius:18,borderLeft:item.destaqueSemana?`4px solid ${actionGreen}`:`1px solid ${C.border}`}}>
      <div style={{display:"flex",gap:11,alignItems:"flex-start"}}>
        <div style={{width:44,height:44,borderRadius:16,background:iconBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <Ic n={item.tipo === "PAUTA_ASSEMBLEIA" ? "doc" : item.tipo === "PARCEIRO" ? "users" : "thumb"} s={22} c={iconColor} />
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:5}}>
            <strong style={{fontSize:14,color:C.text}}>{item.titulo}</strong>
            {item.destaqueSemana && <span className="badge bd-pend">Destaque</span>}
          </div>
          <p style={{fontSize:12,color:C.muted,lineHeight:1.45,marginBottom:8,...clamp3}}>{item.descricao || "Sem descricao"}</p>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",fontSize:11}}>
            <span className="badge bd-info">{voiceTypeLabel(item.tipo)}</span>
            <span className="badge bd-done">{voiceStatusLabel(item.status)}</span>
            <span style={{color:C.muted}}>{item.totalVotos || item._count?.votos || 0} votos</span>
            <span style={{color:C.muted}}>{item.totalComentarios || item._count?.comentarios || 0} comentarios</span>
          </div>
        </div>
      </div>
      {item.comentarios?.length > 0 && <div style={{marginTop:10,background:"#F7FAF6",borderRadius:12,padding:9}}>{item.comentarios.slice(0,2).map(c=><div key={c.id} style={{fontSize:11,color:C.muted,marginBottom:4}}><strong style={{color:C.text}}>{c.autor?.nome || "Morador"}:</strong> {c.texto}</div>)}</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
        <button className="btn btn-primary btn-sm portal-action" style={{justifyContent:"center"}} onClick={()=>votePortalVoice(item.id)} disabled={voiceBusy===item.id}><Ic n="thumb" s={14} c="#fff" /> Votar</button>
        <button className="btn btn-ghost btn-sm" style={{justifyContent:"center"}} onClick={()=>commentPortalVoice(item.id)} disabled={voiceBusy===item.id}>Comentar</button>
      </div>
    </div>
  );
  const VoiceSection = ({ title, items }) => (
    <section style={{marginBottom:18}}>
      <h4 style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:900,marginBottom:10,color:"#fff"}}>{title}</h4>
      {items.map(item => <VoiceCard key={item.id} item={item} />)}
      {!items.length && <p style={{fontSize:13,color:"rgba(255,255,255,.72)"}}>Nada liberado nesta secao ainda.</p>}
    </section>
  );
  return (
    <div style={{width:"100%",maxWidth:430,margin:"0 auto",minHeight:"100vh",overflowX:"hidden",background:`linear-gradient(180deg,#001006 0%,${deep} 44%,#06150D 100%)`,color:"#fff"}}>
      <div style={{position:"relative",overflow:"hidden",minHeight:294,background:`linear-gradient(145deg,#001006 0%,${deep} 48%,#0B3B1B 72%,#06150D 100%)`,color:"#fff",padding:"24px 22px 34px",borderBottomLeftRadius:34,borderBottomRightRadius:34,boxShadow:"0 24px 50px rgba(0,0,0,.30)"}}>
        <div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(135deg,rgba(255,255,255,.08) 0,rgba(255,255,255,.08) 1px,transparent 1px,transparent 18px)",opacity:.16}} />
        <div style={{position:"absolute",left:-40,right:-40,bottom:0,height:2,background:`linear-gradient(90deg,transparent,${neon},transparent)`,opacity:.75}} />
        <div style={{position:"absolute",right:22,top:86,width:118,height:118,border:`1px solid ${neon}33`,borderRadius:28,transform:"rotate(18deg)",opacity:.5}} />
        <div style={{position:"absolute",right:18,bottom:18,width:144,height:112,opacity:.95}}>
          <div style={{position:"absolute",right:52,bottom:0,width:48,height:90,borderRadius:"8px 8px 2px 2px",background:"linear-gradient(180deg,#245D24,#0B3518)",boxShadow:"0 0 30px rgba(119,221,58,.24)"}}>{[10,30,50,70].map((top,i)=><span key={i} style={{position:"absolute",left:10,top,width:10,height:12,borderRadius:2,background:neon,boxShadow:`20px 0 0 ${neon}`}} />)}</div>
          <div style={{position:"absolute",right:5,bottom:0,width:42,height:70,borderRadius:"8px 8px 2px 2px",background:"linear-gradient(180deg,#2D6B28,#113F1C)"}}>{[12,34,56].map((top,i)=><span key={i} style={{position:"absolute",left:9,top,width:9,height:10,borderRadius:2,background:"#B7F45A",boxShadow:`17px 0 0 #B7F45A`}} />)}</div>
          <div style={{position:"absolute",left:0,bottom:0,width:76,height:22,borderRadius:"42px 42px 8px 8px",background:"rgba(80,151,43,.55)"}} />
        </div>
        <div style={{position:"relative",zIndex:1,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:22}}>
          <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
            <div style={{width:62,height:62,borderRadius:20,background:"rgba(255,255,255,.94)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",boxShadow:"0 16px 34px rgba(0,0,0,.22)"}}>
              {safePortalLogo ? <img src={safePortalLogo} alt={`Logo ${data.condominio?.nome || "Condomínio"}`} onError={()=>setLogoFailed(true)} style={{width:"100%",height:"100%",objectFit:"contain",padding:7}} /> : <span style={{fontFamily:"'Sora',sans-serif",fontWeight:900,color:olive,fontSize:18}}>{(data.condominio?.nome || "TNM").slice(0,3).toUpperCase()}</span>}
            </div>
            <div style={{minWidth:0}}>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:25,fontWeight:900,lineHeight:1,color:"#fff"}}>Tá na <span style={{color:neon}}>Mão</span></div>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",opacity:.9,marginTop:5}}>Gestão condominial</div>
              {info.nome && <div style={{fontSize:11,opacity:.72,marginTop:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:170}}>{data.condominio?.nome}</div>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button aria-label="Notificações" className="portal-action" onClick={()=>setTab("comunicados")} style={{position:"relative",width:42,height:42,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="bell" s={20} c="#fff" />{comunicados.length > 0 && <span style={{position:"absolute",right:-2,top:-3,width:20,height:20,borderRadius:"50%",background:neon,color:dark,fontSize:11,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{Math.min(comunicados.length,9)}</span>}</button>
            <button aria-label="Perfil" className="portal-action" onClick={()=>setTab("perfil")} style={{width:44,height:44,borderRadius:"50%",fontFamily:"'Sora',sans-serif",fontWeight:900,fontSize:15}}>{(data.condominio?.nome || "P").slice(0,2).toUpperCase()}</button>
          </div>
        </div>
        <div style={{position:"relative",zIndex:1,maxWidth:225}}>
          <div style={{fontFamily:"'Sora',sans-serif",fontSize:30,fontWeight:900,lineHeight:1.03,letterSpacing:0}}>Portal do Morador</div>
          <div style={{fontSize:15,opacity:.96,lineHeight:1.45,marginTop:10}}>Tudo do seu condomínio, na palma da sua mão.</div>
        </div>
      </div>

      <div style={{padding:"18px 14px 112px",marginTop:0}}>
        {notice && <div className="card" style={{padding:12,marginBottom:12,borderLeft:`4px solid ${olive}`,fontSize:13,color:C.muted}}>{notice}</div>}
        {tab==="home" && <div className="fadeIn">
          <button onClick={()=>featuredMaintenance ? openReport(featuredMaintenance) : setTab("manut")} style={{width:"100%",minHeight:132,border:`1px solid ${neon}88`,background:`linear-gradient(135deg,#073E1B,#0B5A24)`,color:"#fff",borderRadius:28,padding:16,display:"grid",gridTemplateColumns:"64px minmax(0,1fr) 30px",alignItems:"center",gap:13,textAlign:"left",boxShadow:"0 20px 46px rgba(0,0,0,.32)",marginTop:0,marginBottom:20}}>
            <div style={{width:62,height:62,borderRadius:"50%",background:"linear-gradient(145deg,#77DD3A,#0B6C28)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.28),0 12px 28px rgba(0,0,0,.2)"}}><Ic n="wrench" s={30} c="#fff" /></div>
            <div style={{minWidth:0}}>
              <span style={{display:"inline-flex",background:neon,color:dark,borderRadius:999,padding:"4px 12px",fontSize:11,fontWeight:900,letterSpacing:.5,marginBottom:8}}>ATENÇÃO</span>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:900,lineHeight:1.15}}>{featuredMaintenance?.nome || "Plano de manutenção"}</div>
              <div style={{fontSize:14,color:neon,fontWeight:900,marginTop:5}}>{featuredMaintenance ? scheduleText(featuredMaintenance) : "Sem manutenção agendada"}</div>
              <div style={{fontSize:12,opacity:.94,marginTop:5,lineHeight:1.35,...clamp2}}>{featuredMaintenance?.descricao || "Acompanhe as próximas rotinas da edificação."}</div>
            </div>
            <span className="portal-action" style={{width:30,height:30,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="chev" s={17} c="#fff" /></span>
          </button>

          {banners.length > 0 && <div style={{marginBottom:18}}>
            {banners.map((b,i)=><div key={b.id} className={`cslide ${i===slide?"on":""}`}><button onClick={()=>openBanner(b)} style={{width:"100%",height:122,borderRadius:22,border:"none",display:"block",position:"relative",overflow:"hidden",textAlign:"left",background:"#dfe5d2",cursor:b.link?"pointer":"default",boxShadow:"0 12px 30px rgba(1,23,12,.14)"}}><img src={assetUrl(b.imagem)} alt={b.titulo || "Banner"} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />{(b.titulo || b.descricao) && <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,rgba(1,23,12,.80),rgba(1,23,12,.12))"}} />}<div style={{position:"absolute",left:16,right:16,bottom:14,color:"#fff"}}>{b.titulo && <div style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:900,lineHeight:1.25}}>{b.titulo}</div>}{b.descricao && <div style={{fontSize:12,opacity:.9,marginTop:3}}>{b.descricao}</div>}</div></button></div>)}
            {banners.length > 1 && <div style={{display:"flex",justifyContent:"center",gap:5,marginTop:8}}>{banners.map((_,i)=><button key={i} className={`cdot ${i===slide?"on":""}`} onClick={()=>setSlide(i)} style={{background:i===slide?neon:"#cfd8c0"}} />)}</div>}
          </div>}

          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:16,marginBottom:20}}>
            {appCard("Transparência","Acompanhe receitas, despesas e relatórios.","shield","transparencia",feat.documentos,"#10811E")}
            {appCard("Calendário de Manutenções","Confira as próximas manutenções do condomínio.","cal","manut",feat.planoManutencao,"#0C7E26")}
            {appCard("Contatos Importantes","Telefones e contatos úteis do condomínio.","wa","contatos",feat.contatosResponsaveis,"#22A72F")}
            {appCard("Assistente IA","Tire dúvidas e receba informações rápidas.","ai","ia",feat.iaChat,"#087A3B")}
          </div>

          <div className="card" style={{borderRadius:24,padding:16,boxShadow:"0 14px 34px rgba(0,0,0,.22)",marginBottom:14,border:"1px solid rgba(255,255,255,.75)",background:"#fff"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:12}}>
              <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:900}}>Próximas Manutenções</h3>
              <button className="portal-pill" onClick={()=>setTab("manut")} style={{fontWeight:900,fontSize:13,display:"flex",alignItems:"center",gap:4}}>Ver todas <Ic n="chev" s={15} c="#fff" /></button>
            </div>
            {(upcomingMaintenances.length ? upcomingMaintenances : manutencoes.slice(0,3)).map(m => (
              <button key={m.id} onClick={()=>openReport(m)} style={{width:"100%",display:"grid",gridTemplateColumns:"52px minmax(0,1fr) 30px",gap:12,alignItems:"center",padding:"13px 0",border:"none",borderBottom:`1px solid ${C.border}`,background:"transparent",textAlign:"left",cursor:"pointer"}}>
                <div style={{width:50,height:50,borderRadius:18,background:maintenanceTone(m).bg,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"inset 0 1px 0 rgba(255,255,255,.9)"}}><Ic n={maintenanceIcon(m)} s={24} c={maintenanceTone(m).color} /></div>
                <div style={{minWidth:0}}><div style={{fontSize:14,fontWeight:900,color:"#10170E",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.nome}</div><div style={{display:"flex",alignItems:"center",gap:8,marginTop:2,flexWrap:"wrap"}}><span style={{fontSize:13,color:"#07831F",fontWeight:900}}>{scheduleText(m)}</span><span className="badge" style={{background:statusTone(m.status)+"18",color:statusTone(m.status),whiteSpace:"nowrap",fontSize:10,padding:"4px 8px"}}>{statusLabel(m.status)}</span></div><div style={{fontSize:12,color:C.muted,marginTop:3,lineHeight:1.35,...clamp2}}>{m.descricao || m.local || "Rotina programada do condomínio."}</div></div>
                <span className="portal-action" style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ic n="chev" s={15} c="#fff" /></span>
              </button>
            ))}
            {!manutencoes.length && <p style={{fontSize:13,color:C.muted}}>Nenhuma manutenção pública no período.</p>}
          </div>

          <div className="card" style={{borderRadius:24,padding:16,boxShadow:"0 14px 34px rgba(0,0,0,.22)",border:"1px solid rgba(255,255,255,.75)",background:"#fff"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:10}}>
              <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:900}}>Último comunicado</h3>
              <button className="portal-pill" onClick={()=>setTab("comunicados")} style={{fontWeight:900,fontSize:13,display:"flex",alignItems:"center",gap:4}}>Ver todos <Ic n="chev" s={15} c="#fff" /></button>
            </div>
            {latestComunicado ? <button onClick={()=>setTab("comunicados")} style={{width:"100%",border:"none",background:"transparent",display:"grid",gridTemplateColumns:"54px 1fr auto",gap:12,alignItems:"center",textAlign:"left",padding:0}}>
              <div style={{width:52,height:52,borderRadius:18,background:"#EEF9E8",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="doc" s={25} c="#16A02D" /></div>
              <div style={{minWidth:0}}><div style={{fontSize:14,fontWeight:900,color:"#10170E",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{latestComunicado.titulo}</div><div style={{fontSize:12,color:C.muted,marginTop:3}}>{fmt.date(latestComunicado.createdAt)}</div><div style={{fontSize:12,color:"#3C4537",lineHeight:1.35,marginTop:3,...clamp2}}>{latestComunicado.conteudo}</div></div>
              <span className="portal-action" style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="chev" s={15} c="#fff" /></span>
            </button> : <p style={{fontSize:13,color:C.muted}}>Nenhum comunicado ativo.</p>}
          </div>
        </div>}
        {tab==="manut" && <div className="fadeIn">
          <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:900,marginBottom:4}}>Calendário de Manutenções</h3>
          <p style={{fontSize:12,color:C.muted,marginBottom:14}}>Calendário mensal, lista por data e histórico público desde janeiro.</p>
          <div className="card" style={{borderRadius:24,padding:16,marginBottom:16,boxShadow:"0 14px 34px rgba(1,23,12,.10)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><strong style={{fontFamily:"'Sora',sans-serif",fontSize:15}}>{firstDay.toLocaleDateString("pt-BR", { month:"long", year:"numeric" })}</strong><span style={{fontSize:12,color:"#10811E",fontWeight:900}}>{manutencoes.length} itens</span></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,textAlign:"center",fontSize:10,color:C.muted,fontWeight:800,marginBottom:6}}>{["D","S","T","Q","Q","S","S"].map((d,i)=><span key={`${d}-${i}`}>{d}</span>)}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>
              {calendarCells.map((day,i)=><div key={`${day || "v"}-${i}`} style={{height:34,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:day?800:400,background:day && hasMaintenanceOnDay(day) ? "#E7F8DE" : day ? "#F7F8F4" : "transparent",color:day && hasMaintenanceOnDay(day) ? "#10811E" : "#34402F",border:day && hasMaintenanceOnDay(day) ? "1px solid #B9E6A8" : "1px solid transparent"}}>{day || ""}</div>)}
            </div>
          </div>
          {Object.entries(groupedManut).map(([month,items])=><div key={month} style={{marginBottom:16}}><h4 style={{fontSize:12,textTransform:"uppercase",letterSpacing:.8,color:olive,marginBottom:8}}>{month}</h4>{items.map(m=><button key={m.id} onClick={()=>openReport(m)} style={{width:"100%",border:`1px solid ${C.border}`,background:"#fff",borderRadius:18,padding:13,marginBottom:9,textAlign:"left",display:"grid",gridTemplateColumns:"52px 1fr auto",gap:11,alignItems:"center",cursor:"pointer",boxShadow:"0 8px 20px rgba(1,23,12,.06)"}}><div style={{width:50,height:50,borderRadius:17,background:maintenanceTone(m).bg,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"inset 0 1px 0 rgba(255,255,255,.9)"}}><Ic n={maintenanceIcon(m)} s={24} c={maintenanceTone(m).color} /></div><div><strong style={{fontSize:13}}>{m.nome}</strong><div style={{fontSize:12,color:C.muted,marginTop:4}}>{m.local || "Área comum"} · {m.responsavel || "Responsável a definir"}</div><div style={{fontSize:12,color:"#10811E",fontWeight:800}}>{scheduleText(m)}</div></div><span className="badge" style={{background:statusTone(m.status)+"18",color:statusTone(m.status)}}>{statusLabel(m.status)}</span></button>)}</div>)}{!manutencoes.length && <p style={{fontSize:13,color:C.muted}}>Nenhuma manutenção pública no período.</p>}</div>}
        {tab==="contatos" && <div className="fadeIn"><h3 style={{fontFamily:"'Sora',sans-serif",fontSize:18,marginBottom:14}}>Contatos / Colaboradores</h3>{responsaveis.map(r=><div key={r.id || r.nome} className="card" style={{padding:15,marginBottom:10,borderRadius:18}}><strong style={{fontSize:14}}>{r.nome}</strong><div style={{fontSize:12,color:C.muted,marginTop:3}}>{r.funcao || r.role || "Responsável"}</div>{info.telefones && <div style={{fontSize:12,color:C.muted,marginTop:6}}>{r.telefone || r.whatsapp || "Telefone não informado"}</div>}{info.email && r.email && <div style={{fontSize:12,color:C.muted}}>{r.email}</div>}<button className="btn btn-primary btn-sm portal-action" style={{marginTop:10}} onClick={()=>openWhats(r.whatsapp || r.telefone)} disabled={!wa(r.whatsapp || r.telefone)}>Chamar no WhatsApp</button></div>)}{!responsaveis.length && <p style={{fontSize:13,color:C.muted}}>Nenhum contato liberado para o portal.</p>}</div>}
        {tab==="comunicados" && <div className="fadeIn"><h3 style={{fontFamily:"'Sora',sans-serif",fontSize:18,marginBottom:14}}>Comunicados</h3>{comunicados.map(c=><div key={c.id} className="card" style={{padding:15,marginBottom:10,borderRadius:18,borderLeft:c.portalMeta?.fixado?`4px solid ${olive}`:`1px solid ${C.border}`}}><div style={{display:"flex",gap:9,alignItems:"center",fontWeight:800,fontSize:14}}><span>{c.emoji || "Aviso"}</span>{c.titulo}</div><div style={{fontSize:11,color:C.muted,marginTop:4}}>{fmt.date(c.createdAt)} {c.portalMeta?.fixado ? "· Fixado" : ""}</div><p style={{fontSize:13,color:C.muted,marginTop:8,lineHeight:1.45}}>{c.conteudo}</p></div>)}{!comunicados.length && <p style={{fontSize:13,color:C.muted}}>Nenhum comunicado ativo.</p>}</div>}
        {tab==="transparencia" && <div className="fadeIn"><h3 style={{fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:900,marginBottom:4}}>Transparência</h3><p style={{fontSize:12,color:C.muted,marginBottom:14}}>Documentos financeiros, balancetes e prestações de contas liberados para o morador.</p><div className="card" style={{borderRadius:24,padding:16,marginBottom:14,background:"#fff",boxShadow:"0 14px 34px rgba(1,23,12,.10)"}}><div style={{display:"flex",gap:12,alignItems:"center"}}><div style={{width:58,height:58,borderRadius:22,background:iconBg,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="money" s={28} c={iconColor} /></div><div><strong style={{fontFamily:"'Sora',sans-serif",fontSize:15}}>Assistente financeiro</strong><p style={{fontSize:12,color:C.muted,marginTop:4}}>Pergunte à IA sobre despesas, receitas, balancetes e possíveis divergências.</p></div></div><button className="btn btn-primary btn-sm portal-action" style={{marginTop:12,width:"100%",justifyContent:"center"}} onClick={()=>setTab("ia")}>Abrir Assistente IA</button></div>{(financeDocs.length ? financeDocs : documentos).map(d=><div key={d.id} className="card" style={{padding:13,marginBottom:9,display:"flex",alignItems:"center",gap:11,borderRadius:16}}><div style={{width:38,height:38,background:iconBg,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:iconColor}}>{d.tipoDocumento || d.tipo}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700}}>{d.titulo || d.nome}</div><div style={{fontSize:11,color:C.muted}}>{d.categoria || d.pasta} · {fmtSize(d.tamanho)}</div></div><a href={assetUrl(d.url)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs portal-action"><Ic n="dl" s={13} c="#fff" /></a></div>)}{!documentos.length && <p style={{fontSize:13,color:C.muted}}>Nenhum documento de transparência visível no portal.</p>}</div>}
        {tab==="docs" && <div className="fadeIn"><h3 style={{fontFamily:"'Sora',sans-serif",fontSize:18,marginBottom:14}}>Documentos</h3>{documentos.map(d=><div key={d.id} className="card" style={{padding:13,marginBottom:9,display:"flex",alignItems:"center",gap:11,borderRadius:16}}><div style={{width:38,height:38,background:iconBg,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:iconColor}}>{d.tipoDocumento || d.tipo}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700}}>{d.titulo || d.nome}</div><div style={{fontSize:11,color:C.muted}}>{d.categoria || d.pasta} · {fmtSize(d.tamanho)}</div></div><a href={assetUrl(d.url)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs portal-action"><Ic n="dl" s={13} c="#fff" /></a></div>)}{!documentos.length && <p style={{fontSize:13,color:C.muted}}>Nenhum documento visível no portal.</p>}</div>}
        {tab==="chamados" && <div className="fadeIn"><h3 style={{fontFamily:"'Sora',sans-serif",fontSize:18,marginBottom:14}}>Abrir chamado</h3>{ticketResult && <div className="card" style={{padding:14,marginBottom:12,borderLeft:`4px solid ${C.success}`}}><strong>Chamado enviado</strong><div style={{fontSize:13,color:C.muted}}>Protocolo: {ticketResult.protocolo} · Status: {ticketResult.status}</div>{ticketResult.resposta && <div style={{fontSize:13,color:C.muted,marginTop:6}}>Resposta: {ticketResult.resposta}</div>}<button className="btn btn-ghost btn-xs portal-pill" style={{marginTop:10}} onClick={refreshTicketStatus}>Atualizar acompanhamento</button></div>}<div className="card" style={{padding:16,borderRadius:18}}><div className="fg"><label>Categoria</label><select value={ticket.categoria} onChange={e=>setTicket(p=>({...p,categoria:e.target.value}))}><option value="MANUTENCAO">Manutenção</option><option value="RECLAMACAO">Reclamação</option><option value="SUGESTAO">Sugestão</option></select></div><div className="fg"><label>Local</label><input value={ticket.local} onChange={e=>setTicket(p=>({...p,local:e.target.value}))} placeholder="Ex: Garagem, bloco A, piscina" /></div><div className="fg"><label>Descrição</label><textarea rows={4} value={ticket.descricao} onChange={e=>setTicket(p=>({...p,descricao:e.target.value}))} /></div><div className="fg"><label>Fotos</label><input type="file" accept="image/*" multiple onChange={e=>setTicketFiles([...e.target.files])} /></div><button className="btn btn-primary portal-action" style={{width:"100%",justifyContent:"center"}} onClick={sendTicket} disabled={sendingTicket}>{sendingTicket ? "Enviando..." : "Enviar chamado"}</button></div></div>}
        {tab==="ia" && <div className="fadeIn"><h3 style={{fontFamily:"'Sora',sans-serif",fontSize:18,marginBottom:14}}>Assistente IA</h3><div className="card" style={{padding:14,borderRadius:18,marginBottom:12,maxHeight:420,overflowY:"auto"}}>{aiMsgs.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.r==="u"?"flex-end":"flex-start",marginBottom:9}}><div style={{maxWidth:"86%",background:m.r==="u"?actionGreen:soft,color:m.r==="u"?"#fff":C.text,borderRadius:14,padding:"9px 11px",fontSize:13,lineHeight:1.45}}>{m.t}</div></div>)}{aiLoading && <p style={{fontSize:12,color:C.muted}}>Pensando...</p>}</div><div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}><input value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendAI()} placeholder="Pergunte sobre documentos, regras ou manutenções" /><button className="btn btn-primary btn-sm portal-action" onClick={sendAI}>Enviar</button></div></div>}
        {tab==="voz" && <div className="fadeIn">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:14}}>
            <div><h3 style={{fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:900,color:"#fff"}}>Voz do Morador</h3><p style={{fontSize:12,color:"rgba(255,255,255,.72)",marginTop:3}}>Participacao, ideias e pautas liberadas pelo sindico.</p></div>
            <span className="portal-pill" style={{fontSize:12,fontWeight:900}}>{vozes.length} itens</span>
          </div>
          <VoiceSection title="Destaques da semana" items={voiceHighlights} />
          <VoiceSection title="Sugestoes abertas" items={voiceSuggestions} />
          <VoiceSection title="Pautas para assembleia" items={voicePautas} />
          <VoiceSection title="Parceiros sugeridos" items={voiceParceiros} />
          <VoiceSection title="Minhas participacoes" items={myVoiceItems} />
        </div>}        {tab==="perfil" && <div className="fadeIn"><h3 style={{fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:900,marginBottom:14,color:"#fff"}}>Perfil da edificação</h3><div className="card" style={{borderRadius:24,padding:18,marginBottom:14,boxShadow:"0 14px 34px rgba(0,0,0,.18)"}}><div style={{display:"flex",alignItems:"center",gap:12}}><div style={{width:58,height:58,borderRadius:20,background:iconBg,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>{safePortalLogo ? <img src={safePortalLogo} alt="Logo" onError={()=>setLogoFailed(true)} style={{width:"100%",height:"100%",objectFit:"contain",padding:6}} /> : <Ic n="building" s={28} c={iconColor} />}</div><div><strong style={{fontFamily:"'Sora',sans-serif",fontSize:16}}>{data.condominio?.nome}</strong><div style={{fontSize:12,color:C.muted,marginTop:3}}>{[data.condominio?.cidade, data.condominio?.estado].filter(Boolean).join(" / ") || "Condomínio"}</div></div></div>{info.endereco && <p style={{fontSize:13,color:C.muted,lineHeight:1.45,marginTop:14}}>{data.condominio?.endereco}</p>}{info.email && data.condominio?.email && <p style={{fontSize:13,color:C.muted,marginTop:6}}>{data.condominio.email}</p>}</div><div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12,marginBottom:14}}>{feat.iaChat && appCard("Assistente IA","Pergunte sobre documentos e regras.","ai","ia",true,"#087A3B")}{feat.vozMorador && appCard("Voz do Morador","Sugestões e votações públicas.","thumb","voz",true,"#10811E")}</div><h4 style={{fontFamily:"'Sora',sans-serif",fontSize:15,marginBottom:10,color:"#fff"}}>Contatos úteis</h4>{responsaveis.slice(0,4).map(r=><div key={r.id || r.nome} className="card" style={{padding:13,marginBottom:9,borderRadius:16,display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><div><strong style={{fontSize:13}}>{r.nome}</strong><div style={{fontSize:12,color:C.muted}}>{r.funcao || r.role || "Responsável"}</div></div><button className="btn btn-ghost btn-xs portal-action" onClick={()=>openWhats(r.whatsapp || r.telefone)} disabled={!wa(r.whatsapp || r.telefone)}>WhatsApp</button></div>)}{!responsaveis.length && <p style={{fontSize:13,color:"rgba(255,255,255,.75)"}}>Nenhum contato liberado para o portal.</p>}</div>}
      </div>
      {reportLoading && <div className="modal-overlay"><div className="card" style={{padding:22}}><Spinner /></div></div>}
      {report && <Modal title="Relatório da manutenção" onClose={()=>setReport(null)}><div><h3 style={{fontFamily:"'Sora',sans-serif",fontSize:16,marginBottom:6}}>{report.titulo}</h3><p style={{fontSize:13,color:C.muted,marginBottom:12}}>{report.local} · {fmt.date(report.dataExecutada)}</p><div style={{display:"grid",gap:8,fontSize:13,marginBottom:12}}><span><strong>Prestador:</strong> {report.prestador || "Não informado"}</span>{report.valor !== null && report.valor !== undefined && <span><strong>Valor:</strong> {fmt.money(report.valor)}</span>}<span><strong>Comentários:</strong> {report.comentarios || "Sem comentários"}</span></div>{report.fotos?.length > 0 && <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:12}}>{report.fotos.map((f,i)=><a key={i} href={assetUrl(f.fileUrl || f.url)} target="_blank" rel="noreferrer"><img src={assetUrl(f.fileUrl || f.url)} alt={f.fileName || "foto"} style={{width:"100%",height:112,objectFit:"cover",borderRadius:12}} /></a>)}</div>}{report.notaFiscal && <a className="btn btn-ghost btn-sm" href={assetUrl(report.notaFiscal.fileUrl || report.notaFiscal.url)} target="_blank" rel="noreferrer">Abrir nota fiscal</a>}{!report.fotos?.length && !report.notaFiscal && <p style={{fontSize:13,color:C.muted}}>Sem anexos liberados para visualização.</p>}</div></Modal>}
      <nav className="pnav" style={{borderTop:"none",borderTopLeftRadius:26,borderTopRightRadius:26,boxShadow:"0 -14px 34px rgba(1,23,12,.18)",padding:"10px 6px 14px"}}>{nav.map(([k,ic,lb])=><button key={k} className="pnav-btn" onClick={()=>setTab(k)} style={{position:"relative"}}>{tab===k && <span style={{position:"absolute",top:-10,width:52,height:4,borderRadius:999,background:actionGreen}} />}<span className={`portal-nav-icon ${tab===k ? "active" : ""}`}><Ic n={ic} s={19} c="currentColor" /></span><span style={{fontSize:10,color:tab===k?actionGreen:iconColor,fontWeight:tab===k?900:600}}>{lb}</span></button>)}</nav>
    </div>
  );
}

function PortalMorador({ user }) {
  const [tab, setTab] = useState("home");
  const { data: bans } = useFetch("/banners");
  const { data: comuns } = useFetch("/comunicados");
  const { data: cham, reload: rCham } = useFetch("/chamados");
  const { data: docs } = useFetch("/documentos");
  const { data: vozes, reload: rVoz } = useFetch("/voz");
  const [slide, setSlide] = useState(0);
  const [showT, setShowT] = useState(false);
  const [tf, setTf] = useState({ titulo:"", descricao:"", categoria:"MANUTENCAO" });
  const [chatIn, setChatIn] = useState("");
  const [chatLoad, setChatLoad] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([{ r:"ai", t:"Oi! Sou o assistente do condominio. Posso ajudar com chamados, documentos, comunicados, taxas e reservas." }]);
  const banners = asList(bans);
  const comunicados = asList(comuns);
  const chamados = asList(cham);
  const documentos = asList(docs);
  const sugestoes = asList(vozes);
  const activeBans = banners.filter(b=>b.ativo);
  useEffect(()=>{ if(!activeBans.length)return; const t=setInterval(()=>setSlide(s=>(s+1)%activeBans.length),4000); return()=>clearInterval(t); },[activeBans.length]);

  async function sendTicket() {
    try { await api.post("/chamados", tf); setShowT(false); rCham(); setTf({titulo:"",descricao:"",categoria:"MANUTENCAO"}); } catch{}
  }
  async function votar(id) {
    try { await api.post(`/voz/${id}/votar`); rVoz(); } catch {}
  }
  async function sendPortalAI() {
    if (!chatIn.trim()) return;
    const q = chatIn;
    setChatIn("");
    setChatMsgs(p=>[...p,{r:"u",t:q}]);
    setChatLoad(true);
    try {
      const d = await api.post("/ia/chat", { message:q, canal:"portal", history:toChatHistory(chatMsgs) });
      setChatMsgs(p=>[...p,{r:"ai",t:d.answer||"Nao consegui responder agora."}]);
    } catch {
      setChatMsgs(p=>[...p,{r:"ai",t:"Nao consegui conectar com a IA agora. Tente novamente em instantes."}]);
    }
    setChatLoad(false);
  }

  const fmtSize = b => b>1e6?(b/1e6).toFixed(1)+" MB":Math.round(b/1000)+" KB";

  return (
    <div style={{maxWidth:420,margin:"0 auto",minHeight:"100vh",background:C.surface}}>
      <div className="portal-hd">
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <BrandMark size={36} radius={10} />
              <div><div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:13}}>Residencial Horizonte</div><div style={{fontSize:10,opacity:.75}}>Portal do Morador</div></div>
            </div>
          </div>
          <div style={{fontFamily:"'Sora',sans-serif",fontSize:19,fontWeight:700}}>Portal do Morador</div>
          <div style={{fontSize:12,opacity:.8,marginTop:2}}>Tudo do seu condomínio, na palma da sua mão.</div>
        </div>
      </div>

      <div style={{padding:"18px 14px 76px"}}>
        {tab==="home" && (
          <div className="fadeIn">
            {activeBans.length>0 && (
              <div style={{marginBottom:20}}>
                {activeBans.map((b,i)=>(
                  <div key={b.id} className={`cslide ${i===slide?"on":""}`}>
                    <a href={b.link || undefined} target={b.link ? "_blank" : undefined} rel="noopener noreferrer" style={{height:128,borderRadius:14,display:"block",position:"relative",overflow:"hidden",textDecoration:"none",background:C.dark}}>
                      {b.imagem?.startsWith("/uploads/") || b.imagem?.startsWith("http")
                        ? <img src={assetUrl(b.imagem)} alt={b.titulo} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />
                        : null}
                      <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,rgba(13,27,42,.76),rgba(13,27,42,.14))"}} />
                      <div style={{position:"absolute",left:18,right:18,bottom:16,color:"#fff"}}>
                        <div style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,lineHeight:1.3}}>{b.titulo}</div>
                      </div>
                    </a>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"center",gap:5,marginTop:7}}>
                  {activeBans.map((_,i)=><button key={i} className={`cdot ${i===slide?"on":""}`} onClick={()=>setSlide(i)} />)}
                </div>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
              {[{ic:"ai",l:"Assistente IA",c:C.primary,fn:()=>setTab("chat")},{ic:"chat",l:"Abrir Chamado",c:C.accent,fn:()=>setShowT(true)},{ic:"doc",l:"Documentos",c:C.primary,fn:()=>setTab("docs")},{ic:"mic",l:"Minha Voz",c:C.success,fn:()=>setTab("voice")},{ic:"shield",l:"Não Se Cale",c:C.danger,fn:()=>setTab("denuncia")}].map((a,i)=>(
                <button key={i} className="card" style={{padding:15,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:11,background:"#fff"}} onClick={a.fn}>
                  <div style={{width:38,height:38,borderRadius:10,background:"#dcfce7",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n={a.ic} s={19} c="#166534" /></div>
                  <span style={{fontWeight:600,fontSize:13}}>{a.l}</span>
                </button>
              ))}
            </div>
            <div className="card" style={{padding:18}}>
              <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:700,marginBottom:13}}>Comunicados</h3>
              {comunicados.slice(0,3).map((c,i)=>(
                <div key={c.id} style={{display:"flex",gap:11,paddingBottom:11,marginBottom:11,borderBottom:i<2?`1px solid ${C.border}`:"none"}}>
                  <span style={{fontSize:20}}>{c.emoji||"📢"}</span>
                  <div><div style={{fontSize:13,fontWeight:600}}>{c.titulo}</div><div style={{fontSize:12,color:C.muted}}>{c.conteudo.slice(0,55)}…</div></div>
                </div>
              ))}
              {!comunicados.length && <p style={{fontSize:13,color:C.muted}}>Nenhum comunicado</p>}
            </div>
          </div>
        )}

        {tab==="chat" && (
          <div className="fadeIn">
            <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,marginBottom:14}}>Assistente IA</h3>
            <div className="card" style={{padding:14,marginBottom:12,minHeight:390,display:"flex",flexDirection:"column"}}>
              <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,paddingBottom:12}}>
                {chatMsgs.map((m,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:m.r==="u"?"flex-end":"flex-start"}}>
                    <div style={{maxWidth:"84%",padding:"11px 13px",borderRadius:m.r==="ai"?"14px 14px 14px 4px":"14px 14px 4px 14px",background:m.r==="ai"?"#fff":"#22c55e",border:m.r==="ai"?`1px solid ${C.border}`:"none",color:m.r==="ai"?C.text:"#fff",fontSize:13,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{m.t}</div>
                  </div>
                ))}
                {chatLoad && <div style={{alignSelf:"flex-start",padding:"10px 13px",borderRadius:14,background:"#fff",border:`1px solid ${C.border}`,display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:C.muted,animation:`spin ${.8+i*.2}s linear infinite`}} />)}</div>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 42px",gap:8,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
                <input value={chatIn} onChange={e=>setChatIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendPortalAI()} placeholder="Pergunte sobre chamados, taxas ou regras" />
                <button className="btn btn-primary portal-action" style={{padding:0,justifyContent:"center"}} onClick={sendPortalAI} disabled={chatLoad||!chatIn.trim()}><Ic n="send" s={16} c="#fff" /></button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {["Status do meu chamado","Tenho taxa pendente?","Quais documentos posso ver?","Como reservar um espaco?"].map(q=>(
                <button key={q} onClick={()=>setChatIn(q)} style={{border:`1px solid ${C.border}`,background:"#fff",borderRadius:10,padding:"9px 10px",fontSize:12,color:C.text,textAlign:"left",cursor:"pointer"}}>{q}</button>
              ))}
            </div>
          </div>
        )}

        {tab==="chamados" && (
          <div className="fadeIn">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700}}>Meus Chamados</h3>
              <button className="btn btn-primary btn-xs portal-action" onClick={()=>setShowT(true)}><Ic n="plus" s={13} c="#fff" /></button>
            </div>
            {chamados.map(c=>(
              <div key={c.id} className="card" style={{padding:14,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontWeight:600,fontSize:13}}>{c.titulo}</span><Bdg s={c.status} /></div>
                <div style={{fontSize:11,color:C.muted}}>{c.categoria} · {fmt.date(c.createdAt)}</div>
                {c.resposta && <div style={{marginTop:8,background:"#f0fdf4",borderRadius:8,padding:"8px 11px",fontSize:12,color:"#166534"}}>💬 {c.resposta}</div>}
              </div>
            ))}
            {!chamados.length && <p style={{textAlign:"center",padding:40,color:C.muted,fontSize:13}}>Nenhum chamado aberto</p>}
          </div>
        )}

        {tab==="docs" && (
          <div className="fadeIn">
            <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,marginBottom:14}}>Documentos Públicos</h3>
            {documentos.filter(d=>d.acesso==="PUBLICO").map(d=>(
              <div key={d.id} className="card" style={{padding:13,marginBottom:9,display:"flex",alignItems:"center",gap:11}}>
                <div style={{width:34,height:34,background:"#dcfce7",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#166534"}}>{d.tipo}</div>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{d.nome}</div><div style={{fontSize:11,color:C.muted}}>{d.pasta} · {fmtSize(d.tamanho||0)}</div></div>
                <a href={`https://ta-na-mao-1.onrender.com${d.url}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs portal-action"><Ic n="dl" s={13} c="#fff" /></a>
              </div>
            ))}
          </div>
        )}

        {tab==="voice" && (
          <div className="fadeIn">
            <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,marginBottom:14}}>🎙️ Voz do Morador</h3>
            {sugestoes.map(v=>(
              <div key={v.id} className="card" style={{padding:15,marginBottom:10}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:5}}>{v.titulo}</div>
                <div className="progress-bar" style={{marginBottom:8}}><div className="progress-fill" style={{width:`${Math.min(100,v.totalVotos*5)}%`,background:"#22c55e"}} /></div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:C.muted}}>{v.totalVotos} apoios</span>
                  <button onClick={()=>votar(v.id)} className="portal-pill" style={{display:"flex",alignItems:"center",gap:5,fontSize:12,fontWeight:800,cursor:"pointer"}}>
                    <Ic n="thumb" s={13} c="#fff" />{v.jaVotou?"Apoiado":"Apoiar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==="denuncia" && (
          <div className="fadeIn">
            <div className="anon-card" style={{marginBottom:18}}>
              <h3 style={{fontSize:14,fontWeight:700,marginBottom:4}}>Canal Anônimo e Seguro</h3>
              <p style={{fontSize:12,opacity:.8}}>Nenhum dado pessoal é armazenado.</p>
            </div>
            <div className="card" style={{padding:18}}>
              <div className="fg"><label>Categoria</label><select><option value="PROBLEMA_INTERNO">Problema Interno</option><option value="VIOLENCIA_DOMESTICA">Violência Doméstica</option><option value="OUTRO">Outro</option></select></div>
              <div className="fg"><label>Descrição</label><textarea rows={5} placeholder="Descreva o ocorrido…" /></div>
              <button className="btn btn-primary portal-action" style={{width:"100%",justifyContent:"center"}}><Ic n="shield" s={14} c="#fff" /> Enviar Anonimamente</button>
            </div>
          </div>
        )}
      </div>

      <nav className="pnav">
        {[["home","home","Início"],["chat","ai","IA"],["chamados","chat","Chamados"],["docs","doc","Docs"],["voice","mic","Voz"]].map(([k,ic,lb])=>(
          <button key={k} className="pnav-btn" onClick={()=>setTab(k)}>
            <span className={`portal-nav-icon ${tab===k ? "active" : ""}`}><Ic n={ic} s={19} c="currentColor" /></span>
            <span style={{fontSize:10,color:tab===k?"#22c55e":"#166534",fontWeight:tab===k?900:600}}>{lb}</span>
          </button>
        ))}
      </nav>

      {showT && (
        <Modal title="Abrir Chamado" onClose={()=>setShowT(false)}>
          <div className="fg"><label>Tipo</label><select value={tf.categoria} onChange={e=>setTf(p=>({...p,categoria:e.target.value}))}><option value="MANUTENCAO">Manutenção</option><option value="RECLAMACAO">Reclamação</option><option value="SUGESTAO">Sugestão</option></select></div>
          <div className="fg"><label>Título</label><input value={tf.titulo} onChange={e=>setTf(p=>({...p,titulo:e.target.value}))} /></div>
          <div className="fg"><label>Descrição</label><textarea rows={4} value={tf.descricao} onChange={e=>setTf(p=>({...p,descricao:e.target.value}))} /></div>
          <button className="btn btn-primary portal-action" style={{width:"100%",justifyContent:"center"}} onClick={sendTicket} disabled={!tf.titulo}>Enviar Chamado</button>
        </Modal>
      )}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("tnm_user")); } catch { return null; } });
  const [page, setPage] = useState("dashboard");
  const [toastQ, setToastQ] = useState([]);
  const urlParams = new URLSearchParams(window.location.search);
  const portalToken = urlParams.get("portal");
  const execucaoToken = urlParams.get("execucao");
  const maintenanceReportId = urlParams.get("maintenanceReport");
  const maintenanceReportCondominioId = urlParams.get("condominioId");

  function toast(msg, type="ok") {
    const id = Date.now();
    setToastQ(p=>[...p, {id,msg,type}]);
  }
  function removeToast(id) { setToastQ(p=>p.filter(t=>t.id!==id)); }

  function login(u) {
    setUser(u);
    localStorage.setItem("tnm_user", JSON.stringify(u));
  }
  function logout() {
    localStorage.removeItem("tnm_token");
    localStorage.removeItem("tnm_user");
    setUser(null);
  }

  if (portalToken) return <><style>{CSS}</style><PublicPortalMorador token={portalToken} /></>;
  if (execucaoToken) return <><style>{CSS}</style><ExecucaoManutencaoPublica token={execucaoToken} /></>;
  if (!user) return <><style>{CSS}</style><LoginPage onLogin={login} /></>;
  if (maintenanceReportId) return (
    <>
      <style>{CSS}</style>
      <MaintenanceReportPage reportId={maintenanceReportId} condominioId={maintenanceReportCondominioId} toast={toast} />
      {toastQ.map(t => <Toast key={t.id} msg={t.msg} type={t.type} onClose={()=>removeToast(t.id)} />)}
    </>
  );

  const isPortal = page === "portal";

  const pages = {
    dashboard:  <Dashboard />,
    edificacoes:<EdificacoesPage user={user} onUserChange={login} go={setPage} toast={toast} />,
    manut:      <ManutPageV2 user={user} toast={toast} />,
    chamados:   <ChamadosPage toast={toast} />,
    voz:        <VozPage toast={toast} />,
    denuncia:   <DenunciaPage toast={toast} user={user} />,
    checklists: <ChecklistsPage toast={toast} />,
    banners:    <BannersPage toast={toast} />,
    cotacoes:   <div className="page"><h1>Cotações</h1><p>Em desenvolvimento...</p></div>,
    agenda:     <AgendaSindicoPage toast={toast} />,
    whatsapp:   <WhatsAppPage toast={toast} />,
    inventario: <InventarioPage toast={toast} />,
    usuarios:   <UsuariosPage toast={toast} />,
    relatorios: <RelatoriosPage toast={toast} />,
    funcionarios: <GerenciadorFuncionarios />,
    folhaPonto: <FolhaDePonto />,
    modoPortariaFuncionario: <ModoPortariaFuncionario />,
    ocorrenciasPortaria: <OcorrenciasPortaria />,
    portal:     <PortalFuncionario />,
  };

  return (
    <>
      <style>{CSS}</style>

      {!isPortal && <Sidebar cur={page} go={setPage} user={user} onLogout={logout} />}

      {!isPortal && (
        <div className="topbar">
          <span style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:15,color:C.primary,marginRight:"auto"}}>
            {{"dashboard":"Dashboard","edificacoes":"Condomínios","manut":"Manutenções","chamados":"Chamados","voz":"Voz do Morador","denuncia":"Não Se Cale","checklists":"Checklists Operacionais","financeiro":"Financeiro","cotacoes":"Cotações","agenda":"Agenda do Síndico","whatsapp":"WhatsApp","inventario":"Inventário","usuarios":"Usuários","relatorios":"Relatórios","portal":"Portal dos Funcionários"}[page]||""}
          </span>
          <NotifBell />
          <div style={{width:1,height:28,background:C.border,margin:"0 6px"}} />
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.neon})`,display:"flex",alignItems:"center",justifyContent:"center",color:C.dark,fontSize:13,fontWeight:900,boxShadow:"0 0 18px rgba(141,255,42,.28)"}}>{user.nome?.[0]}</div>
            <span style={{fontSize:13,fontWeight:500}}>{user.nome?.split(" ")[0]}</span>
          </div>
        </div>
      )}

      <div className={isPortal?"":  "main"}>
        {isPortal && (
          <div style={{position:"fixed",top:0,left:0,right:0,zIndex:200,background:C.dark,padding:"9px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{color:"rgba(255,255,255,.45)",fontSize:12}}>👁️ Modo Portal do Morador</span>
            <button className="btn btn-accent btn-xs" onClick={()=>setPage("dashboard")}>← Admin</button>
          </div>
        )}
        <div style={isPortal?{paddingTop:38}:{}}>
          {pages[page] || pages.dashboard}
        </div>
      </div>

      {toastQ.map(t => <Toast key={t.id} msg={t.msg} type={t.type} onClose={()=>removeToast(t.id)} />)}
    </>
  );
}
