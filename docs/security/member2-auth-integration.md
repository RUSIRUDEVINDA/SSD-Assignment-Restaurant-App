# Member 2: Auth0 Authentication to V03 Authorization Integration

**Course:** SE4030 Secure Software Development  
**Assignment Component:** Member 2 – Access Control  
**Feature:** Cryptographic Identity Mapping and Trusted Identity Bridge (V03 Authorization Integration)  
**Date:** September 2026  

---

## 1. Executive Summary & Problem Analysis

### 1.1 The Pre-Integration Root Cause (`req.auth` vs. `req.user` Mismatch)
Prior to this integration, the backend contained two disconnected security layers:
1. **Member 1 (Authentication):** Implemented OAuth2 / OIDC JWT access token cryptographic verification via `express-oauth2-jwt-bearer`. Upon successful verification, this middleware populated `req.auth = { payload, header, token }`, exposing raw claims such as `iss` (issuer URL) and `sub` (Auth0 subject identifier, e.g., `auth0|65f...`).
2. **Member 2 (Authorization - V03):** Implemented Role-Based Access Control (`requireRole`) and multi-tenant restaurant scoping (`requireRestaurantScopeByName`, `requireRestaurantScopeById`). These guards evaluated permissions exclusively against:
   ```javascript
   req.user = {
     id: "stable internal user ID",
     role: "customer" | "admin" | "mainAdmin",
     restaurantId: "trusted restaurant ID assignment" // required for admin
   };
   ```
3. **The Missing Integration Bridge:**
   - No production middleware mapped `req.auth` to `req.user`.
   - The backend had no persistent application `User` model storing trusted roles or tenant assignments.
   - Frontend (`AuthContext.tsx`) derived user roles by matching Auth0 email addresses against a client-side mock list (`getUserByEmail` from `data/users.ts`). Anyone registering with an arbitrary email or without a provisioned profile was either improperly mapped or unverified on the backend.
   - `backend/app.js` contained duplicate inline reservation-request route definitions that bypassed the modular router definitions.

### 1.2 The New Trust Chain
With this implementation, a strict, unidirectional trust chain is enforced:

```
[ Incoming Request with Bearer Token ]
                 │
                 ▼
 1. requireAuth (Member 1 Scope)
    - Cryptographically validates JWT signature, issuer, audience, and expiry against Auth0 JWKS
    - Rejects invalid / expired / missing tokens with HTTP 401
    - Exposes verified claims on req.auth.payload
                 │
                 ▼
 2. loadUserIdentity (Member 2 Integration Bridge)
    - Extracts verified iss and sub strictly from req.auth.payload
    - Queries backend User collection by exact compound key { authIssuer: iss, authSubject: sub }
    - Rejects unprovisioned or inactive accounts with generic HTTP 403 Forbidden
    - Validates stored role and tenant restaurantId against authoritative catalog
    - Establishes authoritative req.user with internal MongoDB _id string as req.user.id
                 │
                 ▼
 3. requireRole (Member 2 Scope)
    - Enforces RBAC permissions based strictly on req.user.role
    - Rejects unauthorized roles with HTTP 403 Forbidden
                 │
                 ▼
 4. requireRestaurantScopeById / ByName (Member 2 Scope)
    - Validates that admin's assigned restaurantId matches target resource
    - Allows mainAdmin global access across all tenants
    - Rejects cross-tenant access attempts with HTTP 403 Forbidden
                 │
                 ▼
 5. Controller Execution
    - Executes state mutations with verified caller identity and tenant isolation
```

---

## 2. Trusted Application User Model (`backend/models/User.js`)

The trusted identity store is managed via Mongoose in `backend/models/User.js`:

```javascript
const userSchema = new mongoose.Schema(
  {
    authIssuer: {
      type: String,
      required: [true, 'authIssuer is required'],
      trim: true,
    },
    authSubject: {
      type: String,
      required: [true, 'authSubject is required'],
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'role is required'],
      enum: {
        values: ['customer', 'admin', 'mainAdmin'],
        message: 'Invalid user role: {VALUE}',
      },
    },
    restaurantId: {
      type: String,
      trim: true,
      required: [
        function () { return this.role === 'admin'; },
        'restaurantId is required for restaurant administrators',
      ],
      validate: {
        validator: function (val) {
          if (this.role === 'admin') {
            return typeof val === 'string' && !!getRestaurantNameById(val.trim());
          }
          return true;
        },
        message: (props) => `Invalid restaurantId '${props.value}'. Must match an authoritative restaurant ID.`,
      },
    },
    active: {
      type: Boolean,
      default: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Unique compound index on authIssuer and authSubject
userSchema.index({ authIssuer: 1, authSubject: 1 }, { unique: true });
```

