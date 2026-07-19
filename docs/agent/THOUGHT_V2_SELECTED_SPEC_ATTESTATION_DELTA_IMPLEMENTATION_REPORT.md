# THOUGHT V2 Selected-Spec Creation Attestation — Implementation Report

Date: 2026-07-17

Status: implemented and locally verified in the existing dirty worktree; draft
protocol artifacts and disposable Anvil evidence only; no commit, tag, push,
registration, public-chain deployment, verification, upload, pin, or
publication performed

## Result

The pre-mint registered-spec substitution gap is closed. A nonempty Creation
Attestation now signs the exact `thoughtSpecId + thoughtSpecHash` pair that
`ThoughtNFT` validates against `ThoughtSpecRegistry` and stores on the token.
A proof issued for registered pair A cannot be reused with separately
registered pair B.

Canonical `inshell.thought.provenance.v2` records now mirror the same pair in a
closed four-field `protocol` object. The shared builder and verifier compare
the pair derived from exact spec bytes with the registered pair, mint draft or
token state, provenance, and optional attestation claim before any positive
fixture is produced or mock-signed.

Solidity still treats provenance as bounded opaque bytes. The proof layout,
PATH claim, work identity, Agent-line uniqueness, renderer, front traits, and
historical THOUGHT V1 remain unchanged.

## Exact Input Pins

Implemented selected delta:

```text
file:       /Users/bigu/Downloads/THOUGHT_V2_SELECTED_SPEC_ATTESTATION_DELTA_SPEC.md
byteLength: 23,419
sha256:     4d150ab91dcc1c36e04c3170c1bd0f51614550a17db14e032665074c411151b2
```

Pinned parent delta:

```text
file:       /Users/bigu/Downloads/THOUGHT_V2_CREATION_ATTESTATION_CONTRACT_DELTA_SPEC.md
byteLength: 39,826
sha256:     f748fa1c17d7385d7cfef7a6a3353d0192051c7084684eeebd9cf08b4c245cb8
```

Pinned implemented baseline:

```text
file:       docs/agent/THOUGHT_V2_POST_IMPLEMENTATION_DELTA_IMPLEMENTATION_REPORT.md
byteLength: 16,055
sha256:     637be590264f8b773645288027f150d25a31e445dfff8217282b49c15addfc66
```

All three byte lengths and SHA-256 values were recomputed after the operator's
explicit 2026-07-17 repin and before final verification. No pin discrepancy
remains.

## Checkout, Dirty-Worktree, and Publication Posture

```text
repository: /Users/bigu/Projects/THOUGHT
branch:     codex/thought-v2-protocol-refinement
HEAD:       ec46cbf2f9ed5f7627c374bdf9963a38b5dad4c3
worktree:   intentionally dirty before and after this delta
```

The worktree already contained the prior V2 renderer, gallery, provenance,
attestation, reports, generated fixtures, and local deployment work. Those
changes were preserved. This report distinguishes the selected-spec delta from
that inherited dirty state; it does not claim the entire worktree as newly
created by this delta.

Repository evidence confirms that the Creation Attestation V1 profile is still
an unpublished draft:

```text
profile string in HEAD:                         absent
current verifier/profile files:                untracked local files
release status:                                draft
registrationAuthorized:                        false
public-chain address/deployment record:         absent
authorized chain evidence for this delta:       Anvil 31337 only
external-action authority in selected spec:     none
```

This is repository and operator-scope evidence, not a public-chain publication
claim. No Sepolia or mainnet call was made. The implementation revised the
unpublished V1 draft in place, as authorized. If an externally relied-on V1
profile is later discovered, publication must stop and the profile must move to
the V2 migration path specified by the selected delta.

## Final Profile and EIP-712 Identity

```text
profile name:
inshell.thought.creation-workflow-attestation.v1

profile ID:
0x0dc216b0e8f18cabaa4afee047e80f349ed3c2de67ace911157300279f74c669

domain name:      Inshell THOUGHT Creation Attestation
domain version:   1
domain chain:     block.chainid
domain verifier:  CreationAttestationVerifier address

primary type:     CreationAttestation
type hash:
0xeecd612de9b9a9e57fef929280526389a3cca5e7c791342ddc7216412d8a7590
```

Exact type string:

```text
CreationAttestation(bytes32 profileId,address thoughtNft,bytes32 protocolReleaseId,bytes32 thoughtSpecId,bytes32 thoughtSpecHash,bytes32 workHash,bytes32 provenanceHash,bytes32 declaredAgentHash,bytes32 declaredModelHash,bytes32 runIdHash,address intendedMinter,uint64 deadline,uint32 authorityEpoch)
```

