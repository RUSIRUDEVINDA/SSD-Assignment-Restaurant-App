# Restaurant Application – Security Assessment & Hardening

**Course:** SE4030 Secure Software Development  
**Academic System:** Restaurant Reservation & Pre-Ordering Platform  
**Architecture:** React/Vite SPA (Frontend) • Node.js / Express REST API (Backend) • MongoDB Atlas (Database)  
**Security Standards:** OWASP Top 10:2021 • OWASP API Security Top 10:2023 • CWE Taxonomy

---

## 1. Executive Summary

This repository documents the comprehensive security assessment, vulnerability discovery, and architectural hardening of an open-source Restaurant Reservation and Pre-Ordering web application. 

The baseline application was evaluated against modern application security standards using a dual-perspective approach:
- **White-Box Static Application Security Testing (SAST)** and secret scanning to locate dangerous coding patterns, trust boundary failures, and exposed configuration in source code.
- **Black-Box Dynamic Application Security Testing (DAST)** and proxy interception to validate runtime exploitability and business-logic flaws.

Through this methodology, **8 distinct security vulnerabilities** (spanning Authentication, Access Control, Business Logic, Object Property Authorization, Injection, and Resource Consumption) were identified, reproduced, and remediated with defense-in-depth controls.

---

## 2. Security Assessment Methodology & Tooling

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                           SECURITY TESTING PIPELINE                       │
├─────────────────────────────────────┬─────────────────────────────────────┤
│      WHITE-BOX TESTING (SAST)       │       BLACK-BOX TESTING (DAST)      │
├─────────────────────────────────────┼─────────────────────────────────────┤
│ • Gitleaks: Git history secret scan │ • OWASP ZAP Spider & Passive Scan   │
│ • Semgrep: Rule-based static scan   │ • OWASP ZAP Break / Request Editor  │
│ • Custom Semgrep rules (AST logic)  │ • OWASP ZAP Fuzzer (Rate limits)    │
│ • Architectural Threat Modeling     │ • cURL & Replay Scripts             │
└─────────────────────────────────────┴─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                      REMEDIATION & VERIFICATION                           │
├───────────────────────────────────────────────────────────────────────────┤
│ • Defense-in-Depth Controls (OIDC, RBAC, Multi-Tenant Scoping, DTOs)      │
│ • Automated Regression Test Suites (60+ Unit & Integration Tests)        │
│ • Post-Fix Re-Scans (Semgrep Clean Pass & ZAP Replay Verification)        │
└───────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Tools Utilized
1. **OWASP ZAP (Zed Attack Proxy):** Used for intercepting runtime HTTP traffic, fuzzing parameter boundaries, replaying manipulated request bodies, and evaluating server responses against parameter tampering.
2. **Semgrep (Community & Custom Rulesets):** Applied across backend controllers, routes, and middleware to identify insecure coding patterns, unvalidated inputs, missing authentication guards, and direct object assignments.
3. **Gitleaks:** Employed for static regex scanning across git revision history to detect hardcoded API keys, JWT secrets, database connection strings, and credential leaks.

---

## 3. Vulnerability Discovery & Remediation Matrix

