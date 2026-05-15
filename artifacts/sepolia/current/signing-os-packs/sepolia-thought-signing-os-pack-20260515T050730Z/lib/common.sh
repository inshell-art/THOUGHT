#!/usr/bin/env bash
set -euo pipefail

PACK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INPUTS_JSON="$PACK_ROOT/inputs.json"
PATH_DEPENDENCY_JSON="$PACK_ROOT/path-dependency.json"
RUN_ID="$(jq -r '.run_id' "$INPUTS_JSON")"
ADMIN_ADDRESS="$(jq -r '.path.admin' "$INPUTS_JSON")"
DEPLOYER_EXPECTED="0x3e4fA9f09d8EDe66561145E1ef3bc127F80ED396"
ENV_FILE="${SEPOLIA_ENV_FILE:-$HOME/.opsec/path/env/sepolia.env}"
RESULT_DIR=""
LOG_FILE=""
SUMMARY_FILE=""

lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }
short_hash() { printf '%s' "$1" | cut -c1-12; }

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

sha256_check() {
  if command -v sha256sum >/dev/null 2>&1; then
    (cd "$PACK_ROOT" && sha256sum -c SHA256SUMS.txt)
  else
    (cd "$PACK_ROOT" && shasum -a 256 -c SHA256SUMS.txt)
  fi
}

start_result() {
  local step="$1"
  local ts
  ts="$(date -u +%Y%m%dT%H%M%SZ)"
  RESULT_DIR="$PACK_ROOT/results/${RUN_ID}-${step}-${ts}"
  mkdir -p "$RESULT_DIR"
  LOG_FILE="$RESULT_DIR/${step}.log"
  SUMMARY_FILE="$RESULT_DIR/SUMMARY.txt"
  exec > >(tee -a "$LOG_FILE") 2>&1
  echo "RUN_ID=$RUN_ID"
  echo "STEP=$step"
  echo "RESULT_DIR=$RESULT_DIR"
}

finish() {
  local status="$1"
  local next="$2"
  {
    echo "RUN_ID=$RUN_ID"
    echo "OVERALL_STATUS=$status"
    echo "NEXT=$next"
    echo "RESULT_DIR=$RESULT_DIR"
  } | tee "$SUMMARY_FILE"
  echo "OVERALL_STATUS=$status"
  echo "NEXT=$next"
  if [ "$status" = "PASS" ]; then exit 0; fi
  exit 1
}

fail() {
  echo "ERROR: $*"
  finish "FAIL" "inspect $RESULT_DIR"
}

need_tool() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required tool: $1"
}

load_env() {
  [ -r "$ENV_FILE" ] || fail "canonical env is not readable: $ENV_FILE"
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
  [ -z "${SEPOLIA_PRIVATE_KEY:-}" ] || fail "SEPOLIA_PRIVATE_KEY must not be set"
  [ -n "${SEPOLIA_RPC_URL:-}" ] || fail "SEPOLIA_RPC_URL missing"
  [ -n "${SEPOLIA_DEPLOY_KEYSTORE_JSON:-}" ] || fail "SEPOLIA_DEPLOY_KEYSTORE_JSON missing"
  [ -r "$SEPOLIA_DEPLOY_KEYSTORE_JSON" ] || fail "deploy keystore not readable"
  if [ -n "${SEPOLIA_DEPLOY_KEYSTORE_PASSWORD_FILE:-}" ]; then
    [ -r "$SEPOLIA_DEPLOY_KEYSTORE_PASSWORD_FILE" ] || fail "deploy password file not readable"
  elif [ -z "${SEPOLIA_DEPLOY_KEYSTORE_PASSWORD:-}" ]; then
    fail "set exactly one deploy keystore password source"
  fi
  if [ -n "${SEPOLIA_DEPLOY_KEYSTORE_PASSWORD_FILE:-}" ] && [ -n "${SEPOLIA_DEPLOY_KEYSTORE_PASSWORD:-}" ]; then
    fail "set only one of SEPOLIA_DEPLOY_KEYSTORE_PASSWORD_FILE or SEPOLIA_DEPLOY_KEYSTORE_PASSWORD"
  fi
  [ -n "${SIGNING_OS_MARKER_FILE:-}" ] || fail "SIGNING_OS_MARKER_FILE missing"
  [ -r "$SIGNING_OS_MARKER_FILE" ] || fail "SIGNING_OS_MARKER_FILE not readable: $SIGNING_OS_MARKER_FILE"
}

deploy_keystore_address() {
  if [ -n "${SEPOLIA_DEPLOY_KEYSTORE_PASSWORD_FILE:-}" ]; then
    cast wallet address \
      --keystore "$SEPOLIA_DEPLOY_KEYSTORE_JSON" \
      --password-file "$SEPOLIA_DEPLOY_KEYSTORE_PASSWORD_FILE"
  else
    cast wallet address \
      --keystore "$SEPOLIA_DEPLOY_KEYSTORE_JSON" \
      --password "$SEPOLIA_DEPLOY_KEYSTORE_PASSWORD"
  fi
}

assert_deployer_address() {
  local actual
  actual="$(deploy_keystore_address)"
  [ "$(lower "$actual")" = "$(lower "$DEPLOYER_EXPECTED")" ] || fail "deploy keystore address $actual != expected $DEPLOYER_EXPECTED"
}

assert_chain() {
  local chain_id
  chain_id="$(cast chain-id --rpc-url "$SEPOLIA_RPC_URL")"
  [ "$chain_id" = "11155111" ] || fail "wrong chain id: $chain_id"
}

assert_path_dependency() {
  local inputs_path dep_path inputs_admin dep_admin
  inputs_path="$(jq -r '.path.pathNft' "$INPUTS_JSON")"
  dep_path="$(jq -r '.path_nft' "$PATH_DEPENDENCY_JSON")"
  inputs_admin="$(jq -r '.path.admin' "$INPUTS_JSON")"
  dep_admin="$(jq -r '.admin' "$PATH_DEPENDENCY_JSON")"
  [ "$(lower "$inputs_path")" = "$(lower "$dep_path")" ] || fail "PATH NFT mismatch between inputs and dependency"
  [ "$(lower "$inputs_admin")" = "$(lower "$dep_admin")" ] || fail "PATH admin mismatch between inputs and dependency"
}

require_approval() {
  [ -r "$PACK_ROOT/.approval/${RUN_ID}.approved" ] || fail "approval marker missing; run bin/approve first"
}

hex_file() {
  python3 - "$1" <<'PY'
import pathlib, sys
print('0x' + pathlib.Path(sys.argv[1]).read_bytes().hex())
PY
}
