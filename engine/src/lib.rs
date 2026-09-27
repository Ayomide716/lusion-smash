//! Lusion engine: the CPU half of the particle scene.
//!
//! Rust owns pointer dynamics and the simulation clock; the C++ stable-fluids
//! solver (see `cpp/fluid.cpp`) owns the Navier–Stokes math. Both compile into
//! one `.wasm` with a single linear memory, so JavaScript reads results through
//! typed-array views over that memory with no copies and no glue library.
//!
//! Per frame, JS calls `engine_frame` with the raw pointer; afterwards the
//! half-float velocity field (`engine_field_ptr`, RG16F, `size²` texels) and a
//! small state block (`engine_state_ptr`) are ready to upload.

mod fluid;
mod half;
mod pointer;

use core::cell::RefCell;
use fluid::Fluid;
use pointer::Pointer;

/// The fluid advances in fixed steps so it behaves the same at 30, 60 or 144 Hz.
const FIXED_DT: f32 = 1.0 / 60.0;
const MAX_STEPS_PER_FRAME: u32 = 3;
/// Brush radius in uv units and how far apart splats are laid along a stroke.
const SPLAT_RADIUS: f32 = 0.04;
const SPLAT_SPACING: f32 = SPLAT_RADIUS * 0.45;
const MAX_SPLATS_PER_STEP: usize = 24;
const FORCE_SCALE: f32 = 0.9;
const MAX_SPLAT_FORCE: f32 = 3.0;
/// Fraction of velocity kept per second, and vorticity confinement strength.
const DECAY: f32 = 0.35;
const VORTICITY: f32 = 18.0;
/// Fraction of ink kept per second, and ink laid per unit of pointer speed.
const DYE_DECAY: f32 = 0.18;
const DYE_PER_SPEED: f32 = 0.9;
/// Other visitors' cursors (see `engine_stir`) stir the same fluid, more gently.
const PEER_GAIN: f32 = 0.55;

/// Layout of the state block exposed to JavaScript.
pub mod state {
    pub const POINTER_X: usize = 0;
    pub const POINTER_Y: usize = 1;
    pub const VELOCITY_X: usize = 2;
    pub const VELOCITY_Y: usize = 3;
    pub const ENERGY: usize = 4;
    pub const PEAK_SPEED: usize = 5;
    pub const STEPS: usize = 6;
    pub const SIM_TIME: usize = 7;
    pub const LEN: usize = 8;
}

pub struct Engine {
    fluid: Fluid,
    pointer: Pointer,
    accumulator: f32,
    sim_time: f32,
    field: Vec<u16>,
    ink: Vec<u8>,
    state: [f32; state::LEN],
}

impl Engine {
    pub fn new() -> Self {
        let fluid = Fluid::new();
        let n = fluid.size();
        Self {
            fluid,
            pointer: Pointer::new(),
            accumulator: 0.0,
            sim_time: 0.0,
            field: vec![0; n * n * 2],
            ink: vec![0; n * n],
            state: [0.0; state::LEN],
        }
    }

    pub fn grid_size(&self) -> usize {
        self.fluid.size()
    }

    /// Advance by `dt` seconds of wall time. The pointer is in normalised device
    /// coordinates (-1..1, y up); `aspect` is viewport width / height.
    pub fn frame(&mut self, dt: f32, x: f32, y: f32, active: bool, aspect: f32) {
        let dt = if dt.is_finite() { dt.clamp(0.0, 0.25) } else { 0.0 };
        let aspect = if aspect.is_finite() && aspect > 0.0 { aspect } else { 1.0 };

        self.accumulator += dt;
        let mut steps = 0;
        while self.accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME {
            self.step(x, y, active, aspect);
            self.accumulator -= FIXED_DT;
            steps += 1;
        }
        // Drop time we couldn't simulate rather than spiral on slow devices.
        if steps == MAX_STEPS_PER_FRAME {
            self.accumulator = 0.0;
        }

        self.pack_field();
        let p = &self.pointer;
        self.state[state::POINTER_X] = p.position[0];
        self.state[state::POINTER_Y] = p.position[1];
        self.state[state::VELOCITY_X] = p.velocity[0];
        self.state[state::VELOCITY_Y] = p.velocity[1];
        self.state[state::ENERGY] = p.energy;
        self.state[state::STEPS] = steps as f32;
        self.state[state::SIM_TIME] = self.sim_time;
    }

    fn step(&mut self, x: f32, y: f32, active: bool, aspect: f32) {
        let from = self.pointer.position;
        let was_tracking = self.pointer.tracking;
        self.pointer.update([x, y], active, FIXED_DT);

        if active && was_tracking {
            let v = self.pointer.velocity;
            self.stroke(from, self.pointer.position, v, aspect, 1.0);
        }

        self.fluid.step(FIXED_DT, DECAY, VORTICITY, DYE_DECAY);
        self.sim_time += FIXED_DT;
    }

