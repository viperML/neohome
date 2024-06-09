---
title: "Don't use import"
date: 2024-02-04T13:48:09Z
# tags: ['nix']
# draft: false
# summary: "When writing nix, use the module system."
# slug: dont-use-import
---

When you start with Nix, the language seems scary at first. But then you get the hang of it. Your nixfiles start
getting bigger and bigger, with more complex expressions inside them.

Then, you question yourself: how do I break this file in multiple small files?

The answer may be simple at first: `import` .

## How import is used

Reading the nix manual, what import does is to load, parse, and return the Nix expression in the path. Its usage is very simple:

```nix
$ nix eval -f ./foo.nix
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
