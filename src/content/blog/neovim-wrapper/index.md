---
title: Neovim wrapper from scratch
pubDate: 2024-09-26T13:31:24Z
summary: A DIY approach to managing Neovim with Nix. Without complicated
frameworks that introduce more complexity.
draft: false
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
- [NixNeovim](https://github.com/NixNeovim/NixNeovim)
- [Nvf](https://github.com/NotAShelf/nvf)
- [Minimal Neovim Wrapper](https://github.com/Gerg-L/mnw)

In face of so many alternatives, my answer: I don't think they are good. The
fundamental issue with all of them is that you completely miss how the plugins
are handled. Which is a big deal, because it's not something fundamentally hard.
I believe that by writing the wrapper by yourself, you will be more confident in
the abstractions that hold up your Neovim configuration.

So, instead of proposing yet another Neovim wrapper: this is *Neovim wrapper from
scratch* (NWFS if you wish), a guide yo writing your own Neovim wrapper with
Nix.

> [!TIP]
> This guide assumes some knowledge of Nix and Neovim.

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
startup (`start` plugins) or manually (`opt` plugins, with `:packadd`).
- Plugins modify Neovim's behavior. These are the repos you find on 
the internet, usually written in Lua.

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
directory: `~/.local/share/nvim/site/pack/<package>`. This is essentially what
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

## symlinkJoin

To begin with, we will setup some Nix files to use as base. Following the
convention of other Nix projects, we will use 2 files:

- A `neovim.nix` file that can be  `callPackage`'d
- A `default.nix` that we can call `nix build` on. You might want to directly
  call your `neovim.nix` from your flake or NixOS configuration though.

```nix
# default.nix
let
  pkgs = import <nixpkgs> {};
in
  pkgs.callPackage ./neovim.nix {};
```

```nix file: "neovim-1.nix"
```

`symlinkJoin` is a high-level abstraction of `mkDerivation`, that takes some
`paths`, and create a symlink for every path in the target derivation. This
allows us to create a "clone" of the original application, that saves space by
using symlinks instead of copying files. We will use it as the base to create
our wrapper.

We can build this package with `nix build -f ./default.nix` -- or with
`nix-build` for the v2 CLI.

## wrapProgram

`wrapProgram` is a bash function that creates a wrapper automatically. I usually
check its [source code](https://github.com/NixOS/nixpkgs/blob/master/pkgs/build-support/setup-hooks/make-wrapper.sh) to know the arguments it accepts.

You can use the bash function `wrapProgram` by adding the derivation
`makeWrapper` to your `nativeBuildInputs`. Then, we can use it to pass `-u` to
`nvim`:

```nix file: "neovim-2.nix"
```

Hooray!

## Loading plugins with a package

As we know, the primitive to load plugins in Neovim is a *package*, which is a
container for different plugins, which can be `start` (loaded automatically) or
`opt` (loaded manually with `:packadd`). We can set the `packpath` option, which
is a folder that contains different packages. Let's start by creating our
package path, which will contain a single package, that will contain itself all
out plugins:

```nix file: "neovim-3.nix"
```

In this code snippet, we create a `packpatch` that follows the directory
structure that Neovim requires. We can pass it through with `passhtru`, to be
able to build it directly:

```console
$ nix build -f ./default.nix packpath
$ eza --tree result/
result
└── pack
   └── mypackage
      ├── opt
      └── start
         └── telescope.nvim -> /nix/store/...-vimplugin-lua5.1-telescope.nvim-scm-1-unstable-2024-08-02
```

## Setting packpath and NVIM_APPNAME

Finally, we can pass `--cmd` to set our `packpath` and `runtimepath`. You can
also set the environment variable `NVIM_APPNAME=<something>`, which will cause
Neovim to read different paths, potentially ignoring leftovers of other Neovim
configuration. This is nice, because it will make our configuration more
"independent" of the host system.

> [!TIP]
> Remember to also set `runtimepath`

```nix file: "neovim-4.nix"
```

> [!NOTE]
> Be careful with the quoting around `--add-flags "'set ...'"`. I had to add
> these so that `wrapProgram` doesn't split it into multiple strings. You can
> check the resulting wrapper to check if everythin is OK:
> ```console
> $ cat result/bin/nvim
> #! /nix/store/izpf49b74i15pcr9708s3xdwyqs4jxwl-bash-5.2p32/bin/bash -e
> export NVIM_APPNAME=${NVIM_APPNAME-'nvim-custom'}
> exec -a "$0" "/nix/store/jvqc319jklmnqfbfw6c058fr262dlr2w-neovim-custom/bin/.nvim-wrapped"  -u /nix/store/ri095naj7cpgqahq50arfq0nn2j9kmsr-init.lua --cmd 'set packpath^=/nix/store/ji9z2g9m2gg5isp213v45vig1x8q0x3c-packpath | set runtimepath^=/nix/store/ji9z2g9m2gg5isp213v45vig1x8q0x3c-packpath' "$@"
> ```

## Finale

That's it! Creating a wrapper for Neovim is not a difficult task, and I think
this Do-It-Yourself approach is simpler to maintain that relying on some Nix
framwork. Now that your neovim configuration is self-contained with Nix, these
are some things that you can do:

- Use it directly on a foreign machine with `nix run github:user/repo#neovim`
- Try other people's config -- mine is `nix run github:viperML/dotfiles#neovim`
- Investigate `nix bundle` or `nix copy` to bring it to machines that don't use
  Nix.

## Optionals

Before leaving, I want to mention some optional topics that you might want to do
too.

### Configuration as a plugin

Instead of having a huge `init.lua`, you could make your own configuration a
plugin itself. The structure of a plugin is the following:

```
<plugin>
├── plugin
│   └── init.lua
└── lua
    └── <lua module>
        ├── something.lua
        └── init.lua
```

At first, we create a directory for the plugin, and move our `init.lua` into
`<plugin>/plugin/init.lua`. Then, we can factor out configuration into its own
Lua module. For example, if we name our Lua module something like `myconfig`,
then within our `plugin/init.lua` we can `require("myconfig")` and
`require("myconfig.something")`. This can be helpful to split a large
configuration into different units.

When we create our own plugin, we will use `-u NORC` instead of passing our
`init.lua`, and also add it to our package-creating derivation:

```nix
packpath = runCommandLocal "packpath" {} ''
  mkdir -p $out/pack/${packageName}/{start,opt}

  ln -vsfT ${./myplugin} $out/pack/${packageName}/start/myplugin

  ${
    lib.concatMapStringsSep
    "\n"
    (plugin: "ln -vsfT ${plugin} $out/pack/${packageName}/start/${lib.getName plugin}")
    startPlugins
  }
'';
```

### Lazy loading with lz.n

One of the things that people dislike about the Nix wrappers is that they don't
use [lazy.nvim](https://github.com/folke/lazy.nvim). That package manager is
capable of setting hooks automatically, so that plugins are loaded at specic
events. For example, you can configure *telescope* to only load when you
actually run the command `:Telescope`.

This is possible to do manually. If lazy.nvim does it, there must be a way, in
the end. But the lazyer of abstraction is the useful part.

So, instead, you can use [lz.n](https://github.com/nvim-neorocks/lz.n), a plugin
that can take care of "lazy loading" (quite of an overloaded term). You must
place it as a `start` plugin, while plugins that you want to be lazy-loadable
must be `opt` plugins. `lz.n` doesn't install plugins itself, but rather provide
an inteface for lazy-loading. After adding the plugins to your wrapper, refer to
upstream documentation for configuration.

### Plugins not in nixpkgs

As you may have noticed, we bring plugins from `pkgs.vimPlugins.<>`. These are
plugins that are pre-packaged in nixpkgs. This is convenient, but you might want
to bring plugins that are not packaged, or use some specific commit or version
for some plugin.

As you know, a Neovim plugin is simply a cloned repository. You can use
`pkgs.fetchFromGitHub` and pass it directly to our `plugins` list. There is also
`pkgs.vimUtils.buildVimPlugin`, which also sets a plugin's name, so that when we
use `lib.getName plugin` in our build script, it gets linked with the proper
name.

```nix
plugins = [
  (vimUtils.buildVimPlugin {
    name = "telescope.nvim"
    src = fetchFromGitHub {
      owner = "nvim-telescope";
      repo = "telescope.nvim";
      rev = "cb3f98d935842836cc115e8c9e4b38c1380fbb6b";
      hash = ""; # fill with correct hash
    };
  })
  vimPlugins.etc
  # ...
];
```

Another option to using plugins outside of `pkgs.vimPlugins` is [nvfetcher](https://github.com/berberman/nvfetcher),
a little program that can generate all the `fetchFromGitHub` for you from a
simple TOML specification. I do it for 
[my Neovim wrapper](https://github.com/viperML/dotfiles/blob/e253b13d89ea56493d85aa7290fda55dcb81a4e1/modules/wrapper-manager/neovim/default.nix#L32)
, and while passing
around the results from nvfetcher is not trivial, it is definitively doable.

### Extra Lua packages

Nixpkgs hosts Lua packages that are mirrored from luarocsk, that you might want
to load into your Neovim configuration. To be able to load them, there are 2
options:

- Changing the `LUA_PATH` and `LUA_CPATH` environment variables.
- Changing the `package.path` and `package.cpath` Lua globals.

While both work, I don't like using environment variables. They "leak" into
child processes, which might be undesired -- for example, you are editing a Lua
configuration, so you don't want the `LUA_PATH` that is specific to Neovim to
leak into the suprocess of the language server, or something else.

One way to modify the `package` global, while having access to the packages from
Nix, is to write a plugin in-place with `pkgs.runCommand`:

```nix
luaEnv = neovim-unwrapped.lua.withPackages (luaPackages: [
  luaPackages.luassert
  luaPackages.lua-cjson
]);

inherit (neovim-unwrapped.lua.pkgs.luaLib) genLuaPathAbsStr genLuaCPathAbsStr;

plugins = [
  (pkgs.runCommandLocal "init-plugin" {} '' 
    mkdir -pv $out/plugin
    tee $out/plugin/init.lua <<EOF
    package.path = "${genLuaPathAbsStr luaEnv};" .. package.path
    package.cpath = "${genLuaCPathAbsStr luaEnv};" .. package.cpath
    EOF
  '')
];
```
