---
title: 'Cross build environment with nix'
date: 2023-11-16T17:35:49Z
tags: ['nix']
draft: false
summary: Adapting a devshell workflow for cross-compilation and compiler optimization.
slug: nix-cross
---


In a previous blog post: [nix-worflow]({{< ref "/blog/nix-dev" >}}), I discussed
about using `mkShell` to configure a development environment which can be accessed with `nix develop` or `nix shell`. As I didn't want to overextend the post, I decided to write a follow-up post about how to adapt this workflow for cross-compilation.

As C is the language used to bootstrap everything, most tools in nixpkgs have the best integration for working with C. While it is possible to use nix to cross-compile other programming languages, your mileage may vary.

# Cross-build basics

When we do a "regular" build, the compiled program runs on the same "system" than the machine that compiled it.


|                  | system (runs on) |
| ---------------- | ---------------- |
| compiler         | x86_64-linux     |
| compiled program | x86_64-linux     |

While for the regular case, the systems match, for cross-compilations these 2 systems are different. For example, using my desktop PC to build a program for my Arduino. My CPU doesn't use the same instruction set as the arduino, and the compiled program wouldn't even be able to interact with the hardware, yet the compiler, which is a regular x86_64 binary, can produce that output.

When dealing with cross-compilation, we will always have to deal with this tuple. The buzzwords are:

- **Build system/platform**, **nativeBuildInputs**, **buildPackages** : refer to the machine that builds the program.
- **Target system/platform**, **buildInputs**, **targetPackages** : refer to the machine in which the program will run.

Note that the compiler must be able to produce compiled programs of the target system. There are other tools too, like `gdb` or `qemu`, that are also configured for some target system.

# Native build through emulation

To begin with, I want to talk about using NixOS's [`binfmt`](https://docs.kernel.org/admin-guide/binfmt-misc.html) module, that allows you to run binaries of other systems through qemu. In this model, the systems table doesn't have a difference between the build and target system, but the build tools are emulated:

|                  | system (runs on) |
| ---------------- | ---------------- |
| build         | aarch64-linux (emulated, in x86_64-linux)     |
| target | aarch64-linux     |

To configure this, you need to be in NixOS, and add the following to your `configuration.nix`, rebuild and reboot:

```nix
{
  boot.binfmt.emulatedSystems = [
    "aarch64-linux"
    # ....
  ];
}
```

After enabling support for a certain system, all you need to do is change your shell's pkgs to match the target system:

```nix
let
  pkgs = import <nixpkgs> {
    system = "aarch64-linux";
  };
in
  mkShell {}
```

```
$ nix develop -f ./shell.nix

$ $CC main.c
$ ./a.out
Hello world
$ file a.out
a.out: ELF 64-bit LSB executable, ARM aarch64, version 1 (SYSV), dynamically linked, interpreter /nix/store/c0hkzndf6i162jymxmlirn9l6ypv7p3c-glibc-2.38-23/lib/ld-linux-aarch64.so.1, for GNU/Linux 3.10.0, not stripped
$ /run/current-system/sw/bin/uname -m
x86_64
```

Thanks to nix's store model, this devshell is no different from any other native shell. The GCC that is being ran is a regular GCC that would be installed in a `aarch64` system, but automatically redirected to qemu.

As a result, the configuration for this environment is as simple as possible: because there is no configuration to do. However, as you may have guessed, running everything through `qemu` does take a performance hit. For example, for a trivial hello world program, it is already noticeable:

```
(native x86_64) $ time $CC main.c
real    0m0,054s
user    0m0,036s
sys     0m0,018s

(aarch64-linux emulated) $ time $CC main.c
real    0m1,004s
user    0m0,939s
sys     0m0,047s
```

# First peek at pkgsCross

While the internal implementation of cross-compilation in nixpkgs can be quite complex, the first API that
is presented to the user is very simple: `pkgsCross`.

To begin with, you can open a repl and inspect that `pkgsCross` is an attribute set of different pre-made cross-compilation targets:

```
$ nix repl -f "<nixpkgs>"
Welcome to Nix 2.17.1. Type :? for help.

Loading installable ''...
Added 19546 variables.
nix-repl> pkgsCross.
pkgsCross.aarch64-android             pkgsCross.loongarch64-linux           pkgsCross.ppc64-musl
pkgsCross.aarch64-android-prebuilt    pkgsCross.m68k                        pkgsCross.ppcle-embedded
pkgsCross.aarch64-darwin              pkgsCross.mingw32                     pkgsCross.raspberryPi
pkgsCross.aarch64-embedded            pkgsCross.mingwW64                    pkgsCross.remarkable1
....
```

