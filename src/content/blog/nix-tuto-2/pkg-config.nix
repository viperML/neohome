# pkg-config.nix
let
  pkgs = import <nixpkgs> {};
in
  pkgs.stdenv.mkDerivation {
    name = "with-pkg-config";
    src = null;
    dontUnpack = true;

    nativeBuildInputs = [
      pkgs.pkg-config
    ];

    buildInputs = [
      pkgs.zlib
    ];

    buildPhase = ''
      echo "PKG_CONFIG_PATH:$PKG_CONFIG_PATH"
      pkg-config --list-all
      printenv
    '';
  }
