# THOUGHT V2 Post-Implementation Delta — Implementation Report

Date: 2026-07-16

Status: implemented and locally verified; draft artifacts and disposable Anvil
fixtures only; no public-chain release, registration, or version-control
publication action authorized

Source specification:

```text
/Users/bigu/Downloads/THOUGHT_V2_POST_IMPLEMENTATION_DELTA_SPEC.md
```

## Outcome

The two approved normative deltas are implemented:

1. `Binary Contrast` is no longer a front metadata attribute. Exact
   `bitDistance` remains in technical properties.
2. `Declared Model` is an exact typed, immutable, declaration-only mint field,
   stored by `ThoughtNFT`, exposed by a typed getter, carried by Agent and
   provenance envelopes, and serialized as the third metadata attribute.

The final ordered front attribute set is exactly:

```text
Prompt
Agent Response
Declared Model
Texture Density
Protocol
```

No language field or classifier was added. The three Texture Density bands and
their exact boundaries remain unchanged. There is no typed Declared Agent
field, no five-band density change, and no Protocol-trait removal.

## Authority and Stop Conditions

The operator explicitly requested local implementation of the delta spec.
That request authorized source, fixture, generated-artifact, test, and local
gallery changes. The initial implementation phase stopped before every external
action listed by the spec's mandatory stop condition 14.

After implementation, the operator separately and explicitly authorized a
fresh disposable Anvil gallery deployment and fixture mint. That later local
validation deployed only to chain ID 31337, prepared fixture PATH tokens,
consumed their local THOUGHT movement units, and minted 60 disposable THOUGHT
tokens. It did not authorize or perform any public-chain deployment,
registration, verification, signing with real operator material, real PATH
consumption, commit, push, upload, pin, archive, candidate promotion, stable
promotion, or publication.

The Anvil state and generated runtime-address files are test state, not release
evidence or production deployment records.

`registrationAuthorized: false` means registration is intentionally not
authorized. It does not mean that the manifest hash is technically incapable
of registration.

## Baseline Reconciliation

The delta spec pins the 2026-07-15 implementation report and these provisional
identities:

```text
manifest hash:       0x305f59465c93edf46e5ab0ca372b017f6cba5c98052e695ae6b9ca5778515d4b
protocol release ID: 0xea4493c669fc366e224e66a43233e1e97efecd18568ef494dfc31b4a3c961b65
source tag:           thought-v2-protocol-release-binding-20260716
source commit:        ec46cbf
```

At the start of this delta task, the worktree also contained later uncommitted
full-canvas renderer and Anvil-gallery work. Its generated pre-delta local
identity was:

```text
manifest hash:       0xc46e1b3dbab5128bc4af98bc009dca3e45e6903c8263e0eb49cb5eb32fc16e0d
protocol release ID: 0xcab9cb82294d90e90d60203b27195c4daa75ea365f3d9b249caf5cd4006d6673
```

That is the executable-source discrepancy covered by delta-spec Section 1.1.
The old implementation report was not rewritten during this delta. Aggregate
measurement tables below compare with the pinned report, while attribution
notes separate the pre-existing full-canvas renderer change from this delta.

## Decision Ledger Applied

| ID | Decision | Implementation result |
| --- | --- | --- |
| DELTA-001 | Canonical Prompt/Agent Language | Rejected; no ABI, state, provenance, metadata, or classifier added |
| DELTA-002 | Three Texture Density bands | Preserved exactly; Open 0–460, Balanced 461–563, Dense 564–1,024 |
| DELTA-003 | Typed Declared Agent | Deferred; no contract field or trait added |
| DELTA-004 | Remove Protocol trait | Deferred; `Protocol: V2` remains fifth |
| DELTA-005 | Demote Binary Contrast | Implemented; trait/classifier removed, exact `bitDistance` retained |
| DELTA-006 | Inferred-language search | Deferred and noncanonical |
| DELTA-007 | Writing System traits | Deferred |
| DELTA-008 | Typed Declared Model | Implemented as exact declaration-only context |

