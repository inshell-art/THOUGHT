# THOUGHT Agent Flow V2

## Authority

The human owns the prompt, Agent choice, wallet, PATH authorization, and mint decision. The Agent is allowed one bounded creative round. It does not authorize a wallet, choose a PATH token, or mint a THOUGHT.

The onchain mint contract remains permissionless: direct `ThoughtNFT.mint(MintThoughtInput)` is valid without any Agent run.

## Technical Protocol Identifiers

| Surface | Identifier |
| --- | --- |
| Run protocol | `thought-agent/2` |
| Result schema | `thought.agent-result.v2` |
| Provenance fragment schema | `thought.agent-fragment.v1` |
| Final provenance schema | `thought.provenance.v2` |
| Formal spec | `THOUGHT.v2.md` |
| Renderer | `thought.svg.v2.fixed-a-32` |

## Sealed Agent Task

The Agent receives one sealed task containing:

- `rawPrompt`: exact human text submitted to the UI;
- `promptLine`: visible prompt representation for the work;
- full verified spec anchor: name, id, hash, ref, and exact `THOUGHT.v2.md` text;
- expected result schema `thought.agent-result.v2`;
- the run id and non-secret task context needed for the response.

The Agent must return exactly one JSON object:

```json
{
  "schema": "thought.agent-result.v2",
  "agentLine": "one visible UTF-8 line",
  "provenanceFragment": {
    "schema": "thought.agent-fragment.v1",
    "provider": "codex",
    "model": "configured-model",
    "receivedAt": "2026-07-11T00:00:00.000Z"
  }
}
```

No dialogue, repair loop, alternate candidate, PATH selection, wallet action, or mint action belongs in the Agent response.

## inshell.art Implementation Contract

`inshell.art` owns the active integration. Its API and Plugin/MCP adapter must provide the following conceptual operations:

| MCP operation | Required behavior |
| --- | --- |
| `thought_get_run_task` | Fetch the sealed task by run/task pointer and verify its spec id/hash before exposing it to the Agent. |
| `thought_submit_agent_result` | Accept exactly one `thought.agent-result.v2` payload, validate it against the task, then seal the result. |
| `thought_get_run_status` | Return the lifecycle and the sealed result status without mint authority. |

The deep link may carry a run/task URL or opaque pointer only. It must not rely on a deep-link query as the sole source of the full spec text. The Plugin fetches the complete verified task through the run API.

After a valid Agent result, the frontend validates the two visible lines, derives the exact binary field via the renderer contract, assembles `thought.provenance.v2`, previews the onchain SVG, and presents a separate wallet/PATH/mint action. An Agent result never proves an offchain event merely by declaring it in provenance.

## Provenance Assembly

The final payload passed to `MintThoughtInput.provenanceJson` should include:

- `schema: "thought.provenance.v2"`;
- raw prompt and visible `promptLine` where product policy permits;
- `agentLine` and optional `thought.agent-fragment.v1` data;
- exact `thoughtSpecId`, `thoughtSpecHash`, and `thought.svg.v2.fixed-a-32` renderer id;
- the exact 1024-bit field derived from prompt bytes then agent bytes;
- run context when present, or an explicit direct/manual route when absent.

The contract stores the opaque provenance string and its hash. It does not parse, sign, or independently attest to Agent provenance.
