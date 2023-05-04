{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    mission-control.url = "github:Platonic-Systems/mission-control";
    flake-root.url = "github:srid/flake-root";
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake {inherit inputs;} {
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];

      imports = [
        inputs.mission-control.flakeModule
        inputs.flake-root.flakeModule
      ];

      perSystem = {
        pkgs,
        lib,
        config,
        ...
      }: {
        legacyPackages = pkgs;

        devShells.base = with pkgs;
          mkShellNoCC {
            inputsFrom = [config.mission-control.devShell];
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
          asciidoctor,
          stdenvNoCC,
        }:
          stdenvNoCC.mkDerivation {
            name = "neohome";
            src = inputs.self.outPath;
            nativeBuildInputs = [
              hugo
              asciidoctor
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

        packages.nosrc = config.packages.default.overrideAttrs (_: {src = null;});

        mission-control.scripts = {
          serve = {
            description = "Serve the blog for development";
            exec = ''hugo server "$@"'';
          };

          layout-diff = {
            description = "Inspect changes to the original layouts";
            exec = ''
              find layouts -type f
              find layouts -type f | while read -r file; do
                echo "going through $file"
                theme_file="${config.packages.themes}/congo/$file"
                if [[ -f "$theme_file" ]]; then
                  echo "===="
                  echo "Comparing $file"
                  echo "===="
                  echo "$theme_file"
                  diff -u --color=always "$theme_file" "$file" || :
                  echo
                fi
              done
            '';
          };
        };
      };
    };
}