## Contract and Identity Semantics

`MintThoughtInput` and `ThoughtRecord` now contain `string declaredModel`.
`ThoughtNFT.mint` validates it before provenance checks, spec checks, and PATH
consumption under the same strict visible-line profile used by prompt and Agent
lines:

```text
UTF-8 bytes:              1..64
normalization:            none
trimming/case conversion: none
internal whitespace:      U+0020 only
outer spaces:             rejected
controls/default-ignorables/noncharacters/non-ASCII whitespace: rejected
```

`declaredModelOf(tokenId)` returns the exact stored bytes. The declaration is
not verified provider identity and does not affect:

```text
promptLine or agentLine
prompt/Agent hashes
Agent-line uniqueness
binary field or loom metrics
SVG source
workHash
PATH authorization or consumption semantics
```

Invalid model calldata, including raw malformed UTF-8, reverts before PATH is
called. PATH failure, receiver failure, duplicate Agent work, and reentrancy
continue to roll back all mint state atomically.

To preserve the existing approximate 22 KiB NFT review gate after adding typed
model state and serialization, the aggregate `recordOf` convenience view and
the pre-mint `previewSvg` convenience view were removed. Exact individual
getters, `svgOf`, and `tokenURI` remain authoritative. Their absence is covered
by an ABI-surface regression test.

## Metadata and Gallery

Canonical metadata has five ordered attributes. `Declared Model` is exact and
unadorned; source and identifier do not enter its trait value. `Binary Contrast`
is absent. `properties.bitDistance` remains exact.

The `thought` payload also carries exact `declaredModel`. The gallery parser
requires the canonical attribute count/order and requires the Declared Model
trait to equal `thought.declaredModel`. A stale pre-delta token cannot be shown
as if it implemented this release.

The gallery presents the exact contract-derived density plus:

```text
Loom: N / 1,024 underlying cells filled
```

That supporting line is rendered in both selected-token and card views. It is
derived from `properties.loomWeight`, validated as an integer in 0..1,024, and
does not become a second categorical trait.

## Agent and Provenance Envelopes

The Agent result now atomically requires:

```json
{
  "agent": {
    "label": "...",
    "model": {
      "label": "...",
      "identifier": "optional exact identifier",
      "source": "connector_observed | runtime_configured | agent_declared | manual | unknown"
    }
  }
}
```

The model label uses the same exact line validator as the contract. The parser
does not trim, normalize, case-fold, or partially accept the envelope.

Both manual and Agent-run provenance processes require the same typed
`declaredModel` object. Verification compares its label with typed contract
facts and reports the source as declaration-only evidence. Optional identifier
and source are preserved in provenance but excluded from the metadata trait.

## Profiles, Fixtures, and Generated Identity

Normative creative spec, Agent-result schema, provenance spec/schema, work
profile, renderer metadata order, contract ABI/interface, fixtures, embedded
bundle, and generated Solidity constants were regenerated together.

Current draft identity:

```text
artifacts:                    14
manifest byte length:         3,779
manifest hash:                0xfc5a03d61535321f6290bc9168b7465bd7c468544266ff5ff0942c30414ab24e
protocol release ID:          0xfd282fd034e4643b8a2c67b91fa975d377e0ea6035744ee731533cb028decba7
renderer profile keccak256:   0x32c07a7f39b10a0155ff189d6cd7c709f215be12dcdc27e19763c34a8c184fe0
work profile keccak256:       0x1e0e2740604081c95050008efe7723ce211f9d03a01d88b03f94004cd9a2cd87
registration authorized:      false
offline bundle:               verified
```

Exact parity anchors:

```text
one-byte SVG keccak256:
0x9ecc3ca8c790cf007aa830ebfb23479f0b302f54b264d26fbcea6b0a1e199aa0

deterministic full tokenURI keccak256:
0xd6542ec077ed1418b39a9e1a960e5d25612159e35c8e237acdfe4b84b7bb7621
```

