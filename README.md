# Shop Operations App

Simple Next.js web app for browsing customers, placing orders, viewing order history, and inspecting the warehouse late-delivery priority queue from the operational `shop.db` database.

## Requirements

- Node.js 20+
- `shop.db` at the project root
- `shop.db` should contain the operational tables used by the app:
  - `customers`
  - `orders`
  - `order_items`
  - `products`
  - `shipments`
- `order_predictions` is optional for now, but required if you want the warehouse priority queue to show scored results

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
- A customer banner appears on every page when a customer is selected.
- Database access and most SQL queries live in `lib/db.js`.
- The app shows friendly error messages when `shop.db` is missing, required tables are missing, or a page has no results.
- The warehouse queue page is available at `/warehouse/priority`.
- If `order_predictions` does not exist yet, the queue page explains that predictions are unavailable instead of failing.

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

4. Run scoring
   - Open `/run-scoring`
   - If your ML inference job is already connected, run it and confirm it writes to `order_predictions`
   - If scoring is not wired yet, confirm the page clearly explains that dependency

5. View priority queue
   - Open `/warehouse/priority`
   - If `order_predictions` exists and scoring has been run, confirm the queue loads rows ordered by late-delivery probability
   - After scoring a newly placed order, confirm that order can appear in the priority queue when it is still unfulfilled
   - If `order_predictions` is missing, confirm the page shows a readable fallback message instead of crashing
