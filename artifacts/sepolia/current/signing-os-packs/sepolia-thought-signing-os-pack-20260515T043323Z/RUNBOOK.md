# THOUGHT Signing OS Runbook

Run ID: `sepolia-thought-signing-os-pack-20260515T043323Z`

## Sequence

1. Put this whole pack directory on Signing OS.
2. Ensure `~/.opsec/path/env/sepolia.env` exists and points to the Sepolia deploy keystore.
3. Run `bin/preflight`.
4. Run `bin/verify`.
5. Connect ADMIN Ledger only for ADMIN actions.
6. Run `bin/approve` and type the exact approval phrase.
7. Run `bin/apply`.
8. Run `bin/postconditions`.
9. Run `tools/push-latest-result.sh` or `tools/push-deployment-history.sh` as needed.

## Signers

- Deployer: `SEPOLIA_DEPLOY_SW_A` from canonical keystore env.
- Registry owner/admin: `SEPOLIA_ADMIN_HW_A` Ledger.
- PATH movement admin: `SEPOLIA_ADMIN_HW_A` Ledger.

The deployer does not become registry owner. `ThoughtSpecRegistry` is deployed with the ADMIN address as immutable owner.
