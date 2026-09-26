// Stable fluids (Jos Stam, "Real-Time Fluid Dynamics for Games", 2003) on a
// fixed N×N grid with a one-cell boundary, plus vorticity confinement so the
// flow keeps its curls instead of smearing out.
//
// Freestanding C++: no libc, no allocation, no exceptions. It compiles to
// wasm32-unknown-unknown and is linked straight into the Rust module; the only
// interface is the extern "C" block at the bottom.
//
// Units: the domain is the unit square (uv space). Velocities are uv / second.

namespace {

constexpr int N = 80;
constexpr int W = N + 2;
constexpr int CELLS = W * W;
constexpr int PRESSURE_ITERATIONS = 20;
constexpr float SOR_OMEGA = 1.8f;  // successive over-relaxation factor

float u[CELLS], v[CELLS];      // velocity
float u0[CELLS], v0[CELLS];    // scratch / previous velocity
float curl[CELLS];             // vorticity magnitude buffer
float pressure[CELLS];         // kept between steps to warm-start the solve
float divergence[CELLS];

inline int ix(int i, int j) { return i + W * j; }

inline float absf(float x) { return x < 0.0f ? -x : x; }
inline float clampf(float x, float lo, float hi) { return x < lo ? lo : (x > hi ? hi : x); }
inline float sqrtf_(float x) { return __builtin_sqrtf(x); }
inline float expf_(float x) {
  // exp(x) for the gaussian splat, x <= 0. Range-reduce by 2^k then a short series:
  // good to ~1e-4, which is plenty for a brush falloff and keeps us libc-free.
  if (x < -20.0f) return 0.0f;
  const float ln2 = 0.69314718f;
  int k = static_cast<int>(x / ln2) - 1;
  float r = x - static_cast<float>(k) * ln2;  // r in [0, ln2)
  float p = 1.0f + r * (1.0f + r * (0.5f + r * (0.16666667f + r * (0.04166667f + r * 0.00833333f))));
  float scale = 1.0f;
  for (int n = k; n < 0; ++n) scale *= 0.5f;
  return p * scale;
}

// b = 1: horizontal component (reflect at left/right walls), 2: vertical, 0: scalar.
void set_bounds(int b, float* x) {
  for (int i = 1; i <= N; ++i) {
    x[ix(0, i)] = b == 1 ? -x[ix(1, i)] : x[ix(1, i)];
    x[ix(N + 1, i)] = b == 1 ? -x[ix(N, i)] : x[ix(N, i)];
    x[ix(i, 0)] = b == 2 ? -x[ix(i, 1)] : x[ix(i, 1)];
    x[ix(i, N + 1)] = b == 2 ? -x[ix(i, N)] : x[ix(i, N)];
  }
  x[ix(0, 0)] = 0.5f * (x[ix(1, 0)] + x[ix(0, 1)]);
  x[ix(0, N + 1)] = 0.5f * (x[ix(1, N + 1)] + x[ix(0, N)]);
  x[ix(N + 1, 0)] = 0.5f * (x[ix(N, 0)] + x[ix(N + 1, 1)]);
  x[ix(N + 1, N + 1)] = 0.5f * (x[ix(N, N + 1)] + x[ix(N + 1, N)]);
}

// Semi-Lagrangian advection: trace each cell centre back through the velocity
// field and bilinearly sample the previous state there. Unconditionally stable.
void advect(int b, float* d, const float* d0, const float* uu, const float* vv, float dt) {
  const float dt0 = dt * N;
  for (int j = 1; j <= N; ++j) {
    for (int i = 1; i <= N; ++i) {
      float x = clampf(i - dt0 * uu[ix(i, j)], 0.5f, N + 0.5f);
      float y = clampf(j - dt0 * vv[ix(i, j)], 0.5f, N + 0.5f);
      int i0 = static_cast<int>(x), j0 = static_cast<int>(y);
      float s1 = x - i0, s0 = 1.0f - s1;
      float t1 = y - j0, t0 = 1.0f - t1;
      d[ix(i, j)] = s0 * (t0 * d0[ix(i0, j0)] + t1 * d0[ix(i0, j0 + 1)]) +
                    s1 * (t0 * d0[ix(i0 + 1, j0)] + t1 * d0[ix(i0 + 1, j0 + 1)]);
    }
  }
  set_bounds(b, d);
}

// Helmholtz–Hodge projection: solve ∇²p = ∇·u, then subtract ∇p so the
// velocity field is (approximately) divergence-free. Gauss–Seidel with
// over-relaxation, warm-started from last step's pressure, converges in far
// fewer sweeps than a cold Jacobi solve.
void project(float* uu, float* vv) {
  const float h = 1.0f / N;
  float* p = pressure;
  float* div = divergence;
  for (int j = 1; j <= N; ++j) {
    for (int i = 1; i <= N; ++i) {
      div[ix(i, j)] = -0.5f * h * (uu[ix(i + 1, j)] - uu[ix(i - 1, j)] + vv[ix(i, j + 1)] - vv[ix(i, j - 1)]);
    }
  }
  set_bounds(0, div);
  set_bounds(0, p);
  for (int k = 0; k < PRESSURE_ITERATIONS; ++k) {
    for (int j = 1; j <= N; ++j) {
      for (int i = 1; i <= N; ++i) {
        float gs = (div[ix(i, j)] + p[ix(i - 1, j)] + p[ix(i + 1, j)] + p[ix(i, j - 1)] + p[ix(i, j + 1)]) * 0.25f;
        p[ix(i, j)] += SOR_OMEGA * (gs - p[ix(i, j)]);
      }
    }
    set_bounds(0, p);
  }
  for (int j = 1; j <= N; ++j) {
    for (int i = 1; i <= N; ++i) {
      uu[ix(i, j)] -= 0.5f * (p[ix(i + 1, j)] - p[ix(i - 1, j)]) / h;
      vv[ix(i, j)] -= 0.5f * (p[ix(i, j + 1)] - p[ix(i, j - 1)]) / h;
    }
  }
  set_bounds(1, uu);
  set_bounds(2, vv);
}

// Vorticity confinement (Fedkiw et al. 2001): push velocity along N × ω to
// re-inject the small swirls numerical dissipation removes.
void confine_vorticity(float epsilon, float dt) {
  const float h = 1.0f / N;
  for (int j = 1; j <= N; ++j) {
    for (int i = 1; i <= N; ++i) {
      curl[ix(i, j)] = 0.5f * ((v[ix(i + 1, j)] - v[ix(i - 1, j)]) - (u[ix(i, j + 1)] - u[ix(i, j - 1)])) / h;
    }
  }
  for (int j = 2; j < N; ++j) {
    for (int i = 2; i < N; ++i) {
      float nx = 0.5f * (absf(curl[ix(i + 1, j)]) - absf(curl[ix(i - 1, j)]));
      float ny = 0.5f * (absf(curl[ix(i, j + 1)]) - absf(curl[ix(i, j - 1)]));
      float len = sqrtf_(nx * nx + ny * ny) + 1e-5f;
      nx /= len;
      ny /= len;
      float w = curl[ix(i, j)];
      u[ix(i, j)] += dt * epsilon * h * (ny * w);
      v[ix(i, j)] += dt * epsilon * h * (-nx * w);
    }
  }
}

}  // namespace

