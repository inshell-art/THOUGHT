# THOUGHT V2 Render Release Notification

Date: 2026-07-12
Audience: DEV and downstream THOUGHT render consumers
Status: stable render-component release

## Release identity

- Source tag: `thought-v2-line-limits-agent-identity-20260712`
- Source commit: `6bc5f6c898cd3736a6324719d0e8cc52bba882be`
- Artifact publication tag: `thought-v2-render-artifact-20260712`
- Render artifact ID: `thought-v2-line-limits-agent-identity-20260712`
- Render manifest SHA-256: `88d7e2e0c500af5d0dca851c475f6f96b24e2a33cce56fc2fd8a6b132e049e35`
- Stable pointer: `artifacts/thought-v2/stable.json`
- Immutable manifest: `artifacts/thought-v2/releases/thought-v2-line-limits-agent-identity-20260712/manifest.json`
- Renderer ID: `thought.svg.v2.fixed-a-32`

The stable pointer promotes the verified candidate by reference. Candidate and stable resolve to the same manifest and bytes; stable was not rebuilt.

## Scope

This is a render-component release, not an umbrella frontend release and not a deployment announcement. It publishes the canonical renderer source, render contract, fixtures, and 54 checked SVG samples.

The source release also formalizes contract-facing behavior that downstream code must respect:

- prompt line: maximum 320 UTF-8 bytes and 433 display units;
- Agent line: maximum 180 UTF-8 bytes and 162 display units;
- exact Agent-line global uniqueness;
- preserved case and visible Unicode;
- canonical fixed 32x32 binary field;
- canonical clipped and animated Agent/prompt line rendering.

The `ThoughtNFT.workHash` ABI changed from `(promptLineHash, agentLineHash)` to `(agentLineHash)`, and `tokenOfAgentLineHash(bytes32)` was added. Treat contract integration as requiring an ABI/deployment review. Do not infer a production deployment from this render release.

## Consumer action

1. Fetch the THOUGHT `main` branch and tags.
2. Read `artifacts/thought-v2/stable.json` for discovery.
3. Pin the immutable artifact ID and manifest SHA-256 above in the consumer lock.
4. Fetch the immutable manifest and verify its SHA-256 before reading paths from it.
5. Verify `SHA256SUMS.txt` and every declared file. Reject missing, extra, absolute, parent-relative, or checksum-mismatched files.
6. Vendor the exact renderer and fixture bytes without formatting or newline conversion.
7. Run consumer renderer parity, gallery/detail/create, multilingual, overflow/carousel, and saved-SVG checks.
8. Confirm the frontend uses the same line limits and does not uppercase or otherwise normalize Agent output.
9. Keep contract calls pinned to a reviewed ABI and deployment. Do not deploy or switch addresses as part of this render-only update.
10. Record the artifact ID, manifest hash, source tag, and source commit in the downstream lock and release metadata.

The authoritative procedure is `docs/agent/THOUGHT_ARTIFACT_CONSUMPTION_BOOK.md`.

## Verification completed by producer

- `npm test`: passed, 24 tests
- `npm run build`: passed
- `npm run build:evm`: passed
- `npm run test:evm`: passed, 84 tests
- candidate `SHA256SUMS.txt`: all 62 listed files passed; 63 total release files including the checksum list itself
- source worktree at candidate build: clean
- source tag resolves exactly to source commit
- candidate and stable manifest identity: identical
- gitleaks staged/repository scan: passed before the source commit

## Compatibility notes

- Renderer consumers must update as one unit: renderer source, render contract, fixtures, and samples.
- The line-limit and Agent-identity rules are semantic changes, not visual-only changes.
- Existing minted tokens remain historical records. New contract deployment and migration decisions are separate operator work.
- `latest.json` is discovery-only. Production must pin the immutable artifact ID and manifest SHA-256.
- The old dirty-built experimental release remains historical and must not be promoted or consumed in production.

## Rollback

There was no previous stable render pointer in this bridge. A downstream repository that has not adopted this release should retain its current lock. A downstream repository that adopts it must preserve its previous lock and deployment record before rollout; rollback restores that previous consumer lock rather than changing this immutable release.

Do not roll back by editing files inside an artifact release directory or by repointing an existing immutable artifact ID to different bytes.
