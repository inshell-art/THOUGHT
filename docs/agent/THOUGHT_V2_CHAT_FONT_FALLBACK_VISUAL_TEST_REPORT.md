# THOUGHT V2 Chat Font-Fallback Visual Test Report

Date: 2026-07-20

Status: **complete for the requested three-condition study; no contract change approved**

## Question under test

Study the proposed 48 px, 816 px-wide THOUGHT chat text field under three visual conditions:

1. Source Code Pro is available as the primary font.
2. Source Code Pro is unavailable and normal OS fallback is available.
3. A minimal server renderer has only one generic monospace fallback.

Every condition was exercised with boundary-length English, CJK, Arabic and Hebrew, Devanagari and Thai, combining marks, emoji, and mixed-script lines.

## Test environments

### Browser conditions 1 and 2

- Google Chrome 150.0.7871.125 on macOS 26.5.2.
- Condition 1 embedded the seven local Source Code Pro 400 WOFF2 subsets and verified `document.fonts.check(...) === true` before measurement.
- Condition 2 omitted Source Code Pro and used the normal macOS monospace stack.
- Unsupported Source Code Pro scripts were allowed to fall through to normal OS fonts in condition 1. This matches how a browser font stack actually behaves.
- Each specimen used a 48 px font, 64 px line height, 816 px field, `white-space: break-spaces`, `overflow-wrap: anywhere`, and no hyphenation.

### Isolated server condition 3

- `@resvg/resvg-js` 2.6.2 rendered native SVG `<text>`.
- `loadSystemFonts` was set to `false`.
- Courier New was the only supplied font and was assigned as every generic family.
- This is a controlled single-font server simulation. It deliberately prevents silent access to macOS CJK, Indic, emoji, and other specialist fallbacks.
- The exact generic font on a real server may differ; CSS `monospace` does not identify a portable font.

## Corpus

The matrix contains 10 prompt/Agent pairs and 20 exact source lines. All 20 lines passed the shared `measureThoughtLine` verifier and are valid under `inshell.thought.work.v2`.

| Category | Coverage |
| --- | --- |
| Boundary-length English | 28 versus 29 wide ASCII glyphs; 63-byte and exact 64-byte ASCII |
| CJK | Chinese, Japanese, and Korean |
| Arabic and Hebrew | RTL layout; Arabic vowel marks |
| Devanagari and Thai | Complex shaping; Thai marks |
| Combining marks | Precomposed versus decomposed forms; 63/64-byte decomposed boundaries |
| Emoji | Valid standalone scalars, skin-tone modifier, and regional-indicator flag; no ZWJ or variation selector |
| Mixed script | Latin, CJK, RTL, decomposed combining mark, Indic, and emoji in the same lines |

## Results

| Category | Source Code Pro available + OS fallback | Normal OS fallback | Isolated generic-only server |
| --- | --- | --- | --- |
| Boundary English | Pass | Pass | Pass for glyph coverage; metrics differ |
| CJK | Pass through OS fallback | Pass | **Fail:** missing-glyph boxes |
| Arabic and Hebrew | Pass through OS fallback | Pass | Degraded and font-dependent; materially different metrics/appearance |
| Devanagari and Thai | Pass through OS fallback | Pass | **Fail:** missing-glyph boxes except covered punctuation |
| Combining marks | Pass | Pass | Pass for tested Latin marks; appearance differs |
| Emoji | Rendered as platform color emoji | Rendered as platform color emoji | **Fail:** missing-glyph boxes |
| Mixed-script lines | Pass, but visibly mix several fallback faces | Pass, with the same mixed faces | **Fail/partial:** only covered components survive |

### Browser geometry