extern "C" {

int fluid_size() { return N; }
int fluid_stride() { return W; }
const float* fluid_u() { return u; }
const float* fluid_v() { return v; }

void fluid_reset() {
  for (int k = 0; k < CELLS; ++k) u[k] = v[k] = u0[k] = v0[k] = curl[k] = pressure[k] = divergence[k] = 0.0f;
}

// Add a gaussian velocity impulse centred at (x, y) in uv space.
// `aspect` (width / height) keeps the brush round on a non-square viewport.
void fluid_splat(float x, float y, float fx, float fy, float radius, float aspect) {
  if (!(radius > 0.0f)) return;
  const float inv = 1.0f / (radius * radius);
  const int reach = static_cast<int>(radius * N * 3.0f) + 1;
  const int ci = static_cast<int>(x * N) + 1;
  const int cj = static_cast<int>(y * N) + 1;
  for (int j = cj - reach; j <= cj + reach; ++j) {
    if (j < 1 || j > N) continue;
    for (int i = ci - reach; i <= ci + reach; ++i) {
      if (i < 1 || i > N) continue;
      float dx = ((i - 0.5f) / N - x) * aspect;
      float dy = (j - 0.5f) / N - y;
      float g = expf_(-(dx * dx + dy * dy) * inv);
      u[ix(i, j)] += fx * g;
      v[ix(i, j)] += fy * g;
    }
  }
}

// Advance the simulation by dt seconds. `decay` is the per-second fraction of
// velocity kept (e.g. 0.35), `vorticity` the confinement strength.
void fluid_step(float dt, float decay, float vorticity) {
  // decay^dt via exp(dt * ln(decay)) using a cheap log for decay in (0, 1].
  float d = clampf(decay, 0.01f, 1.0f);
  float lnd = 0.0f;
  {
    // ln(d) for d in (0, 1]: ln(d) = 2 * atanh((d - 1) / (d + 1)), series to 7th order.
    float z = (d - 1.0f) / (d + 1.0f), z2 = z * z;
    lnd = 2.0f * z * (1.0f + z2 * (1.0f / 3.0f + z2 * (1.0f / 5.0f + z2 * (1.0f / 7.0f))));
  }
  float keep = expf_(dt * lnd);
  for (int k = 0; k < CELLS; ++k) {
    u[k] *= keep;
    v[k] *= keep;
  }

  // One projection per step (after advection) instead of Stam's two: the
  // velocity entering advection is last step's projected field plus small
  // splats, and it halves the cost.
  if (vorticity > 0.0f) confine_vorticity(vorticity, dt);

  for (int k = 0; k < CELLS; ++k) {
    u0[k] = u[k];
    v0[k] = v[k];
  }
  advect(1, u, u0, u0, v0, dt);
  advect(2, v, v0, u0, v0, dt);
  project(u, v);
}

}  // extern "C"
