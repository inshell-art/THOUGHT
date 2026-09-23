# THOUGHT V2 Declared Agent and Creation Attestation — Implementation Report

Date: 2026-07-17

Status: implemented and locally verified in a dirty worktree, including the
2026-07-17 canonical-provenance positive-path correction; draft protocol
artifacts and disposable Anvil evidence only; no commit, tag, push,
registration, public deployment, verification, pin, or publication performed

## Input and Baseline Pins

Implemented specification:

```text
file:       /Users/bigu/Downloads/THOUGHT_V2_CREATION_ATTESTATION_CONTRACT_DELTA_SPEC.md
byteLength: 39,826
sha256:     f748fa1c17d7385d7cfef7a6a3353d0192051c7084684eeebd9cf08b4c245cb8
```

The required implemented baseline was verified before this delta:

```text
file:       docs/agent/THOUGHT_V2_POST_IMPLEMENTATION_DELTA_IMPLEMENTATION_REPORT.md
byteLength: 16,055
sha256:     637be590264f8b773645288027f150d25a31e445dfff8217282b49c15addfc66
```

The baseline draft identities also matched the delta pin:

```text
manifest byte length:       3,779
manifest keccak256:         0xfc5a03d61535321f6290bc9168b7465bd7c468544266ff5ff0942c30414ab24e
protocol release ID:        0xfd282fd034e4643b8a2c67b91fa975d377e0ea6035744ee731533cb028decba7
renderer profile keccak256: 0x32c07a7f39b10a0155ff189d6cd7c709f215be12dcdc27e19763c34a8c184fe0
work profile keccak256:     0x1e0e2740604081c95050008efe7723ce211f9d03a01d88b03f94004cd9a2cd87
```

No stop-condition discrepancy was found.

## Checkout and Authority Posture

```text
repository: /Users/bigu/Projects/THOUGHT
branch:     codex/thought-v2-protocol-refinement
HEAD:       ec46cbf2f9ed5f7627c374bdf9963a38b5dad4c3
worktree:   intentionally dirty before and after this delta
```

The pre-existing dirty tree contained the prior post-implementation delta,
renderer extraction/gallery work, generated fixtures, and local state. Those
changes were preserved. This implementation did not rewrite archived V1 files
and did not discard unrelated work.

The operator authorized implementation. The specification authorized local
source edits, builds, tests, gas inspection, and disposable Anvil deployment.
It explicitly did not authorize version-control publication or any external
release action. `registrationAuthorized: false` therefore means registration
is intentionally not authorized, not that the draft manifest is technically
non-registerable.

## Canonical-Provenance Positive-Path Correction

The 2026-07-17 revision closes a fixture/protocol gap in the original local
implementation. The former Anvil gallery submitted
`inshell.thought.gallery-fixture.v1` as `provenanceJson`. That object described
the harness rather than the creation and therefore did not exercise the
production V2 provenance contract.

The correction makes the shared TypeScript implementation the only
positive-path provenance object/JCS builder and verifier:

```text
object builder:       buildThoughtProvenance(...)
JCS serializer:       serializeThoughtProvenance(...)
exact-byte builder:   buildCanonicalProvenance(...)
shared verifier:      verifyProvenance(...)
fail-closed entry:    buildVerifiedCanonicalProvenance(...)
source:               src/thought-v2-provenance.ts
schema:               inshell.thought.provenance.v2
serialization:        RFC 8785 JCS, UTF-8, no BOM, no final LF
commitment:           keccak256(exact submitted bytes)
maximum:              20,000 bytes
```

`buildVerifiedCanonicalProvenance` builds the object, serializes it once,
derives the hash from those exact bytes, checks the strict schema and protocol
bindings, checks every supplied typed fact, and throws instead of returning a
positive record on any mismatch.

Every positive producer now routes through that fail-closed entry point:

