---
title: Dropping Home-Manager
pubDate: 2024-09-10T11:13:21Z
slug: no-home-manager
# draft: true
summary: |
    Exploring the drawbacks of Home Manager and my journey to finding better 
    ways to handle user-level configurations in NixOS.
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
-- I didn't want to configure these files, and I didn't care for them either. 
So after activation, Home Manager has two
behaviors that you can choose: aborting, or backing up the file in question.
For the second option, Home Manager will create backups indefinitely, you can't
limit them. I failed trying to push for a file-deleting solution, please read and make
your own conclusions: [#4971](https://github.com/nix-community/home-manager/pull/4971).
Myself from the future: as I was writing this, I discovered there is an
undocumented `.force` option, which predates my PR. Too many mixed signals...
- Option duplication: there are many things that are not only available through
HM and NixOS. For example, you can configure your neovim wrapper through
`programs.neovim` in both of either of them, but the options may have subtle
differences. The same can be said for systemd units, packages added to PATH,
etc. And then you have the options related to nixpkgs, which must be configured
for **both**, like allowing unfree packages. A consequence of this is that Home
Manager tries to re-import nixpkgs, with all the performance implications of
this action.
- The Home Manager CLI is a mess of bash. With all the "nice" (notice the
sarcasm) error handling from bash applications. And I don't want to deal with it
when it breaks.

### The non-technical part

Ultimately, I use NixOS because I care about reliability. NixOS allows you to
map configuration files written in functional language that is homogeneous to all
the services, and to "lower" the functional data structures to a read-only
storage. It is easy to escape the nix store, as all it takes is to write a
program (that lives in the store) that has an effect **outside** the store.

Using configuration files that live in a regular directory like `~/.config`,
starts to break the guarantees that Nix brings. I'm certainly more confident
that a regular program might overwrite the symlinks that Home-Manager placed at
activation-time.

On a personal note, I am also concerned about HM modules, that could be factored
out. For example, is configuring GNOME declaratively through `dconf`, something
that should be [deeply integrated](https://github.com/nix-community/home-manager/blob/master/modules/misc/dconf.nix) into HM.
Couldn't this be factored out into an standalone project, and just having Nix as
a *layer on top*? The same can be said for the [sops-nix HM module](https://github.com/Mic92/sops-nix/blob/master/modules/home-manager/sops.nix), or many others.

And my final reflection: from time to time, we hear about the dangers of [supply
chain attacks](https://www.cloudflare.com/learning/security/what-is-a-supply-chain-attack/) 
in the context of software development. This is a broad term, in which a
*malicious actor* operates in some part of your third-party devependency chain.
But what if the actor is not malicious, but rather incompetent. On a first
approach, the damage that an incompetent actor can deal are not as severe as
what a targeted attack can deal, but still damage nonetheless. When using
Home-Manager (or any Nix library, for the matter), I feel more vulnerable, just
for the fact that more people involved in the supply chain means that there are
more chances to run into an issue. And when dealing with issues of the Operating
System itself, sometimes I don't have the time and willpower to deal with them.

> Always and inevitably, everyone underestimates the number of stupid individuals in circulation.
> --<cite>[Cipolla](https://en.wikipedia.org/wiki/Carlo_M._Cipolla#%22The_Basic_Laws_of_Human_Stupidity%22_(1976))</cite>

## The alternatives

Before ending this post, I want to add some of the alternatives to fill the
whole that removing Home-Manager will leave in your dotfiles.

### Configure less software

This is the obvious approach, but I have to mention it. Since I moved to KDE
Plasma, what I previously had to configure in half a dozen systemd units for my
window manager, now it is done for me.

I talk about all the little programs that are not part of a bare-bones window
manager (or wayland compositor). A volume level indicator, tray icons for Wi-Fi
and Bluetooth, a notification daemon, application launcher, a bar, and a long
etcetera.

My KDE setup is inconsistent between the 3 computers I use, I have to manually
set ~5 keybinds. But it's OK. [I can live with the time I spent doing it](https://xkcd.com/1205/).


### Wrapper-manager: my self-promotion

While it is no secret that this blog is a psyop to make you use 
[wrapper-manager](https://github.com/viperML/wrapper-manager), let me explain
what I mean by wrappers.

Let's say I want to use a wrapper to configure neovim. Instead of executing
`nvim` directly, I can do the following:

```
1. Move nvim to .nvim-wrapped
2. Create a shell script called nvim
3. Fill the contents of nvim with:
#!/usr/bin/env bash
exec nvim -u /path/to/my/init.lua "$@"
```

Instead of using `~/.config/nvim/init.lua`, calling your "fake" nvim will select
the proper `int.lua` from whichever path you want.

The final step, is to do everything with Nix. Both bash and the original neovim
can be grabbed from the `/nix/store`, and with flakes you can also intern your
`init.lua`. What remains is a **self-contained** neovim configuration, that
doesn't access your `~/.config`, thus not needing Home-Manager.

For neovim specifically, you can do it today with the NixOS option `programs.neovim`
or with [`neovim.override`](https://nixos.org/manual/nixpkgs/stable/#custom-configuration).

If you want to do it manually, nixpkgs provides the function `wrapProgram` from
the `pkgs.makeWrapper` package. It is usually combined with `pkgs.symlinkJoin`,
to not have to rebuild the package from source, but instead create an extra
"proxy" package. [Wrapping packages in the NixOS wiki](https://wiki.nixos.org/wiki/Nix_Cookbook#Wrapping_packages).

```nix
pkgs.symlinkJoin {
  name = "neovim";
  paths = [ pkgs.neovim ];
  buildInputs = [ pkgs.makeWrapper ];
  postBuild = ''
    wrapProgram $out/bin/nvim \
      --add-flags "-u" \
      --add-flags "${./init.lua}"
  '';
}
```

Because I wanted to abstract away the creation of the wrappers, I created
[wrapper-manager](https://github.com/viperML/wrapper-manager) for myself. I also
deals with some nuances when dealing with `.desktop` files, for example.

```nix
wrappers.neovim = {
  basePackage = pkgs.neovim;
  flags = [
    "-u"
    ./init.lua
  ];
}
```


### Old-school stow and others

Sometimes, it's impossible to use a wrapper. For example, configuring
systemd-user units -- it can be done through a NixOS option, but it is shared
along every user in the system. Maybe it is inconvenient, for example having to
restart your window-manager for configuration changes. I want to propose to the
Nix community, taking a more "bare-bones" approach to solving this issue.

Perhaps it could be interesting to have a thin layer of Nix on top of [GNU
stow](https://www.gnu.org/software/stow/)
to manage symlinks? -- It would only do that. I also wanted to implement my own
framework for "commands that run impurely" 
called [activation-manager](github.com/viperML/activation-manager) 
(but gave up in the process). The functionality would be implemented as a
standard library on top of "commands running in some ordered graph".

I think there is more research to be done about how to deal with "impure"
user-level configuration.