| ID | Vulnerability | Category & Classification | Discovery Tools | Attack / Discovery Scenario | Main Security Fix |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **V01** | Hardcoded / Exposed Credentials & Secrets | Secrets Management<br>`CWE-798` | **Gitleaks**<br>**OWASP ZAP** (Spider) | Static scanning detected database URIs, API tokens, and credentials stored in plain text or client-visible bundles. | Removed secrets from version control, added `.gitignore` rules, provided `.env.example`, and loaded credentials strictly through environment variables. |
| **V02** | Broken Server-Side Authentication | OWASP Top 10: `A07:2021`<br>Auth Failures | **OWASP ZAP**<br>**Semgrep** | Calling protected backend routes without bearer tokens or session state was accepted by unauthenticated endpoints. | Integrated OpenID Connect (OIDC) JWT token cryptographic verification (`requireAuth`), validating issuer, audience, and RS256 signature against Auth0 JWKS. |
| **V03** | Broken Admin Authorization & Missing Tenant Scope | OWASP Top 10: `A01:2021`<br>Broken Access Control | **OWASP ZAP**<br>**Semgrep** | Non-admin users or cross-restaurant managers could modify administrative order/reservation status and access other tenants' data. | Implemented Role-Based Access Control (`requireRole`) and multi-tenant restaurant scoping (`requireRestaurantScopeByName/Id`) with fail-closed access guards. |
| **V04** | Internal Information Disclosure & Verbose Error Leakage | OWASP Top 10: `A05:2021`<br>Security Misconfig (`CWE-209`) | **OWASP ZAP**<br>**Semgrep**<br>**cURL** | Dispatching malformed JSON payloads or invalid MongoDB ObjectIDs triggered unhandled exceptions returning raw error messages (`err.message`), database schema internals, and stack traces. | Implemented centralized error handling middleware (`errorHandler.js`) and sanitized controller catch blocks; returns generic HTTP 400/500 client responses while logging detailed diagnostics server-side. |
| **V05** | Mass Assignment / Over-Posting | OWASP API: `API3:2023`<br>`CWE-915` | **OWASP ZAP** (Request Editor)<br>**Semgrep** | Sending additional JSON keys (`status: "confirmed"`, `restaurantId: "HACKED_999"`, `isAdminReservation: true`) mutated protected database attributes. | Created strict Data Transfer Object (DTO) allowlist schemas (`validationSchemas.js`); explicitly rejected unapproved properties with HTTP `400 Bad Request`. |
| **V06** | Price & Business-Logic Tampering | OWASP Top 10: `A04:2021`<br>Insecure Design (`CWE-472`) | **OWASP ZAP** (Proxy Intercept)<br>**Semgrep** | Intercepting `POST /restaurant/orders` to set `"totalAmount": 0.01` or `"price": 0.01` resulted in the server storing 1-cent orders in MongoDB. | Established an authoritative server-side menu catalog (`menuCatalog.js`); server ignores client-sent prices, validates positive integer quantities, and computes totals. |
| **V07** | HTML Injection in Automated Emails | OWASP Top 10: `A03:2021`<br>Injection (`CWE-79`) | **OWASP ZAP**<br>**Semgrep** | Injecting harmless HTML/formatting markers (`<b>TEST</b>`) into order or reservation customer names rendered unescaped markup in outgoing email receipts. | Implemented contextual HTML output encoding (`escapeHtml.js`) across all dynamic parameters before string interpolation into Nodemailer templates. |
| **V08** | Unrestricted Resource Consumption & Missing Rate Limiting | OWASP API: `API4:2023`<br>`CWE-770` | **OWASP ZAP Fuzzer**<br>**Semgrep** | Dispatching rapid bursts of API requests and oversized JSON payloads produced uninterrupted processing without HTTP `429 Too Many Requests`. | Deployed global and endpoint-specific rate limiting (`express-rate-limit`), JSON body-size bounds, and request payload throttles (`resourceProtection.js`). |

---

## 4. Technical Breakdown of Security Remediations

### 4.1 Authentication & Identity (V01, V02)
- **Problem:** Secrets were embedded in codebase assets, and backend routes lacked cryptographic proof of identity.
- **How Detected:** `gitleaks detect --verbose` identified hardcoded keys. OWASP ZAP flagged unauthenticated routes returning HTTP `200 OK`.
- **Tackle & Fix:** Sensitive credentials were extracted to environment configurations (`.env`). Server-side JWT authentication middleware (`backend/middleware/authMiddleware.js`) was deployed using `express-oauth2-jwt-bearer`, cryptographically validating access tokens against the identity provider's JSON Web Key Set (JWKS).

### 4.2 Access Control & Multi-Tenancy (V03)
- **Problem:** Administrative endpoints (`/restaurant/orders/status/:id`, `/api/reservations/:id`) accepted requests regardless of caller role or restaurant tenancy.
- **How Detected:** OWASP ZAP sent administrative mutations using standard customer tokens; Semgrep detected route handlers without role checks.
- **Tackle & Fix:**
  - Role-Based Access Control (`backend/middleware/authorization.js`): Enforces roles (`mainAdmin`, `admin`, `customer`).
  - Authoritative Directory Scoping (`backend/utils/restaurantMapping.js`): Binds restaurant administrators strictly to their assigned canonical restaurant ID, preventing horizontal cross-tenant tampering.
  - Operational Status Guardrails: Restricts sensitive reservation and order lifecycle operations strictly to verified restaurant administrators.