| Producer | Canonical variants and checks |
| --- | --- |
| reference/manual builder | `manual`; exact declarations, work, release, manifest, mint context, and hash |
| Agent-run builder | `agent-run`; same checks plus the frozen runtime-configured model source |
| protocol provenance vectors | one manual and one Agent-run positive; four isolated verifier-negative vectors |
| creation-attestation vectors | four canonical records; each claim `provenanceHash` equals its record hash |
| tokenURI vectors | four canonical records alternating manual/Agent-run and Unattested/mock-attested state |
| disposable Anvil/gallery minting | 60 canonical records; 30 manual/Unattested and 30 Agent-run/mock-attested |
| gallery downloads | exact tokenURI provenance bytes, verified again with typed onchain facts |

For an Unattested work only the proof is empty. Its provenance is still a
strict canonical creation record. For a mock-attested work, the EIP-712 claim
hashes the same verified bytes passed to `MintThoughtInput.provenanceJson`.
Attestation status and signature material remain outside provenance.

Fixture ID, fixture name, corpus name, source module/path/row, and duplicate
bookkeeping remain in local TypeScript fixture/config data. Tests inspect all
positive vectors, all 60 gallery records, token metadata, downloads, and
attestation claims and find none of those harness fields. The string
`inshell.thought.gallery-fixture.v1` is no longer a positive provenance schema.

Malformed opaque bytes remain only in explicitly negative boundary tests,
including the visibly named
`inshell.thought.provenance.v2.negative-tamper` fixture. Solidity still treats
provenance as bounded opaque bytes and does not parse JSON, enforce JCS, or
judge conformance. No production THOUGHT App or signing service was
implemented.

## Implemented Contract Semantics

### Declared Agent

`MintThoughtInput` and `ThoughtRecord` now contain exact `string
declaredAgent`. `declaredAgentOf(tokenId)` returns the stored bytes. The same
frozen safe-line validator used for the other typed declarations runs before
provenance/spec checks, attestation verification, and PATH consumption:

```text
UTF-8 bytes:                 1..64
shortest-form UTF-8:         required
valid Unicode scalar:       required
permitted whitespace:       internal U+0020 only
leading/trailing U+0020:    rejected
controls/invisibles/BOM:    rejected
frozen forbidden scalars:   rejected
normalization/rewriting:     none
```

Tests cover 1, 31, 32, and 64 bytes; safe non-ASCII; repeated internal spaces;
malformed raw calldata; every frozen scalar boundary; outer spaces; exact
case/combining-sequence preservation; and pre-PATH rejection.

`declaredAgent` affects its typed getter, metadata, provenance parity, and the
creation-attestation claim. It does not affect either creative line, line
hashes, Agent identity, work hash, packed binary field, loom metrics, SVG,
PATH authorization, or PATH consumption. Cross-collection same-artwork tests
prove different declarations and attestation states retain identical SVG,
binary-field, Agent-identity, and work hashes.

### Creation Attestation Verifier

The new non-upgradeable `CreationAttestationVerifier` uses OpenZeppelin
Contracts 5.4.0 `EIP712`, `ECDSA`, and `Ownable2Step` primitives. It accepts
exactly one canonical 65-byte low-s ECDSA signature from the current authority.
It is read-only during verification and stores no nonce or use marker.

Governance behavior is:

```text
initial authority epoch:       1
authority rotation:            owner only; nonzero authority; epoch +1 exactly once
epoch overflow:                rejected
pause/unpause:                 owner only
ownership transfer:            two-step
paused verifier:               rejects nonempty proofs only
empty proof while paused:      still permissionless and Unattested
historical minted metadata:    unchanged by pause, rotation, ownership, or NFT transfer
```

Governance events are reconstructable:

```solidity
event AttestationAuthorityRotated(
    address indexed oldAuthority,
    address indexed newAuthority,
    uint32 indexed oldEpoch,
    uint32 newEpoch
);

event AttestationPauseStateChanged(bool oldPaused, bool newPaused);
```

### NFT Integration and Atomicity

`ThoughtNFT` pins the verifier immutably. Construction requires verifier code
and the generated expected profile ID. There is no verifier setter.

The chosen ABI nests this exact proof in `MintThoughtInput`:

```solidity
struct CreationAttestationProof {
    bytes32 runIdHash;
    uint64 deadline;
    uint32 authorityEpoch;
    bytes signature;
}
```

The only empty proof is all-zero fields plus empty signature bytes. It skips
the verifier and stores digest zero. Every partial proof and every nonempty
signature length other than 65 bytes reverts before PATH.

