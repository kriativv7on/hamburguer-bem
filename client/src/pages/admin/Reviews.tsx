import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Review } from "@shared/types";

export default function ReviewsAdmin() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setReviews(await api.getReviews());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (review: Review) => {
    try {
      await api.deleteReview(review.id);
      setReviews((current) => current.filter((item) => item.id !== review.id));
      toast.success("Avaliação removida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover.");
    }
  };

  const average =
    reviews.length > 0 ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)) : 0;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d96014]">Feedback dos clientes</p>
        <h1 className="mt-2 font-display text-5xl leading-[0.9] tracking-[0.02em]">AVALIAÇÕES</h1>
      </header>

      {reviews.length > 0 && (
        <div className="inline-flex items-center gap-3 rounded-3xl border border-[#171614]/10 bg-white/70 px-5 py-4">
          <p className="font-display text-5xl text-[#d96014]">{average}</p>
          <div>
            <div className="flex gap-1 text-[#f47721]">
              {Array.from({ length: 5 }).map((_, index) => (
                <StarSmall key={index} filled={index < Math.round(average)} />
              ))}
            </div>
            <p className="mt-1 text-[11px] font-bold text-[#171614]/50">
              média de {reviews.length} avaliação{reviews.length > 1 ? "ões" : ""}
            </p>
          </div>
        </div>
      )}

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {reviews.length === 0 && (
          <div className="col-span-full rounded-3xl border border-[#171614]/10 bg-white/70 p-10 text-center text-sm text-[#171614]/45">
            Nenhuma avaliação recebida ainda.
          </div>
        )}
        {reviews.map((review) => (
          <article key={review.id} className="rounded-3xl border border-[#171614]/10 bg-white/70 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex gap-1 text-[#f47721]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <StarSmall key={index} filled={index < review.rating} />
                  ))}
                </div>
                <p className="mt-2 text-sm font-black">{review.customerName}</p>
                <p className="text-[11px] text-[#171614]/45">
                  {new Date(`${review.createdAt.replace(" ", "T")}Z`).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </p>
              </div>
              <button
                onClick={() => void remove(review)}
                className="grid h-9 w-9 place-items-center rounded-full border border-[#171614]/15 text-[#9e2b16] transition-colors hover:bg-[#9e2b16] hover:text-white"
                aria-label="Remover avaliação"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#171614]/70">“{review.comment || "Sem comentário."}”</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function StarSmall({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${filled ? "fill-current" : "fill-[#171614]/15 text-[#171614]/15"}`}
      aria-hidden
    >
      <path d="M12 2l2.9 6.26 6.85.6-5.2 4.53 1.54 6.7L12 16.9 6.91 20.1l1.54-6.7-5.2-4.52 6.85-.6L12 2z" />
    </svg>
  );
}