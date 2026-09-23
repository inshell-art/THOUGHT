# Second Set protocol / storage critic

## Verdict

**Expanded native-SVG protocol: PASS for 36/36. Compact or on-chain storage: HOLD for 36/36.**

No font needs removal from the Second Set for a data-integrity, repertoire,
determinism, path-syntax, or metric-bounds failure. The compact hold is a shared
architecture hold, not a per-font geometry failure: the distributed package
contains expanded paths and a documented compact-data floor, but it does not
contain a compact font payload plus its decoder/renderer.

**Qualification-label recommendation:** retain `study-qualified` only if its
defined scope is “complete, deterministic, bounded expanded-native-SVG study
artifact.” That scope is now supported by `README.md`, `HANDOFF.md`, and
`storage-model.json`. It must not mean compact-storage-qualified,
on-chain-qualified, or production-ready. Add a separate machine-readable status
such as `compactStorageStatus: "unmeasured-hold"` and a qualification scope such
as `expanded-native-svg`. If one undifferentiated status must cover both the
expanded artifact and compact deployment, the honest single status is
`study-candidate`, not `study-qualified`.

## What was independently checked

- The bundle verifier passes all 36 fonts.
- The four Set 2 tests pass.
- All 36 disk font manifests byte-match fresh in-memory generation from the
  current source.
- All 36 byte reports recompute byte-for-byte.
- All 36 canonical fixtures rerender byte-for-byte.
- The source and bundle each expose exactly 12 segment masks, 12 stroke graphs,
  and 12 routed paths, with 36 distinct full-repertoire path signatures.
- The runtime loader lists 3 types and 36 fonts, loads 36/36, filters each type
  to 12, renders all 36, and rejects unsupported characters.
- The exact repertoire is 76 ordered slots per font: 75 visible glyphs plus
  metrics-only SPACE. Across the set this is 2,736 slots, 2,700 non-empty path
  mappings, and 36 empty SPACE mappings. Stored codepoints match their
  characters and every advance is 6.
- Every visible `d` uses uppercase absolute `M/L/H/V/Q/C/Z` syntax, finite
  operands, and at most two decimal places. No source glyph path contains a
  transform. Runtime line placement uses whole-glyph translation, as the handoff
  explicitly permits.
- Actual global coordinates are `x=0.45..5.32` and `y=0.33..6.96`, inside the
  declared `x=0.45..5.55` and `y=0.30..7.20` limits.
- The bundle has no symlinks. `SHA256SUMS` lists every one of the 121 other
  files exactly once; all 121 hashes match.

The npm dry-run contains 122 entries, is 8,421,640 bytes unpacked, and produces
a 614,926-byte package archive. The checksum file is excellent accidental-drift
protection, but it is not signed and therefore is not an authenticity mechanism.

## Render evidence

A headless Chrome pass loaded the generated gallery with HTTP 200 and found:

- 36 articles;
- 72 non-zero-size SVG specimens;
- 936 painted path elements;
- 12 members for each construction type;
- no horizontal page overflow at 1440×1200.

The routed-path filter exposed exactly 12 articles and 312 path elements. The
only failed request was the irrelevant missing favicon. The specimens visibly
paint and the route systems are materially different.

This is one browser engine, not cross-renderer equivalence. Fine relays,
overlapping even-odd subpaths, curves, and very dense corner systems should still
be compared in at least Chrome, Firefox, and librsvg/resvg before any
renderer-portability claim.

## Measured expanded storage

`rawPathBytes` and `normalizedPathBytes` are equal because the generator writes
already-normalized paths. `gzipBytesInformational` compresses only each font's
concatenated `d` strings; it is not the JSON manifest size, npm package size,
decoder size, or deployed-runtime size.

| Construction | Fonts | Expanded path bytes/font | Expanded total | Informational gzip/font | Commands/font |
| --- | ---: | ---: | ---: | ---: | ---: |
| Segment masks | 12 | 29,047–304,709 | 1,405,811 | 1,659–16,549 | 3,777–44,260 |
| Stroke graphs | 12 | 48,151–293,535 | 1,763,309 | 2,730–28,342 | 5,980–18,001 |
| Routed paths | 12 | 71,623–241,116 | 1,624,993 | 4,033–20,209 | 9,005–30,080 |
| **All Set 2** | **36** | **29,047–304,709** | **4,794,113** | **1,659–28,342** | **3,777–44,260** |

