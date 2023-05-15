---
title: Why you don't need flake-utils
date: 2023-05-15T16:44:12Z
tags: ['nix']
draft: true
summary: This is a rant about why you don't need flake-utils, and its pitfalls
---

## Flake output schema

To begin with, I want to lightly explain what the flake output schema is.

When we write a flake, we are told that it has 2 sections:

```nix
{
  inputs = {
    /* ... */
  };

  outputs = function;
}
```

`outputs` is a function that gets passed an attribute set, which we usually deconstruct:

```nix
{
  outputs = inputs@{self, nixpkgs, ...}: .....;
}
```

This function then, must return an attribute set. At first glance, this attrset can be freeform:
```nix
{
  outputs = inputs: {
    foo = "bar";
  };
}
```

And we can check that it works:
```console
nix eval .#foo
bar
```

