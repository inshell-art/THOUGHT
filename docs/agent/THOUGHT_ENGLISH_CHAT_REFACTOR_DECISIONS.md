# THOUGHT English Chat Refactor Decisions

Date: 2026-07-21

Status: V2 protocol direction frozen; contract foundation implemented and
tested; path-glyph renderer and release publication pending

This document records decisions for the current THOUGHT V2 contract, work
profile, and renderer. The earlier binary-weave/visible-Unicode implementation
was never published or deployed; it is now an historical attempt and has no
release authority. The Terminal English work becomes V2 directly. No V3
version is created by this refactor.

## Artistic premise

> THOUGHT records the narrow channel where a human and an Agent meet. English
> is its protocol language—not as a claim of universality, but as the
> contemporary shared surface between people and machines. Every work accepts
> this constraint so its words retain one public and visual voice wherever the
> token travels.

> THOUGHT returns to the primitive computer age, when language had to pass
> through a narrow terminal alphabet. V2 keeps that constraint as its form:
> enough symbols for dialogue, hesitation, interruption, and connection,
> without typographic ornament or programming syntax.

English is a deliberate formal constraint of the work, not a workaround for
font availability. The contract can enforce an objective character repertoire;
the official creation App and Agent workflow must enforce the English-language
creative policy without pretending that Solidity can judge language or
meaning.

The narrative evokes the early terminal era; it does not claim to reproduce a
specific historical terminal or the complete ASCII graphic table.

## Contract implementation snapshot

The first contract-side V2 implementation is present alongside the retained
binary-weave attempt without mutating that historical evidence:

- `evm/src/v2/ThoughtNFTV2.sol` implements the new ERC-721 mint boundary,
  exact pair uniqueness, PATH-before-state atomicity, spec/release pinning,
  opaque provenance storage, optional creation-attestation binding, and V2
  renderer delegation;
- `evm/src/v2/ThoughtV2WorkProfile.sol` enforces the frozen 76-character work
  alphabet, 1-through-64-byte lines, and canonical spacing;
- `evm/src/v2/ThoughtV2Identity.sol` implements the frozen ordered conversation
  and work hashes;
- `evm/src/v2/ThoughtV2ContextProfile.sol` keeps declaration labels separate
  from the Terminal English artwork constraint;
- `evm/src/v2/IThoughtRendererV2.sol` freezes the contract/renderer boundary
  without pretending that the unfinished glyph library is production-ready;
- `src/thought-v2-terminal-work-profile.ts` is the matching reference implementation,
  and the earlier chat study now consumes it through a compatibility facade;
- `src/thought-v2-context-profile.ts` is the matching declaration-label
  reference implementation;
- `protocol/current/v2/context/`, `agent/`, `metadata/`, `provenance/`,
  `contract/`, and `work/` hold the candidate profiles and schemas;
- `protocol/current/v2/release-input.json` records required final-manifest
  roles but is deliberately non-registerable while release artifacts remain
  incomplete; and
- `protocol/current/v2/work/` and
  `protocol/current/v2/conformance/work-hash-vectors.json` hold the formal
  candidate profile and cross-language vectors.

At the declaration carry-forward snapshot, all 163 Foundry tests and all 133
TypeScript tests pass, the production TypeScript/Vite build passes, and
`ThoughtNFTV2` runtime bytecode is 17,351 bytes, leaving 7,225 bytes under the
EIP-170 limit. Passing candidate tests does not approve a V2 release or
renderer.

## Frozen Terminal English line rules

The V2 work profile is `inshell.thought.work.v2.terminal-english-64`. It defines
a closed 76-character subset of printable US-ASCII shared by the contract
validator, canonical renderer, reference TypeScript, fixtures, and official
App consumers.

The exact accepted repertoire is:

- U+0020 SPACE;
- U+0030 through U+0039 (`0-9`);
- U+0041 through U+005A (`A-Z`);
- U+0061 through U+007A (`a-z`);
- the 13 marks `.,?!:;'"-()/&`.

The punctuation is conversational rather than the complete ASCII punctuation
table: sentence rhythm (`.,?!`), clause structure (`:;`), contractions and
quotation (`'"`), interruption and grouping (`-()`), alternatives (`/`), and
connection (`&`). Symbols primarily associated with money, arithmetic,
programming, handles, and shell syntax remain outside the work profile.

The following decisions are approved:

- Each prompt and Agent line is an exact, non-empty string of 1 through 64
  accepted ASCII bytes. Because every accepted scalar is one byte, the byte
  and character counts are equal.
- Leading and trailing spaces are rejected.
- Repeated internal spaces are rejected to preserve the compact visual voice.
- Accepted case, punctuation, and spacing remain exact. No component may trim,
  collapse, normalize, case-fold, translate, repair, or otherwise rewrite a
  submitted line.
- Punctuation-only lines are valid. There is deliberately no requirement that
  a line contain a letter or digit. Works such as `...` and `!!!` can carry
  meaning.
- The contract enforces only objective byte and character-table rules. It must
  not attempt to decide whether text is grammatical English, meaningful, or
  aesthetically acceptable.
