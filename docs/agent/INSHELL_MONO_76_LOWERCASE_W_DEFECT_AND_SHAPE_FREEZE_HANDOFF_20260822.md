# Inshell Mono 76 — lowercase `w` defect + shape-freeze gate

**To:** the agent working in `inshell-mono-76`
**From:** THOUGHT contract repo (downstream consumer of the sealed release)
**Date:** 2026-08-22
**Affected release:** Mono 76 v1.0.0, revision `mono-76-centerline-v1-20260731`, face sha256 `7ed61ed6335fce2c1e58184916f5d344b8384fc05d4c616e83c35ad4fa9ed47f`

---

## 1. Why this comes to you

Lowercase `w` in the sealed v1.0.0 release is malformed. The defect is in the glyph
path data itself, so it cannot be corrected anywhere downstream: the packed IM76
payload is hash-pinned into deployed Solidity, and every downstream step is
hash-preserving by design. The only place a shape can change is a new sealed
release from this repo.

Paths below that live in this (upstream) repo are quoted from the release's own
`PROVENANCE.md`; verify them before acting, since I could only read the vendored
copy of the release.

---

## 2. The defect

Stored record in `glyphs.json`:

```
"character": "w",  "d": "M0 7.2L2 .2L4 6.6L5.95 .15L8 7.2"
```

The middle apex is at **6.6** while the outer arm tops are at **7.2** — a dip of
**0.6 units, ~8% of the 7.4 x-height**.

A `w` is distinguished from "two v's" by exactly one cue: the middle apex sitting
clearly below the arm tops. At 8% that cue is effectively absent, so the letter
reads as four near-level strokes — a spiky `ѡ` rather than a `w`. At the
consumer's render scale (`2.88`) the entire cue is ~1.7px inside a 1024px artwork.

Family comparison, same release:

| glyph | arms | apex | dip | dip as % of letter height |
|---|---|---|---|---|
| `w` | 7.2 | 6.6 | 0.6 | **8%** of x-height 7.4 |
| `W` | 9.9 | 7.2 | 2.7 | 27% of cap height 10.1 |
| `w` in the earlier Classic Book generation (fifth set) | 7 | 5 | 2.0 | 29% |

`W` is correct. `w` is the outlier.

**Secondary issue in the same glyph:** the bottom vertices are at `x=2` and
`x=5.95`, where the mirror of 2 about the glyph center (0–8) is 6; the bottom y
values are `.2` and `.15`. Confirm whether this asymmetry is a deliberate optical
correction from the V21 pass. If deliberate, document it; if not, correct it in
the same edit.

---

## 3. How it was confirmed (so you can reproduce)

1. The record above is in the release `glyphs.json`.
2. `onchain/packed.bin` decodes to the byte-identical string via the release's own
   `onchain/decoder.mjs` — the defect is in the on-chain payload too.
3. `node verify.mjs` **passes**. This is the sealed release behaving correctly, not
   a corrupted copy.
4. The consumer re-rendered the glyph using the declared render contract
   (`stroke-width 1.23`, round caps and joins, `fill="none"`, advance 10, origin
   shift +1, baseline flip at the declared scale) and reproduced the reported
   visual exactly.

Point 4 matters: it rules out a downstream implementation error. The consumer
implemented the render contract correctly; the shape it faithfully drew is wrong.

---

## 4. How it got in

- Already present in the Classic Book 76 candidate v19:
  `M0 7.2L2 .4L4 6.6L6 .4L8 7.2` — apex 6.6 from the start.
- Optical alignment `c02-stroke-aware-optical-alignment-v20` applied x-only
  corrections; the apex height was untouched by definition.
- Manual tuning `c02-manual-control-point-tuning-v21-20260731` **does** list `w`
  among its 29 edited characters, and declares
  `"preservesV20CommandTopology": true`. Comparing v19 to the sealed release, that
  pass moved only the bottom vertices (`.4` → `.2` / `.15`, `6` → `5.95`).

