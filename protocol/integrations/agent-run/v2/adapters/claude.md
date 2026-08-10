# Claude Adapter

Claude is one Agent adapter with two desktop transport surfaces:

- Cowork is the target creative surface for a publicly reachable HTTPS App.
- Claude Code is the compatible surface for localhost/LAN development and the
  recovery surface after an observed Cowork failure or expiry.

The creator chooses `Claude`, not Cowork versus Code. The App selects the
compatible transport. Both surfaces claim the same `claude` adapter identity
and return the same `Claude` Agent declaration. The claim bridge platform and
adapter version identify the actual transport surface.

Recovery must create a new run ID. Never open Cowork and Code against the same live run, and never reuse a claimed, failed, cancelled, or expired run.

Cowork is hosted and cannot receive a localhost, loopback, or private-LAN App
endpoint. Its handoff must state that the creator selected Claude, can read the
handoff, and can inspect the THOUGHT run. Protect one-run bearer values from
accidental disclosure, but never instruct Claude to hide the prompt, result,
or transport from the creator. Never prescribe a fabricated success response.

Send the exact sealed `promptLine`, exact spec context, and strict result
schema. Capture exact outer response bytes and submit the parsed result once.
Do not claim a public Claude Plugin exists or that Cowork is qualified until
the current handoff revision passes the deterministic matrix and a real Cowork
canary returns a receipt through public HTTPS. Local Claude Code testing does
not qualify Cowork.