    /// Lay splats along the whole segment (NDC) so fast flicks leave a
    /// continuous wake instead of a dotted line. `v` is the stroke velocity in
    /// NDC per second; `gain` scales both force and ink.
    fn stroke(&mut self, from: [f32; 2], to: [f32; 2], v: [f32; 2], aspect: f32, gain: f32) {
        let (dx, dy) = ((to[0] - from[0]) * 0.5, (to[1] - from[1]) * 0.5); // NDC → uv
        let length = (dx * dx * aspect * aspect + dy * dy).sqrt();
        let count = ((length / SPLAT_SPACING).ceil() as usize).clamp(1, MAX_SPLATS_PER_STEP);
        let fx = (v[0] * 0.5 * FORCE_SCALE * gain / count as f32).clamp(-MAX_SPLAT_FORCE, MAX_SPLAT_FORCE);
        let fy = (v[1] * 0.5 * FORCE_SCALE * gain / count as f32).clamp(-MAX_SPLAT_FORCE, MAX_SPLAT_FORCE);
        let speed = (v[0] * v[0] + v[1] * v[1]).sqrt();
        let ink = (speed * DYE_PER_SPEED * FIXED_DT * 6.0 * gain / count as f32).min(0.5);
        for k in 1..=count {
            let t = k as f32 / count as f32;
            let u = (from[0] + (to[0] - from[0]) * t) * 0.5 + 0.5;
            let w = (from[1] + (to[1] - from[1]) * t) * 0.5 + 0.5;
            self.fluid.splat(u, w, fx, fy, SPLAT_RADIUS, aspect);
            if ink > 0.0 {
                self.fluid.splat_dye(u, w, ink, SPLAT_RADIUS * 0.7, aspect);
            }
        }
    }

    /// Another visitor's cursor moved from `from` to `to` (NDC) over `dt`
    /// seconds: stir the fluid along that path, more gently than the local
    /// pointer. Takes effect on the next `frame`.
    pub fn stir(&mut self, from: [f32; 2], to: [f32; 2], dt: f32, aspect: f32) {
        let finite = |p: [f32; 2]| p[0].is_finite() && p[1].is_finite();
        if !finite(from) || !finite(to) || !(dt > 0.0) || !dt.is_finite() {
            return;
        }
        let clamp = |p: [f32; 2]| [p[0].clamp(-1.0, 1.0), p[1].clamp(-1.0, 1.0)];
        let (from, to) = (clamp(from), clamp(to));
        let aspect = if aspect.is_finite() && aspect > 0.0 { aspect } else { 1.0 };
        let dt = dt.max(FIXED_DT);
        let v = [(to[0] - from[0]) / dt, (to[1] - from[1]) / dt];
        if v[0] == 0.0 && v[1] == 0.0 {
            return;
        }
        self.stroke(from, to, v, aspect, PEER_GAIN);
    }

    /// Pack the interior of the grid into interleaved RG half floats (row 0 = bottom).
    fn pack_field(&mut self) {
        let n = self.fluid.size();
        let stride = self.fluid.stride();
        let (u, v) = self.fluid.velocity();
        let dye = self.fluid.dye();
        let mut peak = 0.0f32;
        for j in 0..n {
            for i in 0..n {
                let src = (i + 1) + stride * (j + 1);
                let dst = 2 * (i + n * j);
                let (vx, vy) = (u[src], v[src]);
                peak = peak.max(vx * vx + vy * vy);
                self.field[dst] = half::f32_to_f16(vx);
                self.field[dst + 1] = half::f32_to_f16(vy);
                self.ink[i + n * j] = (dye[src].clamp(0.0, 1.0) * 255.0 + 0.5) as u8;
            }
        }
        self.state[state::PEAK_SPEED] = peak.sqrt();
    }

    pub fn field(&self) -> &[u16] {
        &self.field
    }

    /// Ink density per cell (0–255), `size²` bytes, row 0 = bottom.
    pub fn ink(&self) -> &[u8] {
        &self.ink
    }

    pub fn state(&self) -> &[f32; state::LEN] {
        &self.state
    }

    pub fn velocity_f32(&self) -> (&[f32], &[f32], usize) {
        let (u, v) = self.fluid.velocity();
        (u, v, self.fluid.stride())
    }
}

impl Default for Engine {
    fn default() -> Self {
        Self::new()
    }
}

