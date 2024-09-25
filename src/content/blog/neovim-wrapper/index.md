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
- [Nvf](https://github.com/NotAShelf/nvf)
- [Minimal Neovim Wrapper](https://github.com/Gerg-L/mnw)

In face of so many alternatives, my answer: I don't think they are good. The
fundamental issue with all of them is that you completely miss how the plugins
are handled. Which is a big deal, because it's not something hard to understand.
I believe that by writing the wrapper by yourself, you will be more confident in
the abstractions that hold your Neovim configuration.

So, instead of proposing yet another Neovim wrapper: this is *Neovim wrapper from
scratch* (NWFS if you wish), the guide to write it by yourself.

## The big idea

Traditionally, you configure Neovim by editing
`~/.config/neovim/init.{vim,lua}`. Instead, we will create a new `nvim`
executable that passes the path to the configuration, from the `/nix/store`.
This will make it self-contained and resilient to changes in your home
directory. And easily shareable.

The easiest way to create a wrapper script (with Nix) is to use a bash script,
like the following:

```nix
#! /nix/store/.../bin/bash
exec -a "$0" /nix/store/.../bin/nvim -u /nix/store/.../init.lua "$@"
```

- `exec` is used to that bash exits when loading Neovim, instead of becoming its
  parent.
- `-a "$0"` is an argument to `exec` which can be used to change `argv[0]`,
which is the name of the program. For example, if you execute `ls -la`, it
receives `argv = { "ls", "-la" }`. It can be useful to pass-through the original
`argv[0]`.
- `"$@"` is used to pass-through the rest of `argv`
- `-u init.lua` to make Neovim read our custom startup config.

This script should be named `nvim`, while the original `nvim` executable will
not be added to `PATH`, but only directly addressed by its store path.

## Native plugin loading

Neovim has 2 similar concepts that we must understand: packages and plugin
([Neovim manual](https://neovim.io/doc/user/repeat.html#packages)).

- Packages contain plugins inside them. The plugins are loaded either at
startup (`start` plugins) or manaully (`opt` plugins, with `:packadd`).
- Plugins modify Neovim's behaviour. These are the repos you find in the
internet, usually written in Lua.

A package has the following structure:

```
<package>
├── start
│   ├── <plugin-a>
│   └── <plugin-b>
└── opt
    ├── <plugin-x>
    └── <plugin-z>
```

For a regular Neovim installation, you can create your own packages under the
directory: `~/.local/share/nvim/site/pack/<package>`. This is essentialy what
plugin managers do: they create this folder, and download plugins that you
declare in your `init.lua` into
`~/.local/share/nvim/site/pack/<package>/start/<plugin-a>`, etc.

Plugins that are under `start` are loaded automatically when Neovim starts
up. In the contrary, a plugin in `opt` is only loaded when you run `:packadd`.
What does *loading* mean? For a plugin `<plugin>` that Neovim loads, it will try
to execute `<plugin>/plugin/init.lua`, register the auto-loading for
fileytypes from `<plugin>/after/ftplugin/<language>.lua`, etc. You can read
about the loading mechanism in the [manual](https://neovim.io/doc/user/repeat.html#_using-vim-packages).

To tie things up, we can control where Neovim looks for packages (remember, a
package is a collection of plugins) by controlling the option [`packpath`](https://neovim.io/doc/user/options.html#'packpath').
We can set `packpath` from the commandline, with the generic interface that
`--cmd` offers, so `--cmd 'set packpath^=/nix/store/...'`.

