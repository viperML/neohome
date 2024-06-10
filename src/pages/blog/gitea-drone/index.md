---
title: 'Private git repository with NixOS, Gitea and Drone'
date: 2022-01-29T15:11:36Z
tags: ['nix', 'cloud']
draft: false
summary: Tutorial to get started with a self-hosted Git repo with automatic CI, as a Github/Gitlab alternative
---

In this post I want to show you how I set up a NixOS server running a private Gitea instance, with CI pipelines using Drone, all tied together with Nginx, PostgreSQL and sops-nix. With this setup you would have:

- A private Git repository to upload your projects, with a nice web interface.
- CI/CD pipelines, with a similiar behaviour to GitHub's or Gitlab's.

This guide is also oriented at a hobbist setup, where the approach is to keep the configuration as simple as posible.

## Server

This guide assumes that you already have a machine to deploy your NixOS configurations to, and that you have a working minimial configuration. To do so, there are some NixOS-native projects that can help you, such as:

- [NixOps](https://github.com/NixOS/nixops)
- [deploy-rs](https://github.com/serokell/deploy-rs) (check out my guide [here](https://ayats.org/blog/deploy-rs-example/))

Whichever solution you use, you can adapt and drop this configuration files, and then import them from your main `configuration.nix`.

## sops-nix

To deploy secrets to our machine, we could think of these options:

- Write our secrets directly into `configuration.nix`
- Write our secrets into a file in the machine, (such as `/secret/my-secret`), and reference that file in `configuration.nix`

[sops-nix](https://github.com/Mic92/sops-nix) uses a **hybrid** approach: our secrets will be stored encrypted in our configuration. When the machine boots up, it try to decrypt them using the age key, and put them into a specific path (`config.sops.secrets.<my-secret>.path`).

```nix
{ config, pkgs, ... }:
{
  sops.age.keyFile = "/secrets/age/keys.txt";
}
```

If you prefer to configure your secrets in another way, make sure to replace the lines that use sops with your solution. However, if you want to use sops, read the upstream documentation to get started.

## Gitea

NixOS provides a **module** to setup Gitea. We only need to add the postgres configuration, and our password via sops. Note that this configuration was taken by [this post by Craige McWhirter](https://mcwhirter.com.au/craige/blog/2019/Deploying_Gitea_on_NixOS), without much modification.

The service will listen on the port `3001`, where it will receive the http requests forwarded by nginx.

```nix
{ config, ... }:
{
  services.nginx.virtualHosts."git.my-domain.tld" = {
    enableACME = true;
    forceSSL = true;
    locations."/" = {
      proxyPass = "http://localhost:3001/";
    };
  };

  services.postgresql = {
    ensureDatabases = [ config.services.gitea.user ];
    ensureUsers = [
      {
        name = config.services.gitea.database.user;
        ensurePermissions."DATABASE ${config.services.gitea.database.name}" = "ALL PRIVILEGES";
      }
    ];
  };

  sops.secrets."postgres/gitea_dbpass" = {
    sopsFile = ../.secrets/postgres.yaml; # bring your own password file
    owner = config.services.gitea.user;
  };

  services.gitea = {
    enable = true;
    appName = "My awesome Gitea server"; # Give the site a name
    database = {
      type = "postgres";
      passwordFile = config.sops.secrets."postgres/gitea_dbpass".path;
    };
    domain = "git.my-domain.tld";
    rootUrl = "https://git.my-domain.tld/";
    httpPort = 3001;
  };
}
```

## Drone

Drone is a piece of software that will perform our CI/CD pipelines. It is very similiar to how GitHub's actions or Gitlab's pipelines work, so:

1. We create a `.drone.yml` file in the root of a repository.
2. This file defines some job(s) to execute under certain conditions, such as this example:

```yaml
---
kind: pipeline
type: exec
name: deploy

platform:
  os: linux
  arch: amd64

steps:
  - name: main-step
    environment:
      MY_SECRET:
        from_secret: MY_SECRET
    commands:
      - nix run .#run-my-app
```

3. Gitea's web interface will detect our jobs, and show a symbol with the job status, and a shortcut to Drone's control panel.

To configure this, we need at least two components:

- The server: will communicate between Gitea and the runners
- The runners: will perform the builds. There are a [many runners](https://docs.drone.io/runner/overview/) , but in this example I set-up two of them:
  - Docker runner, to run jobs inside docker containers
  - Exec runner, to use the server's nix store (this results in cached results, environments, etc)

As there is no Drone module at the time of writing, I configured these systemd services based on [Mic92's dotifiles](https://github.com/Mic92/dotfiles/tree/035a2c22e161f4fbe4fcbd038c6464028ddce619/nixos/eve/modules/drone):

```nix
{ config, pkgs, ... }:
let
  droneserver = config.users.users.droneserver.name;
in
{
  users.users.droneserver = {
    isSystemUser = true;
    createHome = true;
    group = droneserver;
  };

  users.groups.droneserver = { };

  services.nginx.virtualHosts."drone.my-server.tld" = {
    enableACME = true;
    forceSSL = true;
    locations."/".proxyPass = "http://localhost:3030/";
  };

  services.postgresql = {
    ensureDatabases = [ droneserver ];
    ensureUsers = [
      {
        name = droneserver;
        ensurePermissions = {
          "DATABASE ${droneserver}" = "ALL PRIVILEGES";
        };
      }
    ];
  };

  # Secrets configured:
  # - DRONE_GITEA_CLIENT_ID
  # - DRONE_GITEA_CLIENT_SECRET
  # - DRONE_RPC_SECRET
  # To get these secrets, please check Drone's documentation for Gitea integration:
  # https://docs.drone.io/server/provider/gitea/

  sops.secrets.drone = {
    sopsFile = ../.secrets/drone.yaml;
  };

  systemd.services.drone-server = {
    wantedBy = [ "multi-user.target" ];

    script = ''
      ${pkgs.drone}/bin/drone-server
    '';

    serviceConfig = {
      EnvironmentFile = config.sops.secrets.drone.path;

      Environment = {
        DRONE_DATABASE_DATASOURCE = "postgres:///droneserver?host=/run/postgresql";
        DRONE_DATABASE_DRIVER = "postgres";
        DRONE_SERVER_PORT = ":3030";
        DRONE_USER_CREATE = "username:viperML,admin:true"; # set your admin username

        DRONE_GITEA_SERVER = "https://git.my-domain.tld";
        DRONE_SERVER_HOST = "drone.my-domain.tld";
        DRONE_SERVER_PROTO = "https";
      };
      User = droneserver;
      Group = droneserver;
    };
  };

  ### Docker runner

  users.users.drone-runner-docker = {
    isSystemUser = true;
    group = "drone-runner-docker";
  };
  users.groups.drone-runner-docker = { };
  # Allow the runner to use docker
  users.groups.docker.members = [ "drone-runner-docker" ];

  systemd.services.drone-runner-docker = {
    enable = true;
    wantedBy = [ "multi-user.target" ];
    script = ''
      ${pkgs.drone-runner-docker}/bin/drone-runner-docker
    '';
    ### MANUALLY RESTART SERVICE IF CHANGED
    restartIfChanged = false;
    serviceConfig = {
      Environment = {
        DRONE_RPC_PROTO = "http";
        DRONE_RPC_HOST = "localhost:3030";
        DRONE_RUNNER_CAPACITY = 2;
        DRONE_RUNNER_NAME = "drone-runner-docker";
      };
      EnvironmentFile = config.sops.secrets.drone.path;
      User = "drone-runner-docker";
      Group = "drone-runner-docker";
    };
  };

  ### Exec runner

  users.users.drone-runner-exec = {
    isSystemUser = true;
    group = "drone-runner-exec";
  };
  users.groups.drone-runner-exec = { };
  # Allow the exec runner to write to build with nix
  nix.allowedUsers = [ "drone-runner-exec" ];

  systemd.services.drone-runner-exec = {
    enable = true;
    wantedBy = [ "multi-user.target" ];
    script = ''
      ${pkgs.drone-runner-exec}/bin/drone-runner-exec
    '';
    ### MANUALLY RESTART SERVICE IF CHANGED
    restartIfChanged = true;
    confinement.enable = true;
    confinement.packages = [
      pkgs.git
      pkgs.gnutar
      pkgs.bash
      pkgs.nixFlakes
      pkgs.gzip
    ];
    path = [
      pkgs.git
      pkgs.gnutar
      pkgs.bash
      pkgs.nixFlakes
      pkgs.gzip
    ];
    serviceConfig = {
      Environment = {
        DRONE_RPC_PROTO = "http";
        DRONE_RPC_HOST = "127.0.0.1:3030";
        DRONE_RUNNER_CAPACITY = "2";
        DRONE_RUNNER_NAME = "drone-runner-exec";
        NIX_REMOTE = "daemon";
        PAGER = "cat";
        DRONE_DEBUG = "true";
      };
      BindPaths = [
        "/nix/var/nix/daemon-socket/socket"
        "/run/nscd/socket"
        # "/var/lib/drone"
      ];
      BindReadOnlyPaths = [
        "/etc/passwd:/etc/passwd"
        "/etc/group:/etc/group"
        "/nix/var/nix/profiles/system/etc/nix:/etc/nix"
        "${config.environment.etc."ssl/certs/ca-certificates.crt".source}:/etc/ssl/certs/ca-certificates.crt"
        "${config.environment.etc."ssh/ssh_known_hosts".source}:/etc/ssh/ssh_known_hosts"
        "${builtins.toFile "ssh_config" ''
          Host git.ayats.org
          ForwardAgent yes
        ''}:/etc/ssh/ssh_config"
        "/etc/machine-id"
        "/etc/resolv.conf"
        "/nix/"
      ];
      EnvironmentFile = config.sops.secrets.drone.path;
      User = "drone-runner-exec";
      Group = "drone-runner-exec";
    };
  };
}
```

> Note: this setup runs both Gitea and Drone in the same machine. It could be beneficial to have different machines for each service, being for performance or security reasons.

## Nginx, ACME, Postgres, Docker

Finally, to tie everything together, we set up a basic Nginx service, that proxies the requests to the virtual hosts, to the internal services. Remember to punch a hole in your firewall, as by default, the firewall is enabled with the ports closed!

```nix
{
  networking.firewall.allowedTCPPorts = [ 80 443 ];

  services.nginx = {
    enable = true;
    recommendedGzipSettings = true;
    recommendedOptimisation = true;
    recommendedProxySettings = true;
    recommendedTlsSettings = true;
  };

  security.acme = {
    acceptTerms = true;
    certs = {
      "git.my-domain.tld".email = "foo@bar.com";
      "drone.my-domain.tld".email = "foo@bar.com";
    };
  };

  services.postgresql = {
    enable = true;
  };

  virtualisation.docker = {
    enable = true;
  };
}
```

## Finale

I hope that this helps you set-up your Gitea server. This write-up is based on my own configuration, with some simplifications. You can check the whole flake here: [github.com/viperML/infra](https://github.com/viperML/infra/tree/8a876582bd881ad01f58081a529d68019040ef8a).If you find any errors or suggestions, please submit a issue or pull request at the repo of this blog: [github.com/viperML/home](https://github.com/viperML/home).
