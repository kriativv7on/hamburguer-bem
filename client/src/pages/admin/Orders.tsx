import { useCallback, useEffect, useState } from "react";
import { Ban, Bell, Check, CookingPot, MapPin, PackageCheck, ShoppingBag, Utensils } from "lucide-react";
import { toast } from "sonner";
import { api, formatBRL, orderStatusLabels, orderTypeLabels } from "@/lib/api";
import type { Order, OrderStatus } from "@shared/types";

const statusOrder: OrderStatus[] = ["novo", "em_preparo", "pronto", "entregue", "pago", "cancelado"];
const filters: (OrderStatus | "todos")[] = ["todos", ...statusOrder];

const statusStyles: Record<OrderStatus, string> = {
  novo: "bg-[#f47721] text-[#171614]",
  em_preparo: "bg-[#d96014] text-white",
  pronto: "bg-[#67713c] text-white",
  entregue: "bg-[#1b2224] text-[#f5f1e8]",
  pago: "bg-[#2b7a4b] text-white",
  cancelado: "bg-[#9e2b16] text-white",
};

const nextActions: Partial<Record<OrderStatus, { label: string; next: OrderStatus; icon: typeof Bell }[]>> = {
  novo: [{ label: "Iniciar preparo", next: "em_preparo", icon: CookingPot }],
  em_preparo: [{ label: "Marcar pronto", next: "pronto", icon: PackageCheck }],
  pronto: [{ label: "Entregue", next: "entregue", icon: Check }],
  entregue: [{ label: "Pagamento recebido", next: "pago", icon: Check }],
};

export default function Orders() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("todos");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.getOrders(filter === "todos" ? undefined : filter);
      setOrders(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = orders.filter((order) => order.status === "novo").length;

  const changeStatus = async (order: Order, status: OrderStatus) => {
    try {
      await api.updateOrderStatus(order.id, status);
      toast.success(`Pedido #${order.number} → ${orderStatusLabels[status]}`);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar.");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d96014]">Gestão de pedidos</p>
          <h1 className="mt-2 font-display text-5xl leading-[0.9] tracking-[0.02em]">PEDIDOS</h1>
        </div>
        {active > 0 && (
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f47721] px-4 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-[#171614]">
            <Bell size={14} /> {active} pendente{active > 1 ? "s" : ""}
          </span>
        )}
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.1em] transition-colors ${filter === status ? "border-[#171614] bg-[#171614] text-[#f5f1e8]" : "border-[#171614]/15 bg-transparent text-[#171614]/55 hover:border-[#d96014] hover:text-[#d96014]"}`}
          >
            {status === "todos" ? "Todos" : orderStatusLabels[status]}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</p>
      )}
      {loading && <p className="text-sm text-[#171614]/50">Carregando pedidos…</p>}

      {!loading && !error && orders.length === 0 && (
        <div className="flex flex-col items-center rounded-3xl border border-[#171614]/10 bg-white/70 px-6 py-12 text-center">
          <ShoppingBag size={30} className="text-[#d96014]" />
          <p className="mt-4 font-display text-3xl">SEM PEDIDOS</p>
          <p className="mt-1 text-sm text-[#171614]/50">Nenhum pedido neste filtro por enquanto.</p>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {orders.map((order) => (
            <article key={order.id} className="rounded-3xl border border-[#171614]/10 bg-white/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-display text-3xl leading-none">#{order.number}</span>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${statusStyles[order.status]}`}>
                    {orderStatusLabels[order.status]}
                  </span>
                </div>
                <span className="font-display text-2xl">{formatBRL(order.total)}</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#171614]/60">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#171614]/5 px-3 py-1">
                  {order.type === "mesa" ? <Utensils size={12} /> : order.type === "delivery" ? <MapPin size={12} /> : <ShoppingBag size={12} />}
                  {orderTypeLabels[order.type]}
                  {order.tableNumber ? ` · Mesa ${order.tableNumber}` : ""}
                </span>
                <span className="rounded-full bg-[#171614]/5 px-3 py-1">{order.paymentMethod === "pix" ? "Pix" : order.paymentMethod === "cartao" ? "Cartão" : order.paymentMethod === "dinheiro" ? "Dinheiro" : "Fiado"}</span>
              </div>

              <p className="mt-3 text-sm font-black">{order.customerName || "Cliente"}</p>
              <p className="text-[11px] text-[#171614]/45">
                {order.customerPhone} · {new Date(`${order.createdAt.replace(" ", "T")}Z`).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </p>
              {order.address && (
                <p className="mt-1 text-[11px] leading-4 text-[#171614]/55">📍 {order.address}</p>
              )}

              <div className="mt-4 space-y-2 rounded-2xl bg-[#ebe5d9] p-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-[13px]">
                    <span className="min-w-0 truncate">
                      <span className="font-black">{item.qty}×</span> {item.name}
                    </span>
                    <span className="shrink-0 font-bold">{formatBRL(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              {order.status !== "cancelado" && order.status !== "pago" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {nextActions[order.status]?.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.next}
                        onClick={() => void changeStatus(order, action.next)}
                        className="inline-flex items-center gap-2 rounded-full bg-[#171614] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#f5f1e8] transition-all hover:bg-[#2d2b27] active:scale-[0.97]"
                      >
                        <Icon size={14} /> {action.label}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => void changeStatus(order, "cancelado")}
                    className="inline-flex items-center gap-2 rounded-full border border-[#171614]/15 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#9e2b16] transition-colors hover:bg-[#9e2b16] hover:text-white"
                  >
                    <Ban size={14} /> Cancelar
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}