import "server-only";
import { createClient } from "@supabase/supabase-js";

class AppDbError extends Error {
  constructor(message) {
    super(message);
    this.name = "AppDbError";
  }
}

const REQUIRED_ENV_VARS = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

const KNOWN_SCHEMA = [
  {
    name: "customers",
    columns: [
      { name: "customer_id", type: "int8", notnull: true, dflt_value: null, pk: true },
      { name: "full_name", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "email", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "gender", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "birthdate", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "created_at", type: "timestamptz", notnull: false, dflt_value: null, pk: false },
      { name: "city", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "state", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "zip_code", type: "int8", notnull: false, dflt_value: null, pk: false },
      { name: "customer_segment", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "loyalty_tier", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "is_active", type: "int8", notnull: false, dflt_value: null, pk: false }
    ]
  },
  {
    name: "orders",
    columns: [
      { name: "order_id", type: "int8", notnull: true, dflt_value: null, pk: true },
      { name: "customer_id", type: "int8", notnull: false, dflt_value: null, pk: false },
      { name: "order_datetime", type: "timestamptz", notnull: false, dflt_value: null, pk: false },
      { name: "billing_zip", type: "int8", notnull: false, dflt_value: null, pk: false },
      { name: "shipping_zip", type: "int8", notnull: false, dflt_value: null, pk: false },
      { name: "shipping_state", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "payment_method", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "device_type", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "ip_country", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "promo_used", type: "int8", notnull: false, dflt_value: null, pk: false },
      { name: "promo_code", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "order_subtotal", type: "float8", notnull: false, dflt_value: null, pk: false },
      { name: "shipping_fee", type: "float8", notnull: false, dflt_value: null, pk: false },
      { name: "tax_amount", type: "float8", notnull: false, dflt_value: null, pk: false },
      { name: "order_total", type: "float8", notnull: false, dflt_value: null, pk: false },
      { name: "risk_score", type: "float8", notnull: false, dflt_value: null, pk: false },
      { name: "is_fraud", type: "int8", notnull: false, dflt_value: null, pk: false }
    ]
  },
  {
    name: "order_items",
    columns: [
      { name: "order_item_id", type: "int8", notnull: true, dflt_value: null, pk: true },
      { name: "order_id", type: "int8", notnull: false, dflt_value: null, pk: false },
      { name: "product_id", type: "int8", notnull: false, dflt_value: null, pk: false },
      { name: "quantity", type: "int8", notnull: false, dflt_value: null, pk: false },
      { name: "unit_price", type: "float8", notnull: false, dflt_value: null, pk: false },
      { name: "line_total", type: "float8", notnull: false, dflt_value: null, pk: false }
    ]
  },
  {
    name: "products",
    columns: [
      { name: "product_id", type: "int8", notnull: true, dflt_value: null, pk: true },
      { name: "sku", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "product_name", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "category", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "price", type: "float8", notnull: false, dflt_value: null, pk: false },
      { name: "cost", type: "float8", notnull: false, dflt_value: null, pk: false },
      { name: "is_active", type: "int8", notnull: false, dflt_value: null, pk: false }
    ]
  },
  {
    name: "shipments",
    columns: [
      { name: "shipment_id", type: "int8", notnull: true, dflt_value: null, pk: true },
      { name: "order_id", type: "int8", notnull: false, dflt_value: null, pk: false },
      { name: "ship_datetime", type: "timestamptz", notnull: false, dflt_value: null, pk: false },
      { name: "carrier", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "shipping_method", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "distance_band", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "promised_days", type: "int8", notnull: false, dflt_value: null, pk: false },
      { name: "actual_days", type: "int8", notnull: false, dflt_value: null, pk: false },
      { name: "late_delivery", type: "int8", notnull: false, dflt_value: null, pk: false }
    ]
  },
  {
    name: "fraud_predictions",
    columns: [
      { name: "prediction_id", type: "int8", notnull: true, dflt_value: null, pk: true },
      { name: "order_id", type: "int8", notnull: false, dflt_value: null, pk: false },
      { name: "customer_id", type: "int8", notnull: false, dflt_value: null, pk: false },
      { name: "fraud_prob", type: "float8", notnull: false, dflt_value: null, pk: false },
      { name: "is_fraud_pred", type: "bool", notnull: false, dflt_value: null, pk: false },
      { name: "threshold_used", type: "float8", notnull: false, dflt_value: null, pk: false },
      { name: "model_version", type: "text", notnull: false, dflt_value: null, pk: false },
      { name: "scored_at_utc", type: "timestamptz", notnull: false, dflt_value: null, pk: false },
      { name: "feature_snapshot", type: "jsonb", notnull: false, dflt_value: null, pk: false }
    ]
  }
];

