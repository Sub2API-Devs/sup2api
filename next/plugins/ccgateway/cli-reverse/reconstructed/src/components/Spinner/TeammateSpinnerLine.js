/**
 * components/Spinner/TeammateSpinnerLine.tsx
 *
 * 队友 Spinner 行：取队友最新消息预览。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Spinner/TeammateSpinnerLine.tsx
 * pieces: chunk-ayc8mk37.js (1)
 * attribution: fingerprint 1
 */
import { ToolInputSchema } from "../../../vendor/@aws-sdk/client-bedrock-runtime/dist-cjs/index.js";
import { beginDeferredInits } from "../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 2 modules closed by ../../../vendor/@aws-sdk/client-bedrock-runtime/dist-cjs/index.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("vendor/@aws-sdk/client-bedrock-runtime/dist-cjs/index.js");
//@ chunk-ayc8mk37.js:35865-36081 fingerprint (2.1.88 match: getMessagePreview, 0.315)
var ToolSpecification = [
  3,
  "com.amazonaws.bedrockruntime",
  "ToolSpecification",
  0,
  ["name", "description", "inputSchema"],
  [0, 0, () => ToolInputSchema],
];
var ToolUseBlock = [
  3,
  "com.amazonaws.bedrockruntime",
  "ToolUseBlock",
  0,
  ["toolUseId", "name", "input", "type"],
  [0, 0, 15, 0],
];
export { ToolUseBlock, ToolSpecification };
