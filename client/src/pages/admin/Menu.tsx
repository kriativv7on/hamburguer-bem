import { useCallback, useEffect, useState } from "react";
import {
  ImagePlus,
  Layers,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatBRL } from "@/lib/api";
import type { Category, Combo, Product } from "@shared/types";

const accents = [
  "from-[#2b1a12] to-[#6d2f14]",
  "from-[#1b1b1b] to-[#b34c16]",
  "from-[#391415] to-[#9e2b16]",
  "from-[#1e2c20] to-[#67713c]",
  "from-[#382414] to-[#d37b25]",
  "from-[#4e2a12] to-[#cf771f]",
  "from-[#433022] to-[#b77545]",
  "from-[#1b2224] to-[#51605a]",
];

type Tab = "produtos" | "combos" | "categorias";

interface ProductDraft {
  id: number | null;
  name: string;
  description: string;
  price: string;
  promoPrice: string;
  categoryId: number;
  image: string;
  accent: string;
  tag: string;
  active: boolean;
}

interface ComboItemDraft {
  productId: number;
  name: string;
  qty: number;
}

interface ComboDraft {
  id: number | null;
  name: string;
  description: string;
  price: string;
  image: string;
  active: boolean;
  items: ComboItemDraft[];
}

function ImageInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [preview, setPreview] = useState(value || "");
  return (
    <div className="flex items-center gap-3">
      {preview ? (
        <img src={preview} alt="Pré-visualização" className="h-16 w-16 rounded-xl object-cover" />
      ) : (
        <span className="grid h-16 w-16 place-items-center rounded-xl border border-dashed border-[#171614]/20 text-[#171614]/30">
          <ImagePlus size={20} />
        </span>
      )}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#171614]/15 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#171614]/70 transition-colors hover:border-[#d96014] hover:text-[#d96014]">
        Escolher imagem
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              const img = new Image();
              img.onerror = () => {};
              img.onload = () => {
                const max = 900;
                const scale = Math.min(1, max / Math.max(img.width, img.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(img.width * scale));
                canvas.height = Math.max(1, Math.round(img.height * scale));
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const url = canvas.toDataURL("image/jpeg", 0.82);
                setPreview(url);
                onChange(url);
              };
              img.src = String(reader.result ?? "");
            };
            reader.readAsDataURL(file);
          }}
        />
      </label>
      {preview && (
        <button
          type="button"
          onClick={() => {
            setPreview("");
            onChange("");
          }}
          className="rounded-full px-3 py-2 text-[11px] font-black uppercase text-[#9e2b16]"
        >
          Remover
        </button>
      )}
      <p className="text-[10px] leading-4 text-[#171614]/40">
        Ou cole um link:<br />
        <input
          value={value.startsWith("data:") ? "" : value}
          onChange={(event) => {
            const url = event.target.value.trim();
            setPreview(url);
            onChange(url);
          }}
          placeholder="https://…"
          className="mt-1 h-9 w-44 rounded-full border border-[#171614]/15 bg-[#f5f1e8] px-4 text-xs outline-none focus:border-[#d96014]"
        />
      </p>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#171614]/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto my-8 max-w-lg rounded-3xl bg-[#f5f1e8] p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-3xl tracking-[0.02em]">{title}</h3>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-[#171614]/15 hover:bg-[#171614] hover:text-[#f5f1e8]" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputClass =
  "w-full h-11 rounded-full border border-[#171614]/15 bg-white px-5 text-sm outline-none placeholder:text-[#171614]/35 focus:border-[#d96014]";

