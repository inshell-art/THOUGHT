# Regular 400 review state

The production scope is intentionally frozen to one weight:

- Inshell Mono 76 Regular;
- CSS/OpenType weight `400`;
- exact Source Code Pro Regular v2.042 geometry.

The gallery tests that face in both required contexts:

1. the large THOUGHT / WILL / AWA! website slogan;
2. the small black PATH NFT slogan sequence.

No alternate weights are packaged or implied. Size, tracking, word placement,
and foreground color remain downstream layout tokens; they do not mutate the
canonical glyph paths.

Acceptance checks:

- complete 76-character order;
- all 13 punctuation marks;
- exact source/package path identity;
- native 1000/600 metrics;
- no vertical compression;
- no synthetic weight;
- no browser font dependency in rendered SVG;
- deterministic fixtures and packed bytes.
