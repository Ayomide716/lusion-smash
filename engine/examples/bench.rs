// Quick sanity/benchmark run: cargo run --release --example bench
use lusion_engine::{state, Engine};
fn main() {
    let mut e = Engine::new();
    for k in 0..60 {
        let t = k as f32 / 60.0;
        e.frame(1.0 / 60.0, -0.6 + 1.2 * t, 0.2 * (t * 6.0).sin(), true, 16.0 / 9.0);
        if k % 15 == 14 { println!("drag  f{k:>3} peak {:.3} energy {:.2}", e.state()[state::PEAK_SPEED], e.state()[state::ENERGY]); }
    }
    for k in 0..180 {
        e.frame(1.0 / 60.0, 0.0, 0.0, false, 16.0 / 9.0);
        if k % 45 == 44 { println!("idle  f{k:>3} peak {:.3}", e.state()[state::PEAK_SPEED]); }
    }
    let t = std::time::Instant::now();
    for _ in 0..600 { e.frame(1.0 / 60.0, 0.3, 0.1, true, 1.6); }
    println!("native release: {:.3} ms / frame (1 fixed step)", t.elapsed().as_secs_f64() * 1000.0 / 600.0);
}