let supabaseInstance;

function getEnvVar(name) {
  const value = process.env[name];

  if (!value) {
    throw new AppDbError(`Missing required environment variable: ${name}.`);
  }

  return value;
}

function getSupabase() {
  if (!supabaseInstance) {
    REQUIRED_ENV_VARS.forEach(getEnvVar);
    supabaseInstance = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
  }

  return supabaseInstance;
}

function splitFullName(fullName) {
  const normalizedName = String(fullName ?? "").trim();

  if (!normalizedName) {
    return {
      first_name: "",
      last_name: "",
      full_name: ""
    };
  }

  const parts = normalizedName.split(/\s+/);

  return {
    first_name: parts[0] ?? "",
    last_name: parts.slice(1).join(" "),
    full_name: normalizedName
  };
}

function normalizeCustomer(customer) {
  if (!customer) {
    return null;
  }

  return {
    ...customer,
    ...splitFullName(customer.full_name)
  };
}

function sanitizeSearchTerm(value) {
  return String(value ?? "")
    .trim()
    .replaceAll("%", "\\%")
    .replaceAll(",", "\\,");
}

function formatTimestamp(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

function isNoRowsError(error) {
  return error?.code === "PGRST116";
}

function ensureNoError(error, fallbackMessage) {
  if (error) {
    throw new AppDbError(error.message || fallbackMessage);
  }
}

export function getFriendlyErrorMessage(error) {
  if (error instanceof AppDbError) {
    return error.message;
  }

  if (error?.message) {
    return error.message;
  }

  return "An unexpected database error occurred.";
}

export async function getSchemaDetails() {
  return KNOWN_SCHEMA;
}

export async function getCustomers(search = "") {
  const supabase = getSupabase();
  const normalizedSearch = sanitizeSearchTerm(search);

  let query = supabase
    .from("customers")
    .select("customer_id, full_name, email, is_active")
    .order("full_name", { ascending: true })
    .limit(100);

  if (normalizedSearch) {
    query = query.or(`full_name.ilike.%${normalizedSearch}%,email.ilike.%${normalizedSearch}%`);
  }

  const { data, error } = await query;
  ensureNoError(error, "Unable to load customers.");

  return (data ?? []).filter((customer) => customer.is_active !== 0).map(normalizeCustomer);
}

export async function getCustomerById(customerId) {
  if (!customerId) {
    return null;
  }

  const { data, error } = await getSupabase()
    .from("customers")
    .select("customer_id, full_name, email, city, state, zip_code, is_active")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error && !isNoRowsError(error)) {
    throw new AppDbError(error.message || "Unable to load customer.");
  }

  if (!data || data.is_active === 0) {
    return null;
  }

  return normalizeCustomer(data);
}

export async function getCustomerDashboard(customerId) {
  if (!customerId) {
    return null;
  }

  const customer = await getCustomerById(customerId);

  if (!customer) {
    return null;
  }

  const { data: orders, error } = await getSupabase()
    .from("orders")
    .select("order_id, order_datetime, order_total")
    .eq("customer_id", customerId)
    .order("order_datetime", { ascending: false });

  ensureNoError(error, "Unable to load dashboard orders.");

  const orderIds = (orders ?? []).map((order) => order.order_id);
  const fulfilledIds = await getFulfilledOrderIds(orderIds);
  const totalSpend = Number(
    (orders ?? []).reduce((sum, order) => sum + Number(order.order_total ?? 0), 0).toFixed(2)
  );

  return {
    customer,
    stats: {
      total_orders: orders?.length ?? 0,
      total_spend: totalSpend
    },
    recentOrders: (orders ?? []).slice(0, 5).map((order) => ({
      order_id: order.order_id,
      order_timestamp: formatTimestamp(order.order_datetime),
      fulfilled: fulfilledIds.has(order.order_id) ? 1 : 0,
      total_value: Number(order.order_total ?? 0)
    }))
  };
}

