import type { Plugin } from "unified";
import type { Root } from 'mdast';

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
