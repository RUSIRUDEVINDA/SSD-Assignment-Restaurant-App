# Member 2: V03 Implementation Document – Administrator Authorization & Restaurant Scope

**Course:** SE4030 Secure Software Development  
**Assignment Component:** Member 2 – Access Control  
**Vulnerability Addressed:** V03: Broken Administrator Authorization / Vertical Privilege Escalation & Missing Tenant Scope  
**CWE Classification:** CWE-285 (Improper Authorization), CWE-269 (Improper Privilege Management)  
**OWASP Classification:** OWASP Top 10:2021 – A01: Broken Access Control  

---

## 1. Vulnerability Root Cause (Pre-Fix Baseline)

In the original baseline application:
1. **Unprotected Admin Routes:** State-altering operations (`PATCH /restaurant/orders/status/:id`, `DELETE /restaurant/orders/:id`, `PATCH /restaurant/orders/:id`, `PATCH /restaurant/order-requests/:requestId`, `PATCH /api/reservation-requests/:requestId`, `PATCH /api/reservations/:reservationId`, `PATCH /api/reservations/:reservationId/modify`) were mounted without authentication or role verification middleware. Any anonymous caller or customer could mutate orders, modify reservations, or alter statuses.
2. **Missing Multi-Tenant Isolation:** Endpoints returning restaurant-wide data (`GET /restaurant/orders/restaurant/:restaurantName`, `GET /api/restaurant/:restaurantId/reservations`, `GET /api/restaurant/:restaurantId/reservation-requests`) trusted client-supplied URL parameters without verifying whether the caller was authorized for that specific restaurant. A manager for Restaurant A could access and mutate Restaurant B's records.
3. **Reassignment and State Tampering:** General update routes (`PATCH /orders/:id` and `PATCH /reservations/:reservationId/modify`) accepted unverified fields (`restaurantName`, `email`, `restaurantId`, `status`), enabling arbitrary tenant reassignment or unauthorized state changes.
4. **Redundant Shadow Route Aliases:** `backend/app.js` mounted duplicate inline reservation request endpoints, and routes included duplicate aliases with varying parameter names (`:id` vs `:requestId`).

---

## 2. Implemented Permission & Authorization Matrix

The V03 security policy implements strict Role-Based Access Control (RBAC) and tenant scoping:

| Route Path | HTTP Method | Allowed Roles | Scope Requirement | Unauthenticated | Customer | Cross-Restaurant Admin |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/restaurant/orders` | `GET` | `mainAdmin` | Global system scope | **401** | **403** | **403** |
| `/restaurant/orders/restaurant/:restaurantName` | `GET` | `admin`, `mainAdmin` | Must match assigned restaurant | **401** | **403** | **403** |
| `/restaurant/orders/:id` | `PATCH` | `admin`, `mainAdmin` | Must match target order's restaurant; prevents reassignment | **401** | **403** | **403** |
| `/restaurant/orders/status/:id` | `PATCH` | `admin`, `mainAdmin` | Must match target order's restaurant | **401** | **403** | **403** |
| `/restaurant/orders/:id` | `DELETE` | `admin`, `mainAdmin` | Must match target order's restaurant | **401** | **403** | **403** |
| `/restaurant/order-requests/restaurant/:restaurantName` | `GET` | `admin`, `mainAdmin` | Must match assigned restaurant | **401** | **403** | **403** |
| `/restaurant/order-requests/:requestId` | `PATCH` | `admin`, `mainAdmin` | Must match parent order's restaurant | **401** | **403** | **403** |
| `/api/restaurant/:restaurantId/reservations` | `GET` | `admin`, `mainAdmin` | Must match assigned restaurant ID | **401** | **403** | **403** |
| `/api/restaurant/:restaurantId/reservation-requests` | `GET` | `admin`, `mainAdmin` | Must match assigned restaurant ID | **401** | **403** | **403** |
| `/api/reservation-requests/:requestId` | `PATCH` | `admin`, `mainAdmin` | Must match parent reservation's restaurant | **401** | **403** | **403** |
| `/api/reservations/:reservationId` | `PATCH` | `admin`, `mainAdmin` | Must match target reservation's restaurant | **401** | **403** | **403** |
| `/api/reservations/:reservationId/modify` | `PATCH` | `admin`, `mainAdmin` | Must match target reservation; allowlisted fields only | **401** | **403** *(until V04)* | **403** |

---

## 3. Trusted Identity Contract & Member 1 Dependency

This authorization system enforces a decoupled boundary between upstream authentication (owned by Member 1) and downstream authorization (Member 2):

```javascript
req.user = {
  id: "stable internal user identifier", // non-empty string required
  role: "customer" | "admin" | "mainAdmin",
  restaurantId: "trusted restaurant assignment when applicable" // required for admin
};
```

### Integration Notes:
- **Upstream Prerequisite:** Member 1 is responsible for verifying tokens/sessions (via OAuth/OIDC or secure session cookies) and populating `req.user`.
- **Zero Client Trust:** Authorization guards (`requireRole`, `requireRestaurantScopeByName`, `requireRestaurantScopeById`) inspect **only** `req.user`. Client attempts to inject or override roles via request body, query parameters, or arbitrary headers are ignored.
- **Fail-Closed Behavior:** In the absence of an authenticated session (`!req.user` or missing/blank `req.user.id`), all protected administrative routes fail closed with `401 Unauthorized`.
- **Current Integration Status:** Live upstream authentication middleware is not yet integrated into `backend/app.js`. Consequently, protected administrative routes currently return `401 Unauthorized` in production runtime. Tests inject synthetic identities exclusively within the isolated test harness (`backend/tests/v03-authorization.test.js`).

---

## 4. Restaurant Identifier & Mapping Strategy

The application exhibits a legacy identifier schema:
- **Orders** store `restaurantName` (e.g. `"Barista"`).
- **Reservations** and **Frontend User Records** store `restaurantId` (e.g. `"1"`).

To bridge this securely without relying on untrusted client claims or fuzzy matching, [backend/utils/restaurantMapping.js](file:///d:/SSD-Assignment-Restaurant-App/backend/utils/restaurantMapping.js) defines an authoritative server-side directory:

```javascript
const RESTAURANT_DIRECTORY = Object.freeze([
  { id: "1", name: "Barista" },
  { id: "2", name: "Pizza Hut" },
  { id: "3", name: "Burger King" },
  { id: "4", name: "Coffee Bean" },
  { id: "5", name: "Ex Tea" },
  { id: "6", name: "Palm Strip Bar & Restaurant" }
]);
```

### Authorization Rules:
1. **Catalog Alignment:** Restaurant 6 is explicitly mapped to `"Palm Strip Bar & Restaurant"` to match the frontend application catalog (`frontend/src/data/restaurants.ts`). Live database record consistency remains to be verified upon live deployment; no direct database migration was executed.
2. `getRestaurantNameById(id)` and `getRestaurantIdByName(name)` perform exact, bidirectional resolution.
3. `isUserInRestaurantScope(user, scope)`:
   - Validates user identity contract (non-empty string `id`, valid `role`).
   - Requires usable target information (`restaurantId` or `restaurantName`).
   - Rejects empty `{}` scopes, blank identifiers, unknown IDs/names, and contradictory scopes (e.g. ID `1` paired with `"Pizza Hut"`).
   - Authorizes `mainAdmin` across all valid target restaurants.
   - Restricts `admin` strictly to their assigned canonical restaurant ID.
   - Denies `customer` and unknown roles.

---

## 5. Summary of Code Changes

1. **[backend/utils/restaurantMapping.js](file:///d:/SSD-Assignment-Restaurant-App/backend/utils/restaurantMapping.js) [NEW]:**
   - Authoritative directory, exact bidirectional resolution, and strict `isUserInRestaurantScope` validation.
2. **[backend/middleware/authorization.js](file:///d:/SSD-Assignment-Restaurant-App/backend/middleware/authorization.js) [NEW]:**
   - `requireAuthenticatedUser`: Enforces presence and structure of verified `req.user` (401 on missing/malformed).
   - `requireRole(...allowedRoles)`: Enforces RBAC; rejects unauthorized roles (403) and unassigned admins (403).
   - `requireRestaurantScopeByName` & `requireRestaurantScopeById`: Verifies route parameters against assigned tenant scope.
3. **[backend/routes/restaurantOrderRoute.js](file:///d:/SSD-Assignment-Restaurant-App/backend/routes/restaurantOrderRoute.js) [MODIFIED]:**
   - Protected `/orders` with `requireRole('mainAdmin')`.
   - Protected `/orders/restaurant/:restaurantName` with `requireRole('admin', 'mainAdmin')` and `requireRestaurantScopeByName`.
   - Protected `/orders/:id` (PATCH generic update) with `requireRole('admin', 'mainAdmin')`.
   - Protected `/orders/status/:id` and `/orders/:id` (DELETE) with `requireRole('admin', 'mainAdmin')`.
   - Protected `/order-requests/restaurant/:restaurantName` and `/order-requests/:requestId` with scope guards.
   - Removed redundant `/order-requests/status/:requestId` route alias.
4. **[backend/routes/reservationRoute.js](file:///d:/SSD-Assignment-Restaurant-App/backend/routes/reservationRoute.js) [MODIFIED]:**
   - Protected `/restaurant/:restaurantId/reservations` and `/restaurant/:restaurantId/reservation-requests` with scope guards.
   - Protected `/reservations/:reservationId/modify` with `requireRole('admin', 'mainAdmin')`.
   - Protected `/reservations/:reservationId` (status updates) with `requireRole('admin', 'mainAdmin')`.
   - Protected `/reservation-requests/:requestId` with `requireRole('admin', 'mainAdmin')`.
   - Removed redundant `/reservation-requests/:id` route alias.
5. **[backend/controllers/restaurantOrderController.js](file:///d:/SSD-Assignment-Restaurant-App/backend/controllers/restaurantOrderController.js) [MODIFIED]:**
   - `updateorder`: Validates target existence and caller scope before update; rejects attempts to reassign `restaurantName` or `email` (400); preserves stored authoritative values.
   - `updateOrderStatus`: Enforces scope check before status validation; suppresses WhatsApp notifications on denied requests.
   - `deleteorder`: Verifies order scope before deletion.
6. **[backend/controllers/orderRequestController.js](file:///d:/SSD-Assignment-Restaurant-App/backend/controllers/orderRequestController.js) [MODIFIED]:**
   - `updateOrderRequestStatus`: Resolves parent order, verifies scope, and performs a concurrency-safe atomic state transition (`findOneAndUpdate({ _id, status: 'pending' })`) returning 409 on conflict. Reverted unrelated parent order item modifications to maintain separation with Member 3's pricing responsibilities.
7. **[backend/controllers/reservationRequestController.js](file:///d:/SSD-Assignment-Restaurant-App/backend/controllers/reservationRequestController.js) [MODIFIED]:**
   - `updateReservationRequestStatus`: Resolves parent reservation, verifies scope, and executes an atomic state transition returning 409 on conflict. Preserved original workflow: deletes parent on approved cancellation, and updates status to 'approved' on modification without altering date/time fields.
8. **[backend/controllers/reservationController.js](file:///d:/SSD-Assignment-Restaurant-App/backend/controllers/reservationController.js) [MODIFIED]:**
   - `modifyReservation`: Verifies target reservation existence and restaurant scope; rejects attempts to reassign restaurant or status; restricts mutations strictly to allowlisted fields (`date`, `time`, `partySize`, `customerPhone`, `customerName`).
   - `updateReservationStatus`: Verifies reservation restaurant scope before allowing status mutation or cancellation.
9. **[backend/app.js](file:///d:/SSD-Assignment-Restaurant-App/backend/app.js) [MODIFIED]:**
   - Consolidated duplicate inline reservation request routes into `reservationRoute.js`. Configured reliable DNS servers (`dns.setServers(['8.8.8.8', '1.1.1.1'])`) to stabilize MongoDB Atlas SRV connection strings. Logged only active database name without leaking credentials. Preserved Member 1 database configuration.
10. **[backend/package.json](file:///d:/SSD-Assignment-Restaurant-App/backend/package.json) [MODIFIED]:**
    - Added `"test": "node --test tests/v03-authorization.test.js"`.

---

## 6. Automated Regression Test Suite

A custom 20-scenario regression test suite was authored in [backend/tests/v03-authorization.test.js](file:///d:/SSD-Assignment-Restaurant-App/backend/tests/v03-authorization.test.js) utilizing Node.js's native test runner (`node --test`). Persistence collections and notification services are isolated and mocked without remote database connections.

### Test Execution Command:
```bash
cd backend
npm test
```

### Test Suite Results:
```text
> backend@1.0.0 test
> node --test tests/v03-authorization.test.js

