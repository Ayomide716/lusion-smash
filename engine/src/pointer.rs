//! Pointer dynamics: a critically damped spring that follows the raw cursor,
//! giving a smooth position, a velocity estimate and a decaying "energy".

const STIFFNESS: f32 = 320.0;
const MAX_SPEED: f32 = 40.0; // NDC units / second
const ENERGY_DECAY: f32 = 2.5; // per second

pub struct Pointer {
    pub position: [f32; 2],
    pub velocity: [f32; 2],
    pub energy: f32,
    /// False until the first active sample, and after the pointer leaves.
    pub tracking: bool,
}

impl Pointer {
    pub fn new() -> Self {
        Self { position: [0.0; 2], velocity: [0.0; 2], energy: 0.0, tracking: false }
    }

    pub fn update(&mut self, target: [f32; 2], active: bool, dt: f32) {
        let target = [clean(target[0]), clean(target[1])];
        if !active {
            self.tracking = false;
            self.velocity = [0.0; 2];
            self.energy *= (-ENERGY_DECAY * dt).exp();
            return;
        }
        if !self.tracking {
            // Snap on (re-)entry so the spring doesn't streak across the screen.
            self.position = target;
            self.velocity = [0.0; 2];
            self.tracking = true;
            return;
        }

        let damping = 2.0 * STIFFNESS.sqrt();
        for axis in 0..2 {
            let accel = STIFFNESS * (target[axis] - self.position[axis]) - damping * self.velocity[axis];
            self.velocity[axis] = (self.velocity[axis] + accel * dt).clamp(-MAX_SPEED, MAX_SPEED);
            self.position[axis] += self.velocity[axis] * dt;
        }

        let speed = (self.velocity[0].powi(2) + self.velocity[1].powi(2)).sqrt();
        let decayed = self.energy * (-ENERGY_DECAY * dt).exp();
        self.energy = decayed.max((speed / 6.0).min(1.0));
    }
}

impl Default for Pointer {
    fn default() -> Self {
        Self::new()
    }
}

/// Clamp to a little beyond the viewport and scrub NaN / infinity.
fn clean(v: f32) -> f32 {
    if v.is_finite() {
        v.clamp(-1.5, 1.5)
    } else {
        0.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converges_without_overshoot() {
        let mut p = Pointer::new();
        p.update([0.0, 0.0], true, 1.0 / 120.0);
        let mut max_x = 0.0f32;
        for _ in 0..240 {
            p.update([0.5, 0.0], true, 1.0 / 120.0);
            max_x = max_x.max(p.position[0]);
        }
        assert!((p.position[0] - 0.5).abs() < 1e-3);
        assert!(max_x <= 0.5 + 1e-3, "critically damped spring overshot to {max_x}");
    }

    #[test]
    fn snaps_on_entry_and_decays_energy_on_exit() {
        let mut p = Pointer::new();
        p.update([0.8, -0.3], true, 1.0 / 120.0);
        assert_eq!(p.position, [0.8, -0.3]);
        for k in 0..30 {
            p.update([0.8 - k as f32 * 0.05, -0.3], true, 1.0 / 120.0);
        }
        let e = p.energy;
        assert!(e > 0.1);
        for _ in 0..240 {
            p.update([0.0, 0.0], false, 1.0 / 120.0);
        }
        assert!(p.energy < e * 0.01);
        assert!(!p.tracking);
    }
}
