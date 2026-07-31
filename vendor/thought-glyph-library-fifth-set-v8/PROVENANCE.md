# Fifth Set provenance

## Promotion source

The four alphabets were authored in the `classic-mono-gas` branch experiment
and first committed in:

```text
1c88283e67e91f38a4ba9fefb373009b56489dc9
```

The source commit containing the cumulative C02 revision-8 geometry is:

```text
a0ac1dafd2bc73ad023fc0e32e9b95b5385f608c
```

The Fifth Set originally promoted these four candidates:

- C01 Classic Line 76;
- C02 Classic Book 76;
- C04 Classic Round 76; and
- C06 Classic Compact 76.

C03 Classic Slab 76 and C05 Classic Bracket 76 remain experiment-only and are
not Fifth Set members.

## Revision 2

On 2026-07-28, the library owner approved one C02-only optical correction:

```text
A before: M1 0L4 10L7 0M2 4L6 4
A after:  M1 0L4 10L7 0M2.3 4L5.7 4
```

The horizontal crossbar is shortened symmetrically by 0.3 logical units per
side so its round caps do not protrude beyond the diagonal legs at heavier
render strokes. Advance, baseline, cap height, crossbar height, stroke style,
and every other glyph path are unchanged. C05 remains on the original `A`.

## Revision 3

On 2026-07-28, the library owner approved two further C02-only corrections
after glyph-by-glyph review against Mono 76.

The question mark keeps its original curve and dot shape, but raises the
upper-curve terminal one unit:

```text
? before: M1 8Q2 10 4 10Q7 10 7 7Q7 5 4 4L4 2M4 0L4 1
? after:  M1 8Q2 10 4 10Q7 10 7 7Q7 5 4 4L4 3M4 0L4 1
```

The unchanged dot is exactly `M4 0L4 1`. The new curve-to-dot gap matches the
exclamation mark under the same round-cap stroke.

The lowercase `f` receives the approved smooth-rise curve:

```text
f before: M2 0L2 8Q2 10 4 10Q5 10 6 9M0 7L6 7
f after:  M2 0L2 8Q2 11 4 11Q5 11 6 10M0 7L6 7
```

C1 `(2,11)`, A2 `(4,11)`, and C2 `(5,11)` stay horizontal, preserving the
forward tangent through A2. A2, C2, and A3 `(6,10)` are the original second
quadratic translated upward by one logical unit, so that curve’s shape is
unchanged. The stem and crossbar are unchanged. C02 alone declares ascender
y=11; cap height remains 10 and the existing 16-unit SVG line box contains the
round stroke safely.

The accepted comparison used a presentation stroke of 1.35 and mechanical
per-glyph centering. Revision 3 promotes only the approved paths. The canonical
C02 render style remains stroke 0.82 round/round, and comparison-only x
translations are not baked into the glyph data.

## Revision 4

On 2026-07-28, the library owner approved a further C02-only correction to
smooth digit `2`:

```text
2 before: M1 8Q2 10 4 10Q7 10 7 7Q7 5 5 4L1 0L7 0
2 after:  M1 8Q2 10 4 10Q7 10 7 7Q7 6 5 4L1 0L7 0
```

The final quadratic control moves from `(7,5)` to `(7,6)`. At the curve start,
the line from `(7,7)` to `(7,6)` preserves the incoming vertical tangent. At
the curve end, `(7,6)` to `(5,4)` is collinear with the following diagonal
from `(5,4)` to `(1,0)`. This removes the visible kink without changing the
advance, metrics, stroke style, command count, or path byte length.

## Revision 5

On 2026-07-29, the library owner approved a C02-only optical-spacing
correction to lowercase `f`:

```text
f before: M2 0L2 8Q2 11 4 11Q5 11 6 10M0 7L6 7
f after:  M3 0L3 8Q3 11 5 11Q6 11 7 10M1 7L7 7
```