For a nonempty proof, `ThoughtNFT` derives profile, NFT, protocol release,
work, provenance, declaration hashes, and intended minter itself. The caller
cannot supply trusted duplicate commitment fields. The contract verifies
before PATH, consumes PATH only after success, stores only the returned digest,
then writes state and safe-mints. It does not store the signature.

The final mint order is:

```text
reentrancy guard
exact validation of prompt, Agent, Declared Agent, and Declared Model
provenance size and registered spec validation
line/field/work/provenance/declaration hashing
Agent-identity and explicit work-hash uniqueness checks
empty/nonempty proof classification
STATICCALL-compatible verifier call for nonempty proof
PATH consumption
record and uniqueness writes
safe receiver mint
canonical events
```

Verifier, PATH, and receiver failures roll back token supply, ownership,
Agent/work reservations, attestation digest, and PATH state. Tests prove pause,
expiry, stale epoch, malformed proof, tampered work/provenance/declarations,
wrong signer, and front-running all fail before PATH. A proof can retry after a
pre-mint failure before deadline. After success, the same proof hits existing
Agent-line uniqueness before PATH.

The attested-only NFT event is named `CreationAttested`, which is permitted by
the delta's naming flexibility. It has the required three indexed values and
all required non-indexed facts:

```solidity
event CreationAttested(
    uint256 indexed tokenId,
    bytes32 indexed digest,
    address indexed attestor,
    bytes32 profileId,
    bytes32 workHash,
    bytes32 runIdHash,
    address minter,
    uint64 deadline,
    uint32 authorityEpoch
);
```

## Final ABI and Storage Layout

The active constructor is:

```text
ThoughtNFT(
  address pathNft,
  address thoughtSpecRegistry,
  address thoughtRenderer,
  address protocolRegistry,
  bytes32 protocolReleaseId,
  address creationAttestationVerifier
)
```

The mint tuple order is frozen as:

```text
promptLine
agentLine
declaredAgent
declaredModel
pathId
thoughtSpecId
thoughtSpecHash
provenanceJson
PATH deadline
PATH signature
creationAttestation(runIdHash, deadline, authorityEpoch, signature)
```

New authoritative surfaces include:

```text
declaredAgentOf(uint256)
creationAttestationDigestOf(uint256)
creationAttestationVerifier()
CREATION_ATTESTATION_PROFILE_ID()
WorkAlreadyMinted(bytes32,uint256)
CreationAttested(...)
```

The complete generated ABIs are:

```text
protocol/releases/v2/contract/abi/ThoughtNFT.json
protocol/releases/v2/contract/abi/ThoughtRenderer.json
protocol/releases/v2/contract/abi/CreationAttestationVerifier.json
```

`ThoughtRecord` occupies 352 in-place bytes, 11 base slots, before dynamic
string data. The pinned baseline record occupied 288 bytes, 9 base slots.

| Relative record slot | Final member |
| ---: | --- |
| 0 | `promptLine` string head |
| 1 | `agentLine` string head |
| 2 | `declaredAgent` string head |
| 3 | `declaredModel` string head |
| 4 | `provenanceJson` string head |
| 5 | `creationAttestationDigest` |
| 6 | `thoughtSpecId` |
| 7 | `thoughtSpecHash` |
| 8 | `pathId` |
| 9 | `pathSerial` |
| 10 | packed `minter` plus `mintedAt` |

The delta therefore adds two fixed per-record slots: the declaration head and
full digest. A 1–31-byte Declared Agent is inline in its head; 32 bytes uses a
head plus one data slot; 64 bytes uses a head plus two data slots. Digest zero
does not create a nonzero storage write for an unattested token; an attested
token writes the one full digest slot. There is no consumed-nonce slot.

Verifier storage uses OpenZeppelin EIP-712 fallback-string slots 0–1, owner
slot 2, pending owner slot 3, and one packed slot 4 for authority, `uint32`
epoch, and pause state.

## EIP-712 Identity and Parity

