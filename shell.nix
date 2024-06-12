with import <nixpkgs> {};
mkShell {
  packages = [
    nodejs

    tailwindcss
    nodePackages.wrangler
  ];
}