Every `pkgsCross` member forms a new "namespace", where you can find all the same packages as in `pkgs`. For example, the following command:

```
$ nix build nixpkgs#legacyPackages.x86_64-linux.pkgsCross.aarch64-multiplatform.hello

$ file result/bin/hello
result/bin/hello: ELF 64-bit LSB executable, ARM aarch64, version 1 (SYSV), dynamically linked, interpreter /nix/store/5gdh4mp8rwliq4s33gwcpwzqvsb2xpzr-glibc-aarch64-unknown-linux-gnu-2.38-23/lib/ld-linux-aarch64.so.1, for GNU/Linux 3.10.0, not stripped

$ uname -m
x86_64
```

Will cross-compile `hello`, using `x86_64-linux` as the build platform and `pkgsCross.aarch64-multiplatform` as the target platform.


# Devshell with pkgsCross

When we start to write devshells with `pkgsCross`, it is important to be mindful of what each package architecture is.
For example, let's start with the skeleton:

```nix
let
  pkgs' = (import <nixpkgs> {}).pkgsCross.aarch64-multiplatform;
in
  pkgs'.mkShell {
    # ...
  }
```

This devShell already gives a C compiler capable of cross-compilation:

```
$ $CC main.c
$ uname -m
x86_64
$ /nix/store/pwwdk9p5a8ivh2034575lg0qz457j5zl-qemu-8.1.2/bin/qemu-aarch64 ./a.out
Hello world
```

# Dependencies

Let's say that we want to add some dependencies to the previous C shell. For the sake of argument, let's use these packages as examples of 3 archetypes of packages that you might need:


- **libunistring**, C library for handling Unicode strings. It needs to run on the target system.
- **hugo**: a static site generator. It only needs to run on the build system.
- **gdb**: the GNU debugger. It runs on the build system, but may need special handling for the target system.


If we used `pkgsCross.aarch64-multiplatform.hugo`, nix would try to cross-compile `hugo` to aarch64, while what we want is to use a `hugo` that runs on the native system. To do this, we can use the attribute `.buildPackages` that refer to packages that are aware of the cross-compilation environment, but run on the build system.

Let's check the output derivations of the packages under `pkgsCross`:

```
nix-repl> pkgs.hugo
«derivation /nix/store/ap1w4ywafzbc938wmsg4i5zxvcf126fm-hugo-0.119.0.drv»

nix-repl> pkgsCross.aarch64-multiplatform.hugo
«derivation /nix/store/blvkkzp1kn9z3ms80m36s38ic8jdynkj-hugo-aarch64-unknown-linux-gnu-0.119.0.drv»

nix-repl> pkgsCross.aarch64-multiplatform.buildPackages.hugo
«derivation /nix/store/ap1w4ywafzbc938wmsg4i5zxvcf126fm-hugo-0.119.0.drv»
```

As you can see by the derivation names, `pkgsCross.aarch64-multiplatform.hugo` is a program that would run on aarch64, while `pkgsCross.aarch64-multiplatform.buildPackages.hugo` is the same as `pkgs.hugo`. If we do the same for `gdb`:

```
nix-repl> pkgs.gdb
«derivation /nix/store/wx3jjz3x6g75cvh4c3x10493vm6nh2ll-gdb-13.2.drv»

nix-repl> pkgsCross.aarch64-multiplatform.gdb
«derivation /nix/store/z6wp7mpcpimvvzys9ymi5hdaccw96h1q-gdb-aarch64-unknown-linux-gnu-13.2.drv»

nix-repl> pkgsCross.aarch64-multiplatform.buildPackages.gdb
«derivation /nix/store/b6hib7xvvxianms3n8m771wbnl36fhcj-aarch64-unknown-linux-gnu-gdb-13.2.drv»
```

For `gdb` specifically, `.buildPackages.gdb` doesn't match the regular native package, as some extra configuration is needed such that it can handle the cross-compilation environment.

With this in mind, both `stdenv.mkDerivation` and `mkShell` also require that we pass the proper packages to either `nativeBuildInputs` (`.buildPackages`) or `buildInputs` (regular packages from `pkgsCross`). Our devshell example would look like the following snippet:

```nix
let
  pkgs' = (import <nixpkgs> {}).pkgsCross.aarch64-multiplatform;
in
  mkShell {
    nativeBuildInputs = with pkgs'.buildPackages; [
      hugo
      gdb
    ];

    buildInputs = with pkgs'; [
      libunistring
    ];
  }
```