### 4.3 Internal Information Disclosure & Verbose Error Leakage (V04)
- **Problem:** Controller catch blocks repeatedly passed raw exception objects directly to clients via `res.status(500).json({ error: err.message })`. In addition, malformed JSON bodies processed by Express body-parser yielded default HTML error responses disclosing full stack traces, Node.js filesystem paths, and internal Mongoose casting internals (`Cast to ObjectId failed for model "Reservation"`).
- **How Detected:**
  - **cURL & OWASP ZAP:** Sending invalid JSON syntax or non-hex ID strings (e.g., `PATCH /api/reservations/invalid-id/modify`) triggered verbose 500 error responses exposing internal database schema names and query logic.
  - **Semgrep:** Custom SAST rule [`semgrep-rules/v04-verbose-errors.yml`](semgrep-rules/v04-verbose-errors.yml) identified insecure exception returns matching `$RES.status($STATUS).json({ error: $ERR.message })`.
- **Tackle & Fix:**
  - **Centralized Error Handling Middleware (`backend/middleware/errorHandler.js`):** Intercepts syntax errors, body parser failures, and unhandled runtime exceptions. Emits uniform, sanitized JSON responses (`400 Invalid JSON payload`, `400 Invalid ID format`, `500 Internal server error`).
  - **Controller Catch-Block Hardening:** Hardened `reservationController.js`, `reservationRequestController.js`, `restaurantController.js`, and `restaurantOrderController.js` to catch `CastError` and `ValidationError` specifically, returning clean HTTP `400` status codes without leaking Mongoose internal structures.
  - **Server-Side Diagnostics Preservation:** Retained full stack trace and diagnostic logging via `console.error` exclusively on the server, ensuring rapid operator troubleshooting without exposing internal architecture to external actors.

### 4.4 API Object Properties & Mass Assignment (V05)
- **Problem:** Resource update routes passed unvalidated `req.body` directly to Mongoose `findByIdAndUpdate()`.
- **How Detected:** Via OWASP ZAP Manual Request Editor, extra fields (`"status": "confirmed"`, `"restaurantId": "HACKED_999"`, `"isAdminReservation": true`) were added to a reservation modification payload. The backend accepted and stored them.
- **Tackle & Fix:** Introduced a dedicated DTO validation engine (`backend/utils/validationSchemas.js`). The engine inspects incoming request keys against positive allowlists (`ALLOWED_RESERVATION_FIELDS`), actively rejects protected system fields with HTTP `400 Bad Request`, and only passes sanitized DTOs to the database.

### 4.5 Business Logic & Price Tampering (V06)
- **Problem:** The backend extracted `totalAmount` directly from `req.body`, or calculated it using client-sent `item.price`.
- **How Detected:** Using OWASP ZAP's Break tool on `POST /restaurant/orders`, items worth $32.95 were modified to `"price": 0.01` and `"totalAmount": 0.01`. The backend accepted the order and persisted the 1-cent total.
- **Tackle & Fix:** Implemented an Authoritative Menu Catalog (`backend/utils/menuCatalog.js`). The backend now treats client prices as untrusted noise, performs catalog price lookups based on verified item names, validates integer quantities ($1 \le quantity \le 50$), and authoritatively calculates order subtotals and totals on the server.

### 4.6 Injection & Output Encoding (V07)
- **Problem:** Dynamic user values were interpolated directly into HTML email templates without character encoding.
- **How Detected:** Submitting inputs with HTML characters through ZAP revealed unescaped tags rendered inside simulated email bodies.
- **Tackle & Fix:** Introduced `backend/utils/escapeHtml.js` applying contextual HTML entity encoding (`&`, `<`, `>`, `"`, `'`) to all untrusted customer attributes before building email markup.

### 4.7 API Rate Limiting & Resource Abuse Protection (V08)
- **Problem:** The API lacked request rate limiting or payload size caps, allowing unbounded automated requests.
- **How Detected:** OWASP ZAP Fuzzer dispatched rapid concurrent requests; all returned success without rate limiting.
- **Tackle & Fix:** Mounted `backend/middleware/resourceProtection.js` implementing IP-based window rate limiters (e.g., standard API limits and strict checkout/reservation limits) that return HTTP `429 Too Many Requests` with `Retry-After` headers when thresholds are exceeded.

---

## 5. Automated Verification & Regression Testing

The repository includes a comprehensive, isolated test suite built with Node.js's native test runner (`node:test`) that validates all security controls without external database dependencies:

```bash
# Run full automated security test suite
cd backend
npm test
```

