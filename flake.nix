{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    system = "x86_64-linux";
    pkgs = nixpkgs.legacyPackages.${system};
    inherit (nixpkgs) lib;
    fs = lib.fileset;
    r = ./.;
    src = fs.toSource {
      root = r;
      fileset =
        fs.intersection
        (fs.fromSource (lib.sources.cleanSource r))
        (fs.unions [
          ./src
          (fs.fileFilter (file: file.hasExt "ts") r)
          (fs.fileFilter (file: file.hasExt "json") r)
        ]);
    };
    package-json = builtins.fromJSON (builtins.readFile ./package.json);
  in {
    packages.${system} = {
      default = with pkgs;
        buildNpmPackage {
          pname = package-json.name;
          version = package-json.version;
          inherit src;

          npmDeps = importNpmLock {
            npmRoot = src;
          };
          npmConfigHook = importNpmLock.npmConfigHook;

          env.ASTRO_TELEMETRY_DISABLED = true;
        };
    };
  };
}
