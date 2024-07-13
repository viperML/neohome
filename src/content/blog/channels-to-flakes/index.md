---
title: Channels to flakes
slug: channels-to-flakes
pubDate: 2022-02-12T14:49:55Z
summary: Use the flake registry as a legacy channel replacement.
---


This post serves as a quick tutorial for anyone running NixOS or home-manager with a flake. Your flake will have an input for the `nixpkgs` flake, that gets pinned to a specific commit in your `flake.lock`. For example:

```
{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-22.05";
  # ...
}

{
  "nodes": {
    "nixpkgs": {
      "locked": {
        "lastModified": 1655456688,
        "narHash": "sha256-j2trI5gv2fnHdfUQFBy957avCPxxzCqE8R+TOYHPSRE=",
        "owner": "NixOS",
        "repo": "nixpkgs",
        "rev": "d17a56d90ecbd1b8fc908d49598fb854ef188461",
        "type": "github"
      },
      "original": {
        "owner": "NixOS",
        "ref": "nixos-22.05",
        "repo": "nixpkgs",
        "type": "github"
      }
    },
// ...

$ jq -r '.nodes.nixpkgs.locked.rev' < flake.lock
d17a56d90ecbd1b8fc908d49598fb854ef188461
```

This is very nice! Our system will have a known **nixpkgs rev**. But there are applications, that are not built as part of the flake, that will consume the nixpkgs flake. You probably want to **propagate this rev** to your whole system, so everything uses it by default.

Using a different nixpkgs rev of you system, will have some undesirable effects, ranging from pulling megabytes of packages to using some old channel that you forgot you had.

Some examples of commands that won’t use this nixpkgs rev of your flake, include:

- `nix-shell -p <package>`
- `nix run nixpkgs#<package>`
- Any nix code that uses `import <nixpkgs> {}`
- `nix-env -iA <package>` (you don’t want nix-env anyway…)

We can classify these in:

- Tools that use channels and NIX_PATH
- Tools that query the flake registry

So, for each problem we will have a different solution. I have included how to do it for both NixOS and home-manager. Just pick whatever you need, or use both at the same time!

## Pinning your registry

The new `nix <command>` programs now use a new method to get `nixpkgs`, instead of querying the `NIX_PATH` environment variable. Every command needs two components, separated with a `#`. For an example command such as `nix shell nixpkgs#hello`, it would take:

- A flake reference (_flakeref_): `nixpkgs`
- A flake output: `hello` (expanded to `legacyPackages.<system>.hello`)

There are [several types](https://nixos.org/manual/nix/unstable/command-ref/new-cli/nix3-flake.html#types) of flakeref's. In this case, the flakeref `nixpkgs` is indirect, that means that it queries the flake registry to resolve to a different type: `github:NixOS/nixpkgs/nixpkgs-unstable`. By default, all nix installations query the internet when you use the `nixpkgs` flakeref.

The solution is to tell nix to use our own nixpkgs rev, instead of downloading the latest from the internet. This is called "pinning" the registry, and can be easily done by adding a new `nixpkgs` entry to the flake registry.

```nix
# flake.nix
# ...
{
  outputs = {
    self,
    nixpkgs,
    home-manager,
  }: {
    nixosConfigurations.HOSTNAME = nixpkgs.lib.nixosSystem {
      # ...
      modules = [
        {
          nix.registry.nixpkgs.flake = nixpkgs;
        }
      ];
    };
    homeConfigurations.USER = home-manager.lib.homeManagerConfiguration {
      # ...
      modules = [
        {
          nix.registry.nixpkgs.flake = nixpkgs;
        }
      ];
    };
  };
}
```

After rebuilding, you can query your registry to see if it is in effect:

```
$ nix registry list
user   flake:nixpkgs path:/nix/store/<hash>-source<...>
# ...
```

> [!NOTE]
> Some guides suggest pinning every input for your flake. This is not really needed if you just want to use the `nixpkgs` flake. For the sake of simplicity, only the `nixpkgs` flake is pinned in this guide.

## Pinning your channels

Pre-flake nix tools use the environment variable `NIX_PATH` to query the location of some downloaded nixpkgs in your disk, which in turn is populated by the `nix-channel` tool. So the usual workflow is as follows:

- The user adds nixpkgs as a channel with `nix-channel --add`
- `nixpkgs` is then downloaded into the disk into a special location.
- This location is by default in the `NIX_PATH` environment variable.
- CLI tools query the environment variable to know where to find it.

You may also have encountered the usage of `NIX_PATH` in nix code, with the usage of the diamond-path operator:

```nix
with import <nixpkgs> {};
```

To query the path to which `<nixpkgs>` resolves to, you can use `$ nix eval --impure --expr "<nixpkgs>"`

> [!NOTE]
> Updated!

To pin `NIX_PATH`, now we can directly reference the `nixpkgs` flake from the registry, by configuring
`NIX_PATH=nixpkgs=flake:nixpkgs`.


```nix
{
  outputs = {
    self,
    nixpkgs,
    home-manager,
  }: {
    nixosConfigurations.HOSTNAME = nixpkgs.lib.nixosSystem {
      # ...
      modules = [
        {
          nix.nixPath = ["nixpkgs=flake:nixpkgs"];
        }
      ];
    };
    homeConfigurations.USER = home-manager.lib.homeManagerConfiguration {
      # ...
      modules = [
        {
          home.sessionVariables.NIX_PATH = "nixpkgs=flake:nixpkgs$\{NIX_PATH:+:$NIX_PATH}";
        }
      ];
    };
  };
}
```

After rebuilding, check if your nixpkgs was inserted into NIX_PATH:

```
$ printenv NIX_PATH
nixpkgs=flake:nixpkgs

$ nix eval --impure --expr '<nixpkgs>'
/nix/store/<hash>-source
```

Afterwards, you can remove your channels for your user and root, as they are not needed anymore.
