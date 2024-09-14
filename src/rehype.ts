import type { Root } from "hast";
import { u } from "unist-builder";
import { visit } from "unist-util-visit";
import type { Element } from "hast";
import type { Plugin } from "unified";
import type { Estimation } from 'lesetid';

import { fromHtml } from 'hast-util-from-html'

import IconCopy from "@tabler/icons/outline/copy.svg?raw";
import IconCopyCheckFilled from "@tabler/icons/filled/copy-check.svg?raw";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { highlight } = require("neohome-rs");

function icon2node(raw: string): Element {
    return fromHtml(raw, {
        fragment: true,
    }).children[0] as Element;
}


// Adds more classes to pre blocks
export function rehypePreClass(): (tree: Root) => void {
    return function (tree: Root) {
        visit(tree, "element", node => {
            if (node.tagName === "pre") {
                if (node.properties.class === undefined) {
                    node.properties.class = "";
                }
                (node.properties.class as string) += " card";
            }
        });
    }
}

function getLanguage(classes: unknown | (string | number)[]): string | undefined {
    if (!Array.isArray(classes)) {
        return;
    }

    for (const c of classes) {
        if (typeof c === "string") {
            if (c.startsWith("language-")) {
                return c.replace("language-", "");
            }
        }
    }

    return;
}

// Highlights code block with tree-sitter
export function rehypeTreeSitter(): (tree: Root) => void {
    return function (tree: Root) {
        visit(tree, "element", node => {
            if (node.tagName === "pre") {
                visit(node, "element", subNode => {
                    if (subNode.tagName == "code") {
                        const language = getLanguage(subNode.properties.className);
                        if (language === undefined) {
                            return;
                        }

                        // @ts-ignore
                        const oldText = subNode.children[0].value;

                        const res = highlight(oldText, language);

                        if (res === null) {
                            console.log("Failed to highlight some", language);
                            return;
                        } else {
                            console.log("Highlighted some", language);
                        }

                        const parsed = fromHtml(res, {
                            fragment: true,
                        }).children[0];
                        // console.log(parsed);

                        // @ts-ignore
                        node.children = [parsed];
                    }
                });

            }
        });
    }
}


// Adds hrefs to titles
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

// Adds a copy button to code blocks
export function rehypeCodeCopy(): (tree: Root) => void {
    return function (tree: Root) {
        visit(tree, 'element', function (node, index, parent) {
            if (node.tagName !== "pre") {
                return;
            }

            if (index !== undefined) {
                parent?.children.splice(index, 1, ...[
                    u("element", {
                        tagName: "div", properties: {
                            class: ["code-container"]
                        }
                    }, [
                        node,
                        u("element", {
                            tagName: "button",
                            properties: {
                                class: ["code-copy", "astro-button"],
                                "aria-label": "Copy code"
                            },
                        }, [
                            icon2node(IconCopy),
                            icon2node(IconCopyCheckFilled)
                        ])
                    ])
                ]);
            }
        })
    }
}

// Need to keep in sync with ZOD
interface Frontmatter {
    title: string,
    pubDate: Date,
    summary: string,
    estimation?: Estimation;
};

import type { InferEntrySchema } from "astro:content";

export const rehypeH1: Plugin<[], Root> = () => {
    return (root, vfile) => {
        // @ts-ignore
        const frontmatter: Frontmatter | null = vfile.data.astro?.frontmatter;
        if (frontmatter === null) {
            throw new Error("Couldn't get frontmatter");
        }
        console.log(frontmatter);

        const t: InferEntrySchema<"blog"> | null = null;

        const title = u("element", {
            tagName: "h1",
            properties: {}
        }, [
            u("text", {
                value: frontmatter.title,
            })
        ]);

        root.children.unshift(title);
    }
}
