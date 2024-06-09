import lume from "lume/mod.ts";
import tailwindcss from "lume/plugins/tailwindcss.ts";
import postcss from "lume/plugins/postcss.ts";
import sourceMaps from "lume/plugins/source_maps.ts";

// import highlight from "lume/plugins/code_highlight.ts";
// import lang_nix from "npm:highlight.js/lib/languages/nix";

const site = lume({
    src: "./src",
});

site.use(tailwindcss())
site.use(postcss())

// site.use(highlight({
//   theme: {
//     name: "atom-one-dark", // The theme name to download
//     path: "/_includes/css/code_theme.css", // The destination filename
//   },
// }));

// site.copy("/_includes/css/code_theme.css");
site.use(sourceMaps())


site.copy([
    ".ico"
]);

export default site;
