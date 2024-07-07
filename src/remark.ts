import type { Plugin } from "unified";
import type { Code, Root } from 'mdast';
// import { toString } from "mdast-util-to-string";
import { visit } from "unist-util-visit";
import { u } from 'unist-builder';

export const remarkWarnTitle: Plugin<void[], Root> = () => {
    return (tree, file) => {
        tree.children.forEach(child => {
            if (child.type === "heading") {
                if (child.depth == 1) {
                    const title = child.children[0];
                    if (title?.type === "text") {
                        console.warn("Level 1 heading:", title.value, "@", file.path)
                    }
                }
            }
        });
    };
};


export const remarkCode: Plugin<void[], Root> = () => {
    return (tree, file) => {
        // visit(tree, (node, index, parent) => {
        //     if (node.type === "code") {
        //         if (node.lang === "nim") {
        //             // node = u("paragraph", "Hello");
        //             const i = parent?.children.indexOf(node);
        //             console.log(node, "I:", i);
        //             if (i !== undefined) {
        //                 parent?.children.splice(i + 1, 0, u("paragraph", [
        //                     u("text", "HELLO")
        //                 ]));
        //                 console.log(parent?.children);
        //             }
        //         }
        //     }
        // });
        // const codes = tree.children
        //     .filter(child => {
        //         return child.type === "code";
        //     }) as Code[];

        // codes.forEach(code => {
        //     // code.lang = "bash";
        //     // code.meta = "foo";
        //     console.log(code.meta);
        //     console.log(code.meta)
        // });
        // .forEach(child => {
        //     if (child.type === "code") {
        //         child
        //     }
        //     console.log(child);
        // })
    }
};