So the glyph was individually tuned and the wrong end of it was adjusted. Worth
checking whether the V21 review surface showed the apex at all.

---

## 5. What to change

**Change:** the apex y of lowercase `w`.

Target: bring the dip into the ~25–30% band that the rest of the family uses.
Deriving from `W`'s ratio (apex at 73% of arm height) puts the `w` apex near
**5.3–5.5**; the exact value is your optical call, not a formula — the sibling
`v`, `y`, `x` terminals and the counters should be judged together.

**Also fix, if not deliberate:** the bottom-vertex asymmetry described in §2.

**Do not change:**

- the command topology (5 points, `M` + 4 `L`) — a topology change ripples into
  the packed offsets and complicates downstream diffing for no gain
- arm tops (7.2), advance (10), stroke width (1.23), caps/joins, origin shift
- any other glyph, unless §6 turns one up

Every extra changed character multiplies the downstream re-review surface, and
downstream re-review here means a redeployment.

---

## 6. Audit the same class before re-sealing

This defect is a *ratio* defect that hash checks cannot see. Sweep the glyphs that
share the failure mode and report findings even where you change nothing:

- interior-vertex ratio: `v V w W M N` — interior vertex must sit well below the
  outer extrema
- mirror symmetry about the cell center: `v V w W x X`
- all extrema within the declared metrics (x-height 7.4, cap 10.1, ascender 11.15,
  descender -3)

These three checks are cheap to automate and would have caught this glyph. Landing
them as part of the release build is the durable fix; correcting `w` alone is not.

---

## 7. Release requirements for the new version

1. **Version bump and new revision id.** Do not re-seal under `v1.0.0` or reuse its
   hashes. The old sealed release must stay retrievable — deployed artwork
   downstream points at it permanently.
2. **Regenerate the full artifact set** through `src/build-release.mjs`:
   `glyphs.json`, `onchain/packed.bin` + `packed.hex` + `metadata.json`,
   `manifest.json`, `SHA256SUMS`. Every hash changes.
3. **Ship a per-glyph proof sheet** — each glyph rendered large, with baseline /
   x-height / cap guides, the centerline skeleton overlaid, and the ratio table
   from §6. Record its hash in `manifest.json` next to `faceSha256`, and record a
   human sign-off against that hash. This is the missing gate: v1.0.0 was
   byte-reviewed but never shape-reviewed at a size where an 8% apex is visible.
   Prose specimen sheets do not substitute — the consumer's existing prose corpus
   covers 73 of 75 glyphs including `w`, and the defect was invisible in all of
   them.
4. **Ship conformance vectors** — a handful of reference renders plus their hashes,
   so a consumer can prove it implemented the render contract (stroke 1.23, round
   caps/joins, advance 10, origin shift +1, baseline flip) instead of being trusted
   to. Today that half of the contract is prose in `HANDOFF.md` and unenforceable
   for off-chain consumers.
5. **Changelog with exact old → new path strings** for every changed character.
   Downstream needs it to scope its re-review.

---

## 8. Downstream impact to state plainly in the release notes

A glyph change is not a cosmetic patch for this consumer:

- new `faceSha256`, `packedSha256`, `packedKeccak256`
- consumer must re-vendor, regenerate the renderer's compile-time hash constants,
  redeploy the glyph data contract and the renderer, and register a new protocol
  release id
- **tokens bound to the existing renderer keep the old `w` permanently** — the
  correction applies to future mints only

---

## 9. Decisions that belong to the font owner

1. The target apex value / dip ratio (§5).
2. Whether the bottom-vertex asymmetry is intentional (§2).
3. Version semantics for a shape change. Since rendered artwork changes, a minor
   bump reads more honestly than a patch — but that is a provenance decision, and
   it should be written into the release policy before the next seal rather than
   settled per-incident.

---

## 10. What not to do

- Do not ask the consumer to patch it downstream. It is hash-pinned and on-chain.
- Do not compensate by changing the render contract (stroke width, caps). That
  would distort all 75 glyphs to correct one.
- Do not re-seal under the same version or hashes.
