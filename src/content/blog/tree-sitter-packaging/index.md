---
title: 'The tree-sitter packaging mess'
pubDate: 2024-08-25
draft: false
summary: A trip on how not to do the packaging for your software ecosystem
---

Recently I got into packaging [tree-sitter](https://tree-sitter.github.io/tree-sitter). TS (for short)
is kind of a framework to write language parsers, which are mainly used for code editors.

As far as I know, TS started as a project from the Atom team. They wanted to substitute the regex-based grammars
for something more powerful. TS grammars "understand" the indentifiers, as they are very similar
to how languages parse the source code: by identifying variables, class names, etc. This is in contrast
to the regex-based grammars, which can produce worse results. This video from 2018 is a very intersting watch,
so I recommend you see it to know for about TS: [https://www.youtube.com/watch?v=Jes3bD6P0To](https://www.youtube.com/watch?v=Jes3bD6P0To).

I have 2 uses for packaging TS and the grammars:

1. My own Neovim distribution. I do my packaging with Nix, but I want to move away from nixpkgs's packaged plugins.
TS is one of the dependencies that are not trivial to package.
2. Using the `tree_sitter` rust crate, which can be used to write your own TS applications. As of this writing,
this blog post uses TS to do the syntax highlighting, instead of a regex-based engine.

## Tree-sitter CLI and grammars

TS grammars are the main units that the TS project produces. A TS grammar is a repository dedicated to writing
the parser for the project. For example, we can find TS grammars for [C](https://github.com/tree-sitter/tree-sitter-c),
[Python](https://github.com/tree-sitter/tree-sitter-python), etc. The TS grammars can be compiled and loaded by your
editor (more onto that later). We also have the [TS CLI and libraries](https://github.com/tree-sitter/tree-sitter).
The CLI is a simple Rust app, that can be used to set-up new TS grammars from scratch. Everything is clear?


## Madness begins

Before we start, I recommend you open YouTube and set some background music while you read this, 
like this one: [https://www.youtube.com/watch?v=IKwstbpvNMc](https://www.youtube.com/watch?v=IKwstbpvNMc).

### JavaScript for the parsers

To begin with, grammars are written in JavaScript and compiled with Node. This might not be an issue by itself,
and you could make the point of using TypeScript, but I haven't written any grammar by myself. But this will
be important later.

### The JavaScript is compiled into C

Yes, you heard right. The JavaScript grammars declare the grammar, and then they are compiled into a huge C file. When you
build this C file, the resulting binary exposes a symbol `tree_sitter_lang` that can be used by consumers to run the parser.


### Copy-pasting C headers

As the generated C depends on some interface with the TS libraries, the CLI drops a `tree_sitter.h` that is used for the interface.
They don't rely on an installation of TS that is discovered with `pkg-config` or `cmake`, but rather drop this file on your grammar.

### The generated C code and headers are tracked with git

I can only guess that for "portability", the huge C file and TS headers are usually checked in into version control. This means,
that for every change to the JavaScript grammar, you have to regenerate the C blob and vendor it in the repo.


### The CLI tool is written in Rust

This is not a problem, but I just find it funny at this point that they can't decide on a single language.

### The Lisp queries

Oh, did I say that they can't decide on a language? Spoke too soon! TS also uses Scheme, from the Lisp family.
To my understanding, the queries are used by the TS clients to know how the "use" tokens created by the parser.
We have 3 types of queries: `highlights.scm`, used for syntax highlights, `injections.scm` used for injecting
one language into another, and `locals.scm`, which I don't know what they are for. Why are these not also expressed
in JavaScript? I also don't know.


### Pseudo-npm packaging with a `package.json`

Because we are doing JS, we also have a `package.json` for each query. It is extended with off-spec keys, namely `tree_sitter`,
which is used by the TS CLI to know when to apply the grammar. We even have some regex rules for that.

### Grammar sub-directories

To make things harder, a single grammar repo might contain multiple grammars. This is the case for the TypeScript repo,
which contains grammars for both `typescript` and `tsx`. The TS CLI also doesn't recursively build all the grammars, why
would you think it would do that! There are also some grammars that don't have the `package.json` in the root of the repo,
if you want to make things harder.

### `node_modules` is invited to the party!

The temptation is too high, and some grammar developers choose to include JS libraries from NPM with a simple `npm install`.
In some way, it is not a problem when the C blob is pre-generated, but the grammars may also depend on queries from `node_modules`.
And the choice of words is precise here: the grammar might depend on some `query.scm` located in a relative `node_modules`. I guess
we can safely assume it comes from NPM, and it's not a random file...

If you do packaging with Nix, you have probably know the pain of dealing with this.

### Node packages running scripts and connecting to the internet

Funnily enough, as there is no concept of "systems" in NPM, the main `tree_sitter` JavaScript package connects to the internet
to download the TS CLI that is needed for the current architecture, during its installation, ouch! Good thing we can pass
`--ignore-scripts` to `npm` so that it doesn't do it.

### The TS CLI does weird things

During my testing, I saw that the CLI copies the compiled `parser.so` into `~/.cache`. Don't ask me why it does that, but I hope
it can tell when to invalidate that cache.


### Neovim ignores everything

Now we come to Neovim. TS support in neovim is provided by the `nvim-treesitter` plugin (no dash in the `tree-sitter`).
Please, just forget everything you read in the last minutes, because `nvim-treesitter` ignores all of that. They only
need that you sideload the compiled `parser.so` by yourself. Or you can use their `:TSInstall` command that downloads the grammar
and compiles it. Because we know that won't ever go wrong, and you won't have store paths in your ELF binaries pointing to locked
versions in some absolute path. No, totally, don't use Nix.


### Upstream vs downstream queries

And we come to one of the weird things in the TS ecosystem: the queries (Lisp files) that are developed in the grammar's repository,
are not used by Neovim. Instead, we have two copies of the same `highlights.scm`, that are mostly identical, but have diverged
as different people work on them, and the Neovim queries might use specific queries only available in the editor.

Then you run into situations, where the upstream grammar developers don't care about the grammar, because "why bother if Neovim
already provides them".


### NxM problem with language libraries

At this point, it is very apparent that TS has a problem of packaging. But it is starting to make a bigger problem, as we have downstream
consumers of the TS libraries. For example, you can use the Rust crate `tree_sitter` or the Python packaging, for your parsing needs.

But every language repository also distributes the grammars! We have the TS grammars in [PyPI](https://pypi.org/project/tree-sitter-go/),
in [Crates.io](https://crates.io/crates/tree-sitter-lua), in [NPM](https://www.npmjs.com/package/tree-sitter-lua), [Nuget](https://www.nuget.org/packages/tree-sitter-lua)
and probably some more.


## My last words

It is sad to see a project that was created by very intelligent people, fall in the packaging hell. I don't know if the original authors
of TS caused this, or people with less experience that came after. In any case, I think starting again from scratch is the only solution to this.
And if you are the TS developer that is behind after all of this packaging, [Linus has some words for you](https://youtu.be/OF_5EKNX0Eg?si=d6_AfmkyyOaxpFKj&t=9).


If you are interested in all of these findings, I've put some packaging for Nix in [https://github.com/viperML/tree-sitter](https://github.com/viperML/tree-sitter).
It's mostly stuff that I use for myself, but get in contact with me if you want to use it or make it more user-friendly.
