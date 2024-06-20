---
title: 'Declarative Ubuntu'
pubDate: 2022-06-19T10:03:20Z
tags: ['ubuntu']
draft: false
summary: Experiment to have a Ubuntu installation managed declaratively, instead of imperatively
---


_"Add this PPA to be aple to install some package..."_

_"Enable foo.service, and write this to /etc/some/path/to/be/forgotten ..."_

Every undocumented action we do into our systems, nears them into an more unknown state. Even if these modifications are very clear in the present, will you remember about them in a few weeks? What about other people that work on the same system?

Like a vacuum cleaner, the OS collects "state", that we could define as modifications from the original system, that are the result of commands ran by humans, or by its autonomous operations. Of course, there is some state that we are are interested in: the database of our application, its logs, etc. But should every single file on the disk, be able to aquire state? I wouldn't say so.

For Linux, the elephant in the room is `/etc`. Citing the FHS:

> /etc : Host-specific system configuration
>
> Purpose: The /etc hierarchy contains configuration files. (...)

With such a vague definition, what I take a way is **Host-specific**, as in configuration files that are only needed for my specific system. Therefore, a default Linux system would come with an empty `/etc`, and it would be filled with configuration files as we use it and manually configure it!

This is far from the reality, as with a quick look into any Linux distribution we see a lot of non-host-specific configuration files. The question then is, which of these files were modified by me, and which came preinstalled?

The solution that I propose is having a system, where the user's configuration files are not mixed with the default configuration files. With a system like this, the problem of "collecting state" vanishes: every file from my distro can be safely wiped and recreated, as it is "stateless", and combined with my "configuration" it results in the system.

Because of how `/etc` is layed out in current distros won't change any time soon, the key concept that glues this together is: indiscriminate removal of state. Wiping everything in the filesystem, and rebuilding the system for scratch on a weekly or monthly basis can help us prevent the problem of accumulating "state", undocumented changes to the system.

## Apt metapackage

The most straightforward solution could be to set up a metapackage, such that everything in the system, is ultimately a dependency of this metapackage.

For example:

- `configuration.deb`
- Depends on: every installed package that you want in your system.
- Includes every modification to `/etc`

Therefore, the entire system is the result of installing it, into a "blanket" system. The administration workflow is converted:

- Installing packages into adding as a dependency to out metapackage
- Modifying files in `/etc` or with commands into modifying the source of the metapackage.

As everything can be reproduced* by this package, we can discard the entire filesystem every week or month, to make sure it doesn't collect state (modifications to this configuration, not tracked by the metapackage). In any case, you may want to keep *some\* state, like some subfolder of `/var` or `/home`. For my experiment, I used ZFS subvolumes that get mounted into these locations.

## stage0, stage1, stage2

For Ubuntu specifically, I came up with 3 steps. Ideally we would have just 1 step, such that the system can be installed from an empty tree.

- Minimal Ubuntu debootstrap (stage 0)
- `stage1.deb`, configures `apt` before installing more packages
- `stage2.deb` installs every dependency of the system, and every configuration file

You can find the source code for the experiment in [github.com/viperML/ubuntu-declarative](https://github.com/viperML/ubuntu-declarative), so I don't copy-paste everything into this blog.

The folder structure is as follows:

```
├── stage1
│  ├── DEBIAN
│  │  └── control
│  └── etc
│     └── apt
│        ├── apt.conf.d
│        │  ├── 00stage1
│        │  └── 99release
│        ├── preferences.d
│        │  └── stage1
│        ├── sources.list.d
│        │  ├── graphics-drivers-ubuntu-ppa.list
│        │  ├── microsoft.list
│        │  └── release.list
│        └── trusted.gpg.d
│           ├── graphics-drivers-ubuntu-ppa.gpg
│           └── microsoft.gpg
├── stage1.deb
```

The `control` file, would have the contents:

```
Package: stage2
Version: 1.0.1
Architecture: amd64
Maintainer: Anonymous
Description: No description
Depends: linux-generic, linux-image-generic, linux-headers-generic, linux-firmware,
  cryptsetup, dracut, zfs-dracut,
  keyboard-configuration, console-setup, console-setup-linux, kbd,
  iproute2, network-manager,
  sudo, vim, curl, git, man, manpages, strace, neofetch,
  software-properties-common,
  nvidia-driver-510,
  kde-plasma-desktop, kubuntu-wallpapers, plasma-nm, ark,
  flatpak,
  nix-setup-systemd,
  code
```

This metapackages can be trivially built with

```
dpkg-deb --build --root-owner-group stage1 stage1.deb
```

### Setting up the users

Instead adding your user imperatively, or as some post-install hook, you can use `systemd-sysusers` to automatically add your user:

```ini
# stage2/etc/sysusers.d/ayats.conf
u ayats 1000:100 "Fernando Ayats" /home/ayats /usr/bin/bash
```

This won't set any password, but you can also set automatic login to tty or your display manager:

```ini
# stage2/etc/systemd/system/getty@.service.d/autologin.conf
[Service]
X-RestartIfChanged=false
ExecStart=
ExecStart=@/usr/sbin/agetty agetty '--login-program' '/usr/bin/login' '--autologin' 'ayats' --noclear --keep-baud %I 115200,38400,9600 $TERM
```

```ini
# stage2/etc/sddm.conf.d/autologin.conf
[Autologin]
User=ayats
Session=plasma
```

### Bootloader and initrd

For my specific hardware, this took longer than expected. From my very little experience, it seems that the default `initramfs` that Ubuntu comes with, uses a script that tries to get information from the running system to build it. As I was building it from a Docker image, chrooted into the filesystem tree, it failed pretty quickly.

My solution was to use `dracut`, and making sure it builds a generic `initramfs` to boot.

As for the bootloader, I didn't install any, as my `EFI` partition already had systemd-boot working. So a script was tasked with copying the kernels and initrd's into the ESP, and adding the boot entry.

## Closing thoughts

Just by having all the configuration in a monorepo, instead of running imperative commands, we gain some features for free. For example, having the system git-tracked allows us to know when we made some change, revert it, or even share it with other people to help debug some problem.

With the advent of Fedora Silverblue, being claimed as an "immutable" distro, isn't it also prone to having a dirty `/etc`, with mixed host-specific and non-host-specific files? What is immutable about that? Moreover, is our experiment "more immutable"? Given that it can't be modified, as any modification is easily reverted by reconstructing it from scratch.

If you like this concept, give NixOS a try, as this way of managing the system is the default. By using symlinks, it can recreate the root filesystem from scratch, without any prior knowledge of what is in `/etc` .
