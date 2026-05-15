# THOUGHT Signing OS Runbook

Run ID: `sepolia-thought-signing-os-pack-20260515T050730Z`

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

## Source Snapshot

`source/` is a curated deploy source snapshot from the exact source commit. It intentionally excludes frontend/devnode/local deploy scripts. The included paths are recorded in `PACK-MANIFEST.json.source_snapshot.paths`.

## Ledger Risk

`bin/apply` asks the ADMIN Ledger to sign `registerThoughtSpec(string,string,bytes)`. The spec calldata is large because it embeds `THOUGHT.v1.md`. If the Ledger refuses or blind signing is not enabled, stop, keep the failed result dir, write a recovery note from `templates/recovery-note.md`, push the latest result back with `tools/push-latest-result.sh`, and do not continue to PATH movement configuration.
