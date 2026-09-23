# THOUGHT cross-repository ownership and wallet boundary handoff

Date: 2026-08-04

Audience: the THOUGHT feature owner and all other agents working in
`inshell.art/`, including the shared-wallet, PATH, site-shell, routing, and
deployment owners

Status: owner-approved coordination boundary

Correction: this revision supersedes the 2026-08-03 wording. The earlier
wording correctly located the production App source in `inshell.art/`, but was
ambiguous about agent ownership. The THOUGHT feature owner—not another general
`inshell.art/` agent—owns and implements the THOUGHT App.

Production authorization: none. This handoff does not authorize a persistent
deployment, registry transaction, production signer, staging promotion, or
mainnet transaction.

## Boundary in one sentence

One THOUGHT feature owner owns the entire THOUGHT product flow across two
repositories: Contract code and immutable Contract releases live in
`THOUGHT/`, while production THOUGHT App source lives in `inshell.art/` under
the same feature owner's responsibility. Other `inshell.art/` agents own shared
infrastructure and adjacent products, not the THOUGHT feature itself.

## Repository ownership

### `THOUGHT/`

`THOUGHT/` owns all THOUGHT-specific Contract concerns:

- `ThoughtNFTV2`;
- `CreationAttestationVerifierV2`;
- `ThoughtSpecRegistry`;
- `ThoughtSpecRegistryV2`, which is the current protocol-release registry
  despite its historical name;
- canonical metadata and SVG renderer contracts;
- THOUGHT interfaces and Solidity libraries;
- Contract tests, deployment tooling, release qualification, compiled ABI and
  bytecode, manifests, fixtures, and integrity evidence;
- the Contract-side integration contract presented to downstream consumers.

`THOUGHT/` may contain lab and reference pages for Contract development and
parity testing. Those pages are not the production THOUGHT App.

### THOUGHT-owned code inside `inshell.art/`

The same THOUGHT feature owner that owns the Contracts also owns and implements:

- the `inshell.art/thought` create, gallery, and work-detail experiences;
- THOUGHT work-input UX and client-side preflight validation;
- canonical provenance construction and local verification for the official
  App path;
- integration with the Creation Attestation signing service;
- exact `ThoughtNFTV2.mint()` calldata assembly;
- the THOUGHT Contract artifact lock and THOUGHT-specific chain configuration;
- chain-first post-mint verification;
- THOUGHT-specific tests, fixtures, documentation, and error handling.

This is feature ownership across repositories. The fact that these files live
in `inshell.art/` does not transfer their implementation ownership to another
agent working elsewhere in that repository.

### Other agents inside `inshell.art/`

Other `inshell.art/` agents own or maintain:

- shared wallet connection, account, chain, transaction, receipt, and error
  infrastructure;
- the PATH frontend and PATH-specific transaction orchestration;
- the site shell and unrelated products;
- shared navigation and route registration;
- common design-system components;
- build, hosting, and deployment infrastructure.

Those agents provide stable shared interfaces to the THOUGHT App. They must not
independently implement, replace, or rewrite THOUGHT-owned App code, provenance,
attestation integration, mint assembly, gallery semantics, or Contract pins.
If another agent has already started modifying THOUGHT-owned files, it must
pause, preserve its diff, and coordinate ownership before continuing.

The production frontend must remain in `inshell.art/`. It must not be hosted
from `THOUGHT/` and then embedded, proxied, or dynamically loaded into
`inshell.art`. A shared public origin is a deployment-routing concern, not a
reason to combine source ownership.

### `PATH/`

The PATH repository owns `PathNFT`, PATH minting rules, movement-unit policy,
consume authorization, and its canonical ABI. THOUGHT must not fork or modify
PATH Contract behavior locally.

`THOUGHT/` owns only the narrow interface it needs to call PATH. That interface
must remain byte-for-byte ABI compatible with canonical PATH, including the
`uint32` return from `consumeUnit()`.

## Product ownership versus repository ownership

One THOUGHT feature owner implements the complete THOUGHT flow while preserving
both repositories:

- Contract changes are made, reviewed, tested, released, and tagged in
  `THOUGHT/`;
- THOUGHT App changes are made and reviewed in `inshell.art/`;
- the App consumes an immutable THOUGHT release rather than compiling arbitrary
  THOUGHT source or copying ABI fragments by hand;