```
$ cat main.c
#include <stdio.h>
#include <unitypes.h>
#include <unistr.h>

int main() {
  uint8_t* s = "你好";
  size_t chars = u8_mbsnlen(s, u8_strlen(s));
  printf("chars: %ld\n", chars);
  return 0;
}

$ $CC main.c -lunistring

$ file a.out && ./a.out # can be ran by using binfmt, from previous section
a.out: ELF 64-bit LSB executable, ARM aarch64, version 1 (SYSV), dynamically linked, interpreter /nix/store/5gdh4mp8rwliq4s33gwcpwzqvsb2xpzr-glibc-aarch64-unknown-linux-gnu-2.38-23/lib/ld-linux-aarch64.so.1, for GNU/Linux 3.10.0, not stripped
chars: 2

$ file $(which hugo) && hugo --help
/nix/store/bqvpv11zy7s86h0f615gggr78lj6myfc-hugo-0.119.0/bin/hugo: ELF 64-bit LSB executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /nix/store/gqghjch4p1s69sv4mcjksb2kb65rwqjy-glibc-2.38-23/lib/ld-linux-x86-64.so.2, for GNU/Linux 3.10.0, Go BuildID=U2MsJNBLnN90asF7hk0m/o4zhfvuex7zxZR5c2h23/CH141wsnGF-0hRILw151/jZw7oRnJtuDUl4wJoo1v, stripped
hugo is the main command, used to build your Hugo site.
```


# Automatic selection with callPackage

As a quick note, it is possible to use `callPackage` to automatically pass the correct set of packages to `mkShell`. While we can `callPackage` a function in the same file, let's split the shell into two files:

- The shell entry point, called `shell.nix`. This file only instantiates nixpkgs and `callPackage`s the actual shell. This could also be replaced by a `flake.nix`:

```nix
# shell.nix
let
  pkgs = import <nixpkgs> {};
  pkgs' = pkgs.pkgsCross.aarch64-multiplatform;
in
  pkgs'.callPackage ./myshell.nix {}
```

```nix
{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs = {self, nixpkgs}: let
    system = "x86_64-linux";
    pkgs = nixpkgs.legacyPackages.${system};
    pkgs' = pkgs.pkgsCross.aarch64-multiplatform;
  in {
    devShells.${system}.default = pkgs'.callPackage ./myshell.nix {};
  };
}
```

- The actual shell function, with any name you want (in this case, `myshell.nix`):

```nix
{
  mkShell,
  libunistring,
  hugo,
  gdb,
}:
  mkShell {
    nativeBuildInputs = [
      hugo
      gdb
    ];

    buildInputs =  [
      libunistring
    ];
  }
```


Remember that to use `callPackage`, you need to properly split your dependencies between `nativeBuildInputs` and `buildInputs`.

# Beyond pkgsCross

All the elements under `pkgsCross` are just pre-made configurations of the nixpkgs cross-building mechanism, which you can inspect in [lib/systems/examples.nix](https://github.com/NixOS/nixpkgs/blob/master/lib/systems/examples.nix). The header comment also mentions a clue about how this is handled internally:

```
# These can be passed to nixpkgs as either the `localSystem` or `crossSystem`.
```

If we follow the import chain from `<nixpkgs>/default.nix`, we end up at [pkgs/top-level/impure.nix](https://github.com/NixOS/nixpkgs/blob/master/pkgs/top-level/impure.nix), where we can see where `localSystem` and `crossSystem` are used:

```nix
{ localSystem ? { system = args.system or builtins.currentSystem; }
, system ? localSystem.system
, crossSystem ? localSystem
# ...
}
```

In the non-cross nix world, you may have encountered the 2-tuple string that `builtins.currentSystem` returns, for example `x86_64-linux`, `aarch64-darwin`, etc.
While these are valid arguments to the system inputs in nixpkgs, it is also possible to pass an attribute set containing more information.

As we find in `systems/examples.nix`, `pkgsCross.aarch64-multiplatform` can be instantiated with the following arguments:

```nix
let
  pkgs' = import <nixpkgs> {
    localSystem = "x86_64-linux";
    crossSystem = {
      config = "aarch64-unknown-linux-gnu";
    };
    # or: crossSystem = lib.systems.examples.aarch64-multiplatform;
  };
in
  pkgs'.callPackage ./myshell.nix {}
```

This allows us to configure the cross-compilation environment in a more fine-grained way. For example, instead of using the 4-tuple system that uses the gnu libc, we can change it to `aarch64-unknown-linux-musl`.
