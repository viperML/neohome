{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    mkshell-minimal.url = "github:viperML/mkshell-minimal";
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake {inherit inputs;} {
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];

      perSystem = {
        pkgs,
        lib,
        config,
        ...
      }: {
        legacyPackages = pkgs;

        devShells.base = inputs.mkshell-minimal pkgs {
          packages = [
            pkgs.nodePackages.wrangler
            pkgs.hugo
            pkgs.just
          ];
          env = {
            HUGO_THEMESDIR = config.packages.themes;
          };
        };

        packages.themes = lib.pipe (pkgs.callPackages ./_sources/generated.nix {}) [
          builtins.attrValues
          (map (elem:
            elem.src.overrideAttrs (_: {
              name = elem.pname;
            })))
          (pkgs.linkFarmFromDrvs "themes")
        ];

        packages.default = pkgs.callPackage ({
          hugo,
          stdenvNoCC,
        }:
          stdenvNoCC.mkDerivation {
            name = "neohome";
            src = inputs.self.outPath;
            nativeBuildInputs = [
              hugo
            ];
            HUGO_THEMESDIR = config.packages.themes;
            buildPhase = ''
              runHook preBuild
              mkdir -p builddir
              hugo --minify --destination builddir
              runHook postBuild
            '';
            installPhase = ''
              runHook preInstall
              cp -vr builddir $out
              runHook postInstall
            '';
          }) {};
      };
    };
}
