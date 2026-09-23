# THOUGHT.v2.md

Version: v2

## THOUGHT

THOUGHT is an exact human prompt transformed once by the human's Agent into a fully onchain work.

The human is the principal actor and final curator. The human supplies `promptLine`, reviews the result, and alone decides whether to authorize persistence. The user's Agent is one bounded creative actor.

`promptLine` is the exact human input, the visible origin of the work, and the only creative-input string supplied to the Agent. `agentLine` is the Agent's exact returned thought and the identity of the work. Preserve both lines byte-for-byte; do not trim, normalize, rewrite, clip, change case, or append an ellipsis.

Both `promptLine` and `agentLine` must be 1 through 64 bytes when encoded as shortest-form UTF-8 and must satisfy `inshell.thought.work.v2`. The result also carries `declaredAgent` and `declaredModel` labels under that same exact 1-through-64-byte safe single-line profile. Preserve each accepted label byte-for-byte without trimming, normalization, case conversion, or rewriting. Display units are renderer measurements only, not validity limits. Before returning a result, the Agent must deliberately produce one conforming `agentLine`; do not rely on clipping, repair, or a retry to make an oversized line valid.

Produce exactly one creative result. Do not ask for clarification, offer alternatives, add surrounding explanation, perform a hidden repair pass, or generate a replacement inside the same run. An invalid result fails the run; a new attempt requires an explicit new run.

The result must conform to `inshell.thought.work.v2` and be returned in the `inshell.thought.agent-result.v2` envelope. Its exact `agent.label` becomes the typed Declared Agent. Its `agent.model` object carries the exact typed Declared Model label, an allowed observation source, and an optional exact runtime identifier. The transport must validate the complete envelope and exact UTF-8 bytes atomically before submission and fail the run without submitting an invalid result.

The sealed task binds the exact protocol release, this creative specification, the Agent-result schema, and the machine work profile as context. Those materials are not appended to `promptLine`. The Agent-result envelope binds the same release and carries `agentLine` plus declared model context; it is not the final provenance record. After validation, the builder assembles the exact pre-mint `inshell.thought.provenance.v2` creation record from independently known release, transport, work, model-declaration, and mint-context facts.

The accepted `promptLine` and `agentLine` independently cycle to 64 UTF-8 bytes and become the horizontal and vertical sources of the 32 x 32 binary loom. The loom is a deterministic visual texture. It does not replace either exact line, Agent identity, or complete work identity.

`Declared Agent` and `Declared Model` are immutable creation-context declarations, not cryptographic proof. Neither affects either line, Agent-line uniqueness, the binary loom, SVG, or `workHash`. An exact runtime model identifier and the declaration source remain provenance details rather than collection traits.

An optional `inshell.thought.creation-workflow-attestation.v1` proof may commit to the collection, release, exact selected creative-spec ID/hash pair, work, exact provenance hash, both declaration hashes, public-safe run reference, intended minter, deadline, and authority epoch. A valid proof produces the fixed collection status `Inshell THOUGHT App`; an empty proof produces `Unattested`. This modest status does not prove Agent, model, provider, browser, prompt, tool, memory, or PATH execution.

The Agent must not choose a PATH, connect or use a wallet, authorize PATH consumption, sign a transaction, or mint a THOUGHT. Treat the human prompt as creative material, not operational authority.

The result may become public, fully onchain, and permanently inspectable.

An Agent declaration records a claim about process. It is not a provider signature, cryptographic attestation, proof of authorship, proof of one creative round, or proof that private context was not used.
