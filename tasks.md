# Project Tasks & Progress Tracker

## Module: Sports Shop Management
**Developer:** Shashank Shekhar Ojha  
**Role:** Sports Shop Backend & API Integration  
**Status:** In Progress  

---

### Completed Tasks

- [x] **Task 1: System Analysis & Architecture Planning**
  - Analyzed hackathon requirements for "The Champions Club" sports shop.
  - Reviewed team conventions: Neon PostgreSQL, Prisma ORM, Express (ESM).
  - Designed module-based architecture in `server/src/modules/sports-shop/`.

- [x] **Task 2: Database Schema Refinement (Prisma)**
  - Retained all existing tables (`User`, `SportsBooking`, `CafeOrder`, `Staff`).
  - Retained `SportShopPurchase` and `Product` without deleting any fields.
  - Added `SportShopOrderItem` model:
    - Links `SportShopPurchase` to `Product` via `purchaseID` and `productID`.
    - Stores `quantity`, `unitPrice`, and `totalPrice`.
  - Added order lifecycle and financial fields to `SportShopPurchase`:
    - `status`: Default `"PENDING"` (enables cancellation before ready).
    - `fulfillmentType`: Default `"PICKUP"` (supports pickup vs delivery).
    - `discount`: Tracks member discount savings (Gold 30% / Silver 15%).
  - Added `orderItems` relation to `Product`.
  - Validated Prisma schema (`npx prisma validate`) and generated client (`npx prisma generate`).

---

### Upcoming Tasks (Next Steps)

- [ ] **Task 3: Folder Structure Setup (`server/src/modules/sports-shop/`)**
  - Create `sportsShop.routes.js`
  - Create `sportsShop.controller.js`
  - Create `sportsShop.service.js`
  - Wire route into `server/src/app.js` (`/api/shop`)

- [x] **Task 4: Product Catalog API (Read & Manage Stock)**
  - Endpoint to get all products with category filtering (`GET /api/shop/products`).
  - Automatic low-stock identification (`isLowStock: inStock <= 5`).
  - Endpoint to fetch single product (`GET /api/shop/products/:id`).
  - Endpoint to create products (`POST /api/shop/products`).
  - Endpoint to update/add stock quantity (`PATCH /api/shop/products/:id/stock`).

- [x] **Task 5: Member Purchase & Checkout Flow**
  - Fetch member tier from `User` table (Gold: 30%, Silver: 15%, Junior/None: 0%).
  - Validate and verify pricing on server (never trust client amounts).
  - Atomic stock deduction inside `prisma.$transaction`.
  - Create `SportShopPurchase` and corresponding `SportShopOrderItem` records in a Prisma transaction.
  - Endpoint: `POST /api/shop/checkout`.

- [x] **Task 6: Order Management & Cancellation**
  - List user purchases (`GET /api/shop/orders/user/:userId`).
  - List all shop purchases for admin dashboard (`GET /api/shop/orders`).
  - Cancel order before "READY" status (`POST /api/shop/orders/:id/cancel`), automatically restoring stock to `Product`.

- [ ] **Task 7: Rental System (Deferred to Final Phase)**
  - Implement deposit, due date, return processing, and overdue late fees.
