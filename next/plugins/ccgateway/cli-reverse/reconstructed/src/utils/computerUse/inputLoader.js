/**
 * utils/computerUse/inputLoader.ts
 *
 * 懒加载 @ant/computer-use-input 原生输入模块。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/computerUse/inputLoader.ts
 * pieces: chunk-p57a7983.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getComputerUseSession } from "./session.js";
import { unsupportedModule } from "../../../vendor/unresolved-cjs/index.js";

//@ chunk-p57a7983.js:5896-6082 fingerprint (2.1.88 match: requireComputerUseInput, 0.855)
/**
 * 懒加载 @ant/computer-use-input 原生模块（缓存在 ComputerUseSession），平台不支持时抛错。
 */
function requireComputerUseInput() {
  let cuState = getComputerUseSession();
  if (cuState.inputModule) return cuState.inputModule;
  let inputModule = unsupportedModule();
  if (!inputModule.isSupported) throw Error("@ant/computer-use-input is not supported on this platform");
  return (cuState.inputModule = inputModule);
}