The 36 canonical JSON font manifests total 5,131,534 bytes. Other major bundle
costs are 1,226,209 fixture bytes and 1,988,422 gallery bytes.

Every expanded path corpus exceeds the 24,576-byte EIP-170 runtime limit before
JSON framing, lookup, or rendering code; even Row Ledger is 29,047 bytes. Gzip
does not change that conclusion unless a real decompressor and retrieval
architecture are included and measured.

## Per-font protocol and storage status

**Protocol PASS** means the current expanded artifact passed generation/disk
identity, repertoire, codepoint, monospacing, deterministic fixture, native-path,
precision, bounds, hash, and loader checks. **Compact HOLD** means no shipped
compact payload plus decoder reproduces that font yet.

| ID | Slug | Type | Raw path bytes | Gzip path bytes | Commands | Expanded protocol | Compact implementation |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| S201 | `row-ledger` | segment-mask | 29,047 | 1,747 | 3,777 | PASS | HOLD |
| S202 | `column-relay` | segment-mask | 59,444 | 2,456 | 5,490 | PASS | HOLD |
| S203 | `orthogonal-bus` | segment-mask | 82,672 | 3,115 | 11,812 | PASS | HOLD |
| S204 | `diagonal-truss` | segment-mask | 67,953 | 3,326 | 8,505 | PASS | HOLD |
| S205 | `carrier-rail` | segment-mask | 106,340 | 3,739 | 13,052 | PASS | HOLD |
| S206 | `elevator-relay` | segment-mask | 92,614 | 3,877 | 11,812 | PASS | HOLD |
| S207 | `perimeter-tape` | segment-mask | 139,934 | 5,054 | 21,636 | PASS | HOLD |
| S208 | `port-gap-code` | segment-mask | 110,153 | 4,698 | 15,182 | PASS | HOLD |
| S209 | `bias-weave` | segment-mask | 51,250 | 1,659 | 6,250 | PASS | HOLD |
| S210 | `tri-slot-shutter` | segment-mask | 304,709 | 16,549 | 28,140 | PASS | HOLD |
| S211 | `dominant-axis` | segment-mask | 99,302 | 6,363 | 9,340 | PASS | HOLD |
| S212 | `corner-scaffold` | segment-mask | 262,393 | 10,666 | 44,260 | PASS | HOLD |
| S213 | `orthogonal-truss` | stroke-graph | 148,053 | 4,911 | 9,003 | PASS | HOLD |
| S214 | `diagonal-relay` | stroke-graph | 75,417 | 3,805 | 9,415 | PASS | HOLD |
| S215 | `pruned-arbor` | stroke-graph | 90,972 | 5,143 | 8,452 | PASS | HOLD |
| S216 | `terminal-runs` | stroke-graph | 48,151 | 2,730 | 5,980 | PASS | HOLD |
| S217 | `ladder-logic` | stroke-graph | 59,954 | 3,396 | 9,150 | PASS | HOLD |
| S218 | `median-bus` | stroke-graph | 190,217 | 8,405 | 15,178 | PASS | HOLD |
| S219 | `serpentine-thread` | stroke-graph | 159,666 | 6,990 | 10,698 | PASS | HOLD |
| S220 | `corner-switch` | stroke-graph | 50,753 | 2,943 | 6,490 | PASS | HOLD |
| S221 | `twin-channel` | stroke-graph | 293,535 | 11,765 | 18,001 | PASS | HOLD |
| S222 | `directed-flow` | stroke-graph | 179,908 | 13,769 | 13,039 | PASS | HOLD |
| S223 | `centroid-star` | stroke-graph | 285,820 | 28,342 | 16,958 | PASS | HOLD |
| S224 | `octilinear-knot` | stroke-graph | 180,863 | 7,416 | 13,110 | PASS | HOLD |
| S225 | `row-serpentine` | routed-path | 152,085 | 7,650 | 9,943 | PASS | HOLD |
| S226 | `column-serpentine` | routed-path | 71,623 | 4,289 | 9,005 | PASS | HOLD |
| S227 | `dogleg-maze` | routed-path | 121,469 | 4,919 | 14,036 | PASS | HOLD |
| S228 | `diagonal-shuttle` | routed-path | 72,492 | 4,582 | 9,005 | PASS | HOLD |
| S229 | `near-hop-dispatch` | routed-path | 136,616 | 7,974 | 16,059 | PASS | HOLD |
| S230 | `depth-trace` | routed-path | 98,581 | 7,194 | 11,856 | PASS | HOLD |
| S231 | `turn-priority-conduit` | routed-path | 87,991 | 6,084 | 10,476 | PASS | HOLD |
| S232 | `edge-bus` | routed-path | 107,505 | 4,033 | 13,615 | PASS | HOLD |
| S233 | `hub-spokes` | routed-path | 171,729 | 18,772 | 11,072 | PASS | HOLD |
| S234 | `orbit-loop` | routed-path | 160,947 | 8,005 | 10,313 | PASS | HOLD |
| S235 | `twin-rail-exchange` | routed-path | 202,839 | 20,209 | 24,489 | PASS | HOLD |
| S236 | `perimeter-relay` | routed-path | 241,116 | 14,903 | 30,080 | PASS | HOLD |

