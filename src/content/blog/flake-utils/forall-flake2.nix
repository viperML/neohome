{
  outputs = inputs @ {nixpkgs, ...}: let

    forAllSystems = function:
      nixpkgs.lib.genAttrs [
        "x86_64-linux"
        "aarch64-linux"
      ] (system:
        function (import nixpkgs {
          inherit system;
          config.allowUnfree = true;
          overlays = [
            inputs.something.overlays.default
          ];
        }));

  in {
    # ...
  };
}