The unchanged SVG hash proves that Declared Model and Binary Contrast demotion
do not alter artwork bytes. The changed tokenURI hash and release identity are
required consequences of the normative metadata/profile changes.

Generated conformance coverage includes 1-byte, 64-byte, safe non-ASCII, and
repeated-space model labels; every shared text-profile rejection; malformed raw
UTF-8; exact Agent/provenance envelopes; exact traits; and same/different model
labels across unchanged work inputs.

## Cost and Size Measurements

Compiler posture remains Solidity 0.8.28, optimizer 200 runs, `viaIR`, Prague,
no bytecode hash, and disabled CBOR metadata.

### Mint, calldata, and storage

The pinned report's no-model 1-byte-line mint was 537,053 gas.

| Case | Final gas | Delta from pinned no-model mint |
| --- | ---: | ---: |
| 1-byte lines, 1-byte model | 561,569 | +24,516 |
| 1-byte lines, `Fixture Model` (13 bytes) | 563,612 | +26,559 |
| 1-byte lines, 64-byte model | 616,646 | +79,593 |
| 64-byte lines, 13-byte model | 673,820 | +26,568 versus pinned 647,252 |
| 64-byte four-byte Unicode lines, 13-byte model | 813,354 | +26,568 versus pinned 786,786 |

Holding both lines constant, a 64-byte model costs 55,077 gas more than a
1-byte model. It remains below the approved complete-mint ceiling.

For the same representative mint payload, ABI calldata changes as follows:

| Model bytes | Calldata bytes | Delta from old ABI |
| ---: | ---: | ---: |
| no model field | 676 | — |
| 1–32 | 772 | +96 |
| 64 | 804 | +128 |

Fresh model storage is exact Solidity dynamic-string storage:

| Model bytes | Fresh per-token slots |
| ---: | ---: |
| 1–31 | 1 inline slot |
| 32 | 2 slots: head plus one data slot |
| 64 | 3 slots: head plus two data slots |

The record layout grows from 256 to 288 in-place bytes before dynamic data.
No model hash or truncated surrogate is stored instead of the display value.

### Bytecode and deployment

| Contract/state | Pinned runtime | Final runtime | Runtime delta | Pinned initcode | Final initcode | Initcode delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `ThoughtNFT` | 21,267 B | 22,199 B | +932 B | 22,169 B | 23,087 B | +918 B |
| `ThoughtRenderer` | 8,462 B | 8,523 B | +61 B | 8,488 B | 8,549 B | +61 B |

The already-running pre-delta full-canvas Anvil renderer is also 8,523 bytes,
so the renderer delta attributable to this spec is zero. The +61-byte pinned
comparison belongs to the earlier full-canvas geometry correction. Read-only
inspection of the pre-delta NFT found 21,267 runtime bytes.

Final NFT runtime has 329 bytes of headroom below the 22 KiB review target and
2,377 bytes below EIP-170.

| Deployment | Pinned gas | Final gas | Delta |
| --- | ---: | ---: | ---: |
| `ThoughtNFT` | 4,317,597 | 4,504,525 | +186,928 |
| `ThoughtRenderer` | 1,728,359 | 1,740,591 | +12,232 |
| Combined | 6,045,956 | 6,245,116 | +199,160 |

The renderer deployment delta is likewise attributable to the earlier
full-canvas source discrepancy, not Declared Model.

### Views and returned bytes

| Case | Final gas | Returned bytes |
| --- | ---: | ---: |
| `svgOf`, short lines | 7,831,967 | 18,246 |
| `tokenURI`, short lines, 13-byte model | 12,430,934 | 35,909 |
| `tokenURI`, short lines, 64-byte model | 12,640,292 | 36,045 |

Against the pinned report's short `tokenURI` value of 11,645,150 gas and
34,009 bytes, the aggregate final delta is +785,784 gas and +1,900 returned
bytes. That aggregate includes the pre-existing full-canvas SVG growth.

