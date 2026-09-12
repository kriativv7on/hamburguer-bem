import { useCallback, useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Banknote, PiggyBank, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api, formatBRL } from "@/lib/api";
import type { CashMovement, CashMovementType } from "@shared/types";

const typeLabels: Record<CashMovementType, string> = {
  entrada: "Entrada",
  saida: "Saída",
  suprimento: "Suprimento",
  sangria: "Sangria",
};

export default function Cash() {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [balance, setBalance] = useState<{ cashIn: number; cashOut: number; balance: number }>({ cashIn: 0, cashOut: 0, balance: 0 });
  const [type, setType] = useState<CashMovementType>("suprimento");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getCash();
      setMovements(data.movements);
      setBalance({ cashIn: data.cashIn, cashOut: data.cashOut, balance: data.balance });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number.parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    try {
      await api.addCashMovement({ type, description: description.trim(), amount: value });
      toast.success(`${typeLabels[type]} de ${formatBRL(value)} registrada.`);
      setDescription("");
      setAmount("");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar.");
    }
  };

  const balances = [
    { label: "Entradas", value: balance.cashIn, icon: ArrowDownCircle, tone: "#2b7a4b" },
    { label: "Saídas", value: balance.cashOut, icon: ArrowUpCircle, tone: "#9e2b16" },
    { label: "Saldo", value: balance.balance, icon: Wallet, tone: "#d96014" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d96014]">Movimentações financeiras</p>
        <h1 className="mt-2 font-display text-5xl leading-[0.9] tracking-[0.02em]">CONTROLE DE CAIXA</h1>
      </header>

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        {balances.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-3xl border border-[#171614]/10 bg-white/70 p-5">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#171614]/50">
                <Icon size={15} style={{ color: item.tone }} /> {item.label}
              </p>
              <p className="mt-3 font-display text-4xl">{formatBRL(item.value)}</p>
            </div>
          );
        })}
      </div>

      <form onSubmit={add} className="rounded-3xl border border-[#171614]/10 bg-white/70 p-6">
        <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#171614]/60">Nova movimentação</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["suprimento", "sangria", "entrada", "saida"] as CashMovementType[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.1em] transition-colors ${
                type === value ? "border-[#171614] bg-[#171614] text-[#f5f1e8]" : "border-[#171614]/15 text-[#171614]/55 hover:border-[#d96014]"
              }`}
            >
              {typeLabels[value]}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descrição (ex.: suprimento para troco, pagamento de fornecedor…)"
            className="h-12 rounded-full border border-[#171614]/15 bg-[#f5f1e8] px-5 text-sm outline-none placeholder:text-[#171614]/40 focus:border-[#d96014]"
          />
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Valor"
            inputMode="decimal"
            className="h-12 rounded-full border border-[#171614]/15 bg-[#f5f1e8] px-5 text-sm outline-none placeholder:text-[#171614]/40 focus:border-[#d96014]"
          />
          <button className="inline-flex items-center justify-center gap-2 rounded-full bg-[#171614] px-6 h-12 text-[11px] font-black uppercase tracking-[0.13em] text-[#f5f1e8] transition-all hover:bg-[#2d2b27] active:scale-[0.97]">
            <Banknote size={15} /> Registrar
          </button>
        </div>
        <p className="mt-3 flex items-center gap-2 text-[11px] text-[#171614]/45">
          <PiggyBank size={14} /> Suprimento e sangria ajustam o caixa; entrada e saída registram movimentos avulsos.
        </p>
      </form>

      <div className="overflow-hidden rounded-3xl border border-[#171614]/10 bg-white/70">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#171614]/10 text-[10px] font-black uppercase tracking-[0.14em] text-[#171614]/45">
                <th className="px-5 py-4">Tipo</th>
                <th className="px-5 py-4">Descrição</th>
                <th className="px-5 py-4">Data</th>
                <th className="px-5 py-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171614]/8">
              {movements.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-[#171614]/45">Nenhuma movimentação ainda.</td>
                </tr>
              )}
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${movement.type === "saida" || movement.type === "sangria" ? "bg-[#9e2b16]/10 text-[#9e2b16]" : "bg-[#2b7a4b]/10 text-[#2b7a4b]"}`}>
                      {typeLabels[movement.type as CashMovementType]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[#171614]/65">{movement.description || "—"}</td>
                  <td className="px-5 py-4 text-[#171614]/50">
                    {new Date(`${movement.createdAt.replace(" ", "T")}Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </td>
                  <td className={`px-5 py-4 text-right font-black ${movement.type === "saida" || movement.type === "sangria" ? "text-[#9e2b16]" : "text-[#2b7a4b]"}`}>
                    {movement.type === "saida" || movement.type === "sangria" ? "−" : "+"}{formatBRL(movement.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}