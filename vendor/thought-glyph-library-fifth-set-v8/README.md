# THOUGHT Glyph Library — Fifth Set

The Fifth Set is the explicit four-font promotion of the selected classic-mono
low-gas candidates:

| Order | Set family ID | Font | Source candidate |
| ---: | --- | --- | --- |
| 1 | `S501` | Classic Line 76 | `C01` |
| 2 | `S502` | Classic Book 76 | `C02` |
| 3 | `S503` | Classic Round 76 | `C04` |
| 4 | `S504` | Classic Compact 76 | `C06` |

The stable set ID is `inshell.thought.glyph-library.set-05`. Candidate codes
are provenance only; downstream code should use the immutable slugs or member
IDs in `manifest.json`.

Set manifest version 8 carries the approved Classic Book 76 geometry:

- the revision-2 uppercase `A` crossbar, shortened to `M2.3 4L5.7 4`;
- the `?` upper-curve terminal raised to y=3 while its dot stays unchanged;
- the smooth-rise `f`, whose C1/A2/C2/A3 construction rises one unit and whose
  logical ascender is y=11;
- the smooth digit `2`, whose final quadratic control moves from `(7,5)` to
  `(7,6)` to preserve both adjoining tangents; and
- the revision-5 optical-spacing correction that translates every lowercase
  `f` x coordinate one logical unit right, moving its extent from x=0..6 to
  x=1..7 while preserving the 10-unit advance and all vertical geometry; and
- the revision-6 lowercase `k` junction correction, which moves the lower-arm
  start from `(3,4)` to `(3.18,3.82)`, a two-decimal approximation of the
  diagonal intersection, so its round cap no longer protrudes across the
  upper diagonal; and
- the revision-7 U+002D HYPHEN-MINUS correction, which raises its centerline
  from y=4 to y=5, halfway between baseline y=0 and cap height y=10; and
- the revision-8 uppercase `G` lower-join correction, which moves the final
  lower-bowl quadratic control from `(6,0)` to `(7,0)` so the curve enters
  `(7,2)` vertically and continues tangent to the right stem.

See `PROVENANCE.md` for every exact before/after path.

Every font contains the same restricted 76-character repertoire:

```text
 ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'"-()/&
```

These are original Inshell monospaced centerline alphabets. They contain no
imported or traced Source Code Pro outline geometry. Each path must be rendered
with `fill="none"` plus that font's declared stroke width, cap, and join.

Classic Book 76 remains Regular 400 with canonical stroke `0.82`,
`stroke-linecap="round"`, and `stroke-linejoin="round"`. The comparison lab’s
1.35 stroke and per-glyph visual centering were review presentation only and
are not baked into this package. Revision 5 balances `eft` and `ft` without
kerning or a renderer-side translation. Revision 6 changes only the `k`
lower-arm start; the stem, branch endpoints, 10-unit advance, metrics, and
stroke style remain unchanged. Revision 7 changes only U+002D's vertical
position; its x=1..7 extent, length, advance, metrics, and stroke style remain
unchanged. Revision 8 changes only the uppercase `G` lower-bowl control; its
bounds, fixed advance, metrics, command count, path byte length, and stroke
style remain unchanged.

The package includes expanded SVG path JSON, self-contained SVG fixtures,
byte/gas reports, exact IM76 v1 packed payloads, JavaScript and Solidity
decoders, an ESM renderer, checksums, and a standalone verifier.

It is not a TTF, WOFF, WOFF2, CSS `font-family`, or operating-system font.
“Install” means install this native-SVG data and rendering package.

See [HANDOFF.md](HANDOFF.md) for downstream installation and
[PROVENANCE.md](PROVENANCE.md) for the promotion boundary.
