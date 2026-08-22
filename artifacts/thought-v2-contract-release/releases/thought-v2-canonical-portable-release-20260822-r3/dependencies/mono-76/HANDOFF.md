# Inshell Mono 76 v1.1.0 — downstream implementation handoff

- Release tag: `v1.1.0`
- Package: `@inshell/mono-76`
- Family: `Inshell Mono 76`
- Face: `Regular 400`
- Release revision: `mono-76-centerline-v1-shape-approved-20260822`
- Previous release: `v1.0.0`

## Release decision

The font owner approved all 76 records exactly as shown in the v1.1.0 proof
artifacts: 75 visible glyph paths plus metrics-only SPACE.

No glyph path changed from v1.0.0. In particular:

- lowercase `w` remains
  `M0 7.2L2 .2L4 6.6L5.95 .15L8 7.2`; its shallow center cue and bottom
  optical asymmetry are intentional approved geometry
- lowercase `g` retains its `-3.1` curved descender as an intentional optical
  overshoot beyond the nominal `-3` metric
- the IM76 packed payload, packed SHA-256, and packed Keccak-256 are unchanged

v1.1.0 is a new release because it adds a hash-bound shape-approval contract,
proof sheets, a machine-readable audit, conformance vectors, and new release
metadata. The face SHA-256 changes because `glyphs.json` contains new release
metadata even though all path strings are identical.

## What to consume

Consume only `release/mono-76/` from exact Git tag `v1.1.0`. Do not consume
`experiments/`, `sets/fifth-set/`, or the Source Code Pro outline reference
under `legacy/`.

The canonical order is:

```text
 ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'"-()/&
```

SPACE is metrics-only; 75 records draw paths.

## Install the immutable tag

```sh
npm install "git+ssh://git@github.com/inshell-art/inshell-mono-76.git#v1.1.0"
```

Commit the lockfile and confirm it resolves tag `v1.1.0`. Do not depend on
`main` or an experiment branch.

## Vendor the release directory

```sh
git clone --branch v1.1.0 --depth 1 \
  git@github.com:inshell-art/inshell-mono-76.git /tmp/inshell-mono-76-v1-1
mkdir -p vendor
cp -R /tmp/inshell-mono-76-v1-1/release/mono-76 vendor/mono-76
node ./vendor/mono-76/verify.mjs
npm install --save ./vendor/mono-76
```

Commit the complete vendored directory and lockfile. Do not copy only
`glyphs.json` or `packed.bin`; verification, proof, notices, and hashes are part
of the release contract.

## Proof and approval contract

Review and pin these files from the sealed package:

- `proof/shape-approval.json` — owner decision and hashes
- `proof/geometry-contract.json` — exact approved paths, metrics, and render
  style independent of release metadata
- `proof/all-glyphs-overview.svg` — all 76 records in one comparison surface
- `proof/per-glyph-review.svg` — large glyph cards with metric guides and
  centerline skeleton overlays
- `proof/shape-audit.json` — exact bounds, cell containment, ratios, symmetry,
  and approved optical exceptions
- `proof/conformance/*.svg` — reference renders under the declared contract

`manifest.json` binds every proof hash to the release. Verify the package
before trusting any individual proof file.

## Render contract

```js
import {
  assertMono76Text,
  loadMono76Font,
  renderMono76Line,
  supportsMono76Text
} from "@inshell/mono-76";

const font = await loadMono76Font();
const text = "THOUGHT WILL AWA!";

if (!supportsMono76Text(font, text)) {
  throw new Error("Mono 76 received unsupported text");
}
assertMono76Text(font, text);

const svg = renderMono76Line(font, text, {
  background: "#000000",
  stroke: "#00ff35",
  padding: 2
});
```

Custom renderers must preserve:

- `fill="none"`
- `stroke-width="1.23"`
- `stroke-linecap="round"`
- `stroke-linejoin="round"`
- fixed advance `10`
- global x-origin shift `+1`
- no kerning
- y-up paths placed with the declared SVG baseline and `scale(1 -1)`

The 40 optical x translations are already baked into the path strings. Do not
apply `composition.appliedPerGlyphOffsets` again.

## On-chain payload

```js
import { loadMono76Packed } from "@inshell/mono-76";
import {
  decodeMono76PackedGlyph,
  inspectMono76Packed
} from "@inshell/mono-76/onchain/decoder";

const packed = await loadMono76Packed();
const metadata = inspectMono76Packed(packed);
console.log(metadata.glyphCount); // 76
console.log(metadata.pathBytes);  // 4438
```

Because v1.1.0 preserves the v1.0.0 packed bytes, a downstream system that
already pins the v1.0.0 packed SHA-256/Keccak-256 does not need to redeploy the
glyph-data contract. It should still vendor/tag v1.1.0 and pin the new face,
geometry, approval, and proof hashes. If protocol policy assigns release IDs to
approval metadata, register a new v1.1.0 release ID pointing at the existing
packed payload.

## Required integrity pins

Pin these sealed values and confirm them against
`release/mono-76/manifest.json`:

- face SHA-256:
  `2db30b08e7378c06b3aa5804999ba32a895244d62a8b78fa4456b21a47b595df`
- geometry SHA-256:
  `c79172729df118405802f84266971ecdcca4aa678ac19bb97c7de41034cb54df`
- shape-approval SHA-256:
  `559fc02ed1a6a828649aa57075b99bdd5f747a75ada7b05156c18830dfa56a15`
- packed SHA-256:
  `3acc0a9cf60c00aa2d512356386d1e2a999499896e25661e8e631d53d5e10926`
- packed Keccak-256:
  `0xba37d00bb395b84f0487791300a29cdd2b1712b078fa218c6ed74fa11d74a081`
- manual-edit payload SHA-256:
  `755f16a8f70d9141a8b2175bc1bafeaef93ead366179d85f3597bc3dfc9ddc56`

Do not copy hashes from a design experiment, an earlier Fifth Set export, or
the superseded v1.0.0 face metadata.

## Acceptance checklist

1. Resolve exact tag `v1.1.0` and run `node release/mono-76/verify.mjs`.
2. Confirm `shapeApproval.decision` is `approved` and its geometry hash matches
   `manifest.integrity.geometrySha256`.
3. Confirm `glyphPathChangesFromPreviousRelease` is empty.
4. Compare the all-glyph overview and per-glyph proof as required by local
   release policy.
5. Render the four conformance vectors and confirm their hashes.
6. Confirm SPACE advances by 10 units without drawing a path.
7. Confirm unsupported input throws instead of substituting a glyph.
8. Confirm fixed advance, origin shift, stroke, caps, joins, and no fill.
9. Confirm no runtime kerning or second optical-offset table is applied.
10. Pin the tag and all manifest integrity hashes in the downstream release
    record.

## Rollback

Rollback to tag `v1.0.0` for the same path payload without the v1.1.0 approval
contract. Do not use `v0.1.0` as an equivalent visual rollback: it is the older
Source Code Pro-derived outline reference with different geometry, metrics,
size, and licensing.
