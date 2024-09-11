---
title: "The Nix Lectures. Part 1: Language basics"
pubDate: 2024-09-11T07:32:26Z
draft: true
summary: FIXME
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
