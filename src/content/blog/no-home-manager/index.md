---
title: I uninstalled home-manager
pubDate: 2024-09-01T10:40:10Z
summary: |
    Summary of my complaints with Home Manager, and the alternatives
    to fill in the holes.
slug: no-home-manager
draft: true
---

A couple of weeks ago, I completely removed Home Manager from my
[dotfiles](https://github.com/viperML/dotfiles). I might get either one of these
reactions from you:

- "Impossible..."
- "What even is Home Manager?"

To answer the latter, here is a quick overview.

## Home Manager

This project started to fill a hole in the NixOS: user-level declarative
configuration.

As you might know, NixOS is the Linux distribution based on the Nix package
manager. One of the key aspects of NixOS, is that you can use Nix (the language)
to configure it completely. From what packages are to be installed, what
services to run, etc.


```nix
{config, pkgs, ...}: {
  environment.systemPackages = with pkgs; [
    rsync
  ];

  services.nginx = {
    enable = true;
  };
}
```
