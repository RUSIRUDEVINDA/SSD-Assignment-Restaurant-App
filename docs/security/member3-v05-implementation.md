# Member 3: V05 Implementation Document – Mass Assignment / Over-Posting

**Course:** SE4030 Secure Software Development  
**Assignment Component:** Member 3 – API & Business Logic  
**Vulnerability Addressed:** V05: Mass Assignment / Over-Posting via Unvalidated Object Updates  
**CWE Classification:** CWE-915 (Improperly Controlled Modification of Dynamically-Determined Object Attributes)  
**OWASP Classification:** OWASP API Security Top 10:2023 – API3: Broken Object Property Level Authorization  
**CVSS v3.1 Base Score:** 8.1 (High) — `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H`

---

## 1. Vulnerability Root Cause (Pre-Fix Baseline)

In the baseline application prior to remediation:
1. **Unbounded Object Binding:** In `backend/controllers/reservationController.js` and `backend/controllers/restaurantOrderController.js`, resource modification endpoints accepted raw client request bodies (`req.body`) and applied them without an authoritative Data Transfer Object (DTO) allowlist contract.
2. **Status Escalation:** Attackers could inject `status: "confirmed"` or `status: "completed"` into modification payloads, bypassing manager approval workflows and administrative verification.
3. **Tenant Boundary Violation:** Malicious actors could supply `restaurantId` or `restaurantName` to reassign records across different restaurant tenants.
4. **Arbitrary Schema Pollution:** Unfiltered inputs permitted arbitrary properties (such as `isAdminReservation: true` or `isAdminOrder: true`) to be persisted into MongoDB collections.

---

## 2. Secure Design & Threat Model (STRIDE)

Under **STRIDE Threat Modeling**, this vulnerability violates **Tampering (T)** and leads to **Elevation of Privilege (E)** at the API parameter boundary.

```text
Untrusted Client (Browser / OWASP ZAP)
                 │
                 │ PATCH /api/reservations/:id/modify
                 │ Injected Payload: { "time": "21:00", "partySize": 4, "status": "confirmed", "restaurantId": "999", "isAdminReservation": true }
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ TRUST BOUNDARY: DTO Allowlist Engine                        │
│ (backend/utils/validationSchemas.js)                        │
├─────────────────────────────────────────────────────────────┤
│ 1. Prohibited Property Inspection:                          │
│    Detects attempts to mutate protected fields:              │
│    - status                                                 │
│    - restaurantId / restaurantName                          │
│    - customerEmail / email                                  │
│    - isAdminReservation / arbitrary attributes              │
│    -> Immediately rejects with HTTP 400 Bad Request!        │
│                                                             │
│ 2. Isolated Allowlist Extraction:                           │
│    Extracts ONLY approved editable fields:                  │
│    - date, time, partySize, customerPhone, customerName     │
│                                                             │
│ 3. Server-Controlled Metadata:                              │
│    Enforces status = 'modified' and updatedAt = now()       │
└─────────────────────────────────────────────────────────────┘
                 │
                 ▼
   MongoDB (Protected Authoritative Record)
```

---

## 3. DTO Allowlist Specification (`backend/utils/validationSchemas.js`)

[`backend/utils/validationSchemas.js`](../../backend/utils/validationSchemas.js) provides strict input filtering:

### Reservation Modification Contract:
```javascript
const ALLOWED_RESERVATION_FIELDS = ['date', 'time', 'partySize', 'customerPhone', 'customerName'];
const PROTECTED_RESERVATION_FIELDS = ['_id', 'id', 'restaurantId', 'restaurantName', 'status', 'customerEmail', 'email', 'isAdminReservation', 'createdAt', 'updatedAt'];
```

### Order Modification Contract:
```javascript
const ALLOWED_ORDER_FIELDS = ['fullName', 'phoneNumber', 'pickupTime', 'itemsPurchased', 'totalAmount', 'restaurantName', 'email'];
const STRICTLY_FORBIDDEN_ORDER_FIELDS = ['_id', 'id', 'status', 'isAdminOrder', 'createdAt', 'modifiedAt'];
```

---

## 4. Code Changes Summary

