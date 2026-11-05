/**
 * shebang-command/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: shebang-command@2.0.0
 * pieces: chunk-t889g22j.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { require_shebang_regex } from "../shebang-regex/index.js";

//@ chunk-t889g22j.js:4922-5128 cjs-fingerprint
var require_shebang_command = __commonJS(function (cjsExports, cjsModule) {
  var shebangRegex = require_shebang_regex();
  cjsModule.exports = (string = "") => {
    let match = string.match(shebangRegex);
    if (!match) return null;
    let [path, argument] = match[0].replace(/#! ?/, "").split(" ");
    let binary = path.split("/").pop();
    if (binary === "env") return argument;
    return argument ? `${binary} ${argument}` : binary;
  };
});
export { require_shebang_command };
