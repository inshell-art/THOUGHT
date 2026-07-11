# THOUGHT Artifact Bridge

This directory publishes render artifacts for downstream repos.

## Channels

- `latest.json`: most recently built artifact from this repo.
- `experimental.json`: branch trials and design experiments.
- `candidate.json`: FE-ready candidate contract.
- `stable.json`: production-approved render contract.

Each channel file points to an immutable release under `releases/<artifact_id>/manifest.json`.

## Build

```bash
npm run artifact:build -- --channel experimental
npm run artifact:build -- --channel candidate
npm run artifact:build -- --channel stable
```

Use `--artifact-id <id>` to pin a human-readable release id.

## Consumer Flow

1. Fetch `artifacts/thought-v2/latest.json` or a specific channel file from the THOUGHT repo.
2. Fetch the referenced `manifest_path`.
3. Fetch files listed in `manifest.files`.
4. Verify each sha256 before using renderer code, fixtures, or samples.
5. Production consumers should pin `artifact_id` plus hashes, not a moving channel.
