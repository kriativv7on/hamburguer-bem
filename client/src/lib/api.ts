import type {
  CashMovement,
  Combo,
  Coupon,
  CreateOrder,
  Customer,
  DashboardSummary,
  Order,
  OrderStatus,
  Product,
  Review,
  Table,
} from "@shared/types";

const ADMIN_PIN_KEY = "hb_admin_pin";

export const getAdminPin = () => localStorage.getItem(ADMIN_PIN_KEY) ?? "";
export const setAdminPin = (pin: string) =>
  localStorage.setItem(ADMIN_PIN_KEY, pin);
export const clearAdminPin = () => localStorage.removeItem(ADMIN_PIN_KEY);

let unauthorizedHandler: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  unauthorizedHandler = fn;
};

function isUnauthorized(response: Response) {
  return response.status === 401;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  pinOverride?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  const pin = pinOverride ?? getAdminPin();
  if (pin) headers["x-admin-pin"] = pin;

  const response = await fetch(path, { ...options, headers });
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    if (isUnauthorized(response) && !pinOverride) {
      unauthorizedHandler?.();
    }
    const message =
      (data as { error?: string } | null)?.error ??
      `Erro ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  getMenu: () =>
    request<{ categories: { id: number; name: string }[]; products: Product[]; combos: Combo[] }>("/api/menu"),
  getAdminMenu: () =>
    request<{ categories: { id: number; name: string; sort: number }[]; products: Product[]; combos: Combo[] }>(
      "/api/admin/menu",
    ),
  getTables: () => request<Table[]>("/api/tables"),
  createOrder: (order: CreateOrder) =>
    request<Order>("/api/orders", { method: "POST", body: JSON.stringify(order) }),
  getReviews: () => request<Review[]>("/api/reviews"),
  createReview: (body: { customerName: string; rating: number; comment: string }) =>
    request<Review>("/api/reviews", { method: "POST", body: JSON.stringify(body) }),
  deleteReview: (id: number) =>
    request<{ ok: boolean }>(`/api/reviews/${id}`, { method: "DELETE" }),

  createCategory: (body: { name: string }) =>
    request<{ id: number; name: string; sort: number }>("/api/categories", { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (id: number, body: { name: string }) =>
    request<{ id: number; name: string; sort: number }>(`/api/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteCategory: (id: number) =>
    request<{ ok: boolean }>(`/api/categories/${id}`, { method: "DELETE" }),

  createProduct: (body: Omit<Product, "id" | "active"> & { active?: boolean }) =>
    request<Product>("/api/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id: number, body: Partial<Omit<Product, "active">> & { active?: boolean }) =>
    request<Product>(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteProduct: (id: number) =>
    request<{ ok: boolean }>(`/api/products/${id}`, { method: "DELETE" }),

  createCombo: (body: Pick<Combo, "name" | "description" | "price" | "image"> & { items: { productId: number; qty: number }[]; active?: boolean }) =>
    request<Combo>("/api/combos", { method: "POST", body: JSON.stringify(body) }),
  updateCombo: (id: number, body: Partial<Pick<Combo, "name" | "description" | "price" | "image">> & { items?: { productId: number; qty: number }[]; active?: boolean }) =>
    request<Combo>(`/api/combos/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteCombo: (id: number) =>
    request<{ ok: boolean }>(`/api/combos/${id}`, { method: "DELETE" }),

  getCoupons: () => request<Coupon[]>("/api/coupons"),
  createCoupon: (body: Omit<Coupon, "id" | "usedCount" | "createdAt">) =>
    request<Coupon>("/api/coupons", { method: "POST", body: JSON.stringify(body) }),
  updateCoupon: (id: number, body: Partial<Coupon>) =>
    request<Coupon>(`/api/coupons/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteCoupon: (id: number) =>
    request<{ ok: boolean }>(`/api/coupons/${id}`, { method: "DELETE" }),
  validateCoupon: (code: string) =>
    request<{ valid: boolean; reason?: string; type?: "percent" | "fixed"; value?: number }>(
      "/api/coupons/validate",
      { method: "POST", body: JSON.stringify({ code }) },
    ),

  getOrders: (status?: OrderStatus) =>
    request<Order[]>(`/api/orders${status ? `?status=${status}` : ""}`),
  updateOrderStatus: (id: number, status: OrderStatus) =>
    request<Order>(`/api/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  updateTableStatus: (id: number, status: Table["status"]) =>
    request<{ ok: boolean }>(`/api/tables/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  getCustomers: (search?: string) =>
    request<Customer[]>(`/api/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  getCustomerDetail: (id: number) =>
    request<{ customer: Customer; orders: Order[] }>(`/api/customers/${id}`),
  updateCustomer: (id: number, body: { name?: string; phone?: string; notes?: string; points?: number }) =>
    request<Customer>(`/api/customers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  getCash: () =>
    request<{ movements: CashMovement[]; cashIn: number; cashOut: number; balance: number }>("/api/cash/movements"),
  addCashMovement: (body: { type: string; description: string; amount: number }) =>
    request<CashMovement>("/api/cash/movements", { method: "POST", body: JSON.stringify(body) }),
  getDashboard: () => request<DashboardSummary>("/api/dashboard"),
  checkAdminPin: (pin: string) =>
    request<{ ok: boolean }>("/api/admin/check", {}, pin),
};

export const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const orderStatusLabels: Record<OrderStatus, string> = {
  novo: "Novo",
  em_preparo: "Em preparo",
  pronto: "Pronto",
  entregue: "Entregue",
  pago: "Pago",
  cancelado: "Cancelado",
};

export const orderTypeLabels = {
  delivery: "Delivery",
  mesa: "Mesa",
  balcao: "Balcão",
} as const;