# THOUGHT Glyph Library — Third Set — review

The library owner has declared both reviewed outline trials as Third Set members. This promotion changes membership, not the review evidence: both remain visual passes and metric-contract holds.


## Verdicts

### Humanist Smooth — visual PASS; THOUGHT-contract HOLD

The smooth trial passes the experimental legibility and identity gate. At the native THOUGHT placement size—28.8 px advance and 38.4 px em—it reads immediately as a conventional humanist coding face. Stroke weight, counters, and punctuation remain visible in the supplied native screenshot and in a separate reduced probe at 20 px advance.

It is held from integration into the current THOUGHT metric contract because its visual baseline is `5.58`, not `7`.

### Humanist Quantized — visual PASS; THOUGHT-contract HOLD

The quantized trial also passes the experimental legibility gate. Quarter-unit snapping has not closed counters, erased punctuation, or collapsed the critical pairs. Its heavier weight is more robust than Smooth in the 20 px reduced probe, and the shapes still read as conventional outlines rather than dot or routed-path glyphs.

It is held from integration because its visual baseline is `5.63`, not `7`. It also reaches `x = 0.25` and `y = 7.25`, outside the current THOUGHT safe bounds of `xMin = 0.45` and `yMax = 7.2`.

There is one experimental-method hold: Quantized starts from Semibold while Smooth starts from Regular. At native size, the most obvious difference is weight; the quarter-unit construction is comparatively subtle. A later controlled quantization test should snap the Regular source used by Smooth so that any visual and storage change can be attributed to quantization alone.

## Ambiguity findings

Both trials pass the intended disambiguation probes:

- `I/l/1`: capital `I` has full top and bottom bars; lowercase `l` has a curved exit; `1` retains its flag and base.
- `O/0/o`: the dotted zero is unambiguous, and lowercase `o` is visibly smaller.
- `S/5/s`: `5` keeps a flat top and open shoulder; uppercase and lowercase `S/s` retain curved spines and distinct heights.
- `B/8`, `G/6`, and `2/Z`: all remain distinct at native and reduced sizes.
- Focused native probes using the final glyph JSON showed `rn` versus `m`, `cl` versus `d`, and `vv` versus `w` as separate readings in both trials.
- `a/e/g/p/q/y`: counters stay open. The deep `g`, `p`, `q`, and `y` forms are readable, though their survival is exactly what causes the baseline-contract conflict.

Quantized’s tighter `a`, `e`, `g`, and `8` counters deserve continued small-size monitoring, but none closed in the 20 px-advance probe.

## Punctuation findings

All restricted punctuation remains present and recognizable in both trials:

```text
.,?!:;'"-()/&
```

The period and comma separate cleanly; comma and semicolon retain descending tails; colon and semicolon do not merge; single and double quotes remain countable; parentheses, slash, hyphen, and ampersand survive at native and reduced sizes. Smooth is lighter but still legible. Quantized gives punctuation more useful small-size mass without making it collide.

## Baseline-contract caveat

The visual comparison uses the same eight-unit cell and six-unit advance, but it does **not** use the same typographic baseline:

- Humanist Smooth: `5.58`
- Humanist Quantized: `5.63`
- current THOUGHT contract and Circuit Nodes comparison: `7.00`

This approximately 1.4-unit shift is not a cosmetic discrepancy. It creates the room needed for real `g`, `j`, `p`, `q`, `y`, comma, and semicolon descenders. Moving the outlines to baseline `7` would clip or radically compress those shapes. Production adoption therefore requires either a revised metric contract or deliberately redesigned descending glyphs and punctuation.

## Browser evidence

The supplied desktop, native-size, and 390 px screenshots were inspected alongside the final gallery. Headless-Chrome checks found:

- 3 cards, 21 SVG sample strips, and 447 glyph paths—7 strips and 149 paths per card;
- exact native sizing of 28.8 px advance and 38.39 px measured em height;
- zero SVG group-bound overflows across all 21 strips;
- no global page overflow at 1440 px or 390 px;
- at 390 px, the table and fixed-width specimen strips use intentional local horizontal scrolling;
- final gallery and both glyph JSON requests returned HTTP 200. The only failed request was the irrelevant missing favicon.

These verdicts are visual and experimental. They do not override the separate storage-floor caveats or qualify either font for an existing THOUGHT set.
