---
title: Why you don't need flake-utils
date: 2023-05-15T16:44:12Z
tags: ['nix']
draft: true
summary: This is a rant about why you don't need flake-utils, and its pitfalls
---

## Flake output schema

To begin with, I want to lightly explain what the flake output schema is.

When we write a flake, we are told that it has 2 sections:

```nix
{
  inputs = {
    # Stuff we don't care about today
  };

  outputs = function;
}
```

This function then, must return an attribute set. At first glance, this attrset can be freeform:
```nix
{
#                 ↓ deconstructed function args
  outputs = inputs@{self, nixpkgs, ...}: {

    # To test it:
    # nix eval .#foo
    foo = "bar";

  };
}
```

But only some flake outputs are recognized by `nix shell|develop|build|run`.
These "blessed" outputs make up the "flake schema" [^1] :

- `packages.<system>.<name>`
- `apps.<system>.<name>`
- `devShells.<system>.<name>`
- *etc*

`system` refers to a string, which corresponds to the **runtime system** of the package. This means, that if we are on a `x86_64-linux` [^2] system, `nix build` will automatically pick the `packages.x86_64-linux.<name>` output if we use just `<name>` (and so on for shell, develop, run...).


## Outputs for multiple systems

Let's say that you are writing a flake that outputs some `package`. This should be available in multiple systems that you want to support. The easiest solution would be to use `callPackage` into an external file, so we can factor out some code, the same way we organize packages in `nixpkgs`:

```nix
{
  inputs = ...;
  outputs = {nixpkgs, ...}: {

    packages."x86_64-linux".default = nixpkgs.legacyPackages."x86_64-linux".callPackage ./package.nix {
      some-special-arg = ...;
    };
    packages."aarch64-linux".default = nixpkgs.legacyPackages."aarch64-linux".callPackage ./package.nix {
      some-special-arg = ...;
    };

  };
}
```

There is no need to say that this can get quite verbose very quickly. Another problem is that we are repeating the the arguments to `callPackage`, so if we need to change it, we must do it **for every system**. And if we need to use some overlay, we have to apply it for every system too.

So the solution to this, that many people take is using [`flake-utils`](https://github.com/numtide/flake-utils). Flake-utils contains a collections of functions that help us overcome this problem. In a nutshell, we can pass a **generic function over system**, at it will take care of generating the outputs for us.

```nix
{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    # ...
  };

  outputs = {nixpkgs, flake-utils, ...}: flake-utils.lib.eachSystem ["x86_64-linux" "aarch64-linux"] (system: {

    packages.default = nixpkgs.legacyPackages."${system}".callPackage = ./pacakge.nix {
      some-special-arg = ...;
    };

  });
}
```

I want you to take a minute, and understand that the two previous snippets produce the same result!
This function is very convenient, because now `system` is handled for us, improving the "signal/noise ratio" of our flake, and preventing us from making mistakes when dealing with multiple systems.

## When things go wrong

The main problem with flake-utils is that it doesn't check if what we want to do makes sense. It just takes your input, and puts the system string in the middle. So to illustrate this, this is a common error with flake-utils:

```nix
{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    # ...
  };

  outputs = {nixpkgs, flake-utils, ...}: flake-utils.lib.eachSystem ["x86_64-linux" "aarch64-linux"] (system: {

#   ↓ this is wrong
    nixosConfigurations.nixos = nixpkgs.lib.nixosSystem {};
    overlays.default = final: prev: {};

#   ↓ this is wrong
    packages.${system}.default = nixpkgs.legacyPackages."${system}".callPackage = ./pacakge.nix {
      some-special-arg = ...;
    };

  });
}
```

In the first case, `nixosConfigurations` and `overlays` are not outputs that needs a `.<system>.`, so using it inside flake-utils produces `nixosConfigurations.<system>.nixos` and `overlays.<system>.default` which is totally wrong. Instead, we have to factor them out of `flake-utils.lib.eachSystem`, and merge them (with the `//` operator, for example).

In the second case, we are introducing manually another system, which ends up as `packages.<system>.<system>.default`, which is also wrong.

## Do we really need flake-utils?




[^1]: At the time of writing, there is no formal specification
[^2]: You can inspect your current system with: `nix eval --raw --impure --expr "builtins.currentSystem"`
