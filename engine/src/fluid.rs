//! Safe wrapper around the C++ stable-fluids solver. All `unsafe` for the FFI
//! boundary lives in this module; the rest of the crate only sees safe calls
//! and borrowed slices.

mod ffi {
    extern "C" {
        pub fn fluid_size() -> i32;
        pub fn fluid_stride() -> i32;
        pub fn fluid_u() -> *const f32;
        pub fn fluid_v() -> *const f32;
        pub fn fluid_reset();
        pub fn fluid_splat(x: f32, y: f32, fx: f32, fy: f32, radius: f32, aspect: f32);
        pub fn fluid_step(dt: f32, decay: f32, vorticity: f32);
    }
}

/// Handle to the solver's grid. The solver keeps its state in static storage,
/// so there must only ever be one `Fluid` alive; `Engine` owns it.
pub struct Fluid {
    size: usize,
    stride: usize,
}

impl Fluid {
    pub fn new() -> Self {
        // SAFETY: plain C functions over static storage; no pointers cross here.
        let (size, stride) = unsafe {
            ffi::fluid_reset();
            (ffi::fluid_size() as usize, ffi::fluid_stride() as usize)
        };
        Self { size, stride }
    }

    /// Interior cells per side (the grid also has a one-cell boundary).
    pub fn size(&self) -> usize {
        self.size
    }

    pub fn splat(&mut self, x: f32, y: f32, fx: f32, fy: f32, radius: f32, aspect: f32) {
        if !(x.is_finite() && y.is_finite() && fx.is_finite() && fy.is_finite()) {
            return;
        }
        // SAFETY: the solver bounds-checks every cell it writes.
        unsafe { ffi::fluid_splat(x, y, fx, fy, radius, aspect) }
    }

    pub fn step(&mut self, dt: f32, decay: f32, vorticity: f32) {
        // SAFETY: operates only on the solver's own static arrays.
        unsafe { ffi::fluid_step(dt, decay, vorticity) }
    }

    /// Velocity components including the boundary ring, row-major, `stride²` long.
    pub fn velocity(&self) -> (&[f32], &[f32]) {
        let len = self.stride * self.stride;
        // SAFETY: the arrays are static, `stride²` floats long, and only mutated
        // through `&mut self` methods, so they can't change while this borrow lives.
        unsafe {
            (
                core::slice::from_raw_parts(ffi::fluid_u(), len),
                core::slice::from_raw_parts(ffi::fluid_v(), len),
            )
        }
    }

    pub fn stride(&self) -> usize {
        self.stride
    }
}
