/**
 * services/tools/streamingStopNotice.ts
 *
 * 流式执行中工具调用被停止时给模型的“先停手等用户”提示（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f4m1wxh3.js (1)
 * attribution: placement 1
 */

//@ chunk-f4m1wxh3.js:191-275 placement
/**
 * 工具调用被用户停止时给模型的“先停手等用户”提示。
 */
var STOP_INSTRUCTION = "STOP what you are doing and wait for the user to tell you how to proceed.";
export { STOP_INSTRUCTION };
