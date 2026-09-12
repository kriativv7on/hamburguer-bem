import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { mkdirSync } from "node:fs";
import type { Combo, ComboItem, Coupon, Product } from "../shared/types.ts";

export const db: DatabaseSync = createDatabase();

function createDatabase(): DatabaseSync {
  const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
  mkdirSync(dataDir, { recursive: true });
  const database = new DatabaseSync(path.join(dataDir, "hamburguer-bem.db"));
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA foreign_keys = ON;");
  migrate(database);
  seedIfEmpty(database);
  return database;
}

function migrate(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL,
      image TEXT NOT NULL DEFAULT '',
      accent TEXT NOT NULL DEFAULT '',
      tag TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      points INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      total_orders INTEGER NOT NULL DEFAULT 0,
      total_spent REAL NOT NULL DEFAULT 0,
      last_order_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      seats INTEGER NOT NULL DEFAULT 4,
      status TEXT NOT NULL DEFAULT 'livre'
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL UNIQUE,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'novo',
      payment_method TEXT NOT NULL DEFAULT 'pix',
      table_id INTEGER REFERENCES tables(id),
      customer_id INTEGER REFERENCES customers(id),
      customer_name TEXT NOT NULL DEFAULT '',
      customer_phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      scheduled_at TEXT,
      note TEXT NOT NULL DEFAULT '',
      total REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      closed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      qty INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cash_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'percent',
      value REAL NOT NULL,
      max_uses INTEGER NOT NULL DEFAULT 0,
      used_count INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS combos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL,
      image TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS combo_items (
      combo_id INTEGER NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      qty INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_combo_items_combo ON combo_items(combo_id);
  `);

  ensureColumn(database, "products", "promo_price", "REAL");
  ensureColumn(database, "orders", "coupon_code", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(database, "orders", "discount", "REAL NOT NULL DEFAULT 0");
  ensureColumn(database, "order_items", "kind", "TEXT NOT NULL DEFAULT 'product'");
}

function ensureColumn(
  database: DatabaseSync,
  table: string,
  column: string,
  ddl: string
) {
  const columns = database
    .prepare(`PRAGMA table_info(${table})`)
    .all() as unknown as { name: string }[];
  if (!columns.some((entry) => entry.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl};`);
  }
}

function seed(database: DatabaseSync) {
  const insertCategory = database.prepare(
    "INSERT INTO categories (name, sort) VALUES (?, ?)"
  );
  const categoryIds: Record<string, number> = {};
  const categoryOrder = [
    "Hambúrgueres",
    "Combos",
    "Acompanhamentos",
    "Bebidas",
  ];
  categoryOrder.forEach((name, index) => {
    const result = insertCategory.run(name, index);
    categoryIds[name] = Number(result.lastInsertRowid);
  });

  const products: {
    name: string;
    description: string;
    price: number;
    category: string;
    image: string;
    accent: string;
    tag?: string;
  }[] = [
    {
      name: "BEM CLÁSSICO",
      description:
        "Smash duplo, cheddar cremoso, picles e molho Bem no pão brioche.",
      price: 29.9,
      category: "Hambúrgueres",
      image: "/images/burger-hero.jpg",
      accent: "from-[#2b1a12] to-[#6d2f14]",
      tag: "Mais pedido",
    },
    {
      name: "BRASA BACON",
      description:
        "Carne na brasa, cheddar, bacon crocante, cebola caramelizada e barbecue.",
      price: 34.9,
      category: "Hambúrgueres",
      image: "/images/burger-hero.jpg",
      accent: "from-[#1b1b1b] to-[#b34c16]",
      tag: "Da casa",
    },
    {
      name: "BEM PICANTE",
      description:
        "Smash duplo, pepperoni, jalapeño, cheddar e maionese defumada.",
      price: 32.9,
      category: "Hambúrgueres",
      image: "/images/burger-hero.jpg",
      accent: "from-[#391415] to-[#9e2b16]",
    },
    {
      name: "VEGGIE BEM",
      description:
        "Burger crocante de grão-de-bico, queijo, rúcula, tomate e molho verde.",
      price: 27.9,
      category: "Hambúrgueres",
      image: "/images/burger-hero.jpg",
      accent: "from-[#1e2c20] to-[#67713c]",
    },
    {
      name: "COMBO BEM CLÁSSICO",
      description: "BEM Clássico + batata crocante + refri lata bem gelado.",
      price: 42.9,
      category: "Combos",
      image: "/images/burger-hero.jpg",
      accent: "from-[#382414] to-[#d37b25]",
      tag: "Vale mais",
    },
    {
      name: "BATATA DA BEM",
      description:
        "Porção generosa de fritas crocantes com páprica e sal de ervas.",
      price: 18.9,
      category: "Acompanhamentos",
      image: "/images/fries.jpg",
      accent: "from-[#4e2a12] to-[#cf771f]",
    },
    {
      name: "MILK-SHAKE BEM",
      description: "Baunilha cremosa, chantilly e calda de caramelo.",
      price: 19.9,
      category: "Bebidas",
      image: "/images/milkshake.jpg",
      accent: "from-[#433022] to-[#b77545]",
    },
    {
      name: "REFRI LATA",
      description: "Coca-Cola, Guaraná ou Fanta. Escolha seu favorito.",
      price: 7.9,
      category: "Bebidas",
      image: "/images/fries.jpg",
      accent: "from-[#1b2224] to-[#51605a]",
    },
  ];

  const insertProduct = database.prepare(
    "INSERT INTO products (category_id, name, description, price, image, accent, tag, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)"
  );
  for (const product of products) {
    insertProduct.run(
      categoryIds[product.category],
      product.name,
      product.description,
      product.price,
      product.image,
      product.accent,
      product.tag ?? null
    );
  }

  const insertTable = database.prepare(
    "INSERT INTO tables (number, name, seats, status) VALUES (?, ?, ?, ?)"
  );
  for (let index = 1; index <= 8; index += 1) {
    insertTable.run(index, `Mesa ${index}`, index % 2 === 0 ? 4 : 2, "livre");
  }

  database
    .prepare(
      "INSERT INTO coupons (code, type, value, max_uses) VALUES ('BEM10', 'percent', 10, 1000)"
    )
    .run();
}