### Security Properties:
- **Identity Stability:** The MongoDB internal document ID (`user._id.toString()`) serves as the permanent, internal application user ID (`req.user.id`).
- **No Email Trust:** Email is NOT used as an authentication or authorization lookup key, preventing account takeover via email re-registration or aliasing.
- **Compound Uniqueness:** A unique compound index on `authIssuer` and `authSubject` prevents collision across different identity providers and guarantees one profile per Auth0 subject.
- **Tenant Directory Enforcement:** Restaurant administrators MUST be assigned a valid restaurant ID matching the authoritative directory (`RESTAURANT_DIRECTORY` in `backend/utils/restaurantMapping.js`). IDs are application IDs ("1" through "6").

---

## 3. Middleware Order & Route Integration

### 3.1 Middleware Execution Sequence
All V03-protected endpoints enforce the canonical order:
```text
requireAuth -> loadUserIdentity -> requireRole(...) -> [tenant-scope guard] -> controller
```

### 3.2 Integrated Route Map

| Router | Method | Path | Middleware Sequence |
| :--- | :--- | :--- | :--- |
| `userRoute.js` | `GET` | `/api/me` | `requireAuth, loadUserIdentity` |
| `restaurantOrderRoute.js` | `GET` | `/restaurant/orders` | `requireAuth, loadUserIdentity, requireRole('mainAdmin')` |
| `restaurantOrderRoute.js` | `GET` | `/restaurant/orders/restaurant/:restaurantName` | `requireAuth, loadUserIdentity, requireRole('admin', 'mainAdmin'), requireRestaurantScopeByName('restaurantName')` |
| `restaurantOrderRoute.js` | `PATCH` | `/restaurant/orders/:id` | `requireAuth, loadUserIdentity, requireRole('admin', 'mainAdmin')` |
| `restaurantOrderRoute.js` | `PATCH` | `/restaurant/orders/status/:id` | `requireAuth, loadUserIdentity, requireRole('admin', 'mainAdmin')` |
| `restaurantOrderRoute.js` | `DELETE` | `/restaurant/orders/:id` | `requireAuth, loadUserIdentity, requireRole('admin', 'mainAdmin')` |
| `restaurantOrderRoute.js` | `GET` | `/restaurant/order-requests/restaurant/:restaurantName` | `requireAuth, loadUserIdentity, requireRole('admin', 'mainAdmin'), requireRestaurantScopeByName('restaurantName')` |
| `restaurantOrderRoute.js` | `PATCH` | `/restaurant/order-requests/:requestId` | `requireAuth, loadUserIdentity, requireRole('admin', 'mainAdmin')` |
| `reservationRoute.js` | `GET` | `/api/restaurant/:restaurantId/reservations` | `requireAuth, loadUserIdentity, requireRole('admin', 'mainAdmin'), requireRestaurantScopeById('restaurantId')` |
| `reservationRoute.js` | `PATCH` | `/api/reservations/:reservationId/modify` | `requireAuth, loadUserIdentity, requireRole('admin', 'mainAdmin')` |
| `reservationRoute.js` | `PATCH` | `/api/reservations/:reservationId` | `requireAuth, loadUserIdentity, requireRole('admin', 'mainAdmin')` |
| `reservationRoute.js` | `GET` | `/api/restaurant/:restaurantId/reservation-requests` | `requireAuth, loadUserIdentity, requireRole('admin', 'mainAdmin'), requireRestaurantScopeById('restaurantId')` |
| `reservationRoute.js` | `PATCH` | `/api/reservation-requests/:requestId` | `requireAuth, loadUserIdentity, requireRole('admin', 'mainAdmin')` |

### 3.3 Cleanup of Duplicate Routes in `backend/app.js`
The duplicate inline routes for `/api/reservation-requests` previously declared directly on `app` in `backend/app.js` were removed. All reservation and reservation request operations are cleanly dispatched through `backend/routes/reservationRoute.js`, and unused controller imports were purged from `app.js`.

---

## 4. `GET /api/me` Endpoint Specification

Mounted at `GET /api/me`, protected by `requireAuth, loadUserIdentity`.

### Successful Response Example (HTTP 200 OK)
```json
{
  "id": "650000000000000000000002",
  "role": "admin",
  "restaurantId": "1",
  "displayName": "Barista Administrator"
}
```

### Response Attributes:
- **`id`**: Internal MongoDB ObjectID string (authoritative internal identifier; distinct from Auth0 `sub`).
- **`role`**: Application role (`customer`, `admin`, or `mainAdmin`).
- **`restaurantId`**: Canonical restaurant ID (only returned when role is `admin`).
- **`displayName`**: Optional user-friendly display name.
- **Redaction:** Secrets, raw JWT claims, `authIssuer`, `authSubject`, and internal diagnostic flags are strictly excluded from the payload.

