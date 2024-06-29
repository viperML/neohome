with import <nixpkgs> {};
mkShell {
  packages = [
    nodejs

    tailwindcss
    nodePackages.wrangler
    nodePackages."@astrojs/language-server"
  ];
}