- cross-repository changes use an explicit handoff, immutable pin, compatibility
  checks, and separate commits in each repository.

Other `inshell.art/` agents own shared infrastructure or adjacent products.
They do not own the THOUGHT App and must not silently redefine THOUGHT Contract
semantics, metadata, provenance commitments, attestation claims, mint
arguments, or presentation semantics.

## Wallet boundary

Do not say that the repository or App "owns the wallet." The human owns and
controls the user wallet. The shared-infrastructure agent in `inshell.art/`
owns the protocol-neutral wallet integration; the THOUGHT feature owner owns
the THOUGHT-specific intent, validation, calldata, and resulting UX that use
that integration.

Keep these authorities separate:

1. **User wallet**
   - chooses the account and network;
   - owns the PATH and resulting THOUGHT tokens;
   - approves PATH-specific authorization when required;
   - reviews and signs the THOUGHT mint transaction;
   - is the current `msg.sender`, PATH claimer, intended minter, and THOUGHT
     recipient.

2. **THOUGHT App Creation Attestation authority**
   - signs the exact EIP-712 Creation Attestation claim for the official App
     flow;
   - is not the user wallet;
   - does not submit the user transaction or own the minted token;
   - must be kept outside source control and browser-delivered code;
   - requires separate custody, rotation, pause, and epoch procedures.

3. **Protocol administration wallet**
   - owns registry and verifier administration where configured;
   - must be separate from ordinary users and the App runtime;
   - must use reviewed operator custody for persistent networks.

4. **Software deployer**
   - may deploy disposable Anvil fixtures;
   - must not automatically become the persistent-network registry owner or
     attestation authority.

The shared wallet layer in `inshell.art/` may serve PATH and THOUGHT. Its owner
maintains the common connector and transaction interface. The THOUGHT feature
owner consumes that interface and owns the complete THOUGHT transaction intent
and validation. Sharing wallet connectors does not merge feature ownership.

## PATH mint versus THOUGHT mint

A PATH mint and a THOUGHT mint are different operations:

- the PATH frontend prepares PATH-specific transactions against PATH contracts;
- the THOUGHT App prepares THOUGHT-specific calldata against `ThoughtNFTV2`;
- the same user wallet may sign both;
- PATH Contract rules remain authoritative for PATH creation and movement
  consumption;
- THOUGHT Contract rules remain authoritative for THOUGHT creation.

During a THOUGHT mint, `ThoughtNFTV2` calls PATH atomically:

```text
THOUGHT App prepares and validates the mint draft
        |
        +-- builds exact canonical provenance for the official path
        +-- optionally obtains an App Creation Attestation
        +-- obtains the PATH consume authorization inputs
        +-- encodes ThoughtNFTV2.mint(...)
        |
User wallet reviews and signs the transaction
        |
ThoughtNFTV2 validates the exact mint fields
        |
        +-- verifies the selected registered spec pair
        +-- verifies an optional Creation Attestation
        +-- calls PathNFT.consumeUnit(..., claimer = msg.sender, ...)
        +-- stores typed state and exact provenance bytes
        +-- mints THOUGHT to msg.sender
```

PATH consumption and THOUGHT minting are one atomic transaction. If the THOUGHT
mint fails, PATH consumption, uniqueness reservation, and supply increment must
all revert.

## Current direct-caller constraint

The current V2 ABI binds the following to `msg.sender`:

- PATH `claimer`;
- Creation Attestation `intendedMinter`;
- THOUGHT minter and recipient.

Therefore the user wallet must call `ThoughtNFTV2.mint()` directly under the
current design. A generic relayer would become `msg.sender` and therefore the
claimer and minter. Do not add sponsored or relayed transactions without an
explicit Contract design change, security review, new release, and downstream
migration.

## Creation Attestation boundary

The THOUGHT App creates the claim and obtains its signature. The Contract does
not create the attestation.

`CreationAttestationVerifierV2` verifies that the configured authority signed
the exact claim bound to:

- attestation profile;
- immutable `ThoughtNFTV2` address;
- protocol release ID;
- selected spec ID and hash;
- work hash;
- provenance hash;
- Agent and Model hashes;
- run ID hash;
- intended minter;
- deadline;
- authority epoch.

