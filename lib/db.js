import Database from "better-sqlite3";
import path from "path";

let dbInstance;

class AppDbError extends Error {
  constructor(message) {
    super(message);
    this.name = "AppDbError";
  }
}

function getDatabasePath() {
  return path.join(process.cwd(), "shop.db");
}

export function getDb() {
  if (!dbInstance) {
    try {
      dbInstance = new Database(getDatabasePath(), {
        fileMustExist: true
      });
      dbInstance.pragma("journal_mode = WAL");
    } catch (error) {
      throw new AppDbError(
        `Unable to open shop.db at ${getDatabasePath()}. Make sure the database file exists at the project root.`
      );
    }
  }

  return dbInstance;
}

function tableExists(tableName) {
  return Boolean(
    getDb()
      .prepare(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name = ?
        `
      )
      .get(tableName)
  );
}

function assertTablesExist(tableNames) {
  const missingTables = tableNames.filter((tableName) => !tableExists(tableName));

  if (missingTables.length > 0) {
    throw new AppDbError(`Missing required table(s): ${missingTables.join(", ")}.`);
  }
}

export function getFriendlyErrorMessage(error) {
  if (error instanceof AppDbError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected database error occurred.";
}

export function query(sql, params = []) {
  return getDb().prepare(sql).all(params);
}

export function queryOne(sql, params = []) {
  return getDb().prepare(sql).get(params);
}

export function execute(sql, params = []) {
  return getDb().prepare(sql).run(params);
}

export function runInTransaction(work) {
  return getDb().transaction(work)();
}

export function getSchemaDetails() {
  assertTablesExist(["customers", "orders", "order_items", "products", "shipments"]);

  const db = getDb();
  const tables = db
    .prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `
    )
    .all();

  return tables.map(({ name }) => ({
    name,
    columns: db.prepare(`PRAGMA table_info(${name})`).all()
  }));
}

const CUSTOMER_SELECT_SQL = `
  SELECT
    customer_id,
    CASE
      WHEN instr(trim(full_name), ' ') > 0
        THEN substr(trim(full_name), 1, instr(trim(full_name), ' ') - 1)
      ELSE trim(full_name)
    END AS first_name,
    CASE
      WHEN instr(trim(full_name), ' ') > 0
        THEN substr(trim(full_name), instr(trim(full_name), ' ') + 1)
      ELSE ''
    END AS last_name,
    email,
    full_name
  FROM customers
`;

export function getCustomers(search = "") {
  assertTablesExist(["customers"]);

  const db = getDb();
  const normalizedSearch = search.trim();

  if (!normalizedSearch) {
    return db
      .prepare(
        `
          ${CUSTOMER_SELECT_SQL}
          ORDER BY full_name
          LIMIT 100
        `
      )
      .all();
  }

  return db
    .prepare(
      `
        ${CUSTOMER_SELECT_SQL}
        WHERE full_name LIKE ? OR email LIKE ?
        ORDER BY full_name
        LIMIT 100
      `
    )
    .all(`%${normalizedSearch}%`, `%${normalizedSearch}%`);
}

export function getCustomerById(customerId) {
  if (!customerId) {
    return null;
  }

  assertTablesExist(["customers"]);

  return getDb()
    .prepare(
      `
        ${CUSTOMER_SELECT_SQL}
        WHERE customer_id = ?
      `
    )
    .get(customerId);
}

export function getCustomerDashboard(customerId) {
  if (!customerId) {
    return null;
  }

  assertTablesExist(["customers", "orders", "shipments"]);

  const customer = getCustomerById(customerId);

  if (!customer) {
    return null;
  }

  const stats = getDb()
    .prepare(
      `
        SELECT
          COUNT(*) AS total_orders,
          COALESCE(SUM(order_total), 0) AS total_spend
        FROM orders
        WHERE customer_id = ?
      `
    )
    .get(customerId);

  const recentOrders = getDb()
    .prepare(
      `
        SELECT
          o.order_id,
          o.order_datetime AS order_timestamp,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM shipments s
              WHERE s.order_id = o.order_id
            ) THEN 1
            ELSE 0
          END AS fulfilled,
          o.order_total AS total_value
        FROM orders o
        WHERE o.customer_id = ?
        ORDER BY o.order_datetime DESC
        LIMIT 5
      `
    )
    .all(customerId);

  return {
    customer,
    stats,
    recentOrders
  };
}

export function getProducts() {
  assertTablesExist(["products"]);

  return getDb()
    .prepare(
      `
        SELECT product_id, product_name, price
        FROM products
        WHERE is_active = 1
        ORDER BY product_name
      `
    )
    .all();
}

export function createOrderForCustomer(customerId, items) {
  assertTablesExist(["customers", "orders", "order_items", "products"]);

  const customer = getCustomerById(customerId);

  if (!customer) {
    throw new Error("Selected customer was not found.");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Add at least one line item.");
  }

  if (items.length > 10) {
    throw new Error("Please submit 10 line items or fewer.");
  }

  const db = getDb();
  const productIds = items.map((item) => item.productId);
  const placeholders = productIds.map(() => "?").join(", ");
  const products = db
    .prepare(
      `
        SELECT product_id, product_name, price
        FROM products
        WHERE product_id IN (${placeholders})
      `
    )
    .all(...productIds);

  const productsById = new Map(products.map((product) => [String(product.product_id), product]));
  const normalizedItems = items.map((item) => {
    const product = productsById.get(String(item.productId));

    if (!product) {
      throw new Error("One or more products are invalid.");
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Quantity must be a whole number greater than zero.");
    }

    const lineTotal = Number((product.price * item.quantity).toFixed(2));

    return {
      productId: product.product_id,
      productName: product.product_name,
      quantity: item.quantity,
      unitPrice: product.price,
      lineTotal
    };
  });

  const subtotal = Number(
    normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
  );
  const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");

  return db.transaction(() => {
    const orderResult = db
      .prepare(
        `
          INSERT INTO orders (
            customer_id,
            order_datetime,
            billing_zip,
            shipping_zip,
            shipping_state,
            payment_method,
            device_type,
            ip_country,
            promo_used,
            promo_code,
            order_subtotal,
            shipping_fee,
            tax_amount,
            order_total,
            risk_score,
            is_fraud
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        customer.customer_id,
        timestamp,
        customer.zip_code ?? "",
        customer.zip_code ?? "",
        customer.state ?? "",
        "card",
        "desktop",
        "US",
        0,
        null,
        subtotal,
        0,
        0,
        subtotal,
        0,
        0
      );

    const orderId = orderResult.lastInsertRowid;
    const insertItem = db.prepare(
      `
        INSERT INTO order_items (
          order_id,
          product_id,
          quantity,
          unit_price,
          line_total
        )
        VALUES (?, ?, ?, ?, ?)
      `
    );

    normalizedItems.forEach((item) => {
      insertItem.run(orderId, item.productId, item.quantity, item.unitPrice, item.lineTotal);
    });

    return {
      orderId,
      subtotal,
      itemCount: normalizedItems.length
    };
  })();
}

export function getOrdersForCustomer(customerId) {
  if (!customerId) {
    return [];
  }

  assertTablesExist(["orders", "shipments"]);

  return getDb()
    .prepare(
      `
        SELECT
          o.order_id,
          o.order_datetime AS order_timestamp,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM shipments s
              WHERE s.order_id = o.order_id
            ) THEN 1
            ELSE 0
          END AS fulfilled,
          o.order_total AS total_value
        FROM orders o
        WHERE o.customer_id = ?
        ORDER BY o.order_datetime DESC
      `
    )
    .all(customerId);
}

export function getOrderDetailsForCustomer(customerId, orderId) {
  if (!customerId || !orderId) {
    return null;
  }

  assertTablesExist(["orders", "order_items", "products", "shipments"]);

  const order = getDb()
    .prepare(
      `
        SELECT
          o.order_id,
          o.order_datetime AS order_timestamp,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM shipments s
              WHERE s.order_id = o.order_id
            ) THEN 1
            ELSE 0
          END AS fulfilled,
          o.order_total AS total_value
        FROM orders o
        WHERE o.customer_id = ?
          AND o.order_id = ?
      `
    )
    .get(customerId, orderId);

  if (!order) {
    return null;
  }

  const lineItems = getDb()
    .prepare(
      `
        SELECT
          p.product_name,
          oi.quantity,
          oi.unit_price,
          oi.line_total
        FROM order_items oi
        JOIN products p
          ON p.product_id = oi.product_id
        WHERE oi.order_id = ?
        ORDER BY oi.order_item_id
      `
    )
    .all(orderId);

  return {
    order,
    lineItems
  };
}

export function getWarehousePriorityQueue() {
  assertTablesExist(["orders", "customers", "shipments"]);

  const db = getDb();
  const predictionTable = tableExists("order_predictions");

  if (!predictionTable) {
    return {
      available: false,
      rows: []
    };
  }

  const rows = db
    .prepare(
      `
        SELECT
          o.order_id,
          o.order_datetime AS order_timestamp,
          o.order_total AS total_value,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM shipments s
              WHERE s.order_id = o.order_id
            ) THEN 1
            ELSE 0
          END AS fulfilled,
          c.customer_id,
          c.full_name AS customer_name,
          p.late_delivery_probability,
          p.predicted_late_delivery,
          p.prediction_timestamp
        FROM orders o
        JOIN customers c
          ON c.customer_id = o.customer_id
        JOIN order_predictions p
          ON p.order_id = o.order_id
        WHERE NOT EXISTS (
          SELECT 1
          FROM shipments s
          WHERE s.order_id = o.order_id
        )
        ORDER BY p.late_delivery_probability DESC, o.order_datetime ASC
        LIMIT 50
      `
    )
    .all();

  return {
    available: true,
    rows
  };
}
