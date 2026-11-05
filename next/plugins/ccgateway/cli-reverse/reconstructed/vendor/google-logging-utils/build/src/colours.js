/**
 * google-logging-utils/build/src/colours.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-logging-utils@1.0.1..1.1.3
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-e8d3a8an.js:44278-45073 cjs-fingerprint
var require_colours = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Colours = undefined;
  class Colours {
    static isEnabled(stream) {
      return (
        stream &&
        stream.isTTY &&
        (typeof stream.getColorDepth === "function" ? stream.getColorDepth() > 2 : true)
      );
    }
    static refresh() {
      Colours.enabled = Colours.isEnabled(
        process === null || process === undefined ? undefined : process.stderr,
      );
      if (!this.enabled) {
        Colours.reset = "";
        Colours.bright = "";
        Colours.dim = "";
        Colours.red = "";
        Colours.green = "";
        Colours.yellow = "";
        Colours.blue = "";
        Colours.magenta = "";
        Colours.cyan = "";
        Colours.white = "";
        Colours.grey = "";
      } else {
        Colours.reset = "\x1B[0m";
        Colours.bright = "\x1B[1m";
        Colours.dim = "\x1B[2m";
        Colours.red = "\x1B[31m";
        Colours.green = "\x1B[32m";
        Colours.yellow = "\x1B[33m";
        Colours.blue = "\x1B[34m";
        Colours.magenta = "\x1B[35m";
        Colours.cyan = "\x1B[36m";
        Colours.white = "\x1B[37m";
        Colours.grey = "\x1B[90m";
      }
    }
  }
  cjsExports.Colours = Colours;
  Colours.enabled = false;
  Colours.reset = "";
  Colours.bright = "";
  Colours.dim = "";
  Colours.red = "";
  Colours.green = "";
  Colours.yellow = "";
  Colours.blue = "";
  Colours.magenta = "";
  Colours.cyan = "";
  Colours.white = "";
  Colours.grey = "";
  Colours.refresh();
});
export { require_colours };
