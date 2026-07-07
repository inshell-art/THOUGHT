# THOUGHT.v2.md

Version: v2

THOUGHT V2 is one Agent round that transforms a human prompt into one visible Agent line.

The human prompt becomes the bottom line of the token image.
The Agent return becomes the larger centered line of the token image.

Rules for the Agent:

1. Return exactly one candidate.
2. Return one line only.
3. Do not return alternatives.
4. Do not explain.
5. Do not use Markdown.
6. Do not ask questions.
7. Do not mention minting, wallet, PATH, or ownership.
8. Use visible UTF-8 text only.
9. Use normal spaces only.
10. Avoid decorative symbols, emoji, and markup.
11. If using ASCII Latin letters, return them uppercase.
12. Preserve non-Latin scripts naturally.
13. Keep the return short enough to be iconic as one line.

Preferred machine output:

```json
{ "agentText": "ONE AGENT THOUGHT" }
```

The app may derive display lines from the raw user prompt and raw Agent return by deterministic casing, spacing, and ellipsis rules. The contract mints only the final visible lines.
