# THOUGHT V2 Canonical Provenance Correction — Implementation Report

Date: 2026-07-17

Status: implemented, regenerated, and locally verified in the existing dirty
worktree; disposable Anvil/gallery rollout complete; no commit, tag, push,
registration, public-chain deployment, verification, upload, pin, or other
external publication performed

## Result

Every positive THOUGHT V2 provenance producer now emits the same closed
`inshell.thought.provenance.v2` record. The observed legacy hybrid is rejected;
it is not rewritten or accepted through a compatibility path.

The corrected provenance root is exactly `mintContext`, `process`, `protocol`,
`schema`, and `work`. PATH consumption fields, post-mint facts, fixture/corpus
bookkeeping, repeated release artifact descriptors, and obsolete declaration
fields are absent. Manual and Agent-run records are honest strict variants.
Agent-run transport commitments are derived from the complete JCS Agent-result
object and the exact public-safe run reference.

The shared builder validates selected-spec and release evidence, recomputes all
work/loom commitments, emits one strict process variant, serializes once with
RFC 8785 JCS, enforces the existing 20,000-byte cap, and hashes the exact bytes.
The shared verifier preserves/hash-checks exact bytes, returns ordered
`{code,path,message}` issues, and checks typed token, selected-spec, and
attestation surfaces.

Solidity remains an opaque bounded-byte consumer. No JSON parser or provenance
schema gate was added to `ThoughtNFT`.

## Exact Input Pins

Implemented correction delta after the operator's explicit repin:

```text
file:       /Users/bigu/Downloads/THOUGHT_V2_CANONICAL_PROVENANCE_CORRECTION_DELTA_SPEC.md
byteLength: 25,070
sha256:     628f4edc066576c486094f277ce673a89b389d99efaa204b0a0d6fecd4aca8fa
```

Pinned Section 1 parents:

```text
implemented baseline:
file:       docs/agent/THOUGHT_V2_POST_IMPLEMENTATION_DELTA_IMPLEMENTATION_REPORT.md
byteLength: 16,055
sha256:     637be590264f8b773645288027f150d25a31e445dfff8217282b49c15addfc66

creation-attestation parent:
file:       /Users/bigu/Downloads/THOUGHT_V2_CREATION_ATTESTATION_CONTRACT_DELTA_SPEC.md
byteLength: 39,826
sha256:     f748fa1c17d7385d7cfef7a6a3353d0192051c7084684eeebd9cf08b4c245cb8

selected-spec parent:
file:       /Users/bigu/Downloads/THOUGHT_V2_SELECTED_SPEC_ATTESTATION_DELTA_SPEC.md
byteLength: 23,419
sha256:     4d150ab91dcc1c36e04c3170c1bd0f51614550a17db14e032665074c411151b2
```

All four byte lengths and SHA-256 values were recomputed after repinning and
before final verification. No pin discrepancy remains.

## Checkout and Dirty-Worktree Posture

```text
repository: /Users/bigu/Projects/THOUGHT
branch:     codex/thought-v2-protocol-refinement
HEAD:       ec46cbf2f9ed5f7627c374bdf9963a38b5dad4c3
worktree:   intentionally dirty before and after this correction
```

The inherited worktree already contained the V2 renderer/gallery, creation
attestation, selected-spec binding, generated release surfaces, local deploy
work, and their implementation reports. Those changes were preserved. The
correction-specific paths were:

```text
/Users/bigu/Downloads/THOUGHT_V2_CANONICAL_PROVENANCE_CORRECTION_DELTA_SPEC.md

protocol/releases/v2/provenance/thought.provenance.v2.md
protocol/releases/v2/provenance/thought.provenance.v2.schema.json
protocol/releases/v2/provenance/examples/manual.json
protocol/releases/v2/conformance/provenance-vectors.json
protocol/releases/v2/conformance/token-uri-vectors.json
protocol/releases/v2/attestation/fixtures/creation-attestation-vectors.json
protocol/releases/v2/release.manifest.draft.json
protocol/releases/v2/release.report.draft.json
src/generated/thought-v2-release-bundle.json

src/thought-v2-provenance.ts
src/thought-v2-provenance.test.ts
src/thought-v2-token-uri.test.ts
src/thought-v2-gallery.test.ts
src/thought-v2-creation-attestation.test.ts
scripts/build-thought-v2-protocol.mjs
scripts/mint-thought-v2-gallery.mjs
evm/test/ThoughtNFT.t.sol

docs/agent/THOUGHT_V2_CANONICAL_PROVENANCE_CORRECTION_DELTA_IMPLEMENTATION_REPORT.md
```

The ignored disposable runtime file was refreshed at
`public/thought-v2-gallery.anvil.json`. No fixture/corpus/source bookkeeping
moved out of local TypeScript harness data.

## Final Canonical Field Tree

```text
mintContext
  chainId
  intendedMinter
  thoughtNft

process
  agentDeclaration
    label
    source
    status
  kind
  modelDeclaration
    identifier?            optional
    label
    source
    status
  transport?               Agent-run only
    adapter?               optional
    provider?              optional
    resultEnvelopeKeccak256
    route?                 optional
    runIdHash

protocol
  manifestKeccak256
  protocolReleaseId
  thoughtSpecHash
  thoughtSpecId

schema
  inshell.thought.provenance.v2

work
  agentIdentityHash
  agentLine
  agentLineKeccak256
  binaryFieldKeccak256
  binaryFieldPacked
  promptLine
  promptLineKeccak256
  workHash
```

Every object is closed. Optional values are omitted rather than represented by
`null`, empty placeholders, or explanatory text.

The strict schema is:

```text
path:       protocol/releases/v2/provenance/thought.provenance.v2.schema.json
byteLength: 6,560
sha256:     51671d706fdb82ba4c86210a5e50737c022ac463880f268e5cb447dfa8afdc80
keccak256:  0xda3ef8295c48503d178bc3befdf7dfe72a9f366c268a9a5273a8d420668bd646
```

The normative profile is:

```text
path:       protocol/releases/v2/provenance/thought.provenance.v2.md
byteLength: 6,105
sha256:     b3a1ed20ce6e5e4bbfbf571c6fc9621fc767dc553e6abc7e2591b7a076ed0658
keccak256:  0x0d520bc4e6146001051e8e5572b28607dff72e13146b0eb681a91ccc8c5835ef
```

## Removed Legacy Fields and Paths

The positive schema, builder output, generated examples, token vectors,
attestation vectors, disposable mints, token metadata, and provenance
downloads no longer contain:

```text
mintContext.minter
mintContext.movement
mintContext.pathId
mintContext.pathNft
mintContext PATH signature/deadline
mintContext token ID/transaction/block/mint-success facts

protocol.agentResultSchema
protocol.creativeSpec
protocol.rendererProfile
protocol.workProfile

process.agentDeclaration.schema
process.agentDeclaration.declaredOneCreativeResult
process execution-proof Booleans

fixture ID/name
corpus ID/name
source TypeScript path
display/snapshot order
test description
inshell.thought.gallery-fixture.v1
```

PATH state remains authoritative typed contract state and token metadata where
required; it is intentionally not part of the witnessed creation record or
attestation's indirect `provenanceHash` binding.

## Manual and Agent-Run Behavior

Manual provenance requires both declarations, fixes both `source` values to
`manual`, fixes both statuses to `declared-unverified`, and forbids
`transport`. It is used when no complete validated Agent-result envelope and
public run reference were retained.

Agent-run provenance requires both declarations and transport. Declaration
sources are exactly `agent_declared`, `connector_observed`,
`runtime_configured`, or `unknown`; `manual` is forbidden. The builder derives:

```text
resultEnvelopeKeccak256 = keccak256(JCS(complete validated Agent-result object))
runIdHash               = keccak256(exact public-safe run-reference UTF-8 bytes)
```

The raw result object and raw run reference remain outside provenance.
`adapter`, `provider`, `route`, and the run reference use the 1–128-byte ASCII
public-identifier profile. The optional model identifier uses the 1–256-byte
public-string profile with exact UTF-8 bytes, no outer U+0020, controls,
rejected whitespace, noncharacters, or frozen Unicode default-ignorables.

