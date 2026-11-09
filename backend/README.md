# Star Builders API

Express 5 + TypeScript + MongoDB/Mongoose. Authentication, users and the existing business workflows are connected. See [business API integration](../docs/BACKEND_INTEGRATION.md) for endpoints, monetary rules, guarantees and correction/reversal workflows and remaining limits.

## Local setup

Use Node 20.19+ and MongoDB Atlas or a MongoDB replica set. Business writes require transactions; a standalone local MongoDB server is insufficient. From the project root:

```sh
npm run backend:install
cp backend/.env.example backend/.env
```

Edit the ignored `backend/.env`: set your MongoDB URI and a random JWT secret of at least 32 characters. Do not commit it or paste credentials into source. Generate a local secret with `openssl rand -hex 32` and place the result in the ignored file. The local development URI in the example has no username/password; replace it if your database requires authentication. `CORS_ORIGINS` is a comma-separated list of exact frontend origins, e.g. `http://localhost:5173`. Host defaults to loopback, port 4000.

The first Admin has already been created in MongoDB. The one-time bootstrap script, package commands and environment fields were removed afterward. Create additional users through the authenticated Admin API; there is no public registration or built-in account/password.

Start the server with:

```sh
npm run backend:dev
```

Phone numbers are digit strings (leading zeros retained), up to 32 characters; exact country/verification policy remains open. New passwords require 12–128 characters. Passwords are salted with Node's scrypt and never returned by the API. A browser login screen and API-backed User Management are implemented. Password reset, verified-phone onboarding and refresh tokens are not implemented. Browser Sign Out removes the browser’s saved token and synchronizes other open tabs; it does not revoke already issued JWTs server-side.

Start-up validates configuration, connects MongoDB, and ensures user/business indexes and the posting gate before listening. Invalid configuration, database failure or index creation failure stops startup. Graceful shutdown closes HTTP and MongoDB. Production index management should move to a controlled migration step before larger schemas are introduced.

## Endpoints

| Method | Path | Access / result |
|---|---|---|
| GET | /api/health | Process liveness; no DB requirement |
| GET | /api/health/ready | 200 when MongoDB ping succeeds; 503 otherwise |
| POST | /api/auth/login | `{phone, password}` → accessToken, tokenType, expiresIn, public user |
| GET | /api/auth/me | Bearer token; current active user |
| GET | /api/users?page=1&limit=25 | Admin; users and pagination; max page size 100 |
| POST | /api/users | Admin; name, phone, password, role, optional email |
| PATCH | /api/users/:id | Admin; update name/phone/email/role; cannot demote yourself |

Roles are `ADMIN` and `SUPERVISOR`. They are currently fixed codes on the user document; configurable roles/permissions are future work. Every protected request reloads the active user and role from MongoDB. Site-scoped attendance access and Admin-only financial endpoints are enforced. There is no public registration route. Business endpoint details are in [BACKEND_INTEGRATION.md](../docs/BACKEND_INTEGRATION.md).

JWTs use HS256 with a configured secret, issuer/audience checks and a 1-day (24-hour) lifetime. Login is rate-limited to 10 attempts per 15 minutes per IP in this single-process implementation. Distributed rate limiting, refresh/logout/revocation policy and reverse-proxy configuration are deployment work still to do. JWT secrets and database connection values are not logged. API errors have a code/message/request ID, without stack traces or rejected input values. Login failures do not distinguish unknown phones from wrong passwords.

## Verification

```sh
npm run backend:build
npm run backend:test
npm test
npm run build
```

Normal backend tests cover configuration, password hashing, tokens, money rounding, HTTP errors/security and authorization without MongoDB. To run all backend tests with real transactions in an isolated temporary local replica set:

```sh
npm run backend:test:integration
```

Install `mongod` or set `MONGOD_PATH` to its executable. The runner chooses a free local port and temporary data directory, then removes its generated database/files after tests. It never reads backend/.env or the application's MongoDB URI. Alternatively set `STAR_BUILDERS_TEST_MONGODB_URI` to a dedicated **test replica set** when running backend:test. Each database test creates and drops only its uniquely named database, ignoring the URI's database name. Without that variable, the three integration tests are skipped. Do not supply production credentials.

Current verification: all 16 backend tests, 55 frontend tests, 35 browser checks and both builds passed; no actual Atlas business data was used for verification.

Implementation references: [Express error handling](https://expressjs.com/en/guide/error-handling/), [Mongoose transactions](https://mongoosejs.com/docs/transactions.html) and [MongoDB transactions](https://www.mongodb.com/docs/manual/core/transactions/).

Payroll correction and reversal endpoint details are in [CORRECTIONS_AND_REVERSALS.md](../docs/CORRECTIONS_AND_REVERSALS.md). Restart the API after updating so the new collections and unique reversal index are initialized.

For combined Render hosting, see [DEPLOYMENT.md](../docs/DEPLOYMENT.md). SERVE_FRONTEND=true serves the built React app; TRUST_PROXY=1 is reserved for the trusted Render ingress. Defaults keep API-only local development unchanged.