- Tabs, line breaks, controls, non-ASCII bytes, and unsupported printable ASCII
  symbols are rejected.

The prompt and Agent lines retain different conversational roles, but neither
line is subordinate when defining the identity of a finished work.

## Pair uniqueness

Global uniqueness moves from the exact Agent line alone to the ordered pair of
exact prompt and Agent lines.

The required behavior is:

```text
same prompt + same Agent line      => duplicate
same prompt + different Agent line => distinct work
different prompt + same Agent line => distinct work
(prompt, Agent) != (Agent, prompt)  => ordered roles remain significant
```

The implementation replaces `agentIdentityHash` with
`conversationIdentityHash`. Its frozen domain and formula are:

```text
conversationIdentityDomain = keccak256("INSHELL_THOUGHT_V2_CONVERSATION_IDENTITY")
conversationIdentityHash = keccak256(abi.encode(
  conversationIdentityDomain,
  promptLineKeccak256,
  agentLineKeccak256
))
```

The conversation identity remains distinct from `workHash`. Pair uniqueness
is the identity policy for the two exact utterances. V2 has no binary field;
its work hash binds the renderer and exact line hashes:

```text
workDomain = keccak256("INSHELL_THOUGHT_V2_WORK")
workHash = keccak256(abi.encode(
  workDomain,
  rendererIdHash,
  promptLineKeccak256,
  agentLineKeccak256
))
```

Duplicate-pair rejection must occur before PATH consumption. A failed
duplicate mint must not consume PATH, reserve identity, increment supply, or
leave any other state change.

The refactor must update every surface that currently names or derives
`agentIdentityHash`, including contract storage and getters, errors and events,
ABI artifacts, reference TypeScript, schemas, provenance commitments,
attestation-related parity checks, fixtures, conformance vectors, token
metadata, gallery diagnostics, and consumer documentation.

## Deterministic native-SVG glyph set

The small approved character table makes a project-owned vector glyph set
practical. This is exactly the proposed “deterministic vector glyph set for the
small approved ASCII repertoire.”

The canonical onchain renderer should define each accepted visible character
as reviewed SVG path geometry and place those glyphs using deterministic
coordinates and advances. Space advances the cursor but draws no path. The
renderer must derive wrapping and alignment from these fixed metrics rather
than browser font measurement.

The canonical artwork should therefore require none of the following:

- SVG `<text>` rendering;
- `font-family` lookup or OS fallback fonts;
- `foreignObject` or browser HTML layout;
- an embedded WOFF/TTF font and its shaping engine.

This removes font substitution and text-measurement drift from the canonical
geometry. Rasterizers can still differ slightly in antialiasing, but the glyph
outlines, positions, wrapping, and composition remain defined by the token.

The V2 renderer ID is
`inshell.thought.svg.v2.terminal-chat-path-glyphs`. Its frozen composition is:

- 960 by 960 SVG view box;
- pure black `#000000` background;
- pure green `#00ba00` glyph fill;
- prompt at the top right and Agent line at the bottom left;
- 48-unit reference glyph scale and 64-unit line height;
- 57.6-unit horizontal inset on both sides, equal to two Source Code Pro study
  character advances;
- 844.8-unit text-field width and 256-unit field height;
- greedy word wrapping, hard character breaks only when one word exceeds the
  row capacity, no inserted hyphens, and exact deterministic baselines;
- Source Code Pro is the visual study reference only; the canonical token uses
  reviewed SVG path glyphs and no font resource.

The final row capacity and baseline coordinates must be derived from and
frozen with the reviewed V2 path-glyph metrics before release publication.
The artwork-green slider is a lab instrument only; `#00ba00` is the immutable
V2 artwork color.

The raw prompt and Agent strings must remain available in contract getters,
metadata, and canonical provenance. The path-based SVG is the visual encoding,
not a replacement for machine-readable text. The SVG should also expose a
useful accessible description where marketplace and renderer constraints allow
it.

Before adoption, the glyph set and renderer must pass:

- complete character-table coverage and missing-glyph rejection;
- punctuation-only, boundary-length, and wrapping vectors;
- browser, marketplace, resvg, and libvips/sharp rendering tests;
- bytecode-size, deployment-gas, mint-gas, and `tokenURI` size measurements;
- exact Solidity/TypeScript renderer parity;
- visual review at marketplace thumbnail and full-poster sizes.

The narrow repertoire makes path glyphs substantially more feasible than
embedding a general-purpose font, but feasibility must be demonstrated by the
measurements above before the renderer becomes a release artifact.

## V2 metadata direction

V2 removes binary-weave fields and traits. Canonical metadata must bind the
PATH id and serial, exact prompt and Agent strings and byte counts, their line
hashes, `conversationIdentityHash`, `workHash`, renderer id, protocol release,
selected THOUGHT spec, provenance hash and payload, and creation-attestation
state.