A valid attestation means that the configured official App authority signed
those exact facts. It does not independently prove an AI provider, model,
browser, semantic quality, or truth of arbitrary prose inside provenance.

The sole Unattested encoding is the canonical empty proof. Manual and official
App workflows must not invent alternate partial-proof encodings.

## Provenance boundary

The THOUGHT App or a manual caller supplies `provenanceJson` in mint calldata.

For the official App path, the THOUGHT feature owner working inside
`inshell.art/` must:

- construct the canonical provenance object;
- serialize it deterministically;
- run the shared verifier before wallet intent;
- compute and bind the exact provenance hash in the Creation Attestation;
- submit the exact verified bytes without later mutation.

The Contract:

- accepts nonempty provenance within the byte envelope;
- stores the exact bytes opaquely;
- derives `keccak256(bytes(provenanceJson))`;
- does not parse JSON or certify its schema.

A gallery may parse provenance for presentation. Parsed provenance must never
override typed Contract state, manufacture attestation status, or replace the
Contract's canonical metadata.

## Metadata and artwork boundary

The Contract renderer is authoritative for token metadata and artwork.

The current portable metadata traits are exactly, in order:

1. `Agent`;
2. `Model`;
3. `Creation Attestation`;
4. `Prompt Bytes`;
5. `Agent Bytes`.

The App must read these from `tokenURI()` or typed Contract state. It must not
reintroduce removed marketplace traits or generate an alternate canonical SVG.

The canonical SVG comes from the on-chain renderer. The web UI may display,
scale, download, and surround it with application chrome, but it must not
reconstruct a visually similar work and present it as the Contract output.

The canonical top-level `external_url` is
`https://inshell.art/thought/<tokenId>`. The route is implemented by
`inshell.art/`; the URL value itself is emitted by the Contract renderer.

## Shared wallet implementation inside `inshell.art/`

A suitable conceptual ownership and module split is:

```text
inshell.art/
  wallet/             other agent: shared protocol-neutral wallet interface
  path/               other agent: PATH-specific product and transactions
  thought/
    create/           THOUGHT owner: work and provenance construction
    attestation/      THOUGHT owner: claim and signing-service integration
    mint/             THOUGHT owner: calldata and direct-wallet mint flow
    read/             THOUGHT owner: chain-first Contract readback
    gallery/          THOUGHT owner: collection and detail presentation
```

These paths are conceptual and do not require an immediate directory rename.
The important rule is that shared wallet infrastructure remains protocol
neutral while PATH and THOUGHT transaction builders remain protocol specific.

## Agent and Git boundary inside `inshell.art/`

Repository state is shared, but ownership is path- and branch-scoped.

The THOUGHT feature owner must:

- work on a dedicated `codex/thought-*` branch and preferably a separate
  worktree;
- stage only explicit THOUGHT-owned paths;
- never use a whole-worktree stage operation in a dirty multi-agent checkout;
- never commit, discard, format, move, or rewrite another agent's changes;
- keep THOUGHT-only implementation commits separate from shared-integration
  commits;
- push only the THOUGHT branch, never another agent's branch;
- never force-push or merge to `main` without explicit approval.

Other `inshell.art/` agents must:

- avoid modifying THOUGHT-owned App paths on their branches;
- avoid copying or independently rebuilding THOUGHT Contract artifacts;
- expose shared wallet, routing, site-shell, and deployment interfaces without
  taking ownership of THOUGHT feature behavior;
- coordinate before changing a shared interface consumed by THOUGHT.

Files such as route registries, shared navigation, wallet interfaces, chain
configuration, package manifests, lockfiles, site shells, and deployment
configuration are shared boundaries. A required change to one of these must be
minimal, explicitly reviewed, and isolated in a separate integration commit.

The production THOUGHT App must not have two agents implementing the same files
concurrently. If ownership is unclear, both agents stop before editing and
resolve the path boundary first.

## Immutable Contract artifact boundary

The current canonical portable Contract reference is:

- repository: `https://github.com/inshell-art/THOUGHT.git`;
- artifact ID: `thought-v2-canonical-portable-release-20260801-r1`;
- annotated tag: `thought-v2-canonical-portable-release-20260801-r1`;
- release commit: `9617892bda9d7f7e880b614f84f1b6360ad8a652`;
- stable receipt commit: `a19d1cc3c0e9ff81b2e31f89a4b327784d897854`;
- manifest SHA-256:
  `4d60feba36165c19a3cf3680078cc6baa7ba066c147ca607e5c82d0306f65b1a`.

