/**
 * cli-highlight/dist/theme.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: cli-highlight@2.1.11
 * pieces: chunk-nfa5pp07.js (1)
 * attribution: esm-fingerprint 1
 */
import { sequential } from "../../../src/utils/sequential.js";
import { plainWithReset } from "../../../src/utils/cliHighlight.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-nfa5pp07.js:457-1009 esm-fingerprint
var DEFAULT_CLI_HIGHLIGHT_THEME; // deferred: uses sequential (../../../src/utils/sequential.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-nfa5pp07.js:457", () => {
  DEFAULT_CLI_HIGHLIGHT_THEME = new Map(
    Object.entries({
      keyword: sequential.blue,
      built_in: sequential.cyan,
      type: sequential.cyan.dim,
      literal: sequential.blue,
      number: sequential.green,
      regexp: sequential.red,
      string: sequential.red,
      subst: plainWithReset,
      symbol: plainWithReset,
      class: sequential.blue,
      function: sequential.yellow,
      title: plainWithReset,
      "title.function": sequential.yellow,
      "title.class": sequential.blue,
      params: plainWithReset,
      comment: sequential.green,
      doctag: sequential.green,
      meta: sequential.grey,
      "meta-keyword": plainWithReset,
      "meta-string": plainWithReset,
      "meta.keyword": plainWithReset,
      "meta.string": plainWithReset,
      section: plainWithReset,
      tag: sequential.grey,
      name: sequential.blue,
      attr: sequential.cyan,
      attribute: plainWithReset,
      variable: plainWithReset,
      bullet: plainWithReset,
      code: plainWithReset,
      emphasis: sequential.italic,
      strong: sequential.bold,
      link: sequential.underline,
      quote: plainWithReset,
      addition: sequential.green,
      deletion: sequential.red,
    }),
  );
});
export { DEFAULT_CLI_HIGHLIGHT_THEME };
