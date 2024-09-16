---
title: "The Nix lectures, part 2: Derivations"
pubDate: 2024-09-16T07:07:01Z
draft: true
summary: FIXME
slug: nix-tuto-2
---

This is part 2 of a tutorial series that covers all of Nix. We covered
language basics in the first part, and in this post we will cover derivations.

## builtins.derivation

This is the primitive that Nix uses to define derivations. You will probably
**never** use it, as we rely on higher-level abstractions that are built on top
of `builtins.derivation`.

> [!NOTE]
> Remember that the design of the Nix language, it is a very simple language.
> Having a small API surface means that you don't really have to update the API
> as time passes, but rather the abstractions that are built on top. This is
> useful when you want to use a current Nix binary to evaluate some nixpkgs from
> *many* years ago.

`builtins.derivation` is a function that takes an attrset with some 
**known keys**, and the rest are set as environment variables. A simple
invocation might look like this:

```nix file: "derivation.nix"
#=> «derivation /nix/store/n34150nf03sh04j8mjzm8sawdqx9sgqi-sample.drv»
```

Nix will tell use that the return type is a "derivation". However, from chapter
1, I didn't mention that this type exists. What is happening here is that
derivations are implemented as **attrsets** with a special field called `type`.

```nix
{ type = "derivation";  }
#=> «derivation»
```

> [!TIP]
> One of the key insights is that **derivations** are **attrsets**, meaning we
> can access fields from them. You will often see things like
> `pkgs.hello.overrideAttrs`, etc.

Derivations can be built in the repl with `:b`, or with the command `nix build
-f derivation.nix`.

As you might remember, you can do string interpolation with attrsets:
