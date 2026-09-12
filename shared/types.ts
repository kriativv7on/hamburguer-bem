export type OrderType = "delivery" | "mesa" | "balcao";
export type OrderStatus =
  | "novo"
  | "em_preparo"
  | "pronto"
  | "entregue"
  | "pago"
  | "cancelado";
export type PaymentMethod = "pix" | "cartao" | "dinheiro" | "fiado";
export type TableStatus = "livre" | "ocupada" | "reservada";

export interface Product {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  promoPrice: number | null;
  image: string;
  accent: string;
  tag: string | null;
  active: number;
}

export interface Category {
  id: number;
  name: string;
  sort: number;
}

export interface ComboItem {
  productId: number;
  qty: number;
  name: string;
}

export interface Combo {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  active: number;
  items: ComboItem[];
}

export interface Coupon {
  id: number;
  code: string;
  type: "percent" | "fixed";
  value: number;
  maxUses: number;
  usedCount: number;
  active: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  kind: "product" | "combo";
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: number;
  number: number;
  type: OrderType;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  tableId: number | null;
  tableNumber: number | null;
  customerId: number | null;
  customerName: string;
  customerPhone: string;
  address: string;
  scheduledAt: string | null;
  note: string;
  total: number;
  discount: number;
  couponCode: string;
  createdAt: string;
  closedAt: string | null;
  items: OrderItem[];
}

export interface CreateOrderItem {
  productId: number | null;
  comboId: number | null;
  qty: number;
}

export interface CreateOrder {
  type: OrderType;
  paymentMethod: PaymentMethod;
  tableId?: number | null;
  customerName: string;
  customerPhone: string;
  address?: string;
  scheduledAt?: string | null;
  note?: string;
  couponCode?: string;
  items: CreateOrderItem[];
}

export interface Table {
  id: number;
  number: number;
  name: string;
  status: TableStatus;
  seats: number;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  points: number;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  notes: string;
  createdAt: string;
}

export interface Review {
  id: number;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export type CashMovementType = "entrada" | "saida" | "suprimento" | "sangria";

export interface CashMovement {
  id: number;
  type: CashMovementType;
  description: string;
  amount: number;
  createdAt: string;
}

export interface DashboardSummary {
  todaySales: number;
  todayOrders: number;
  activeOrders: number;
  openTables: number;
  avgTicket: number;
  monthlySales: number;
  recentOrders: Order[];
  topProducts: { name: string; qty: number; revenue: number }[];
  salesByDay: { day: string; total: number; orders: number }[];
}

export interface ApiError {
  error: string;
}

export interface StoreSettings {
  name: string;
  tagline: string;
  logo: string;
  city: string;
  address: string;
  hours: string;
  delivery_note: string;
  whatsapp: string;
  instagram: string;
  phone: string;
}