# Shop Operations App

Simple Next.js web app for browsing customers, placing orders, viewing order history, and inspecting a fraud-risk warehouse queue backed by Supabase.

## Requirements

- Node.js 20+
- A Supabase project with these public schema tables:
  - `customers`
  - `orders`
  - `order_items`
  - `products`
  - `shipments`
  - `fraud_predictions`
- A local `.env.local` file with:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Setup

```bash
npm install
```

## Run In Development

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Build For Production

```bash
npm run build
npm run start
```

## Scripts

- `npm run dev` - start the development server
- `npm run build` - build the production app
- `npm run start` - run the production server
- `npm run lint` - run Next.js linting

## App Notes

- The current customer is stored in the `customer_id` cookie.
- Database access lives in `lib/db.js` and uses the Supabase JS client on the server.
- The app uses the service-role key from `.env.local`, so keep that file private.
- The warehouse queue reads from `fraud_predictions` and orders rows by `fraud_prob`.
- If `fraud_predictions` is unavailable, the queue page shows a readable fallback message instead of crashing.

## Manual QA Checklist

1. Select customer
   - Open `/select-customer`
   - Search for an existing customer by name or email
   - Select a customer
   - Confirm the app redirects to `/dashboard`
   - Confirm the selected-customer banner appears at the top of the page

2. Place order
   - Open `/place-order`
   - Verify the first line item requires both a product and a quantity
   - Submit a valid order with at least one product
   - Confirm the app redirects to `/orders`
   - Confirm the success banner shows the new order ID

3. View orders
   - On `/orders`, confirm the new order appears in the history table
   - Click the new order ID
   - Confirm `/orders/[order_id]` shows the correct line items, quantities, unit prices, and line totals

4. Review fraud queue
   - Open `/warehouse/priority`
   - Confirm the queue loads rows ordered by fraud probability
   - Confirm shipped orders do not appear in the queue
   - Confirm the scored timestamp and fraud prediction fields render correctly
