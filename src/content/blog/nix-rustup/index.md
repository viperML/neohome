---
title: 'Nix shell with rustup'
pubDate: 2023-03-03T11:54:31Z
tags: ['nix']
draft: false
summary: Call a toolchain.toml from nix, for better interoperability with non-nix developers
---

In this quick blog post I want to show how you can set up a rustup toolchain with nix. Instead of using the rustup CLI app, we will be fetching the toolchains directly with nix.

Why do we want to do this, instead of just adding `rustup` to our `environment.systemPackages` or to a shell? `rustup` is a program that will fetch the toolchain from the internet, and as you may already know, fetching binaries from the internet is bound to fail at some point in NixOS.

Another nicety that we get, is that we can use nix flake's locking system, so that everybody that develops the projects (and CI too!) will get the same toolchain version.

## `rust-toolchain`

The [`rust-toolchain` or
`toolchain.toml`](https://rust-lang.github.io/rustup/overrides.html#the-toolchain-file)
is a file used by rustup that declares what channel to use, which components,
targets, etc. This file lives in the root of the repo. Oxalica's rust-overlay
then would read this file, and produce the required nix derivation according to
the requirements.

So instead of running rustup, we just point the overlay to rustup's config file. Nice and easy.

An example of this file:
```toml
# toolchain.toml
[toolchain]
channel = "nightly"
components = [ "rustfmt", "rust-src" ]
profile = "minimal"
```

## Classic nix

This approach uses nix channels and fetchTarball, to get whatever overlay version is the latest. We don't lock the overlay version, and it is as simple as it can get.

To use the shell, just run `nix-shell`

```nix file: "shell.nix"
# shell.nix
```



## Flakes

By using a flake, we are able to lock the version of the rust overlay, so we always get the same version of the toolchain, for a given `flake.lock`. This is incredibly useful to avoid "it works on my machine", by having every developer and CI use the same toolchain version, according to the specification of the rustup config.

To enter the shell, just run `nix develop`

```nix file: "flk.nix"
# flake.nix
```


## rust-analyzer

For rust-analyzer to work properly, you will need to set up the environment variable `RUST_SRC_PATH`, which must point to a subdirectory of our toolchain. To do so, just modify your `mkShell` definition (flakes or not) such as:

```nix file: "shell2.nix"
# shell.nix
```

Finally, make sure you include the `rust-src` component in your rustup toolchain definition:

```toml
# toolchain.toml
[toolchain]
components = [
  "rust-src"
  # ...
]
```
