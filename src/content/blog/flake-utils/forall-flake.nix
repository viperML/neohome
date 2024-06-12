{
  outputs = {nixpkgs, ...}: let

    forAllSystems = function:
      nixpkgs.lib.genAttrs [
        "x86_64-linux"
        "aarch64-linux"
      ] (system: function nixpkgs.legacyPackages.${system});

  in {

    packages = forAllSystems (pkgs: {
      default = pkgs.callPackage ./package.nix {};
    });

    nixosConfigurations.nixos = nixpkgs.lib.nixosSystem {};
    overlays.default = final: prev: {};
  };
}
