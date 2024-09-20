let
  pkgs = import <nixpkgs> {};
in
  pkgs.mkShell {
    packages = [
      pkgs.pkg-config
      pkgs.zlib
      pkgs.python3
    ];

    env = {
      FOO = "BAR";
    };
  }
