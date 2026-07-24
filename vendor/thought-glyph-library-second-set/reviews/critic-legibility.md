# Second Set independent legibility review

## Verdict

**Do not call all 36 fonts study-qualified.**

On the supplied rendered evidence, **21 pass and 15 remain on hold**:

- Segment masks: 9 pass, 3 hold.
- Stroke graphs: 9 pass, 3 hold.
- Routed paths: 3 pass, 9 hold.

The collection is technically complete, but technical completeness is not the same as readable type. Several systems preserve different path signatures for ambiguous characters while failing the visual test: at thumbnail scale the distinctions are too faint, too dense, or encoded in textures that cannot be read confidently.

The present gallery assigns `study-qualified` to every member. That status is not supported for the 15 holds below. The 21 passes are legibility passes from this review, not final gallery admission: the source prompt also requires three independent blind reviews and a broader composition corpus.

## Rendered evidence and threshold

I inspected the actual SVG rendering in:

- `glyph-study/sets/second-set/gallery.html`
- `glyph-study/sets/second-set/fixtures/<slug>/canonical-line.svg`
- the desktop construction-group screenshots at 1440px
- the complete gallery screenshot at 320px

The gallery contains 36 articles and 72 rendered sample SVGs: one `THOUGHT 01? Agent &` line and one `A0 O1 Il S5 ?&` ambiguity line per font.

At the 1440px desktop layout, the gallery has three approximately 448px columns. The canonical line therefore has a nominal 23.6px glyph advance and the shorter ambiguity line about 32px. At the 320px layout, the single content column is approximately 273px wide: the canonical line falls to about 14.4px per glyph advance and the ambiguity line to about 19.5px. There was no horizontal clipping; failures below are recognition failures, not layout failures.

The pass threshold used here is direct word recognition at both scales, plus confident separation of `0/O`, `1/I/l`, `5/S`, `?`, and `&`. Knowing the test string must not be required to reconstruct the word.

## Per-font findings

