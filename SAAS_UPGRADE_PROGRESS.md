# SaaS Upgrade Progress

This file is the shared progress record for the SaaS upgrade work. Update it as
each task is started, completed, tested, or deferred so work can resume across
sessions without relying on chat history.

## Current state

- **Branch:** `feature/saas-upgrade-scaling`
- **Overall status:** Core implementation complete; production launch gates remain
- **Last updated:** 2026-10-18
- **Current focus:** Prepare a real deployment environment, verify external
  integrations, and run the GitHub Actions workflow before launch.
- **Uncommitted:** Yes. The branch currently contains uncommitted SaaS changes.
- **Scope decisions confirmed:** Self-managed Ubuntu/PostgreSQL/Nginx deployment;
  keep React/Vite while adding a separate `/web` Next.js app; use generic
  marketing copy with placeholders for unverified testimonials/metrics; use
  configurable Starter/Growth/Pro pricing; create public signups as active
  free/trial tenants.

## Roadmap

Status key: `Not started` / `In progress` / `Implemented, needs verification` /
`Complete` / `Blocked` / `Deferred`.

| # | Workstream | Status | Completion notes / next action |
|---|---|---|---|
| 1 | Tenant model, migrations, and legacy-data backfill | Complete | Default-tenant backfill, required tenant FKs, invitation and membership backfills, per-tenant member IDs, and a legacy transfer command are implemented. Migrations apply cleanly and `makemigrations --check --dry-run` reports no drift. |
| 2 | Tenant resolution middleware | Complete | Resolves custom domains, tenant subdomains, API tenant headers, public QR tenant selectors, and the configured default. Platform-admin impersonation remains authenticated; sync/async context cleanup and host/query behavior are covered by tests. |
| 3 | Enforce tenant scoping at ORM/service layer | Complete | Tenant-aware managers, same-tenant relationship checks, API isolation, tenant-filtered raw attendance SQL, explicit tenant contexts for background jobs and management commands, and QR storage/repair iteration are implemented. Cross-tenant access and public QR routing are tested. |
| 4 | Tenant-scoped RBAC and permissions | Complete | Owner/admin/manager/viewer policies cover core business APIs, invitation administration, billing, and tenant membership management. Owners/admins can manage permissible memberships; only owners can grant privileged roles; self-deactivation and removal of the last active owner are blocked. |
| 5 | Subdomain routing, DNS, and TLS guidance/configuration | Implemented, needs verification | Added wildcard-domain Nginx example, Ubuntu/PostgreSQL/Next.js deployment guidance, proxy-aware Django HTTPS settings, and custom-domain certificate caveats. Actual DNS, certificates, and firewall rules require the operator's domain/server. |
| 6 | Stripe billing | Implemented, needs verification | Added configurable Starter/Growth/Pro checkout, billing portal/overview, signed webhook verification, idempotency, lifecycle updates, UI, and mocked tests. Live transactions remain disabled until production Stripe keys, prices, and webhook configuration are supplied. |
| 7 | Tenant signup and onboarding | Implemented, needs verification | Public trial signup creates a tenant, owner, membership, and JWTs; slug/workspace storage and onboarding UI are present. Demo data is not automatically seeded. |
| 8 | CSV member import/export | Complete | Tenant-scoped export, preview, and all-or-nothing import validate file size/row limits and are integrated into the Next.js members page; covered by API tests. |
| 9 | QR and kiosk check-in improvements | Complete | Existing service window, visitor/member validation, rate limits, duplicate prevention, and QR rotation are retained. QR links now carry tenant context and work in both frontend routes. Offline submissions clearly fail without recording or claiming success; no offline queue was added because server acceptance and the service window cannot be verified offline. |
| 10 | Optional frontend modernization | Complete | `/web` provides signup, onboarding, dashboard, members/CSV, attendance, billing, team access, and public QR check-in. The React/Vite app remains in the repository and its existing public check-in client supports tenant-aware QR links. Typecheck and production builds pass; no browser E2E suite is configured. |
| 11 | CI/CD | Implemented, needs verification | PR/main CI runs Django checks, migration drift validation, PostgreSQL-backed app tests, Vite build, and Next.js typecheck/build. The workflow has not yet been executed by GitHub Actions, and deployment is intentionally not automated. |
| 12 | Observability, backups, and security hardening | Implemented, needs verification | Added database health endpoint, proxy-aware HTTPS redirect and secure-cookie settings, and backup/restore/monitoring runbook guidance. Monitoring, off-host encrypted backups, restore drills, and alerts must be configured by the operator. |
| 13 | Unit, integration, and E2E coverage | In progress | 67 focused Django tests pass across tenant, member, service, and attendance apps; frontend builds/typecheck pass. Browser-driven end-to-end tests are not configured. |
| 14 | Multi-tenant docs and operational runbooks | Implemented, needs verification | README documents tenancy, billing, CSV, roles, health checks, and public QR context. Deployment guidance covers DNS/TLS, migration safety, backups/restores, health probes, and external launch requirements; verify against the chosen server. |
| 15 | Marketing and growth deliverables | Implemented, needs verification | Added static landing page, five blog drafts, ads, explainer storyboard, and case-study template. Landing claims now align with shipped capabilities; brand, legal/contact details, plan terms, approved stories, lead endpoint, and canonical domain remain launch placeholders. |
| 16 | Quick wins | Implemented, needs verification | Delivered QR tenant routing, workspace member administration, a health probe, and CI migration-drift checking. Reassess after production feedback. |

