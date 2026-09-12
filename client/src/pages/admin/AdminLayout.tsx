import { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  ArrowLeft,
  Flame,
  LayoutDashboard,
  Lock,
  MessageSquareQuote,
  Receipt,
  Settings as SettingsIcon,
  Table2,
  Users,
  Wallet,
} from "lucide-react";
import { api, clearAdminPin, getAdminPin, setAdminPin, setUnauthorizedHandler } from "@/lib/api";
import Dashboard from "./Dashboard";
import Orders from "./Orders";
import Tables from "./Tables";
import Customers from "./Customers";
import ReviewsAdmin from "./Reviews";
import Cash from "./Cash";
import AdminMenu from "./Menu";
import SettingsAdmin from "./Settings";

const navItems = [
  { path: "/admin/dashboard", label: "Visão geral", short: "Início", icon: LayoutDashboard },
  { path: "/admin/pedidos", label: "Pedidos (PDV)", short: "Pedidos", icon: Receipt },
  { path: "/admin/cardapio", label: "Cardápio", short: "Cardápio", icon: Flame },
  { path: "/admin/mesas", label: "Mesas", short: "Mesas", icon: Table2 },
  { path: "/admin/clientes", label: "Clientes", short: "Clientes", icon: Users },
  { path: "/admin/avaliacoes", label: "Avaliações", short: "Avaliação", icon: MessageSquareQuote },
  { path: "/admin/caixa", label: "Caixa", short: "Caixa", icon: Wallet },
  { path: "/admin/configuracoes", label: "Configurações", short: "Config.", icon: SettingsIcon },
];

export default function AdminLayout() {
  const [authed, setAuthed] = useState(() => getAdminPin() !== "");
  const [pinError, setPinError] = useState("");
  const [checking, setChecking] = useState(false);
  const [match, params] = useRoute("/admin/:sub*");
  const sub = match ? (params?.["sub*"] ?? "dashboard") : "dashboard";
  const handledRef = useRef(false);

  useEffect(() => {
    return setUnauthorizedHandler(() => {
      if (handledRef.current) return;
      handledRef.current = true;
      clearAdminPin();
      setAuthed(false);
    });
  }, []);

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#171614] px-5 text-[#f5f1e8]">
        <form
          className="w-full max-w-sm"
          onSubmit={async (event) => {
            event.preventDefault();
            setPinError("");
            const form = new FormData(event.currentTarget);
            const pin = String(form.get("pin") ?? "").trim();
            if (!pin) {
              setPinError("Digite o PIN.");
              return;
            }
            setChecking(true);
            const ok = await api?.checkAdminPin(pin).catch(() => false);
            setChecking(false);
            if (!ok) {
              setPinError("PIN de administrador inválido.");
              return;
            }
            handledRef.current = false;
            setAdminPin(pin);
            setAuthed(true);
          }}
        >
          <div className="flex items-center justify-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f47721] text-[#171614]">
              <Flame size={24} />
            </span>
            <span className="font-display text-2xl tracking-[0.04em]">HAMBÚRGUER BEM</span>
          </div>
          <p className="mt-2 text-center text-[11px] font-black uppercase tracking-[0.2em] text-[#f5f1e8]/40">
            Painel administrativo
          </p>
          <div className="mt-8 space-y-3 rounded-3xl border border-white/10 bg-white/5 p-6">
            <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-[#f5f1e8]/50" htmlFor="pin">
              PIN de acesso
            </label>
            <input
              id="pin"
              name="pin"
              type="password"
              inputMode="numeric"
              placeholder="Digite o PIN"
              className="h-12 w-full rounded-full border border-white/15 bg-[#171614] px-5 text-sm text-[#f5f1e8] outline-none placeholder:text-white/25 focus:border-[#f47721]"
            />
            <button
              disabled={checking}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f47721] px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-[#171614] transition-all hover:bg-[#ff9145] active:scale-[0.98] disabled:opacity-60"
            >
              {checking ? "Verificando..." : "Entrar"} <ArrowLeft size={15} className="rotate-180" />
            </button>
            {pinError && (
              <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-[11px] font-bold text-red-400">
                {pinError}
              </p>
            )}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f5f1e8] text-[#171614]">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[230px] flex-col bg-[#171614] px-4 py-6 text-[#f5f1e8] max-md:hidden">
        <Link href="/admin/dashboard" className="flex items-center gap-3 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f47721] text-[#171614]">
            <Flame size={18} />
          </span>
          <span className="font-display text-lg leading-none tracking-[0.04em]">HAMBÚRGUER<br />BEM</span>
        </Link>
        <p className="mt-6 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Gestão</p>
        <nav className="mt-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const active = sub === item.path.replace("/admin/", "") || (sub === "" && item.path === "/admin/dashboard");
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] transition-colors ${active ? "bg-[#f47721] text-[#171614]" : "text-[#f5f1e8]/60 hover:bg-white/5 hover:text-[#f5f1e8]"}`}
              >
                <Icon size={16} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-2">
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] text-[#f5f1e8]/60 transition-colors hover:bg-white/5 hover:text-[#f5f1e8]">
            <ArrowLeft size={16} /> Ver cardápio
          </Link>
          <button
            onClick={() => {
              setAdminPin("");
              setAuthed(false);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] text-[#f5f1e8]/60 transition-colors hover:bg-white/5 hover:text-[#f47721]"
          >
            <Lock size={16} /> Sair
          </button>
        </div>
      </aside>

      <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#171614] px-2 pb-1.5 pt-1.5 text-[#f5f1e8] md:hidden">
        <div className="mb-1 flex items-center justify-between px-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#f5f1e8]/70 transition-colors hover:text-[#f47721]"
          >
            <ArrowLeft size={13} /> Ver cardápio
          </Link>
          <button
            onClick={() => {
              setAdminPin("");
              setAuthed(false);
            }}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#f5f1e8]/70 transition-colors hover:text-[#f47721]"
          >
            <Lock size={13} /> Sair
          </button>
        </div>
        <nav className="flex w-full items-center gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = sub === item.path.replace("/admin/", "");
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex flex-none items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] whitespace-nowrap transition-colors ${active ? "bg-[#f47721] text-[#171614]" : "text-[#f5f1e8]/50 hover:text-[#f5f1e8]"}`}
              >
                <Icon size={15} /> {item.short}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 pb-40 md:ml-[230px] md:pb-12">
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-10">
          {sub === "cardapio" && <AdminMenu />}
          {sub === "pedidos" && <Orders />}
          {sub === "mesas" && <Tables />}
          {sub === "clientes" && <Customers />}
          {sub === "avaliacoes" && <ReviewsAdmin />}
          {sub === "caixa" && <Cash />}
          {sub === "configuracoes" && <SettingsAdmin />}
          {(sub === "" || sub === "dashboard") && <Dashboard />}
        </div>
      </main>
    </div>
  );
}