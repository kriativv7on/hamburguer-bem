import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock3, Flame, Receipt, ShoppingBag, Table2, TrendingUp, Wallet } from "lucide-react";
import { api, formatBRL, orderStatusLabels, orderTypeLabels } from "@/lib/api";
import type { DashboardSummary } from "@shared/types";

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDashboard()
      .then((summary) => {
        setData(summary);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro"));
  }, []);

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center gap-3 text-sm text-[#171614]/50">
        <Clock3 size={18} className="animate-spin" /> Carregando visão geral…
      </div>
    );
  }

  const cards = [
    { label: "Vendas hoje", value: formatBRL(data.todaySales), icon: Wallet, accent: "#f47721" },
    { label: "Pedidos hoje", value: String(data.todayOrders), icon: Receipt, accent: "#d96014" },
    { label: "Pedidos ativos", value: String(data.activeOrders), icon: ShoppingBag, accent: "#2b1a12" },
    { label: "Mesas ocupadas", value: String(data.openTables), icon: Table2, accent: "#b34c16" },
    { label: "Ticket médio hoje", value: formatBRL(data.avgTicket), icon: TrendingUp, accent: "#67713c" },
    { label: "Vendas no mês", value: formatBRL(data.monthlySales), icon: Flame, accent: "#9e2b16" },
  ];

  const chartData = data.salesByDay.map((entry) => ({
    name: new Date(`${entry.day}T12:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
    Vendas: entry.total,
  }));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d96014]">Painel administrativo</p>
        <h1 className="mt-2 font-display text-5xl leading-[0.9] tracking-[0.02em]">VISÃO GERAL</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-3xl border border-[#171614]/10 bg-white/70 p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#171614]/50">{card.label}</p>
                <span className="grid h-9 w-9 place-items-center rounded-full" style={{ backgroundColor: `${card.accent}1a`, color: card.accent }}>
                  <Icon size={16} />
                </span>
              </div>
              <p className="mt-3 font-display text-4xl tracking-[0.01em]">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-[#171614]/10 bg-white/70 p-6">
          <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#171614]/60">Vendas dos últimos dias</h2>
          <div className="mt-5 h-[240px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#17161414" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#17161455" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#17161455" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "#17161408" }}
                    formatter={(value) => [formatBRL(Number(value)), "Vendas"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #17161422", fontSize: 12 }}
                  />
                  <Bar dataKey="Vendas" fill="#f47721" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="pt-10 text-center text-sm text-[#171614]/45">Sem vendas registradas ainda.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[#171614]/10 bg-white/70 p-6">
          <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#171614]/60">Mais pedidos</h2>
          <div className="mt-4 space-y-3">
            {data.topProducts.length === 0 && (
              <p className="text-sm text-[#171614]/45">Nenhum produto vendido ainda.</p>
            )}
            {data.topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#171614] text-[11px] font-black text-[#f47721]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black uppercase tracking-[0.08em]">{product.name}</p>
                  <p className="text-[11px] text-[#171614]/45">{product.qty} vendidos</p>
                </div>
                <span className="text-xs font-black">{formatBRL(product.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#171614]/10 bg-white/70 p-6">
        <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#171614]/60">Últimos pedidos</h2>
        <div className="mt-4 divide-y divide-[#171614]/8">
          {data.recentOrders.length === 0 && (
            <p className="py-6 text-center text-sm text-[#171614]/45">
              Os pedidos vão aparecer aqui assim que chegarem.
            </p>
          )}
          {data.recentOrders.map((order) => (
            <div key={order.id} className="flex items-center gap-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ebe5d9] text-[11px] font-black">
                #{order.number}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{order.customerName || "Cliente"}</p>
                <p className="text-[11px] text-[#171614]/45">
                  {orderTypeLabels[order.type]}
                  {order.tableNumber ? ` · Mesa ${order.tableNumber}` : ""} ·{" "}
                  {order.items.length} itens
                </p>
              </div>
              <span className="hidden rounded-full bg-[#171614]/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#171614]/55 sm:inline">
                {orderStatusLabels[order.status]}
              </span>
              <span className="text-sm font-black">{formatBRL(order.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}