#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
TERMUX_NODE="/data/data/com.termux/files/usr/bin/node"
NEXT_CLI="$PROJECT_ROOT/node_modules/next/dist/bin/next"
WASM_DIR="$PROJECT_ROOT/node_modules/@next/swc-wasm-nodejs"

if [ -x "$TERMUX_NODE" ] && [ -d "$WASM_DIR" ]; then
  exec env \
    HOME=/data/data/com.termux/files/home \
    COREPACK_HOME=/data/data/com.termux/files/home/.codex/corepack \
    XDG_CACHE_HOME=/data/data/com.termux/files/home/.cache \
    NODE_OPTIONS= \
    NEXT_TEST_WASM_DIR="$WASM_DIR" \
    "$TERMUX_NODE" "$NEXT_CLI" "$@"
fi

exec env -u NODE_OPTIONS "$NEXT_CLI" "$@"
