---
title: 'Nixos lustrate'
pubDate: 2023-03-03T11:54:31Z
tags: ['nix']
draft: true
# summary: Call a toolchain.toml from nix, for better interoperability with non-nix developers
# hidden: true
summary: ""
---

- Install nix
    curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install

- Rememeber to relogin

- nix copy --to ssh://root@129.151.238.242 --substitute-on-destination .#nixosConfigurations.vishnu.config.system.build.toplevel

- nix build --profile /nix/var/nix/profiles/system --no-link /nix/store/8mzvz8lrm4q372sr7fpf0ib30kda8hdq-nixos-system-nixos-23.11.20231112.e44462d

- umount /dev/sda1
- umount /dev/sda2

- partition.sh

- mount /dev/disk/by-partlabel/esp /boot

- touch /etc/NIXOS

- NIXOS_INSTALL_BOOTLOADER=1 /nix/var/nix/profiles/system/bin/switch-to-configuration boot

