---
name: thought
description: Complete one sealed THOUGHT Agent task and submit exactly one agent result.
---

# THOUGHT Agent Skill

Use this Skill only with a configured THOUGHT MCP server that exposes:

- `thought_get_run_task`
- `thought_submit_agent_result`
- `thought_get_run_status`

## Protocol

1. Fetch the sealed task using the supplied task pointer or run id.
2. Verify the task declares `thought-agent/2` and includes the exact `THOUGHT.v2.md` name, id, hash, ref, and text.
3. Produce one result conforming to `thought.agent-result.v2`.
4. Submit one result through `thought_submit_agent_result`.
5. Read status only when needed to confirm submission.

Return one visible `agentLine` plus an optional `thought.agent-fragment.v1` object. Preserve the human `promptLine` as supplied. Do not perform a dialogue, repair cycle, alternate response, wallet operation, PATH selection, or mint transaction.

If the MCP tools are unavailable or the spec anchor does not verify, stop and report the configuration/verification failure. Do not invent a task or submit an unverified result.
