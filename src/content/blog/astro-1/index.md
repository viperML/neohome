---
title: Rewriting my blog with Astro
slug: astro-blog
summary: |
  High level overview of a blog generator written in javascript,
  based on the idea of components.
pubDate: 2024-07-15
draft: true
---

My interest for computers started back in high school, when I was given an HP
Pavilion G7. With its dual-core AMD CPU and 1600x900 screen, it was not the top
PC experience you could have, but for my younger self, it was fantastic.

I could spend hours just browsing through the UI, playing game, modding them,
and much more. I ran the default Windows (8?) installation back them. What else,
of course. I knew macOS was a thing, as some familiars had those machines. But
in my journeys going through the Windows UI, I wanted to get a better
experience.

It was back them I discovered "desktop ricing", what people called to
personalizing their desktop experience. The trend back then was having a very
minimalistic interface, with flat borders and without buttons. Looking back into
it, the lack of tools to do anything more complicated could have been the reason
for that trend.

![Windows 10 "rice"](./winrice.png)

I also wanted to do something like this for my laptop. Having a "cool" design,
that were radically different from the default Windows UI -- but still being
functional to use. As you can imagine, there were some tools to modify the
system resources, but as much as apply some paint and coating, the essence was
still the same.

So as a natural consequence, my eyes started to look into Linux. This "Free"
operating system, where you can modify any visual aspect of it. I didn't really
want to deal with systemd or the package manages, those were just tools to
having my aesthetically-pleasing desktop experience. So after what every Linux
started does -- research for hours and hours which distro to use -- I finally
landed in Manjaro.

I couldn't find any screenshot of my desktop back then, so we will have to
settle with this one from an Arch installation some time afterwards:

![2021 Arch screenshot](./20210617.png)

Time passed, and I moved into other things. Mainly, moved into investigating how
Linux really works. But in the back of my head, I still had this interest with
interface design. And what else joins interface design and software, if not Web
design?

## My old blog

At some point, a confluence of interests was met: designing a good-looking
interface, and telling stories about Nix. If you follow my block, you probably
already know what Nix, so I'll save you from the elevator pitch.

After digging throw many catalogs of templates, I landed on
[Congo](https://github.com/jpanther/congo). This template was made for
[Hugo](https://gohugo.io), a static site generator (more onto that later). After
some tweaking of the template, I got it to suit my taste.

![Old blog screenshot](./old.png)

### Hugo

Hugo is a static site generator written in Go. As a high level overview, it
takes your source files, runs a templating engine on top of them, and returns
your static site.

The key to Hugo is its templating engine. I didn't look too far in the specific
implementation, but I believe they use the
[`text/template`](https://pkg.go.dev/text/template) package, which seems to be
very popular among Go users. The templating engine is applied over regular HTML,
which is constructed by joining multiple templates or "partials".

As an example, this partial built my site logo (from the navigation bar):

```html file: "partial-logo.html"
```

This example shows my main reason to move away from Hugo: <mark>I didn't want to
deal with this templating language</mark>. Don't get me wrong, I don't think it
is bad. I am sure there is people that praise this templating language, even for
other context -- I have personally used with
[consul-template](https://github.com/hashicorp/consul-template). But I don't
want to deal with a "pseudo-language", with if-blocks, variables etc. I would
rather use a more "orthodox" language, to program my template shenanigans.

The blog was already working, and I didn't want to change much. But as you can
guess from my past, I like to "poke" into systems to get to the root of how
things work. Even using a template -- Hugo or not -- goes against discovering
how HTML+CSS works by myself.


## My requirements for a new framework

The process of investigating the landscape of options took a bit of time, but I
could discard many options quickly. My "minimums" for the framework I wanted
were:

- No backend -- I only want to host static files on [Cloudflare Pages](https://pages.cloudflare.com).
- No templating DSL -- This also discards Rust's solution, [Zola](https://www.getzola.org).
- Used a familiar enough language for me -- discards Haskell's solution, [Hakyll](https://jaspervdj.be/hakyll).
- Built on popular-enough technologies -- discards Hakyll a second time

Looking into the JavaScript-based solutions may be daunting at first. The
solution that picked my interest from the start -- and the decision -- was Astro,
as a friend of mine was already using it. They had a good experience, so I
decided to give it a try.

### Some words about Astro

The [Astro webpage](https://astro.build) describes it as a "web framework for
content-driven websites".

