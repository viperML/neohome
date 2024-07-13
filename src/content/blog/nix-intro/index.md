---
title: 'Into the Nix'
pubDate: 2022-01-05T12:01:13Z
tags: ['nix']
draft: true
summary: A short introduction to what is Nix, how it works, and what it can do for you
---

In this post I want to show a very brief introduction to Nix, the language and package manager, and how it can help you to achieve a fully reproducible development environment.

## What can Nix do for me?

One of the features of Nix is that it is designed to allow for **fully reproducible** software development. Let's say you have a project, for which you want your coworkers, for yourself in the future or anybody else to be able to get the same results as you. There will be many variables that will be taken into account, such as the programs available in the host, the versions, configurations, etc; that will affect your results (for example, a built binary or a developing environment). Nix allows you not only to specify which package versions your project depends, but also the specific build which will be used. So, given the exact same inputs, Nix will produce identical results, be it in your machine, your coworkers or in a remote server.

## So what is Nix exactly?

Nix is a purely **functional** programming language, **dynamically** typed, with a syntax very similar to JSON. Currently, the main purpose of this language is not being general purpose, but rather being the main tool of the Nix package manager.

```nix
with { a = 1; b = 2; };
{
  x = a + b
};
# { x = 3; }
```

Nix is in a strange situation, where many tutorials will try to teach you the basics semantics of the language, using arithmetics operations, handling strings, etc; but the real usage of the language is to build packages, in which these snippets might not be very useful.

```nix
pkgs.stdenv.mkDerivation {
  name = "viperML-home";

  src = ./.;

  buildPhase = ''
    mkdir -p themes
    ln -s ${inputs.bookworm} themes/bookworm
    ${pkgs.hugo}/bin/hugo --minify
  '';

  installPhase = ''
    cp -r public $out
  '';

  meta = with pkgs.lib; {
    description = "My awesome webpage";
    license = licenses.cc-by-nc-sa-40;
    platforms = platforms.all;
  };
```

This snippet of nix code may be more representative of how the Nix language can be used. It defines a derivation, which is how to build a package. While you could say that this package is called `viperML-home` (see `name = `), the derivation name will be named differently if anything changes.

- `mkDerivation` is a function that creates the derivation, and takes as an argument an set of attributes, such as `{ foo = "bar"; foo2 = [ 1 2 ] }`.
- `name`, `meta` define basic information about the package.
- `buildPhase`, `installPhase` are **bash** snippets, and correspond to how Nix will build the derivation. The derivation will just be a directory in `/nix`, with path `$out`, so we can just point our installers to put the files in there, and our derivation will be built.

Now the nix **cli utilty**, will be used to call this function, and install the files into `/nix/store/<hash>-<package>-<version>`. Because two packages with the same version and name can have different build or installation methods, a hash is computed and put into the name. This way, any number of "editions" of this package can coexist in the same system. Using one or another will be just a task of using the correct path.

Now, every dependency of our package will be substituted by their exact derivation path. In the example snippet before, `${pkgs.hugo}/bin/hugo` will be substituted by `/nix/store/7jnn3g8871yqih4m61ggbjs1dif6hksa-hugo-0.91.2/bin/hugo` and this will be the same across any system that calls the expression. If the derivation for hugo changes, their hashes will be different, so my `viperML-home` will be built different, and produce a different hash in the store. So, going backwards, if we use the same inputs for our build process, Nix will make sure to produce the same exact result; and if we know a derivation, we know how it was built exactly.

> But how do we make sure that Nix gets always the same inputs to build the same results?

When calling that previous Nix expression, it was in a context with the `pkgs` variable defined. We can define this by referencing the commit of `nixpkgs`, the git repo from which we pull or packages. This can also be done with the upcoming feature, **flakes**, will will be discussed in a future post.

## How do I start using Nix?

Nix can be used in Linux, macOS or Windows via WSL2. [Link to official documentation](https://nixos.org/guides/install-nix.html).

After installing (and rebooting) your computer, you can start using Nix with:

```bash
nix-shell --packages python3
```

This pull the python package, according to the `nixpkgs` revision configured in your channels, and put it into your path

```bash
python --version
# Python 3.9.9
which python
# /nix/store/rppr9s436950i1dlzknbmz40m2xqqnxc-python3-3.9.9/bin/python
```

## Further reading

Please, also consult this posts, to learn more about Nix:

- [Alexander Bantyev - What is Nix?](https://serokell.io/blog/what-is-nix) (written)
- [Burke Libbey - Nix: What Even is it Though](https://www.youtube.com/watch?v=6iVXaqUfHi4) (video)
- [Harikrishnan R - 'Why you should never ever use NixOS': a rebuttal](https://illustris.tech/devops/why-you-should-NOT-never-ever-use-nixos/) (written)