The old unpublished V2 attempt's Agent and model declarations remain valuable
and are carried into current V2 as exact typed mint fields under
`inshell.thought.context.v2.visible-utf8-64`. They appear in canonical
provenance as `process.agentDeclaration` and `process.modelDeclaration`, and in
technical metadata with their exact UTF-8 Keccak-256 hashes, source, and
`declared-unverified` status. Their exact hashes are creation-attestation claim
inputs. A valid attestation proves the authorized signer bound the declarations
to the mint facts; it does not prove either declaration true. Neither
declaration affects conversation identity, work hash, or artwork.

The creation attestation is the marketplace trait gate. Attested metadata uses
this canonical attribute order:

1. `Attested Agent`
2. `Attested Model`
3. `Creation Attestation`
4. `Prompt Bytes`
5. `Agent Bytes`
6. `Pair Bytes`
7. `Prompt Length`
8. `Agent Length`

Unattested metadata omits Agent/Model traits and begins at `Creation
Attestation`, preserving the remaining six entries in the same order. The
typed declarations and provenance remain present for both cases. `Conversation
Form` is fixture-only and `Work Profile` is a technical property, so neither is
a marketplace trait.

This order is pinned by `inshell.thought.metadata.v2.terminal-chat` and the
renderer compatibility boundary. The final manifest must hash and list the
metadata profile, context profile, Agent declaration schema, provenance spec
and schema, mint-input schema, renderer profile, contract ABI, work profile,
and conformance vectors. Binary-weave and texture traits do not carry forward.

## Repository and ownership boundary

The `THOUGHT` repository owns this protocol and contract refactor: the work
profile, validation rules, uniqueness formula, Solidity contracts, canonical
SVG renderer, schemas, vectors, ABIs, fixtures, release manifest, and producer
handoff.

The production Inshell THOUGHT creation App is owned and implemented in the
`inshell.art` repository. Do not implement that App in `THOUGHT`. During the
refactor, App requirements are recorded here so they can be turned into a
precise downstream handoff after the contract release is complete.

## Requirements for the eventual inshell.art handoff

The final producer-to-consumer handoff must require the `inshell.art` agent to:

- pin the approved immutable release artifact ID and manifest hash, then verify
  every embedded artifact before enabling creation or minting;
- use the released character table, byte limits, spacing rules, pair-identity
  formula, schemas, ABIs, and conformance vectors rather than local copies;
- collect exact `declaredAgent` and `declaredModel` values through the released
  context profile, preserve their declaration sources, and keep their status
  `declared-unverified` even for officially attested works;
- maintain typed-state parity for declaration labels across mint input,
  canonical provenance, metadata declaration objects, and the two declaration
  hashes in the creation-attestation claim; publish `Attested Agent` and
  `Attested Model` marketplace traits only for a valid official attestation;
- validate input before Agent execution and wallet intent, while reporting
  invalid input without silently modifying it;
- preserve punctuation-only works and avoid adding an App-only letter-or-digit
  requirement;
- treat English as the official creative policy while recognizing that the
  contract validates only the objective character repertoire;
- submit the exact approved prompt to the Agent and preserve the exact returned
  Agent line; invalid output causes a rejected or restarted run, not post-run
  rewriting or translation;
- preflight duplicate status by the released ordered-pair identity getter, with
  the contract remaining authoritative at mint time;
- build canonical provenance through the released shared builder and verifier,
  including the new pair identity and exact line commitments;
- bind official creation attestations to the released provenance and mint facts
  through a protected signer service; no production private key may exist in
  browser code, frontend environment files, fixtures, or source control;
- display and download contract-returned canonical metadata, SVG, and
  provenance rather than recreating canonical artwork in the frontend;
- allow UI fonts, including Source Code Pro, for surrounding App chrome while
  treating the onchain path-glyph SVG as the artwork authority;
- pass the producer's positive, negative, parity, duplicate-pair, provenance,
  attestation, and rendering conformance suites before rollout;
- fail closed with an explicit incompatible-release state when its pinned
  artifacts do not match the deployed contract and registry state.

These requirements are preparatory only. After implementation and artifact
regeneration, the final immutable values, addresses, hashes, ABI paths, vector
results, and rollout sequence must be written into the existing
`IN_SHELL_ART_V2_PROTOCOL_REFINEMENT_HANDOFF.md` (or its reviewed successor).
The current handoff must not be rewritten to describe unshipped behavior.

## Contract-side completion checklist

The refactor is not ready for downstream rollout until all of the following are
complete:

- approve and freeze the exact character and punctuation table;
- approve the final line byte limit and deterministic chat layout metrics;
- specify and implement ordered prompt-plus-Agent uniqueness;
- implement and visually review the complete path-glyph renderer;
- update the work, renderer, provenance, attestation, and integration profiles;
- update Solidity, reference TypeScript, schemas, builders, verifiers, and
  deployment tooling;
- regenerate ABIs, fixtures, vectors, release bundles, manifest, and reports;
- run contract, atomicity, parity, renderer, provenance, attestation, artifact,
  gas, bytecode-size, and cross-renderer regression tests;
- publish an approved immutable clean-tree release and contract deployment;
- replace the preparatory requirements above with a concrete downstream
  handoff containing the released identities and pins.
