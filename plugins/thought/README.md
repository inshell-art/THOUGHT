# THOUGHT Codex Plugin

This package supplies the THOUGHT Agent Skill, result schemas, and protocol reference. The host application must provide the configured THOUGHT MCP server and `thought-agent/2` run API; this repository deliberately does not hardcode an API URL, wallet, or secret.

The plugin is a bounded creative interface. It can fetch one sealed task and submit one Agent result. Minting remains a separate human wallet action against `ThoughtNFT.mint(MintThoughtInput)`.

## Contents

- `skills/thought/SKILL.md`: the bounded one-result behavior.
- `schemas/`: `thought.agent-result.v2` and `thought.agent-fragment.v1` JSON Schemas.
- `references/THOUGHT_PROTOCOL_REFERENCE.md`: protocol identifiers and MCP operation contract.
- `.mcp.json`: an intentionally empty host-supplied MCP declaration. The active endpoint belongs to the frontend/runtime deployment, not this plugin artifact.
