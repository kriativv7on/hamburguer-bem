import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  Instagram,
  MapPin,
  Menu as MenuIcon,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  Utensils,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatBRL, orderTypeLabels } from "@/lib/api";
import type { Combo, Order, OrderType, PaymentMethod, Product, Review, StoreSettings, Table } from "@shared/types";

const heroImage = "/images/burger-hero.jpg";
const friesImage = "/images/fries.jpg";
const milkshakeImage = "/images/milkshake.jpg";

type CartItem = {
  key: string;
  kind: "product" | "combo";
  refId: number;
  name: string;
  price: number;
  image: string;
  accent: string;
  qty: number;
};

type AppliedCoupon = { code: string; type: "percent" | "fixed"; value: number };

const baseFallbackProducts: Omit<Product, "promoPrice">[] = [
  {
    id: 1,
    categoryId: 1,
    name: "BEM CLÁSSICO",
    description: "Smash duplo, cheddar cremoso, picles e molho Bem no pão brioche.",
    price: 29.9,
    image: heroImage,
    accent: "from-[#2b1a12] to-[#6d2f14]",
    tag: "Mais pedido",
    active: 1,
  },
  {
    id: 2,
    categoryId: 1,
    name: "BRASA BACON",
    description: "Carne na brasa, cheddar, bacon crocante, cebola caramelizada e barbecue.",
    price: 34.9,
    image: heroImage,
    accent: "from-[#1b1b1b] to-[#b34c16]",
    tag: "Da casa",
    active: 1,
  },
  {
    id: 3,
    categoryId: 1,
    name: "BEM PICANTE",
    description: "Smash duplo, pepperoni, jalapeño, cheddar e maionese defumada.",
    price: 32.9,
    image: heroImage,
    accent: "from-[#391415] to-[#9e2b16]",
    tag: null,
    active: 1,
  },
  {
    id: 4,
    categoryId: 1,
    name: "VEGGIE BEM",
    description: "Burger crocante de grão-de-bico, queijo, rúcula, tomate e molho verde.",
    price: 27.9,
    image: heroImage,
    accent: "from-[#1e2c20] to-[#67713c]",
    tag: null,
    active: 1,
  },
  {
    id: 5,
    categoryId: 2,
    name: "COMBO BEM CLÁSSICO",
    description: "BEM Clássico + batata crocante + refri lata bem gelado.",
    price: 42.9,
    image: heroImage,
    accent: "from-[#382414] to-[#d37b25]",
    tag: "Vale mais",
    active: 1,
  },
  {
    id: 6,
    categoryId: 3,
    name: "BATATA DA BEM",
    description: "Porção generosa de fritas crocantes com páprica e sal de ervas.",
    price: 18.9,
    image: friesImage,
    accent: "from-[#4e2a12] to-[#cf771f]",
    tag: null,
    active: 1,
  },
  {
    id: 7,
    categoryId: 4,
    name: "MILK-SHAKE BEM",
    description: "Baunilha cremosa, chantilly e calda de caramelo.",
    price: 19.9,
    image: milkshakeImage,
    accent: "from-[#433022] to-[#b77545]",
    tag: null,
    active: 1,
  },
  {
    id: 8,
    categoryId: 4,
    name: "REFRI LATA",
    description: "Coca-Cola, Guaraná ou Fanta. Escolha seu favorito.",
    price: 7.9,
    image: friesImage,
    accent: "from-[#1b2224] to-[#51605a]",
    tag: null,
    active: 1,
  },
];

const fallbackProducts: Product[] = baseFallbackProducts.map((product) => ({ ...product, promoPrice: null }));

const fallbackCategories = [
  { id: 1, name: "Hambúrgueres" },
  { id: 2, name: "Combos" },
  { id: 3, name: "Acompanhamentos" },
  { id: 4, name: "Bebidas" },
];

const formatPrice = (price: number) => formatBRL(price);

