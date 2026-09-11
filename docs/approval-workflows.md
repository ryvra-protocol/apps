# Approval Workflows

## Queue and detail views

- Queue: `/agents` (approvals/escalation center)
- Detail: `/agents/approvals/[intentId]`

## Supported decision states

- `APPROVED`
- `DENIED`
- `REVIEW`
- `CHALLENGE`
- `DELAY`
- `QUARANTINE`
- `BLOCKED`
- `CANCELED`

## Intent detail references

- action, amount, asset, recipient/venue, purpose
- `mandateId`, `policyVersion`, `riskAssessmentId`, `authorizationId`
- reason codes and risk summary
- `correlationId`, `idempotencyKey`
- provenance references

## Actions

- approve
- deny
- challenge/escalate
- delay
- quarantine
- cancel

Sensitive decisions require operator reason/comment.

## Backend integration

`POST /api/approvals/[intentId]/decision` proxies to backend authority and returns audit references.
