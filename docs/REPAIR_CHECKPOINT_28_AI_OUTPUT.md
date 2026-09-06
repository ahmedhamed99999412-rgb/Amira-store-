# Repair Checkpoint 28 — AI Output & Timeout Hardening

Scope: `src/lib/ai.ts` only.

Changes:
- Added a bounded timeout around Z.ai initialization and completion requests.
- Added defensive validation for text responses.
- Added structured validation for smart-search JSON output.
- Added structured validation for suggested-variant JSON output.
- Normalized and validated generated SKU format; invalid model output falls back to the existing route's uniqueness fallback path.
- Typed chat history and filtered roles/content before sending to the provider.
- Preserved public function names and API response shapes.

Not changed:
- Database schema/data
- Frontend UI
- AI provider
- Existing route contracts
- Product/order business logic
