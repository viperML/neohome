---
title: "The Nix lectures, part 1: Language basics"
pubDate: 2024-09-11T07:32:26Z
draft: true
summary: |
  Covering the fundamentals such as the syntax of Nix as a expression-based
  language, the types, and some functions from builtins and lib.
slug: nix-tuto-1
---

This is part 1 of a tutorial series that covers all of Nix. You can find the
rest here:

- Part 1: Language basics
- Part 2: Derivations
- Part 3: Module system
- Part 4: Integration

In this part of the tutorial I want to set the base upon we will build the rest
of our knowledge of Nix. We will cover the syntax of the language itself, the
types of variables, how functions and recursion works and some built-in
functions.

## Nix repl and nix eval

To begin with, we will set-up an environment where we can evaluate Nix code, and
print the result. We have 2 options for this:

- `nix repl`: to type your expressions in the **command-line**.
- `nix eval`: to type your expressions in a **file**.

I recommend you use `nix eval`, as it will be more convenient to edit Nix in
your text editor.

So, open in your favorite text editor any filename ending in `.nix` -- Nix
doesn't have any special "filenames" [^1].

[^1]: There is only one filename that Nix itself cares about: `default.nix`.
    When you call `import` on a folder `/foo` containing a `/foo/default.nix`,
`import` will try to open the `default.nix` in the folder. You can still address
any other `/foo/bar.nix` normally, or explicitly type `/foo/default.nix`.

```nix
# tuto.nix
"Hello world!"
```

```console
$ nix eval -f ./tuto.nix
"Hello World!"
```

I may use comments to show the output of an expression, to simplify the code
blocks:

```nix
"Hello world!"
#=> "Hello world!"
```

## Types

Nix is a dynamically typed language, that is, you don't write the type of a
value. Rather it is calculated at runtime. Nix is also a very simple language,
and it has very few types.

> [!NOTE]
> As one of the key objectives of Nix is software reproducibility, it needs a
> very simple language to use a base. You wouldn't want to add new features
> every year, making it impossible to use old Nix code.


I like to have a mental model of types in Nix, by dividing them in 2 categories:
primitive types and compound types. And then we have functions.

### Primitive types

#### Strings

This is the most important type in Nix. Strings behave mostly like in any other
programming language. You have 2 variants of a string:

- `"foo"`, with single double quotes
- `''foo''`, with double single quotes

The difference is that `''foo''` **trims the leading whitespace**. This is useful
for multiline strings, where you will see them used.

```nix
''
  export FOO=BAR
''
```

You can also interpolate values with `${}` inside a string:

```nix
''
  export FOO=${ "A" + "B" }
''
#=> "export FOO=AB\n"
```

Strings can be concatenated with `+`.


#### Booleans

We have `true` and `false`. You will use them for `if`'s.

#### Null

Apart from the booleans, there is also `null`. You may see it in NixOS modules,
so signify the lack of some configuration option.

Note that you can't use `null` instead of `false` inside an `if`, unlike Python.


#### Numbers

Mostly used for demonstration purposes, you probably won't
see any number in the wild. Nix has `int` and `float` types, which coerce
automatically.

```nix
1 + 2 * 2 / 1.1
#=> 4.63636
```

### Compound types

These types are made of any of the other values. Lists are a collection of
unnamed values, while attribute sets provides them with names.

#### Lists

Lists are **space separated**, and are heteregeneus. This means you can mix any
other type of value inside:

```nix
[
  1
  "hello"
  [
    "nested list"
  ]
]
```

As a style guide, we put new items in new lines. This helps the human reader
parse the different elements.

You can concatenate lists with the double plus sign `++`:

```nix
[ 1 ] ++ [ 2 ]
#=> [ 1 2 ]
```

#### Attribute sets

Or **attrsets** for short, are a collection of key-value pairs.
The keys must be valid identifiers (not expressions), and the values can be of
any types. The **semicolons** are obligatory.

```nix
{
  foo = "bar";
  x = [ 0 ];
}
```

You can nest attribute sets freely. However, there is some special syntax
shorthand for it. Note that this is only possible when you are writing nested
attrsets.

