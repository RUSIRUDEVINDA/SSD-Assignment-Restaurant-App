# Member 3: V06 Implementation Document – Price & Business-Logic Tampering

**Course:** SE4030 Secure Software Development  
**Assignment Component:** Member 3 – API & Business Logic  
**Vulnerability Addressed:** V06: Price / Business-Logic Tampering via Intercepted Order Requests  
**CWE Classification:** CWE-472 (Impurchasable / Tampered Values), CWE-602 (Client-Side Enforcement of Server-Side Security), CWE-840 (Business Logic Errors)  
**OWASP Classification:** OWASP Top 10:2021 – A04: Insecure Design  
**CVSS v3.1 Base Score:** 8.6 (High) — `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N`

---

## 1. Vulnerability Root Cause (Pre-Fix Baseline)

In the baseline application prior to remediation:
1. **Unchecked Total Extraction:** The `addOrders` handler in `backend/controllers/restaurantOrderController.js` extracted `totalAmount` directly from the untrusted JSON request body (`req.body.totalAmount`). If present, the database persisted this value without cross-referencing catalog prices.
2. **Client-Dictated Unit Prices:** If `totalAmount` was omitted, the controller calculated the order total by multiplying `item.price * item.quantity` using `item.price` values supplied by the browser (`req.body.itemsPurchased`).
3. **Missing Quantity Constraints:** No server-side boundary validation was enforced on `item.quantity`. Malicious requests could submit negative numbers, zeros, floating-point numbers, or excessive quantities.
4. **Cross-Tenant Item Injection:** An attacker could order an item belonging to Restaurant A while targeting Restaurant B, corrupting operational menu boundaries.
5. **Tamperable Order Modifications:** The administrative `updateorder` handler (`PATCH /restaurant/orders/:id`) accepted client-supplied `totalAmount` without authoritative recalculation.

---

## 2. Secure Design & Threat Model (STRIDE)

Under **STRIDE Threat Modeling**, this flaw represents a classic **Tampering (T)** vulnerability at the client-to-server trust boundary.

```text
Untrusted Client (Browser / ZAP Proxy)
                 │
                 │ JSON payload: { restaurantName: "Palm Strip...", itemsPurchased: [...] }
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ TRUST BOUNDARY                                              │
├─────────────────────────────────────────────────────────────┤
│ 1. Zero Client Trust:                                       │
│    Any client-supplied 'price' or 'totalAmount' is          │
│    completely ignored and discarded.                        │
│                                                             │
│ 2. Authoritative Catalog Verification:                      │
│    Server resolves canonical restaurant ID and fetches      │
│    authoritative prices from backend/utils/menuCatalog.js.  │
│                                                             │
│ 3. Boundary & Type Validation:                              │
│    Quantity must be an integer: 1 <= quantity <= 50.        │
│    Item must exist in the target restaurant's catalog.      │
│                                                             │
│ 4. Server-Side Financial Computation:                       │
│    lineTotal = authoritativePrice * quantity                 │
│    totalAmount = sum(lineTotals)                            │
└─────────────────────────────────────────────────────────────┘
                 │
                 ▼
     MongoDB (Authoritative Record)
```

---

## 3. Authoritative Pricing Engine & Catalog (`backend/utils/menuCatalog.js`)

To eliminate client trust, [`backend/utils/menuCatalog.js`](../../backend/utils/menuCatalog.js) establishes an authoritative, server-owned menu catalog mapped to canonical restaurant identifiers ("1" through "6").

### Pricing Function Contract:
```javascript
function validateAndPriceOrderItems(restaurantName, itemsPurchased)
```

### Enforced Rules:
1. **Restaurant Name Resolution:** Resolves canonical restaurant name and ID using [`backend/utils/restaurantMapping.js`](../../backend/utils/restaurantMapping.js). Rejects unknown restaurants with HTTP `400 Bad Request`.
2. **Catalog Verification:** Validates that every requested item exists in that specific restaurant's catalog. Rejects cross-restaurant item injection with HTTP `400 Bad Request`.
3. **Quantity Bounds:** Rejects negative, zero, float, or excessive quantities ($quantity \notin [1, 50]$) with HTTP `400 Bad Request`.
4. **Price Substitution:** Discards client-submitted prices and applies the fixed server catalog price.
5. **Total Calculation:** Computes `totalAmount` with 2-decimal floating point precision.

---

## 4. Code Changes Summary

| File | Change Type | Security Description |
| :--- | :--- | :--- |
| `backend/utils/menuCatalog.js` | **NEW** | Authoritative menu catalog and `validateAndPriceOrderItems` calculation engine. |
| `backend/controllers/restaurantOrderController.js` | **MODIFIED** | Updated `addOrders` and `updateorder` to enforce server-side pricing and discard client `totalAmount`. |
| `frontend/src/pages/Cart.tsx` | **MODIFIED** | Display authoritative server validation error messages via toast when order validation fails. |
| `semgrep-rules/v06-price-tampering.yml` | **NEW** | Custom Semgrep SAST rule detecting unvalidated client `totalAmount` assignment. |
| `backend/tests/v06-price-tampering.test.js` | **NEW** | Comprehensive unit and integration regression test suite (12 test cases). |