Unattested tokens may use manual or Agent-run provenance and carry the
canonical empty proof. A mock-attested token must use Agent-run provenance and
a proof whose claim exactly matches the verified provenance, selected pair,
run commitment, release, work, declarations, collection, chain, and intended
minter.

## Builder, Verifier, and Structured Issues

`buildVerifiedCanonicalProvenance` is the fail-closed positive producer. It:

1. verifies exact selected-spec bytes against registered/mint/token/claim
   surfaces when supplied;
2. validates exact lines, declarations, optional public metadata, collection,
   minter, chain, release, and selected pair;
3. recomputes the packed 128-byte binary field and all work commitments;
4. validates and commits complete Agent-run evidence when applicable;
5. constructs the single strict schema shape;
6. JCS-serializes once without BOM, outer whitespace, or final LF;
7. enforces 20,000 bytes and hashes those exact bytes; and
8. immediately invokes the shared verifier before returning a positive result.

`verifyProvenance` first copies and hashes exact input bytes, then returns
ordered `issues` plus compatibility `errors` strings. Its issue families are:

```text
byte.*                  empty, cap, BOM, outer whitespace, final LF
json.invalid            strict UTF-8/JSON parse failure
jcs.noncanonical        byte sequence differs from RFC 8785 serialization
schema.*                object/required/extra/const/enum/grammar/field shape
semantic.*              nonzero/range/public-string/work commitments
process.*               evidence/result serialization/result parity
release.mismatch        release/manifest mismatch
selected_spec.*         byte-derived/registry/mint/token/claim pair mismatch
typed.*                 authoritative token or mint fact mismatch
attestation.*           process-kind or exact claim-surface mismatch
```

Typed contract state wins over contradictory opaque JSON. The verifier never
silently repairs or normalizes a record.

## Observed Legacy-Hybrid Rejection

The exact 2,022-byte observed record is retained only as the named negative
vector `observed-legacy-hybrid`. Its ordered verifier output is:

| # | Code | Path | Message |
| ---: | --- | --- | --- |
| 1 | `schema.missing_property` | `mintContext.intendedMinter` | missing required property |
| 2 | `schema.unexpected_property` | `mintContext.minter` | unexpected property |
| 3 | `schema.unexpected_property` | `mintContext.movement` | unexpected property |
| 4 | `schema.unexpected_property` | `mintContext.pathId` | unexpected property |
| 5 | `schema.unexpected_property` | `mintContext.pathNft` | unexpected property |
| 6 | `schema.address` | `mintContext.intendedMinter` | must be a lowercase address |
| 7 | `schema.missing_property` | `process.transport` | missing required property |
| 8 | `schema.missing_property` | `process.agentDeclaration.source` | missing required property |
| 9 | `schema.unexpected_property` | `process.agentDeclaration.declaredOneCreativeResult` | unexpected property |
| 10 | `schema.unexpected_property` | `process.agentDeclaration.schema` | unexpected property |
| 11 | `schema.enum` | `process.agentDeclaration.source` | source mismatch |
| 12 | `schema.missing_property` | `process.modelDeclaration.status` | missing required property |
| 13 | `schema.const` | `process.modelDeclaration.status` | status mismatch |
| 14 | `schema.object` | `process.transport` | must be an object |
| 15 | `schema.missing_property` | `protocol.thoughtSpecHash` | missing required property |
| 16 | `schema.missing_property` | `protocol.thoughtSpecId` | missing required property |
| 17 | `schema.unexpected_property` | `protocol.agentResultSchema` | unexpected property |
| 18 | `schema.unexpected_property` | `protocol.creativeSpec` | unexpected property |
| 19 | `schema.unexpected_property` | `protocol.rendererProfile` | unexpected property |
| 20 | `schema.unexpected_property` | `protocol.workProfile` | unexpected property |
| 21 | `schema.bytes32` | `protocol.thoughtSpecHash` | must be lowercase bytes32 |
| 22 | `schema.bytes32` | `protocol.thoughtSpecId` | must be lowercase bytes32 |

No positive code path consumes or rewrites this vector.

## Exact Canonical Conformance Records

The canonical manual example is 1,548 bytes, has no final LF, and hashes to
`0xa6c942b38be05c6cca823af4cd8192bff62fb815c5b6ba9fed972028a1b38b54`:

```json
{"mintContext":{"chainId":"31337","intendedMinter":"0x3333333333333333333333333333333333333333","thoughtNft":"0x1111111111111111111111111111111111111111"},"process":{"agentDeclaration":{"label":"Codex","source":"manual","status":"declared-unverified"},"kind":"manual","modelDeclaration":{"label":"Model A","source":"manual","status":"declared-unverified"}},"protocol":{"manifestKeccak256":"0x1111111111111111111111111111111111111111111111111111111111111111","protocolReleaseId":"0xf333ec9668d39a5ed5a75dfcbc625e10c255e068bd4041c05f625570fffa2815","thoughtSpecHash":"0x8f78c9727cd40f9f7a4548c6e32a22832ce5101b69cf9d60d4e300f4f8cb4a76","thoughtSpecId":"0x0a33583e39050834eb77372ea8b41ceded8fe4bb47c31fe1a72ebb880351b410"},"schema":"inshell.thought.provenance.v2","work":{"agentIdentityHash":"0x83ce8f509901a42deac7d89e5cd9ee34bdd3d803721b8328add12afb93bc1bb2","agentLine":"quiet return","agentLineKeccak256":"0x3bd62ecd3709d1aba103bf23e7bb3887d093e136884fc6d2e0c1cba02a05a13b","binaryFieldKeccak256":"0xfb9556fa589f490e95dd165a0625c4788713dbc792e51c5f37ce419d974354a0","binaryFieldPacked":"0x2a022a22144114117f755d55bfafbeeb7d7f7dfdbeabbefa3e536f36beebbebb6b24184115051441282a28a83ca39e783e536f36144114116b241841970d34c3282a28a8140114507f577f779e69b69b7f755d55bfafbeeb282a28a89e29b6da2e126b26144114117f755d559f2db6cb2c3a69ac140114507b473e739e69b69b","promptLine":"quiet signal","promptLineKeccak256":"0x7217d54527306121b40b95c81b96dac2b6b1ecc6bac04a16e1d862ee87a0ffce","workHash":"0x8ddbfe81712ba14e9755fa01d69c210ce6af77a8b8b70a4f4c9b63bb9ba75808"}}
```

The canonical Agent-run example is 1,890 bytes and hashes to
`0x59a28396263d536fb2bc1a4e736699356e36bebf0e467f28d2e50c6703603f54`:

```json
{"mintContext":{"chainId":"31337","intendedMinter":"0x3333333333333333333333333333333333333333","thoughtNft":"0x1111111111111111111111111111111111111111"},"process":{"agentDeclaration":{"label":"Codex","source":"runtime_configured","status":"declared-unverified"},"kind":"agent-run","modelDeclaration":{"identifier":"gpt-5.6-2026-07-15","label":"GPT-5.6","source":"runtime_configured","status":"declared-unverified"},"transport":{"adapter":"codex","provider":"openai-fixture","resultEnvelopeKeccak256":"0x070baa33fbecb45c967d64cbef93ae7b1b1c65d71bcbd2e67633243de419ad17","route":"fixture/agent-run","runIdHash":"0x9e4e107c9c74a226c79adb8757f23363ae68770128a327d158894979f414301e"}},"protocol":{"manifestKeccak256":"0x1111111111111111111111111111111111111111111111111111111111111111","protocolReleaseId":"0xf333ec9668d39a5ed5a75dfcbc625e10c255e068bd4041c05f625570fffa2815","thoughtSpecHash":"0x8f78c9727cd40f9f7a4548c6e32a22832ce5101b69cf9d60d4e300f4f8cb4a76","thoughtSpecId":"0x0a33583e39050834eb77372ea8b41ceded8fe4bb47c31fe1a72ebb880351b410"},"schema":"inshell.thought.provenance.v2","work":{"agentIdentityHash":"0x6ca3e938128e50d0f8032c3273ea1e7eb6c9905336099386f49e9078487d34cd","agentLine":"the archive answers once","agentLineKeccak256":"0xc0a010a03bea5d3f4dcd6900999f98851911d9abd4645c1a2f0f8416a6e4e87f","binaryFieldKeccak256":"0x4ee478e1fc3d1971eaf75cefaa9d23c0bee588ee2303155f391c52d17b3f37e9","binaryFieldPacked":"0x2a202a08140114057d775d55bfbabeea7d775d55beabbfae294a3c819449159428222a201d2496096c0e686684a81f9039d13d33042016017f5d7d5f3ee2be6b2a282822151015043913391bbebbaeaa7f757dd5bebbaeaa29023a093c879c6838832a38963937922b1839031e25b61b09003a213ee2be3b0910390315041405","promptLine":"trace the archive","promptLineKeccak256":"0xd6ca2521a7a1effb023ff45557dd17e90fe67ee489ca423199bdca8966e78280","workHash":"0x7fab01b866a5f2ec5298e5a63a7d135efc2fc2e5c5646ccad9ef9ca2369ebf61"}}
```