- Source Code Pro was positively confirmed loaded.
- Both browser conditions rendered all 20 lines.
- Natural one-line overflow count was identical: 3 of 20 lines.
- Wrapped row distribution was identical in both conditions: 17 one-row lines, 1 two-row line, and 2 three-row lines.
- Wrapping mismatches: **0**.
- Maximum measured Source-versus-OS width change: **6 px**, on the 63-byte and 64-byte ASCII lines, approximately 0.33%.
- The 28-wide-`W` line measured 807 px with Source Code Pro and 810 px with OS fallback, fitting in both.
- The 29-wide-`W` line measured 836 px and 839 px, overflowing in both and wrapping to two rows.
- The 63-byte and 64-byte ASCII lines wrapped to three rows in both conditions.

### Combining-mark behavior

- `Café déjà` and the decomposed `Cafe\u0301 de\u0301ja\u0300` rendered with the same visible composition and width in each browser condition.
- Twenty-one decomposed `e + U+0301` clusters remained legible at 63 bytes; adding one ASCII `x` produced the exact 64-byte Agent sample.
- This visual equivalence does not change protocol identity. The exact UTF-8 sequences remain distinct and must not be normalized.

### Emoji behavior

- Chrome rendered emoji using full-color platform glyphs. The SVG/CSS green does not recolor those glyphs.
- The isolated server rendered missing-glyph boxes because its only font has no emoji coverage.
- Therefore emoji color, form, advance width, and availability cannot be made consistent by naming or embedding Source Code Pro.

### Isolated generic-only behavior

The isolated screenshot establishes the failure hidden by the earlier `font-family: monospace` test. Disabling system-font loading removes the specialist fallbacks that made the Mac result look safe:

- CJK becomes tofu.
- Devanagari and Thai become tofu.
- Emoji becomes tofu.
- Mixed-script lines become partial and combine surviving Latin/RTL characters with missing boxes.
- Arabic/Hebrew and combining marks remain highly dependent on the one supplied generic font and renderer shaping implementation.
- Width measurements of missing-glyph boxes are not valid layout predictions for the intended text.

## Evidence

- [Chrome Source Code Pro versus normal OS fallback](evidence/thought-v2-font-fallback-browser-source-os.png)
- [Isolated generic-only server render](evidence/thought-v2-font-fallback-isolated-generic-only.png)

Evidence SHA-256:

```text
9109a05024a8ddde4e01df910f3c05532b492090aca86a259f35c9608c67f04d  thought-v2-font-fallback-browser-source-os.png
caa9176dd4157731ade24ec737a40a074e8e16cfd76df7d5c723e180937c3eaa  thought-v2-font-fallback-isolated-generic-only.png
```

Repository regression result:

```text
19 test files passed
108 tests passed
```

## Conclusions

1. Source Code Pro availability versus normal macOS fallback is not a material wrapping risk for this corpus. The maximum width movement was 6 px and no line changed row count.
2. Source Code Pro alone does not solve global Unicode rendering. It stabilizes only the scripts it covers; CJK, Arabic, Hebrew, Devanagari, Thai, and emoji still require other fonts.
3. A generic-only minimal server cannot reliably display the protocol's accepted global text. Missing glyphs are a hard failure, not a small stylistic difference.
4. Emoji is a separate consistency problem: browsers may use color glyphs that ignore the requested green, while server renderers may produce monochrome glyphs or tofu.
5. Combining marks work in the tested browser and isolated Latin font, but visually identical normalized/decomposed forms remain different protocol values.
6. A fallback-only renderer can preserve the intended look in rich desktop environments, but it cannot guarantee portable global-text legibility.

## Design implication

Do not change the contract renderer based on this study. Before contract adoption, the visual design must explicitly choose one of these policies:

- accept renderer-dependent global glyphs and emoji;
- restrict the accepted/displayed character repertoire, which would be a protocol change;
- bundle multiple script fonts, with substantial bytecode/storage cost and still incomplete Unicode/emoji coverage; or
- convert selected glyphs to deterministic paths outside the viewer, which is incompatible with constructing arbitrary accepted text solely from a small on-chain font.

For the current look study, native SVG `<text>` remains the portable primitive, but the result must be described as environment-dependent.
