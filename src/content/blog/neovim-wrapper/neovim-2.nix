# neovim.nix
{
  symlinkJoin,
  neovim-unwrapped,
  makeWrapper,
}:
symlinkJoin {
  name = "neovim-custom";
  paths = [neovim-unwrapped];
  nativeBuildInputs = [makeWrapper];
  postBuild = ''
    wrapProgram $out/bin/nvim \
      --add-flags '-u' \
      --add-flags '${./init.lua}'
  '';
}