The old local draft type hash was
`0xb25f59a2cb340b2abb47a7640de7f553023098e131ad0dba2da0d4e1d88b199c`.
It is not aliased or accepted by the revised verifier.

## Final Claim, Proof, ABI, and Contract Flow

The verifier claim is exactly:

```solidity
struct Claim {
    bytes32 profileId;
    address thoughtNft;
    bytes32 protocolReleaseId;
    bytes32 thoughtSpecId;
    bytes32 thoughtSpecHash;
    bytes32 workHash;
    bytes32 provenanceHash;
    bytes32 declaredAgentHash;
    bytes32 declaredModelHash;
    bytes32 runIdHash;
    address intendedMinter;
    uint64 deadline;
    uint32 authorityEpoch;
}
```

The caller-facing proof remains unchanged:

```solidity
struct CreationAttestationProof {
    bytes32 runIdHash;
    uint64 deadline;
    uint32 authorityEpoch;
    bytes signature;
}
```

There are no duplicate caller-trusted selected-spec fields in the proof. The
existing mint tuple still carries one `thoughtSpecId` and one
`thoughtSpecHash`; those fields were already required for registry selection.

The final flow is:

1. Validate prompt, Agent response, Declared Agent, and Declared Model.
2. Validate nonempty provenance and the existing 20,000-byte bound.
3. Validate the exact input spec ID/hash relationship through
   `ThoughtSpecRegistry.isRegisteredThoughtSpec`.
4. Compute work, Agent identity, provenance, and declaration commitments.
5. Reject existing Agent-line/work uniqueness before external effects.
6. Classify the proof as canonical empty or nonempty.
7. For a nonempty proof, build the expanded claim inside `ThoughtNFT` from the
   exact validated input pair and contract-derived facts, then verify it.
8. Consume PATH only after successful verification.
9. Store the same input pair, returned digest, and other token state.
10. Safe-mint and emit the existing canonical events.

The same calldata values are passed to the registry relationship check, claim
construction, `ThoughtRecord`, and `ThoughtMinted`. There is no alias lookup or
second mutable resolution between those steps.

`CreationAttested` was intentionally not expanded. Its token ID points to the
immutable authoritative pair available through `thoughtSpecOf(tokenId)`, so
the signed pair is reconstructible from the event plus token state without a
duplicate log-only fact.

Generated ABI evidence is in:

```text
protocol/releases/v2/contract/abi/CreationAttestationVerifier.json
protocol/releases/v2/contract/abi/ThoughtNFT.json
```

Both `hashClaim` and `verify` expose the 13-field tuple in the exact order
above. The `mint` ABI keeps the original mint spec pair and unchanged nested
four-field proof.

## Canonical Provenance Alignment

The strict protocol object is now exactly:

```json
{
  "manifestKeccak256": "0x<64 lowercase hexadecimal digits>",
  "protocolReleaseId": "0x<64 lowercase hexadecimal digits>",
  "thoughtSpecHash": "0x<64 lowercase hexadecimal digits>",
  "thoughtSpecId": "0x<64 lowercase hexadecimal digits>"
}
```

All four keys are required and `additionalProperties` is false. The two spec
fields use the existing derivations:

```text
thoughtSpecId   = keccak256(UTF-8 exact registered spec name)
thoughtSpecHash = keccak256(exact registered spec bytes)
```

The previous repeated per-token artifact inventory was removed. Artifact
integrity remains release-manifest responsibility; the selected pair is token
provenance, not a repeated manifest inventory.

The shared positive path in `src/thought-v2-provenance.ts` now requires
`selectedSpec` evidence containing the exact spec name and bytes, derives the
pair, and compares these surfaces when supplied:

```text
exact selected spec bytes
registered pair
mint draft pair
authoritative token-state pair
optional Creation Attestation claim pair
canonical provenance protocol pair
```

`buildVerifiedCanonicalProvenance` remains the fail-closed producer. Manual,
Agent-run, Unattested, mock-attested, generated vector, disposable mint, and
gallery download paths all use it. Non-JCS, malformed, or contradictory bytes
remain isolated to named negative tests. No positive gallery token contains
fixture ID, corpus name, source path, or the obsolete
`inshell.thought.gallery-fixture.v1` harness schema.

Solidity does not parse this JSON. Typed token state wins over contradictory
opaque bytes, while the offchain verifier rejects the contradiction.

## Solidity/TypeScript Parity and Security Vectors

All generated vectors use chain ID 31337 and verifier
`0x4444444444444444444444444444444444444444`. The shared domain separator is:

```text
0xe8f46ccefdc8999c23551f7b793ea867dc675ce0e092c6ab8c1f2796423a18fc
```

| Vector | Selected pair | Struct hash | Final digest |
| --- | --- | --- | --- |
| ASCII | A | `0xc8ca2a02c5181e28a231768aacd44d0c3bdf8fc49e70f3409b19b33559b152c6` | `0x182be6c6ea2554f3a9a42218e15cb63ec3826790568c6258358444d1b1f5caa0` |
| safe non-ASCII | A | `0x5dabfc69714f1f2e84eb300e096c65eed50c517358e96749de2bdc50b1fc42af` | `0x2f2d2363cfabf85c43686381da7378d6089479a2404c4d38c86c5041b6f0d2d2` |
| one-byte declarations | A | `0xfcd3ba8953665824dfa04b030fe2a2fd59bec13223720141d601feae648ed316` | `0x78d4885821485f69836ff9fde1f075453a65b89bb927d367a268aa045ff24481` |
| 64-byte boundaries | A | `0xb33c468fd3b01d5cadadfbbf65f1bb029943f8215eea44105ac803c83f8cc176` | `0x181acb52f51c905761657c735302b676fdceae2a186e270b076b3589b45fcaab` |
| safe non-ASCII | B | `0x7b42083f622d430aabc7a0bbc16540b40cd6f2d28f55877552e73078891667bf` | `0xc9b7408911d0a3fb228495ea087419bd6027ebca462262702a68f5016e6e3a1d` |

Pair A is the exact local creative spec:

```text
name: THOUGHT.v2.md
ID:   0x0a33583e39050834eb77372ea8b41ceded8fe4bb47c31fe1a72ebb880351b410
hash: 0x8f78c9727cd40f9f7a4548c6e32a22832ce5101b69cf9d60d4e300f4f8cb4a76
bytes: 4,150
```

Pair B is the alternate conformance spec:

```text
name: THOUGHT.v3.md
ID:   0xd2a0889e3063cd1bc14ea17c8af8aefaf583118537acfd1234ab285622596a9f
hash: 0xede859e68d811854a387b195bc37684d55b08874fbca0fe9ab865769f1f4c5a5
```

Changing only the ID, only the hash, or both values changes the struct hash and
digest in both Solidity and TypeScript. Safe non-ASCII data is frozen under
both pairs.

### Pair A to Pair B Substitution

The generated substitution vector keeps every non-spec claim field and the
pair-A signature unchanged:

```text
pair-A digest:
0x182be6c6ea2554f3a9a42218e15cb63ec3826790568c6258358444d1b1f5caa0

pair-B substituted digest:
0x3dc88900f235162dda3b32eb322bf5de7cfb70ac9a32aefb494855c222139c6c

expected authority:
0x7f5ab4ece92edfddfc00515385ce291778dc00e9

recovered from reused pair-A signature over pair-B digest:
0x7e129ac0c6b2d19ec9caae3c188ce2e6e24e3106
```

The central contract regression separately registers A and B, signs A, then
substitutes only the mint pair. Verification reverts with invalid signature
before PATH. ID-only and hash-only invalid relationships also stop before
PATH. Supply, PATH nonce/units, Agent identity, work uniqueness, ownership, and
digest state remain unchanged. Retrying the original pair-A input and proof
succeeds.

Empty proofs with either valid registered pair remain permissionless and store
digest zero. Work hash and Agent-line uniqueness remain pair-independent.

### Old Proof and Provenance Mutation

An actual signature generated under the previous draft type is frozen in the
fixture. Its old digest is:

```text
0x4028b2154e993b78d806aa668ff2e7d575722eac12ab7d5fcb81c92836f77207
```

The revised verifier rejects it. All prior local draft signatures, hashes,
ABIs, verifier/NFT deployments, and generated fixtures were replaced.

A one-byte provenance mutation changes:

```text
provenance hash:
0x051a76aced247f3ad67f24a2425f9d666cbaf59550a6a5e291e22e7a2750fc8c
->
0x0ec02a2631466f736cc45e331fd2e99663685ad29cb74d2e2deb605b649d7033

attestation digest:
0x182be6c6ea2554f3a9a42218e15cb63ec3826790568c6258358444d1b1f5caa0
->
0xcc3ca81508512e59105c05e9ca0848e7483e579add5e4ea81196b13a083c08f8
```

The original signature is invalid for the mutated bytes.

## Final Draft Release Identity

All affected normative artifacts, vectors, ABIs, constants, manifest bytes,
and the embedded bundle were regenerated together.

