= sqlite-wasm

// Asciidoc references
// Documentation: https://asciidoctor.org/docs/user-manual/
// Quick reference: https://asciidoctor.org/docs/asciidoc-syntax-quick-reference/
// Asciidoc vs Markdown: https://asciidoctor.org/docs/user-manual/#comparison-by-example
// GitHub Flavored Asciidoc (GFA): https://gist.github.com/dcode/0cfbf2699a1fe9b46ff04c41721dda74

:project-version: 0.0.2
:rootdir: https://github.com/kbumsik/sqlite-wasm

ifdef::env-github[]
// Emoji
:tip-caption: :bulb:
:note-caption: :information_source:
:important-caption: :heavy_exclamation_mark:
:caution-caption: :fire:
:warning-caption: :warning:
// URL
:imagesdir: https://raw.githubusercontent.com/kbumsik/sqlite-wasm/master
endif::[]

sqlite-wasm is a fork of https://github.com/sql-js/sql.js[sql.js] with the following changes:

* Completely rewritten in TypeScript.
* Focus on the use with WebAssembly.
* Add slim distribution option (`sqlite-slim.wasm`), which is much smaller binary size then the original.
* Add FTS5 option.

== Credits & License
This is a reimplementation of https://github.com/sql-js/sql.js[sql.js]
in TypeScript. (MIT license)

Other than that, the project is MIT License. See link:./LICENSE[LICENSE]
