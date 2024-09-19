# my-derivation.nix
builtins.derivation {
  system = "x86_64-linux";
  name = "sample";
  builder = "/bin/sh";

  args = [
    "-c"
    "echo hello > $out"
  ];
}
