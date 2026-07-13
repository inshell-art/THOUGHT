# THOUGHT Development Adapter

This local package is an optional development adapter, not evidence of a public Codex or Claude Plugin. A host must explicitly provide the MCP operations for `inshell.thought.agent-run.v2`; this repository deliberately does not hardcode an API URL, wallet, or secret.

The plugin is a bounded creative interface. It can fetch one sealed task and submit one Agent result. Minting remains a separate human wallet action against `ThoughtNFT.mint(MintThoughtInput)`.

## Contents

- `skills/thought/SKILL.md`: the bounded one-result behavior.
- `schemas/`: `inshell.thought.agent-result.v2` and optional `inshell.thought.agent-declaration.v1` JSON Schemas.
- `references/THOUGHT_PROTOCOL_REFERENCE.md`: protocol identifiers and MCP operation contract.
- `.mcp.json`: an intentionally empty host-supplied MCP declaration. The active endpoint belongs to the frontend/runtime deployment, not this plugin artifact.
