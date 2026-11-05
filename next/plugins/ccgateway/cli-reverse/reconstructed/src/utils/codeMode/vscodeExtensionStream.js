/**
 * utils/codeMode/vscodeExtensionStream.ts
 *
 * 判定是否为 VSCode 扩展的 stream-json 会话（与是否扩展连接）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mmhvj8qm.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getReplBridgeHandle, getSdkHostedBridgeHandle } from "../../bridge/replBridgeHandle.js";
import { isVsCodeTopSession } from "../sessionShape.js";
import { getPrintOutputFormat } from "../../bootstrap/state.js";

//@ chunk-mmhvj8qm.js:302-347 placement
function hasReplBridge() {
  return getReplBridgeHandle() !== null || getSdkHostedBridgeHandle() !== null;
}
//@ chunk-mmhvj8qm.js:347-396 placement
/**
 * 是否为 VSCode 扩展的 stream-json 会话。
 */
function isVSCodeExtensionStream() {
  return isVsCodeTopSession() && getPrintOutputFormat() === "stream-json";
}
//@ chunk-mmhvj8qm.js:396-429 placement
/**
 * 是否为 VSCode 扩展流（任意扩展连接或 stream-json）。
 */
function clientsDrawScriptCalls() {
  return hasReplBridge() || isVSCodeExtensionStream();
}
export { clientsDrawScriptCalls, isVSCodeExtensionStream };