Every x coordinate moves exactly one logical unit right. The centerline extent
therefore changes from x=0..6 to x=1..7, matching the neighboring lowercase
`e` and `t` geometry within the unchanged 10-unit monospaced advance. The
curve shape, vertical coordinates, ascender y=11, crossbar width, canonical
stroke 0.82, round cap, and round join are unchanged. No pair kerning,
renderer-side translation, or downstream exception is introduced.

The approved after-path is 36 UTF-8 bytes and has SHA-256:

```text
127b8029c9d1498b34d01979df8e39d8038254097c72925645c5ad31c03d08ac
```

## Revision 6

On 2026-07-29, the library owner approved a C02-only lowercase `k`
junction correction:

```text
k before: M1 0L1 10M7 7L1 2M3 4L7 0
k after:  M1 0L1 10M7 7L1 2M3.18 3.82L7 0
```

The lower arm previously began at `(3,4)`, slightly past the mathematical
intersection `(35/11,42/11)` of the upper diagonal and the continuing
45-degree lower arm. With C02's round cap, that start protruded across the
upper diagonal. The stored start `(3.18,3.82)` is a two-decimal approximation
of that intersection. It removes the protruding cap while retaining the stem,
diagonal endpoints, lower-arm direction, 10-unit advance, metrics, canonical
stroke `0.82`, round cap, and round join. No kerning or renderer exception is
introduced.

The approved after-path is 31 UTF-8 bytes and has SHA-256:

```text
d39c1506891f378003f993d2987840ba60190907eb5a224d619b8bb7c85ff6ff
```

## Revision 7

On 2026-07-29, the library owner approved a C02-only vertical-centering
correction to U+002D HYPHEN-MINUS:

```text
- before: M1 4L7 4
- after:  M1 5L7 5
```

The centerline rises one logical unit to y=5, exactly halfway between baseline
y=0 and cap height y=10. The x=1..7 extent, line length, fixed 10-unit
advance, metrics, canonical stroke `0.82`, round cap, and round join are
unchanged. C01, C03, C04, and C05 retain `M1 4L7 4`; C06 retains its
preexisting compact `M2 4L6 4`. No renderer-side translation or downstream
exception is introduced.

The approved after-path is 8 UTF-8 bytes and has SHA-256:

```text
8502b6a652a5682ad07fad0e848ab34a7ee52c90b6b1b72dfa2f36e463ad50ee
```

## Revision 8

On 2026-07-29, the library owner approved a C02-only uppercase `G`
lower-join correction:

```text
G before: M7 8Q6 10 4 10Q1 10 1 5Q1 0 4 0Q6 0 7 2L7 5L4 5
G after:  M7 8Q6 10 4 10Q1 10 1 5Q1 0 4 0Q7 0 7 2L7 5L4 5
```

The final lower-bowl quadratic control moves from `(6,0)` to `(7,0)`. The
curve still leaves `(4,0)` horizontally, then enters `(7,2)` vertically and
continues into the right stem with a shared tangent. Bounds, fixed 10-unit
advance, metrics, canonical stroke `0.82`, round cap, round join, command
count, and path byte length are unchanged. C01, C03, and C05 retain their
base uppercase-`G`; C04 and C06 retain their preexisting distinct
uppercase-`G` geometries. No renderer-side correction or downstream exception
is introduced.

## Authorship boundary

The selected alphabets are original Inshell centerline constructions built
from conventional alphabet structures on an 8 × 14 logical cell. No third-party font file,
glyph outline, routed-path system, dot system, or earlier THOUGHT glyph path
was imported, traced, or converted.

Source Code Pro appears in the broader experiment only as a size and visual
baseline. Its outline geometry and fixtures are not bundled in this standalone
Fifth Set package.

## Authoritative revision

The authoritative `fonts/<slug>/glyphs.json` and
`onchain/packed/<slug>.bin` files represent Set manifest version 8. The
manifest records the complete C02 revision history explicitly; checksums and
measured IM76 v1 payload gas lock the resulting bytes.