```text
artifact count:                         17
manifest byte length:                   4,628
manifest keccak256:                     0xf58cea1ca79c442c5bd3619fcb62d17ed3569d09182b431c54bd623663ba914a
protocol release ID:                    0x6ef9589207b5feea9e98cd8431858a4f26fc6f545b39952e7a7dfb6f47153427
selected THOUGHT spec hash:             0x8f78c9727cd40f9f7a4548c6e32a22832ce5101b69cf9d60d4e300f4f8cb4a76
attestation profile artifact hash:      0xa8b7ef8ccfcfe936afe42aa2efef61bd4ba91844a0b6d097a2dfeff5a2eb287c
attestation vector fixture hash:        0x6fd49dad2bed681ddbcf0733dcd1451747f16dbaba723df0884fe5a296d1da15
provenance profile hash:                0xbd09fff52ba99f1bf3c43c578f6e644ff4a9f2b7ab5ba24a0e17ac09d4d71d2d
provenance schema hash:                 0xb297352064130c34edb4e8f05a952e6b5bd2a03730b0c6e66b4c41fb2ef64975
tokenURI vector fixture hash:           0xae9d80c3a94e3feb4e718e36164844a3626cc59e2ac165b233fab88dc201a2c8
renderer profile hash:                  0xc68ec09234f316cfdb19b96456e04f76f4f4674b3bb6596117cc39d124d1f6e1
work profile hash:                      0xfaa37b147f7ea37a790f35b67707d895e1b4b11481434289d444faace3d72674
registration authorized:                false
offline embedded bundle:                verified
```

The Solidity/TypeScript full tokenURI parity anchor is:

```text
0x516c5ad3c094ed8a1896738cc37aad62b586d27e6791f49ccc99b42e4c43163f
```

The one-byte SVG anchor remains unchanged:

```text
0x9ecc3ca8c790cf007aa830ebfb23479f0b302f54b264d26fbcea6b0a1e199aa0
```

## Storage Layout

`forge inspect ... storage-layout` was forced under the final compiler posture
and confirms no storage delta from adding the selected pair to the claim.

`ThoughtNFT` top-level storage remains:

| Slot | Value |
| ---: | --- |
| 0 | `totalSupply` |
| 1 | `tokenOfWorkHash` |
| 2 | `tokenOfAgentIdentityHash` |
| 3 | `_ownerOf` |
| 4 | `_balanceOf` |
| 5 | `getApproved` |
| 6 | `isApprovedForAll` |
| 7 | `_records` mapping root |

Each `ThoughtRecord` remains 352 in-place bytes across 11 base slots:

| Relative slot | Member |
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
| 10 | packed `minter` and `mintedAt` |

The selected pair already occupied slots 6 and 7, and the exact digest already
occupied slot 5. No signature, claim copy, nonce, or additional pair slot was
added.

Verifier storage remains OpenZeppelin EIP-712 fallback strings in slots 0–1,
owner in slot 2, pending owner in slot 3, and packed authority/epoch/pause in
slot 4.

## Gas, Bytecode, Calldata, and Provenance Size

Measurement posture is Solidity 0.8.28, optimizer 200, `viaIR`, Prague, no
bytecode hash, and disabled CBOR metadata.

### Bytecode and Deployment

| Contract | Parent runtime | Final runtime | Delta | Parent initcode | Final initcode | Delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `ThoughtNFT` | 19,948 B | 19,909 B | -39 B | 21,148 B | 21,109 B | -39 B |
| `CreationAttestationVerifier` | 3,843 B | 3,864 B | +21 B | 5,193 B | 5,214 B | +21 B |
| `ThoughtRenderer` | 16,492 B | 16,492 B | 0 | 16,518 B | 16,518 B | 0 |

| Contract/stack | Parent deployment gas | Final deployment gas | Delta |
| --- | ---: | ---: | ---: |
| `ThoughtNFT` | 4,053,417 | 4,045,599 | -7,818 |
| `CreationAttestationVerifier` | 921,812 | 926,012 | +4,200 |
| `ThoughtRenderer` | 3,338,649 | 3,338,649 | 0 |
| renderer + verifier + NFT | 8,313,878 | 8,310,260 | -3,618 |

`ThoughtNFT` has 4,667 bytes of EIP-170 headroom and 2,619 bytes below the
22-KiB review gate. Every runtime is below EIP-170 and every initcode is below
49,152 bytes.

### Standard Mint Measurements

The parent and final measurements use the same positive mint facts and compiler
posture. The final canonical protocol object is smaller because it removes the
old repeated artifact inventory.