```text
profile name:
inshell.thought.creation-workflow-attestation.v1

profile ID:
0x0dc216b0e8f18cabaa4afee047e80f349ed3c2de67ace911157300279f74c669

domain name:    Inshell THOUGHT Creation Attestation
domain version: 1
domain chain:   block.chainid
domain verifier: CreationAttestationVerifier address

type hash:
0xb25f59a2cb340b2abb47a7640de7f553023098e131ad0dba2da0d4e1d88b199c
```

Exact type string:

```text
CreationAttestation(bytes32 profileId,address thoughtNft,bytes32 protocolReleaseId,bytes32 workHash,bytes32 provenanceHash,bytes32 declaredAgentHash,bytes32 declaredModelHash,bytes32 runIdHash,address intendedMinter,uint64 deadline,uint32 authorityEpoch)
```

Generated Solidity and TypeScript fixtures freeze chain ID 31337 and verifier
`0x4444444444444444444444444444444444444444`, producing domain separator:

```text
0xe8f46ccefdc8999c23551f7b793ea867dc675ce0e092c6ab8c1f2796423a18fc
```

| Vector | Struct hash | Final digest |
| --- | --- | --- |
| ASCII | `0x7ecc9296f4381bb3fa9bca8e769a58b24499b9de837afd2c86d023bf7999888e` | `0xd56bd2a90f6401c3de53fe152e66499b21cd76b4d478c77e968302dfda095005` |
| safe non-ASCII | `0x539db598462a2b7718a9ffb6d3337e33e320f33670a994e29a8d5197b793a92c` | `0xe20cfc98a3d5ac2203f6bdb9b001e42c183dd8c443cb3c019bb2df4089d239d9` |
| one-byte declarations | `0xbc31f8be60fea9ed121ebff53b64b1af82f7647e09c855810a0f7856a5faa86d` | `0x2f19907bbd58bdf359837ecb1ec3038204646a99ed8f6b59a19c19a8d9ad6690` |
| uint64/uint32 and 64-byte boundaries | `0xd1e2f5d607b468c8f49614c1c85ed6aa506310076675196ce225a13221451a85` | `0xef32c1abb4e485385b80b669ffe3b71adf63963d04f7803a5f232d0041d625e9` |

Tests also change every committed field, chain ID, verifier, NFT, signer,
deadline, and epoch; cover inclusive deadline, high-s, bad-v, wrong lengths,
zero run hash, rotation, pause, and ownership authorization.

## Metadata, Rendering, and Provenance

The exact front attribute count and order is now six:

```text
1. Prompt
2. Agent Response
3. Declared Agent
4. Declared Model
5. Creation Attestation
6. Texture Density
```

Creation Attestation values are exactly `Inshell THOUGHT App` and
`Unattested`. `Protocol` and `Binary Contrast` are absent from front
attributes. No Language, Writing System, provider, route, exact model ID,
PATH, provenance-conformance, or Loom Weight trait was added.

Ordered technical properties retain exact `loomWeight`, `bitDistance`,
protocol release, manifest, renderer, and work-profile facts, and add profile
ID, immutable verifier address, and digest. The `thought` payload adds exact
`declaredAgent` and the deterministic attestation label.

The immutable NFT delegates byte assembly to its immutable
`ThoughtRenderer`, but `ThoughtNFT.tokenURI()` remains the ERC-721 source and
passes only authoritative stored/immutable facts. This extraction was required
to keep `ThoughtNFT` below its 22 KiB review gate. Declarations and attestation
never enter SVG construction.

Provenance remains exact opaque caller-supplied bytes. Solidity does not parse
JSON or judge provenance. The reference schema/verifier mirrors:

```text
process.agentDeclaration.label = exact declaredAgent
process.modelDeclaration.label = exact declaredModel
```

Typed contract state wins on mismatch. The attestation signature is outside
the provenance bytes it commits to, avoiding a circular hash.

All generated positive tokenURI records now embed the exact canonical bytes
returned by `buildVerifiedCanonicalProvenance`; their metadata
`provenanceHash`, payload `provenanceHash`, downloadable bytes, and any
mock-attestation claim all use the same commitment.

Exact source parity anchors are:

```text
unchanged one-byte SVG keccak256:
0x9ecc3ca8c790cf007aa830ebfb23479f0b302f54b264d26fbcea6b0a1e199aa0

new deterministic full tokenURI keccak256:
0x82cd752028970a37c5415cc90aade9206112f739a4f4b196f3956f7721272fa4
```

The SVG anchor matches the baseline. The final tokenURI parity anchor also
includes canonical `inshell.thought.provenance.v2` bytes and therefore
supersedes both the baseline and the pre-correction delta anchor.

Generated tokenURI fixture commitments are:

| Fixture | Process | Provenance hash | tokenURI hash |
| --- | --- | --- | --- |
| `one-byte-cycle` | manual | `0xb07d80b4b994b9278efeded29885c0823920cf9e896e4f4acea707bc6fb2c385` | `0x99c9afc48bae689573bdd8727f62eca2217409d3cada6b70735c4d9fa3aebb8a` |
| `source-63-bytes` | Agent-run | `0x0678e3e6ada51228f0eadac308d3341060202795459eb0db4c74688579114bde` | `0x26aa89e5537424197394d20f57be67b77b9f8a0f231a25d5f1b9ea13ec2e09b2` |
| `source-64-bytes` | manual | `0x31df9a185444b6cfb0a2560c64d947ed0d334036056a2a88bfec6515e8b99a34` | `0x259978bf75a1ffabe3d775e7539b51ed9d1869b2d242a28337dabaf2fe77893d` |
| `direction-diagnostic-64-bytes` | Agent-run | `0x8776c9b2c2ab2937a76581ddd7b2abd57616e7939c017f24b15f94152a72c0da` | `0x188b481300b6ca42a29f84dd93bb1e0a1b1a7897379143fe8267498c55fa94e0` |

## Generated Draft Release Identity

All normative artifacts, fixtures, generated constants, ABIs, manifest, and
embedded bundle were regenerated together.

```text
artifact count:                        17
manifest byte length:                  4,629
manifest keccak256:                    0x5c0619f2af2dec68b9b64c0247d80e75900d7340ff9b8c8fe347b6b4b21d624d
protocol release ID:                   0x8a2db565b7175271e41f24155d0f30b429db305df71e459fa212264a1196232e
renderer profile keccak256:            0xc68ec09234f316cfdb19b96456e04f76f4f4674b3bb6596117cc39d124d1f6e1
work profile keccak256:                0xfaa37b147f7ea37a790f35b67707d895e1b4b11481434289d444faace3d72674
creation-attestation artifact hash:    0x60a68b8298ceec01ca8660c9ccb4af930d49aadb14e2088b9dd3431b5019ac1c
creation-attestation fixture hash:     0xc83a80149f6b0309dd159c04ecbf9dca3b0181557b6baa9d8c76eda70f9d3f4f
provenance specification hash:         0x7fbda4b751ca82f5487e5b5fb461b34edbaa0688293777209ee888efdfe03106
tokenURI fixture hash:                 0x601143d64e31c86e47d0b2cb53934abc850c85e8c9b4563cf7da29f4d0af01a0
registration authorized:               false
offline embedded bundle:               verified
```

The manifest hash and release ID were recomputed from regenerated exact bytes.
The renderer/work profiles did not change in this correction, so their
content-derived hashes remain stable.

## Gas, Calldata, Storage, and Code Size

Measurement posture is Solidity 0.8.28, optimizer 200, `viaIR`, Prague, no
bytecode hash, and disabled CBOR metadata.

### Bytecode and Deployment

| Contract | Runtime | Initcode | Deployment gas |
| --- | ---: | ---: | ---: |
| `ThoughtNFT` | 19,948 B | 21,148 B | 4,053,417 |
| `ThoughtRenderer` | 16,492 B | 16,518 B | 3,338,649 |
| `CreationAttestationVerifier` | 3,843 B | 5,193 B | 921,812 |

`ThoughtNFT` has 2,580 bytes of headroom below 22 KiB and 4,628 bytes below
EIP-170. The verifier deployment is 178,188 gas below the 1.1M gate. Every
runtime is below EIP-170 and every initcode is below the 49,152-byte hard
limit.

Compared with the pinned baseline, renderer-side tokenURI extraction changes
the split as follows:

