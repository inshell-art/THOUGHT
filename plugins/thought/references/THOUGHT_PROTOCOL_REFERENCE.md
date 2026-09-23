# THOUGHT Protocol Reference

The installed runtime must expose these MCP operations:

```text
thought_get_run_task
thought_submit_agent_result
thought_get_run_status
```

The task protocol is `inshell.thought.agent-run.v2`. The accepted result schema is `inshell.thought.agent-result.v2`; its optional declaration uses `inshell.thought.agent-declaration.v1`.

Fetch the sealed task before acting. Verify its registered `THOUGHT.v2.md` id, hash, ref, and exact text. Do not treat this plugin copy as a replacement for the verified onchain spec bytes.

The Agent returns one concise visible UTF-8 `agentLine` and submits once. The official validator enforces `180` UTF-8 bytes, `162` deterministic display units, and one-line/control/spacing rules; it rejects invalid output rather than repairing it. Exact Agent-line bytes are globally unique within the collection. The Agent does not change `promptLine`, select a PATH token, operate a wallet, authorize consumption, or mint. `ThoughtNFT.mint(MintThoughtInput)` remains a public direct-mint contract call.
