// Loader for the Rust + C++ engine (see /engine). The module has no imports and
// no JS glue: we instantiate it directly and read its output through typed-array
// views over its linear memory, so nothing is copied or serialised per frame.

type EngineExports = {
  memory: WebAssembly.Memory;
  engine_init(): number;
  engine_frame(dt: number, x: number, y: number, active: number, aspect: number): void;
  engine_field_ptr(): number;
  engine_field_len(): number;
  engine_state_ptr(): number;
  engine_ink_ptr(): number;
  engine_ink_len(): number;
  engine_state_len(): number;
};

export type Engine = {
  /** Fluid grid size per side. */
  size: number;
  /** Interleaved RG half floats, `size²` texels, row 0 = bottom. Updated in place. */
  field: Uint16Array;
  /** Ink density per cell (0–255), `size²` bytes, row 0 = bottom. Updated in place. */
  ink: Uint8Array;
  /** See `engine/src/lib.rs` `state` module for the layout. */
  state: Float32Array;
  frame(dt: number, x: number, y: number, active: boolean, aspect: number): void;
  /** Rolling average of `frame` cost in milliseconds. */
  stepMs: number;
};

/** Fluid grid size per side; must match `N` in engine/cpp/fluid.cpp. */
export const FIELD_SIZE = 80;

export const STATE = {
  POINTER_X: 0,
  POINTER_Y: 1,
  VELOCITY_X: 2,
  VELOCITY_Y: 3,
  ENERGY: 4,
  PEAK_SPEED: 5,
} as const;

let pending: Promise<Engine | null> | null = null;

export function loadEngine(url = "/engine/lusion_engine.wasm"): Promise<Engine | null> {
  pending ??= instantiate(url).catch((error) => {
    console.warn("[engine] WebAssembly engine unavailable, continuing without fluid:", error);
    return null;
  });
  return pending;
}

async function instantiate(url: string): Promise<Engine> {
  const response = fetch(url);
  const { instance } =
    typeof WebAssembly.instantiateStreaming === "function"
      ? await WebAssembly.instantiateStreaming(response, {})
      : await WebAssembly.instantiate(await (await response).arrayBuffer(), {});
  const wasm = instance.exports as unknown as EngineExports;
  const size = wasm.engine_init();
  if (size !== FIELD_SIZE) throw new Error(`engine grid is ${size}, expected ${FIELD_SIZE}; rebuild the site or engine`);

  const views = () => ({
    field: new Uint16Array(wasm.memory.buffer, wasm.engine_field_ptr(), wasm.engine_field_len()),
    state: new Float32Array(wasm.memory.buffer, wasm.engine_state_ptr(), wasm.engine_state_len()),
    ink: new Uint8Array(wasm.memory.buffer, wasm.engine_ink_ptr(), wasm.engine_ink_len()),
  });

  const engine: Engine = {
    size,
    ...views(),
    stepMs: 0,
    frame(dt, x, y, active, aspect) {
      const start = performance.now();
      wasm.engine_frame(dt, x, y, active ? 1 : 0, aspect);
      // Views detach if linear memory ever grows; rebuild them if so.
      if (engine.field.byteLength === 0) Object.assign(engine, views());
      engine.stepMs += (performance.now() - start - engine.stepMs) * 0.05;
    },
  };
  return engine;
}