```nix
{
  a = {
    b = "c";
  };
  # or shortened:
  a.b = "c";
}
```

To select an item from an attrset, you use a dot `.`:

```nix
{
  x = 1;
  y = 2;
}.x
#=> 1
```

To insert a key in an attribute set, with the same name and value, you can use
the `inherit` keyword.

```nix
let
  foo = "value";
  bar = {
    baz = "value";
  };
in
  {
    # these two are equivalent
    foo = foo;
    inherit foo;

    # if you need a nested attrset
    baz = bar.baz;
    inherit (bar) baz;

    # you can inherit multiple things
    inherit foo bar;
  }
```

> [!TIP]
> `inherit` is not related to inheritance in OOP languages. Remember that it is
> just a simple shorthand for `x = x`.

### Functions

It won't come to a surprise, that functions are the most important type in Nix,
being a functional language. Functions are defined with the following syntax:

```nix
argument: body

# sometimes you need parenthesis
(argument: body)
```

To apply a function, you use a single space:

```nix
(x: x + 1) 2
#=> 3
```


> [!IMPORTANT]
> Functions take a **single** argument, and return a **single** value from its
body.

While this might seem like a limitation, you can write functions that take
multiple values in two ways. One way, is to take an attrset as an argument, which then you can decompose:

```nix
x: x.foo + x.bar
```

To help with this common pattern, there is some special syntax for decomposing
the input. Don't confuse this syntax with how you declare an attrset, this is
just for functions:

```nix
{ foo, bar }: foo + bar
```

The other option for accepting multiple arguments, is returning another
function:

```nix
foo: (bar: foo + bar)
```

You can call this function with `1`, and then call the returned function again
with `2`. This is called "currying", and is possible because we can return a
function from a function:

```
# pseudo-code
f = foo: (bar: foo + bar)

# If foo=1, f 1
#=> (bar: 1 + bar)

# If bar=2
#=> 1 + 2

3

# Which is the same as:
# f 1 2
#=> 3
```

One way to know if you are dealing with functions or partially-applied
functions, is that Nix displays them as `lambda`:

```nix
(x: y: x + y)
#=> «lambda»
#=> you can't print a function

(x: y: x + y) 1
#=> «lambda»
#=> still the inner lambda

(x: y: x + y) 1 2
#=> 3
```

> [!TIP]
> Both functions and lists are aware of spaces: functions use space for
> application, and lists are space-separated. Lists take precedence over
> functions, so nbe careful when applying functions inside lists:
> ```nix
> [
>   f 1    # two elements
>   (f 1)  # the result of the function
> ]
> ```

## Compound expressions

One of the key insights to understanding Nix's syntax, is that everything is an
expression. Expressions can be nested into another. Unlike a regular language,
there are no "statements" in Nix.

An statement would imply multiple values. In contrast, in Nix we have a single
expression, that evaluates from the bottom.

One way to visualize this, is by adding parenthesis for every expression:

```nix
# Given the following expression:
[ 1 ] ++ [ { foo = x: y + 1; } ]

# From the bottom:
(expr) ++ (expr)

[ (expr) ] ++ [ (expr) ]

[ 1 ] ++ [ { foo = (expr); } ]
```

In the folling sections, we will some syntax that can be compound with regular
expressions.

### if-then-else

The syntax for if is the following:

```nix
if expr-cond then expr-true else expr-false
```

Given `expr-cond`, if it evaluates to `true`, then the `expr-true` is selected.
If it evaluates to `false`, then `expr-false` is used. Otherwise, if you pass
any other type, a runtime error is raised.

> [!IMPORTANT]
> The if expression, is an expression itself

This means, you can use it as any other expression, for example as attrset keys,
as return values of functions or anything more or less complex:

```nix
{
  config = if useCuda then "cuda" else "noCuda";

  # using parenthesis to visualize the expressions
  config' = (if (useCuda) then ("cuda") else ("noCuda");
}
```

You can "fake" an if-else, by nesting another if-expression in the `expr-false`
branch:

```nix
(if false
 then "a"
 else (if true
       then "b"
       else "c"))
```


### let-in

`let-in` is a **prefix** to any expression, that allows us to factor out code.
The syntax is the following:

