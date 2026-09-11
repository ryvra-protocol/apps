# Audit & Provenance Explorer

## Surfaces

- Agent-scoped explorer: `/agents/[id]/audit`

## Trace chain

Displayed chain follows:

`actor -> mandate -> policy -> risk -> intent -> authorization -> execution -> ledger -> settlement`

## Filters

- `intentId`
- `correlationId`
- `agentId`
- `mandateId`
- decision state
- time range (`from`, `to`)

## Integrity visibility

If backend provides hash-chain verification status, UI displays verified/unverified counts.

## Security boundary

Explorer is read-only and cannot mutate authority state.