TAP version 13
ok 1 - 1. Anonymous admin-operation request returns 401 Unauthorized
ok 2 - 2. Customer role attempting admin operation returns 403 Forbidden
ok 3 - 3. Unknown or malformed role returns 403 Forbidden
ok 4 - 4. Restaurant admin without assigned restaurantId returns 403 Forbidden
ok 5 - 5. Admin A successfully reads Restaurant A orders list and database filter is asserted
ok 6 - 6. Admin A attempting to read Restaurant B list returns 403 Forbidden
ok 7 - 7. Admin A successfully updates order within Restaurant A scope
ok 8 - 8. Admin A attempting to update Restaurant B order returns 403 and causes no mutation
ok 9 - 9. Admin A successfully approves Restaurant A order request
ok 10 - 10. Admin A attempting to approve Restaurant B order request returns 403
ok 11 - 11. Reservation listing: Admin A reads own restaurant (200), denied on other (403)
ok 12 - 12. Reservation requests: Admin A approves own restaurant (200), denied on other (403)
ok 13 - 13. mainAdmin succeeds across restaurants on administrative operations
ok 14 - 14. Client parameters in body/query claiming mainAdmin or different restaurantId are ignored
ok 15 - 15. Order request with nonexistent parent order returns 404 with zero mutations
ok 16 - 16. Generic order update (PATCH /orders/:id) enforces authorization and prevents restaurant reassignment
ok 17 - 17. Generic reservation modify (PATCH /reservations/:id/modify) enforces RBAC, scope, and allowlist
ok 18 - 18. isUserInRestaurantScope strictly rejects missing, malformed, and contradictory target scopes
ok 19 - 19. Restaurant 6 authoritative mapping matches application catalog ("Palm Strip Bar & Restaurant")
ok 20 - 20. Concurrency-safe atomic decision transition returns 409 on race, and denied requests dispatch zero notifications
1..20
# tests 20
# suites 0
# pass 20
# fail 0
# duration_ms 853.8398
```

---

## 7. Limitations & Remaining Dependencies

1. **Pending Upstream Authentication Integration:**
   - Because live backend authentication (OAuth/OIDC / JWT verification) is owned by Member 1 and not yet merged into `backend/app.js`, all protected admin endpoints currently return `401 Unauthorized` for external requests unless an upstream middleware populates `req.user`. This fail-closed state prevents unauthorized access, but admin UI operations in the browser will remain unavailable until Member 1 completes integration.
2. **Temporary Customer Modification Restriction:**
   - To prevent unauthorized status alterations, direct reservation modification via `PATCH /api/reservations/:reservationId/modify` and generic order updates via `PATCH /restaurant/orders/:id` now require administrator roles (`admin`, `mainAdmin`). Until customer ownership is implemented in V04, direct anonymous or customer mutations on these paths are rejected with `401` or `403`. Customer change workflows are temporarily restricted to submitting formal requests via `/api/reservation-requests` and `/restaurant/order-requests`.
3. **Database Consistency & Concurrency Limitations:**
   - The atomic decision logic enforces conditional updates on request documents (`findOneAndUpdate({ _id, status: 'pending' })`), returning `409 Conflict` if a request is settled concurrently. However, subsequent parent record mutations (e.g. deleting a parent reservation) are performed sequentially without multi-document ACID transactions, meaning partial failures could occur if the database drops mid-operation.
4. **V04 Scope (Separate Task):**
   - Customer object retrieval endpoints (`GET /orders/:id`, `GET /orders/email/:email`, `GET /reservations/:reservationId`, `GET /reservations?userEmail=...`) remain to be secured under V04 (Customer Object Ownership / IDOR / BOLA).

---

## 8. Code Locations for AFTER Screenshots

For report and presentation evidence, capture the following exact locations:

| Screenshot ID | File | Line Range | Demonstrates |
| :--- | :--- | :--- | :--- |
| **AFTER-V03-01** | `backend/middleware/authorization.js` | Lines 25–85 | `isValidIdentity`, `requireAuthenticatedUser` (401), and `requireRole` (403) guards |
| **AFTER-V03-02** | `backend/utils/restaurantMapping.js` | Lines 8–75 | Authoritative directory (including Restaurant 6) and strict `isUserInRestaurantScope` logic |
| **AFTER-V03-03** | `backend/routes/restaurantOrderRoute.js` | Lines 22–45 | Role and scope middleware mounted on `/orders`, `/orders/restaurant/:name`, `/orders/:id`, `/orders/status/:id` |
| **AFTER-V03-04** | `backend/controllers/restaurantOrderController.js` | Lines 125–185 | `updateorder` enforcing scope, preventing restaurant reassignment, and preserving stored values |
| **AFTER-V03-05** | `backend/controllers/orderRequestController.js` | Lines 60–105 | `updateOrderRequestStatus` resolving parent order scope and atomic `findOneAndUpdate` |
| **AFTER-V03-06** | `backend/controllers/reservationController.js` | Lines 85–140 | `modifyReservation` checking restaurant scope, disallowing status/restaurant tampering, and using allowlist |

---

## 9. Future OWASP ZAP Verification Checklist (Post-Integration)

Once Member 1's authentication middleware issues verified tokens:
- [ ] **Test ZAP-1:** Send unauthenticated `PATCH /restaurant/orders/status/<id>` $\rightarrow$ verify response is `401 Unauthorized`.
- [ ] **Test ZAP-2:** Send `PATCH /restaurant/orders/status/<id>` with Customer token $\rightarrow$ verify response is `403 Forbidden`.
- [ ] **Test ZAP-3:** Send `PATCH /restaurant/orders/status/<order_of_restaurant_2>` with Admin 1 (Barista) token $\rightarrow$ verify response is `403 Forbidden`.
- [ ] **Test ZAP-4:** Send `PATCH /restaurant/orders/status/<order_of_restaurant_1>` with Admin 1 (Barista) token $\rightarrow$ verify response is `200 OK` and status is updated.
- [ ] **Test ZAP-5:** Send `PATCH /restaurant/orders/<id>` attempting to change `restaurantName` to another restaurant $\rightarrow$ verify response is `400 Bad Request`.
- [ ] **Test ZAP-6:** Send `GET /restaurant/orders` with Admin 1 token $\rightarrow$ verify `403 Forbidden`; send with `mainAdmin` token $\rightarrow$ verify `200 OK`.
