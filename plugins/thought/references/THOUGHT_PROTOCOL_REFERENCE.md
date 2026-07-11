# THOUGHT Protocol Reference

The installed runtime must expose these MCP operations:

```text
thought_get_run_task
thought_submit_agent_result
thought_get_run_status
```

The task and result protocol is `thought-agent/2`. The only accepted Agent result schema is `thought.agent-result.v2`; its optional provenance fragment uses `thought.agent-fragment.v1`.

Fetch the sealed task before acting. Verify its registered `THOUGHT.v2.md` id, hash, ref, and exact text. Do not treat this plugin copy as a replacement for the verified onchain spec bytes.

The Agent returns one `agentLine` and submits once. It does not change `promptLine`, select a PATH token, operate a wallet, authorize consumption, or mint. `ThoughtNFT.mint(MintThoughtInput)` remains a public direct-mint contract call.
