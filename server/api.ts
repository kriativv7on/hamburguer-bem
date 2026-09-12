import express, { type NextFunction, type Request, type Response } from "express";
import {
  db,
  getCombo,
  getCouponByCode,
  getProduct,
  listActiveCombos,
  listActiveProducts,
  listCategories,
  listCombos,
  listCoupons,
  listProducts,
  nextOrderNumber,
} from "./db.ts";
import type {
  CreateOrder,
  Order,
  OrderStatus,
  CashMovementType,
} from "../shared/types.ts";

const ADMIN_PIN = process.env.ADMIN_PIN || "1234";

export function createApi() {
  const api = express();
  api.use(express.json());

  api.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  api.get("/api/menu", (_req, res) => {
    res.json({
      categories: listCategories(),
      products: listActiveProducts(),
      combos: listActiveCombos(),
    });
  });

  api.get("/api/admin/menu", requireAdmin, (_req, res) => {
    res.json({
      categories: listCategories(),
      products: listProducts(),
      combos: listCombos(),
    });
  });

  api.post("/api/categories", requireAdmin, (req, res) => {
    const name = String(req.body?.name ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "Informe o nome da categoria." });
      return;
    }
    const nextSort = db.prepare("SELECT COALESCE(MAX(sort), 0) + 1 AS s FROM categories").get() as { s: number };
    const result = db.prepare("INSERT INTO categories (name, sort) VALUES (?, ?)").run(name, nextSort.s);
    res.status(201).json(db.prepare("SELECT id, name, sort FROM categories WHERE id = ?").get(Number(result.lastInsertRowid)));
  });

  api.patch("/api/categories/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const name = String(req.body?.name ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "Informe o nome da categoria." });
      return;
    }
    db.prepare("UPDATE categories SET name = ? WHERE id = ?").run(name, id);
    res.json(db.prepare("SELECT id, name, sort FROM categories WHERE id = ?").get(id));
  });

  api.delete("/api/categories/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const has = db.prepare("SELECT COUNT(*) AS count FROM products WHERE category_id = ?").get(id) as { count: number };
    if (has.count > 0) {
      res.status(400).json({ error: "Mova ou exclua os produtos desta categoria antes." });
      return;
    }
    db.prepare("DELETE FROM categories WHERE id = ?").run(id);
    res.json({ ok: true });
  });

  api.post("/api/products", requireAdmin, (req, res) => {
    const input = normalizeProduct(req.body);
    if (!input.name || input.price < 0 || !db.prepare("SELECT id FROM categories WHERE id = ?").get(input.categoryId)) {
      res.status(400).json({ error: "Dados do produto inválidos." });
      return;
    }
    const result = db
      .prepare(
        "INSERT INTO products (category_id, name, description, price, promo_price, image, accent, tag, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(input.categoryId, input.name, input.description, input.price, input.promoPrice, input.image, input.accent, input.tag, input.active);
    res.status(201).json(getProduct(Number(result.lastInsertRowid)));
  });

  api.patch("/api/products/:id", requireAdmin, (req, res) => {
    const product = getProduct(Number(req.params.id));
    if (!product) {
      res.status(404).json({ error: "Produto não encontrado." });
      return;
    }
    const input = normalizeProduct({ ...product, ...req.body });
    if (!input.name || input.price < 0) {
      res.status(400).json({ error: "Dados do produto inválidos." });
      return;
    }
    db.prepare(
      "UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, promo_price = ?, image = ?, accent = ?, tag = ?, active = ? WHERE id = ?"
    ).run(input.categoryId, input.name, input.description, input.price, input.promoPrice, input.image, input.accent, input.tag, input.active, product.id);
    res.json(getProduct(product.id));
  });

  api.delete("/api/products/:id", requireAdmin, (req, res) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(Number(req.params.id));
    res.json({ ok: true });
  });

  api.post("/api/combos", requireAdmin, (req, res) => {
    const { name, description, price, image, items } = req.body ?? {};
    const comboName = String(name ?? "").trim();
    const comboPrice = Number(price);
    if (!comboName || !Number.isFinite(comboPrice) || comboPrice < 0 || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Informe nome, preço e itens do combo." });
      return;
    }
    const result = db
      .prepare("INSERT INTO combos (name, description, price, image, active) VALUES (?, ?, ?, ?, 1)")
      .run(comboName, String(description ?? "").trim(), comboPrice, String(image ?? ""));
    const comboId = Number(result.lastInsertRowid);
    const insertItem = db.prepare("INSERT INTO combo_items (combo_id, product_id, qty) VALUES (?, ?, ?)");
    for (const item of items) {
      const productId = Number(item?.productId);
      if (productId) insertItem.run(comboId, productId, Math.max(1, Math.floor(Number(item?.qty) || 1)));
    }
    const combo = getCombo(comboId)!;
    if (combo.items.length === 0) {
      db.prepare("DELETE FROM combos WHERE id = ?").run(comboId);
      res.status(400).json({ error: "Escolha ao menos um produto com quantidade válida." });
      return;
    }
    res.status(201).json(combo);
  });

  api.patch("/api/combos/:id", requireAdmin, (req, res) => {
    const combo = getCombo(Number(req.params.id));
    if (!combo) {
      res.status(404).json({ error: "Combo não encontrado." });
      return;
    }
    const { name, description, price, image, active, items } = req.body ?? {};
    const comboName = name !== undefined ? String(name).trim() : combo.name;
    const comboPrice = price !== undefined ? Number(price) : combo.price;
    if (!comboName || !Number.isFinite(comboPrice) || comboPrice < 0) {
      res.status(400).json({ error: "Dados do combo inválidos." });
      return;
    }
    db.prepare("UPDATE combos SET name = ?, description = ?, price = ?, image = ?, active = ? WHERE id = ?").run(
      comboName,
      description !== undefined ? String(description).trim() : combo.description,
      comboPrice,
      image !== undefined ? String(image) : combo.image,
      active !== undefined ? (active ? 1 : 0) : combo.active,
      combo.id
    );
    const result = db.prepare("SELECT id FROM combos WHERE id = ?").get(combo.id) as { id: number } | undefined;
    if (!result) {
      res.status(404).json({ error: "Combo não encontrado." });
      return;
    }
    if (Array.isArray(items)) {
      db.prepare("DELETE FROM combo_items WHERE combo_id = ?").run(combo.id);
      const insertItem = db.prepare("INSERT INTO combo_items (combo_id, product_id, qty) VALUES (?, ?, ?)");
      for (const item of items) {
        const productId = Number(item?.productId);
        if (productId) insertItem.run(combo.id, productId, Math.max(1, Math.floor(Number(item?.qty) || 1)));
      }
    }
    res.json(getCombo(combo.id));
  });

  api.delete("/api/combos/:id", requireAdmin, (req, res) => {
    db.prepare("DELETE FROM combos WHERE id = ?").run(Number(req.params.id));
    res.json({ ok: true });
  });

  api.get("/api/coupons", requireAdmin, (_req, res) => {
    res.json(listCoupons());
  });

  api.post("/api/coupons", requireAdmin, (req, res) => {
    const input = normalizeCoupon(req.body);
    const error = validateCouponInput(input);
    if (error) {
      res.status(400).json({ error });
      return;
    }
    const exists = getCouponByCode(input.code);
    if (exists) {
      res.status(400).json({ error: "Já existe um cupom com esse código." });
      return;
    }
    const result = db
      .prepare("INSERT INTO coupons (code, type, value, max_uses, active, expires_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(input.code, input.type, input.value, input.maxUses, input.active, input.expiresAt);
    const created = listCoupons().find((coupon) => coupon.code === input.code);
    res.status(201).json(created);
  });

  api.patch("/api/coupons/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const existing = listCoupons().find((coupon) => coupon.id === id);
    if (!existing) {
      res.status(404).json({ error: "Cupom não encontrado." });
      return;
    }
    const input = normalizeCoupon({ ...existing, ...req.body });
    const error = validateCouponInput(input);
    if (error) {
      res.status(400).json({ error });
      return;
    }
    const duplicate = getCouponByCode(input.code);
    if (duplicate && duplicate.id !== id) {
      res.status(400).json({ error: "Já existe um cupom com esse código." });
      return;
    }
    db.prepare("UPDATE coupons SET code = ?, type = ?, value = ?, max_uses = ?, active = ?, expires_at = ? WHERE id = ?").run(
      input.code,
      input.type,
      input.value,
      input.maxUses,
      input.active,
      input.expiresAt,
      id
    );
    res.json(listCoupons().find((coupon) => coupon.id === id));
  });

  api.delete("/api/coupons/:id", requireAdmin, (req, res) => {
    db.prepare("DELETE FROM coupons WHERE id = ?").run(Number(req.params.id));
    res.json({ ok: true });
  });

  api.post("/api/coupons/validate", (req, res) => {
    const code = String(req.body?.code ?? "").trim().toUpperCase();
    if (!code) {
      res.status(400).json({ valid: false, reason: "Informe um código." });
      return;
    }
    const coupon = getCouponByCode(code);
    const expired = coupon?.expiresAt ? coupon.expiresAt < new Date().toISOString().slice(0, 10) : false;
    if (!coupon || !coupon.active || expired || (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses)) {
      res.json({ valid: false, reason: "Cupom inválido ou expirado." });
      return;
    }
    res.json({ valid: true, type: coupon.type, value: coupon.value });
  });

  api.get("/api/reviews", (_req, res) => {
    const reviews = db
      .prepare(
        "SELECT id, customer_name AS customerName, rating, comment, created_at AS createdAt FROM reviews ORDER BY created_at DESC LIMIT 50"
      )
      .all();
    res.json(reviews);
  });

  api.post("/api/reviews", (req: Request, res: Response) => {
    const { customerName, rating, comment } = req.body ?? {};
    const name = String(customerName ?? "").trim();
    const stars = Number(rating);
    if (!name || !Number.isInteger(stars) || stars < 1 || stars > 5) {
      res.status(400).json({ error: "Informe nome e nota entre 1 e 5." });
      return;
    }
    const result = db
      .prepare(
        "INSERT INTO reviews (customer_name, rating, comment) VALUES (?, ?, ?)"
      )
      .run(name, stars, String(comment ?? "").trim());
    const created = db
      .prepare(
        "SELECT id, customer_name AS customerName, rating, comment, created_at AS createdAt FROM reviews WHERE id = ?"
      )
      .get(Number(result.lastInsertRowid));
    res.status(201).json(created);
  });

  api.delete("/api/reviews/:id", requireAdmin, (req, res) => {
    db.prepare("DELETE FROM reviews WHERE id = ?").run(Number(req.params.id));
    res.json({ ok: true });
  });

  api.post("/api/orders", (req: Request, res: Response) => {
    const body = req.body as CreateOrder;
    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      res.status(400).json({ error: "Pedido sem itens." });
      return;
    }
    if (!body.customerName?.trim()) {
      res.status(400).json({ error: "Informe seu nome." });
      return;
    }
    const type = ["delivery", "mesa", "balcao"].includes(body.type)
      ? body.type
      : "balcao";
    const paymentMethod = ["pix", "cartao", "dinheiro", "fiado"].includes(
      body.paymentMethod
    )
      ? body.paymentMethod
      : "pix";

    db.exec("BEGIN");
    try {
      const items = body.items.map((item) => {
        const qty = Math.max(1, Math.floor(item.qty) || 1);
        if (item.comboId) {
          const combo = getCombo(item.comboId);
          if (!combo) throw new Error(`Combo ${item.comboId} não encontrado.`);
          return { kind: "combo" as const, refId: combo.id, name: combo.name, price: combo.price, qty };
        }
        const product = getProduct(item.productId ?? 0);
        if (!product) throw new Error(`Produto ${item.productId} não encontrado.`);
        const price = product.promoPrice ?? product.price;
        return { kind: "product" as const, refId: product.id, name: product.name, price, qty };
      });
      const round2 = (value: number) => Math.round(value * 100) / 100;
      const subtotal = round2(items.reduce((sum, item) => sum + item.price * item.qty, 0));

      let discount = 0;
      let couponCode = "";
      const rawCode = String(body.couponCode ?? "").trim().toUpperCase();
      if (rawCode) {
        const coupon = getCouponByCode(rawCode);
        const expired = coupon?.expiresAt ? coupon.expiresAt < new Date().toISOString().slice(0, 10) : false;
        if (!coupon || !coupon.active || expired || (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses)) {
          throw new Error("Cupom inválido ou expirado.");
        }
        discount =
          coupon.type === "percent"
            ? Math.floor(subtotal * coupon.value) / 100
            : Math.min(coupon.value, subtotal);
        discount = round2(discount);
        couponCode = coupon.code;
      }
      const total = Math.max(0, round2(subtotal - discount));

      const number = nextOrderNumber();
      const tableNumber = body.tableId
        ? (db
            .prepare("SELECT number FROM tables WHERE id = ?")
            .get(body.tableId) as { number: number } | undefined)?.number ?? null
        : null;

      const orderResult = db
        .prepare(
          `INSERT INTO orders
            (number, type, status, payment_method, table_id, customer_name, customer_phone, address, scheduled_at, note, total, coupon_code, discount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          number,
          type,
          "novo",
          paymentMethod,
          body.tableId ?? null,
          String(body.customerName ?? "").trim(),
          String(body.customerPhone ?? "").trim(),
          String(body.address ?? "").trim(),
          body.scheduledAt ?? null,
          String(body.note ?? "").trim(),
          total,
          couponCode,
          discount
        );
      const orderId = Number(orderResult.lastInsertRowid);

      for (const item of items) {
        db.prepare(
          "INSERT INTO order_items (order_id, product_id, kind, name, price, qty) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(orderId, item.refId, item.kind, item.name, item.price, item.qty);
      }

      if (couponCode) {
        db.prepare("UPDATE coupons SET used_count = used_count + 1 WHERE code = ?").run(couponCode);
      }

      if (type === "mesa" && body.tableId) {
        const tableResult = db
          .prepare("SELECT status FROM tables WHERE id = ?")
          .get(body.tableId) as { status: string } | undefined;
        if (tableResult?.status === "livre") {
          db.prepare("UPDATE tables SET status = 'ocupada' WHERE id = ?").run(
            body.tableId
          );
        }
      }

      const phone = String(body.customerPhone ?? "").trim() || null;
      if (phone) {
        const existing = db
          .prepare("SELECT id FROM customers WHERE phone = ?")
          .get(phone) as { id: number } | undefined;
        let customerId: number;
        if (existing) {
          customerId = existing.id;
          db.prepare(
            `UPDATE customers SET
               name = COALESCE(NULLIF(?, ''), name),
               total_orders = total_orders + 1,
               total_spent = total_spent + ?,
               last_order_at = datetime('now')
             WHERE id = ?`
          ).run(String(body.customerName ?? "").trim(), total, existing.id);
        } else {
          const result = db
            .prepare(
              `INSERT INTO customers (name, phone, points, notes, total_orders, total_spent, last_order_at)
               VALUES (?, ?, 0, '', 1, ?, datetime('now'))`
            )
            .run(String(body.customerName ?? "").trim(), phone, total);
          customerId = Number(result.lastInsertRowid);
        }
        db.prepare("UPDATE orders SET customer_id = ? WHERE id = ?").run(
          customerId,
          orderId
        );
      }

      db.exec("COMMIT");
      const order = loadOrder(orderId);
      res.status(201).json(order);
    } catch (error) {
      db.exec("ROLLBACK");
      res.status(400).json({
        error: error instanceof Error ? error.message : "Erro ao criar pedido.",
      });
    }
  });

  api.get("/api/orders", requireAdmin, (req, res) => {
    const status = req.query.status as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const where = status ? "WHERE o.status = ?" : "";
    const rows = db
      .prepare(
        `SELECT o.id, o.number, o.type, o.status, o.payment_method AS paymentMethod,
                o.table_id AS tableId, t.number AS tableNumber,
                o.customer_id AS customerId, o.customer_name AS customerName,
                o.customer_phone AS customerPhone, o.address, o.scheduled_at AS scheduledAt,
                o.note, o.total, o.discount, o.coupon_code AS couponCode,
                o.created_at AS createdAt, o.closed_at AS closedAt
         FROM orders o LEFT JOIN tables t ON t.id = o.table_id
         ${where} ORDER BY o.created_at DESC, o.id DESC LIMIT ?`
      )
      .all(...(status ? [status, limit] : [limit]));
    res.json((rows as unknown as Order[]).map((row) => withItems(row)));
  });

  api.get("/api/orders/:id", requireAdmin, (req, res) => {
    const order = loadOrder(Number(req.params.id));
    if (!order) {
      res.status(404).json({ error: "Pedido não encontrado." });
      return;
    }
    res.json(order);
  });

  api.patch("/api/orders/:id/status", requireAdmin, (req, res) => {
    const body = req.body as { status?: string };
    const status = String(body.status ?? "");
    const allowed: OrderStatus[] = [
      "novo",
      "em_preparo",
      "pronto",
      "entregue",
      "pago",
      "cancelado",
    ];
    if (!allowed.includes(status as OrderStatus)) {
      res.status(400).json({ error: "Status inválido." });
      return;
    }
    const order = loadOrder(Number(req.params.id));
    if (!order) {
      res.status(404).json({ error: "Pedido não encontrado." });
      return;
    }
    const closedAt = status === "pago" || status === "cancelado" ? "datetime('now')" : null;
    db.prepare(`UPDATE orders SET status = ?, closed_at = ${closedAt} WHERE id = ?`).run(
      status,
      order.id
    );
    if (status === "pago" && order.type === "mesa" && order.tableId) {
      db.prepare("UPDATE tables SET status = 'livre' WHERE id = ?").run(
        order.tableId
      );
    }
    const updated = loadOrder(order.id);
    res.json(updated);
  });

  api.get("/api/tables", (_req, res) => {
    const tables = db
      .prepare(
        "SELECT id, number, name, seats, status FROM tables ORDER BY number"
      )
      .all();
    const openByTable = db
      .prepare(
        `SELECT table_id AS tableId, COUNT(*) AS count, SUM(total) AS total
         FROM orders
         WHERE table_id IS NOT NULL AND status NOT IN ('pago', 'cancelado')
         GROUP BY table_id`
      )
      .all() as { tableId: number; count: number; total: number }[];
    res.json(
      (tables as { id: number }[]).map((table) => {
        const open = openByTable.find((entry) => entry.tableId === table.id);
        return { ...table, openOrders: open?.count ?? 0, openTotal: open?.total ?? 0 };
      })
    );
  });

  api.patch("/api/tables/:id/status", requireAdmin, (req, res) => {
    const tableId = Number(req.params.id);
    const body = req.body as { status?: string };
    const status = String(body.status ?? "");
    if (!["livre", "ocupada", "reservada"].includes(status)) {
      res.status(400).json({ error: "Status inválido." });
      return;
    }
    const result = db
      .prepare("UPDATE tables SET status = ? WHERE id = ?")
      .run(status, tableId);
    if (result.changes === 0) {
      res.status(404).json({ error: "Mesa não encontrada." });
      return;
    }
    res.json({ ok: true });
  });

  api.get("/api/customers", requireAdmin, (req, res) => {
    const search = String(req.query.search ?? "").toLowerCase();
    const baseQuery = `SELECT id, name, phone, points, notes,
       total_orders AS totalOrders, total_spent AS totalSpent,
       last_order_at AS lastOrderAt, created_at AS createdAt
     FROM customers`;
    const rows = search
      ? db
          .prepare(`${baseQuery} WHERE LOWER(name) LIKE ? OR phone LIKE ? ORDER BY total_spent DESC LIMIT 200`)
          .all(`%${search}%`, `%${search}%`)
      : db
          .prepare(`${baseQuery} ORDER BY total_spent DESC, total_orders DESC LIMIT 200`)
          .all();
    res.json(rows);
  });

  api.get("/api/customers/:id", requireAdmin, (req, res) => {
    const customer = db
      .prepare(
        `SELECT id, name, phone, points, notes,
                total_orders AS totalOrders, total_spent AS totalSpent,
                last_order_at AS lastOrderAt, created_at AS createdAt
         FROM customers WHERE id = ?`
      )
      .get(Number(req.params.id));
    const orders = db
      .prepare(
        `SELECT o.id, o.number, o.type, o.status, o.total, o.created_at AS createdAt
         FROM orders o WHERE o.customer_id = ? ORDER BY o.created_at DESC LIMIT 50`
      )
      .all(Number(req.params.id));
    res.json({ customer, orders });
  });

  api.post("/api/customers", requireAdmin, (req, res) => {
    const body = req.body ?? {};
    const name = String(body.name ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "Informe o nome do cliente." });
      return;
    }
    const existing = body.phone
      ? db.prepare("SELECT id FROM customers WHERE phone = ?").get(body.phone)
      : undefined;
    if (existing) {
      res.status(400).json({ error: "Já existe cliente com esse telefone." });
      return;
    }
    const result = db
      .prepare(
        "INSERT INTO customers (name, phone, points, notes, total_orders, total_spent) VALUES (?, ?, 0, ?, 0, 0)"
      )
      .run(name, String(body.phone ?? "").trim(), String(body.notes ?? "").trim());
    const created = db
      .prepare(
        `SELECT id, name, phone, points, notes, total_orders AS totalOrders,
                total_spent AS totalSpent, last_order_at AS lastOrderAt, created_at AS createdAt
         FROM customers WHERE id = ?`
      )
      .get(Number(result.lastInsertRowid));
    res.status(201).json(created);
  });

  api.patch("/api/customers/:id", requireAdmin, (req, res) => {
    const body = req.body ?? {};
    const result = db
      .prepare(
        "UPDATE customers SET name = COALESCE(NULLIF(?, ''), name), phone = COALESCE(NULLIF(?, ''), phone), notes = COALESCE(?, notes), points = COALESCE(?, points) WHERE id = ?"
      )
      .run(
        body.name ?? null,
        body.phone ?? null,
        body.notes ?? null,
        body.points ?? null,
        Number(req.params.id)
      );
    if (result.changes === 0) {
      res.status(404).json({ error: "Cliente não encontrado." });
      return;
    }
    res.json(
      db
        .prepare(
          `SELECT id, name, phone, points, notes, total_orders AS totalOrders,
                  total_spent AS totalSpent, last_order_at AS lastOrderAt, created_at AS createdAt
           FROM customers WHERE id = ?`
        )
        .get(Number(req.params.id))
    );
  });

  api.delete("/api/customers/:id", requireAdmin, (req, res) => {
    db.prepare("DELETE FROM customers WHERE id = ?").run(Number(req.params.id));
    res.json({ ok: true });
  });

  api.get("/api/cash/movements", requireAdmin, (_req, res) => {
    const rows = db
      .prepare(
        "SELECT id, type, description, amount, created_at AS createdAt FROM cash_movements ORDER BY created_at DESC, id DESC"
      )
      .all() as { id: number; type: string; description: string; amount: number }[];
    const entrada = db
      .prepare(
        "SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE status = 'pago'"
      )
      .get() as { total: number };
    const suprimento = db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM cash_movements WHERE type IN ('entrada', 'suprimento')"
      )
      .get() as { total: number };
    const saida = db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM cash_movements WHERE type IN ('saida', 'sangria')"
      )
      .get() as { total: number };
    res.json({
      movements: rows,
      cashIn: entrada.total + suprimento.total,
      cashOut: saida.total,
      balance: Number((entrada.total + suprimento.total - saida.total).toFixed(2)),
    });
  });

  api.post("/api/cash/movements", requireAdmin, (req, res) => {
    const body = req.body ?? {};
    const type = String(body.type ?? "") as CashMovementType;
    const amount = Number(body.amount);
    if (!["entrada", "saida", "suprimento", "sangria"].includes(type)) {
      res.status(400).json({ error: "Tipo de movimentação inválido." });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: "Valor inválido." });
      return;
    }
    const result = db
      .prepare(
        "INSERT INTO cash_movements (type, description, amount) VALUES (?, ?, ?)"
      )
      .run(type, String(body.description ?? "").trim(), amount);
    res.status(201).json(
      db
        .prepare(
          "SELECT id, type, description, amount, created_at AS createdAt FROM cash_movements WHERE id = ?"
        )
        .get(Number(result.lastInsertRowid))
    );
  });

  api.get("/api/dashboard", requireAdmin, (_req, res) => {
    const today = db
      .prepare(
        `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS count
         FROM orders WHERE status IN ('pago', 'entregue') AND date(created_at) = date('now')`
      )
      .get() as { total: number; count: number };
    const activeOrders = (
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM orders WHERE status IN ('novo', 'em_preparo', 'pronto')"
        )
        .get() as { count: number }
    ).count;
    const openTables = (
      db
        .prepare("SELECT COUNT(*) AS count FROM tables WHERE status = 'ocupada'")
        .get() as { count: number }
    ).count;
    const monthTotal = db
      .prepare(
        `SELECT COALESCE(SUM(total), 0) AS total
         FROM orders WHERE status IN ('pago', 'entregue') AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`
      )
      .get() as { total: number };
    const avgTicket = today.count > 0 ? Number((today.total / today.count).toFixed(2)) : 0;

    const recentOrders = (
      db
        .prepare(
          `SELECT o.id, o.number, o.type, o.status, o.total, o.customer_name AS customerName,
                  o.created_at AS createdAt, t.number AS tableNumber
           FROM orders o LEFT JOIN tables t ON t.id = o.table_id
           ORDER BY o.created_at DESC, o.id DESC LIMIT 10`
        )
        .all() as unknown as Order[]
    ).map((row) => withItems(row));

    const topProducts = db
      .prepare(
        `SELECT oi.name AS name, SUM(oi.qty) AS qty, SUM(oi.price * oi.qty) AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.status NOT IN ('cancelado')
         GROUP BY oi.product_id, oi.name
         ORDER BY qty DESC LIMIT 5`
      )
      .all();

    const salesByDay = db
      .prepare(
        `SELECT date(created_at) AS day, COALESCE(SUM(total), 0) AS total, COUNT(*) AS orders
         FROM orders
         WHERE status IN ('pago', 'entregue')
           AND created_at >= datetime('now', '-6 days')
         GROUP BY date(created_at)
         ORDER BY day`
      )
      .all() as { day: string; total: number; orders: number }[];

    res.json({
      todaySales: Number(today.total.toFixed(2)),
      todayOrders: today.count,
      activeOrders,
      openTables,
      avgTicket,
      monthlySales: Number(monthTotal.total.toFixed(2)),
      recentOrders,
      topProducts,
      salesByDay,
    });
  });

  api.get("/api/admin/check", requireAdmin, (_req, res) => {
    res.json({ ok: true });
  });

  return api;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const pin = String(req.header("x-admin-pin") ?? "");
  if (pin !== ADMIN_PIN) {
    res.status(401).json({ error: "PIN de administrador inválido." });
    return;
  }
  next();
}

function normalizeProduct(body: Record<string, unknown>) {
  const promo = body.promoPrice === null || body.promoPrice === undefined || body.promoPrice === "" ? null : Number(body.promoPrice);
  return {
    categoryId: Number(body.categoryId) || 0,
    name: String(body.name ?? "").trim(),
    description: String(body.description ?? "").trim(),
    price: Math.max(0, Number(body.price) || 0),
    promoPrice: promo !== null && Number.isFinite(promo) && promo > 0 ? promo : null,
    image: String(body.image ?? ""),
    accent: String(body.accent ?? ""),
    tag: body.tag ? String(body.tag).trim() : null,
    active: body.active === false || body.active === 0 ? 0 : 1,
  };
}

function normalizeCoupon(body: Record<string, unknown>) {
  const rawExpires = body.expiresAt;
  return {
    code: String(body.code ?? "").trim().toUpperCase().replace(/\s+/g, ""),
    type: body.type === "fixed" ? "fixed" : "percent",
    value: Math.max(0, Number(body.value) || 0),
    maxUses: Math.max(0, Math.floor(Number(body.maxUses) || 0)),
    active: body.active === false || body.active === 0 ? 0 : 1,
    expiresAt:
      typeof rawExpires === "string" && rawExpires.trim() !== ""
        ? rawExpires.trim().slice(0, 10)
        : null,
  };
}

function validateCouponInput(input: ReturnType<typeof normalizeCoupon>) {
  if (!input.code) return "Informe o código do cupom.";
  if (input.value <= 0) return "Informe o valor do desconto.";
  if (input.expiresAt && input.expiresAt < new Date().toISOString().slice(0, 10)) {
    return "A validade não pode ser anterior à data de hoje.";
  }
  return null;
}

function loadOrder(id: number): Order | null {
  const row = db
    .prepare(
      `SELECT o.id, o.number, o.type, o.status, o.payment_method AS paymentMethod,
              o.table_id AS tableId, t.number AS tableNumber,
              o.customer_id AS customerId, o.customer_name AS customerName,
              o.customer_phone AS customerPhone, o.address, o.scheduled_at AS scheduledAt,
              o.note, o.total, o.discount, o.coupon_code AS couponCode,
              o.created_at AS createdAt, o.closed_at AS closedAt
       FROM orders o LEFT JOIN tables t ON t.id = o.table_id
       WHERE o.id = ?`
    )
    .get(id) as Order | undefined;
  if (!row) return null;
  return withItems(row);
}

function withItems(order: Order): Order {
  const items = db
    .prepare(
      "SELECT id, order_id AS orderId, product_id AS productId, kind, name, price, qty FROM order_items WHERE order_id = ?"
    )
    .all(order.id) as unknown as Order["items"];
  return { ...order, items };
}