// --- WebAssembly exports ----------------------------------------------------
// The module is single-threaded, so a thread-local is the one global. Pointers
// handed to JS point into `Engine`'s buffers, which never reallocate after
// `engine_init`, so the typed-array views JS builds over them stay valid.

thread_local! {
    static ENGINE: RefCell<Option<Engine>> = const { RefCell::new(None) };
}

fn with_engine<R>(f: impl FnOnce(&mut Engine) -> R) -> R {
    ENGINE.with(|cell| f(cell.borrow_mut().get_or_insert_with(Engine::new)))
}

/// Create (or reset) the engine. Returns the fluid grid size per side.
#[no_mangle]
pub extern "C" fn engine_init() -> u32 {
    ENGINE.with(|cell| *cell.borrow_mut() = Some(Engine::new()));
    with_engine(|e| e.grid_size() as u32)
}

#[no_mangle]
pub extern "C" fn engine_frame(dt: f32, x: f32, y: f32, active: u32, aspect: f32) {
    with_engine(|e| e.frame(dt, x, y, active != 0, aspect));
}

/// Another visitor's cursor moved from (x0, y0) to (x1, y1), NDC, over `dt` seconds.
#[no_mangle]
pub extern "C" fn engine_stir(x0: f32, y0: f32, x1: f32, y1: f32, dt: f32, aspect: f32) {
    with_engine(|e| e.stir([x0, y0], [x1, y1], dt, aspect));
}

#[no_mangle]
pub extern "C" fn engine_field_ptr() -> *const u16 {
    with_engine(|e| e.field().as_ptr())
}

#[no_mangle]
pub extern "C" fn engine_field_len() -> u32 {
    with_engine(|e| e.field().len() as u32)
}

#[no_mangle]
pub extern "C" fn engine_ink_ptr() -> *const u8 {
    with_engine(|e| e.ink().as_ptr())
}

#[no_mangle]
pub extern "C" fn engine_ink_len() -> u32 {
    with_engine(|e| e.ink().len() as u32)
}

#[no_mangle]
pub extern "C" fn engine_state_ptr() -> *const f32 {
    with_engine(|e| e.state().as_ptr())
}

