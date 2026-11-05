/**
 * cross-spawn/lib/util/escape.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: cross-spawn@7.0.5..7.0.6
 * pieces: chunk-t889g22j.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-t889g22j.js:4564-4874 cjs-fingerprint
var require_escape = __commonJS(function (cjsExports, cjsModule) {
  var metaCharsRegExp = /([()\][%!^"`<>&|;, *?])/g;
  function escapeCommand(arg) {
    arg = arg.replace(metaCharsRegExp, "^$1");
    return arg;
  }
  function escapeArgument(arg, doubleEscapeMetaChars) {
    arg = `${arg}`;
    arg = arg.replace(/(?=(\\+?)?)\1"/g, '$1$1\\"');
    arg = arg.replace(/(?=(\\+?)?)\1$/, "$1$1");
    arg = `"${arg}"`;
    arg = arg.replace(metaCharsRegExp, "^$1");
    if (doubleEscapeMetaChars) arg = arg.replace(metaCharsRegExp, "^$1");
    return arg;
  }
  cjsExports.command = escapeCommand;
  cjsExports.argument = escapeArgument;
});
export { require_escape };
