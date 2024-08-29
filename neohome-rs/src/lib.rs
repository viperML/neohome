#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

use tree_sitter_dynamic::{DynTS, STANDARD_CAPTURE_NAMES};
use tree_sitter_highlight::{Highlight, HighlightEvent};

#[napi]
pub fn highlight(text: String, lang: String) -> Option<String> {
    let mut lang = DynTS::new(lang, STANDARD_CAPTURE_NAMES).ok()?;

    let mut res = String::new();

    res.push_str(r#"<code class="tree-sitter-code">"#);

    let text_bytes = text.as_bytes();

    for event in lang.highlight(text_bytes) {
        match event.ok()? {
            HighlightEvent::Source { start, end } => {
                let t = std::str::from_utf8(&text_bytes[start..end]).ok()?;
                let sanitized = html_escape::encode_text(t);
                res.push_str(&sanitized);
            }
            HighlightEvent::HighlightStart(Highlight(n)) => {
                let capture = STANDARD_CAPTURE_NAMES[n];
                let classes = capture
                    .split(".")
                    .map(|elem| format!("ts-{elem}"))
                    .collect::<Vec<_>>()
                    .join(" ");

                res.push_str(&format!(r#"<span class="{}">"#, classes));
            }
            HighlightEvent::HighlightEnd => {
                res.push_str("</span>");
            }
        };
    }

    res.push_str("</code>");

    println!("{res:?}");

    Some(res)
}
