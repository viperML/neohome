---
title: Neovim wrapper from scratch
pubDate: 2024-09-25T09:38:41Z
summary: TODO
draft: true
---

What if told you, that you can have a portable Neovim configuration, that runs
on any system that has Nix? And that you only need a single `nix run` command to
execute it, without having to clone your `.config/neovim` and install your
plugins?

In this tutorial, I want to guide you how to write your own Neovim wrapper from
scratch, in the same spirit as 
[Linux for Scratch](https://www.linuxfromscratch.org) (I haven't actually read it).
Wrapping Neovim, means that we create a new "fake" `nvim` executable, which
calls the original one, with different flags or environment variables. Neovim
has different flags that we can use for configuration, for example `-u
/path/to/init.lua` to a different place. If we create our wrapper with Nix, we
can use a complete suite of software (plugins, extra apps) that wrap Neovim
itself, making it self-contained in the `/nix/store`.
Then, you can take your wrapped Neovim to any machine, and simply `nix run` or
`nix shell` will give you your whole installation.

There are already multiple abstractions that wrap Neovim:

- [Nixpkgs's wrapper](https://nixos.org/manual/nixpkgs/stable/#vim)
- [NixVim](https://github.com/nix-community/nixvim)
- [Minimal Neovim Wrapper](https://github.com/Gerg-L/mnw)

My response to these: I'll teach you how to make your own wrapper, so you know
what is going on under the hood.


## The big idea

## Native plugin loading

## (Optional) Make your init.lua a plugin itself

