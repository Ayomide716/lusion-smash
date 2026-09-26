// Compile the C++ fluid solver and link it into this crate. For wasm32 the
// solver is freestanding (no libc / libstdc++), so both halves end up in a
// single .wasm with one shared linear memory.
fn main() {
    println!("cargo:rerun-if-changed=cpp/fluid.cpp");
    let target = std::env::var("TARGET").unwrap_or_default();
    let mut build = cc::Build::new();
    build
        .cpp(true)
        .file("cpp/fluid.cpp")
        .opt_level(3)
        .flag_if_supported("-std=c++17")
        .flag_if_supported("-fno-exceptions")
        .flag_if_supported("-fno-rtti")
        .cpp_link_stdlib(None);
    if target.starts_with("wasm32") {
        build.compiler("clang++").flag("-ffreestanding").flag("-nostdlib");
    }
    build.compile("fluid");
}