---

## 5. White-Box Static Analysis (Semgrep SAST)

A custom rule was created in [`semgrep-rules/v06-price-tampering.yml`](../../semgrep-rules/v06-price-tampering.yml):

```yaml
rules:
  - id: v06-untrusted-client-price-assignment
    message: >
      Directly extracting or trusting 'totalAmount' from req.body enables client-side
      price tampering (OWASP Top 10:2021 A04: Insecure Design, CWE-472). Order totals and item
      prices must be computed authoritatively on the server against a trusted catalog.
    severity: ERROR
    languages:
      - javascript
    patterns:
      - pattern-either:
          - pattern: |
              const { ..., totalAmount, ... } = req.body
          - pattern: |
              let { ..., totalAmount, ... } = req.body
          - pattern: |
              $X = req.body.totalAmount
```

### Static Analysis Results:
- **Baseline Code:** Flagged lines 26 and 124 of `backend/controllers/restaurantOrderController.js` where `totalAmount` was extracted directly from `req.body`.
- **Remediated Code:** Zero findings. `totalAmount` is computed solely by `validateAndPriceOrderItems()`.

---

## 6. Black-Box Dynamic Verification (OWASP ZAP PoC)

### 6.1 Vulnerable Baseline Exploitation
1. Set up OWASP ZAP as an intercepting HTTP proxy on port `8080`.
2. Initiated an order for **Filet Mignon** ($32.95) and **Crème Brûlée** ($9.95) at Palm Strip Bar & Restaurant.
3. Enabled ZAP Break on Requests and modified the payload:
   ```json
   {
     "restaurantName": "Palm Strip Bar & Restaurant",
     "itemsPurchased": [{ "name": "Filet Mignon", "price": 0.01, "quantity": 1 }],
     "totalAmount": 0.01,
     "fullName": "Attacker",
     "phoneNumber": "+94771234567",
     "pickupTime": "19:30"
   }
   ```
4. **Baseline Result:** Server returned HTTP `201 Created` with `"totalAmount": 0.01`. The transaction was stored in MongoDB for 1 cent.

### 6.2 Remediated System Defense
1. Re-sent the exact same tampered payload through OWASP ZAP Manual Request Editor.
2. **Remediated Result:** The server discarded `"totalAmount": 0.01` and `"price": 0.01`, looked up Filet Mignon in the authoritative catalog ($32.95), and returned:
   ```json
   {
     "restaurantName": "Palm Strip Bar & Restaurant",
     "itemsPurchased": [{ "name": "Filet Mignon", "price": 32.95, "quantity": 1 }],
     "totalAmount": 32.95,
     "status": "Pending"
   }
   ```
3. When sending `"quantity": -3`, the server returned HTTP `400 Bad Request`:
   ```json
   {
     "error": "Bad Request",
     "message": "Invalid quantity for item \"Filet Mignon\". Quantity must be an integer between 1 and 50."
   }
   ```

---

## 7. Automated Test Suite (`backend/tests/v06-price-tampering.test.js`)

All test cases execute via `npm test` without remote database dependencies:

```text
✔ UNIT: validateAndPriceOrderItems accurately calculates total from catalog
✔ UNIT: validateAndPriceOrderItems completely discards client-tampered price
✔ UNIT: validateAndPriceOrderItems rejects negative quantity
✔ UNIT: validateAndPriceOrderItems rejects zero quantity
✔ UNIT: validateAndPriceOrderItems rejects non-integer/float quantity
✔ UNIT: validateAndPriceOrderItems rejects item not belonging to the restaurant
✔ UNIT: validateAndPriceOrderItems rejects empty item list
✔ UNIT: validateAndPriceOrderItems rejects unknown restaurant name
✔ INTEGRATION: POST /restaurant/orders overrides client totalAmount and item price tampering
✔ INTEGRATION: POST /restaurant/orders rejects negative quantity with 400 Bad Request
✔ INTEGRATION: POST /restaurant/orders rejects cross-tenant/unauthorized item with 400 Bad Request
✔ INTEGRATION: PATCH /restaurant/orders/:id authoritatively recalculates total on order modification
```

---

## 8. Software Engineering Best Practices & Prevention

1. **Zero-Trust Client Boundary:** In client-server architectures, web browsers, mobile apps, and API clients must always be treated as untrusted runtime environments. Business rules and financial totals must never be computed or trusted on the client side.
2. **Schema Enforcement & Input Validation:** Strict type and range validation (e.g. positive integer boundaries for quantities) must be enforced at the API controller boundary before any business logic executes.
3. **Threat Modeling during Design (STRIDE):** Identifying tampering risks on data-flow boundaries during sprint planning prevents insecure design flaws from entering production code.
4. **Automated SAST & CI/CD Guardrails:** Embedding Semgrep custom rules into CI/CD pipelines ensures any regression re-introducing client-trusted pricing parameters is caught before merge.
