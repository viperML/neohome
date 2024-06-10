pkgs.mkShell {
  packages = [
    toolchain

    # We want the unwrapped version, "rust-analyzer" (wrapped) comes with nixpkgs' toolchain
    pkgs.rust-analyzer-unwrapped
  ];

  RUST_SRC_PATH = "${toolchain}/lib/rustlib/src/rust/library";
}