To isolate metadata serialization from artwork, the existing pre-delta Anvil
token #1 was transformed in memory only, preserving its exact SVG and all
technical values. Removing Binary Contrast and adding Declared Model changed
the complete data-URI length by +16 bytes for a 1-byte label, +48 bytes for a
13-byte label, and +184 bytes for a 64-byte label.

## Verification

Final sequential verification results:

```text
npm run protocol:build   passed; 14 exact-byte artifacts regenerated
npm run protocol:check   passed; embedded bundle verified offline
npm test                 passed; 66 tests
npm run build            passed
npm run build:evm        passed
npm run test:evm         passed; 119 tests
  ThoughtSpecRegistryV2  5
  active V2              58
  archived V1            56
npm run devnode:gallery  passed; 60 of 61 fixtures minted on disposable Anvil
gallery/tokenURI tests   passed; 9 focused tests after final gallery cleanup
forge fmt --check        passed for active changed Solidity files
git diff --check         passed
```

Repository-wide `forge fmt --check` still reports unrelated pre-existing
formatting differences in registry and archived V1 files; those files were not
bulk-reformatted as part of this delta.

Coverage verifies exact model storage and escaping, every boundary and frozen
character rejection, raw-calldata rejection before PATH, no model influence on
work/loom/SVG/uniqueness, receiver/PATH/reentrancy atomicity, exact five-trait
order, retained `bitDistance`, Solidity/TypeScript tokenURI parity, and V1
non-regression.

## Disposable Anvil and Browser Evidence

The local gallery was verified at:

```text
http://127.0.0.1:5177/thought-v2-lab.html
RPC:       http://127.0.0.1:8545
chain ID:  31337
THOUGHT:   0x04C89607413713Ec9775E14b954286519d836FEf
```

The first positive-check attempt exposed a stale persistent Anvil state. Its
contract still emitted the pre-delta ordered attributes, including Binary
Contrast, even though the runtime config named the new draft release. The
gallery correctly rejected that mismatch rather than presenting stale tokens
as current-release evidence.

The stale node was replaced with a clean ephemeral Anvil process without a
persistent `--state` file. `npm run devnode:gallery` then rebuilt the protocol,
deployed the current contracts, prepared PATH fixtures, and minted 60 THOUGHT
tokens from 61 source fixtures. One source fixture was intentionally omitted
because it duplicated an Agent line and therefore hit the canonical global
Agent-line uniqueness rule.

Final direct RPC evidence:

```text
configured release:  0xfd282fd034e4643b8a2c67b91fa975d377e0ea6035744ee731533cb028decba7
contract release:    0xfd282fd034e4643b8a2c67b91fa975d377e0ea6035744ee731533cb028decba7
release match:       true
total supply:        60
token 1 model:       Fixture Model
token 1 attributes:  Prompt
                     Agent Response
                     Declared Model
                     Texture Density
                     Protocol
```

The release and attribute audit was repeated after the old persistence interval
and again after browser validation; the current contract state remained stable.

Final in-app and headless-browser evidence:

```text
gallery state:                ready
status:                       60 tokenURI records loaded from Anvil
rendered token cards:         60
card trait rows:              300
per-token provenance files:  60
selected-token provenance:    1
broken token images:          0
desktop horizontal overflow: false
mobile horizontal overflow:  false
```

Both desktop 1440x1000 and mobile 390x844 checks observed the same 60 cards,
300 canonical trait rows, 60 card provenance files, and zero broken images.
This is positive local evidence for the post-delta contract metadata and
gallery parser. It is not public deployment, registration, or release evidence.

## Remaining Decisions

The implementation is ready for source review. Separate explicit authority is
still required for each of these:

```text
commit/tag/push the delta source
approve a candidate or stable artifact release
register the protocol manifest
deploy or verify contracts on a public chain
mint with real PATH units
publish, pin, or notify downstream consumers
```

None is implied by this local implementation report.