const paymentOptions: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: "pix", label: "Pix", hint: "QR Code ou escaneie rapidinho" },
  { value: "cartao", label: "Cartão", hint: "Débito ou crédito" },
  { value: "dinheiro", label: "Dinheiro", hint: "Pague na entrega / balcão" },
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [categories, setCategories] = useState(fallbackCategories);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
const [settings, setSettings] = useState<StoreSettings | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [tableId, setTableId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    api
      .getMenu()
      .then((menu) => {
        if (menu.products.length > 0) setProducts(menu.products);
        if (menu.categories.length > 0)
          setCategories(menu.categories.map((c, i) => ({ id: c.id, name: c.name, sort: i })));
        if (menu.combos) setCombos(menu.combos);
      })
      .catch(() => {});
    api.getReviews().then(setReviews).catch(() => {});
    api.getTables().then(setTables).catch(() => {});
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  const categoryNames = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const visibleItems = useMemo(
    () =>
      activeCategory === "Todos"
        ? products
        : products.filter((item) => categoryNames.get(item.categoryId) === activeCategory),
    [activeCategory, products, categoryNames],
  );

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const cartDiscount = useMemo(() => {
    if (!coupon) return 0;
    const discount =
      coupon.type === "percent"
        ? Math.floor(cartSubtotal * coupon.value) / 100
        : Math.min(coupon.value, cartSubtotal);
    return Math.round(discount * 100) / 100;
  }, [coupon, cartSubtotal]);
  const cartTotal = Math.max(0, cartSubtotal - cartDiscount);

  const instagramUrl = settings?.instagram
    ? `https://instagram.com/${settings.instagram.replace(/^@/, "")}`
    : "";
  const whatsappUrl = settings?.whatsapp
    ? `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`
    : "";

  const addToCart = (product: Product) => {
    const key = `p-${product.id}`;
    setCart((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) => (item.key === key ? { ...item, qty: item.qty + 1 } : item));
      }
      return [
        ...current,
        {
          key,
          kind: "product",
          refId: product.id,
          name: product.name,
          price: product.promoPrice ?? product.price,
          image: product.image,
          accent: product.accent,
          qty: 1,
        },
      ];
    });
    toast.success(`${product.name} entrou no seu pedido`);
  };

  const addComboToCart = (combo: Combo) => {
    const key = `c-${combo.id}`;
    setCart((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) => (item.key === key ? { ...item, qty: item.qty + 1 } : item));
      }
      return [
        ...current,
        {
          key,
          kind: "combo",
          refId: combo.id,
          name: combo.name,
          price: combo.price,
          image: combo.image,
          accent: "from-[#382414] to-[#d37b25]",
          qty: 1,
        },
      ];
    });
    toast.success(`${combo.name} entrou no seu pedido`);
  };

  const changeQty = (key: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) => (item.key === key ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0),
    );
  };

  const applyCoupon = async () => {
    const code = couponCode.trim();
    if (!code || couponLoading) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const result = await api.validateCoupon(code);
      if (result.valid && result.type !== undefined && result.value !== undefined) {
        setCoupon({ code: result.type === "percent" ? code.toUpperCase() : code.toUpperCase(), type: result.type, value: result.value });
        toast.success("Cupom aplicado!");
      } else {
        setCoupon(null);
        setCouponError(result.reason ?? "Cupom inválido.");
      }
    } catch {
      setCoupon(null);
      setCouponError("Não foi possível validar o cupom.");
    } finally {
      setCouponLoading(false);
    }
  };

  const openCart = () => {
    setPlacedOrder(null);
    setCartOpen(true);
  };

  const canSubmit = useMemo(() => {
    if (cart.length === 0) return false;
    if (!name.trim()) return false;
    if (!phone.trim()) return false;
    if (orderType === "delivery" && !address.trim()) return false;
    if (orderType === "mesa" && !tableId) return false;
    return true;
  }, [cart, name, phone, address, orderType, tableId]);

  const handleCheckout = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const order = await api.createOrder({
        type: orderType,
        paymentMethod,
        tableId: orderType === "mesa" ? tableId : null,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        address: orderType === "delivery" ? address.trim() : "",
        note: note.trim() || undefined,
        couponCode: coupon?.code,
        items: cart.map((item) =>
          item.kind === "product"
            ? { productId: item.refId, comboId: null, qty: item.qty }
            : { productId: null, comboId: item.refId, qty: item.qty },
        ),
      });
      setPlacedOrder(order);
      setCart([]);
      setName("");
      setPhone("");
      setAddress("");
      setNote("");
      setTableId(null);
      setOrderType("delivery");
      setPaymentMethod("pix");
      setCouponCode("");
      setCoupon(null);
      setCouponError("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o pedido.");
    } finally {
      setSubmitting(false);
    }
  };

  const availableTables = useMemo(
    () => tables.filter((table) => table.status === "livre"),
    [tables],
  );

  const submitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customerName = String(form.get("reviewerName") ?? "").trim();
    const rating = Number(form.get("rating"));
    const comment = String(form.get("comment") ?? "").trim();
    if (!customerName || rating < 1 || rating > 5) {
      toast.error("Dê uma nota entre 1 e 5 estrelas.");
      return;
    }
    try {
      const review = await api.createReview({ customerName, rating, comment });
      setReviews((current) => [review, ...current]);
      toast.success("Avaliação enviada com sucesso!");
      event.currentTarget.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar avaliação.");
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f1e8] text-[#171614]">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#171614]/90 text-[#f5f1e8] backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <a href="#inicio" className="group flex items-center gap-3" aria-label="Ir para o início">
            {settings?.logo ? (
              <img
                src={settings.logo}
                alt={settings.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#f47721] text-[#171614] transition-transform duration-200 group-hover:rotate-6">
                <Flame size={21} strokeWidth={2.7} />
              </span>
            )}
            <span className="font-display text-[25px] leading-none tracking-[0.04em]">
              {settings?.name?.toUpperCase() || "HAMBÚRGUER BEM"}
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-[12px] font-bold uppercase tracking-[0.16em] md:flex">
            <a className="text-[#f5f1e8]/65 transition-colors hover:text-[#f47721]" href="#cardapio">Cardápio</a>
            <a className="text-[#f5f1e8]/65 transition-colors hover:text-[#f47721]" href="#como-funciona">Como funciona</a>
            <a className="text-[#f5f1e8]/65 transition-colors hover:text-[#f47721]" href="#avaliacoes">Avaliações</a>
            <a className="text-[#f5f1e8]/65 transition-colors hover:text-[#f47721]" href="#onde-estamos">Onde estamos</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={openCart}
              className="relative grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/5 transition-all duration-200 hover:border-[#f47721] hover:bg-[#f47721] hover:text-[#171614] active:scale-[0.97]"
              aria-label={`Abrir carrinho com ${cartCount} itens`}
            >
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#f47721] px-1 text-[10px] font-black text-[#171614]">
                  {cartCount}
                </span>
              )}
            </button>
            <a
              href="#cardapio"
              className="hidden items-center gap-2 rounded-full bg-[#f47721] px-5 py-3 text-[11px] font-black uppercase tracking-[0.13em] text-[#171614] shadow-[0_8px_24px_rgba(244,119,33,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#ff8a36] active:scale-[0.97] sm:flex"
            >
              Pedir agora <ArrowUpRight size={15} />
            </a>
            <button
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/15 md:hidden"
              aria-label="Abrir menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={19} /> : <MenuIcon size={19} />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <nav className="border-t border-white/10 bg-[#171614] px-5 py-4 md:hidden">
            <div className="flex flex-col gap-4 text-[12px] font-bold uppercase tracking-[0.16em]">
              <a href="#cardapio" onClick={() => setMobileMenuOpen(false)}>Cardápio</a>
              <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)}>Como funciona</a>
              <a href="#avaliacoes" onClick={() => setMobileMenuOpen(false)}>Avaliações</a>
              <a href="#onde-estamos" onClick={() => setMobileMenuOpen(false)}>Onde estamos</a>
            </div>
          </nav>
        )}
      </header>

      <main>
        <section id="inicio" className="relative isolate min-h-[720px] overflow-hidden bg-[#171614] pt-[76px] text-[#f5f1e8]">
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_76%_36%,rgba(244,119,33,0.22),transparent_30%),linear-gradient(118deg,#171614_0%,#171614_41%,#2b2019_100%)]" />
          <div className="absolute inset-y-0 right-0 -z-10 w-full bg-cover bg-center opacity-90 [mask-image:linear-gradient(90deg,transparent_2%,rgba(0,0,0,0.3)_32%,#000_61%)] sm:w-[74%]" style={{ backgroundImage: `url(${heroImage})` }} />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(23,22,20,0.98)_0%,rgba(23,22,20,0.86)_31%,rgba(23,22,20,0.15)_70%,rgba(23,22,20,0.25)_100%)]" />
          <div className="absolute bottom-0 left-0 right-0 -z-10 h-40 bg-gradient-to-t from-[#f5f1e8] via-transparent to-transparent" />

          <div className="mx-auto grid min-h-[644px] max-w-7xl items-center px-5 pb-28 pt-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:pb-36">
            <div className="max-w-[610px] animate-[hero-in_700ms_cubic-bezier(0.23,1,0.32,1)]">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#f47721]/35 bg-[#f47721]/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#ff9c5b]">
                <Sparkles size={13} /> Smash burgers de verdade
              </div>
              <h1 className="font-display text-[clamp(4.2rem,9vw,8.2rem)] leading-[0.86] tracking-[0.01em] text-[#f5f1e8]">
                MATA A FOME.<br /><span className="text-[#f47721]">FAZ BEM.</span>
              </h1>
              <p className="mt-7 max-w-[430px] text-base leading-7 text-[#f5f1e8]/68 sm:text-lg">
                Hambúrguer artesanal, ingredientes de respeito e aquele sabor que faz Nova Iguaçu pedir bis.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href="#cardapio" className="inline-flex items-center justify-center gap-3 rounded-full bg-[#f47721] px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-[#171614] shadow-[0_12px_32px_rgba(244,119,33,0.3)] transition-all duration-200 hover:-translate-y-1 hover:bg-[#ff9145] active:scale-[0.97]">
                  Ver o cardápio <ArrowUpRight size={16} />
                </a>
                <a href="#como-funciona" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-[#f5f1e8] transition-colors hover:border-[#f47721] hover:text-[#f47721]">
                  Como pedir <ChevronRight size={16} />
                </a>
              </div>
              <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs text-[#f5f1e8]/65">
                <span className="flex items-center gap-2"><Clock3 size={15} className="text-[#f47721]" /> Ter–Dom · 18h–23h</span>
                <span className="flex items-center gap-2"><MapPin size={15} className="text-[#f47721]" /> Nova Iguaçu · RJ</span>
              </div>
            </div>
            <div className="hidden lg:block" />
          </div>
        </section>

        <div className="relative z-10 -mt-8 border-y border-[#171614]/10 bg-[#f47721] py-3.5 text-[#171614]">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-7 overflow-hidden whitespace-nowrap px-5 text-[11px] font-black uppercase tracking-[0.2em] sm:gap-10">
            <span>feito na hora</span><span className="text-[#171614]/40">✦</span><span>pão brioche</span><span className="text-[#171614]/40">✦</span><span>carne 100% bovina</span><span className="text-[#171614]/40">✦</span><span>entrega em nova iguaçu</span>
          </div>
        </div>

        <section id="cardapio" className="scroll-mt-24 mx-auto max-w-7xl px-5 pb-24 pt-24 sm:px-8 lg:px-10 lg:pb-32 lg:pt-32">
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div>
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.22em] text-[#d96014]">Escolha seu momento</p>
              <h2 className="font-display text-6xl leading-[0.9] tracking-[0.02em] sm:text-7xl">CARDÁPIO<br /><span className="text-[#d96014]">BEM DEMAIS.</span></h2>
            </div>
            <p className="max-w-[300px] text-sm leading-6 text-[#171614]/58">Pediu, enviou e a gente já começa a preparar na hora.</p>
          </div>

          <div className="mt-12 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {["Todos", ...categories.map((c) => c.name)].map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`shrink-0 rounded-full border px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.97] ${activeCategory === category ? "border-[#171614] bg-[#171614] text-[#f5f1e8]" : "border-[#171614]/15 bg-transparent text-[#171614]/60 hover:border-[#d96014] hover:text-[#d96014]"}`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {visibleItems.map((item, index) => (
              <article key={item.id} className="group overflow-hidden rounded-[22px] border border-[#171614]/10 bg-[#ebe5d9] shadow-[0_15px_40px_rgba(23,22,20,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(23,22,20,0.12)]" style={{ animationDelay: `${index * 45}ms` }}>
                <div className={`relative h-[205px] overflow-hidden bg-gradient-to-br ${item.accent}`}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover mix-blend-normal opacity-90 transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="font-display text-5xl text-[#f5f1e8]/25">{item.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  {item.tag && <span className="absolute left-4 top-4 rounded-full bg-[#f47721] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-[#171614]">{item.tag}</span>}
                  {!item.tag && item.promoPrice && <span className="absolute left-4 top-4 rounded-full bg-[#e11d2e] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-white">Promoção</span>}
                  <span className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-[#171614]/75 px-3 py-1.5 text-xs font-black text-[#f5f1e8] backdrop-blur">
                    {item.promoPrice ? (
                      <>
                        <span className="text-[#f5f1e8]/55 line-through">{formatPrice(item.price)}</span>
                        <span className="text-[#f47721]">{formatPrice(item.promoPrice)}</span>
                      </>
                    ) : (
                      formatPrice(item.price)
                    )}
                  </span>
                </div>
                <div className="p-5">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#d96014]">{categoryNames.get(item.categoryId) ?? "Cardápio"}</p>
                  <h3 className="font-display text-[28px] leading-none tracking-[0.03em]">{item.name}</h3>
                  <p className="mt-3 min-h-[60px] text-[13px] leading-5 text-[#171614]/58">{item.description}</p>
                  <button onClick={() => addToCart(item)} className="mt-5 flex w-full items-center justify-between rounded-full border border-[#171614]/15 px-4 py-3 text-[11px] font-black uppercase tracking-[0.13em] transition-all duration-200 hover:border-[#f47721] hover:bg-[#f47721] active:scale-[0.98]">
                    Adicionar <Plus size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {combos.length > 0 && (
          <section id="combos" className="scroll-mt-24 bg-[#171614] px-5 py-24 text-[#f5f1e8] sm:px-8 lg:px-10 lg:py-28">
            <div className="mx-auto max-w-7xl">
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.22em] text-[#f47721]">Monte seu combo</p>
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <h2 className="font-display text-6xl leading-[0.9] tracking-[0.02em] sm:text-7xl">COMBO<br /><span className="text-[#f47721]">BEM FEITO.</span></h2>
                <p className="max-w-[280px] text-sm leading-6 text-[#f5f1e8]/50">Melhor ainda junto: escolha um combo pronto e economize.</p>
              </div>
              <div className="mt-12 grid gap-5 md:grid-cols-3">
                {combos.map((combo) => (
                  <article key={combo.id} className="group flex flex-col overflow-hidden rounded-[24px] border border-white/10 bg-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-[#f47721]/40">
                    <div className="relative h-[180px] overflow-hidden bg-gradient-to-br from-[#382414] to-[#d37b25]">
                      {combo.image ? (
                        <img src={combo.image} alt={combo.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center"><span className="font-display text-6xl text-white/25">{combo.name.charAt(0)}</span></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#171614]/70 via-transparent to-transparent" />
                      <span className="absolute bottom-4 right-4 rounded-full bg-[#f47721] px-3 py-1.5 text-xs font-black text-[#171614]">{formatPrice(combo.price)}</span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-display text-3xl leading-none tracking-[0.03em]">{combo.name}</h3>
                      <p className="mt-2 text-[13px] leading-5 text-[#f5f1e8]/55">{combo.description}</p>
                      {combo.items.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {combo.items.map((item) => (
                            <span key={`${combo.id}-${item.productId}`} className="rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#f5f1e8]/70">
                              {item.qty}x {item.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <button onClick={() => addComboToCart(combo)} className="mt-auto flex w-full items-center justify-between rounded-full border border-white/15 px-4 py-3 pt-3 text-[11px] font-black uppercase tracking-[0.13em] text-[#f5f1e8] transition-all duration-200 hover:border-[#f47721] hover:bg-[#f47721] hover:text-[#171614] active:scale-[0.98]">
                        Adicionar combo <Plus size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="como-funciona" className="scroll-mt-24 bg-[#171614] px-5 py-24 text-[#f5f1e8] sm:px-8 lg:px-10 lg:py-32">
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-24">
            <div>
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.22em] text-[#f47721]">Do seu jeito</p>
              <h2 className="font-display text-6xl leading-[0.9] tracking-[0.02em] sm:text-7xl">PEDIU.<br /><span className="text-[#f47721]">CHEGOU.</span></h2>
              <p className="mt-7 max-w-[410px] text-base leading-7 text-[#f5f1e8]/62">Sem complicação e sem enrolação. Escolha seu lanche, mande uma mensagem e a gente cuida do resto.</p>
              <div className="mt-10 flex flex-col gap-5">
                {[
                  ["01", "Escolha seu lanche", "Monte seu pedido com os favoritos da casa."],
                  ["02", "Confirme seus dados", "Entrega, balcão ou mesa — é só escolher como quer receber."],
                  ["03", "Receba quentinho", "A gente prepara na hora e entrega em Nova Iguaçu."],
                ].map(([number, title, text]) => (
                  <div key={number} className="flex gap-4 border-t border-white/10 pt-5">
                    <span className="font-display text-3xl text-[#f47721]">{number}</span>
                    <div><h3 className="text-sm font-black uppercase tracking-[0.1em]">{title}</h3><p className="mt-1 text-sm leading-5 text-[#f5f1e8]/50">{text}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              <div className="relative col-span-2 h-[250px] overflow-hidden rounded-[26px] sm:h-[330px]">
                <img src={friesImage} alt="Batata crocante da Hambúrguer Bem" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#171614]/70 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 flex items-center gap-2 text-xs font-black uppercase tracking-[0.13em]"><Utensils size={15} className="text-[#f47721]" /> feito na hora</div>
              </div>
              <div className="relative h-[190px] overflow-hidden rounded-[26px] sm:h-[245px]"><img src={milkshakeImage} alt="Milk-shake cremoso" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" /></div>
              <div className="flex flex-col justify-between rounded-[26px] bg-[#f47721] p-5 text-[#171614] sm:p-7"><Star className="fill-[#171614]" size={22} /><p className="font-display text-4xl leading-[0.9]">SABOR QUE<br />FICA.</p><span className="text-[10px] font-black uppercase tracking-[0.12em]">Desde 2024</span></div>
            </div>
          </div>
        </section>

        <section id="avaliacoes" className="scroll-mt-24 mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><p className="mb-4 text-[11px] font-black uppercase tracking-[0.22em] text-[#d96014]">Quem prova, volta</p><h2 className="font-display text-6xl leading-[0.9] tracking-[0.02em] sm:text-7xl">FALOU,<br /><span className="text-[#d96014]">TÁ FALADO.</span></h2></div>
            <div className="flex gap-1 text-[#f47721]" aria-label="5 estrelas"><Star size={17} className="fill-current" /><Star size={17} className="fill-current" /><Star size={17} className="fill-current" /><Star size={17} className="fill-current" /><Star size={17} className="fill-current" /></div>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {reviews.length > 0
              ? reviews.slice(0, 3).map((review) => (
                  <blockquote key={review.id} className="flex min-h-[200px] flex-col justify-between rounded-[22px] bg-[#ebe5d9] p-6 sm:p-7">
                    <div>
                      <div className="flex gap-1 text-[#f47721]" aria-label={`${review.rating} estrelas`}>
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star key={index} size={15} className={index < review.rating ? "fill-current" : "text-[#171614]/20"} />
                        ))}
                      </div>
                      <p className="mt-3 text-[15px] leading-6 text-[#171614]/72">“{review.comment}”</p>
                    </div>
                    <footer className="mt-8 border-t border-[#171614]/10 pt-4">
                      <p className="text-xs font-black uppercase tracking-[0.12em]">{review.customerName}</p>
                      <p className="mt-1 text-xs text-[#171614]/45">Cliente da casa</p>
                    </footer>
                  </blockquote>
                ))
              : [
                  ["O smash é absurdo! O pão, a carne, o molho… tudo no ponto. Já virou meu pedido oficial de sexta.", "Marina S."],
                  ["Finalmente um lanche caprichado e que chega quentinho em Nova Iguaçu. A batata também merece aplausos.", "Rafael M."],
                  ["Pedi o Bem Clássico e entendi o nome: faz bem mesmo. Atendimento rápido e sabor de sobra.", "Júlia C."],
                ].map(([quote, name]) => (
                  <blockquote key={name} className="flex min-h-[200px] flex-col justify-between rounded-[22px] bg-[#ebe5d9] p-6 sm:p-7">
                    <div><span className="font-display text-5xl leading-none text-[#f47721]">“</span><p className="mt-2 text-[15px] leading-6 text-[#171614]/72">{quote}</p></div>
                    <footer className="mt-8 border-t border-[#171614]/10 pt-4"><p className="text-xs font-black uppercase tracking-[0.12em]">{name}</p><p className="mt-1 text-xs text-[#171614]/45">Cliente da casa</p></footer>
                  </blockquote>
                ))}
          </div>

          <form onSubmit={submitReview} className="mt-12 grid gap-5 rounded-[22px] border border-[#171614]/10 bg-[#ebe5d9] p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#d96014]">Deixe sua avaliação</p>
              <h3 className="mt-2 font-display text-3xl tracking-[0.02em]">COMO FOI SUA<br />EXPERIÊNCIA?</h3>
              <p className="mt-2 max-w-[480px] text-sm leading-6 text-[#171614]/58">Sua opinião ajuda a gente a fazer cada pedido ainda melhor.</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input name="reviewerName" placeholder="Seu nome" className="h-12 flex-1 rounded-full border border-[#171614]/15 bg-[#f5f1e8] px-5 text-sm outline-none transition-colors placeholder:text-[#171614]/40 focus:border-[#d96014]" />
                <div className="flex items-center gap-1 rounded-full border border-[#171614]/15 bg-[#f5f1e8] px-4 py-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} size={20} className="fill-[#f47721] text-[#f47721]" />
                  ))}
                  <input type="hidden" name="rating" value={5} />
                </div>
              </div>
              <textarea name="comment" placeholder="Conta pra gente como foi…" className="mt-3 min-h-[90px] w-full resize-none rounded-3xl border border-[#171614]/15 bg-[#f5f1e8] px-5 py-4 text-sm outline-none transition-colors placeholder:text-[#171614]/40 focus:border-[#d96014]" />
            </div>
            <button type="submit" className="inline-flex w-fit items-center gap-3 rounded-full bg-[#171614] px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-[#f5f1e8] transition-all duration-200 hover:-translate-y-1 hover:bg-[#2d2b27] active:scale-[0.97]">Enviar avaliação <ArrowUpRight size={16} /></button>
          </form>
        </section>

        <section id="onde-estamos" className="scroll-mt-24 border-t border-[#171614]/10 bg-[#e8dfd0] px-5 py-16 sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 md:flex-row md:items-center">
            <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#171614] text-[#f47721]"><MapPin size={20} /></span><div><p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#d96014]">Onde estamos</p><p className="mt-2 font-display text-3xl tracking-[0.03em]">{settings?.city ? settings.city.toUpperCase() : "NOVA IGUAÇU, RJ"}</p><p className="mt-1 text-sm text-[#171614]/55">{settings?.address || "Endereço da loja em breve · delivery pela região"}</p></div></div>
            <div className="flex flex-wrap gap-3"><span className="inline-flex items-center gap-2 rounded-full border border-[#171614]/15 px-4 py-3 text-xs font-bold"><Clock3 size={15} className="text-[#d96014]" /> {settings?.hours || "Ter–Dom · 18h–23h"}</span><span className="inline-flex items-center gap-2 rounded-full border border-[#171614]/15 px-4 py-3 text-xs font-bold"><Truck size={15} className="text-[#d96014]" /> {settings?.delivery_note || "Entrega local"}</span></div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#f47721] px-5 py-20 text-[#171614] sm:px-8 lg:px-10 lg:py-28">
          <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border-[34px] border-[#171614]/10" /><div className="absolute -bottom-44 left-1/2 h-96 w-96 rounded-full border-[50px] border-[#171614]/10" />
          <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-end"><div><p className="mb-4 text-[11px] font-black uppercase tracking-[0.22em] text-[#171614]/60">A fome bateu?</p><h2 className="font-display text-6xl leading-[0.86] tracking-[0.02em] sm:text-8xl">VEM SER<br />BEM.</h2></div><button onClick={openCart} className="inline-flex items-center gap-3 rounded-full bg-[#171614] px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-[#f5f1e8] transition-all duration-200 hover:-translate-y-1 hover:bg-[#2d2b27] active:scale-[0.97]">Montar meu pedido <ArrowUpRight size={16} /></button></div>
        </section>
      </main>

      <footer className="bg-[#171614] px-5 py-10 text-[#f5f1e8] sm:px-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 sm:flex-row sm:items-end"><div><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[#f47721] text-[#171614]">{settings?.logo ? <img src={settings.logo} alt="" className="h-full w-full object-cover" /> : <Flame size={18} />}</span><span className="font-display text-2xl tracking-[0.04em]">{settings?.name?.toUpperCase() || "HAMBÚRGUER BEM"}</span></div><p className="mt-4 max-w-[320px] text-sm leading-6 text-[#f5f1e8]/45">{settings?.tagline || "Comida honesta, molho na medida e vontade de fazer cada pedido valer a pena."}</p></div><div className="flex items-center gap-3"><a href="/admin" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 transition-colors hover:border-[#f47721] hover:text-[#f47721]" aria-label="Painel administrativo" title="Painel administrativo"><Sparkles size={18} /></a>{instagramUrl ? (<a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 transition-colors hover:border-[#f47721] hover:text-[#f47721]" aria-label="Instagram" title={`Instagram @${settings?.instagram}`}><Instagram size={18} /></a>) : (<button onClick={() => toast("Instagram demonstrativo", { description: "Defina o @ oficial nas Configurações do painel." })} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 transition-colors hover:border-[#f47721] hover:text-[#f47721]" aria-label="Instagram"><Instagram size={18} /></button>)}{whatsappUrl ? (<a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 transition-colors hover:border-[#f47721] hover:text-[#f47721]" aria-label="WhatsApp" title="WhatsApp"><MessageCircle size={18} /></a>) : (<button onClick={() => toast("WhatsApp demonstrativo", { description: "Defina o número nas Configurações do painel." })} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 transition-colors hover:border-[#f47721] hover:text-[#f47721]" aria-label="WhatsApp"><MessageCircle size={18} /></button>)}</div></div><div className="mx-auto mt-10 flex max-w-7xl flex-col justify-between gap-2 border-t border-white/10 pt-5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#f5f1e8]/35 sm:flex-row"><span>© {new Date().getFullYear()} {settings?.name || "Hambúrguer Bem"}</span><span>Feito com fome em {settings?.city || "Nova Iguaçu"}</span></div></footer>

      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-[#171614]/60 backdrop-blur-sm" onClick={() => setCartOpen(false)}>
          <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[440px] flex-col bg-[#f5f1e8] text-[#171614] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            {placedOrder ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <span className="grid h-20 w-20 place-items-center rounded-full bg-[#f47721] text-[#171614]"><Check size={34} strokeWidth={3} /></span>
                <h2 className="mt-6 font-display text-5xl leading-none">PEDIDO<br />RECEBIDO!</h2>
                <p className="mt-4 font-display text-3xl text-[#d96014]">#{placedOrder.number}</p>
                <p className="mt-3 max-w-[280px] text-sm leading-6 text-[#171614]/60">
                  Já estamos separando tudo. Total: <span className="font-black">{formatBRL(placedOrder.total)}</span>
                </p>
                <p className="mt-2 max-w-[280px] text-xs leading-5 text-[#171614]/45">
                  Acompanhe o andamento do seu pedido pela equipe ou chame no WhatsApp.
                </p>
                <button onClick={() => setCartOpen(false)} className="mt-8 rounded-full bg-[#171614] px-6 py-4 text-[11px] font-black uppercase tracking-[0.13em] text-[#f5f1e8]">Voltar ao cardápio</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-[#171614]/10 px-6 py-5">
                  <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d96014]">Seu pedido</p><h2 className="mt-1 font-display text-4xl leading-none">CARRINHO BEM</h2></div>
                  <button onClick={() => setCartOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-[#171614]/15 hover:bg-[#171614] hover:text-[#f5f1e8]" aria-label="Fechar carrinho"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {cart.length === 0 ? (
                    <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                      <span className="grid h-16 w-16 place-items-center rounded-full bg-[#ebe5d9] text-[#d96014]"><ShoppingBag size={25} /></span>
                      <h3 className="mt-5 font-display text-3xl">AINDA VAZIO</h3>
                      <p className="mt-2 max-w-[230px] text-sm leading-5 text-[#171614]/55">Escolha um lanche no cardápio para começar seu pedido.</p>
                      <button onClick={() => setCartOpen(false)} className="mt-6 rounded-full bg-[#171614] px-5 py-3 text-[11px] font-black uppercase tracking-[0.13em] text-[#f5f1e8]">Ver cardápio</button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.key} className="flex items-center gap-3 rounded-2xl bg-[#ebe5d9] p-3">
                          {item.image ? (
                            <img src={item.image} alt="" className="h-16 w-16 rounded-xl object-cover" />
                          ) : (
                            <span className="grid h-16 w-16 place-items-center rounded-xl bg-[#d96014]/15 font-display text-2xl text-[#d96014]">{item.name.charAt(0)}</span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-black uppercase tracking-[0.08em]">{item.name}</p>
                            <p className="mt-1 text-sm font-bold text-[#d96014]">{formatPrice(item.price)}</p>
                          </div>
                          <div className="flex items-center gap-2 rounded-full border border-[#171614]/15 bg-[#f5f1e8] p-1">
                            <button onClick={() => changeQty(item.key, -1)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-[#171614] hover:text-[#f5f1e8]" aria-label="Diminuir"><Minus size={13} /></button>
                            <span className="w-5 text-center text-sm font-black">{item.qty}</span>
                            <button onClick={() => changeQty(item.key, 1)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-[#171614] hover:text-[#f5f1e8]" aria-label="Aumentar"><Plus size={13} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {cart.length > 0 && (
                    <>
                      <div className="mt-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d96014]">Como você quer?</p>
                      <div className="mt-3 grid gap-2">
                        {(["delivery", "mesa", "balcao"] as OrderType[]).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setOrderType(type);
                              if (type !== "mesa") setTableId(null);
                            }}
                            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em] transition-all ${orderType === type ? "border-[#171614] bg-[#171614] text-[#f5f1e8]" : "border-[#171614]/15 bg-[#f5f1e8] text-[#171614]/65"}`}
                          >
                            {orderTypeLabels[type]} <ChevronRight size={15} />
                          </button>
                        ))}
                      </div>

                      {orderType === "mesa" && (
                        <div className="mt-3">
                          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#171614]/55">Escolha a mesa</p>
                          <div className="grid grid-cols-4 gap-2">
                            {tables.map((table) => (
                              <button
                                key={table.id}
                                type="button"
                                disabled={table.status !== "livre"}
                                onClick={() => setTableId(table.id)}
                                className={`rounded-xl border px-2 py-3 text-center text-xs font-black uppercase tracking-[0.08em] transition-all ${tableId === table.id ? "border-[#f47721] bg-[#f47721] text-[#171614]" : table.status === "livre" ? "border-[#171614]/15 bg-[#f5f1e8] text-[#171614]/65 hover:border-[#d96014]" : "cursor-not-allowed border-[#171614]/8 bg-[#171614]/5 text-[#171614]/30 line-through"}`}
                              >
                                M{table.number}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 space-y-3">
                        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" className="h-12 w-full rounded-full border border-[#171614]/15 bg-[#ebe5d9] px-5 text-sm outline-none placeholder:text-[#171614]/40 focus:border-[#d96014]" />
                        <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="WhatsApp / telefone" className="h-12 w-full rounded-full border border-[#171614]/15 bg-[#ebe5d9] px-5 text-sm outline-none placeholder:text-[#171614]/40 focus:border-[#d96014]" />
                        {orderType === "delivery" && (
                          <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Endereço de entrega (rua, número, bairro)" className="h-12 w-full rounded-full border border-[#171614]/15 bg-[#ebe5d9] px-5 text-sm outline-none placeholder:text-[#171614]/40 focus:border-[#d96014]" />
                        )}
                        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Observação (opcional)" className="h-12 w-full rounded-full border border-[#171614]/15 bg-[#ebe5d9] px-5 text-sm outline-none placeholder:text-[#171614]/40 focus:border-[#d96014]" />
                      </div>

                      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-[#d96014]">Pagamento</p>
                      <div className="mt-3 grid gap-2">
                        {paymentOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setPaymentMethod(option.value)}
                            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-all ${paymentMethod === option.value ? "border-[#171614] bg-[#171614] text-[#f5f1e8]" : "border-[#171614]/15 bg-[#f5f1e8] text-[#171614]/65"}`}
                          >
                            <span>
                              <span className="block text-xs font-black uppercase tracking-[0.12em]">{option.label}</span>
                              <span className={`text-[11px] ${paymentMethod === option.value ? "text-[#f5f1e8]/55" : "text-[#171614]/45"}`}>{option.hint}</span>
                            </span>
                            {paymentMethod === option.value && <Check size={16} className="text-[#f47721]" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d96014]">Cupom de desconto</p>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          value={couponCode}
                          onChange={(event) => {
                            setCouponCode(event.target.value.toUpperCase());
                            setCouponError("");
                          }}
                          placeholder="EX.: BEM10"
                          disabled={!!coupon}
                          className="h-12 min-w-0 flex-1 rounded-full border border-[#171614]/15 bg-[#ebe5d9] px-5 text-sm font-bold uppercase outline-none placeholder:font-normal placeholder:text-[#171614]/40 focus:border-[#d96014] disabled:opacity-50"
                        />
                        {coupon ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCoupon(null);
                              setCouponCode("");
                            }}
                            className="h-12 rounded-full border border-[#171614]/15 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-[#d96014] transition-colors hover:border-[#d96014]"
                          >
                            Remover
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={applyCoupon}
                            disabled={couponLoading}
                            className="h-12 rounded-full bg-[#171614] px-5 text-[11px] font-black uppercase tracking-[0.12em] text-[#f5f1e8] transition-colors hover:bg-[#2d2b27] disabled:opacity-50"
                          >
                            {couponLoading ? "…" : "Aplicar"}
                          </button>
                        )}
                      </div>
                      {couponError && <p className="mt-2 text-xs font-bold text-red-600">{couponError}</p>}
                      {coupon && <p className="mt-2 text-xs font-bold text-green-700">Cupom {coupon.code} aplicado!</p>}
                      </div>
                    </>
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="border-t border-[#171614]/10 bg-[#ebe5d9] px-6 py-5">
                    <div className="flex items-center justify-between"><span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#171614]/60">Subtotal</span><span className="text-sm font-black">{formatBRL(cartSubtotal)}</span></div>
                    {cartDiscount > 0 && coupon && (
                      <div className="mt-1 flex items-center justify-between"><span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#171614]/60">Cupom {coupon.code}</span><span className="text-sm font-black text-green-700">−{formatBRL(cartDiscount)}</span></div>
                    )}
                    <div className="mt-1 flex items-center justify-between"><span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#171614]/60">Total</span><span className="font-display text-4xl tracking-[0.02em]">{formatBRL(cartTotal)}</span></div>
                    <button
                      onClick={handleCheckout}
                      disabled={!canSubmit || submitting}
                      className="mt-4 flex w-full items-center justify-center gap-3 rounded-full bg-[#171614] px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-[#f5f1e8] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2d2b27] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {submitting ? "Enviando…" : "Confirmar pedido"} <ArrowUpRight size={16} />
                    </button>
                    <p className="mt-3 text-center text-[10px] leading-4 text-[#171614]/45">
                      {!canSubmit ? "Preencha seus dados para confirmar." : `Pedido ${orderTypeLabels[orderType]}.`}
                    </p>
                  </div>
                )}
              </>
            )}
          </aside>
        </div>
      )}

      <button onClick={openCart} className={`fixed bottom-5 right-5 z-30 flex items-center gap-3 rounded-full bg-[#171614] px-4 py-3 text-[#f5f1e8] shadow-[0_12px_28px_rgba(23,22,20,0.22)] transition-transform duration-200 ${cartCount > 0 ? "hover:-translate-y-1 active:scale-[0.97]" : ""}`} aria-label="Abrir pedido"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#f47721] text-[#171614]"><ShoppingBag size={16} /></span><span className="hidden text-[11px] font-black uppercase tracking-[0.14em] sm:inline">Meu pedido</span>{cartCount > 0 && <span className="text-xs font-black text-[#f47721]">{cartCount}</span>}</button>
    </div>
  );
}