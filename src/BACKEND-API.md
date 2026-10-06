# Staxis Backend API Reference

NestJS backend. All endpoints prefixed with the controller path. Auth endpoints are public; all others require a Bearer token.

## Auth (`/auth`)

| Method | Path | Body / Params | Returns | Mobile Screen |
|--------|------|---------------|---------|---------------|
| POST | `/auth/login` | `{ email, password }` | `{ user, access_token, refresh_token }` | Login |
| POST | `/auth/register` | `{ firstName, lastName, email, password, confirmPassword, phoneNumber, acceptTerms }` | `{ user, access_token, refresh_token }` | Register |
| POST | `/auth/logout` | `{ refreshToken }` | `{ message }` | Dashboard (sign out) |
| POST | `/auth/forgot-password` | `{ email }` | `{ message }` | Forgot Password |
| POST | `/auth/verify-code` | `{ email, otp }` | `{ message }` | Verify Code |
| POST | `/auth/set-new-password` | `{ email, otp, newPassword, confirmPassword }` | `{ message }` | New Password |
| POST | `/auth/refresh` | `{ refreshToken }` | `{ access_token, refresh_token }` | (auto token refresh) |
| POST | `/auth/google/exchange` | `{ code }` | `{ user, access_token, refresh_token }` | (web OAuth) |
| POST | `/auth/google/id-token` | `{ idToken }` | `{ user, access_token, refresh_token }` | (mobile Google sign-in) |

## User (`/user`) — requires auth

| Method | Path | Body / Params | Returns | Mobile Screen |
|--------|------|---------------|---------|---------------|
| GET | `/user/me` | — | `ProfileData` | Profile Index |
| PATCH | `/user/me` | `{ firstName, lastName, phoneNumber, address, city, state, country }` | `ProfileData` | Edit Profile |
| PATCH | `/user/company` | `{ companyName, website, industry, companySize, companyPhone, rcNumber, address, city, state, country }` | company object | Edit Company |
| PATCH | `/user/password` | `{ currentPassword, newPassword, confirmPassword }` | `{ message }` | Change Password |
| GET | `/user/dashboard` | — | `DashboardData` | Dashboard, Billing |
| GET | `/user/subscription` | — | subscription details | (not used yet) |
| GET | `/user/transactions?page=N&limit=N` | query params | `TransactionsPage` | Transactions |
| GET | `/user/my-managers` | — | `Manager[]` | (used in dashboard) |

## Tickets (`/tickets`) — requires auth

| Method | Path | Body / Params | Returns | Mobile Screen |
|--------|------|---------------|---------|---------------|
| POST | `/tickets` | `{ subject, description, category, priority }` | `TicketListItem` | New Ticket |
| GET | `/tickets/my?status=X&search=X` | query params | `TicketListItem[]` | Ticket List |
| GET | `/tickets/my/:id` | path param | `TicketDetail` | Ticket Detail |
| POST | `/tickets/my/:id/reply` | `{ body }` | `TicketMessage` | Ticket Detail (send) |
| GET | `/tickets/my/open-count` | — | `{ count: number }` | (not used yet) |

## Payment (`/payment`) — requires auth

| Method | Path | Body / Params | Returns | Mobile Screen |
|--------|------|---------------|---------|---------------|
| POST | `/payment/verify` | payment verification data | verification result | (not used yet) |
| GET | `/payment/checkout-context` | — | checkout session info | (not used yet) |

## Plans (`/plans`) — public

| Method | Path | Returns | Mobile Screen |
|--------|------|---------|---------------|
| GET | `/plans` | `ApiPlan[]` | (not used yet — plans come via dashboard) |

## Data Types (frontend `src/lib/types.ts`)

```ts
DashboardData { company, transactions, openTicketsCount, resolvedTicketsCount, totalSpent, managers }
Company { id, name, logoUrl, createdAt, plans[], amount, bundleDiscount, status, nextBilling, trialEndsAt, paymentVerified, subscriptionType }
ProfileData { id, firstName, lastName, email, username, phoneNumber, image, dob, gender, address, city, state, country, role, onboardingCompleted, createdAt, adminPosition, company }
TicketListItem { id, ticketNumber, subject, category, priority, status, resolvedAt, createdAt, updatedAt, company, createdBy, assignedTo }
TicketDetail extends TicketListItem { description, messages[] }
TicketMessage { id, body, isInternal, senderType, createdAt, sender }
Transaction { id, amount, description, status, date, type }
TransactionsPage { transactions[], total, page, limit, hasMore }
Manager { id, adminId, position, firstName, lastName, email, phoneNumber, image, assignedAt }
ApiPlan { id, name, price, setupFee?, features[], forLabel, responseTime, highlight? }
```

## Backend endpoints NOT yet used by mobile

| Endpoint | Purpose | Potential screen |
|----------|---------|-----------------|
| `GET /user/subscription` | Subscription details | Could enhance Billing screen |
| `GET /tickets/my/open-count` | Quick count | Could use for tab badge |
| `POST /payment/verify` | Payment verification | Payment flow |
| `GET /payment/checkout-context` | Checkout session | Payment flow |
| `POST /auth/google/id-token` | Google sign-in | Login (social auth) |
| `GET /plans` | Available plans | Plan selection / upgrade screen |

## Other controllers (not client-facing)

- `admin/*` — Admin dashboard, ticket management, subscriber management
- `audit/*` — Audit log queries
- `blog/*`, `seo/*`, `solution/*` — Marketing CMS
- `broadcast/*` — Push notifications admin
- `contact/*` — Contact form submissions
- `notification/*` — Notification management
- `onboarding/*` — Onboarding flow
- `ondemand/*` — On-demand service requests
- `upload/*` — File uploads
- `reengagement/*` — Re-engagement campaigns
