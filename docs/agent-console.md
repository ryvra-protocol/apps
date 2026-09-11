# Agent Console

## Routes

- `/agents`
- `/agents/[id]`
- `/agents/[id]/activity`
- `/agents/[id]/mandate`
- `/agents/[id]/permissions`
- `/agents/[id]/risk`
- `/agents/[id]/audit`

## Ownership

- Frontend: `apps/markets-web`
- Backend dependencies: `agent-gateway`, policy-risk, authorization, ledger/settlement provenance

## Operator capabilities

- Agent lifecycle visibility (`ACTIVE`, `SUSPENDED`, `REVOKED`)
- Autonomy visibility (`A0`-`A3`)
- Mandate/policy version and capability matrix
- Spend/rate/exposure dashboards
- Session/task health indicators when provided

## Security boundary

Frontend is not authority. All privileged controls and decisioning remain backend-authoritative.