| Proof | Parent gas | Final gas | Delta | Parent calldata | Final calldata | Delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| canonical empty | 2,065,872 | 1,710,480 | -355,392 | 3,172 B | 2,660 B | -512 B |
| current-authority EOA | 2,098,333 | 1,742,635 | -355,698 | 3,268 B | 2,756 B | -512 B |
| EOA incremental over empty | +32,461 | +32,155 | -306 | +96 B | +96 B | 0 |

The selected pair adds no user calldata because both words already existed in
`MintThoughtInput`. The NFT-to-verifier ABI call grows by two static words, or
64 bytes, and claim encoding uses two additional memory words. Under the final
build, the measured end-to-end attestation increment is 306 gas lower than the
parent measurement; there is no positive net mint overhead to hide.

An isolated old-verifier microbenchmark was not retained because the selected
delta requires discarding the old local verifier binary. The table therefore
uses the required same-work end-to-end empty/attested measurements, which
include the expanded call.

### Provenance Bytes and Storage

For the canonical manual conformance record:

| Shape | Exact JCS bytes | Dynamic storage data slots |
| --- | ---: | ---: |
| release + manifest only | 1,490 | 47 |
| final exact four-field protocol object | 1,662 | 52 |
| actual parent repeated-inventory shape | 2,179 | 69 |

The two required spec fields themselves add exactly 172 UTF-8 bytes and five
32-byte dynamic data slots to the otherwise identical two-field record. The
actual implementation delta is a net reduction of 517 bytes and 17 data slots
because the selected spec also requires removing the repeated artifact
inventory. The parent 2,179-byte value was reconstructed by replacing the
current manual vector's protocol object with the parent artifact-binding object
and serializing it in sorted JCS form; fixed-length hashes do not affect that
byte count.

The 20,000-byte opaque boundary is unchanged. Its final measurements are:

```text
mint gas:              14,418,397
provenanceOf read gas:    144,801
returned bytes:            20,000
```

## Disposable Anvil and Gallery Evidence

A fresh disposable Anvil chain, not Sepolia, was used. The current live state
is:

```text
RPC:          http://127.0.0.1:8545
chain ID:     31337
PATH:         0x5FbDB2315678afecb367f032d93F642f64180aa3
spec registry:0x162A433068F51e18b7d13932F27e66a3f99E6890
renderer:     0xdbC43Ba45381e02825b14322cDdd15eC4B3164E6
verifier:     0x04C89607413713Ec9775E14b954286519d836FEf
THOUGHT:      0x4C4a2f8c81640e47606d3fd77B353E87Ba015584
supply:       60
attested:     30
unattested:   30
```

Direct JSON-RPC readback confirms the NFT's immutable release ID and manifest
hash equal the regenerated release, token 1 stores pair A, token 1 has digest
zero, and token 2 has a nonzero attestation digest.

`npm run devnode:gallery` rebuilt, deployed, registered the exact local draft
inside disposable Anvil, froze local PATH THOUGHT quota, and minted 60 unique
works from 61 source fixtures. One duplicate Agent line was correctly omitted.
`npm run devnode:gallery:mint` then re-read the 60 existing tokens without
reminting and checked registry/spec bytes, mint/provenance/claim/token pair
parity, exact provenance bytes/hash, and tokenURI surfaces.

The existing in-app page was refreshed and left visible at:

```text
http://127.0.0.1:5177/thought-v2-lab.html
```

DOM and visual verification found:

```text
60 tokenURI records loaded from Anvil
60 rendered token cards
30 Unattested cards
30 Inshell THOUGHT App cards
selected token: THOUGHT #1
provenance schema: inshell.thought.provenance.v2
download includes: manifestKeccak256, protocolReleaseId,
                   thoughtSpecHash, thoughtSpecId
download includes old repeated artifact inventory: no
browser warning/error log: none
```

This is disposable local evidence only. The authority is the well-known Anvil
development account. No real key, PATH unit, public registry, or public NFT was
used.

## Trait, Artwork, PATH, and V1 Non-Regression

The exact current front attribute count and order remains six:

```text
1. Prompt
2. Agent Response
3. Declared Agent
4. Declared Model
5. Creation Attestation
6. Texture Density
```

The selected delta's Section 8.4 says “five ordered front traits,” but its
parent implementation and authoritative current vectors have six after the
required Declared Agent addition. The implementation followed the stronger
instructions to preserve the parent and keep trait count/names/order unchanged.
No selected-spec trait was added. This wording inconsistency is recorded as a
spec deviation, not silently interpreted as permission to remove a trait.

Creation Attestation values and meaning remain:

```text
Inshell THOUGHT App
Unattested
```

