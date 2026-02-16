# MTN MoMo Integration Tickets

Backend implementation for MTN Mobile Money payment processing via Appwrite Cloud Functions.

**Parent ticket**: [PAY-001](../PAY-001-payment-integration.md)
**Plan**: [PAY-001-mtn-momo-integration-plan](../plans/PAY-001-mtn-momo-integration-plan.md)

## Tickets

| ID | Title | Priority | Dependencies | Status |
|----|-------|----------|--------------|--------|
| MOMO-001 | [Database Schema Update](MOMO-001-database-schema-update.md) | Critical | None | Pending |
| MOMO-002 | [MTN MoMo API Client](MOMO-002-mtn-momo-api-client.md) | Critical | None | Pending |
| MOMO-003 | [Initiate Payment Function](MOMO-003-initiate-payment-function.md) | Critical | MOMO-001, MOMO-002 | Pending |
| MOMO-004 | [Check Payment Status Function](MOMO-004-check-payment-status-function.md) | Critical | MOMO-001, MOMO-002 | Pending |
| MOMO-005 | [Process Refund Function](MOMO-005-process-refund-function.md) | Medium | MOMO-001 | Pending |
| MOMO-006 | [Deploy & Configure](MOMO-006-deploy-and-configure.md) | Critical | MOMO-003, MOMO-004, MOMO-005 | Pending |

## Execution Order

```
MOMO-001 (DB Schema) ──┐
                        ├──→ MOMO-003 (Initiate Payment) ──┐
MOMO-002 (API Client) ──┤                                   │
                        ├──→ MOMO-004 (Check Status) ───────┼──→ MOMO-006 (Deploy)
                        │                                    │
                        └──→ MOMO-005 (Refund) ─────────────┘
```

- **MOMO-001** and **MOMO-002** can run in parallel (no dependencies on each other)
- **MOMO-003**, **MOMO-004**, **MOMO-005** can run in parallel once their dependencies are met
- **MOMO-006** is the final step after all functions are created

## Scope

- MTN MoMo Collection API (Request to Pay) only
- Sandbox environment first
- Orange Money integration deferred to a separate set of tickets
- Refunds are DB-only for MVP (no MTN Disbursement API)
