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

    const titles = new Map();

    Array.from(toc.children).reverse().forEach(node => {
        if (!(node instanceof HTMLElement)) {
            return;
        }

        const slug = node.dataset.slug;
        if (slug === undefined) {return;}


        titles.set(slug, false);
    })

    console.log(titles);

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const slug = entry.target.id;
            titles.set(slug, entry.isIntersecting);

            console.log(titles);
        })
    }, {
        threshold: 0.6,
    });

    titles.forEach((_, slug) => {
        const title = document.getElementById(slug);
        console.log("observing", slug, title);
        if (title === null) { return; }
        observer.observe(title);
    });
}