---

## 5. Frontend Identity Handling (`AuthContext.tsx` & `api.ts`)

### 5.1 Removal of Demo-Based Roles
- Deleted `getUserByEmail` matching in `frontend/src/contexts/AuthContext.tsx`.
- Removed all client-side assumptions granting administrator privileges based on email addresses.

### 5.2 Dynamic Profile Retrieval Workflow
1. Upon successful Auth0 login, `AuthContext` retrieves a valid access token via `getAccessTokenSilently()`.
2. `AuthContext` calls `getMyProfile(token)` (`GET /api/me`).
3. If successful, maps `profile.role` to `user.type`, assigns `profile.id` to `user.id`, and populates `user.restaurantId`.
4. If `/api/me` returns 403 Forbidden (unprovisioned or inactive account), `user` is set to `null` and a descriptive message is stored in `error`.
5. If `/api/me` returns 401 or network error, `user` is set to `null`.
6. Stale asynchronous profile responses are discarded using sequence counters (`activeRequestIdRef`), guaranteeing that fast user switching or logouts cannot display a previous user's admin profile.

### 5.3 Exact Origin Token Attachment (`api.ts`)
The axios request interceptor was refactored to use WHATWG URL parsing and strict origin comparison (`new URL(url, baseURL).origin === new URL(API_URL).origin`) rather than loose string prefixes. This eliminates token leakage risks to third-party endpoints.

---

## 6. Controlled Backend Provisioning (`backend/scripts/provision-user.js`)

Provisioning is strictly backend-only. There is NO public HTTP endpoint accepting role or restaurantId assignments.

### 6.1 Requirements & Safety Controls
- **Issuer Derivation:** Automatically derived from `AUTH0_DOMAIN` in the backend environment. Arbitrary caller-supplied issuers are rejected.
- **No Overwrite:** Aborts with an error if a user with the same `authIssuer` and `authSubject` already exists.
- **Dry-Run Mode:** Supports `--dry-run` to preview changes without modifying the database.
- **Tenant Validation:** Rejects any `restaurantId` not present in the authoritative catalog (IDs 1 through 6).

### 6.2 Locating Auth0 Subject IDs
In the Auth0 Management Dashboard:
1. Navigate to **User Management** -> **Users**.
2. Click on the target user.
3. Locate the **user_id** field under Identity Provider (e.g. `auth0|66f123456789abcdef012345` or `google-oauth2|109876543210`).
4. Copy this string as the `--sub` parameter.

### 6.3 PowerShell Provisioning Examples

> [!WARNING]
> Do NOT execute these commands against the live production database until staging verification is complete. The script requires `.env` with `MONGODB_URI` and `AUTH0_DOMAIN`.

#### 1. Dry-Run Verification (Preview Customer):
```powershell
node scripts/provision-user.js `
  --sub "auth0|CUSTOMER_AUTH0_SUB_HERE" `
  --role "customer" `
  --display-name "Customer Jane" `
  --dry-run
```

#### 2. Provision Customer Account:
```powershell
node scripts/provision-user.js `
  --sub "auth0|CUSTOMER_AUTH0_SUB_HERE" `
  --role "customer" `
  --display-name "Customer Jane"
```

#### 3. Provision Admin for Restaurant 1 (Barista):
```powershell
node scripts/provision-user.js `
  --sub "auth0|ADMIN_BARISTA_SUB_HERE" `
  --role "admin" `
  --restaurant-id "1" `
  --display-name "Barista Manager"
```

#### 4. Provision Admin for Restaurant 2 (Pizza Hut):
```powershell
node scripts/provision-user.js `
  --sub "auth0|ADMIN_PIZZAHUT_SUB_HERE" `
  --role "admin" `
  --restaurant-id "2" `
  --display-name "Pizza Hut Manager"
