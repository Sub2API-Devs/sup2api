/**
 * utils/computerUse/inputLoader.ts
 *
 * 懒加载 @ant/computer-use-input 原生输入模块。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/computerUse/inputLoader.ts
 * pieces: chunk-hrs3dad1.js (1)
 * attribution: fingerprint 1
 */
import { getComputerUseSession } from "./session.js";
import { N } from "../../../vendor/unresolved-cjs/index.js";

//@ chunk-hrs3dad1.js:5672-5858 fingerprint = requireComputerUseInput (0.855)
/**
 * 懒加载 @ant/computer-use-input 原生模块（缓存在 ComputerUseSession），平台不支持时抛错。
 */
function requireComputerUseInput() {
  let cuState = getComputerUseSession();
  if (cuState.inputModule) return cuState.inputModule;
  let inputModule = N();
  if (!inputModule.isSupported) throw Error("@ant/computer-use-input is not supported on this platform");
  return (cuState.inputModule = inputModule);
}