| File | Change Type | Security Description |
| :--- | :--- | :--- |
| `backend/utils/validationSchemas.js` | **NEW** | DTO allowlists and validation engines for reservation and order mutations. |
| `backend/controllers/reservationController.js` | **MODIFIED** | Enforces `validateReservationModificationDto` in `modifyReservation`. |
| `backend/controllers/restaurantOrderController.js` | **MODIFIED** | Enforces `validateOrderModificationDto` in `updateorder`. |
| `semgrep-rules/v05-mass-assignment.yml` | **NEW** | Custom Semgrep SAST rule detecting direct `req.body` assignment in database updates. |
| `backend/tests/v05-mass-assignment.test.js` | **NEW** | Automated regression test suite (11 unit and integration test cases). |

---

## 5. White-Box Static Analysis (Semgrep SAST)

Custom rule in [`semgrep-rules/v05-mass-assignment.yml`](../../semgrep-rules/v05-mass-assignment.yml):

```yaml
rules:
  - id: v05-mass-assignment-unvalidated-body-update
    message: >
      Passing 'req.body' directly into database update operations (findByIdAndUpdate,
      updateOne, update) without an explicit DTO allowlist schema enables Mass Assignment /
      Over-Posting (OWASP API3: Broken Object Property Level Authorization, CWE-915).
    severity: ERROR
    languages:
      - javascript
    patterns:
      - pattern-either:
          - pattern: $MODEL.findByIdAndUpdate($ID, req.body, ...)
          - pattern: $MODEL.updateOne($QUERY, req.body, ...)
          - pattern: $MODEL.updateMany($QUERY, req.body, ...)
          - pattern: Object.assign($DOC, req.body)
```

---

## 6. Black-Box Dynamic Verification (OWASP ZAP PoC)

### 6.1 Vulnerable Baseline Exploitation
1. Dispatched an over-posting payload via OWASP ZAP Manual Request Editor:
   ```http
   PATCH http://localhost:5000/api/reservations/673f41a8.../modify HTTP/1.1
   Content-Type: application/json

   {
     "time": "21:00",
     "partySize": 4,
     "status": "confirmed",
     "restaurantId": "HACKED_RESTAURANT_999",
     "isAdminReservation": true
   }
   ```
2. **Baseline Result:** Server returned HTTP `200 OK` and updated the document with `restaurantId: "HACKED_RESTAURANT_999"` and `status: "confirmed"`.

### 6.2 Remediated System Defense
1. Sent the same payload to the hardened endpoint.
2. **Remediated Result:** The server immediately returned HTTP `400 Bad Request`:
   ```json
   {
     "error": "Bad Request",
     "message": "Modifying protected property 'status' is not permitted"
   }
   ```
3. A legitimate update containing only allowlisted fields:
   ```json
   {
     "time": "21:00",
     "partySize": 4,
     "customerName": "Johnathan Doe"
   }
   ```
   Returned HTTP `200 OK` with `status: "modified"`, leaving all tenant and ownership fields untouched.

---

## 7. Automated Test Suite (`backend/tests/v05-mass-assignment.test.js`)

All 11 unit and integration test cases execute cleanly in `npm test`:

```text
✔ UNIT: validateReservationModificationDto rejects over-posted status
✔ UNIT: validateReservationModificationDto rejects over-posted restaurantId
✔ UNIT: validateReservationModificationDto rejects over-posted customerEmail
✔ UNIT: validateReservationModificationDto rejects arbitrary injected attribute (isAdminReservation)
✔ UNIT: validateReservationModificationDto rejects invalid partySize bounds
✔ UNIT: validateReservationModificationDto constructs clean DTO with allowlisted fields
✔ UNIT: validateOrderModificationDto rejects over-posted status in orders
✔ UNIT: validateOrderModificationDto rejects over-posted arbitrary attribute
✔ INTEGRATION: PATCH /api/reservations/:id/modify rejects over-posted status with 400
✔ INTEGRATION: PATCH /api/reservations/:id/modify permits allowlisted updates and updates status to modified
✔ INTEGRATION: PATCH /restaurant/orders/:id rejects over-posted status with 400
```

---

## 8. Software Engineering Best Practices & Prevention

1. **DTO (Data Transfer Object) Pattern:** Never expose persistence entities directly to API consumers. Decouple incoming transport objects from database models using strict DTO definitions.
2. **Allowlist Over Denylist:** Always define positive allowlists of permissible fields rather than attempting to enumerate and block blacklisted keys.
3. **Immutability of System Attributes:** Sensitive state (roles, tenant IDs, timestamps, status flags) should only be modifiable through dedicated, role-gated administrative workflows.
