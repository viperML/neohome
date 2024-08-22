#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

use tree_sitter_dynamic::{DynTS, STANDARD_CAPTURE_NAMES};
use tree_sitter_highlight::{Highlight, HighlightEvent};

#[napi]
pub fn highlight(text: String, lang: String) -> Option<String> {
    let mut lang = DynTS::new(lang, STANDARD_CAPTURE_NAMES).ok()?;

    let mut res: Vec<u8> = Vec::new();

    res.extend(r#"<code class="tree-sitter-code">"#.as_bytes());

    let bytes = text.as_bytes();

    for event in lang.highlight(bytes) {
        match event.ok()? {
            HighlightEvent::Source { start, end } => res.extend(&bytes[start..end]),
            HighlightEvent::HighlightStart(Highlight(n)) => {
                let capture = STANDARD_CAPTURE_NAMES[n];
                let classes = capture
                    .split(".")
                    .map(|elem| format!("ts-{elem}"))
                    .collect::<Vec<_>>()
                    .join(" ");
                let text = format!(r#"<span class="{}">"#, classes);
                res.extend(text.as_bytes());
            }
            HighlightEvent::HighlightEnd => {
                let text = format!("</span>");
                res.extend(text.as_bytes());
            }
        };
    }

    res.extend("</code>".as_bytes());

    let res = String::from_utf8(res).ok()?;

    Some(res)
}
