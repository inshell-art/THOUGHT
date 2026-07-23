# AGENTS

## Scope
- THOUGHT contains the frontend and EVM contracts for minting one THOUGHT from one PATH movement unit.
- Contract code lives in `evm/`.
- Do not change PATH or Pulse contracts from this repo. Coordinate those changes in `path/` and `pulse/`.
- The current protocol is THOUGHT V2: Terminal English, ordered prompt-plus-Agent identity, and a deterministic terminal-chat path-glyph renderer. It is an implementation candidate, not yet published or deployed.
- The binary-weave/visible-Unicode implementation was never published. Treat the old unversioned contract, `protocol/releases/v2`, and `artifacts/thought-v2` trees as a historical attempt only. It does not consume a public version and must not be released as current V2. No THOUGHT V3 exists.

## Commands
- Frontend tests: `npm test`.
- EVM build: `npm run build:evm`.
- EVM tests: `npm run test:evm`.
- `npm run attempt:deploy:evm-local` targets the archived binary-weave attempt; do not use it for current V2.

## Artifact Publication and Consumption
- `docs/agent/THOUGHT_ARTIFACT_CONSUMPTION_BOOK.md` is authoritative for cross-repo artifact ownership, publication channels, integrity checks, consumer pinning, rollout, and rollback.
- Do not publish or consume candidate/stable artifacts from a dirty worktree. `latest` is discovery-only; production consumers must pin an immutable artifact ID and manifest hash.

## Publish-Ready Contract Invariants
- `ThoughtNFTV2.pathNft` and `ThoughtNFTV2.thoughtSpecRegistry` are immutable constructor dependencies.
- `ThoughtNFTV2.mint` consumes exactly one PATH `THOUGHT` movement unit atomically before minting a THOUGHT.
- Failed THOUGHT mints must not consume PATH, reserve text hashes, or increment supply.
- `promptLine` and `agentLine` are exact 1-through-64-byte Terminal English lines under the closed 76-character US-ASCII repertoire. Reject outer spaces, repeated internal spaces, unsupported bytes, controls, and non-ASCII before PATH consumption. Never trim, collapse, normalize, case-fold, translate, or repair accepted input. Punctuation-only lines are valid. The candidate normative profile is `protocol/current/v2/work/thought.work.v2.md`.
- The exact ordered `(promptLine, agentLine)` pair is globally unique. Reusing either line with a different counterpart remains valid; reversing the pair is distinct.
- `declaredAgent` and `declaredModel` are exact 1-through-64-byte labels under `inshell.thought.context.v2.visible-utf8-64`. Preserve them in typed state, canonical provenance declarations, and creation-attestation hash inputs. A nonzero valid creation-attestation digest gates their publication as `Attested Agent` / `Attested Model` metadata traits; unattested tokens omit Agent/Model traits. Their semantic status remains `declared-unverified` even when the creation attestation is valid. They do not affect conversation identity, work hash, or SVG artwork.
- `ThoughtSpecRegistry` is the append-only source of truth for valid registered `THOUGHT.vN.md` spec names, ids, hashes, refs, and exact bytes.
- `ThoughtSpecRegistry.owner` is immutable and must be passed explicitly at deploy time. For Sepolia/mainnet, it must be the Ledger-backed ADMIN address, not a software deployer.
- There is no active/frozen/latest THOUGHT spec at contract level. Do not introduce a required-latest spec gate in `ThoughtNFTV2`.
- `ThoughtNFTV2.mint` must require and store both `thoughtSpecId` and `thoughtSpecHash`; mint validates the exact registered pair before PATH consumption.
- Multiple registered THOUGHT spec versions may coexist and remain mintable in one collection.
- Deploy scripts must read `THOUGHT.vN.md` as raw bytes, reject BOM/CRLF/name/header mismatches, hash the exact bytes, register with `registerThoughtSpec`, verify registry metadata/readback, and write `recommendedThoughtSpec*` release fields.
- Color Font v1 is an archived V1 dependency only. Do not add it to the current V2 constructor or mint flow.
- `tokenURI` must remain marketplace-compatible: ERC721 metadata interface, data URL JSON, embedded SVG image, PATH id/serial, exact visible lines and line hashes, conversation identity hash, work hash, provenance hash/payload, exact spec pair, renderer id, and creation-attestation state. Current V2 has no binary field.
- `ThoughtNFTV2` and its renderer must agree on `inshell.thought.metadata.v2.terminal-chat`; constructor compatibility must fail closed on metadata-profile drift.
- `tokenURI` must not embed full spec text. Use compact spec ID/hash metadata and `thoughtSpecOf(tokenId)` / registry readback for name/ref/full bytes.
- PATH movement setup must be frozen by deployment scripts after configuring `THOUGHT` movement quota.

## SVG rendering
- The current V2 renderer ID is `inshell.thought.svg.v2.terminal-chat-path-glyphs`.
- The V2 SVG artboard is 1024x1024: a 960x960 black canvas translated to `(32,32)` inside a 32-unit `#006100` outer frame. The canvas is not scaled. It uses `#00ba00` glyph fill, prompt at the upper right, and Agent response at the lower left.
- Canonical glyphs must be reviewed native SVG paths with deterministic metrics and wrapping. Do not use SVG `<text>`, `foreignObject`, browser font lookup, fallback fonts, or an embedded WOFF/TTF in the final onchain renderer. Source Code Pro remains a study reference only.

## Security
- Do not add secrets, live RPC keys, private keys, mnemonics, or real operator material.
- Treat local deployment addresses as generated state unless deliberately reviewed.
- Before commit, inspect staged diff and run `gitleaks detect --no-git --redact` when available.
