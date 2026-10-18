# Staxis Backend API Reference

NestJS backend. All endpoints prefixed with the controller path. Client account and billing routes require a Bearer token. Public routes include the plan catalogue, authentication entry points and the HMAC-authenticated provider webhook; token-authorized guest checkout routes are separate.

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
| POST | `/payment/initialize` | `{ selectedPlans: string[], billingCycle: 'monthly' \| 'quarterly' \| 'annually' }` | `{ authorizationUrl, reference, amount, discountAmount, selectedPlans, billingCycle, mode }` | Billing → Make a payment |
| POST | `/payment/verify` | `{ reference, selectedPlans, billingCycle, amount, discountAmount, mode }` from initialized checkout | verification result | Billing → Make a payment |
| GET | `/payment/checkout-context` | — | checkout session info | (not used yet) |
| GET | `/payment/pending/:reference` | owned payment reference | saved `PaymentCheckout` with original line items and discounts | Billing → Pending payment / resume |
| DELETE | `/payment/pending/:reference` | owned pending reference | removal confirmation; reference retained in backend audit | Billing → Pending payment |
| GET | `/payment/renewal` | — | `{ agreements: [{ id, status, autoRenew, isCurrent, cancellationPending, paidThrough, nextPaymentAt, description, canCancel }] }` | Billing |
| POST | `/payment/renewal/:id/cancel` | owned agreement ID | confirmed or pending cancellation result | Billing → Stop automatic renewal |

## Plans (`/plans`) — public

| Method | Path | Returns | Mobile Screen |
|--------|------|---------|---------------|
| GET | `/plans` | `ApiTrack[]` with nested `plans` | Billing → Make a payment |

## Data Types (frontend `src/lib/types.ts`)

```ts
DashboardData { company, transactions, openTicketsCount, resolvedTicketsCount, totalSpent, managers }
Company { id, name, logoUrl, createdAt, plans[], amount, bundleDiscount, status, nextBilling, trialEndsAt, paymentVerified, subscriptionType }
ProfileData { id, firstName, lastName, email, username, phoneNumber, image, dob, gender, address, city, state, country, role, onboardingCompleted, createdAt, adminPosition, company }
TicketListItem { id, ticketNumber, subject, category, priority, status, resolvedAt, createdAt, updatedAt, company, createdBy, assignedTo }
TicketDetail extends TicketListItem { description, messages[] }
TicketMessage { id, body, isInternal, senderType, createdAt, sender }
Transaction { id, amount, description, status, date, type, paystackRef?, canResume?, requiresReview? }
TransactionsPage { transactions[], total, page, limit, hasMore }
Manager { id, adminId, position, firstName, lastName, email, phoneNumber, image, assignedAt }
ApiPlan { id, name, price, setupFee?, features[], forLabel, responseTime, highlight? }
```

## Backend endpoints NOT yet used by mobile

| Endpoint | Purpose | Potential screen |
|----------|---------|-----------------|
| `GET /user/subscription` | Subscription details | Could enhance Billing screen |
| `GET /tickets/my/open-count` | Quick count | Could use for tab badge |
| `GET /payment/checkout-context` | Checkout session | Payment flow |
| `POST /auth/google/id-token` | Google sign-in | Login (social auth) |

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

## Mobile subscription checkout

The backend calculates prices and initializes Paystack; the app opens the returned HTTPS Paystack checkout URL using expo-web-browser. No Paystack key is required in the app. Monthly, quarterly (5%), annual (10%), and multi-track bundle (7.5%) savings match the web renewal screen.

The backend saves the original checkout details in a Pending transaction. AsyncStorage holds a per-user local copy; reopening checkout checks the backend before allowing it to resume. Only the checkout owner can retrieve the checkout URL. Cancelling returns to billing while keeping the attempt Pending. Removing a pending payment hides it from customer history while retaining its reference for reconciliation. An admin may close an attempt with a reason and note; closure does not cancel a provider session, refund money, or prove that payment failed.

Verification runs when returning to the app, when reopening Make a payment, or tapping Check payment. Only backend verification activates the subscription. A failed or abandoned checkout can be restarted; a closed attempt clears the local copy so a new checkout can begin. After success, returning to Billing reloads the dashboard and transaction history. The initialized response also includes `subtotal`, `bundleDiscount`, `cycleDiscount` and `lineItems` with original plan names and period prices.

Tickets live under Profile → Support in the app. This navigation change does not change the `/tickets` API paths.

An older attempt paid after a newer subscription purchase is recorded as Paid with `requiresReview: true`. Verification and the `PAYMENT_ALREADY_PAID` restore response carry that flag; the app shows payment received / awaiting admin review and keeps the newer subscription unchanged. Customer history receives only the review flag. Internal review notes and the newer reference remain restricted to administrator feeds. Administrative pending resolution uses `PATCH /payment/admin/pending/:reference/resolve` with `{ reason: 'CUSTOMER_DECLINED' | 'CUSTOMER_MISTAKE' | 'FAILED', note }` and requires an authorized administrator.

Paystack redirects to the configured web billing URL; close that browser to return to Staxis. Automatic app deep-link returns remain follow-up work. Signed webhook settlement, durable server recovery and renewal cancellation are implemented in backend source; follow `../../staxis-backend/PAYMENT_ROLLOUT.md` for required schema/provider/staging checks before release.

Single-plan monthly replace purchases may renew automatically; bundles, multi-plan, merge and quarterly/annual purchases are one-time. An already-paid old renewal continues until the customer explicitly stops it in Billing. A successful matching retry automatically closes older unused attempts as Replaced without routine admin review. References remain traceable, and a later actual second charge must still reconcile. Replaced is a local checkout status, not proof that Paystack cancelled the session or rejected a payment.
