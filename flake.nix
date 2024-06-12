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
  in {
    packages.${system} = {
      # deps = with pkgs;
      #   stdenvNoCC.mkDerivation {
      #     name = "neohome-deps";
      #     inherit src;
      #     nativeBuildInputs = [prefetch-npm-deps];
      #     buildPhase = ''
      #       prefetch-npm-deps ./package-lock.json > $out
      #     '';
      #     outputHashAlgo = "sha256";
      #     outputHashMode = "recursive";
      #     outputHash = "sha256-4SePc3yGlBTGCoCeZtVL9A1NK5vv2CM8EnoRCinhPA0=";
      #   };

      default = with pkgs;
        buildNpmPackage {
          name = "neohome";
          inherit src;
          npmDepsHash = "sha256-MXBEcrU3NZw24Ag7qPd4iY69EpSmkI+EU2y+vQehSEY=";
          env.ASTRO_TELEMETRY_DISABLED = true;
        };
    };
  };
}
