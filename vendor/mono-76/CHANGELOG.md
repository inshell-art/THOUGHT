# Changelog

## v1.1.0 — 2026-08-22

- Seals the font owner's approval of all 76 records exactly as shown in the
  release proof artifacts: 75 visible glyph paths plus metrics-only SPACE.
- Adds deterministic all-glyph and per-glyph proof sheets, a machine-readable
  shape audit, conformance vectors, and a hash-bound approval record.
- Records lowercase `w`'s shallow center cue and bottom asymmetry as approved
  v1.1.0 geometry.
- Records lowercase `g`'s `-3.1` curved descender as an approved optical
  overshoot beyond the nominal `-3` metric.
- Bumps package, release metadata, and face metadata to v1.1.0.

### Glyph path changes from v1.0.0

None. Every old path string is byte-identical to its v1.1.0 path string. The
IM76 packed payload and its SHA-256/Keccak-256 hashes are unchanged.
