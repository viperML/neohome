---
title: Why you don't need flake-utils
pubDate: 2023-05-15T16:44:12Z
tags: ['nix']
draft: false
summary: Writing by hand the abstraction may be less error-prone than using this popular abstaction library.
slug: no-flake-utils
---

The usage of nix flakes is increasing, and individuals are increasingly relying on a library called "flake-utils" to enhance flakes' usability. However, this can often lead to unintended consequences if one lacks understanding of the underlying processes. In this post, I aim to clarify the functionality of "flake-utils," provide a manual approach, and explore alternative options.

## Flake output schema

To begin with, I want to lightly explain what the flake output schema is. When we write a flake, we are told that it has 2 sections:

```nix
{
  inputs = {
    # Stuff we don't care about today
  };

  outputs = function;
}
```

This output function must return an attribute set. At first glance, this attrset can be free-form:
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

`system` refers to a string, which corresponds to the **runtime system** of the package. This means, that if we are on a `x86_64-linux` [^2] system, `nix build` will automatically pick the `packages.x86_64-linux.<name>` output if we just use `<name>` (and so on for shell, develop, run...).

So in general, we want to conform to this output schema of packages and dev shells.


## Outputs for multiple systems

Let's say that you are writing a flake that outputs some package. This should be available in multiple systems that you want to support. For example, you want to be able to build it in your aarch64 and x86_64 machines. To do so, we can factor out the package definition into a `package.nix`, which we can call:

```nix
{
  inputs = ...;
  outputs = {nixpkgs, ...}: {

    packages.x86_64-linux.default = nixpkgs.legacyPackages.x86_64-linux.callPackage ./package.nix {
      some-special-arg = ...;
    };
    packages.aarch64-linux.default = nixpkgs.legacyPackages.aarch64-linux.callPackage ./package.nix {
      some-special-arg = ...;
    };

  };
}
```

This can get quite verbose very quickly, as we have to enumerate every system and write the same definition for each one.
Another problem is that we are repeating the arguments to `callPackage`, so if we need to change it, we must do it for every system, risking making some mistake in the process. And if we need to use some overlay, we need to `import nixpkgs` for each system.

So [`flake-utils`](https://github.com/numtide/flake-utils) was written as a solution to this. It contains a collection of functions that help us collect the common pieces of code into a single block, and apply it to every system. The main one is `eachSystem`, to which we pass a **generic function over system**, and it will take care of generating the outputs for us:

```nix
{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    # ...
  };

  outputs = {nixpkgs, flake-utils, ...}: flake-utils.lib.eachSystem ["x86_64-linux" "aarch64-linux"] (system: {

    packages.default = nixpkgs.legacyPackages.${system}.callPackage = ./package.nix {
      some-special-arg = ...;
    };

  });
}
```

{{< alert >}}
The same result is produced by the two last snippets!
{{</ alert >}}

This function is very convenient, because now `system` is handled for us, improving the "signal/noise ratio" of our flake, and preventing us from making mistakes when dealing with multiple systems.

## When things go wrong

The main problem with flake-utils is that it doesn't check if what we want to do makes sense. It just takes your input, and puts the system string in the middle. So to illustrate this, these are some common errors with flake-utils:

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
    packages.${system}.default = nixpkgs.legacyPackages.${system}.callPackage = ./pacakge.nix {
      some-special-arg = ...;
    };

  });
}
```

In the first case, `nixosConfigurations` and `overlays` are not outputs that needs a `.<system>.`, so using it inside flake-utils produces `nixosConfigurations.<system>.nixos` and `overlays.<system>.default` which is totally wrong. Instead, we have to factor them out of `flake-utils.lib.eachSystem`, and merge them (with the `//` operator, for example).

In the second case, we are introducing manually another system, which ends up as `packages.<system>.<system>.default`, which is also wrong.

## Do we really need flake-utils?

So going back to our original problem: we want to parametrize over `system`, which will be a list of known strings. We also want to prevent applying this to unrelated outputs, like `nixosConfigurations` or `overlays`. And it would be nice if it doesn't depend on any other flake [^3], while we are at it. Turns out this is very easy to write!

```nix
{{% include "forall-flake.nix" %}}
```

What we are doing with `forAllSystems` (feel free to use any name), is essentially the same that flake-utils does, but applied to a single output. We can still run into the problems of using `<system>.<system>`, but at least we completely bypass the other problems. And it can be written in a single line of code which you can copy-paste!

If you need to use some overlays or nixpkgs configuration, you can tweak it like so:

```nix
{{% include "forall-flake2.nix" %}}
```

## Conclusion

If you made it this far, congratulations. Now feel free to keep using flake-utils, but now knowing how things can go wrong. On a personal note, I would recommend either using flake-parts, or not using any framework; depending on the kind of flake you are writing.


### Option A: Flake just for yourself

Keep in mind the shortcomings of flake-utils and my `forAllSystems` solutions. But if you want to handle flake outputs more cleanly, allow me to introduce you to [flake-parts](https://github.com/hercules-ci/flake-parts). It uses the NixOS module system (which is awesome), to express the flake outputs as configuration. And it actually type-checks if what you want to output makes sense, removing the two problems from flake-utils all-together. If you want to start a new flake now, I'd greatly recommend it. A quick example could be:

```nix
{
  # ...
  inputs.flake-parts.url = "github:hercules-ci/flake-parts";

  outputs = inputs@{nixpkgs, flake-parts, ...}: flake-parts.lib.mkFlake {inherit inputs;} {
    systems = [
      "x86_64-linux"
      "aarch64-linux"
    ];

    perSystem = {pkgs, system, ...}: {
      packages.default = pkgs.callPackage ./package.nix {};

#    ↓ flake-parts will reject this, hooray!
      nixosConfigurations.nixos = ...;
    };
  };
}
```

### Option B: Flake for others to use

If you are writing a flake for other people to use, try using the `forAllSystems` approach. Doing so, your flake won't pull more dependencies, and you will keep the `flake.lock` of your consumers clean of a million-copies of flake-utils.


[^1]: At the time of writing, there is no formal specification
[^2]: To inspect your current system: `nix eval --raw --impure --expr "builtins.currentSystem"`
[^3]: Aside from `nixpkgs`, from which we cannot escape
