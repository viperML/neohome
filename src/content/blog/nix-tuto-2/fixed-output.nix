# fixed-output.nix
let
  pkgs = import <nixpkgs> {};
in
  builtins.derivation {
    name = "fixed-output";
    system = "x86_64-linux";
    builder = "/bin/sh";

    args = [
      "-c"
      "${pkgs.curl}/bin/curl -H 'User-Agent: nix' https://httpbin.org/user-agent > $out"
    ];

    # fixed-output-derivation by using output* options
    outputHashMode = "flat";
    outputHashAlgo = "sha256";
    outputHash = "";
  }
