import type { Root } from "hast";
import { u } from "unist-builder";
import { visit } from "unist-util-visit";

// https://icones.js.org/collection/tabler?s=copy&icon=tabler:copy

const tabler_copy = u("element", {
    tagName: "svg",
    properties: {
        xmlns: 'http://www.w3.org/2000/svg',
        role: "img",
        width: "1em", height: "1em",
        viewBox: "0 0 24 24",
    }
}, [
    u("element", {
        tagName: "g",
        properties: {
            fill: "none",
            stroke: "currentColor",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            "stroke-width": "2",
        }
    }, [
        u("element", {
            tagName: "path",
            properties: {
                d: "M7 9.667A2.667 2.667 0 0 1 9.667 7h8.666A2.667 2.667 0 0 1 21 9.667v8.666A2.667 2.667 0 0 1 18.333 21H9.667A2.667 2.667 0 0 1 7 18.333z",
            }
        }, []),
        u("element", {
            tagName: "path",
            properties: {
                d: "M4.012 16.737A2 2 0 0 1 3 15V5c0-1.1.9-2 2-2h10c.75 0 1.158.385 1.5 1",
            }
        }, [])
    ])
]);



export function rehypeTitles(): (tree: Root) => void {
    return function (tree: Root) {
        visit(tree, 'element', function (node) {

            if (['h1', 'h2', 'h3', 'h4', 'h5'].includes(node.tagName)) {

                // must run after rehypeHeadingIds
                const id = node.properties["id"];

                if (typeof id === "string") {
                    const text = node.children[0];
                    if (text !== undefined) {
                        node.children = [
                            u("element", {
                                tagName: "a",
                                properties: {
                                    href: `#${id}`,
                                }
                            }, [
                                text
                            ]),
                        ];
                    }
                }
            }
        })
    }
}

export function rehypeCodeCopy(): (tree: Root) => void {
    return function (tree: Root) {
        visit(tree, 'element', function (node) {
            if (node.tagName !== "pre") {
                return;
            }

            node.children.push(
                u("element", {
                    tagName: "button",
                    properties: {
                        class: ["code-copy", "astro-button"]
                    },
                }, [
                    tabler_copy
                ])
            )
        })
    }
}
