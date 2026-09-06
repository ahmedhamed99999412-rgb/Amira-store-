# Repair Checkpoint 40 — Auth malformed JSON hardening

Scope: auth endpoints only.

Changed:
- POST /api/auth/login
- POST /api/auth/register
- PUT /api/auth/change-password
- PUT /api/auth/profile

Behavior:
- malformed/absent JSON now returns HTTP 400 with `Invalid request body`
- valid payload handling remains unchanged
- no database schema or data changes
- no UI changes

Verification:
- 4 targeted routes use safeJsonBody
- no direct `await req.json()` remains in these four routes
- route brace/syntax balance verified
- current DB: 21 tables / 543 rows
- original project files missing: 0