```

#### 5. Explicit Index Setup Script:
To ensure the compound unique index exists before live writes:
```powershell
node scripts/setup-indexes.js
```

---

## 7. Verification Results & Regression Testing

### 7.1 Automated Backend Test Suite
Executed command:
```bash
npm test
```
Target test files:
- `backend/tests/v03-authorization.test.js` (Original 21 V03 authorization tests)
- `backend/tests/v03-identity-integration.test.js` (16 New identity-loading integration tests)

**Result:**
```text
TAP version 13
# tests 37
# suites 0
# pass 37
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 993.85
```
All 37 test cases passed without error.

### 7.2 Automated Frontend Build & Type Check
Executed command:
```bash
npm run build
```
**Result:**
```text
vite v5.4.10 building for production...
✓ 3550 modules transformed.
dist/index.html                        0.34 kB │ gzip:     0.23 kB
dist/assets/index-BSbLgsS2.css        91.25 kB │ gzip:    14.55 kB
dist/assets/purify.es-D-QPbZEk.js     21.82 kB │ gzip:     8.60 kB
dist/assets/index.es-By-Mjl2X.js     149.98 kB │ gzip:    51.25 kB
dist/assets/index-DV2KQACj.js      3,485.81 kB │ gzip: 1,066.71 kB
✓ built in 15.35s
```
Frontend bundle compiled cleanly with 0 TypeScript/build errors.

---

## 8. Manual OWASP ZAP / Replay Verification Checklist

Execute these 4 test scenarios against a synthetic order record (`order-barista-1` owned by Barista, Restaurant 1):

Target Endpoint: `PATCH /restaurant/orders/status/order-barista-1`  
Target Payload: `{"status": "ready for pickup"}`  

| Step | Test Scenario | Authentication Header | Expected Status | Expected Body Pattern | Required Database State Check |
| :---: | :--- | :--- | :---: | :--- | :--- |
| **1** | Anonymous Request | *None* | **401 Unauthorized** | `{"error": "Unauthorized"}` | Target order status remains `"confirmed"` |
| **2** | Customer Access Token | `Bearer <VALID_CUSTOMER_API_TOKEN>` | **403 Forbidden** | `{"error": "Forbidden", ...}` | Target order status remains `"confirmed"` |
| **3** | Cross-Restaurant Admin (Pizza Hut Admin) | `Bearer <VALID_RESTAURANT_2_ADMIN_TOKEN>` | **403 Forbidden** | `{"error": "Forbidden", ...scope...}` | Target order status remains `"confirmed"` |
| **4** | Authorized Restaurant Admin (Barista Admin) | `Bearer <VALID_RESTAURANT_1_ADMIN_TOKEN>` | **200 OK** | `{"status": "ready for pickup", ...}` | Target order status successfully mutates to `"ready for pickup"` |

> [!IMPORTANT]
> - Always obtain API access tokens (with audience `https://ssd-restaurant-api` or configured value) via standard frontend authentication login. Never use ID tokens.
> - Never save access tokens, client secrets, or full connection strings into committed files or screenshots.

---

## 9. Code Inspection File & Line References

For submission documentation and screenshots, reference the following exact files and line numbers:

1. **Trusted User Schema with Compound Uniqueness:**
   - [backend/models/User.js](file:///d:/SSD-Assignment-Restaurant-App/backend/models/User.js#L5-L52) (Lines 5–52)
2. **Identity Loading Middleware & Upstream requireAuth Prerequisite:**
   - [backend/middleware/loadUserIdentity.js](file:///d:/SSD-Assignment-Restaurant-App/backend/middleware/loadUserIdentity.js#L26-L97) (Lines 26–97)
3. **Protected Profile Endpoint (`GET /api/me`):**
   - [backend/routes/userRoute.js](file:///d:/SSD-Assignment-Restaurant-App/backend/routes/userRoute.js#L14-L33) (Lines 14–33)
4. **Clean Route Mounting in `app.js`:**
   - [backend/app.js](file:///d:/SSD-Assignment-Restaurant-App/backend/app.js#L29-L38) (Lines 29–38)
5. **Route Middleware Sequencing (`restaurantOrderRoute.js`):**
   - [backend/routes/restaurantOrderRoute.js](file:///d:/SSD-Assignment-Restaurant-App/backend/routes/restaurantOrderRoute.js#L25-L40) (Lines 25–40)
6. **Frontend Decoupling from Demo Profiles (`AuthContext.tsx`):**
   - [frontend/src/contexts/AuthContext.tsx](file:///d:/SSD-Assignment-Restaurant-App/frontend/src/contexts/AuthContext.tsx#L55-L125) (Lines 55–125)
7. **Safe Origin URL Parsing (`frontend/src/utils/api.ts`):**
   - [frontend/src/utils/api.ts](file:///d:/SSD-Assignment-Restaurant-App/frontend/src/utils/api.ts#L28-L58) (Lines 28–58)
8. **Controlled Provisioning CLI Script:**
   - [backend/scripts/provision-user.js](file:///d:/SSD-Assignment-Restaurant-App/backend/scripts/provision-user.js#L68-L165) (Lines 68–165)

---

## 10. Remaining V04 Work Notice

> [!NOTE]
> This task strictly resolved vertical privilege escalation (V03) by establishing a cryptographically trusted trust chain between Auth0 authentication and administrator role/restaurant-scope authorization.
> 
> **Pending V04 Tasks:**
> - Customer Horizontal Privilege Separation / IDOR checks (`orders/email/:email`, `/orders/:id`, `/reservations`, `/reservations/:id`).
> - Validating customer resource ownership against `req.user.id` or trusted identity attributes.
> - Customer IDOR remediation must NOT be conflated with the completed V03 identity-loading milestone.