This package is production-consumable as an immutable byte pin. It does not by
itself authorize a persistent-chain deployment or protocol registration.

The App must pin the immutable artifact ID and manifest hash. It must not use a
floating branch, `latest`, an uncommitted build, or individually copied ABI
fragments as its production Contract dependency.

## Change coordination

### When the THOUGHT Contract side changes

The THOUGHT owner must provide:

- a new immutable artifact ID;
- manifest hash and commit/tag pin;
- ABI and bytecode parity or explicit delta;
- affected claim, metadata, renderer, registry, and mint-input fields;
- migration and rollback instructions;
- tests and chain-first fixture evidence;
- an explicit statement of deployment authorization status.

The same THOUGHT feature owner updates the THOUGHT App's immutable Contract lock
only after the package passes integrity and compatibility checks. Other
`inshell.art/` agents must not update that lock independently.

### When the THOUGHT App side needs a Contract change

The THOUGHT feature owner must record the cross-repository Contract request with:

- the exact user-flow problem;
- the required on-chain invariant;
- proposed ABI or behavior delta;
- wallet, signer, PATH, metadata, and migration consequences;
- testable acceptance criteria.

The THOUGHT App must not patch a local ABI or emulate the desired Contract
behavior in production UI while waiting for a Contract release. Even though
one owner controls both sides, Contract changes still require a new reviewed
immutable package before App consumption.

### When shared wallet code changes

The shared-wallet owner must notify the THOUGHT feature owner and verify both
PATH and THOUGHT flows independently. A wallet refactor must not change:

- THOUGHT `msg.sender`;
- intended minter;
- PATH claimer;
- target chain;
- verifying Contract;
- typed-data domain;
- transaction destination or calldata.

## Acceptance checklist for `inshell.art/` agents

- [ ] The THOUGHT feature owner is recognized as owner of both `THOUGHT/`
      Contracts and the THOUGHT App code inside `inshell.art/`.
- [ ] Other `inshell.art/` agents do not implement or modify THOUGHT-owned App
      paths without an explicit ownership handoff.
- [ ] Production THOUGHT frontend remains in `inshell.art/`.
- [ ] THOUGHT development uses its own branch/worktree and explicit staging.
- [ ] Shared-file changes are isolated and coordinated with their owner.
- [ ] One immutable THOUGHT Contract release is pinned and hash-verified.
- [ ] Shared wallet code is protocol neutral.
- [ ] PATH and THOUGHT transaction builders remain separate.
- [ ] The connected user wallet directly calls `ThoughtNFTV2.mint()`.
- [ ] PATH authorization is obtained through the canonical PATH integration.
- [ ] The official App attestation key is never delivered to the browser.
- [ ] User, attestation-authority, admin, and deployer roles are not conflated.
- [ ] Official provenance passes canonical construction and verification before
      wallet intent.
- [ ] The signed claim binds the same facts submitted to the Contract.
- [ ] Post-mint verification reads chain state and `tokenURI()` as authoritative.
- [ ] The exact five canonical traits are preserved.
- [ ] The on-chain SVG is displayed rather than independently recreated.
- [ ] No persistent deployment or registration occurs without separate explicit
      approval.

## Escalation rule

Stop and hand the issue back across the repository boundary if a requested App
change would alter any of these:

- mint ABI or `msg.sender` semantics;
- PATH consume interface;
- Creation Attestation type, domain, authority, or epoch behavior;
- provenance hash binding;
- selected-spec or protocol-release validation;
- typed token state;
- metadata traits, order, or shape;
- SVG renderer identity or output;
- persistent deployment addresses or registry ownership.

Those are Contract-release concerns and require a reviewed `THOUGHT/` change,
new immutable artifact, and THOUGHT App migration. THOUGHT-specific provenance
presentation and App workflow remain owned by the THOUGHT feature owner inside
`inshell.art/`. Shared wallet UX, site routing, and deployment infrastructure
remain owned by the corresponding `inshell.art/` infrastructure agents and are
integrated through coordinated interfaces.
