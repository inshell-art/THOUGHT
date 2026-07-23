# THOUGHT

THOUGHT is a human prompt transformed by an Agent into a fully onchain work. The current protocol under implementation is THOUGHT V2. It is not yet published or deployed.

## Artistic Direction

> THOUGHT records the narrow channel where a human and an Agent meet. English is its protocol language—not as a claim of universality, but as the contemporary shared surface between people and machines. Every work accepts this constraint so its words retain one public and visual voice wherever the token travels.

> THOUGHT returns to the primitive computer age, when language had to pass through a narrow terminal alphabet. V2 keeps that constraint as its form: enough symbols for dialogue, hesitation, interruption, and connection, without typographic ornament or programming syntax.

These statements are the approved artistic direction for V2. The earlier binary-weave/visible-Unicode implementation was never published or deployed and is now an historical attempt. It does not consume a public protocol version. The Terminal English/chat/path-glyph work is therefore V2, not V3.

The approved design decisions and downstream App obligations for that future refactor are recorded in [docs/agent/THOUGHT_ENGLISH_CHAT_REFACTOR_DECISIONS.md](docs/agent/THOUGHT_ENGLISH_CHAT_REFACTOR_DECISIONS.md).

## Product Contract

Each work has two visible UTF-8 lines:

```text
promptLine = visible human material
agentLine  = visible Agent return
```

The human supplies the prompt, reviews the result, chooses a PATH, authorizes the wallet transaction, and decides whether to mint. The Agent receives one sealed task and returns one `agentLine`; it has no authority to select PATH, use a wallet, or mint.

`ThoughtNFTV2.mint(MintThoughtInput)` is permissionless. A direct caller can mint without an Agent run when PATH authorization, exact registered-spec validation, Terminal English validation, unique conversation validation, and non-empty provenance requirements pass.

The exact ordered pair `(promptLine, agentLine)` identifies a work. Repeating either line with a different counterpart remains a distinct conversation; repeating the exact pair is rejected. Both lines accept `1..64` bytes from the frozen 76-character Terminal English repertoire, with no outer or repeated internal spaces. Punctuation-only lines remain valid.

Every mint also carries exact `declaredAgent` and `declaredModel` context
labels as typed state and canonical provenance declarations. Official
creation attestation binds their exact UTF-8 hashes. Only a token with a valid
nonzero attestation digest publishes them as `Attested Agent` and `Attested
Model` marketplace traits; an unattested token omits Agent/Model traits. The
labels remain `declared-unverified` because attestation proves the authorized
App signed the claim, not that the labels are objectively true. Declarations
do not affect conversation identity, work hash, or artwork.

## Current V2 Candidate Source

- [evm/src/v2/ThoughtNFTV2.sol](evm/src/v2/ThoughtNFTV2.sol): V2 ERC-721 mint foundation.
- [evm/src/v2/ThoughtV2WorkProfile.sol](evm/src/v2/ThoughtV2WorkProfile.sol): Terminal English validator.
- [evm/src/v2/ThoughtV2ContextProfile.sol](evm/src/v2/ThoughtV2ContextProfile.sol): declaration-label validator.
- [evm/src/v2/ThoughtV2Identity.sol](evm/src/v2/ThoughtV2Identity.sol): ordered conversation and renderer-bound work hashes.
- [evm/src/v2/IThoughtRendererV2.sol](evm/src/v2/IThoughtRendererV2.sol): renderer boundary; the path-glyph implementation is still pending.
- [evm/src/ThoughtSpecRegistry.sol](evm/src/ThoughtSpecRegistry.sol): append-only exact-spec registry.
- [evm/src/ThoughtSpecRegistryV2.sol](evm/src/ThoughtSpecRegistryV2.sol): append-only compact protocol-release registry.
- [protocol/current/v2/README.md](protocol/current/v2/README.md): current unregistered V2 protocol candidate, including declaration, metadata, provenance, and mint-input artifacts.
- [docs/agent/THOUGHT_ENGLISH_CHAT_REFACTOR_DECISIONS.md](docs/agent/THOUGHT_ENGLISH_CHAT_REFACTOR_DECISIONS.md): frozen decisions and remaining release gates.

The historical binary-weave attempt remains in the old unversioned contract, `protocol/releases/v2`, and `artifacts/thought-v2` paths as archive evidence. Those paths are explicitly non-current and non-publishable. V1 contracts live in `evm/legacy/`.

## Renderer

The V2 renderer ID is `inshell.thought.svg.v2.terminal-chat-path-glyphs`.

The canonical SVG geometry is a 1024x1024 artboard: an unchanged 960x960 black canvas translated to `(32,32)` inside a 32-unit `#006100` outer frame. The canvas is not scaled. Deterministic project-owned path glyphs use `#00ba00`, with the prompt at the upper right and Agent response at the lower left. Browser text, fallback fonts, `foreignObject`, and the study Source Code Pro font are not part of the final renderer. Glyph implementation, parity vectors, and release measurements remain pending.

## Development

```bash
npm install
npm run build:evm
npm run test:evm
npm test
npm run build
```

The existing deployment, gallery-minting, protocol-build, and signing-pack scripts target the archived binary-weave attempt. They must not be used to publish or deploy current V2. Current V2 deployment tooling will be added only after the path-glyph renderer, metadata, provenance, schemas, vectors, and exact release manifest are complete.
