import { useCallback, useEffect, useState } from "react";
import { Search, Star, UserRound } from "lucide-react";
import { toast } from "sonner";
import { api, formatBRL, orderStatusLabels } from "@/lib/api";
import type { Customer, Order } from "@shared/types";

export default function Customers() {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ customer: Customer; orders: Order[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCustomers(await api.getCustomers(search));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null);
      return;
    }
    api
      .getCustomerDetail(selectedId)
      .then(setDetail)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Erro ao carregar cliente."));
  }, [selectedId]);

  const updatePoints = async (customer: Customer, delta: number) => {
    const next = Math.max(0, customer.points + delta);
    try {
      await api.updateCustomer(customer.id, { points: next });
      toast.success(`Pontos atualizados para ${next}`);
      void load();
      if (selectedId === customer.id) setSelectedId(customer.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro.");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d96014]">Base de clientes</p>
        <h1 className="mt-2 font-display text-5xl leading-[0.9] tracking-[0.02em]">CLIENTES</h1>
      </header>

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</p>}

      <label className="flex items-center gap-3 rounded-full border border-[#171614]/15 bg-white/70 px-5 py-3">
        <Search size={16} className="text-[#171614]/40" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome ou telefone…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-[#171614]/40"
        />
      </label>

      <div className="overflow-hidden rounded-3xl border border-[#171614]/10 bg-white/70">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#171614]/10 text-[10px] font-black uppercase tracking-[0.14em] text-[#171614]/45">
                <th className="px-5 py-4">Cliente</th>
                <th className="px-5 py-4">Pedidos</th>
                <th className="px-5 py-4">Total gasto</th>
                <th className="px-5 py-4">Pontos</th>
                <th className="px-5 py-4">Último pedido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171614]/8">
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-[#171614]/45">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
              {customers.map((customer) => (
                <tr key={customer.id} onClick={() => setSelectedId(customer.id)} className="cursor-pointer transition-colors hover:bg-[#f47721]/6">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-[#ebe5d9] text-[#d96014]">
                        <UserRound size={16} />
                      </span>
                      <div>
                        <p className="font-black">{customer.name}</p>
                        <p className="text-[11px] text-[#171614]/45">{customer.phone || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-bold">{customer.totalOrders}</td>
                  <td className="px-5 py-4 font-bold">{formatBRL(customer.totalSpent)}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#f47721]/15 px-3 py-1 text-xs font-black text-[#d96014]">
                      <Star size={12} className="fill-current" /> {customer.points}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[#171614]/55">
                    {customer.lastOrderAt
                      ? new Date(`${customer.lastOrderAt.replace(" ", "T")}Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 bg-[#171614]/60 backdrop-blur-sm" onClick={() => setSelectedId(null)}>
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-3xl bg-[#f5f1e8] p-6 sm:bottom-6 sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d96014]">Cliente</p>
                <h2 className="mt-1 font-display text-4xl leading-none">{detail.customer.name}</h2>
                <p className="mt-1 text-sm text-[#171614]/50">{detail.customer.phone || "Sem telefone"}</p>
              </div>
              <button onClick={() => setSelectedId(null)} className="grid h-10 w-10 place-items-center rounded-full border border-[#171614]/15 text-xl hover:bg-[#171614] hover:text-[#f5f1e8]" aria-label="Fechar">×</button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/70 p-4 text-center">
                <p className="font-display text-2xl">{detail.customer.totalOrders}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#171614]/45">Pedidos</p>
              </div>
              <div className="rounded-2xl bg-white/70 p-4 text-center">
                <p className="font-display text-2xl">{formatBRL(detail.customer.totalSpent)}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#171614]/45">Total gasto</p>
              </div>
              <div className="rounded-2xl bg-[#f47721]/15 p-4 text-center">
                <p className="flex items-center justify-center gap-1 font-display text-2xl text-[#d96014]"><Star size={16} className="fill-current" />{detail.customer.points}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#171614]/45">Pontos</p>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button onClick={() => void updatePoints(detail.customer, 1)} className="flex-1 rounded-full bg-[#171614] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#f5f1e8]">+1 ponto</button>
              <button onClick={() => void updatePoints(detail.customer, -1)} className="flex-1 rounded-full border border-[#171614]/15 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#d96014]">-1 ponto</button>
            </div>

            <div className="mt-6 max-h-[36vh] space-y-3 overflow-y-auto">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#171614]/55">Histórico de pedidos</p>
              {detail.orders.length === 0 && (
                <p className="rounded-2xl bg-white/70 px-4 py-6 text-center text-sm text-[#171614]/45">Nenhum pedido por aqui ainda.</p>
              )}
              {detail.orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 p-4">
                  <div>
                    <p className="text-sm font-black">Pedido #{order.number}</p>
                    <p className="text-[11px] text-[#171614]/45">{orderStatusLabels[order.status]}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl">{formatBRL(order.total)}</p>
                    <p className="text-[11px] text-[#171614]/45">{new Date(`${order.createdAt.replace(" ", "T")}Z`).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}