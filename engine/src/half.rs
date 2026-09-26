//! IEEE 754 binary16 packing. Half-float textures are filterable on every
//! WebGPU and WebGL 2 device (32-bit float ones are not), and half the upload.

/// Convert an f32 to f16 bits with round-to-nearest-even. Values beyond the
/// f16 range saturate to ±infinity; NaN stays NaN.
pub fn f32_to_f16(value: f32) -> u16 {
    let bits = value.to_bits();
    let sign = ((bits >> 16) & 0x8000) as u16;
    let exp = ((bits >> 23) & 0xff) as i32;
    let mant = bits & 0x007f_ffff;

    if exp == 0xff {
        return sign | 0x7c00 | if mant != 0 { 0x0200 } else { 0 };
    }

    let e = exp - 127 + 15;
    if e >= 0x1f {
        return sign | 0x7c00;
    }
    if e <= 0 {
        // Subnormal half (or zero): shift the implicit-1 mantissa into place.
        if e < -10 {
            return sign;
        }
        let m = mant | 0x0080_0000;
        let shift = (14 - e) as u32;
        let half = m >> shift;
        let rem = m & ((1 << shift) - 1);
        let midpoint = 1 << (shift - 1);
        let round = (rem > midpoint || (rem == midpoint && (half & 1) == 1)) as u32;
        return sign | (half + round) as u16;
    }

    let half = ((e as u32) << 10) | (mant >> 13);
    let rem = mant & 0x1fff;
    let round = (rem > 0x1000 || (rem == 0x1000 && (half & 1) == 1)) as u32;
    // A mantissa carry correctly bumps the exponent (and overflows to infinity).
    sign | (half + round) as u16
}

#[cfg(test)]
mod tests {
    use super::f32_to_f16;

    #[test]
    fn exact_values() {
        assert_eq!(f32_to_f16(0.0), 0x0000);
        assert_eq!(f32_to_f16(-0.0), 0x8000);
        assert_eq!(f32_to_f16(1.0), 0x3c00);
        assert_eq!(f32_to_f16(-2.0), 0xc000);
        assert_eq!(f32_to_f16(0.5), 0x3800);
        assert_eq!(f32_to_f16(65504.0), 0x7bff);
    }

    #[test]
    fn saturation_and_specials() {
        assert_eq!(f32_to_f16(1e6), 0x7c00);
        assert_eq!(f32_to_f16(-1e6), 0xfc00);
        assert_eq!(f32_to_f16(f32::INFINITY), 0x7c00);
        assert_eq!(f32_to_f16(f32::NAN) & 0x7c00, 0x7c00);
        assert_ne!(f32_to_f16(f32::NAN) & 0x03ff, 0);
    }

    #[test]
    fn subnormals_and_rounding() {
        // Smallest positive subnormal half.
        assert_eq!(f32_to_f16(5.960_464_5e-8), 0x0001);
        assert_eq!(f32_to_f16(1e-10), 0x0000);
        // 1 + 2^-11 is exactly halfway between two halves: ties to even (down).
        assert_eq!(f32_to_f16(1.0 + 1.0 / 2048.0), 0x3c00);
        // 1 + 3·2^-11 ties to even (up).
        assert_eq!(f32_to_f16(1.0 + 3.0 / 2048.0), 0x3c02);
    }
}
