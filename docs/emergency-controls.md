# Emergency Controls

## Surface

- Embedded in `/agents/[id]`
- Backend API path: `POST /api/agents/[id]/controls`

## Supported operations

- suspend agent
- revoke credentials
- revoke capability
- activate kill switch
- deactivate kill switch (high-trust/admin flow)

## Guardrails

- explicit confirmation phrase (`CONFIRM <operation>`)
- required operator reason
- high-trust gate for kill-switch deactivation
- backend-authoritative outcome and audit reference display

## Security boundary

Frontend cannot override policy/risk results and cannot directly authorize privileged operations.