function seedIfEmpty(database: DatabaseSync) {
  const row = database.prepare("SELECT COUNT(*) AS count FROM products").get() as {
    count: number;
  };
  if (row.count > 0) return;
  seed(database);
}

export function listProducts(): Product[] {
  return db
    .prepare(
      `SELECT id, category_id AS categoryId, name, description, price,
              promo_price AS promoPrice, image, accent, tag, active
       FROM products ORDER BY category_id, id`
    )
    .all() as unknown as Product[];
}

export function listActiveProducts(): Product[] {
  return db
    .prepare(
      `SELECT id, category_id AS categoryId, name, description, price,
              promo_price AS promoPrice, image, accent, tag, active
       FROM products WHERE active = 1 ORDER BY category_id, id`
    )
    .all() as unknown as Product[];
}

export function listCategories() {
  return db
    .prepare("SELECT id, name, sort FROM categories ORDER BY sort")
    .all() as { id: number; name: string; sort: number }[];
}

export function getProduct(id: number) {
  return db
    .prepare(
      `SELECT id, category_id AS categoryId, name, description, price,
              promo_price AS promoPrice, image, accent, tag, active
       FROM products WHERE id = ?`
    )
    .get(id) as Product | undefined;
}

export function listCombos(): Combo[] {
  const rows = db
    .prepare("SELECT id, name, description, price, image, active FROM combos ORDER BY id")
    .all() as unknown as { id: number; name: string; description: string; price: number; image: string; active: number }[];
  return rows.map(withComboItems);
}

export function listActiveCombos(): Combo[] {
  const rows = db
    .prepare("SELECT id, name, description, price, image, active FROM combos WHERE active = 1 ORDER BY id")
    .all() as unknown as { id: number; name: string; description: string; price: number; image: string; active: number }[];
  return rows.map(withComboItems);
}

export function getCombo(id: number): Combo | null {
  const row = db
    .prepare("SELECT id, name, description, price, image, active FROM combos WHERE id = ?")
    .get(id) as { id: number; name: string; description: string; price: number; image: string; active: number } | undefined;
  return row ? withComboItems(row) : null;
}

function withComboItems(
  combo: { id: number; name: string; description: string; price: number; image: string; active: number }
): Combo {
  const items = db
    .prepare(
      `SELECT ci.product_id AS productId, ci.qty, p.name
       FROM combo_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.combo_id = ?`
    )
    .all(combo.id) as unknown as ComboItem[];
  return { ...combo, items };
}

export function listCoupons() {
  return db
    .prepare(
      `SELECT id, code, type, value, max_uses AS maxUses, used_count AS usedCount,
              active, expires_at AS expiresAt, created_at AS createdAt
       FROM coupons ORDER BY id DESC`
    )
    .all() as unknown as Coupon[];
}

export function getCouponByCode(code: string) {
  return db
    .prepare(
      `SELECT id, code, type, value, max_uses AS maxUses, used_count AS usedCount,
              active, expires_at AS expiresAt, created_at AS createdAt
       FROM coupons WHERE code = ? COLLATE NOCASE`
    )
    .get(code) as Coupon | undefined;
}

export function nextOrderNumber(): number {
  const row = db.prepare("SELECT COALESCE(MAX(number), 0) AS max FROM orders").get() as {
    max: number;
  };
  return row.max + 1;
}