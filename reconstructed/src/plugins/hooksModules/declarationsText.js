/**
 * plugins/hooksModules/declarationsText.ts
 *
 * 2.1.316 新增：hooks 模块类型声明文本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-72n15jmc.js (7)
 * attribution: placement 7
 */
import __cc_resource_0 from "../../../assets/claude-code.d.ts-9de23df2.txt.zst" with { type: "file" };
import { Ar } from "../../../runtime/bun-runtime.js";
import { Et } from "../../utils/embeddedAssets.js";
import { BUILTIN_TOOL_INPUTS_HEADER } from "../functionHooks/types/toolTypesDts.js";

//@ chunk-72n15jmc.js:3496-3505 placement
var T = {};
//@ chunk-72n15jmc.js:3505-3610 placement
Ar(T, {
  PLUGIN_DECLARATIONS_TEXT: () => e,
  coreDeclarationsOf: () => A,
  default: () => T,
  pluginDeclarationsOf: () => m,
});
//@ chunk-72n15jmc.js:3610-3632 placement
var h = __cc_resource_0;
//@ chunk-72n15jmc.js:3632-3664 placement
var r = Et(h, import.meta.dirname);
//@ chunk-72n15jmc.js:3664-3672 placement
var e = r;
//@ chunk-72n15jmc.js:3672-3723 placement
var A = (t) => `// Written by Claude Code ${t}.
${e}
`;
//@ chunk-72n15jmc.js:3723-3748 placement
var m = (t, X) => A(t) + BUILTIN_TOOL_INPUTS_HEADER(X);
