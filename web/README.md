# Next.js tenant dashboard

This is a separate Next.js + TypeScript + Tailwind app. The existing React/Vite
app in `/frontend` remains unchanged.

## Run locally

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` and
   `NEXT_PUBLIC_TENANT_SLUG`.
2. Run `npm install`, then `npm run dev` from this directory.
3. Open `http://localhost:3000`. Sign in with the existing Django JWT account
   to load member and attendance records.

The API URL includes `/api` by default, matching the existing Vite client. The
typed client calls the existing auth, member, attendance, tenant signup, CSV,
and billing routes. Authenticated requests send `X-Tenant-Slug`; signup is
public and saves the returned tenant slug and JWT tokens for the new session.
Billing checkout requires the backend Stripe secret and approved plan price
IDs; the frontend does not invent plan prices.

Tenant owners and administrators can use the Team access page to view
memberships and adjust permitted roles or deactivate accounts. Only owners can
grant owner/administrator roles or change existing privileged memberships;
the backend prevents deactivating oneself or removing the last active owner.

The public `/checkin/[token]` route is used by service QR codes. QR links carry
the tenant slug as a context selector; it is not authorization. Check-in still
requires a network connection, and an offline submission is explicitly reported
as unrecorded rather than queued or treated as successful.

The dashboard chart and signed-out member/attendance preview use explicitly
labelled sample data. The tenant header selects a workspace but is not an
authorization credential: protected API actions also require an active
membership and role.

Tokens follow the existing frontend's `auth_token` / `auth_refresh` local
storage convention. Access tokens are sent as Bearer credentials; a 401 triggers
one refresh attempt and failed refresh clears both tokens and returns to sign-in.
For production, prefer an HttpOnly cookie/BFF architecture over JavaScript-
accessible token storage.
