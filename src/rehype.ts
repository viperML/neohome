import type { Root } from "hast";
import { u } from "unist-builder";
import { visit } from "unist-util-visit";


import { icon as mkIcon, type IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faCopy } from "@fortawesome/free-regular-svg-icons";

function icon2node(icon: IconDefinition) {
    const i = mkIcon(icon);

    return u("element", {
        tagName: "svg",
        properties: {
            xmlns: 'http://www.w3.org/2000/svg',
            viewBox: `0 0 ${i.icon[0]} ${i.icon[1]}`,
            "aria-hidden": "true",
            focusable: "false",
            "data-prefix": "fab",
            role: "img",
        }
    }, [
        u("element", {
            tagName: "path",
            properties: {
                fill: "currentColor",
                d: i.icon[4]
            }
        }, [])
    ]);
}



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
                        class: ["code-copy"]
                    },
                }, [
                    icon2node(faCopy)
                ])
            )
        })
    }
}
