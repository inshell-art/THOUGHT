# AGENTS

## Scope
- THOUGHT contains the frontend and EVM contracts for minting one THOUGHT from one PATH movement unit.
- Contract code lives in `evm/`.
- Do not change PATH or Pulse contracts from this repo. Coordinate those changes in `path/` and `pulse/`.

## Commands
- Frontend tests: `npm test`.
- EVM build: `npm run build:evm`.
- EVM tests: `npm run test:evm`.
- Local EVM deploy: `npm run deploy:evm-local`.

## Artifact Publication and Consumption
- `docs/agent/THOUGHT_ARTIFACT_CONSUMPTION_BOOK.md` is authoritative for cross-repo artifact ownership, publication channels, integrity checks, consumer pinning, rollout, and rollback.
- Do not publish or consume candidate/stable artifacts from a dirty worktree. `latest` is discovery-only; production consumers must pin an immutable artifact ID and manifest hash.

## Publish-Ready Contract Invariants
- `ThoughtNFT.pathNft` and `ThoughtNFT.thoughtSpecRegistry` are immutable constructor dependencies.
- `ThoughtNFT.mint` consumes exactly one PATH `THOUGHT` movement unit atomically before minting a THOUGHT.
- Failed THOUGHT mints must not consume PATH, reserve text hashes, or increment supply.
- `promptLine` and `agentLine` are exact shortest-form UTF-8 lines, each 1 through 64 bytes. Preserve case, visible Unicode, and repeated internal U+0020 exactly; reject malformed UTF-8, controls, frozen disallowed scalars, non-ASCII whitespace, and outer spaces before PATH consumption. Display units are renderer measurements only and are not acceptance limits. The normative profile is `protocol/releases/v2/work/thought.work.v2.md`.
- Agent-line work hashes are globally unique. The same exact `agentLine` cannot mint twice even with a different prompt or provenance; a changed Agent line is a different work.
- `ThoughtSpecRegistry` is the append-only source of truth for valid registered `THOUGHT.vN.md` spec names, ids, hashes, refs, and exact bytes.
- `ThoughtSpecRegistry.owner` is immutable and must be passed explicitly at deploy time. For Sepolia/mainnet, it must be the Ledger-backed ADMIN address, not a software deployer.
- There is no active/frozen/pinned THOUGHT spec at contract level. Do not reintroduce `activeSpecId`, `freezeActiveSpec`, `specAdmin`, or a required/latest spec gate in `ThoughtNFT`.
- `ThoughtNFT.mint` must require and store both `thoughtSpecId` and `thoughtSpecHash`; mint validates the exact registered pair before PATH consumption.
- Multiple registered THOUGHT spec versions may coexist and remain mintable in one collection.
- Deploy scripts must read `THOUGHT.vN.md` as raw bytes, reject BOM/CRLF/name/header mismatches, hash the exact bytes, register with `registerThoughtSpec`, verify registry metadata/readback, and write `recommendedThoughtSpec*` release fields.
- Color Font v1 is an archived V1 dependency only. Do not add it to the active `ThoughtNFT` constructor or mint flow.
- `tokenURI` must remain marketplace-compatible: ERC721 metadata interface, data URL JSON, embedded SVG image, PATH id/serial, visible line hashes, work hash, provenance hash/payload, exact spec pair, renderer id, and binary field.
- `tokenURI` must not embed full spec text. Use compact spec ID/hash metadata and `thoughtSpecOf(tokenId)` / registry readback for name/ref/full bytes.
- PATH movement setup must be frozen by deployment scripts after configuring `THOUGHT` movement quota.

## SVG text rendering
- The formal renderer is `inshell.thought.svg.v2.binary-weave-32`: a 960x960 SVG with independent 512-bit prompt and Agent sources woven orthogonally into a deterministic packed 32x32 field.
- Text is emitted as centered SVG `<text>` elements using the contract font stack. Output rendering depends on the viewer environment fonts.

## Security
- Do not add secrets, live RPC keys, private keys, mnemonics, or real operator material.
- Treat local deployment addresses as generated state unless deliberately reviewed.
- Before commit, inspect staged diff and run `gitleaks detect --no-git --redact` when available.
