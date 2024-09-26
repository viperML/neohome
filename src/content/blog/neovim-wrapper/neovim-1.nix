# neovim.nix
{
  symlinkJoin,
  neovim-unwrapped,
}:
symlinkJoin {
  name = "neovim-custom";
  paths = [neovim-unwrapped];
}