These are exact one-line JCS byte sequences, not pretty-printed semantic
equivalents.

## Selected-Spec and Attestation Cross-Surface Evidence

For each positive build, the verifier derives the selected pair from the exact
`THOUGHT.v2.md` name and bytes, then compares it with registered, mint draft,
optional token state, optional claim, and provenance protocol surfaces:

```text
thoughtSpecId:
0x0a33583e39050834eb77372ea8b41ceded8fe4bb47c31fe1a72ebb880351b410

thoughtSpecHash:
0x8f78c9727cd40f9f7a4548c6e32a22832ce5101b69cf9d60d4e300f4f8cb4a76
```

All five generated positive Creation Attestation vectors now carry conforming
Agent-run provenance. Before signing, the generator checks exact parity for
`protocolReleaseId`, selected pair, work hash, provenance hash, declaration
hashes, run hash, collection, chain, and intended minter. The 22 negative
attestation vectors still cover every changed commitment, malformed proof,
previous draft type, and pair substitution. A one-byte provenance mutation
changes the hash/digest and invalidates the original proof.

The four tokenURI vectors cover manual + empty proof, Agent-run + empty proof,
and Agent-run + valid mock proof. Solidity/TypeScript full tokenURI parity now
anchors at:

```text
0xc7029a29c4fcf3e0f28627a8017a119f7a363cebbe7891a5f2ace0de5bf57796
```

## Disposable Anvil and Live Gallery Evidence

A fresh Anvil node was started on chain 31337 and the complete disposable
gallery was rebuilt with `npm run devnode:gallery`.

```text
source fixtures:       61
positive mints:        60
duplicate omitted:      1 (Agent-line uniqueness)
manual provenance:     30
Agent-run provenance:  30
Unattested:             30
mock-attested:          30
```

Every one of the 60 positive mint payloads passed the shared builder and
verifier before mint generation. Mock proofs were signed only after exact
attestation parity verification.

Disposable addresses:

```text
PATH:                    0x5FbDB2315678afecb367f032d93F642f64180aa3
ThoughtSpecRegistry:     0x162A433068F51e18b7d13932F27e66a3f99E6890
ThoughtSpecRegistryV2:   0x5081a39b8A5f0E35a8D959395a630b68B74Dd30f
ThoughtRenderer:         0xdbC43Ba45381e02825b14322cDdd15eC4B3164E6
Attestation verifier:    0x04C89607413713Ec9775E14b954286519d836FEf
THOUGHT:                  0x4C4a2f8c81640e47606d3fd77B353E87Ba015584
```

An independent RPC/download pass checked all 60 tokens:

```text
stored provenance == tokenURI provenance == downloaded file: 60/60
keccak256(exact bytes) == token/metadata provenanceHash:      60/60
shared verifier conforming:                                  60/60
gallery provenance range:                                    1,546–1,974 bytes
```

Live visual/DOM verification at
`http://127.0.0.1:5177/thought-v2-lab.html` recorded:

```text
gallery state:            ready
result/card count:        60 / 60
provenance links:         61 (60 cards + selected detail)
filter groups:             6
status:                   60 tokenURI records loaded from Anvil
root keys:                mintContext, process, protocol, schema, work
token 1:                  manual / Unattested / 1,579 bytes
token 2:                  Agent-run / Inshell THOUGHT App / 1,888 bytes
legacy/PATH harness keys: absent in both sampled downloads
horizontal overflow:      none (1,585px body within 1,600px viewport)
```

