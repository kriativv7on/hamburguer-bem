import { useCallback, useEffect, useState } from "react";
import { Armchair } from "lucide-react";
import { toast } from "sonner";
import { api, formatBRL } from "@/lib/api";
import type { Order, Table } from "@shared/types";

const statusStyles: Record<Table["status"], string> = {
  livre: "bg-[#2b7a4b] text-white",
  ocupada: "bg-[#d96014] text-white",
  reservada: "bg-[#1b2224] text-[#f5f1e8]",
};

const statusLabels: Record<Table["status"], string> = {
  livre: "Livre",
  ocupada: "Ocupada",
  reservada: "Reservada",
};

export default function Tables() {
  const [tables, setTables] = useState<Table[]>([]);
  const [open, setOpen] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Table | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [tableList, orderList] = await Promise.all([api.getTables(), api.getOrders()]);
      setTables(tableList);
      setError(null);
      const withOpenTables = tableList.filter((table) => table.status === "ocupada");
      if (withOpenTables.length > 0) {
        const openOrders = orderList.filter(
          (order) =>
            order.tableId &&
            withOpenTables.some((table) => table.id === order.tableId) &&
            order.status !== "pago" &&
            order.status !== "cancelado",
        );
        setOpen(openOrders);
      } else {
        setOpen([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = async (table: Table, status: Table["status"]) => {
    try {
      await api.updateTableStatus(table.id, status);
      toast.success(`Mesa ${table.number} ${statusLabels[status].toLowerCase()} (${statusLabels[status]})`);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar mesa.");
    }
  };

  const tableOpenOrders = (tableId: number) =>
    open.filter((order) => order.tableId === tableId).reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d96014]">Espaço físico</p>
        <h1 className="mt-2 font-display text-5xl leading-[0.9] tracking-[0.02em]">MESAS E COMANDAS</h1>
        <p className="mt-2 max-w-[480px] text-sm leading-6 text-[#171614]/55">
          Acompanhe as mesas em tempo real. Ao marcar o pagamento de um pedido de mesa, ela é liberada automaticamente.
        </p>
      </header>

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {tables.map((table) => (
          <button
            key={table.id}
            onClick={() => setSelected(table)}
            className="group rounded-3xl border border-[#171614]/10 bg-white/70 p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-4xl leading-none">M{table.number}</span>
              <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${statusStyles[table.status]}`}>
                {statusLabels[table.status]}
              </span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#171614]/45">
              <Armchair size={12} /> {table.seats} lugares
            </p>
            {table.status === "ocupada" && (
              <p className="mt-3 inline-flex rounded-full bg-[#f47721]/15 px-3 py-1 text-[11px] font-black text-[#d96014]">
                {formatBRL(tableOpenOrders(table.id))} em comanda
              </p>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-[#171614]/60 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-3xl bg-[#f5f1e8] p-6 sm:bottom-6 sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d96014]">Comanda</p>
                <h2 className="font-display text-4xl leading-none">MESA {selected.number}</h2>
                <p className="mt-1 text-sm text-[#171614]/50">Status: {statusLabels[selected.status]}</p>
              </div>
              <button onClick={() => setSelected(null)} className="grid h-10 w-10 place-items-center rounded-full border border-[#171614]/15 text-xl hover:bg-[#171614] hover:text-[#f5f1e8]" aria-label="Fechar">×</button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {selected.status === "livre" && (
                <button onClick={() => void changeStatus(selected, "ocupada")} className="rounded-full bg-[#d96014] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-white">Ocupar mesa</button>
              )}
              {(selected.status === "livre" || selected.status === "ocupada") && (
                <button onClick={() => void changeStatus(selected, "reservada")} className="rounded-full bg-[#1b2224] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#f5f1e8]">Reservar</button>
              )}
              {selected.status !== "livre" && (
                <button onClick={() => void changeStatus(selected, "livre")} className="rounded-full border border-[#171614]/20 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#2b7a4b]">Liberar mesa</button>
              )}
            </div>

            <div className="mt-6 max-h-[40vh] space-y-3 overflow-y-auto">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#171614]/55">Pedidos abertos na mesa</p>
              {open.filter((order) => order.tableId === selected.id).length === 0 && (
                <p className="rounded-2xl bg-white/70 px-4 py-6 text-center text-sm text-[#171614]/45">Nenhum pedido aberto nesta mesa.</p>
              )}
              {open
                .filter((order) => order.tableId === selected.id)
                .map((order) => (
                  <div key={order.id} className="rounded-2xl bg-white/70 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black">Pedido #{order.number}</span>
                      <span className="font-display text-xl">{formatBRL(order.total)}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#171614]/45">
                      {order.customerName || "Cliente"} · {order.paymentMethod === "pix" ? "Pix" : order.paymentMethod}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}