```nix
let
  x = (expr);
  y = (expr);
in
  (expr)
```

The syntax is similar to how we declare attrsets `{ x = (expr); }`, but without
the curly braces.

When we need to repeat the usage of some variable, we will be using a `let-in`
most of the time. You might have seen the following example to create a shell:

```nix
let
  pkgs = import <nixpkgs> {};
  # pkgs => { mkShell = ...; hello = ...; .... }
in
  pkgs.mkShell {
    packages = [
      pkgs.hello
    ];
  }
```

### with

`with` is a weird one. It allows you use to put all the keys of an attrset,
in the scope of the target expression. The syntax is the following.

```nix
with (expr-with); (expr)
```

Note that the first expr must return an attribute set. We can use `with` to
factor out code in the following way:

```nix
with {
  x = 1;
  y = 2;
}; (x+y)
```

This is oddly similar to `let-in`. The key difference is that the argument to
`with` can be a variable that we receive as input, or the result of some
computation. For example:

```nix
with (import <nixpkgs> {});
mkShell {
  packages = [
    hello
  ];
}
```

## Builtins

In this section, we will cover some functions from `builtins`. This is the name
of a variable that is provided by Nix itself. I will cover some of the most used
ones. You can check the documentation for the rest in the
[Nix manual](https://nix.dev/manual/nix/2.18/language/builtins).

### import

`import` allows you to load a nix expression from another file. Remember that
nix is an expression-based language, so a file always contains a single expression
that returns a single value.

```nix
# foo.nix
let y = 2; in {
  x = 1;
  z = y + 2;
}

import ./foo.nix
#=> { x = 1; z = 4; }
```

> [!IMPORTANT]
> When you pass a **folder** to `import`, it will try to read the
> `folder/default.nix` file inside it. `default.nix` is the only "special"
> filename that we have in Nix.

A common use case is to import a file, and then immedately after evaluate the
function:

```nix
import ./foo.nix "myinput"
```

We then arrive at the layout of [nixpkgs](https://github.com/NixOS/nixpkgs). It
contains a `default.nix` inside it, that returns a function. This function takes
an attrset with the nixpkgs configuration, and then returns an attrset with all the packages.

```nix
<nixpkgs>
#=> /nix/store/qpg5mwsind2hy35b9vpk6mx4jimnypw0-source

import <nixpkgs>
# «lambda»

(import <nixpkgs>) {}
# parenthesis are redundant
#=> {
#   hello = <drv>;
#   python3 = <drv>;
#   ....
# }
```

> [!TIP]
> I recommend loading nixpkgs in a `nix repl`, and exploring the resulting
attrset. You can either use `pkgs = import <nixpkgs> {}`, or the repl command
`:l <nixpkgs>`, which evaluates it with the empty attrset.



### map

`map f list` applies the function `f` to a `list`. When you think of a `for`
loop in other languages, usually you can accomplish it with `map`.

```nix
builtins.map (x: "workspace-${builtins.toString x}") [ 1 2 3 ]
#=> [
#   "workspace-1"
#   "workspace-2"
#   "workspace-3"
# ]
```


### filter

`filter f list`, as map, applies f to each element of the list. But it removes
elements for which the function returns `false`, and otherwise keeps them.

```nix
builtins.filter (x: builtins.stringLength x > 1) ["f" "bar"]
#=> [ "bar" ]
```

### mapAttrs, filterAttrs

These are the equivalent to `map` and `filter`, but can be applied to
attrsets instead of lists. They take a *curried* functions, for the name and
value.

```nix
builtins.mapAttrs (name: value: "${name}:${value}") { foo = "bar"; }
#=> { foo = "foo:bar"; }
```

### readFile, fromTOML, fromJSON

Unlike `import`, which reads a file and loads its nix expression, `readFile`
reads a file and loads them as a string. It can be useful to factor out a big
string into a separate file.

`fromTOML` and `fromJSON` try to convert a Nix string into a valid Nix value,
usually an attrset or list of other "simple" values. You may see it in
combination with `readFile`.

```nix
builtins.fromJSON (builtins.readFile ./package.json)
#=> {
#   name = "neohome";
#   ...
# }
```

### foldl'

Finally, I want to mention `foldl'`. It allows you to take a list, and generate
a single value out of it. How the value is generated, depends on what *folding*
function you pass to it. You also need to provide the *nul* element, from which
the list is folded from.

For example, you can implement the "sum of all numbers in a list", by folding
the list, with the sum function and 0 as the nul element.

```nix
builtins.foldl' (left: right: left + right) 0 [ 1 2 3 4 ]
#=> 10
```

## Nixpkgs' standard library

Many other utility functions are implemented in nixpkgs. These are implemented
on top of `builtins`, so they are not required to be part of Nix itself. Some of
them can be rewritten easily -- for example the identity function `lib.id = x: x`, but
in general you will be using them quite often.

You can get `lib` from a `pkgs` instance, and it is also part of the argument of
NixOS modules. We are writing an standalone nix file, so to get `lib` into scope
we can use the following:

```nix
let
  pkgs = import <nixpkgs> {};
  inherit (pkgs) lib;
in
  lib.id 3
  #=> 3
```

We will cover some nice functions from `lib`, but as with `builtins`, I don't
want you to memorize them -- I neither do. But instead, just keep in the back of
your head that they exist.

### traceVal

Based on `builtins.trace`, it allows you to print a value into the console. All
you need to do is wrap a value with `traceVal`, and make sure you evaluate it.

This will be useful for "print-debugging" functions, so don't underestimate its
value.


```nix
builtins.map (x: (lib.traceVal x) + 1) [ 2 3 4 ]
#=> [
# trace: 2
# 3
# trace: 3
# 4
# trace: 4
# 5
# ]
```

> [!TIP]
> Remember that Nix is an expression-based language. `traceVal` doesn't behave
> like a print statement, but rather it is a function that takes a value and
> returns it, printing the value as an effect.

### flatten

`flatten list` takes a list with lists inside, and transforms it into a "flat"
list.

```nix
lib.flatten [ [ 1 2 ] [ 3 4 ] ]
#=> [
#   1
#   2
#   3
#   4
# ]
```

> [!TIP]
> `flatten` is very useful when used with `map`, as it allows `map` to "return
> multiple values" in the mapping function:
> ```nix
> lib.flatten (builtins.map (x: [ "left-${x}" "right-${x}" ]) ["foo" "bar"])
> #=> [
> #   "left-foo"
> #   "right-foo"
> #   "left-bar"
> #   "right-bar"
> # ]
> ```

### listToAttrs, attrsToList

More often than not, you need to pass a list to an API that takes an attrset, or
viceversa. The conversion is not trivial, but you can use these funtions to do
so.

To convert an attrset to a list, there are multiple ways to do it:

```nix
lib.attrsToList { foo = "foovalue"; bar = "barvalue"; }
#=> [
#   {
#     name = "bar";
#     value = "barvalue";
#   }
#   {
#     name = "foo";
#     value = "foovalue";
#   }
# ]

builtins.attrValues { foo = "foovalue"; bar = "barvalue"; }
#=> [
#   "barvalue"
#   "foovalue"
# ]

builtins.attrNames { foo = "foovalue"; bar = "barvalue"; }
#=> [
#   "bar"
#   "foo"
# ]
```

For `listToAttrs`, you may need to do some conversion with `map` before feeding
the result:

```nix
lib.listToAttrs (builtins.map (pkg: { name = pkg.name; value = pkg; }) [ pkgs.hello pkgs.coreutils ])
#=> {
#   "coreutils-9.5" = «derivation /nix/store/57hlz5fnvfgljivf7p18fmcl1yp6d29z-coreutils-9.5.drv»;
#   "hello-2.12.1" = «derivation /nix/store/crmj28zg09517n5sskml9fmy2c6r3rsr-hello-2.12.1.drv»;
# }
```

### concatStrings

A common abstractionm pattern, is to factor out a big string, into a list of
strings. As you know, you can then reduce a list to a single value with
`builtins.foldl'`, but the standard library provides a family of functions that
concatenate strings: `concatStrings`, `concatStringsSep`, etc.

```nix
lib.concatStringsSep "\n" [ "export A=B" "export B=C" ]
#=> "export A=B\nexport B=C"
```

### makeSearchPath, makeBinPath, makeLibraryPath

When dealing with packages, you will often deal with search paths. These are
environment variables used in Linux, that follow the same pattern
`elem:elem:elem`. For example, the `PATH` environment variable. You can create
search paths with `concatStringsSep` and `map`, but the standard library
provides some shorthands for this common task:

```nix
lib.makeBinPath [ "" "/usr" "/usr/local" ]
#=> "/bin:/usr/bin:/usr/local/bin"

lib.makeLibraryPath [ pkgs.hello pkgs.coreutils ]
#=> "/nix/store/yb84nwgvixzi9sx9nxssq581pc0cc8p3-hello-2.12.1/lib:/nix/store/0kg70swgpg45ipcz3pr2siidq9fn6d77-coreutils-9.5/lib"
```

## Advanced topics

Finally, I want to mention some advanced topics that are part of the base
language. If you are just getting started with Nix, you might not need to know
about this. Or you might want to read ahead because of curiosity.

### Merging attribute sets

I decided to skip the merging operator `//` when talking about attrsets. It
takes two attrsets, and inserts the keys from the right-hand side into the 
left-hand side. Notice that this definition is very specific to what it does: **it
does not try to merge any child attrsets**. Looking at an example:

```nix
{ a = "avalue"; b = { ba = "bavalue"; bc = "bcvalue"; }; } // { b = 2; c = "cvalue"; }
#=> {
#   a = "avalue";
#   b = 2;
#   c = "cvalue";
# }
```

Notice that `c` was inserted, but also `b`, removing the nested attrset from the
left. This can have negative consequences, as naively using `//` can lead to
problems.

Merging attrsets is not something that you will do commonly. A prefered approach
would be to create a new attrset, and explicitly listing the key-value pairs
with `inherit`.

```nix
let c = "avalue"; b = { ba = "bavalue"; }; in { b = { inherit c; inherit (b) ba; }; }
#=> {
#   b = {
#     ba = "bavalue";
#     c = "avalue";
#   };
# }
```

### Recursion

You can achieve complex behavior by using the different mechanism for recursion
in nix.

One way is using `let-in`:

```nix
let
  x = [ x ];
in
  x
```

Because `x` itself is in scope, you can create the list that contains itself
(forever). Of course, this is an useless example, but there are other patterns
that are best (or only) implemented with recursion.

The nixpkgs' lib also offers `lib.fix`, which has a simple definition:

```nix
fix = 
  f: 
  let
    x = f x;
  in
  x;
```

Fix takes a function, and applies the function using the **result** of the
function as its argument. Trippy, eh? This allows us to write very compact
self-referencing values:

```nix
lib.fix (self: { a = 1; b = self.a + 1; })
#=> {
#   a = 1;
#   b = 2;
# }
```

Nix also provides the `rec` keyword that can be prefixed to attsets, and
provides a similar experience to `fix`, but with an implicit scope similar to
let-in:

```nix
rec { a = 1; b = a + 1; }
#=> {
#   a = 1;
#   b = 2;
# }
```

I prefer to use `fix`, because it is more explicit about where things come --
you have to mention your function argument `self`, but you can choose whichever
you want.

### builtins.toString and string interpolation

There are two ways to convert some value to an string: `builtins.toString` and
using string interpolation. They follow different semantics. You could say that
string interpolation is a subset of what you can do with `toString`.

```nix
builtins.toString true
#=> "1"

"${true}"
#=> error: cannot coerce a Boolean to a string: true
```

> [!IMPORTANT]
> However, the most important type that you *can* string interpolate are attrsets.
> Attrsets will use its attribute `outPath` (a string) or `__toString` (a function).
> ```nix
> "${ { outPath = "/usr"; } }/bin"
> #=> "/usr/bin"
> ```


## Finale

I hope you got a broad idea about how Nix itself works. It is a very simple
language at is core, and most of the abstractions are implemented in Nixpkgs.

When looking at complex Nix, always remember to try to pull apart the basic
expressions. After all, everything is mostly functions and attrsets/lists.