export async function getProducts() {
  const { data, error } = await getSupabase()
    .from("products")
    .select("product_id, product_name, price, is_active")
    .order("product_name", { ascending: true });

  ensureNoError(error, "Unable to load products.");

  return (data ?? [])
    .filter((product) => product.is_active !== 0)
    .map((product) => ({
      product_id: product.product_id,
      product_name: product.product_name,
      price: Number(product.price ?? 0)
    }));
}

export async function createOrderForCustomer(customerId, items) {
  const customer = await getCustomerById(customerId);

  if (!customer) {
    throw new AppDbError("Selected customer was not found.");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppDbError("Add at least one line item.");
  }

  if (items.length > 10) {
    throw new AppDbError("Please submit 10 line items or fewer.");
  }

  const productIds = [...new Set(items.map((item) => Number(item.productId)).filter(Boolean))];
  const { data: products, error: productsError } = await getSupabase()
    .from("products")
    .select("product_id, product_name, price, is_active")
    .in("product_id", productIds);

  ensureNoError(productsError, "Unable to load products for order creation.");

  const productsById = new Map(
    (products ?? [])
      .filter((product) => product.is_active !== 0)
      .map((product) => [String(product.product_id), product])
  );

  const normalizedItems = items.map((item) => {
    const product = productsById.get(String(item.productId));

    if (!product) {
      throw new AppDbError("One or more products are invalid.");
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new AppDbError("Quantity must be a whole number greater than zero.");
    }

    const lineTotal = Number((Number(product.price ?? 0) * item.quantity).toFixed(2));

    return {
      productId: product.product_id,
      productName: product.product_name,
      quantity: item.quantity,
      unitPrice: Number(product.price ?? 0),
      lineTotal
    };
  });

  const subtotal = Number(
    normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
  );

  const orderPayload = {
    customer_id: customer.customer_id,
    order_datetime: new Date().toISOString(),
    billing_zip: customer.zip_code ?? null,
    shipping_zip: customer.zip_code ?? null,
    shipping_state: customer.state ?? "",
    payment_method: "card",
    device_type: "desktop",
    ip_country: "US",
    promo_used: 0,
    promo_code: null,
    order_subtotal: subtotal,
    shipping_fee: 0,
    tax_amount: 0,
    order_total: subtotal,
    risk_score: 0,
    is_fraud: 0
  };

  const { data: insertedOrder, error: orderError } = await getSupabase()
    .from("orders")
    .insert(orderPayload)
    .select("order_id")
    .single();

  ensureNoError(orderError, "Unable to create order.");

  const orderId = insertedOrder?.order_id;

  if (!orderId) {
    throw new AppDbError("Order was created, but no order ID was returned.");
  }

  const { error: itemsError } = await getSupabase().from("order_items").insert(
    normalizedItems.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: item.lineTotal
    }))
  );

  ensureNoError(itemsError, "Order was created, but line items could not be saved.");

  return {
    orderId,
    subtotal,
    itemCount: normalizedItems.length
  };
}

async function getFulfilledOrderIds(orderIds) {
  if (!orderIds.length) {
    return new Set();
  }

  const { data, error } = await getSupabase()
    .from("shipments")
    .select("order_id")
    .in("order_id", orderIds);

  ensureNoError(error, "Unable to load shipment records.");

  return new Set((data ?? []).map((shipment) => shipment.order_id));
}

export async function getOrdersForCustomer(customerId) {
  if (!customerId) {
    return [];
  }

  const { data, error } = await getSupabase()
    .from("orders")
    .select("order_id, order_datetime, order_total")
    .eq("customer_id", customerId)
    .order("order_datetime", { ascending: false });

  ensureNoError(error, "Unable to load orders.");

  const fulfilledIds = await getFulfilledOrderIds((data ?? []).map((order) => order.order_id));

  return (data ?? []).map((order) => ({
    order_id: order.order_id,
    order_timestamp: formatTimestamp(order.order_datetime),
    fulfilled: fulfilledIds.has(order.order_id) ? 1 : 0,
    total_value: Number(order.order_total ?? 0)
  }));
}