The attested label means an authorized signer approved the exact pre-mint
workflow claim, now including the selected spec pair. It does not prove PATH,
frontend/browser origin, Agent/model truth, provider execution, token ID,
transaction, or block facts.

Regression tests confirm unchanged work hash and Agent-line uniqueness across
spec pairs, loom/metrics/SVG output, renderer parity, PATH ordering and
rollback, empty-proof semantics, authority rotation/pause behavior, and
historical digest stability.

No PATH or Pulse contract source/artifact path is changed. PATH consumption
still occurs only after successful nonempty-proof verification and remains
atomic with mint state.

Archived V1 sources have no worktree diff. All 56 legacy tests pass. Existing
test-source SHA-256 anchors remain:

```text
evm/test/legacy/ThoughtNFTV1.t.sol
c10c0521cbb22d901bba5c36f9e50ac0d009131425f58fdbd2deca3871b6a283

evm/test/legacy/ThoughtPreviewerV1.t.sol
586da01d55ae42bfc65fc08d7e6549bbdcbe26d0701e8db8994d8df2f67118c4
```

The generated V1 source regression anchor remains:

```text
evm/legacy/ThoughtNFTV1.sol
0x8d401671be7a29351d0a1559f063d42fdeb48d06151c2bf4ee9f1fbc58bfabe6
```

## Verification Commands and Results

Final results:

```text
wc -c + shasum -a 256 on all three pins
  passed; exact Section 1 and selected-delta pins matched

npx tsc --noEmit
  passed

npm test
  passed; 82 tests across 13 files

npm run build
  passed; TypeScript + Vite production build

npm run protocol:check
  passed; 17 artifacts; deterministic manifest/release identity;
  registrationAuthorized false; offline bundle verified

npm run build:evm
  passed

npm run test:evm
  passed; 149 tests total
    CreationAttestationVerifier: 11
    active ThoughtNFT V2:        77
    ThoughtSpecRegistryV2:        5
    archived V1:                 56

forge fmt --check on changed active Solidity/test files
  passed

git diff --check
  passed

focused selected-pair substitution regression
  passed
```

One initial parallel validation attempt ran `npm test` while
`protocol:check` was regenerating the fixture tree. Vitest transiently observed
`invalid-raw-utf8.json` between regeneration steps and reported 81/82. The file
was present after regeneration; the unchanged suite was rerun serially and
passed 82/82. This was a validation-orchestration race, not a retained failure.

Foundry also emitted a managed-sandbox warning when it could not write the
user-level signature cache. Builds and tests completed with exit code zero;
repository artifacts and test results were unaffected.

## Selected-Delta Changed Paths

The operator-authorized repin changed the existing Downloads spec in place:

```text
/Users/bigu/Downloads/THOUGHT_V2_SELECTED_SPEC_ATTESTATION_DELTA_SPEC.md
```

Selected-spec contract and tests:

```text
evm/src/ICreationAttestationVerifier.sol
evm/src/CreationAttestationVerifier.sol
evm/src/ThoughtNFT.sol
evm/src/ThoughtReleaseConstants.sol
evm/test/CreationAttestationVerifier.t.sol
evm/test/ThoughtNFT.t.sol
```

Selected-spec protocol, ABI, and generated release surfaces:

```text
protocol/releases/v2/attestation/thought.creation-workflow-attestation.v1.md
protocol/releases/v2/attestation/fixtures/creation-attestation-vectors.json
protocol/releases/v2/art/THOUGHT.v2.md
protocol/releases/v2/contract/thought-nft.v2.interface.md
protocol/releases/v2/contract/abi/CreationAttestationVerifier.json
protocol/releases/v2/contract/abi/ThoughtNFT.json
protocol/releases/v2/provenance/thought.provenance.v2.md
protocol/releases/v2/provenance/thought.provenance.v2.schema.json
protocol/releases/v2/provenance/examples/manual.json
protocol/releases/v2/conformance/provenance-vectors.json
protocol/releases/v2/conformance/token-uri-vectors.json
protocol/releases/v2/release-input.json
protocol/releases/v2/release.manifest.draft.json
protocol/releases/v2/release.report.draft.json
specs/THOUGHT.v2.md
src/generated/thought-v2-release-bundle.json
```

Regeneration also refreshed the manifest-bound conformance/profile artifacts
and existing renderer fixtures already dirty in the worktree:

```text
protocol/releases/v2/agent/*.schema.json
protocol/releases/v2/work/*
protocol/releases/v2/renderer/thought.renderer.v2.profile.json
protocol/releases/v2/renderer/thought.svg.v2.binary-weave-32.md
protocol/releases/v2/renderer/fixtures/*.json
protocol/releases/v2/conformance/{text-validation,raw-utf8-vectors,trait-vectors,svg-vectors}.json
```

