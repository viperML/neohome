---
title: 'NixOS on Hetzner Cloud with deploy-rs'
pubDate: 2022-01-12T14:49:55Z
tags: ['nix', 'cloud']
draft: true
summary: Hands-on tutorial on deploying a fully-functional system.
---

[deploy-rs](https://github.com/serokell/deploy-rs) is a tool developed by Serokell to deploy NixOS machines into a remote server. It allows for "stateless" deployments, such that the machine that applies the configuration doesn't know the state of the recipient machine. I found that the [upstream example](https://raw.githubusercontent.com/serokell/deploy-rs/master/examples/system/README.md) was a bit lacking, so I decided to write a guide on how I did use it to deploy a server to Hetzner Cloud.

This guide also assumes that you are doing from in a NixOS machine, but it may be possible to do from a generic linux distro with just the `nix` package manager.

## Base flake

You can follow along with the repository I created for this demo: [github:viperML/deploy-rs-example](https://github.com/viperML/deploy-rs-example).

A high level overview of the flake will be:

- Inputs:
  - Nixos-21.11, the latest version of NixOS at the time of writing (please update if you see fit).
  - deploy-rs
  - flake-utils-plus, to help with some flake-related tasks.
- Outputs:
  - A NixOS configuration for the hostname `hetzner`
  - A development shell that we can use to use the `deploy` binary, with `$ nix develop`

[`flake.nix`](https://github.com/viperML/deploy-rs-example/blob/master/flake.nix)

```nix
{
  description = "My server flake";

  inputs = {
    nixpkgs.url = github:NixOS/nixpkgs/nixos-21.11;
    flake-utils-plus.url = github:gytis-ivaskevicius/flake-utils-plus;
    deploy-rs = {
      url = github:serokell/deploy-rs;
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs@{ self, nixpkgs, flake-utils-plus, ... }:
    let
      nixosModules = flake-utils-plus.lib.exportModules (
        nixpkgs.lib.mapAttrsToList (name: value: ./nixosModules/${name}) (builtins.readDir ./nixosModules)
      );
    in
    flake-utils-plus.lib.mkFlake {
      inherit self inputs nixosModules;

      hosts = {
        hetzner.modules = with nixosModules; [
          common
          admin
          hardware-hetzner
        ];
      };

      outputsBuilder = (channels: {
        devShell = channels.nixpkgs.mkShell {
          name = "my-deploy-shell";
          buildInputs = with channels.nixpkgs; [
            nixUnstable
            inputs.deploy-rs.defaultPackage.${system}
          ];
        };
      });

      checks = builtins.mapAttrs (system: deployLib: deployLib.deployChecks self.deploy) inputs.deploy-rs.lib;
    };
}
```

Let's disect our outputs:

- `nixosModules`: we are importing NixOS modules from files, such as `./nixosModules/<my_module.nix>`, and placing them into our variable `nixosModules.<my_module>`.
- `hosts.hetzner.modules` is a construct provided by `flake-utils-plus` that directly defines NixOS systems, by specifying the modules.
- `devShell` creates a development shell that we can call with `nix develop`, that contains our `deploy` binary. We place it in a `flake-utils-plus`'s `outputsBuilder`, because it will define a `devShell` per system (`x86_64-linux`, `aarch64-linux`, etc).

Then, to define our system configuration, all we have to do is drop them into `./nixosModules/<my_module.nix>`, and reference them into `hosts.hetzner.modules`. I believe that this helps to maintain clarity with a module per task, but feel free to go for a different approach.

- [`./nixosModules/common.nix`](https://github.com/viperML/deploy-rs-example/blob/master/nixosModules/common.nix): this module defines some basic NixOS configurations, such as enabling flake support and setting our system version.

- [`./nixosModules/hardware-hetzner.nix`](https://github.com/viperML/deploy-rs-example/blob/master/nixosModules/hardware-hetzner.nix): this module defines specific settings for our Hetzner server, such as the filesystems and network configuration. The setups assumes that it will be installed to:

  - A disk `/dev/sda` with GPT labels
  - Boot partition `/dev/sda1` for BIOS booting with GRUB
  - BTRFS partition `/dev/disk-by-label/NIXOS`, which includes some subvolumes for different components.

- [`./nixosModules/admin.nix`](https://github.com/viperML/deploy-rs-example/blob/master/nixosModules/admin.nix): the module defines the user `admin`, with inital password `1234` and passwordless sudo (`wheel` group). **Its is very important to set you SSH public key** for the user, as `deploy-rs` [requires](https://github.com/serokell/deploy-rs/issues/107) you to be able to log-in into the server without a password.
  ```nix
  # ...
  users.users.admin = {
    # ...
    openssh.authorizedKeys.keys = [ "your SSH public key here goes here" ];
  };
  # ...
  ```

## First install

We need to set-up a base system that we can deploy on. The high-level overview is:

- Boot up the live NixOS image
- Wipe and reformat the VM disk
- Install our system

To perform the installation, we can choose any OS image, as it won't be used.

After creating the machine, mount the NixOS install disk, reboot the machine and access the console (with the button next to power).

Our server disk will be available in `/dev/sda`. To automate the process, I created a [simple script to automate the installation](https://github.com/viperML/deploy-rs-example/blob/master/install.sh), that will partition our disk, format it, and install NixOS. If you modified `hardware-hetzner.nix` for a different partitioning, just perform the steps manually.

```bash
sudo -s
nix-shell -p git
git clone https://github.com/viperML/deploy-rs-example
cd deploy-rs-example
./install.sh
```

Finally, shutdown the server, remove the NixOS disk and boot it. Ssh into the server to add it yo your **known hosts**.

```bash
ssh admin@<you server IP address>
```

## Creating a test module

We are ready to deploy a custom configuration into the server. For this example, we will just enable docker. We will create a new file to organize the docker related-options as such:

[`./nixosModules/docker.nix`](https://github.com/viperML/deploy-rs-example/blob/master/nixosModules/docker.nix)

```nix
{ config, pkgs, ... }:
{
  services.nginx.enable = true;
  users.users.admin.extraGroups = [ "docker" ];
}
```

And add `docker` it into our [flake's `outputs.hosts.hetzner.modules`](https://github.com/viperML/deploy-rs-example/blob/d7b253168a59f92547997a24645c95cc0e08f439/flake.nix#L28).

You can build a VM with the configuration, to check that it is working properly:

```bash
nix build .#nixosConfigurations.hetzner.config.system.build.vm
./result/bin/run-hetzner-vm
```

## Deploying the new configuration

Finally, all we have to do is configure deploy-rs. To do so, we have to define "nodes", which in turn can have different "profiles", and a profile uses a NixOS configuration.

In this example, our node `my-node` will will use the profile `my-profile` which uses the `hetzner` NixOS config:

```nix
#...
outputs = {
    # ...
    deploy.nodes = {
        my-node = {
          hostname = "<your address goes here>";
          fastConnection = false;
          profiles = {
            my-profile = {
              sshUser = "admin";
              path =
                inputs.deploy-rs.lib.x86_64-linux.activate.nixos self.nixosConfigurations.hetzner;
              user = "root";
            };
          };
        };
    };

    # ...
}
```

to deploy our node, we enter the `devShell` that we defined earlier in out flake, to have access to the deploy binary:

```bash
nix develop
deploy .#my-node.my-profile
```

## Finale

I hope that this proccess servers you as an example of how to use deploy-rs and NixOS for your project. Some final ideas to go from here:

- Fully automate the deployment process, by evaluating the flake when pushing a new commit, etc
- Add different roles for different nodes
- Use [sops-nix](https://github.com/Mic92/sops-nix) to deploy your application secrets
- Change the partitioning scheme (maybe a simpler EXT4, or ZFS subvolumes ...)

If you encounter any problem with the template, feel free to open an issue at the repo [github:viperML/deploy-rs-example](https://github.com/viperML/deploy-rs-example).
