---
title: "Don't use import"
date: 2024-02-04T13:48:09Z
tags: ['nix']
draft: false
summary: "When writing nix, use the module system."
slug: dont-use-import
---

When you start with Nix, the language seems scary at first. But then you get the hang of it. Your nixfiles start
getting bigger and bigger, with more complex expressions inside them.

Then, you question yourself: how do I break this file in multiple small files?

The answer may be simple at first: `import` .

## How import is used

Reading the nix manual, what import does is to load, parse, and return the Nix expression in the path. Its usage is very simple:

```nix
# foo.nix
{{% include "foo.nix" %}}# bar.nix
{{% include "bar.nix" %}}$ nix eval -f ./foo.nix
42
```

Now, back to your NixOS or home-manager config that you want to split, you may be tempted to approach the problem with just `import`, for example for configuring sway:

```nix
# home.nix
{config, pkgs, ...}: {
  wayland.windowManager.sway = {
    enable = true;
    config = import ./sway-config.nix;
  };
}

# sway-config.nix
{
  gaps.inner = 10;
  modifier = "Mod4";
}
```

## When problems arise

In the previous example, you may need to grab something from `config` or `pkgs`. The first solution you can think about, is converting the config file into a function, and evaluating it from the calling file.

Remember that `import foo {}` is the equivalent to `(import foo) {} -> lambda {}`, that is, loading a function and then evaluating it with the given arguments.

```nix
# home.nix
{config, pkgs, ...}: {
  wayland.windowManager.sway = {
    enable = true;
    config = import ./sway-config.nix { inherit config pkgs; };
  };
}

# sway-config.nix
{config, pkgs, ...}: {
  gaps.inner = 10;
  gaps.outer = config.wayland.windowManager.sway.config.gaps.inner;
  modifier = "Mod4";
}
```

At first glance, this seems to work. But what if we want to enable something else within `sway-config.nix` ? Or what if we want to pass more arguments? (You need to update both the function call site and definition).

## Just use the module system

This is one of the problems that the module system solves: stitching together multiple nixfiles, through the fixed-point combinator magic. Instead of calling `import` every time you need to "abstract away" some part of your nix repo, just create a new top-level module definition, and add it to the `imports` configuration.

Note that the naming is similar:
- `import` is a built-in function of the language itself.
- `imports` is a construct from the module system (standard library), implemented in terms of other functions.

The previous example can be rewritten as:

```nix
# home.nix
{config, pkgs, ...}: {
  imports = [ ./sway-config.nix ];
  wayland.windowManager.sway = {
    enable = true;
  };
}

# sway-config.nix
{config, pkgs, ...}: {
  wayland.windowManager.sway.config = {
    gaps.inner = 10;
    gaps.outer = config.wayland.windowManager.sway.config.gaps.inner;
    modifier = "Mod4";
  };
}
```

No more importing mess!

## What if I'm not in the context of the module system?

This can mean either in:

1. Low-level nix abstractions.
2. Packaging with mkDerivation in nixpkgs.
3. Writing a nix codebase from scratch.

If your answer is 1 or 2, then you may be out of luck, but the amount of files you will face are either manageable or hidden away from other users.

Otherwise: use the module system! If you are planning on making some big nix repo, don't hesitate to instantiate the module system to reap from its benefits. Not only you will be able to merge multiple files on a project, but add type-checking through module options, and provide a user interface with good error reporting the user of your project.

To instantiate the module system, all you need is to get a nixpkgs' lib instance, and you are pretty much ready to declare your own modules. More information can be read in https://nix.dev/tutorials/module-system/module-system.html#evaluating-modules .