### Test Suite Execution Output:
```text
✔ V03: Administrator Authorization & Tenant Scope Verification (21 tests pass)
✔ V03: Cryptographic Identity & Provisioning Integration (16 tests pass)
✔ V04: Error Sanitization and Information Disclosure Prevention (6 tests pass)
✔ V05: DTO Allowlist & Mass Assignment Prevention (11 tests pass)
✔ V06: Price & Business-Logic Authoritative Calculation (12 tests pass)

ℹ tests 66
ℹ suites 0
ℹ pass 66
ℹ fail 0
```

---

## 6. Static Analysis (Semgrep SAST Rules)

Custom Semgrep SAST rules are located in `semgrep-rules/` to ensure automated CI/CD prevention:

```bash
# Run Semgrep across repository
semgrep scan --config semgrep-rules/ .
```

* [`semgrep-rules/v03-access-control.yml`](semgrep-rules/v03-access-control.yml): Flags privileged PATCH handlers lacking authorization middleware.
* [`semgrep-rules/v04-verbose-errors.yml`](semgrep-rules/v04-verbose-errors.yml): Flags route handlers returning raw exception details (`err.message`) to clients.
* [`semgrep-rules/v05-mass-assignment.yml`](semgrep-rules/v05-mass-assignment.yml): Flags direct `req.body` assignment into database mutation methods without DTO filtering.
* [`semgrep-rules/v06-price-tampering.yml`](semgrep-rules/v06-price-tampering.yml): Flags route handlers that extract or calculate order totals using client-supplied price parameters.

---

## 7. Project Structure & Key Security Files

```text
├── backend/
│   ├── app.js                              # Express app with security middleware chain & error handling
│   ├── controllers/
│   │   ├── reservationController.js        # Hardened reservation controller (DTO allowlist & error sanitization)
│   │   ├── reservationRequestController.js # Hardened reservation request controller (error sanitization)
│   │   ├── restaurantController.js         # Hardened restaurant controller (error sanitization)
│   │   └── restaurantOrderController.js    # Hardened order controller (authoritative pricing)
│   ├── middleware/
│   │   ├── authMiddleware.js               # OIDC JWT verification (express-oauth2-jwt-bearer)
│   │   ├── authorization.js                # RBAC & restaurant scope enforcement
│   │   ├── errorHandler.js                 # Centralized error handler & information disclosure prevention
│   │   ├── loadUserIdentity.js             # Cryptographic identity bridge to internal user profile
│   │   └── resourceProtection.js           # Rate limiting & resource abuse guards
│   ├── utils/
│   │   ├── escapeHtml.js                   # Context-aware HTML sanitization for emails
│   │   ├── menuCatalog.js                  # Authoritative server-side price catalog
│   │   ├── restaurantMapping.js            # Canonical multi-tenant directory & scope validator
│   │   └── validationSchemas.js            # DTO allowlist schemas (Mass assignment prevention)
│   └── tests/
│       ├── v03-authorization.test.js       # Access control & RBAC test suite
│       ├── v03-identity-integration.test.js# OIDC token & provisioning test suite
│       ├── v04-error-sanitization.test.js  # Error response sanitization & information leakage test suite
│       ├── v05-mass-assignment.test.js     # DTO allowlist regression test suite
│       └── v06-price-tampering.test.js     # Authoritative pricing regression test suite
├── frontend/
│   └── src/
│       └── pages/Cart.tsx                  # Cart checkout with server validation handling
├── semgrep-rules/
│   ├── v03-access-control.yml              # Semgrep SAST rule for access control
│   ├── v04-verbose-errors.yml              # Semgrep SAST rule for raw error disclosure
│   ├── v05-mass-assignment.yml             # Semgrep SAST rule for mass assignment
│   └── v06-price-tampering.yml             # Semgrep SAST rule for price tampering
└── docs/
    └── security/                           # Comprehensive technical vulnerability implementation reports
```

---

## 8. Secure Software Development Best Practices Applied

1. **Defense-in-Depth:** Combining network/gateway validation (OIDC), route guards (RBAC), controller contracts (DTO allowlists), and business engines (authoritative pricing).
2. **Zero-Trust Client Principle:** Never allowing the client browser to dictate financial values, access roles, or record tenancy.
3. **Fail-Closed Security:** In the absence of an authenticated identity or verified tenant scope, all sensitive operations default to `401 Unauthorized` or `403 Forbidden`.
4. **Positive Allowlisting:** Rejecting unexpected attributes by default rather than maintaining reactive denylists.
5. **Continuous Automated Verification:** Backing every security fix with automated regression tests to prevent regressions during future development.