## Implemented so far

- Added the `tenants` Django app and `Tenant` model.
- Added required `tenant` foreign keys on `Member`, `Service`, and `Attendance`.
- Added a data migration that creates the `default` tenant and associates existing
  unassigned rows with it.
- Added the `create_tenant_from_existing` management command.
- Added tenant resolution middleware and `current_tenant()` context helpers.
- Added middleware, scoping, backfill, access-control, membership-management,
  health-check, and application tests. The latest focused run passed 67 tests
  across tenant, member, service, and attendance modules.
- Added routing configuration notes to the README.
- Added `/web`, a separate Next.js tenant dashboard scaffold with typed calls
  to existing auth, members, and attendance routes; tenant header configuration;
  JWT refresh/logout handling; accessible shared form/table/modal/file-input
  components and manual check-in fallback; and explicit demo-only dashboard
  metrics. Billing and tenant onboarding remain informational/local-only until
  corresponding backend endpoints are implemented.
- Added tenant-aware default managers and fail-closed production context rules,
  API permission checks, tenant-local member IDs, invitation ownership, role
  assignments, and explicit tenant context for background and management jobs.
- Implemented tenant signup/trial lifecycle, Stripe billing/webhooks, member
  CSV workflows, tenant membership administration, and QR check-in tenant
  routing in both frontends.
- Added a health endpoint, production proxy security settings, an Nginx
  wildcard-host example, CI migration drift checks, and a deployment/backup
  runbook. Production credentials and operational services remain external.
- Latest verification: 67 focused Django tests passed; Django system checks and
  migration drift checks passed; Next.js typecheck/build and Vite build passed.
  The Vite build reports its existing large-bundle warning. A local JWT test
  key warning remains because the development signing key is 31 bytes.

## Decisions and guardrails

- Use the repository's Django backend and React/Vite frontend; do not implement
  the alternate Node/Sequelize instructions from the original prompt.
- Current strategy is a shared database schema with a `tenant_id` foreign key.
- Never mark a roadmap item complete based only on code being present: record
  applicable migration, test, and behavior verification.
- Keep tasks surgical and inspect existing behavior before replacing features.
- Do not commit unless explicitly requested.
- External hosting, payment, email, monitoring, and object-storage credentials
  must be provided as deployment secrets/environment variables and must never
  be committed. Code and runbooks can be completed without pretending that
  live services have been provisioned.

## Remaining launch gates

1. Configure real production domain/DNS, wildcard and custom-domain TLS,
   PostgreSQL, secure environment secrets, and restricted network access.
2. Configure Stripe prices/webhook, email delivery, monitoring/alerts, encrypted
   off-host backups, and verify a restore before accepting production data.
3. Run the GitHub Actions workflow on the branch and add browser E2E coverage
   before launch if desired.
4. Replace landing-page placeholders, verify plan terms, configure/test the
   monitored lead endpoint, and approve legal/contact/customer-story content.
