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
import { readEmbeddedTextSync } from "../../utils/embeddedAssets.js";
import { BUILTIN_TOOL_INPUTS_HEADER } from "../functionHooks/types/toolTypesDts.js";

//@ chunk-72n15jmc.js:3496-3505 placement
/**
 * 空对象
 */
var EMPTY_DECLARATIONS = {};
//@ chunk-72n15jmc.js:3505-3610 placement
Ar(EMPTY_DECLARATIONS, {
  PLUGIN_DECLARATIONS_TEXT: () => DECLARATIONS_TEXT,
  coreDeclarationsOf: () => withGenerationHeader,
  default: () => EMPTY_DECLARATIONS,
  pluginDeclarationsOf: () => declarationsWithToolInputs,
});
//@ chunk-72n15jmc.js:3610-3632 placement
/**
 * 内嵌资源
 */
var DECLARATION_RESOURCE = __cc_resource_0;
//@ chunk-72n15jmc.js:3632-3664 placement
/**
 * 读取声明文本
 */
var declarationsText = readEmbeddedTextSync(DECLARATION_RESOURCE, import.meta.dirname);
//@ chunk-72n15jmc.js:3664-3672 placement
/**
 * 声明文本
 */
var DECLARATIONS_TEXT = declarationsText;
//@ chunk-72n15jmc.js:3672-3723 placement
/**
 * 加生成头
 */
var withGenerationHeader = (t) => `// Written by Claude Code ${t}.
${DECLARATIONS_TEXT}
`;
//@ chunk-72n15jmc.js:3723-3748 placement
/**
 * 声明加工具输入类型
 */
var declarationsWithToolInputs = (t, X) => withGenerationHeader(t) + BUILTIN_TOOL_INPUTS_HEADER(X);