Reference implementation, fixtures, gallery, tests, and documentation:

```text
src/thought-v2-creation-attestation.ts
src/thought-v2-creation-attestation.test.ts
src/thought-v2-provenance.ts
src/thought-v2-provenance.test.ts
src/thought-v2-token-uri.test.ts
src/thought-v2-gallery.test.ts
scripts/build-thought-v2-protocol.mjs
scripts/mint-thought-v2-gallery.mjs
docs/agent/THOUGHT_AGENT_FLOW_V2.md
docs/agent/THOUGHT_V2_SELECTED_SPEC_ATTESTATION_DELTA_IMPLEMENTATION_REPORT.md
```

Disposable ignored runtime state was regenerated at:

```text
public/thought-v2-gallery.anvil.json
evm/devnode-state/anvil-state.json
```

Other currently dirty paths shown by `git status` belong to the inherited
parent/refactor/gallery implementation, including `.gitignore`, package files,
renderer extraction, lab HTML/CSS/TypeScript, deployment scripts, prior reports
and handoff, and prior generated fixture changes. They were preserved and are
not recast as selected-delta-only work.

### Exact Current Git Status

For an unambiguous dirty-worktree record, this was the complete
`git status --short` path set after creating this report:

```text
 M .gitignore
 M docs/agent/THOUGHT_AGENT_FLOW_V2.md
 M docs/agent/THOUGHT_V2_NEXT_REFACTOR_IMPLEMENTATION_REPORT.md
 M docs/agent/THOUGHT_V2_NEXT_SESSION_HANDOFF.md
 M evm/README.md
 M evm/addresses.anvil.json
 M evm/foundry.toml
 M evm/src/ThoughtNFT.sol
 M evm/src/ThoughtReleaseConstants.sol
 M evm/src/ThoughtRenderer.sol
 M evm/test/ThoughtNFT.t.sol
 M package-lock.json
 M package.json
 M protocol/releases/v2/agent/thought.agent-declaration.v1.schema.json
 M protocol/releases/v2/agent/thought.agent-result.v2.schema.json
 M protocol/releases/v2/art/THOUGHT.v2.md
 M protocol/releases/v2/conformance/provenance-vectors.json
 M protocol/releases/v2/conformance/raw-utf8-vectors.json
 M protocol/releases/v2/conformance/svg-vectors.json
 M protocol/releases/v2/conformance/text-validation.json
 M protocol/releases/v2/conformance/token-uri-vectors.json
 M protocol/releases/v2/conformance/trait-vectors.json
 M protocol/releases/v2/contract/abi/ThoughtNFT.json
 M protocol/releases/v2/contract/abi/ThoughtRenderer.json
 M protocol/releases/v2/contract/thought-nft.v2.interface.md
 M protocol/releases/v2/provenance/examples/manual.json
 M protocol/releases/v2/provenance/thought.provenance.v2.md
 M protocol/releases/v2/provenance/thought.provenance.v2.schema.json
 M protocol/releases/v2/release-input.json
 M protocol/releases/v2/release.manifest.draft.json
 M protocol/releases/v2/release.report.draft.json
 M protocol/releases/v2/renderer/fixtures/arabic-vowel-marks.json
 M protocol/releases/v2/renderer/fixtures/arabic.json
 M protocol/releases/v2/renderer/fixtures/ascii-punctuation.json
 M protocol/releases/v2/renderer/fixtures/ascii.json
 M protocol/releases/v2/renderer/fixtures/cjk.json
 M protocol/releases/v2/renderer/fixtures/combining-sequence.json
 M protocol/releases/v2/renderer/fixtures/direction-diagnostic-64-bytes.json
 M protocol/releases/v2/renderer/fixtures/emoji-skin-tone.json
 M protocol/releases/v2/renderer/fixtures/internal-repeated-spaces.json
 M protocol/releases/v2/renderer/fixtures/maximum-valid-ascii.json
 M protocol/releases/v2/renderer/fixtures/mixed-scripts.json
 M protocol/releases/v2/renderer/fixtures/one-byte-cycle.json
 M protocol/releases/v2/renderer/fixtures/regional-indicator-flag.json
 M protocol/releases/v2/renderer/fixtures/shortest.json
 M protocol/releases/v2/renderer/fixtures/source-63-bytes.json
 M protocol/releases/v2/renderer/fixtures/source-64-bytes.json
 M protocol/releases/v2/renderer/fixtures/thai-combining.json
 M protocol/releases/v2/renderer/fixtures/unicode-precomposed.json
 M protocol/releases/v2/renderer/fixtures/utf8-four-byte.json
 M protocol/releases/v2/renderer/fixtures/utf8-three-byte.json
 M protocol/releases/v2/renderer/fixtures/utf8-two-byte.json
 M protocol/releases/v2/renderer/fixtures/xml-escaping.json
 M protocol/releases/v2/renderer/thought.renderer.v2.profile.json
 M protocol/releases/v2/renderer/thought.svg.v2.binary-weave-32.md
 M protocol/releases/v2/work/thought.work.v2.md
 M protocol/releases/v2/work/thought.work.v2.profile.json
 M scripts/build-thought-v2-protocol.mjs
 M scripts/check-thought-v2-protocol.mjs
 M scripts/deploy-devnode.mjs
 M scripts/deploy-evm-local.sh
 M scripts/generate-thought-v2-release-constants.mjs
 M scripts/write-thought-signing-os-pack.mjs
 M specs/THOUGHT.v2.md
 M src/generated/thought-v2-release-bundle.json
 M src/thought-agent-run.test.ts
 M src/thought-agent-run.ts
 M src/thought-v2-fixtures.ts
 M src/thought-v2-lab.css
 M src/thought-v2-lab.ts
 M src/thought-v2-protocol.test.ts
 M src/thought-v2-protocol.ts
 M src/thought-v2-provenance.test.ts
 M src/thought-v2-provenance.ts
 M src/thought-v2-renderer.test.ts
 M src/thought-v2-renderer.ts
 M src/thought-v2-token-uri.test.ts
 M src/thought-v2-token-uri.ts
 M thought-v2-lab.html
?? docs/agent/THOUGHT_V2_CREATION_ATTESTATION_CONTRACT_DELTA_IMPLEMENTATION_REPORT.md
?? docs/agent/THOUGHT_V2_POST_IMPLEMENTATION_DELTA_IMPLEMENTATION_REPORT.md
?? docs/agent/THOUGHT_V2_SELECTED_SPEC_ATTESTATION_DELTA_IMPLEMENTATION_REPORT.md
?? evm/src/CreationAttestationVerifier.sol
?? evm/src/ICreationAttestationVerifier.sol
?? evm/src/IThoughtRenderer.sol
?? evm/test/CreationAttestationVerifier.t.sol
?? protocol/releases/v2/attestation/
?? protocol/releases/v2/contract/abi/CreationAttestationVerifier.json
?? protocol/releases/v2/contract/thought.mint-input.v2.schema.json
?? scripts/lib/
?? scripts/mint-thought-v2-gallery.mjs
?? scripts/setup-thought-v2-gallery.mjs
?? src/thought-v2-creation-attestation.test.ts
?? src/thought-v2-creation-attestation.ts
?? src/thought-v2-gallery.test.ts
?? src/thought-v2-gallery.ts
```