export async function getOrderDetailsForCustomer(customerId, orderId) {
  if (!customerId || !orderId) {
    return null;
  }

  const { data: order, error: orderError } = await getSupabase()
    .from("orders")
    .select("order_id, order_datetime, order_total")
    .eq("customer_id", customerId)
    .eq("order_id", orderId)
    .maybeSingle();

  if (orderError && !isNoRowsError(orderError)) {
    throw new AppDbError(orderError.message || "Unable to load order details.");
  }

  if (!order) {
    return null;
  }

  const { data: lineItems, error: lineItemsError } = await getSupabase()
    .from("order_items")
    .select("order_item_id, product_id, quantity, unit_price, line_total")
    .eq("order_id", orderId)
    .order("order_item_id", { ascending: true });

  ensureNoError(lineItemsError, "Unable to load order line items.");

  const productIds = [...new Set((lineItems ?? []).map((item) => item.product_id))];
  const { data: products, error: productsError } = await getSupabase()
    .from("products")
    .select("product_id, product_name")
    .in("product_id", productIds);

  ensureNoError(productsError, "Unable to load product details.");

  const fulfilledIds = await getFulfilledOrderIds([order.order_id]);
  const productsById = new Map((products ?? []).map((product) => [product.product_id, product]));

  return {
    order: {
      order_id: order.order_id,
      order_timestamp: formatTimestamp(order.order_datetime),
      fulfilled: fulfilledIds.has(order.order_id) ? 1 : 0,
      total_value: Number(order.order_total ?? 0)
    },
    lineItems: (lineItems ?? []).map((item) => ({
      product_name: productsById.get(item.product_id)?.product_name ?? "Unknown Product",
      quantity: item.quantity,
      unit_price: Number(item.unit_price ?? 0),
      line_total: Number(item.line_total ?? 0)
    }))
  };
}

export async function getWarehousePriorityQueue() {
  const { data: predictions, error: predictionsError } = await getSupabase()
    .from("fraud_predictions")
    .select("order_id, customer_id, fraud_prob, is_fraud_pred, scored_at_utc")
    .order("fraud_prob", { ascending: false })
    .limit(200);

  if (predictionsError) {
    return {
      available: false,
      rows: []
    };
  }

  const orderIds = [...new Set((predictions ?? []).map((prediction) => prediction.order_id))];
  const customerIds = [...new Set((predictions ?? []).map((prediction) => prediction.customer_id))];

  const [ordersResult, customersResult, shipmentsResult] = await Promise.all([
    getSupabase()
      .from("orders")
      .select("order_id, customer_id, order_datetime, order_total")
      .in("order_id", orderIds),
    getSupabase().from("customers").select("customer_id, full_name").in("customer_id", customerIds),
    getSupabase().from("shipments").select("order_id").in("order_id", orderIds)
  ]);

  ensureNoError(ordersResult.error, "Unable to load orders for the warehouse queue.");
  ensureNoError(customersResult.error, "Unable to load customers for the warehouse queue.");
  ensureNoError(shipmentsResult.error, "Unable to load shipments for the warehouse queue.");

  const shippedOrderIds = new Set((shipmentsResult.data ?? []).map((shipment) => shipment.order_id));
  const ordersById = new Map((ordersResult.data ?? []).map((order) => [order.order_id, order]));
  const customersById = new Map(
    (customersResult.data ?? []).map((customer) => [customer.customer_id, customer])
  );

  const rows = (predictions ?? [])
    .filter((prediction) => !shippedOrderIds.has(prediction.order_id))
    .map((prediction) => {
      const order = ordersById.get(prediction.order_id);
      const customer = customersById.get(prediction.customer_id);

      if (!order || !customer) {
        return null;
      }

      return {
        order_id: order.order_id,
        order_timestamp: formatTimestamp(order.order_datetime),
        total_value: Number(order.order_total ?? 0),
        fulfilled: 0,
        customer_id: customer.customer_id,
        customer_name: customer.full_name,
        fraud_probability: Number(prediction.fraud_prob ?? 0),
        predicted_fraud: Boolean(prediction.is_fraud_pred),
        prediction_timestamp: formatTimestamp(prediction.scored_at_utc)
      };
    })
    .filter(Boolean)
    .slice(0, 50);

  return {
    available: true,
    rows
  };
}
