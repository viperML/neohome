document.addEventListener("astro:page-load", () => {
    const toc = document.getElementById("toc");
    if (toc === null) {
        return;
    } else {
        doToc(toc);
    }
})

function doToc(toc: HTMLElement) {
    console.log(toc);

    const observer = new IntersectionObserver((entries) => {
        // console.log(entries);
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                console.log(entry.target.id)
                // window.history.replaceState(null, "", `#${entry.target.id}`)
            }
        })
    }, {
        threshold: 0.6,
    });

    // const t = document.getElementById("nix-repl-and-nix-eval");
    // if (t === null) {return;}

    // observer.observe(t);


    Array.from(toc.children).reverse().forEach(node => {
        if (!(node instanceof HTMLElement)) {
            return;
        }

        const slug = node.dataset.slug;
        if (slug === undefined) {return;}

        console.log(node, slug)

        const title = document.getElementById(slug);
        if (title === null) {
            return;
        }

        observer.observe(title);
    })
    // toc.children.forEach(node => {
    //     console.log(node);

    // })
}
