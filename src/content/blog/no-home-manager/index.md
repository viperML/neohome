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

## Short introduction to Home Manager

This project started to fill a hole in the NixOS: user-level declarative
configuration.

As you might know, NixOS is the Linux distribution based on the Nix package
manager. One of the key aspects of NixOS, is that you can use Nix (the language)
to configure it completely. From what packages are to be installed, what
services to run, etc.


```nix
# configuration.nix
{config, pkgs, ...}: {
  environment.systemPackages = with pkgs; [
    rsync
  ];

  services.nginx = {
    enable = true;
  };
}
```

However, one of the limations of NixOS is that the option are mostly related to
system services. To fill this gap, Home Manager lets you configure user-level
applications. As NixOS, it also uses the 
[module system](https://nix.dev/tutorials/module-system/index.html), and some of
the options will feel familiar:

```nix
# home.nix
{config, pkgs, ...}: {
  home.file.foo.text = "bar";

  programs.fish = {
    enable = true;
  };
}
```

Home Manager has been growing in popularity. At the time of this writing, it is
part of the [nix-community](https://github.com/nix-community), but there have
been talks of making it an "official" project -- Personally I don't think this
matters much, as in the end, you have the same group of people who contribute to
nixpkgs and home-manager.

Many NixOS users would say that they need Home Manager. And I have been there
too, don't get me wrong. After countless hours of configuring (and ricing) my
PC, my "dependency" on HM grows exponentially. Every single CLI tool that I
install may need some configuration, which usually lives in `~/.config`.

In a way, you run into this "cascading" effect, specially when dealing with some
standalone Window Manager / Wayland Compositor: after configuring the thing
itself, you also need to configure other basic desktop tools. These can include
a bar, some overlay for the volume keys, a display switcher, etc. etc. And I
don't even cover basic things, like a terminal emulator or your editor of
choice.


## The bad

This might come up as a rant about Home Manager, or me being a hater. But keep
in mind that I don't complain just for the sake of complaining. In any case, we can
divide my complaints in two types:

### The technical part

I have a long list of tiny issues with HM. None of these issues would make me
consider moving away from it. But in a whole, it starts to get serious. While
these are the most important ones, or the first ones that come into my mind, it
doesn't mean that I've run into a longer tail of lesser issues.

- `mkOutOfStoreSymlink`: I hate it. I should not exist. But it exists just to
"not break compatibility". For a bit context: in Nix we have the path type
`/foo/bar` and the string type, which sometimes is used to represent paths `"/foo/bar"`.
Usually, when NixOS modules accept a `lib.types.path`, you can either pass a
path type or a string. Then they are used "as is".
In parallel to this, we have Flakes, that have the property of "interning" path
types. For example, using `./foo` will copy the store and substitute it for
`/nix/store/....foo`. And using an absolute path like `/foo` will be forbidden
by the flake sandbox. But in the end, you will still have a regular path-type
path. Therefore, if you want to refer to `/foo` without using interning, you use
a string type, `"/foo"`. Home Manager just disregards this, and will try to
intern string types, meaning you can't refer to absolute paths if you use
flakes. This function, `mkOutOfStoreSymlink` does some hack to get around this.
The stale issue is here: [#3032](https://github.com/nix-community/home-manager/issues/3032).
- Profiles and NixOS: when using Home Manager as a NixOS module, it installs itself as a
package to your nix profile. This means you will always have a `home-manager`
package in the output of your `nix-env --list`, which gets reinstalled after
each activation. I don't know what's that thing doing in there, and I don't want
to see it.
- File backups: for some reason, KDE modifies some files handled by Home Manager
-- which I don't really care for. So after activation, Home Manager has two
behaviors that you can choose: aborting, or backing up the file in question.
For the second option, Home Manager will create backups indefinitely, you can't
limit them. I failed trying to push for a file-deleting solution, please read and make
your own conclusions: [#4971](https://github.com/nix-community/home-manager/pull/4971).
- The Home Manager CLI is a mess of bash. With all the "nice" (notice the
sarcasm) error handling from bash applications. And I don't want to deal with it
when it breaks.
- Option duplication: there are many things that are not only available through
HM and NixOS. For example, you can configure your neovim wrapper through
`programs.neovim` in both of either of them, but the options may have subtle
differences. The same can be said for systemd units, packages added to PATH,
etc. And then you have the options related to nixpkgs, which must be configured
for **both**, like allowing unfree packages. A consequence of this is that Home
Manager tries to re-import nixpkgs, with all the performance implications of
this action.

### The non-technical part

In the end, I use NixOS because I care about reliability. NixOS allows you to
map configuration files written in functional language that is homogeneus to all
the servives, and to "lower" the functional datastructures to a read-only
storage. It is easy to escape the nix store, as all it takes is to write a
program (that lives in the store) that has an effect **outside** the store.

Having my dotfiles depend on many projects makes me anxious, as in some sense I
am in the spotlight of a potential supply-chain attack. Not one made my
malicious actors, but by [incompetent actors](https://en.wikipedia.org/wiki/Carlo_M._Cipolla#%22The_Basic_Laws_of_Human_Stupidity%22_(1976)).