| Contract | Baseline runtime | Final runtime | Runtime delta | Baseline deploy | Final deploy | Deploy delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `ThoughtNFT` | 22,199 B | 19,948 B | -2,251 B | 4,504,525 | 4,053,417 | -451,108 |
| `ThoughtRenderer` | 8,523 B | 16,492 B | +7,969 B | 1,740,591 | 3,338,649 | +1,598,058 |

Renderer plus NFT deployment is 7,392,066 gas versus baseline 6,245,116,
an aggregate increase of 1,146,950. The complete renderer + verifier + NFT
stack is 8,313,878 gas.

### Declared Agent and Mint Measurements

The same one-byte artwork/model payload was used for each declaration length:

| Declared Agent bytes | Mint execution gas | Calldata bytes | Gas delta from 1 byte | Persistent declaration slots |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 2,035,397 | 3,140 | — | 1 |
| 13 | 2,037,425 | 3,140 | +2,028 | 1 |
| 32 | 2,085,103 | 3,172 | +49,706 | 2 |
| 64 | 2,134,930 | 3,236 | +99,533 | 3 |

These are final positive-fixture measurements and include a complete canonical
V2 creation record. They intentionally supersede the smaller pre-correction
measurements that used fixture-only provenance. Because the payloads differ,
those older figures are not a valid protocol-level gas baseline.

For identical complete mint facts except proof status:

| Proof | Mint execution gas | Calldata bytes | Delta from empty |
| --- | ---: | ---: | ---: |
| canonical empty | 2,065,872 | 3,172 | — |
| current-authority EOA | 2,098,333 | 3,268 | +32,461 gas / +96 bytes |

Both standard complete positive mints remain below the 5,000,000-gas review
gate. The EOA measurement hashes and signs the exact same verified canonical
provenance bytes supplied to mint.

The attested-only event contributes four 32-byte topics including the event
signature and 192 bytes of non-indexed ABI data. The raw EVM log footprint is
therefore 320 bytes; the exact total attested execution delta, including
verifier call, digest storage, and event, is the measured 32,461 gas above.

### Views

| View | Gas | Returned bytes | Delta from empty |
| --- | ---: | ---: | ---: |
| `svgOf`, short | 7,885,093 | 18,246 | n/a |
| `tokenURI`, empty proof | 16,913,581 | 39,489 | — |
| `tokenURI`, attested | 16,918,478 | 39,513 | +4,897 gas / +24 bytes |
| `tokenURI`, 64-byte model | 17,235,844 | 39,693 | n/a |

The explicit maximum-size canonical Agent-run boundary fixture is 20,000
bytes. Its mint uses 14,419,145 gas and `provenanceOf()` readback uses 145,401
gas, returning all 20,000 exact bytes. This is a storage/opaque-boundary
measurement, not the standard complete-mint review case.

## Verification Results

Final verification:

```text
npx tsc --noEmit          passed
npm test                  passed; 79 tests across 13 files
npm run build             passed
npm run protocol:build    passed; 17 exact-byte artifacts regenerated
npm run protocol:check    passed; deterministic offline bundle verified
npm run build:evm         passed
npm run test:evm          passed; 147 tests
  CreationAttestationVerifier 10
  active ThoughtNFT V2        76
  ThoughtSpecRegistryV2        5
  archived V1                 56
forge fmt --check         passed for all changed active Solidity/test files
git diff --check          passed
```

Provenance-specific regression evidence within those totals is:

```text
shared provenance/JCS suite:          7 passed
creation-attestation vector suite:    4 passed
tokenURI exact-byte parity suite:     3 passed
gallery provenance/download suite:   11 passed
active ThoughtNFT V2 suite:           76 passed
```

The suites assert deterministic regeneration, no BOM/final LF, manual and
Agent-run acceptance, strict schema and typed-state parity, exact Keccak-256,
mock-claim binding, tokenURI/download equality, and absence of positive
`inshell.thought.gallery-fixture.v1` or fixture/corpus/source fields.

The archived V1 test sources are unchanged in the worktree and all 56 V1 tests
pass. Their current SHA-256 anchors are:

```text
ThoughtNFTV1.t.sol:
c10c0521cbb22d901bba5c36f9e50ac0d009131425f58fdbd2deca3871b6a283

ThoughtPreviewerV1.t.sol:
586da01d55ae42bfc65fc08d7e6549bbdcbe26d0701e8db8994d8df2f67118c4
```

Security coverage includes all declaration validation classes, exact EIP-712
parity, wrong domain/NFT/release/work/provenance/declaration/run/minter,
deadline boundaries, epoch rotation, pause, ownership authorization, canonical
ECDSA checks, retry/replay/front-run behavior, PATH and receiver rollback,
reentrancy, raw calldata, exact six-trait metadata, technical-property order,
Solidity/TypeScript tokenURI parity, and metadata stability across governance
and ownership changes.

## Disposable Anvil Evidence

A running local Anvil process was reset to clean ephemeral chain state at chain
ID 31337. `npm run devnode:gallery` rebuilt the draft, deployed the current
contracts, froze the local PATH THOUGHT movement, and minted 60 works from 61
fixture rows. One duplicate Agent line was correctly omitted.

```text
RPC:        http://127.0.0.1:8545
PATH:       0x5FbDB2315678afecb367f032d93F642f64180aa3
THOUGHT:    0x4C4a2f8c81640e47606d3fd77B353E87Ba015584
renderer:   0xdbC43Ba45381e02825b14322cDdd15eC4B3164E6
verifier:   0x04C89607413713Ec9775E14b954286519d836FEf
registry:   0x5081a39b8A5f0E35a8D959395a630b68B74Dd30f
supply:     60
attested:   30
unattested: 30
```

`npm run devnode:gallery:mint` then re-read all 60 existing tokens and their
actual `ThoughtNFT.tokenURI()` values. For every token it confirmed exact
stored provenance bytes/hash, prompt/Agent/declaration/PATH/work parity,
release bindings, status/digest mapping, and tokenURI provenance/hash/digest
surfaces. No token was reminted during that readback pass.

The live gallery was reloaded at
`http://127.0.0.1:5177/thought-v2-lab.html`. DOM/download inspection found 60
cards and 60 unique downloadable canonical records: 30 `manual` and 30
`agent-run`, all schema `inshell.thought.provenance.v2`, with no
fixture/corpus/source markers and no browser warning/error.

| Token | Status | tokenURI bytes | tokenURI keccak256 |
| ---: | --- | ---: | --- |
| 1 | Unattested | 43,789 | `0xae3cf3e559b4e0969da0e0311f38b21f9479dd1c6802934f536391dd7a0e4721` |
| 2 | Inshell THOUGHT App | 43,769 | `0x581d38d857550fa2d052a744c891b14bd72c54ac491297b24f5e7246d44d4af0` |
| 60 | Inshell THOUGHT App | 48,129 | `0xdbb7985281b287942b4e56861cb09b845d6608b66968bacbc190dc33044ac1c3` |

This is disposable local-chain evidence only. The local authority is the
well-known non-production Anvil account. No real signing key or PATH unit was
used.

## Delta-Owned Changed Paths

Contract and toolchain:

```text
package.json
package-lock.json
evm/foundry.toml
evm/src/CreationAttestationVerifier.sol
evm/src/ICreationAttestationVerifier.sol
evm/src/IThoughtRenderer.sol
evm/src/ThoughtNFT.sol
evm/src/ThoughtRenderer.sol
evm/src/ThoughtReleaseConstants.sol
evm/test/CreationAttestationVerifier.t.sol
evm/test/ThoughtNFT.t.sol
evm/README.md
```

Protocol and generated artifacts:

```text
protocol/releases/v2/attestation/thought.creation-workflow-attestation.v1.md
protocol/releases/v2/attestation/fixtures/creation-attestation-vectors.json
protocol/releases/v2/contract/thought.mint-input.v2.schema.json
protocol/releases/v2/contract/thought-nft.v2.interface.md
protocol/releases/v2/contract/abi/CreationAttestationVerifier.json
protocol/releases/v2/contract/abi/ThoughtNFT.json
protocol/releases/v2/contract/abi/ThoughtRenderer.json
protocol/releases/v2/art/THOUGHT.v2.md
protocol/releases/v2/agent/thought.agent-declaration.v1.schema.json
protocol/releases/v2/agent/thought.agent-result.v2.schema.json
protocol/releases/v2/work/thought.work.v2.md
protocol/releases/v2/work/thought.work.v2.profile.json
protocol/releases/v2/renderer/thought.renderer.v2.profile.json
protocol/releases/v2/renderer/thought.svg.v2.binary-weave-32.md
protocol/releases/v2/renderer/fixtures/*.json
protocol/releases/v2/provenance/thought.provenance.v2.md
protocol/releases/v2/provenance/thought.provenance.v2.schema.json
protocol/releases/v2/provenance/examples/manual.json
protocol/releases/v2/conformance/{text-validation,raw-utf8-vectors,provenance-vectors,trait-vectors,svg-vectors,token-uri-vectors}.json
protocol/releases/v2/release-input.json
protocol/releases/v2/release.manifest.draft.json
protocol/releases/v2/release.report.draft.json
specs/THOUGHT.v2.md
src/generated/thought-v2-release-bundle.json
```

Reference/parity code and tests:

```text
src/thought-v2-creation-attestation.ts
src/thought-v2-creation-attestation.test.ts
src/thought-v2-protocol.ts
src/thought-v2-protocol.test.ts
src/thought-v2-token-uri.ts
src/thought-v2-token-uri.test.ts
src/thought-v2-provenance.ts
src/thought-v2-provenance.test.ts
src/thought-agent-run.ts
src/thought-agent-run.test.ts
src/thought-v2-fixtures.ts
src/thought-v2-gallery.ts
src/thought-v2-gallery.test.ts
docs/agent/THOUGHT_AGENT_FLOW_V2.md
docs/agent/THOUGHT_V2_NEXT_SESSION_HANDOFF.md
docs/agent/THOUGHT_V2_CREATION_ATTESTATION_CONTRACT_DELTA_IMPLEMENTATION_REPORT.md
```

Generation, deployment, and local-fixture scripts:

```text
scripts/build-thought-v2-protocol.mjs
scripts/check-thought-v2-protocol.mjs
scripts/generate-thought-v2-release-constants.mjs
scripts/deploy-devnode.mjs
scripts/deploy-evm-local.sh
scripts/write-thought-signing-os-pack.mjs
scripts/lib/load-thought-v2-gallery-fixtures.mjs
scripts/lib/load-thought-v2-provenance-runtime.mjs
scripts/setup-thought-v2-gallery.mjs
scripts/mint-thought-v2-gallery.mjs
```

Pre-existing dirty lab CSS/HTML/page work and prior reports were preserved but
are not claimed as production App work performed by this contract delta.
The 2026-07-17 correction updated this report and the exact Downloads spec in
place; it did not create another spec or report and did not edit or create a
handoff.

## Deviations, Risks, and Stopped Actions

Implementation choices/deviations:

1. Canonical tokenURI byte assembly was extracted into the immutable renderer
   to satisfy the NFT code-size gate. NFT state and `ThoughtNFT.tokenURI()`
   remain authoritative. This increases renderer and combined deployment cost.
2. The event is named `CreationAttested` rather than the illustrative
   `CreationAttestationRecorded`; field information and indexing are exact.
3. A separate explicit `WorkAlreadyMinted` check was added after Agent-line
   uniqueness to implement the required Agent/work uniqueness order.

Remaining risks are operational, not hidden contract behavior:

```text
the new contracts have local test evidence, not an external security audit
production authority custody/rotation and attestation service remain out of scope
compromised-authority history is intentionally immutable after mint
tokenURI view execution remains expensive and depends on provider eth_call limits
the draft release is not approved, registered, deployed, or published
```

Stopped external actions:

```text
no commit
no tag
no push or pull request
no upload, publication, or pin
no candidate/stable promotion
no protocol registration
no public-chain deployment or explorer verification
no real signing-key operation
no real PATH consumption or THOUGHT mint
no production THOUGHT App/backend/connector/signing-service implementation
```

The local implementation is ready for source review. Every later release or
version-control action requires separate explicit operator authority.
