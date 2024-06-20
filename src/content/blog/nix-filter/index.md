---
title: Filtering flake's self
pubDate: 2022-12-29T20:24:27Z
tags: ['nix']
draft: false
summary: Quick tutorial about filtering a flake's self attribute, to avoid unnecessary recompilation.
---

This a quick tutorial about filtering a flake's `self` set to avoid unnecessary recompilation.

## Why do we need to filter a source tree?

When we build derivations with nix, it automatically calculates a *hash* out of the derivations's inputs. When we have a flake that outputs a package, one of these inputs is the files themselves contained in the flake. Therefore, *any change to the flake's source tree*, will have nix recompute the hash of that input, which will be different.

But there are changes that shouldn't influence these input hashes. For example adding a comment to your `flake.nix`. For this reason, we will filter out everything that is not needed for a package build, so we trigger recompilations only when needed. On a first approach, we can filter out nix files, but for language spcecific projects, we could narrow it down.

## How does an unfiltered flake look like?

In your conventional flake that outputs some package, you will have a layout that can be reduced to something like the following:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-21.11";
  };

  outputs = {self, nixpkgs}: {
    packages.x86_64-linux.default = nixpkgs.legacyPackages.x86_64-linux.stdenv.mkDerivation {

      src = self;
      # or another variant:
      # src = ./.;

      # ...
    };
  };
}
```

By default, whether we use `self` (which resolves to `self.outPath`) or `./.`, we will be including our `flake.nix`, `flake.lock` or any other "nixfiles" in our `src`.

## Introducing numtide/nix-filter

To perform a source filter, there are several solutions, including built-in functions. But in this post I propose [numtide's nix-filter](https://github.com/numtide/nix-filter). It is a solution which is very convenient to use and provides some utility functions.

To use nix-filter in out previous flake, we can pull their flake and use `nix-filter.lib`:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-21.11";
    nix-filter.url = "github:numtide/nix-filter";
  };

  outputs = {self, nixpkgs, nix-filter}: {
    packages.x86_64-linux.default = nixpkgs.legacyPackages.x86_64-linux.stdenv.mkDerivation {

      src = nix-filter.lib {
        root = self;
        exclude = [
          (nix-filter.lib.matchExt "nix")
          "flake.lock"
        ];
      };

      # ...
    };
  };
}
```
