# Inshell Mono 76

`@inshell/mono-76` is the canonical Inshell integration package for one
restricted, monospaced, 76-character SVG-path face:

| Family | Face | Weight | Upstream |
| --- | --- | ---: | --- |
| Inshell Mono 76 | Regular | 400 | Adobe Source Code Pro Regular v2.042 |

The package preserves Source Code Pro's native outline coordinates, 1000-unit
em, zero baseline, and 600-unit advance. It does not fit the font into the
older THOUGHT 8×8 study cell, stretch it, quantize it, or synthesize another
weight.

The canonical repertoire is:

```text
 ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'"-()/&
```

That is SPACE, 52 letters, ten digits, and 13 punctuation marks. Unsupported
characters are rejected rather than substituted.

## Source-of-truth layers

1. The pinned Adobe TTF and SHA-256 in `upstream.json` are the geometry source
   of truth.
2. `reference/400.json` is the authoritative deterministic native extraction.
3. `fonts/400/glyphs.json` is the generated downstream data contract.
4. `manifest.json` and `SHA256SUMS` bind the package release.

The verifier requires every packaged `d` path to match its extraction
byte-for-byte.

## Commands

From the dedicated repository root:

```sh
npm run build
npm run verify
npm pack --dry-run
```

Open `gallery.html` to inspect the Regular 400 face in the THOUGHT website
slogan, PATH NFT sequence, full repertoire, and letter-by-letter identity
audit.

The committed generated artifacts are part of the release contract. A build
must leave the repository clean and verification must pass before tagging.

Re-extracting the pinned upstream source requires macOS, Swift, CoreText, and
the exact TTF whose SHA-256 is declared in `upstream.json`:

```sh
npm run refresh:source -- \
  --400 /absolute/path/SourceCodePro-Regular.ttf
npm run build
npm run verify
```

This private Git repository is the canonical distribution channel for the
Inshell integration package; it is not published to the public npm registry.

For downstream installation, rendering, and vendoring, see `HANDOFF.md`. For
font provenance and licensing, see `PROVENANCE.md`, `NOTICE.md`,
`LICENSES.md`, and `LICENSE-OFL.md`.
