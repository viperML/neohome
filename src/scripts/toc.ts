document.addEventListener("astro:page-load", () => {
    const toc = document.getElementById("toc");
    if (toc === null) {
        return;
    } else {
        doToc(toc);
    }
})



function doToc(toc: HTMLElement) {
    const titles = new Map();

    Array.from(toc.children).forEach(node => {
        if (!(node instanceof HTMLElement)) {
            return;
        }

        const slug = node.dataset.slug;
        if (slug === undefined) {return;}


        titles.set(slug, false);
    })

    let activeSlug: string | null = null;

    const updateTitles = () => {
        for (const [slug, active] of titles) {
            if (active) {
                if (activeSlug === slug) {
                    break;
                }
                const li = document.querySelectorAll(`[data-slug="${slug}"]`)[0];
                if (li === undefined) {
                    console.warn("li undefined");
                    break;
                }

                li.classList.add("active");


                if (activeSlug !== null) {
                    const activeLi = document.querySelectorAll(`[data-slug="${activeSlug}"]`)[0];
                    if (activeLi === undefined) {
                        break;
                    }
                    activeLi.classList.remove("active");
                }

                activeSlug = slug;

                break;
            }
        }
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!(entry.target instanceof HTMLElement)) {
                return;
            }

            const slug = entry.target.dataset.headingId;
            if (slug === undefined) {
                return;
            }

            titles.set(slug, entry.isIntersecting);


            updateTitles();
        })
    }, {
        threshold: 0.9,
    });

    titles.forEach((_, slug) => {
        const section = document.querySelectorAll(`[data-heading-id="${slug}"]`)[0];
        if (section === undefined) {return;}

        observer.observe(section);
    });
}
