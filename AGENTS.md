# Rentique

Rentique is an Indonesian academic clothing rental application. Preserve the independent Java and PHP console programs and the supplied UML in docs/class-diagram.png. Use React and Vite for the customer and administrator interfaces. Route all data access through the native PHP API and PDO PostgreSQL.

## Implementation plan

1. Preserve the original programs, model the UML in PHP, and prepare schema and seed records.
2. Implement authenticated inventory, rental, payment and return workflows.
3. Connect customer and admin journeys to the same API.
4. Exercise the original scenario, verify negative cases, build the frontend and document the demo.

## Invariants

- Keep integer rupiah, one duration per rental, and snapshot prices including one-time per-unit fees.
- Cart and quote never reserve stock. Use transactions and predictable row locking for mutations.
- Keep rental and payment statuses separate. Use an idempotency key for rental creation and payments.
- Store password hashes only. Authorize operations on the server and require CSRF tokens on mutations.
- A return restores stock once. Late fees are Rp10,000 per calendar day per transaction in Asia/Jakarta.
- Never commit database credentials, runtime data, or browser sessions. See README.md for setup and checks.
