with import <nixpkgs> {};
mkShellNoCC {
  packages = [
    nodejs
    yarn
  ];
}