#[no_mangle]
pub extern "C" fn engine_state_len() -> u32 {
    state::LEN as u32
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    // The C++ solver keeps its grid in static storage; serialise tests that touch it.
    static SOLVER: Mutex<()> = Mutex::new(());

    /// RMS of the discrete divergence and of the speed over the interior.
    /// (Stam's collocated grid leaves a small checkerboard residual near sharp
    /// splats, so a max-norm check would measure the scheme, not the solve.)
    fn rms_divergence_and_speed(e: &Engine) -> (f32, f32) {
        let (u, v, w) = e.velocity_f32();
        let n = w - 2;
        let (mut div2, mut speed2, mut cells) = (0.0f64, 0.0f64, 0.0f64);
        for j in 2..n {
            for i in 2..n {
                let d = (u[i + 1 + w * j] - u[i - 1 + w * j] + v[i + w * (j + 1)] - v[i + w * (j - 1)]) * 0.5;
                div2 += (d * d) as f64;
                speed2 += (u[i + w * j].powi(2) + v[i + w * j].powi(2)) as f64;
                cells += 1.0;
            }
        }
        ((div2 / cells).sqrt() as f32, (speed2 / cells).sqrt() as f32)
    }

    fn peak(e: &Engine) -> f32 {
        e.state()[state::PEAK_SPEED]
    }

    fn drag(e: &mut Engine, frames: usize) {
        for k in 0..frames {
            let t = k as f32 / frames as f32;
            e.frame(1.0 / 60.0, -0.6 + 1.2 * t, 0.2 * (t * 6.0).sin(), true, 16.0 / 9.0);
        }
    }

    #[test]
    fn idle_engine_stays_still() {
        let _g = SOLVER.lock().unwrap();
        let mut e = Engine::new();
        for _ in 0..120 {
            e.frame(1.0 / 60.0, 0.0, 0.0, false, 1.0);
        }
        assert_eq!(peak(&e), 0.0);
        assert!(e.field().iter().all(|&h| h & 0x7fff == 0));
    }

    #[test]
    fn dragging_creates_flow_that_is_divergence_free() {
        let _g = SOLVER.lock().unwrap();
        let mut e = Engine::new();
        drag(&mut e, 45);
        let speed = peak(&e);
        assert!(speed > 0.05, "expected visible flow, got {speed}");
        assert!(speed < 10.0, "flow should stay bounded, got {speed}");
        let (div, rms_speed) = rms_divergence_and_speed(&e);
        println!("rms divergence {div:.4} vs rms speed {rms_speed:.4}");
        assert!(div < rms_speed * 0.25, "rms divergence {div} too large for rms speed {rms_speed}");
    }

    #[test]
    fn flow_decays_after_release() {
        let _g = SOLVER.lock().unwrap();
        let mut e = Engine::new();
        drag(&mut e, 30);
        let before = peak(&e);
        for _ in 0..240 {
            e.frame(1.0 / 60.0, 0.0, 0.0, false, 16.0 / 9.0);
        }
        let after = peak(&e);
        assert!(after < before * 0.2, "flow should fade: {before} → {after}");
    }

    #[test]
    fn frame_rate_independent_step_count() {
        let _g = SOLVER.lock().unwrap();
        let mut e = Engine::new();
        let mut steps = 0.0;
        for _ in 0..60 {
            e.frame(1.0 / 60.0, 0.0, 0.0, false, 1.0);
            steps += e.state()[state::STEPS];
        }
        assert!((59.0..=61.0).contains(&steps), "one second at 60 fps should be ~60 steps, got {steps}");
        // A long stall is capped instead of simulating seconds at once.
        e.frame(2.0, 0.0, 0.0, false, 1.0);
        assert_eq!(e.state()[state::STEPS], MAX_STEPS_PER_FRAME as f32);
    }

    #[test]
    fn peer_stir_moves_fluid_gently_and_ignores_garbage() {
        let _g = SOLVER.lock().unwrap();
        let mut e = Engine::new();
        for k in 0..30 {
            let t = k as f32 / 30.0;
            e.stir([-0.5 + t, 0.0], [-0.5 + t + 1.0 / 30.0, 0.0], 1.0 / 60.0, 16.0 / 9.0);
            e.frame(1.0 / 60.0, 0.0, 0.0, false, 16.0 / 9.0);
        }
        let stirred = peak(&e);
        assert!(stirred > 0.01, "a moving peer should stir the fluid, got {stirred}");
        assert!(e.ink().iter().any(|&d| d > 0), "a moving peer should leave ink");

        // A local drag of the same path is stronger than a peer's.
        let mut local = Engine::new();
        drag(&mut local, 30);
        assert!(peak(&local) > stirred, "peers should be gentler than the local cursor");

        let mut g = Engine::new();
        g.stir([f32::NAN, 0.0], [0.5, 0.5], 1.0 / 60.0, 1.0);
        g.stir([0.0, 0.0], [0.5, 0.5], f32::INFINITY, 1.0);
        g.stir([0.0, 0.0], [0.5, 0.5], -1.0, 1.0);
        g.stir([0.2, 0.2], [0.2, 0.2], 1.0 / 60.0, 1.0);
        g.frame(1.0 / 60.0, 0.0, 0.0, false, 1.0);
        assert_eq!(peak(&g), 0.0, "invalid or motionless stirs must do nothing");
    }

    #[test]
    fn hostile_input_never_produces_nan() {
        let _g = SOLVER.lock().unwrap();
        let mut e = Engine::new();
        let inputs = [
            (1.0 / 60.0, 0.0, 0.0),
            (1.0 / 60.0, 1e9, -1e9),
            (f32::NAN, f32::NAN, 0.3),
            (1.0 / 60.0, f32::INFINITY, 0.0),
            (1.0 / 60.0, -1.0, 1.0),
            (1.0 / 60.0, 1.0, -1.0),
        ];
        for _ in 0..20 {
            for &(dt, x, y) in &inputs {
                e.frame(dt, x, y, true, f32::NAN);
            }
        }
        assert!(e.state().iter().all(|v| v.is_finite()));
        assert!(e.velocity_f32().0.iter().all(|x| x.is_finite()));
        let (u, v, _) = e.velocity_f32();
        assert!(u.iter().chain(v).all(|x| x.is_finite()));
    }

    #[test]
    fn dragging_leaves_ink_that_fades() {
        let _g = SOLVER.lock().unwrap();
        let mut e = Engine::new();
        drag(&mut e, 40);
        let inked = e.ink().iter().filter(|&&d| d > 20).count();
        assert!(inked > 20, "a stroke should leave visible ink, got {inked} cells");
        let total = |e: &Engine| e.ink().iter().map(|&d| d as u32).sum::<u32>();
        let before = total(&e);
        for _ in 0..300 {
            e.frame(1.0 / 60.0, 0.0, 0.0, false, 16.0 / 9.0);
        }
        assert!(total(&e) < before / 10, "ink should fade once the pointer stops");
    }

    #[test]
    fn field_matches_grid_size() {
        let _g = SOLVER.lock().unwrap();
        let e = Engine::new();
        assert_eq!(e.field().len(), e.grid_size() * e.grid_size() * 2);
        assert_eq!(e.ink().len(), e.grid_size() * e.grid_size());
    }
}