All gallery, source, font, runtime-config, RPC, and rendered data-image
requests succeeded. The only network miss was the unrelated existing
`favicon.ico` 404. The screenshot was inspected and showed the expected binary
weave, multilingual lines, traits, provenance download, properties, filters,
and loaded status.

## Final Draft Release Identity and Delta

Generation is deterministic and remains non-registering:

```text
artifact count:          17
manifest byteLength:     4,629
manifestKeccak256:       0xb512227b92505b5986559fb132d72823828f22c5ab5e2c68daa8672cb93332db
protocolReleaseId:       0x6b46ce9c3cecbee25ec33b44115846bf8b3c3cd7d246305154e3ff330af47449
registrationAuthorized:  false
offline bundle:          verified
```

The immediate selected-spec parent was recovered from the repository's Git
object database rather than approximated:

```text
parent manifest blob: cdc9bbb88b33d630ad0ead1c070f2ca836c01649
parent bundle blob:   0c51159d6e2a562a839a890cfc6dbf4d73422eb0
```

| Surface | Parent | Corrected | Delta |
| --- | ---: | ---: | ---: |
| Manifest bytes | 4,628 | 4,629 | +1 |
| Embedded bundle bytes | 1,301,807 | 1,311,072 | +9,265 |

The artifact count remained 17. Exactly five manifest-bound artifacts changed:

| Artifact | Parent bytes | Corrected bytes | Delta |
| --- | ---: | ---: | ---: |
| Creation-attestation vectors | 29,659 | 30,260 | +601 |
| Provenance vectors | 9,766 | 15,811 | +6,045 |
| tokenURI vectors | 283,847 | 282,314 | −1,533 |
| Provenance Markdown | 5,739 | 6,105 | +366 |
| Provenance JSON Schema | 5,091 | 6,560 | +1,469 |

The creation-attestation profile, contract ABIs, work/renderer profiles, art
spec, Agent schemas, and unrelated conformance fixtures remained byte-identical
to the immediate parent.

## Measurements

### Canonical provenance bounds

The minimum and maximum fixtures use all relevant accepted boundaries,
including minimum/nonzero and maximum uint256 chain IDs, 1/64-byte lines and
declarations, the optional 256-byte model identifier, and optional 128-byte
Agent transport identifiers.

| Variant | Minimum | Representative | Maximum | Cap |
| --- | ---: | ---: | ---: | ---: |
| Manual | 1,512 | 1,548 | 2,113 | 20,000 |
| Agent-run | 1,707 | 1,890 | 2,752 | 20,000 |

The maximum valid record is 17,248 bytes below the existing cap. No cap change
was required.

### Observed record versus corrected representative

The comparison holds the representative work and mint inputs constant and
changes only the provenance payload.

| Metric | Observed hybrid | Corrected manual | Delta |
| --- | ---: | ---: | ---: |
| Provenance bytes | 2,022 | 1,548 | −474 |
| ABI mint calldata bytes | 2,916 | 2,436 | −480 |
| Calldata zero bytes | 768 | 762 | −6 |
| Calldata nonzero bytes | 2,148 | 1,674 | −474 |
| Intrinsic calldata gas | 37,440 | 29,832 | −7,608 |
| Dynamic provenance data slots | 64 | 49 | −15 |
| Slots including the string length slot | 65 | 50 | −15 |

The 15 removed zero-to-nonzero data slots remove 300,000 gas from the base
20,000-gas-per-slot storage-write component. Full transaction execution also
includes cold-access, memory, hashing, and surrounding mint costs and is not
represented by that component alone.

### Otherwise-identical empty versus mock-attested mint

Both measurements use the same canonical Agent-run provenance and identical
work, PATH, release, selected pair, declarations, minter, and run hash. Only
the Creation Attestation proof/verification path differs.

| Metric | Empty proof / Unattested | EOA mock proof / attested | Delta |
| --- | ---: | ---: | ---: |
| Measured `token.mint` gas | 1,799,376 | 1,831,465 | +32,089 |
| ABI calldata bytes | 2,788 | 2,884 | +96 |
| Forge test-level gas | 3,038,794 | 3,201,819 | +163,025 |

