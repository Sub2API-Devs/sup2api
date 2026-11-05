/**
 * plugins/hooksModules/declarationsText.ts
 *
 * 2.1.316 新增：hooks 模块类型声明文本
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3jha5g23.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import __cc_resource_0 from "../../../assets/claude-code.d.ts-3245ae37.txt.zst" with { type: "file" };
import { __export } from "../../../runtime/bun-runtime.js";
import { readEmbeddedTextSync } from "../../utils/embeddedAssets.js";
import { BUILTIN_TOOL_INPUTS_HEADER } from "../functionHooks/types/toolTypesDts.js";

//@ chunk-3jha5g23.js:3804-3813 placement
/**
 * 空对象
 */
var EMPTY_DECLARATIONS = {};
//@ chunk-3jha5g23.js:3813-3918 placement
__export(EMPTY_DECLARATIONS, {
  PLUGIN_DECLARATIONS_TEXT: () => DECLARATIONS_TEXT,
  coreDeclarationsOf: () => withGenerationHeader,
  default: () => EMPTY_DECLARATIONS,
  pluginDeclarationsOf: () => declarationsWithToolInputs,
});
//@ chunk-3jha5g23.js:3918-3940 placement
/**
 * 内嵌资源
 */
var DECLARATION_RESOURCE = __cc_resource_0;
//@ chunk-3jha5g23.js:3940-3972 placement
/**
 * 读取声明文本
 */
var declarationsText = readEmbeddedTextSync(DECLARATION_RESOURCE, import.meta.dirname);
//@ chunk-3jha5g23.js:3972-3980 placement
/**
 * 声明文本
 */
var DECLARATIONS_TEXT = declarationsText;
//@ chunk-3jha5g23.js:3980-4031 placement
/**
 * 加生成头
 */
var withGenerationHeader = (version) => `// Written by Claude Code ${version}.
${DECLARATIONS_TEXT}
`;
//@ chunk-3jha5g23.js:4031-4056 placement
/**
 * 声明加工具输入类型
 */
var declarationsWithToolInputs = (version, builtinToolSchemas) =>
  withGenerationHeader(version) + BUILTIN_TOOL_INPUTS_HEADER(builtinToolSchemas);
export { DECLARATIONS_TEXT, withGenerationHeader, EMPTY_DECLARATIONS, declarationsWithToolInputs };
