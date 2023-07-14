---
title: 'Development workflow with Nix'
date: 2023-05-28T21:18:09Z
tags: ['nix']
draft: false
summary: 'A getting-started guide to nix devshells'
slug: nix-workflow
---

Devshells are a very powerful tool, and one of the big selling points of [Nix](https://nixos.org/). A devshell allows you to enter an environment where you have are your development dependencies available. This means that:

- Each project is completely isolated from each other, no more dependency hell between them.
- Packages don't pollute your global environment.

And even better, nix allows you to pin your dependencies such that they are completely reproducible. If you share your project with someone else, they will get the exact same environment as you. No more "run these 1000 commands to get started"!

So in this blog post, I want to give a quick overview of how to get started from the very beginning.

# Preparations
## Install nix

To start from the very beginning, you need to install nix. You can install it on any Linux distribution and macOS too.

- [Official installer](https://nixos.org/download.html)
- Determinate System's [nix-installer](https://github.com/DeterminateSystems/nix-installer)

DS's nix-installer already enables flakes and has a better UX, but both should give you a similar result.

If you chose the official installer, enable flakes by adding the following line to your `~/config/nix/nix.conf`:

```conf
experimental-features = nix-command flakes
```

You can then verify that it works properly, and proceed to the next step.

```console
$ nix run nixpkgs#cowsay -- hi
 ____
< hi >
 ----
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||
```

## Install direnv

`direnv` is an external tool, that loads a development environment when you enter a directory.

```
$ cargo --version
-> cargo: command not found
$ cd Documents/autonix
$ cargo --version
cargo 1.64.0
```

We will use it to automatically load a nix shell when we enter a project directory. This avoids having to enter it manually.

It also integrates with your editor, so make sure to both hook it into your shell, and install the editor plugin.


- Install the base direnv package, available in your distro (`apt install direnv`, `brew install direnv`, etc)
- [Hook it into your shell](https://direnv.net/docs/installation.html)
- Editor plugin:
    - [Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=mkhl.direnv)
    - [Emacs](https://github.com/wbolster/emacs-direnv)


## Init the project

We will start by writing the basic flake boilerplate by hand (don't blame me for not having a `nix init` command).

```nix
# flake.nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = {nixpkgs, ...}: let
    system = "x86_64-linux";
    #       ↑ Swap it for your system if needed
    #       "aarch64-linux" / "x86_64-darwin" / "aarch64-darwin"
    pkgs = nixpkgs.legacyPackages.${system};
  in {
    devShells.${system}.default = pkgs.mkShell {

      packages = [  ];
      # ...

    };
  };
}
```

{{< alert >}}
If you use git, make sure to `git add` every nix file!
{{</ alert >}}

We will also add a configuration file for direnv, such that it loads the shell upon entering the directory.

```bash
# .envrc
use flake
```



# Ready, set, go!

All that is left to do is filling the arguments of `mkShell` with the programs that you want. All you need to know about it is:

- Add your packages in the argument of `packages`. Browse https://search.nixos.org/packages for everything that is available.
- Be mindful if a package provides a `.out` output (the default) or a `.dev` output, which includes headers, libraries, etc.
- Add your environment variables directly as arguments to `mkShell`.
- Each language ecosystem has its gotchas, so take a look at the [Languages and frameworks](https://nixos.org/manual/nixpkgs/stable/#chap-language-support) section of the nixpkgs manual.
- `shellHook` is run after entering the shell. We try to not [ab]use it, but sometimes we need it to set up some workarounds.

The following are some quick examples of common use cases for different languages.

## Rust
For the first example, we can use nix to install our compiler, but also the language server and formatter.


```nix
pkgs.mkShell {
  packages = [
    pkgs.cargo
    pkgs.rustc

    pkgs.rust-analyzer
    pkgs.rustfmt
  ];

  RUST_BACKTRACE = "1";
}
```

I have a blog post about using a rustup `toolchain.toml` with nix, such that you can perfectly pin your rust version with nix, while still pulling custom toolchains or targets: [Nix shell with rustup]({{< ref "/blog/nix-rustup" >}}).

## Python

In this example, we leverage the `withPackages` function of nixpkgs' python to add some custom packages. This is the easiest way to use python with nix, but it requires that the packages are available in nixpkgs.

```nix
pkgs.mkShell {
  packages = [
    (python3.withPackages (python-pkgs: [
      python-pkgs.numpy
      python-pkgs.pandas
      python-pkgs.scipy
      python-pkgs.matplotlib
      python-pkgs.requests
    ]))
  ];

  # Workaround: make vscode's python extension read the .venv
  shellHook = ''
    venv="$(cd $(dirname $(which python)); cd ..; pwd)"
    ln -Tsf "$venv" .venv
  '';
}
```

### Poetry 

If you need packages that are not available on nixpkgs, instead of packaging it you can resort to using poetry. In this shell we use nix to provide python and poetry, and configure it to automatically enter the venv with direnv.

```nix
pkgs.mkShell {
  packages = [
    pkgs.python3
    pkgs.poetry
  ];

  # Workaround in linux: python downloads ELF's that can't find glibc
  # You would see errors like: error while loading shared libraries: name.so: cannot open shared object file: No such file or directory
  LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
    pkgs.stdenv.cc.cc
    # Add any missing library needed
    # You can use the nix-index package to locate them, e.g. nix-locate -w --top-level --at-root /lib/libudev.so.1
  ];
  
  # Put the venv on the repo, so direnv can access it
  POETRY_VIRTUALENVS_IN_PROJECT = "true";
  POETRY_VIRTUALENVS_PATH = "{project-dir}/.venv";
  
  # Use python from path, so you can use a different version to the one bundled with poetry
  POETRY_VIRTUALENVS_PREFER_ACTIVE_PYTHON = "true";
}
```

And modify your `.envrc` to use the venv created by poetry:

```bash
use flake
watch_file .venv
if [ -d .venv ]; then
  source .venv/bin/activate
fi
```


## C/C++

For C/C++, things can get more complicated, because of the nature of the language toolchain. To begin with, an empty nix shell already provides a C compiler, `make` and some other utils:

```nix
pkgs.mkShell {
}
```

To use a different C compiler, you may be tempted to add it to `packages`, but that is wrong here. What you need to do, is swap `mkShells` standard environment as follows:

```nix
pkgs.mkShell.override {
  stdenv = pkgs.clang15Stdenv;
} {
  packages = [];
}
```

To propery discover libraries, you may need a combination of the following tools. Under the hood, when they are added in `packages`, code is executed to properly configure the environment, such that it "just works".

```nix
pkgs.mkShell {
  packages = [
    # Choose the build tools that you need
    pkgs.cmake
    pkgs.pkg-config
    pkgs.meson
    pkgs.ninja

    # Add some libraries
    pkgs.boost.dev
    pkgs.fmt.dev
  ];
```

## NodeJS

Unlike C/C++, NodeJS is quite straightfoward. While most things will be handled by your editor, you might want to open a quick shell to make certain packages available to yourself. The packages below are generally universal, but certain frameworks (i.e Svelte or NextJS) may require additional packages to be added to the shell.
```nix
pkgs.mkShell {
  packages = [
    # standard toolkit
    pkgs.nodejs # nixpkgs provides a "nodejs" package that corresponds to the current LTS version of nodejs, but you can specify a version (i.e node_20) if necessary
    pkgs.yarn
    pkgs.pnpm # a faster alternative to npm and yarn, with a less adopted toolchain

    # optionally required by your code editor to lint and format your code
    pkgs.nodePackages.prettier # formatter
    pkgs.nodePackages.eslint # linter

    # example package to serve a static nextjs export
    pkgs.nodePackages.serve
  ];
}
```

For globally installing packages, remember that the ad-hoc `npm install -g <nodePackage>` method is not supported on NixOS, so you will need to add packages to your shell or environment packages to make them globally available. An example language server installation would look like this.
```nix
pkgs.mkShell {
  packages = [
    pkgs.nodejs
    pkgs.nodePackages.typescript-language-server
  ];
}
```

# Keep nixing!

I hope that you found this quick guide useful, and feel free to open an issue on the [GitHub repository](https://github.com/viperML/neohome) if you have any suggestion to add an example for a language.

As you use more complex frameworks, or more specific/niche situations; more things will fail. But feel free to ask on [NixOS Discourse](https://discourse.nixos.org/) if you run into any issue!