## Deviations, Risks, and Stopped Actions

Recorded deviations or interpretation points:

1. Section 8.4's “five ordered front traits” conflicts with the pinned parent
   and current six-trait vectors. Six were preserved; no trait changed.
2. The old verifier binary was intentionally discarded, so verifier-only
   old/new call gas is represented by the same-work end-to-end attested versus
   empty measurements rather than a retained obsolete deployment.
3. `cast call` crashed under the managed macOS sandbox's system-proxy API;
   local chain readback was completed with direct JSON-RPC instead.

Remaining risks:

```text
the profile and contracts have local tests, not an external security audit
production signer custody, authorization, and service implementation are out of scope
Solidity intentionally cannot prove provenance JSON conformance
an authority compromise affects future approvals until pause/rotation
the draft release is not approved, registered, deployed, or published
future publication must re-check that no externally relied-on draft V1 exists
```

Stopped actions:

```text
no commit, tag, push, pull request, or branch publication
no upload, external pin, candidate/stable promotion, or release publication
no protocol or THOUGHT-spec registry action outside disposable Anvil
no Sepolia/mainnet deployment or explorer verification
no production signing key, App, backend, connector, or signing service
no real PATH consumption or public THOUGHT mint
```

## Acceptance Conclusion

Every implementable selected-delta acceptance item is satisfied locally. The
exact selected pair is signed, provenance mirrors it, all positive producers
use the shared fail-closed builder/verifier, pair substitution fails before
PATH, old proofs fail, generated identity is coherent, tests/builds pass, and
the Anvil gallery visibly serves the regenerated onchain records.

This report is implementation evidence, not public release approval.
