# THOUGHT V2 Set 5 Solidity `tokenURI()` Gas Report

Date: 2026-07-27
Branch: `codex/thought-v2-chat-svg-experiment`
Status: measured noncanonical experiment; not a release, registration, deployment, or renderer-selection claim

## Set 5 outcome

All four Set 5 Solidity experiments pass both acceptance targets through the
actual `ThoughtNFTV2.tokenURI(tokenId)` entry point. Each result uses a fresh
Anvil node, the identical 66-work gallery corpus, and the same two 64-byte
boundary pairs:

| Set 5 member | Minimum | Average | Distinct 64-byte pair | All-glyph 64-byte pair / maximum | Below 10M | Below 8M |
|---|---:|---:|---:|---:|---:|---:|
| Classic Line | 3,504,497 | 4,775,341 | 6,594,066 | **6,720,794** | 68/68 | 68/68 |
| Classic Book | 3,504,497 | 4,777,081 | 6,597,078 | **6,723,823** | 68/68 | 68/68 |
| Classic Round | 3,505,207 | 4,789,970 | 6,629,520 | **6,757,098** | 68/68 | 68/68 |
| Classic Compact | 3,505,685 | 4,784,754 | 6,616,110 | **6,745,451** | 68/68 | 68/68 |

Classic Line is the least expensive member and Classic Round is the most
expensive member in this corpus. The spread between their maximum calls is only
36,304 gas, approximately 0.54% of the Classic Line maximum. All four retain at
least 1,242,902 gas of headroom under the preferred 8M criterion.

The measured set contains all 66 current gallery fixtures plus:

1. a distinct valid 64-byte prompt and distinct valid 64-byte Agent line; and
2. a valid 64-byte pair whose union exercises all 75 visible approved glyphs.

The gas-risk question is resolved for all four exact Set 5 experimental
implementations. Renderer selection is not resolved by this measurement alone.
Humanist Smooth remains the current candidate in the canonical renderer
profile, while every Set 5 integration remains explicitly noncanonical and
`UNLICENSED`.

## Integrated implementation

### Exact glyph input

The experiment consumes the exact Set 5 Classic Book IM76 v1 artifact:

- Library member: `inshell.thought.glyph-library.set-05.classic-book`
- Source JSON SHA-256: `2fee7d1d8db39f826d18d1e80f0e6e0a2d4bc45a03fdaaa5bde64e6cc004d401`
- Packed payload bytes: 2,529
- Packed payload SHA-256: `8f06f5c682e0d87b2841c3f4e2b701783618a8002b42bf93421e83dbb21420ec`
- Packed payload Keccak-256: `0x03f58877357253fc49b602679cba45be53526b52f073e4fa8d936f7884f2eab8`

`ThoughtSvgRendererV2ClassicBook` rejects a missing, wrong-length, wrong-hash, malformed-header, non-monotonic, or out-of-range payload. The packed bytes live in one immutable code-storage contract. Solidity copies only the paths used by the current work into its SVG `<defs>`.

### SVG transport optimization

The first exact Solidity integration passed the hard limit but missed the preferred target on three maximum-length works:

| Run | Minimum | Average | Maximum | Below 10M | Below 8M |
|---|---:|---:|---:|---:|---:|
| Initial exact integration | 3,521,797 | 5,555,273 | 8,708,239 | 68/68 | 65/68 |
| Final compact row-group integration | 3,504,497 | 4,777,081 | 6,723,823 | 68/68 | 68/68 |

The final optimization does not change glyph geometry, composition, wrapping, color, scale, or field alignment. It changes SVG transport only:

- compact definition IDs such as `g41`, matching the planned native-SVG glyph form;
- one `translate(...) scale(2.88 -2.88)` transform per rendered row;
- compact `<use href="#g41" x="..."/>` instances inside each row.

This removes repeated family names and repeated transforms from every glyph instance. The maximum measured call fell by 1,984,416 gas, or 22.79%.

### Metadata bridge

`ThoughtRendererV2Split` now reads the renderer implementation ID, glyph member ID, glyph source commitment, payload commitment, and SVG from its immutable SVG renderer. This allows the same complete V2 metadata/provenance projection to benchmark a different native-path implementation without changing `ThoughtNFTV2`.

The experiment preserves:

- exact prompt and Agent lines;
- the canonical contract traits;
- attested Agent/Model trait gating;
- exact canonical provenance bytes and provenance hash;
- selected spec pair and protocol release facts;
- PATH ID and serial;
- renderer ID, implementation ID, glyph member, and packed-payload commitment;
- embedded base64 JSON and embedded base64 SVG marketplace shape.

## Final Anvil measurements

Environment:

- chain ID `31337`;
- fresh disposable Anvil node;
- Solidity `0.8.28`;
- optimizer enabled, 200 runs;
- `via_ir = true`;
- actual canonical provenance v2 fixture construction;
- actual positive mint flow, including mock-attested and unattested fixtures;
- gas measured with `eth_estimateGas` on `ThoughtNFTV2.tokenURI(tokenId)`.

