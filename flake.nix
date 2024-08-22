{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    tree-sitter = {
      url = "github:viperML/tree-sitter";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs @ {
    self,
    nixpkgs,
    ...
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
          ./public
          ./neohome-rs
          (fs.fileFilter (file: file.hasExt "ts") r)
          (fs.fileFilter (file: file.hasExt "json") r)
        ]);
    };
    package-json = builtins.fromJSON (builtins.readFile ./package.json);
    grammarPath = pkgs.linkFarmFromDrvs "grammar-bundle" (builtins.attrValues (lib.getAttrs (map (n: "tree-sitter-${n}") [
        "nix"
        "rust"
        "bash"
        "ini"
        "toml"
        "yaml"
        "json"
      ])
      inputs.tree-sitter.legacyPackages.${system}.grammars.all));
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

          # preBuild = ''
          #   pushd neohome-rs
          #   npm run build
          #   popd
          # '';

          cargoDeps = rustPlatform.importCargoLock {
            lockFile = ./neohome-rs/Cargo.lock;
            outputHashes = {
              "tree-sitter-dynamic-0.1.0" = "sha256-q2ykb8p8OhSVHysnVeMgFakv6xtbS92CpNVaNn2jXU0";
            };
          };

          cargoRoot = "neohome-rs";

          nativeBuildInputs = [
            rustPlatform.cargoSetupHook
            rustc
            cargo
          ];

          preInstall = ''
            rm -rf $cargoRoot/target
          '';

          env =
            {
              ASTRO_TELEMETRY_DISABLED = true;
              TS_GRAMMAR_PATH = grammarPath;
            }
            // (lib.optionalAttrs (builtins.hasAttr "rev" self) {
              GIT_COMMIT = self.rev;
            });
        };
    };

    devShells.${system}.default = with pkgs;
      mkShell {
        packages = [
          cargo
          rustc
          rust-analyzer-unwrapped
          rustfmt

          nodejs
          yarn

          tailwindcss
          # nodePackages.wrangler
          nodePackages."@astrojs/language-server"
          nodePackages.typescript-language-server

          ltex-ls

          (python3.withPackages (pp: [
            pp.pyyaml
          ]))
        ];
        env.RUST_SRC_PATH = "${rustPlatform.rustLibSrc}";
        env.TS_GRAMMAR_PATH = grammarPath;
      };
  };
}
