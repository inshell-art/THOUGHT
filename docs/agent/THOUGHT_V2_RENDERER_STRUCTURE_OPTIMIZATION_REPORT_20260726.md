# THOUGHT V2 Renderer Structure Optimization Report

Date: 2026-07-26
Branch: `codex/thought-v2-chat-svg-experiment`
Baseline commit: `be0e9a5`
Status: implementation experiment; no release or deployment selection

## Outcome

Keep the optimized monolithic `ThoughtRendererV2` as the current implementation.

The selected final pass reduces runtime bytecode by 3,048 bytes (14.27%) and exact Anvil deployment gas by 659,846 gas (13.95%) without changing canonical SVG or tokenURI bytes. It deliberately spends 188 runtime bytes and 40,604 deployment gas relative to the smallest intermediate monolith to make renderer calls substantially cheaper. The split candidate gives each contract more individual bytecode headroom, but costs 10.23% more combined runtime bytecode and 11.65% more deployment gas than the selected monolith while adding another immutable contract dependency.

The split is therefore useful as measured contingency architecture, not the preferred current deployment.

## What changed in the monolith

1. Metadata hashes are derived and hex-encoded once into a `DerivedMetadata` value, then reused by both `properties` and `thought` assembly. Previously the renderer recomputed hashes and repeatedly encoded the same values.
2. SVG `<use>` rows are assembled into one bounded byte buffer. The previous per-glyph `string.concat` path repeatedly copied the complete accumulated output.
3. Prompt and Agent calldata are copied once per render and reused by wrapping, glyph selection, and XML escaping.
4. The renderer no longer embeds a second copy of the visible-UTF8 declaration validator. `ThoughtNFTV2.mint` validates `declaredAgent` and `declaredModel` before storing them, so canonical `tokenURI` input is already valid. Prompt and Agent work-line validation remains in the renderer because the same renderer also exposes `render(promptLine, agentLine)` directly.

This changes no NFT state, mint rule, renderer ABI, metadata field, trait, SVG layout, glyph selection, or output byte.

The only deliberately reduced behavior is for arbitrary direct calls to `ThoughtRendererV2.tokenURI(TokenData)` that do not originate from stored `ThoughtNFTV2` state: declaration labels are escaped and rendered but are no longer independently profile-validated by the renderer. Such calls cannot alter NFT state and are outside the canonical tokenURI path.

## Split candidate

The measured split consists of:

- `ThoughtSvgRendererV2`: work-line validation, wrapping, native-path glyph lookup, and SVG assembly.
- `ThoughtRendererV2Split`: metadata, traits, hashes, provenance projection, tokenURI assembly, and one external call to the immutable SVG renderer.
- `IThoughtSvgRendererV2`: the narrow bridge between them.

`ThoughtRendererV2Split` rejects a missing/non-contract SVG renderer and verifies its implementation ID before pinning it. It is not wired into current deployment scripts or `ThoughtNFTV2`.

## Compiler and measurement conditions

- Solidity `0.8.28`
- optimizer enabled, 200 runs
- `via_ir = true`
- metadata bytecode hash disabled
- canonical Humanist Smooth glyph storage pointers shared by all variants
- glyph-storage contract deployment gas excluded from renderer comparisons because those dependencies are identical
- runtime/creation bytes measured from Foundry artifacts
- deployment gas measured as actual contract-creation transactions on disposable Anvil
- call gas measured in isolated Foundry tests with identical representative and boundary inputs

## Bytecode and deployment comparison

| Structure | Runtime bytes | Creation bytes | Exact Anvil deploy gas | Runtime change vs original | Deploy change vs original |
|---|---:|---:|---:|---:|---:|
| Original monolith | 21,358 | 22,300 | 4,730,311 | — | — |
| Smallest intermediate monolith | 18,122 | 19,064 | 4,029,861 | -3,236 (-15.15%) | -700,450 (-14.81%) |
| Selected buffered monolith | 18,310 | 19,252 | 4,070,465 | -3,048 (-14.27%) | -659,846 (-13.95%) |
| Split: SVG contract | 8,032 | 8,967 | 1,845,942 | — | — |
| Split: metadata contract | 12,151 | 13,031 | 2,698,561 | — | — |
| Split: combined | 20,183 | 21,998 | 4,544,503 | -1,175 (-5.50%) | -185,808 (-3.93%) |

