import { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  ArrowLeft,
  Flame,
  LayoutDashboard,
  Lock,
  Menu,
  MessageSquareQuote,
  Receipt,
  Settings as SettingsIcon,
  Table2,
  Users,
  Wallet,
  X,
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-white/10 bg-[#171614]/95 px-4 text-[#f5f1e8] backdrop-blur-xl md:hidden">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 text-[#f5f1e8]/80 transition-colors hover:border-[#f47721] hover:text-[#f47721]"
          aria-label="Abrir menu"
        >
          <Menu size={19} />
        </button>
        <span className="min-w-0 truncate font-display text-sm tracking-[0.04em]">HAMBÚRGUER BEM</span>
        <Link
          href="/"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 text-[#f5f1e8]/80 transition-colors hover:border-[#f47721] hover:text-[#f47721]"
          aria-label="Ver cardápio"
          title="Ver cardápio"
        >
          <ArrowLeft size={17} />
        </Link>
      </header>

      <div className={`fixed inset-0 z-50 md:hidden ${mobileNavOpen ? "" : "pointer-events-none"}`} aria-hidden={!mobileNavOpen}>
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${mobileNavOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMobileNavOpen(false)}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[270px] flex-col bg-[#171614] px-4 py-6 text-[#f5f1e8] transition-transform duration-200 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between px-2">
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f47721] text-[#171614]">
                <Flame size={18} />
              </span>
              <span className="font-display text-lg leading-none tracking-[0.04em]">HAMBÚRGUER<br />BEM</span>
            </span>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-[#f5f1e8]/70 transition-colors hover:border-[#f47721] hover:text-[#f47721]"
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          </div>
          <p className="mt-6 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Gestão</p>
          <nav className="mt-3 flex flex-col gap-1">
            {navItems.map((item) => {
              const active = sub === item.path.replace("/admin/", "") || (sub === "" && item.path === "/admin/dashboard");
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] transition-colors ${active ? "bg-[#f47721] text-[#171614]" : "text-[#f5f1e8]/60 hover:bg-white/5 hover:text-[#f5f1e8]"}`}
                >
                  <Icon size={16} /> {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-2">
            <Link
              href="/"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] text-[#f5f1e8]/60 transition-colors hover:bg-white/5 hover:text-[#f5f1e8]"
            >
              <ArrowLeft size={16} /> Ver cardápio
            </Link>
            <button
              onClick={() => {
                setAdminPin("");
                setAuthed(false);
                setMobileNavOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] text-[#f5f1e8]/60 transition-colors hover:bg-white/5 hover:text-[#f47721]"
            >
              <Lock size={16} /> Sair
            </button>
          </div>
        </aside>
      </div>

      <main className="min-w-0 flex-1 md:ml-[230px]">
        <div className="mx-auto max-w-6xl px-5 pb-12 pt-20 md:px-10 md:py-8">
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