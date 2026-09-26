#!/usr/bin/env bash
# Build the engine to WebAssembly and copy it into the Next.js app.
# Requires: rustup target add wasm32-unknown-unknown, and clang (for the C++ solver).
set -euo pipefail
cd "$(dirname "$0")"
cargo test --release --quiet
cargo build --release --target wasm32-unknown-unknown
mkdir -p ../web/public/engine
cp target/wasm32-unknown-unknown/release/lusion_engine.wasm ../web/public/engine/lusion_engine.wasm
ls -l ../web/public/engine/lusion_engine.wasm