export default function Menu() {
  const [tab, setTab] = useState<Tab>("produtos");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [productDraft, setProductDraft] = useState<ProductDraft | null>(null);
  const [comboDraft, setComboDraft] = useState<ComboDraft | null>(null);
  const [formKey, setFormKey] = useState(0);

  const [newCategory, setNewCategory] = useState("");
  const [renameCategory, setRenameCategory] = useState<{ id: number; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getAdminMenu();
      setProducts(data.products);
      setCategories(data.categories);
      setCombos(data.combos);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar o cardápio.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryName = (id: number) => categories.find((category) => category.id === id)?.name ?? "Sem categoria";

  const openNewProduct = () => {
    setFormKey((key) => key + 1);
    setProductDraft({
      id: null,
      name: "",
      description: "",
      price: "",
      promoPrice: "",
      categoryId: categories[0]?.id ?? 0,
      image: "",
      accent: accents[0],
      tag: "",
      active: true,
    });
  };

  const openEditProduct = (product: Product) => {
    setFormKey((key) => key + 1);
    setProductDraft({
      id: product.id,
      name: product.name,
      description: product.description,
      price: String(product.price).replace(".", ","),
      promoPrice: product.promoPrice ? String(product.promoPrice).replace(".", ",") : "",
      categoryId: product.categoryId,
      image: product.image,
      accent: product.accent || accents[0],
      tag: product.tag ?? "",
      active: product.active === 1,
    });
  };

  const saveProduct = async () => {
    if (!productDraft) return;
    const price = Number.parseFloat(productDraft.price.replace(",", "."));
    const promoPrice = productDraft.promoPrice ? Number.parseFloat(productDraft.promoPrice.replace(",", ".")) : null;
    if (!productDraft.name.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Informe um preço válido.");
      return;
    }
    if (!productDraft.categoryId) {
      toast.error("Crie uma categoria antes.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: productDraft.name.trim(),
        description: productDraft.description.trim(),
        price,
        promoPrice,
        categoryId: productDraft.categoryId,
        image: productDraft.image,
        accent: productDraft.accent || accents[0],
        tag: productDraft.tag.trim() || null,
        active: productDraft.active,
      };
      if (productDraft.id) {
        await api.updateProduct(productDraft.id, body);
        toast.success("Produto atualizado.");
      } else {
        await api.createProduct(body);
        toast.success("Produto criado.");
      }
      setProductDraft(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar produto.");
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product: Product) => {
    if (!confirm(`Excluir "${product.name}"?`)) return;
    try {
      await api.deleteProduct(product.id);
      toast.success("Produto excluído.");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  };

  const openNewCombo = () => {
    setFormKey((key) => key + 1);
    setComboDraft({ id: null, name: "", description: "", price: "", image: "", active: true, items: [] });
  };

  const openEditCombo = (combo: Combo) => {
    setFormKey((key) => key + 1);
    setComboDraft({
      id: combo.id,
      name: combo.name,
      description: combo.description,
      price: String(combo.price).replace(".", ","),
      image: combo.image,
      active: combo.active === 1,
      items: combo.items.map((item) => ({ productId: item.productId, name: item.name, qty: item.qty })),
    });
  };

  const saveCombo = async () => {
    if (!comboDraft) return;
    const price = Number.parseFloat(comboDraft.price.replace(",", "."));
    if (!comboDraft.name.trim()) {
      toast.error("Informe o nome do combo.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Informe um preço válido.");
      return;
    }
    if (comboDraft.items.length === 0) {
      toast.error("Adicione ao menos um item ao combo.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: comboDraft.name.trim(),
        description: comboDraft.description.trim(),
        price,
        image: comboDraft.image,
        active: comboDraft.active,
        items: comboDraft.items.map((item) => ({ productId: item.productId, qty: item.qty })),
      };
      if (comboDraft.id) {
        await api.updateCombo(comboDraft.id, body);
        toast.success("Combo atualizado.");
      } else {
        await api.createCombo(body);
        toast.success("Combo criado.");
      }
      setComboDraft(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar combo.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCombo = async (combo: Combo) => {
    if (!confirm(`Excluir o combo "${combo.name}"?`)) return;
    try {
      await api.deleteCombo(combo.id);
      toast.success("Combo excluído.");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  };

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    try {
      await api.createCategory({ name });
      setNewCategory("");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar categoria.");
    }
  };

  const saveRenameCategory = async () => {
    if (!renameCategory) return;
    try {
      await api.updateCategory(renameCategory.id, { name: renameCategory.name.trim() });
      setRenameCategory(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao renomear.");
    }
  };

  const deleteCategory = async (category: Category) => {
    if (!confirm(`Excluir "${category.name}"?`)) return;
    try {
      await api.deleteCategory(category.id);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  };

  const addComboItem = (productId: number, qty: number) => {
    if (!comboDraft) return;
    const product = products.find((entry) => entry.id === productId);
    if (!product) return;
    setComboDraft((draft) => {
      if (!draft) return draft;
      const items = draft.items.filter((item) => item.productId !== productId);
      return { ...draft, items: [...items, { productId, name: product.name, qty: Math.max(1, Math.floor(qty) || 1) }] };
    });
  };

  const tabs: { value: Tab; label: string; icon: typeof Layers }[] = [
    { value: "produtos", label: "Produtos", icon: UtensilsCrossed },
    { value: "combos", label: "Combos", icon: Layers },
    { value: "categorias", label: "Categorias", icon: Layers },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d96014]">Gestão do cardápio</p>
          <h1 className="mt-2 font-display text-5xl leading-[0.9] tracking-[0.02em]">CARDÁPIO</h1>
        </div>
        {tab === "produtos" && (
          <button onClick={openNewProduct} className="inline-flex items-center gap-2 rounded-full bg-[#171614] px-5 py-3 text-[11px] font-black uppercase tracking-[0.13em] text-[#f5f1e8] transition-all hover:bg-[#2d2b27] active:scale-[0.97]">
            <Plus size={15} /> Novo produto
          </button>
        )}
        {tab === "combos" && (
          <button onClick={openNewCombo} className="inline-flex items-center gap-2 rounded-full bg-[#171614] px-5 py-3 text-[11px] font-black uppercase tracking-[0.13em] text-[#f5f1e8] transition-all hover:bg-[#2d2b27] active:scale-[0.97]">
            <Plus size={15} /> Novo combo
          </button>
        )}
      </header>

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              onClick={() => setTab(item.value)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] transition-colors ${
                tab === item.value ? "border-[#171614] bg-[#171614] text-[#f5f1e8]" : "border-[#171614]/15 text-[#171614]/55 hover:border-[#d96014]"
              }`}
            >
              <Icon size={14} /> {item.label}
            </button>
          );
        })}
      </div>

      {tab === "produtos" && (
        <div className="grid gap-5 lg:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="flex gap-4 rounded-3xl border border-[#171614]/10 bg-white/70 p-4">
              <div className={`grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br ${product.accent || accents[0]}`}>
                {product.image ? (
                  <img src={product.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-3xl text-white/50">{product.name.charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#d96014]">{categoryName(product.categoryId)}</p>
                  {product.promoPrice && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase text-white">Promo</span>}
                </div>
                <h3 className="truncate font-display text-2xl leading-none">{product.name}</h3>
                <p className="mt-1 text-sm font-black">
                  {product.promoPrice ? (
                    <>
                      <span className="text-[#171614]/40 line-through">{formatBRL(product.price)}</span>{" "}
                      <span className="text-[#d96014]">{formatBRL(product.promoPrice)}</span>
                    </>
                  ) : (
                    formatBRL(product.price)
                  )}
                </p>
                <p className={`mt-1 text-[11px] font-bold uppercase tracking-[0.1em] ${product.active === 1 ? "text-[#2b7a4b]" : "text-[#9e2b16]"}`}>
                  {product.active === 1 ? "Disponível" : "Oculto do cardápio"}
                </p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => openEditProduct(product)} className="inline-flex items-center gap-1.5 rounded-full border border-[#171614]/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] hover:border-[#d96014] hover:text-[#d96014]">
                    <Pencil size={13} /> Editar
                  </button>
                  <button onClick={() => deleteProduct(product)} className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-red-600 hover:border-red-400">
                    <Trash2 size={13} /> Excluir
                  </button>
                </div>
              </div>
            </article>
          ))}
          {products.length === 0 && <p className="col-span-full text-sm text-[#171614]/45">Nenhum produto ainda. Clique em "Novo produto".</p>}
        </div>
      )}

      {tab === "combos" && (
        <div className="grid gap-5 lg:grid-cols-2">
          {combos.map((combo) => (
            <article key={combo.id} className="flex gap-4 rounded-3xl border border-[#171614]/10 bg-white/70 p-4">
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#382414] to-[#d37b25]">
                {combo.image ? (
                  <img src={combo.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-3xl text-white/50">{combo.name.charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-2xl leading-none">{combo.name}</h3>
                <p className="mt-1 text-sm font-black text-[#d96014]">{formatBRL(combo.price)}</p>
                <p className={`mt-1 text-[11px] font-bold uppercase tracking-[0.1em] ${combo.active === 1 ? "text-[#2b7a4b]" : "text-[#9e2b16]"}`}>
                  {combo.active === 1 ? "Ativo" : "Inativo"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {combo.items.map((item) => (
                    <span key={item.productId} className="rounded-full bg-[#171614]/8 px-2.5 py-1 text-[10px] font-bold text-[#171614]/60">
                      {item.qty}x {item.name}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => openEditCombo(combo)} className="inline-flex items-center gap-1.5 rounded-full border border-[#171614]/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] hover:border-[#d96014] hover:text-[#d96014]">
                    <Pencil size={13} /> Editar
                  </button>
                  <button onClick={() => deleteCombo(combo)} className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-red-600 hover:border-red-400">
                    <Trash2 size={13} /> Excluir
                  </button>
                </div>
              </div>
            </article>
          ))}
          {combos.length === 0 && <p className="col-span-full text-sm text-[#171614]/45">Nenhum combo ainda. Clique em "Novo combo".</p>}
        </div>
      )}

      {tab === "categorias" && (
        <div className="max-w-xl space-y-3">
          <div className="flex items-center gap-2">
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void addCategory();
                }
              }}
              placeholder="Nome da nova categoria…"
              className={inputClass}
            />
            <button onClick={() => void addCategory()} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#171614] px-5 text-[11px] font-black uppercase tracking-[0.12em] text-[#f5f1e8]">
              <Plus size={14} /> Adicionar
            </button>
          </div>
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-3 rounded-3xl border border-[#171614]/10 bg-white/70 px-5 py-4">
              {renameCategory?.id === category.id ? (
                <>
                  <input
                    value={renameCategory.name}
                    onChange={(event) => setRenameCategory({ id: category.id, name: event.target.value })}
                    className={inputClass}
                    autoFocus
                  />
                  <button onClick={() => void saveRenameCategory()} className="rounded-full bg-[#171614] px-4 py-2.5 text-[10px] font-black uppercase text-[#f5f1e8]">
                    Salvar
                  </button>
                  <button onClick={() => setRenameCategory(null)} className="rounded-full px-3 py-2.5 text-[10px] font-black uppercase text-[#171614]/50">
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate font-display text-2xl">{category.name}</span>
                  <span className="text-xs font-black text-[#171614]/40">{products.filter((p) => p.categoryId === category.id).length} itens</span>
                  <button onClick={() => setRenameCategory({ id: category.id, name: category.name })} className="grid h-9 w-9 place-items-center rounded-full border border-[#171614]/15 hover:text-[#d96014]" aria-label="Renomear">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => void deleteCategory(category)} className="grid h-9 w-9 place-items-center rounded-full border border-red-200 text-red-600 hover:border-red-400" aria-label="Excluir">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {productDraft && (
        <Modal title={productDraft.id ? "Editar produto" : "Novo produto"} onClose={() => setProductDraft(null)}>
          <div className="mt-5 space-y-4">
            <ImageInput key={formKey} value={productDraft.image} onChange={(image) => setProductDraft({ ...productDraft, image })} />
            <input value={productDraft.name} onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })} placeholder="Nome do produto" className={inputClass} />
            <textarea
              value={productDraft.description}
              onChange={(event) => setProductDraft({ ...productDraft, description: event.target.value })}
              placeholder="Descrição curta…"
              className="w-full min-h-[72px] resize-none rounded-3xl border border-[#171614]/15 bg-white px-5 py-4 text-sm outline-none placeholder:text-[#171614]/35 focus:border-[#d96014]"
            />
            <select value={productDraft.categoryId} onChange={(event) => setProductDraft({ ...productDraft, categoryId: Number(event.target.value) })} className={inputClass + " cursor-pointer"}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input value={productDraft.price} onChange={(event) => setProductDraft({ ...productDraft, price: event.target.value })} placeholder="Preço (ex.: 29,90)" inputMode="decimal" className={inputClass} />
              <input value={productDraft.promoPrice} onChange={(event) => setProductDraft({ ...productDraft, promoPrice: event.target.value })} placeholder="Preço promocional (opcional)" inputMode="decimal" className={inputClass} />
            </div>
            <input value={productDraft.tag} onChange={(event) => setProductDraft({ ...productDraft, tag: event.target.value })} placeholder="Etiqueta (ex.: Mais pedido, Novo)" className={inputClass} />
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#171614]/50">Cor de fundo</p>
              <div className="flex flex-wrap gap-2">
                {accents.map((accent) => (
                  <button
                    key={accent}
                    type="button"
                    onClick={() => setProductDraft({ ...productDraft, accent })}
                    className={`h-9 w-9 rounded-full bg-gradient-to-br ${accent} border-2 ${productDraft.accent === accent ? "border-[#171614]" : "border-transparent"}`}
                    aria-label="Cor"
                  />
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-[#171614]/70">
              <input type="checkbox" checked={productDraft.active} onChange={(event) => setProductDraft({ ...productDraft, active: event.target.checked })} className="h-4 w-4 accent-[#d96014]" />
              Visível no cardápio
            </label>
            <button
              onClick={() => void saveProduct()}
              disabled={saving}
              className="w-full rounded-full bg-[#171614] py-4 text-xs font-black uppercase tracking-[0.14em] text-[#f5f1e8] disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Salvar produto"}
            </button>
          </div>
        </Modal>
      )}

      {comboDraft && (
        <Modal title={comboDraft.id ? "Editar combo" : "Novo combo"} onClose={() => setComboDraft(null)}>
          <div className="mt-5 space-y-4">
            <ImageInput key={`c-${formKey}`} value={comboDraft.image} onChange={(image) => setComboDraft({ ...comboDraft, image })} />
            <input value={comboDraft.name} onChange={(event) => setComboDraft({ ...comboDraft, name: event.target.value })} placeholder="Nome do combo" className={inputClass} />
            <textarea
              value={comboDraft.description}
              onChange={(event) => setComboDraft({ ...comboDraft, description: event.target.value })}
              placeholder="Descrição curta…"
              className="w-full min-h-[72px] resize-none rounded-3xl border border-[#171614]/15 bg-white px-5 py-4 text-sm outline-none placeholder:text-[#171614]/35 focus:border-[#d96014]"
            />
            <input value={comboDraft.price} onChange={(event) => setComboDraft({ ...comboDraft, price: event.target.value })} placeholder="Preço do combo" inputMode="decimal" className={inputClass} />

            <div className="rounded-3xl border border-[#171614]/10 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#171614]/50">Itens do combo</p>
              <div className="mt-3 flex gap-2">
                <select id="combo-item-select" className={inputClass + " cursor-pointer"} defaultValue="">
                  {products
                    .filter((product) => product.active === 1)
                    .map((product) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                </select>
                <input
                  id="combo-item-qty"
                  defaultValue="1"
                  inputMode="numeric"
                  className="h-11 w-16 rounded-full border border-[#171614]/15 bg-white text-center text-sm outline-none focus:border-[#d96014]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const select = document.getElementById("combo-item-select") as HTMLSelectElement | null;
                    const qtyInput = document.getElementById("combo-item-qty") as HTMLInputElement | null;
                    const productId = Number(select?.value);
                    const qty = Number(qtyInput?.value ?? "1");
                    if (productId) addComboItem(productId, qty);
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#171614] px-4 text-[10px] font-black uppercase text-[#f5f1e8]"
                >
                  <Plus size={13} /> Add
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {comboDraft.items.map((item) => (
                  <span key={item.productId} className="inline-flex items-center gap-2 rounded-full bg-[#171614]/8 px-3 py-1.5 text-[11px] font-bold text-[#171614]/70">
                    {item.qty}x {item.name}
                    <button
                      type="button"
                      onClick={() => setComboDraft((draft) => draft && { ...draft, items: draft.items.filter((entry) => entry.productId !== item.productId) })}
                      className="text-[#9e2b16]"
                      aria-label={`Remover ${item.name}`}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
                {comboDraft.items.length === 0 && <p className="text-xs text-[#171614]/40">Nenhum item adicionado.</p>}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-bold text-[#171614]/70">
              <input type="checkbox" checked={comboDraft.active} onChange={(event) => setComboDraft({ ...comboDraft, active: event.target.checked })} className="h-4 w-4 accent-[#d96014]" />
              Combo ativo no cardápio
            </label>
            <button
              onClick={() => void saveCombo()}
              disabled={saving}
              className="w-full rounded-full bg-[#171614] py-4 text-xs font-black uppercase tracking-[0.14em] text-[#f5f1e8] disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Salvar combo"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}