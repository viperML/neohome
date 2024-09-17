# two-derivations.nix
let
  first = builtins.derivation {
    system = "x86_64-linux";
    builder = "/bin/sh";
    name = "first";
    args = ["-c" "echo first > $out"];
  };

  second = builtins.derivation {
    system = "x86_64-linux";
    builder = "/bin/sh";
    name = "second";
    args = [
      "-c"
      ''echo "${first}" > $out''
    ];
  };
in
  second
