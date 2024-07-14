import type { Plugin } from "unified";
import type { Root, Code } from 'mdast';
import { CONTINUE, visit } from "unist-util-visit";

import path from "node:path";
import fs from "node:fs";

export const remarkWarnTitle: Plugin<[], Root> = () => {
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

interface Meta {
    file?: string,
}

export const remarkCodeMeta: Plugin<[], Root> = () => {
    return (root, vfile) => {
        visit(root, "code", node => {
            if (node.meta === null) {
                return;
            }

            const meta = eval(`({${node.meta}})`) as Meta;

            if (meta.file !== undefined) {
                const dir = path.dirname(vfile.history[0] as string);
                const final = path.resolve(dir, meta.file);

                if (!fs.existsSync(final)) {
                    throw new Error(`Couldn't find file ${final} from markdown meta ${node.meta}`)
                }

                const res = fs.readFileSync(final, {encoding: "utf-8"});

                node.value += "\n" + res.trim();
            }
        });
    }
}
