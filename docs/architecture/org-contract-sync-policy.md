# Org Contract Sync Policy

## Purpose and scope

This policy defines how `ryvra-protocol/apps` stays aligned with canonical org service contracts.  
It applies to all app/runtime/client contract integrations that depend on upstream protocol repositories.

## Canonical sources of truth

| Domain | Canonical source repo | Canonical source path |
| --- | --- | --- |
| Markets | `ryvra-protocol/markets` | `openapi/markets.openapi.yaml` |
| Pay | `ryvra-protocol/pay` | `openapi/pay.openapi.yaml` |
| Points/Tasks | `ryvra-protocol/protocol-core` | `openapi/points-tasks.openapi.yaml` |

## Pin model

- Machine-readable pin matrix lives at `docs/architecture/contract-pin-matrix.json`.
- Code pin constants live in:
  - `packages/api-client/src/markets-parity.ts`
  - `packages/api-client/src/pay-parity.ts`
  - `packages/api-client/src/points-tasks-parity.ts`
- Documentation pin references live in integration parity docs and `docs/architecture/integration-map.md`.
- Each contract pin entry must include:
  - `source_repo`
  - `source_path`
  - `pinned_sha`
  - `pin_file_references`
  - `last_verified_at` (acts as `checked_at`, ISO8601)

## Update workflow

1. Retrieve canonical upstream file SHA from the declared source repo/path.
2. Update pin constants and docs in apps.
3. Update `docs/architecture/contract-pin-matrix.json` with new SHA and verification timestamp.
4. Run `pnpm contract:check` and include pass/fail output in PR validation.
5. In PR notes/checklist, include:
   - affected domain(s)
   - previous SHA -> new SHA
   - verification timestamp
   - compatibility/deferred-endpoint notes (if any)

Rollback guidance:

- If a pin update causes breakage or unresolved drift, revert to the last known good SHA by updating both pin files and matrix.
- Keep rollback PR explicit about why the contract pin was reverted and what follow-up is required.

## Drift policy

Drift includes any of the following:

- `pinned_sha` does not match canonical upstream SHA.
- A file in `pin_file_references` does not contain the pinned SHA.
- Required matrix metadata is missing/invalid.
- Canonical source cannot be verified by the contract sync checker.

Remediation SLA:

- Open a remediation PR within 1 business day of drift detection.
- Merge or formally escalate the remediation within 2 business days.

## Ownership and approvals

- Contract pin updates are owned by the Apps Integration Maintainer role.
- Required approvals for pin changes:
  - one Apps Maintainer
  - one domain owner from the affected protocol repo (Markets, Pay, or Protocol-core)
- Release coordination must verify `contract-sync-check` is passing before go-live.
