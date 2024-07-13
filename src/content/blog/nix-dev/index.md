---
title: The Nix development workflow
pubDate: 2023-05-28T21:18:09Z
summary: 'A getting-started guide to mkShell.'
slug: nix-workflow
---

Dev shells are a very powerful tool, and one of the big selling points of
[Nix](https://nixos.org/). A dev shell allows you to enter an environment where
you have all your development dependencies available, without altering the host
system. This means that:

- Each project is completely isolated from each other, no more dependency hell between them.
- Packages don't pollute the system dependency graph, and the packages are only "visible" within the shell.

Sharing a dev shells is easy, just check out the nixfiles into the repo and everybody will be one `nix-shell` away from getting all the requirements to build or use the project.

So in this blog post, I want to give a quick overview of how to get started from the very beginning.

# Preparations
## Install nix

To start from the very beginning, you need to install nix. You can install it on any Linux distribution and macOS too.

- Official installer: https://nixos.org/download.html
- Determinate System's installer: https://github.com/DeterminateSystems/nix-installer

The determinate installer provides a nicer user experience, but I am in my responsibility to also mention the official one.

## Install direnv

`direnv` is an external tool, that loads a development environment when you enter a directory.

```
$ cargo --version
-> cargo: command not found

$ cd Documents/autonix
$ cargo --version
cargo 1.64.0
```

It will load the nix shell automatically upon entering the directory, and keep your current prompt instead of dropping you into stock bash.

To install it, you need to install the direnv executable along with the hook extensions:


- Install the base direnv package, available in your distro (`apt install direnv`, `brew install direnv`, etc.)
- [Hook into your shell](https://direnv.net/docs/hook.html)
- Hook into your editor:
    - [Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=mkhl.direnv)
    - [Emacs](https://github.com/wbolster/emacs-direnv)


## Initialize the project

To instantiate a nix shell, there are two approaches: using a classic `shell.nix` file, or using a flake. While I would recommend a simple `shell.nix`, a simple flake boilerplate is also provided.

> [!IMPORTANT]
> If you are unsure, use a classic `shell.nix` file. The main difference for this example is that the flake will automatically pin the nixpkgs version to the `flake.lock`, which you may not need for a simple demo.


### Classic nix

```nix
# shell.nix
let
  pkgs = import <nixpkgs> {};
in
  pkgs.mkShell {
    packages = [  ];
    # ...
  }
```

### Flake

> [!CAUTION]
> If you use git, make sure to `git add` every nix file!

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


### Using `direnv`

You also need a file telling direnv how to load the nix files. Its contents will depend on if you used a classic `shell.nix` or a flake.


```bash
# .envrc

# for a shell.nix:
use nix

# for a flake.nix:
# use flake
```



# Ready, set, go!

All that is left to do is configuring the arguments of `mkShell` with the programs that you want. All you need to know about it is:

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

    # If the dependencies need system libs, you usually need pkg-config + the lib
    pkgs.pkg-config
    pkgs.openssl
  ];

  env = {
    RUST_BACKTRACE = "full";
  };
}
```

I have a blog post about using a rustup `toolchain.toml` with nix, such that you can perfectly pin your rust version with nix, while still pulling custom toolchains or targets: [Nix shells with rustup](/blog/nix-rustup).

## Python

In this example, we leverage the `withPackages` function of nixpkgs' python to add some custom packages. This is the easiest way to use python with nix, but it requires that the packages are available in nixpkgs.

```nix
pkgs.mkShell {
  packages = [
    (pkgs.python3.withPackages (python-pkgs: [
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

  env = {
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
  };
}
```

And modify your `.envrc` to use the venv created by poetry:

```bash
use nix # or use flake...

watch_file .venv
if [ -d .venv ]; then
  source .venv/bin/activate
fi
```

> [!CAUTION]
> Using `LD_LIBRARY_PATH` may lead to weird errors if the libc version of the
shell doesn't match the one of the system. For a dev shell that uses `<nixpkgs>`
it shouldn't be an issue, but otherwise I'd recommend using
[nix-ld](https://blog.thalheim.io/2022/12/31/nix-ld-a-clean-solution-for-issues-with-pre-compiled-executables-on-nixos/).

## C/C++

For C/C++, things can get more complicated, because of the nature of the language toolchain. To begin with, an empty nix shell already provides a C compiler, `make` and some other utilities:

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

To properly discover libraries, you may need a combination of the following tools. Under the hood, when they are added in `packages`, code is executed to properly configure the environment, such that it "just works".

```nix
pkgs.mkShell {
  packages = [
    pkgs.gdb

    # Choose the build tools that you need
    pkgs.cmake
    pkgs.pkg-config
    pkgs.meson
    pkgs.ninja

    # Add some libraries
    pkgs.boost
    pkgs.fmt
  ];
}
```

> [!NOTE]
> Some packages may come with different outputs. When you search in https://search.nixos.org, you will see at least `out`, and `dev` if the packages contains headers. If you add simply `pkgs.my-awesome-library` to `packages = []`, nix should figure out that you want `pkgs.my-awesome-library.dev`, but you can also type it manually.

### Hardening

Nixpkgs add some compiler flags by default as part of the hardening profile. You
can read more about it in the [manual
section](https://nixos.org/manual/nixpkgs/stable/#sec-hardening-in-nixpkgs).
Although for a dev shell, you may want to turn off all these default flags, so
you get a better debugging experience:

```nix
pkgs.mkShell {
     hardeningDisable = ["all"];
}
```

### Language server

For your editor to pick up the C/C++ libraries which rely on pkg-config or cmake, I've had success with the following stack:

- Tell cmake or meson to generate a `compile_commands.json`. For cmake, you need to add `set(CMAKE_EXPORT_COMPILE_COMMANDS ON)` to your `CMakeLists.txt` or pass `-DCMAKE_EXPORT_COMPILE_COMMANDS=1`. Meson should generate it automatically.
- Install clangd, by adding `clang-tools` to your dev shell.
- Configure your editor to use clangd. For example, for VS Code: uninstall the Microsoft C/C++ extension and install the clangd extension.
- Make sure clangd finds your `compile_commands.json`, by either:
  - Creating a symlink of the file from your build directory into your root directory (easiest). E.g. `ln -vs ./builddir/compile_commands.json ./compile_commands.json`.
  - Configure your editor extension to pass the flag `--compile-commands-dir=<directory>` to clangd. For VS Code, add `"clangd.arguments": ["--compile-commands-dir=<directory>"]` to your project's `.vscode/settings.json` .
- You may need to restart the editor for the changes to propagate.

## NodeJS

Unlike C/C++, NodeJS is quite straightforward. While most things will be handled by your editor, you might want to open a quick shell to make certain packages available to yourself. The packages below are generally universal, but certain frameworks (i.e. Svelte or NextJS) may require additional packages to be added to the shell.
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