Compared directly with the selected buffered monolith, the combined split adds:

- 1,873 runtime bytes (+10.23%)
- 2,746 creation bytes (+14.26%)
- 474,038 deployment gas (+11.65%)
- one additional immutable deployed dependency and deployment/pinning step

## EIP-170 headroom

The EIP-170 runtime limit is 24,576 bytes.

| Contract | Runtime bytes | Remaining headroom |
|---|---:|---:|
| Original monolith | 21,358 | 3,218 |
| Smallest intermediate monolith | 18,122 | 6,454 |
| Selected buffered monolith | 18,310 | 6,266 |
| Split metadata | 12,151 | 12,425 |
| Split SVG | 8,032 | 16,544 |

The selected monolith retains 6,266 bytes of headroom—1.95 times the original—without taking on split-contract complexity.

## Representative call comparison

Input:

- Prompt: `Are you there?`
- Agent: `I am here.`

| Structure | `render` gas | `tokenURI` gas | SVG bytes | tokenURI bytes |
|---|---:|---:|---:|---:|
| Original monolith | 301,488 | 2,793,507 | 7,787 | 19,697 |
| Smallest intermediate monolith | 301,548 | 2,782,766 | 7,787 | 19,697 |
| Selected buffered monolith | 267,682 | 2,614,645 | 7,787 | 19,697 |
| Split | 310,754 | 2,778,553 | 7,787 | 19,697 |

Relative to the smallest intermediate monolith, the selected pass saves 33,866 render gas (-11.23%) and 168,121 tokenURI gas (-6.04%). Relative to the original, it saves 33,806 render gas (-11.21%) and 178,862 tokenURI gas (-6.40%). The split now costs 43,072 more render gas (+16.09%) and 163,908 more tokenURI gas (+6.27%) than the selected monolith.

## Boundary call comparison

The boundary vector uses distinct valid 64-byte prompt and Agent lines.

| Structure | `render` gas | `tokenURI` gas | SVG bytes | tokenURI bytes |
|---|---:|---:|---:|---:|
| Smallest intermediate monolith | 2,072,720 | 11,048,003 | 36,830 | 71,605 |
| Selected buffered monolith | 1,302,351 | 9,698,958 | 36,830 | 71,605 |
| Split | 2,122,263 | 10,609,329 | 36,830 | 71,605 |

Relative to the smallest intermediate monolith, the selected pass saves 770,369 render gas (-37.17%) and 1,349,045 tokenURI gas (-12.21%). It brings this synthetic maximum-line tokenURI below 10 million gas. The split costs 819,912 more render gas (+62.96%) and 910,371 more tokenURI gas (+9.39%) than the selected monolith.

## Exact output parity

Representative output:

- SVG Keccak-256: `0x7e27ca1bbed4cd7a1ae4a78d35b711df7475f0c4228c09a4ea72ee6346d74b43`
- tokenURI Keccak-256: `0x59f28eca3e292aab7b00dbd179803a53dbd29f4f824ea5555e15ea4090999db0`

Boundary output:

- SVG Keccak-256: `0xfa7209c2dfd85a3c9eb80b4c2d4f23356663370addd3fc971548ebeabd101961`
- tokenURI Keccak-256: `0x608314dc3cc4c93c8eb82b9874830e8f89b306900b78741221bf6b4c6207e5dd`

The optimized monolith and split match exactly for:

- representative output
- punctuation/XML-sensitive output
- complete approved punctuation repertoire output
- four-row prompt and Agent layout
- unattested metadata
- attested metadata
- distinct maximum 64-byte prompt and Agent lines

## Validation

- `npm run build:evm`: passed
- `npm run test:evm`: passed
- 187 EVM tests passed; 0 failed; 0 skipped

## Recommendation

Use the optimized monolithic renderer for the next candidate artifact. Do not change deployment topology merely to split the renderer now.

Reconsider the split only if a later renderer revision cannot remain safely below the EIP-170 limit, or if independent SVG deployment becomes a deliberate governance/versioning requirement. If that happens, the measured candidate already defines the narrow interface and parity tests needed to make the move safely.
