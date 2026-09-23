# Fifth Set release review

## Decision

C01, C02, C04, and C06 are approved as the four members of THOUGHT Glyph
Library — Fifth Set. Revision 8 cumulatively includes the owner-approved C02
`A` crossbar, question-mark gap, smooth-rise and optically spaced
lowercase-`f`, smooth digit-`2`, lowercase-`k` junction, and vertically
centered U+002D HYPHEN-MINUS corrections, plus the smooth uppercase-`G`
lower-join correction documented in `PROVENANCE.md`.

## Acceptance record

- complete ordered 76-character repertoire for every member;
- fixed monospaced advance and metrics-only SPACE;
- explicit C02 ascender y=11 for the smooth-rise `f`, within the existing
  line box;
- lowercase `f` translated one logical unit right to x=1..7, balancing `eft`
  and `ft` inside the unchanged fixed advance without kerning;
- tangent-continuous C02 digit `2` without a path-length increase;
- lowercase `k` lower arm begins at a two-decimal approximation of the
  upper/lower diagonal intersection, removing the protruding round-cap
  crossing without changing its stem, endpoints, advance, metrics, or stroke
  style;
- U+002D centerline raised from y=4 to the baseline-to-cap-height midpoint
  y=5 without changing its width, advance, metrics, or stroke style;
- uppercase `G` lower bowl enters its right-stem join vertically and continues
  with a shared tangent, without changing bounds, advance, metrics, command
  count, path byte length, or stroke style;
- distinct, conventional classic-mono voice;
- centerline renderer style bound per member;
- IM76 v1 payload round-trips every path byte-for-byte;
- payload hashes and measured Anvil Prague gas locked;
- C02 IM76 payload independently measured at 2,540 bytes and 602,572 creation
  gas;
- C02 packed SHA-256
  `3ab51d7dcdce7e358e7c76002b8f78ddaa448a99de2116a238f7e22209f2bd60`;
- revision-7-to-8 delta: `0` packed bytes and `0` measured creation gas;
- C01, C04, and C06 glyph paths and packed payloads unchanged;
- self-contained dark SVG fixtures and gallery;
- standalone package API, verifier, checksum inventory, and handoff;
- C03 and C05 explicitly excluded; and
- private ownership and redistribution boundary recorded.

The gas figures qualify glyph-data deployment only. They do not qualify a
complete THOUGHT/PATH rendering or minting contract.
