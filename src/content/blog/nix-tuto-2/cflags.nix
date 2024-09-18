# cflags.nix
let
  pkgs = import <nixpkgs> {};
in
  pkgs.stdenv.mkDerivation {
    name = "cflags";
    src = null;
    dontUnpack = true;

    buildInputs = [ pkgs.zlib ];

    buildPhase = ''
      printenv | grep NIX_ | grep FLAGS
    '';
  }
