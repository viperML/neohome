#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

use tree_sitter_dynamic::{DynTS, STANDARD_CAPTURE_NAMES};
use tree_sitter_highlight::{Highlight, HighlightEvent};

#[napi]
pub fn sum(a: i32, b: i32) -> i32 {
    a + b
}

#[napi]
pub fn highlight(text: String, lang: String) -> Option<String> {
    let mut lang = DynTS::new(lang, STANDARD_CAPTURE_NAMES).ok()?;

    let mut res: Vec<u8> = Vec::new();

    let bytes = text.as_bytes();

    for event in lang.highlight(bytes) {
        match event.ok()? {
            HighlightEvent::Source { start, end } => res.extend(&bytes[start..end]),
            HighlightEvent::HighlightStart(Highlight(n)) => {
                let capture = STANDARD_CAPTURE_NAMES[n];
                let classes = capture.replace(".", " ");
                let text = format!(r#"<span class="{}">"#, classes);
                res.extend(text.as_bytes());
            }
            HighlightEvent::HighlightEnd => {
                let text = format!("</span>");
                res.extend(text.as_bytes());
            }
        };
    }

    let res_text = String::from_utf8(res).ok()?;

    Some(res_text)
}