The measured provenance hash was identical on both paths:
`0x02aa92f4de8ce2aabe903295686f2d0abcccb7c50d82ccc569293bc24b585f2a`.

## Contract Bytecode and Storage-Layout Impact

This correction changed no production Solidity source, ABI, storage field, or
attestation profile. The immediate-parent bundle comparison confirms the
contract artifacts are byte-identical. Current compiled sizes are recorded for
auditability:

| Contract | Initcode bytes | Runtime bytes |
| --- | ---: | ---: |
| `ThoughtNFT` | 21,109 | 19,909 |
| `ThoughtRenderer` | 16,518 | 16,492 |
| `CreationAttestationVerifier` | 5,214 | 3,864 |

`ThoughtNFT` top-level storage remains slots 0–7:

```text
0 totalSupply
1 tokenOfWorkHash
2 tokenOfAgentIdentityHash
3 _ownerOf
4 _balanceOf
5 getApproved
6 isApprovedForAll
7 _records
```

`ThoughtRecord` remains 352 bytes/11 static slots, with `provenanceJson` at
relative slot 4 and the same existing dynamic-string representation. The
contract still checks only nonempty provenance and the 20,000-byte bound,
stores exact bytes, hashes exact bytes, and exposes them through token state and
metadata.

The Solidity test-only canonical serializer is a parity mirror for dynamic
contract addresses and test inputs; it is not a production producer or parser.
Its complete tokenURI output is pinned against the TypeScript shared-builder
golden hash above. Explicit malformed JSON remains only in named negative
opaque-boundary tests.

## Verification Matrix

| Command/check | Result |
| --- | --- |
| Repinned input byte/SHA checks | Passed; all four exact pins reconciled |
| `npm run protocol:build` | Passed repeatedly; identical release identity |
| `npm run protocol:check` | Passed; 17 artifacts and offline bundle verified |
| `npm test` | Passed; 13 files, 84 tests |
| Provenance-focused Vitest | Passed; 11 tests |
| `npm run test:evm` | Passed; 5 suites, 149 tests |
| `forge test --match-contract ThoughtNFTTest` | Passed; 77 tests |
| Focused empty/attested gas traces | Passed; exact events captured |
| `npm run build` | Passed; TypeScript and Vite production build |
| `npx tsc --noEmit` | Passed |
| `npm run build:evm` | Passed; existing lint notes only |
| `forge fmt --check test/ThoughtNFT.t.sol` | Passed |
| `git diff --check` | Passed |
| Fresh `npm run devnode:gallery` | Passed; 60 positive Anvil mints |
| Live RPC stored/download/hash verification | Passed; 60/60 |
| Headless DOM/network/screenshot inspection | Passed; gallery ready, 60 cards |

The EVM build emitted an environment-only inability to write Foundry's global
signature cache under the sandbox; compilation still completed successfully.
No generated or source artifact depended on that cache.

## Non-Regression

The correction did not change the five ordered marketplace traits, typed
prompt/Agent/declaration state, work identity, Agent-line uniqueness, binary
field, metrics, SVG/renderer bytes, PATH behavior, ERC-721 behavior, selected
spec contract gate, or Creation Attestation type/profile.

Historical THOUGHT V1 remains covered by the frontend archive test, five V1
preview tests, and 51 V1 NFT tests in the green full suites. Unrelated V2 work,
renderer, release, Agent-run, selected-spec, and attestation tests also pass.

## Scope, External Actions, Deviations, and Stop Conditions

No production THOUGHT App/backend, protected signer service, key management,
JSON parser in Solidity, public-chain deployment, contract verification,
release registration, IPFS upload, pinning, candidate/stable publication,
consumer rollout, commit, tag, or push occurred. The only chain action was the
disposable local Anvil 31337 rollout requested for inspection.

`registrationAuthorized` remains `false`. The current dirty worktree is not
publish-ready under the artifact-consumption rules. Publication must stop until
the complete inherited worktree is intentionally reviewed, cleaned, tested,
secret-scanned as required for commit, and committed.

No protocol deviation or unresolved correction stop condition remains. The
local Vite lab and Anvil node are intentionally left running for operator
inspection.