| ID | Slug | Rendered finding | Result |
| --- | --- | --- | --- |
| S201 | `row-ledger` | `THOUGHT` and `Agent` remain immediate despite the stacked horizontal construction. `0/O`, `1/I/l`, and `5/S` retain different gross silhouettes at 320px. | **Pass** |
| S202 | `column-relay` | Horizontal features fragment into posts, but the word shapes and all ambiguity groups remain recoverable at thumbnail scale. Lowercase rhythm is light but coherent. | **Pass** |
| S203 | `orthogonal-bus` | Thin orthogonal edges survive as complete letter skeletons. The ambiguity line stays distinct and punctuation remains recognizable. | **Pass** |
| S204 | `diagonal-truss` | Upright stems reduce to lozenge chains and many letters depend on sparse diagonal coincidences. `Agent` is not confidently readable at 320px; `Il` and the final `?&` become low-confidence clusters. | **Hold** |
| S205 | `carrier-rail` | Row carriers bridge logical holes and turn `THOUGHT` into repeated ladder blocks. `A`, `0`, and `O` share nearly rectangular textures, and lowercase `Agent` is not immediately readable. | **Hold** |
| S206 | `elevator-relay` | Column carriers create comb banks that overpower the source silhouettes. Round forms, `0/O`, and the lowercase sample require prior knowledge of the string at 320px. | **Hold** |
| S207 | `perimeter-tape` | Exposed contours produce clear outline letters at both sizes. Counters, numeral distinctions, and punctuation survive reduction. | **Pass** |
| S208 | `port-gap-code` | The broken ports remain a coherent skeleton rather than isolated noise. The word samples and ambiguity pairs are readable at thumbnail scale. | **Pass** |
| S209 | `bias-weave` | The diagonal weave adds noise, but the outer silhouettes remain readable and the stress pairs retain visibly different structures at 320px. | **Pass** |
| S210 | `tri-slot-shutter` | High-frequency slot texture survives without replacing the letter silhouette. Both test lines remain readable and distinct. | **Pass** |
| S211 | `dominant-axis` | Local axis choices simplify the mask while preserving strong word shapes. `0/O`, `1/I/l`, `5/S`, and `?&` remain separable. | **Pass** |
| S212 | `corner-scaffold` | The construction is busy, but its scaffold outlines survive the thumbnail and preserve counters and punctuation. | **Pass** |
| S213 | `orthogonal-truss` | The thin graph still describes complete, conventional skeletons. Both sample lines remain readable at 320px. | **Pass** |
| S214 | `diagonal-relay` | Extra diagonal nodes are decorative rather than destructive. `THOUGHT`, `Agent`, and the ambiguity groups remain visibly distinct. | **Pass** |
| S215 | `pruned-arbor` | Pruning removes redundant edges without breaking the main silhouettes. Strong word and ambiguity recognition at both scales. | **Pass** |
| S216 | `terminal-runs` | Sparse terminal runs preserve the essential strokes and make the ambiguity line especially clear. | **Pass** |
| S217 | `ladder-logic` | Ladder detail remains subordinate to the letter skeleton. Words, digits, and punctuation survive at 320px. | **Pass** |
| S218 | `median-bus` | Banded buses make active areas into similar dense blocks. `THOUGHT` loses ordinary stroke rhythm, `Agent` is weak, and `A0/O1/Il/S5` require decoding rather than reading. | **Hold** |
| S219 | `serpentine-thread` | The repeated serpentine motif dominates every glyph. The canonical line reads as a sequence of coils, and `A0`, `O1`, and `S5` collapse into related textures at thumbnail scale. | **Hold** |
| S220 | `corner-switch` | Corner switching remains visually economical and keeps conventional word silhouettes. All requested ambiguity groups are readable. | **Pass** |
| S221 | `twin-channel` | The doubled routing adds density, but the base skeleton, counters, and punctuation stay coherent at both scales. | **Pass** |
| S222 | `directed-flow` | Direction marks do not obscure the principal strokes. The canonical and ambiguity lines remain legible at 320px. | **Pass** |
| S223 | `centroid-star` | Star hubs overpower the edges and equalize unrelated letters into bursts. `Agent` becomes a constellation, while `0/O`, `1/I/l`, and `?&` lose dependable thumbnail recognition. | **Hold** |
| S224 | `octilinear-knot` | The octilinear joins are expressive but still form clear letters. The stress string is one of the stronger graph-family ambiguity results. | **Pass** |
| S225 | `row-serpentine` | Repeated horizontal coils replace strokes with a common motif. `THOUGHT` and `Agent` are not directly readable at 320px, and the ambiguity row looks like variants of the same coil stack. | **Hold** |
| S226 | `column-serpentine` | Vertical routing fragments the words into narrow wave clusters. Lowercase recognition fails and `0/O` and `1/I/l` have insufficient thumbnail separation. | **Hold** |
| S227 | `dogleg-maze` | Maze inflections dominate the letterforms. The canonical line is recoverable only from the known phrase, and `S/5` plus punctuation are not reliable at 320px. | **Hold** |
| S228 | `diagonal-shuttle` | Dense diagonal hatching turns glyphs into similarly weighted bundles. Word rhythm, counters, `0/O`, and `S/5` collapse under reduction. | **Hold** |
| S229 | `near-hop-dispatch` | The large rendering is already highly encoded: several capitals and lowercase letters resemble unrelated geometric symbols. At 320px `Agent`, `A0`, `S5`, and `?&` are not confidently identifiable. | **Hold** |
| S230 | `depth-trace` | Layered traces remain attached to recognizable skeletons. `THOUGHT`, `Agent`, and the ambiguity string survive the narrow rendering. | **Pass** |
| S231 | `turn-priority-conduit` | Turn choices create distinctive terminals without erasing the source forms. Words and all requested ambiguity groups remain readable at both scales. | **Pass** |
| S232 | `edge-bus` | Most glyphs become stacks of nearly identical horizontal buses. `THOUGHT` does not read as a word at thumbnail scale and the ambiguity row collapses into striped blocks. | **Hold** |
| S233 | `hub-spokes` | Radial spokes reduce the entire system to starbursts. Letter identity, lowercase rhythm, numeral groups, and punctuation all fail at 320px. | **Hold** |
| S234 | `orbit-loop` | Some capitals survive at desktop size, but `Agent` is symbol-like and the ambiguity row is unstable. `S` and `5` become related lightning loops, while `Il` and `?&` are not dependable at thumbnail scale. | **Hold** |
| S235 | `twin-rail-exchange` | Dense diagonal twin rails produce hatch clusters rather than strokes. Both words and the `0/O`, `S/5`, and punctuation distinctions fail under reduction. | **Hold** |
| S236 | `perimeter-relay` | The segmented perimeter is dense but retains conventional outline structure. Both sample lines, counters, and punctuation remain readable at 320px. | **Pass** |

## Hold summary

The 15 holds fail for three recurring reasons:

1. **Carriers bridge away the counters:** `carrier-rail`, `elevator-relay`, `median-bus`, and `edge-bus`.
2. **A repeated texture replaces the glyph skeleton:** `serpentine-thread`, `row-serpentine`, `column-serpentine`, `dogleg-maze`, `diagonal-shuttle`, and `twin-rail-exchange`.
3. **Nodes or ornamental routes overpower recognition:** `diagonal-truss`, `centroid-star`, `near-hop-dispatch`, `hub-spokes`, and `orbit-loop`.

These are not fixed by enlarging the gallery. Each needs a construction revision that restores a readable primary skeleton before the decorative or routing grammar is applied.

## Recommendation

Keep all 36 as the **Second Set study field**, but do not expose one undifferentiated `study-qualified` status.

- Mark the 21 passes as `legibility-pass-pending-independent-review`.
- Mark the 15 holds as `workbench-hold`.
- Do not claim the Second Set itself is fully study-qualified until the holds are revised or removed and the required independent blind reviews agree.
- Rerun the same two strings at the current 14.4px canonical thumbnail advance after every revision. Do not compensate by increasing gallery zoom.

The strongest immediate release candidates are the contour/skeleton-preserving systems: `row-ledger`, `orthogonal-bus`, `perimeter-tape`, `port-gap-code`, `dominant-axis`, `orthogonal-truss`, `pruned-arbor`, `terminal-runs`, `corner-switch`, `octilinear-knot`, `depth-trace`, `turn-priority-conduit`, and `perimeter-relay`.
