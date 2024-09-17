---
title: "The Nix lectures, part 2: Derivations"
pubDate: 2024-09-16T07:07:01Z
draft: true
summary: FIXME
slug: nix-tuto-2
---

This is part 2 of a tutorial series that covers all of Nix. We covered
language basics in the first part, and in this post we will cover derivations.

## builtins.derivation

This is the primitive that Nix uses to define derivations. You will probably
**never** use it, as we rely on higher-level abstractions that are built on top
of `builtins.derivation`.

> [!NOTE]
> Remember that the design of the Nix language, it is a very simple language.
> Having a small API surface means that you don't really have to update the API
> as time passes, but rather the abstractions that are built on top. This is
> useful when you want to use a current Nix binary to evaluate some nixpkgs from
> *many* years ago.

`builtins.derivation` is a function that takes an attrset with some 
**known keys**, and the rest are set as environment variables. You can check the
reference documentation in the [nix manual](https://nix.dev/manual/nix/stable/language/derivations).
A simple invocation might look like this:

```nix file: "derivation.nix"
#=> «derivation /nix/store/n34150nf03sh04j8mjzm8sawdqx9sgqi-sample.drv»
```

Derivations can be built in the repl with `:b`, or with the command `nix build
-f derivation.nix`.

Nix will tell use that the return type is a "derivation". However, from chapter
1, I didn't mention that this type exists. What is happening here is that
derivations are implemented as **attrsets** with a special field called `type`.

```nix
{ type = "derivation";  }
#=> «derivation»
```



> [!IMPORTANT]
> **Derivations are attrsets**. We can access fields from derivations, like
> `pkgs.hello.overrideAttrs`. And we can also do **string interpolation**
> because they have an `outPath` field.

Remember, that we can interpolate an attrset if it has an `outPath` field
(string) or a `__toString` field (function).

```nix
pkgs.hello
#=> «derivation /nix/store/crmj28zg09517n5sskml9fmy2c6r3rsr-hello-2.12.1.drv»

pkgs.hello.outPath
#=> "/nix/store/yb84nwgvixzi9sx9nxssq581pc0cc8p3-hello-2.12.1"

"here is ${pkgs.hello}"
#=> "here is /nix/store/yb84nwgvixzi9sx9nxssq581pc0cc8p3-hello-2.12.1"
```

> [!IMPORTANT]
> One one of the key features of Nix is that it has a notion of a *context* for
> a value.
>
> In the previous example, the string has a context because we string
> interpolated a derivation into it. The context of the strings means that it
> depends *at build time* in `pkgs.hello`

```nix file: "two-derivations.nix"
#=> «derivation /nix/store/cbk704h7sffj57hmrp5fm2cs6xpy15nq-second.drv»
```

```console
$ nix build -f ./two-derivations.nix --dry-run
these 2 derivations will be built:
  /nix/store/fasbn3837frywijgjnj33qr51018pyn3-first.drv
  /nix/store/cbk704h7sffj57hmrp5fm2cs6xpy15nq-second.drv
```

This example shows that string interpolation can be used to refer to other
derivation programmatically, and that Nix tracks the references automatically.

### Fixed-output derivations

To be useful, we need Nix to download source code from the internet. As any sane
build system, Nix also implements a *sandbox* that is used during builds. This
sandbox only allows access to:

- `/bin/sh` -- to be able to bootstrap everything.
- `/nix/store` -- deliberate use of other programs in the store 
  is not concerning because of the cryptographic hashes.
- "Private" versions of `/proc`, `/dev`, etc.
- Private PID, mount, etc. namespaces.
- **No internet access**

So, how do we handle downloading the source tarballs of projects? In the Nix
"purity" model, we find the concept of a fixed-output derivation, or FOD for
short.

A FOD disables the internet sandbox. However, the user must provide a hash of
the resulting output. If another user tries to build the same FOD, and the hash
is correct, it means the network connection produced the same resulting
derivation.

However, if the resulting derivation doesn't match the provided hash, Nix will
error out. With this system, we allow some "impurity", at the expense of having
to know what the output is. In contrast, for a regular derivation, we don't know
ahead of time the output hash. But we assume, that for the same inputs, the
derivation will produce the same outputs, thanks to the build sandbox. This is
why Nix uses an "input-addressed" model.

99% of the time, you will be using the fetchers from nixpkgs, with
`pkgs.fetchFromGitHub`, etc. But just for the reader to know, that this is
built-in to the language itself, with the `outputHash*` options:

```nix file: "fixed-output.nix"

# $ nix build -f ./fixed-output.nix
# warning: found empty hash, assuming 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
# error: hash mismatch in fixed-output derivation '/nix/store/9simizzhrmsq5nnannh8gvgxqm465nwb-fixed-output.drv':
#          specified: sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
#             got:    sha256-3FWguG761jOvjXDVGi2BkN+hLCUurMCBzeF4m0AEr4A=
```


## stdenv

The standard environment (stdenv for short) is a collection of packages and
build utilities provided by the [nixpkgs](https://github.com/NixOS/nixpkgs)
repository. You can find reference documentation about the stdenv in the
[nixpkgs manual](https://nixos.org/manual/nixpkgs/stable/#part-stdenv).

We can access the stdenv from a `pkgs` instance. Pkgs is **by convention** the
result of calling `import /path/to/nixpkgs {}` (importing nixpkgs and evaluating
with some configuration). Pkgs is a huge attrset that contains all of the
packages, as package name - package value pairs. One of the keys is stdenv.


```nix
let
  # <nixpkgs> is set-up by a regular nix installation
  pkgs = import <nixpkgs> {};
in
  pkgs.stdenv
#=> «derivation /nix/store/sbxnap725qcfsjgp21vjd1h6qpgi6gwj-stdenv-linux.drv»
```

In this section, I don't want to cover stdenv thoughtfully, but rather give you
the topics you will need for a "non-hacker" use. Please refer to the nixpkgs
manual if you want an alternative explanation on these topics.


### mkDerivation basics

`stdenv.mkDerivation` is a function that takes an attrset and returns a
derivation. The arguments of `mkDerivation`, as with `builtins.derivation` are
exported as environment variables. The stdenv builder, a bash script, interprets
the environment variables to build your package.

> [!CAUTION]
> `mkDerivation` doesn't check if the name of the arguments are correct. It will
> silently ignore typos.

An `mkDerivation` call will contain the following:

- `name` or `pname` + `version` of the package. The latter is preferred.
- `src` can be another derivation or a local path.
- Dependencies: packages that our package depends on, at run-time or build-time.
- Phases: pieces of **bash** code.
- Any other environment variable that is used by the builder

`mkDerivation` heavily relies on bash code, and environment variables. As all
the attributes of the argument will be mapped into environment variables, we use
Nix as a "fancy bash writer".

To begin with, `name` is something that is passed-through to
`builtins.derivation`. You can choose to split it with `pname` and `version`,
which is very convenient -- `pname` stands for *package name*.

As mentioned, `src` will be mapped into the environment variable `$src`. The
bash builder has a phase that takes `$src` and tries to unpack it into the work
directory. We can use anything that makes sense where a path does, such as
another derivation. Note that you don't need to manually force the string
interpolation `src = "${myPkg}";`, this is done for you in the `mkDerivation`
implementation.


#### Phases

The `mkDerivation` builder reads different phases, that are either the default
ones, or exported as environment variables, by setting them as attributes to the
call.

The phases are documented in the [nixpkgs manual](https://nixos.org/manual/nixpkgs/stable/#sec-stdenv-phases)
and are the following:

- `unpackPhase` unpacks whatever you put in `src`
- `patchPhase` applies the patches you give with `patches = [ ./my.patch ]`
- `configurePhase` runs `./configure` for autotools-based packages.
- ⭐ `buildPhase` builds the package
- `checkPhase` runs tests
- ⭐ `installPhase` moves files into `$out`
- `fixupPhase` Nix-specific sanity checks, like setting proper store paths
- `installCheckPhase` runs tests that check if the package is installed properly
- `distPhase` -- I have never seen this one in use

> [!IMPORTANT]
> All the phases are implemented in bash. And **not POSIX sh** for the matter, it
> is explicitly bash (if you use the bash extensions).

You can choose to overwrite the default phases. The default implementation of
the phases also run **hooks before and after**, to not have to completely modify
the phase.

```nix
let
  pkgs = import <nixpkgs> {};
in
  pkgs.stdenv.mkDerivation {
    # ...
    patches = [
      ./my.patch        
    ];

    postPatch = '' 
      # this runs after the standard patchPhase, which applies `patches`
    '';

    buildPhase = '' 
      # completely change the build phase
    '';

    postBuild = '' 
      # this won't run
      # if you want, you can add `runHook preBuild` and `runHook postBuild`
      # to your custom buildPhase
    '';
  }
```