## Compact grammar: plausible, but not delivered

`storage-model.json` now draws the correct boundary:

- 75 visible 5×7 maps require 2,625 bits, or 329 packed bytes;
- a simpler five-byte-per-glyph representation is 375 bytes;
- 36 one-byte family selectors make the stated data floors 365 or 411 bytes;
- decoder, parameters, SVG emission, placement, wrapping, validation, and
  retrieval are explicitly excluded;
- no deployed-runtime claim is made.

Those figures are legitimate **data floors**, not font-package sizes. A one-byte
selector works only if the complete behavior of all 36 variants is already
embedded in shared decoder branches. The human-readable `grammar` strings
(82–282 bytes each) are descriptions, not executable compact configurations.

For scale only, the current authoring modules needed to reproduce the exact
families—patterns, Set 2 glue, and the three approach generators—total 98,726
unminified JavaScript bytes, or 24,696 bytes under gzip-9. This is not a proposed
decoder and should not be compared directly with deployed bytecode. It simply
shows why the 365/411-byte floor cannot stand alone.

The storage disclosure itself therefore passes. The compact implementation
remains on hold until an actual encoded payload and its exact decoder reproduce
the canonical paths or an intentionally different production representation.

## Bundle-verifier limitations

The shipped verifier is useful and currently passes, but its enforcement is
narrower than this audit:

- it does not recompute the 36 byte reports;
- it does not execute the included JSON Schemas;
- it does not verify `glyph.codepoint === character.codePointAt(0)`;
- it verifies listed checksum lines but does not reject unlisted extra files;
- it does not compare the bundle against the source generators;
- it does not run a second renderer.

Independent checks above filled those gaps for the current bundle and found no
current mismatch. They remain verifier-hardening opportunities. Also link
`storage-model.json` from the machine-readable set manifest and package exports,
not only from prose and checksums, so automated downstream consumers cannot miss
the qualification boundary.

## Conditions to clear the compact hold

1. Ship a canonical compact payload with explicit per-family selectors and any
   numeric parameters required outside decoder branches.
2. Ship or freeze the exact segment, graph, and route decoder plus path
   serializer; prove it reproduces the intended output deterministically.
3. Measure payload, decoder, renderer, lookup, placement/wrapping, and retrieval
   together in the real target environment. For an Ethereum target, report
   deployed runtime and gas, not gzip or source-code bytes.
4. Make the verifier recompute storage reports and compact-output hashes.
5. Add at least one independent rasterizer before making renderer-equivalence
   claims.

**Plain conclusion:** all 36 are sound expanded-SVG members of a Second Set
study. Zero of 36 is yet a measured compact or production deployment.