| Vector | Token | Prompt bytes | Agent bytes | `tokenURI()` gas |
|---|---:|---:|---:|---:|
| All 75 visible glyphs across a maximum pair | 68 | 64 | 64 | 6,723,823 |
| Distinct maximum 64-byte pair | 67 | 64 | 64 | 6,597,078 |
| Existing alphabet maximum fixture | 18 | 64 | 64 | 6,328,698 |
| Existing maximum-weight fixture | 16 | 64 | 64 | 5,841,485 |
| Existing maximum-punctuation fixture | 17 | 64 | 64 | 5,835,562 |
| Existing repeated maximum fixture | 15 | 64 | 64 | 5,629,440 |

Headroom at the measured maximum:

- 3,276,177 gas below the 10M hard limit;
- 1,276,177 gas below the preferred 8M limit.

### Same-corpus Humanist control

The unchanged Humanist Smooth path was redeployed on a second fresh Anvil node after the shared gallery-script changes. Comparing the same 66 gallery fixtures:

| Renderer | Minimum | Average | Maximum | Below 10M | Below 8M |
|---|---:|---:|---:|---:|---:|
| Humanist Smooth current candidate | 3,381,128 | 6,452,019 | 10,924,647 | No | No |
| Classic Book final experiment | 3,504,497 | 4,720,010 | 6,328,698 | Yes | Yes |

Classic Book is slightly more expensive for the smallest observed work, but materially cheaper across the corpus and at the maximum. The current Humanist candidate still exceeds the 10M hard criterion on its existing 64-byte alphabet fixture.

The complete 68-row measurement sets are in:

- `artifacts/benchmarks/thought-v2-classic-line.anvil.json`
- `artifacts/benchmarks/thought-v2-classic-book.anvil.json`
- `artifacts/benchmarks/thought-v2-classic-round.anvil.json`
- `artifacts/benchmarks/thought-v2-classic-compact.anvil.json`

## Deployment measurements

These are exact creation receipts from the final disposable Anvil run:

| Component | Runtime bytes | Deployment gas |
|---|---:|---:|
| Classic Book IM76 code-storage payload | 2,530 | 600,174 |
| `ThoughtSvgRendererV2ClassicBook` | 9,688 | 2,198,566 |
| `ThoughtRendererV2Split` metadata bridge | 11,237 | 2,501,931 |
| `ThoughtNFTV2` | 17,252 | 3,879,636 |

The SVG and metadata renderer contracts are each independently below the EIP-170 24,576-byte runtime limit. The average mint in the 68-token run used 1,377,270 gas.

## Visual and structural QA

The final all-glyph maximum token was read from the deployed NFT through JSON-RPC and rendered in headless Chromium.

Observed:

- HTTP/RPC failures: 0;
- SVG dimensions: `1024x1024`;
- viewBox: `0 0 1024 1024`;
- distinct embedded glyph definitions: 75;
- glyph uses: 128;
- rendered row groups: 6;
- prompt remained top/right aligned;
- Agent line remained bottom/left aligned;
- 32-unit `#006100` frame, black 960 canvas, and `#00ff00` centerline glyphs rendered correctly.

No `<text>`, `foreignObject`, browser font lookup, embedded WOFF/TTF, or fallback font is used.

## Regression results

- `npm run renderer:v2:check`: passed
- `npm run renderer:v2:classic-book:check`: passed
- `npm run renderer:v2:set5:check`: passed
- `npm run build:evm`: passed
- `npm run test:evm`: passed — 192 tests
- `npm test`: passed — 173 tests
- `npm run build`: passed
- four exact disposable Anvil benchmarks: passed — 272 total mints, provenance/metadata parity, hard gas gate, and preferred gas gate
- unchanged Humanist gallery control: passed functional/parity checks — 66 mints; its gas telemetry confirms the existing hard-limit miss

## Reproduction

```sh
npm run devnode:v2:set5:benchmark
```

The command creates and stops one fresh disposable Anvil node per Set 5 member.
It fails if any measured `ThoughtNFTV2.tokenURI()` call reaches either
8,000,000 or 10,000,000 gas.

## Release boundary

This experiment must not be described as canonical, stable, production-ready, registered for production, or selected for THOUGHT V2.

Before selection, the owner must separately decide:

1. whether any Set 5 member is the approved visual family;
2. whether the Set 5 package's current `UNLICENSED` status is acceptable or must be replaced by explicit release terms;
3. whether the split SVG/metadata topology is the intended production dependency model; and
4. whether to amend the canonical renderer profile, manifest artifacts, deployment scripts, and downstream handoff.

Until those decisions are made, the existing Humanist Smooth renderer path remains unchanged.
